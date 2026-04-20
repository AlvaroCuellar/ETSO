<?php

declare(strict_types=1);

namespace Drupal\etso_search\Service;

use Drupal\Core\Entity\EntityTypeManagerInterface;
use Drupal\Core\Form\FormBuilderInterface;
use Drupal\Core\Pager\PagerManagerInterface;
use Drupal\Core\State\StateInterface;
use Drupal\Component\Utility\Html;
use Drupal\etso_search\Form\BuscadorObrasForm;
use Drupal\path_alias\AliasManagerInterface;
use Symfony\Component\HttpFoundation\Request;

/**
 * Builds render arrays for the Examen de autorias search experience.
 */
class BuscadorObrasPageBuilder {

  /**
   * The form builder.
   *
   * @var \Drupal\Core\Form\FormBuilderInterface
   */
  protected $formBuilder;

  /**
   * The buscador service.
   *
   * @var \Drupal\etso_search\Service\BuscadorObrasService
   */
  protected $buscadorService;

  /**
   * The pager manager.
   *
   * @var \Drupal\Core\Pager\PagerManagerInterface
   */
  protected $pagerManager;

  /**
   * The alias manager.
   *
   * @var \Drupal\path_alias\AliasManagerInterface
   */
  protected $aliasManager;

  /**
   * The state service.
   *
   * @var \Drupal\Core\State\StateInterface
   */
  protected $state;

  /**
   * The entity type manager.
   *
   * @var \Drupal\Core\Entity\EntityTypeManagerInterface
   */
  protected $entityTypeManager;

  /**
   * Constructs a builder instance.
   */
  public function __construct(
    FormBuilderInterface $form_builder,
    BuscadorObrasService $buscador_service,
    PagerManagerInterface $pager_manager,
    AliasManagerInterface $alias_manager,
    StateInterface $state,
    EntityTypeManagerInterface $entity_type_manager
  ) {
    $this->formBuilder = $form_builder;
    $this->buscadorService = $buscador_service;
    $this->pagerManager = $pager_manager;
    $this->aliasManager = $alias_manager;
    $this->state = $state;
    $this->entityTypeManager = $entity_type_manager;
  }

  /**
   * Builds the buscador render array.
   *
   * @param \Symfony\Component\HttpFoundation\Request $request
   *   Current request.
   * @param bool $embedded
   *   TRUE when rendered as embedded block in node/4.
   *
   * @return array
   *   Render array for theme 'buscador_obras'.
   */
  public function build(Request $request, bool $embedded = FALSE): array {
    $intro_block = $embedded ? NULL : $this->buildIntroBlock();
    $form = $this->formBuilder->getForm(BuscadorObrasForm::class, $embedded);

    $filters = $this->extractFiltersFromRequest($request);
    $highlight_terms = $this->buildHighlightTerms((string) ($filters['titulo'] ?? ''));
    $page = (int) $request->query->get('page', 0);
    $filters['page'] = $page;

    $obras_procesadas = [];
    $result = $this->buscadorService->searchObras($filters);
    $obras = $result['obras'];
    $total_resultados = $result['total'];
    $results_count_label = \Drupal::translation()->formatPlural(
      $total_resultados,
      '@count resultado encontrado',
      '@count resultados encontrados'
    );
    $pager = NULL;

    foreach ($obras as $obra) {
      $obra_procesada = $this->buscadorService->procesarObra($obra);
      if (!empty($obra->nid->value)) {
        $alias = $this->aliasManager->getAliasByPath('/node/' . $obra->nid->value);
        $obra_procesada['url'] = $alias;
        $obra_procesada['nid'] = $obra->nid->value;
      }
      $obra_procesada['title_highlighted'] = $this->highlightText((string) ($obra_procesada['title_display'] ?? $obra_procesada['title'] ?? ''), $highlight_terms);
      $obra_procesada['variantes_de_titulo_highlighted'] = [];
      if (!empty($obra_procesada['variantes_de_titulo']) && is_array($obra_procesada['variantes_de_titulo'])) {
        foreach ($obra_procesada['variantes_de_titulo'] as $variante) {
          $obra_procesada['variantes_de_titulo_highlighted'][] = $this->highlightText((string) $variante, $highlight_terms);
        }
      }
      $obras_procesadas[] = $obra_procesada;
    }

    if ($total_resultados > $result['per_page']) {
      $this->pagerManager->createPager($total_resultados, $result['per_page']);
      $pager = [
        '#type' => 'pager',
        '#quantity' => 5,
      ];
    }

    return [
      '#theme' => 'buscador_obras',
      '#intro_block' => $intro_block,
      '#embedded' => $embedded,
      '#form' => $form,
      '#obras' => $obras_procesadas,
      '#highlight_terms' => $highlight_terms,
      '#total_resultados' => $total_resultados,
      '#results_count_label' => $results_count_label,
      '#pager' => $pager,
      '#cache' => [
        'contexts' => ['url.query_args'],
        'tags' => ['node_list:obra', 'block_content_list'],
      ],
      '#attached' => [
        'library' => [
          'etso_search/buscador_obras',
        ],
      ],
    ];
  }

