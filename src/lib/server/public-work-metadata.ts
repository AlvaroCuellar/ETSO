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

export interface PublicWorkMetadata {
	id: string;
	slug: string;
	title: string;
	titleVariants: string[];
	genre: string;
	origin: string;
	textState: string;
	addedOn: string;
	flags: PublicWorkMetadataFlags;
	traditionalAttribution: AttributionSet;
	stylometryAttribution: AttributionSet;
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

export const toPublicWorkMetadata = (work: CatalogWork): PublicWorkMetadata => {
	const hasReport = Boolean(work.reportId && work.reportSlug);
	const textAccess = work.textLinks.map(cloneTextAccessLink);

	return {
		id: work.id,
		slug: work.slug,
		title: work.title,
		titleVariants: [...work.titleVariants],
		genre: work.genre,
		origin: work.origin,
		textState: work.textState,
		addedOn: work.addedOn,
		flags: {
			inAuthorshipExam: work.inAuthorshipExam,
			hasSummary: work.hasSummaryFile,
			hasReport,
			hasTextAccess: textAccess.length > 0
		},
		traditionalAttribution: work.traditionalAttribution,
		stylometryAttribution: work.stylometryAttribution,
		resources: {
			work: `/obras/${work.slug}`,
			summary: work.hasSummaryFile ? `/obras/${work.slug}/resumen` : null,
			report: hasReport ? `/informes/${work.reportSlug}` : null,
			textAccess
		}
	};
};
