<script lang="ts">
	import Breadcrumbs from '$lib/components/ui/Breadcrumbs.svelte';
	import { normalizePlainText } from '$lib/search/normalize';

	import type { EditorialItem, ImpactRelationTag, ImpactReferenceType } from '$lib/domain/catalog';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let sectionFilter = $state('all');
	let typeFilter = $state('all');
	let tagFilter = $state<'all' | ImpactRelationTag>('all');
	let query = $state('');

	const typeLabels: Record<ImpactReferenceType, string> = {
		article: 'Artículo',
		book: 'Libro',
		thesis: 'Tesis',
		edition: 'Edición',
		news: 'Noticia',
		conference: 'Congreso',
		seminar: 'Seminario',
		exhibition: 'Exposición',
		award: 'Premio',
		project: 'Proyecto',
		other: 'Otra referencia'
	};

	const tagLabels: Record<ImpactRelationTag, string> = {
		colaboracion: 'Colaboración',
		mencion: 'Mención',
		cita: 'Cita',
		difusion: 'Difusión',
		resultado: 'Resultado',
		reconocimiento: 'Reconocimiento'
	};

	const tagOrder: ImpactRelationTag[] = [
		'colaboracion',
		'resultado',
		'difusion',
		'cita',
		'mencion',
		'reconocimiento'
	];

	const normalizeFilterText = (value: string): string =>
		normalizePlainText(value, false).replace(/\s+/g, ' ').trim();

	const sectionOptions = $derived(
		data.impactView.sections.map((section) => ({
			id: section.id,
			label: section.title,
			count: section.items.length
		}))
	);

	const typeOptions = $derived(
		Array.from(new Set(data.impactView.sections.flatMap((section) => section.items.map((item) => item.type))))
			.filter((type): type is ImpactReferenceType => type in typeLabels)
			.sort((a, b) => typeLabels[a].localeCompare(typeLabels[b]))
	);

	const tagOptions = $derived(
		tagOrder.filter((tag) =>
			data.impactView.sections.some((section) => section.items.some((item) => item.tags.includes(tag)))
		)
	);

	const filteredSections = $derived.by(() => {
		const normalizedQuery = normalizeFilterText(query);

		return data.impactView.sections
			.filter((section) => sectionFilter === 'all' || section.id === sectionFilter)
			.map((section) => {
				const items = section.items.filter((item) => {
					if (typeFilter !== 'all' && item.type !== typeFilter) return false;
					if (tagFilter !== 'all' && !item.tags.includes(tagFilter)) return false;
					if (!normalizedQuery) return true;

					const haystack = [
						item.title,
						item.summary,
						...item.people,
						...item.organizations,
						...item.tags.map((tag) => tagLabels[tag]),
						...item.links.map((link) => `${link.label} ${link.href}`)
					].join(' ');

					return normalizeFilterText(haystack).includes(normalizedQuery);
				});

				return {
					...section,
					items
				};
			})
			.filter((section) => section.items.length > 0);
	});

	const totalReferences = $derived(
		data.impactView.sections.reduce((acc, section) => acc + section.items.length, 0)
	);

	const filteredReferences = $derived(
		filteredSections.reduce((acc, section) => acc + section.items.length, 0)
	);

	const getPrimaryLink = (item: EditorialItem) => item.links.find((link) => link.kind === 'primary') ?? item.links[0];

	const isTitlePrimaryLink = (item: EditorialItem): boolean => {
		const primaryLink = getPrimaryLink(item);
		if (!primaryLink) return false;

		return normalizeFilterText(primaryLink.label) === normalizeFilterText(item.title);
	};

	const getVisibleLinks = (item: EditorialItem) => {
		if (item.links.length === 0) return [];
		if (item.links.length === 1 && isTitlePrimaryLink(item)) return [];
		return item.links;
	};

	const getMetaParts = (item: EditorialItem): string[] => {
		const parts: string[] = [];
		if (item.year) parts.push(String(item.year));
		if (item.type in typeLabels) parts.push(typeLabels[item.type as ImpactReferenceType]);
		if (item.people.length > 0) parts.push(item.people.join(' · '));
		else if (item.organizations.length > 0) parts.push(item.organizations.slice(0, 2).join(' · '));
		return parts;
	};
</script>

