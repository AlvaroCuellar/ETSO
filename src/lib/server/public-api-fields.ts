import { error } from '@sveltejs/kit';

import type { PublicWorkMetadata } from './public-work-metadata';

const workMetadataFieldAllowlist = {
	id: true,
	publicId: true,
	slug: true,
	title: true,
	displayTitle: true,
	titleVariants: true,
	displayTitleVariants: true,
	genre: true,
	origin: true,
	textState: true,
	addedOn: true,
	bitesoPublishedOn: true,
	summaryPublishedOn: true,
	resultado1: true,
	flags: true,
	traditionalAttributionText: true,
	traditionalAttributionPhrase: true,
	stylometryAttributionText: true,
	traditionalAttribution: true,
	stylometryAttribution: true,
	resources: true
} satisfies Record<keyof PublicWorkMetadata, true>;

export const PUBLIC_WORK_METADATA_FIELDS: readonly (keyof PublicWorkMetadata)[] = Object.keys(
	workMetadataFieldAllowlist
) as (keyof PublicWorkMetadata)[];

/** Validate top-level public fields before loading the catalog. */
export const parsePublicApiFields = <Field extends string>(
	value: string | null,
	allowedFields: readonly Field[]
): Field[] | null => {
	if (value === null) return null;

	const fields = value.split(',').map((field) => field.trim());
	const allowed = new Set<string>(allowedFields);
	if (fields.some((field) => !field || !allowed.has(field))) {
		throw error(
			400,
			`Parámetro fields inválido. Campos permitidos: ${allowedFields.join(', ')}.`
		);
	}

	return [...new Set(fields)] as Field[];
};

/** Apply only to an already serialized public record, never a raw catalog record. */
export const projectPublicApiFields = <Metadata extends object>(
	metadata: Metadata,
	fields: readonly (keyof Metadata)[] | null
): Metadata | Partial<Metadata> => {
	if (fields === null) return metadata;
	return Object.fromEntries(fields.map((field) => [field, metadata[field]])) as Partial<Metadata>;
};
