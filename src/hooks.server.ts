import { redirect, type Handle } from '@sveltejs/kit';

import { getLocaleFromPath, localizePath, stripLocaleFromPath } from '$lib/i18n';
import { createLocalizedHtmlTransformer } from '$lib/server/i18n-html';
import {
	hasValidAccessCookie,
	isAccessGateEnabled,
	normalizeAccessRedirectTarget
} from '$lib/server/access-gate';
import { checkRateLimit } from '$lib/server/rate-limit';

const UNPROTECTED_PATHS = new Set(['/acceso']);
const TEXORO_API_RATE_LIMIT = {
	name: 'texoro-api',
	windowMs: 10 * 60 * 1000,
	max: 140
};

const getClientRateLimitKey = (event: Parameters<Handle>[0]['event']): string => {
	try {
		return event.getClientAddress();
	} catch {
		return event.request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
	}
};

const isTexoroDataRoute = (internalPathname: string): boolean =>
	internalPathname.startsWith('/api/texoro/search') ||
	internalPathname.startsWith('/api/texoro/previews') ||
	internalPathname.startsWith('/api/texoro/occurrences') ||
	internalPathname.startsWith('/api/texoro/export.xlsx');

const buildRateLimitResponse = (retryAfterSeconds: number): Response =>
	new Response('Demasiadas solicitudes. Intentalo de nuevo mas tarde.', {
		status: 429,
		headers: {
			'content-type': 'text/plain; charset=utf-8',
			'retry-after': String(retryAfterSeconds),
			'cache-control': 'no-store'
		}
	});

const checkTexoroRateLimit = (event: Parameters<Handle>[0]['event'], internalPathname: string): Response | null => {
	if (!isTexoroDataRoute(internalPathname)) return null;

	const result = checkRateLimit(getClientRateLimitKey(event), TEXORO_API_RATE_LIMIT);
	return result.limited ? buildRateLimitResponse(result.retryAfterSeconds) : null;
};

export const handle: Handle = async ({ event, resolve }) => {
	const locale = getLocaleFromPath(event.url.pathname);
	event.locals.locale = locale;
	const transformHtml = createLocalizedHtmlTransformer(locale);
	const resolveWithLocale = () =>
		resolve(event, {
			transformPageChunk: ({ html, done }) => transformHtml(html, done)
		});
	const { pathname, search } = event.url;
	const internalPathname = stripLocaleFromPath(pathname);

	if (!isAccessGateEnabled()) {
		return checkTexoroRateLimit(event, internalPathname) ?? resolveWithLocale();
	}

	const isAccessPath = UNPROTECTED_PATHS.has(internalPathname) || internalPathname.startsWith('/acceso/');
	if (isAccessPath || internalPathname.startsWith('/_app/')) {
		return resolveWithLocale();
	}

	if (hasValidAccessCookie(event.cookies)) {
		return checkTexoroRateLimit(event, internalPathname) ?? resolveWithLocale();
	}

	const next = normalizeAccessRedirectTarget(`${pathname}${search}`);
	throw redirect(303, `${localizePath('/acceso', locale)}?next=${encodeURIComponent(next)}`);
};
