import { createHash, createHmac } from 'node:crypto';

import { env } from '$env/dynamic/private';

const DEFAULT_TEXT_PREFIX = '';
const R2_REGION = 'auto';
const R2_SERVICE = 's3';
const R2_PAYLOAD_HASH = 'UNSIGNED-PAYLOAD';
const PRIVATE_TEXT_CACHE_TTL_MS = 10 * 60 * 1000;
const PRIVATE_TEXT_CACHE_MAX_ITEMS = 8;
const PRIVATE_TEXT_CACHE_MAX_BYTES = 24 * 1024 * 1024;
const SLOW_R2_LOG_MS = 900;

interface PrivateTextCacheEntry {
	cachedAt: number;
	estimatedBytes: number;
	value?: string | null;
	promise?: Promise<string | null>;
}

const privateTextCache = new Map<string, PrivateTextCacheEntry>();

const estimateTextBytes = (value: string | null): number => (value ? value.length * 2 : 0);

const prunePrivateTextCache = (): void => {
	let totalBytes = 0;
	for (const entry of privateTextCache.values()) {
		totalBytes += entry.estimatedBytes;
	}

	while (
		privateTextCache.size > PRIVATE_TEXT_CACHE_MAX_ITEMS ||
		totalBytes > PRIVATE_TEXT_CACHE_MAX_BYTES
	) {
		const oldestKey = privateTextCache.keys().next().value;
		if (!oldestKey) return;
		const oldest = privateTextCache.get(oldestKey);
		totalBytes -= oldest?.estimatedBytes ?? 0;
		privateTextCache.delete(oldestKey);
	}
};

const logSlowR2 = (label: string, startedAt: number, key: string): void => {
	const elapsed = Date.now() - startedAt;
	if (elapsed < SLOW_R2_LOG_MS) return;
	console.warn(`[r2-private] slow ${label}: ${elapsed}ms ${key}`);
};

