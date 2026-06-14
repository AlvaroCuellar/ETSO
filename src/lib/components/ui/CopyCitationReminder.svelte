<script lang="ts">
	import { localizePath, type Locale } from '$lib/i18n';
	import { SITE_URL } from '$lib/seo';

	interface Props {
		locale: Locale;
	}

	let { locale }: Props = $props();

	const minimumCopiedCharacters = 80;

	const reminders: Record<Locale, string> = {
		es: 'Recordatorio: si reutilizas este texto, consulta la página "Cómo citarnos" para incluir la referencia adecuada',
		en: 'Reminder: if you reuse this text, please check the "How to cite us" page and include the appropriate reference',
		fr: 'Rappel : si vous réutilisez ce texte, consultez la page « Comment nous citer » afin d’inclure la référence appropriée',
		pt: 'Lembrete: se reutilizar este texto, consulte a página "Como nos citar" para incluir a referência adequada',
		it: 'Promemoria: se riutilizzi questo testo, consulta la pagina "Come citarci" per includere il riferimento corretto',
		de: 'Hinweis: Wenn Sie diesen Text wiederverwenden, lesen Sie bitte die Seite „Zitierweise“ und geben Sie die passende Referenz an',
		zh: '提醒：如果你重新使用这段文字，请查看“引用方式”页面并加入合适的引用',
		ja: '注意：この文章を再利用する場合は、「引用方法」ページを確認し、適切な出典を記載してください',
		ko: '알림: 이 텍스트를 다시 사용하는 경우 “인용 방법” 페이지를 확인하고 적절한 출처를 포함해 주세요',
		ru: 'Напоминание: если вы используете этот текст повторно, посмотрите страницу «Как цитировать» и укажите подходящую ссылку',
		ar: 'تذكير: إذا أعدت استخدام هذا النص، فراجع صفحة "كيفية الاستشهاد بنا" لإضافة المرجع المناسب'
	};

	const getCitationUrl = (): string => `${SITE_URL}${localizePath('/como-citarnos', locale)}`;

	const isEditableElement = (node: Node | null): boolean => {
		const element = node instanceof Element ? node : node?.parentElement;
		return Boolean(
			element?.closest(
				'input, textarea, select, [contenteditable="true"], [data-copy-reminder-skip="true"]'
			)
		);
	};

	const getSelectedHtml = (selection: Selection): string => {
		const wrapper = document.createElement('div');
		for (let index = 0; index < selection.rangeCount; index += 1) {
			wrapper.append(selection.getRangeAt(index).cloneContents());
		}
		return wrapper.innerHTML.trim();
	};

	const handleCopy = (event: ClipboardEvent): void => {
		const selection = document.getSelection();
		if (!selection || selection.isCollapsed || isEditableElement(event.target as Node)) return;

		const selectedText = selection.toString().trim();
		if (selectedText.length < minimumCopiedCharacters) return;

		const citationUrl = getCitationUrl();
		const reminder = `${reminders[locale] ?? reminders.es}: ${citationUrl}`;
		const plainText = `${selectedText}\n\n${reminder}`;
		const selectedHtml = getSelectedHtml(selection);
		const html = selectedHtml
			? `${selectedHtml}<p><small>${reminder}</small></p>`
			: plainText;

		event.clipboardData?.setData('text/plain', plainText);
		event.clipboardData?.setData('text/html', html);
		event.preventDefault();
	};
</script>

<svelte:document oncopy={handleCopy} />
