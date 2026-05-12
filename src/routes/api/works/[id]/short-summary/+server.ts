import { error, json } from '@sveltejs/kit';
import { getWorkById, getWorkShortSummaryById } from '$lib/server/catalog-runtime';

import type { RequestHandler } from './$types';

const EMPTY_SHORT_SUMMARY = 'Sin resumen breve disponible.';

const hasUsableShortSummary = (value: string): boolean => {
	const shortText = value.trim();
	return shortText.length > 0 && shortText !== EMPTY_SHORT_SUMMARY;
};

export const GET: RequestHandler = async ({ params }) => {
	const workId = params.id.trim();
	if (!workId) throw error(400, 'Identificador de obra invalido');

	const work = await getWorkById(workId);
	if (!work) throw error(404, 'Obra no encontrada');

	const shortSummary = await getWorkShortSummaryById(work.id);
	if (!hasUsableShortSummary(shortSummary)) {
		throw error(404, 'Resumen breve no disponible');
	}

	return json(
		{ shortSummary },
		{
			headers: {
				'cache-control': 'public, max-age=300'
			}
		}
	);
};
