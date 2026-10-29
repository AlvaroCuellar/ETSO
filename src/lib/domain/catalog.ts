export type Confidence = 'segura' | 'probable' | 'posible' | 'no_concluyente';

export type Ambito =
	| 'obracompleta'
	| 'jornada1'
	| 'jornada2'
	| 'jornada3'
	| 'jornada4'
	| 'jornada5';

export interface AttributionMember {
	authorId: string;
	authorPublicId?: number | null;
	authorName: string;
	hasAuthorshipExam?: boolean;
	confidence?: Confidence;
	/** Scope is independent of confidence; omitted means no reviewed scope override. */
	scope?: 'participation';
}

export interface AttributionGroup {
	members: AttributionMember[];
}

export interface AttributionSet {
	groups: AttributionGroup[];
	connector: 'and' | 'or';
	unresolved?: boolean;
	rawExpression?: string;
	/** Exact reviewed traditional prose, independent of structured filter groups. */
	reviewedPhrase?: string;
}

export interface WorkResourceLink {
	label: string;
	href: string;
	kind: 'biteso' | 'texto_externo';
	external?: boolean;
}

export interface CatalogWork {
	asodatId?: number;
	id: string;
	publicId?: number;
	slug: string;
	title: string;
	titleVariants: string[];
	genre: string;
	generalGenre?: string;
	collectionSize?: number;
	origin: string;
	textState: string;
	addedOn: string;
	bitesoPublishedOn?: string;
	summaryPublishedOn?: string;
	shortSummary: string;
	hasSummaryFile: boolean;
	inAuthorshipExam: boolean;
	result1?: string;
	result2?: string;
	notes?: string;
	traditionalAttribution: AttributionSet;
	stylometryAttribution: AttributionSet;
	textLinks: WorkResourceLink[];
	reportId?: string;
	reportSlug?: string;
	hasTeiViewer?: boolean;
	facsimileFirstUrl?: string;
	facsimileLastUrl?: string;
}

export interface CatalogAuthor {
	hasAuthorshipExam?: boolean;
	id: string;
	publicId: number | null;
	name: string;
	nameVariants: string[];
}

export interface DistanceRow {
	rank: number;
	relatedWorkId: string;
	distancia: number;
}

export interface WorkNetworkNode {
	id: string;
	slug: string;
	title: string;
	genre: string;
	authors: string[];
	traditionalAuthors: string[];
	stylometryAuthors: string[];
	searchText: string;
	x: number;
	y: number;
	z: number;
	community: number;
	reportSlug?: string;
}

export interface WorkNetworkLink {
	source: string;
	target: string;
	distance: number;
	rank: number;
}

export interface WorkNetworkGraph {
	nodes: WorkNetworkNode[];
	links: WorkNetworkLink[];
}

export interface CatalogInforme {
	id: string;
	workId: string;
	slug: string;
	title: string;
	intro: string;
	methodology: string;
	conclusion: string;
	citation: string;
	distances: Record<Ambito, DistanceRow[]>;
}

export interface InformeBibliographyEntry {
	id: string;
	text: string;
	parts: InformeBibliographyEntryPart[];
	bibtex?: string;
}

export interface InformeBibliographyEntryPart {
	kind: 'text' | 'italic' | 'link';
	value: string;
	href?: string;
}

export interface InformeBibliographySection {
	id: string;
	lead: string;
	entries: InformeBibliographyEntry[];
	collapsible?: boolean;
	collapsibleLabel?: string;
	defaultOpen?: boolean;
}

export interface InformeBibliographyCopyButton {
	label: string;
	sectionId: string;
	entryId: string;
}

export interface InformeBibliographyView {
	sections: InformeBibliographySection[];
	copyButton: InformeBibliographyCopyButton | null;
}

export interface ComoCitarnosBibliographySection {
	id: string;
	title: string;
	lead?: string;
	entries: InformeBibliographyEntry[];
}

export interface ComoCitarnosBibliographyView {
	intro: string;
	sections: ComoCitarnosBibliographySection[];
}

export type EditorialSectionPresentation =
	| 'timeline'
	| 'compact_list'
	| 'featured_cards'
	| 'media_cards'
	| 'multi_column_list'
	| 'callout';

export type EditorialEntryStatus = 'active' | 'in_progress';

export type ImpactReferenceType =
	| 'article'
	| 'book'
	| 'thesis'
	| 'edition'
	| 'news'
	| 'conference'
	| 'seminar'
	| 'exhibition'
	| 'award'
	| 'project'
	| 'other';

