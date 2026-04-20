<?php

namespace Drupal\etso_search\Form;

use Drupal\Core\Form\FormBase;
use Drupal\Core\Form\FormStateInterface;
use Drupal\etso_search\Service\BuscadorObrasService;
use Symfony\Component\DependencyInjection\ContainerInterface;
use Symfony\Component\HttpFoundation\RequestStack;
use Drupal\Core\Url;
use Drupal\Component\Utility\UrlHelper;

/**
 * Formulario de búsqueda de obras.
 *
 * Implementa el formulario de filtros para el buscador
 * "Examen de autorías" con búsqueda por título, autor,
 * género, confianza, y otros metadatos.
 *
 * Usa método GET para persistir los filtros en la URL.
 */
class BuscadorObrasForm extends FormBase {

  /**
   * The buscador service.
   *
   * @var \Drupal\etso_search\Service\BuscadorObrasService
   */
  protected $buscadorService;

  /**
   * The request stack.
   *
   * @var \Symfony\Component\HttpFoundation\RequestStack
   */
  protected $requestStack;

  /**
   * Constructs a BuscadorObrasForm object.
   *
   * @param \Drupal\etso_search\Service\BuscadorObrasService $buscador_service
   *   The buscador service.
   * @param \Symfony\Component\HttpFoundation\RequestStack $request_stack
   *   The request stack.
   */
  public function __construct(BuscadorObrasService $buscador_service, RequestStack $request_stack) {
    $this->buscadorService = $buscador_service;
    $this->requestStack = $request_stack;
  }

  /**
   * {@inheritdoc}
   */
  public static function create(ContainerInterface $container) {
    return new static(
      $container->get('etso_search.buscador_service'),
      $container->get('request_stack')
    );
  }

  /**
   * {@inheritdoc}
   */
  public function getFormId() {
    return 'etso_search_buscador_form';
  }

  /**
   * Obtiene valores actuales de la URL.
   *
   * @return array
   *   Array con valores de filtros desde la URL.
   */
  protected function getValuesFromUrl(): array {
    $request = $this->requestStack->getCurrentRequest();
    $query = $request->query->all();
    
    return [
      'titulo' => $query['titulo'] ?? '',
      'genero' => $query['genero'] ?? '',
      'autor_ids' => $query['autor_ids'] ?? '',
      'autor_match_main' => $query['autor_match_main'] ?? 'or',
      'autor_trad_ids' => $query['autor_trad_ids'] ?? '',
      'autor_match_trad' => $query['autor_match_trad'] ?? 'or',
      'autor_esto_ids' => $query['autor_esto_ids'] ?? '',
      'autor_match_esto' => $query['autor_match_esto'] ?? 'or',
      'nivel_confianza' => $query['nivel_confianza'] ?? '',
      'tipo_autoria' => $query['tipo_autoria'] ?? '',
      'estado' => $query['estado'] ?? '',
      'procedencia' => $query['procedencia'] ?? '',
      'fecha_adicion_desde' => $query['fecha_adicion_desde'] ?? '',
      'fecha_adicion_hasta' => $query['fecha_adicion_hasta'] ?? '',
    ];
  }

