<script lang="ts">
	import Breadcrumbs from '$lib/components/ui/Breadcrumbs.svelte';
	import CitationSuggestionCard from '$lib/components/ui/CitationSuggestionCard.svelte';
	import LegalCard from '$lib/components/ui/LegalCard.svelte';
	import PageHero from '$lib/components/ui/PageHero.svelte';
	import heroBg from '$lib/assets/heros/obra-bg.jpg';

	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const summaryCitation =
		'Cuéllar, Álvaro. "Resúmenes asistidos por modelos de lenguaje para un vasto corpus de obras literarias del Siglo de Oro". En: <i>El teatro del Siglo de Oro en el horizonte de las humanidades digitales</i>. Peter Lang, 2026 (en prensa).';
</script>

<div class="page-stack">
	<Breadcrumbs
		items={[
			{ label: 'Inicio', href: '/' },
			{ label: 'Examen de autorías', href: '/examen-autorias' },
			{ label: data.work.title, href: `/obras/${data.work.slug}` },
			{ label: 'Resumen automático' }
		]}
	/>

	<div class="mx-auto grid max-w-[var(--max-width)] gap-6">
		<PageHero compact eyebrow="Resumen automático" title={data.work.title} backgroundImage={heroBg} />

		<section class="grid gap-3" aria-label="Aviso y cita">
			<LegalCard label="Aviso" class="w-full">
				<p>
					A continuación se ofrece un resumen automático no revisado de la obra, generado con ChatGPT
					(modelo 5.4) a partir del texto disponible. Puede incluir errores y omisiones. Si detectas
					problemas o incoherencias, te agradecemos que contactes con nosotros para incorporar
					actualizaciones.
				</p>
			</LegalCard>

			<CitationSuggestionCard class="w-full" citation={summaryCitation} allowHtml />
		</section>

		<div class="grid gap-8">
			<section class="grid gap-3">
				<h2 class="m-0 text-[1.25rem] font-semibold leading-[1.2] text-[var(--color-brand-blue-dark)]">
					Resumen automático completo
				</h2>
				{#if data.summary.resumenLargo.length > 0}
					<div class="grid gap-3">
						{#each data.summary.resumenLargo as paragraph}
							<p class="m-0 text-base leading-[1.68] text-[#2f465c]">{paragraph}</p>
						{/each}
					</div>
				{:else}
					<p class="m-0 italic text-[#546b82]">No disponible.</p>
				{/if}
			</section>

			<section class="grid gap-3">
				<h2 class="m-0 text-[1.25rem] font-semibold leading-[1.2] text-[var(--color-brand-blue-dark)]">
					Personajes principales
				</h2>
				{#if data.summary.personajes.length > 0}
					<div class="grid gap-2">
						{#each data.summary.personajes as item}
							<article class="border-b border-[rgba(0,51,167,0.14)] py-2 last:border-b-0">
								{#if item.nombre}
									<h3 class="m-0 mb-1 text-base font-semibold leading-[1.28] text-[#20354b]">
										{item.nombre}
									</h3>
								{/if}
								{#if item.descripcion}
									<p class="m-0 leading-[1.62] text-[#355069]">{item.descripcion}</p>
								{/if}
							</article>
						{/each}
					</div>
				{:else}
					<p class="m-0 italic text-[#546b82]">No disponible.</p>
				{/if}
			</section>

			<section class="grid gap-3">
				<h2 class="m-0 text-[1.25rem] font-semibold leading-[1.2] text-[var(--color-brand-blue-dark)]">
					Espacios principales
				</h2>
				{#if data.summary.espacios.length > 0}
					<div class="grid gap-2">
						{#each data.summary.espacios as item}
							<article class="border-b border-[rgba(0,51,167,0.14)] py-2 last:border-b-0">
								{#if item.nombre}
									<h3 class="m-0 mb-1 text-base font-semibold leading-[1.28] text-[#20354b]">
										{item.nombre}
									</h3>
								{/if}
								{#if item.descripcion}
									<p class="m-0 leading-[1.62] text-[#355069]">{item.descripcion}</p>
								{/if}
							</article>
						{/each}
					</div>
				{:else}
					<p class="m-0 italic text-[#546b82]">No disponible.</p>
				{/if}
			</section>

			<section class="grid gap-3">
				<h2 class="m-0 text-[1.25rem] font-semibold leading-[1.2] text-[var(--color-brand-blue-dark)]">
					Temáticas principales
				</h2>
				{#if data.summary.tematicas.length > 0}
					<div class="grid gap-2">
						{#each data.summary.tematicas as item}
							<article class="border-b border-[rgba(0,51,167,0.14)] py-2 last:border-b-0">
								{#if item.tema}
									<h3 class="m-0 mb-1 text-base font-semibold leading-[1.28] text-[#20354b]">
										{item.tema}
									</h3>
								{/if}
								{#if item.descripcion}
									<p class="m-0 leading-[1.62] text-[#355069]">{item.descripcion}</p>
								{/if}
							</article>
						{/each}
					</div>
				{:else}
					<p class="m-0 italic text-[#546b82]">No disponible.</p>
				{/if}
			</section>
		</div>
	</div>
</div>
