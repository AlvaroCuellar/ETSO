<script lang="ts">
	import Breadcrumbs from '$lib/components/ui/Breadcrumbs.svelte';

	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let sectionFilter = $state('all');
	let tagFilter = $state('all');
	let query = $state('');

	const sectionOptions = $derived(
		data.impactView.sections.map((section) => ({
			id: section.id,
			label: section.year ? String(section.year) : section.title,
			count: section.items.length
		}))
	);

	const tagOptions = $derived(
		Array.from(
			new Set(
				data.impactView.sections.flatMap((section) =>
					section.items.map((item) => item.impactTag?.trim() ?? '').filter((tag) => tag.length > 0)
				)
			)
		).sort((a, b) => a.localeCompare(b))
	);

	const filteredSections = $derived.by(() => {
		const normalizedQuery = query.trim().toLowerCase();

		return data.impactView.sections
			.filter((section) => sectionFilter === 'all' || section.id === sectionFilter)
			.map((section) => {
				const items = section.items.filter((item) => {
					if (tagFilter !== 'all' && item.impactTag !== tagFilter) return false;
					if (!normalizedQuery) return true;

					const haystack = [
						item.summary,
						item.impactTag ?? '',
						...item.links.map((link) => `${link.label} ${link.href}`)
					]
						.join(' ')
						.toLowerCase();
					return haystack.includes(normalizedQuery);
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
</script>

<div class="grid gap-6">
	<Breadcrumbs
		items={[
			{ label: 'Examen de autorías', href: '/examen-autorias' },
			{ label: 'Más información', href: '/mas-informacion' },
			{ label: 'Repercusión' }
		]}
	/>

	<section class="grid gap-3">
		<h1 class="text-[clamp(1.6rem,2.7vw,2.1rem)] font-bold text-brand-blue-dark">Repercusión</h1>
		{#if data.impactView.intro}
			<p class="max-w-[90ch] leading-[1.62] text-text-main">{data.impactView.intro}</p>
		{/if}
		<p class="m-0 text-[0.92rem] font-medium text-text-soft">
			{filteredReferences} de {totalReferences} referencias visibles
		</p>
	</section>

	{#if data.impactView.sections.length === 0}
		<p class="m-0 italic text-text-soft">No hay referencias de repercusión disponibles.</p>
	{:else}
		<section class="grid gap-3 rounded-card border border-border bg-surface p-4 shadow-soft">
			<h2 class="m-0 text-[1.05rem] font-semibold text-brand-blue-dark">Filtrar referencias</h2>
			<div class="grid gap-3 md:grid-cols-3">
				<label class="grid gap-1 text-[0.86rem] text-text-soft" for="repercusion-filter-section">
					<span class="font-ui font-semibold uppercase tracking-[0.04em]">Sección</span>
					<select
						id="repercusion-filter-section"
						class="rounded-md border border-border bg-white px-3 py-2 text-[0.95rem] text-text-main"
						bind:value={sectionFilter}
					>
						<option value="all">Todas</option>
						{#each sectionOptions as option}
							<option value={option.id}>{option.label} ({option.count})</option>
						{/each}
					</select>
				</label>

				<label class="grid gap-1 text-[0.86rem] text-text-soft" for="repercusion-filter-tag">
					<span class="font-ui font-semibold uppercase tracking-[0.04em]">Tipo de impacto</span>
					<select
						id="repercusion-filter-tag"
						class="rounded-md border border-border bg-white px-3 py-2 text-[0.95rem] text-text-main"
						bind:value={tagFilter}
					>
						<option value="all">Todos</option>
						{#each tagOptions as tag}
							<option value={tag}>{tag}</option>
						{/each}
					</select>
				</label>

				<label class="grid gap-1 text-[0.86rem] text-text-soft" for="repercusion-filter-query">
					<span class="font-ui font-semibold uppercase tracking-[0.04em]">Buscar texto</span>
					<input
						id="repercusion-filter-query"
						type="search"
						placeholder="Ej: tesis, reportaje, Lope..."
						class="rounded-md border border-border bg-white px-3 py-2 text-[0.95rem] text-text-main"
						bind:value={query}
					/>
				</label>
			</div>
		</section>

		{#if filteredSections.length === 0}
			<p class="m-0 italic text-text-soft">No hay resultados con los filtros actuales.</p>
		{:else}
			{#each filteredSections as section}
				<section class="grid gap-3" aria-label={section.title}>
					<h2 class="m-0 text-[1.25rem] font-semibold leading-[1.2] text-brand-blue-dark">
						{section.title}
					</h2>
					<p class="m-0 text-[0.88rem] font-medium text-text-soft">{section.items.length} referencias</p>

					<div class="grid gap-3">
						{#each section.items as item}
							<article class="grid gap-3 rounded-card border border-border bg-surface p-4 shadow-soft">
								<p class="m-0 leading-[1.6] text-text-main">{item.summary}</p>

								{#if item.links.length > 0}
									<ul class="m-0 grid gap-1.5 pl-5 text-[0.94rem] leading-[1.5] text-text-main">
										{#each item.links as link}
											<li>
												<a href={link.href} target="_blank" rel="noopener noreferrer" class="break-words underline">
													{link.label}
												</a>
											</li>
										{/each}
									</ul>
								{/if}

								{#if item.impactTag}
									<span
										class="inline-flex w-fit rounded-md border border-[rgba(0,51,167,0.2)] bg-surface-accent px-2.5 py-1 text-[0.78rem] font-ui font-semibold text-brand-blue-dark"
									>
										{item.impactTag}
									</span>
								{/if}
							</article>
						{/each}
					</div>
				</section>
			{/each}
		{/if}
	{/if}
</div>
