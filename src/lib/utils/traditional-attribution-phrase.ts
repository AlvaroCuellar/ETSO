import type { AttributionSet } from '$lib/domain/catalog';

export interface AttributionPhrasePart {
	kind: 'text' | 'author';
	value: string;
	authorId?: string;
	hasAuthorshipExam?: boolean;
}

export interface AuthorReference {
	authorId: string;
	authorName: string;
	hasAuthorshipExam?: boolean;
}

type AuthorGroup = AuthorReference[];

interface BuildTraditionalAttributionPartsOptions {
	includePhrasePrefix?: boolean;
	translate?: (value: string) => string;
	connectorLabels?: {
		and: string;
		or: string;
	};
}

const numberWordBySlug: Record<string, string> = {
	dos: 'dos',
	tres: 'tres',
	cuatro: 'cuatro',
	cinco: 'cinco',
	seis: 'seis',
	siete: 'siete',
	ocho: 'ocho',
	nueve: 'nueve',
	diez: 'diez'
};

const normalizeText = (value: string): string =>
	value
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.trim();

const formatAuthorListParts = (authors: AuthorReference[], connector: string): AttributionPhrasePart[] => {
	const parts: AttributionPhrasePart[] = [];
	for (const [index, author] of authors.entries()) {
		if (index > 0) {
			parts.push({
				kind: 'text',
				value: index === authors.length - 1 ? ` ${connector} ` : ', '
			});
		}
		parts.push({
			kind: 'author',
			value: author.authorName,
			authorId: author.authorId,
			hasAuthorshipExam: author.hasAuthorshipExam
		});
	}
	return parts;
};

const attributionGroups = (set: AttributionSet): AuthorGroup[] =>
	set.groups
		.map((group) =>
			group.members
				.map((member) => ({
					authorId: member.authorId,
					authorName: member.authorName.trim(),
					hasAuthorshipExam: member.hasAuthorshipExam
				}))
				.filter((member) => member.authorName.length > 0)
		)
		.filter((group) => group.length > 0);

const formatGroupParts = (
	group: AuthorGroup,
	connectorLabels: { and: string; or: string }
): AttributionPhrasePart[] => formatAuthorListParts(group, connectorLabels.and);

export const formatTraditionalAttributionCompact = (
	set: AttributionSet,
	fallback = 'Desconocido',
	connectorLabels: { and: string; or: string } = { and: 'y', or: 'o' }
): string => {
	if (set.unresolved) return fallback;
	const groups = attributionGroups(set);
	if (groups.length === 0) return fallback;
	// Compact contexts use the structured hypotheses. Approved prose belongs to
	// the detailed phrase builder, even when both are shown on the same page.
	const connector = set.connector === 'and' ? connectorLabels.and : connectorLabels.or;
	return groups
		.map((group) => {
			const label = formatAuthorListParts(group, connectorLabels.and).map((part) => part.value).join('');
			return groups.length > 1 && group.length > 1 ? `(${label})` : label;
		})
		.join(` ${connector} `);
};

const resolveUnknownIngeniosLabel = (author: AuthorReference): string | null => {
	const idMatch = author.authorId.match(/^desconocido_([a-z]+)_ingenios$/);
	if (idMatch?.[1] && numberWordBySlug[idMatch[1]]) {
		return `${numberWordBySlug[idMatch[1]]} ingenios`;
	}

	const nameMatch = normalizeText(author.authorName).match(/\((dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez) ingenios\)/);
	if (nameMatch?.[1] && numberWordBySlug[nameMatch[1]]) {
		return `${numberWordBySlug[nameMatch[1]]} ingenios`;
	}

	return null;
};

const isUnknownAuthor = (author: AuthorReference): boolean => {
	const normalizedName = normalizeText(author.authorName);
	return author.authorId === 'desconocido' || author.authorId.startsWith('desconocido_') || normalizedName.startsWith('desconocido');
};

