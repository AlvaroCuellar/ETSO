import { createHash } from 'node:crypto';

export interface BitesoJornadas {
	sha256: string;
	jornadas: { label: string; lineCount: number }[];
}

/** Add reading headings using divisions verified against the received text. */
export const formatBitesoJornadas = (text: string, division?: BitesoJornadas): string => {
	if (!division) return text;
	const source = text.replace(/\r\n?/g, '\n').trimEnd();
	const lines = source.split('\n');
	if (
		createHash('sha256').update(source).digest('hex') !== division.sha256 ||
		division.jornadas.some(({ lineCount }) => !Number.isInteger(lineCount) || lineCount < 1) ||
		division.jornadas.reduce((total, jornada) => total + jornada.lineCount, 0) !== lines.length
	) {
		console.warn('[BITESO] La división en jornadas no coincide con el texto; se conserva íntegro.');
		return text;
	}
	let offset = 0;
	return division.jornadas.map(({ label, lineCount }) => {
		const section = lines.slice(offset, offset + lineCount).join('\n');
		offset += lineCount;
		return `--${label}--\n${section}`;
	}).join('\n') + '\n';
};
