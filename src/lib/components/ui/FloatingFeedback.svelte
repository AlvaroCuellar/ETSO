<script lang="ts">
	import { page } from '$app/state';
	import AlertCircle from 'lucide-svelte/icons/alert-circle';
	import CheckCircle from 'lucide-svelte/icons/check-circle';
	import MessageCircle from 'lucide-svelte/icons/message-circle';
	import Send from 'lucide-svelte/icons/send';
	import X from 'lucide-svelte/icons/x';

	import type { Locale } from '$lib/i18n';

	type SubmissionState = 'idle' | 'sending' | 'sent' | 'error';
	const categoryKeys = ['suggestion', 'error', 'reference', 'work', 'other'] as const;
	type CategoryKey = (typeof categoryKeys)[number];

	interface Props {
		locale: Locale;
	}

	let { locale }: Props = $props();
	let isOpen = $state(false);
	let message = $state('');
	let categoryKey = $state<CategoryKey>('suggestion');
	let name = $state('');
	let email = $state('');
	let website = $state('');
	let submissionState = $state<SubmissionState>('idle');
	let statusMessage = $state('');
	const pageUrl = $derived(page.url.href);

	const feedbackTranslations: Record<
		Locale,
		{
			panelLabel: string;
			title: string;
			description: string;
			close: string;
			type: string;
			message: string;
			messagePlaceholder: string;
			name: string;
			namePlaceholder: string;
			email: string;
			emailPlaceholder: string;
			submit: string;
			sending: string;
			open: string;
			tooShort: string;
			sent: string;
			localPreview: string;
			genericError: string;
			categories: Record<CategoryKey, string>;
		}
	> = {
		es: {
			panelLabel: 'Enviar sugerencias o errores',
			title: 'Sugerencias y errores',
			description:
				'Envíanos una sugerencia, un error o una referencia sin abrir el correo. Recibiremos también la página exacta para localizarlo rápido.',
			close: 'Cerrar sugerencias',
			type: 'Tipo',
			message: 'Mensaje',
			messagePlaceholder: 'Describe la sugerencia, el error o el dato que falta...',
			name: 'Nombre',
			namePlaceholder: 'Opcional',
			email: 'Correo opcional',
			emailPlaceholder: 'Por si quieres respuesta',
			submit: 'Enviar',
			sending: 'Enviando',
			open: 'Enviar sugerencia o error',
			tooShort: 'Escribe un poco más para poder revisarlo bien.',
			sent: 'Enviado. Gracias.',
			localPreview: 'Recibido en local. En producción llegará por correo.',
			genericError: 'No se pudo enviar el mensaje.',
			categories: {
				suggestion: 'Sugerencia',
				error: 'Error',
				reference: 'Referencia',
				work: 'Obra',
				other: 'Otro'
			}
		},
		en: {
			panelLabel: 'Send suggestions or errors',
			title: 'Suggestions and errors',
			description:
				'Send us a suggestion, an error, or a reference without opening email. We will also receive the exact page so we can locate it quickly.',
			close: 'Close suggestions',
			type: 'Type',
			message: 'Message',
			messagePlaceholder: 'Describe the suggestion, error, or missing detail...',
			name: 'Name',
			namePlaceholder: 'Optional',
			email: 'Optional email',
			emailPlaceholder: 'If you want a reply',
			submit: 'Send',
			sending: 'Sending',
			open: 'Send a suggestion or error',
			tooShort: 'Write a little more so we can review it properly.',
			sent: 'Sent. Thank you.',
			localPreview: 'Received locally. In production it will arrive by email.',
			genericError: 'The message could not be sent.',
			categories: {
				suggestion: 'Suggestion',
				error: 'Error',
				reference: 'Reference',
				work: 'Work',
				other: 'Other'
			}
		},
		fr: {
			panelLabel: 'Envoyer des suggestions ou des erreurs',
			title: 'Suggestions et erreurs',
			description:
				'Envoyez-nous une suggestion, une erreur ou une référence sans ouvrir votre messagerie. Nous recevrons aussi la page exacte pour la retrouver vite.',
			close: 'Fermer les suggestions',
			type: 'Type',
			message: 'Message',
			messagePlaceholder: "Décrivez la suggestion, l'erreur ou le détail manquant...",
			name: 'Nom',
			namePlaceholder: 'Facultatif',
			email: 'Adresse facultative',
			emailPlaceholder: 'Si vous souhaitez une réponse',
			submit: 'Envoyer',
			sending: 'Envoi',
			open: 'Envoyer une suggestion ou une erreur',
			tooShort: 'Écrivez un peu plus pour que nous puissions bien vérifier.',
			sent: 'Envoyé. Merci.',
			localPreview: 'Reçu en local. En production, cela arrivera par courriel.',
			genericError: "Le message n'a pas pu être envoyé.",
			categories: {
				suggestion: 'Suggestion',
				error: 'Erreur',
				reference: 'Référence',
				work: 'Œuvre',
				other: 'Autre'
			}
		},
		pt: {
			panelLabel: 'Enviar sugestões ou erros',
			title: 'Sugestões e erros',
			description:
				'Envie uma sugestão, um erro ou uma referência sem abrir o email. Também receberemos a página exata para localizar tudo rapidamente.',
			close: 'Fechar sugestões',
			type: 'Tipo',
			message: 'Mensagem',
			messagePlaceholder: 'Descreva a sugestão, o erro ou o dado em falta...',
			name: 'Nome',
			namePlaceholder: 'Opcional',
			email: 'Email opcional',
			emailPlaceholder: 'Caso queira resposta',
			submit: 'Enviar',
			sending: 'A enviar',
			open: 'Enviar sugestão ou erro',
			tooShort: 'Escreva um pouco mais para podermos rever bem.',
			sent: 'Enviado. Obrigado.',
			localPreview: 'Recebido em local. Em produção chegará por email.',
			genericError: 'Não foi possível enviar a mensagem.',
			categories: {
				suggestion: 'Sugestão',
				error: 'Erro',
				reference: 'Referência',
				work: 'Obra',
				other: 'Outro'
			}
		},
		it: {
			panelLabel: 'Inviare suggerimenti o errori',
			title: 'Suggerimenti ed errori',
			description:
				'Inviaci un suggerimento, un errore o un riferimento senza aprire la posta. Riceveremo anche la pagina esatta per ritrovarlo subito.',
			close: 'Chiudere i suggerimenti',
			type: 'Tipo',
			message: 'Messaggio',
			messagePlaceholder: "Descrivi il suggerimento, l'errore o il dato mancante...",
			name: 'Nome',
			namePlaceholder: 'Facoltativo',
			email: 'Email facoltativa',
			emailPlaceholder: 'Se vuoi una risposta',
			submit: 'Inviare',
			sending: 'Invio',
			open: 'Inviare un suggerimento o un errore',
			tooShort: 'Scrivi qualcosa in più per poterlo verificare bene.',
			sent: 'Inviato. Grazie.',
			localPreview: 'Ricevuto in locale. In produzione arriverà via email.',
			genericError: 'Non è stato possibile inviare il messaggio.',
			categories: {
				suggestion: 'Suggerimento',
				error: 'Errore',
				reference: 'Riferimento',
				work: 'Opera',
				other: 'Altro'
			}
		},
		de: {
			panelLabel: 'Vorschläge oder Fehler senden',
			title: 'Vorschläge und Fehler',
			description:
				'Senden Sie uns einen Vorschlag, einen Fehler oder eine Referenz, ohne Ihr E-Mail-Programm zu öffnen. Die genaue Seite wird automatisch mitgeschickt.',
			close: 'Vorschläge schließen',
			type: 'Typ',
			message: 'Nachricht',
			messagePlaceholder: 'Beschreiben Sie den Vorschlag, Fehler oder fehlenden Hinweis...',
			name: 'Name',
			namePlaceholder: 'Optional',
			email: 'Optionale E-Mail',
			emailPlaceholder: 'Falls Sie eine Antwort wünschen',
			submit: 'Senden',
			sending: 'Wird gesendet',
			open: 'Vorschlag oder Fehler senden',
			tooShort: 'Schreiben Sie etwas mehr, damit wir es richtig prüfen können.',
			sent: 'Gesendet. Danke.',
			localPreview: 'Lokal empfangen. In Produktion wird es per E-Mail zugestellt.',
			genericError: 'Die Nachricht konnte nicht gesendet werden.',
			categories: {
				suggestion: 'Vorschlag',
				error: 'Fehler',
				reference: 'Referenz',
				work: 'Werk',
				other: 'Andere'
			}
		},
		zh: {
			panelLabel: '发送建议或错误',
			title: '建议和错误',
			description: '无需打开邮箱，即可发送建议、错误或参考文献。我们也会收到准确页面，方便快速定位。',
			close: '关闭建议',
			type: '类型',
			message: '留言',
			messagePlaceholder: '描述建议、错误或缺少的信息...',
			name: '姓名',
			namePlaceholder: '可选',
			email: '可选邮箱',
			emailPlaceholder: '如果你希望收到回复',
			submit: '发送',
			sending: '发送中',
			open: '发送建议或错误',
			tooShort: '请多写一点，方便我们核查。',
			sent: '已发送。谢谢。',
			localPreview: '本地已收到。生产环境中会通过邮件发送。',
			genericError: '无法发送留言。',
			categories: {
				suggestion: '建议',
				error: '错误',
				reference: '参考文献',
				work: '作品',
				other: '其他'
			}
		},
		ja: {
			panelLabel: '提案またはエラーを送信',
			title: '提案とエラー',
			description: 'メールを開かずに、提案、エラー、参考文献を送れます。確認しやすいように、このページも自動で送信されます。',
			close: '提案を閉じる',
			type: '種類',
			message: 'メッセージ',
			messagePlaceholder: '提案、エラー、不足している情報を説明してください...',
			name: '名前',
			namePlaceholder: '任意',
			email: '任意のメール',
			emailPlaceholder: '返信を希望する場合',
			submit: '送信',
			sending: '送信中',
			open: '提案またはエラーを送信',
			tooShort: '確認しやすいように、もう少し詳しく書いてください。',
			sent: '送信しました。ありがとうございます。',
			localPreview: 'ローカルで受信しました。本番環境ではメールで届きます。',
			genericError: 'メッセージを送信できませんでした。',
			categories: {
				suggestion: '提案',
				error: 'エラー',
				reference: '参考文献',
				work: '作品',
				other: 'その他'
			}
		},
		ko: {
			panelLabel: '제안 또는 오류 보내기',
			title: '제안과 오류',
			description: '이메일을 열지 않고 제안, 오류, 참고문헌을 보낼 수 있습니다. 정확한 페이지도 함께 전송되어 빠르게 확인할 수 있습니다.',
			close: '제안 닫기',
			type: '유형',
			message: '메시지',
			messagePlaceholder: '제안, 오류 또는 빠진 정보를 설명해 주세요...',
			name: '이름',
			namePlaceholder: '선택 사항',
			email: '선택 이메일',
			emailPlaceholder: '답변을 원하시면 입력하세요',
			submit: '보내기',
			sending: '보내는 중',
			open: '제안 또는 오류 보내기',
			tooShort: '검토할 수 있도록 조금 더 자세히 써 주세요.',
			sent: '전송되었습니다. 감사합니다.',
			localPreview: '로컬에서 접수되었습니다. 운영 환경에서는 이메일로 전송됩니다.',
			genericError: '메시지를 보낼 수 없습니다.',
			categories: {
				suggestion: '제안',
				error: '오류',
				reference: '참고문헌',
				work: '작품',
				other: '기타'
			}
		},
		ru: {
			panelLabel: 'Отправить предложение или ошибку',
			title: 'Предложения и ошибки',
			description:
				'Отправьте предложение, ошибку или ссылку, не открывая почту. Мы также получим точную страницу, чтобы быстро найти место.',
			close: 'Закрыть предложения',
			type: 'Тип',
			message: 'Сообщение',
			messagePlaceholder: 'Опишите предложение, ошибку или недостающую информацию...',
			name: 'Имя',
			namePlaceholder: 'Необязательно',
			email: 'Эл. почта необязательно',
			emailPlaceholder: 'Если хотите получить ответ',
			submit: 'Отправить',
			sending: 'Отправка',
			open: 'Отправить предложение или ошибку',
			tooShort: 'Напишите немного подробнее, чтобы мы могли это проверить.',
			sent: 'Отправлено. Спасибо.',
			localPreview: 'Получено локально. В продакшене придет по электронной почте.',
			genericError: 'Не удалось отправить сообщение.',
			categories: {
				suggestion: 'Предложение',
				error: 'Ошибка',
				reference: 'Ссылка',
				work: 'Произведение',
				other: 'Другое'
			}
		},
		ar: {
			panelLabel: 'إرسال اقتراحات أو أخطاء',
			title: 'اقتراحات وأخطاء',
			description:
				'أرسل اقتراحا أو خطأ أو مرجعا من دون فتح البريد الإلكتروني. سنستلم أيضا الصفحة الدقيقة لتحديد الموضع بسرعة.',
			close: 'إغلاق الاقتراحات',
			type: 'النوع',
			message: 'الرسالة',
			messagePlaceholder: 'صف الاقتراح أو الخطأ أو المعلومة الناقصة...',
			name: 'الاسم',
			namePlaceholder: 'اختياري',
			email: 'البريد الإلكتروني اختياري',
			emailPlaceholder: 'إذا كنت تريد ردا',
			submit: 'إرسال',
			sending: 'جار الإرسال',
			open: 'إرسال اقتراح أو خطأ',
			tooShort: 'اكتب مزيدا من التفاصيل حتى نتمكن من مراجعته جيدا.',
			sent: 'أُرسل. شكرا.',
			localPreview: 'تم الاستلام محليا. في الإنتاج سيصل عبر البريد الإلكتروني.',
			genericError: 'تعذر إرسال الرسالة.',
			categories: {
				suggestion: 'اقتراح',
				error: 'خطأ',
				reference: 'مرجع',
				work: 'عمل',
				other: 'آخر'
			}
		}
	};
	const t = $derived(feedbackTranslations[locale] ?? feedbackTranslations.es);

	const openPanel = (): void => {
		isOpen = true;
		submissionState = 'idle';
		statusMessage = '';
	};

	const closePanel = (): void => {
		isOpen = false;
	};

	const submitFeedback = async (event: SubmitEvent): Promise<void> => {
		event.preventDefault();

		if (message.trim().length < 8) {
			submissionState = 'error';
			statusMessage = t.tooShort;
			return;
		}

		submissionState = 'sending';
		statusMessage = '';

		const formData = new FormData();
		formData.set('category', t.categories[categoryKey as CategoryKey]);
		formData.set('message', message);
		formData.set('name', name);
		formData.set('email', email);
		formData.set('pageUrl', pageUrl);
		formData.set('website', website);

		try {
			const response = await fetch('/api/feedback', {
				method: 'POST',
				body: formData
			});
			const result = await response.json().catch(() => ({}));

			if (!response.ok || !result.ok) {
				throw new Error(result.error || 'No se pudo enviar el mensaje.');
			}

			submissionState = 'sent';
			statusMessage =
				result.mode === 'local-preview'
					? t.localPreview
					: t.sent;
			message = '';
			name = '';
			email = '';
			categoryKey = 'suggestion';
		} catch (error) {
			submissionState = 'error';
			statusMessage =
				error instanceof Error ? error.message : t.genericError;
		}
	};
