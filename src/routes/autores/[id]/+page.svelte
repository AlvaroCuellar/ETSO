<script lang="ts">
	import WorksTable from '$lib/components/search/WorksTable.svelte';
	import Breadcrumbs from '$lib/components/ui/Breadcrumbs.svelte';
	import PageHero from '$lib/components/ui/PageHero.svelte';
	import autorBg from '$lib/assets/heros/autor-bg.jpg';
	import type { ObraTableRow } from '$lib/domain/catalog';

	import type { PageData } from './$types';

	type AuthorFilterKey = 'related_any' | 'trad_any' | 'etso_yes' | 'only_trad' | 'only_etso';

	let { data }: { data: PageData } = $props();

	let activeFilter = $state<AuthorFilterKey>('related_any');
	let titleFilter = $state('');
	let genreFilter = $state('');

	const normalizeText = (value: string): string =>
		value
			.normalize('NFD')
			.replace(/[\u0300-\u036f]/g, '')
			.toLowerCase()
			.trim();

	const genreOptions = $derived.by(() => {
		const values = Array.from(new Set(data.works.map((item) => item.work.genre)));
		values.sort((a, b) => a.localeCompare(b));
		return values;
	});

	const tableRows = $derived.by<ObraTableRow[]>(() => {
		const normalizedTitle = normalizeText(titleFilter);
		const normalizedGenre = normalizeText(genreFilter);

		return data.works
			.filter((relation) => {
				const filterFlags = {
					related_any: true,
					trad_any: relation.inTraditional,
					etso_yes: relation.inStylometry,
					only_trad: relation.inTraditional && !relation.inStylometry,
					only_etso: !relation.inTraditional && relation.inStylometry
				};
				if (!filterFlags[activeFilter]) return false;

				if (normalizedTitle) {
					const haystack = normalizeText([relation.work.title, ...relation.work.titleVariants].join(' '));
					if (!haystack.includes(normalizedTitle)) return false;
				}

				if (normalizedGenre) {
					if (normalizeText(relation.work.genre) !== normalizedGenre) return false;
				}

				return true;
			})
			.map((relation) => ({
				rowId: relation.work.id,
				work: relation.work,
				filterFlags: {
					relatedAny: true,
					tradAny: relation.inTraditional,
					etsoYes: relation.inStylometry,
					onlyEtso: !relation.inTraditional && relation.inStylometry,
					onlyTrad: relation.inTraditional && !relation.inStylometry
				}
			}));
	});

	const statCardBase =
		'block h-full w-full cursor-pointer appearance-none rounded-[10px] border border-black/10 bg-brand-blue/5 text-left font-ui transition [padding-right:3rem] hover:border-brand-blue/30 hover:bg-brand-blue/10 hover:shadow-[0_8px_20px_rgba(0,51,167,0.10)] focus-visible:border-brand-blue/30 focus-visible:bg-brand-blue/10 focus-visible:shadow-[0_8px_20px_rgba(0,51,167,0.10)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue/25';
	const statCardPrimaryPadding = 'px-5 py-[1.15rem] [padding-right:3.25rem]';
	const statCardSecondaryPadding = 'px-4 py-4';
	const statCardActive = 'border-brand-blue/30 bg-brand-blue/10 shadow-[0_8px_20px_rgba(0,51,167,0.10)]';

	const cardClass = (filter: AuthorFilterKey): string => {
		const isPrimary = filter === 'related_any' || filter === 'trad_any' || filter === 'etso_yes';
		return `${statCardBase} ${isPrimary ? statCardPrimaryPadding : statCardSecondaryPadding} ${activeFilter === filter ? statCardActive : ''}`.trim();
	};
</script>

