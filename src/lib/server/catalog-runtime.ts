import { createClient } from '@libsql/client';
import Graph from 'graphology';
import louvain from 'graphology-communities-louvain';
import forceAtlas2 from 'graphology-layout-forceatlas2';
import { dev } from '$app/environment';
import { env } from '$env/dynamic/private';
import { existsSync } from 'node:fs';
import { readPrivateTextByWorkId } from '$lib/server/r2-private';
import { fetchPublicR2Json, getSummariesBaseUrl } from '$lib/server/r2-public';
import { buildWorkTitleSearchText, formatDisplayWorkTitle } from '$lib/utils/format-display-work-title';
import { REPORT_SLUG_PREFIX } from '$lib/utils/report-slug';
import {
	UNRESOLVED_AUTHOR_ID,
	ambitos,
	formatConfidence,
	inferWorkAuthorshipType,
	normalizeConfidence,
	type Ambito,
	type AttributionGroup,
	type AttributionMember,
	type AttributionSet,
	type AuthorMetrics,
	type AuthorWorkRelation,
	type CatalogAuthor,
	type CatalogBiteso,
	type CatalogInforme,
	type CatalogStats,
	type CatalogWork,
	type Confidence,
	type CollaboratorsPageView,
	type ComoCitarnosBibliographySection,
	type ComoCitarnosBibliographyView,
	type DistanceRow,
	type EditorialEntryStatus,
	type EditorialEntryType,
	type EditorialItem,
	type EditorialLink,
	type EditorialSection,
	type EditorialSectionPresentation,
	type ImpactPageView,
	type ImpactRelationTag,
	type InformeBibliographyCopyButton,
	type InformeBibliographyEntry,
	type InformeBibliographyEntryPart,
	type InformeBibliographySection,
	type InformeBibliographyView,
	type InformeDistanceView,
	type WorkAuthorshipType,
	type WorkNetworkGraph,
	type WorkSummaryDetail
} from '$lib/domain/catalog';
import collaboratorsSource from '../../../data/colaboradores/equipo.json';
import bibliographySource from '../../../data/referencias/bibliografia.json';
import impactSource from '../../../data/referencias/repercusion.json';

type SqlArg = string | number | bigint | boolean | null | Uint8Array | Date;

const DEFAULT_CACHE_MS = 10 * 60 * 1000;
const configuredCacheMs = Number.parseInt(env.CATALOG_CACHE_MS ?? '', 10);
const CACHE_MS = Number.isFinite(configuredCacheMs) && configuredCacheMs > 0 ? configuredCacheMs : DEFAULT_CACHE_MS;
const SLOW_QUERY_LOG_MS = 450;
const SLOW_SNAPSHOT_LOG_MS = 1200;
const LOCAL_CATALOG_SQLITE_PATH = 'data/sqlite/etso-prueba.sqlite';
const EMPTY_SHORT_SUMMARY = 'Sin resumen breve disponible.';
const WORK_SLUG_PATTERN = /^[a-z0-9-]+$/;

const escapeHtml = (value: string): string =>
	value
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&#39;');

interface Snapshot {
	works: CatalogWork[];
	workById: Map<string, CatalogWork>;
	workBySlug: Map<string, CatalogWork>;
	workByReportSlug: Map<string, CatalogWork>;
	bitesoWorkBySlug: Map<string, CatalogWork>;
	bitesoSlugByWorkId: Map<string, string>;
	bitesoNameByWorkId: Map<string, string>;
	authors: CatalogAuthor[];
	authorById: Map<string, CatalogAuthor>;
}

interface SummaryFile {
	resumen_breve?: string[];
	resumen_largo?: string[];
	personajes_principales?: Array<{
		nombre?: string;
		descripcion?: string;
	}>;
	espacios_principales?: Array<{
		nombre?: string;
		descripcion?: string;
	}>;
	tematicas_principales?: Array<{
		tema?: string;
		descripcion?: string;
	}>;
}

interface InformeBibliographyEntryRaw {
	id?: unknown;
	text?: unknown;
	parts?: unknown;
	entryType?: unknown;
	type?: unknown;
	author?: unknown;
	authors?: unknown;
	year?: unknown;
	title?: unknown;
	journal?: unknown;
	booktitle?: unknown;
	containerTitle?: unknown;
	publisher?: unknown;
	volume?: unknown;
	number?: unknown;
	issue?: unknown;
	pages?: unknown;
	details?: unknown;
	note?: unknown;
	doi?: unknown;
	url?: unknown;
}

interface InformeBibliographyEntryPartRaw {
	type?: unknown;
	value?: unknown;
	href?: unknown;
}

interface BibliographySectionConfigRaw {
	id?: unknown;
	title?: unknown;
	lead?: unknown;
	entryKeys?: unknown;
	collapsible?: unknown;
	collapsibleLabel?: unknown;
	defaultOpen?: unknown;
}

interface BibliographyCopyButtonConfigRaw {
	label?: unknown;
	sectionId?: unknown;
	entryKey?: unknown;
	entryId?: unknown;
}

interface BibliographyViewConfigRaw {
	intro?: unknown;
	sections?: unknown;
	copyButton?: unknown;
}

interface BibliographyInformesViewRaw {
	base?: unknown;
	overridesByInformeId?: unknown;
}

interface BibliographyViewsRaw {
	informes?: unknown;
	comoCitarnos?: unknown;
}

interface BibliographyFileRaw {
	entriesByKey?: unknown;
	views?: unknown;
}

interface BibliographySectionConfigNormalized {
	id: string;
	title: string;
	lead: string;
	entryKeys: string[];
	collapsible: boolean;
	collapsibleLabel?: string;
	defaultOpen: boolean;
}

interface BibliographyViewConfigNormalized {
	intro: string;
	sections: BibliographySectionConfigNormalized[];
	copyButton: {
		label: string;
		sectionId: string;
		entryKey: string;
	} | null;
}

interface WorkRow {
	id: string;
	slug: string | null;
	titulo: string;
	title_variants: string | null;
	genero: string | null;
	adicion: string | null;
	estado_texto: string | null;
	examen_autorias: number;
	biteso: number;
	biteso_nombre: string | null;
	tiene_acceso_externo: number;
	procede: string | null;
	has_report: number;
	has_resumen_breve: number;
}

interface AuthorRow {
	id: string;
	nombre: string;
	variaciones_nombre: string | null;
}

interface AttributionRow {
	set_id: number;
	work_id: string;
	attribution_type: string;
	raw_expression: string;
	group_id: number | null;
	group_order: number | null;
	author_id: string | null;
	member_order: number | null;
	confianza: string | null;
}

interface TextAccessRow {
	work_id: string;
	tipo: string;
	etiqueta: string;
	url: string;
	position: number;
}

interface DistanceRowRaw {
	work_id: string;
	ambito: string;
	rank: number;
	related_work_id: string;
	distancia: number;
}

export type ExamenWorksMatchMode = 'or' | 'and';

export interface ExamenWorksFilters {
	titulo: string;
	genero: string[];
	autor: string[];
	tipo_autoria: string[];
	autor_trad: string[];
	autor_trad_match: ExamenWorksMatchMode;
	autor_esto: string[];
	autor_esto_match: ExamenWorksMatchMode;
	confianza: string[];
	estado: string[];
	desde: string;
	hasta: string;
}

export interface ExamenWorksPage {
	works: CatalogWork[];
	totalResults: number;
	totalPages: number;
	page: number;
}

export interface ExamenFilterOptions {
	authors: CatalogAuthor[];
	genres: string[];
	states: string[];
}

const EXAMEN_FILTER_CACHE_LIMIT = 50;

interface TempGroup {
	order: number;
	members: Array<{
		memberOrder: number;
		authorId: string;
		confidence?: string | null;
	}>;
}

interface TempSet {
	workId: string;
	attributionType: string;
	rawExpression: string;
	groups: Map<number, TempGroup>;
}

interface EditorialLinkRaw {
	label?: unknown;
	href?: unknown;
	kind?: unknown;
}

interface EditorialItemRaw {
	id?: unknown;
	title?: unknown;
	summary?: unknown;
	type?: unknown;
	status?: unknown;
	year?: unknown;
	people?: unknown;
	organizations?: unknown;
	tags?: unknown;
	links?: unknown;
	image?: unknown;
}

interface EditorialSectionRaw {
	id?: unknown;
	title?: unknown;
	description?: unknown;
	presentation?: unknown;
	items?: unknown;
}

interface EditorialPageRaw {
	intro?: unknown;
	sections?: unknown;
}

let cachedSnapshot: Snapshot | null = null;
let cachedSnapshotPromise: Promise<Snapshot> | null = null;
let cachedAt = 0;
let dbClient: ReturnType<typeof createClient> | null = null;
let dbClientMode: 'configured' | 'local-fallback' | null = null;
let warnedLocalCatalogFallback = false;
const tableColumnsByName = new Map<string, Set<string>>();
const shortSummaryByWorkId = new Map<string, { cachedAt: number; value: string }>();
const reportResultsByWorkId = new Map<string, { cachedAt: number; result1?: string; result2?: string }>();

const logIfSlow = (label: string, startedAt: number, metadata = ''): void => {
	const elapsed = Date.now() - startedAt;
	if (elapsed < SLOW_QUERY_LOG_MS) return;
	console.warn(`[catalog-runtime] slow ${label}: ${elapsed}ms${metadata ? ` ${metadata}` : ''}`);
};

const splitVariants = (value: string | null | undefined): string[] => {
	if (!value) return [];
	return value
		.split(/\s*[|;]\s*/)
		.map((chunk) => chunk.trim())
		.filter((chunk) => chunk.length > 0);
};

const splitTitleVariants = (value: string | null | undefined): string[] => {
	if (!value) return [];
	return value
		.split('|')
		.map((chunk) => chunk.trim())
		.filter((chunk) => chunk.length > 0);
};

const ensureDistanceRecord = (): Record<Ambito, DistanceRow[]> => ({
	obracompleta: [],
	jornada1: [],
	jornada2: [],
	jornada3: [],
	jornada4: [],
	jornada5: []
});

const hasAnyDistanceRows = (distances: Record<Ambito, DistanceRow[]>): boolean =>
	Object.values(distances).some((rows) => rows.length > 0);

const normalizeDistanceAmbito = (rawAmbito: string): Ambito | null => {
	const normalized = rawAmbito.trim().toLowerCase();
	const direct = ambitos.find((ambito) => ambito === normalized);
	if (direct) return direct;

	const aliases: Record<string, Ambito> = {
		global: 'obracompleta',
		obracompleta: 'obracompleta',
		obra_completa: 'obracompleta',
		primerajornada: 'jornada1',
		jornada1: 'jornada1',
		segundajornada: 'jornada2',
		jornada2: 'jornada2',
		tercerajornada: 'jornada3',
		jornada3: 'jornada3',
		cuartajornada: 'jornada4',
		jornada4: 'jornada4',
		quintajornada: 'jornada5',
		jornada5: 'jornada5'
	};

	return aliases[normalized.replace(/[^a-z0-9]/g, '')] ?? null;
};

const normalizeShortSummary = (value: string | null | undefined): string => value?.trim() || EMPTY_SHORT_SUMMARY;

const normalizeText = (value: string): string =>
	value
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.trim();

const parseYearMonth = (value: string): number | null => {
	const match = value.match(/(\d{4})[/-](\d{1,2})/);
	if (!match) return null;
	const year = Number(match[1]);
	const month = Number(match[2]);
	if (!Number.isInteger(year) || !Number.isInteger(month)) return null;
	if (month < 1 || month > 12) return null;
	return year * 100 + month;
};

const assertTursoConfig = (): { databaseUrl: string; authToken: string } => {
	if (!env.TURSO_DATABASE_URL || !env.TURSO_AUTH_TOKEN) {
		throw new Error('Faltan TURSO_DATABASE_URL o TURSO_AUTH_TOKEN para leer el catálogo desde Turso.');
	}
	return {
		databaseUrl: env.TURSO_DATABASE_URL,
		authToken: env.TURSO_AUTH_TOKEN
	};
};

const canUseLocalCatalogFallback = (): boolean => dev && existsSync(LOCAL_CATALOG_SQLITE_PATH);

const warnLocalCatalogFallback = (cause: unknown): void => {
	if (warnedLocalCatalogFallback) return;
	warnedLocalCatalogFallback = true;
	const message = cause instanceof Error ? cause.message : String(cause);
	console.warn(
		`No se pudo leer el catalogo desde Turso (${message}). Usando SQLite local de desarrollo: ${LOCAL_CATALOG_SQLITE_PATH}.`
	);
};

const createConfiguredDbClient = (): ReturnType<typeof createClient> => {
	const { databaseUrl, authToken } = assertTursoConfig();
	dbClientMode = 'configured';
	return createClient({
		url: databaseUrl,
		authToken
	});
};

const createLocalFallbackDbClient = (): ReturnType<typeof createClient> => {
	dbClientMode = 'local-fallback';
	return createClient({
		url: `file:${LOCAL_CATALOG_SQLITE_PATH}`,
		authToken: 'local'
	});
};

const getDbClient = (): ReturnType<typeof createClient> => {
	if (dbClient) return dbClient;
	try {
		dbClient = createConfiguredDbClient();
	} catch (cause) {
		if (!canUseLocalCatalogFallback()) throw cause;
		warnLocalCatalogFallback(cause);
		dbClient = createLocalFallbackDbClient();
	}
	return dbClient;
};

const isFetchFailure = (cause: unknown): boolean =>
	cause instanceof Error && cause.message.toLowerCase().includes('fetch failed');

const getRows = async <T>(sql: string, args?: SqlArg[]): Promise<T[]> => {
	const startedAt = Date.now();
	const db = getDbClient();
	let result;
	try {
		result = args ? await db.execute(sql, args) : await db.execute(sql);
	} catch (cause) {
		if (dbClientMode !== 'configured' || !canUseLocalCatalogFallback() || !isFetchFailure(cause)) {
			throw cause;
		}
		warnLocalCatalogFallback(cause);
		dbClient = createLocalFallbackDbClient();
		result = args ? await dbClient.execute(sql, args) : await dbClient.execute(sql);
	}
	logIfSlow('query', startedAt, sql.replace(/\s+/g, ' ').trim().slice(0, 120));
	return result.rows as unknown as T[];
};

const getTableColumnNames = async (tableName: 'authors' | 'works'): Promise<Set<string>> => {
	const cached = tableColumnsByName.get(tableName);
	if (cached) return cached;

	const rows = await getRows<{ name: string }>(`PRAGMA table_info(${tableName})`);
	const columns = new Set(rows.map((column) => column.name));
	tableColumnsByName.set(tableName, columns);
	return columns;
};

const createPlaceholders = (values: readonly unknown[]): string => values.map(() => '?').join(', ');

const getAuthorVariantsSelect = async (): Promise<string> => {
	const authorsTableColumns = await getTableColumnNames('authors');
	return authorsTableColumns.has('variaciones_nombre') ? 'variaciones_nombre' : 'NULL AS variaciones_nombre';
};

