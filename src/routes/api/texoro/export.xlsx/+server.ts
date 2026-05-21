import ExcelJS from 'exceljs';
import { error } from '@sveltejs/kit';
import { formatAttribution, type AttributionSet } from '$lib/domain/catalog';
import { getServerTexoroEngine, searchTexoro } from '$lib/server/texoro-runtime';
import { buildWorkTitleSearchText, formatDisplayWorkTitle } from '$lib/utils/format-display-work-title';

import type { RequestHandler } from './$types';
import type {
	SearchBooleanMode,
	SearchExecution,
	SearchMatchOccurrence,
	SearchOptions,
	SearchProximityOrder,
	SearchResult,
	SearchResultMatch,
	StructuredSearchQuery
} from '$lib/search';

const CONTEXT_EXPORT_LIMIT = 300;
const RESULT_EXPORT_LIMIT = 100_000;
const SNIPPET_RADIUS = 115;
const LINE_CONTEXT = 3;
const SLOW_API_LOG_MS = 1_500;

interface SubmittedTermPayload {
	key: string;
	label: string;
	operator: string | null;
}

interface TexoroExportFilters {
	title: string;
	genres: string[];
	traditionalAuthorIds: string[];
	traditionalMatch: 'or' | 'and';
	stylometryAuthorIds: string[];
	stylometryMatch: 'or' | 'and';
	states: string[];
}

interface TexoroExportPayload {
	query: string;
	structuredQuery?: StructuredSearchQuery;
	terms: SubmittedTermPayload[];
	filters: TexoroExportFilters;
}

interface OccurrenceExportRow {
	result: SearchResult;
	match: SearchResultMatch;
	matchLabel: string;
	item: SearchMatchOccurrence;
}

const normalizeString = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

const normalizeStringList = (value: unknown, max = 80): string[] =>
	Array.isArray(value)
		? Array.from(new Set(value.map(normalizeString).filter(Boolean))).slice(0, max)
		: [];

const normalizeBooleanMode = (value: unknown): SearchBooleanMode =>
	value === 'any' ? 'any' : 'all';

const normalizeStructuredQuery = (value: unknown): StructuredSearchQuery | undefined => {
	if (!value || typeof value !== 'object') return undefined;
	const raw = value as Record<string, unknown>;
	const main = normalizeString(raw.main);
	if (!main) return undefined;

	return {
		main,
		additionalMode: normalizeBooleanMode(raw.additionalMode),
		additionalTerms: normalizeStringList(raw.additionalTerms, 9),
		proximityMode: normalizeBooleanMode(raw.proximityMode),
		proximityTerms: Array.isArray(raw.proximityTerms)
			? raw.proximityTerms
					.map((item) => {
						if (!item || typeof item !== 'object') return null;
						const rawTerm = item as Record<string, unknown>;
						const termValue = normalizeString(rawTerm.value);
						const distance =
							typeof rawTerm.distance === 'number' && Number.isFinite(rawTerm.distance)
								? Math.min(100, Math.max(0, Math.floor(rawTerm.distance)))
								: 5;
						const order: SearchProximityOrder =
							rawTerm.order === 'after' || rawTerm.order === 'before' ? rawTerm.order : 'any';
						return termValue ? { value: termValue, distance, order } : null;
					})
					.filter((item): item is NonNullable<typeof item> => Boolean(item))
					.slice(0, 9)
			: []
	};
};

const normalizeTerms = (value: unknown): SubmittedTermPayload[] =>
	Array.isArray(value)
		? value
				.map((item) => {
					if (!item || typeof item !== 'object') return null;
					const raw = item as Record<string, unknown>;
					const key = normalizeString(raw.key);
					const label = normalizeString(raw.label);
					const operator = raw.operator === null || typeof raw.operator === 'string' ? raw.operator : null;
					return key && label ? { key, label, operator } : null;
				})
				.filter((item): item is SubmittedTermPayload => Boolean(item))
				.slice(0, 40)
		: [];

