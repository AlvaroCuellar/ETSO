<?php

namespace Drupal\etso_search\Service;

use Drupal\Core\Entity\EntityTypeManagerInterface;
use Drupal\Core\Entity\Query\QueryInterface;
use Drupal\Core\Database\Connection;
use Drupal\node\NodeInterface;

/**
 * Servicio para búsqueda avanzada de obras.
 *
 * Proporciona funcionalidad de búsqueda con filtros complejos
 * incluyendo normalización de títulos, búsqueda por autor en
 * atribuciones tradicionales y ETSO, y filtros de metadata.
 */
class BuscadorObrasService {

  /**
   * The entity type manager.
   *
   * @var \Drupal\Core\Entity\EntityTypeManagerInterface
   */
  protected $entityTypeManager;

  /**
   * The database connection.
   *
   * @var \Drupal\Core\Database\Connection
   */
  protected $database;

  /**
   * Whether the examen corpus field table exists in this environment.
   *
   * @var bool|null
   */
  protected $hasExamenCorpusField;

  /**
   * Constructs a BuscadorObrasService object.
   *
   * @param \Drupal\Core\Entity\EntityTypeManagerInterface $entity_type_manager
   *   The entity type manager.
   * @param \Drupal\Core\Database\Connection $database
   *   The database connection.
   */
  public function __construct(EntityTypeManagerInterface $entity_type_manager, Connection $database) {
    $this->entityTypeManager = $entity_type_manager;
    $this->database = $database;
  }

  /**
   * Realiza búsqueda de obras según filtros proporcionados.
   *
   * @param array $filters
   *   Array asociativo con filtros de búsqueda:
   *   - titulo: string, palabras del título
   *   - genero: int, taxonomy term ID
   *   - autor: array, IDs de nodos autor
   *   - buscar_en: array, ['tradicional', 'etso']
   *   - nivel_confianza: array, ['segura', 'probable']
   *   - tipo_autoria: string, ['cualquiera', 'unica', 'colaboracion', 'desconocida']
   *   - con_texto: bool
   *   - con_informe: bool
   *   - estado: int, taxonomy term ID
   *   - procedencia: int, taxonomy term ID
   *   - page: int, número de página (default 0)
   *
   * @return array
   *   Array con:
   *   - obras: array de nodos obra cargados
   *   - total: int, total de resultados
   *   - page: int, página actual
   *   - per_page: int, resultados por página
   */
  public function searchObras(array $filters): array {
    $per_page = 20;
    $page = $filters['page'] ?? 0;

    // Construir query base
    $query = $this->entityTypeManager->getStorage('node')->getQuery()
      ->condition('type', 'obra')
      ->condition('status', 1)
      ->accessCheck(TRUE)
      ->sort('field_field_title_search', 'ASC');

    $this->applyExamenCorpusCondition($query);

    // FILTRO: Búsqueda por título
    if (!empty($filters['titulo'])) {
      $titulo_normalizado = $this->normalizarTexto($filters['titulo']);
      $palabras = array_filter(explode(' ', $titulo_normalizado), function($p) {
        return strlen(trim($p)) > 1;
      });
      
      // Cada palabra debe aparecer en título normalizado O título original
      foreach ($palabras as $palabra) {
        $palabra = trim($palabra);
        if (!empty($palabra)) {
          // OR entre título normalizado y título original para cada palabra
          $word_group = $query->orConditionGroup();
          $word_group->condition('field_field_title_search', $palabra, 'CONTAINS');
          $word_group->condition('title', $palabra, 'CONTAINS');
          // AND entre palabras: cada palabra debe aparecer
          $query->condition($word_group);
        }
      }
    }

    // FILTRO: Género (multiselección soportada).
    if (!empty($filters['genero'])) {
      $genero_ids = $this->sanitizeIdList($filters['genero']);
      if (!empty($genero_ids)) {
        $query->condition('field_obra_genero', $genero_ids, 'IN');
      }
    }

    // FILTRO: Autores y nivel de confianza (nuevo modelo).
    $autor_main_ids = $this->sanitizeIdList($filters['autor_ids'] ?? []);
    $autor_trad_ids = $this->sanitizeIdList($filters['autor_trad_ids'] ?? []);
    $autor_esto_ids = $this->sanitizeIdList($filters['autor_esto_ids'] ?? []);

    // El autor principal del buscador simplificado siempre trabaja en OR.
    // Conservamos compatibilidad con URLs antiguas ignorando el valor entrante.
    $match_main = 'or';
    $match_trad = $this->normalizeMatchMode($filters['autor_match_trad'] ?? 'or');
    $match_esto = $this->normalizeMatchMode($filters['autor_match_esto'] ?? 'or');

    $nivel_confianzas = $this->sanitizeStringList($filters['nivel_confianza'] ?? []);

    // Si hay autores en filtros específicos, el autor principal se ignora.
    if (!empty($autor_trad_ids) || !empty($autor_esto_ids)) {
      $autor_main_ids = [];
    }

    $author_sets = [];

    // Autor principal: busca en tradicional y estilometría.
    if (!empty($autor_main_ids)) {
      $main_trad = $this->getObrasByTraditionalAuthors($autor_main_ids, $match_main);
      $main_esto = $this->getObrasByStylometryAuthors($autor_main_ids, $match_main, $nivel_confianzas);
      $author_sets[] = array_values(array_unique(array_merge($main_trad, $main_esto)));
    }

    // Autor tradicional específico.
    if (!empty($autor_trad_ids)) {
      $author_sets[] = $this->getObrasByTraditionalAuthors($autor_trad_ids, $match_trad);
    }

    // Autor estilometría específico (o solo nivel de confianza).
    if (!empty($autor_esto_ids) || !empty($nivel_confianzas)) {
      $author_sets[] = $this->getObrasByStylometryAuthors($autor_esto_ids, $match_esto, $nivel_confianzas);
    }

    if (!empty($author_sets)) {
      $nids_filtrados = $this->intersectNidSets($author_sets);
      if (!empty($nids_filtrados)) {
        $query->condition('nid', $nids_filtrados, 'IN');
      }
      else {
        $query->condition('nid', 0);
      }
    }

    // FILTRO: Tipo de autoría (multiselección por tipología).
    $tipos_autoria = $this->sanitizeStringList($filters['tipo_autoria'] ?? []);
    $tipos_autoria = array_values(array_filter($tipos_autoria, function ($tipo) {
      return in_array($tipo, ['unica', 'colaboracion', 'desconocida'], TRUE);
    }));
    if (!empty($tipos_autoria)) {
      $nids_tipos = [];
      foreach ($tipos_autoria as $tipo) {
        $nids_tipos = array_merge($nids_tipos, $this->getObrasPorTipoAutoria($tipo, ''));
      }
      $nids_tipos = array_values(array_unique(array_map('intval', $nids_tipos)));
      if (!empty($nids_tipos)) {
        $query->condition('nid', $nids_tipos, 'IN');
      }
      else {
        $query->condition('nid', 0);
      }
    }

    // FILTRO: Estado del texto (multiselección soportada).
    if (!empty($filters['estado'])) {
      $estado_ids = $this->sanitizeIdList($filters['estado']);
      if (!empty($estado_ids)) {
        $query->condition('field_obra_estado', $estado_ids, 'IN');
      }
    }

    // FILTRO: Procedencia (multiselección soportada).
    if (!empty($filters['procedencia'])) {
      $procedencia_ids = $this->sanitizeIdList($filters['procedencia']);
      if (!empty($procedencia_ids)) {
        $query->condition('field_obra_procedencia', $procedencia_ids, 'IN');
      }
    }

    // FILTRO: Fecha de adición (rango).
    if (!empty($filters['fecha_adicion_desde'])) {
      $query->condition('field_obra_adicion', $filters['fecha_adicion_desde'], '>=');
    }
    if (!empty($filters['fecha_adicion_hasta'])) {
      $query->condition('field_obra_adicion', $filters['fecha_adicion_hasta'], '<=');
    }

    // Contar total antes de paginar
    $count_query = clone $query;
    $total = count($count_query->execute());

    // Aplicar paginación
    $query->range($page * $per_page, $per_page);

    // Ejecutar query
    $nids = $query->execute();

    // Cargar nodos
    $obras = [];
    if (!empty($nids)) {
      $obras = $this->entityTypeManager->getStorage('node')->loadMultiple($nids);
    }

    return [
      'obras' => $obras,
      'total' => $total,
      'page' => $page,
      'per_page' => $per_page,
    ];
  }

