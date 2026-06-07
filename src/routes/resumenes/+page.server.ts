import type { PageServerLoad } from './$types';

interface SummaryListWork {
	slug: string;
	title: string;
	titleVariants: string[];
	titleSearchText: string;
	traditional: string;
	genre: string;
}

export const load: PageServerLoad = async () => ({
	works: [] as SummaryListWork[]
});
