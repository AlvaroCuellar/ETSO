<?php

declare(strict_types=1);

namespace Drupal\etso_search\Plugin\Block;

use Drupal\Core\Block\BlockBase;
use Drupal\Core\Plugin\ContainerFactoryPluginInterface;
use Drupal\etso_search\Service\BuscadorObrasPageBuilder;
use Symfony\Component\DependencyInjection\ContainerInterface;
use Symfony\Component\HttpFoundation\RequestStack;

/**
 * Embeds the new Examen de autorias search inside node/4.
 *
 * @Block(
 *   id = "etso_search_examen_autorias_block",
 *   admin_label = @Translation("ETSO - Buscador Examen de autorías")
 * )
 */
class ExamenAutoriasSearchBlock extends BlockBase implements ContainerFactoryPluginInterface {

  /**
   * The buscador page builder.
   *
   * @var \Drupal\etso_search\Service\BuscadorObrasPageBuilder
   */
  protected $pageBuilder;

  /**
   * The request stack.
   *
   * @var \Symfony\Component\HttpFoundation\RequestStack
   */
  protected $requestStack;

  /**
   * Constructs block instance.
   */
  public function __construct(array $configuration, $plugin_id, $plugin_definition, BuscadorObrasPageBuilder $page_builder, RequestStack $request_stack) {
    parent::__construct($configuration, $plugin_id, $plugin_definition);
    $this->pageBuilder = $page_builder;
    $this->requestStack = $request_stack;
  }

  /**
   * {@inheritdoc}
   */
  public static function create(ContainerInterface $container, array $configuration, $plugin_id, $plugin_definition) {
    return new static(
      $configuration,
      $plugin_id,
      $plugin_definition,
      $container->get('etso_search.page_builder'),
      $container->get('request_stack')
    );
  }

  /**
   * {@inheritdoc}
   */
  public function build(): array {
    $request = $this->requestStack->getCurrentRequest();
    return $this->pageBuilder->build($request, TRUE);
  }

  /**
   * {@inheritdoc}
   */
  public function getCacheContexts(): array {
    return ['url.query_args'];
  }

  /**
   * {@inheritdoc}
   */
  public function getCacheTags(): array {
    return ['node_list:obra'];
  }

}
