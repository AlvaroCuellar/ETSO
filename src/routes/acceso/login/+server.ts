import { redirect } from '@sveltejs/kit';

import {
	isAccessGateEnabled,
	isAccessPasswordValid,
	normalizeAccessRedirectTarget,
	setAccessCookie
} from '$lib/server/access-gate';

import type { RequestHandler } from './$types';

const buildInvalidRedirect = (next: string): string =>
	`/acceso?next=${encodeURIComponent(next)}&error=invalid`;

export const POST: RequestHandler = async ({ request, cookies }) => {
	if (!isAccessGateEnabled()) {
		throw redirect(303, '/');
	}

	const body = new URLSearchParams(await request.text());
	const password = body.get('password') ?? '';
	const next = normalizeAccessRedirectTarget(body.get('next'));

	if (!isAccessPasswordValid(password)) {
		throw redirect(303, buildInvalidRedirect(next));
	}

	setAccessCookie(cookies);
	throw redirect(303, next);
};
