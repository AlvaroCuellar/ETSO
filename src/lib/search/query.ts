import type { ParsedQuery, ParsedQueryClause } from './types';
import { normalizePattern } from './normalize';
import type { ParsedQueryPhrase, ParsedQueryTerm } from './types';
import type { SearchBooleanMode, SearchProximityOrder, StructuredSearchQuery } from './types';

type StructuredAdditionalTerm = NonNullable<StructuredSearchQuery['additionalTerms']>[number];

export type StructuredSearchInputClause =
	| { kind: 'term'; value: string; operator?: 'and' | 'or' | null }
	| { kind: 'phrase'; value: string; operator?: 'and' | 'or' | null }
	| { kind: 'proximity'; value: string; distance: number; operator?: 'near'; order?: SearchProximityOrder };

interface QueryToken {
	type: 'word' | 'phrase';
	value: string;
}

const lexQuery = (input: string): QueryToken[] => {
	const tokens: QueryToken[] = [];
	let cursor = 0;

	while (cursor < input.length) {
		const current = input[cursor];
		if (/\s/.test(current)) {
			cursor += 1;
			continue;
		}

		if (current === '"') {
			const start = cursor + 1;
			let end = input.indexOf('"', start);
			if (end === -1) end = input.length;
			tokens.push({ type: 'phrase', value: input.slice(start, end) });
			cursor = end + 1;
			continue;
		}

		let end = cursor;
		while (end < input.length && !/\s/.test(input[end])) end += 1;
		tokens.push({ type: 'word', value: input.slice(cursor, end) });
		cursor = end;
	}

	return tokens;
};

const isOrToken = (token: QueryToken): boolean => token.type === 'word' && token.value.toUpperCase() === 'OR';
const isAndToken = (token: QueryToken): boolean => token.type === 'word' && token.value.toUpperCase() === 'AND';

export const phraseToClause = (value: string, preserveEnie: boolean): ParsedQueryPhrase | null => {
	const patterns = value
		.split(/\s+/)
		.map((part) => normalizePattern(part, preserveEnie))
		.filter((part) => part.length > 0);
	if (patterns.length === 0) return null;
	return {
		kind: 'phrase',
		patterns,
		literal: value
	};
};

export const wordToClause = (value: string, preserveEnie: boolean): ParsedQueryTerm | null => {
	const pattern = normalizePattern(value, preserveEnie);
	if (!pattern) return null;
	return {
		kind: 'term',
		pattern
	};
};

const valueToClause = (value: string, preserveEnie: boolean): ParsedQueryTerm | ParsedQueryPhrase | null => {
	const normalized = value.trim().replace(/\s+/g, ' ');
	if (!normalized) return null;
	return /\s/.test(normalized) ? phraseToClause(normalized, preserveEnie) : wordToClause(normalized, preserveEnie);
};

const normalizeBooleanMode = (value: SearchBooleanMode | undefined): SearchBooleanMode =>
	value === 'any' ? 'any' : 'all';

const normalizeProximityOrder = (value: SearchProximityOrder | undefined): SearchProximityOrder =>
	value === 'before' || value === 'after' ? value : 'any';

const normalizeDistance = (value: number): number =>
	Math.min(100, Math.max(0, Number.isFinite(value) ? Math.floor(value) : 5));

const expandStructuredOptions = (
	options: string[][][],
	mainClause: ParsedQueryClause,
	preserveEnie: boolean,
	warnings: string[]
): ParsedQueryClause[][] => {
	const groups: ParsedQueryClause[][] = [];

	for (const option of options) {
		let optionGroups: ParsedQueryClause[][] = [[]];
		for (const condition of option) {
			const alternatives: ParsedQueryClause[] = [];
			for (const value of condition) {
				const clause = valueToClause(value, preserveEnie);
				if (!clause) {
					warnings.push(`No se pudo interpretar: ${value}`);
					continue;
				}
				alternatives.push(clause);
			}
			if (alternatives.length === 0) continue;
			optionGroups = optionGroups.flatMap((group) =>
				alternatives.map((alternative) => [...group, alternative])
			);
		}
		groups.push(...optionGroups.filter((group) => group.length > 0).map((group) => [mainClause, ...group]));
	}

	return groups;
};

const combineGroups = (
	groups: ParsedQueryClause[][],
	clauses: ParsedQueryClause[],
	mode: SearchBooleanMode
): ParsedQueryClause[][] => {
	if (clauses.length === 0) return groups;
	if (mode === 'all') return groups.map((group) => [...group, ...clauses]);
	return groups.flatMap((group) => clauses.map((clause) => [...group, clause]));
};

const structuredAdditionalValue = (item: StructuredAdditionalTerm): string =>
	typeof item === 'string' ? item : item.value;

const structuredAdditionalOperator = (
	item: StructuredAdditionalTerm
): 'and' | 'or' => (typeof item === 'string' ? 'and' : item.operator === 'or' ? 'or' : 'and');

