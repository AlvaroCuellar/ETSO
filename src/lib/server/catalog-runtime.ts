import { createClient } from '@libsql/client';
import { env } from '$env/dynamic/private';
import { readPrivateTextByWorkId } from '$lib/server/r2-private';
import { fetchPublicR2Json, getSummariesBaseUrl } from '$lib/server/r2-public';
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
	type CatalogBicuve,
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
	type WorkSummaryDetail
} from '$lib/domain/catalog';
import collaboratorsSource from '../../../data/colaboradores/colaboradores.json';
import bibliographySource from '../../../data/referencias/bibliografia.json';
import impactSource from '../../../data/referencias/repercusion.json';

const CACHE_MS = 2000;

interface Snapshot {
	works: CatalogWork[];
	workById: Map<string, CatalogWork>;
	workBySlug: Map<string, CatalogWork>;
	bicuveWorkBySlug: Map<string, CatalogWork>;
	bicuveSlugByWorkId: Map<string, string>;
	bicuveNameByWorkId: Map<string, string>;
	authors: CatalogAuthor[];
	authorById: Map<string, CatalogAuthor>;
	distancesByWork: Map<string, Record<Ambito, DistanceRow[]>>;
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
	variaciones_titulo: string | null;
	genero: string | null;
	adicion: string | null;
	estado_texto: string | null;
	examen_autorias: number;
	bicuve: number;
	bicuve_nombre: string | null;
	tiene_acceso_externo: number;
	procede: string | null;
	resultado1: string | null;
	resultado2: string | null;
	resumen_breve: string | null;
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

const splitVariants = (value: string | null | undefined): string[] => {
	if (!value) return [];
	return value
		.split(/\s*[|;]\s*/)
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

const assertTursoConfig = (): { databaseUrl: string; authToken: string } => {
	if (!env.TURSO_DATABASE_URL || !env.TURSO_AUTH_TOKEN) {
		throw new Error('Faltan TURSO_DATABASE_URL o TURSO_AUTH_TOKEN para leer el catálogo desde Turso.');
	}
	return {
		databaseUrl: env.TURSO_DATABASE_URL,
		authToken: env.TURSO_AUTH_TOKEN
	};
};

const getRows = async <T>(sql: string): Promise<T[]> => {
	const { databaseUrl, authToken } = assertTursoConfig();
	dbClient ??= createClient({
		url: databaseUrl,
		authToken
	});
	const db = dbClient;
	const result = await db.execute(sql);
	return result.rows as unknown as T[];
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

const resolveWorkBaseSlug = (row: WorkRow): string => {
	const preferred = row.slug?.trim() ? slugify(row.slug) : '';
	if (preferred) return preferred;

	const fromTitle = slugify(row.titulo ?? '');
	if (fromTitle) return fromTitle;

	const fromId = slugify(row.id ?? '');
	if (fromId) return fromId;

	return 'obra';
};

const fetchSummaryFile = async (workId: string): Promise<SummaryFile | null> =>
	fetchPublicR2Json<SummaryFile>(getSummariesBaseUrl(), `${workId}.json`);

const createSnapshot = async (): Promise<Snapshot> => {
	const authorRows = await getRows<AuthorRow>(
		`SELECT id, nombre, variaciones_nombre
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

	const distancesByWork = new Map<string, Record<Ambito, DistanceRow[]>>();
	const distanceRows = await getRows<DistanceRowRaw>(
		`SELECT work_id, ambito, rank, related_work_id, distancia
		 FROM work_distances
		 ORDER BY work_id, ambito, rank`
	);
	for (const row of distanceRows) {
		const ambito = row.ambito as Ambito;
		if (!ambitos.includes(ambito)) continue;
		if (!distancesByWork.has(row.work_id)) {
			distancesByWork.set(row.work_id, ensureDistanceRecord());
		}
		distancesByWork.get(row.work_id)![ambito].push({
			rank: row.rank,
			relatedWorkId: row.related_work_id,
			distancia: row.distancia
		});
	}

	const worksTableColumns = await getRows<{ name: string }>('PRAGMA table_info(works)');
	const hasWorkSlugColumn = worksTableColumns.some((column) => column.name === 'slug');

	const workRows = await getRows<WorkRow>(
		`SELECT id, ${hasWorkSlugColumn ? 'slug' : 'NULL AS slug'}, titulo, variaciones_titulo, genero, adicion, estado_texto,
		 examen_autorias, bicuve, bicuve_nombre, tiene_acceso_externo,
		 procede, resultado1, resultado2, resumen_breve
		 FROM works
		 WHERE examen_autorias = 1
		 ORDER BY titulo COLLATE NOCASE`
	);

	const slugCounts = new Map<string, number>();
	const bicuveSlugCounts = new Map<string, number>();
	const bicuveSlugByWorkId = new Map<string, string>();
	const bicuveNameByWorkId = new Map<string, string>();

	const works: CatalogWork[] = workRows.map((row) => {
		const traditionalAttribution =
			attributionByWorkType.get(`${row.id}::tradicional`) ?? makeEmptyAttributionSet();
		const stylometryAttribution =
			attributionByWorkType.get(`${row.id}::estilometria`) ?? makeEmptyAttributionSet();

		const distanceRecord = distancesByWork.get(row.id) ?? ensureDistanceRecord();
		if (!distancesByWork.has(row.id)) {
			distancesByWork.set(row.id, distanceRecord);
		}

		const shortSummary = row.resumen_breve?.trim() || 'Sin resumen breve disponible.';

		const baseSlug = resolveWorkBaseSlug(row);
		const currentCount = (slugCounts.get(baseSlug) ?? 0) + 1;
		slugCounts.set(baseSlug, currentCount);
		const slug = currentCount === 1 ? baseSlug : `${baseSlug}-${currentCount}`;
		const bicuveNombre = row.bicuve_nombre?.trim() || 'ETSO';
		bicuveNameByWorkId.set(row.id, bicuveNombre);
		let bicuveSlug = '';
		if (Number(row.bicuve) === 1) {
			const bicuveBaseSlug = slugify(row.titulo ?? '') || slugify(row.id ?? '') || 'texto';
			const bicuveSlugCount = (bicuveSlugCounts.get(bicuveBaseSlug) ?? 0) + 1;
			bicuveSlugCounts.set(bicuveBaseSlug, bicuveSlugCount);
			bicuveSlug = bicuveSlugCount === 1 ? bicuveBaseSlug : `${bicuveBaseSlug}-${bicuveSlugCount}`;
			bicuveSlugByWorkId.set(row.id, bicuveSlug);
		}

		const links: CatalogWork['textLinks'] = [];
		if (Number(row.bicuve) === 1) {
			links.push({
				label: 'Texto BICUVE',
				href: `/bicuve/${bicuveSlug}`,
				kind: 'bicuve'
			});
		}
		for (const link of textAccessByWork.get(row.id) ?? []) {
			links.push(link);
		}

		return {
			id: row.id,
			slug,
			title: row.titulo,
			titleVariants: splitVariants(row.variaciones_titulo),
			genre: row.genero?.trim() || 'Sin genero',
			origin: row.procede?.trim() || 'Sin procedencia',
			textState: row.estado_texto?.trim() || 'Sin estado',
			addedOn: row.adicion?.trim() || 'Sin fecha',
			shortSummary,
			result1: row.resultado1?.trim() || undefined,
			result2: row.resultado2?.trim() || undefined,
			traditionalAttribution,
			stylometryAttribution,
			textLinks: links,
			reportId: hasAnyDistanceRows(distanceRecord) ? row.id : undefined
		};
	});

	const workById = new Map(works.map((work) => [work.id, work] as const));
	const workBySlug = new Map(works.map((work) => [work.slug, work] as const));
	const bicuveWorkBySlug = new Map<string, CatalogWork>();
	for (const work of works) {
		const bicuveSlug = bicuveSlugByWorkId.get(work.id);
		if (bicuveSlug) bicuveWorkBySlug.set(bicuveSlug, work);
	}

	return {
		works,
		workById,
		workBySlug,
		bicuveWorkBySlug,
		bicuveSlugByWorkId,
		bicuveNameByWorkId,
		authors,
		authorById,
		distancesByWork
	};
};

const getSnapshot = async (): Promise<Snapshot> => {
	const now = Date.now();
	if (cachedSnapshot && now - cachedAt < CACHE_MS) {
		return cachedSnapshot;
	}

	if (!cachedSnapshotPromise) {
		cachedSnapshotPromise = createSnapshot()
			.then((snapshot) => {
				cachedSnapshot = snapshot;
				cachedAt = Date.now();
				return snapshot;
			})
			.finally(() => {
				cachedSnapshotPromise = null;
			});
	}

	return cachedSnapshotPromise;
};

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

export const getWorkById = async (workId: string): Promise<CatalogWork | undefined> =>
	(await getSnapshot()).workById.get(workId);

export const getWorkBySlug = async (slug: string): Promise<CatalogWork | undefined> =>
	(await getSnapshot()).workBySlug.get(slug);

export const getAllAuthors = async (): Promise<CatalogAuthor[]> =>
	(await getSnapshot()).authors.filter((author) => author.id !== UNRESOLVED_AUTHOR_ID);

export const getAuthorById = async (authorId: string): Promise<CatalogAuthor | undefined> => {
	if (authorId === UNRESOLVED_AUTHOR_ID) return undefined;
	return (await getSnapshot()).authorById.get(authorId);
};

export const listGenres = async (): Promise<string[]> =>
	Array.from(new Set((await getSnapshot()).works.map((work) => work.genre))).sort((a, b) =>
		a.localeCompare(b)
	);

export const getCatalogStats = async (): Promise<CatalogStats> => {
	const snapshot = await getSnapshot();
	const bicuveTexts = snapshot.works.filter((work) =>
		work.textLinks.some((link) => link.kind === 'bicuve')
	).length;
	const informes = snapshot.works.filter((work) => Boolean(work.reportId)).length;

	return {
		works: snapshot.works.length,
		authors: snapshot.authors.filter((author) => author.id !== UNRESOLVED_AUTHOR_ID).length,
		informes,
		bicuveTexts
	};
};

export const getAuthorWorks = async (authorId: string): Promise<AuthorWorkRelation[]> => {
	const snapshot = await getSnapshot();
	if (!snapshot.authorById.has(authorId)) return [];

	return snapshot.works
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

export const getInformeById = async (informeId: string): Promise<CatalogInforme | undefined> => {
	const snapshot = await getSnapshot();
	const work = snapshot.workById.get(informeId);
	if (!work) return undefined;

	const distances = snapshot.distancesByWork.get(work.id) ?? ensureDistanceRecord();
	if (!hasAnyDistanceRows(distances)) return undefined;

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
		title: `Análisis estilométrico de ${work.title}`,
		intro:
			work.result1 ||
			'Informe generado desde Turso para validar visualización y flujo de consulta.',
		methodology:
			'Se muestran las distancias cargadas en work_distances desde Turso. En la versión final, esta sección podrá enriquecerse con servicios de cálculo oficiales del proyecto.',
		conclusion:
			work.result2 ||
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

const getBicuveForWork = async (
	work: CatalogWork | undefined,
	snapshot: Snapshot
): Promise<CatalogBicuve | undefined> => {
	if (!work) return undefined;
	if (!work.textLinks.some((link) => link.kind === 'bicuve')) return undefined;

	const text = await readPrivateTextByWorkId(work.id);
	if (!text) return undefined;

	return {
		id: snapshot.bicuveSlugByWorkId.get(work.id) || work.slug,
		workId: work.id,
		bicuveNombre: snapshot.bicuveNameByWorkId.get(work.id) || 'ETSO',
		title: `Texto digital de ${work.title}`,
		text
	};
};

export const getBicuveBySlug = async (bicuveSlug: string): Promise<CatalogBicuve | undefined> => {
	const snapshot = await getSnapshot();
	return getBicuveForWork(snapshot.bicuveWorkBySlug.get(bicuveSlug), snapshot);
};

export const getBicuveWorkBySlug = async (bicuveSlug: string): Promise<CatalogWork | undefined> =>
	(await getSnapshot()).bicuveWorkBySlug.get(bicuveSlug);

export const getBicuveById = async (bicuveId: string): Promise<CatalogBicuve | undefined> => {
	const snapshot = await getSnapshot();
	return getBicuveForWork(snapshot.workById.get(bicuveId), snapshot);
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

const resolveBicuveCitationAuthor = (bicuveNombre: string): string => {
	const raw = bicuveNombre.trim();
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

interface BicuveCitationInput {
	bicuveNombre: string;
	title: string;
	canonicalUrl: string;
}

export const buildBicuveCitation = ({
	bicuveNombre,
	title,
	canonicalUrl
}: BicuveCitationInput): string => {
	const author = resolveBicuveCitationAuthor(bicuveNombre);
	return `${author}. Texto digital de ${title}. BICUVE, 2026. URL: ${canonicalUrl}.`;
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
