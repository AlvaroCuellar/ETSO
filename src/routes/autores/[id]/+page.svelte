<script lang="ts">
	import WorksTable from '$lib/components/search/WorksTable.svelte';
	import Breadcrumbs from '$lib/components/ui/Breadcrumbs.svelte';
	import PageHero from '$lib/components/ui/PageHero.svelte';
	import SeoHead from '$lib/components/seo/SeoHead.svelte';
	import autorBg from '$lib/assets/heros/autor-bg.jpg';
	import { goto } from '$app/navigation';
	import { onDestroy } from 'svelte';
	import { localizePath, translateText } from '$lib/i18n';
	import type { ObraTableRow } from '$lib/domain/catalog';

	import type { PageData } from './$types';

	type AuthorFilterKey = 'related_any' | 'trad_any' | 'etso_yes' | 'only_trad' | 'only_etso';

	let { data }: { data: PageData } = $props();
	const seoDescription = $derived.by(() => {
		const total = data.metrics.relatedAny;
		const descriptions = {
			es: `${data.author.name}: ficha de autoría en ETSO con ${total} ${total === 1 ? 'obra relacionada' : 'obras relacionadas'} en Examen de autorías.`,
			en: `${data.author.name}: authorship record in ETSO with ${total} related ${total === 1 ? 'work' : 'works'} in Examen de autorías.`,
			fr: `${data.author.name} : fiche d’auteur dans ETSO avec ${total} ${total === 1 ? 'œuvre liée' : 'œuvres liées'} dans Examen de autorías.`,
			pt: `${data.author.name}: ficha de autoria no ETSO com ${total} ${total === 1 ? 'obra relacionada' : 'obras relacionadas'} em Examen de autorías.`,
			it: `${data.author.name}: scheda d’autore in ETSO con ${total} ${total === 1 ? 'opera collegata' : 'opere collegate'} in Examen de autorías.`,
			de: `${data.author.name}: Autorschaftsdatensatz in ETSO mit ${total} ${total === 1 ? 'zugehörigem Werk' : 'zugehörigen Werken'} in Examen de autorías.`,
			zh: `${data.author.name}：ETSO 作者记录，在 Examen de autorías 中包含 ${total} 部相关作品。`,
			ja: `${data.author.name}：ETSO の著者情報。Examen de autorías に ${total} 件の関連作品があります。`,
			ko: `${data.author.name}: ETSO 저자 기록. Examen de autorías에 관련 작품 ${total}건이 있습니다.`,
			ru: `${data.author.name}: авторская карточка в ETSO с ${total} ${total === 1 ? 'связанным произведением' : 'связанными произведениями'} в Examen de autorías.`,
			ar: `${data.author.name}: بطاقة مؤلف في ETSO تتضمن ${total} من الأعمال المرتبطة في Examen de autorías.`
		} as const;
		return descriptions[data.locale] ?? descriptions.es;
	});

	let titleFilter = $derived(data.filters.title);
	let genreFilter = $derived(data.filters.genre);
	const activeFilter = $derived(data.filters.filter as AuthorFilterKey);
	let titleTimer: ReturnType<typeof setTimeout> | undefined;
	onDestroy(() => clearTimeout(titleTimer));
	const t = (value: string): string => translateText(data.locale, value);
	const basePath = $derived(`/autores/${data.author.id}`);

	const listingPath = (pageNumber = 1, filter = activeFilter): string => {
		const params = new URLSearchParams();
		if (filter !== 'related_any') params.set('filter', filter);
		if (titleFilter.trim()) params.set('title', titleFilter.trim());
		if (genreFilter) params.set('genre', genreFilter);
		if (pageNumber > 1) params.set('page', String(pageNumber));
		const query = params.toString();
		return localizePath(`${basePath}${query ? `?${query}` : ''}`, data.locale);
	};
	const applyFilters = (): void => {
		clearTimeout(titleTimer);
		void goto(listingPath(), { replaceState: true, noScroll: true, keepFocus: true });
	};
	const queueTitleFilter = (): void => {
		clearTimeout(titleTimer);
		titleTimer = setTimeout(applyFilters, 350);
	};
	const tableRows = $derived<ObraTableRow[]>(data.works.map((relation) => ({
		rowId: relation.work.id,
		work: relation.work,
		filterFlags: {
			relatedAny: true,
			tradAny: relation.inTraditional,
			etsoYes: relation.inStylometry,
			onlyEtso: !relation.inTraditional && relation.inStylometry,
			onlyTrad: relation.inTraditional && !relation.inStylometry
		}
	})));

	const statCardBase =
		'block h-full w-full cursor-pointer appearance-none rounded-[10px] border border-black/10 bg-brand-blue/5 text-left font-ui text-inherit no-underline hover:no-underline transition [padding-right:3rem] hover:border-brand-blue/30 hover:bg-brand-blue/10 hover:shadow-[0_8px_20px_rgba(0,51,167,0.10)] focus-visible:border-brand-blue/30 focus-visible:bg-brand-blue/10 focus-visible:shadow-[0_8px_20px_rgba(0,51,167,0.10)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue/25';
	const statCardPrimaryPadding = 'px-5 py-[1.15rem] [padding-right:3.25rem]';
	const statCardSecondaryPadding = 'px-4 py-4';
	const statCardActive = 'border-brand-blue/30 bg-brand-blue/10 shadow-[0_8px_20px_rgba(0,51,167,0.10)]';

	const cardClass = (filter: AuthorFilterKey): string => {
		const isPrimary = filter === 'related_any' || filter === 'trad_any' || filter === 'etso_yes';
		return `${statCardBase} ${isPrimary ? statCardPrimaryPadding : statCardSecondaryPadding} ${activeFilter === filter ? statCardActive : ''}`.trim();
	};
