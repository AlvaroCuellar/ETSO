import { redirect } from '@sveltejs/kit';
import { localizePath } from '$lib/i18n';

import {
	isAccessGateEnabled,
	isAccessPasswordValid,
	normalizeAccessRedirectTarget,
	setAccessCookie
} from '$lib/server/access-gate';

import type { RequestHandler } from './$types';

const buildInvalidRedirect = (next: string, locale: App.Locals['locale']): string =>
	`${localizePath('/acceso', locale)}?next=${encodeURIComponent(next)}&error=invalid`;

export const POST: RequestHandler = async ({ request, cookies, locals }) => {
	if (!isAccessGateEnabled()) {
		throw redirect(303, localizePath('/', locals.locale));
	}

	const body = new URLSearchParams(await request.text());
	const password = body.get('password') ?? '';
	const next = normalizeAccessRedirectTarget(body.get('next'));

	if (!isAccessPasswordValid(password)) {
		throw redirect(303, buildInvalidRedirect(next, locals.locale));
	}

	setAccessCookie(cookies);
	throw redirect(303, localizePath(next, locals.locale));
};
