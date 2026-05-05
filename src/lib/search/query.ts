import type { ParsedQuery, ParsedQueryClause } from './types';
import { normalizePattern } from './normalize';

export type StructuredSearchInputClause =
	| { kind: 'term'; value: string; operator?: 'and' | 'or' | null }
	| { kind: 'phrase'; value: string; operator?: 'and' | 'or' | null }
	| { kind: 'proximity'; value: string; distance: number; operator?: 'near' };

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

export const phraseToClause = (value: string, preserveEnie: boolean): ParsedQueryClause | null => {
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

export const wordToClause = (value: string, preserveEnie: boolean): ParsedQueryClause | null => {
	const pattern = normalizePattern(value, preserveEnie);
	if (!pattern) return null;
	return {
		kind: 'term',
		pattern
	};
};

const valueToClause = (value: string, preserveEnie: boolean): ParsedQueryClause | null => {
	const normalized = value.trim().replace(/\s+/g, ' ');
	if (!normalized) return null;
	return /\s/.test(normalized) ? phraseToClause(normalized, preserveEnie) : wordToClause(normalized, preserveEnie);
};

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
			const distance = Math.min(100, Math.max(0, Math.floor(input.distance)));
			if (!previousConjunct) {
				warnings.push('La proximidad necesita un termino anterior');
				continue;
			}
			if (clause.kind === 'proximity') {
				warnings.push('La proximidad no puede apuntar a otra proximidad');
				continue;
			}
			const proximity: ParsedQueryClause = {
				kind: 'proximity',
				left: previousConjunct.kind === 'proximity' ? previousConjunct.right : previousConjunct,
				right: clause,
				distance,
				direction: 'ordered'
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