</script>

<SeoHead title={data.author.name} preserveTitle={data.author.id !== 'desconocido'} description={seoDescription} path={data.canonicalPath} noindex={data.hasFilters} nofollow={false} />

<div class="grid min-w-0 max-w-full gap-6">
	<Breadcrumbs
		items={[
			{ label: 'Inicio', href: '/' },
			{ label: 'Examen de autorías', href: '/examen-autorias' },
			{ label: 'Dramaturgos', href: '/examen-autorias/dramaturgos' },
			{ label: data.author.name, preserveLabel: data.author.id !== 'desconocido' }
		]}
	/>

	<PageHero
		compact
		eyebrow="Ficha de autor"
		title={data.author.name}
		preserveTitle={data.author.id !== 'desconocido'}
		preserveSubtitle
		subtitle={data.author.nameVariants.length ? data.author.nameVariants.join(' | ') : undefined}
		backgroundImage={autorBg}
	/>

	<div class="mx-auto w-full min-w-0 max-w-[1280px] font-ui">
		<div class="grid min-w-0 max-w-full grid-cols-1">
			<div class="min-w-0 max-w-full">
				<div class="mb-5">
					<div class="mb-[0.9rem] grid grid-cols-1 gap-[0.9rem] md:grid-cols-2 lg:grid-cols-3">
						<div class="min-w-0">
							<a
								href={listingPath(1, 'related_any')}
								class={cardClass('related_any')}
								data-filter="related_any"
								aria-current={activeFilter === 'related_any' ? 'true' : undefined}
							>
								<div class="text-[clamp(1.6rem,2.8vw,2rem)] leading-none font-bold text-brand-blue">
									{data.metrics.relatedAny}
								</div>
								<div class="mt-[0.45rem] text-[0.9rem] leading-[1.35] font-medium text-[#5a6c7d]">
									Obras relacionadas con el autor
								</div>
							</a>
						</div>

						<div class="min-w-0">
							<a
								href={listingPath(1, 'trad_any')}
								class={cardClass('trad_any')}
								data-filter="trad_any"
								aria-current={activeFilter === 'trad_any' ? 'true' : undefined}
							>
								<div class="text-[clamp(1.6rem,2.8vw,2rem)] leading-none font-bold text-brand-blue">
									{data.metrics.tradAny}
								</div>
								<div class="mt-[0.45rem] text-[0.9rem] leading-[1.35] font-medium text-[#5a6c7d]">
									Obras respaldadas por la tradición
								</div>
							</a>
						</div>

						<div class="min-w-0">
							<a
								href={listingPath(1, 'etso_yes')}
								class={cardClass('etso_yes')}
								data-filter="etso_yes"
								aria-current={activeFilter === 'etso_yes' ? 'true' : undefined}
							>
								<div class="text-[clamp(1.6rem,2.8vw,2rem)] leading-none font-bold text-brand-blue">
									{data.metrics.etsoYes}
								</div>
								<div class="mt-[0.45rem] text-[0.9rem] leading-[1.35] font-medium text-[#5a6c7d]">
									Obras respaldadas por la estilometría
								</div>
							</a>
						</div>
					</div>

					<div class="grid grid-cols-1 gap-[0.9rem] md:grid-cols-2">
						<div class="min-w-0">
							<a
								href={listingPath(1, 'only_trad')}
								class={cardClass('only_trad')}
								data-filter="only_trad"
								aria-current={activeFilter === 'only_trad' ? 'true' : undefined}
							>
								<div class="text-[clamp(1.6rem,2.8vw,2rem)] leading-none font-bold text-brand-blue">
									{data.metrics.onlyTrad}
								</div>
								<div class="mt-[0.45rem] text-[0.9rem] leading-[1.35] font-medium text-[#5a6c7d]">
									Obras respaldadas solo por la tradición
								</div>
							</a>
						</div>

						<div class="min-w-0">
							<a
								href={listingPath(1, 'only_etso')}
								class={cardClass('only_etso')}
								data-filter="only_etso"
								aria-current={activeFilter === 'only_etso' ? 'true' : undefined}
							>
								<div class="text-[clamp(1.6rem,2.8vw,2rem)] leading-none font-bold text-brand-blue">
									{data.metrics.onlyEtso}
								</div>
								<div class="mt-[0.45rem] text-[0.9rem] leading-[1.35] font-medium text-[#5a6c7d]">
									Novedades respaldadas por la estilometría
								</div>
							</a>
						</div>
					</div>
				</div>

				<div class="mt-1 min-w-0 max-w-full">
					<form method="GET" action={localizePath(basePath, data.locale)} class="mb-4 flex min-w-0 max-w-full flex-col gap-4 md:flex-row md:items-end md:justify-between" onsubmit={(event) => { event.preventDefault(); applyFilters(); }}>
						<input type="hidden" name="filter" value={activeFilter} />
						<label class="flex w-full max-w-none flex-col gap-1.5 md:max-w-[360px]">
							<span class="text-[0.9rem] leading-[1.2] font-medium text-[#30465e]">Buscar por título</span>
							<input
								type="search"
								name="title"
								oninput={queueTitleFilter}
								class="w-full rounded-lg border border-black/15 bg-white px-3.5 py-2.5 text-[0.95rem] text-[#23384d] transition focus:border-brand-blue/35 focus:outline-none focus:ring-[3px] focus:ring-brand-blue/10"
								placeholder="Buscar por título"
								aria-label="Buscar por título"
								bind:value={titleFilter}
							/>
						</label>
						<label class="flex w-full max-w-none flex-col gap-1.5 md:min-w-[220px] md:max-w-[280px]">
							<span class="text-[0.9rem] leading-[1.2] font-medium text-[#30465e]">Filtrar por género</span>
							<select
								class="w-full rounded-lg border border-black/15 bg-white px-3.5 py-2.5 text-[0.95rem] text-[#23384d] transition focus:border-brand-blue/35 focus:outline-none focus:ring-[3px] focus:ring-brand-blue/10"
								aria-label="Filtrar por género"
								name="genre"
								onchange={(event) => { genreFilter = event.currentTarget.value; applyFilters(); }}
								bind:value={genreFilter}
							>
								<option value="">Todos los géneros</option>
								{#each data.genreOptions as genre}
									<option value={genre}>{genre}</option>
								{/each}
							</select>
						</label>
						<noscript><button type="submit" class="rounded-lg bg-brand-blue px-4 py-2 text-white">{t('Buscar')}</button></noscript>
					</form>

					<p class="mb-3 text-sm text-text-soft" aria-live="polite">{t('Obras')}: {data.pagination.start}–{data.pagination.end} / {data.pagination.totalResults}</p>

					<div class="min-w-0 max-w-full">
						<WorksTable rows={tableRows} mode="standard" emptyMessage="" />
					</div>

					{#if data.pagination.totalPages > 1}
						<nav aria-label={t('Paginación de obras')} class="mt-5 flex flex-wrap items-center justify-center gap-2 font-ui">
							{#if data.pagination.page > 1}
								<a href={listingPath(data.pagination.page - 1)} rel="prev" class="rounded-lg border border-brand-blue/20 px-3 py-2">{t('Página anterior')}</a>
							{/if}
							{#each Array.from({ length: data.pagination.totalPages }, (_, index) => index + 1) as pageNumber}
								<a href={listingPath(pageNumber)} aria-current={pageNumber === data.pagination.page ? 'page' : undefined} aria-label={`${t('Paginación de obras')}: ${pageNumber}`} class={`rounded-lg border border-brand-blue/20 px-3 py-2 ${pageNumber === data.pagination.page ? 'bg-brand-blue text-white' : ''}`}>{pageNumber}</a>
							{/each}
							{#if data.pagination.page < data.pagination.totalPages}
								<a href={listingPath(data.pagination.page + 1)} rel="next" class="rounded-lg border border-brand-blue/20 px-3 py-2">{t('Página siguiente')}</a>
							{/if}
						</nav>
					{/if}

					{#if tableRows.length === 0}
						<div class="mt-4 rounded-[10px] border border-brand-blue/20 bg-brand-blue/10 px-4 py-4 text-[#29445f]">
							No hay obras que coincidan con el filtro actual.
						</div>
					{/if}
				</div>
			</div>
		</div>
	</div>
</div>