  /**
   * Normalizes author ID list from string CSV or array.
   */
  protected function sanitizeIdList($raw): array {
    if (is_string($raw)) {
      $raw = explode(',', $raw);
    }
    if (!is_array($raw)) {
      return [];
    }

    $ids = [];
    foreach ($raw as $value) {
      $id = (int) trim((string) $value);
      if ($id > 0) {
        $ids[$id] = $id;
      }
    }

    return array_values($ids);
  }

  /**
   * Normalizes a CSV/string-list input into unique lowercase strings.
   */
  protected function sanitizeStringList($raw): array {
    if (is_string($raw)) {
      $raw = explode(',', $raw);
    }
    if (!is_array($raw)) {
      return [];
    }

    $values = [];
    foreach ($raw as $value) {
      $item = trim((string) $value);
      if ($item !== '') {
        $values[$item] = $item;
      }
    }

    return array_values($values);
  }

  /**
   * Normalizes match mode value.
   */
  protected function normalizeMatchMode(string $mode): string {
    return strtolower($mode) === 'and' ? 'and' : 'or';
  }

  /**
   * Returns whether the examen corpus field exists in this environment.
   */
  protected function hasExamenCorpusField(): bool {
    if (!isset($this->hasExamenCorpusField)) {
      $this->hasExamenCorpusField = $this->database->schema()->tableExists('node__field_incluir_examen_autorias');
    }

    return (bool) $this->hasExamenCorpusField;
  }

  /**
   * Applies the examen corpus field condition to an entity query when available.
   */
  protected function applyExamenCorpusCondition(QueryInterface $query): void {
    if ($this->hasExamenCorpusField()) {
      $query->condition('field_incluir_examen_autorias', 1);
    }
  }

  /**
   * Filters obra IDs to the examen corpus when the field exists.
   */
  protected function filterObraIdsForExamenCorpus(array $obra_ids): array {
    $obra_ids = $this->sanitizeIdList($obra_ids);
    if (empty($obra_ids) || !$this->hasExamenCorpusField()) {
      return $obra_ids;
    }

    $allowed_ids = $this->database->select('node__field_incluir_examen_autorias', 'f')
      ->fields('f', ['entity_id'])
      ->condition('f.deleted', 0)
      ->condition('f.entity_id', $obra_ids, 'IN')
      ->condition('f.field_incluir_examen_autorias_value', 1)
      ->execute()
      ->fetchCol();

    $allowed_lookup = array_fill_keys(array_map('intval', $allowed_ids), TRUE);

    return array_values(array_filter($obra_ids, static function (int $obra_id) use ($allowed_lookup): bool {
      return isset($allowed_lookup[$obra_id]);
    }));
  }

