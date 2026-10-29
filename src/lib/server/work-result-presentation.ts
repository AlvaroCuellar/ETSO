import { getAllAuthors, withWorkReportResults } from '$lib/server/catalog-runtime';
import type { CatalogWork } from '$lib/domain/catalog';
import type { AuthorReference } from '$lib/utils/traditional-attribution-phrase';

/** Use the same candidate catalog as reports, independently of attribution hypotheses. */
export const getWorkResultPresentation = async (
	work: CatalogWork
): Promise<{ work: CatalogWork; resultAuthors: AuthorReference[] }> => {
	if (!work.inAuthorshipExam) return { work, resultAuthors: [] };
	const [resultWork, authors] = await Promise.all([withWorkReportResults(work), getAllAuthors()]);
	const references: AuthorReference[] = authors.map((author) => ({
		authorId: author.id,
		authorName: author.name,
		hasAuthorshipExam: author.hasAuthorshipExam
	}));
	// Do not prune unmatched candidates: removing one side of an ambiguous name
	// could make a later render silently resolve that spelling to the other side.
	// Work fichas expose the primary conclusion only; report pages retain RESULTADO2.
	return { work: { ...resultWork, result2: undefined }, resultAuthors: references };
};
