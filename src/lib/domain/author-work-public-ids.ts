import type { AttributionSet, CatalogWork } from './catalog';

export const AUTHOR_WORK_PUBLIC_ID_FIELDS = [
	'relatedWorkPublicIds',
	'traditionalWorkPublicIds',
	'stylometryWorkPublicIds',
	'traditionalOnlyWorkPublicIds',
	'newStylometrySupportedWorkPublicIds'
] as const;

export type AuthorWorkPublicIds = {
	readonly [Field in (typeof AUTHOR_WORK_PUBLIC_ID_FIELDS)[number]]: readonly number[];
};

type AuthorWorkSets = {
	related: Set<number>;
	traditional: Set<number>;
	stylometry: Set<number>;
};

const attributionAuthorIds = (attribution: AttributionSet): Set<string> => {
	const authorIds = new Set<string>();
	if (!attribution.unresolved) {
		for (const group of attribution.groups) {
			for (const member of group.members) authorIds.add(member.authorId);
		}
	}
	return authorIds;
};

/** Public work IDs for the five categories shown on each author page. */
export const buildAuthorWorkPublicIdsByAuthor = (
	works: readonly CatalogWork[]
): ReadonlyMap<string, AuthorWorkPublicIds> => {
	const setsByAuthor = new Map<string, AuthorWorkSets>();
	for (const work of works) {
		if (!work.inAuthorshipExam) continue;
		const publicId = work.publicId;
		// Legacy catalogues may not have public IDs. Never substitute internal IDs.
		if (publicId === undefined || !Number.isSafeInteger(publicId) || publicId <= 0) continue;

		const addAssociations = (attribution: AttributionSet, kind: 'traditional' | 'stylometry') => {
			for (const authorId of attributionAuthorIds(attribution)) {
				let sets = setsByAuthor.get(authorId);
				if (!sets) {
					sets = { related: new Set(), traditional: new Set(), stylometry: new Set() };
					setsByAuthor.set(authorId, sets);
				}
				sets.related.add(publicId);
				sets[kind].add(publicId);
			}
		};

		addAssociations(work.traditionalAttribution, 'traditional');
		addAssociations(work.stylometryAttribution, 'stylometry');
	}

	return new Map(Array.from(setsByAuthor, ([authorId, sets]) => {
		const relatedWorkPublicIds = [...sets.related];
		return [authorId, {
			relatedWorkPublicIds,
			traditionalWorkPublicIds: [...sets.traditional],
			stylometryWorkPublicIds: [...sets.stylometry],
			traditionalOnlyWorkPublicIds: relatedWorkPublicIds.filter((id) => !sets.stylometry.has(id)),
			newStylometrySupportedWorkPublicIds: relatedWorkPublicIds.filter((id) => !sets.traditional.has(id))
		}];
	}));
};