export const parseSearchQuery = (input: string, preserveEnie: boolean): ParsedQuery => {
	const warnings: string[] = [];
	const tokens = lexQuery(input.trim());
	if (tokens.length === 0) {
		return { groups: [], warnings: ['Consulta vacia'] };
	}

	const groups: ParsedQueryClause[][] = [[]];

	for (const token of tokens) {
		if (isOrToken(token)) {
			if (groups[groups.length - 1].length > 0) {
				groups.push([]);
			}
			continue;
		}
		if (isAndToken(token)) continue;

		const clause = token.type === 'phrase'
			? phraseToClause(token.value, preserveEnie)
			: wordToClause(token.value, preserveEnie);
		if (!clause) {
			warnings.push(`No se pudo interpretar: ${token.value}`);
			continue;
		}
		groups[groups.length - 1].push(clause);
	}

	const filteredGroups = groups.filter((group) => group.length > 0);
	if (filteredGroups.length === 0) {
		warnings.push('No hay terminos validos tras normalizacion');
	}

	return { groups: filteredGroups, warnings };
};

export const parseStructuredSearchQuery = (
	clauses: StructuredSearchInputClause[],
	preserveEnie: boolean
): ParsedQuery => {
	const warnings: string[] = [];
	const groups: ParsedQueryClause[][] = [[]];
	let previousConjunct: ParsedQueryClause | null = null;

	for (const input of clauses) {
		const clause = valueToClause(input.value, preserveEnie);
		if (!clause) {
			warnings.push(`No se pudo interpretar: ${input.value}`);
			continue;
		}

		if (input.kind === 'proximity') {
			const distance = normalizeDistance(input.distance);
			if (!previousConjunct) {
				warnings.push('La proximidad necesita un termino anterior');
				continue;
			}
			const proximity: ParsedQueryClause = {
				kind: 'proximity',
				left: previousConjunct.kind === 'proximity' ? previousConjunct.right : previousConjunct,
				right: clause,
				distance,
				order: normalizeProximityOrder(input.order ?? 'after')
			};
			groups[groups.length - 1].push(proximity);
			previousConjunct = proximity;
			continue;
		}

		if (input.operator === 'or' && groups[groups.length - 1].length > 0) {
			groups.push([]);
			previousConjunct = null;
		}
		groups[groups.length - 1].push(clause);
		previousConjunct = clause;
	}

	const filteredGroups = groups.filter((group) => group.length > 0);
	if (filteredGroups.length === 0) warnings.push('No hay terminos validos tras normalizacion');
	return { groups: filteredGroups, warnings };
};

export const parseStructuredQuery = (
	query: StructuredSearchQuery,
	preserveEnie: boolean
): ParsedQuery => {
	const warnings: string[] = [];
	const mainClause = valueToClause(query.main, preserveEnie);
	if (!mainClause) {
		return { groups: [], warnings: ['No hay termino principal valido tras normalizacion'] };
	}

	let groups: ParsedQueryClause[][] = [[mainClause]];

	if (query.additionalOptions) {
		const optionGroups = expandStructuredOptions(query.additionalOptions, mainClause, preserveEnie, warnings);
		groups = optionGroups.length > 0 ? optionGroups : [[mainClause]];
	} else if (query.additionalGroups) {
		const parsedAdditionalGroups = query.additionalGroups
			.map((group) => {
				const clauses: ParsedQueryClause[] = [];
				for (const value of group) {
					const clause = valueToClause(value, preserveEnie);
					if (!clause) {
						warnings.push(`No se pudo interpretar: ${value}`);
						continue;
					}
					clauses.push(clause);
				}
				return clauses;
			})
			.filter((group) => group.length > 0);
		groups = parsedAdditionalGroups.length > 0
			? parsedAdditionalGroups.map((group) => [mainClause, ...group])
			: [[mainClause]];
	} else {
		for (const item of query.additionalTerms ?? []) {
			const value = structuredAdditionalValue(item);
			const clause = valueToClause(value, preserveEnie);
			if (!clause) {
				warnings.push(`No se pudo interpretar: ${value}`);
				continue;
			}
			if (structuredAdditionalOperator(item) === 'or') {
				groups.push([mainClause, clause]);
				continue;
			}
			groups[groups.length - 1].push(clause);
		}
	}

	const proximityClauses: ParsedQueryClause[] = [];
	for (const item of query.proximityTerms ?? []) {
		const right = valueToClause(item.value, preserveEnie);
		if (!right) {
			warnings.push(`No se pudo interpretar: ${item.value}`);
			continue;
		}
		proximityClauses.push({
			kind: 'proximity',
			left: mainClause,
			right,
			distance: normalizeDistance(item.distance),
			order: normalizeProximityOrder(item.order)
		});
	}
	groups = combineGroups(groups, proximityClauses, normalizeBooleanMode(query.proximityMode));

	const filteredGroups = groups.filter((group) => group.length > 0);
	if (filteredGroups.length === 0) warnings.push('No hay terminos validos tras normalizacion');
	return { groups: filteredGroups, warnings };
};
