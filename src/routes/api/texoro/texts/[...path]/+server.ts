import { extname } from 'node:path';

import { error } from '@sveltejs/kit';

import type { RequestHandler } from './$types';

const textFiles = import.meta.glob('../../../../../data/texts/*.txt', {
	import: 'default',
	query: '?raw'
});

type RawFileLoader = () => Promise<string>;

const resolveSafeKey = (rawPath: string): string => {
	const cleaned = rawPath.replace(/^\/+/, '');
	if (!cleaned) throw error(400, 'Ruta de texto vacia');
	if (cleaned.includes('..')) throw error(400, 'Ruta de texto invalida');
	const withExtension = extname(cleaned) ? cleaned : `${cleaned}.txt`;
	return `../../../../../data/texts/${withExtension}`;
};

export const GET: RequestHandler = async ({ params }) => {
	const rawPath = params.path ?? '';
	const decoded = decodeURIComponent(rawPath);
	const moduleKey = resolveSafeKey(decoded);
	const loadFile = textFiles[moduleKey] as RawFileLoader | undefined;

	if (!loadFile) {
		throw error(404, 'Texto no encontrado');
	}

	try {
		const body = await loadFile();
		return new Response(body, {
			headers: {
				'content-type': 'text/plain; charset=utf-8',
				'cache-control': 'public, max-age=300'
			}
		});
	} catch (cause) {
		console.error('[api/texoro/texts] Unable to read file', cause);
		throw error(404, 'Texto no encontrado');
	}
};