<div class="grid gap-7">
	<Breadcrumbs
		items={[
			{ label: 'Inicio', href: '/' },
			{ label: 'Repercusión' }
		]}
	/>

	<section class="grid gap-3">
		<h1 class="text-[clamp(1.7rem,2.8vw,2.2rem)] font-bold text-brand-blue-dark">Repercusión</h1>
		{#if data.impactView.intro}
			<p class="max-w-[92ch] leading-[1.68] text-text-main">{data.impactView.intro}</p>
		{/if}
		<p class="m-0 text-[0.92rem] font-medium text-text-soft">
			{filteredReferences} de {totalReferences} referencias visibles
		</p>
	</section>

	{#if data.impactView.sections.length === 0}
		<p class="m-0 italic text-text-soft">No hay referencias de repercusión disponibles.</p>
	{:else}
		<section class="grid gap-4 rounded-card border border-border bg-[rgba(255,255,255,0.8)] p-4 shadow-soft md:p-5">
			<div class="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.25fr)]">
				<label class="grid min-w-0 gap-1 text-[0.86rem] text-text-soft" for="repercusion-filter-section">
					<span class="font-ui font-semibold uppercase tracking-[0.04em]">Años</span>
					<select
						id="repercusion-filter-section"
						class="w-full min-w-0 rounded-md border border-border bg-white px-3 py-2 text-[0.95rem] text-text-main"
						bind:value={sectionFilter}
					>
						<option value="all">Todas</option>
						{#each sectionOptions as option}
							<option value={option.id}>{option.label} ({option.count})</option>
						{/each}
					</select>
				</label>

				<label class="grid min-w-0 gap-1 text-[0.86rem] text-text-soft" for="repercusion-filter-type">
					<span class="font-ui font-semibold uppercase tracking-[0.04em]">Tipo</span>
					<select
						id="repercusion-filter-type"
						class="w-full min-w-0 rounded-md border border-border bg-white px-3 py-2 text-[0.95rem] text-text-main"
						bind:value={typeFilter}
					>
						<option value="all">Todos</option>
						{#each typeOptions as type}
							<option value={type}>{typeLabels[type]}</option>
						{/each}
					</select>
				</label>

				<label class="grid min-w-0 gap-1 text-[0.86rem] text-text-soft" for="repercusion-filter-query">
					<span class="font-ui font-semibold uppercase tracking-[0.04em]">Buscar texto</span>
					<input
						id="repercusion-filter-query"
						type="search"
						placeholder="Ej: Lope, congreso, edición, Alarcón..."
						class="w-full min-w-0 rounded-md border border-border bg-white px-3 py-2 text-[0.95rem] text-text-main"
						bind:value={query}
					/>
				</label>
			</div>

			<div class="grid gap-2">
				<p class="m-0 text-[0.8rem] font-ui font-semibold uppercase tracking-[0.04em] text-text-soft">
					Relación con ETSO
				</p>
				<div class="flex flex-wrap gap-2">
					<button
						type="button"
						class={`rounded-full border px-3 py-1.5 text-[0.82rem] font-ui font-semibold transition ${
							tagFilter === 'all'
								? 'border-brand-blue bg-brand-blue text-white'
								: 'border-border bg-white text-brand-blue hover:border-brand-blue/40'
						}`}
						onclick={() => {
							tagFilter = 'all';
						}}
					>
						Todas
					</button>

					{#each tagOptions as tag}
						<button
							type="button"
							class={`rounded-full border px-3 py-1.5 text-[0.82rem] font-ui font-semibold transition ${
								tagFilter === tag
									? 'border-brand-blue bg-brand-blue text-white'
									: 'border-border bg-white text-brand-blue hover:border-brand-blue/40'
							}`}
							onclick={() => {
								tagFilter = tag;
							}}
						>
							{tagLabels[tag]}
						</button>
					{/each}
				</div>
			</div>
		</section>

		{#if filteredSections.length === 0}
			<p class="m-0 italic text-text-soft">No hay resultados con los filtros actuales.</p>
		{:else}
			<div class="grid gap-8">
				{#each filteredSections as section}
					<section class="grid gap-3" aria-label={section.title}>
						<div class="grid gap-1">
							<h2 class="m-0 text-[1.22rem] font-semibold leading-[1.2] text-brand-blue-dark">
								{section.title}
							</h2>
							{#if section.description}
								<p class="m-0 max-w-[90ch] text-[0.95rem] leading-[1.6] text-text-soft">{section.description}</p>
							{/if}
							<p class="m-0 text-[0.83rem] font-medium uppercase tracking-[0.04em] text-text-soft">
								{section.items.length} referencias
							</p>
						</div>

						<div class="bg-[rgba(255,255,255,0.4)]">
							<div class="divide-y divide-[rgba(0,51,167,0.08)]">
								{#each section.items as item}
									<article class="grid gap-3 px-4 py-4 md:grid-cols-[minmax(0,1fr)_auto] md:gap-4 md:px-5">
										<div class="grid min-w-0 gap-2">
											{#if getMetaParts(item).length > 0}
												<p class="m-0 text-[0.8rem] font-ui font-medium uppercase tracking-[0.04em] text-text-soft">
													{getMetaParts(item).join(' · ')}
												</p>
											{/if}

											<h3 class="m-0 text-[1.04rem] font-semibold leading-[1.35] text-brand-blue-dark">
												{#if isTitlePrimaryLink(item) && getPrimaryLink(item)}
													<a
														href={getPrimaryLink(item)?.href}
														target="_blank"
														rel="noopener noreferrer"
														class="text-brand-blue-dark underline decoration-[rgba(0,51,167,0.22)] underline-offset-[0.18em] transition hover:text-brand-blue hover:decoration-brand-blue"
													>
														{item.title}
													</a>
												{:else}
													{item.title}
												{/if}
											</h3>

											{#if item.summary}
												<p class="m-0 max-w-[92ch] text-[0.97rem] leading-[1.62] text-text-main">
													{item.summary}
												</p>
											{/if}

											{#if getVisibleLinks(item).length > 0}
												<div class="flex flex-wrap gap-x-4 gap-y-1 text-[0.9rem] leading-[1.5] text-text-main">
													{#each getVisibleLinks(item) as link}
														<a
															href={link.href}
															target="_blank"
															rel="noopener noreferrer"
															class="break-words text-brand-blue underline decoration-[rgba(0,51,167,0.24)] underline-offset-[0.18em] transition hover:decoration-brand-blue"
														>
															{link.label}
														</a>
													{/each}
												</div>
											{/if}
										</div>

										{#if item.tags.length > 0}
											<div class="flex flex-wrap content-start items-start gap-2 self-start md:max-w-[14rem] md:justify-end">
												{#each item.tags as tag}
													<span
														class="inline-flex w-fit items-center self-start rounded-full border border-[rgba(0,51,167,0.16)] bg-white px-2.5 py-1 text-[0.76rem] font-ui font-semibold uppercase leading-none tracking-[0.04em] text-brand-blue-dark"
													>
														{tagLabels[tag]}
													</span>
												{/each}
											</div>
										{/if}
									</article>
								{/each}
							</div>
						</div>
					</section>
				{/each}
			</div>
		{/if}
	{/if}
</div>
