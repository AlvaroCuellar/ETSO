import type { AttributionSet } from '$lib/domain/catalog';
import type { SearchResult } from '$lib/search/types';

export type ResultSort = 'occurrences' | 'traditional' | 'stylometry' | 'genre' | 'state';
export type ResultSortDirection = 'asc' | 'desc';

export const normalizeResultSort = (value: unknown): ResultSort => {
	if (
		value === 'traditional' ||
		value === 'stylometry' ||
		value === 'genre' ||
		value === 'state'
	) {
		return value;
	}
	return 'occurrences';
};

export const normalizeResultSortDirection = (
	value: unknown,
	sort: ResultSort
): ResultSortDirection => {
	if (value === 'asc' || value === 'desc') return value;
	return sort === 'occurrences' ? 'desc' : 'asc';
};

export const resultSortLabel = (sort: ResultSort): string => {
	if (sort === 'traditional') return 'Atribución tradicional';
	if (sort === 'stylometry') return 'Atribución estilométrica';
	if (sort === 'genre') return 'Género';
	if (sort === 'state') return 'Estado del texto';
	return 'Número de ocurrencias';
};

export const resultSortDirectionLabel = (
	sort: ResultSort,
	direction: ResultSortDirection
): string => {
	if (sort === 'occurrences') return direction === 'desc' ? 'Mayor a menor' : 'Menor a mayor';
	return direction === 'asc' ? 'A–Z' : 'Z–A';
};

const sumOccurrences = (result: SearchResult): number =>
	result.matches.reduce((sum, match) => sum + (match.occurrences ?? 0), 0);

const attributionSortValue = (set: AttributionSet | undefined, collator: Intl.Collator): string | null => {
	if (!set || set.unresolved) return null;
	const names = new Set<string>();
	for (const group of set.groups) {
		for (const member of group.members) {
			const name = member.authorName.trim();
			if (name) names.add(name);
		}
	}
	if (names.size === 0) return null;
	return Array.from(names).sort(collator.compare).join('\u0000');
};

const compareOptionalText = (
	left: string | null | undefined,
	right: string | null | undefined,
	collator: Intl.Collator,
	direction: ResultSortDirection = 'asc'
): number => {
	const leftValue = left?.trim() || null;
	const rightValue = right?.trim() || null;
	if (leftValue === null && rightValue === null) return 0;
	if (leftValue === null) return 1;
	if (rightValue === null) return -1;
	return collator.compare(leftValue, rightValue) * (direction === 'asc' ? 1 : -1);
};

export const sortSearchResults = (
	results: readonly SearchResult[],
	sort: ResultSort,
	direction: ResultSortDirection,
	locale = 'es'
): SearchResult[] => {
	const collator = new Intl.Collator(locale, { sensitivity: 'base', numeric: true });
	return [...results].sort((left, right) => {
		if (sort === 'occurrences') {
			return (
				(sumOccurrences(left) - sumOccurrences(right)) * (direction === 'asc' ? 1 : -1) ||
				right.score - left.score ||
				left.docId - right.docId
			);
		}

		let selectedComparison = 0;
		if (sort === 'traditional') {
			selectedComparison = compareOptionalText(
				attributionSortValue(left.meta?.traditionalAttribution, collator),
				attributionSortValue(right.meta?.traditionalAttribution, collator),
				collator,
				direction
			);
		} else if (sort === 'stylometry') {
			selectedComparison = compareOptionalText(
				attributionSortValue(left.meta?.stylometryAttribution, collator),
				attributionSortValue(right.meta?.stylometryAttribution, collator),
				collator,
				direction
			);
		} else if (sort === 'genre') {
			selectedComparison = compareOptionalText(left.meta?.genre, right.meta?.genre, collator, direction);
		} else {
			selectedComparison = compareOptionalText(left.meta?.textState, right.meta?.textState, collator, direction);
		}

		return (
			selectedComparison ||
			compareOptionalText(left.meta?.title, right.meta?.title, collator) ||
			sumOccurrences(right) - sumOccurrences(left) ||
			right.score - left.score ||
			left.docId - right.docId
		);
	});
};