const getTitleVariantsSelect = async (): Promise<string> => {
	const worksTableColumns = await getTableColumnNames('works');
	if (!worksTableColumns.has('slug')) {
		throw new Error('La tabla works de Turso no tiene columna slug.');
	}
	if (worksTableColumns.has('otrostitulos')) return 'otrostitulos AS title_variants';
	if (worksTableColumns.has('variaciones_titulo')) return 'variaciones_titulo AS title_variants';
	return 'NULL AS title_variants';
};

const getTitleSearchFilterExpressions = async (): Promise<string[]> => {
	const worksTableColumns = await getTableColumnNames('works');
	const expressions = ['w.titulo'];
	if (worksTableColumns.has('titulo_busqueda')) expressions.push('w.titulo_busqueda');
	if (worksTableColumns.has('otrostitulos')) {
		expressions.push('w.otrostitulos');
	} else if (worksTableColumns.has('variaciones_titulo')) {
		expressions.push('w.variaciones_titulo');
	}
	return expressions;
};

const toCatalogAuthors = (rows: AuthorRow[]): CatalogAuthor[] =>
	rows.map((row) => ({
		id: row.id,
		name: row.nombre,
		nameVariants: splitVariants(row.variaciones_nombre)
	}));

const loadAuthorsByIds = async (authorIds: Iterable<string>): Promise<Map<string, CatalogAuthor>> => {
	const ids = Array.from(new Set(Array.from(authorIds).filter((id) => id && id !== UNRESOLVED_AUTHOR_ID)));
	if (ids.length === 0) return new Map();
	const variantsSelect = await getAuthorVariantsSelect();
	const rows = await getRows<AuthorRow>(
		`SELECT id, nombre, ${variantsSelect}
		 FROM authors
		 WHERE id IN (${createPlaceholders(ids)})`,
		ids
	);
	return new Map(toCatalogAuthors(rows).map((author) => [author.id, author] as const));
};

const normalizeAttributionRows = (
	attributionRows: AttributionRow[],
	authorById: Map<string, CatalogAuthor>
): Map<string, AttributionSet> => {
	const tempSets = new Map<number, TempSet>();
	for (const row of attributionRows) {
		if (!tempSets.has(row.set_id)) {
			tempSets.set(row.set_id, {
				workId: row.work_id,
				attributionType: row.attribution_type,
				rawExpression: row.raw_expression,
				groups: new Map()
			});
		}

		const set = tempSets.get(row.set_id)!;
		if (row.group_id == null || row.group_order == null) continue;

		if (!set.groups.has(row.group_id)) {
			set.groups.set(row.group_id, {
				order: row.group_order,
				members: []
			});
		}

		if (row.author_id) {
			set.groups.get(row.group_id)!.members.push({
				memberOrder: row.member_order ?? 0,
				authorId: row.author_id,
				confidence: row.confianza
			});
		}
	}

	const attributionByWorkType = new Map<string, AttributionSet>();
	for (const set of tempSets.values()) {
		const sortedGroups = [...set.groups.values()]
			.sort((a, b) => a.order - b.order)
			.map((group): AttributionGroup => {
				const members = group.members
					.sort((a, b) => a.memberOrder - b.memberOrder)
					.map((member): AttributionMember => ({
						authorId: member.authorId,
						authorName: memberNameFromId(member.authorId, authorById),
						confidence: normalizeConfidence(member.confidence)
					}));
				return { members };
			})
			.filter((group) => group.members.length > 0);

		const unresolved =
			set.rawExpression.toLowerCase().includes(UNRESOLVED_AUTHOR_ID) ||
			sortedGroups.some((group) =>
				group.members.some((member) => member.authorId === UNRESOLVED_AUTHOR_ID)
			);

		const normalized: AttributionSet = unresolved
			? {
					groups: [],
					connector: 'and',
					unresolved: true,
					rawExpression: set.rawExpression
				}
			: {
					groups: sortedGroups,
					connector: resolveConnector(set.rawExpression),
					rawExpression: set.rawExpression
				};

		attributionByWorkType.set(`${set.workId}::${set.attributionType}`, normalized);
	}
	return attributionByWorkType;
};

const loadAttributionRowsByWorkIds = async (workIds: string[]): Promise<AttributionRow[]> => {
	if (workIds.length === 0) return [];
	return getRows<AttributionRow>(
		`SELECT
			s.id AS set_id,
			s.work_id,
			s.attribution_type,
			s.raw_expression,
			g.id AS group_id,
			g.group_order,
			m.author_id,
			m.member_order,
			m.confianza
		 FROM attribution_sets s
		 LEFT JOIN attribution_groups g ON g.attribution_set_id = s.id
		 LEFT JOIN attribution_members m ON m.attribution_group_id = g.id
		 WHERE s.work_id IN (${createPlaceholders(workIds)})
		 ORDER BY s.work_id, s.attribution_type, g.group_order, m.member_order`,
		workIds
	);
};

const buildTextAccessByWork = (rows: TextAccessRow[]): Map<string, CatalogWork['textLinks']> => {
	const textAccessByWork = new Map<string, CatalogWork['textLinks']>();
	for (const row of rows) {
		if (!textAccessByWork.has(row.work_id)) {
			textAccessByWork.set(row.work_id, []);
		}
		textAccessByWork.get(row.work_id)!.push({
			label: row.etiqueta || row.tipo || 'Acceso externo',
			href: row.url,
			kind: 'texto_externo',
			external: true
		});
	}
	return textAccessByWork;
};

const loadTextAccessByWorkIds = async (workIds: string[]): Promise<Map<string, CatalogWork['textLinks']>> => {
	if (workIds.length === 0) return new Map();
	const rows = await getRows<TextAccessRow>(
		`SELECT work_id, tipo, etiqueta, url, position
		 FROM text_access
		 WHERE work_id IN (${createPlaceholders(workIds)})
		 ORDER BY work_id, position`,
		workIds
	);
	return buildTextAccessByWork(rows);
};

const buildCatalogWorksFromRows = (
	workRows: WorkRow[],
	attributionByWorkType: Map<string, AttributionSet>,
	textAccessByWork: Map<string, CatalogWork['textLinks']>
): {
	works: CatalogWork[];
	bitesoSlugByWorkId: Map<string, string>;
	bitesoNameByWorkId: Map<string, string>;
} => {
	const seenWorkSlugs = new Map<string, string>();
	const bitesoSlugCounts = new Map<string, number>();
	const bitesoSlugByWorkId = new Map<string, string>();
	const bitesoNameByWorkId = new Map<string, string>();

	const works = workRows.map((row) => {
		const traditionalAttribution =
			attributionByWorkType.get(`${row.id}::tradicional`) ?? makeEmptyAttributionSet();
		const stylometryAttribution =
			attributionByWorkType.get(`${row.id}::estilometria`) ?? makeEmptyAttributionSet();

		const hasSummary = Number(row.has_resumen_breve) === 1;
		const hasReport = Number(row.has_report) === 1;
		const slug = resolveWorkSlug(row, seenWorkSlugs);
		const reportSlug = hasReport ? `${REPORT_SLUG_PREFIX}${slug}` : undefined;
		const bitesoNombre = row.biteso_nombre?.trim() || 'ETSO';
		bitesoNameByWorkId.set(row.id, bitesoNombre);

		let bitesoSlug = '';
		if (Number(row.biteso) === 1) {
			const bitesoBaseSlug = slugify(row.titulo ?? '') || slugify(row.id ?? '') || 'texto';
			const bitesoSlugCount = (bitesoSlugCounts.get(bitesoBaseSlug) ?? 0) + 1;
			bitesoSlugCounts.set(bitesoBaseSlug, bitesoSlugCount);
			bitesoSlug = bitesoSlugCount === 1 ? bitesoBaseSlug : `${bitesoBaseSlug}-${bitesoSlugCount}`;
			bitesoSlugByWorkId.set(row.id, bitesoSlug);
		}

		const links: CatalogWork['textLinks'] = [];
		if (Number(row.biteso) === 1) {
			links.push({
				label: 'Texto BITESO',
				href: `/biteso/${bitesoSlug}`,
				kind: 'biteso'
			});
		}
		for (const link of textAccessByWork.get(row.id) ?? []) {
			links.push(link);
		}

		return {
			id: row.id,
			slug,
			title: row.titulo,
			titleVariants: splitTitleVariants(row.title_variants),
			genre: row.genero?.trim() || 'Sin genero',
			origin: row.procede?.trim() || 'Sin procedencia',
			textState: row.estado_texto?.trim() || 'Sin estado',
			addedOn: row.adicion?.trim() || 'Sin fecha',
			shortSummary: EMPTY_SHORT_SUMMARY,
			hasSummaryFile: hasSummary,
			inAuthorshipExam: Number(row.examen_autorias) === 1,
			traditionalAttribution,
			stylometryAttribution,
			textLinks: links,
			reportId: hasReport ? row.id : undefined,
			reportSlug
		};
	});

	return {
		works,
		bitesoSlugByWorkId,
		bitesoNameByWorkId
	};
};

const loadWorkRowsByIds = async (workIds: string[]): Promise<WorkRow[]> => {
	if (workIds.length === 0) return [];
	const titleVariantsSelect = await getTitleVariantsSelect();
	const orderCases = workIds.map((_, index) => `WHEN ? THEN ${index}`).join(' ');
	return getRows<WorkRow>(
		`SELECT id, slug, titulo,
		 ${titleVariantsSelect},
		 genero, adicion, estado_texto,
		 examen_autorias, biteso, biteso_nombre, tiene_acceso_externo,
		 procede,
		 CASE WHEN resultado1 IS NULL AND resultado2 IS NULL THEN 0 ELSE 1 END AS has_report,
		 CASE WHEN resumen_breve IS NULL THEN 0 ELSE 1 END AS has_resumen_breve
		 FROM works
		 WHERE id IN (${createPlaceholders(workIds)})
		 ORDER BY CASE id ${orderCases} ELSE ${workIds.length} END`,
		[...workIds, ...workIds]
	);
};

const hydrateWorksByIds = async (workIds: string[]): Promise<CatalogWork[]> => {
	const ids = Array.from(new Set(workIds));
	if (ids.length === 0) return [];
	const attributionRows = await loadAttributionRowsByWorkIds(ids);
	const authorById = await loadAuthorsByIds(
		attributionRows.map((row) => row.author_id ?? '').filter(Boolean)
	);
	const [workRows, textAccessByWork] = await Promise.all([
		loadWorkRowsByIds(ids),
		loadTextAccessByWorkIds(ids)
	]);
	const attributionByWorkType = normalizeAttributionRows(attributionRows, authorById);
	return buildCatalogWorksFromRows(workRows, attributionByWorkType, textAccessByWork).works;
};

const resolveConnector = (rawExpression: string): 'and' | 'or' => {
	if (/\bOR\b/i.test(rawExpression)) return 'or';
	return 'and';
};

const makeEmptyAttributionSet = (): AttributionSet => ({
	groups: [],
	connector: 'and'
});

const memberNameFromId = (authorId: string, authorMap: Map<string, CatalogAuthor>): string => {
	const author = authorMap.get(authorId);
	if (author) return author.name;
	return authorId
		.split('_')
		.map((token) => token.charAt(0).toUpperCase() + token.slice(1))
		.join(' ');
};

const resolveWorkSlug = (row: WorkRow, seenSlugs: Map<string, string>): string => {
	const slug = row.slug?.trim();
	if (!slug) {
		throw new Error(`La obra ${row.id} no tiene slug en Turso.`);
	}
	if (slug.startsWith(REPORT_SLUG_PREFIX)) {
		throw new Error(`La obra ${row.id} incluye el prefijo de informe en works.slug: ${slug}`);
	}
	if (!WORK_SLUG_PATTERN.test(slug)) {
		throw new Error(`La obra ${row.id} tiene un slug invalido en Turso: ${slug}`);
	}
	const existingWorkId = seenSlugs.get(slug);
	if (existingWorkId) {
		throw new Error(`Slug duplicado en Turso: ${slug} (${existingWorkId}, ${row.id})`);
	}
	seenSlugs.set(slug, row.id);
	return slug;
};

const fetchSummaryFile = async (workId: string): Promise<SummaryFile | null> =>
	fetchPublicR2Json<SummaryFile>(getSummariesBaseUrl(), `${workId}.json`);

