/** Only adapts the optional attribution columns when dev switches to an older local DB. */
export const withLegacyAttributionColumns = (
	sql: string,
	columns: { memberScope: boolean; reviewedPhrase: boolean }
): string => {
	let result = sql;
	if (!columns.memberScope) {
		result = result.replace(/\bm\.scope AS scope\b/g, 'NULL AS scope')
			.replace(/\bpm\.scope = 'participation'/g, '0');
	}
	if (!columns.reviewedPhrase) result = result.replace(/\bs\.reviewed_phrase AS reviewed_phrase\b/g, 'NULL AS reviewed_phrase');
	return result;
};
