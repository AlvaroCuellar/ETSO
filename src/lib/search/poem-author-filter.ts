import type { SearchResultMatch } from './types';

export const normalizePoemAuthorFilter = (value: unknown): SearchResultMatch['poemAuthorFilter'] => {
	if (!value || typeof value !== 'object') return undefined;
	const raw = value as Record<string, unknown>;
	const authorIds = Array.isArray(raw.authorIds)
		? Array.from(new Set(raw.authorIds.filter((id): id is string => typeof id === 'string')
			.map((id) => id.trim()).filter(Boolean))).slice(0, 1000)
		: [];
	return authorIds.length ? { authorIds, match: raw.match === 'and' ? 'and' : 'or' } : undefined;
};