const createSnapshot = async (): Promise<Snapshot> => {
	const authorsTableColumns = await getTableColumnNames('authors');
	const hasAuthorVariantsColumn = authorsTableColumns.has('variaciones_nombre');
	const authorRows = await getRows<AuthorRow>(
		`SELECT id, nombre, ${hasAuthorVariantsColumn ? 'variaciones_nombre' : 'NULL AS variaciones_nombre'}
		 FROM authors
		 ORDER BY nombre COLLATE NOCASE`
	);

	const authors: CatalogAuthor[] = authorRows.map((row) => ({
		id: row.id,
		name: row.nombre,
		nameVariants: splitVariants(row.variaciones_nombre)
	}));
	const authorById = new Map(authors.map((author) => [author.id, author] as const));

	const attributionRows = await getRows<AttributionRow>(
		`SELECT
			s.id AS set_id,
			s.work_id,
			s.attribution_type,
			s.raw_expression,
			g.id AS group_id,
			g.group_order,
			m.author_id,
			m.member_order,
			m.confianza
		 FROM attribution_sets s
		 LEFT JOIN attribution_groups g ON g.attribution_set_id = s.id
		 LEFT JOIN attribution_members m ON m.attribution_group_id = g.id
		 ORDER BY s.work_id, s.attribution_type, g.group_order, m.member_order`
	);

	const tempSets = new Map<number, TempSet>();
	for (const row of attributionRows) {
		if (!tempSets.has(row.set_id)) {
			tempSets.set(row.set_id, {
				workId: row.work_id,
				attributionType: row.attribution_type,
				rawExpression: row.raw_expression,
				groups: new Map()
			});
		}

		const set = tempSets.get(row.set_id)!;
		if (row.group_id == null || row.group_order == null) continue;

		if (!set.groups.has(row.group_id)) {
			set.groups.set(row.group_id, {
				order: row.group_order,
				members: []
			});
		}

		if (row.author_id) {
			set.groups.get(row.group_id)!.members.push({
				memberOrder: row.member_order ?? 0,
				authorId: row.author_id,
				confidence: row.confianza
			});
		}
	}

	const attributionByWorkType = new Map<string, AttributionSet>();
	for (const set of tempSets.values()) {
		const sortedGroups = [...set.groups.values()]
			.sort((a, b) => a.order - b.order)
			.map((group): AttributionGroup => {
				const members = group.members
					.sort((a, b) => a.memberOrder - b.memberOrder)
					.map((member): AttributionMember => ({
						authorId: member.authorId,
						authorName: memberNameFromId(member.authorId, authorById),
						confidence: normalizeConfidence(member.confidence)
					}));
				return { members };
			})
			.filter((group) => group.members.length > 0);

		const unresolved =
			set.rawExpression.toLowerCase().includes(UNRESOLVED_AUTHOR_ID) ||
			sortedGroups.some((group) =>
				group.members.some((member) => member.authorId === UNRESOLVED_AUTHOR_ID)
			);

		const normalized: AttributionSet = unresolved
			? {
					groups: [],
					connector: 'and',
					unresolved: true,
					rawExpression: set.rawExpression
				}
			: {
					groups: sortedGroups,
					connector: resolveConnector(set.rawExpression),
					rawExpression: set.rawExpression
				};

		attributionByWorkType.set(`${set.workId}::${set.attributionType}`, normalized);
	}

	const textAccessRows = await getRows<TextAccessRow>(
		`SELECT work_id, tipo, etiqueta, url, position
		 FROM text_access
		 ORDER BY work_id, position`
	);
	const textAccessByWork = new Map<string, CatalogWork['textLinks']>();
	for (const row of textAccessRows) {
		if (!textAccessByWork.has(row.work_id)) {
			textAccessByWork.set(row.work_id, []);
		}
		textAccessByWork.get(row.work_id)!.push({
			label: row.etiqueta || row.tipo || 'Acceso externo',
			href: row.url,
			kind: 'texto_externo',
			external: true
		});
	}

	const worksTableColumns = await getTableColumnNames('works');
	const hasWorkSlugColumn = worksTableColumns.has('slug');
	if (!hasWorkSlugColumn) {
		throw new Error('La tabla works de Turso no tiene columna slug.');
	}
	const hasWorkOtherTitlesColumn = worksTableColumns.has('otrostitulos');
	const hasWorkLegacyTitleVariantsColumn = worksTableColumns.has('variaciones_titulo');
	const titleVariantsSelect = hasWorkOtherTitlesColumn
		? 'otrostitulos AS title_variants'
		: hasWorkLegacyTitleVariantsColumn
			? 'variaciones_titulo AS title_variants'
			: 'NULL AS title_variants';

	const workRows = await getRows<WorkRow>(
		`SELECT id, slug, titulo,
		 ${titleVariantsSelect},
		 genero, adicion, estado_texto,
		 examen_autorias, biteso, biteso_nombre, tiene_acceso_externo,
		 procede,
		 CASE WHEN resultado1 IS NULL AND resultado2 IS NULL THEN 0 ELSE 1 END AS has_report,
		 CASE WHEN resumen_breve IS NULL THEN 0 ELSE 1 END AS has_resumen_breve
		 FROM works
		 ORDER BY titulo COLLATE NOCASE`
	);

	const seenWorkSlugs = new Map<string, string>();
	const bitesoSlugCounts = new Map<string, number>();
	const bitesoSlugByWorkId = new Map<string, string>();
	const bitesoNameByWorkId = new Map<string, string>();

	const works: CatalogWork[] = workRows.map((row) => {
		const traditionalAttribution =
			attributionByWorkType.get(`${row.id}::tradicional`) ?? makeEmptyAttributionSet();
		const stylometryAttribution =
			attributionByWorkType.get(`${row.id}::estilometria`) ?? makeEmptyAttributionSet();

		const hasSummary = Number(row.has_resumen_breve) === 1;
		const hasReport = Number(row.has_report) === 1;

		const slug = resolveWorkSlug(row, seenWorkSlugs);
		const reportSlug = hasReport ? `${REPORT_SLUG_PREFIX}${slug}` : undefined;
		const bitesoNombre = row.biteso_nombre?.trim() || 'ETSO';
		bitesoNameByWorkId.set(row.id, bitesoNombre);
		let bitesoSlug = '';
		if (Number(row.biteso) === 1) {
			const bitesoBaseSlug = slugify(row.titulo ?? '') || slugify(row.id ?? '') || 'texto';
			const bitesoSlugCount = (bitesoSlugCounts.get(bitesoBaseSlug) ?? 0) + 1;
			bitesoSlugCounts.set(bitesoBaseSlug, bitesoSlugCount);
			bitesoSlug = bitesoSlugCount === 1 ? bitesoBaseSlug : `${bitesoBaseSlug}-${bitesoSlugCount}`;
			bitesoSlugByWorkId.set(row.id, bitesoSlug);
		}

		const links: CatalogWork['textLinks'] = [];
		if (Number(row.biteso) === 1) {
			links.push({
				label: 'Texto BITESO',
				href: `/biteso/${bitesoSlug}`,
				kind: 'biteso'
			});
		}
		for (const link of textAccessByWork.get(row.id) ?? []) {
			links.push(link);
		}

		return {
			id: row.id,
			slug,
			title: row.titulo,
			titleVariants: splitTitleVariants(row.title_variants),
			genre: row.genero?.trim() || 'Sin genero',
			origin: row.procede?.trim() || 'Sin procedencia',
			textState: row.estado_texto?.trim() || 'Sin estado',
			addedOn: row.adicion?.trim() || 'Sin fecha',
			shortSummary: EMPTY_SHORT_SUMMARY,
			hasSummaryFile: hasSummary,
			inAuthorshipExam: Number(row.examen_autorias) === 1,
			traditionalAttribution,
			stylometryAttribution,
			textLinks: links,
			reportId: hasReport ? row.id : undefined,
			reportSlug
		};
	});

	const workById = new Map(works.map((work) => [work.id, work] as const));
	const workBySlug = new Map(works.map((work) => [work.slug, work] as const));
	const workByReportSlug = new Map<string, CatalogWork>();
	const bitesoWorkBySlug = new Map<string, CatalogWork>();
	for (const work of works) {
		if (work.reportSlug) workByReportSlug.set(work.reportSlug, work);
		const bitesoSlug = bitesoSlugByWorkId.get(work.id);
		if (bitesoSlug) bitesoWorkBySlug.set(bitesoSlug, work);
	}

	return {
		works,
		workById,
		workBySlug,
		workByReportSlug,
		bitesoWorkBySlug,
		bitesoSlugByWorkId,
		bitesoNameByWorkId,
		authors,
		authorById
	};
};

const refreshSnapshot = (): Promise<Snapshot> => {
	if (cachedSnapshotPromise) return cachedSnapshotPromise;

	const startedAt = Date.now();
	cachedSnapshotPromise = createSnapshot()
		.then((snapshot) => {
			cachedSnapshot = snapshot;
			cachedAt = Date.now();
			const elapsed = cachedAt - startedAt;
			if (elapsed >= SLOW_SNAPSHOT_LOG_MS) {
				console.warn(`[catalog-runtime] snapshot rebuilt in ${elapsed}ms`);
			}
			return snapshot;
		})
		.catch((cause) => {
			console.error('[catalog-runtime] snapshot refresh failed', cause);
			if (cachedSnapshot) return cachedSnapshot;
			throw cause;
		})
		.finally(() => {
			cachedSnapshotPromise = null;
		});

	return cachedSnapshotPromise;
};

const getSnapshot = async (): Promise<Snapshot> => {
	const now = Date.now();
	if (cachedSnapshot && now - cachedAt < CACHE_MS) {
		return cachedSnapshot;
	}

	if (cachedSnapshot) {
		void refreshSnapshot();
		return cachedSnapshot;
	}

	return refreshSnapshot();
};

const distancesBySnapshot = new WeakMap<Snapshot, Map<string, Promise<Record<Ambito, DistanceRow[]>>>>();

const normalizeSummaryNamedItems = (
	rows: Array<{ nombre?: string; descripcion?: string }> | undefined
): WorkSummaryDetail['personajes'] => {
	if (!Array.isArray(rows)) return [];
	return rows
		.map((row) => ({
			nombre: row.nombre?.trim() || '',
			descripcion: row.descripcion?.trim() || ''
		}))
		.filter((row) => row.nombre.length > 0 || row.descripcion.length > 0);
};

const normalizeSummaryThemeItems = (
	rows: Array<{ tema?: string; descripcion?: string }> | undefined
): WorkSummaryDetail['tematicas'] => {
	if (!Array.isArray(rows)) return [];
	return rows
		.map((row) => ({
			tema: row.tema?.trim() || '',
			descripcion: row.descripcion?.trim() || ''
		}))
		.filter((row) => row.tema.length > 0 || row.descripcion.length > 0);
};

const containsAuthor = (set: CatalogWork['traditionalAttribution'], authorId: string): boolean => {
	if (set.unresolved) return false;
	return set.groups.some((group) => group.members.some((member) => member.authorId === authorId));
};

const confidenceForAuthor = (set: CatalogWork['stylometryAttribution'], authorId: string): Confidence[] => {
	if (set.unresolved) return [];

	const values = new Set<Confidence>();
	for (const group of set.groups) {
		for (const member of group.members) {
			if (member.authorId === authorId && member.confidence) {
				values.add(member.confidence);
			}
		}
	}
	return Array.from(values);
};

export const getAllWorks = async (): Promise<CatalogWork[]> => (await getSnapshot()).works;

const loadWorksForSummaries = async (includeShortSummary: boolean): Promise<CatalogWork[]> => {
	const titleVariantsSelect = await getTitleVariantsSelect();
	const workRows = await getRows<WorkRow & { resumen_breve: string | null }>(
		`SELECT id, slug, titulo,
		 ${titleVariantsSelect},
		 genero, adicion, estado_texto,
		 examen_autorias, biteso, biteso_nombre, tiene_acceso_externo,
		 procede,
		 CASE WHEN resultado1 IS NULL AND resultado2 IS NULL THEN 0 ELSE 1 END AS has_report,
		 1 AS has_resumen_breve,
		 ${includeShortSummary ? 'resumen_breve' : 'NULL AS resumen_breve'}
		 FROM works
		 WHERE resumen_breve IS NOT NULL
		 ORDER BY titulo COLLATE NOCASE`
	);

	const workIds = workRows.map((row) => row.id);
	const attributionRows = await loadAttributionRowsByWorkIds(workIds);
	const authorById = await loadAuthorsByIds(attributionRows.map((row) => row.author_id ?? '').filter(Boolean));
	const attributionByWorkType = normalizeAttributionRows(attributionRows, authorById);
	const seenWorkSlugs = new Map<string, string>();

	return workRows.map((row) => {
		const hasReport = Number(row.has_report) === 1;
		const slug = resolveWorkSlug(row, seenWorkSlugs);
		return {
			id: row.id,
			slug,
			title: row.titulo,
			titleVariants: splitTitleVariants(row.title_variants),
			genre: row.genero?.trim() || 'Sin genero',
			origin: row.procede?.trim() || 'Sin procedencia',
			textState: row.estado_texto?.trim() || 'Sin estado',
			addedOn: row.adicion?.trim() || 'Sin fecha',
			shortSummary: normalizeShortSummary(row.resumen_breve),
			hasSummaryFile: true,
			inAuthorshipExam: Number(row.examen_autorias) === 1,
			traditionalAttribution:
				attributionByWorkType.get(`${row.id}::tradicional`) ?? makeEmptyAttributionSet(),
			stylometryAttribution:
				attributionByWorkType.get(`${row.id}::estilometria`) ?? makeEmptyAttributionSet(),
			textLinks: [],
			reportId: hasReport ? row.id : undefined,
			reportSlug: hasReport ? `${REPORT_SLUG_PREFIX}${slug}` : undefined
		};
	});
};

export const getWorksForSummaryList = async (): Promise<CatalogWork[]> => loadWorksForSummaries(false);

export const getWorksForSummaryIndex = async (): Promise<CatalogWork[]> => loadWorksForSummaries(true);

const getAuthorshipExamWorksFromSnapshot = (snapshot: Snapshot): CatalogWork[] =>
	snapshot.works.filter((work) => work.inAuthorshipExam);

export const getAuthorshipExamWorks = async (): Promise<CatalogWork[]> =>
	getAuthorshipExamWorksFromSnapshot(await getSnapshot());

const hasBitesoText = (work: CatalogWork): boolean =>
	work.textLinks.some((link) => link.kind === 'biteso');

export const getBitesoWorks = async (): Promise<CatalogWork[]> =>
	(await getSnapshot()).works.filter(hasBitesoText);

export const getWorkById = async (workId: string): Promise<CatalogWork | undefined> =>
	(await getSnapshot()).workById.get(workId);

export const getWorkBySlug = async (slug: string): Promise<CatalogWork | undefined> =>
	(await getSnapshot()).workBySlug.get(slug);

export const getWorkByReportSlug = async (slug: string): Promise<CatalogWork | undefined> =>
	(await getSnapshot()).workByReportSlug.get(slug);

export const getWorkShortSummaryById = async (workId: string): Promise<string> => {
	const cached = shortSummaryByWorkId.get(workId);
	const now = Date.now();
	if (cached && now - cached.cachedAt < CACHE_MS) return cached.value;

	const rows = await getRows<{ resumen_breve: string | null }>(
		'SELECT resumen_breve FROM works WHERE id = ? LIMIT 1',
		[workId]
	);
	const value = normalizeShortSummary(rows[0]?.resumen_breve);
	shortSummaryByWorkId.set(workId, { cachedAt: now, value });
	return value;
};

export const withWorkShortSummary = async (work: CatalogWork): Promise<CatalogWork> => ({
	...work,
	shortSummary: await getWorkShortSummaryById(work.id)
});

export const withWorkShortSummaries = async (works: CatalogWork[]): Promise<CatalogWork[]> =>
	Promise.all(works.map((work) => withWorkShortSummary(work)));

const getWorkReportResultsById = async (
	workId: string
): Promise<{ result1?: string; result2?: string }> => {
	const cached = reportResultsByWorkId.get(workId);
	const now = Date.now();
	if (cached && now - cached.cachedAt < CACHE_MS) {
		return {
			result1: cached.result1,
			result2: cached.result2
		};
	}

	const rows = await getRows<{ resultado1: string | null; resultado2: string | null }>(
		'SELECT resultado1, resultado2 FROM works WHERE id = ? LIMIT 1',
		[workId]
	);
	const result1 = rows[0]?.resultado1?.trim();
	const result2 = rows[0]?.resultado2?.trim();
	const value: { result1?: string; result2?: string } = {};
	if (result1) value.result1 = result1;
	if (result2) value.result2 = result2;
	reportResultsByWorkId.set(workId, { cachedAt: now, ...value });
	return value;
};

export const withWorkReportResults = async (work: CatalogWork): Promise<CatalogWork> => ({
	...work,
	...(await getWorkReportResultsById(work.id))
});

export const getAllAuthors = async (): Promise<CatalogAuthor[]> =>
	(await getSnapshot()).authors.filter((author) => author.id !== UNRESOLVED_AUTHOR_ID);

