import { dev } from '$app/environment';
import { env } from '$env/dynamic/private';
import { getFeedbackRecipientEmail } from '$lib/server/feedback-email';
import { json } from '@sveltejs/kit';

import type { RequestHandler } from './$types';

const MAX_FIELD_LENGTH = 4000;

const cleanField = (value: FormDataEntryValue | null): string =>
	typeof value === 'string' ? value.trim().slice(0, MAX_FIELD_LENGTH) : '';

const escapeHtml = (value: string): string =>
	value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');

export const POST: RequestHandler = async ({ request, getClientAddress }) => {
	const formData = await request.formData();
	const honeypot = cleanField(formData.get('website'));
	if (honeypot) {
		return json({ ok: true, delivered: false });
	}

	const message = cleanField(formData.get('message'));
	const pageUrl = cleanField(formData.get('pageUrl'));
	const category = cleanField(formData.get('category')) || 'Sugerencia o error';
	const name = cleanField(formData.get('name'));
	const email = cleanField(formData.get('email'));
	const recipient = getFeedbackRecipientEmail();

	if (message.length < 8) {
		return json({ ok: false, error: 'El mensaje es demasiado breve.' }, { status: 400 });
	}

	const subject = `[ETSO] ${category}`;
	const text = [
		`Tipo: ${category}`,
		`Página: ${pageUrl || 'No indicada'}`,
		`Nombre del usuario: ${name || 'No indicado'}`,
		`Correo del usuario: ${email || 'No indicado'}`,
		`IP: ${getClientAddress()}`,
		'',
		'Mensaje:',
		message
	].join('\n');

	const html = `
		<p><strong>Tipo:</strong> ${escapeHtml(category)}</p>
		<p><strong>Página:</strong> ${pageUrl ? `<a href="${escapeHtml(pageUrl)}">${escapeHtml(pageUrl)}</a>` : 'No indicada'}</p>
		<p><strong>Nombre del usuario:</strong> ${escapeHtml(name || 'No indicado')}</p>
		<p><strong>Correo del usuario:</strong> ${escapeHtml(email || 'No indicado')}</p>
		<p><strong>IP:</strong> ${escapeHtml(getClientAddress())}</p>
		<hr>
		<p>${escapeHtml(message).replace(/\n/g, '<br>')}</p>
	`;

	if (!env.RESEND_API_KEY) {
		if (dev) {
			console.info('[ETSO feedback local preview]', text);
			return json({ ok: true, delivered: false, mode: 'local-preview' });
		}

		return json(
			{
				ok: false,
				error: 'El envío directo no está configurado.'
			},
			{ status: 503 }
		);
	}

	const response = await fetch('https://api.resend.com/emails', {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${env.RESEND_API_KEY}`,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			from: env.FEEDBACK_FROM_EMAIL || 'ETSO <onboarding@resend.dev>',
			to: [recipient],
			reply_to: email || undefined,
			subject,
			text,
			html
		})
	});

	if (!response.ok) {
		const detail = await response.text().catch(() => '');
		console.error('No se pudo enviar feedback ETSO', response.status, detail);
		const isResendDevRecipientError =
			response.status === 403 &&
			/detail|resend\.dev|own email address|testing emails/i.test(detail);
		return json(
			{
				ok: false,
				error: isResendDevRecipientError
					? 'Resend solo permite usar onboarding@resend.dev con el correo de la cuenta. Verifica un dominio o cambia el destinatario de prueba.'
					: 'No se pudo enviar el mensaje.'
			},
			{ status: 502 }
		);
	}

	return json({ ok: true, delivered: true });
};
