import { error } from '@sveltejs/kit';

import type { RequestHandler } from './$types';

const indexFiles = import.meta.glob('../../../../../data/search-index/**/*.json', {
	import: 'default',
	query: '?raw'
});

type RawFileLoader = () => Promise<string>;

const resolveSafeKey = (rawPath: string): string => {
	const cleaned = rawPath.replace(/^\/+/, '');
	if (!cleaned) throw error(400, 'Ruta de indice vacia');
	if (cleaned.includes('..')) throw error(400, 'Ruta de indice invalida');
	return `../../../../../data/search-index/${cleaned}`;
};

export const GET: RequestHandler = async ({ params }) => {
	const rawPath = params.path ?? '';
	const decoded = decodeURIComponent(rawPath);
	const moduleKey = resolveSafeKey(decoded);
	const loadFile = indexFiles[moduleKey] as RawFileLoader | undefined;

	if (!loadFile) {
		throw error(404, 'Artefacto de indice no encontrado');
	}

	try {
		const body = await loadFile();
		return new Response(body, {
			headers: {
				'content-type': 'application/json; charset=utf-8',
				'cache-control': 'public, max-age=60'
			}
		});
	} catch (cause) {
		console.error('[api/texoro/index] Unable to read file', cause);
		throw error(404, 'Artefacto de indice no encontrado');
	}
};
