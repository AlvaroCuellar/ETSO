import type { AttributionSet } from './catalog.ts';

export interface RelatedBibliographyRule {
	id: string;
	workIds?: readonly string[];
	authorIds?: readonly string[];
	entryKeys: readonly string[];
}

interface RelatedBibliographyWork {
	id: string;
	traditionalAttribution: AttributionSet;
	stylometryAttribution: AttributionSet;
}

/** Earlier sections take priority; retain each reference only at its first occurrence. */
export const deduplicateBibliographySections = <T extends { entries: { id: string }[] }>(
	sections: readonly T[]
): T[] => {
	const seen = new Set<string>();
	return sections.map((section) => ({
		...section,
		entries: section.entries.filter((entry) => {
			if (seen.has(entry.id)) return false;
			seen.add(entry.id);
			return true;
		})
	})).filter((section) => section.entries.length > 0);
};

/** Preserve editorial order and remove every entry already displayed in the report. */
export const getRemainingBibliographyKeys = (
	allKeys: readonly string[],
	shownKeys: readonly string[]
): string[] => {
	const shown = new Set(shownKeys);
	return [...new Set(allKeys)].filter((key) => !shown.has(key));
};

/** Matches declared attributions, including alternatives and collaborations, never neighbours. */
export const getRelatedBibliographyKeys = (
	work: RelatedBibliographyWork,
	rules: readonly RelatedBibliographyRule[]
): string[] => {
	const authors = new Set(
		[work.traditionalAttribution, work.stylometryAttribution].flatMap((set) =>
			set.groups.flatMap((group) => group.members.map((member) => member.authorId))
		)
	);
	const keys = new Set<string>();
	for (const rule of rules) {
		if (!rule.workIds?.includes(work.id) && !rule.authorIds?.some((id) => authors.has(id))) continue;
		for (const key of rule.entryKeys) keys.add(key);
	}
	return [...keys];
};
