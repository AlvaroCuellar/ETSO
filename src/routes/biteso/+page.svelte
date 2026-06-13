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

	const bitesoLabelsByLocale = {
		es: {
			openAccessTexts: 'Textos digitales en acceso abierto',
			authors: 'Autores',
			listHeading: 'Textos digitales en acceso abierto',
			listDescription:
				'Lista alfabética de las obras que tienen texto digital en BITESO. Usa el buscador para encontrar una obra y acceder directamente a su texto.',
			listCount: (shown: number, total: number) => `Mostrando ${shown} de ${total} textos`,
			searchLabel: 'Buscar obra',
			searchPlaceholder: 'Buscar obra',
			empty: 'No hay textos que coincidan con la búsqueda.',
			showMore: (count: number) => `Ver más (${count} más)`
		},
		en: {
			openAccessTexts: 'Open-access digital texts',
			authors: 'Authors',
			listHeading: 'Open-access digital texts',
			listDescription:
				'Alphabetical list of works for which a digital text is available in BITESO. Use the search box to find a work and open its text directly.',
			listCount: (shown: number, total: number) => `Showing ${shown} of ${total} texts`,
			searchLabel: 'Search for a work',
			searchPlaceholder: 'Search for a work',
			empty: 'No texts match the search.',
			showMore: (count: number) => `View more (${count} more)`
		},
		fr: {
			openAccessTexts: 'Textes numériques en accès ouvert',
			authors: 'Auteurs',
			listHeading: 'Textes numériques en accès ouvert',
			listDescription:
				'Liste alphabétique des œuvres pour lesquelles un texte numérique est disponible dans BITESO. Utilisez le champ de recherche pour trouver une œuvre et accéder directement à son texte.',
			listCount: (shown: number, total: number) => `${shown} textes affichés sur ${total}`,
			searchLabel: 'Rechercher une œuvre',
			searchPlaceholder: 'Rechercher une œuvre',
			empty: 'Aucun texte ne correspond à la recherche.',
			showMore: (count: number) => `Voir plus (${count} de plus)`
		},
		pt: {
			openAccessTexts: 'Textos digitais em acesso aberto',
			authors: 'Autores',
			listHeading: 'Textos digitais em acesso aberto',
			listDescription:
				'Lista alfabética das obras que têm texto digital disponível no BITESO. Use o campo de pesquisa para encontrar uma obra e acessar diretamente seu texto.',
			listCount: (shown: number, total: number) => `Exibindo ${shown} de ${total} textos`,
			searchLabel: 'Pesquisar obra',
			searchPlaceholder: 'Pesquisar obra',
			empty: 'Não há textos que correspondam à pesquisa.',
			showMore: (count: number) => `Ver mais (${count} mais)`
		},
		it: {
			openAccessTexts: 'Testi digitali ad accesso aperto',
			authors: 'Autori',
			listHeading: 'Testi digitali ad accesso aperto',
			listDescription:
				'Elenco alfabetico delle opere per le quali è disponibile un testo digitale in BITESO. Usa il campo di ricerca per trovare un’opera e accedere direttamente al suo testo.',
			listCount: (shown: number, total: number) => `${shown} testi visualizzati su ${total}`,
			searchLabel: 'Cerca un’opera',
			searchPlaceholder: 'Cerca un’opera',
			empty: 'Non ci sono testi che corrispondono alla ricerca.',
			showMore: (count: number) => `Vedi altro (${count} altri)`
		},
		de: {
			openAccessTexts: 'Digitale Texte im Open Access',
			authors: 'Autorinnen und Autoren',
			listHeading: 'Digitale Texte im Open Access',
			listDescription:
				'Alphabetische Liste der Werke, für die in BITESO ein digitaler Text verfügbar ist. Verwenden Sie das Suchfeld, um ein Werk zu finden und direkt auf seinen Text zuzugreifen.',
			listCount: (shown: number, total: number) => `${shown} von ${total} Texten angezeigt`,
			searchLabel: 'Werk suchen',
			searchPlaceholder: 'Werk suchen',
			empty: 'Es sind keine Texte vorhanden, die zur Suche passen.',
			showMore: (count: number) => `Mehr anzeigen (${count} mehr)`
		},
		zh: {
			openAccessTexts: '开放获取数字文本',
			authors: '作者',
			listHeading: '开放获取数字文本',
			listDescription: '按字母顺序列出 BITESO 中已有数字文本的作品。请使用搜索框查找作品并直接打开其文本。',
			listCount: (shown: number, total: number) => `显示 ${total} 部文本中的 ${shown} 部`,
			searchLabel: '搜索作品',
			searchPlaceholder: '搜索作品',
			empty: '没有与搜索匹配的文本。',
			showMore: (count: number) => `查看更多（${count} 部）`
		},
		ja: {
			openAccessTexts: 'オープンアクセスのデジタルテキスト',
			authors: '著者',
			listHeading: 'オープンアクセスのデジタルテキスト',
			listDescription:
				'BITESO でデジタルテキストを利用できる作品のアルファベット順一覧です。検索欄を使って作品を探し、その本文に直接アクセスできます。',
			listCount: (shown: number, total: number) => `${total} 件中 ${shown} 件を表示`,
			searchLabel: '作品を検索',
			searchPlaceholder: '作品を検索',
			empty: '検索に一致するテキストはありません。',
			showMore: (count: number) => `もっと見る（${count} 件）`
		},
		ko: {
			openAccessTexts: '오픈 액세스 디지털 텍스트',
			authors: '저자',
			listHeading: '오픈 액세스 디지털 텍스트',
			listDescription:
				'BITESO에서 디지털 텍스트를 이용할 수 있는 작품의 알파벳순 목록입니다. 검색창을 사용해 작품을 찾고 해당 텍스트로 바로 이동할 수 있습니다.',
			listCount: (shown: number, total: number) => `전체 ${total}건 중 ${shown}건 표시`,
			searchLabel: '작품 검색',
			searchPlaceholder: '작품 검색',
			empty: '검색어와 일치하는 텍스트가 없습니다.',
			showMore: (count: number) => `더 보기 (${count}건)`
		},
		ru: {
			openAccessTexts: 'Цифровые тексты в открытом доступе',
			authors: 'Авторы',
			listHeading: 'Цифровые тексты в открытом доступе',
			listDescription:
				'Алфавитный список произведений, для которых в BITESO доступен цифровой текст. Используйте поле поиска, чтобы найти произведение и перейти непосредственно к его тексту.',
			listCount: (shown: number, total: number) => `Показано ${shown} из ${total} текстов`,
			searchLabel: 'Найти произведение',
			searchPlaceholder: 'Найти произведение',
			empty: 'Текстов, соответствующих запросу, нет.',
			showMore: (count: number) => `Показать еще (${count})`
		},
		ar: {
			openAccessTexts: 'النصوص الرقمية المتاحة بالوصول المفتوح',
			authors: 'المؤلفون',
			listHeading: 'النصوص الرقمية المتاحة بالوصول المفتوح',
			listDescription:
				'قائمة أبجدية بالأعمال التي يتوفر لها نص رقمي في BITESO. استخدم حقل البحث للعثور على العمل والدخول مباشرةً إلى نصه.',
			listCount: (shown: number, total: number) => `تُعرض ${shown} من أصل ${total} نصًا`,
			searchLabel: 'ابحث عن عمل',
			searchPlaceholder: 'ابحث عن عمل',
			empty: 'لا توجد نصوص تطابق البحث.',
			showMore: (count: number) => `عرض المزيد (${count} نصًا)`
		}
	} as const;
	const labels = $derived(bitesoLabelsByLocale[data.locale] ?? bitesoLabelsByLocale.es);

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
				label={labels.openAccessTexts}
				desktopOffset="up"
			/>
			<HeroStatCard Icon={Feather} value={data.stats.authors} label={labels.authors} desktopOffset="down" />
		{/snippet}
	</FeatureHeroSection>

	<section class="grid gap-3">
		<h2 class="m-0 font-ui text-[clamp(1.6rem,2.6vw,2.1rem)] font-bold leading-[1.12] text-brand-blue-dark">
			{labels.listHeading}
		</h2>
		<p class="m-0 leading-[1.65] text-text-main">
			{labels.listDescription}
		</p>
		<p class="m-0 text-[0.92rem] font-medium text-text-soft">
			{labels.listCount(visibleWorks.length, filteredWorks.length)}
		</p>
	</section>

	<section class="grid gap-4">
		<label class="grid gap-1 text-[0.86rem] text-text-soft" for="biteso-textos-query">
			<span class="font-ui font-semibold uppercase tracking-[0.04em]">{labels.searchLabel}</span>
			<input
				id="biteso-textos-query"
				type="search"
				placeholder={labels.searchPlaceholder}
				class="w-full rounded-md border border-border bg-white px-3 py-2 text-[0.95rem] text-text-main"
				bind:value={query}
			/>
		</label>

		{#if filteredWorks.length === 0}
			<p class="m-0 italic text-text-soft">{labels.empty}</p>
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
						{labels.showMore(Math.min(WORKS_PAGE_SIZE, hiddenWorksCount))}
					</button>
				</div>
			{/if}
		{/if}
	</section>
</div>
