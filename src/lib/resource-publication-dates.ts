export const formatPublicationDate = (date: string, locale: string): string => {
	const [year, month, day] = date.split('-').map(Number);
	if (!year || !month || !day) return date;

	return new Intl.DateTimeFormat(locale, {
		day: 'numeric',
		month: 'long',
		timeZone: 'UTC',
		year: 'numeric'
	}).format(new Date(Date.UTC(year, month - 1, day)));
};
