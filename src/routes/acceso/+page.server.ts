import { redirect } from '@sveltejs/kit';
import { localizePath } from '$lib/i18n';

import {
	hasValidAccessCookie,
	isAccessGateEnabled,
	normalizeAccessRedirectTarget
} from '$lib/server/access-gate';

import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ cookies, locals, url }) => {
	const next = normalizeAccessRedirectTarget(url.searchParams.get('next'));
	const invalid = url.searchParams.get('error') === 'invalid';

	if (!isAccessGateEnabled()) {
		throw redirect(303, localizePath(next, locals.locale));
	}

	if (hasValidAccessCookie(cookies)) {
		throw redirect(303, localizePath(next, locals.locale));
	}

	return {
		next,
		invalid
	};
};