  /**
   * Extracts filters from query parameters.
   */
  protected function extractFiltersFromRequest(Request $request): array {
    $filters = [];
    $query = $request->query->all();

    $simple_params = [
      'titulo',
      'genero',
      'autor_ids',
      'autor_match_main',
      'autor_trad_ids',
      'autor_match_trad',
      'autor_esto_ids',
      'autor_match_esto',
      'tipo_autoria',
      'estado',
      'procedencia',
      'nivel_confianza',
      'fecha_adicion_desde',
      'fecha_adicion_hasta',
    ];
    foreach ($simple_params as $param) {
      if (!empty($query[$param]) && $query[$param] !== '') {
        $filters[$param] = $query[$param];
      }
    }

    return $filters;
  }

  /**
   * Builds normalized highlight terms from the title query.
   */
  protected function buildHighlightTerms(string $raw): array {
    $terms = [];
    foreach (preg_split('/\s+/u', trim($raw)) ?: [] as $term) {
      $term = trim($term);
      if (mb_strlen($term, 'UTF-8') < 2) {
        continue;
      }
      $terms[mb_strtolower($term, 'UTF-8')] = $term;
    }

    $result = array_values($terms);
    usort($result, static function (string $a, string $b): int {
      return mb_strlen($b, 'UTF-8') <=> mb_strlen($a, 'UTF-8');
    });

    return $result;
  }

  /**
   * Highlights matching terms in text and returns safe HTML.
   */
  protected function highlightText(string $text, array $terms): string {
    if ($text === '') {
      return '';
    }
    if (empty($terms)) {
      return Html::escape($text);
    }

    $quoted_terms = array_map(static function (string $term): string {
      return preg_quote($term, '/');
    }, $terms);
    $pattern = '/(' . implode('|', $quoted_terms) . ')/iu';

    $parts = preg_split($pattern, $text, -1, PREG_SPLIT_DELIM_CAPTURE);
    if (!is_array($parts) || count($parts) === 1) {
      return Html::escape($text);
    }

    $output = '';
    foreach ($parts as $part) {
      if ($part === '') {
        continue;
      }
      if (preg_match($pattern, $part)) {
        $output .= '<span class="search-highlight">' . Html::escape($part) . '</span>';
      }
      else {
        $output .= Html::escape($part);
      }
    }

    return $output;
  }

  /**
   * Loads intro block configured in state.
   */
  protected function buildIntroBlock(): ?array {
    $uuid = $this->state->get('etso_search.examen_autorias_intro_block_uuid');
    if (empty($uuid)) {
      return NULL;
    }

    $ids = $this->entityTypeManager
      ->getStorage('block_content')
      ->getQuery()
      ->accessCheck(FALSE)
      ->condition('uuid', $uuid)
      ->range(0, 1)
      ->execute();

    if (empty($ids)) {
      return NULL;
    }

    $block = $this->entityTypeManager->getStorage('block_content')->load(reset($ids));
    if (!$block) {
      return NULL;
    }

    return $this->entityTypeManager
      ->getViewBuilder('block_content')
      ->view($block, 'full');
  }

}
