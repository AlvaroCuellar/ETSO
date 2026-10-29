# TEXORO: ampliación local

La vista conciliada para revisión está en `http://127.0.0.1:6178/texoro`.

La preparación del 29 de octubre de 2026 reúne 3.222 obras web: 3.125 teatrales,
92 de prosa y cinco colecciones poéticas. El maestro conserva 3.223 registros;
la obra embargada permanece fuera del paquete web. Se incorporan además los
32 textos modernizados de Wisconsin, IMPACT y Gutenberg (5.625.735 palabras),
con procedencia y enlaces externos, sin BITESO ni análisis estilométrico.
La siguiente documentación describe la primera ampliación de 65 registros,
conservada íntegramente junto con las incorporaciones posteriores.

## Datos

En la primera ampliación se conservaron las 3.032 obras teatrales de su snapshot. Se incorporaron 60 textos de prosa
y cinco colecciones poéticas de la selección congelada de BERTvantes Corpus 1.0:

| Colección | Poemas |
| --- | ---: |
| Corpus de Sonetos del Siglo de Oro | 4.814 |
| DISCO: selección del Siglo de Oro | 1.021 |
| Poesi.as: selección del Siglo de Oro | 1.292 |
| Gongocorpus | 458 |
| Corpus General de Poesía Lírica Castellana del Siglo de Oro | 392 |

Cada colección cuenta como una obra. Se conservan por separado las colecciones
fuente, tal como se aprobó. Los 7.977 poemas mantienen su procedencia individual
en `.local/texoro-multigenre/document-provenance.tsv`. Las nuevas obras y sus
fuentes se listan en `imported-works.tsv`, en la misma carpeta.

La procedencia visible usa una frase breve, como en las obras anteriores:
«El texto procede del Corpus de Sonetos del Siglo de Oro». Los enlaces permanecen
en el acceso al texto; las notas de origen, licencias, selección y recuperaciones
se conservan en `source-details.json` y en los manifiestos de documentación.

Las 65 incorporaciones tienen `examen_autorias=0`, sin informes,
BITESO ni asociaciones ASODAT inventadas. Se mantienen todos los
identificadores, URLs, atribuciones, subgéneros y vínculos ASODAT anteriores.
Su atribución estilométrica es «No analizada», sin grado de confianza, igual
que en las obras del catálogo que todavía no se han analizado.

Las 65 obras tienen resumen automático en `scripts/texoro-summaries/`, incluidas
las cinco colecciones poéticas. Se conserva el esquema existente: tres párrafos
amplios, tres frases breves y listas de personajes, espacios y temas. En poesía,
las voces y figuras de composiciones independientes ocupan el apartado de
personajes; no se les atribuye una trama colectiva. Los tratados y diálogos se
resumen conforme a su contenido expositivo. Los resúmenes se cotejaron con los
TXT activos; las evidencias se conservan localmente en `summary-evidence/`.
El importador valida el esquema, incorpora el resumen breve a SQLite y guarda
los JSON completos junto con los resúmenes originales en `resumenes/`.

## Clasificación y autoría

`generalGenre` representa Teatro, Prosa o Poesía. El campo anterior `genre` se
conserva como subgénero para mantener las integraciones y los filtros teatrales
de Examen; la API también ofrece su alias `subgenre`.

La narrativa de ficción se clasifica como «Novela», sin subdivisiones; las obras
dialogadas como «Diálogo» y Cigarrales de Toledo como «Miscelánea». Los títulos
y subgéneros revisados y sus fuentes están registrados en
`scripts/texoro-prose-metadata.json`. Las fuentes originales no se modifican. Los 60 títulos de prosa se han contrastado
con los textos y fuentes bibliográficas. Las notas `titleNote` documentan el alcance de la selección congelada original.
Las cuatro estafas conservan sus títulos y ordinales. Los cuatro textos
posteriormente recuperados se describen a continuación. Las cinco colecciones conservan el nombre de su
proyecto fuente.

Las colecciones con varios autores muestran «Varios». Sus autores se mantienen
en los datos. El filtro de autor selecciona colecciones que contienen ese autor;
la búsqueda se realiza en la colección completa, no solo en sus poemas.

Los autores importados se reconcilian mediante `scripts/texoro-author-aliases.json`
y las excepciones por registro de `texoro-record-author-overrides.json`. Las fuentes
y los candidatos descartados están en `texoro-author-aliases-evidence.json`.
Las variantes confirmadas reutilizan el ID del autor existente o un único ID nuevo;
no se alteran los autores ni las atribuciones del catálogo teatral original.
Entre otros, Cervantes, Boscán, Santa Teresa, San Juan de la Cruz, Medrano y
Laínez/Laynez tienen una sola entrada por persona. Francisco de Medrano permanece
separado de Sebastián Francisco de Medrano, y los homónimos no se fusionan sin
evidencia. «Anónimo» reutiliza el marcador «Desconocido» del catálogo.

Los filtros y metadatos HTTP se revalidan al visitar TEXORO; las opciones se
reutilizan durante esa visita. Así una caché anterior no vuelve a mostrar las
variantes eliminadas. La reconciliación solo modifica el catálogo y sus
atribuciones importadas: si los TXT son idénticos, se conserva el índice textual.

Las direcciones públicas de las 65 incorporaciones usan títulos naturales,
registrados en `scripts/texoro-work-slugs.json`, sin el nombre del corpus de
importación. Los identificadores y archivos de obras y resúmenes usan `TEXORO_`,
y los autores nuevos `texoro_author_`. Se conservan los IDs públicos numéricos.
La documentación privada mantiene la trazabilidad de las fuentes originales.

