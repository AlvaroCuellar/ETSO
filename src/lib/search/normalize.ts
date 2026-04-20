const TOKEN_REGEX = /[\p{L}\p{N}]+/gu;

export interface NormalizedToken {
	raw: string;
	norm: string;
	start: number;
	end: number;
}

export const normalizePlainText = (input: string, preserveEnie = true): string => {
	const lower = input.toLowerCase();
	if (!preserveEnie) {
		return lower.normalize('NFD').replace(/\p{M}+/gu, '');
	}
	const marker = '\u0000';
	return lower
		.replaceAll('ñ', marker)
		.normalize('NFD')
		.replace(/\p{M}+/gu, '')
		.replaceAll(marker, 'ñ');
};

export const normalizePattern = (input: string, preserveEnie = true): string => {
	const marker = '\u0001';
	const withWildcards = input.replaceAll('*', marker).replaceAll('?', `${marker}?${marker}`);
	const normalized = normalizePlainText(withWildcards, preserveEnie)
		.replaceAll(`${marker}?${marker}`, '?')
		.replaceAll(marker, '*');

	let result = '';
	for (const char of normalized) {
		if (char === '*' || char === '?') {
			result += char;
			continue;
		}
		if (/^[\p{L}\p{N}]$/u.test(char)) {
			result += char;
		}
	}
	return result;
};

export const tokenizeNormalized = (normalizedText: string): string[] => normalizedText.match(TOKEN_REGEX) ?? [];

export const tokenizeWithOffsets = (rawText: string, preserveEnie = true): NormalizedToken[] => {
	const output: NormalizedToken[] = [];
	for (const match of rawText.matchAll(TOKEN_REGEX)) {
		const raw = match[0];
		const start = match.index ?? 0;
		const end = start + raw.length;
		output.push({
			raw,
			norm: normalizePlainText(raw, preserveEnie),
			start,
			end
		});
	}
	return output;
};

export const buildSnippet = (
	rawText: string,
	start: number,
	end: number,
	radius = 110
): string => {
	const left = Math.max(0, start - radius);
	const right = Math.min(rawText.length, end + radius);
	const prefix = left > 0 ? '... ' : '';
	const suffix = right < rawText.length ? ' ...' : '';
	return `${prefix}${rawText.slice(left, right).replace(/\s+/g, ' ').trim()}${suffix}`;
};
