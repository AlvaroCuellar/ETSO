# Auditoría de llamadas a Turso

No hice ningún cambio en el código. La auditoría es solo lectura.

## 1. Resumen Ejecutivo

Principales riesgos detectados:

- El wrapper central está en [catalog-runtime.ts](C:/Projects/etso/src/lib/server/catalog-runtime.ts:464). Todas las lecturas Turso de runtime pasan por `getRows()` y `db.execute()`.
- El mayor punto caliente es `/api/examen-autorias/works`: hace `COUNT(*)`, luego `SELECT ... LIMIT/OFFSET`, luego hidratación adicional por IDs. Además permite `LIKE '%...%'`, filtros dinámicos y subconsultas sobre `work_author_index`.
- El snapshot global del catálogo lee tablas completas cada vez que caduca el TTL de memoria, 10 minutos por defecto: `authors`, `attribution_sets`, `attribution_groups`, `attribution_members`, `text_access`, `works`.
- Varias páginas públicas usan el snapshot pero no tienen headers HTTP de caché, así que Vercel puede ejecutar server load en cada request aunque el proceso reutilice memoria.
- `/api/red-obras` no tiene `Cache-Control` y construye un grafo a partir de `work_distances`.
- TEXORO no parece hacer búsqueda textual en Turso; usa índices estáticos/R2 y motor propio. Su coste Turso viene de `getAllWorks()` para metadatos/opciones/stats.
- No encontré escrituras Turso en runtime de SvelteKit. Las escrituras están en scripts/deploy manuales.

Top 10 puntos calientes probables:

1. `/api/examen-autorias/works`, [works +server.ts](C:/Projects/etso/src/routes/api/examen-autorias/works/+server.ts:7), [getExamenWorksPage](C:/Projects/etso/src/lib/server/catalog-runtime.ts:1612) - crítico.
2. `LIKE '%titulo%'` en filtros de examen, [catalog-runtime.ts](C:/Projects/etso/src/lib/server/catalog-runtime.ts:1585) - crítico.
3. `COUNT(*)` dinámico en examen, [catalog-runtime.ts](C:/Projects/etso/src/lib/server/catalog-runtime.ts:1620) - alto/crítico.
4. Snapshot global completo, [createSnapshot](C:/Projects/etso/src/lib/server/catalog-runtime.ts:815) - alto en cold starts o tráfico distribuido.
5. `/api/red-obras`, [red-obras +server.ts](C:/Projects/etso/src/routes/api/red-obras/+server.ts:4), [work_distances query](C:/Projects/etso/src/lib/server/catalog-runtime.ts:1960) - alto.
6. `/api/examen-autorias/stats`, [stats +server.ts](C:/Projects/etso/src/routes/api/examen-autorias/stats/+server.ts:7), varios `COUNT` - medio/alto.
7. `/api/examen-autorias/options`, [options +server.ts](C:/Projects/etso/src/routes/api/examen-autorias/options/+server.ts:7), `DISTINCT` + joins - medio.
8. `/resumenes` y `/api/resumenes/search`, [getWorksForSummaryIndex](C:/Projects/etso/src/lib/server/catalog-runtime.ts:1128) - medio.
9. `/informes/[id]` y export XLSX, [informes page](C:/Projects/etso/src/routes/informes/[id]/+page.server.ts:17), [distances](C:/Projects/etso/src/lib/server/catalog-runtime.ts:1800) - medio.
10. `/api/works/[id]/short-summary`, [short-summary +server.ts](C:/Projects/etso/src/routes/api/works/[id]/short-summary/+server.ts:17) - bajo/medio, cacheado.

Acciones prioritarias:

- Añadir caché HTTP a `/api/examen-autorias/works` con `s-maxage` corto y `stale-while-revalidate`, o cachear por firma de query.
- Sustituir `LIKE '%...%'` por FTS para títulos.
- Evitar `COUNT(*)` exacto en cada búsqueda, o hacerlo opcional/deferido.
- Añadir `Cache-Control` a `/api/red-obras` y páginas públicas server-rendered donde proceda.
- Instrumentar `getRows()` con nombre lógico de query, ruta origen, duración y filas devueltas.

## 2. Inventario de Clientes y Wrappers