export const getAuthorshipExamAuthors = async (): Promise<CatalogAuthor[]> => {
	const snapshot = await getSnapshot();
	const authorIds = new Set<string>();

	for (const work of getAuthorshipExamWorksFromSnapshot(snapshot)) {
		for (const authorId of collectAuthorIds(work.traditionalAttribution)) {
			if (authorId !== UNRESOLVED_AUTHOR_ID) authorIds.add(authorId);
		}
		for (const authorId of collectAuthorIds(work.stylometryAttribution)) {
			if (authorId !== UNRESOLVED_AUTHOR_ID) authorIds.add(authorId);
		}
	}

	return snapshot.authors
		.filter((author) => authorIds.has(author.id))
		.sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }));
};

export const getAuthorById = async (authorId: string): Promise<CatalogAuthor | undefined> => {
	if (authorId === UNRESOLVED_AUTHOR_ID) return undefined;
	return (await getSnapshot()).authorById.get(authorId);
};

export const listGenres = async (): Promise<string[]> =>
	Array.from(new Set(getAuthorshipExamWorksFromSnapshot(await getSnapshot()).map((work) => work.genre))).sort((a, b) =>
		a.localeCompare(b)
	);

const asWorkAuthorshipType = (value: string): WorkAuthorshipType | null => {
	if (value === 'unica' || value === 'colaboracion' || value === 'desconocida') return value;
	return null;
};

const collectAuthorIds = (set: AttributionSet): Set<string> => {
	const authorIds = new Set<string>();
	if (set.unresolved) return authorIds;

	for (const group of set.groups) {
		for (const member of group.members) {
			if (!member.authorId) continue;
			authorIds.add(member.authorId);
		}
	}
	return authorIds;
};

const matchesByMode = (
	haystack: Set<string>,
	selectedIds: string[],
	matchMode: ExamenWorksMatchMode
): boolean => {
	if (selectedIds.length === 0) return true;
	if (matchMode === 'and') return selectedIds.every((candidate) => haystack.has(candidate));
	return selectedIds.some((candidate) => haystack.has(candidate));
};

interface ExamenWorkSearchRecord {
	work: CatalogWork;
	titleSearch: string;
	traditionalAuthorIds: Set<string>;
	stylometryAuthorIds: Set<string>;
	allAuthorIds: Set<string>;
	stylometryConfidence: Set<Confidence>;
	authorshipType: WorkAuthorshipType;
	yearMonth: number | null;
}

const toExamenWorkSearchRecord = (work: CatalogWork): ExamenWorkSearchRecord => {
	const traditionalAuthorIds = collectAuthorIds(work.traditionalAttribution);
	const stylometryAuthorIds = collectAuthorIds(work.stylometryAttribution);
	const allAuthorIds = new Set([...traditionalAuthorIds, ...stylometryAuthorIds]);
	const stylometryConfidence = new Set<Confidence>();

	if (!work.stylometryAttribution.unresolved) {
		for (const group of work.stylometryAttribution.groups) {
			for (const member of group.members) {
				if (member.confidence) stylometryConfidence.add(member.confidence);
			}
		}
	}

	return {
		work,
		titleSearch: normalizeText(buildWorkTitleSearchText(work.title, work.titleVariants)),
		traditionalAuthorIds,
		stylometryAuthorIds,
		allAuthorIds,
		stylometryConfidence,
		authorshipType: inferWorkAuthorshipType(work),
		yearMonth: parseYearMonth(work.addedOn)
	};
};

const examenSearchRecordsBySnapshot = new WeakMap<Snapshot, ExamenWorkSearchRecord[]>();
const examenFilteredRecordsBySnapshot = new WeakMap<
	Snapshot,
	Map<string, ExamenWorkSearchRecord[]>
>();

const getExamenSearchRecords = (snapshot: Snapshot): ExamenWorkSearchRecord[] => {
	const cached = examenSearchRecordsBySnapshot.get(snapshot);
	if (cached) return cached;
	const records = getAuthorshipExamWorksFromSnapshot(snapshot).map(toExamenWorkSearchRecord);
	examenSearchRecordsBySnapshot.set(snapshot, records);
	return records;
};

const normalizeFilterValues = (values: string[]): string[] =>
	Array.from(new Set(values.map((value) => value.trim()).filter(Boolean))).sort((a, b) =>
		a.localeCompare(b)
	);

const hasActiveExamenFilters = (filters: ExamenWorksFilters): boolean =>
	Boolean(
		filters.titulo.trim() ||
			filters.genero.length > 0 ||
			filters.autor.length > 0 ||
			filters.tipo_autoria.length > 0 ||
			filters.autor_trad.length > 0 ||
			filters.autor_esto.length > 0 ||
			filters.confianza.length > 0 ||
			filters.estado.length > 0 ||
			filters.desde.trim() ||
			filters.hasta.trim()
	);

const createExamenFilterSignature = (filters: ExamenWorksFilters): string => {
	const autorTrad = normalizeFilterValues(filters.autor_trad);
	const autorEsto = normalizeFilterValues(filters.autor_esto);

	return JSON.stringify({
		titulo: normalizeText(filters.titulo),
		genero: normalizeFilterValues(filters.genero),
		autor: normalizeFilterValues(filters.autor),
		tipo_autoria: normalizeFilterValues(filters.tipo_autoria),
		autor_trad: autorTrad,
		autor_trad_match: autorTrad.length > 0 ? filters.autor_trad_match : 'or',
		autor_esto: autorEsto,
		autor_esto_match: autorEsto.length > 0 ? filters.autor_esto_match : 'or',
		confianza: normalizeFilterValues(filters.confianza),
		estado: normalizeFilterValues(filters.estado),
		desde: filters.desde.trim(),
		hasta: filters.hasta.trim()
	});
};

const getCachedExamenFilteredRecords = (
	snapshot: Snapshot,
	filters: ExamenWorksFilters
): ExamenWorkSearchRecord[] => {
	let filteredRecordsBySignature = examenFilteredRecordsBySnapshot.get(snapshot);
	if (!filteredRecordsBySignature) {
		filteredRecordsBySignature = new Map();
		examenFilteredRecordsBySnapshot.set(snapshot, filteredRecordsBySignature);
	}

	const signature = createExamenFilterSignature(filters);
	const cached = filteredRecordsBySignature.get(signature);
	if (cached) return cached;

	const records = getExamenSearchRecords(snapshot).filter((record) =>
		matchesExamenFilters(record, filters)
	);

	if (filteredRecordsBySignature.size >= EXAMEN_FILTER_CACHE_LIMIT) {
		const oldestSignature = filteredRecordsBySignature.keys().next().value;
		if (oldestSignature) filteredRecordsBySignature.delete(oldestSignature);
	}
	filteredRecordsBySignature.set(signature, records);
	return records;
};

const matchesConfidenceFilter = (
	record: ExamenWorkSearchRecord,
	selectedValues: string[]
): boolean => {
	if (selectedValues.length === 0) return true;
	if (record.stylometryConfidence.size === 0) return false;
	return selectedValues.some((selectedValue) => record.stylometryConfidence.has(selectedValue as Confidence));
};

const matchesDateRangeFilter = (
	record: ExamenWorkSearchRecord,
	filters: ExamenWorksFilters
): boolean => {
	if (!record.yearMonth) return true;
	const fromYearMonth = parseYearMonth(filters.desde);
	const toYearMonth = parseYearMonth(filters.hasta);

	if (fromYearMonth && record.yearMonth < fromYearMonth) return false;
	if (toYearMonth && record.yearMonth > toYearMonth) return false;
	return true;
};

const matchesExamenFilters = (
	record: ExamenWorkSearchRecord,
	filters: ExamenWorksFilters
): boolean => {
	const normalizedTitle = normalizeText(filters.titulo);
	const mainAuthorDisabled = filters.autor_trad.length > 0 || filters.autor_esto.length > 0;
	const effectiveMainAuthors = mainAuthorDisabled ? [] : filters.autor;
	const selectedAuthorshipValues = filters.tipo_autoria
		.map((value) => asWorkAuthorshipType(value))
		.filter((value): value is WorkAuthorshipType => value !== null);
	const hasValidDateRange = !filters.desde || !filters.hasta || filters.desde <= filters.hasta;

	if (normalizedTitle && !record.titleSearch.includes(normalizedTitle)) return false;
	if (filters.genero.length > 0 && !filters.genero.includes(record.work.genre)) return false;
	if (!matchesByMode(record.allAuthorIds, effectiveMainAuthors, 'or')) return false;
	if (!matchesByMode(record.traditionalAuthorIds, filters.autor_trad, filters.autor_trad_match)) return false;
	if (!matchesByMode(record.stylometryAuthorIds, filters.autor_esto, filters.autor_esto_match)) return false;
	if (!matchesConfidenceFilter(record, filters.confianza)) return false;
	if (selectedAuthorshipValues.length > 0 && !selectedAuthorshipValues.includes(record.authorshipType)) return false;
	if (filters.estado.length > 0 && !filters.estado.includes(record.work.textState)) return false;
	if (hasValidDateRange && !matchesDateRangeFilter(record, filters)) return false;

	return true;
};

interface SqlWhereClause {
	sql: string;
	args: SqlArg[];
}

const normalizeSqlFilterValues = (values: string[]): string[] =>
	Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));

const addInFilter = (
	conditions: string[],
	args: SqlArg[],
	expression: string,
	values: string[]
): void => {
	const normalized = normalizeSqlFilterValues(values);
	if (normalized.length === 0) return;
	conditions.push(`${expression} IN (${createPlaceholders(normalized)})`);
	args.push(...normalized);
};

const addAuthorFilter = (
	conditions: string[],
	args: SqlArg[],
	authorIds: string[],
	attributionType: string | null,
	matchMode: ExamenWorksMatchMode
): void => {
	const ids = normalizeSqlFilterValues(authorIds);
	if (ids.length === 0) return;
	const typeCondition = attributionType ? ' AND wai.attribution_type = ?' : '';
	const typeArgs = attributionType ? [attributionType] : [];

	if (matchMode === 'and') {
		conditions.push(
			`w.id IN (
				SELECT wai.work_id
				FROM work_author_index wai
				WHERE wai.author_id IN (${createPlaceholders(ids)})${typeCondition}
				GROUP BY wai.work_id
				HAVING COUNT(DISTINCT wai.author_id) = ?
			)`
		);
		args.push(...ids, ...typeArgs, ids.length);
		return;
	}

	conditions.push(
		`EXISTS (
			SELECT 1
			FROM work_author_index wai
			WHERE wai.work_id = w.id
				AND wai.author_id IN (${createPlaceholders(ids)})${typeCondition}
		)`
	);
	args.push(...ids, ...typeArgs);
};

const stylometryAuthorCountSql = `(
	SELECT COUNT(DISTINCT wai.author_id)
	FROM work_author_index wai
	WHERE wai.work_id = w.id
		AND wai.attribution_type = 'estilometria'
		AND wai.author_id <> '${UNRESOLVED_AUTHOR_ID}'
)`;

const traditionalAuthorCountSql = `(
	SELECT COUNT(DISTINCT wai.author_id)
	FROM work_author_index wai
	WHERE wai.work_id = w.id
		AND wai.attribution_type = 'tradicional'
		AND wai.author_id <> '${UNRESOLVED_AUTHOR_ID}'
)`;

const stylometryUnresolvedSql = `EXISTS (
	SELECT 1
	FROM work_author_index wai
	WHERE wai.work_id = w.id
		AND wai.attribution_type = 'estilometria'
		AND wai.author_id = '${UNRESOLVED_AUTHOR_ID}'
)`;

const addAuthorshipTypeFilter = (conditions: string[], values: string[]): void => {
	const selected = normalizeSqlFilterValues(values)
		.map((value) => asWorkAuthorshipType(value))
		.filter((value): value is WorkAuthorshipType => value !== null);
	if (selected.length === 0) return;

	const typeConditions: string[] = [];
	if (selected.includes('unica')) {
		typeConditions.push(`(
			(${stylometryAuthorCountSql} = 1)
			OR (${stylometryAuthorCountSql} = 0 AND NOT ${stylometryUnresolvedSql} AND ${traditionalAuthorCountSql} = 1)
		)`);
	}
	if (selected.includes('colaboracion')) {
		typeConditions.push(`(
			(${stylometryAuthorCountSql} > 1)
			OR (${stylometryAuthorCountSql} = 0 AND NOT ${stylometryUnresolvedSql} AND ${traditionalAuthorCountSql} > 1)
		)`);
	}
	if (selected.includes('desconocida')) {
		typeConditions.push(`(${stylometryUnresolvedSql} OR (${stylometryAuthorCountSql} = 0 AND ${traditionalAuthorCountSql} = 0))`);
	}

	if (typeConditions.length > 0) {
		conditions.push(`(${typeConditions.join(' OR ')})`);
	}
};

const addConfidenceFilter = (conditions: string[], args: SqlArg[], values: string[]): void => {
	const selected = normalizeSqlFilterValues(values).flatMap((value) =>
		value === 'no_concluyente' ? ['no_concluyente', 'sin_confianza'] : [value]
	);
	if (selected.length === 0) return;
	conditions.push(
		`EXISTS (
			SELECT 1
			FROM work_author_index wai
			WHERE wai.work_id = w.id
				AND wai.attribution_type = 'estilometria'
				AND wai.confianza IN (${createPlaceholders(selected)})
		)`
	);
	args.push(...selected);
};

const yearMonthSql = "CAST(REPLACE(SUBSTR(w.adicion, 1, 7), '/', '') AS INTEGER)";
const validYearMonthSql = "w.adicion GLOB '[0-9][0-9][0-9][0-9][/-][0-9]*'";

const addDateRangeFilter = (conditions: string[], args: SqlArg[], filters: ExamenWorksFilters): void => {
	const fromYearMonth = parseYearMonth(filters.desde);
	const toYearMonth = parseYearMonth(filters.hasta);
	if (fromYearMonth) {
		conditions.push(`(w.adicion IS NULL OR NOT ${validYearMonthSql} OR ${yearMonthSql} >= ?)`);
		args.push(fromYearMonth);
	}
	if (toYearMonth) {
		conditions.push(`(w.adicion IS NULL OR NOT ${validYearMonthSql} OR ${yearMonthSql} <= ?)`);
		args.push(toYearMonth);
	}
};

const buildExamenWhereClause = async (filters: ExamenWorksFilters): Promise<SqlWhereClause> => {
	const conditions = ['w.examen_autorias = 1'];
	const args: SqlArg[] = [];
	const normalizedTitle = filters.titulo.trim();

	if (normalizedTitle) {
		const titleFilterExpressions = await getTitleSearchFilterExpressions();
		const likeValue = `%${normalizedTitle}%`;
		conditions.push(
			`(${titleFilterExpressions
				.map((expression) => `COALESCE(${expression}, '') LIKE ? COLLATE NOCASE`)
				.join(' OR ')})`
		);
		args.push(...titleFilterExpressions.map(() => likeValue));
	}

	addInFilter(conditions, args, "COALESCE(NULLIF(TRIM(w.genero), ''), 'Sin genero')", filters.genero);
	const mainAuthorDisabled = filters.autor_trad.length > 0 || filters.autor_esto.length > 0;
	if (!mainAuthorDisabled) addAuthorFilter(conditions, args, filters.autor, null, 'or');
	addAuthorFilter(conditions, args, filters.autor_trad, 'tradicional', filters.autor_trad_match);
	addAuthorFilter(conditions, args, filters.autor_esto, 'estilometria', filters.autor_esto_match);
	addConfidenceFilter(conditions, args, filters.confianza);
	addAuthorshipTypeFilter(conditions, filters.tipo_autoria);
	addInFilter(conditions, args, "COALESCE(NULLIF(TRIM(w.estado_texto), ''), 'Sin estado')", filters.estado);
	addDateRangeFilter(conditions, args, filters);

	return {
		sql: conditions.join('\n AND '),
		args
	};
};

