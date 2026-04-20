# ETSO Search - Buscador "Examen de autorías"

Módulo Drupal 10 que implementa un buscador avanzado de obras teatrales con interfaz visual completa y filtros complejos de autoría y metadata.

## Características

### Búsqueda Flexible
- **Búsqueda por título**: Normalización automática usando el módulo `etso_normalizer`
- Búsqueda por palabras parciales sin necesidad de tildes
- Coincidencias en título original y variantes normalizadas

### Filtros de Autoría
- **Búsqueda por autor**: Autocompletado inteligente
- Filtrado por atribución tradicional o ETSO
- **Nivel de confianza**: Segura, Probable, No concluyente
- **Tipo de autoría**: Única, Colaboración, Desconocida

### Filtros Avanzados
- Solo con texto completo disponible
- Solo con informe estilométrico
- Estado del texto (taxonomía)
- Procedencia (taxonomía)
- Género (taxonomía)

### Interfaz Visual
- Diseño responsive (móvil, tablet, escritorio)
- Tabla expandible con detalles de cada obra
- Badges de confianza con colores diferenciados
- Lógica de colaboración (AND/OR) visual
- Paginación (20 resultados por página)

## Instalación

1. Asegurarse de que el módulo `etso_normalizer` esté instalado
2. Habilitar el módulo:
   ```bash
   drush pm:install etso_search -y
   drush cache:rebuild
   ```

## Uso

Accede al buscador en: **`/buscador-examen-de-autorias`**

## Estructura del Módulo

```
etso_search/
├── etso_search.info.yml           # Definición del módulo
├── etso_search.routing.yml        # Rutas (buscador + autocomplete)
├── etso_search.services.yml       # Registro de servicios
├── etso_search.libraries.yml      # Assets (CSS/JS)
├── etso_search.module             # Hooks de Drupal
├── src/
│   ├── Controller/
│   │   └── BuscadorObrasController.php   # Controlador principal
│   ├── Form/
│   │   └── BuscadorObrasForm.php         # Formulario de filtros
│   └── Service/
│       └── BuscadorObrasService.php      # Lógica de búsqueda
├── templates/
│   └── buscador-obras.html.twig          # Template principal
├── css/
│   └── buscador-obras.css                # Estilos
└── js/
    └── buscador-obras.js                 # Interactividad
```

## Campos Requeridos en Content Type "obra"

### Campos básicos
- `title`: Título de la obra
- `field_field_title_search`: Índice normalizado (generado por etso_normalizer)
- `field_obra_genero`: Taxonomía Género
- `field_resumen_breve`: Resumen corto
- `field_acceso_texto`: Link al texto completo
- `field_obra_file`: Nombre del archivo (indica disponibilidad de informe)

### Campos de metadata
- `field_obra_procedencia`: Taxonomía Procedencia
- `field_obra_estado`: Taxonomía Estado del texto

### Paragraphs de atribución
- `field_grupo_atrib_trad`: Atribución tradicional (paragraph)
  - `field_atrib_trad`: Referencias a nodos "autor" (múltiple)
- `field_grupo_atrib_etso`: Atribución ETSO (paragraph)
  - `field_atrib_etso`: Referencia a nodo "autor" (simple)
  - `field_confianza_atrib`: List string (segura|probable|no_concluyente)

## Lógica de Atribuciones

### Atribución Tradicional
- **Múltiples autores en UN grupo** = Colaboración (AND)
  - Ejemplo: `[AutorA, AutorB]` → "AutorA Y AutorB"
- **Múltiples GRUPOS** = Alternativas (OR)
  - Ejemplo: `[AutorA] [AutorB]` → "AutorA O AutorB"
- **Combinado**: `[AutorA, AutorB] [AutorC]` → "(AutorA Y AutorB) O AutorC"

### Atribución ETSO
- **Múltiples grupos** = Coautoría (AND)
  - Ejemplo: Grupo1[AutorA, segura] + Grupo2[AutorB, probable]
  - Resultado: "AutorA (Segura) Y AutorB (Probable)"
- **Caso especial**: `confianza=no_concluyente` + autor vacío
  - Muestra: "El análisis no apunta hacia ningún autor"