| Archivo | Función | Cliente | Observaciones |
|---|---:|---|---|
| [catalog-runtime.ts](C:/Projects/etso/src/lib/server/catalog-runtime.ts:432) | `createConfiguredDbClient()` | `createClient({ url, authToken })` | Cliente Turso real con `TURSO_DATABASE_URL` y `TURSO_AUTH_TOKEN`. |
| [catalog-runtime.ts](C:/Projects/etso/src/lib/server/catalog-runtime.ts:441) | `createLocalFallbackDbClient()` | `createClient({ url: file:... })` | Fallback solo en `dev` si falla fetch. |
| [catalog-runtime.ts](C:/Projects/etso/src/lib/server/catalog-runtime.ts:464) | `getRows()` | `db.execute()` | Wrapper central. Logs lentos, pero no cuenta llamadas ni filas leídas. |
| [compare-informe-slugs.mjs](C:/Projects/etso/scripts/compare-informe-slugs.mjs:126) | script local | `createClient(file:...)` | Lee SQLite local, no producción normal. |
| [generate-titulo-busqueda-sql.mjs](C:/Projects/etso/deploy/scripts/generate-titulo-busqueda-sql.mjs:151) | script deploy | `createClient(file:...)` | Lee SQLite local y genera `UPDATE`. |
| [replace-turso-db.sh](C:/Projects/etso/deploy/scripts/replace-turso-db.sh:120) | deploy manual | Turso CLI | Reemplaza la base remota completa. |

## 3. Inventario de Consultas

