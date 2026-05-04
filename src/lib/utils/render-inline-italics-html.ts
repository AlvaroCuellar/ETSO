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
