import { createHash, createHmac } from 'node:crypto';

import { env } from '$env/dynamic/private';

const DEFAULT_TEXT_PREFIX = 'textos';
const R2_REGION = 'auto';
const R2_SERVICE = 's3';
const R2_PAYLOAD_HASH = 'UNSIGNED-PAYLOAD';

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

export const readPrivateTextByTextKey = async (textKey: string): Promise<string | null> => {
	const { textPrefix } = assertR2Config();
	const fileName = ensurePlainFileName(textKey);
	const response = await signedR2Get(joinTextKey(textPrefix, fileName));

	if (response.status === 404) return null;
	if (!response.ok) {
		throw new Error(`No se pudo leer texto privado desde R2: ${response.status}`);
	}

	return response.text();
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
	const response = await signedR2Get(joinTextKey(textPrefix, fileName), `bytes=${start}-${end}`);

	if (response.status === 404 || response.status === 416) return null;
	if (!response.ok && response.status !== 206) {
		throw new Error(`No se pudo leer rango privado desde R2: ${response.status}`);
	}

	return response.text();
};
