import { error, redirect } from '@sveltejs/kit';
import {
	buildBicuveCitation,
	getBicuveBySlug,
	getBicuveWorkBySlug,
	getWorkById
} from '$lib/server/catalog-runtime';

import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const bicuve = await getBicuveBySlug(params.id);
	if (!bicuve) {
		const bicuveWork = await getBicuveWorkBySlug(params.id);
		if (bicuveWork) {
			throw error(
				500,
				`Texto BICUVE no disponible en R2 para ${bicuveWork.id}. Revisa R2_TEXT_PREFIX y la clave ${bicuveWork.id}.txt.`
			);
		}

		const legacyWork = await getWorkById(params.id);
		const bicuveLink = legacyWork?.textLinks.find((link) => link.kind === 'bicuve');
		if (bicuveLink) {
			throw redirect(308, bicuveLink.href);
		}
		throw error(404, 'Texto BICUVE no encontrado');
	}

	const work = await getWorkById(bicuve.workId);
	if (!work) throw error(500, 'Obra vinculada no disponible');
	if (params.id !== bicuve.id) throw redirect(308, `/bicuve/${bicuve.id}`);

	const canonicalUrl = `https://etso.es/bicuve/${bicuve.id}`;
	const citation = buildBicuveCitation({
		bicuveNombre: bicuve.bicuveNombre,
		title: work.title,
		canonicalUrl
	});

	return {
		bicuve,
		work,
		citation,
		canonicalUrl
	};
};
