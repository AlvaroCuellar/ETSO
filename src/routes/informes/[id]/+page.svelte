<script lang="ts">
	import ChevronRight from 'lucide-svelte/icons/chevron-right';
	import Download from 'lucide-svelte/icons/download';
	import WorksTable from '$lib/components/search/WorksTable.svelte';
	import Breadcrumbs from '$lib/components/ui/Breadcrumbs.svelte';
	import CitationSuggestionCard from '$lib/components/ui/CitationSuggestionCard.svelte';
	import InlineActionButton from '$lib/components/ui/InlineActionButton.svelte';
	import PageHero from '$lib/components/ui/PageHero.svelte';
	import SeoHead from '$lib/components/seo/SeoHead.svelte';
	import informeBg from '$lib/assets/heros/informes.webp';
	import { ambitoLabels, ambitos, type Ambito, type ObraTableRow } from '$lib/domain/catalog';
	import {
		formatDisplayWorkTitle,
		formatPrefixedDisplayWorkTitleHtml
	} from '$lib/utils/format-display-work-title';
	import { translateText } from '$lib/i18n';
	import { resolveStylometryResult } from '$lib/utils/stylometry-result';
	import { renderInlineItalicsHtml, renderReportNoteHtml } from '$lib/utils/render-inline-italics-html';
	import {
		buildTraditionalAttributionParts,
		type AttributionPhrasePart
	} from '$lib/utils/traditional-attribution-phrase';

	import type { PageData } from './$types';

	type ResultTextPart = AttributionPhrasePart;

	let { data }: { data: PageData } = $props();
	const t = (value: string): string => translateText(data.locale, value);
	const displayWorkTitle = $derived.by(() => formatDisplayWorkTitle(data.work.title));
	const displayInformeTitle = $derived.by(() => `${t('Análisis estilométrico de')} ${displayWorkTitle}`);
	const displayInformeTitleHtml = $derived.by(() =>
		formatPrefixedDisplayWorkTitleHtml(t('Análisis estilométrico de'), data.work.title)
	);

	let activeAmbito = $state<Ambito>('obracompleta');

	const authorById = $derived.by(() => new Map(data.authors.map((author) => [author.id, author] as const)));

	const availableAmbitos = $derived.by(() =>
		ambitos.filter((ambito) => (data.distances[ambito] ?? []).length > 0)
	);

	$effect(() => {
		if (availableAmbitos.length === 0) return;
		if (availableAmbitos.includes(activeAmbito)) return;
		activeAmbito = availableAmbitos[0];
	});

	const badgeColor = (distance: number): string => {
		if (distance <= 0.75) return '#1f7a4a';
		if (distance <= 1.15) return '#2f855a';
		if (distance <= 1.5) return '#0D3F91';
		return '#6c757d';
	};

	const normalizeText = (value: string): string => value.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

	const localizedListConnector = (connector: 'and' | 'or'): string => {
		const connectors = {
			es: { and: 'y', or: 'o' },
			en: { and: 'and', or: 'or' },
			fr: { and: 'et', or: 'ou' },
			pt: { and: 'e', or: 'ou' },
			it: { and: 'e', or: 'o' },
			de: { and: 'und', or: 'oder' },
			zh: { and: '和', or: '或' },
			ja: { and: 'および', or: 'または' },
			ko: { and: '및', or: '또는' },
			ru: { and: 'и', or: 'или' },
			ar: { and: 'و', or: 'أو' }
		} as const;
		return (connectors[data.locale] ?? connectors.es)[connector];
	};

	const traditionalAttributionParts = $derived.by(() =>
		buildTraditionalAttributionParts(data.work.traditionalAttribution, {
			translate: t,
			connectorLabels: {
				and: localizedListConnector('and'),
				or: localizedListConnector('or')
			}
		})
	);

	const seoDescription = $derived.by(() => {
		const intro = data.informe.intro?.trim();
		if (data.locale === 'es' && intro && intro.length >= 50 && intro.split(/\s+/).length >= 6) return intro;
		const descriptions = {
			es: `Informe estilométrico de ${displayWorkTitle} en ETSO, con distancias léxicas, obras cercanas e indicios de atribución para el estudio de la autoría teatral del Siglo de Oro.`,
			en: `Stylometric report for ${displayWorkTitle} in ETSO, with lexical distances, closest works and authorship clues for the study of Golden Age theatre.`,
			fr: `Rapport stylométrique de ${displayWorkTitle} dans ETSO, avec distances lexicales, œuvres les plus proches et indices d’attribution pour l’étude du théâtre du Siècle d’or.`,
			pt: `Relatório estilométrico de ${displayWorkTitle} no ETSO, com distâncias lexicais, obras mais próximas e indícios de atribuição para o estudo do teatro do Século de Ouro espanhol.`,
			it: `Rapporto stilometrico di ${displayWorkTitle} in ETSO, con distanze lessicali, opere più vicine e indizi di attribuzione per lo studio del teatro del Secolo d’Oro spagnolo.`,
			de: `Stilometrischer Bericht zu ${displayWorkTitle} in ETSO, mit lexikalischen Distanzen, nächstliegenden Werken und Hinweisen zur Autorschaft des Theaters des spanischen Siglo de Oro.`,
			zh: `ETSO 中 ${displayWorkTitle} 的文体计量报告，包含词汇距离、相近作品和作者归属线索，用于研究西班牙黄金时代戏剧。`,
			ja: `ETSO における ${displayWorkTitle} の文体計量レポート。語彙距離、近接作品、著者帰属の手がかりを通じてスペイン黄金世紀演劇を研究します。`,
			ko: `ETSO의 ${displayWorkTitle} 문체계량 보고서입니다. 어휘 거리, 가까운 작품, 저자 귀속 단서를 통해 스페인 황금세기 연극을 연구합니다.`,
			ru: `Стилометрический отчет о ${displayWorkTitle} в ETSO: лексические расстояния, ближайшие произведения и признаки авторской атрибуции для изучения театра испанского Золотого века.`,
			ar: `تقرير قياس أسلوبي عن ${displayWorkTitle} في ETSO، يتضمن المسافات المعجمية والأعمال الأقرب ومؤشرات إسناد التأليف لدراسة مسرح العصر الذهبي الإسباني.`
		} as const;
		return descriptions[data.locale] ?? descriptions.es;
	});

	const tokenizeResultText = (value: string): ResultTextPart[] => {
		const parts: ResultTextPart[] = [];
		const authorKeyPattern = /#([A-Za-z0-9_]+)/g;
		let lastIndex = 0;
		let match: RegExpExecArray | null;

		while ((match = authorKeyPattern.exec(value)) !== null) {
			if (match.index > lastIndex) {
				parts.push({
					kind: 'text',
					value: value.slice(lastIndex, match.index)
				});
			}

			const authorId = match[1];
			const author = authorById.get(authorId);
			parts.push(
				author
					? {
							kind: 'author',
							value: author.name,
							authorId,
							hasAuthorshipExam: author.hasAuthorshipExam
						}
					: {
							kind: 'text',
							value: match[0]
						}
			);
			lastIndex = authorKeyPattern.lastIndex;
		}

		if (lastIndex < value.length) {
			parts.push({
				kind: 'text',
				value: value.slice(lastIndex)
			});
		}

		return parts;
	};

	const result1Parts = $derived.by(() => tokenizeResultText(resolveStylometryResult(data.work, { translate: t, andLabel: localizedListConnector('and') }) ?? ''));
	const noteParagraphs = $derived.by(() =>
		(data.work.notes ?? '').trim().split(/\r?\n\s*\r?\n/).filter((paragraph) => paragraph.trim())
	);
	const noteGroups = $derived.by(() => {
		const groups: { citation?: string; literal: boolean; paragraphs: string[] }[] = [];
		for (const paragraph of noteParagraphs) {
			if (/^(Como se apunta en |Resumen del estudio: )/.test(paragraph)) {
				groups.push({ citation: paragraph, literal: paragraph.startsWith('Como se apunta en '), paragraphs: [] });
			} else {
				if (!groups.length) groups.push({ literal: false, paragraphs: [] });
				groups[groups.length - 1].paragraphs.push(paragraph);
			}
		}
		return groups;
	});

	const procedeValue = $derived.by(() => {
		const origin = data.work.origin?.trim();
		if (!origin || normalizeText(origin) === 'no disponible') return 'No disponible.';
		const cleaned = origin
			.replace(/^procede\s+de\s+/i, '')
			.replace(/^procede\s+/i, '')
			.trim();
		if (!cleaned) return 'No disponible.';
		return cleaned.endsWith('.') ? cleaned : `${cleaned}.`;
	});

	const methodologyLead =
		t('Se ofrecen a continuación las 20 obras con usos léxicos más cercanos, tanto a la obra completa como, cuando es posible, a cada una de sus jornadas, empleando un corpus constituido por 3000 obras de 400 autores diferentes. Las distancias han sido calculadas usando las frecuencias de las 500 palabras más usuales con el método Delta de Burrows. Cuanto mayor cercanía hay a 0,0 es mayor la afinidad.');

	const regularSections = $derived.by(() => data.bibliography.sections.filter((section) => !section.collapsible));
	const collapsibleSections = $derived.by(() =>
		data.bibliography.sections.filter((section) => section.collapsible)
	);
	const citationSection = $derived.by(() => regularSections[0] ?? null);
	const citationEntry = $derived.by(() => {
		if (!citationSection) return null;
		return (
			citationSection.entries.find((entry) => entry.id === 'etso-web') ??
			citationSection.entries[0] ??
			null
		);
	});
	const citationSectionEntries = $derived.by(() => {
		if (!citationSection) return [];
		if (!citationEntry) return citationSection.entries;
		return citationSection.entries.filter((entry) => entry.id !== citationEntry.id);
	});
	const extraRegularSections = $derived.by(() => {
		if (!citationSection) return regularSections;
		return regularSections.filter((section) => section.id !== citationSection.id);
	});

	const rowsByAmbito = $derived.by<Record<Ambito, ObraTableRow[]>>(() => ({
		obracompleta: data.distances.obracompleta.map((row) => ({
			rowId: `obracompleta-${row.relatedWork.id}`,
			work: row.relatedWork,
			position: row.rank,
			distancia: row.distancia,
			badgeColor: badgeColor(row.distancia)
		})),
		jornada1: data.distances.jornada1.map((row) => ({
			rowId: `jornada1-${row.relatedWork.id}`,
			work: row.relatedWork,
			position: row.rank,
			distancia: row.distancia,
			badgeColor: badgeColor(row.distancia)
		})),
		jornada2: data.distances.jornada2.map((row) => ({
			rowId: `jornada2-${row.relatedWork.id}`,
			work: row.relatedWork,
			position: row.rank,
			distancia: row.distancia,
			badgeColor: badgeColor(row.distancia)
		})),
		jornada3: data.distances.jornada3.map((row) => ({
			rowId: `jornada3-${row.relatedWork.id}`,
			work: row.relatedWork,
			position: row.rank,
			distancia: row.distancia,
			badgeColor: badgeColor(row.distancia)
		})),
		jornada4: data.distances.jornada4.map((row) => ({
			rowId: `jornada4-${row.relatedWork.id}`,
			work: row.relatedWork,
			position: row.rank,
			distancia: row.distancia,
			badgeColor: badgeColor(row.distancia)
		})),
		jornada5: data.distances.jornada5.map((row) => ({
			rowId: `jornada5-${row.relatedWork.id}`,
			work: row.relatedWork,
			position: row.rank,
			distancia: row.distancia,
			badgeColor: badgeColor(row.distancia)
		}))
	}));