  /**
   * {@inheritdoc}
   */
  public function buildForm(array $form, FormStateInterface $form_state, bool $embedded = FALSE) {
    // Obtener valores desde la URL para persistencia
    $url_values = $this->getValuesFromUrl();
    $action_url = $this->getActionUrl($embedded);

    // Usar método GET para que los parámetros queden en la URL
    $form['#method'] = 'get';
    $form['#action'] = $action_url;
    $form['#attributes']['class'][] = 'buscador-form';
    $form['#attributes']['class'][] = 'etso-buscador';

    // Contenedor de filtros
    $form['filters'] = [
      '#type' => 'container',
      '#attributes' => ['class' => ['filters-section']],
    ];

    $selected_main = $this->getSelectedAuthorsByCsv((string) $url_values['autor_ids']);
    $selected_trad = $this->getSelectedAuthorsByCsv((string) $url_values['autor_trad_ids']);
    $selected_esto = $this->getSelectedAuthorsByCsv((string) $url_values['autor_esto_ids']);
    $selected_conf = $this->getSelectedConfidenceByCsv((string) $url_values['nivel_confianza']);
    $selected_genero = $this->getSelectedTaxonomyByCsv('genero', (string) $url_values['genero']);
    $selected_tipo_autoria = $this->getSelectedTipoAutoriaByCsv((string) $url_values['tipo_autoria']);
    $selected_estado = $this->getSelectedTaxonomyByCsv('estado', (string) $url_values['estado']);
    $selected_procedencia = $this->getSelectedTaxonomyByCsv('procedencia', (string) $url_values['procedencia']);

    // BÚSQUEDA PRINCIPAL (destacada)
    $form['filters']['search_primary'] = [
      '#type' => 'container',
      '#attributes' => ['class' => ['search-primary']],
    ];

    // Título de sección para búsqueda principal (igual que otras secciones)
    $form['filters']['search_primary']['title'] = [
      '#markup' => '<div class="filter-section-title">' . $this->t('Búsqueda') . '</div>',
    ];

    $form['filters']['search_primary']['row_title_genero'] = [
      '#type' => 'container',
      '#attributes' => ['class' => ['filter-row', 'two-cols', 'row-title-genero']],
    ];

    $form['filters']['search_primary']['row_title_genero']['titulo'] = $this->withFieldHelp([
      '#type' => 'textfield',
      '#title' => $this->t('Título'),
      '#default_value' => $url_values['titulo'],
      '#placeholder' => $this->t('Ej: cada paso peligro, verdades amor...'),
      '#attributes' => [
        'class' => ['filter-group'],
      ],
    ], 'titulo', (string) $this->t('Busca por palabras del título.'));

    // Obtener géneros de taxonomía
    $generos = $this->buscadorService->getTaxonomyOptions('genero');
    $genero_options = ['' => $this->t('- Cualquiera -')] + $generos;

    $form['filters']['search_primary']['row_title_genero']['genero_ui'] = $this->withFieldHelp([
      '#type' => 'textfield',
      '#title' => $this->t('Género'),
      '#default_value' => '',
      '#placeholder' => $this->t('Escribe y selecciona géneros'),
      '#attributes' => [
        'class' => ['filter-group', 'js-static-multiselect'],
        'data-hidden-name' => 'genero',
        'data-selected-labels' => json_encode($selected_genero, JSON_UNESCAPED_UNICODE),
        'data-static-options' => json_encode($this->buildStaticOptions($genero_options), JSON_UNESCAPED_UNICODE),
      ],
    ], 'genero', (string) $this->t('Selecciona uno o varios géneros. Puedes escribir para filtrar opciones.'));
    $form['filters']['search_primary']['row_title_genero']['genero'] = [
      '#type' => 'hidden',
      '#value' => (string) $url_values['genero'],
    ];

    $form['filters']['search_primary']['row_autor'] = [
      '#type' => 'container',
      '#attributes' => ['class' => ['filter-row', 'full', 'row-autor-principal']],
    ];

    $form['filters']['search_primary']['row_autor']['autor_principal_ui'] = $this->withFieldHelp([
      '#type' => 'textfield',
      '#title' => $this->t('Atribución'),
      '#default_value' => '',
      '#placeholder' => $this->t('Escribe y selecciona autores'),
      '#attributes' => [
        'class' => ['filter-group', 'js-author-multiselect'],
        'data-hidden-name' => 'autor_ids',
        'data-role' => 'main',
        'data-selected-labels' => json_encode($selected_main, JSON_UNESCAPED_UNICODE),
      ],
    ], 'atribucion', (string) $this->t('Permite multiselección de autores. Este campo se desactiva si usas Atribución tradicional o estilometría en Más filtros.'));

    $form['filters']['search_primary']['row_autor']['autor_ids'] = [
      '#type' => 'hidden',
      '#value' => (string) $url_values['autor_ids'],
    ];

    // FILTROS AVANZADOS (colapsables)
    $form['filters']['advanced'] = [
      '#type' => 'container',
      '#attributes' => ['class' => ['advanced-filters']],
    ];

    $form['filters']['advanced']['toggle'] = [
      '#type' => 'html_tag',
      '#tag' => 'button',
      '#value' => $this->t('Más filtros'),
      '#attributes' => [
        'type' => 'button',
        'class' => ['advanced-toggle'],
        'data-target' => 'advanced-content',
      ],
    ];

    $form['filters']['advanced']['content'] = [
      '#type' => 'container',
      '#attributes' => [
        'id' => 'advanced-content',
        'class' => ['advanced-content', 'hidden'],
      ],
    ];

    // Filtros de autoría avanzada.
    $form['filters']['advanced']['content']['autoria_avanzada'] = [
      '#type' => 'container',
      '#attributes' => ['class' => ['filter-section']],
    ];

    $form['filters']['advanced']['content']['autoria_avanzada']['title'] = [
      '#markup' => '<div class="filter-section-title">' . $this->t('Filtros de autoría') . '</div>',
    ];

    $form['filters']['advanced']['content']['autoria_avanzada']['row_tipo'] = [
      '#type' => 'container',
      '#attributes' => ['class' => ['filter-row', 'full', 'autoria-general-row']],
    ];

    $form['filters']['advanced']['content']['autoria_avanzada']['row_tipo']['tipo_autoria_ui'] = $this->withFieldHelp([
      '#type' => 'textfield',
      '#title' => $this->t('Tipo de autoría'),
      '#default_value' => '',
      '#placeholder' => $this->t('Selecciona uno o varios tipos'),
      '#attributes' => [
        'class' => ['filter-group', 'js-static-multiselect'],
        'data-hidden-name' => 'tipo_autoria',
        'data-selected-labels' => json_encode($selected_tipo_autoria, JSON_UNESCAPED_UNICODE),
        'data-static-options' => json_encode([
          ['id' => 'unica', 'label' => (string) $this->t('Única')],
          ['id' => 'colaboracion', 'label' => (string) $this->t('Colaboración')],
        ], JSON_UNESCAPED_UNICODE),
      ],
    ], 'tipo_autoria', (string) $this->t('Obras de un solo autor (Única) o de varios autores (Colaboración).'));
    $form['filters']['advanced']['content']['autoria_avanzada']['row_tipo']['tipo_autoria'] = [
      '#type' => 'hidden',
      '#value' => (string) $url_values['tipo_autoria'],
    ];

    $form['filters']['advanced']['content']['autoria_avanzada']['columns'] = [
      '#type' => 'container',
      '#attributes' => ['class' => ['autoria-columns']],
    ];

    $form['filters']['advanced']['content']['autoria_avanzada']['columns']['trad_card'] = [
      '#type' => 'container',
      '#attributes' => ['class' => ['autoria-card', 'autoria-card--tradicional']],
    ];

    $form['filters']['advanced']['content']['autoria_avanzada']['columns']['trad_card']['autor_trad_ui'] = $this->withFieldHelp([
      '#type' => 'textfield',
      '#title' => $this->t('Atribución tradicional'),
      '#default_value' => '',
      '#placeholder' => $this->t('Escribe y selecciona autores'),
      '#attributes' => [
        'class' => ['filter-group', 'js-author-multiselect'],
        'data-hidden-name' => 'autor_trad_ids',
        'data-role' => 'trad',
        'data-selected-labels' => json_encode($selected_trad, JSON_UNESCAPED_UNICODE),
      ],
    ], 'atribucion_tradicional', (string) $this->t('Autores propuestos desde la tradición filológica. Puedes seleccionar varios.'));

    $form['filters']['advanced']['content']['autoria_avanzada']['columns']['trad_card']['autor_trad_ids'] = [
      '#type' => 'hidden',
      '#value' => (string) $url_values['autor_trad_ids'],
    ];

    $form['filters']['advanced']['content']['autoria_avanzada']['columns']['trad_card']['autor_match_trad'] = $this->withFieldHelp([
      '#type' => 'radios',
      '#title' => $this->t('Coincidencia'),
      '#options' => [
        'or' => $this->t('Cualquiera (OR)'),
        'and' => $this->t('Todos (AND)'),
      ],
      '#default_value' => $url_values['autor_match_trad'],
      '#description' => $this->t('Se aplica a los autores seleccionados en Atribución tradicional.'),
      '#attributes' => [
        'class' => ['filter-group', 'radio-group', 'js-match-toggle'],
      ],
    ], 'coincidencia_tradicional', (string) $this->t('OR muestra obras con cualquiera de los autores seleccionados. AND exige que estén todos.'));

    $form['filters']['advanced']['content']['autoria_avanzada']['columns']['esto_card'] = [
      '#type' => 'container',
      '#attributes' => ['class' => ['autoria-card', 'autoria-card--estilometria']],
    ];

    $form['filters']['advanced']['content']['autoria_avanzada']['columns']['esto_card']['autor_esto_ui'] = $this->withFieldHelp([
      '#type' => 'textfield',
      '#title' => $this->t('Atribución estilometría'),
      '#default_value' => '',
      '#placeholder' => $this->t('Escribe y selecciona autores'),
      '#attributes' => [
        'class' => ['filter-group', 'js-author-multiselect'],
        'data-hidden-name' => 'autor_esto_ids',
        'data-role' => 'esto',
        'data-selected-labels' => json_encode($selected_esto, JSON_UNESCAPED_UNICODE),
      ],
    ], 'atribucion_estilometria', (string) $this->t('Autores propuestos a partir del análisis estilométrico. Puedes seleccionar varios.'));

    $form['filters']['advanced']['content']['autoria_avanzada']['columns']['esto_card']['autor_esto_ids'] = [
      '#type' => 'hidden',
      '#value' => (string) $url_values['autor_esto_ids'],
    ];

    $form['filters']['advanced']['content']['autoria_avanzada']['columns']['esto_card']['row_esto_controls'] = [
      '#type' => 'container',
      '#attributes' => ['class' => ['filter-row', 'two-cols', 'row-esto-controls']],
    ];

    $form['filters']['advanced']['content']['autoria_avanzada']['columns']['esto_card']['row_esto_controls']['autor_match_esto'] = $this->withFieldHelp([
      '#type' => 'radios',
      '#title' => $this->t('Coincidencia'),
      '#options' => [
        'or' => $this->t('Cualquiera (OR)'),
        'and' => $this->t('Todos (AND)'),
      ],
      '#default_value' => $url_values['autor_match_esto'],
      '#description' => $this->t('Se aplica a los autores seleccionados en Atribución estilometría.'),
      '#attributes' => ['class' => ['filter-group', 'radio-group', 'js-match-toggle', 'match-control']],
    ], 'coincidencia_estilometria', (string) $this->t('OR muestra obras con cualquiera de los autores seleccionados. AND exige que estén todos.'));

    $form['filters']['advanced']['content']['autoria_avanzada']['columns']['esto_card']['row_esto_controls']['nivel_confianza_ui'] = $this->withFieldHelp([
      '#type' => 'textfield',
      '#title' => $this->t('Nivel de confianza'),
      '#default_value' => '',
      '#placeholder' => $this->t('Selecciona uno o varios niveles'),
      '#attributes' => [
        'class' => ['filter-group', 'js-static-multiselect', 'confidence-control'],
        'data-hidden-name' => 'nivel_confianza',
        'data-selected-labels' => json_encode($selected_conf, JSON_UNESCAPED_UNICODE),
        'data-static-options' => json_encode([
          ['id' => 'segura', 'label' => (string) $this->t('Segura')],
          ['id' => 'probable', 'label' => (string) $this->t('Probable')],
        ], JSON_UNESCAPED_UNICODE),
      ],
    ], 'nivel_confianza', (string) $this->t('Filtra por el grado de certeza de la atribución resultante del análisis estilométrico.'));

    $form['filters']['advanced']['content']['autoria_avanzada']['columns']['esto_card']['nivel_confianza'] = [
      '#type' => 'hidden',
      '#value' => (string) $url_values['nivel_confianza'],
    ];

    // Filtros técnicos.
    $form['filters']['advanced']['content']['tecnicos'] = [
      '#type' => 'container',
      '#attributes' => ['class' => ['filter-section']],
    ];

    $form['filters']['advanced']['content']['tecnicos']['title'] = [
      '#markup' => '<div class="filter-section-title">' . $this->t('Filtros técnicos') . '</div>',
    ];

    $form['filters']['advanced']['content']['tecnicos']['row_main'] = [
      '#type' => 'container',
      '#attributes' => ['class' => ['filter-row', 'two-cols']],
    ];

    // Obtener estados de taxonomía
    $estados = $this->buscadorService->getTaxonomyOptions('estado');
    $estado_options = ['' => $this->t('- Cualquiera -')] + $estados;

    $form['filters']['advanced']['content']['tecnicos']['row_main']['estado_ui'] = $this->withFieldHelp([
      '#type' => 'textfield',
      '#title' => $this->t('Estado del texto'),
      '#default_value' => '',
      '#placeholder' => $this->t('Escribe y selecciona estados'),
      '#attributes' => [
        'class' => ['filter-group', 'js-static-multiselect'],
        'data-hidden-name' => 'estado',
        'data-selected-labels' => json_encode($selected_estado, JSON_UNESCAPED_UNICODE),
        'data-static-options' => json_encode($this->buildStaticOptions($estado_options), JSON_UNESCAPED_UNICODE),
      ],
    ], 'estado_texto', (string) $this->t('Selecciona uno o varios estados del texto utilizado para el análisis estilométrico.'));
    $form['filters']['advanced']['content']['tecnicos']['row_main']['estado'] = [
      '#type' => 'hidden',
      '#value' => (string) $url_values['estado'],
    ];

    // Obtener procedencias de taxonomía
    $procedencias = $this->buscadorService->getTaxonomyOptions('procedencia');
    $procedencia_options = ['' => $this->t('- Cualquiera -')] + $procedencias;

    $form['filters']['advanced']['content']['tecnicos']['row_main']['procedencia_ui'] = $this->withFieldHelp([
      '#type' => 'textfield',
      '#title' => $this->t('Procedencia'),
      '#default_value' => '',
      '#placeholder' => $this->t('Escribe y selecciona procedencias'),
      '#attributes' => [
        'class' => ['filter-group', 'js-static-multiselect'],
        'data-hidden-name' => 'procedencia',
        'data-selected-labels' => json_encode($selected_procedencia, JSON_UNESCAPED_UNICODE),
        'data-static-options' => json_encode($this->buildStaticOptions($procedencia_options), JSON_UNESCAPED_UNICODE),
      ],
    ], 'procedencia', (string) $this->t('Filtra por la procedencia del texto de la obra utilizado para el análisis estilométrico.'));
    $form['filters']['advanced']['content']['tecnicos']['row_main']['procedencia'] = [
      '#type' => 'hidden',
      '#value' => (string) $url_values['procedencia'],
    ];

    $form['filters']['advanced']['content']['tecnicos']['row_fechas'] = [
      '#type' => 'container',
      '#attributes' => ['class' => ['filter-row', 'two-cols']],
    ];

    $form['filters']['advanced']['content']['tecnicos']['row_fechas']['fecha_adicion_desde'] = $this->withFieldHelp([
      '#type' => 'date',
      '#title' => $this->t('Fecha de adición o modificación (desde)'),
      '#default_value' => $url_values['fecha_adicion_desde'],
      '#attributes' => [
        'class' => ['filter-group'],
      ],
    ], 'fecha_desde', (string) $this->t('Incluye obras añadidas o modificadas desde esta fecha.'));

    $form['filters']['advanced']['content']['tecnicos']['row_fechas']['fecha_adicion_hasta'] = $this->withFieldHelp([
      '#type' => 'date',
      '#title' => $this->t('Fecha de adición o modificación (hasta)'),
      '#default_value' => $url_values['fecha_adicion_hasta'],
      '#attributes' => [
        'class' => ['filter-group'],
      ],
    ], 'fecha_hasta', (string) $this->t('Incluye obras añadidas o modificadas hasta esta fecha.'));

    // BOTONES
    $form['filters']['buttons'] = [
      '#type' => 'container',
      '#attributes' => ['class' => ['button-group']],
    ];

    $form['filters']['buttons']['reset'] = [
      '#type' => 'html_tag',
      '#tag' => 'a',
      '#value' => $this->t('Limpiar campos'),
      '#attributes' => [
        'href' => $action_url,
        'class' => ['btn-secondary', 'button'],
      ],
    ];

    $form['filters']['buttons']['submit'] = [
      '#type' => 'submit',
      '#value' => $this->t('Buscar'),
      '#attributes' => [
        'class' => ['btn-primary'],
      ],
    ];

    // Evitar que Drupal añada elementos ocultos innecesarios
    $form['#after_build'][] = [$this, 'afterBuild'];

    return $form;
  }