## API del Servicio

### BuscadorObrasService

```php
// Búsqueda de obras
$filters = [
  'titulo' => 'castigo venganza',
  'genero' => 123,
  'autor' => [45, 67],
  'buscar_en' => ['tradicional', 'etso'],
  'nivel_confianza' => ['segura'],
  'tipo_autoria' => 'colaboracion',
  'con_texto' => TRUE,
  'page' => 0,
];

$result = $buscador_service->searchObras($filters);
// Retorna: ['obras' => [...], 'total' => 150, 'page' => 0, 'per_page' => 20]

// Procesar obra individual
$obra_data = $buscador_service->procesarObra($node);
// Retorna array estructurado con atribuciones procesadas

// Autocompletado de autores
$results = $buscador_service->autocompleteAutor('lope', 10);
// Retorna: [['value' => nid, 'label' => 'Lope de Vega'], ...]

// Obtener opciones de taxonomía
$generos = $buscador_service->getTaxonomyOptions('genero');
// Retorna: [tid => 'Nombre del término', ...]
```

## Extensibilidad

### Agregar nuevos filtros

1. **En BuscadorObrasForm.php**: Agregar campo al formulario
2. **En BuscadorObrasService.php**: Agregar condición a `searchObras()`
3. **En BuscadorObrasController.php**: Mapear parámetro en `extractFiltersFromRequest()`

### Personalizar visualización

- Modificar template: `templates/buscador-obras.html.twig`
- Ajustar estilos: `css/buscador-obras.css`
- Agregar interactividad: `js/buscador-obras.js`

### Hook de preprocesamiento

```php
function MYTHEME_preprocess_buscador_obras(&$variables) {
  // Personalizar variables antes del render
}
```

## Dependencias

- **Drupal Core**: ^10
- **Módulos contrib**:
  - `paragraphs:paragraphs`
- **Módulos custom**:
  - `etso_normalizer:etso_normalizer`

## Permisos

El buscador requiere el permiso `access content` (acceso básico al contenido).

Para administrar obras se requieren permisos adicionales de edición de nodos.

## Rutas

- **Buscador**: `/buscador-examen-de-autorias`
- **Autocomplete**: `/etso-search/autocomplete/autor`

## Configuración de Taxonomías

Asegúrate de tener las siguientes taxonomías configuradas:
- `genero`: Género de las obras
- `procedencia`: Procedencia del texto
- `estado_del_texto`: Estado del texto

## Troubleshooting

### No aparecen resultados
- Verificar que `etso_normalizer` esté habilitado
- Ejecutar `drush etso_normalizer:populate` para generar índices
- Limpiar caché: `drush cache:rebuild`

## Despliegue

- Tras desplegar cambios en normalización/indexado de títulos, es obligatorio reindexar obras existentes con `drush etso_normalizer:populate`.
- Sin ese paso, solo se actualizarán índices de obras nuevas o editadas posteriormente.

### Error en atribuciones
- Verificar que los paragraphs estén correctamente configurados
- Verificar que los campos `field_atrib_trad` y `field_atrib_etso` existan
- Comprobar que los nodos de autor estén publicados

### Autocompletado no funciona
- Verificar que la ruta `etso_search.autocomplete_autor` esté accesible
- Comprobar permisos del usuario
- Verificar que existan nodos de tipo "autor"

## Caché

El módulo usa cache tags:
- `node_list:obra`: Se invalida al crear/editar/eliminar obras
- Cache contexts: `url.query_args` (para filtros en URL)

## Testing

### Casos de prueba sugeridos

1. Búsqueda por título con variantes normalizadas
2. Búsqueda por autor en tradicional y ETSO
3. Filtros combinados múltiples
4. Colaboraciones AND/OR correctamente mostradas
5. Caso especial "El análisis no apunta hacia ningún autor"
6. Paginación funcional
7. Responsive en diferentes resoluciones
8. Accesibilidad con lector de pantalla

## Autor

Proyecto ETSO - Estilometría aplicada al Teatro del Siglo de Oro

## Licencia

GPL-2.0+
