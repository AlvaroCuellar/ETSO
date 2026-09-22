/** Canonical ASODAT work endpoint; keep URL changes in this one place. */
export const ASODAT_WORK_BASE_URL = 'https://asodat.uv.es/titulos/search/detail/';

export const getAsodatWorkUrl = (id: number | null | undefined): string | undefined =>
	Number.isSafeInteger(id) && (id ?? 0) > 0 ? `${ASODAT_WORK_BASE_URL}${id}` : undefined;
