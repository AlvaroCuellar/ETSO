<script lang="ts">
	import { onMount } from 'svelte';
	import Breadcrumbs from '$lib/components/ui/Breadcrumbs.svelte';
	import CitationSuggestionCard from '$lib/components/ui/CitationSuggestionCard.svelte';
	import LegalCard from '$lib/components/ui/LegalCard.svelte';
	import PageHero from '$lib/components/ui/PageHero.svelte';
	import heroBg from '$lib/assets/heros/obra-bg.jpg';
	import { formatDisplayWorkTitle } from '$lib/utils/format-display-work-title';

	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	const displayWorkTitle = $derived.by(() => formatDisplayWorkTitle(data.work.title));
	let summary = $state({
		resumenLargo: [] as string[],
		personajes: [] as Array<{ nombre: string; descripcion: string }>,
		espacios: [] as Array<{ nombre: string; descripcion: string }>,
		tematicas: [] as Array<{ tema: string; descripcion: string }>
	});
	let summaryLoading = $state(true);
	let summaryError = $state('');

	const summaryCitation =
		'Cuéllar, Álvaro. "Resúmenes asistidos por modelos de lenguaje para un vasto corpus de obras literarias del Siglo de Oro". En: <i>El teatro del Siglo de Oro en el horizonte de las humanidades digitales</i>. Peter Lang, 2026 (en prensa).';

	const normalizeNamedItems = (rows: unknown): Array<{ nombre: string; descripcion: string }> =>
		Array.isArray(rows)
			? rows
					.map((row) => ({
						nombre:
							row && typeof row === 'object' && typeof (row as { nombre?: unknown }).nombre === 'string'
								? (row as { nombre: string }).nombre.trim()
								: '',
						descripcion:
							row &&
							typeof row === 'object' &&
							typeof (row as { descripcion?: unknown }).descripcion === 'string'
								? (row as { descripcion: string }).descripcion.trim()
								: ''
					}))
					.filter((row) => row.nombre || row.descripcion)
			: [];

	const normalizeThemeItems = (rows: unknown): Array<{ tema: string; descripcion: string }> =>
		Array.isArray(rows)
			? rows
					.map((row) => ({
						tema:
							row && typeof row === 'object' && typeof (row as { tema?: unknown }).tema === 'string'
								? (row as { tema: string }).tema.trim()
								: '',
						descripcion:
							row &&
							typeof row === 'object' &&
							typeof (row as { descripcion?: unknown }).descripcion === 'string'
								? (row as { descripcion: string }).descripcion.trim()
								: ''
					}))
					.filter((row) => row.tema || row.descripcion)
			: [];

	onMount(() => {
		void (async () => {
			try {
				const response = await fetch(data.summaryUrl);
				if (!response.ok) {
					throw new Error(`No se pudo cargar el resumen desde R2: ${response.status}`);
				}
				const parsed = (await response.json()) as Record<string, unknown>;
				summary = {
					resumenLargo: Array.isArray(parsed.resumen_largo)
						? parsed.resumen_largo
								.map((paragraph) => (typeof paragraph === 'string' ? paragraph.trim() : ''))
								.filter(Boolean)
						: [],
					personajes: normalizeNamedItems(parsed.personajes_principales),
					espacios: normalizeNamedItems(parsed.espacios_principales),
					tematicas: normalizeThemeItems(parsed.tematicas_principales)
				};
			} catch (cause) {
				summaryError = cause instanceof Error ? cause.message : 'No se pudo cargar el resumen desde R2';
			} finally {
				summaryLoading = false;
			}
		})();
	});
</script>

<div class="grid gap-6">
	<Breadcrumbs
		items={[
			{ label: 'Inicio', href: '/' },
			{ label: 'Examen de autorías', href: '/examen-autorias' },
			{ label: displayWorkTitle, href: `/obras/${data.work.slug}` },
			{ label: 'Resumen automático' }
		]}
	/>

	<div class="mx-auto grid w-full max-w-[1280px] gap-6">
		<PageHero compact eyebrow="Resumen automático" title={displayWorkTitle} backgroundImage={heroBg} />

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
				<h2 class="m-0 text-[1.25rem] font-semibold leading-[1.2] text-brand-blue-dark">Resumen automático completo</h2>
				{#if summaryLoading}
					<p class="m-0 italic text-[#546b82]">Cargando resumen...</p>
				{:else if summaryError}
					<p class="m-0 rounded-[9px] border border-[#f3c0ca] bg-[#fff5f7] px-3 py-2 text-[#8f1e36]">{summaryError}</p>
				{:else if summary.resumenLargo.length > 0}
					<div class="grid gap-3">
						{#each summary.resumenLargo as paragraph}
							<p class="m-0 text-base leading-[1.68] text-[#2f465c]">{paragraph}</p>
						{/each}
					</div>
				{:else}
					<p class="m-0 italic text-[#546b82]">No disponible.</p>
				{/if}
			</section>

			<section class="grid gap-3">
				<h2 class="m-0 text-[1.25rem] font-semibold leading-[1.2] text-brand-blue-dark">Personajes principales</h2>
				{#if summary.personajes.length > 0}
					<div class="grid gap-2">
						{#each summary.personajes as item}
							<article class="border-b border-[rgba(0,51,167,0.14)] py-2 last:border-b-0">
								{#if item.nombre}
									<h3 class="m-0 mb-1 text-base font-semibold leading-[1.28] text-[#20354b]">{item.nombre}</h3>
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
				<h2 class="m-0 text-[1.25rem] font-semibold leading-[1.2] text-brand-blue-dark">Espacios principales</h2>
				{#if summary.espacios.length > 0}
					<div class="grid gap-2">
						{#each summary.espacios as item}
							<article class="border-b border-[rgba(0,51,167,0.14)] py-2 last:border-b-0">
								{#if item.nombre}
									<h3 class="m-0 mb-1 text-base font-semibold leading-[1.28] text-[#20354b]">{item.nombre}</h3>
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
				<h2 class="m-0 text-[1.25rem] font-semibold leading-[1.2] text-brand-blue-dark">Temáticas principales</h2>
				{#if summary.tematicas.length > 0}
					<div class="grid gap-2">
						{#each summary.tematicas as item}
							<article class="border-b border-[rgba(0,51,167,0.14)] py-2 last:border-b-0">
								{#if item.tema}
									<h3 class="m-0 mb-1 text-base font-semibold leading-[1.28] text-[#20354b]">{item.tema}</h3>
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
