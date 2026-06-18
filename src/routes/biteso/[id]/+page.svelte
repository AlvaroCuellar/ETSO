<script lang="ts">
	import { onMount } from 'svelte';
	import Breadcrumbs from '$lib/components/ui/Breadcrumbs.svelte';
	import CitationSuggestionCard from '$lib/components/ui/CitationSuggestionCard.svelte';
	import LegalCard from '$lib/components/ui/LegalCard.svelte';
	import PageHero from '$lib/components/ui/PageHero.svelte';
	import SeoHead from '$lib/components/seo/SeoHead.svelte';
	import InlineActionButton from '$lib/components/ui/InlineActionButton.svelte';
	import WorkMetadataCard from '$lib/components/ui/WorkMetadataCard.svelte';
	import { formatPublicationDate } from '$lib/resource-publication-dates';
	// Importar aquí el futuro logo de BITESO cuando esté disponible.
	// import bitesoLogo from '$lib/assets/logos/biteso.png';
	import byNcLogo from '$lib/assets/logos/by-nc.svg';
	import Download from 'lucide-svelte/icons/download';
	import List from 'lucide-svelte/icons/list';
	import X from 'lucide-svelte/icons/x';
	import {
		formatDisplayWorkTitle,
		formatPrefixedDisplayWorkTitleHtml
	} from '$lib/utils/format-display-work-title';

	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
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
	const downloadFilename = $derived(`${data.biteso.id || data.work.slug || 'texto-biteso'}.txt`);
	const citationPlainText = $derived(
		data.citation
			.replace(/<[^>]+>/g, '')
			.replace(/&nbsp;/g, ' ')
			.replace(/\s+/g, ' ')
			.trim()
	);
	const downloadedText = $derived.by(() =>
		[
			'Gracias por descargar este texto de BITESO.',
			'Si utilizas este texto en una publicación, trabajo académico o material docente, por favor cita la siguiente referencia:',
			'',
			citationPlainText,
			'',
			`Fecha de publicación: ${formattedPublishedOn}`,
			'',
			'Texto descargado desde ETSO / BITESO.',
			data.canonicalUrl,
			'',
			'----------------------------------------',
			'',
			data.biteso.text
		].join('\n')
	);

	const downloadText = () => {
		const blob = new Blob([downloadedText], {
			type: 'text/plain;charset=utf-8'
		});
		const url = URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.href = url;
		link.download = downloadFilename;
		document.body.append(link);
		link.click();
		link.remove();
		URL.revokeObjectURL(url);
	};

	interface TextSegment {
		id?: string;
		label?: string;
		text: string;
		type: 'text' | 'jornada';
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

	const textSegments = $derived.by(() => buildTextSegments(data.biteso.text));
	const jornadaMarks = $derived.by(() =>
		textSegments.filter(
			(segment): segment is TextSegment & { id: string; label: string } =>
				segment.type === 'jornada' && Boolean(segment.id) && Boolean(segment.label)
		)
	);

	let activeTextAnchor = $state('biteso-text-start');

	const navLinkClass = (id: string, isStart = false): string =>
		`rounded-[8px] px-2 py-1.5 no-underline transition hover:no-underline ${
			activeTextAnchor === id
				? 'bg-surface-accent-blue font-bold text-brand-blue-dark'
				: isStart
					? 'font-bold uppercase tracking-[0.04em] text-brand-blue-dark hover:bg-surface-soft'
					: 'text-text-soft hover:bg-surface-soft hover:text-brand-blue-dark'
		} ${isStart ? 'text-[0.78rem]' : 'text-[0.82rem] leading-[1.3]'}`;

	let isMobileMenuOpen = $state(false);

	onMount(() => {
		if (typeof window === 'undefined') return;

		let frame = 0;

		const resolveTargets = (): HTMLElement[] =>
			['biteso-text-start', ...jornadaMarks.map((mark) => mark.id)]
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
		<p class="m-0 font-ui text-[0.92rem] font-semibold text-text-soft" data-i18n-skip>
			{publicationDateLabel}: {formattedPublishedOn}
		</p>

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

		<div id="biteso-text-start" class="grid min-h-6 place-items-center pt-2 scroll-mt-28">
			<!-- Reponer cuando haya un nuevo logo autorizado:
			<img src={bitesoLogo} alt="Logo BITESO" class="h-auto w-[min(24rem,78vw)]" />
			-->
		</div>

		<h2 class="mt-1 text-center font-ui text-[0.95rem] font-bold uppercase tracking-[0.08em] text-brand-blue-dark">
			<span data-i18n-skip>{displayWorkTitle.toLocaleUpperCase('es-ES')}</span>
		</h2>

		<div class="flex min-w-0 max-w-full justify-end">
			<InlineActionButton
				type="button"
				icon={Download}
				ariaLabel="Descargar texto en TXT"
				title="Descargar TXT"
				onclick={downloadText}
			>
				Descargar TXT
			</InlineActionButton>
		</div>

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
					{#each jornadaMarks as mark}
						<a
							href={`#${mark.id}`}
							aria-current={activeTextAnchor === mark.id ? 'location' : undefined}
							class={navLinkClass(mark.id)}
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
		{#each jornadaMarks as mark}
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