export type CollaboratorEntryType =
	| 'person'
	| 'organization'
	| 'student'
	| 'resource'
	| 'acknowledgment';

export type EditorialEntryType = ImpactReferenceType | CollaboratorEntryType;

export type ImpactRelationTag =
	| 'colaboracion'
	| 'mencion'
	| 'cita'
	| 'difusion'
	| 'resultado'
	| 'reconocimiento';

export interface EditorialLink {
	label: string;
	href: string;
	kind: 'primary' | 'related';
}

export interface EditorialItem {
	id: string;
	title: string;
	summary: string;
	type: EditorialEntryType;
	status: EditorialEntryStatus;
	year: number | null;
	people: string[];
	organizations: string[];
	tags: ImpactRelationTag[];
	links: EditorialLink[];
	image: string | null;
}

export interface EditorialSection {
	id: string;
	title: string;
	description: string | null;
	presentation: EditorialSectionPresentation;
	items: EditorialItem[];
}

export interface CollaboratorCard {
	name: string;
	affiliations: string[];
	description?: string;
	sourceLabel?: string;
	image?: string;
}

export interface CollaboratorSection {
	id: string;
	title: string;
	cards: CollaboratorCard[];
}

export interface CollaboratorsAcknowledgments {
	text?: string;
	organizations: string[];
}

export interface CollaboratorsStudentsView {
	group?: string;
	institution?: string;
	people: string[];
}

export interface CollaboratorsPageView {
	intro: string;
	sections: EditorialSection[];
}

export interface ImpactReferenceLink {
	href: string;
	label: string;
}

export interface ImpactReferenceItem {
	id: string;
	summary: string;
	impactTag?: string;
	links: ImpactReferenceLink[];
}

export interface ImpactReferenceSection {
	id: string;
	title: string;
	year?: number;
	items: ImpactReferenceItem[];
}

export interface ImpactPageView {
	intro: string;
	sections: EditorialSection[];
}

export interface CatalogBiteso {
	id: string;
	workId: string;
	bitesoNombre: string;
	bitesoRevisores: string[];
	title: string;
	text: string;
	tei?: BitesoTeiViewer;
}

export interface BitesoTeiLinePart {
	text: string;
	unclear?: boolean;
}

export interface BitesoTeiLine {
	text: string;
	parts: BitesoTeiLinePart[];
	unclear?: boolean;
	kind?: 'verse' | 'prose';
}

export interface BitesoTeiBlock {
	type: 'speech' | 'stage' | 'note';
	speaker?: string;
	text?: string;
	lines?: BitesoTeiLine[];
}

export interface BitesoTeiPage {
	n?: string;
	folio?: string;
	pdfPage?: string;
	image?: string;
	side?: string;
	surfaceNotes?: string[];
	numberings?: {
		type?: string;
		value?: string;
		cert?: string;
		label?: string;
	}[];
	jornada?: {
		n?: string;
		id?: string;
		label?: string;
	};
	facs?: string;
	source?: string;
	blocks: BitesoTeiBlock[];
}

export interface BitesoTeiViewer {
	source: 'tei';
	version: number;
	workId: string;
	archivo?: string;
	pages: BitesoTeiPage[];
	downloads?: {
		teiXml?: string;
		textWithDidascalias?: string;
		verseText?: string;
	};
	stats?: {
		pages?: number;
		lines?: number;
		unclearLines?: number;
	};
}

export interface SummaryNamedItem {
	nombre: string;
	descripcion: string;
}

export interface SummaryThemeItem {
	tema: string;
	descripcion: string;
}

export interface WorkSummaryDetail {
	resumenLargo: string[];
	personajes: SummaryNamedItem[];
	espacios: SummaryNamedItem[];
	tematicas: SummaryThemeItem[];
}

export type WorkAuthorshipType = 'unica' | 'colaboracion' | 'desconocida';

export interface AuthorWorkRelation {
	work: CatalogWork;
	inTraditional: boolean;
	inStylometry: boolean;
	stylometryConfidence: Confidence[];
}

export interface ObraTableFilterFlags {
	relatedAny: boolean;
	tradAny: boolean;
	etsoYes: boolean;
	onlyEtso: boolean;
	onlyTrad: boolean;
}

export interface ObraTableRow {
	rowId: string;
	work: CatalogWork;
	position?: number;
	distancia?: number;
	badgeColor?: string;
	filterFlags?: ObraTableFilterFlags;
}

