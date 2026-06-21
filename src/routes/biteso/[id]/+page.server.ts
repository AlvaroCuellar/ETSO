import { error, fail, redirect } from '@sveltejs/kit';
import { setPublicCatalogCacheHeaders } from '$lib/server/cache-control';
import { localizePath } from '$lib/i18n';
import {
	buildBitesoCitation,
	getBitesoBySlug,
	getBitesoWorkBySlug,
	getWorkById
} from '$lib/server/catalog-runtime';
import { submitCorrectionEmail } from '$lib/server/biteso-correction-proposals';

import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params, setHeaders }) => {
	const biteso = await getBitesoBySlug(params.id);
	if (!biteso) {
		const bitesoWork = await getBitesoWorkBySlug(params.id);
		if (bitesoWork) {
			throw error(
				500,
				`Texto BITESO no disponible en R2 para ${bitesoWork.id}. Revisa R2_TEXT_PREFIX y la clave ${bitesoWork.id}.txt.`
			);
		}

		const legacyWork = await getWorkById(params.id);
		const bitesoLink = legacyWork?.textLinks.find((link) => link.kind === 'biteso');
		if (bitesoLink) {
			throw redirect(308, localizePath(bitesoLink.href, locals.locale));
		}
		throw error(404, 'Texto BITESO no encontrado');
	}

	const work = await getWorkById(biteso.workId);
	if (!work) throw error(500, 'Obra vinculada no disponible');
	if (params.id !== biteso.id) throw redirect(308, localizePath(`/biteso/${biteso.id}`, locals.locale));

	const canonicalUrl = `https://etso.es/biteso/${biteso.id}`;
	const citation = buildBitesoCitation({
		bitesoNombre: biteso.bitesoNombre,
		title: work.title,
		canonicalUrl
	});

	setPublicCatalogCacheHeaders(setHeaders);
	return {
		biteso,
		work,
		citation,
		canonicalUrl,
		publishedOn: work.bitesoPublishedOn ?? ''
	};
};

export const actions: Actions = {
	default: async ({ request, params, url, getClientAddress }) => {
		const biteso = await getBitesoBySlug(params.id);
		if (!biteso) {
			return fail(404, {
				correctionProposal: {
					ok: false,
					message: 'Texto BITESO no encontrado.'
				}
			});
		}

		const work = await getWorkById(biteso.workId);
		if (!work) {
			return fail(500, {
				correctionProposal: {
					ok: false,
					message: 'Obra vinculada no disponible.'
				}
			});
		}

		const formData = await request.formData();
		try {
			const result = await submitCorrectionEmail({
				formData,
				kind: 'biteso',
				workId: biteso.workId,
				workSlug: biteso.id,
				workTitle: work.title,
				originalText: biteso.text,
				sourceUrl: url.toString(),
				clientAddress: getClientAddress()
			});

			return {
				correctionProposal: {
					ok: true,
					message:
						'Gracias. Tu propuesta de corrección se ha enviado correctamente y será revisada antes de incorporarse a BITESO.',
					emailDelivered: result.emailDelivered
				}
			};
		} catch (cause) {
			const message = cause instanceof Error ? cause.message : 'No se pudo enviar la propuesta.';
			return fail(400, {
				correctionProposal: {
					ok: false,
					message
				}
			});
		}
	}
};