const normalizeFilters = (value: unknown): TexoroExportFilters => {
	const raw = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
	return {
		title: normalizeString(raw.title),
		genres: normalizeStringList(raw.genres),
		traditionalAuthorIds: normalizeStringList(raw.traditionalAuthorIds),
		traditionalMatch: raw.traditionalMatch === 'and' ? 'and' : 'or',
		stylometryAuthorIds: normalizeStringList(raw.stylometryAuthorIds),
		stylometryMatch: raw.stylometryMatch === 'and' ? 'and' : 'or',
		states: normalizeStringList(raw.states)
	};
};

const normalizePayload = async (request: Request): Promise<TexoroExportPayload> => {
	const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
	const query = normalizeString(body?.query);
	if (!query) throw error(400, 'Consulta vacia');

	return {
		query,
		structuredQuery: normalizeStructuredQuery(body?.structuredQuery),
		terms: normalizeTerms(body?.terms),
		filters: normalizeFilters(body?.filters)
	};
};

const normalizeText = (value: string): string =>
	value
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.trim();

const formatCompactAttribution = (set: AttributionSet): string => {
	if (set.unresolved) return 'No determinada';
	const label = formatAttribution(set).trim();
	if (!label || label === 'Sin datos') return 'Sin datos';
	if (label === 'Autoria no determinada' || label === 'Autoría no determinada') return 'No determinada';
	return label;
};

const collectAuthorIds = (set: AttributionSet): Set<string> => {
	const authorIds = new Set<string>();
	if (set.unresolved) return authorIds;
	for (const group of set.groups) {
		for (const member of group.members) {
			const id = member.authorId?.trim();
			if (id) authorIds.add(id);
		}
	}
	return authorIds;
};

const matchesByMode = (haystack: Set<string>, selectedIds: string[], mode: 'or' | 'and'): boolean => {
	if (selectedIds.length === 0) return true;
	if (mode === 'and') return selectedIds.every((id) => haystack.has(id));
	return selectedIds.some((id) => haystack.has(id));
};

const collectStylometryAuthors = (result: SearchResult): string[] => {
	const set = result.meta?.stylometryAttribution;
	if (!set || set.unresolved) return [];
	const authorById = new Map<string, string>();
	for (const group of set.groups) {
		for (const member of group.members) {
			const id = member.authorId?.trim();
			const name = member.authorName?.trim();
			if (id && name && !authorById.has(id)) authorById.set(id, name);
		}
	}
	return Array.from(authorById.values());
};

const sumResultOccurrences = (result: SearchResult): number =>
	result.matches.reduce((sum, match) => sum + (match.occurrences ?? 0), 0);

const filterResults = (execution: SearchExecution, filters: TexoroExportFilters): SearchResult[] => {
	const normalizedTitle = normalizeText(filters.title);
	return execution.allResults
		.filter((result) => {
			const meta = result.meta;
			if (!meta) return false;
			if (normalizedTitle) {
				const haystack = normalizeText(buildWorkTitleSearchText(meta.title, meta.titleVariants));
				if (!haystack.includes(normalizedTitle)) return false;
			}
			if (filters.genres.length > 0 && !filters.genres.includes(meta.genre)) return false;
			if (
				!matchesByMode(
					collectAuthorIds(meta.traditionalAttribution),
					filters.traditionalAuthorIds,
					filters.traditionalMatch
				)
			) {
				return false;
			}
			if (
				!matchesByMode(
					collectAuthorIds(meta.stylometryAttribution),
					filters.stylometryAuthorIds,
					filters.stylometryMatch
				)
			) {
				return false;
			}
			if (filters.states.length > 0 && !filters.states.includes(meta.textState)) return false;
			return true;
		})
		.sort((a, b) => sumResultOccurrences(b) - sumResultOccurrences(a) || b.score - a.score || a.docId - b.docId)
		.slice(0, RESULT_EXPORT_LIMIT);
};