  /**
   * After build callback para limpiar elementos innecesarios del form GET.
   */
  public function afterBuild(array $form, FormStateInterface $form_state) {
    // Eliminar elementos que Drupal añade automáticamente para forms POST
    unset($form['form_build_id']);
    unset($form['form_token']);
    unset($form['form_id']);
    return $form;
  }

  /**
   * {@inheritdoc}
   */
  public function validateForm(array &$form, FormStateInterface $form_state) {
    $desde = (string) $form_state->getValue('fecha_adicion_desde');
    $hasta = (string) $form_state->getValue('fecha_adicion_hasta');

    if ($desde !== '' && $hasta !== '' && $desde > $hasta) {
      $form_state->setErrorByName('fecha_adicion_hasta', $this->t('La fecha "hasta" debe ser mayor o igual que la fecha "desde".'));
    }
  }

  /**
   * {@inheritdoc}
   */
  public function submitForm(array &$form, FormStateInterface $form_state) {
    // GET form handles submission via URL parameters
  }

  /**
   * Returns form action URL depending on rendering context.
   */
  protected function getActionUrl(bool $embedded): string {
    if (!$embedded) {
      return Url::fromRoute('etso_search.buscador')->toString();
    }

    $request = $this->requestStack->getCurrentRequest();
    $path = $request ? $request->getPathInfo() : '/';
    if (!UrlHelper::isValid($path, TRUE)) {
      return Url::fromRoute('<current>')->toString();
    }

    return Url::fromUserInput($path)->toString();
  }

