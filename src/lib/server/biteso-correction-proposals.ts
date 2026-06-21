import { createHash } from 'node:crypto';

import { dev } from '$app/environment';
import { env } from '$env/dynamic/private';
import { checkRateLimit } from '$lib/server/rate-limit';

const MAX_TEXT_LENGTH = 2_500_000;
const MAX_NAME_LENGTH = 160;
const MAX_EMAIL_LENGTH = 320;
const MAX_COMMENT_LENGTH = 4000;
const MAX_DIFF_LENGTH = 12_000;
const RATE_LIMIT_RULE = {
	name: 'correction-proposals',
	windowMs: 60 * 60 * 1000,
	max: 5
};

interface SubmitCorrectionEmailInput {
	formData: FormData;
	kind: 'biteso' | 'summary';
	workId: string;
	workSlug: string;
	workTitle: string;
	originalText: string;
	sourceUrl: string;
	clientAddress: string;
}

export interface SubmitCorrectionEmailResult {
	ok: true;
	emailDelivered: boolean;
}

const normalizeLineEndings = (value: string): string => value.replace(/\r\n?/g, '\n');

const cleanOptionalField = (value: FormDataEntryValue | null, maxLength: number): string => {
	if (typeof value !== 'string') return '';
	return value
		.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '')
		.trim()
		.slice(0, maxLength);
};

const cleanTextarea = (value: FormDataEntryValue | null): string => {
	if (typeof value !== 'string') return '';
	return normalizeLineEndings(value)
		.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '')
		.slice(0, MAX_TEXT_LENGTH + 1);
};

const escapeHtml = (value: string): string =>
	value
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&#39;');

const truncate = (value: string, maxLength: number): string =>
	value.length <= maxLength ? value : `${value.slice(0, Math.max(0, maxLength - 24))}\n...[texto truncado]`;

const isValidEmail = (value: string): boolean => {
	if (!value) return true;
	if (value.length > MAX_EMAIL_LENGTH) return false;
	return /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(value);
};

const sha256 = (value: string): string => createHash('sha256').update(value, 'utf8').digest('hex');

const countLines = (value: string): number => (value.length === 0 ? 0 : value.split('\n').length);

const findFirstDifferentLine = (originalLines: string[], proposedLines: string[]): number => {
	const max = Math.max(originalLines.length, proposedLines.length);
	for (let index = 0; index < max; index += 1) {
		if ((originalLines[index] ?? '') !== (proposedLines[index] ?? '')) return index;
	}
	return -1;
};

const buildChangeSummary = (originalText: string, proposedText: string): string => {
	const originalLines = originalText.split('\n');
	const proposedLines = proposedText.split('\n');
	const firstDifferentLine = findFirstDifferentLine(originalLines, proposedLines);

	if (firstDifferentLine < 0) {
		return [
			'Sin cambios directos en el textarea.',
			`SHA256 original: ${sha256(originalText)}`,
			`SHA256 propuesta: ${sha256(proposedText)}`
		].join('\n');
	}

	const contextStart = Math.max(0, firstDifferentLine - 3);
	const contextEnd = Math.min(Math.max(originalLines.length, proposedLines.length) - 1, firstDifferentLine + 80);
	const lines = [
		`Resumen: ${originalText.length} -> ${proposedText.length} caracteres; ${countLines(originalText)} -> ${countLines(proposedText)} lineas.`,
		`SHA256 original: ${sha256(originalText)}`,
		`SHA256 propuesta: ${sha256(proposedText)}`,
		`Primer cambio aproximado: linea ${firstDifferentLine + 1}.`,
		'',
		'Fragmento comparativo aproximado:',
		'--- original',
		'+++ propuesta'
	];

	for (let index = contextStart; index <= contextEnd; index += 1) {
		const originalLine = originalLines[index];
		const proposedLine = proposedLines[index];
		if (originalLine === proposedLine) {
			lines.push(` ${index + 1}: ${originalLine ?? ''}`);
			continue;
		}
		if (originalLine !== undefined) lines.push(`-${index + 1}: ${originalLine}`);
		if (proposedLine !== undefined) lines.push(`+${index + 1}: ${proposedLine}`);
		if (lines.join('\n').length > MAX_DIFF_LENGTH) break;
	}

	return truncate(lines.join('\n'), MAX_DIFF_LENGTH);
};

