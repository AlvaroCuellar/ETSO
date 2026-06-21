<script lang="ts">
	import { onMount, tick } from 'svelte';
	import Breadcrumbs from '$lib/components/ui/Breadcrumbs.svelte';
	import CitationSuggestionCard from '$lib/components/ui/CitationSuggestionCard.svelte';
	import LegalCard from '$lib/components/ui/LegalCard.svelte';
	import PageHero from '$lib/components/ui/PageHero.svelte';
	import SeoHead from '$lib/components/seo/SeoHead.svelte';
	import InlineActionButton from '$lib/components/ui/InlineActionButton.svelte';
	import WorkMetadataCard from '$lib/components/ui/WorkMetadataCard.svelte';
	import { DEFAULT_LOCALE, literalTranslations } from '$lib/i18n';
	import { formatPublicationDate } from '$lib/resource-publication-dates';
	// Importar aquí el futuro logo de BITESO cuando esté disponible.
	// import bitesoLogo from '$lib/assets/logos/biteso.png';
	import byNcLogo from '$lib/assets/logos/by-nc.svg';
	import Download from 'lucide-svelte/icons/download';
	import PencilLine from 'lucide-svelte/icons/pencil-line';
	import List from 'lucide-svelte/icons/list';
	import X from 'lucide-svelte/icons/x';
	import {
		formatDisplayWorkTitle,
		formatPrefixedDisplayWorkTitleHtml
	} from '$lib/utils/format-display-work-title';

	import type { ActionData, PageData } from './$types';
	import type { Locale } from '$lib/i18n';

	let { data, form }: { data: PageData; form?: ActionData } = $props();
	const facsimileLabelsByLocale: Record<
		Locale,
		{ first: string; last: string; section: string }
	> = {
		es: {
			first: 'Primera página de la obra',
			last: 'Última página de la obra',
			section: 'Páginas de la obra'
		},
		en: {
			first: 'First page of the work',
			last: 'Last page of the work',
			section: 'Pages of the work'
		},
		fr: {
			first: "Première page de l'œuvre",
			last: "Dernière page de l'œuvre",
			section: "Pages de l'œuvre"
		},
		pt: {
			first: 'Primeira página da obra',
			last: 'Última página da obra',
			section: 'Páginas da obra'
		},
		it: {
			first: "Prima pagina dell'opera",
			last: "Ultima pagina dell'opera",
			section: "Pagine dell'opera"
		},
		de: {
			first: 'Erste Seite des Werks',
			last: 'Letzte Seite des Werks',
			section: 'Seiten des Werks'
		},
		zh: {
			first: '作品第一页',
			last: '作品最后一页',
			section: '作品页面'
		},
		ja: {
			first: '作品の最初のページ',
			last: '作品の最後のページ',
			section: '作品のページ'
		},
		ko: {
			first: '작품의 첫 페이지',
			last: '작품의 마지막 페이지',
			section: '작품 페이지'
		},
		ru: {
			first: 'Первая страница произведения',
			last: 'Последняя страница произведения',
			section: 'Страницы произведения'
		},
		ar: {
			first: 'الصفحة الأولى من العمل',
			last: 'الصفحة الأخيرة من العمل',
			section: 'صفحات العمل'
		}
	};
	const displayWorkTitle = $derived.by(() => formatDisplayWorkTitle(data.work.title));
	const displayBitesoTitle = $derived.by(() => `Texto digital de ${displayWorkTitle}`);
	const publicationDateLabel = $derived.by(() => {
		const labels = {
			es: 'Fecha de publicación',
			en: 'Publication date',
			fr: 'Date de publication',
			pt: 'Data de publicação',
			it: 'Data di pubblicazione',
			de: 'Veröffentlichungsdatum',
			zh: '发布日期',
			ja: '公開日',
			ko: '공개일',
			ru: 'Дата публикации',
			ar: 'تاريخ النشر'
		} as const;
		return labels[data.locale] ?? labels.es;
	});
	const hasPublishedOn = $derived(data.publishedOn.trim().length > 0);
	const formattedPublishedOn = $derived.by(() => formatPublicationDate(data.publishedOn, data.locale));
	const seoDescription = $derived.by(() => {
		const descriptions = {
			es: `Texto digital BITESO de ${displayWorkTitle}, disponible en ETSO para lectura, consulta e investigación filológica.`,
			en: `BITESO digital text of ${displayWorkTitle}, available in ETSO for reading, consultation and philological research.`,
			fr: `Texte numérique BITESO de ${displayWorkTitle}, disponible dans ETSO pour la lecture, la consultation et la recherche philologique.`,
			pt: `Texto digital BITESO de ${displayWorkTitle}, disponível no ETSO para leitura, consulta e pesquisa filológica.`,
			it: `Testo digitale BITESO di ${displayWorkTitle}, disponibile in ETSO per lettura, consultazione e ricerca filologica.`,
			de: `Digitaler BITESO-Text von ${displayWorkTitle}, in ETSO für Lektüre, Konsultation und philologische Forschung verfügbar.`,
			zh: `${displayWorkTitle} 的 BITESO 数字文本，可在 ETSO 中用于阅读、查阅和文献学研究。`,
			ja: `${displayWorkTitle} の BITESO デジタルテキスト。ETSO で閲覧、参照、文献学研究に利用できます。`,
			ko: `${displayWorkTitle}의 BITESO 디지털 텍스트입니다. ETSO에서 읽기, 참조 및 문헌학 연구에 이용할 수 있습니다.`,
			ru: `Цифровой текст BITESO произведения ${displayWorkTitle}, доступный в ETSO для чтения, справки и филологического исследования.`,
			ar: `نص BITESO الرقمي لعمل ${displayWorkTitle}، متاح في ETSO للقراءة والاستشارة والبحث الفيلولوجي.`
		} as const;
		return descriptions[data.locale] ?? descriptions.es;
	});
	const displayBitesoTitleHtml = $derived.by(() =>
		formatPrefixedDisplayWorkTitleHtml('Texto digital de', data.work.title)
	);
	const downloadBaseFilename = $derived(data.biteso.id || data.work.slug || 'texto-biteso');
	const citationPlainText = $derived(
		data.citation
			.replace(/<[^>]+>/g, '')
			.replace(/&nbsp;/g, ' ')
			.replace(/\s+/g, ' ')
			.trim()
	);
	const buildDownloadedTxt = (text: string): string => {
		const lines = [
			'Gracias por descargar este texto de BITESO.',
			'Si utilizas este texto en una publicación, trabajo académico o material docente, por favor cita la siguiente referencia:',
			'',
			citationPlainText,
			''
		];
		if (hasPublishedOn) {
			lines.push(`Fecha de publicación: ${formattedPublishedOn}`, '');
		}
		lines.push(
			'Texto descargado desde ETSO / BITESO.',
			data.canonicalUrl,
			'',
			'----------------------------------------',
			'',
			text
		);
		return lines.join('\n');
	};

	const downloadBlob = (content: string, filename: string, type: string) => {
		const blob = new Blob([content], { type });
		const url = URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.href = url;
		link.download = filename;
		document.body.append(link);
		link.click();
		link.remove();
		URL.revokeObjectURL(url);
	};

	type DownloadKind = 'tei' | 'txt-didascalias' | 'txt-verses';

	const buildVerseTextFromTei = (): string => {
		const lines: string[] = [];
		for (const page of data.biteso.tei?.pages ?? []) {
			for (const block of page.blocks) {
				if (block.type !== 'speech') continue;
				for (const line of block.lines ?? []) {
					if (line.text) lines.push(line.text);
				}
			}
		}
		return lines.length > 0 ? `${lines.join('\n')}\n` : data.biteso.text;
	};

	const buildTextWithDidascaliasFromTei = (): string => {
		const lines: string[] = [];
		for (const page of data.biteso.tei?.pages ?? []) {
			for (const block of page.blocks) {
				if (block.type === 'stage' && block.text) {
					lines.push(`[${block.text}]`);
					continue;
				}
				if (block.type !== 'speech') continue;
				if (block.speaker) lines.push(`${block.speaker}:`);
				for (const line of block.lines ?? []) {
					if (line.text) lines.push(line.text);
				}
			}
		}
		return lines.length > 0 ? `${lines.join('\n')}\n` : data.biteso.text;
	};

	const downloadText = (kind: DownloadKind = 'txt-verses') => {
		if (kind === 'tei') {
			if (!data.biteso.tei?.downloads?.teiXml) return;
			downloadBlob(
				data.biteso.tei.downloads.teiXml,
				`${downloadBaseFilename}.tei.xml`,
				'application/xml;charset=utf-8'
			);
			isDownloadMenuOpen = false;
			return;
		}

		const text =
			kind === 'txt-didascalias'
				? data.biteso.tei?.downloads?.textWithDidascalias || buildTextWithDidascaliasFromTei()
				: data.biteso.tei?.downloads?.verseText || buildVerseTextFromTei();
		const suffix = kind === 'txt-didascalias' ? 'con-didascalias' : 'solo-versos';
		downloadBlob(
			buildDownloadedTxt(text),
			data.biteso.tei ? `${downloadBaseFilename}_${suffix}.txt` : `${downloadBaseFilename}.txt`,
			'text/plain;charset=utf-8'
		);
		isDownloadMenuOpen = false;
	};

	interface TextSegment {
		id?: string;
		label?: string;
		text: string;
		type: 'text' | 'jornada';
	}

	interface NavigationMark {
		id: string;
		label: string;
		type?: 'jornada' | 'page';
	}

	const jornadaPattern = /^\s*--(?<label>[^-].*?)--\s*$/;

	const normalizeJornadaLabel = (value: string): string => value.replace(/\s+/g, ' ').trim();

	const buildTextSegments = (text: string): TextSegment[] => {
		const segments: TextSegment[] = [];
		const pendingText: string[] = [];
		let jornadaIndex = 0;

		for (const line of text.split(/\r?\n/)) {
			const match = line.match(jornadaPattern);
			const label = match?.groups?.label ? normalizeJornadaLabel(match.groups.label) : '';

			if (!label) {
				pendingText.push(line);
				continue;
			}

			const previousText = pendingText.join('\n').trim();
			if (previousText) {
				segments.push({
					type: 'text',
					text: previousText
				});
			}
			pendingText.length = 0;

			jornadaIndex += 1;
			segments.push({
				type: 'jornada',
				id: `jornada-${jornadaIndex}`,
				label,
				text: line
			});
		}

		const finalText = pendingText.join('\n').trim();
		if (finalText) {
			segments.push({
				type: 'text',
				text: finalText
			});
		}

		return segments;
	};

	const formatTeiPageLabel = (
		page: {
			n?: string;
			folio?: string;
			pdfPage?: string;
			side?: string;
			numberings?: { type?: string; value?: string; cert?: string }[];
		},
		index: number,
		compact = false
	): string => {
		const parts: string[] = [];
		if (page.pdfPage) parts.push(`PDF p. ${page.pdfPage}`);
		if (page.folio) parts.push(`${compact ? 'Fol.' : 'Folio'} ${page.folio}`);
		const visibleNumberings = (page.numberings ?? [])
			.filter((numbering) => numbering.type === 'folio-secondary' && numbering.value)
			.map((numbering) => `${numbering.value}${numbering.cert === 'low' || numbering.cert === 'medium' ? '?' : ''}`);
		if (visibleNumberings.length > 0) {
			parts.push(
				`${compact ? 'Núm. visibles' : 'Numeraciones visibles'} ${visibleNumberings.join(', ')}`
			);
		}
		if (page.side) parts.push(page.side === 'left' ? 'izquierda' : page.side === 'right' ? 'derecha' : page.side);
		return parts.length > 0 ? parts.join(' · ') : `Página ${index + 1}`;
	};
	const formatJornadaAnchorId = (page: { jornada?: { id?: string; n?: string } }, index: number): string =>
		`tei-jornada-${page.jornada?.id || page.jornada?.n || index + 1}`;
	const isFirstTeiPageOfJornada = (index: number): boolean => {
		const current = data.biteso.tei?.pages[index]?.jornada?.id || data.biteso.tei?.pages[index]?.jornada?.n || '';
		const previous =
			index > 0
				? data.biteso.tei?.pages[index - 1]?.jornada?.id || data.biteso.tei?.pages[index - 1]?.jornada?.n || ''
				: '';
		return Boolean(current) && current !== previous;
	};

	const textSegments = $derived.by(() => buildTextSegments(data.biteso.text));
	const jornadaMarks = $derived.by((): NavigationMark[] =>
		textSegments
			.filter(
				(segment): segment is TextSegment & { id: string; label: string } =>
					segment.type === 'jornada' && Boolean(segment.id) && Boolean(segment.label)
			)
			.map((segment) => ({
				id: segment.id,
				label: segment.label,
				type: 'jornada'
			}))
	);
	const teiPageMarks = $derived.by(
		() => {
			const marks: NavigationMark[] = [];
			let lastJornadaId = '';

			for (const [index, page] of data.biteso.tei?.pages.entries() ?? []) {
				const pageId = `tei-page-${page.n || index + 1}`;
				const jornadaId = page.jornada?.id || page.jornada?.n || '';
				if (jornadaId && jornadaId !== lastJornadaId) {
					marks.push({
						id: formatJornadaAnchorId(page, index),
						label: page.jornada?.label || `Jornada ${page.jornada?.n ?? ''}`.trim(),
						type: 'jornada'
					});
					lastJornadaId = jornadaId;
				}
				marks.push({
					id: pageId,
					label: formatTeiPageLabel(page, index, true),
					type: 'page'
				});
			}

			return marks;
		}
	);
	const textNavigationMarks = $derived.by(() => (data.biteso.tei ? teiPageMarks : jornadaMarks));
	const facsimileLabels = $derived(facsimileLabelsByLocale[data.locale] ?? facsimileLabelsByLocale.es);
	const facsimileImages = $derived.by(() =>
		[
			data.work.facsimileFirstUrl
				? { src: data.work.facsimileFirstUrl, label: facsimileLabels.first }
				: undefined,
			data.work.facsimileLastUrl ? { src: data.work.facsimileLastUrl, label: facsimileLabels.last } : undefined
		].filter((item): item is { src: string; label: string } => Boolean(item))
	);

	let activeTextAnchor = $state('biteso-text-start');
	let isCorrectionFormOpen = $state(false);
	let isDownloadMenuOpen = $state(false);
	let correctionTextarea = $state<HTMLTextAreaElement | null>(null);
	let lastCorrectionAlertMessage = '';
	const correctionFeedback = $derived(form?.correctionProposal);
	const localizeLiteral = (value: string): string =>
		data.locale === DEFAULT_LOCALE ? value : (literalTranslations[data.locale]?.[value] ?? value);

	const openCorrectionForm = async (): Promise<void> => {
		lastCorrectionAlertMessage = '';
		isCorrectionFormOpen = true;
		await tick();
		correctionTextarea?.focus();
	};

	$effect(() => {
		if (!correctionFeedback) return;
		if (!correctionFeedback.ok) {
			isCorrectionFormOpen = true;
			return;
		}

		isCorrectionFormOpen = false;
		if (typeof window === 'undefined') return;
		if (lastCorrectionAlertMessage === correctionFeedback.message) return;
		lastCorrectionAlertMessage = correctionFeedback.message;
		window.alert(localizeLiteral(correctionFeedback.message));
	});

	const navLinkClass = (id: string, isStart = false): string =>
		`rounded-[8px] px-2 py-1.5 no-underline transition hover:no-underline ${
			activeTextAnchor === id
				? 'bg-surface-accent-blue font-bold text-brand-blue-dark'
				: isStart
					? 'font-bold uppercase tracking-[0.04em] text-brand-blue-dark hover:bg-surface-soft'
					: 'text-text-soft hover:bg-surface-soft hover:text-brand-blue-dark'
		} ${isStart ? 'text-[0.78rem]' : 'text-[0.82rem] leading-[1.3]'}`;

	const navMarkClass = (mark: NavigationMark): string =>
		`${navLinkClass(mark.id)} ${mark.type === 'jornada' ? 'mt-2 font-bold uppercase tracking-[0.04em] text-text-accent-purple' : 'ml-2'}`;

	let isMobileMenuOpen = $state(false);

	onMount(() => {
		if (typeof window === 'undefined') return;

		let frame = 0;

		const resolveTargets = (): HTMLElement[] =>
			['biteso-text-start', ...textNavigationMarks.map((mark) => mark.id)]
				.map((id) => document.getElementById(id))
				.filter((element): element is HTMLElement => Boolean(element));

		const updateActiveAnchor = (): void => {
			frame = 0;
			const threshold = Math.round(window.innerHeight * 0.34);
			let current = 'biteso-text-start';

			for (const target of resolveTargets()) {
				if (target.getBoundingClientRect().top <= threshold) {
					current = target.id;
				}
			}

			activeTextAnchor = current;
		};

		const requestUpdate = (): void => {
			if (frame) return;
			frame = window.requestAnimationFrame(updateActiveAnchor);
		};

		updateActiveAnchor();
		window.addEventListener('scroll', requestUpdate, { passive: true });
		window.addEventListener('resize', requestUpdate);

		return () => {
			if (frame) window.cancelAnimationFrame(frame);
			window.removeEventListener('scroll', requestUpdate);
			window.removeEventListener('resize', requestUpdate);
		};
	});