  /**
   * Returns obra NIDs filtered by traditional attribution authors.
   */
  protected function getObrasByTraditionalAuthors(array $author_ids, string $match_mode = 'or'): array {
    if (empty($author_ids)) {
      return [];
    }

    $placeholders = implode(',', array_fill(0, count($author_ids), '?'));
    $sql = "
      SELECT g.entity_id
      FROM node__field_grupo_atrib_trad g
      INNER JOIN paragraph__field_atrib_trad a
        ON g.field_grupo_atrib_trad_target_id = a.entity_id AND a.deleted = 0
      WHERE g.deleted = 0
        AND a.field_atrib_trad_target_id IN ($placeholders)
      GROUP BY g.entity_id
    ";

    if ($match_mode === 'and') {
      $sql .= " HAVING COUNT(DISTINCT a.field_atrib_trad_target_id) >= ?";
      $params = array_merge($author_ids, [count($author_ids)]);
      return $this->database->query($sql, $params)->fetchCol();
    }

    return $this->database->query($sql, $author_ids)->fetchCol();
  }

  /**
   * Returns obra NIDs filtered by stylometry attribution authors/confidence.
   */
  protected function getObrasByStylometryAuthors(array $author_ids, string $match_mode = 'or', array $nivel_confianzas = []): array {
    $params = [];
    $sql = "
      SELECT g.entity_id
      FROM node__field_grupo_atrib_etso g
      LEFT JOIN paragraph__field_atrib_etso a
        ON g.field_grupo_atrib_etso_target_id = a.entity_id AND a.deleted = 0
      LEFT JOIN paragraph__field_confianza_atrib c
        ON g.field_grupo_atrib_etso_target_id = c.entity_id AND c.deleted = 0
      WHERE g.deleted = 0
    ";

    if (!empty($author_ids)) {
      $placeholders = implode(',', array_fill(0, count($author_ids), '?'));
      $sql .= " AND a.field_atrib_etso_target_id IN ($placeholders)";
      $params = array_merge($params, $author_ids);
    }

    if (!empty($nivel_confianzas)) {
      $placeholders = implode(',', array_fill(0, count($nivel_confianzas), '?'));
      $sql .= " AND c.field_confianza_atrib_value IN ($placeholders)";
      $params = array_merge($params, $nivel_confianzas);
    }

    $sql .= " GROUP BY g.entity_id";

    if (!empty($author_ids) && $match_mode === 'and') {
      $sql .= " HAVING COUNT(DISTINCT a.field_atrib_etso_target_id) >= ?";
      $params[] = count($author_ids);
    }

    return $this->database->query($sql, $params)->fetchCol();
  }

  /**
   * Builds author profile presentation payload.
   *
   * @param \Drupal\node\NodeInterface $autor
   *   Autor node.
   *
   * @return array
   *   Presentation payload for the autor profile page.
   */
  public function buildAutorProfilePresentation(NodeInterface $autor): array {
    $autor_id = (int) $autor->id();
    $traditional_ids = $this->filterObraIdsForExamenCorpus($this->getTraditionalObraIdsByAutorId($autor_id));
    $etso_positive_ids = $this->filterObraIdsForExamenCorpus($this->getPositiveEtsoObraIdsByAutorId($autor_id));
    $etso_any_ids = $this->filterObraIdsForExamenCorpus($this->getAnyEtsoObraIdsByAutorId($autor_id));
    $related_any_ids = array_values(array_unique(array_merge($traditional_ids, $etso_any_ids)));
    $obra_ids = $related_any_ids;
    $traditional_lookup = array_fill_keys($traditional_ids, TRUE);
    $etso_positive_lookup = array_fill_keys($etso_positive_ids, TRUE);
    $etso_any_lookup = array_fill_keys($etso_any_ids, TRUE);
    $only_trad_ids = array_values(array_diff($traditional_ids, $etso_positive_ids));
    $only_etso_ids = array_values(array_diff($etso_positive_ids, $traditional_ids));

    $variantes = [];
    if ($autor->hasField('field_nombre_variantes') && !$autor->get('field_nombre_variantes')->isEmpty()) {
      foreach ($autor->get('field_nombre_variantes') as $item) {
        $value = trim((string) $item->value);
        if ($value !== '') {
          $variantes[$value] = $value;
        }
      }
    }

    $payload = [
      'author' => [
        'nid' => $autor_id,
        'title' => $autor->getTitle(),
        'url' => $autor->toUrl()->toString(),
        'variantes' => array_values($variantes),
      ],
      'metrics' => [
        'related_any' => count($related_any_ids),
        'trad_any' => count($traditional_ids),
        'etso_yes' => count($etso_positive_ids),
        'only_etso' => count($only_etso_ids),
        'only_trad' => count($only_trad_ids),
      ],
      'obras' => [],
    ];

    if (empty($obra_ids)) {
      return $payload;
    }

    $storage = $this->entityTypeManager->getStorage('node');
    $obras = $storage->loadMultiple($obra_ids);
    $obras_procesadas = [];

    foreach ($obras as $obra) {
      if (!$obra instanceof NodeInterface || $obra->bundle() !== 'obra' || !$obra->access('view')) {
        continue;
      }

      $obra_data = $this->procesarObra($obra, ['compat_mode' => 'hybrid']);
      $obra_nid = (int) $obra->id();
      $relation_trad = isset($traditional_lookup[$obra_nid]);
      $relation_etso_positive = isset($etso_positive_lookup[$obra_nid]);
      $relation_etso_any = isset($etso_any_lookup[$obra_nid]);

      $obra_data['id'] = $obra_nid;
      $obra_data['url'] = $obra->toUrl()->toString();
      $obra_data['relation_trad'] = $relation_trad;
      $obra_data['relation_etso_positive'] = $relation_etso_positive;
      $obra_data['relation_etso_any'] = $relation_etso_any;
      $obra_data['in_filter_related_any'] = $relation_trad || $relation_etso_any;
      $obra_data['in_filter_trad_any'] = $relation_trad;
      $obra_data['in_filter_etso_yes'] = $relation_etso_positive;
      $obra_data['in_filter_only_etso'] = $relation_etso_positive && !$relation_trad;
      $obra_data['in_filter_only_trad'] = $relation_trad && !$relation_etso_positive;
      $obras_procesadas[] = $obra_data;
    }

    usort($obras_procesadas, static function (array $a, array $b): int {
      $title_a = trim((string) ($a['title_display'] ?? $a['title'] ?? ''));
      $title_b = trim((string) ($b['title_display'] ?? $b['title'] ?? ''));
      return strnatcasecmp($title_a, $title_b);
    });

    $payload['obras'] = $obras_procesadas;

    return $payload;
  }

