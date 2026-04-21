import { fail, redirect } from '@sveltejs/kit';

import {
	clearAccessCookie,
	hasValidAccessCookie,
	isAccessGateEnabled,
	isAccessPasswordValid,
	normalizeAccessRedirectTarget,
	setAccessCookie
} from '$lib/server/access-gate';

import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ cookies, url }) => {
	const next = normalizeAccessRedirectTarget(url.searchParams.get('next'));

	if (!isAccessGateEnabled()) {
		throw redirect(303, next);
	}

	if (hasValidAccessCookie(cookies)) {
		throw redirect(303, next);
	}

	return {
		next
	};
};

export const actions: Actions = {
	default: async ({ request, cookies }) => {
		if (!isAccessGateEnabled()) {
			throw redirect(303, '/');
		}

		const data = await request.formData();
		const passwordValue = data.get('password');
		const nextValue = data.get('next');
		const password = typeof passwordValue === 'string' ? passwordValue : '';
		const next = normalizeAccessRedirectTarget(typeof nextValue === 'string' ? nextValue : '/');

		if (!isAccessPasswordValid(password)) {
			return fail(400, {
				next,
				invalid: true
			});
		}

		setAccessCookie(cookies);
		throw redirect(303, next);
	},
	logout: async ({ cookies }) => {
		clearAccessCookie(cookies);
		throw redirect(303, '/acceso');
	}
};
