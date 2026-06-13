import { splitLocalePath } from '$lib/i18n';

import type { Reroute } from '@sveltejs/kit';

export const reroute: Reroute = ({ url }) => {
	const { locale, pathname } = splitLocalePath(url.pathname);
	if (locale === 'es') return;
	return pathname;
};
