import { dev } from '$app/environment';
import { env } from '$env/dynamic/private';
import { error } from '@sveltejs/kit';
import { readFile } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
	if (!dev || env.LOCAL_CATALOG_ONLY !== 'true') throw error(404, 'No disponible');
	const directory = env.LOCAL_TEXORO_INDEX_PATH?.trim();
	if (!directory) throw error(500, 'Falta el índice local de TEXORO');
	const root = resolve(directory);
	const file = resolve(root, params.path);
	if (!file.startsWith(root + sep) || !file.endsWith('.json')) throw error(404, 'No disponible');
	try {
		const body = await readFile(file, 'utf8');
		return new Response(body, { headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
	} catch (cause) {
		if ((cause as NodeJS.ErrnoException).code === 'ENOENT') throw error(404, 'Archivo no encontrado');
		throw cause;
	}
};
