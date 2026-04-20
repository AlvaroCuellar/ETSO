<?php

namespace Drupal\etso_search\Controller;

use Drupal\Core\Controller\ControllerBase;
use Drupal\etso_search\Service\BuscadorObrasService;
use Drupal\etso_search\Service\BuscadorObrasPageBuilder;
use Symfony\Component\DependencyInjection\ContainerInterface;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\JsonResponse;

/**
 * Controller para el buscador de obras.
 *
 * Renderiza la página del buscador "Examen de autorías"
 * con formulario de filtros y resultados de búsqueda.
 */
class BuscadorObrasController extends ControllerBase {

  /**
   * The buscador service.
   *
   * @var \Drupal\etso_search\Service\BuscadorObrasService
   */
  protected $buscadorService;

  /**
   * Page builder for buscador render arrays.
   *
   * @var \Drupal\etso_search\Service\BuscadorObrasPageBuilder
   */
  protected $pageBuilder;

  /**
   * Constructs a BuscadorObrasController object.
   *
   * @param \Drupal\etso_search\Service\BuscadorObrasService $buscador_service
   *   The buscador service.
   * @param \Drupal\etso_search\Service\BuscadorObrasPageBuilder $page_builder
   *   The buscador page builder.
   */
  public function __construct(BuscadorObrasService $buscador_service, BuscadorObrasPageBuilder $page_builder) {
    $this->buscadorService = $buscador_service;
    $this->pageBuilder = $page_builder;
  }

  /**
   * {@inheritdoc}
   */
  public static function create(ContainerInterface $container) {
    return new static(
      $container->get('etso_search.buscador_service'),
      $container->get('etso_search.page_builder')
    );
  }

  /**
   * Renderiza la página del buscador.
   *
   * @param \Symfony\Component\HttpFoundation\Request $request
   *   The request object.
   *
   * @return array
   *   Render array.
   */
  public function page(Request $request) {
    return $this->pageBuilder->build($request, FALSE);
  }

  /**
   * Endpoint de autocomplete para autores.
   *
   * @param \Symfony\Component\HttpFoundation\Request $request
   *   The request object.
   *
   * @return \Symfony\Component\HttpFoundation\JsonResponse
   *   JSON response.
   */
  public function autocompleteAutor(Request $request) {
    $string = $request->query->get('q', '');
    
    $results = [];
    
    if (strlen($string) >= 2) {
      $results = $this->buscadorService->autocompleteAutor($string);
    }

    return new JsonResponse($results);
  }

}
