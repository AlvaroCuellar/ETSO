import type { ExamenWorksFilters, ExamenWorksMatchMode } from '$lib/server/catalog-runtime';

export const EXAMEN_PAGE_SIZE = 20;

const parseString = (params: URLSearchParams, key: string): string => params.get(key)?.trim() ?? '';

const parseList = (params: URLSearchParams, key: string): string[] =>
	params
		.getAll(key)
		.map((value) => value.trim())
		.filter(Boolean);

const parseMatchMode = (params: URLSearchParams, key: string): ExamenWorksMatchMode =>
	params.get(key) === 'and' ? 'and' : 'or';

export const parseExamenPage = (params: URLSearchParams): number => {
	const raw = Number.parseInt(params.get('page') ?? '1', 10);
	return Number.isFinite(raw) && raw > 0 ? raw : 1;
};

export const parseExamenFilters = (params: URLSearchParams): ExamenWorksFilters => ({
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
