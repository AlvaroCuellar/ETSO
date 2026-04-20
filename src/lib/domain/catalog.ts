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
	authorName: string;
	confidence?: Confidence;
}

export interface AttributionGroup {
	members: AttributionMember[];
}

export interface AttributionSet {
	groups: AttributionGroup[];
	connector: 'and' | 'or';
	unresolved?: boolean;
}

export interface WorkResourceLink {
	label: string;
	href: string;
	kind: 'bicuve' | 'texto_externo';
	external?: boolean;
}

export interface CatalogWork {
	id: string;
	slug: string;
	title: string;
	titleVariants: string[];
	genre: string;
	origin: string;
	textState: string;
	addedOn: string;
	shortSummary: string;
	longSummary?: string;
	result1?: string;
	result2?: string;
	traditionalAttribution: AttributionSet;
	stylometryAttribution: AttributionSet;
	textLinks: WorkResourceLink[];
	reportId?: string;
}

export interface CatalogAuthor {
	id: string;
	name: string;
	nameVariants: string[];
}

export interface DistanceRow {
	rank: number;
	relatedWorkId: string;
	distancia: number;
}

export interface CatalogInforme {
	id: string;
	workId: string;
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

export interface CatalogBicuve {
	id: string;
	workId: string;
	bicuveNombre: string;
	title: string;
	text: string;
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
	bicuveTexts: number;
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

export const formatAttribution = (set: AttributionSet): string => {
	if (set.unresolved) return 'Autoria no determinada';
	if (!set.groups.length) return 'Sin datos';

	const connector = set.connector === 'and' ? ' y ' : ' o ';
	const groupText = set.groups.map((group) =>
		group.members
			.map((member) =>
				member.confidence
					? `${member.authorName} [${formatConfidence(member.confidence)}]`
					: member.authorName
			)
			.join(' y ')
	);

	return groupText.join(connector);
};

export const inferWorkAuthorshipType = (work: CatalogWork): WorkAuthorshipType => {
	if (work.stylometryAttribution.unresolved) return 'desconocida';

	const stylometryAuthors = new Set(
		work.stylometryAttribution.groups.flatMap((group) =>
			group.members
				.map((member) => member.authorId)
				.filter((authorId) => authorId && authorId !== UNRESOLVED_AUTHOR_ID)
		)
	);
	if (stylometryAuthors.size > 0) {
		return stylometryAuthors.size > 1 ? 'colaboracion' : 'unica';
	}

	const traditionalAuthors = new Set(
		work.traditionalAttribution.groups.flatMap((group) =>
			group.members
				.map((member) => member.authorId)
				.filter((authorId) => authorId && authorId !== UNRESOLVED_AUTHOR_ID)
		)
	);
	if (traditionalAuthors.size === 0) return 'desconocida';
	return traditionalAuthors.size > 1 ? 'colaboracion' : 'unica';
};