</script>

<div class="pointer-events-none fixed inset-x-3 bottom-3 z-50 flex flex-col items-start gap-2 sm:inset-x-auto sm:right-6 sm:bottom-6 sm:items-end sm:gap-3">
	{#if isOpen}
		<section
			class="pointer-events-auto max-h-[calc(100dvh-5.5rem)] w-full overflow-y-auto overscroll-contain rounded-lg border border-border bg-white p-4 text-left shadow-[0_18px_45px_rgba(15,23,42,0.18)] sm:w-[390px] sm:max-w-[390px] sm:max-h-[calc(100dvh-7rem)]"
			aria-label={t.panelLabel}
		>
			<div class="mb-3 flex items-start justify-between gap-3">
				<div>
					<h2 class="font-ui text-[17px] font-bold leading-tight text-brand-blue-dark">
						{t.title}
					</h2>
					<p class="mt-1 font-ui text-[13px] leading-snug text-text-soft">
						{t.description}
					</p>
				</div>
				<button
					type="button"
					class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-white text-text-soft transition hover:border-border-accent-blue hover:text-brand-blue-dark focus:outline-none focus:ring-2 focus:ring-brand-blue/25"
					aria-label={t.close}
					onclick={closePanel}
				>
					<X size={18} aria-hidden="true" />
				</button>
			</div>

			<form class="space-y-2.5 sm:space-y-3" onsubmit={submitFeedback}>
				<input type="text" name="website" bind:value={website} class="hidden" tabindex="-1" autocomplete="off" />
				<input type="hidden" name="pageUrl" value={pageUrl} />

				<label class="block font-ui text-[12px] font-semibold uppercase tracking-[0.04em] text-text-muted" for="feedback-category">
					{t.type}
					<span class="text-red-700" aria-hidden="true">*</span>
				</label>
				<select
					id="feedback-category"
					name="category"
					required
					bind:value={categoryKey}
					class="h-10 w-full rounded-md border border-border bg-white px-3 font-ui text-[14px] text-text-main outline-none transition focus:border-border-accent-blue focus:ring-2 focus:ring-brand-blue/20"
				>
					{#each categoryKeys as option}
						<option value={option}>{t.categories[option]}</option>
					{/each}
				</select>

				<label class="block font-ui text-[12px] font-semibold uppercase tracking-[0.04em] text-text-muted" for="feedback-message">
					{t.message}
					<span class="text-red-700" aria-hidden="true">*</span>
				</label>
				<textarea
					id="feedback-message"
					name="message"
					bind:value={message}
					rows="4"
					required
					minlength="8"
					placeholder={t.messagePlaceholder}
					class="min-h-24 w-full resize-y rounded-md border border-border bg-white px-3 py-2 font-ui text-[14px] leading-relaxed text-text-main outline-none transition placeholder:text-text-muted focus:border-border-accent-blue focus:ring-2 focus:ring-brand-blue/20 sm:min-h-28"
				></textarea>

				<label class="block font-ui text-[12px] font-semibold uppercase tracking-[0.04em] text-text-muted" for="feedback-name">
					{t.name}
				</label>
				<input
					id="feedback-name"
					name="name"
					type="text"
					bind:value={name}
					placeholder={t.namePlaceholder}
					class="h-10 w-full rounded-md border border-border bg-white px-3 font-ui text-[14px] text-text-main outline-none transition placeholder:text-text-muted focus:border-border-accent-blue focus:ring-2 focus:ring-brand-blue/20"
				/>

				<label class="block font-ui text-[12px] font-semibold uppercase tracking-[0.04em] text-text-muted" for="feedback-email">
					{t.email}
				</label>
				<input
					id="feedback-email"
					name="email"
					type="email"
					bind:value={email}
					placeholder={t.emailPlaceholder}
					class="h-10 w-full rounded-md border border-border bg-white px-3 font-ui text-[14px] text-text-main outline-none transition placeholder:text-text-muted focus:border-border-accent-blue focus:ring-2 focus:ring-brand-blue/20"
				/>

				<div class="flex flex-col gap-3 pt-1 min-[380px]:flex-row min-[380px]:items-center min-[380px]:justify-between">
					{#if statusMessage}
						<p
							class="flex min-w-0 items-center gap-2 font-ui text-[13px] leading-snug"
							class:text-green-700={submissionState === 'sent'}
							class:text-red-700={submissionState === 'error'}
						>
							{#if submissionState === 'sent'}
								<CheckCircle size={16} class="shrink-0" aria-hidden="true" />
							{:else if submissionState === 'error'}
								<AlertCircle size={16} class="shrink-0" aria-hidden="true" />
							{/if}
							<span>{statusMessage}</span>
						</p>
					{:else}
						<p class="min-w-0 truncate font-ui text-[12px] text-text-muted">{page.url.pathname}</p>
					{/if}

					<button
						type="submit"
						disabled={submissionState === 'sending'}
						class="inline-flex h-10 w-full shrink-0 items-center justify-center gap-2 rounded-md bg-brand-blue px-4 font-ui text-[14px] font-semibold text-white transition hover:bg-brand-blue-dark focus:outline-none focus:ring-2 focus:ring-brand-blue/30 disabled:cursor-not-allowed disabled:opacity-70 min-[380px]:w-auto"
					>
						<Send size={16} aria-hidden="true" />
						{submissionState === 'sending' ? t.sending : t.submit}
					</button>
				</div>
			</form>
		</section>
	{/if}

	<button
		type="button"
		class="pointer-events-auto -ml-3 inline-flex h-10 w-8 shrink-0 items-center justify-center rounded-r-full bg-brand-blue text-white shadow-[0_10px_22px_rgba(0,45,140,0.22)] transition hover:bg-brand-blue-dark focus:outline-none focus:ring-4 focus:ring-brand-blue/25 sm:hidden"
		aria-label={t.open}
		aria-expanded={isOpen}
		onclick={isOpen ? closePanel : openPanel}
	>
		{#if isOpen}
			<X size={17} aria-hidden="true" />
		{:else}
			<MessageCircle size={17} aria-hidden="true" />
		{/if}
	</button>

	<button
		type="button"
		class="pointer-events-auto hidden h-14 w-14 shrink-0 items-center justify-center rounded-full bg-brand-blue text-white shadow-[0_12px_28px_rgba(0,45,140,0.28)] transition hover:bg-brand-blue-dark focus:outline-none focus:ring-4 focus:ring-brand-blue/25 sm:inline-flex"
		aria-label={t.open}
		aria-expanded={isOpen}
		onclick={isOpen ? closePanel : openPanel}
	>
		{#if isOpen}
			<X size={22} aria-hidden="true" />
		{:else}
			<MessageCircle size={24} aria-hidden="true" />
		{/if}
	</button>
</div>