  /**
   * Returns unique obra NIDs related to an author by traditional attribution.
   */
  protected function getTraditionalObraIdsByAutorId(int $autor_id): array {
    if ($autor_id <= 0) {
      return [];
    }

    return array_map('intval', $this->getObrasByTraditionalAuthors([$autor_id], 'or'));
  }

  /**
   * Returns unique obra NIDs related to an author by positive stylometric attribution.
   */
  protected function getPositiveEtsoObraIdsByAutorId(int $autor_id): array {
    if ($autor_id <= 0) {
      return [];
    }

    return array_map('intval', $this->getObrasByStylometryAuthors([$autor_id], 'or', ['segura', 'probable']));
  }

  /**
   * Returns unique obra NIDs related to an author by any stylometric presence.
   */
  protected function getAnyEtsoObraIdsByAutorId(int $autor_id): array {
    if ($autor_id <= 0) {
      return [];
    }

    return array_map('intval', $this->getObrasByStylometryAuthors([$autor_id], 'or'));
  }

  /**
   * Intersects multiple nid sets (AND across active blocks).
   */
  protected function intersectNidSets(array $sets): array {
    $normalized = [];
    foreach ($sets as $set) {
      $values = array_values(array_unique(array_map('intval', $set)));
      if (!empty($values)) {
        $normalized[] = $values;
      }
      else {
        return [];
      }
    }

    if (empty($normalized)) {
      return [];
    }
    if (count($normalized) === 1) {
      return $normalized[0];
    }

    $intersection = $normalized[0];
    for ($i = 1; $i < count($normalized); $i++) {
      $intersection = array_values(array_intersect($intersection, $normalized[$i]));
      if (empty($intersection)) {
        return [];
      }
    }

    return $intersection;
  }

  /**
   * Aplica filtro de tipo de autoría usando SQL directo.
   *
   * @param \Drupal\Core\Entity\Query\QueryInterface $query
   *   Query de entity.
   * @param string $tipo
   *   Tipo de autoría: 'unica', 'colaboracion', 'desconocida'.
   * @param string $buscar_en
   *   Dónde buscar: '', 'tradicional', 'etso'.
   */
  protected function aplicarFiltroTipoAutoria($query, string $tipo, string $buscar_en = ''): void {
    $nids = $this->getObrasPorTipoAutoria($tipo, $buscar_en);
    
    if (!empty($nids)) {
      $query->condition('nid', $nids, 'IN');
    }
    else {
      // Sin resultados, forzar query vacía
      $query->condition('nid', 0);
    }
  }

  /**
   * Obtiene NIDs de obras filtradas por autor y/o nivel de confianza.
   *
   * Cuando ambos filtros están activos, busca obras donde el autor específico
   * tenga el nivel de confianza indicado (en el mismo paragraph/grupo).
   *
   * @param array $autor_ids
   *   IDs de autores a buscar (puede estar vacío).
   * @param string $buscar_en
   *   Dónde buscar: '', 'tradicional', 'etso'.
   * @param string $nivel_confianza
   *   Nivel de confianza: '', 'segura', 'probable', 'no_concluyente'.
   *
   * @return array
   *   Array de NIDs de obras.
   */
  protected function getObrasPorAutorYConfianza(array $autor_ids, string $buscar_en, string $nivel_confianza): array {
    $nids_trad = [];
    $nids_etso = [];
    
    // TRADICIONAL (no tiene nivel de confianza, solo busca autor)
    if (($buscar_en === '' || $buscar_en === 'tradicional') && !empty($autor_ids)) {
      // En tradicional no hay confianza, solo buscamos por autor
      // Si se especifica nivel_confianza, ignoramos tradicional
      if (empty($nivel_confianza)) {
        $placeholders = implode(',', array_fill(0, count($autor_ids), '?'));
        $sql = "
          SELECT DISTINCT g.entity_id
          FROM node__field_grupo_atrib_trad g
          INNER JOIN paragraph__field_atrib_trad a 
            ON g.field_grupo_atrib_trad_target_id = a.entity_id AND a.deleted = 0
          WHERE g.deleted = 0
            AND a.field_atrib_trad_target_id IN ($placeholders)
        ";
        $nids_trad = $this->database->query($sql, $autor_ids)->fetchCol();
      }
    }
    
    // ETSO (tiene nivel de confianza por grupo)
    if ($buscar_en === '' || $buscar_en === 'etso') {
      $conditions = [];
      $params = [];
      
      // Base query
      $sql = "
        SELECT DISTINCT g.entity_id
        FROM node__field_grupo_atrib_etso g
        INNER JOIN paragraph__field_atrib_etso a 
          ON g.field_grupo_atrib_etso_target_id = a.entity_id AND a.deleted = 0
        LEFT JOIN paragraph__field_confianza_atrib c
          ON g.field_grupo_atrib_etso_target_id = c.entity_id AND c.deleted = 0
        WHERE g.deleted = 0
      ";
      
      // Filtrar por autor si hay
      if (!empty($autor_ids)) {
        $placeholders = implode(',', array_fill(0, count($autor_ids), '?'));
        $sql .= " AND a.field_atrib_etso_target_id IN ($placeholders)";
        $params = array_merge($params, $autor_ids);
      }
      
      // Filtrar por nivel de confianza si hay
      if (!empty($nivel_confianza)) {
        $sql .= " AND c.field_confianza_atrib_value = ?";
        $params[] = $nivel_confianza;
      }
      
      $nids_etso = $this->database->query($sql, $params)->fetchCol();
    }
    
    // Combinar resultados según buscar_en
    if ($buscar_en === 'tradicional') {
      return $nids_trad;
    }
    elseif ($buscar_en === 'etso') {
      return $nids_etso;
    }
    else {
      return array_unique(array_merge($nids_trad, $nids_etso));
    }
  }

