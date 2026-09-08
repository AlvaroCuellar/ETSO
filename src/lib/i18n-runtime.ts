export const TRANSLATABLE_ATTRIBUTES = ['aria-label', 'placeholder', 'title', 'alt', 'content'] as const;
export const I18N_SKIP_TAGS = ['script', 'style', 'textarea', 'pre', 'code', 'template', 'noscript', 'title'];
export const I18N_SKIP_SELECTOR = `${I18N_SKIP_TAGS.join(', ')}, [data-i18n-skip], [translate="no"]`;

const normalizeText = (value: string): string => value.replace(/\s+/g, ' ').trim();

export const createTextTranslator = (
	dictionary: Record<string, string>
): ((value: string) => string) => {
	const translations = new Map<string, string>();
	const translatedValues = new Set<string>();
	for (const [source, target] of Object.entries(dictionary)) {
		const key = normalizeText(source);
		// Single-letter connectors belong to explicit, contextual translations.
		if (key.length <= 1) continue;
		translations.set(key, target);
		translatedValues.add(normalizeText(target));
	}

	return (value: string): string => {
		const key = normalizeText(value);
		// Preserve server-rendered and explicitly localized values during hydration.
		if (!key || translatedValues.has(key)) return value;
		const translated = translations.get(key);
		if (translated === undefined) return value;
		const leading = value.match(/^\s*/)?.[0] ?? '';
		const trailing = value.match(/\s*$/)?.[0] ?? '';
		return `${leading}${translated}${trailing}`;
	};
};
