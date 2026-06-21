import { formatDisplayWorkTitle } from '$lib/utils/format-display-work-title';
import { formatAttribution } from '$lib/domain/catalog';
import { SITE_URL } from '$lib/seo';
import {
	buildTraditionalAttributionParts,
	type AttributionPhrasePart
} from '$lib/utils/traditional-attribution-phrase';

import type { AttributionSet, CatalogWork, WorkResourceLink } from '$lib/domain/catalog';

interface PublicWorkMetadataResources {
	work: string;
	summary: string | null;
	report: string | null;
	textAccess: WorkResourceLink[];
}

interface PublicWorkMetadataFlags {
	inAuthorshipExam: boolean;
	hasSummary: boolean;
	hasReport: boolean;
	hasTextAccess: boolean;
}

interface PublicAttributionPhrasePart {
	kind: AttributionPhrasePart['kind'];
	value: string;
	authorId?: number | null;
	authorKey?: string;
	href?: string;
	url?: string;
}

interface PublicAttributionPhrase {
	text: string;
	markdown: string;
	html: string;
	parts: PublicAttributionPhrasePart[];
}

interface PublicAttributionMember {
	authorId: number | null;
	authorKey: string;
	authorName: string;
	confidence?: AttributionSet['groups'][number]['members'][number]['confidence'];
}

interface PublicAttributionGroup {
	members: PublicAttributionMember[];
}

interface PublicAttributionSet {
	groups: PublicAttributionGroup[];
	connector: AttributionSet['connector'];
	unresolved?: boolean;
	rawExpression?: string;
}

export interface PublicWorkMetadata {
	id: string;
	publicId: number | null;
	slug: string;
	title: string;
	displayTitle: string;
	titleVariants: string[];
	displayTitleVariants: string[];
	genre: string;
	origin: string;
	textState: string;
	transcriptionType: string | null;
	addedOn: string;
	bitesoPublishedOn: string | null;
	summaryPublishedOn: string | null;
	resultado1: string | null;
	flags: PublicWorkMetadataFlags;
	traditionalAttributionText: string;
	traditionalAttributionPhrase: PublicAttributionPhrase;
	stylometryAttributionText: string;
	traditionalAttribution: PublicAttributionSet;
	stylometryAttribution: PublicAttributionSet;
	resources: PublicWorkMetadataResources;
}

export const WORK_METADATA_CONTENT_POLICY = {
	includesFullText: false,
	includesSummaries: false,
	excludedFields: ['fullText', 'text', 'shortSummary', 'summaryText', 'resumen_breve', 'resumen_largo']
} as const;

const cloneTextAccessLink = (link: WorkResourceLink): WorkResourceLink => ({
	label: link.label,
	href: link.href,
	kind: link.kind,
	...(link.external === undefined ? {} : { external: link.external })
});

const normalizeText = (value: string): string =>
	value
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.trim();

const hasAutomaticMarker = (value: string): boolean => {
	const normalized = normalizeText(value);
	return normalized.includes('automatico') || /\bauto\b/.test(normalized);
};

const formatNameList = (names: string[], connector: string): string => {
	if (names.length <= 1) return names[0] ?? '';
	if (names.length === 2) return `${names[0]} ${connector} ${names[1]}`;
	return `${names.slice(0, -1).join(', ')} ${connector} ${names[names.length - 1]}`;
};

const escapeHtml = (value: string): string =>
	value
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;');

const escapeMarkdown = (value: string): string => value.replace(/([\\[\]])/g, '\\$1');

const authorHref = (authorKey: string): string => `/autores/${authorKey}`;
const authorUrl = (authorKey: string): string => `${SITE_URL}${authorHref(authorKey)}`;

const authorPublicIdByKey = (set: AttributionSet): Map<string, number | null> => {
	const byKey = new Map<string, number | null>();
	for (const group of set.groups) {
		for (const member of group.members) {
			byKey.set(member.authorId, member.authorPublicId ?? null);
		}
	}
	return byKey;
};

const serializeAttributionPhrase = (
	parts: AttributionPhrasePart[],
	publicIdByAuthorKey: Map<string, number | null>
): PublicAttributionPhrase => {
	const publicParts: PublicAttributionPhrasePart[] = parts.map((part) =>
		part.kind === 'author' && part.authorId
			? {
					kind: part.kind,
					value: part.value,
					authorId: publicIdByAuthorKey.get(part.authorId) ?? null,
					authorKey: part.authorId,
					href: authorHref(part.authorId),
					url: authorUrl(part.authorId)
				}
			: {
					kind: part.kind,
					value: part.value
				}
	);
	const text = publicParts.map((part) => part.value).join('');
	const markdown = publicParts
		.map((part) =>
			part.kind === 'author' && part.url
				? `[${escapeMarkdown(part.value)}](${part.url})`
				: escapeMarkdown(part.value)
		)
		.join('');
	const html = publicParts
		.map((part) =>
			part.kind === 'author' && part.href
				? `<a href="${escapeHtml(part.href)}">${escapeHtml(part.value)}</a>`
				: escapeHtml(part.value)
		)
		.join('');

	return { text, markdown, html, parts: publicParts };
};