export const getExamenWorksPage = async (
	filters: ExamenWorksFilters,
	page: number,
	pageSize: number
): Promise<ExamenWorksPage> => {
	const safePageSize = Number.isFinite(pageSize) && pageSize > 0 ? Math.floor(pageSize) : 20;
	const requestedPage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
	const where = await buildExamenWhereClause(filters);
	const totalRows = await getRows<{ total: number }>(
		`SELECT COUNT(*) AS total
		 FROM works w
		 WHERE ${where.sql}`,
		where.args
	);
	const totalResults = Number(totalRows[0]?.total ?? 0);
	const totalPages = Math.max(1, Math.ceil(totalResults / safePageSize));
	const safePage = Math.min(requestedPage, totalPages);
	const offset = (safePage - 1) * safePageSize;
	const idRows =
		totalResults === 0
			? []
			: await getRows<{ id: string }>(
					`SELECT w.id
					 FROM works w
					 WHERE ${where.sql}
					 ORDER BY w.titulo COLLATE NOCASE, w.id
					 LIMIT ? OFFSET ?`,
					[...where.args, safePageSize, offset]
				);
	const ids = idRows.map((row) => row.id);

	return {
		works: await hydrateWorksByIds(ids),
		totalResults,
		totalPages,
		page: safePage
	};
};

export const getExamenFilterOptions = async (): Promise<ExamenFilterOptions> => {
	const authorVariantsSelect = await getAuthorVariantsSelect();
	const [authorRows, genreRows, stateRows] = await Promise.all([
		getRows<AuthorRow>(
			`SELECT DISTINCT a.id, a.nombre, ${authorVariantsSelect}
			 FROM authors a
			 JOIN work_author_index wai ON wai.author_id = a.id
			 JOIN works w ON w.id = wai.work_id
			 WHERE w.examen_autorias = 1
				AND a.id <> ?
			 ORDER BY a.nombre COLLATE NOCASE`,
			[UNRESOLVED_AUTHOR_ID]
		),
		getRows<{ value: string }>(
			`SELECT DISTINCT COALESCE(NULLIF(TRIM(genero), ''), 'Sin genero') AS value
			 FROM works
			 WHERE examen_autorias = 1
			 ORDER BY value COLLATE NOCASE`
		),
		getRows<{ value: string }>(
			`SELECT DISTINCT COALESCE(NULLIF(TRIM(estado_texto), ''), 'Sin estado') AS value
			 FROM works
			 WHERE examen_autorias = 1
			 ORDER BY value COLLATE NOCASE`
		)
	]);

	return {
		authors: toCatalogAuthors(authorRows),
		genres: genreRows.map((row) => row.value).filter(Boolean),
		states: stateRows.map((row) => row.value).filter(Boolean)
	};
};

export const getSelectedExamenFilterOptions = async (
	filters: ExamenWorksFilters
): Promise<ExamenFilterOptions> => {
	const selectedAuthorIds = new Set([...filters.autor, ...filters.autor_trad, ...filters.autor_esto]);
	const authorById = await loadAuthorsByIds(selectedAuthorIds);
	return {
		authors: Array.from(authorById.values()).sort((a, b) =>
			a.name.localeCompare(b.name, 'es', { sensitivity: 'base' })
		),
		genres: normalizeSqlFilterValues(filters.genero),
		states: normalizeSqlFilterValues(filters.estado)
	};
};

export const getExamenCatalogStats = async (): Promise<CatalogStats> => {
	const [worksRows, authorRows, informeRows, bitesoRows] = await Promise.all([
		getRows<{ total: number }>('SELECT COUNT(*) AS total FROM works WHERE examen_autorias = 1'),
		getRows<{ total: number }>(
			`SELECT COUNT(DISTINCT wai.author_id) AS total
			 FROM work_author_index wai
			 JOIN works w ON w.id = wai.work_id
			 WHERE w.examen_autorias = 1
				AND wai.author_id <> ?`,
			[UNRESOLVED_AUTHOR_ID]
		),
		getRows<{ total: number }>(
			`SELECT COUNT(*) AS total
			 FROM works
			 WHERE resultado1 IS NOT NULL OR resultado2 IS NOT NULL`
		),
		getRows<{ total: number }>('SELECT COUNT(*) AS total FROM works WHERE biteso = 1')
	]);

	return {
		works: Number(worksRows[0]?.total ?? 0),
		authors: Number(authorRows[0]?.total ?? 0),
		informes: Number(informeRows[0]?.total ?? 0),
		bitesoTexts: Number(bitesoRows[0]?.total ?? 0)
	};
};

export const getCatalogStats = async (): Promise<CatalogStats> => {
	const snapshot = await getSnapshot();
	const bitesoTexts = snapshot.works.filter(hasBitesoText).length;
	const informes = snapshot.works.filter((work) => Boolean(work.reportId)).length;

	return {
		works: snapshot.works.length,
		authors: snapshot.authors.filter((author) => author.id !== UNRESOLVED_AUTHOR_ID).length,
		informes,
		bitesoTexts
	};
};

export const getAuthorWorks = async (authorId: string): Promise<AuthorWorkRelation[]> => {
	const snapshot = await getSnapshot();
	if (!snapshot.authorById.has(authorId)) return [];

	return getAuthorshipExamWorksFromSnapshot(snapshot)
		.map((work) => {
			const inTraditional = containsAuthor(work.traditionalAttribution, authorId);
			const inStylometry = containsAuthor(work.stylometryAttribution, authorId);
			const stylometryConfidence = confidenceForAuthor(work.stylometryAttribution, authorId);
			return {
				work,
				inTraditional,
				inStylometry,
				stylometryConfidence
			};
		})
		.filter((entry) => entry.inTraditional || entry.inStylometry);
};

export const getAuthorMetrics = async (authorId: string): Promise<AuthorMetrics> => {
	const relations = await getAuthorWorks(authorId);

	let tradAny = 0;
	let etsoYes = 0;
	let onlyTrad = 0;
	let onlyEtso = 0;

	for (const relation of relations) {
		if (relation.inTraditional) tradAny += 1;
		if (relation.inStylometry) etsoYes += 1;
		if (relation.inTraditional && !relation.inStylometry) onlyTrad += 1;
		if (!relation.inTraditional && relation.inStylometry) onlyEtso += 1;
	}

	return {
		relatedAny: relations.length,
		tradAny,
		etsoYes,
		onlyTrad,
		onlyEtso
	};
};

export const getWorkSummaryDetailById = async (
	workId: string
): Promise<WorkSummaryDetail | undefined> => {
	const parsed = await fetchSummaryFile(workId);
	if (!parsed) return undefined;

	const resumenLargo = Array.isArray(parsed.resumen_largo)
		? parsed.resumen_largo.map((paragraph) => paragraph.trim()).filter(Boolean)
		: [];

	return {
		resumenLargo,
		personajes: normalizeSummaryNamedItems(parsed.personajes_principales),
		espacios: normalizeSummaryNamedItems(parsed.espacios_principales),
		tematicas: normalizeSummaryThemeItems(parsed.tematicas_principales)
	};
};

const loadDistancesForWork = async (workId: string): Promise<Record<Ambito, DistanceRow[]>> => {
	const distances = ensureDistanceRecord();
	const rows = await getRows<DistanceRowRaw>(
		`SELECT work_id, ambito, rank, related_work_id, distancia
		 FROM work_distances
		 WHERE work_id = ?
		 ORDER BY ambito, rank`,
		[workId]
	);

	for (const row of rows) {
		const ambito = normalizeDistanceAmbito(row.ambito);
		if (!ambito) continue;
		distances[ambito].push({
			rank: row.rank,
			relatedWorkId: row.related_work_id,
			distancia: row.distancia
		});
	}

	return distances;
};

const getDistancesForWork = (
	snapshot: Snapshot,
	workId: string
): Promise<Record<Ambito, DistanceRow[]>> => {
	let cache = distancesBySnapshot.get(snapshot);
	if (!cache) {
		cache = new Map();
		distancesBySnapshot.set(snapshot, cache);
	}

	const cached = cache.get(workId);
	if (cached) return cached;

	const pending = loadDistancesForWork(workId).catch((cause) => {
		cache?.delete(workId);
		throw cause;
	});
	cache.set(workId, pending);
	return pending;
};

export const getInformeById = async (informeId: string): Promise<CatalogInforme | undefined> => {
	const snapshot = await getSnapshot();
	const work = snapshot.workById.get(informeId);
	if (!work) return undefined;
	if (!work.reportSlug) return undefined;

	const distances = await getDistancesForWork(snapshot, work.id);
	if (!hasAnyDistanceRows(distances)) return undefined;
	const reportResults = await getWorkReportResultsById(work.id);

	const confidenceLabel = work.stylometryAttribution.unresolved
		? 'sin autoria determinada'
		: formatConfidence(
				work.stylometryAttribution.groups
					.flatMap((group) => group.members)
					.find((member) => member.confidence)?.confidence
			) || 'sin confianza explicita';

	return {
		id: work.id,
		workId: work.id,
		slug: work.reportSlug,
		title: `Análisis estilométrico de ${work.title}`,
		intro:
			reportResults.result1 ||
			'Informe generado desde Turso para validar visualización y flujo de consulta.',
		methodology:
			'Se muestran las distancias cargadas en work_distances desde Turso. En la versión final, esta sección podrá enriquecerse con servicios de cálculo oficiales del proyecto.',
		conclusion:
			reportResults.result2 ||
			`Lectura preliminar para ${work.title} con perfil ${inferWorkAuthorshipType(work)} y nivel ${confidenceLabel}.`,
		citation: `ETSO. Análisis estilométrico de ${work.title}. Dataset alojado en Turso.`,
		distances
	};
};

export const getInformeByWorkId = async (workId: string): Promise<CatalogInforme | undefined> =>
	getInformeById(workId);

export const getInformeByWorkSlug = async (workSlug: string): Promise<CatalogInforme | undefined> => {
	const work = await getWorkBySlug(workSlug);
	if (!work) return undefined;
	return getInformeById(work.id);
};

export const getInformeByReportSlug = async (reportSlug: string): Promise<CatalogInforme | undefined> => {
	const work = await getWorkByReportSlug(reportSlug);
	if (!work) return undefined;
	return getInformeById(work.id);
};

export const getInformeDistanceRows = async (
	informe: CatalogInforme,
	ambito: Ambito
): Promise<InformeDistanceView[]> => {
	const snapshot = await getSnapshot();
	const rows = informe.distances[ambito] ?? [];
	return rows
		.map((row) => {
			const relatedWork = snapshot.workById.get(row.relatedWorkId);
			if (!relatedWork) return undefined;
			return {
				...row,
				relatedWork
			};
		})
		.filter((row): row is InformeDistanceView => Boolean(row));
};

const collectAttributionNames = (set: AttributionSet): string[] => {
	if (set.unresolved) return [];
	const names: string[] = [];
	const seen = new Set<string>();
	for (const group of set.groups) {
		for (const member of group.members) {
			const name = member.authorName.trim();
			if (!name || seen.has(name)) continue;
			seen.add(name);
			names.push(name);
		}
	}
	return names;
};

const hashNumber = (value: string): number => {
	let hash = 2166136261;
	for (let index = 0; index < value.length; index += 1) {
		hash ^= value.charCodeAt(index);
		hash = Math.imul(hash, 16777619);
	}
	return hash >>> 0;
};

let cachedWorkNetworkGraph: Promise<WorkNetworkGraph> | null = null;

const WORK_NETWORK_COMMUNITY_RESOLUTION = 4.2;
const WORK_NETWORK_SUBCOMMUNITY_RESOLUTION = 1.75;
const WORK_NETWORK_MAX_COMMUNITY_SIZE = 42;

export const getWorkNetworkGraph = (nearestPerWork = 3): Promise<WorkNetworkGraph> => {
	if (nearestPerWork === 3 && cachedWorkNetworkGraph) return cachedWorkNetworkGraph;
	const pending = buildWorkNetworkGraph(nearestPerWork).catch((cause) => {
		if (nearestPerWork === 3) cachedWorkNetworkGraph = null;
		throw cause;
	});
	if (nearestPerWork === 3) cachedWorkNetworkGraph = pending;
	return pending;
};

