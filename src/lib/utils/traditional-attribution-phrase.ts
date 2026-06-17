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
	const authors = set.groups.flatMap((group) =>
		group.members
			.map((member) => ({
				authorId: member.authorId,
				authorName: member.authorName.trim()
			}))
			.filter((member) => member.authorName.length > 0)
	);

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
		return formatAuthorListParts(authors, connectorLabels[set.connector]);
	}

	if (authors.length === 1) {
		return [
			{ kind: 'text', value: `${translate('Obra atribuida a')} ` },
			...formatAuthorListParts(authors, connectorLabels.and),
			{ kind: 'text', value: '.' }
		];
	}

	if (set.connector === 'and') {
		return [
			{ kind: 'text', value: `${translate('Obra atribuida a la escritura en colaboración entre')} ` },
			...formatAuthorListParts(authors, connectorLabels.and),
			{ kind: 'text', value: '.' }
		];
	}

	return [
		{ kind: 'text', value: `${translate('Obra atribuida a')} ` },
		...formatAuthorListParts(authors, connectorLabels.or),
		{ kind: 'text', value: '.' }
	];
};
