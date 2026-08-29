import type { AttributionSet } from '$lib/domain/catalog';

export interface AttributionPhrasePart {
	kind: 'text' | 'author';
	value: string;
	authorId?: string;
}

interface AuthorReference {
	authorId: string;
	authorName: string;
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
			authorId: author.authorId
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
					authorName: member.authorName.trim()
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
	return groups
		.map((group) => formatAuthorListParts(group, connectorLabels.and).map((part) => part.value).join(''))
		.join(` ${connectorLabels.or} `);
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

export const buildTraditionalAttributionParts = (
	set: AttributionSet,
	options: BuildTraditionalAttributionPartsOptions = {}
): AttributionPhrasePart[] => {
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
				authorId: authors[0].authorId
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