</script>

<SeoHead
	title={`${displayBitesoTitle} | BITESO`}
	description={seoDescription}
	canonicalUrl={data.canonicalUrl}
/>

<div class="grid gap-6">
	<Breadcrumbs
		items={[
			{ label: 'Inicio', href: '/' },
			{ label: 'BITESO', href: '/biteso' },
			{ label: displayWorkTitle }
		]}
	/>

	<PageHero compact eyebrow="Texto digital" title={displayBitesoTitle} titleHtml={displayBitesoTitleHtml} />

	<section class="grid gap-4">
		{#if hasPublishedOn}
			<p class="m-0 font-ui text-[0.92rem] font-semibold text-text-soft" data-i18n-skip>
				{publicationDateLabel}: {formattedPublishedOn}
			</p>
		{/if}

		<WorkMetadataCard work={data.work} />

		<div class="grid w-full grid-cols-1 items-stretch gap-4 min-[980px]:grid-cols-2">
			<LegalCard label="Aviso">
				<p>
					Puede incluir errores u omisiones. Si dispones de una edición mejor, te agradecemos que contactes
					con nosotros para incorporar actualizaciones.
				</p>
			</LegalCard>

			<LegalCard label="Licencia">
				<p>
					Este contenido se ofrece bajo la licencia Creative Commons CC BY-NC 4.0. Reutilización permitida
					con cita; usos comerciales no permitidos.
				</p>
				<a
					class="inline-flex w-fit items-center"
					href="https://creativecommons.org/licenses/by-nc/4.0/deed.es"
					target="_blank"
					rel="noopener noreferrer"
					aria-label="Ver detalles de la licencia Creative Commons CC BY-NC 4.0"
				>
					<img src={byNcLogo} alt="Licencia Creative Commons CC BY-NC 4.0" width="110" height="39" />
				</a>
			</LegalCard>
		</div>

		<CitationSuggestionCard class="w-full" citation={data.citation} allowHtml />

		{#if facsimileImages.length > 0}
			<section class="mx-auto grid w-full max-w-4xl gap-5" aria-label={facsimileLabels.section}>
				<div class="grid gap-6 md:grid-cols-2 md:gap-8">
					{#each facsimileImages as image}
						<figure class="m-0 grid justify-items-center gap-2">
							<img
								src={image.src}
								alt={image.label}
								class="h-auto max-h-[28rem] w-full rounded-[8px] border border-border bg-white object-contain"
								loading="lazy"
							/>
							<figcaption class="text-center font-ui text-[0.78rem] font-semibold uppercase tracking-[0.06em] text-text-soft">
								{image.label}
							</figcaption>
						</figure>
					{/each}
				</div>
			</section>
		{/if}

		<div id="biteso-text-start" class="grid min-h-6 place-items-center pt-2 scroll-mt-28">
			<!-- Reponer cuando haya un nuevo logo autorizado:
			<img src={bitesoLogo} alt="Logo BITESO" class="h-auto w-[min(24rem,78vw)]" />
			-->
		</div>

		<h2 class="mt-1 text-center font-ui text-[0.95rem] font-bold uppercase tracking-[0.08em] text-brand-blue-dark">
			<span data-i18n-skip>{displayWorkTitle.toLocaleUpperCase('es-ES')}</span>
		</h2>

		<div class="flex min-w-0 max-w-full flex-wrap justify-end gap-3">
			<InlineActionButton
				type="button"
				icon={PencilLine}
				ariaLabel="Proponer corrección"
				title="Proponer corrección"
				onclick={openCorrectionForm}
			>
				Proponer corrección
			</InlineActionButton>
			{#if data.biteso.tei}
				<div class="relative">
					<InlineActionButton
						type="button"
						icon={Download}
						ariaLabel="Opciones de descarga"
						title="Opciones de descarga"
						onclick={() => (isDownloadMenuOpen = !isDownloadMenuOpen)}
					>
						Descargar
					</InlineActionButton>
					{#if isDownloadMenuOpen}
						<div
							class="absolute right-0 z-20 mt-2 grid min-w-56 gap-1 rounded-[8px] border border-border bg-white p-1.5 font-ui text-[0.82rem] shadow-lg"
						>
							<button
								type="button"
								disabled={!data.biteso.tei.downloads?.teiXml}
								class="rounded-[6px] px-3 py-2 text-left text-text-main transition hover:bg-surface-soft hover:text-brand-blue-dark disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue"
								onclick={() => downloadText('tei')}
							>
								TEI completo
							</button>
							<button
								type="button"
								class="rounded-[6px] px-3 py-2 text-left text-text-main transition hover:bg-surface-soft hover:text-brand-blue-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue"
								onclick={() => downloadText('txt-didascalias')}
							>
								TXT con didascalias
							</button>
							<button
								type="button"
								class="rounded-[6px] px-3 py-2 text-left text-text-main transition hover:bg-surface-soft hover:text-brand-blue-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue"
								onclick={() => downloadText('txt-verses')}
							>
								TXT solo con versos
							</button>
						</div>
					{/if}
				</div>
			{:else}
				<InlineActionButton
					type="button"
					icon={Download}
					ariaLabel="Descargar texto en TXT"
					title="Descargar TXT"
					onclick={() => downloadText('txt-verses')}
				>
					Descargar TXT
				</InlineActionButton>
			{/if}
		</div>

		{#if isCorrectionFormOpen}
			<section
				class="grid gap-4 rounded-[8px] border border-border-accent-blue bg-surface-soft px-4 py-4 font-ui text-text-main sm:px-5"
				aria-labelledby="biteso-correction-heading"
			>
				<div class="grid gap-2">
					<h3 id="biteso-correction-heading" class="m-0 text-[1.05rem] font-bold text-brand-blue-dark">
						Proponer corrección
					</h3>
					<p class="m-0 text-[0.92rem] leading-[1.6] text-text-main">
						<span class="font-semibold" data-i18n-skip>{displayWorkTitle}</span>
					</p>
					<p class="m-0 w-full max-w-none text-[0.92rem] leading-[1.65] text-text-soft">
						BITESO es una biblioteca en construcción. Si has localizado una errata, una lectura mejorable o
						una corrección textual, puedes proponernos una modificación. La propuesta no se publicará
						automáticamente: será revisada antes de incorporarse. Si indicas tu nombre, tu contribución será
						reconocida en esta página. Puedes mantener todo el texto con las modificaciones que consideres o
						explicar directamente qué habría que mejorar en el comentario.
					</p>
				</div>

				{#if correctionFeedback}
					<p
						class={`m-0 rounded-[8px] border px-3 py-2 text-[0.9rem] ${
							correctionFeedback.ok
								? 'border-[#b9dec7] bg-[#f3fbf6] text-[#1f6b3a]'
								: 'border-[#f1c7cf] bg-[#fff6f8] text-[#972842]'
						}`}
						role="status"
					>
						{correctionFeedback.message}
					</p>
				{/if}

				<form method="POST" class="grid gap-4">
					<div class="absolute left-[-10000px] top-auto h-px w-px overflow-hidden" aria-hidden="true">
						<label for="biteso-correction-website">Sitio web</label>
						<input
							id="biteso-correction-website"
							name="website"
							type="text"
							tabindex="-1"
							autocomplete="off"
						/>
					</div>

					<div class="grid gap-1.5">
						<label for="biteso-correction-text" class="text-[0.86rem] font-semibold text-brand-blue-dark">
							Texto propuesto <span class="font-normal text-text-soft">(opcional)</span>
						</label>
						<textarea
							id="biteso-correction-text"
							name="proposed_text"
							bind:this={correctionTextarea}
							class="min-h-[28rem] w-full resize-y rounded-[8px] border border-border bg-white px-3 py-3 font-reading text-[1rem] leading-[1.7] text-text-main outline-none transition focus:border-brand-blue/45 focus:ring-0"
							data-i18n-skip
						>{data.biteso.text}</textarea>
					</div>

					<div class="grid gap-1.5">
						<label for="biteso-correction-comment" class="text-[0.86rem] font-semibold text-brand-blue-dark">
							Comentario <span class="font-normal text-text-soft">(opcional)</span>
						</label>
						<textarea
							id="biteso-correction-comment"
							name="contributor_comment"
							rows="4"
							maxlength="4000"
							class="w-full resize-y rounded-[8px] border border-border bg-white px-3 py-2 text-[0.95rem] leading-[1.55] text-text-main outline-none transition focus:border-brand-blue/45 focus:ring-0"
						></textarea>
					</div>

					<div class="grid gap-3 md:grid-cols-2">
						<div class="grid gap-1.5">
							<label for="biteso-correction-name" class="text-[0.86rem] font-semibold text-brand-blue-dark">
								Nombre <span class="font-normal text-text-soft">(opcional)</span>
							</label>
							<input
								id="biteso-correction-name"
								name="contributor_name"
								type="text"
								maxlength="160"
								autocomplete="name"
								class="h-[44px] rounded-[8px] border border-border bg-white px-3 py-2 text-[0.95rem] text-text-main outline-none transition focus:border-brand-blue/45 focus:ring-0"
							/>
						</div>
						<div class="grid gap-1.5">
							<label for="biteso-correction-email" class="text-[0.86rem] font-semibold text-brand-blue-dark">
								Email <span class="font-normal text-text-soft">(opcional)</span>
							</label>
							<input
								id="biteso-correction-email"
								name="contributor_email"
								type="email"
								maxlength="320"
								autocomplete="email"
								class="h-[44px] rounded-[8px] border border-border bg-white px-3 py-2 text-[0.95rem] text-text-main outline-none transition focus:border-brand-blue/45 focus:ring-0"
							/>
						</div>
					</div>

					<div class="flex flex-wrap items-center justify-end gap-3">
						<button
							type="button"
							class="inline-flex h-[42px] items-center justify-center rounded-[8px] border border-border bg-white px-4 py-2 text-[0.9rem] font-semibold text-brand-blue-dark transition hover:bg-surface-accent-blue"
							onclick={() => (isCorrectionFormOpen = false)}
						>
							Cancelar
						</button>
						<button
							type="submit"
							class="inline-flex h-[42px] items-center justify-center rounded-[8px] bg-brand-blue px-4 py-2 text-[0.9rem] font-semibold text-white transition hover:bg-brand-blue-dark"
						>
							Enviar propuesta
						</button>
					</div>
				</form>
			</section>
		{/if}

		<div class="grid gap-5 lg:grid-cols-[11rem_minmax(0,1fr)_11rem] lg:items-start lg:gap-8">
			<nav
				class="hidden font-ui lg:sticky lg:top-[calc(5rem+68px)] lg:block"
				aria-label="Navegación del texto BITESO"
			>
				<div class="grid gap-1 border-l-2 border-border-accent-blue pl-2">
					<a
						href="#biteso-text-start"
						aria-current={activeTextAnchor === 'biteso-text-start' ? 'location' : undefined}
						class={navLinkClass('biteso-text-start', true)}
						onclick={() => {
							activeTextAnchor = 'biteso-text-start';
						}}
					>
						Inicio
					</a>
					{#each textNavigationMarks as mark}
						<a
							href={`#${mark.id}`}
							aria-current={activeTextAnchor === mark.id ? 'location' : undefined}
							class={navMarkClass(mark)}
							onclick={() => {
								activeTextAnchor = mark.id;
							}}
						>
							<span data-i18n-skip>{mark.label}</span>
						</a>
					{/each}
				</div>
			</nav>

			<div
				class="mx-auto grid w-full max-w-[82ch] gap-4 px-0 font-reading text-base leading-[1.8] text-text-main md:px-[clamp(0.5rem,2.8vw,2.25rem)]"
			>
				{#if data.biteso.tei}
					{#each data.biteso.tei.pages as page, pageIndex}
						{#if isFirstTeiPageOfJornada(pageIndex)}
							<h2
								id={formatJornadaAnchorId(page, pageIndex)}
								class="mt-10 mb-1 scroll-mt-28 text-center font-ui text-[0.95rem] font-bold uppercase tracking-[0.08em] text-brand-blue-dark"
								data-i18n-skip
							>
								{page.jornada?.label}
							</h2>
						{/if}
						<section id={`tei-page-${page.n || pageIndex + 1}`} class="grid scroll-mt-28 gap-3">
							<h3 class="mt-8 mb-1 font-ui text-[0.82rem] font-bold uppercase tracking-[0.08em] text-text-accent-purple">
								{formatTeiPageLabel(page, pageIndex)}
							</h3>
							{#each page.blocks as block}
								{#if block.type === 'stage'}
									<p class="m-0 py-1 font-ui text-[0.92rem] leading-[1.65] text-text-soft italic" data-i18n-skip>
										{block.text}
									</p>
								{:else if block.type === 'note'}
									<p class="m-0 py-1 font-ui text-[0.86rem] leading-[1.55] text-text-soft" data-i18n-skip>
										{block.text}
									</p>
								{:else}
									<div class="grid gap-2 border-t border-border/60 pt-3 sm:grid-cols-[5.75rem_minmax(0,1fr)]">
										<div class="font-ui text-[0.78rem] font-bold uppercase tracking-[0.06em] text-brand-blue-dark" data-i18n-skip>
											{block.speaker ?? ''}
										</div>
										<div class="grid gap-1.5">
											{#each block.lines ?? [] as line}
												<p class="m-0 leading-[1.75]" data-i18n-skip>
													{#each line.parts as part}
														<span class={part.unclear ? 'rounded-[4px] bg-[#fff1f3] px-0.5 text-[#b4233c]' : ''}>
															{part.text}
														</span>{' '}
													{/each}
												</p>
											{/each}
										</div>
									</div>
								{/if}
							{/each}
						</section>
					{/each}
				{:else}
					{#each textSegments as segment}
						{#if segment.type === 'jornada'}
							<h3
								id={segment.id}
								class="mt-10 mb-4 scroll-mt-28 text-center font-ui text-[0.88rem] font-bold uppercase tracking-[0.09em] text-text-accent-purple"
								data-i18n-skip
							>
								{segment.label}
							</h3>
						{:else}
							<p class="m-0 whitespace-pre-wrap" data-i18n-skip>{segment.text}</p>
						{/if}
					{/each}
				{/if}
			</div>

			<div class="hidden lg:block" aria-hidden="true"></div>
		</div>
	</section>
</div>

{#if isMobileMenuOpen}
	<!-- Sombra o panel para el menú móvil -->
	<div
		class="shadow-strong border-border fixed right-6 bottom-[4.5rem] z-50 grid gap-1 rounded-xl border bg-white p-3 font-ui lg:hidden"
	>
		<a
			href="#biteso-text-start"
			class={navLinkClass('biteso-text-start', true)}
			onclick={() => {
				activeTextAnchor = 'biteso-text-start';
				isMobileMenuOpen = false;
			}}
		>
			Inicio
		</a>
		{#each textNavigationMarks as mark}
			<a
				href={`#${mark.id}`}
				class={navLinkClass(mark.id)}
				onclick={() => {
					activeTextAnchor = mark.id;
					isMobileMenuOpen = false;
				}}
			>
				<span data-i18n-skip>{mark.label}</span>
			</a>
		{/each}
	</div>
{/if}

<button
	type="button"
	class="shadow-strong hover:bg-brand-blue-dark focus-visible:ring-brand-blue-dark fixed right-6 bottom-6 z-50 grid h-12 w-12 place-items-center rounded-full bg-brand-blue text-white transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none lg:hidden"
	aria-label={isMobileMenuOpen ? 'Cerrar navegación de jornadas' : 'Abrir navegación de jornadas'}
	aria-expanded={isMobileMenuOpen}
	onclick={() => (isMobileMenuOpen = !isMobileMenuOpen)}
>
	{#if isMobileMenuOpen}
		<X class="h-[1.4rem] w-[1.4rem] stroke-[2.5px]" />
	{:else}
		<List class="h-[1.4rem] w-[1.4rem] stroke-[2.5px]" />
	{/if}
</button>