  /**
   * Obtiene NIDs de obras según tipo de autoría usando SQL directo.
   *
   * @param string $tipo
   *   Tipo de autoría: 'unica', 'colaboracion', 'desconocida'.
   * @param string $buscar_en
   *   Dónde buscar: '', 'tradicional', 'etso'.
   *
   * @return array
   *   Array de NIDs.
   */
  protected function getObrasPorTipoAutoria(string $tipo, string $buscar_en): array {
    $nids_trad = [];
    $nids_etso = [];

    switch ($tipo) {
      case 'unica':
        // TRADICIONAL: Obras donde TODOS los grupos tienen exactamente 1 autor
        if ($buscar_en === '' || $buscar_en === 'tradicional') {
          $nids_trad = $this->getObrasAutoriaUnicaTrad();
        }
        // ETSO: Obras con exactamente 1 grupo con autor
        if ($buscar_en === '' || $buscar_en === 'etso') {
          $nids_etso = $this->getObrasAutoriaUnicaEtso();
        }
        break;

      case 'colaboracion':
        // TRADICIONAL: Obras con AL MENOS un grupo con 2+ autores
        if ($buscar_en === '' || $buscar_en === 'tradicional') {
          $nids_trad = $this->getObrasColaboracionTrad();
        }
        // ETSO: Obras con 2+ grupos con autor
        if ($buscar_en === '' || $buscar_en === 'etso') {
          $nids_etso = $this->getObrasColaboracionEtso();
        }
        break;

      case 'desconocida':
        // TRADICIONAL: Sin grupos o grupos sin autores
        if ($buscar_en === '' || $buscar_en === 'tradicional') {
          $nids_trad = $this->getObrasDesconocidaTrad();
        }
        // ETSO: Sin grupos o solo grupos no_concluyente sin autor
        if ($buscar_en === '' || $buscar_en === 'etso') {
          $nids_etso = $this->getObrasDesconocidaEtso();
        }
        break;
    }

    // Combinar según buscar_en (OR si ambas, solo uno si específico)
    if ($buscar_en === '') {
      return array_unique(array_merge($nids_trad, $nids_etso));
    }
    elseif ($buscar_en === 'tradicional') {
      return $nids_trad;
    }
    else {
      return $nids_etso;
    }
  }

  /**
   * Obras con autoría única en tradicional.
   * Todos los grupos tienen exactamente 1 autor.
   */
  protected function getObrasAutoriaUnicaTrad(): array {
    // Obras que tienen grupos tradicionales
    // Y NINGÚN grupo tiene más de 1 autor (todos tienen exactamente 1)
    $sql = "
      SELECT DISTINCT n.entity_id
      FROM node__field_grupo_atrib_trad n
      WHERE n.deleted = 0
        AND n.entity_id NOT IN (
          -- Excluir obras que tienen algún grupo con != 1 autor
          SELECT DISTINCT g.entity_id
          FROM node__field_grupo_atrib_trad g
          LEFT JOIN paragraph__field_atrib_trad a 
            ON g.field_grupo_atrib_trad_target_id = a.entity_id AND a.deleted = 0
          WHERE g.deleted = 0
          GROUP BY g.entity_id, g.field_grupo_atrib_trad_target_id
          HAVING COUNT(a.field_atrib_trad_target_id) != 1
        )
    ";
    
    return $this->database->query($sql)->fetchCol();
  }

  /**
   * Obras con autoría única en ETSO.
   * Exactamente 1 grupo con autor asignado.
   */
  protected function getObrasAutoriaUnicaEtso(): array {
    $sql = "
      SELECT g.entity_id
      FROM node__field_grupo_atrib_etso g
      INNER JOIN paragraph__field_atrib_etso a 
        ON g.field_grupo_atrib_etso_target_id = a.entity_id AND a.deleted = 0
      WHERE g.deleted = 0
      GROUP BY g.entity_id
      HAVING COUNT(DISTINCT g.field_grupo_atrib_etso_target_id) = 1
    ";
    
    return $this->database->query($sql)->fetchCol();
  }

  /**
   * Obras con colaboración en tradicional.
   * Al menos un grupo tiene 2+ autores.
   */
  protected function getObrasColaboracionTrad(): array {
    $sql = "
      SELECT DISTINCT g.entity_id
      FROM node__field_grupo_atrib_trad g
      INNER JOIN paragraph__field_atrib_trad a 
        ON g.field_grupo_atrib_trad_target_id = a.entity_id AND a.deleted = 0
      WHERE g.deleted = 0
      GROUP BY g.entity_id, g.field_grupo_atrib_trad_target_id
      HAVING COUNT(a.field_atrib_trad_target_id) > 1
    ";
    
    return $this->database->query($sql)->fetchCol();
  }

