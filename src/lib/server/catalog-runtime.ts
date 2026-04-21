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
import snapshotSource from '$lib/server/generated/catalog-snapshot.generated.json';

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
