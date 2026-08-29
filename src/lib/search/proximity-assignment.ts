export interface TokenSpan {
	tokenStart: number;
	tokenEnd: number;
}

export const tokenSpanKey = (span: TokenSpan): string => `${span.tokenStart}:${span.tokenEnd}`;

export const canonicalSpanPairKey = (left: TokenSpan, right: TokenSpan): string => {
	const leftKey = tokenSpanKey(left);
	const rightKey = tokenSpanKey(right);
	return leftKey < rightKey ? `${leftKey}|${rightKey}` : `${rightKey}|${leftKey}`;
};

export const canonicalSpanSetKey = (spans: ReadonlyArray<TokenSpan>): string =>
	spans.map(tokenSpanKey).sort().join('|');

/**
 * Assigns a different text occurrence to every proximity condition.
 *
 * This is a small bipartite matching problem: conditions are on one side and
 * token spans on the other. The augmenting-path implementation stays bounded
 * by TEXORO's maximum of ten query conditions and avoids combinatorial search.
 */
export const assignDistinctProximitySpans = <T extends TokenSpan>(
	candidatesByCondition: ReadonlyArray<ReadonlyArray<T>>
): T[] | null => {
	if (candidatesByCondition.length === 0) return [];
	if (candidatesByCondition.some((candidates) => candidates.length === 0)) return null;

	const conditionOrder = candidatesByCondition
		.map((candidates, index) => ({ index, candidates: candidates.length }))
		.sort((left, right) => left.candidates - right.candidates || left.index - right.index)
		.map(({ index }) => index);
	const conditionBySpan = new Map<string, number>();
	const assignment: Array<T | undefined> = new Array(candidatesByCondition.length);

	const tryAssign = (conditionIndex: number, visitedSpans: Set<string>): boolean => {
		for (const candidate of candidatesByCondition[conditionIndex]) {
			const key = tokenSpanKey(candidate);
			if (visitedSpans.has(key)) continue;
			visitedSpans.add(key);

			const currentCondition = conditionBySpan.get(key);
			if (currentCondition !== undefined && !tryAssign(currentCondition, visitedSpans)) continue;

			conditionBySpan.set(key, conditionIndex);
			assignment[conditionIndex] = candidate;
			return true;
		}
		return false;
	};

	for (const conditionIndex of conditionOrder) {
		if (!tryAssign(conditionIndex, new Set<string>())) return null;
	}

	return assignment.every((span) => span !== undefined) ? (assignment as T[]) : null;
};
