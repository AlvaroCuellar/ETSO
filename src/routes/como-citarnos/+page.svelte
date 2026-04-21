<script lang="ts">
	import Breadcrumbs from '$lib/components/ui/Breadcrumbs.svelte';

	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<div class="grid gap-6">
	<Breadcrumbs items={[{ label: 'Inicio', href: '/' }, { label: 'Cómo citarnos' }]} />

	<section class="grid gap-3">
		<h1 class="m-0 text-[clamp(1.85rem,3vw,2.4rem)] font-bold leading-[1.12] text-brand-blue-dark">Cómo citarnos</h1>

		{#if data.bibliography.intro}
			<p class="m-0 leading-[1.65] text-text-main">{data.bibliography.intro}</p>
		{/if}

		{#if data.bibliography.sections.length === 0}
			<p class="m-0 italic text-text-soft">No hay referencias disponibles.</p>
		{:else}
			<div class="grid gap-4">
				{#each data.bibliography.sections as section}
					<section class="grid gap-2" aria-label={section.title}>
						<h2 class="m-0 text-[1.25rem] font-semibold leading-[1.2] text-brand-blue-dark">{section.title}</h2>
						{#if section.lead}
							<p class="m-0 text-[0.96rem] leading-[1.55] text-text-soft">{section.lead}</p>
						{/if}
						<ol class="m-0 grid gap-1.5 pl-5">
							{#each section.entries as entry}
								<li>
									<p class="m-0 leading-[1.6] text-text-main">
										{#each entry.parts as part}
											{#if part.kind === 'link'}
												<a
													href={part.href ?? part.value}
													target="_blank"
													rel="noopener noreferrer"
													class="break-words underline"
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
						</ol>
					</section>
				{/each}
			</div>
		{/if}
	</section>
</div>