const buildWorkNetworkGraph = async (nearestPerWork = 3): Promise<WorkNetworkGraph> => {
	const snapshot = await getSnapshot();
	const works = getAuthorshipExamWorksFromSnapshot(snapshot).filter((work) => work.reportSlug);
	const workIds = new Set(works.map((work) => work.id));
	const limit = Math.max(1, Math.min(12, Math.floor(nearestPerWork)));
	const layoutLimit = Math.max(8, Math.min(12, limit * 3));

	const rows = await getRows<DistanceRowRaw>(
		`SELECT work_id, ambito, rank, related_work_id, distancia
		 FROM work_distances
		 WHERE rank <= ?
		 AND REPLACE(REPLACE(LOWER(ambito), '_', ''), ' ', '') IN ('obracompleta', 'global')
		 ORDER BY work_id, rank`,
		[layoutLimit]
	);

	const visibleLinkByPair = new Map<string, WorkNetworkGraph['links'][number]>();
	const layoutLinkByPair = new Map<string, WorkNetworkGraph['links'][number]>();
	for (const row of rows) {
		if (normalizeDistanceAmbito(row.ambito) !== 'obracompleta') continue;
		if (!workIds.has(row.work_id) || !workIds.has(row.related_work_id)) continue;
		if (row.work_id === row.related_work_id) continue;
		const [source, target] = [row.work_id, row.related_work_id].sort((a, b) => a.localeCompare(b));
		const key = `${source}::${target}`;
		const candidate = {
			source,
			target,
			distance: row.distancia,
			rank: row.rank
		};
		const currentLayout = layoutLinkByPair.get(key);
		if (!currentLayout || currentLayout.distance > row.distancia) {
			layoutLinkByPair.set(key, candidate);
		}
		if (row.rank > limit) continue;
		const currentVisible = visibleLinkByPair.get(key);
		if (!currentVisible || currentVisible.distance > row.distancia) {
			visibleLinkByPair.set(key, candidate);
		}
	}

	const links = Array.from(visibleLinkByPair.values()).sort((a, b) => {
		const sourceComparison = a.source.localeCompare(b.source);
		if (sourceComparison !== 0) return sourceComparison;
		return a.target.localeCompare(b.target);
	});
	const layoutLinks = Array.from(layoutLinkByPair.values()).sort((a, b) => {
		if (a.distance !== b.distance) return a.distance - b.distance;
		const sourceComparison = a.source.localeCompare(b.source);
		if (sourceComparison !== 0) return sourceComparison;
		return a.target.localeCompare(b.target);
	});
	const distanceWeight = (distance: number): number =>
		Math.max(0.02, Math.min(18, 1 / Math.pow(Math.max(0.08, distance), 2.15)));

	const layoutGraph = new Graph({ type: 'undirected', multi: false, allowSelfLoops: false });
	const nodes = works
		.map((work, index) => {
			const traditionalAuthors = collectAttributionNames(work.traditionalAttribution);
			const stylometryAuthors = collectAttributionNames(work.stylometryAttribution);
			const hash = hashNumber(work.id);
			const theta = ((hash % 8192) / 8192) * Math.PI * 2;
			const phi = Math.acos(2 * (((hash >>> 13) % 8192) / 8192) - 1);
			const radius = 36 + (index % 31) * 0.35;
			return {
				id: work.id,
				slug: work.slug,
				title: work.title,
				genre: work.genre,
				authors: traditionalAuthors,
				traditionalAuthors,
				stylometryAuthors,
				searchText: [
					work.title,
					...work.titleVariants,
					work.genre,
					...traditionalAuthors,
					...stylometryAuthors
				].join(' '),
				x: Math.sin(phi) * Math.cos(theta) * radius,
				y: Math.cos(phi) * radius,
				z: Math.sin(phi) * Math.sin(theta) * radius,
				community: 0,
				reportSlug: work.reportSlug
			};
		})
		.sort((a, b) => a.title.localeCompare(b.title, 'es', { sensitivity: 'base' }));

	for (const node of nodes) {
		layoutGraph.addNode(node.id, {
			x: node.x,
			y: node.y,
			size: 1
		});
	}
	for (const link of layoutLinks) {
		if (!layoutGraph.hasNode(link.source) || !layoutGraph.hasNode(link.target)) continue;
		layoutGraph.mergeEdge(link.source, link.target, { weight: distanceWeight(link.distance) });
	}

	if (layoutGraph.order > 2 && layoutGraph.size > 0) {
		forceAtlas2.assign(layoutGraph, {
			iterations: Math.min(900, 260 + Math.floor(nodes.length / 4)),
			getEdgeWeight: 'weight',
			settings: {
				linLogMode: true,
				outboundAttractionDistribution: true,
				adjustSizes: false,
				edgeWeightInfluence: 1.9,
				scalingRatio: 18,
				strongGravityMode: false,
				gravity: 0.03,
				slowDown: 12,
				barnesHutOptimize: nodes.length > 120,
				barnesHutTheta: 0.5
			}
		});
	}

	const rawCommunities = louvain(layoutGraph, {
		getEdgeWeight: 'weight',
		resolution: WORK_NETWORK_COMMUNITY_RESOLUTION,
		fastLocalMoves: true,
		randomWalk: false
	});

	const rawCommunityMembers = new Map<number, typeof nodes>();
	for (const node of nodes) {
		const community = rawCommunities[node.id] ?? 0;
		const members = rawCommunityMembers.get(community);
		if (members) members.push(node);
		else rawCommunityMembers.set(community, [node]);
	}

	const splitByLayoutProximity = (members: typeof nodes): Array<typeof nodes> => {
		if (members.length <= WORK_NETWORK_MAX_COMMUNITY_SIZE) return [members];
		let centroidX = 0;
		let centroidY = 0;
		const positions = new Map<string, { x: number; y: number }>();
		for (const node of members) {
			const attributes = layoutGraph.getNodeAttributes(node.id) as { x?: number; y?: number };
			const x = Number.isFinite(attributes.x) ? Number(attributes.x) : 0;
			const y = Number.isFinite(attributes.y) ? Number(attributes.y) : 0;
			positions.set(node.id, { x, y });
			centroidX += x;
			centroidY += y;
		}
		centroidX /= Math.max(1, members.length);
		centroidY /= Math.max(1, members.length);
		const groupCount = Math.ceil(members.length / WORK_NETWORK_MAX_COMMUNITY_SIZE);
		const sorted = [...members].sort((a, b) => {
			const positionA = positions.get(a.id) ?? { x: 0, y: 0 };
			const positionB = positions.get(b.id) ?? { x: 0, y: 0 };
			const angleA = Math.atan2(positionA.y - centroidY, positionA.x - centroidX);
			const angleB = Math.atan2(positionB.y - centroidY, positionB.x - centroidX);
			return angleA - angleB || a.title.localeCompare(b.title, 'es', { sensitivity: 'base' });
		});
		const chunkSize = Math.ceil(members.length / groupCount);
		const chunks: Array<typeof nodes> = [];
		for (let index = 0; index < sorted.length; index += chunkSize) {
			chunks.push(sorted.slice(index, index + chunkSize));
		}
		return chunks;
	};

	const splitLargeCommunity = (members: typeof nodes): Array<typeof nodes> => {
		if (members.length <= WORK_NETWORK_MAX_COMMUNITY_SIZE) return [members];
		const memberIds = new Set(members.map((node) => node.id));
		const subGraph = new Graph({ type: 'undirected', multi: false, allowSelfLoops: false });
		for (const node of members) {
			const attributes = layoutGraph.getNodeAttributes(node.id) as { x?: number; y?: number };
			subGraph.addNode(node.id, {
				x: Number.isFinite(attributes.x) ? Number(attributes.x) : 0,
				y: Number.isFinite(attributes.y) ? Number(attributes.y) : 0,
				size: 1
			});
		}
		for (const link of layoutLinks) {
			if (!memberIds.has(link.source) || !memberIds.has(link.target)) continue;
			subGraph.mergeEdge(link.source, link.target, { weight: distanceWeight(link.distance) });
		}
		if (subGraph.size === 0) return splitByLayoutProximity(members);
		const subCommunities = louvain(subGraph, {
			getEdgeWeight: 'weight',
			resolution: WORK_NETWORK_SUBCOMMUNITY_RESOLUTION,
			fastLocalMoves: true,
			randomWalk: false
		});
		const subMembers = new Map<number, typeof nodes>();
		for (const node of members) {
			const community = subCommunities[node.id] ?? 0;
			const group = subMembers.get(community);
			if (group) group.push(node);
			else subMembers.set(community, [node]);
		}
		const refined = Array.from(subMembers.values()).flatMap((group) => splitByLayoutProximity(group));
		return refined.length > 1 ? refined : splitByLayoutProximity(members);
	};

	const communities = Array.from(rawCommunityMembers.values())
		.flatMap((members) => splitLargeCommunity(members))
		.sort((a, b) => b.length - a.length);
	for (const [communityIndex, members] of communities.entries()) {
		for (const node of members) node.community = communityIndex;
	}

	const nodeByNetworkId = new Map(nodes.map((node) => [node.id, node]));
	const communityRadius = new Map<number, number>();
	const communityGraph = new Graph({ type: 'undirected', multi: false, allowSelfLoops: false });
	for (const [communityIndex, members] of communities.entries()) {
		let centroidX = 0;
		let centroidY = 0;
		for (const node of members) {
			const attributes = layoutGraph.getNodeAttributes(node.id) as { x?: number; y?: number };
			centroidX += Number.isFinite(attributes.x) ? Number(attributes.x) : 0;
			centroidY += Number.isFinite(attributes.y) ? Number(attributes.y) : 0;
		}
		centroidX /= Math.max(1, members.length);
		centroidY /= Math.max(1, members.length);
		const fallbackAngle = communityIndex * Math.PI * (3 - Math.sqrt(5));
		const fallbackRadius = 18 + Math.sqrt(communityIndex + 1) * 5.4;
		const radius = Math.max(7, Math.min(34, 4 + Math.sqrt(members.length) * 2.05));
		communityRadius.set(communityIndex, radius);
		communityGraph.addNode(String(communityIndex), {
			x: centroidX || Math.cos(fallbackAngle) * fallbackRadius,
			y: centroidY || Math.sin(fallbackAngle) * fallbackRadius,
			size: Math.max(0.8, Math.sqrt(members.length) * 0.78)
		});
	}

	const communityEdgeWeights = new Map<string, { weight: number; count: number }>();
	for (const link of layoutLinks) {
		const source = nodeByNetworkId.get(link.source);
		const target = nodeByNetworkId.get(link.target);
		if (!source || !target || source.community === target.community) continue;
		const sourceCommunity = Math.min(source.community, target.community);
		const targetCommunity = Math.max(source.community, target.community);
		const key = `${sourceCommunity}::${targetCommunity}`;
		const current = communityEdgeWeights.get(key);
		const weight = distanceWeight(link.distance);
		if (current) {
			current.weight += weight;
			current.count += 1;
		} else {
			communityEdgeWeights.set(key, { weight, count: 1 });
		}
	}

	for (const [key, value] of communityEdgeWeights.entries()) {
		const [source, target] = key.split('::');
		if (!source || !target) continue;
		communityGraph.mergeEdge(source, target, {
			weight: value.weight * Math.log1p(value.count)
		});
	}

	if (communityGraph.order > 2 && communityGraph.size > 0) {
		forceAtlas2.assign(communityGraph, {
			iterations: Math.min(620, 180 + communities.length * 18),
			getEdgeWeight: 'weight',
			settings: {
				linLogMode: true,
				outboundAttractionDistribution: true,
				adjustSizes: false,
				edgeWeightInfluence: 2.15,
				scalingRatio: 8.5,
				strongGravityMode: false,
				gravity: 0.052,
				slowDown: 9,
				barnesHutOptimize: communityGraph.order > 60,
				barnesHutTheta: 0.5
			}
		});
	}

	let maxCommunityDistance = 0;
	for (const communityIndex of communities.keys()) {
		const attributes = communityGraph.getNodeAttributes(String(communityIndex)) as { x?: number; y?: number };
		maxCommunityDistance = Math.max(
			maxCommunityDistance,
			Math.hypot(
				Number.isFinite(attributes.x) ? Number(attributes.x) : 0,
				Number.isFinite(attributes.y) ? Number(attributes.y) : 0
			)
		);
	}
	const centerScale =
		maxCommunityDistance > 0
			? Math.max(520, Math.min(980, Math.sqrt(nodes.length) * 14)) / maxCommunityDistance
			: 1;
	const communityCenters = new Map<number, { x: number; y: number; z: number }>();
	for (const [communityIndex] of communities.entries()) {
		const attributes = communityGraph.getNodeAttributes(String(communityIndex)) as { x?: number; y?: number };
		const depthHash = hashNumber(`community:${communityIndex}`);
		communityCenters.set(communityIndex, {
			x: (Number.isFinite(attributes.x) ? Number(attributes.x) : 0) * centerScale,
			y: (Number.isFinite(attributes.y) ? Number(attributes.y) : 0) * centerScale,
			z: (((depthHash % 2000) / 2000) - 0.5) * 220
		});
	}

	const communityAttractions = Array.from(communityEdgeWeights.entries())
		.map(([key, value]) => {
			const [source, target] = key.split('::').map((entry) => Number(entry));
			return {
				source,
				target,
				strength: Math.log1p(value.weight) * Math.log1p(value.count)
			};
		})
		.filter((entry) => Number.isFinite(entry.source) && Number.isFinite(entry.target) && entry.strength > 0);
	const maxCommunityAttraction = Math.max(1, ...communityAttractions.map((entry) => entry.strength));

	for (let iteration = 0; iteration < 150; iteration += 1) {
		for (const attraction of communityAttractions) {
			const centerA = communityCenters.get(attraction.source);
			const centerB = communityCenters.get(attraction.target);
			if (!centerA || !centerB) continue;
			const radiusA = communityRadius.get(attraction.source) ?? 12;
			const radiusB = communityRadius.get(attraction.target) ?? 12;
			const strength = Math.sqrt(attraction.strength / maxCommunityAttraction);
			const desiredDistance = radiusA + radiusB + 18 + (1 - strength) * 128;
			const dx = centerB.x - centerA.x;
			const dy = centerB.y - centerA.y;
			const distance = Math.hypot(dx, dy) || 0.0001;
			const move = ((distance - desiredDistance) / distance) * (0.012 + strength * 0.026);
			centerA.x += dx * move;
			centerA.y += dy * move;
			centerB.x -= dx * move;
			centerB.y -= dy * move;
		}
		for (let a = 0; a < communities.length; a += 1) {
			const centerA = communityCenters.get(a);
			if (!centerA) continue;
			for (let b = a + 1; b < communities.length; b += 1) {
				const centerB = communityCenters.get(b);
				if (!centerB) continue;
				const minDistance = (communityRadius.get(a) ?? 12) + (communityRadius.get(b) ?? 12) + 24;
				const dx = centerB.x - centerA.x;
				const dy = centerB.y - centerA.y;
				const distance = Math.hypot(dx, dy) || 0.0001;
				if (distance >= minDistance) continue;
				const push = ((minDistance - distance) / distance) * 0.5;
				centerA.x -= dx * push;
				centerA.y -= dy * push;
				centerB.x += dx * push;
				centerB.y += dy * push;
			}
		}
	}

	for (const [communityIndex, members] of communities.entries()) {
		const center = communityCenters.get(communityIndex) ?? { x: 0, y: 0, z: 0 };
		const localGraph = new Graph({ type: 'undirected', multi: false, allowSelfLoops: false });
		const internalDistanceSum = new Map<string, number>();
		const internalDistanceCount = new Map<string, number>();
		let centroidX = 0;
		let centroidY = 0;
		for (const node of members) {
			const attributes = layoutGraph.getNodeAttributes(node.id) as { x?: number; y?: number };
			centroidX += Number.isFinite(attributes.x) ? Number(attributes.x) : 0;
			centroidY += Number.isFinite(attributes.y) ? Number(attributes.y) : 0;
		}
		centroidX /= Math.max(1, members.length);
		centroidY /= Math.max(1, members.length);

		for (const [memberIndex, node] of members.entries()) {
			const attributes = layoutGraph.getNodeAttributes(node.id) as { x?: number; y?: number };
			const globalX = Number.isFinite(attributes.x) ? Number(attributes.x) : 0;
			const globalY = Number.isFinite(attributes.y) ? Number(attributes.y) : 0;
			const hash = hashNumber(`${node.id}:local`);
			const angle = ((hash % 8192) / 8192) * Math.PI * 2;
			const radius = 2 + Math.sqrt(memberIndex + 1) * 0.7;
			localGraph.addNode(node.id, {
				x: (globalX - centroidX) * 1.8 + Math.cos(angle) * radius,
				y: (globalY - centroidY) * 1.8 + Math.sin(angle) * radius,
				size: 1
			});
		}

		for (const link of layoutLinks) {
			const source = nodeByNetworkId.get(link.source);
			const target = nodeByNetworkId.get(link.target);
			if (!source || !target || source.community !== communityIndex || target.community !== communityIndex) continue;
			localGraph.mergeEdge(link.source, link.target, { weight: distanceWeight(link.distance) });
			internalDistanceSum.set(link.source, (internalDistanceSum.get(link.source) ?? 0) + link.distance);
			internalDistanceSum.set(link.target, (internalDistanceSum.get(link.target) ?? 0) + link.distance);
			internalDistanceCount.set(link.source, (internalDistanceCount.get(link.source) ?? 0) + 1);
			internalDistanceCount.set(link.target, (internalDistanceCount.get(link.target) ?? 0) + 1);
		}

		if (members.length > 2 && localGraph.size > 0) {
			forceAtlas2.assign(localGraph, {
				iterations: Math.min(420, 110 + members.length),
				getEdgeWeight: 'weight',
				settings: {
					linLogMode: true,
					outboundAttractionDistribution: true,
					adjustSizes: false,
					edgeWeightInfluence: 1.45,
					scalingRatio: 4.8,
					strongGravityMode: false,
					gravity: 0.12,
					slowDown: 8,
					barnesHutOptimize: members.length > 80,
					barnesHutTheta: 0.5
				}
			});
		}

		const averageInternalDistance = new Map<string, number>();
		const internalAverages: number[] = [];
		for (const node of members) {
			const count = internalDistanceCount.get(node.id) ?? 0;
			if (count === 0) continue;
			const average = (internalDistanceSum.get(node.id) ?? 0) / count;
			averageInternalDistance.set(node.id, average);
			internalAverages.push(average);
		}
		const communityMeanDistance =
			internalAverages.reduce((total, value) => total + value, 0) / Math.max(1, internalAverages.length);
		const communityDistanceDeviation = Math.sqrt(
			internalAverages.reduce((total, value) => total + Math.pow(value - communityMeanDistance, 2), 0) /
				Math.max(1, internalAverages.length)
		);

		let localMaxRadius = 0;
		for (const node of members) {
			const attributes = localGraph.getNodeAttributes(node.id) as { x?: number; y?: number };
			const x = Number.isFinite(attributes.x) ? Number(attributes.x) : 0;
			const y = Number.isFinite(attributes.y) ? Number(attributes.y) : 0;
			localMaxRadius = Math.max(localMaxRadius, Math.hypot(x, y));
		}
		const targetRadius = communityRadius.get(communityIndex) ?? 24;
		const localScale = localMaxRadius > 0 ? targetRadius / localMaxRadius : 1;
		for (const node of members) {
			const attributes = localGraph.getNodeAttributes(node.id) as { x?: number; y?: number };
			const x = Number.isFinite(attributes.x) ? Number(attributes.x) : 0;
			const y = Number.isFinite(attributes.y) ? Number(attributes.y) : 0;
			const depthHash = hashNumber(`${node.id}:${node.community}`);
			const localRadius = Math.hypot(x, y);
			const fallbackAngle = ((depthHash % 8192) / 8192) * Math.PI * 2;
			const unitX = localRadius > 0.0001 ? x / localRadius : Math.cos(fallbackAngle);
			const unitY = localRadius > 0.0001 ? y / localRadius : Math.sin(fallbackAngle);
			const averageDistance = averageInternalDistance.get(node.id) ?? communityMeanDistance;
			const outlierScore =
				communityDistanceDeviation > 0.015
					? Math.max(0, Math.min(2.6, (averageDistance - communityMeanDistance) / communityDistanceDeviation - 0.45))
					: 0;
			const radialPush = outlierScore * targetRadius * 0.48;
			node.x = center.x + x * localScale + unitX * radialPush;
			node.y = center.y + y * localScale + unitY * radialPush;
			node.z =
				center.z +
				((((depthHash % 2000) / 2000) - 0.5) *
					(Math.min(34, targetRadius * 0.65) + outlierScore * 18));
		}
	}

	return { nodes, links };
};

