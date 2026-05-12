import {
	getAllAuthors,
	getAllWorks,
	getCatalogStats,
	listGenres
} from '$lib/server/catalog-runtime';
import {
	inferWorkAuthorshipType,
	type AttributionSet,
	type CatalogWork,
	type Confidence,
	type WorkAuthorshipType
} from '$lib/domain/catalog';

import type { PageServerLoad } from './$types';

const PAGE_SIZE = 20;

type MatchMode = 'or' | 'and';

interface ExamenFilters {
	titulo: string;
	genero: string[];
	autor: string[];
	tipo_autoria: string[];
	autor_trad: string[];
	autor_trad_match: MatchMode;
	autor_esto: string[];
	autor_esto_match: MatchMode;
	confianza: string[];
	estado: string[];
	desde: string;
	hasta: string;
}

const parseString = (params: URLSearchParams, key: string): string => params.get(key)?.trim() ?? '';

const parseList = (params: URLSearchParams, key: string): string[] =>
	params
		.getAll(key)
		.map((value) => value.trim())
		.filter(Boolean);

const parseMatchMode = (params: URLSearchParams, key: string): MatchMode =>
	params.get(key) === 'and' ? 'and' : 'or';

const parsePage = (params: URLSearchParams): number => {
	const raw = Number.parseInt(params.get('page') ?? '1', 10);
	return Number.isFinite(raw) && raw > 0 ? raw : 1;
};

const parseFilters = (params: URLSearchParams): ExamenFilters => ({
	titulo: parseString(params, 'titulo'),
	genero: parseList(params, 'genero'),
	autor: parseList(params, 'autor'),
	tipo_autoria: parseList(params, 'tipo_autoria'),
	autor_trad: parseList(params, 'autor_trad'),
	autor_trad_match: parseMatchMode(params, 'autor_trad_match'),
	autor_esto: parseList(params, 'autor_esto'),
	autor_esto_match: parseMatchMode(params, 'autor_esto_match'),
	confianza: parseList(params, 'confianza'),
	estado: parseList(params, 'estado'),
	desde: parseString(params, 'desde'),
	hasta: parseString(params, 'hasta')
});

const normalizeText = (value: string): string =>
	value
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.trim();

const parseYearMonth = (value: string): number | null => {
	const match = value.match(/(\d{4})[/-](\d{1,2})/);
	if (!match) return null;
	const year = Number(match[1]);
	const month = Number(match[2]);
	if (!Number.isInteger(year) || !Number.isInteger(month)) return null;
	if (month < 1 || month > 12) return null;
	return year * 100 + month;
};

const asWorkAuthorshipType = (value: string): WorkAuthorshipType | null => {
	if (value === 'unica' || value === 'colaboracion' || value === 'desconocida') return value;
	return null;
};

const collectAuthorIds = (set: AttributionSet): Set<string> => {
	const authorIds = new Set<string>();
	if (set.unresolved) return authorIds;

	for (const group of set.groups) {
		for (const member of group.members) {
			if (!member.authorId) continue;
			authorIds.add(member.authorId);
		}
	}
	return authorIds;
};

const matchesByMode = (haystack: Set<string>, selectedIds: string[], matchMode: MatchMode): boolean => {
	if (selectedIds.length === 0) return true;
	if (matchMode === 'and') return selectedIds.every((candidate) => haystack.has(candidate));
	return selectedIds.some((candidate) => haystack.has(candidate));
};

const matchesMainAuthors = (work: CatalogWork, selectedIds: string[]): boolean => {
	if (selectedIds.length === 0) return true;
	const all = new Set<string>();
	for (const authorId of collectAuthorIds(work.traditionalAttribution)) all.add(authorId);
	for (const authorId of collectAuthorIds(work.stylometryAttribution)) all.add(authorId);
	return selectedIds.some((candidate) => all.has(candidate));
};

const matchesConfidence = (work: CatalogWork, selectedValues: string[]): boolean => {
	if (selectedValues.length === 0) return true;
	if (work.stylometryAttribution.unresolved) return false;

	const values = new Set<Confidence>();
	for (const group of work.stylometryAttribution.groups) {
		for (const member of group.members) {
			if (member.confidence) values.add(member.confidence);
		}
	}
	return selectedValues.some((selectedValue) => values.has(selectedValue as Confidence));
};

const matchesDateRange = (work: CatalogWork, filters: ExamenFilters): boolean => {
	const workYearMonth = parseYearMonth(work.addedOn);
	if (!workYearMonth) return true;

	const fromYearMonth = parseYearMonth(filters.desde);
	const toYearMonth = parseYearMonth(filters.hasta);

	if (fromYearMonth && workYearMonth < fromYearMonth) return false;
	if (toYearMonth && workYearMonth > toYearMonth) return false;
	return true;
};

const filterWorks = (works: CatalogWork[], filters: ExamenFilters): CatalogWork[] => {
	const normalizedTitle = normalizeText(filters.titulo);
	const mainAuthorDisabled = filters.autor_trad.length > 0 || filters.autor_esto.length > 0;
	const effectiveMainAuthors = mainAuthorDisabled ? [] : filters.autor;
	const selectedAuthorshipValues = filters.tipo_autoria
		.map((value) => asWorkAuthorshipType(value))
		.filter((value): value is WorkAuthorshipType => value !== null);
	const hasValidDateRange = !filters.desde || !filters.hasta || filters.desde <= filters.hasta;

	return works.filter((work) => {
		if (normalizedTitle) {
			const haystack = normalizeText([work.title, ...work.titleVariants].join(' '));
			if (!haystack.includes(normalizedTitle)) return false;
		}

		if (filters.genero.length > 0 && !filters.genero.includes(work.genre)) return false;
		if (!matchesMainAuthors(work, effectiveMainAuthors)) return false;
		if (!matchesByMode(collectAuthorIds(work.traditionalAttribution), filters.autor_trad, filters.autor_trad_match)) {
			return false;
		}
		if (!matchesByMode(collectAuthorIds(work.stylometryAttribution), filters.autor_esto, filters.autor_esto_match)) {
			return false;
		}
		if (!matchesConfidence(work, filters.confianza)) return false;

		if (selectedAuthorshipValues.length > 0) {
			const inferred = inferWorkAuthorshipType(work);
			if (!selectedAuthorshipValues.includes(inferred)) return false;
		}

		if (filters.estado.length > 0 && !filters.estado.includes(work.textState)) return false;
		if (hasValidDateRange && !matchesDateRange(work, filters)) return false;

		return true;
	});
};

export const load: PageServerLoad = async ({ url }) => {
	const [works, authorOptions, genreOptions, stats] = await Promise.all([
		getAllWorks(),
		getAllAuthors(),
		listGenres(),
		getCatalogStats()
	]);
	const filters = parseFilters(url.searchParams);
	const filteredWorks = filterWorks(works, filters);
	const totalResults = filteredWorks.length;
	const totalPages = Math.max(1, Math.ceil(totalResults / PAGE_SIZE));
	const requestedPage = parsePage(url.searchParams);
	const page = Math.min(requestedPage, totalPages);
	const start = (page - 1) * PAGE_SIZE;
	const pagedWorks = filteredWorks.slice(start, start + PAGE_SIZE);
	const stateOptions = Array.from(new Set(works.map((work) => work.textState).filter(Boolean))).sort((a, b) =>
		a.localeCompare(b, 'es')
	);

	return {
		works: pagedWorks,
		authorOptions,
		genreOptions,
		stateOptions,
		stats,
		filters,
		page,
		pageSize: PAGE_SIZE,
		totalPages,
		totalResults
	};
};