Los poemas están separados con un salto de página (`\f`) no indexado. El índice
registra los límites de cada poema: frases y proximidades no los atraviesan,
y los contextos se recortan dentro del poema correspondiente. Los títulos y
nombres añadidos al catálogo no se insertan en el cuerpo de las colecciones.

## Textos recuperados

Se completan cuatro obras a petición del usuario: Trapaza (capítulos I–XVI),
Lisardo enamorado (ocho libros), Guzmán de Alfarache (primera y segunda parte,
54 capítulos, incluido el soneto final omitido) y La pícara Justina (libro I
restituido antes del II; 24 capítulos entre los cuatro libros).

Trapaza y Lisardo emplean el cuerpo narrativo completo de la edición de BVMC,
con sus grafías, párrafos, versos y epígrafes; se excluyen navegación, aparato
editorial moderno y colofones. Guzmán y Justina conservan el texto seleccionado
original y añaden los pasajes recuperados documentados. Las fuentes y los cotejos
se guardan en `.local/texoro-multigenre/recovery/`.

El acceso al texto ofrece un enlace por fuente, con su nombre y un máximo de dos.
Trapaza y Lisardo enlazan a la Biblioteca Virtual Miguel de Cervantes; Guzmán y
Justina ofrecen también el texto de NovelaBarroca. Las páginas de recuperación y
los documentos de cotejo se mantienen en `source-details.json`.

El manifiesto `.local/texoro-multigenre/text-completions.json` identifica los
cuatro TXT completos, sus fuentes, títulos y SHA-256. `import-report.json`
registra también el hash del original congelado y del texto activo. El archivo
`document-provenance.tsv` sigue describiendo la selección original de BERTvantes;
no debe interpretarse como el hash de estos cuatro textos ampliados. El repositorio
del corpus congelado permanece intacto. Los ID, URL, autores y estados no cambian.

## Reproducir

Desde el repositorio ETSO, con el corpus privado clonado junto a él:

```sh
python3 scripts/prepare-texoro-multigenre.py --corpus ../BERTvantes-corpus \
  --text-completions .local/texoro-multigenre/text-completions.json \
  --summaries scripts/texoro-summaries
node scripts/build-summary-search-index.mjs \
  --sqlite .local/texoro-multigenre/catalogue.sqlite \
  --input .local/texoro-multigenre/resumenes \
  --output .local/texoro-multigenre/resumenes/search-index.json
NODE_OPTIONS=--max-old-space-size=24576 node scripts/build-search-index.mjs \
  --input .local/texoro-multigenre/texts \
  --output .local/texoro-multigenre/search \
  --metadata-sqlite .local/texoro-multigenre/catalogue.sqlite \
  --workers 4 --compact
node scripts/validate-search-index.mjs --index-dir .local/texoro-multigenre/search
LOCAL_CATALOG_ONLY=true \
  LOCAL_CATALOG_SQLITE_PATH="$PWD/.local/texoro-multigenre/catalogue.sqlite" \
  LOCAL_TEXORO_TEXTS_PATH="$PWD/.local/texoro-multigenre/texts" \
  LOCAL_TEXORO_INDEX_PATH="$PWD/.local/texoro-multigenre/search" \
  LOCAL_TEXORO_SUMMARIES_PATH="$PWD/.local/texoro-multigenre/resumenes" \
  PUBLIC_TEXORO_INDEX_BASE_URL=http://127.0.0.1:5174/api/local-texoro/index \
  npm run dev -- --host 127.0.0.1 --port 5174 --strictPort
```

El script comprueba los SHA-256 de los 8.037 textos incorporados, crea una copia
SQLite y enlaza los TXT teatrales existentes sin modificarlos. El catálogo y el
índice quedan en `.local/`, ignorada por Git. La vista local exige explícitamente
SQLite y TXT locales, sin recurrir a Turso o R2 para esos datos. La ruta del índice
local solo está disponible en desarrollo. No se ha publicado ni subido este corpus.

## Ubicación de los recursos maestros

Los 65 textos activos y los 65 resúmenes revisados se han copiado también a
`ETSOdatos/corpus/` y `ETSOdatos/resumenes/`, con los mismos nombres `TEXORO_`
que usa el catálogo local. Las 130 copias son idénticas a las versiones activas;
no se ha sobrescrito ningún recurso anterior. La verificación queda en
`.local/texoro-multigenre/master-assets-verification.json`. El TSV maestro y la
adaptación del preparador para género general y tamaño de colección siguen
pendientes; los candidatos TSV están en `tsv-review/`.


## Conciliación para despliegue de 29 de octubre de 2026

El SQLite y los assets de `deploy/input/` se regeneran desde los maestros de
ETSOdatos, incluidos sus sidecars de atribución: 245 participaciones en 124
obras y 149 frases tradicionales revisadas. Se conservan las 168 conclusiones
aprobadas del frente de colaboraciones. La participación no se convierte en
autoría exclusiva y las hipótesis alternativas conservan sus grupos.

Los 32 textos nuevos se conservan con hashes idénticos a las modernizaciones
revisadas. La separación de lagunas materiales y de los 7.977 poemas permanece
en el índice. Los nombres canónicos de Sor Juana se reconcilian con su autoridad
existente, sin cambiar los autores originales de las fuentes ni sus IDs.

El visor de texto, original y procedencia está en `http://127.0.0.1:6179`.
La preparación no ejecuta uploads, sincronización remota ni hook de Vercel.
La auditoría y los comandos de entrega se guardan en
`revisiones/reconciliacion_despliegue_20261029/`.
