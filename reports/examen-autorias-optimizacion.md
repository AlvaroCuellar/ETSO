# Optimizacion de lecturas en examen-autorias

Fecha: 2026-06-10

Este documento resume los cambios aplicados sobre `/api/examen-autorias/works` para reducir lecturas repetidas en Turso/libSQL, manteniendo intacto el contrato publico del endpoint.

## Contrato que se mantiene

El endpoint sigue siendo:

```text
GET /api/examen-autorias/works?... 
```

La respuesta sigue incluyendo:

```text
works, page, pageSize, totalPages, totalResults
```

No se cambia la UI ni se elimina el conteo exacto de resultados.

## V1: cache y filtros de autor

Cambios aplicados:

- Se anadio `Cache-Control` publico al endpoint:

```text
public, max-age=30, s-maxage=300, stale-while-revalidate=1800
```

- Se anadio cache en memoria para paginas de resultados:
  - clave: firma normalizada de filtros + `page` + `pageSize`;
  - TTL por defecto: 5 minutos;
  - limite por defecto: 200 entradas;
  - configurable con `EXAMEN_RESULTS_CACHE_MS` y `EXAMEN_RESULTS_CACHE_LIMIT`.

- Se reescribieron filtros de autor en modo `OR`:

```sql
w.id IN (
  SELECT wai.work_id
  FROM work_author_index wai
  WHERE wai.author_id IN (...)
)
```

Esto evita el patron correlacionado anterior y permite usar mejor `idx_work_author_index_author_type` tambien en filtros `OR`.

Validacion esperada:

- Caso base: `idx_works_examen_titulo_id`.
- Autor `OR`: `idx_work_author_index_author_type`.
- Autor `AND`: `idx_work_author_index_author_type`.

## V1.1: titulo_busqueda como campo unico

Cambio aplicado:

- Si `works.titulo_busqueda` existe, el filtro de titulo usa solo esa columna.
- Si no existe, se conserva el fallback para esquemas antiguos:

```text
titulo + otrostitulos/variaciones_titulo
```

Motivo:

- `titulo_busqueda` ya contiene el titulo principal y variantes preparadas para busqueda.
- Se evita evaluar varias expresiones `LIKE` por fila.
- Se mantiene el comportamiento funcional esperado para busquedas por titulo y otros titulos.

Limite:

- `LIKE '%texto%'` sigue sin ser una busqueda indexada completa por B-tree.
- El indice `idx_works_examen_titulo_id` ayuda a acotar `examen_autorias=1` y ordenar, pero no puede saltar directamente a las filas que contienen una palabra en mitad del texto.

## V1.2: cache separada para COUNT

Cambio aplicado:

- Se anadio una cache de `COUNT(*)` separada de la cache de pagina.
- La clave del contador es solo la firma normalizada de filtros, sin `page` ni `pageSize`.

Antes:

```text
titulo=vida&page=1 -> COUNT
titulo=vida&page=2 -> COUNT otra vez
titulo=vida&page=3 -> COUNT otra vez
```

Ahora:

```text
titulo=vida -> COUNT una vez dentro del TTL
titulo=vida&page=1 -> reutiliza total
titulo=vida&page=2 -> reutiliza total
titulo=vida&page=3 -> reutiliza total
```

Motivo:

- `totalResults` no cambia al cambiar de pagina.
- `totalPages` se deriva de `totalResults` y `pageSize`.
- Se mantiene el conteo exacto y el mismo JSON.

Limite:

- La primera peticion para una combinacion nueva de filtros sigue haciendo `COUNT(*)`.
- La cache reduce repeticiones, navegacion y trafico recurrente, pero no elimina el coste de combinaciones unicas.

## Opciones futuras mas agresivas

### Titulo: FTS

Crear una tabla FTS5 durante la generacion del SQLite desde Excel.

Ventaja:

- Evita revisar muchas filas con `LIKE '%texto%'`.
- Permite buscar por tokens/palabras de forma mucho mas directa.

Coste:

- Requiere nuevo objeto de esquema.
- Requiere poblar la tabla FTS al generar el SQLite.
- Cambia la consulta de titulo de `LIKE` a `MATCH`.
- La semantica no es identica: FTS busca palabras/tokens; las busquedas parciales necesitan reglas especificas.

### COUNT: hasNextPage en vez de total exacto

Pedir `pageSize + 1` resultados y devolver si hay pagina siguiente.

Ventaja:

- Puede eliminar `COUNT(*)` en navegacion normal.

Coste:

- Cambia el contrato del endpoint.
- La UI dejaria de saber `totalResults` y `totalPages` exactos.
- Habria que cambiar textos y paginacion.

### COUNT: contador diferido

Devolver primero la pagina y calcular el total despues.

Ventaja:

- Mejora el tiempo percibido de carga.

Coste:

- Sigue existiendo el coste del `COUNT(*)`.
- Complica frontend/backend.
- Puede mostrar totales transitorios o estados de carga.

### Autor AND y tipo de autoria

Los filtros `AND`, `confianza` y `tipo_autoria` todavia pueden usar subconsultas con agregados o consultas correlacionadas.

Posibles mejoras:

- Precalcular mas informacion en tablas auxiliares.
- Generar columnas/materializaciones en el SQLite para autorias unicas, colaboraciones y desconocidas.
- Reescribir filtros muy usados para apoyarse en esas columnas.

Coste:

- Aumenta el esquema generado.
- Hay que mantener consistencia con la logica actual de atribuciones.

### Options y stats

`/api/examen-autorias/options` y `/api/examen-autorias/stats` son buenos candidatos a precalculo.

Posibles mejoras:

- Generar JSON estatico junto al SQLite.
- Subir TTL de cache HTTP.
- Precalcular contadores globales en una tabla `catalog_stats`.

Coste:

- Menos flexibilidad si cambian los datos sin regenerar artefactos.

### Red de obras

Fuera de `examen-autorias`, `/api/red-obras` sigue siendo un punto alto segun la auditoria.

Posibles mejoras:

- Anadir `Cache-Control`.
- Evitar funciones sobre `ambito` en el `WHERE`.
- Normalizar `ambito` al generar SQLite.
- Generar un JSON estatico de grafo si el contenido cambia poco.

## Recomendacion de seguimiento

1. Observar consumo real tras V1, V1.1 y V1.2.
2. Si `/api/examen-autorias/works` sigue arriba, decidir entre:
   - mantener contrato y ampliar cache/precalculo;
   - o cambiar producto hacia `hasNextPage` sin total exacto.
3. Si el coste dominante pasa a busquedas por titulo, planificar FTS en el generador SQLite.
4. Revisar despues `/api/red-obras`, que era el siguiente punto alto de la auditoria.