<div class="grid gap-6">
	<Breadcrumbs
		items={[
			{ label: 'Inicio', href: '/' },
			{ label: 'Examen de autorías', href: '/examen-autorias' },
			{ label: 'Dramaturgos', href: '/examen-autorias/dramaturgos' },
			{ label: data.author.name }
		]}
	/>

	<PageHero
		compact
		eyebrow="Ficha de autor"
		title={data.author.name}
		subtitle={data.author.nameVariants.length ? data.author.nameVariants.join(' | ') : undefined}
		backgroundImage={autorBg}
	/>

	<div class="mx-auto w-full max-w-[1280px] font-ui">
		<div class="grid grid-cols-1">
			<div class="min-w-0">
				<div class="mb-5">
					<div class="mb-[0.9rem] grid grid-cols-1 gap-[0.9rem] md:grid-cols-2 lg:grid-cols-3">
						<div class="min-w-0">
							<button
								type="button"
								class={cardClass('related_any')}
								data-filter="related_any"
								aria-pressed={activeFilter === 'related_any' ? 'true' : 'false'}
								onclick={() => {
									activeFilter = 'related_any';
								}}
							>
								<div class="text-[clamp(1.6rem,2.8vw,2rem)] leading-none font-bold text-brand-blue">
									{data.metrics.relatedAny}
								</div>
								<div class="mt-[0.45rem] text-[0.9rem] leading-[1.35] font-medium text-[#5a6c7d]">
									Obras relacionadas con el autor
								</div>
							</button>
						</div>

						<div class="min-w-0">
							<button
								type="button"
								class={cardClass('trad_any')}
								data-filter="trad_any"
								aria-pressed={activeFilter === 'trad_any' ? 'true' : 'false'}
								onclick={() => {
									activeFilter = 'trad_any';
								}}
							>
								<div class="text-[clamp(1.6rem,2.8vw,2rem)] leading-none font-bold text-brand-blue">
									{data.metrics.tradAny}
								</div>
								<div class="mt-[0.45rem] text-[0.9rem] leading-[1.35] font-medium text-[#5a6c7d]">
									Obras respaldadas por la tradición
								</div>
							</button>
						</div>

						<div class="min-w-0">
							<button
								type="button"
								class={cardClass('etso_yes')}
								data-filter="etso_yes"
								aria-pressed={activeFilter === 'etso_yes' ? 'true' : 'false'}
								onclick={() => {
									activeFilter = 'etso_yes';
								}}
							>
								<div class="text-[clamp(1.6rem,2.8vw,2rem)] leading-none font-bold text-brand-blue">
									{data.metrics.etsoYes}
								</div>
								<div class="mt-[0.45rem] text-[0.9rem] leading-[1.35] font-medium text-[#5a6c7d]">
									Obras respaldadas por la estilometría
								</div>
							</button>
						</div>
					</div>

					<div class="grid grid-cols-1 gap-[0.9rem] md:grid-cols-2">
						<div class="min-w-0">
							<button
								type="button"
								class={cardClass('only_trad')}
								data-filter="only_trad"
								aria-pressed={activeFilter === 'only_trad' ? 'true' : 'false'}
								onclick={() => {
									activeFilter = 'only_trad';
								}}
							>
								<div class="text-[clamp(1.6rem,2.8vw,2rem)] leading-none font-bold text-brand-blue">
									{data.metrics.onlyTrad}
								</div>
								<div class="mt-[0.45rem] text-[0.9rem] leading-[1.35] font-medium text-[#5a6c7d]">
									Obras respaldadas solo por la tradición
								</div>
							</button>
						</div>

						<div class="min-w-0">
							<button
								type="button"
								class={cardClass('only_etso')}
								data-filter="only_etso"
								aria-pressed={activeFilter === 'only_etso' ? 'true' : 'false'}
								onclick={() => {
									activeFilter = 'only_etso';
								}}
							>
								<div class="text-[clamp(1.6rem,2.8vw,2rem)] leading-none font-bold text-brand-blue">
									{data.metrics.onlyEtso}
								</div>
								<div class="mt-[0.45rem] text-[0.9rem] leading-[1.35] font-medium text-[#5a6c7d]">
									Obras atribuidas a partir de la estilometría
								</div>
							</button>
						</div>
					</div>
				</div>

				<div class="mt-1">
					<div class="mb-4 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
						<label class="flex w-full max-w-none flex-col gap-1.5 md:max-w-[360px]">
							<span class="text-[0.9rem] leading-[1.2] font-medium text-[#30465e]">Buscar por título</span>
							<input
								type="search"
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
								bind:value={genreFilter}
							>
								<option value="">Todos los géneros</option>
								{#each genreOptions as genre}
									<option value={genre}>{genre}</option>
								{/each}
							</select>
						</label>
					</div>

					<WorksTable rows={tableRows} mode="standard" emptyMessage="" />

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
