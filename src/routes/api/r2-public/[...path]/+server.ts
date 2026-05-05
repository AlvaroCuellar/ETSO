import { error } from '@sveltejs/kit';
import { getPublicR2BaseUrl } from '$lib/server/r2-public';

import type { RequestHandler } from './$types';

const PUBLIC_PREFIXES = new Set(['resumenes', 'search']);

const stripTrailingSlash = (value: string): string => value.replace(/\/+$/, '');
const encodePath = (value: string): string => value.split('/').map(encodeURIComponent).join('/');

const resolvePublicPath = (rawPath: string): string => {
	const decoded = decodeURIComponent(rawPath).replace(/^\/+/, '');
	const parts = decoded.split('/').filter(Boolean);
	if (parts.length < 2 || !PUBLIC_PREFIXES.has(parts[0]) || parts.some((part) => part === '..')) {
		throw error(400, 'Ruta publica R2 invalida');
	}
	return parts.join('/');
};

export const GET: RequestHandler = async ({ params }) => {
	const publicPath = resolvePublicPath(params.path ?? '');
	const response = await fetch(`${stripTrailingSlash(getPublicR2BaseUrl())}/${encodePath(publicPath)}`);

	if (response.status === 404) {
		throw error(404, 'Artefacto publico R2 no encontrado');
	}
	if (!response.ok) {
		throw error(response.status, `No se pudo leer artefacto publico R2: ${response.status}`);
	}

	return new Response(response.body, {
		headers: {
			'content-type': response.headers.get('content-type') ?? 'application/json; charset=utf-8',
			'cache-control': 'public, max-age=300'
		}
	});
};
