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

/** Alternate both researchers after filtering; joint works belong to Cuéllar's group. */
export const interleaveBibliographyAuthors = <T>(
	entries: readonly T[],
	authorFor: (entry: T) => string
): T[] => {
	const cuellar: T[] = [], vega: T[] = [], others: T[] = [];
	for (const entry of entries) {
		const author = authorFor(entry).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
		if (author.includes('cuellar')) cuellar.push(entry);
		else if (author.includes('vega garcia-luengos')) vega.push(entry);
		else others.push(entry);
	}
	const ordered: T[] = [];
	for (let i = 0; i < Math.max(cuellar.length, vega.length); i++) {
		if (i < cuellar.length) ordered.push(cuellar[i]);
		if (i < vega.length) ordered.push(vega[i]);
	}
	return [...ordered, ...others];
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
