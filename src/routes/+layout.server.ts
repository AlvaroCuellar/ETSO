import { redirect } from '@sveltejs/kit';

import { getLocaleFromPath, localizePath, stripLocaleFromPath } from '$lib/i18n';
import {
	hasValidAccessCookie,
	isAccessGateEnabled,
	normalizeAccessRedirectTarget
} from '$lib/server/access-gate';

import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ cookies, url }) => {
	const locale = getLocaleFromPath(url.pathname);

	if (!isAccessGateEnabled()) {
		return { locale };
	}

	const { pathname, search } = url;
	const internalPathname = stripLocaleFromPath(pathname);
	if (internalPathname === '/acceso' || internalPathname.startsWith('/acceso/')) {
		return { locale };
	}

	if (hasValidAccessCookie(cookies)) {
		return { locale };
	}

	const next = normalizeAccessRedirectTarget(`${pathname}${search}`);
	throw redirect(303, `${localizePath('/acceso', locale)}?next=${encodeURIComponent(next)}`);
};
