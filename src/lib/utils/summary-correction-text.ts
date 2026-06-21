export interface SummaryCorrectionNamedItem {
	nombre: string;
	descripcion: string;
}

export interface SummaryCorrectionThemeItem {
	tema: string;
	descripcion: string;
}

export interface SummaryCorrectionTextInput {
	shortSummary: string;
	resumenLargo: string[];
	personajes: SummaryCorrectionNamedItem[];
	espacios: SummaryCorrectionNamedItem[];
	tematicas: SummaryCorrectionThemeItem[];
}

const cleanText = (value: string): string => value.replace(/\r\n?/g, '\n').trim();

const appendSection = (lines: string[], title: string, content: string[]): void => {
	const cleanedContent = content.map(cleanText).filter(Boolean);
	if (cleanedContent.length === 0) return;
	if (lines.length > 0) lines.push('');
	lines.push(`## ${title}`, '', ...cleanedContent);
};

export const buildSummaryCorrectionText = ({
	shortSummary,
	resumenLargo,
	personajes,
	espacios,
	tematicas
}: SummaryCorrectionTextInput): string => {
	const lines: string[] = [];

	appendSection(lines, 'Resumen breve', [shortSummary]);
	appendSection(lines, 'Resumen amplio', resumenLargo);
	appendSection(
		lines,
		'Personajes principales',
		personajes.map((item) => [item.nombre, item.descripcion].map(cleanText).filter(Boolean).join(': '))
	);
	appendSection(
		lines,
		'Espacios principales',
		espacios.map((item) => [item.nombre, item.descripcion].map(cleanText).filter(Boolean).join(': '))
	);
	appendSection(
		lines,
		'Tematicas principales',
		tematicas.map((item) => [item.tema, item.descripcion].map(cleanText).filter(Boolean).join(': '))
	);

	return `${lines.join('\n').replace(/\n{4,}/g, '\n\n\n').trim()}\n`;
};
