import type { CatalogAuthor } from '$lib/domain/catalog';
import { SITE_URL } from '$lib/seo';

export interface PublicAuthorMetadata {
	id: number | null;
	key: string;
	name: string;
	nameVariants: string[];
	stylometryWorkPublicIds: number[];
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
	'stylometryWorkPublicIds',
	'resources'
] as const satisfies readonly (keyof PublicAuthorMetadata)[];

export const toPublicAuthorMetadata = (
	author: CatalogAuthor,
	stylometryWorkPublicIds: readonly number[] = []
): PublicAuthorMetadata => ({
	id: author.publicId,
	key: author.id,
	name: author.name,
	nameVariants: [...author.nameVariants],
	stylometryWorkPublicIds: [...stylometryWorkPublicIds],
	resources: {
		author: `/autores/${author.id}`,
		url: `${SITE_URL}/autores/${author.id}`
	}
});
