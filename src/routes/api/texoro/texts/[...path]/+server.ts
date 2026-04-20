import { readFile } from 'node:fs/promises';
import { extname, resolve } from 'node:path';

import { error } from '@sveltejs/kit';

import type { RequestHandler } from './$types';

const TEXT_ROOT = resolve(process.cwd(), 'data', 'texts');

const resolveSafePath = (rawPath: string): string => {
	const cleaned = rawPath.replace(/^\/+/, '');
	if (!cleaned) throw error(400, 'Ruta de texto vacia');
	if (cleaned.includes('..')) throw error(400, 'Ruta de texto invalida');
	const withExtension = extname(cleaned) ? cleaned : `${cleaned}.txt`;
	const full = resolve(TEXT_ROOT, withExtension);
	if (!full.startsWith(TEXT_ROOT)) throw error(403, 'Ruta fuera del directorio de textos');
	return full;
};

export const GET: RequestHandler = async ({ params }) => {
	const rawPath = params.path ?? '';
	const decoded = decodeURIComponent(rawPath);
	const fullPath = resolveSafePath(decoded);

	try {
		const body = await readFile(fullPath);
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
