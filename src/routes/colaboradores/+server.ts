import { redirect } from '@sveltejs/kit';
import { localizePath } from '$lib/i18n';

import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ locals }) => {
	throw redirect(308, localizePath('/equipo', locals.locale));
};