export const submitCorrectionEmail = async ({
	formData,
	kind,
	workId,
	workSlug,
	workTitle,
	originalText,
	sourceUrl,
	clientAddress
}: SubmitCorrectionEmailInput): Promise<SubmitCorrectionEmailResult> => {
	const honeypot = cleanOptionalField(formData.get('website'), 200);
	if (honeypot) throw new Error('Solicitud no válida.');

	const rateLimit = checkRateLimit(clientAddress || 'unknown', RATE_LIMIT_RULE);
	if (rateLimit.limited) {
		throw new Error('Demasiados envíos. Inténtalo de nuevo más tarde.');
	}

	const normalizedOriginalText = normalizeLineEndings(originalText).slice(0, MAX_TEXT_LENGTH);
	const proposedTextInput = cleanTextarea(formData.get('proposed_text'));
	const contributorName = cleanOptionalField(formData.get('contributor_name'), MAX_NAME_LENGTH);
	const contributorEmail = cleanOptionalField(formData.get('contributor_email'), MAX_EMAIL_LENGTH);
	const contributorComment = cleanOptionalField(formData.get('contributor_comment'), MAX_COMMENT_LENGTH);
	const proposedText = proposedTextInput.trim() ? proposedTextInput : normalizedOriginalText;

	if (!proposedTextInput.trim() && !contributorComment) {
		throw new Error('La propuesta debe incluir una corrección textual o un comentario.');
	}
	if (proposedTextInput.length > MAX_TEXT_LENGTH) {
		throw new Error('La propuesta supera la longitud máxima permitida.');
	}
	if (proposedText === normalizedOriginalText && !contributorComment) {
		throw new Error(kind === 'biteso' ? 'La propuesta debe ser distinta del texto actual.' : 'La propuesta debe ser distinta del resumen actual.');
	}
	if (!isValidEmail(contributorEmail)) {
		throw new Error('El email introducido no parece válido.');
	}

	const diffText = buildChangeSummary(normalizedOriginalText, proposedText);
	const recipient =
		kind === 'summary'
			? env.SUMMARY_CORRECTIONS_EMAIL?.trim() || env.BITESO_CORRECTIONS_EMAIL?.trim()
			: env.BITESO_CORRECTIONS_EMAIL?.trim();
	const label = kind === 'biteso' ? 'BITESO' : 'Resumen ETSO';
	const subject = `[${label}] Propuesta de corrección: ${workTitle}`;
	const text = [
		`Tipo: ${label}`,
		`Obra: ${workTitle}`,
		`ID: ${workId}`,
		`Slug: ${workSlug}`,
		`URL: ${sourceUrl}`,
		`Fecha: ${new Date().toISOString()}`,
		`Colaborador: ${contributorName || 'No indicado'}`,
		`Email colaborador: ${contributorEmail || 'No indicado'}`,
		'',
		'Comentario:',
		contributorComment || 'No indicado',
		'',
		'Resumen de cambios:',
		diffText
	].join('\n');
	const html = `
		<p><strong>Tipo:</strong> ${escapeHtml(label)}</p>
		<p><strong>Obra:</strong> ${escapeHtml(workTitle)}</p>
		<p><strong>ID:</strong> ${escapeHtml(workId)}</p>
		<p><strong>Slug:</strong> ${escapeHtml(workSlug)}</p>
		<p><strong>URL:</strong> <a href="${escapeHtml(sourceUrl)}">${escapeHtml(sourceUrl)}</a></p>
		<p><strong>Colaborador:</strong> ${escapeHtml(contributorName || 'No indicado')}</p>
		<p><strong>Email colaborador:</strong> ${escapeHtml(contributorEmail || 'No indicado')}</p>
		<hr>
		<p><strong>Comentario:</strong></p>
		<pre style="white-space:pre-wrap">${escapeHtml(contributorComment || 'No indicado')}</pre>
		<p><strong>Resumen de cambios:</strong></p>
		<pre style="white-space:pre-wrap">${escapeHtml(diffText)}</pre>
	`;

	if (!recipient || !env.RESEND_API_KEY) {
		if (dev) {
			console.info('[ETSO correction proposal local preview]', text);
		} else {
			console.warn('No se envio aviso de propuesta: faltan destinatario o RESEND_API_KEY.');
		}
		return { ok: true, emailDelivered: false };
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
			reply_to: contributorEmail || undefined,
			subject,
			text,
			html
		})
	});

	if (!response.ok) {
		const detail = await response.text().catch(() => '');
		console.error('No se pudo enviar aviso de propuesta', response.status, detail);
		return { ok: true, emailDelivered: false };
	}

	return { ok: true, emailDelivered: true };
};
