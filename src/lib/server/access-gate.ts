import { dev } from '$app/environment';
import { env as privateEnv } from '$env/dynamic/private';
import type { Cookies } from '@sveltejs/kit';
import { createHash, timingSafeEqual } from 'node:crypto';

const ACCESS_COOKIE_NAME = 'etso_access';
const ACCESS_COOKIE_NAMESPACE = 'etso-site-access-v1';

const toHash = (value: string): string =>
	createHash('sha256').update(`${ACCESS_COOKIE_NAMESPACE}:${value}`).digest('base64url');

const safeCompare = (left: string, right: string): boolean => {
	const leftBuffer = Buffer.from(left);
	const rightBuffer = Buffer.from(right);
	if (leftBuffer.length !== rightBuffer.length) return false;
	return timingSafeEqual(leftBuffer, rightBuffer);
};

export const getAccessPassword = (): string => privateEnv.SITE_ACCESS_PASSWORD?.trim() ?? '';

export const isAccessGateEnabled = (): boolean => getAccessPassword().length > 0;

export const isAccessPasswordValid = (password: string): boolean => {
	const expected = getAccessPassword();
	if (!expected) return true;
	return safeCompare(password.trim(), expected);
};

export const hasValidAccessCookie = (cookies: Cookies): boolean => {
	if (!isAccessGateEnabled()) return true;
	const current = cookies.get(ACCESS_COOKIE_NAME) ?? '';
	const expected = toHash(getAccessPassword());
	return current.length > 0 && safeCompare(current, expected);
};

export const setAccessCookie = (cookies: Cookies): void => {
	cookies.set(ACCESS_COOKIE_NAME, toHash(getAccessPassword()), {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: !dev,
		maxAge: 60 * 60 * 24 * 30
	});
};

export const clearAccessCookie = (cookies: Cookies): void => {
	cookies.delete(ACCESS_COOKIE_NAME, {
		path: '/'
	});
};

export const normalizeAccessRedirectTarget = (value: string | null | undefined): string => {
	const raw = value?.trim() ?? '';
	if (!raw.startsWith('/')) return '/';
	if (raw.startsWith('//')) return '/';
	if (raw === '/acceso' || raw.startsWith('/acceso?')) return '/';
	return raw;
};
