import { readFile } from 'node:fs/promises';
import { extname, resolve } from 'node:path';

import { error } from '@sveltejs/kit';

import type { RequestHandler } from './$types';

const INDEX_ROOT = resolve(process.cwd(), 'data', 'search-index');

const resolveSafePath = (rawPath: string): string => {
	const cleaned = rawPath.replace(/^\/+/, '');
	if (!cleaned) throw error(400, 'Ruta de indice vacia');
	if (cleaned.includes('..')) throw error(400, 'Ruta de indice invalida');
	const full = resolve(INDEX_ROOT, cleaned);
	if (!full.startsWith(INDEX_ROOT)) throw error(403, 'Ruta fuera de indice');
	return full;
};

const contentTypeFor = (pathValue: string): string => {
	const extension = extname(pathValue).toLowerCase();
	if (extension === '.json') return 'application/json; charset=utf-8';
	if (extension === '.txt') return 'text/plain; charset=utf-8';
	return 'application/octet-stream';
};

export const GET: RequestHandler = async ({ params }) => {
	const rawPath = params.path ?? '';
	const decoded = decodeURIComponent(rawPath);
	const fullPath = resolveSafePath(decoded);

	try {
		const body = await readFile(fullPath);
		return new Response(body, {
			headers: {
				'content-type': contentTypeFor(fullPath),
				'cache-control': 'public, max-age=60'
			}
		});
	} catch (cause) {
		console.error('[api/texoro/index] Unable to read file', cause);
		throw error(404, 'Artefacto de indice no encontrado');
	}
};