const toPublicAttributionSet = (set: AttributionSet): PublicAttributionSet => ({
	groups: set.groups.map((group) => ({
		members: group.members.map((member) => ({
			authorId: member.authorPublicId ?? null,
			authorKey: member.authorId,
			authorName: member.authorName,
			...(member.confidence ? { confidence: member.confidence } : {})
		}))
	})),
	connector: set.connector,
	...(set.unresolved === undefined ? {} : { unresolved: set.unresolved }),
	...(set.rawExpression === undefined ? {} : { rawExpression: set.rawExpression })
});

const stylometryResultSentence = (set: AttributionSet): string => {
	const rawExpression = normalizeText(set.rawExpression ?? '');
	if (rawExpression.includes('no_apunta_a_ningun_autor')) {
		return 'Los analisis de estilometria no permiten asociar esta obra de forma clara con ningun perfil autorial del corpus.';
	}
	if (rawExpression.includes('no_es_posible')) {
		return 'Los análisis no pueden asociar esta obra con el perfil estilístico del autor tradicional, debido a lo reducido de su corpus. Tampoco identifican de forma clara una alternativa autorial.';
	}
	if (rawExpression.includes('no_analizada')) {
		return 'Esta obra no ha sido analizada estilometricamente, por lo que no es posible valorar su asociacion con ningun perfil autorial del corpus.';
	}
	if (rawExpression.includes('pendiente_profundidad')) {
		return 'Los resultados estilometricos disponibles requieren una revision en profundidad antes de formular una conclusion autorial.';
	}

	const members = set.groups.flatMap((group) => group.members).filter((member) => member.authorName.trim());
	const names = members.map((member) => member.authorName.trim());
	const allProbable = members.length > 0 && members.every((member) => member.confidence === 'probable');

	if (members.length === 1 && members[0].confidence === 'segura') {
		return `Los analisis de estilometria permiten asociar esta obra de forma clara con el perfil autorial de ${names[0]}.`;
	}
	if (members.length === 1 && members[0].confidence === 'probable') {
		return `Los analisis de estilometria permiten asociar esta obra con el perfil autorial de ${names[0]}, por cuanto algunas de sus obras aparecen en las primeras posiciones, aunque no de forma concluyente.`;
	}
	if (members.length > 1 && set.connector === 'and' && allProbable) {
		return `Los analisis de estilometria permiten asociar esta obra con los perfiles autoriales de ${formatNameList(names, 'y')}, por cuanto algunas de sus obras aparecen en las primeras posiciones, aunque no de forma concluyente.`;
	}

	return 'Los resultados estilometricos disponibles requieren revision antes de formular una conclusion autorial.';
};

const resolveGeneratedResult = (work: CatalogWork): string | null => {
	const result = work.result1?.trim();
	if (!result) return null;
	return hasAutomaticMarker(result) ? stylometryResultSentence(work.stylometryAttribution) : result;
};

export const toPublicWorkMetadata = (work: CatalogWork): PublicWorkMetadata => {
	const hasReport = Boolean(work.reportId && work.reportSlug);
	const textAccess = work.textLinks.map(cloneTextAccessLink);
	const traditionalAuthorPublicIdByKey = authorPublicIdByKey(work.traditionalAttribution);

	return {
		id: work.id,
		publicId: work.publicId ?? null,
		slug: work.slug,
		title: work.title,
		displayTitle: formatDisplayWorkTitle(work.title),
		titleVariants: [...work.titleVariants],
		displayTitleVariants: work.titleVariants.map(formatDisplayWorkTitle),
		genre: work.genre,
		origin: work.origin,
		textState: work.textState,
		transcriptionType: work.transcriptionType ?? null,
		addedOn: work.addedOn,
		bitesoPublishedOn: work.bitesoPublishedOn ?? null,
		summaryPublishedOn: work.summaryPublishedOn ?? null,
		resultado1: resolveGeneratedResult(work),
		flags: {
			inAuthorshipExam: work.inAuthorshipExam,
			hasSummary: work.hasSummaryFile,
			hasReport,
			hasTextAccess: textAccess.length > 0
		},
		traditionalAttributionText: formatAttribution(work.traditionalAttribution),
		traditionalAttributionPhrase: serializeAttributionPhrase(
			buildTraditionalAttributionParts(work.traditionalAttribution),
			traditionalAuthorPublicIdByKey
		),
		stylometryAttributionText: formatAttribution(work.stylometryAttribution),
		traditionalAttribution: toPublicAttributionSet(work.traditionalAttribution),
		stylometryAttribution: toPublicAttributionSet(work.stylometryAttribution),
		resources: {
			work: `/obras/${work.slug}`,
			summary: work.hasSummaryFile ? `/obras/${work.slug}/resumen` : null,
			report: hasReport ? `/informes/${work.reportSlug}` : null,
			textAccess
		}
	};
};
