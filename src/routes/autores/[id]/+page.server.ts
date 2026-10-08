import { error, redirect } from '@sveltejs/kit';
import { setPublicCatalogCacheHeaders } from '$lib/server/cache-control';
import { localizePath } from '$lib/i18n';
import { buildWorkTitleSearchText } from '$lib/utils/format-display-work-title';
import {
	getAuthorById,
	getAuthorByPublicId,
	getAuthorMetrics,
	getAuthorWorks
} from '$lib/server/catalog-runtime';

import type { PageServerLoad } from './$types';

const PAGE_SIZE = 50;
const FILTER_KEYS = ['related_any', 'trad_any', 'etso_yes', 'only_trad', 'only_etso'] as const;

const normalizeText = (value: string): string =>
	value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

export const load: PageServerLoad = async ({ locals, params, url, setHeaders }) => {
	const author = await getAuthorById(params.id);
	if (!author) {
		const publicId = /^\d+$/.test(params.id) ? Number.parseInt(params.id, 10) : null;
		const publicIdAuthor = publicId === null ? undefined : await getAuthorByPublicId(publicId);
		if (publicIdAuthor?.hasAuthorshipExam) {
			throw redirect(308, localizePath(`/autores/${publicIdAuthor.id}${url.search}`, locals.locale));
		}
		throw error(404, 'Autor no encontrado');
	}

	if (!author.hasAuthorshipExam) throw error(404, 'Autor sin obras en Examen de autorías');

	const [works, metrics] = await Promise.all([getAuthorWorks(author.id), getAuthorMetrics(author.id)]);

	const rawFilter = url.searchParams.get('filter');
	const filter = FILTER_KEYS.find((key) => key === rawFilter) ?? 'related_any';
	const title = (url.searchParams.get('title') ?? '').trim();
	const genre = (url.searchParams.get('genre') ?? '').trim();
	const normalizedTitle = normalizeText(title);
	const normalizedGenre = normalizeText(genre);
	const filteredWorks = works.filter((relation) => {
		const flags = {
			related_any: true,
			trad_any: relation.inTraditional,
			etso_yes: relation.inStylometry,
			only_trad: relation.inTraditional && !relation.inStylometry,
			only_etso: !relation.inTraditional && relation.inStylometry
		};
		return (
			flags[filter]
			&& (!normalizedTitle || normalizeText(
				buildWorkTitleSearchText(relation.work.title, relation.work.titleVariants)
			).includes(normalizedTitle))
			&& (!normalizedGenre || normalizeText(relation.work.genre) === normalizedGenre)
		);
	});
	const totalPages = Math.max(1, Math.ceil(filteredWorks.length / PAGE_SIZE));
	const rawPage = url.searchParams.get('page') ?? '1';
	const requestedPage = /^\d+$/.test(rawPage) ? Number(rawPage) : 1;
	const page = Math.min(totalPages, Math.max(1, requestedPage));
	const start = (page - 1) * PAGE_SIZE;
	const canonicalParams = new URLSearchParams();
	if (filter !== 'related_any') canonicalParams.set('filter', filter);
	if (title) canonicalParams.set('title', title);
	if (genre) canonicalParams.set('genre', genre);
	if (page > 1) canonicalParams.set('page', String(page));
	const canonicalQuery = canonicalParams.toString();

	setPublicCatalogCacheHeaders(setHeaders);
	return {
		author,
		works: filteredWorks.slice(start, start + PAGE_SIZE),
		metrics,
		genreOptions: Array.from(new Set(works.map((relation) => relation.work.genre)))
			.sort((a, b) => a.localeCompare(b)),
		filters: { filter, title, genre },
		hasFilters: filter !== 'related_any' || Boolean(title || genre),
		pagination: {
			page,
			totalPages,
			totalResults: filteredWorks.length,
			start: filteredWorks.length ? start + 1 : 0,
			end: Math.min(start + PAGE_SIZE, filteredWorks.length)
		},
		canonicalPath: `/autores/${author.id}${canonicalQuery ? `?${canonicalQuery}` : ''}`
	};
};
