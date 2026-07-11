import type { Handle } from '@sveltejs/kit';

import { getLocaleFromPath, localizePath, stripLocaleFromPath } from '$lib/i18n';
import { createLocalizedHtmlTransformer } from '$lib/server/i18n-html';
import {
	PRIVATE_ACCESS_GATE_CACHE_CONTROL,
	PUBLIC_NOT_FOUND_CACHE_CONTROL,
	PUBLIC_PAGE_CACHE_CONTROL,
	PUBLIC_PERMANENT_REDIRECT_CACHE_CONTROL
} from '$lib/server/cache-control';
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

const PRIVATE_ROUTE_SEGMENTS = new Set([
	'admin',
	'administracion',
	'edit',
	'editar',
	'edicion',
	'preview',
	'previsualizacion'
]);

const isPrivateRoute = (internalPathname: string): boolean =>
	internalPathname === '/acceso' ||
	internalPathname.startsWith('/acceso/') ||
	internalPathname
		.split('/')
		.filter(Boolean)
		.some((segment) => PRIVATE_ROUTE_SEGMENTS.has(segment.toLowerCase()));

const appendVaryHeader = (headers: Headers, value: string): void => {
	const current = headers.get('vary');
	const values = new Set(
		(current ? current.split(',') : [])
			.map((entry) => entry.trim())
			.filter(Boolean)
	);
	values.add(value);
	headers.set('vary', Array.from(values).join(', '));
};

const setPrivateNoStore = (response: Response): Response => {
	response.headers.set('cache-control', PRIVATE_ACCESS_GATE_CACHE_CONTROL);
	return response;
};

const applyPublicResponseCache = (
	event: Parameters<Handle>[0]['event'],
	response: Response,
	internalPathname: string
): Response => {
	const { method, headers: requestHeaders } = event.request;
	const { pathname, search } = event.url;
	const contentType = response.headers.get('content-type') ?? '';
	const isPageResponse = contentType.startsWith('text/html') || pathname.endsWith('/__data.json');
	const isPermanentPageRedirect = response.status === 308 && !internalPathname.startsWith('/api/');
	const isRedirect = response.status >= 300 && response.status < 400;
	const hasCredentials = requestHeaders.has('cookie') || requestHeaders.has('authorization');
	const hasSetCookie = response.headers.has('set-cookie');
	const isEligibleMethod = method === 'GET' || method === 'HEAD';
	const isEligibleStatus = response.status === 200 || response.status === 404 || isPermanentPageRedirect;
	const isEligibleRequest =
		isEligibleMethod &&
		!hasCredentials &&
		!requestHeaders.has('range') &&
		search.length === 0 &&
		!isPrivateRoute(internalPathname);

	if (hasSetCookie || (isRedirect && !isPermanentPageRedirect)) return setPrivateNoStore(response);
	if (!isPageResponse && !isPermanentPageRedirect) return response;
	if (!isEligibleRequest || !isEligibleStatus) return setPrivateNoStore(response);

	const existingCacheControl = response.headers.get('cache-control') ?? '';
	if (/\b(?:private|no-cache|no-store)\b/i.test(existingCacheControl)) return response;

	if (response.status === 404) {
		response.headers.set('cache-control', PUBLIC_NOT_FOUND_CACHE_CONTROL);
	} else if (response.status === 308) {
		response.headers.set('cache-control', PUBLIC_PERMANENT_REDIRECT_CACHE_CONTROL);
	} else if (response.status === 200) {
		response.headers.set('cache-control', PUBLIC_PAGE_CACHE_CONTROL);
	}
	appendVaryHeader(response.headers, 'Cookie');

	return response;
};

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
		const rateLimitResponse = checkTexoroRateLimit(event, internalPathname);
		if (rateLimitResponse) return rateLimitResponse;
		const response = await resolveWithLocale();
		return applyPublicResponseCache(event, response, internalPathname);
	}

	const isAccessPath = UNPROTECTED_PATHS.has(internalPathname) || internalPathname.startsWith('/acceso/');
	if (isAccessPath || internalPathname.startsWith('/_app/')) {
		return setPrivateNoStore(await resolveWithLocale());
	}

	if (hasValidAccessCookie(event.cookies)) {
		const rateLimitResponse = checkTexoroRateLimit(event, internalPathname);
		return setPrivateNoStore(rateLimitResponse ?? (await resolveWithLocale()));
	}

	const next = normalizeAccessRedirectTarget(`${pathname}${search}`);
	return new Response(null, {
		status: 303,
		headers: {
			location: `${localizePath('/acceso', locale)}?next=${encodeURIComponent(next)}`,
			'cache-control': PRIVATE_ACCESS_GATE_CACHE_CONTROL
		}
	});
};