const getBitesoForWork = async (
	work: CatalogWork | undefined,
	snapshot: Snapshot
): Promise<CatalogBiteso | undefined> => {
	if (!work) return undefined;
	if (!work.textLinks.some((link) => link.kind === 'biteso')) return undefined;

	const text = await readPrivateTextByWorkId(work.id);
	if (!text) return undefined;

	return {
		id: snapshot.bitesoSlugByWorkId.get(work.id) || work.slug,
		workId: work.id,
		bitesoNombre: snapshot.bitesoNameByWorkId.get(work.id) || 'ETSO',
		title: `Texto digital de ${work.title}`,
		text
	};
};

export const getBitesoBySlug = async (bitesoSlug: string): Promise<CatalogBiteso | undefined> => {
	const snapshot = await getSnapshot();
	return getBitesoForWork(snapshot.bitesoWorkBySlug.get(bitesoSlug), snapshot);
};

export const getBitesoWorkBySlug = async (bitesoSlug: string): Promise<CatalogWork | undefined> =>
	(await getSnapshot()).bitesoWorkBySlug.get(bitesoSlug);

export const getBitesoById = async (bitesoId: string): Promise<CatalogBiteso | undefined> => {
	const snapshot = await getSnapshot();
	return getBitesoForWork(snapshot.workById.get(bitesoId), snapshot);
};

const emptyInformeBibliography = (): InformeBibliographyView => ({
	sections: [],
	copyButton: null
});

const emptyComoCitarnosBibliography = (): ComoCitarnosBibliographyView => ({
	intro: '',
	sections: []
});

const emptyImpactView = (): ImpactPageView => ({
	intro: '',
	sections: []
});

const emptyCollaboratorsPageView = (): CollaboratorsPageView => ({
	intro: '',
	sections: []
});

const BIBLIO_URL_PATTERN = /https?:\/\/[^\s<>()]+/gi;

const EDITORIAL_PRESENTATIONS = new Set<EditorialSectionPresentation>([
	'timeline',
	'compact_list',
	'featured_cards',
	'media_cards',
	'multi_column_list',
	'callout'
]);

const EDITORIAL_STATUSES = new Set<EditorialEntryStatus>(['active', 'in_progress']);

const EDITORIAL_TYPES = new Set<EditorialEntryType>([
	'article',
	'book',
	'thesis',
	'edition',
	'news',
	'conference',
	'seminar',
	'exhibition',
	'award',
	'project',
	'other',
	'person',
	'organization',
	'student',
	'resource',
	'acknowledgment'
]);

const IMPACT_TAGS = new Set<ImpactRelationTag>([
	'colaboracion',
	'mencion',
	'cita',
	'difusion',
	'resultado',
	'reconocimiento'
]);

const trimTrailingPunctuation = (url: string): { href: string; trailing: string } => {
	let href = url;
	let trailing = '';
	while (/[.,;:!?)]$/.test(href)) {
		trailing = `${href.slice(-1)}${trailing}`;
		href = href.slice(0, -1);
	}
	return { href, trailing };
};

const tokenizePlainBibliographyText = (text: string): InformeBibliographyEntryPart[] => {
	const parts: InformeBibliographyEntryPart[] = [];
	let lastIndex = 0;

	for (const match of text.matchAll(BIBLIO_URL_PATTERN)) {
		const start = match.index ?? -1;
		if (start < 0) continue;

		if (start > lastIndex) {
			parts.push({
				kind: 'text',
				value: text.slice(lastIndex, start)
			});
		}

		const token = match[0];
		const { href, trailing } = trimTrailingPunctuation(token);
		if (href) {
			parts.push({
				kind: 'link',
				value: href,
				href
			});
		}
		if (trailing) {
			parts.push({
				kind: 'text',
				value: trailing
			});
		}

		lastIndex = start + token.length;
	}

	if (lastIndex < text.length) {
		parts.push({
			kind: 'text',
			value: text.slice(lastIndex)
		});
	}

	return parts.length > 0 ? parts : [{ kind: 'text', value: text }];
};

const normalizeBibliographyPart = (raw: InformeBibliographyEntryPartRaw): InformeBibliographyEntryPart | null => {
	const value = typeof raw.value === 'string' ? raw.value : '';
	if (!value) return null;
	const kindRaw = typeof raw.type === 'string' ? raw.type.toLowerCase().trim() : 'text';
	if (kindRaw === 'italic') {
		return {
			kind: 'italic',
			value
		};
	}
	if (kindRaw === 'link') {
		const href = typeof raw.href === 'string' && raw.href.trim() ? raw.href.trim() : value;
		if (!href) return null;
		return {
			kind: 'link',
			value,
			href
		};
	}
	return {
		kind: 'text',
		value
	};
};

const asFieldString = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

const asFieldStringList = (value: unknown): string[] =>
	Array.isArray(value)
		? value
				.map((item) => (typeof item === 'string' ? item.trim() : ''))
				.filter((item) => item.length > 0)
		: [];

const asPublicImagePath = (value: unknown): string | undefined => {
	if (typeof value !== 'string') return undefined;
	const normalized = value.trim();
	if (!normalized || !normalized.startsWith('/')) return undefined;
	return normalized;
};

const normalizeImpactText = (value: unknown): string => {
	const text = asFieldString(value);
	if (!text) return '';
	return text
		.replace(/\s+/g, ' ')
		.replace(/\s+([.,;:!?])/g, '$1')
		.replace(/«\s+/g, '«')
		.replace(/\s+»/g, '»')
		.trim();
};

const appendTextPart = (parts: InformeBibliographyEntryPart[], value: string): void => {
	if (!value) return;
	parts.push({
		kind: 'text',
		value
	});
};

const appendLinkPart = (parts: InformeBibliographyEntryPart[], value: string): void => {
	if (!value) return;
	parts.push({
		kind: 'link',
		value,
		href: value
	});
};

const ensureSentenceSuffix = (value: string): string => {
	if (!value) return value;
	return /[.!?]$/.test(value) ? value : `${value}.`;
};

