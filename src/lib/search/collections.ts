import type { CatalogWork } from '../domain/catalog';

const EXAM_COLLECTION = {
	id: 'examen-autorias',
	label: 'Examen de autorías',
	description: 'Obras mayores del teatro del Siglo de Oro.'
};
const CHIVALRY_COLLECTION = {
	id: 'libros-de-caballerias',
	label: 'Libros de caballerías',
	description: 'Los 14 libros de caballerías de la Universidad de Wisconsin–Madison.'
};

const AUTHOR_COLLECTIONS = [
	{ id: 'lope-de-vega', label: 'Lope de Vega', authorId: 'vega_carpio_lope_de' },
	{ id: 'calderon-de-la-barca', label: 'Calderón de la Barca', authorId: 'calderon_de_la_barca_pedro' },
	{ id: 'tirso-de-molina', label: 'Tirso de Molina', authorId: 'tirso_de_molina' },
	{ id: 'andres-de-claramonte', label: 'Andrés de Claramonte', authorId: 'claramonte_y_corroy_andres_de' },
	{ id: 'luis-velez-de-guevara', label: 'Luis Vélez de Guevara', authorId: 'velez_de_guevara_luis' },
	{ id: 'juan-ruiz-de-alarcon', label: 'Juan Ruiz de Alarcón', authorId: 'ruiz_de_alarcon_juan' }
];

export const TEXORO_COLLECTIONS = [
	EXAM_COLLECTION,
	...AUTHOR_COLLECTIONS.map(({ id, label }) => ({
		id,
		label,
		description: 'Obras teatrales con atribución estilométrica segura o probable a este autor, incluidas participaciones y colaboraciones.'
	})),
	CHIVALRY_COLLECTION
];

const collectionIdByLabel = new Map(TEXORO_COLLECTIONS.map(({ label, id }) => [label, id]));

export const getTexoroCollectionIds = (
	work: Pick<CatalogWork, 'id' | 'inAuthorshipExam' | 'stylometryAttribution' | 'collection'>
): string[] => {
	if (work.collection !== undefined) {
		const labels = new Set(work.collection.split('|').map((label) => label.trim()));
		return [...collectionIdByLabel].filter(([label]) => labels.has(label)).map(([, id]) => id);
	}

	const ids: string[] = [];
	if (work.inAuthorshipExam) ids.push(EXAM_COLLECTION.id);

	const attribution = work.stylometryAttribution;
	if (!attribution.unresolved) {
		const confirmedAuthors = new Set<string>();
		for (const group of attribution.groups) {
			for (const member of group.members) {
				if (member.confidence === 'segura' || member.confidence === 'probable') {
					confirmedAuthors.add(member.authorId);
				}
			}
		}
		for (const { id, authorId } of AUTHOR_COLLECTIONS) {
			if (confirmedAuthors.has(authorId)) ids.push(id);
		}
	}

	if (work.id.startsWith('TEXORO_caballerias_')) ids.push(CHIVALRY_COLLECTION.id);
	return ids;
};