  /**
   * Obras con colaboración en ETSO.
   * 2+ grupos con autor asignado (coautoría).
   */
  protected function getObrasColaboracionEtso(): array {
    $sql = "
      SELECT g.entity_id
      FROM node__field_grupo_atrib_etso g
      INNER JOIN paragraph__field_atrib_etso a 
        ON g.field_grupo_atrib_etso_target_id = a.entity_id AND a.deleted = 0
      WHERE g.deleted = 0
      GROUP BY g.entity_id
      HAVING COUNT(DISTINCT g.field_grupo_atrib_etso_target_id) > 1
    ";
    
    return $this->database->query($sql)->fetchCol();
  }

  /**
   * Obras con autoría desconocida en tradicional.
   * Sin grupos o grupos sin autores.
   */
  protected function getObrasDesconocidaTrad(): array {
    // Obras de tipo 'obra' que NO tienen grupos tradicionales con autores
    $sql = "
      SELECT n.nid
      FROM node_field_data n
      WHERE n.type = 'obra' AND n.status = 1
        AND n.nid NOT IN (
          SELECT DISTINCT g.entity_id
          FROM node__field_grupo_atrib_trad g
          INNER JOIN paragraph__field_atrib_trad a 
            ON g.field_grupo_atrib_trad_target_id = a.entity_id AND a.deleted = 0
          WHERE g.deleted = 0
        )
    ";
    
    return $this->database->query($sql)->fetchCol();
  }

  /**
   * Obras con autoría desconocida en ETSO.
   * Sin grupos o grupos sin autor válido.
   */
  protected function getObrasDesconocidaEtso(): array {
    // Obras que NO tienen grupos ETSO con autor asignado
    // O solo tienen grupos con confianza 'no_concluyente'
    $sql = "
      SELECT n.nid
      FROM node_field_data n
      WHERE n.type = 'obra' AND n.status = 1
        AND n.nid NOT IN (
          SELECT DISTINCT g.entity_id
          FROM node__field_grupo_atrib_etso g
          INNER JOIN paragraph__field_atrib_etso a 
            ON g.field_grupo_atrib_etso_target_id = a.entity_id AND a.deleted = 0
          LEFT JOIN paragraph__field_confianza_atrib c
            ON g.field_grupo_atrib_etso_target_id = c.entity_id AND c.deleted = 0
          WHERE g.deleted = 0
            AND (c.field_confianza_atrib_value IS NULL OR c.field_confianza_atrib_value != 'no_concluyente')
        )
    ";
    
    return $this->database->query($sql)->fetchCol();
  }

  /**
   * Obtiene NIDs de obras que tienen informe asociado.
   *
   * La relación es: informe.field_obra_informe -> obra
   * Por tanto buscamos field_obra_informe_target_id (NIDs de obras)
   *
   * @return array
   *   Array de NIDs de obras.
   */
  protected function getObrasConInforme(): array {
    $sql = "
      SELECT DISTINCT field_obra_informe_target_id
      FROM node__field_obra_informe
      WHERE deleted = 0
    ";
    
    return $this->database->query($sql)->fetchCol();
  }

  /**
   * Obtiene el NID del informe asociado a una obra.
   *
   * @param int $obra_nid
   *   NID de la obra.
   *
   * @return int|null
   *   NID del informe o NULL si no existe.
   */
  protected function getInformeDeObra(int $obra_nid): ?int {
    $sql = "
      SELECT entity_id
      FROM node__field_obra_informe
      WHERE deleted = 0 AND field_obra_informe_target_id = :obra_nid
      LIMIT 1
    ";
    
    $result = $this->database->query($sql, [':obra_nid' => $obra_nid])->fetchField();
    return $result ? (int) $result : NULL;
  }

