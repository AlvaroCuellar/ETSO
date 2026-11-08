import { parseStructuredQuery } from './query';
import type { StructuredSearchQuery } from './types';

export const canSearchWithFrequencies = (
	query: StructuredSearchQuery,
	traditionalAuthorIds: readonly string[],
	preserveEnie = true
): boolean => {
	// An author filter can count only the poems of that author within a collection.
	if (traditionalAuthorIds.length > 0) return false;
	const { groups, warnings } = parseStructuredQuery(query, preserveEnie);
	return warnings.length === 0 && groups.length > 0 &&
		groups.every((group) => group.every((clause) => clause.kind === 'term'));
};
