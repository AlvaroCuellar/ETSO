<script lang="ts">
	import Breadcrumbs from '$lib/components/ui/Breadcrumbs.svelte';

	import type { EditorialItem, EditorialSection } from '$lib/domain/catalog';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const hasAnyData = (sections: EditorialSection[]): boolean =>
		sections.some((section) => section.items.length > 0);

	const sectionHasItems = (section: EditorialSection): boolean => section.items.length > 0;

	const itemMeta = (item: EditorialItem): string =>
		item.organizations.length > 0 ? item.organizations.join(' | ') : '';
</script>

<div class="grid gap-7">
	<Breadcrumbs
		items={[
			{ label: 'Inicio', href: '/' },
			{ label: 'Colaboradores' }
		]}
	/>

	<section class="grid gap-3">
		<h1 class="text-[clamp(1.6rem,2.7vw,2.1rem)] font-bold text-brand-blue-dark">Colaboradores</h1>
		{#if data.collaboratorsView.intro}
			<p class="leading-[1.66] text-text-main">{data.collaboratorsView.intro}</p>
		{/if}
	</section>

	{#if !hasAnyData(data.collaboratorsView.sections)}
		<p class="m-0 italic text-text-soft">No hay datos de colaboradores disponibles.</p>
	{:else}
		<div class="grid gap-8">
			{#each data.collaboratorsView.sections as section}
				{#if sectionHasItems(section)}
					<section class="grid gap-3" aria-label={section.title}>
						<div class="grid gap-1">
							<h2 class="m-0 text-[1.24rem] font-semibold leading-[1.2] text-brand-blue-dark">{section.title}</h2>
							{#if section.description}
								<p class="m-0 max-w-[88ch] text-[0.96rem] leading-[1.62] text-text-soft">{section.description}</p>
							{/if}
						</div>

						{#if section.presentation === 'featured_cards'}
							<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
								{#each section.items as item}
									<article class="overflow-hidden rounded-card border border-border bg-surface shadow-soft md:mx-auto md:w-full md:max-w-[24rem]">
										{#if item.image}
											<img src={item.image} alt={`Imagen de ${item.title}`} class="block h-auto w-full" loading="lazy" />
										{/if}
										<div class="grid gap-2 p-4">
											<h3 class="m-0 font-ui text-[1rem] font-semibold leading-[1.3] text-brand-blue-dark">{item.title}</h3>

											{#if itemMeta(item)}
												<p class="m-0 text-[0.92rem] leading-[1.55] text-text-soft">{itemMeta(item)}</p>
											{/if}

											{#if item.summary}
												<p class="m-0 text-[0.96rem] leading-[1.62] text-text-main">{item.summary}</p>
											{/if}
										</div>
									</article>
								{/each}
							</div>
						{:else if section.presentation === 'media_cards'}
							<div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
								{#each section.items as item}
									<article class="overflow-hidden rounded-card border border-border bg-surface shadow-soft">
										{#if item.image}
											<div class="flex h-[14rem] items-center justify-center overflow-hidden border-b border-border-accent-blue bg-surface-accent-blue">
												<img
													src={item.image}
													alt={`Imagen de ${item.title}`}
													class="h-full w-full object-cover"
													loading="lazy"
												/>
											</div>
										{/if}
										<div class="grid gap-2 p-4">
											<h3 class="m-0 font-ui text-[1rem] font-semibold leading-[1.3] text-brand-blue-dark">{item.title}</h3>

											{#if item.summary}
												<p class="m-0 text-[0.95rem] leading-[1.6] text-text-main">{item.summary}</p>
											{/if}
										</div>
									</article>
								{/each}
							</div>
						{:else if section.presentation === 'compact_list'}
							{#if section.id === 'collaborators'}
								<div class="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
									{#each section.items as item}
										<article class="grid gap-1.5 rounded-card bg-surface-soft px-4 py-3">
											{#if itemMeta(item)}
												<p class="m-0 text-[0.95rem] leading-[1.5] text-text-main">
													<span class="block font-semibold text-brand-blue-dark">{item.title}</span>
													<span class="block text-text-soft">{itemMeta(item)}</span>
												</p>
											{:else}
												<h3 class="m-0 text-[0.98rem] font-semibold leading-[1.35] text-brand-blue-dark">{item.title}</h3>
											{/if}
											{#if item.summary}
												<p class="m-0 text-[0.95rem] leading-[1.58] text-text-main">{item.summary}</p>
											{/if}
										</article>
									{/each}
								</div>
							{:else}
								<div class="overflow-hidden rounded-card bg-surface-soft">
									<div class="divide-y divide-border-accent-blue">
										{#each section.items as item}
											<article class="grid gap-1.5 px-4 py-3 md:px-5">
												<h3 class="m-0 text-[0.98rem] font-semibold leading-[1.35] text-brand-blue-dark">{item.title}</h3>
												{#if itemMeta(item)}
													<p class="m-0 text-[0.9rem] leading-[1.5] text-text-soft">{itemMeta(item)}</p>
												{/if}
												{#if item.summary}
													<p class="m-0 text-[0.95rem] leading-[1.58] text-text-main">{item.summary}</p>
												{/if}
											</article>
										{/each}
									</div>
								</div>
							{/if}
						{:else if section.presentation === 'multi_column_list'}
							<div class="rounded-card bg-surface-soft p-4">
								<ul class="m-0 columns-1 gap-5 space-y-1.5 pl-5 text-[0.95rem] leading-[1.5] text-text-main sm:columns-2 lg:columns-3 xl:columns-4">
									{#each section.items as item}
										<li class="break-inside-avoid">{item.title}</li>
									{/each}
								</ul>
							</div>
						{:else if section.presentation === 'callout'}
							{#each section.items as item}
								<article class="grid gap-4 rounded-card border border-border-accent-purple bg-surface-accent-blue p-4 shadow-soft md:grid-cols-[minmax(0,1fr)_15rem] md:items-center">
									<div class="grid gap-3">
										<p class="m-0 font-ui text-[0.76rem] font-semibold uppercase tracking-[0.05em] text-text-accent-purple">
											Agradecimiento
										</p>
										<h3 class="m-0 text-[1rem] font-semibold leading-[1.3] text-brand-blue-dark">{item.title}</h3>
										{#if item.summary}
											<p class="m-0 leading-[1.62] text-text-main">{item.summary}</p>
										{/if}
										{#if item.organizations.length > 0}
											<ul class="m-0 grid gap-1.5 pl-5 text-[0.95rem] leading-[1.6] text-text-main">
												{#each item.organizations as organization}
													<li>{organization}</li>
												{/each}
											</ul>
										{/if}
									</div>

									{#if item.image}
										<div class="flex h-[10rem] items-center justify-center overflow-hidden">
											<img
												src={item.image}
												alt={`Imagen de ${item.title}`}
												class="h-full w-full object-cover"
												loading="lazy"
											/>
										</div>
									{/if}
								</article>
							{/each}
						{/if}
					</section>
				{/if}
			{/each}
		</div>
	{/if}
</div>
