import { redirect, type Handle } from '@sveltejs/kit';

import { getLocaleFromPath, localizePath, stripLocaleFromPath } from '$lib/i18n';
import { createLocalizedHtmlTransformer } from '$lib/server/i18n-html';
import {
	hasValidAccessCookie,
	isAccessGateEnabled,
	normalizeAccessRedirectTarget
} from '$lib/server/access-gate';

const UNPROTECTED_PATHS = new Set(['/acceso']);

export const handle: Handle = async ({ event, resolve }) => {
	const locale = getLocaleFromPath(event.url.pathname);
	event.locals.locale = locale;

	if (!isAccessGateEnabled()) {
		const transformHtml = createLocalizedHtmlTransformer(locale);
		return resolve(event, {
			transformPageChunk: ({ html, done }) => transformHtml(html, done)
		});
	}

	const { pathname, search } = event.url;
	const internalPathname = stripLocaleFromPath(pathname);
	const isAccessPath = UNPROTECTED_PATHS.has(internalPathname) || internalPathname.startsWith('/acceso/');
	if (isAccessPath || internalPathname.startsWith('/_app/')) {
		const transformHtml = createLocalizedHtmlTransformer(locale);
		return resolve(event, {
			transformPageChunk: ({ html, done }) => transformHtml(html, done)
		});
	}

	if (hasValidAccessCookie(event.cookies)) {
		const transformHtml = createLocalizedHtmlTransformer(locale);
		return resolve(event, {
			transformPageChunk: ({ html, done }) => transformHtml(html, done)
		});
	}

	const next = normalizeAccessRedirectTarget(`${pathname}${search}`);
	throw redirect(303, `${localizePath('/acceso', locale)}?next=${encodeURIComponent(next)}`);
};
