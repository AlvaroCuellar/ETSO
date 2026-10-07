import { error } from '@sveltejs/kit';
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

// Preserve old links with day precision while exposing the catalogue's month precision.
const parseMonthFilter = (value: string): string => {
	if (!value) return '';
	const match = /^(\d{4})-(\d{2})(?:-(\d{2}))?$/.exec(value);
	if (!match) throw error(400, 'Fecha de filtro inválida');
	const year = Number(match[1]);
	const month = Number(match[2]);
	const day = match[3] ? Number(match[3]) : null;
	const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
	if (year < 1 || month < 1 || month > 12 || (day !== null && (day < 1 || day > daysInMonth))) {
		throw error(400, 'Fecha de filtro inválida');
	}
	return `${match[1]}-${match[2]}`;
};

export const parseExamenFilters = (params: URLSearchParams): ExamenWorksFilters => {
	const rawFrom = parseString(params, 'desde');
	const rawTo = parseString(params, 'hasta');
	const desde = parseMonthFilter(rawFrom);
	const hasta = parseMonthFilter(rawTo);
	if (desde && hasta && (desde > hasta || (rawFrom.length === 10 && rawTo.length === 10 && rawFrom > rawTo))) {
		throw error(400, 'La fecha "hasta" debe ser mayor o igual que la fecha "desde".');
	}
	return {
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
		desde,
		hasta
	};
};
