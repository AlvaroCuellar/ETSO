<script lang="ts">
	import Breadcrumbs from '$lib/components/ui/Breadcrumbs.svelte';
	import FeatureHeroSection from '$lib/components/ui/FeatureHeroSection.svelte';
	import HeroStatCard from '$lib/components/ui/HeroStatCard.svelte';
	import SeoHead from '$lib/components/seo/SeoHead.svelte';
	import fondoLogo from '$lib/assets/fondos/fondo-logo.webp';
	import { localizePath } from '$lib/i18n';
	import { normalizePlainText } from '$lib/search/normalize';
	import {
		buildWorkTitleSearchText,
		formatDisplayWorkTitle
	} from '$lib/utils/format-display-work-title';
	import BookOpen from 'lucide-svelte/icons/book-open';
	import Feather from 'lucide-svelte/icons/feather';

	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	const BITESO_SEO_DESCRIPTION =
		'Biblioteca Textual Siglo de Oro: textos digitales en acceso abierto para lectura, consulta e investigación.';
	const WORKS_PAGE_SIZE = 80;

	let query = $state('');
	let visibleWorkCount = $state(WORKS_PAGE_SIZE);

	const countLabelsByLocale = {
		es: { of: 'de', more: 'más', seeMore: 'Ver más', visibleTexts: 'textos visibles' },
		en: { of: 'of', more: 'more', seeMore: 'View more', visibleTexts: 'visible texts' },
		fr: { of: 'sur', more: 'de plus', seeMore: 'Voir plus', visibleTexts: 'textes visibles' },
		pt: { of: 'de', more: 'mais', seeMore: 'Ver mais', visibleTexts: 'textos visíveis' },
		it: { of: 'di', more: 'altri', seeMore: 'Vedi altro', visibleTexts: 'testi visibili' },
		de: { of: 'von', more: 'mehr', seeMore: 'Mehr anzeigen', visibleTexts: 'sichtbare Texte' },
		zh: { of: '/', more: '更多', seeMore: '查看更多', visibleTexts: '个可见文本' },
		ja: { of: '/', more: 'さらに', seeMore: 'もっと見る', visibleTexts: '件の表示中のテキスト' },
		ko: { of: '/', more: '더', seeMore: '더 보기', visibleTexts: '개의 표시된 텍스트' },
		ru: { of: 'из', more: 'еще', seeMore: 'Показать еще', visibleTexts: 'видимых текстов' },
		ar: { of: 'من', more: 'إضافية', seeMore: 'عرض المزيد', visibleTexts: 'نصوص ظاهرة' }
	} as const;
	const countLabels = $derived(countLabelsByLocale[data.locale] ?? countLabelsByLocale.es);

	const normalizeFilterText = (value: string): string =>
		normalizePlainText(value, false).replace(/\s+/g, ' ').trim();

	const formatGenre = (genre: string): string => genre.trim() || 'Sin género';
	const formatTextState = (textState: string): string => textState.trim() || 'Sin estado textual';

	const filteredWorks = $derived.by(() => {
		const normalizedQuery = normalizeFilterText(query);
		if (!normalizedQuery) return data.works;

		return data.works.filter((work) => {
			const haystack = normalizeFilterText(
				[
					buildWorkTitleSearchText(work.title, work.titleVariants),
					work.traditional,
					formatGenre(work.genre),
					formatTextState(work.textState)
				].join(' ')
			);
			return haystack.includes(normalizedQuery);
		});
	});
	const visibleWorks = $derived(filteredWorks.slice(0, visibleWorkCount));
	const hiddenWorksCount = $derived(Math.max(0, filteredWorks.length - visibleWorks.length));

	const showMoreWorks = (): void => {
		visibleWorkCount = Math.min(filteredWorks.length, visibleWorkCount + WORKS_PAGE_SIZE);
	};

	$effect(() => {
		query;
		visibleWorkCount = WORKS_PAGE_SIZE;
	});
</script>

<SeoHead title="BITESO" description={BITESO_SEO_DESCRIPTION} path="/biteso" />