// Explicit spellings used in the approved prose. Candidates are restricted to
// the identities already present in this attribution; aliases never add authors.
const reviewedAuthorAliases: Record<string, string[]> = {
  "calderon_de_la_barca_pedro": [
    "Calderón"
  ],
  "rojas_zorrilla_francisco_de": [
    "Rojas Zorrilla",
    "Rojas"
  ],
  "coello_y_ochoa_antonio": [
    "Coello",
    "Antonio Coello"
  ],
  "perez_de_montalban_juan": [
    "Montalbán"
  ],
  "moreto_y_cavana_agustin": [
    "Agustín Moreto",
    "Moreto"
  ],
  "cancer_jeronimo_de": [
    "Cáncer"
  ],
  "vega_carpio_lope_de": [
    "Lope de Vega",
    "Lope"
  ],
  "castro_y_bellvis_guillen_de": [
    "Guillén de Castro"
  ],
  "ulloa_luis": [
    "Luis de Ulloa Pereira",
    "Luis de Ulloa y Pereira"
  ],
  "vera_diego": [
    "Diego de Vera"
  ],
  "matos_fragoso_juan_de": [
    "Matos Fragoso",
    "Matos"
  ],
  "aguayo_diego_de": [
    "Diego de Aguayo y Terones"
  ],
  "belmonte_bermudez_luis_de": [
    "Belmonte"
  ],
  "calleja_diego": [
    "Calleja"
  ],
  "campo_antonio_manuel_del": [
    "Campo"
  ],
  "tarrega_francisco_agustin": [
    "Tárrega"
  ],
  "velez_de_guevara_luis": [
    "Vélez"
  ],
  "leon_marchante_manuel_de": [
    "León Marchante"
  ],
  "haedo_antonio": [
    "Antonio de Haedo"
  ],
  "figueroa_juan_no_identificado": [
    "Juan Figueroa"
  ],
  "siguenza_jose_de": [
    "Sigüenza"
  ],
  "salgado_francisco": [
    "Salgado"
  ],
  "bances_candamo_francisco_antonio_de": [
    "Bances"
  ],
  "villaviciosa_sebastian_de": [
    "Villaviciosa"
  ],
  "alvarez_de_toledo_antonio": [
    "Álvarez de Toledo"
  ],
  "canizares_jose_de": [
    "Cañizares"
  ],
  "hoz_y_mota_juan_claudio_de_la": [
    "Hoz y Mota"
  ],
  "martinez_de_meneses_antonio": [
    "Martínez de Meneses"
  ],
  "zabaleta_juan_de": [
    "Zabaleta"
  ],
  "monroy_y_silva_cristobal_de": [
    "Monroy"
  ],
  "alfaro_alonso_de": [
    "Alfaro"
  ],
  "sigler_de_huerta_antonio": [
    "Sigler"
  ],
  "diamante_juan_bautista": [
    "Diamante"
  ],
  "lanini_y_sagredo_pedro": [
    "Lanini"
  ],
  "torre_y_sevil_francisco_de_la": [
    "Torre"
  ],
  "claramonte_y_corroy_andres_de": [
    "Andrés de Claramonte"
  ]
};

export const buildAuthorMentionParts = (phrase: string, authors: AuthorReference[], scopedAliases: Record<string, string[]> = {}): AttributionPhrasePart[] => {
	const candidates = new Map<string, AuthorReference | null>();
	const priorities = new Map<string, number>();
	for (const author of authors) {
		if (isUnknownAuthor(author)) continue;
		const names = [
			{ name: author.authorName, priority: 2 },
			...[author.authorName.replace(/\s+\([^)]*\)$/, ''), ...(reviewedAuthorAliases[author.authorId] ?? []), ...(scopedAliases[author.authorId] ?? [])].map(name => ({ name, priority: 1 }))
		];
		for (const {name, priority} of names) {
			const key = name.toLocaleLowerCase('es');
			const previous = candidates.get(key);
			const previousPriority = priorities.get(key) ?? 0;
			if (priority < previousPriority) continue;
			// Exact canonical names outrank shortened qualifiers; equal-rank ambiguity stays unresolved.
			if (priority > previousPriority) candidates.set(key, author);
			else if (previous === null || (previous && previous.authorId !== author.authorId)) candidates.set(key, null);
			else candidates.set(key, author);
			priorities.set(key, priority);
		}
	}
	const matches: { start: number; end: number; author: AuthorReference }[] = [];
	for (const [name, author] of candidates) {
		if (!author || !name) continue;
		const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
		const pattern = new RegExp(`(?<![\\p{L}\\p{N}_])${escaped}(?![\\p{L}\\p{N}_])`, 'giu');
		for (const match of phrase.matchAll(pattern)) matches.push({ start: match.index!, end: match.index! + match[0].length, author });
	}
	matches.sort((a, b) => a.start - b.start || b.end - a.end);
	const parts: AttributionPhrasePart[] = [];
	let cursor = 0;
	for (const match of matches) {
		if (match.start < cursor) continue;
		if (match.start > cursor) parts.push({ kind: 'text', value: phrase.slice(cursor, match.start) });
		parts.push({ kind: 'author', value: phrase.slice(match.start, match.end), authorId: match.author.authorId, hasAuthorshipExam: match.author.hasAuthorshipExam });
		cursor = match.end;
	}
	if (cursor < phrase.length || parts.length === 0) parts.push({ kind: 'text', value: phrase.slice(cursor) });
	return parts;
};

