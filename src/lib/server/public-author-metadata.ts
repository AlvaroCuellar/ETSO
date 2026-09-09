import type { CatalogAuthor } from '$lib/domain/catalog';
import { AUTHOR_WORK_PUBLIC_ID_FIELDS, type AuthorWorkPublicIds } from '$lib/domain/author-work-public-ids';
import { SITE_URL } from '$lib/seo';

export interface PublicAuthorMetadata extends AuthorWorkPublicIds {
	id: number | null;
	key: string;
	name: string;
	nameVariants: string[];
	resources: {
		author: string;
		url: string;
	};
}

export const PUBLIC_AUTHOR_METADATA_FIELDS = [
	'id',
	'key',
	'name',
	'nameVariants',
	...AUTHOR_WORK_PUBLIC_ID_FIELDS,
	'resources'
] as const satisfies readonly (keyof PublicAuthorMetadata)[];

export const includesAuthorWorkPublicIds = (
	fields: readonly (keyof PublicAuthorMetadata)[] | null
): boolean => fields === null || AUTHOR_WORK_PUBLIC_ID_FIELDS.some((field) => fields.includes(field));

export const toPublicAuthorMetadata = (
	author: CatalogAuthor,
	workPublicIds?: AuthorWorkPublicIds
): PublicAuthorMetadata => ({
	id: author.publicId,
	key: author.id,
	name: author.name,
	nameVariants: [...author.nameVariants],
	relatedWorkPublicIds: [...(workPublicIds?.relatedWorkPublicIds ?? [])],
	traditionalWorkPublicIds: [...(workPublicIds?.traditionalWorkPublicIds ?? [])],
	stylometryWorkPublicIds: [...(workPublicIds?.stylometryWorkPublicIds ?? [])],
	traditionalOnlyWorkPublicIds: [...(workPublicIds?.traditionalOnlyWorkPublicIds ?? [])],
	stylometryOnlyWorkPublicIds: [...(workPublicIds?.stylometryOnlyWorkPublicIds ?? [])],
	resources: {
		author: `/autores/${author.id}`,
		url: `${SITE_URL}/autores/${author.id}`
	}
});
