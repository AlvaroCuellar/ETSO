# Bibliografía de ETSO

La bibliografía de los informes no depende del TSV ni de un campo de SQLite.
La columna `Citar` está retirada del catálogo y del generador. La cita general de
ETSO sigue en `bibliografia.json`, con la misma función de copiar cita.

## Fuentes y orden

- `bibliografia.json`: registro único de referencias, con claves estables en
  `entriesByKey`. Sus vistas definen el orden editorial y las referencias
  metodológicas que se muestran en todos los informes.
- `informes-relacionados.json` (`schemaVersion: 1`): reglas que enlazan referencias
  con `workIds` y/o `authorIds` del catálogo. Una regla coincide si aparece una de
  sus obras **o** uno de sus autores. Se consultan la atribución tradicional y la
  estilométrica, incluidas alternativas y colaboraciones, independientemente del
  grado de confianza. Los vecinos de las tablas de distancias no activan reglas.
- `moreInformation.sourceSectionIds`: secciones de la vista `comoCitarnos` que
  forman la lista completa de trabajos disponibles. Actualmente usa
  `algunos-trabajos`, compartida con «Cómo citarnos». No se infiere la pertenencia
  por apellidos, títulos ni prefijos de claves.

El informe muestra la cita general, los estudios relacionados y los metodológicos.
«Más información» contiene los trabajos de las secciones fuente que no se han
mostrado ya en ninguna de esas partes. Se conserva el orden configurado y se
eliminan duplicados por clave. Si una selección queda vacía, no se muestra.
En la regla de Lope se conserva el orden acordado: Germán (2021), tesis (2022),
Germán (2023).

## Añadir o modificar un trabajo

1. Crear su entrada en `bibliografia.json`, con una clave nueva y estable, autor,
   año, título y datos editoriales; añadir DOI o URL cuando corresponda. No cambiar
   una clave para corregir un título o una errata. El estado «En prensa» se declara
   en `note` y no equivale a publicación confirmada.
2. Incorporar la clave a `views.comoCitarnos.sections[id=algunos-trabajos].entryKeys`
   en el orden deseado. Así aparece automáticamente en «Más información» de los
   informes que no la muestran arriba.
3. Si el estudio trata una obra concreta, añadir una regla con sus `workIds`.
   Para estudios generales de un repertorio, usar los `authorIds` adecuados.
   No asociar un estudio monográfico a todo el repertorio de un autor por defecto.
   Distinguir homónimos, autos, versiones y refundiciones mediante sus IDs.
   La asociación es con la obra en general: no exige que el artículo y el catálogo
   utilicen la misma edición. Las diferencias de edición se registran en la auditoría;
   las refundiciones o versiones sustancialmente distintas conservan su identidad.
4. Si es un trabajo metodológico común, incluir su clave en la sección
   `bibliografia-metodologia` de la base de informes.
5. Ejecutar las comprobaciones de abajo y revisar un informe afectado en local.
   No es necesario editar el código para añadir referencias o reglas.

## Validación y publicación

```sh
npm run bibliography:validate:catalog  # IDs contra el SQLite local preparado
npm run test:bibliography
npm run check
npm run build
```

`bibliography:validate:catalog` necesita `deploy/input/turso/etso.sqlite`, abierto
solo en lectura. La validación rechaza versiones de esquema no soportadas,
selectores vacíos o mal escritos, IDs duplicados o inexistentes, referencias
inexistentes, metadatos insuficientes y estudios de reglas no registrados en las
secciones bibliográficas seleccionadas. No realiza consultas de red.

La preparación de un despliegue ejecuta la misma validación contra el SQLite
recién generado **antes de cualquier subida o modificación remota**. Si pasa,
actualiza de forma determinista `catalogo-identificadores.json`, un snapshot
versionado que contiene exclusivamente IDs de obras y autores. Debe incluirse
junto con los cambios de catálogo y bibliografía en la revisión de Git.

La compilación (`prebuild`) valida contra ese snapshot, por lo que también funciona
en Vercel sin el SQLite privado ni credenciales de Turso. Si el snapshot falta o
es inválido, la compilación falla; no se ignora el error ni se consulta otra fuente.
Para actualizarlo manualmente tras preparar un catálogo:

```sh
node scripts/validate-report-bibliography.mjs --write-catalog-snapshot data/referencias/catalogo-identificadores.json
```

Para ensayar el flujo completo sin publicar, desde `ETSOdatos`:

```sh
.venv/bin/python scripts/deploy_cetso_full.py --dry-run
```

La sincronización de Turso incluye una migración específica para retirar el índice
`idx_works_citar` y la columna `works.citar`. Otras diferencias de esquema no
reconocidas siguen bloqueando la sincronización. Los catálogos antiguos que aún
contengan `Citar` deben migrarse antes de preparar nuevos datos; el validador evita
que se reintroduzca la columna. El Excel original de respaldo no se modifica.

Preparar y validar no publica: el despliegue real sigue siendo una acción separada.

## Notas de los informes y figuras de la tesis

`Notas` es una columna del TSV maestro, inmediatamente después de `RESULTADO2`.
El preparador conserva párrafos separados por líneas vacías, saltos de verso y las
etiquetas simples `<i>`. El SQLite contiene `works.notas`; el runtime carga ese
texto solo para el informe consultado. Los catálogos anteriores sin esa columna
siguen siendo legibles y la migración añade una columna nullable.

La incorporación documentada se hace con `scripts/apply-reviewed-report-notes.py`.
Su bundle de revisión registra el ID de la obra y su versión, la referencia central,
páginas, PDF y SHA256, responsables del cotejo y omisiones editoriales. Solo acepta
`verified_for_catalog`. El registro de aplicación protege cualquier modificación
manual posterior de una celda, incluido su vaciado; un conflicto impide sobrescribirla.
Las notas literales conservan el cuerpo de la entrada. El aparato interno del artículo
se conserva en la auditoría, sin trasladarlo automáticamente a la ficha.

En la presentación, `Como se apunta en ` introduce un pasaje literal y abre un
bloque de cita. `Resumen del estudio: ` introduce una síntesis sin comillas. Los
párrafos libres se muestran como prosa. Los DOI y URL HTTP(S) son enlaces; el resto
del HTML se escapa, salvo las etiquetas exactas de cursiva. No introducir HTML de
anclas o imágenes en el TSV. Las referencias citadas en notas deben tener también
reglas explícitas por ID en `informes-relacionados.json`.

Las imágenes originales de la tesis se documentan en el manifiesto de revisión
`revisiones/notas_informes/tesis/manifest_graficas.json`. Las explicaciones específicas
se encuentran en `resultados_por_obra.json`. `scripts/prepare-thesis-report-graphics.py`
prepara `graficas-tesis.json` y los PNG estáticos de las figuras elegibles; excluye
figuras erróneas del original y versiones sin correspondencia segura. La explicación
se refiere únicamente a los experimentos presentes en cada ficha y sus resultados.
Las divisiones en mitades y tercios son porciones del texto, no jornadas.

`npm run thesis:validate`, también incluido en `prebuild`, comprueba referencias,
IDs, coherencia de comentarios y páginas, rutas, tipos de figura, hashes y dimensiones
originales de todos los PNG. El servidor transmite únicamente los datos de la obra
consultada. Cambiar o borrar un asset sin actualizar la revisión impide compilar.
