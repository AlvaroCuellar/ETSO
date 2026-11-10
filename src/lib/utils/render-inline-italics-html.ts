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

/** Link plain and Markdown-style web addresses without accepting arbitrary HTML. */
export const renderReportNoteHtml = (value: string): string => {
	let end = 0;
	let html = '';
	const links = /\[([^\]\r\n]+)\]\((https?:\/\/(?:[^\s<>"'()]|\([^\s<>"'()]*\))+)\)|https?:\/\/[^\s<>"']+/gi;
	for (const match of value.matchAll(links)) {
		const [text, label, labeledUrl] = match;
		let url = labeledUrl ?? text.replace(/[.,;:!?]+$/, '');
		if (!labeledUrl) {
			// Keep balanced DOI parentheses, but leave trailing citation punctuation outside.
			while (url.endsWith(')') && (url.match(/\)/g)?.length ?? 0) > (url.match(/\(/g)?.length ?? 0)) {
				url = url.slice(0, -1);
			}
		}
		html += renderInlineItalicsHtml(value.slice(end, match.index));
		html += `<a href="${escapeHtml(url)}" class="text-primary underline underline-offset-4 hover:opacity-80">${escapeHtml(label ?? url)}</a>`;
		end = match.index + (labeledUrl ? text.length : url.length);
	}
	return html + renderInlineItalicsHtml(value.slice(end));
};
