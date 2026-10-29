import { getAsodatWorkUrl } from '$lib/domain/asodat';
import { formatDisplayWorkTitle } from '$lib/utils/format-display-work-title';
import { formatAttribution, isPersonAuthor } from '$lib/domain/catalog';
import { resolveStylometryResult } from '$lib/utils/stylometry-result';
import { SITE_URL } from '$lib/seo';
import {
	buildTraditionalAttributionParts,
	type AttributionPhrasePart
} from '$lib/utils/traditional-attribution-phrase';

import type { AttributionSet, CatalogWork, WorkResourceLink } from '$lib/domain/catalog';

interface PublicWorkMetadataResources {
	asodat: string | null;
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
	scope?: AttributionSet['groups'][number]['members'][number]['scope'];
}

interface PublicAttributionGroup {
	members: PublicAttributionMember[];
}

interface PublicAttributionSet {
	groups: PublicAttributionGroup[];
	connector: AttributionSet['connector'];
	unresolved?: boolean;
	rawExpression?: string;
	reviewedPhrase?: string;
}

export interface PublicWorkMetadata {
	asodatId: number | null;
	id: string;
	publicId: number | null;
	slug: string;
	title: string;
	displayTitle: string;
	titleVariants: string[];
	displayTitleVariants: string[];
	collectionSize: number | null;
	generalGenre: string;
	subgenre: string;
	genre: string;
	origin: string;
	textState: string;
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
	publicIdByAuthorKey: Map<string, number | null>,
	linkAuthors: boolean
): PublicAttributionPhrase => {
	const publicParts: PublicAttributionPhrasePart[] = parts.map((part) =>
		part.kind === 'author' && part.authorId
			? {
					kind: part.kind,
					value: part.value,
					authorId: publicIdByAuthorKey.get(part.authorId) ?? null,
					authorKey: part.authorId,
					...(linkAuthors && isPersonAuthor(part.authorId) ? { href: authorHref(part.authorId), url: authorUrl(part.authorId) } : {}),
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
			...(member.confidence ? { confidence: member.confidence } : {}),
			...(member.scope ? { scope: member.scope } : {})
		}))
	})),
	connector: set.connector,
	...(set.unresolved === undefined ? {} : { unresolved: set.unresolved }),
	...(set.rawExpression === undefined ? {} : { rawExpression: set.rawExpression }),
	...(set.reviewedPhrase === undefined ? {} : { reviewedPhrase: set.reviewedPhrase })
});

const publicTraditionalAttributionParts = (work: CatalogWork): AttributionPhrasePart[] => {
	if (!(typeof work.collectionSize === 'number' && work.collectionSize > 0)) {
		return buildTraditionalAttributionParts(work.traditionalAttribution);
	}
	const members = [...new Map(work.traditionalAttribution.groups.flatMap((group) => group.members)
		.map((member) => [member.authorId, member] as const)).values()];
	const parts: AttributionPhrasePart[] = [{ kind: 'text', value: 'Autores de la colección: ' }];
	for (const [index, member] of members.entries()) {
		if (index > 0) parts.push({ kind: 'text', value: index === members.length - 1 ? ' y ' : ', ' });
		parts.push({ kind: 'author', value: member.authorName, authorId: member.authorId, hasAuthorshipExam: member.hasAuthorshipExam });
	}
	parts.push({ kind: 'text', value: '.' });
	return parts;
};

export const toPublicWorkMetadata = (work: CatalogWork): PublicWorkMetadata => {
	const hasReport = Boolean(work.reportId && work.reportSlug);
	const textAccess = work.textLinks.map(cloneTextAccessLink);
	const traditionalAuthorPublicIdByKey = authorPublicIdByKey(work.traditionalAttribution);

	return {
		id: work.id,
		publicId: work.publicId ?? null,
		asodatId: work.asodatId ?? null,
		slug: work.slug,
		title: work.title,
		displayTitle: formatDisplayWorkTitle(work.title),
		titleVariants: [...work.titleVariants],
		displayTitleVariants: work.titleVariants.map(formatDisplayWorkTitle),
		collectionSize: work.collectionSize ?? null,
		generalGenre: work.generalGenre?.trim() || 'Teatro',
		subgenre: work.genre,
		genre: work.genre,
		origin: work.origin,
		textState: work.textState,
		addedOn: work.addedOn,
		bitesoPublishedOn: work.bitesoPublishedOn ?? null,
		summaryPublishedOn: work.summaryPublishedOn ?? null,
		resultado1: resolveStylometryResult(work),
		flags: {
			inAuthorshipExam: work.inAuthorshipExam,
			hasSummary: work.hasSummaryFile,
			hasReport,
			hasTextAccess: textAccess.length > 0
		},
		traditionalAttributionText: formatAttribution(work.traditionalAttribution),
		traditionalAttributionPhrase: serializeAttributionPhrase(
			publicTraditionalAttributionParts(work),
			traditionalAuthorPublicIdByKey,
			work.inAuthorshipExam
		),
		stylometryAttributionText: formatAttribution(work.stylometryAttribution),
		traditionalAttribution: toPublicAttributionSet(work.traditionalAttribution),
		stylometryAttribution: toPublicAttributionSet(work.stylometryAttribution),
		resources: {
			asodat: getAsodatWorkUrl(work.asodatId) ?? null,
			work: `/obras/${work.slug}`,
			summary: work.hasSummaryFile ? `/obras/${work.slug}/resumen` : null,
			report: hasReport ? `/informes/${work.reportSlug}` : null,
			textAccess
		}
	};
};