</script>

<SeoHead title={displayInformeTitle} preserveTitle description={seoDescription} path={`/informes/${data.informe.slug}`} />

<div class="grid min-w-0 max-w-full gap-6">
	<Breadcrumbs
		items={[
			{ label: 'Inicio', href: '/' },
			{ label: 'Examen de autorías', href: '/examen-autorias' },
			{ label: 'Obras', href: '/examen-autorias/obras' },
			{ label: displayWorkTitle, href: `/obras/${data.work.slug}`, preserveLabel: true },
			{ label: 'Informe' }
		]}
	/>

	<PageHero
		compact
		eyebrow="Informe estilométrico"
		title={displayInformeTitle}
		titleHtml={displayInformeTitleHtml}
		preserveTitle
		backgroundImage={informeBg}
	/>

	<section class="min-w-0 max-w-full font-ui">
		<dl class="m-0 flex min-w-0 max-w-full flex-col gap-x-8 gap-y-4 rounded-[10px] bg-surface-soft px-4 py-4 md:flex-row md:flex-wrap md:px-5">
			<div class="grid min-w-0 content-start gap-1.5 md:max-w-[calc(100%-9rem)] md:flex-[0_1_auto]">
				<dt class="m-0 text-[0.72rem] font-bold uppercase tracking-[0.06em] text-text-accent-purple">
					Atribución tradicional
				</dt>
				<dd class="m-0 text-base leading-[1.55] text-text-main" data-i18n-skip>
					{#each traditionalAttributionParts as part}
						{#if part.kind === 'author' && part.authorId && part.hasAuthorshipExam}
							<a href={`/autores/${part.authorId}`} class="font-semibold text-brand-blue underline hover:text-brand-blue-dark focus-visible:text-brand-blue-dark">
								{part.value}
							</a>
						{:else}
							{part.value}
						{/if}
					{/each}
				</dd>
			</div>

			<div class="grid shrink-0 content-start gap-1.5">
				<dt class="m-0 text-[0.72rem] font-bold uppercase tracking-[0.06em] text-text-accent-purple">
					Género
				</dt>
				<dd class="m-0 text-base leading-[1.55] text-text-main">{data.work.genre}</dd>
			</div>

			<div class="grid min-w-0 basis-full content-start gap-1.5">
				<dt class="m-0 text-[0.72rem] font-bold uppercase tracking-[0.06em] text-text-accent-purple">
					Procedencia
				</dt>
				<dd class="m-0 text-base leading-[1.6] text-text-main" data-i18n-skip={procedeValue !== 'No disponible.' || undefined}>
					{@html renderInlineItalicsHtml(procedeValue)}
				</dd>
			</div>
		</dl>
	</section>

	<section class="mt-1 min-w-0 max-w-full">
		<div class="mb-5 grid min-w-0 max-w-full gap-2">
			<div class="flex flex-wrap items-center justify-between gap-3">
				<h2 class="m-0 text-[clamp(1.2rem,2vw,1.45rem)] font-semibold leading-[1.2] text-brand-blue-dark">
					Obras más cercanas
				</h2>
				<InlineActionButton
					href={`/api/informes/${data.informe.slug}/export.xlsx`}
					icon={Download}
					preloadData="off"
					ariaLabel="Descargar datos del informe en XLSX"
					title="Descargar XLSX"
				>
					Descarga informe
				</InlineActionButton>
			</div>
			<p class="m-0 text-[0.97rem] leading-[1.62] text-text-soft">{methodologyLead}</p>
		</div>

		<div class="min-w-0 max-w-full font-ui">
			{#if availableAmbitos.length > 1}
				<div class="mb-3 min-w-0 max-w-full md:hidden">
					<select
						id="mobile-acto-selector"
						class="w-full min-w-0 max-w-full cursor-pointer rounded-[8px] border-2 border-border-accent-blue bg-surface-accent-blue px-4 py-3 font-semibold text-brand-blue-dark transition-all focus:outline-none focus:ring-4 focus:ring-brand-blue/15"
						value={activeAmbito}
						onchange={(event) => {
							activeAmbito = (event.currentTarget as HTMLSelectElement).value as Ambito;
						}}
					>
						{#each availableAmbitos as ambito}
							<option value={ambito} data-i18n-skip>{t(ambitoLabels[ambito])} ({rowsByAmbito[ambito].length})</option>
						{/each}
					</select>
				</div>

				<ul class="mb-6 hidden list-none gap-2 border-b-2 border-border-accent-blue p-0 pb-2 md:flex" role="tablist">
					{#each availableAmbitos as ambito}
						<li>
							<button
								type="button"
								class={`informe-ambito-tab inline-flex cursor-pointer items-center rounded-card px-4 py-2 text-[0.9rem] font-ui font-medium transition hover:no-underline ${
									activeAmbito === ambito
										? 'bg-surface-soft text-brand-blue-dark'
										: 'bg-transparent text-text-soft hover:bg-surface-soft hover:text-brand-blue-dark'
								}`}
								data-tab={`acto-${ambito}`}
								onclick={(event) => {
									activeAmbito = ambito;
									event.currentTarget.blur();
								}}
							>
								<span data-i18n-skip>{t(ambitoLabels[ambito])}</span>
								<span
									class="ml-2 inline-flex rounded-[10px] bg-surface-accent-purple px-2 py-1 text-[0.75rem] leading-none text-text-accent-purple"
								>
									{rowsByAmbito[ambito].length}
								</span>
							</button>
						</li>
					{/each}
				</ul>
			{/if}

			<div class="min-w-0 max-w-full">
				{#if availableAmbitos.length === 0}
					<div class="rounded-[10px] border border-border-accent-blue bg-surface-accent-blue p-4 text-text-main">
						No hay distancias disponibles para este informe.
					</div>
				{:else}
					<div class="min-w-0 max-w-full" id={`acto-${activeAmbito}`}>
						<WorksTable
							rows={rowsByAmbito[activeAmbito]}
							mode="informe"
							emptyMessage="No hay obras cercanas disponibles en este ámbito."
						/>
					</div>
				{/if}
			</div>
		</div>
	</section>

	<section class="grid gap-3 font-ui">
		<h2 class="m-0 text-[clamp(1.2rem,2vw,1.45rem)] font-semibold leading-[1.2] text-brand-blue-dark">Resultados</h2>
		{#if result1Parts.length > 0}
			<article class="rounded-[8px] bg-surface-soft px-4 py-3.5 max-md:px-[0.9rem] max-md:py-3">
				<div class="grid gap-2">
					<p class="m-0 text-base leading-[1.62] text-text-main" data-i18n-skip>
						{#each result1Parts as part}
							{#if part.kind === 'author' && part.authorId && part.hasAuthorshipExam}
								<a href={`/autores/${part.authorId}`} class="font-semibold text-text-main underline hover:text-brand-blue-dark focus-visible:text-brand-blue-dark">
									{part.value}
								</a>
							{:else}
								{part.value}
							{/if}
						{/each}
					</p>
				</div>
			</article>
		{/if}
	{#if noteParagraphs.length > 0 || data.belmonteSections.length > 0}
		<article id="notas" class="grid scroll-mt-24 gap-3 rounded-[8px] border border-border-accent-blue bg-white px-5 py-4 max-md:px-4" aria-label={t('Notas')}>
			<h3 class="m-0 text-[1.05rem] font-semibold text-brand-blue-dark">{t('Notas')}</h3>
			{#each noteGroups as group}
				<div class="grid gap-4">
					{#if group.citation}<p class="m-0 break-words text-sm leading-relaxed text-text-main" data-i18n-skip>{@html renderReportNoteHtml(group.citation)}</p>{/if}
					{#if group.literal}
						<blockquote class="relative mx-3 my-1 grid gap-4 px-7 py-5 sm:mx-6 sm:px-10">
							<span aria-hidden="true" class="pointer-events-none absolute -left-2 -top-3 font-serif text-[5.5rem] leading-none text-brand-blue-dark opacity-15">“</span>
							{#each group.paragraphs as paragraph}<p class="relative m-0 whitespace-pre-line break-words text-base leading-[1.72] text-text-main" data-i18n-skip>{@html renderReportNoteHtml(paragraph)}</p>{/each}
							<span aria-hidden="true" class="pointer-events-none absolute -bottom-8 -right-2 font-serif text-[5.5rem] leading-none text-brand-blue-dark opacity-15">”</span>
						</blockquote>
					{:else if group.citation?.startsWith('Resumen del estudio: ')}
						<div class="mx-3 my-1 grid gap-4 px-7 py-5 sm:mx-6 sm:px-10">
							{#each group.paragraphs as paragraph}<p class="m-0 whitespace-pre-line break-words text-base leading-[1.72] text-text-main" data-i18n-skip>{@html renderReportNoteHtml(paragraph)}</p>{/each}
						</div>
					{:else}
						{#each group.paragraphs as paragraph}<p class="m-0 whitespace-pre-line break-words text-base leading-[1.72] text-text-main" data-i18n-skip>{@html renderReportNoteHtml(paragraph)}</p>{/each}
					{/if}
				</div>
			{/each}
			<div id="notas-belmonte" class="grid scroll-mt-24 gap-4">
			{#each data.belmonteSections as section}
				<section class="grid min-w-0 gap-4" aria-label={`Apartado ${section.section}: ${section.title}`}>
					<p class="m-0 break-words text-sm leading-relaxed text-text-main" data-i18n-skip>Como se apunta en Cuéllar, Álvaro. (2027). «Estilometría rodante y aprendizaje automático para la restitución del repertorio teatral de Luis de Belmonte Bermúdez». <i>Arte Nuevo. Revista de Estudios Áureos</i>. En prensa. Pasaje: apartado {section.section}.</p>
					<blockquote class="relative mx-3 my-1 grid gap-4 px-7 py-5 sm:mx-6 sm:px-10">
						<span aria-hidden="true" class="pointer-events-none absolute -left-2 -top-3 font-serif text-[5.5rem] leading-none text-brand-blue-dark opacity-15">“</span>
					{#each section.content as item}
						{#if item.type === 'paragraph'}
								<p class="m-0 whitespace-pre-line break-words text-base leading-[1.72] text-text-main" data-i18n-skip>{@html renderReportNoteHtml(item.html)}</p>
						{:else}
							<figure class="mx-auto my-2 grid w-full min-w-0 max-w-[680px] gap-2">
									<img src={item.src} width={item.width} height={item.height} loading="lazy" class="mx-auto h-auto w-full object-contain" alt={item.alt} />
								<figcaption class="text-center text-xs leading-relaxed text-text-muted">Estilometría rodante</figcaption>
							</figure>
						{/if}
					{/each}
						<span aria-hidden="true" class="pointer-events-none absolute -bottom-8 -right-2 font-serif text-[5.5rem] leading-none text-brand-blue-dark opacity-15">”</span>
					</blockquote>
				</section>
			{/each}
			</div>
		</article>
	{/if}
	{#if data.thesisGraphics.length > 0}
		<article id="graficas-tesis" class="grid scroll-mt-24 gap-5 rounded-[8px] border border-border-accent-blue bg-white px-5 py-5 max-md:px-4">
			{#if !noteParagraphs.length}<h3 class="m-0 text-[1.05rem] font-semibold text-brand-blue-dark">{t('Notas')}</h3>{/if}
			<p class="m-0 text-sm leading-relaxed">Cuéllar, Álvaro. (2022). <i>Propuestas de autoría y datación en el teatro de Lope de Vega a la luz de la Inteligencia Artificial</i>. Tesis doctoral, University of Kentucky. <a href="https://doi.org/10.13023/etd.2022.428" class="text-primary underline underline-offset-4">https://doi.org/10.13023/etd.2022.428</a>. Pasaje: {data.thesisPages.length === 1 ? 'p.' : 'pp.'} {data.thesisPages.join(', ')}; metodología: pp. 82–86.</p>
			{#each data.thesisCommentary as paragraph}<p class="m-0 text-base leading-[1.72] text-text-main" data-i18n-skip>{paragraph}</p>{/each}
			<div class="grid items-start gap-6 lg:grid-cols-2">
			{#each data.thesisGraphics as figure}
				<figure class="m-0 grid gap-3 rounded-lg bg-slate-50/60 p-4">
					<a href={figure.src} target="_blank" rel="noopener" aria-label={`Ampliar gráfica de ${figure.kind === 'authorship' ? 'autoría' : 'datación'}`}><img src={figure.src} width={figure.width} height={figure.height} loading="lazy" class="mx-auto h-auto max-h-[280px] w-full object-contain" alt={`Gráfica de ${figure.kind === 'authorship' ? 'autoría' : 'datación'} de la obra en la tesis de Álvaro Cuéllar (2022)`} /></a>
					<figcaption class="text-center text-sm text-text-main">{figure.kind === 'authorship' ? 'Autoría' : 'Datación'} · p. {figure.page}</figcaption>
				</figure>
			{/each}
			</div>
		</article>
	{/if}
</section>

	<section class="grid gap-4 font-ui">
		<div class="flex flex-wrap items-center justify-between gap-4">
			<h2 class="m-0 text-[clamp(1.2rem,2vw,1.45rem)] font-semibold leading-[1.2] text-brand-blue-dark">
				Referencias
			</h2>
		</div>

		{#if data.bibliography.sections.length === 0}
			<div class="rounded-[10px] border border-border-accent-blue bg-surface-accent-blue p-4 text-text-main">
				No hay referencias disponibles para este informe.
			</div>
		{:else}
			<div class="grid gap-3.5">
				{#if citationEntry}
					<CitationSuggestionCard
						citation={citationEntry.text}
						label="Cita sugerida"
						buttonLabel="Copiar cita"
						successMessage="Cita copiada."
						emptyCitationMessage="No hay cita disponible."
						copyErrorMessage="No se pudo copiar automáticamente."
					>
						<p class="m-0 text-[0.95rem] leading-[1.52] text-text-main">
							{#each citationEntry.parts as part}
								{#if part.kind === 'link'}
									<a
										href={part.href ?? part.value}
										target="_blank"
										rel="noopener noreferrer"
										class="break-words text-brand-blue underline hover:text-brand-blue-dark focus-visible:text-brand-blue-dark"
									>
										{part.value}
									</a>
								{:else if part.kind === 'italic'}
									<em>{part.value}</em>
								{:else}
									{part.value}
								{/if}
							{/each}
						</p>
					</CitationSuggestionCard>
				{/if}

				{#if citationSection && citationSectionEntries.length > 0}
					<section
						class="rounded-[10px] bg-white px-[0.9rem] py-[0.8rem] max-md:px-[0.8rem] max-md:py-[0.75rem]"
						aria-label={t(citationSection.lead)}
					>
						<p class="mb-[0.65rem] mt-0 text-[0.95rem] font-medium leading-[1.45] text-brand-blue-dark">
							{t(citationSection.lead)}
						</p>
						<ul class="m-0 grid list-none gap-[0.55rem] p-0" role="list">
							{#each citationSectionEntries as entry}
								<li class="informe-bibliografia-entry m-0">
									<p class="m-0 text-[0.95rem] leading-[1.52] text-text-main" data-i18n-skip>
										{#each entry.parts as part}
											{#if part.kind === 'link'}
												<a
													href={part.href ?? part.value}
													target="_blank"
													rel="noopener noreferrer"
													class="break-words text-brand-blue underline hover:text-brand-blue-dark focus-visible:text-brand-blue-dark"
												>
													{part.value}
												</a>
											{:else if part.kind === 'italic'}
												<em>{part.value}</em>
											{:else}
												{part.value}
											{/if}
										{/each}
									</p>
								</li>
							{/each}
						</ul>
					</section>
				{/if}

				{#each extraRegularSections as section}
					<section
						class="rounded-[10px] bg-white px-[0.9rem] py-[0.8rem] max-md:px-[0.8rem] max-md:py-[0.75rem]"
						aria-label={t(section.lead)}
					>
						{#if section.id === 'trabajos-relacionados-informe'}
							<h3 class="mb-4 mt-0 text-[1.05rem] font-semibold leading-[1.45] text-brand-blue-dark">
								{t(section.lead)}
							</h3>
						{:else}
							<p class="mb-[0.65rem] mt-0 text-[0.95rem] font-medium leading-[1.45] text-brand-blue-dark">
								{t(section.lead)}
							</p>
						{/if}
						<ul class="m-0 grid list-none gap-[0.55rem] p-0" role="list">
							{#each section.entries as entry}
								<li class="informe-bibliografia-entry m-0">
									<p class="m-0 text-[0.95rem] leading-[1.52] text-text-main" data-i18n-skip>
										{#each entry.parts as part}
											{#if part.kind === 'link'}
												<a
													href={part.href ?? part.value}
													target="_blank"
													rel="noopener noreferrer"
													class="break-words text-brand-blue underline hover:text-brand-blue-dark focus-visible:text-brand-blue-dark"
												>
													{part.value}
												</a>
											{:else if part.kind === 'italic'}
												<em>{part.value}</em>
											{:else}
												{part.value}
											{/if}
										{/each}
									</p>
								</li>
							{/each}
						</ul>
					</section>
				{/each}

				{#each collapsibleSections as section}
					<details
						class="informe-bibliografia-disclosure rounded-[10px] bg-white transition-[background-color,box-shadow] duration-200 open:overflow-visible open:bg-[var(--color-surface-subtle)] open:shadow-[0_8px_24px_rgba(25,46,80,0.06)]"
						open={section.defaultOpen === true}
					>
						<summary class="informe-bibliografia-summary cursor-pointer list-none px-[0.9rem] py-[0.65rem] text-[0.9rem] font-semibold text-brand-blue-dark transition hover:rounded-[10px] hover:bg-surface-accent-blue max-md:px-[0.8rem] max-md:py-[0.6rem]">
							<span class="inline-flex items-center gap-[0.35rem]">
								<span
									class="informe-bibliografia-summary-icon inline-flex h-[13px] w-[13px] items-center justify-center text-text-accent-purple transition-transform"
									aria-hidden="true"
								>
									<ChevronRight size={13} strokeWidth={2.2} />
								</span>
								<span>{t(section.collapsibleLabel || 'Más información')}</span>
							</span>
						</summary>
						<div
							class="px-[0.9rem] pb-[0.8rem] pt-0 max-md:px-[0.8rem] max-md:pb-[0.75rem]"
							aria-label={t(section.lead)}
						>
							<p class="mb-[0.65rem] mt-0 text-[0.95rem] font-medium leading-[1.45] text-brand-blue-dark">
								{t(section.lead)}
							</p>
							<ul class="m-0 grid list-none gap-[0.55rem] p-0" role="list">
								{#each section.entries as entry}
									<li class="informe-bibliografia-entry m-0">
										<p class="m-0 text-[0.95rem] leading-[1.52] text-text-main" data-i18n-skip>
											{#each entry.parts as part}
												{#if part.kind === 'link'}
													<a
														href={part.href ?? part.value}
														target="_blank"
														rel="noopener noreferrer"
														class="break-words text-brand-blue underline hover:text-brand-blue-dark focus-visible:text-brand-blue-dark"
													>
														{part.value}
													</a>
												{:else if part.kind === 'italic'}
													<em>{part.value}</em>
												{:else}
													{part.value}
												{/if}
											{/each}
										</p>
									</li>
								{/each}
							</ul>
						</div>
					</details>
				{/each}
			</div>
		{/if}
	</section>
</div>

<style>
	.informe-bibliografia-entry {
		padding-inline-start: 1.5rem;
		text-indent: -1.5rem;
	}

	.informe-ambito-tab,
	.informe-ambito-tab:focus,
	.informe-ambito-tab:focus-visible,
	.informe-ambito-tab:active {
		border: 0 solid transparent !important;
		border-bottom-width: 0 !important;
		outline: none !important;
		box-shadow: none !important;
		text-decoration: none !important;
		-webkit-tap-highlight-color: transparent;
	}

	.informe-ambito-tab::-moz-focus-inner {
		border: 0;
	}

	.informe-bibliografia-summary::-webkit-details-marker {
		display: none;
	}

	.informe-bibliografia-summary::marker {
		content: '';
	}

	.informe-bibliografia-disclosure[open] .informe-bibliografia-summary-icon {
		transform: rotate(90deg);
	}
</style>
