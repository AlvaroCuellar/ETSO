import { dev } from '$app/environment';
import { env } from '$env/dynamic/private';
import { error } from '@sveltejs/kit';
import { readFile } from 'node:fs/promises';
import { extname, resolve } from 'node:path';
import { getPublicR2BaseUrl } from '$lib/server/r2-public';

import type { RequestHandler } from './$types';

const PUBLIC_PREFIXES = new Set(['resumenes', 'search', 'facsimiles']);
const LOCAL_PUBLIC_ASSETS_DIR = resolve(process.cwd(), 'deploy', 'input', 'public-assets');

const stripTrailingSlash = (value: string): string => value.replace(/\/+$/, '');
const encodePath = (value: string): string => value.split('/').map(encodeURIComponent).join('/');

const contentTypeForPath = (path: string): string => {
	const extension = extname(path).toLowerCase();
	if (extension === '.json') return 'application/json; charset=utf-8';
	if (extension === '.txt') return 'text/plain; charset=utf-8';
	if (extension === '.html') return 'text/html; charset=utf-8';
	if (extension === '.jpg' || extension === '.jpeg') return 'image/jpeg';
	if (extension === '.png') return 'image/png';
	if (extension === '.webp') return 'image/webp';
	return 'application/octet-stream';
};

const resolvePublicPath = (rawPath: string): string => {
	const decoded = decodeURIComponent(rawPath).replace(/^\/+/, '');
	const parts = decoded.split('/').filter(Boolean);
	if (parts.length < 2 || !PUBLIC_PREFIXES.has(parts[0]) || parts.some((part) => part === '..')) {
		throw error(400, 'Ruta publica R2 invalida');
	}
	return parts.join('/');
};

const readLocalPublicAsset = async (publicPath: string): Promise<Response | null> => {
	if (!dev) return null;
	const localSummaries = env.LOCAL_TEXORO_SUMMARIES_PATH?.trim();
	const summaryOverride = localSummaries && publicPath.startsWith('resumenes/');
	const base = summaryOverride ? resolve(localSummaries) : LOCAL_PUBLIC_ASSETS_DIR;
	const relativePath = summaryOverride ? publicPath.slice('resumenes/'.length) : publicPath;
	const target = resolve(base, ...relativePath.split('/'));
	if (!target.startsWith(`${base}\\`) && !target.startsWith(`${base}/`)) {
		throw error(400, 'Ruta publica R2 invalida');
	}

	try {
		const body = await readFile(target);
		return new Response(body, {
			headers: {
				'content-type': contentTypeForPath(publicPath),
				'cache-control': 'no-store'
			}
		});
	} catch (cause) {
		if (cause && typeof cause === 'object' && 'code' in cause && cause.code === 'ENOENT') return null;
		throw cause;
	}
};

export const GET: RequestHandler = async ({ params }) => {
	const publicPath = resolvePublicPath(params.path ?? '');
	const localResponse = await readLocalPublicAsset(publicPath);
	if (localResponse) return localResponse;

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
			'cache-control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800'
		}
	});
};
