import { redirect } from '@sveltejs/kit';
import { localizePath } from '$lib/i18n';

import type { RequestHandler } from './$types';

export const trailingSlash = 'ignore';

export const GET: RequestHandler = ({ locals, url }) => {
	throw redirect(308, `${localizePath('/examen-autorias', locals.locale)}${url.search}`);
};