  /**
   * Procesa una obra cargando y estructurando sus atribuciones.
   *
   * @param \Drupal\node\NodeInterface $obra
   *   Nodo de obra.
   * @param array $options
   *   Optional settings:
   *   - compat_mode: 'strict'|'hybrid'. Hybrid enables legacy fallback.
   *
   * @return array
   *   Array estructurado con:
   *   - nid: int
   *   - title: string
   *   - genero: string
   *   - resumen_breve: string
   *   - resumen_completo: string
   *   - atrib_trad_grupos: array
   *   - atrib_etso_grupos: array
   *   - atrib_etso_sin_autor: bool
   *   - tiene_texto: bool
   *   - tiene_informe: bool
   *   - metadata: array
   *   - bicuve_enlaces: array
   *   - texto_externo_enlaces: array
   */
  public function procesarObra(NodeInterface $obra, array $options = []): array {
    $data = $this->buildCanonicalObraPresentation($obra, [
      'compat_mode' => (string) ($options['compat_mode'] ?? 'strict'),
    ]);

    // Procesar enlaces BICUVE (field_relacion_obra_bicuve - paragraphs repetibles)
    if ($obra->hasField('field_relacion_obra_bicuve') && !$obra->get('field_relacion_obra_bicuve')->isEmpty()) {
      foreach ($obra->get('field_relacion_obra_bicuve')->referencedEntities() as $paragraph) {
        // Obtener la referencia al BICUVE
        if ($paragraph->hasField('field_texto_bicuve') && !$paragraph->get('field_texto_bicuve')->isEmpty()) {
          $bicuve_node = $paragraph->get('field_texto_bicuve')->entity;
          
          if ($bicuve_node && $bicuve_node->access('view')) {
            // Obtener anchor text personalizado o usar el título del BICUVE
            $anchor_text = '';
            if ($paragraph->hasField('field_link_text_bicuve') && !$paragraph->get('field_link_text_bicuve')->isEmpty()) {
              $anchor_text = $paragraph->get('field_link_text_bicuve')->value;
            }
            
            $data['bicuve_enlaces'][] = [
              'id' => $bicuve_node->id(),
              'title' => $anchor_text ?: $bicuve_node->getTitle(),
              'url' => '/node/' . $bicuve_node->id(),
            ];
          }
        }
      }
    }


    // Procesar enlaces externos (field_texto_externo - repetible)
    if ($obra->hasField('field_texto_externo') && !$obra->get('field_texto_externo')->isEmpty()) {
      foreach ($obra->get('field_texto_externo') as $link_item) {
        if (!empty($link_item->uri)) {
          $data['texto_externo_enlaces'][] = [
            'url' => $link_item->uri,
            'title' => $link_item->title ?: 'Biblioteca externa',
          ];
        }
      }
    }

    // Marcar si tiene texto disponible
    if (!empty($data['bicuve_enlaces']) || !empty($data['texto_externo_enlaces'])) {
      $data['tiene_texto'] = TRUE;
    }

    // Tiene informe (buscar informe que referencia esta obra)
    // La relación es: informe.field_obra_informe -> obra
    $informe_nid = $this->getInformeDeObra($obra->id());
    if ($informe_nid) {
      $data['tiene_informe'] = TRUE;
      $data['informe_url'] = '/node/' . $informe_nid;
    }

    // Metadata
    $metadata = [];

    // Procedencia
    if ($obra->hasField('field_obra_procedencia') && !$obra->get('field_obra_procedencia')->isEmpty()) {
      $proc_term = $obra->get('field_obra_procedencia')->entity;
      if ($proc_term) {
        $metadata['procedencia'] = $proc_term->getName();
      }
    }

    // Documento (texto libre).
    if ($obra->hasField('field_documento') && !$obra->get('field_documento')->isEmpty()) {
      $documento_item = $obra->get('field_documento')->first();
      $documento = $documento_item ? trim((string) $documento_item->processed) : '';
      if ($documento !== '') {
        $metadata['documento'] = $documento;
      }
    }

    // Estado del texto
    if ($obra->hasField('field_obra_estado') && !$obra->get('field_obra_estado')->isEmpty()) {
      $estado_term = $obra->get('field_obra_estado')->entity;
      if ($estado_term) {
        $metadata['estado'] = $estado_term->getName();
      }
    }

    // Fecha de adición.
    if ($obra->hasField('field_obra_adicion') && !$obra->get('field_obra_adicion')->isEmpty()) {
      $adicion = (string) $obra->get('field_obra_adicion')->value;
      $date = \DateTime::createFromFormat('Y-m-d', $adicion);
      if ($date instanceof \DateTime) {
        $metadata['fecha_adicion'] = $date->format('d/m/Y');
      }
      elseif ($adicion !== '') {
        $metadata['fecha_adicion'] = $adicion;
      }
    }

    $data['metadata'] = $metadata;

    return $data;
  }

  /**
   * Builds canonical obra presentation payload shared across surfaces.
   *
   * @param \Drupal\node\NodeInterface $obra
   *   Obra node.
   * @param array $options
   *   Optional settings:
   *   - compat_mode: 'strict'|'hybrid'. Hybrid enables legacy fallback.
   *
   * @return array
   *   Canonical obra data payload.
   */
  public function buildCanonicalObraPresentation(NodeInterface $obra, array $options = []): array {
    $compat_mode = (string) ($options['compat_mode'] ?? 'strict');
    $hybrid_mode = $compat_mode === 'hybrid';

    $data = [
      'nid' => $obra->id(),
      'title' => $obra->getTitle(),
      'title_display' => '',
      'genero' => '',
      'resumen_breve' => '',
      'resumen_completo' => '',
      'atrib_trad_grupos' => [],
      'atrib_etso_grupos' => [],
      'atrib_etso_sin_autor' => FALSE,
      'tiene_texto' => FALSE,
      'tiene_informe' => FALSE,
      'metadata' => [],
      'bicuve_enlaces' => [],
      'texto_externo_enlaces' => [],
      'variantes_de_titulo' => [],
    ];

    if ($obra->hasField('field_titulo_mostrado') && !$obra->get('field_titulo_mostrado')->isEmpty()) {
      $data['title_display'] = (string) $obra->get('field_titulo_mostrado')->value;
    }
    if ($data['title_display'] === '') {
      $data['title_display'] = $data['title'];
    }

    if ($obra->hasField('field_variantes_de_titulo') && !$obra->get('field_variantes_de_titulo')->isEmpty()) {
      foreach ($obra->get('field_variantes_de_titulo') as $item) {
        $data['variantes_de_titulo'][] = $item->value;
      }
    }

    if ($obra->hasField('field_obra_genero') && !$obra->get('field_obra_genero')->isEmpty()) {
      $genero_term = $obra->get('field_obra_genero')->entity;
      if ($genero_term) {
        $data['genero'] = $genero_term->getName();
      }
    }

    if ($obra->hasField('field_resumen_breve') && !$obra->get('field_resumen_breve')->isEmpty()) {
      $data['resumen_breve'] = $obra->get('field_resumen_breve')->value;
    }

    if ($obra->hasField('field_resumen_completo') && !$obra->get('field_resumen_completo')->isEmpty()) {
      $data['resumen_completo'] = $obra->get('field_resumen_completo')->value;
    }

    if ($obra->hasField('field_grupo_atrib_trad') && !$obra->get('field_grupo_atrib_trad')->isEmpty()) {
      foreach ($obra->get('field_grupo_atrib_trad') as $item) {
        $paragraph = $item->entity;
        if ($paragraph && $paragraph->hasField('field_atrib_trad')) {
          $autores = [];
          foreach ($paragraph->get('field_atrib_trad') as $autor_ref) {
            $autor = $autor_ref->entity;
            if ($autor) {
              $autores[] = [
                'nid' => $autor->id(),
                'title' => $autor->getTitle(),
                'url' => $autor->toUrl()->toString(),
              ];
            }
          }
          if (!empty($autores)) {
            $data['atrib_trad_grupos'][] = ['autores' => $autores];
          }
        }
      }
    }

    if ($obra->hasField('field_grupo_atrib_etso') && !$obra->get('field_grupo_atrib_etso')->isEmpty()) {
      $tiene_no_concluyente_sin_autor = FALSE;

      foreach ($obra->get('field_grupo_atrib_etso') as $item) {
        $paragraph = $item->entity;
        if (!$paragraph) {
          continue;
        }

        $confianza = $paragraph->hasField('field_confianza_atrib')
          ? (string) $paragraph->get('field_confianza_atrib')->value
          : '';

        $autor = NULL;
        if ($paragraph->hasField('field_atrib_etso') && !$paragraph->get('field_atrib_etso')->isEmpty()) {
          $autor = $paragraph->get('field_atrib_etso')->entity;
        }

        if ($confianza === 'no_concluyente' && !$autor) {
          $tiene_no_concluyente_sin_autor = TRUE;
          continue;
        }

        if ($autor) {
          $data['atrib_etso_grupos'][] = [
            'autor' => [
              'nid' => $autor->id(),
              'title' => $autor->getTitle(),
              'url' => $autor->toUrl()->toString(),
            ],
            'confianza' => $confianza,
          ];
        }
      }

      $data['atrib_etso_sin_autor'] = $tiene_no_concluyente_sin_autor;
    }

    if ($hybrid_mode) {
      $this->applyLegacyAttributionFallback($obra, $data);
    }

    return $data;
  }

