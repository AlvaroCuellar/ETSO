import type { ParsedQuery, ParsedQueryClause } from './types';
import { normalizePattern } from './normalize';

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

const phraseToClause = (value: string, preserveEnie: boolean): ParsedQueryClause | null => {
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

const wordToClause = (value: string, preserveEnie: boolean): ParsedQueryClause | null => {
	const pattern = normalizePattern(value, preserveEnie);
	if (!pattern) return null;
	return {
		kind: 'term',
		pattern
	};
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
