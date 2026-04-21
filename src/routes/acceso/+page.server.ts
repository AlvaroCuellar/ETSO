import { redirect } from '@sveltejs/kit';

import {
	hasValidAccessCookie,
	isAccessGateEnabled,
	normalizeAccessRedirectTarget
} from '$lib/server/access-gate';

import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ cookies, url }) => {
	const next = normalizeAccessRedirectTarget(url.searchParams.get('next'));
	const invalid = url.searchParams.get('error') === 'invalid';

	if (!isAccessGateEnabled()) {
		throw redirect(303, next);
	}

	if (hasValidAccessCookie(cookies)) {
		throw redirect(303, next);
	}

	return {
		next,
		invalid
	};
};