  /**
   * Applies legacy attribution fallback for migration-phase compatibility.
   */
  protected function applyLegacyAttributionFallback(NodeInterface $obra, array &$data): void {
    if (empty($data['atrib_trad_grupos']) && $obra->hasField('field_obra_atribucion') && !$obra->get('field_obra_atribucion')->isEmpty()) {
      $legacy_authors = [];
      foreach ($obra->get('field_obra_atribucion')->referencedEntities() as $term) {
        $legacy_authors[] = [
          'nid' => $term->id(),
          'title' => $term->label(),
        ];
      }
      if (!empty($legacy_authors)) {
        $data['atrib_trad_grupos'][] = ['autores' => $legacy_authors];
      }
    }

    if (empty($data['atrib_etso_grupos']) && !$data['atrib_etso_sin_autor'] && $obra->hasField('field_obra_atribucion_etso') && !$obra->get('field_obra_atribucion_etso')->isEmpty()) {
      foreach ($obra->get('field_obra_atribucion_etso')->referencedEntities() as $term) {
        $data['atrib_etso_grupos'][] = [
          'autor' => [
            'nid' => $term->id(),
            'title' => $term->label(),
          ],
          'confianza' => '',
        ];
      }
    }
  }

  /**
   * Normaliza texto usando la función del módulo etso_normalizer.
   *
   * @param string $texto
   *   Texto a normalizar.
   *
   * @return string
   *   Texto normalizado.
   */
  protected function normalizarTexto(string $texto): string {
    if (function_exists('_etso_normalizer_normalizar')) {
      return _etso_normalizer_normalizar($texto);
    }
    // Fallback si la función no está disponible
    return mb_strtolower(trim($texto), 'UTF-8');
  }

  /**
   * Obtiene opciones de taxonomía para filtros.
   *
   * @param string $vocabulary_id
   *   ID del vocabulario.
   *
   * @return array
   *   Array asociativo [tid => nombre].
   */
  public function getTaxonomyOptions(string $vocabulary_id): array {
    $options = [];
    
    $terms = $this->entityTypeManager
      ->getStorage('taxonomy_term')
      ->loadTree($vocabulary_id, 0, NULL, TRUE);

    foreach ($terms as $term) {
      $options[$term->id()] = $term->getName();
    }

    return $options;
  }

  /**
   * Busca autores por autocompletado.
   *
   * Busca en field_nombre_variantes y devuelve el title.
   *
   * @param string $string
   *   String de búsqueda.
   * @param int $limit
   *   Límite de resultados.
   *
   * @return array
   *   Array de resultados [['id' => 123, 'label' => 'Nombre', 'value' => 'Nombre'], ...].
   */
  public function autocompleteAutor(string $string, int $limit = 15): array {
    $string_normalizado = $this->normalizarTexto($string);
    $results = [];

    $query = $this->entityTypeManager->getStorage('node')->getQuery()
      ->condition('type', 'autor')
      ->condition('status', 1)
      ->accessCheck(TRUE)
      ->range(0, $limit);

    // Buscar principalmente en field_nombre_variantes
    $group = $query->orConditionGroup();
    $group->condition('field_nombre_variantes', $string_normalizado, 'CONTAINS');
    // También buscar en título por si acaso
    $group->condition('title', $string_normalizado, 'CONTAINS');
    
    $query->condition($group);

    $nids = $query->execute();

    if (!empty($nids)) {
      $autores = $this->entityTypeManager->getStorage('node')->loadMultiple($nids);
      foreach ($autores as $autor) {
        $title = $autor->getTitle();
        $results[] = [
          'id' => (int) $autor->id(),
          'label' => $title,
          'value' => $title,
        ];
      }
    }

    return $results;
  }

}