export const buildReviewedAttributionParts = (set: AttributionSet): AttributionPhrasePart[] =>
	buildAuthorMentionParts(set.reviewedPhrase ?? '', attributionGroups(set).flat());

export const buildTraditionalAttributionParts = (
	set: AttributionSet,
	options: BuildTraditionalAttributionPartsOptions = {}
): AttributionPhrasePart[] => {
	if (set.reviewedPhrase) return buildReviewedAttributionParts(set);
	const includePhrasePrefix = options.includePhrasePrefix ?? true;
	const translate = options.translate ?? ((value: string) => value);
	const connectorLabels = options.connectorLabels ?? { and: 'y', or: 'o' };
	const groups = attributionGroups(set);
	const authors = groups.flat();

	if (authors.length === 1 && isUnknownAuthor(authors[0])) {
		const ingeniosLabel = resolveUnknownIngeniosLabel(authors[0]);
		return [
			...(includePhrasePrefix ? [{ kind: 'text' as const, value: `${translate('Obra de atribución')} ` }] : []),
			{
				kind: 'author',
				value: translate('desconocida'),
				authorId: authors[0].authorId,
				hasAuthorshipExam: authors[0].hasAuthorshipExam
			},
			...(ingeniosLabel ? [{ kind: 'text' as const, value: ` (${translate(ingeniosLabel)})` }] : []),
			...(includePhrasePrefix ? [{ kind: 'text' as const, value: '.' }] : [])
		];
	}

	if (set.unresolved || authors.length === 0) {
		return [
			{
				kind: 'text',
				value: includePhrasePrefix
					? translate('Obra sin atribución tradicional determinada.')
					: translate('Sin atribución tradicional determinada')
			}
		];
	}

	// The same named author, either alone or with an anonymous team: retain both
	// hypotheses without displaying a pseudoauthor as a person or repeating the name.
	if (groups.length === 2 && groups[0].length === 1 && groups[1].length === 2) {
		const named = groups[0][0];
		const partner = groups[1].find((member) => member.authorId !== named.authorId);
		const count = partner && resolveUnknownIngeniosLabel(partner);
		if (count && groups[1].some((member) => member.authorId === named.authorId)) {
			return [
				...(includePhrasePrefix ? [{ kind: 'text' as const, value: `${translate('Obra atribuida a')} ` }] : []),
				...formatAuthorListParts([named], connectorLabels.and),
				{ kind: 'text', value: ` ${connectorLabels.or} ${translate('a su colaboración con')} ${translate(`otros ${count} no identificados`)}` },
				...(includePhrasePrefix ? [{ kind: 'text' as const, value: '.' }] : [])
			];
		}
	}

	if (!includePhrasePrefix) {
		const parts: AttributionPhrasePart[] = [];
		for (const [index, group] of groups.entries()) {
			if (index > 0) parts.push({ kind: 'text', value: ` ${connectorLabels.or} ` });
			parts.push(...formatGroupParts(group, connectorLabels));
		}
		return parts;
	}

	if (groups.length === 1 && groups[0].length === 1) {
		return [
			{ kind: 'text', value: `${translate('Obra atribuida a')} ` },
			...formatAuthorListParts(groups[0], connectorLabels.and),
			{ kind: 'text', value: '.' }
		];
	}

	if (groups.length === 1) {
		return [
			{ kind: 'text', value: `${translate('Obra atribuida a la colaboración de')} ` },
			...formatAuthorListParts(groups[0], connectorLabels.and),
			{ kind: 'text', value: '.' }
		];
	}

	const parts: AttributionPhrasePart[] = [];
	for (const [index, group] of groups.entries()) {
		const collaboration = group.length > 1;
		const prefix = index === 0
			? translate(
					collaboration
						? 'Obra atribuida alternativamente a la colaboración de'
						: 'Obra atribuida alternativamente a'
				)
			: translate(collaboration ? 'a la colaboración de' : 'a');
		parts.push({
			kind: 'text',
			value: index === 0 ? `${prefix} ` : ` ${connectorLabels.or} ${prefix} `
		});
		parts.push(...formatGroupParts(group, connectorLabels));
	}
	parts.push({ kind: 'text', value: '.' });
	return parts;
};