const encodeRfc3986 = (value: string): string =>
	encodeURIComponent(value).replace(/[!'()*]/g, (char) =>
		`%${char.charCodeAt(0).toString(16).toUpperCase()}`
	);

const encodePath = (value: string): string => value.split('/').map(encodeRfc3986).join('/');

const hmac = (key: Buffer | string, value: string): Buffer =>
	createHmac('sha256', key).update(value, 'utf8').digest();

const sha256Hex = (value: string): string => createHash('sha256').update(value, 'utf8').digest('hex');

const toAmzDate = (date: Date): { amzDate: string; dateStamp: string } => {
	const iso = date.toISOString().replace(/[:-]|\.\d{3}/g, '');
	return {
		amzDate: iso,
		dateStamp: iso.slice(0, 8)
	};
};

const assertR2Config = (): {
	accountId: string;
	accessKeyId: string;
	secretAccessKey: string;
	bucket: string;
	textPrefix: string;
} => {
	const accountId = (env.R2_TEXT_ACCOUNT_ID || env.R2_ACCOUNT_ID)?.trim();
	const accessKeyId = (env.R2_TEXT_ACCESS_KEY_ID || env.R2_ACCESS_KEY_ID)?.trim();
	const secretAccessKey = (env.R2_TEXT_SECRET_ACCESS_KEY || env.R2_SECRET_ACCESS_KEY)?.trim();
	const bucket = env.R2_TEXT_BUCKET?.trim();
	const textPrefix = env.R2_TEXT_PREFIX === undefined ? DEFAULT_TEXT_PREFIX : env.R2_TEXT_PREFIX.trim();

	if (!accountId || !accessKeyId || !secretAccessKey || !bucket) {
		const missing = [
			['R2_TEXT_ACCOUNT_ID', accountId],
			['R2_TEXT_ACCESS_KEY_ID', accessKeyId],
			['R2_TEXT_SECRET_ACCESS_KEY', secretAccessKey],
			['R2_TEXT_BUCKET', bucket]
		]
			.filter(([, value]) => !value)
			.map(([key]) => key);
		throw new Error(`Faltan variables R2 privadas: ${missing.join(', ')}.`);
	}

	return {
		accountId,
		accessKeyId,
		secretAccessKey,
		bucket,
		textPrefix: textPrefix.replace(/^\/+|\/+$/g, '')
	};
};

const ensurePlainFileName = (value: string): string => {
	const trimmed = value.trim();
	if (!trimmed || trimmed.includes('/') || trimmed.includes('\\') || trimmed.includes('..')) {
		throw new Error('Clave de texto R2 invalida.');
	}
	return trimmed;
};

const joinTextKey = (textPrefix: string, fileName: string): string =>
	textPrefix ? `${textPrefix.replace(/^\/+|\/+$/g, '')}/${fileName}` : fileName;

const uniqueTextPrefixes = (preferredPrefix: string): string[] => {
	const prefixes = [preferredPrefix, '', DEFAULT_TEXT_PREFIX].map((value) =>
		value.replace(/^\/+|\/+$/g, '')
	);
	return Array.from(new Set(prefixes));
};

const signedR2Get = async (key: string, range?: string): Promise<Response> => {
	const { accountId, accessKeyId, secretAccessKey, bucket } = assertR2Config();
	const host = `${accountId}.r2.cloudflarestorage.com`;
	const canonicalUri = `/${encodeRfc3986(bucket)}/${encodePath(key)}`;
	const { amzDate, dateStamp } = toAmzDate(new Date());
	const credentialScope = `${dateStamp}/${R2_REGION}/${R2_SERVICE}/aws4_request`;
	const signedHeaders = range ? 'host;range;x-amz-content-sha256;x-amz-date' : 'host;x-amz-content-sha256;x-amz-date';
	const canonicalHeaders =
		`host:${host}\n` +
		(range ? `range:${range}\n` : '') +
		`x-amz-content-sha256:${R2_PAYLOAD_HASH}\n` +
		`x-amz-date:${amzDate}\n`;
	const canonicalRequest =
		`GET\n${canonicalUri}\n\n${canonicalHeaders}\n${signedHeaders}\n${R2_PAYLOAD_HASH}`;
	const stringToSign =
		`AWS4-HMAC-SHA256\n${amzDate}\n${credentialScope}\n${sha256Hex(canonicalRequest)}`;
	const dateKey = hmac(`AWS4${secretAccessKey}`, dateStamp);
	const regionKey = hmac(dateKey, R2_REGION);
	const serviceKey = hmac(regionKey, R2_SERVICE);
	const signingKey = hmac(serviceKey, 'aws4_request');
	const signature = createHmac('sha256', signingKey).update(stringToSign, 'utf8').digest('hex');
	const authorization =
		`AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, ` +
		`SignedHeaders=${signedHeaders}, Signature=${signature}`;

	const headers: Record<string, string> = {
			authorization,
			'x-amz-content-sha256': R2_PAYLOAD_HASH,
			'x-amz-date': amzDate
	};
	if (range) headers.range = range;

	return fetch(`https://${host}${canonicalUri}`, {
		headers
	});
};

const loadPrivateTextByFileName = async (fileName: string): Promise<string | null> => {
	const { textPrefix } = assertR2Config();
	const startedAt = Date.now();

	for (const prefix of uniqueTextPrefixes(textPrefix)) {
		const response = await signedR2Get(joinTextKey(prefix, fileName));
		if (response.status === 404) continue;
		if (!response.ok) {
			throw new Error(`No se pudo leer texto privado desde R2: ${response.status}`);
		}

		const text = await response.text();
		logSlowR2('text read', startedAt, fileName);
		return text;
	}

	logSlowR2('text miss', startedAt, fileName);
	return null;
};

export const readPrivateTextByTextKey = async (textKey: string): Promise<string | null> => {
	const fileName = ensurePlainFileName(textKey);
	const now = Date.now();
	const cached = privateTextCache.get(fileName);

	if (cached?.promise) return cached.promise;
	if (cached && now - cached.cachedAt < PRIVATE_TEXT_CACHE_TTL_MS) {
		privateTextCache.delete(fileName);
		privateTextCache.set(fileName, cached);
		return cached.value ?? null;
	}

	const promise = loadPrivateTextByFileName(fileName)
		.then((value) => {
			const entry: PrivateTextCacheEntry = {
				cachedAt: Date.now(),
				estimatedBytes: estimateTextBytes(value),
				value
			};
			privateTextCache.set(fileName, entry);
			prunePrivateTextCache();
			return value;
		})
		.catch((cause) => {
			privateTextCache.delete(fileName);
			throw cause;
		});

	privateTextCache.set(fileName, {
		cachedAt: now,
		estimatedBytes: 0,
		promise
	});

	return promise;
};

export const readPrivateTextByWorkId = async (workId: string): Promise<string | null> =>
	readPrivateTextByTextKey(`${ensurePlainFileName(workId)}.txt`);

export const readPrivateTextRangeByTextKey = async (
	textKey: string,
	startByte: number,
	endByte: number
): Promise<string | null> => {
	const { textPrefix } = assertR2Config();
	const fileName = ensurePlainFileName(textKey);
	const start = Math.max(0, Math.floor(startByte));
	const end = Math.max(start, Math.floor(endByte));

	for (const prefix of uniqueTextPrefixes(textPrefix)) {
		const response = await signedR2Get(joinTextKey(prefix, fileName), `bytes=${start}-${end}`);
		if (response.status === 404) continue;
		if (response.status === 416) return null;
		if (!response.ok && response.status !== 206) {
			throw new Error(`No se pudo leer rango privado desde R2: ${response.status}`);
		}

		return response.text();
	}

	return null;
};