export interface AuthorMetrics {
	relatedAny: number;
	tradAny: number;
	etsoYes: number;
	onlyTrad: number;
	onlyEtso: number;
}

export interface CatalogStats {
	works: number;
	authors: number;
	informes: number;
	bitesoTexts: number;
}

export interface InformeDistanceView extends DistanceRow {
	relatedWork: CatalogWork;
}

export const ambitos: Ambito[] = [
	'obracompleta',
	'jornada1',
	'jornada2',
	'jornada3',
	'jornada4',
	'jornada5'
];

export const ambitoLabels: Record<Ambito, string> = {
	obracompleta: 'Obra completa',
	jornada1: 'Jornada 1',
	jornada2: 'Jornada 2',
	jornada3: 'Jornada 3',
	jornada4: 'Jornada 4',
	jornada5: 'Jornada 5'
};

export const UNRESOLVED_AUTHOR_ID = 'no_apunta_a_ningun_autor';

export const ANALYSIS_STATUS_AUTHOR_IDS = [
	UNRESOLVED_AUTHOR_ID, 'no_analizada', 'no_es_posible', 'pendiente_profundidad', 'pendiente'
] as const;

export const isPersonAuthor = (authorId: string): boolean =>
	!ANALYSIS_STATUS_AUTHOR_IDS.some((id) => id === authorId);


export const normalizeConfidence = (raw?: string | null): Confidence | undefined => {
	if (!raw) return undefined;
	const value = raw.toLowerCase().trim();
	if (value === 'segura') return 'segura';
	if (value === 'probable') return 'probable';
	if (value === 'posible') return 'posible';
	if (value === 'no_concluyente' || value === 'sin_confianza') return 'no_concluyente';
	return undefined;
};

export const formatConfidence = (confidence?: Confidence): string => {
	if (!confidence) return '';
	if (confidence === 'segura') return 'Segura';
	if (confidence === 'probable') return 'Probable';
	if (confidence === 'posible') return 'Posible';
	return 'No concluyente';
};

export const formatAttributionConfidence = (member: AttributionMember): string => {
	const confidence = formatConfidence(member.confidence);
	return member.scope === 'participation'
		? `Participación${confidence ? ` ${confidence.toLowerCase()}` : ''}`
		: confidence;
};

export const formatAttribution = (set: AttributionSet): string => {
	if (set.reviewedPhrase) return set.reviewedPhrase;
	if (set.unresolved) return 'No apunta hacia ningún autor';
	if (!set.groups.length) return 'Sin datos';

	const connector = set.connector === 'and' ? ' y ' : ' o ';
	const groupText = set.groups.map((group) =>
		group.members
			.map((member) =>
				member.confidence
					? `${member.authorName} [${formatAttributionConfidence(member)}]`
					: member.authorName
			)
			.join(' y ')
	);

	return groupText.join(connector);
};

export const inferWorkAuthorshipType = (work: CatalogWork): WorkAuthorshipType => {
	if (work.stylometryAttribution.unresolved) return 'desconocida';
	const classify = (set: AttributionSet): WorkAuthorshipType => {
		const sizes = set.groups.map((group) => {
			const ids = new Set(group.members.filter((member) => member.authorId && isPersonAuthor(member.authorId))
				.map((member) => member.authorId));
			// Anonymous teams are multiple people even though they have one catalog key.
			return [...ids].reduce((size, id) => size + (/^desconocido_(dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez)_ingenios$/.test(id) ? 2 : 1), 0);
		}).filter((size) => size > 0);
		if (!sizes.length) return 'desconocida';
		// Alternatives are separate hypotheses, never a flattened team of coauthors.
		if (sizes.every((size) => size === 1)) return 'unica';
		if (sizes.every((size) => size > 1)) return 'colaboracion';
		return 'desconocida';
	};
	const members = work.stylometryAttribution.groups.flatMap((group) => group.members)
		.filter((member) => member.authorId && isPersonAuthor(member.authorId));
	const stylometryType = classify(work.stylometryAttribution);
	if (members.some((member) => member.scope === 'participation') && stylometryType !== 'colaboracion') {
		// One participant does not establish sole authorship; several identified
		// participants in a team do establish collaboration, despite partial scope.
		return classify(work.traditionalAttribution);
	}
	return members.length ? stylometryType : classify(work.traditionalAttribution);
};
