const escapeHtml = (value: string): string =>
	value
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&#39;');

export const renderInlineItalicsHtml = (value: string): string =>
	// Escape everything first and only restore exact <i> tags from trusted content.
	escapeHtml(value).replaceAll('&lt;i&gt;', '<i>').replaceAll('&lt;/i&gt;', '</i>');

/** Link plain web addresses without accepting arbitrary HTML from the TSV. */
export const renderReportNoteHtml = (value: string): string => {
	let end = 0;
	let html = '';
	for (const match of value.matchAll(/https?:\/\/[^\s<>"']+/gi)) {
		let url = match[0].replace(/[.,;:!?]+$/, '');
		// A citation's closing parenthesis is punctuation; DOI parentheses may be part of its URL.
		while (url.endsWith(')') && (url.match(/\)/g)?.length ?? 0) > (url.match(/\(/g)?.length ?? 0)) {
			url = url.slice(0, -1);
		}
		html += renderInlineItalicsHtml(value.slice(end, match.index));
		html += `<a href="${escapeHtml(url)}" class="text-primary underline underline-offset-4 hover:opacity-80">${escapeHtml(url)}</a>`;
		end = match.index + url.length;
	}
	return html + renderInlineItalicsHtml(value.slice(end));
};