| ID | Archivo | Función/ruta | Tipo | SQL resumido | Tablas | Frecuencia | Riesgo | Motivo |
|---|---|---|---|---|---|---|---|---|
| Q1 | [catalog-runtime.ts](C:/Projects/etso/src/lib/server/catalog-runtime.ts:486) | `getTableColumnNames` | PRAGMA | `PRAGMA table_info(authors/works)` | schema | cold start/cache columnas | bajo | Cacheado en memoria. |
| Q2 | [catalog-runtime.ts](C:/Projects/etso/src/lib/server/catalog-runtime.ts:532) | `loadAuthorsByIds` | SELECT | `authors WHERE id IN (...)` | authors | hidratación puntual | bajo | PK `id`, limitado por IDs. |
| Q3 | [catalog-runtime.ts](C:/Projects/etso/src/lib/server/catalog-runtime.ts:617) | `loadAttributionRowsByWorkIds` | SELECT JOIN | attribution sets/groups/members por `work_id IN` | attribution_* | examen paginado | medio | Joins y `ORDER BY`; limitado por page size. |
| Q4 | [catalog-runtime.ts](C:/Projects/etso/src/lib/server/catalog-runtime.ts:655) | `loadTextAccessByWorkIds` | SELECT | `text_access WHERE work_id IN` | text_access | hidratación puntual | bajo | Limitado por IDs. |
| Q5 | [catalog-runtime.ts](C:/Projects/etso/src/lib/server/catalog-runtime.ts:744) | `loadWorkRowsByIds` | SELECT | `works WHERE id IN (...) ORDER BY CASE` | works | examen paginado | bajo/medio | PK, pero `ORDER BY CASE`. |
| Q6 | [catalog-runtime.ts](C:/Projects/etso/src/lib/server/catalog-runtime.ts:818) | `createSnapshot` | SELECT | todos los autores ordenados | authors | TTL/cold start | medio | Tabla completa. |
| Q7 | [catalog-runtime.ts](C:/Projects/etso/src/lib/server/catalog-runtime.ts:831) | `createSnapshot` | SELECT JOIN | todas las atribuciones con `LEFT JOIN` | attribution_* | TTL/cold start | alto | Lee tablas completas y ordena. |
| Q8 | [catalog-runtime.ts](C:/Projects/etso/src/lib/server/catalog-runtime.ts:916) | `createSnapshot` | SELECT | todo `text_access` | text_access | TTL/cold start | bajo/medio | Tabla completa. |
| Q9 | [catalog-runtime.ts](C:/Projects/etso/src/lib/server/catalog-runtime.ts:947) | `createSnapshot` | SELECT | todas las obras ordenadas por título | works | TTL/cold start | alto | Tabla completa, pública indirectamente. |
| Q10 | [catalog-runtime.ts](C:/Projects/etso/src/lib/server/catalog-runtime.ts:1130) | `getWorksForSummaryIndex` | SELECT | `works WHERE resumen_breve IS NOT NULL` | works | `/resumenes`, búsqueda resúmenes | medio | Sin `LIMIT`, no reutiliza resultado propio. |
| Q11 | [catalog-runtime.ts](C:/Projects/etso/src/lib/server/catalog-runtime.ts:1169) | short summary | SELECT | `works WHERE id = ? LIMIT 1` | works | endpoint por obra | bajo | PK + caché memoria + HTTP cache. |
| Q12 | [catalog-runtime.ts](C:/Projects/etso/src/lib/server/catalog-runtime.ts:1198) | informe results | SELECT | `resultado1, resultado2 WHERE id = ? LIMIT 1` | works | informes | bajo | PK + caché memoria. |
| Q13 | [catalog-runtime.ts](C:/Projects/etso/src/lib/server/catalog-runtime.ts:1620) | `/api/examen-autorias/works` | SELECT COUNT | `COUNT(*) FROM works WHERE dinámico` | works, work_author_index | cada búsqueda/página | crítico | `COUNT` frecuente, filtros dinámicos, subconsultas. |
| Q14 | [catalog-runtime.ts](C:/Projects/etso/src/lib/server/catalog-runtime.ts:1633) | `/api/examen-autorias/works` | SELECT | ids con mismo `WHERE`, `ORDER BY`, `LIMIT/OFFSET` | works, work_author_index | cada búsqueda/página | alto/crítico | Puede usar `LIKE '%x%'`, offset y orden. |
| Q15 | [catalog-runtime.ts](C:/Projects/etso/src/lib/server/catalog-runtime.ts:1653) | `/api/examen-autorias/options` | SELECT DISTINCT JOIN | autores/géneros/estados | authors, works, work_author_index | carga inicial | medio | Cache HTTP presente. |
| Q16 | [catalog-runtime.ts](C:/Projects/etso/src/lib/server/catalog-runtime.ts:1699) | `/api/examen-autorias/stats` | SELECT COUNT | 4 contadores globales | works, work_author_index | header/página | medio/alto | Cache HTTP presente, pero global. |
| Q17 | [catalog-runtime.ts](C:/Projects/etso/src/lib/server/catalog-runtime.ts:1802) | informes | SELECT | `work_distances WHERE work_id = ? ORDER BY ambito, rank` | work_distances | página informe/export | medio | Puede leer muchas distancias por informe. |
| Q18 | [catalog-runtime.ts](C:/Projects/etso/src/lib/server/catalog-runtime.ts:1960) | `/api/red-obras` | SELECT | `work_distances WHERE rank <= ? AND REPLACE(LOWER(ambito)) IN ...` | work_distances | endpoint público | alto | Función sobre columna reduce uso de índice; sin HTTP cache. |
| Q19 | [compare-informe-slugs.mjs](C:/Projects/etso/scripts/compare-informe-slugs.mjs:130) | script | SELECT | obras y atribuciones completas | works, attribution_sets | manual/local | bajo | No afecta producción normal. |
| Q20 | [generate-titulo-busqueda-sql.mjs](C:/Projects/etso/deploy/scripts/generate-titulo-busqueda-sql.mjs:152) | deploy | PRAGMA/SELECT/UPDATE generado | lee works, genera updates | works | manual/deploy | bajo producción | Escrituras solo al ejecutar SQL generado. |
| Q21 | [replace-turso-db.sh](C:/Projects/etso/deploy/scripts/replace-turso-db.sh:87) | deploy | DROP/restore | reemplazo total remoto | schema completo | manual/deploy | alto operativo | No navegación, pero escribe toda la DB. |

## 4. Puntos Calientes