const keyForMatch = (match: Pick<SearchResultMatch, 'kind' | 'source'>): string => `${match.kind}:${match.source}`;

const defaultMatchLabel = (match: Pick<SearchResultMatch, 'kind' | 'source'>): string => {
	if (match.kind === 'phrase' && match.source.startsWith('"') && match.source.endsWith('"')) {
		return match.source.slice(1, -1);
	}
	return match.source;
};

const columnSafeLabel = (value: string): string => value.replace(/\s+/g, ' ').trim().slice(0, 120);

const buildMatchColumns = (terms: SubmittedTermPayload[], results: SearchResult[]): SubmittedTermPayload[] => {
	const byKey = new Map<string, SubmittedTermPayload>();
	for (const term of terms) byKey.set(term.key, term);
	for (const result of results) {
		for (const match of result.matches) {
			const key = keyForMatch(match);
			if (!byKey.has(key)) byKey.set(key, { key, label: defaultMatchLabel(match), operator: null });
		}
	}
	return Array.from(byKey.values());
};

const addWorksheetHeaderStyle = (worksheet: ExcelJS.Worksheet): void => {
	const header = worksheet.getRow(1);
	header.font = { bold: true, color: { argb: 'FFFFFFFF' } };
	header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0D3F91' } };
	header.alignment = { vertical: 'middle', wrapText: true };
	worksheet.views = [{ state: 'frozen', ySplit: 1 }];
	worksheet.autoFilter = {
		from: { row: 1, column: 1 },
		to: { row: 1, column: worksheet.columnCount || 1 }
	};
};

const setColumns = (worksheet: ExcelJS.Worksheet, columns: Array<{ header: string; key: string; width: number }>): void => {
	worksheet.columns = columns;
	addWorksheetHeaderStyle(worksheet);
};

const addKeyValueRows = (worksheet: ExcelJS.Worksheet, rows: Array<[string, string | number | boolean]>): void => {
	worksheet.columns = [
		{ header: 'Campo', key: 'field', width: 36 },
		{ header: 'Valor', key: 'value', width: 90 }
	];
	for (const [field, value] of rows) worksheet.addRow({ field, value });
	addWorksheetHeaderStyle(worksheet);
	worksheet.getColumn('value').alignment = { wrapText: true, vertical: 'top' };
};

const applyReadableCells = (worksheet: ExcelJS.Worksheet): void => {
	worksheet.eachRow((row, rowNumber) => {
		if (rowNumber === 1) return;
		row.alignment = { vertical: 'top', wrapText: true };
	});
};

const occurrencePosition = (item: SearchMatchOccurrence): string => {
	const start = item.tokenIndex;
	const end = item.tokenEndIndex ?? item.tokenIndex;
	const total = item.tokenCount;
	return start === end ? `palabra ${start} de ${total}` : `palabras ${start}-${end} de ${total}`;
};

const buildOccurrenceRows = async (results: SearchResult[], matchColumns: SubmittedTermPayload[]): Promise<OccurrenceExportRow[]> => {
	const engine = await getServerTexoroEngine();
	const rows: OccurrenceExportRow[] = [];
	const labelByKey = new Map(matchColumns.map((term) => [term.key, term.label]));

	for (const result of results) {
		if (rows.length >= CONTEXT_EXPORT_LIMIT) break;
		const matchOrder = new Map(matchColumns.map((term, index) => [term.key, index]));
		const matches = result.matches
			.slice()
			.sort(
				(a, b) =>
					(matchOrder.get(keyForMatch(a)) ?? Number.MAX_SAFE_INTEGER) -
						(matchOrder.get(keyForMatch(b)) ?? Number.MAX_SAFE_INTEGER) ||
					keyForMatch(a).localeCompare(keyForMatch(b), 'es')
			);

		for (const match of matches) {
			if (rows.length >= CONTEXT_EXPORT_LIMIT) break;
			const remaining = CONTEXT_EXPORT_LIMIT - rows.length;
			const details = await engine.getOccurrencesForMatch({ docId: result.docId, workId: result.workId }, match, {
				maxItems: remaining,
				snippetRadius: SNIPPET_RADIUS,
				snippetMode: 'lines',
				lineContext: LINE_CONTEXT
			});
			for (const item of details.items) {
				rows.push({
					result,
					match,
					matchLabel: labelByKey.get(keyForMatch(match)) ?? defaultMatchLabel(match),
					item
				});
				if (rows.length >= CONTEXT_EXPORT_LIMIT) break;
			}
		}
	}

	return rows;
};