const normalizeDoiUrl = (doiOrUrl: string): string => {
	if (!doiOrUrl) return '';
	if (/^https?:\/\//i.test(doiOrUrl)) return doiOrUrl;
	return `https://doi.org/${doiOrUrl.replace(/^doi:\s*/i, '')}`;
};

const hasBibLikeFields = (raw: InformeBibliographyEntryRaw): boolean => {
	return Boolean(
		asFieldString(raw.author) ||
			asFieldString(raw.authors) ||
			asFieldString(raw.title) ||
			asFieldString(raw.year) ||
			asFieldString(raw.journal) ||
			asFieldString(raw.booktitle) ||
			asFieldString(raw.containerTitle) ||
			asFieldString(raw.publisher) ||
			asFieldString(raw.volume) ||
			asFieldString(raw.number) ||
			asFieldString(raw.issue) ||
			asFieldString(raw.pages) ||
			asFieldString(raw.details) ||
			asFieldString(raw.note) ||
			asFieldString(raw.doi) ||
			asFieldString(raw.url) ||
			asFieldString(raw.entryType) ||
			asFieldString(raw.type)
	);
};

const buildPartsFromBibLikeEntry = (raw: InformeBibliographyEntryRaw): InformeBibliographyEntryPart[] => {
	const type = (asFieldString(raw.type) || asFieldString(raw.entryType)).toLowerCase();
	const author = asFieldString(raw.author) || asFieldString(raw.authors);
	const year = asFieldString(raw.year);
	const title = asFieldString(raw.title);
	const container =
		asFieldString(raw.journal) || asFieldString(raw.booktitle) || asFieldString(raw.containerTitle);
	const publisher = asFieldString(raw.publisher);
	const details = asFieldString(raw.details);
	const note = asFieldString(raw.note);
	const volume = asFieldString(raw.volume);
	const number = asFieldString(raw.number) || asFieldString(raw.issue);
	const pages = asFieldString(raw.pages);
	const doi = normalizeDoiUrl(asFieldString(raw.doi));
	const url = asFieldString(raw.url);
	const italicTitleTypes = new Set(['book', 'webpage', 'website', 'report', 'dataset']);

	const parts: InformeBibliographyEntryPart[] = [];

	if (author) appendTextPart(parts, `${ensureSentenceSuffix(author)} `);
	if (year) appendTextPart(parts, `(${year}). `);

	if (title) {
		if (italicTitleTypes.has(type)) {
			parts.push({
				kind: 'italic',
				value: title
			});
		} else {
			appendTextPart(parts, title);
		}
		appendTextPart(parts, '. ');
	}

	if (container) {
		parts.push({
			kind: 'italic',
			value: container
		});
		appendTextPart(parts, '. ');
	}

	if (details) appendTextPart(parts, `${ensureSentenceSuffix(details)} `);
	if (!details) {
		const detailChunks: string[] = [];
		if (volume && number) detailChunks.push(`${volume}(${number})`);
		else if (volume) detailChunks.push(volume);
		else if (number) detailChunks.push(number);
		if (pages) detailChunks.push(`pp. ${pages}`);
		if (detailChunks.length > 0) appendTextPart(parts, `${ensureSentenceSuffix(detailChunks.join(', '))} `);
	}

	if (publisher) appendTextPart(parts, `${ensureSentenceSuffix(publisher)} `);
	if (note) appendTextPart(parts, `${ensureSentenceSuffix(note)} `);

	if (doi) {
		appendLinkPart(parts, doi);
		appendTextPart(parts, '.');
	}

	if (url && (!doi || normalizeDoiUrl(url) !== doi)) {
		if (parts.length > 0 && !/\s$/.test(parts[parts.length - 1].value)) {
			appendTextPart(parts, ' ');
		}
		appendLinkPart(parts, url);
		appendTextPart(parts, '.');
	}

	return parts;
};

const normalizeBibliographyEntry = (
	raw: InformeBibliographyEntryRaw,
	index: number
): InformeBibliographyEntry | null => {
	const text = typeof raw.text === 'string' ? raw.text.trim() : '';
	const partsRaw = Array.isArray(raw.parts) ? (raw.parts as InformeBibliographyEntryPartRaw[]) : [];
	let parts = partsRaw
		.map((part) => normalizeBibliographyPart(part))
		.filter((part): part is InformeBibliographyEntryPart => Boolean(part));
	if (parts.length === 0 && hasBibLikeFields(raw)) {
		parts = buildPartsFromBibLikeEntry(raw);
	}
	if (parts.length === 0 && text) {
		parts = tokenizePlainBibliographyText(text);
	}
	if (parts.length === 0) return null;

	const plainText = text || parts.map((part) => part.value).join('');
	if (!plainText) return null;
	const id = typeof raw.id === 'string' && raw.id.trim() ? raw.id.trim() : `entry-${index + 1}`;
	return {
		id,
		text: plainText,
		parts
	};
};

const normalizeBibliographySectionConfig = (
	raw: BibliographySectionConfigRaw,
	index: number
): BibliographySectionConfigNormalized | null => {
	const entryKeysRaw = Array.isArray(raw.entryKeys) ? raw.entryKeys : [];
	const entryKeys = entryKeysRaw
		.map((entryKey) => (typeof entryKey === 'string' ? entryKey.trim() : ''))
		.filter((entryKey) => entryKey.length > 0);
	if (entryKeys.length === 0) return null;

	const id = typeof raw.id === 'string' && raw.id.trim() ? raw.id.trim() : `section-${index + 1}`;
	const title = typeof raw.title === 'string' && raw.title.trim() ? raw.title.trim() : id;
	const lead = typeof raw.lead === 'string' ? raw.lead.trim() : '';
	const collapsible = raw.collapsible === true;
	const collapsibleLabel =
		typeof raw.collapsibleLabel === 'string' && raw.collapsibleLabel.trim()
			? raw.collapsibleLabel.trim()
			: undefined;
	const defaultOpen = raw.defaultOpen === true;

	return {
		id,
		title,
		lead,
		entryKeys,
		collapsible,
		collapsibleLabel,
		defaultOpen
	};
};

const normalizeBibliographyViewConfig = (
	rawConfig: BibliographyViewConfigRaw | undefined
): BibliographyViewConfigNormalized => {
	if (!rawConfig || typeof rawConfig !== 'object') {
		return {
			intro: '',
			sections: [],
			copyButton: null
		};
	}

	const intro = typeof rawConfig.intro === 'string' ? rawConfig.intro.trim() : '';
	const sectionsRaw = Array.isArray(rawConfig.sections)
		? (rawConfig.sections as BibliographySectionConfigRaw[])
		: [];
	const sections = sectionsRaw
		.map((section, index) => normalizeBibliographySectionConfig(section, index))
		.filter((section): section is BibliographySectionConfigNormalized => Boolean(section));

	const copyButtonRaw =
		typeof rawConfig.copyButton === 'object' && rawConfig.copyButton
			? (rawConfig.copyButton as BibliographyCopyButtonConfigRaw)
			: undefined;
	let copyButton: BibliographyViewConfigNormalized['copyButton'] = null;
	if (copyButtonRaw) {
		const label =
			typeof copyButtonRaw.label === 'string' && copyButtonRaw.label.trim()
				? copyButtonRaw.label.trim()
				: '';
		const sectionId =
			typeof copyButtonRaw.sectionId === 'string' && copyButtonRaw.sectionId.trim()
				? copyButtonRaw.sectionId.trim()
				: '';
		const entryKeyRaw =
			typeof copyButtonRaw.entryKey === 'string' && copyButtonRaw.entryKey.trim()
				? copyButtonRaw.entryKey.trim()
				: typeof copyButtonRaw.entryId === 'string' && copyButtonRaw.entryId.trim()
					? copyButtonRaw.entryId.trim()
					: '';
		if (label && sectionId && entryKeyRaw) {
			copyButton = {
				label,
				sectionId,
				entryKey: entryKeyRaw
			};
		}
	}

	return {
		intro,
		sections,
		copyButton
	};
};

const resolveBibliographyEntriesByKey = (
	entryKeys: string[],
	entryRawByKey: Map<string, InformeBibliographyEntryRaw>
): InformeBibliographyEntry[] =>
	entryKeys
		.map((entryKey, index) => {
			const raw = entryRawByKey.get(entryKey);
			if (!raw) return undefined;
			const normalized = normalizeBibliographyEntry({ ...raw, id: entryKey }, index);
			return normalized ?? undefined;
		})
		.filter((entry): entry is InformeBibliographyEntry => Boolean(entry));

const resolveInformeBibliographyView = (
	config: BibliographyViewConfigNormalized,
	entryRawByKey: Map<string, InformeBibliographyEntryRaw>
): InformeBibliographyView => {
	const sections: InformeBibliographySection[] = [];
	for (const section of config.sections) {
		const entries = resolveBibliographyEntriesByKey(section.entryKeys, entryRawByKey);
		if (entries.length === 0) continue;
		sections.push({
			id: section.id,
			lead: section.lead || section.title,
			entries,
			collapsible: section.collapsible || undefined,
			collapsibleLabel: section.collapsibleLabel,
			defaultOpen: section.defaultOpen || undefined
		});
	}

	if (!config.copyButton) {
		return {
			sections,
			copyButton: null
		};
	}

	const section = sections.find((item) => item.id === config.copyButton?.sectionId);
	const entry = section?.entries.find((item) => item.id === config.copyButton?.entryKey);
	const copyButton: InformeBibliographyCopyButton | null =
		section && entry
			? {
					label: config.copyButton.label,
					sectionId: section.id,
					entryId: entry.id
				}
			: null;

	return {
		sections,
		copyButton
	};
};

const resolveComoCitarnosView = (
	config: BibliographyViewConfigNormalized,
	entryRawByKey: Map<string, InformeBibliographyEntryRaw>
): ComoCitarnosBibliographyView => {
	const sections: ComoCitarnosBibliographySection[] = [];
	for (const section of config.sections) {
		const entries = resolveBibliographyEntriesByKey(section.entryKeys, entryRawByKey);
		if (entries.length === 0) continue;
		sections.push({
			id: section.id,
			title: section.title,
			lead: section.lead || undefined,
			entries
		});
	}

	return {
		intro: config.intro,
		sections
	};
};

const buildEntryRawMap = (rawEntriesByKey: unknown): Map<string, InformeBibliographyEntryRaw> => {
	const entryRawByKey = new Map<string, InformeBibliographyEntryRaw>();
	if (!rawEntriesByKey || typeof rawEntriesByKey !== 'object') return entryRawByKey;

	for (const [entryKeyRaw, value] of Object.entries(rawEntriesByKey as Record<string, unknown>)) {
		const entryKey = entryKeyRaw.trim();
		if (!entryKey) continue;
		if (!value || typeof value !== 'object') continue;
		entryRawByKey.set(entryKey, { ...(value as InformeBibliographyEntryRaw), id: entryKey });
	}

	return entryRawByKey;
};

const parseBibliographySource = ():
	| {
			entryRawByKey: Map<string, InformeBibliographyEntryRaw>;
			informesBase: BibliographyViewConfigNormalized;
			informesOverridesById: Map<string, BibliographyViewConfigNormalized>;
			comoCitarnos: BibliographyViewConfigNormalized;
	  }
	| null => {
	try {
		const parsed = bibliographySource as BibliographyFileRaw;
		if (!parsed || typeof parsed !== 'object') return null;

		const entryRawByKey = buildEntryRawMap(parsed.entriesByKey);
		const viewsRaw =
			typeof parsed.views === 'object' && parsed.views ? (parsed.views as BibliographyViewsRaw) : undefined;

		const informesRaw =
			viewsRaw && typeof viewsRaw.informes === 'object' && viewsRaw.informes
				? (viewsRaw.informes as BibliographyInformesViewRaw)
				: undefined;
		const informesBaseRaw =
			informesRaw && typeof informesRaw.base === 'object' && informesRaw.base
				? (informesRaw.base as BibliographyViewConfigRaw)
				: undefined;
		const informesBase = normalizeBibliographyViewConfig(informesBaseRaw);

		const overridesRaw =
			informesRaw &&
			typeof informesRaw.overridesByInformeId === 'object' &&
			informesRaw.overridesByInformeId
				? (informesRaw.overridesByInformeId as Record<string, unknown>)
				: {};
		const informesOverridesById = new Map<string, BibliographyViewConfigNormalized>();
		for (const [informeId, overrideRaw] of Object.entries(overridesRaw)) {
			if (!informeId.trim()) continue;
			if (!overrideRaw || typeof overrideRaw !== 'object') continue;
			informesOverridesById.set(
				informeId.trim(),
				normalizeBibliographyViewConfig(overrideRaw as BibliographyViewConfigRaw)
			);
		}

		const comoCitarnosRaw =
			viewsRaw && typeof viewsRaw.comoCitarnos === 'object' && viewsRaw.comoCitarnos
				? (viewsRaw.comoCitarnos as BibliographyViewConfigRaw)
				: undefined;
		const comoCitarnos = normalizeBibliographyViewConfig(comoCitarnosRaw);

		return {
			entryRawByKey,
			informesBase,
			informesOverridesById,
			comoCitarnos
		};
	} catch {
		return null;
	}
};

const normalizeEditorialPresentation = (value: unknown): EditorialSectionPresentation =>
	typeof value === 'string' && EDITORIAL_PRESENTATIONS.has(value as EditorialSectionPresentation)
		? (value as EditorialSectionPresentation)
		: 'compact_list';

const normalizeEditorialStatus = (value: unknown): EditorialEntryStatus =>
	typeof value === 'string' && EDITORIAL_STATUSES.has(value as EditorialEntryStatus)
		? (value as EditorialEntryStatus)
		: 'active';

const normalizeEditorialType = (value: unknown): EditorialEntryType =>
	typeof value === 'string' && EDITORIAL_TYPES.has(value as EditorialEntryType)
		? (value as EditorialEntryType)
		: 'other';

const normalizeEditorialTags = (value: unknown): ImpactRelationTag[] =>
	Array.isArray(value)
		? value
				.map((item) => (typeof item === 'string' ? item.trim() : ''))
				.filter((item): item is ImpactRelationTag => IMPACT_TAGS.has(item as ImpactRelationTag))
		: [];

const normalizeEditorialLink = (value: unknown): EditorialLink | null => {
	if (!value || typeof value !== 'object') return null;
	const raw = value as EditorialLinkRaw;
	const label = normalizeImpactText(raw.label);
	const href = asFieldString(raw.href);
	const kindRaw = asFieldString(raw.kind);
	const kind = kindRaw === 'related' ? 'related' : 'primary';
	if (!label || !href) return null;
	return {
		label,
		href,
		kind
	};
};

const normalizeEditorialItem = (value: unknown, index: number, sectionId: string): EditorialItem | null => {
	if (!value || typeof value !== 'object') return null;
	const raw = value as EditorialItemRaw;
	const title = normalizeImpactText(raw.title);
	const summary = normalizeImpactText(raw.summary);
	const itemId = asFieldString(raw.id) || `${sectionId}-${index + 1}`;
	const people = asFieldStringList(raw.people);
	const organizations = asFieldStringList(raw.organizations);
	const linksRaw = Array.isArray(raw.links) ? raw.links : [];
	const links = linksRaw
		.map((link) => normalizeEditorialLink(link))
		.filter((link): link is EditorialLink => Boolean(link));
	const yearRaw =
		typeof raw.year === 'number'
			? raw.year
			: typeof raw.year === 'string' && /^\d{4}$/.test(raw.year.trim())
				? Number(raw.year.trim())
				: null;

	if (!title && !summary && people.length === 0 && organizations.length === 0 && links.length === 0) {
		return null;
	}

	return {
		id: itemId,
		title: title || summary || itemId,
		summary,
		type: normalizeEditorialType(raw.type),
		status: normalizeEditorialStatus(raw.status),
		year: Number.isInteger(yearRaw) ? yearRaw : null,
		people,
		organizations,
		tags: normalizeEditorialTags(raw.tags),
		links,
		image: asPublicImagePath(raw.image) ?? null
	};
};

const slugify = (value: string): string =>
	value
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/-+/g, '-')
		.replace(/^-|-$/g, '');

const normalizeEditorialSection = (value: unknown, index: number): EditorialSection | null => {
	if (!value || typeof value !== 'object') return null;
	const raw = value as EditorialSectionRaw;
	const title = normalizeImpactText(raw.title);
	if (!title) return null;

	const sectionId = asFieldString(raw.id) || slugify(title) || `section-${index + 1}`;
	const itemsRaw = Array.isArray(raw.items) ? raw.items : [];
	const items = itemsRaw
		.map((item, itemIndex) => normalizeEditorialItem(item, itemIndex, sectionId))
		.filter((item): item is EditorialItem => Boolean(item));

	return {
		id: sectionId,
		title,
		description: normalizeImpactText(raw.description) || null,
		presentation: normalizeEditorialPresentation(raw.presentation),
		items
	};
};

const parseEditorialPageSource = (source: unknown): { intro: string; sections: EditorialSection[] } | null => {
	try {
		const parsed = source as EditorialPageRaw;
		if (!parsed || typeof parsed !== 'object') return null;

		const sectionsRaw = Array.isArray(parsed.sections) ? parsed.sections : [];
		const sections = sectionsRaw
			.map((section, index) => normalizeEditorialSection(section, index))
			.filter((section): section is EditorialSection => Boolean(section));

		return {
			intro: normalizeImpactText(parsed.intro),
			sections
		};
	} catch {
		return null;
	}
};

const parseImpactSource = (): ImpactPageView | null => parseEditorialPageSource(impactSource);

const parseCollaboratorsSource = (): CollaboratorsPageView | null =>
	parseEditorialPageSource(collaboratorsSource);

const normalizeNameForComparison = (value: string): string =>
	value
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, ' ')
		.trim()
		.replace(/\s+/g, ' ');

const resolveBitesoCitationAuthor = (bitesoNombre: string): string => {
	const raw = bitesoNombre.trim();
	if (!raw) return 'ETSO';

	const normalized = normalizeNameForComparison(raw);
	if (normalized === 'cuellar alvaro y german vega garcia luengos') {
		return 'Cuéllar, Álvaro y Germán Vega García-Luengos';
	}
	if (normalized === 'garcia reidy alejandro') {
		return 'García Reidy, Alejandro';
	}

	return raw;
};

interface BitesoCitationInput {
	bitesoNombre: string;
	title: string;
	canonicalUrl: string;
}

export const buildBitesoCitation = ({
	bitesoNombre,
	title,
	canonicalUrl
}: BitesoCitationInput): string => {
	const author = resolveBitesoCitationAuthor(bitesoNombre);
	const displayTitle = formatDisplayWorkTitle(title);
	return `${escapeHtml(author)}. Texto digital de <i>${escapeHtml(displayTitle)}</i>. BITESO, 2026. URL: ${escapeHtml(canonicalUrl)}.`;
};

export const getInformeBibliographyByInformeId = (informeId: string): InformeBibliographyView => {
	const source = parseBibliographySource();
	if (!source) return emptyInformeBibliography();

	const selectedConfig = source.informesOverridesById.get(informeId) ?? source.informesBase;
	return resolveInformeBibliographyView(selectedConfig, source.entryRawByKey);
};

export const getComoCitarnosBibliography = (): ComoCitarnosBibliographyView => {
	const source = parseBibliographySource();
	if (!source) return emptyComoCitarnosBibliography();
	return resolveComoCitarnosView(source.comoCitarnos, source.entryRawByKey);
};

export const getImpactView = (): ImpactPageView => {
	const source = parseImpactSource();
	if (!source) return emptyImpactView();
	return source;
};

export const getCollaboratorsView = (): CollaboratorsPageView => {
	const source = parseCollaboratorsSource();
	if (!source) return emptyCollaboratorsPageView();
	return source;
};