- `/api/examen-autorias/works`, [getExamenWorksPage](C:/Projects/etso/src/lib/server/catalog-runtime.ts:1612): crítico. Se dispara desde [examen-autorias +page.svelte](C:/Projects/etso/src/routes/examen-autorias/+page.svelte:323) en carga y filtros. Tiene `COUNT(*)`, `LIKE '%...%'`, subconsultas `EXISTS`, `COUNT(DISTINCT)` y luego hidratación. Bots pueden recorrer query params. Solución: cache por query, FTS, contador diferido, limitar combinaciones y añadir headers.
- Snapshot global, [createSnapshot](C:/Projects/etso/src/lib/server/catalog-runtime.ts:815): alto. Cada proceso/cold start/TTL lee tablas completas. Solución: subir TTL en producción, precalcular JSON estático para catálogo casi inmutable o separar snapshots ligeros por página.
- `/api/red-obras`, [buildWorkNetworkGraph](C:/Projects/etso/src/lib/server/catalog-runtime.ts:1953): alto. Lee `work_distances` con expresión sobre `ambito` y sin `Cache-Control`. Solución: normalizar `ambito`, añadir cache HTTP larga y/o generar JSON estático.
- `/resumenes` y `/api/resumenes/search`, [getWorksForSummaryIndex](C:/Projects/etso/src/lib/server/catalog-runtime.ts:1128): medio. Lee todos los resúmenes breves disponibles. Solución: cachear resultado en memoria como snapshot o mover índice de resúmenes a JSON/R2.

## 5. Cache y Rutas Públicas

| Ruta | Consulta Turso | Cache actual | Problema | Propuesta |
|---|---|---|---|---|
| `/api/examen-autorias/works` | Q13-Q14 + Q2-Q5 | ninguna | Endpoint público parametrizable | `public, max-age=60, s-maxage=300, stale-while-revalidate=1800`; cache por firma. |
| `/api/examen-autorias/options` | Q15 | sí | Correcto, quizá corto | Mantener o subir `s-maxage` si catálogo cambia poco. |
| `/api/examen-autorias/stats` | Q16 | sí | Global counts recurrentes | Precalcular stats o cachear más. |
| `/api/red-obras` | Q18 | ninguna | Público, pesado y crawleable | Cache público largo, JSON estático si no cambia. |
| `/api/resumenes/search` | Q10 al construir índice | `no-store` | Warmup/search pueden forzar construcción | Cachear índice en memoria ya existe; añadir protección/rate limit si bots. |
| `/api/texoro/options`, `/stats`, `/work-meta` | snapshot Q6-Q9 si frío | sí | Bien, pero cold starts leen snapshot completo | Mantener cache; considerar JSON estático. |
| `/api/works/[id]/short-summary` | Q11 | sí | Bajo | Correcto. |
| `/informes/[id]` | Q17 + Q12 | sin `setHeaders` | Página pública SSR | Añadir `setHeaders` si no hay usuario. |
| `/obras/[slug]`, `/biteso`, `/autores`, `/texoro/obras`, `/texoro/autores`, `/resumenes` | snapshot/Q10 | sin `setHeaders` | Vercel puede invocar cada request | Añadir cache público o prerender/estático. |

Build/prerender: no encontré `export const prerender` ni configuración de prerender en [svelte.config.js](C:/Projects/etso/svelte.config.js:1). Con el estado actual, `npm run build` no debería consultar Turso salvo que se active prerender más adelante. Las consultas se ejecutan en carga SSR/runtime.

## 6. Scripts de Actualización/Importación

Consumo normal de producción:

- Rutas SvelteKit y APIs bajo `src/routes/**`.
- Lecturas vía [catalog-runtime.ts](C:/Projects/etso/src/lib/server/catalog-runtime.ts:464).

Consumo manual/deploy:

- [compare-informe-slugs.mjs](C:/Projects/etso/scripts/compare-informe-slugs.mjs:126): SQLite local, lectura completa de `works` y `attribution_sets`.
- [generate-titulo-busqueda-sql.mjs](C:/Projects/etso/deploy/scripts/generate-titulo-busqueda-sql.mjs:150): SQLite local, genera `UPDATE works`.
- [deploy/turso-titulo-busqueda.sql](C:/Projects/etso/deploy/turso-titulo-busqueda.sql:1): 2988 líneas de `UPDATE`, ejecución manual.
- [replace-turso-db.sh](C:/Projects/etso/deploy/scripts/replace-turso-db.sh:120): reemplazo remoto completo con Turso CLI.

## 7. Índices Recomendados