const addResultsSheet = (
	workbook: ExcelJS.Workbook,
	results: SearchResult[],
	matchColumns: SubmittedTermPayload[]
): void => {
	const worksheet = workbook.addWorksheet('Resultados');
	setColumns(worksheet, [
		{ header: 'Orden', key: 'rank', width: 9 },
		{ header: 'Título', key: 'title', width: 38 },
		{ header: 'Género', key: 'genre', width: 20 },
		{ header: 'Estado textual', key: 'textState', width: 22 },
		{ header: 'Atribución tradicional', key: 'traditionalAttribution', width: 42 },
		{ header: 'Atribución estilométrica', key: 'stylometryAttribution', width: 42 },
		{ header: 'Total concurrencias', key: 'totalOccurrences', width: 20 },
		{ header: 'Palabras del texto', key: 'tokenCount', width: 18 },
		...matchColumns.map((term, index) => ({
			header: columnSafeLabel(term.label),
			key: `term_${index}`,
			width: 18
		}))
	]);

	results.forEach((result, index) => {
		const meta = result.meta;
		const countsByKey = new Map(result.matches.map((match) => [keyForMatch(match), match.occurrences ?? 0]));
		const row: Record<string, string | number> = {
			rank: index + 1,
			title: meta ? formatDisplayWorkTitle(meta.title) : 'Obra sin metadatos',
			genre: meta?.genre?.trim() || 'Sin género',
			textState: meta?.textState?.trim() || 'Sin estado',
			traditionalAttribution: meta ? formatCompactAttribution(meta.traditionalAttribution) : 'Sin datos',
			stylometryAttribution: meta ? formatCompactAttribution(meta.stylometryAttribution) : 'Sin datos',
			totalOccurrences: sumResultOccurrences(result),
			tokenCount: result.docTokenCount
		};
		matchColumns.forEach((term, termIndex) => {
			row[`term_${termIndex}`] = countsByKey.get(term.key) ?? 0;
		});
		worksheet.addRow(row);
	});
	applyReadableCells(worksheet);
};

const addOccurrencesSheet = (workbook: ExcelJS.Workbook, rows: OccurrenceExportRow[]): void => {
	const worksheet = workbook.addWorksheet('Concurrencias');
	setColumns(worksheet, [
		{ header: 'Orden', key: 'rank', width: 9 },
		{ header: 'Título', key: 'title', width: 38 },
		{ header: 'Término/condición', key: 'matchLabel', width: 28 },
		{ header: 'Tipo', key: 'kind', width: 15 },
		{ header: 'Posición', key: 'position', width: 24 },
		{ header: 'Contexto', key: 'snippet', width: 90 },
		{ header: 'Género', key: 'genre', width: 20 },
		{ header: 'Atribución tradicional', key: 'traditionalAttribution', width: 38 },
		{ header: 'Atribución estilométrica', key: 'stylometryAttribution', width: 38 }
	]);

	rows.forEach((row, index) => {
		const meta = row.result.meta;
		worksheet.addRow({
			rank: index + 1,
			title: meta ? formatDisplayWorkTitle(meta.title) : 'Obra sin metadatos',
			matchLabel: row.matchLabel,
			kind: row.match.kind === 'term' ? 'palabra/patrón' : row.match.kind === 'phrase' ? 'frase' : 'proximidad',
			position: occurrencePosition(row.item),
			snippet: row.item.snippet,
			genre: meta?.genre?.trim() || 'Sin género',
			traditionalAttribution: meta ? formatCompactAttribution(meta.traditionalAttribution) : 'Sin datos',
			stylometryAttribution: meta ? formatCompactAttribution(meta.stylometryAttribution) : 'Sin datos'
		});
	});
	applyReadableCells(worksheet);
};

