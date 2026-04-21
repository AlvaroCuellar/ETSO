import { redirect } from '@sveltejs/kit';

import {
	hasValidAccessCookie,
	isAccessGateEnabled,
	normalizeAccessRedirectTarget
} from '$lib/server/access-gate';

import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ cookies, url }) => {
	if (!isAccessGateEnabled()) {
		return {};
	}

	const { pathname, search } = url;
	if (pathname === '/acceso' || pathname.startsWith('/acceso/')) {
		return {};
	}

	if (hasValidAccessCookie(cookies)) {
		return {};
	}

	const next = normalizeAccessRedirectTarget(`${pathname}${search}`);
	throw redirect(303, `/acceso?next=${encodeURIComponent(next)}`);
};
