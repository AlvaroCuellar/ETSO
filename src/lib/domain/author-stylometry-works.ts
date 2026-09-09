import type { CatalogWork } from './catalog';

/** Public work IDs for the same associations shown on the author page. */
export const buildStylometryWorkPublicIdsByAuthor = (
	works: readonly CatalogWork[]
): ReadonlyMap<string, readonly number[]> => {
	const idsByAuthor = new Map<string, Set<number>>();
	for (const work of works) {
		if (!work.inAuthorshipExam || work.stylometryAttribution.unresolved) continue;
		const publicId = work.publicId;
		// Legacy catalogues may not have public IDs. Never substitute internal IDs.
		if (publicId === undefined || !Number.isSafeInteger(publicId) || publicId <= 0) continue;

		for (const group of work.stylometryAttribution.groups) {
			for (const member of group.members) {
				const ids = idsByAuthor.get(member.authorId) ?? new Set<number>();
				ids.add(publicId);
				idsByAuthor.set(member.authorId, ids);
			}
		}
	}
	return new Map(Array.from(idsByAuthor, ([authorId, ids]) => [authorId, [...ids]]));
};
