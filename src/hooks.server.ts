import { redirect, type Handle } from '@sveltejs/kit';

import {
	hasValidAccessCookie,
	isAccessGateEnabled,
	normalizeAccessRedirectTarget
} from '$lib/server/access-gate';

const UNPROTECTED_PATHS = new Set(['/acceso']);

export const handle: Handle = async ({ event, resolve }) => {
	if (!isAccessGateEnabled()) {
		return resolve(event);
	}

	const { pathname, search } = event.url;
	const isAccessPath = UNPROTECTED_PATHS.has(pathname) || pathname.startsWith('/acceso/');
	if (isAccessPath || pathname.startsWith('/_app/')) {
		return resolve(event);
	}

	if (hasValidAccessCookie(event.cookies)) {
		return resolve(event);
	}

	const next = normalizeAccessRedirectTarget(`${pathname}${search}`);
	throw redirect(303, `/acceso?next=${encodeURIComponent(next)}`);
};
