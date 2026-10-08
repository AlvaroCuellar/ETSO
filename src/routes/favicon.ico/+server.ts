import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// Browsers and crawlers may request this conventional URL even with an explicit icon.
export const GET: RequestHandler = () => {
	throw redirect(308, '/favicon.svg');
};