  /**
   * Adds a reusable inline help tooltip wrapper to a form element.
   */
  protected function withFieldHelp(array $element, string $id_suffix, string $help_text): array {
    $tooltip_id = 'help-' . $id_suffix;
    $label = (string) ($element['#title'] ?? $this->t('campo'));
    $trigger_label = $this->t('Ayuda sobre el campo @label', ['@label' => $label]);

    $element['#prefix'] = ($element['#prefix'] ?? '') . '<div class="field-with-help">';
    $element['#suffix'] = ($element['#suffix'] ?? '') . '<span class="field-help-trigger" role="button" tabindex="0" aria-label="' . $trigger_label . '" aria-expanded="false" aria-controls="' . $tooltip_id . '">?</span><div class="field-help-popover" id="' . $tooltip_id . '">' . $help_text . '</div></div>';
    return $element;
  }

  /**
   * Resolves author IDs CSV into [{id,label}] for token preloading.
   */
  protected function getSelectedAuthorsByCsv(string $csv): array {
    $ids = array_filter(array_map('intval', array_map('trim', explode(',', $csv))));
    if (empty($ids)) {
      return [];
    }

    $storage = \Drupal::entityTypeManager()->getStorage('node');
    $nodes = $storage->loadMultiple($ids);
    $selected = [];

    foreach ($ids as $id) {
      if (!isset($nodes[$id])) {
        continue;
      }
      $selected[] = [
        'id' => $id,
        'label' => $nodes[$id]->getTitle(),
      ];
    }

    return $selected;
  }

