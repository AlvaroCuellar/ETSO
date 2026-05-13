# Esquema SQLite mínimo de salida para la nueva web

Este documento define el esquema SQLite de salida que necesito como base de datos mínima para la nueva web. Intenta encajar a partir de este modelo un script de transformación del excel/csv. Si ves que algo no funciona, me dices, y tratamos de adaptar tanto este modelo como alguna cosita en tu excel, pero yo creo que puede ir bien así.

## 1. Principios generales

### 1.1. Identificador de obra

El identificador único de cada obra será el nombre base del archivo `.txt` asociado.

Ejemplo:

- archivo: `AGUAYO_GranCapitan(Transk-MSS).txt`
- `works.id`: `AGUAYO_GranCapitan(Transk-MSS)`

La aplicación web asumirá que el texto completo de cada obra se localizará externamente como:

- `texts/{id}.txt`

### 1.2. Identificador de autor

Cada autor tendrá una clave normalizada estable (`author_id`), usada también en Excel y en las atribuciones.

Ejemplo:

- `vega_carpio_lope_de` → `Vega Carpio, Lope de`

### 1.3. Tipos de atribución

La base de datos debe conservar dos sistemas de atribución:

- `tradicional`
- `estilometria`

Ambos pueden expresarse mediante fórmulas lógicas con `AND` y `OR`.

La atribución basada en estilometría puede añadir además un nivel de `confianza` en cada autor, expresado en origen como:

- `author_id[confianza]`

Ejemplo:

- `vega_carpio_lope_de[segura] AND molina_tirso_de[probable]`

---

## 2. Tablas

## 2.1. Tabla `works`

```sql
CREATE TABLE works (
    id TEXT PRIMARY KEY,
    archivo TEXT NOT NULL,
    titulo TEXT NOT NULL,
    otrostitulos TEXT,
    genero TEXT,
    adicion TEXT,
    estado_texto TEXT,
    citar TEXT,
    examen_autorias INTEGER,
    automatizacion_david INTEGER,
    bicuve INTEGER,
    bicuve_nombre TEXT,
    tiene_acceso_externo INTEGER,
    procede TEXT,
    resultado1 TEXT,
    resultado2 TEXT,
    resumen_breve TEXT
);
```

---

## 2.2. Tabla `authors`

```sql
CREATE TABLE authors (
    id TEXT PRIMARY KEY,
    nombre TEXT NOT NULL
);
```

---

## 2.3. Tabla `attribution_sets`

```sql
CREATE TABLE attribution_sets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    work_id TEXT NOT NULL,
    attribution_type TEXT NOT NULL,
    raw_expression TEXT,
    FOREIGN KEY (work_id) REFERENCES works(id) ON DELETE CASCADE
);
```

---

## 2.4. Tabla `attribution_groups`

```sql
CREATE TABLE attribution_groups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    attribution_set_id INTEGER NOT NULL,
    group_order INTEGER NOT NULL,
    FOREIGN KEY (attribution_set_id) REFERENCES attribution_sets(id) ON DELETE CASCADE
);
```

---

## 2.5. Tabla `attribution_members`

```sql
CREATE TABLE attribution_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    attribution_group_id INTEGER NOT NULL,
    author_id TEXT NOT NULL,
    confianza TEXT,
    member_order INTEGER NOT NULL,
    FOREIGN KEY (attribution_group_id) REFERENCES attribution_groups(id) ON DELETE CASCADE
);
```

---

## 2.6. Tabla `work_author_index`

```sql
CREATE TABLE work_author_index (
    work_id TEXT NOT NULL,
    author_id TEXT NOT NULL,
    attribution_type TEXT NOT NULL,
    confianza TEXT,
    occurrences INTEGER NOT NULL,
    PRIMARY KEY (work_id, author_id, attribution_type, confianza),
    FOREIGN KEY (work_id) REFERENCES works(id) ON DELETE CASCADE
);
```

---

## 2.7. Tabla `text_access`

```sql
CREATE TABLE text_access (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    work_id TEXT NOT NULL,
    tipo TEXT,
    etiqueta TEXT,
    url TEXT,
    position INTEGER,
    FOREIGN KEY (work_id) REFERENCES works(id) ON DELETE CASCADE
);
```

---

## 2.8. Tabla `work_distances`

```sql
CREATE TABLE work_distances (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    work_id TEXT NOT NULL,
    ambito TEXT NOT NULL,
    rank INTEGER NOT NULL,
    related_work_id TEXT NOT NULL,
    distancia REAL NOT NULL,
    FOREIGN KEY (work_id) REFERENCES works(id) ON DELETE CASCADE
);
```

---

## 3. Índices mínimos

```sql
CREATE INDEX idx_works_titulo ON works(titulo);
CREATE INDEX idx_works_otrostitulos ON works(otrostitulos);
CREATE INDEX idx_works_genero ON works(genero);
CREATE INDEX idx_works_citar ON works(citar);

CREATE INDEX idx_attr_work ON attribution_sets(work_id);

CREATE INDEX idx_author_index_author ON work_author_index(author_id);

CREATE INDEX idx_access_work ON text_access(work_id);

CREATE INDEX idx_dist_work ON work_distances(work_id);

CREATE INDEX idx_dist_work_ambito ON work_distances(work_id, ambito, rank);
```

---

## 4. Reglas de transformación

### 4.1. Obras

Cada obra del catálogo debe producir una fila en `works`.

### 4.2. Autores

Todo `author_id` referido en las atribuciones debe existir en `authors`.

### 4.3. Atribución tradicional

Debe parsearse como fórmula lógica con `AND` y `OR`, generando:

- 1 fila en `attribution_sets`
- N filas en `attribution_groups`
- M filas en `attribution_members`

Ejemplo:

```
(a AND b) OR (c AND d)
```

---

### 4.4. Atribución estilometría

Debe parsearse con la misma lógica, añadiendo `confianza`.

Ejemplo:

```
a[segura] AND b[probable]
```

---

### 4.5. Índice derivado

Debe generarse `work_author_index` a partir de las tablas de atribución.

---

### 4.6. Distancias estilométricas

Cada bloque de distancias genera 20 filas en `work_distances`.

- `ambito`: `obracompleta`, `jornada1`, etc.
- `rank`: 1–20

---

## 5. Relación con archivos externos

- texto: `texts/{id}.txt`
- resumen: `resúmenes/{id}.json`

Los informes se construyen dinámicamente a partir de:

- `resultado1`
- `resultado2`
- `work_distances`

Los índices de TEXORO usarán los `work.id` para poder mostrar metadatos en los resultados de búsqueda, acceso al texto completo, etc.