const addQuerySheet = (
	workbook: ExcelJS.Workbook,
	payload: TexoroExportPayload,
	execution: SearchExecution,
	indexVersion: string,
	contextsTruncated: boolean
): void => {
	const worksheet = workbook.addWorksheet('Consulta');
	const query = payload.structuredQuery;
	const proximityDescription =
		query?.proximityTerms
			?.map((term) => `${term.value} | distancia ${term.distance} | orden ${term.order ?? 'any'}`)
			.join('; ') || 'Sin proximidad';

	addKeyValueRows(worksheet, [
		['Consulta técnica', payload.query],
		['Búsqueda principal', query?.main ?? payload.query],
		['Términos adicionales', query?.additionalTerms?.join('; ') || 'Sin términos adicionales'],
		['Modo términos adicionales', query?.additionalMode === 'any' ? 'Puede aparecer cualquiera' : 'Deben aparecer todos'],
		['Condiciones de proximidad', proximityDescription],
		['Modo proximidad', query?.proximityMode === 'any' ? 'Basta con una' : 'Todas las condiciones'],
		['Filtro título', payload.filters.title || 'Sin filtro'],
		['Filtro géneros', payload.filters.genres.join('; ') || 'Sin filtro'],
		['Filtro autoría tradicional', payload.filters.traditionalAuthorIds.join('; ') || 'Sin filtro'],
		['Modo autoría tradicional', payload.filters.traditionalMatch],
		['Filtro autoría estilométrica', payload.filters.stylometryAuthorIds.join('; ') || 'Sin filtro'],
		['Modo autoría estilométrica', payload.filters.stylometryMatch],
		['Filtro estados', payload.filters.states.join('; ') || 'Sin filtro'],
		['Versión del índice', indexVersion],
		['Avisos de consulta', execution.parsed.warnings.join('; ') || 'Sin avisos'],
		['Fecha de exportación', new Date().toISOString()],
		['Límite de contextos', CONTEXT_EXPORT_LIMIT],
		['Contextos truncados', contextsTruncated ? 'sí' : 'no'],
		[
			'Nota de derechos',
			'Por motivos de derechos de reproducción, la exportación incluye únicamente una muestra limitada de contextos. Para acceder a conjuntos completos de concurrencias, contacte con el equipo de ETSO.'
		]
	]);
};

