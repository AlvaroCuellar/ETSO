import { error, fail, redirect } from '@sveltejs/kit';
import { setPublicCatalogCacheHeaders } from '$lib/server/cache-control';
import { localizePath } from '$lib/i18n';
import {
	getWorkByPublicId,
	getWorkBySlug,
	getWorkSummaryDetailById
} from '$lib/server/catalog-runtime';
import { getPublicSummaryAssetUrl } from '$lib/server/r2-public';
import { submitCorrectionEmail } from '$lib/server/biteso-correction-proposals';
import { buildSummaryCorrectionText } from '$lib/utils/summary-correction-text';

import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params, setHeaders }) => {
	const work = await getWorkBySlug(params.slug);
	if (!work) {
		const publicId = /^\d+$/.test(params.slug) ? Number.parseInt(params.slug, 10) : null;
		const publicIdWork = publicId === null ? undefined : await getWorkByPublicId(publicId);
		if (publicIdWork) {
			throw redirect(308, localizePath(`/obras/${publicIdWork.slug}/resumen`, locals.locale));
		}
		throw error(404, 'Obra no encontrada');
	}

	setPublicCatalogCacheHeaders(setHeaders);
	return {
		work,
		summaryUrl: getPublicSummaryAssetUrl(`${work.id}.json`),
		publishedOn: work.summaryPublishedOn ?? ''
	};
};

export const actions: Actions = {
	default: async ({ request, params, url, getClientAddress }) => {
		const work = await getWorkBySlug(params.slug);
		if (!work) {
			return fail(404, {
				summaryCorrectionProposal: {
					ok: false,
					message: 'Obra no encontrada.'
				}
			});
		}

		const summary = await getWorkSummaryDetailById(work.id);
		if (!summary) {
			return fail(404, {
				summaryCorrectionProposal: {
					ok: false,
					message: 'Resumen no encontrado.'
				}
			});
		}

		const originalText = buildSummaryCorrectionText({
			shortSummary: work.shortSummary,
			resumenLargo: summary.resumenLargo,
			personajes: summary.personajes,
			espacios: summary.espacios,
			tematicas: summary.tematicas
		});
		const formData = await request.formData();

		try {
			const result = await submitCorrectionEmail({
				formData,
				kind: 'summary',
				workId: work.id,
				workSlug: work.slug,
				workTitle: work.title,
				originalText,
				sourceUrl: url.toString(),
				clientAddress: getClientAddress()
			});

			return {
				summaryCorrectionProposal: {
					ok: true,
					message:
						'Gracias. Tu propuesta de corrección se ha enviado correctamente y será revisada antes de incorporarse a ETSO.',
					emailDelivered: result.emailDelivered
				}
			};
		} catch (cause) {
			const message = cause instanceof Error ? cause.message : 'No se pudo enviar la propuesta.';
			return fail(400, {
				summaryCorrectionProposal: {
					ok: false,
					message
				}
			});
		}
	}
};