<div class="grid gap-6">
	<Breadcrumbs items={[{ label: 'Inicio', href: '/' }, { label: 'BITESO' }]} />

	<FeatureHeroSection
		eyebrow=""
		title="BITESO"
		subtitle="Biblioteca Textual Siglo de Oro"
		backgroundImage={fondoLogo}
		statsAriaLabel="Indicadores de BITESO"
	>
		<p class="mt-[1.8rem] mb-0 max-w-[64ch] font-reading text-[1.01rem] leading-[1.62] text-text-main">
			BITESO ofrece <b>acceso en abierto a textos digitales del Siglo de Oro</b> conseguidos, en su mayoría, a partir de transcripciones automáticas de impresos y manuscritos antiguos. La colección reúne obras producidas para los análisis estilométricos de autoría y materiales incorporados gracias a la colaboración de especialistas, colegas y estudiantes.
		</p>
		<p class="mt-[1.25rem] mb-0 max-w-[64ch] font-reading text-[1.01rem] leading-[1.62] text-text-main">
			Los textos deben <b>entenderse como versiones de trabajo</b>: no sustituyen a las ediciones críticas, pueden contener errores de transcripción y presentan una calidad desigual según la fuente y el estado de revisión. En su estado actual, se ofrecen sin nombres de personajes ni acotaciones escénicas. La colección permanece abierta a correcciones, ampliaciones y mejoras.
		</p>
		
		{#snippet stats()}
			<HeroStatCard
				Icon={BookOpen}
				value={data.stats.bitesoTexts}
				label="Textos digitales en acceso abierto"
				desktopOffset="up"
			/>
			<HeroStatCard Icon={Feather} value={data.stats.authors} label="Autores" desktopOffset="down" />
		{/snippet}
	</FeatureHeroSection>

	<section class="grid gap-3">
		<h2 class="m-0 font-ui text-[clamp(1.6rem,2.6vw,2.1rem)] font-bold leading-[1.12] text-brand-blue-dark">
			Textos digitales en acceso abierto
		</h2>
		<p class="m-0 leading-[1.65] text-text-main">
			Listado alfabético de las obras con texto digital BITESO. Usa el buscador para localizar una obra y entrar directamente en su texto.
		</p>
		<p class="m-0 text-[0.92rem] font-medium text-text-soft">
			{visibleWorks.length} {countLabels.of} {filteredWorks.length} {countLabels.visibleTexts}
		</p>
	</section>

	<section class="grid gap-4">
		<label class="grid gap-1 text-[0.86rem] text-text-soft" for="biteso-textos-query">
			<span class="font-ui font-semibold uppercase tracking-[0.04em]">Buscar obra</span>
			<input
				id="biteso-textos-query"
				type="search"
				placeholder="Ej: La monja alférez, El castigo sin venganza..."
				class="w-full rounded-md border border-border bg-white px-3 py-2 text-[0.95rem] text-text-main"
				bind:value={query}
			/>
		</label>

		{#if filteredWorks.length === 0}
			<p class="m-0 italic text-text-soft">No hay textos que coincidan con la búsqueda.</p>
		{:else}
			<div class="overflow-hidden bg-[rgba(255,255,255,0.52)]">
				<div class="divide-y divide-[rgba(0,51,167,0.08)]">
					{#each visibleWorks as work}
						<a
							href={localizePath(`/biteso/${work.slug}`, data.locale)}
							class="grid gap-1 px-4 py-3 text-inherit no-underline transition hover:bg-[rgba(237,242,255,0.7)] hover:no-underline md:px-5"
						>
							<p class="m-0 font-ui text-[0.99rem] leading-[1.45] text-brand-blue-dark" data-i18n-skip>
								<span class="font-semibold">{formatDisplayWorkTitle(work.title)}</span>
								<span class="mx-1.5 text-text-soft/70">·</span>
								<span class="font-normal text-text-main">{work.traditional}</span>
								<span class="mx-1.5 text-text-soft/70">·</span>
								<span class="font-normal text-text-soft">{formatGenre(work.genre)}</span>
								<span class="mx-1.5 text-text-soft/70">·</span>
								<span class="font-normal text-text-soft">{formatTextState(work.textState)}</span>
							</p>
							{#if work.titleVariants.length > 0}
								<p class="m-0 text-[0.92rem] leading-[1.5] text-text-soft" data-i18n-skip>
									{#each work.titleVariants as variante, index}
										<span class="italic">{formatDisplayWorkTitle(variante)}</span>
										{#if index < work.titleVariants.length - 1}
											<span class="mx-1 not-italic text-text-soft/65">|</span>
										{/if}
									{/each}
								</p>
							{/if}
						</a>
					{/each}
				</div>
			</div>
			{#if hiddenWorksCount > 0}
				<div class="flex justify-center pt-1">
					<button
						type="button"
						class="inline-flex items-center justify-center rounded-[9px] border border-border-accent-blue bg-white px-5 py-2.5 font-ui text-[0.94rem] font-semibold text-brand-blue-dark shadow-[0_8px_24px_rgba(25,46,80,0.05)] transition hover:bg-surface-accent-blue"
						onclick={showMoreWorks}
					>
						{countLabels.seeMore} ({Math.min(WORKS_PAGE_SIZE, hiddenWorksCount)} {countLabels.more})
					</button>
				</div>
			{/if}
		{/if}
	</section>
</div>