const addSummarySheet = (
	workbook: ExcelJS.Workbook,
	results: SearchResult[],
	contextCount: number,
	contextsTruncated: boolean,
	indexVersion: string
): void => {
	const summary = workbook.addWorksheet('Resumen');
	const totalOccurrences = results.reduce((sum, result) => sum + sumResultOccurrences(result), 0);
	addKeyValueRows(summary, [
		['Total obras encontradas', results.length],
		['Total concurrencias', totalOccurrences],
		['Contextos incluidos', contextCount],
		['Contextos truncados', contextsTruncated ? 'sí' : 'no'],
		['Límite global de contextos', CONTEXT_EXPORT_LIMIT],
		['Versión del índice', indexVersion]
	]);
	summary.getColumn(3).width = 18;

	const genreRows = new Map<string, { works: number; occurrences: number }>();
	for (const result of results) {
		const label = result.meta?.genre?.trim() || 'Sin género';
		const current = genreRows.get(label) ?? { works: 0, occurrences: 0 };
		current.works += 1;
		current.occurrences += sumResultOccurrences(result);
		genreRows.set(label, current);
	}

	summary.addRow([]);
	const genreTitle = summary.addRow(['Distribución por género']);
	genreTitle.font = { bold: true, color: { argb: 'FF0D3F91' } };
	const genreHeader = summary.addRow(['Género', 'Obras', 'Concurrencias']);
	genreHeader.font = { bold: true };
	Array.from(genreRows.entries())
		.sort((a, b) => b[1].occurrences - a[1].occurrences || a[0].localeCompare(b[0], 'es'))
		.forEach(([label, values]) => summary.addRow([label, values.works, values.occurrences]));

	const authorRows = new Map<string, { works: number; occurrences: number }>();
	for (const result of results) {
		const authors = collectStylometryAuthors(result);
		const labels = authors.length > 0 ? authors : ['Sin atribución estilométrica'];
		const occurrencesShare = sumResultOccurrences(result) / labels.length;
		for (const label of labels) {
			const current = authorRows.get(label) ?? { works: 0, occurrences: 0 };
			current.works += 1;
			current.occurrences += occurrencesShare;
			authorRows.set(label, current);
		}
	}
	summary.addRow([]);
	const authorTitle = summary.addRow(['Distribución por autoría estilométrica']);
	authorTitle.font = { bold: true, color: { argb: 'FF0D3F91' } };
	const authorHeader = summary.addRow(['Autoría estilométrica', 'Obras', 'Concurrencias']);
	authorHeader.font = { bold: true };
	Array.from(authorRows.entries())
		.sort((a, b) => b[1].occurrences - a[1].occurrences || a[0].localeCompare(b[0], 'es'))
		.forEach(([label, values]) =>
			summary.addRow([label, values.works, Math.round(values.occurrences * 100) / 100])
		);
	applyReadableCells(summary);
};

export const POST: RequestHandler = async ({ request }) => {
	const startedAt = Date.now();
	const payload = await normalizePayload(request);
	const options: SearchOptions = {
		limit: 1,
		maxPhraseVerificationDocs: 220,
		snippetRadius: SNIPPET_RADIUS,
		includeSnippets: false,
		structuredQuery: payload.structuredQuery
	};

	try {
		const execution = await searchTexoro(payload.query, options);
		const engine = await getServerTexoroEngine();
		const indexVersion = engine.manifest?.indexVersion ?? 'n/d';
		const results = filterResults(execution, payload.filters);
		const matchColumns = buildMatchColumns(payload.terms, results);
		const occurrenceRows = await buildOccurrenceRows(results, matchColumns);
		const totalOccurrences = results.reduce((sum, result) => sum + sumResultOccurrences(result), 0);
		const contextsTruncated = totalOccurrences > occurrenceRows.length;

		const workbook = new ExcelJS.Workbook();
		workbook.creator = 'ETSO TEXORO';
		workbook.created = new Date();
		workbook.modified = new Date();
		workbook.properties.date1904 = false;

		addResultsSheet(workbook, results, matchColumns);
		addOccurrencesSheet(workbook, occurrenceRows);
		addQuerySheet(workbook, payload, execution, indexVersion, contextsTruncated);
		addSummarySheet(workbook, results, occurrenceRows.length, contextsTruncated, indexVersion);

		const buffer = await workbook.xlsx.writeBuffer();
		const elapsed = Date.now() - startedAt;
		if (elapsed >= SLOW_API_LOG_MS) {
			console.warn(`[api/texoro/export.xlsx] slow request: ${elapsed}ms`);
		}
		return new Response(buffer, {
			headers: {
				'content-type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
				'content-disposition': 'attachment; filename="texoro-resultados.xlsx"',
				'cache-control': 'no-store'
			}
		});
	} catch (cause) {
		console.error('[api/texoro/export.xlsx] Unable to export TEXORO results', cause);
		throw error(500, cause instanceof Error ? cause.message : 'No se pudo exportar la busqueda');
	}
};