  /**
   * Resolves confidence CSV into [{id,label}] for token preloading.
   */
  protected function getSelectedConfidenceByCsv(string $csv): array {
    $map = [
      'segura' => (string) $this->t('Segura'),
      'probable' => (string) $this->t('Probable'),
    ];

    $selected = [];
    foreach (array_filter(array_map('trim', explode(',', $csv))) as $key) {
      if (!isset($map[$key])) {
        continue;
      }
      $selected[] = [
        'id' => $key,
        'label' => $map[$key],
      ];
    }

    return $selected;
  }

  /**
   * Resolves tipo_autoria CSV into [{id,label}] for token preloading.
   */
  protected function getSelectedTipoAutoriaByCsv(string $csv): array {
    $map = [
      'unica' => (string) $this->t('Única'),
      'colaboracion' => (string) $this->t('Colaboración'),
    ];

    $selected = [];
    foreach (array_filter(array_map('trim', explode(',', $csv))) as $key) {
      if (!isset($map[$key])) {
        continue;
      }
      $selected[] = [
        'id' => $key,
        'label' => $map[$key],
      ];
    }

    return $selected;
  }

  /**
   * Builds static multiselect option payload from select options.
   */
  protected function buildStaticOptions(array $options): array {
    $items = [];
    foreach ($options as $id => $label) {
      if ($id === '' || $id === NULL) {
        continue;
      }
      $items[] = [
        'id' => (string) $id,
        'label' => (string) $label,
      ];
    }
    return $items;
  }

  /**
   * Resolves taxonomy-term IDs CSV into [{id,label}] for token preloading.
   */
  protected function getSelectedTaxonomyByCsv(string $vocabulary_id, string $csv): array {
    $ids = array_filter(array_map('intval', array_map('trim', explode(',', $csv))));
    if (empty($ids)) {
      return [];
    }

    $terms = \Drupal::entityTypeManager()->getStorage('taxonomy_term')->loadMultiple($ids);
    $selected = [];
    foreach ($ids as $id) {
      if (!isset($terms[$id])) {
        continue;
      }
      $selected[] = [
        'id' => (string) $id,
        'label' => $terms[$id]->label(),
      ];
    }

    return $selected;
  }

}
