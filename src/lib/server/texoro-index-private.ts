import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { dev } from '$app/environment';
import { env } from '$env/dynamic/private';
import { readPrivateR2Object } from '$lib/server/r2-private';

const indexPathSegment = /^[A-Za-z0-9_][A-Za-z0-9_.-]*$/;

const assertIndexPath = (path: string): void => {
	if (!path.endsWith('.json') || !path.split('/').every((part) => indexPathSegment.test(part))) {
		throw new Error('Ruta del índice de TEXORO no válida.');
	}
};

const resolveIndexHost = (accountId: string, endpoint?: string): string | undefined => {
	if (!endpoint) return;
	const url = new URL(endpoint);
	const allowedHosts = ['', '.eu', '.fedramp', '.us'].map((jurisdiction) =>
		`${accountId}${jurisdiction}.r2.cloudflarestorage.com`
	);
	if (url.origin !== `https://${url.hostname}` || url.pathname !== '/' || url.search || url.hash ||
		url.username || url.password || !allowedHosts.includes(url.hostname)) {
		throw new Error('Endpoint R2 privado del índice de TEXORO no válido.');
	}
	return url.hostname;
};

export const readPrivateTexoroIndexJson = async (
	relativePath: string,
	indexVersion: string | null
): Promise<unknown> => {
	assertIndexPath(relativePath);
	if (indexVersion !== null && !indexPathSegment.test(indexVersion)) {
		throw new Error('Versión del índice de TEXORO no válida.');
	}

	if (dev && env.LOCAL_CATALOG_ONLY === 'true') {
		const directory = env.LOCAL_TEXORO_INDEX_PATH?.trim();
		if (!directory) throw new Error('Falta LOCAL_TEXORO_INDEX_PATH para la vista local.');
		return JSON.parse(await readFile(resolve(directory, relativePath), 'utf8')) as unknown;
	}

	const dedicated = Boolean(
		env.R2_TEXORO_INDEX_BUCKET?.trim() || env.R2_TEXORO_INDEX_ACCOUNT_ID?.trim() ||
		env.R2_TEXORO_INDEX_ACCESS_KEY_ID?.trim() || env.R2_TEXORO_INDEX_SECRET_ACCESS_KEY?.trim() ||
		env.R2_TEXORO_INDEX_ENDPOINT_URL?.trim()
	);
	const accountId = ((dedicated ? env.R2_TEXORO_INDEX_ACCOUNT_ID : env.R2_TEXT_ACCOUNT_ID) ||
		env.R2_ACCOUNT_ID)?.trim();
	const accessKeyId = (dedicated ? env.R2_TEXORO_INDEX_ACCESS_KEY_ID : env.R2_TEXT_ACCESS_KEY_ID)?.trim();
	const secretAccessKey = (dedicated ? env.R2_TEXORO_INDEX_SECRET_ACCESS_KEY : env.R2_TEXT_SECRET_ACCESS_KEY)?.trim();
	const bucket = (dedicated ? env.R2_TEXORO_INDEX_BUCKET : env.R2_TEXT_BUCKET)?.trim();
	const defaultPrefix = bucket === 'etso-textos' ? 'texoro-search' : 'search';
	const prefix = (env.R2_TEXORO_INDEX_PREFIX?.trim() || defaultPrefix).replace(/^\/+|\/+$/g, '');
	if (!accountId || !accessKeyId || !secretAccessKey || !bucket) {
		throw new Error('Faltan las credenciales R2 privadas del índice de TEXORO.');
	}
	if (!dedicated && (bucket !== 'etso-textos' || prefix !== 'texoro-search')) {
		throw new Error('El índice compartido de TEXORO requiere el prefijo privado texoro-search.');
	}

	// Manifest at the active prefix is switched only after the complete release is uploaded.
	// Readers that are still using an old manifest keep reading its immutable release.
	const releasePath = indexVersion ? `releases/${indexVersion}/${relativePath}` : relativePath;
	const key = prefix ? `${prefix}/${releasePath}` : releasePath;
	const host = resolveIndexHost(accountId, env.R2_TEXORO_INDEX_ENDPOINT_URL?.trim());
	const response = await readPrivateR2Object({ accountId, accessKeyId, secretAccessKey, bucket, host }, key);
	if (!response.ok) throw new Error(`No se pudo leer el índice privado de TEXORO: ${response.status}.`);
	return response.json() as Promise<unknown>;
};
