import { basename } from 'node:path';

import {
	UNRESOLVED_AUTHOR_ID,
	ambitos,
	formatConfidence,
	inferWorkAuthorshipType,
	type Ambito,
	type AuthorMetrics,
	type AuthorWorkRelation,
	type CatalogAuthor,
	type CatalogBicuve,
	type CatalogInforme,
	type CatalogStats,
	type CatalogWork,
	type Confidence,
	type DistanceRow,
	type InformeDistanceView,
	type WorkSummaryDetail
} from '$lib/domain/catalog';
import snapshotSource from '$lib/server/generated/catalog-snapshot.generated.json';

export {
	buildBicuveCitation,
	getCollaboratorsView,
	getComoCitarnosBibliography,
	getImpactView,
	getInformeBibliographyByInformeId
} from './catalog-local';

const CACHE_MS = 2000;

interface Snapshot {
	works: CatalogWork[];
	workById: Map<string, CatalogWork>;
	workBySlug: Map<string, CatalogWork>;
	bicuveNameByWorkId: Map<string, string>;
	authors: CatalogAuthor[];
	authorById: Map<string, CatalogAuthor>;
	distancesByWork: Map<string, Record<Ambito, DistanceRow[]>>;
}

interface SnapshotDisk {
	works: CatalogWork[];
	authors: CatalogAuthor[];
	bicuveNameByWorkId: Record<string, string>;
	distancesByWork: Record<string, Record<Ambito, DistanceRow[]>>;
}

interface SummaryFile {
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

const summaryModules = import.meta.glob('../../../data/resumenes/*.json', {
	eager: true,
	import: 'default'
}) as Record<string, SummaryFile>;

const textModules = import.meta.glob('../../../data/texts/*.txt', {
	eager: true,
	import: 'default',
	query: '?raw'
}) as Record<string, string>;

const summaryFileByWorkId = new Map(
	Object.entries(summaryModules).map(([path, summary]) => [basename(path, '.json'), summary] as const)
);

const textByWorkId = new Map(
	Object.entries(textModules).map(([path, text]) => [basename(path, '.txt'), text] as const)
);

let cachedSnapshot: Snapshot | null = null;
let cachedAt = 0;

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

const createSnapshot = (): Snapshot => {
	const source = snapshotSource as SnapshotDisk;
	const works = Array.isArray(source.works) ? source.works : [];
	const authors = Array.isArray(source.authors) ? source.authors : [];
	const distancesByWork = new Map<string, Record<Ambito, DistanceRow[]>>();

	for (const work of works) {
		distancesByWork.set(work.id, {
			...ensureDistanceRecord(),
			...(source.distancesByWork?.[work.id] ?? {})
		});
	}

	for (const [workId, distanceRecord] of Object.entries(source.distancesByWork ?? {})) {
		if (!distancesByWork.has(workId)) {
			distancesByWork.set(workId, {
				...ensureDistanceRecord(),
				...distanceRecord
			});
		}
	}

	return {
		works,
		workById: new Map(works.map((work) => [work.id, work] as const)),
		workBySlug: new Map(works.map((work) => [work.slug, work] as const)),
		bicuveNameByWorkId: new Map(Object.entries(source.bicuveNameByWorkId ?? {})),
		authors,
		authorById: new Map(authors.map((author) => [author.id, author] as const)),
		distancesByWork
	};
};

const getSnapshot = (): Snapshot => {
	const now = Date.now();
	if (cachedSnapshot && now - cachedAt < CACHE_MS) {
		return cachedSnapshot;
	}

	cachedSnapshot = createSnapshot();
	cachedAt = now;
	return cachedSnapshot;
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

export const getAllWorks = (): CatalogWork[] => getSnapshot().works;

export const getWorkById = (workId: string): CatalogWork | undefined => getSnapshot().workById.get(workId);

export const getWorkBySlug = (slug: string): CatalogWork | undefined => getSnapshot().workBySlug.get(slug);

export const getAllAuthors = (): CatalogAuthor[] =>
	getSnapshot().authors.filter((author) => author.id !== UNRESOLVED_AUTHOR_ID);

export const getAuthorById = (authorId: string): CatalogAuthor | undefined => {
	if (authorId === UNRESOLVED_AUTHOR_ID) return undefined;
	return getSnapshot().authorById.get(authorId);
};

export const listGenres = (): string[] =>
	Array.from(new Set(getSnapshot().works.map((work) => work.genre))).sort((a, b) => a.localeCompare(b));

export const getCatalogStats = (): CatalogStats => {
	const snapshot = getSnapshot();
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

export const getAuthorWorks = (authorId: string): AuthorWorkRelation[] => {
	const snapshot = getSnapshot();
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

export const getAuthorMetrics = (authorId: string): AuthorMetrics => {
	const relations = getAuthorWorks(authorId);

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

export const getWorkSummaryDetailById = (workId: string): WorkSummaryDetail | undefined => {
	const parsed = summaryFileByWorkId.get(workId);
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

export const getInformeById = (informeId: string): CatalogInforme | undefined => {
	const snapshot = getSnapshot();
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
		title: `Analisis estilometrico de ${work.title}`,
		intro:
			work.result1 ||
			'Informe generado desde el snapshot del catalogo para validar visualizacion y flujo de consulta.',
		methodology:
			'Se muestran las distancias cargadas en work_distances del snapshot generado durante el build. En la version final, esta seccion se alimentara desde Turso y servicios de calculo oficiales del proyecto.',
		conclusion:
			work.result2 ||
			`Lectura preliminar para ${work.title} con perfil ${inferWorkAuthorshipType(work)} y nivel ${confidenceLabel}.`,
		citation: `ETSO. Analisis estilometrico de ${work.title}. Dataset local de prueba.`,
		distances
	};
};

export const getInformeByWorkId = (workId: string): CatalogInforme | undefined => getInformeById(workId);

export const getInformeDistanceRows = (
	informe: CatalogInforme,
	ambito: Ambito
): InformeDistanceView[] => {
	const snapshot = getSnapshot();
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

export const getBicuveById = (bicuveId: string): CatalogBicuve | undefined => {
	const snapshot = getSnapshot();
	const work = snapshot.workById.get(bicuveId);
	if (!work) return undefined;

	const text = textByWorkId.get(bicuveId);
	if (!text) return undefined;

	return {
		id: bicuveId,
		workId: work.id,
		bicuveNombre: snapshot.bicuveNameByWorkId.get(work.id) || 'ETSO',
		title: `Texto digital de ${work.title}`,
		text
	};
};