Verifiqué la SQLite local con `@libsql/client`: tiene índices como `idx_works_examen_autorias`, `idx_works_genero`, `idx_works_titulo`, `idx_work_author_index_author_type`, `idx_work_author_index_work_id`, `idx_work_distances_work_ambito_rank`. Aun así, hay que confirmar en Turso remoto.

SQL recomendado:

```sql
CREATE INDEX IF NOT EXISTS idx_text_access_work_position
ON text_access(work_id, position);

CREATE INDEX IF NOT EXISTS idx_attr_sets_work_type
ON attribution_sets(work_id, attribution_type);

CREATE INDEX IF NOT EXISTS idx_attr_groups_set_order
ON attribution_groups(attribution_set_id, group_order);

CREATE INDEX IF NOT EXISTS idx_attr_members_group_order
ON attribution_members(attribution_group_id, member_order);

CREATE INDEX IF NOT EXISTS idx_wai_work_type_author_conf
ON work_author_index(work_id, attribution_type, author_id, confianza);

CREATE INDEX IF NOT EXISTS idx_wai_author_type_work
ON work_author_index(author_id, attribution_type, work_id);

CREATE INDEX IF NOT EXISTS idx_works_examen_titulo_id
ON works(examen_autorias, titulo COLLATE NOCASE, id);

CREATE INDEX IF NOT EXISTS idx_works_examen_genero
ON works(examen_autorias, genero);

CREATE INDEX IF NOT EXISTS idx_works_examen_estado
ON works(examen_autorias, estado_texto);

CREATE INDEX IF NOT EXISTS idx_work_distances_ambito_rank_work
ON work_distances(ambito, rank, work_id, related_work_id);
```

Advertencias:

- Ningún índice B-tree normal arregla `LIKE '%texto%'` en [catalog-runtime.ts](C:/Projects/etso/src/lib/server/catalog-runtime.ts:1587). Para eso conviene FTS5.
- El índice de `work_distances(ambito, rank, ...)` ayuda si se deja de usar `REPLACE(LOWER(ambito))` en el `WHERE`.
- `COUNT(*)` global frecuente se reduce mejor con caché/precalculo que con índices.

FTS sugerido para título:

```sql
CREATE VIRTUAL TABLE IF NOT EXISTS works_title_fts
USING fts5(work_id UNINDEXED, titulo, titulo_busqueda, otrostitulos);
```

## 8. Instrumentación Recomendada

El SDK instalado no expone `rows_read` en `ResultSet`; en `node_modules/@libsql/client` aparece `rowsAffected` y `lastInsertRowid`, pero no `rows_read`/`rowsRead`. Propuesta mínima en `getRows()`:

- `queryName`: etiqueta lógica opcional.
- `route`: origen inferido o pasado desde endpoint.
- `sqlPreview`: SQL normalizado y truncado.
- `durationMs`.
- `returnedRows`: `result.rows.length`.
- `argsShape`: número de parámetros y tipos, no valores crudos sensibles.
- `env`: `dev`, `preview`, `production`.
- `timestamp`.
- contador agregado por minuto: `{ queryName, route, calls, totalDurationMs, totalReturnedRows }`.

Para no romper producción: activar con `TURSO_QUERY_LOG=1`, muestrear al 10-20 %, y loguear siempre lentas o `returnedRows > 500`.

## 9. Plan de Acción

Inmediato:

- Añadir caché HTTP a `/api/examen-autorias/works` y `/api/red-obras`.
- Instrumentar `getRows()` durante unos días.
- Revisar en Turso remoto índices reales con `sqlite_master`.

Esta semana:

- Sustituir búsqueda de título `LIKE '%...%'` por FTS.
- Evitar `COUNT(*)` exacto en cada request de examen, o devolverlo diferido/cacheado.
- Generar `/api/red-obras` como JSON estático si los datos cambian poco.

Posterior:

- Convertir catálogo, TEXORO options/work-meta y estadísticas a artefactos JSON precalculados cuando el catálogo sea casi inmutable.
- Separar endpoints pesados de navegación normal y añadir rate limit/bot protection a búsquedas parametrizables.
- Considerar un snapshot más granular para no reconstruir todo el catálogo por páginas que solo necesitan metadatos mínimos.