<script lang="ts">
	import Breadcrumbs from '$lib/components/ui/Breadcrumbs.svelte';
	import CitationSuggestionCard from '$lib/components/ui/CitationSuggestionCard.svelte';
	import LegalCard from '$lib/components/ui/LegalCard.svelte';
	import PageHero from '$lib/components/ui/PageHero.svelte';
	import bicuveLogo from '$lib/assets/logos/bicuve.png';
	import byNcLogo from '$lib/assets/logos/by-nc.svg';
	import {
		formatDisplayWorkTitle,
		formatPrefixedDisplayWorkTitleHtml
	} from '$lib/utils/format-display-work-title';

	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	const displayWorkTitle = $derived.by(() => formatDisplayWorkTitle(data.work.title));
	const displayBicuveTitle = $derived.by(() => `Texto digital de ${displayWorkTitle}`);
	const displayBicuveTitleHtml = $derived.by(() =>
		formatPrefixedDisplayWorkTitleHtml('Texto digital de', data.work.title)
	);
</script>

<div class="grid gap-6">
	<Breadcrumbs
		items={[
			{ label: 'Inicio', href: '/' },
			{ label: 'Examen de autorías', href: '/examen-autorias' },
			{ label: displayWorkTitle, href: `/obras/${data.work.slug}` },
			{ label: 'BICUVE' }
		]}
	/>

	<PageHero compact eyebrow="Texto digital" title={displayBicuveTitle} titleHtml={displayBicuveTitleHtml} />

	<section class="grid gap-5 max-md:gap-4">
		<div class="grid w-full gap-2">
			<p class="font-ui text-[0.8rem] font-bold uppercase tracking-[0.04em] text-brand-blue-dark">PROCEDENCIA</p>
			<p class="text-base leading-[1.6] text-text-main">{data.work.origin}</p>
		</div>

		<div class="grid w-full grid-cols-1 gap-3 min-[980px]:grid-cols-2 min-[980px]:items-stretch">
			<LegalCard label="Aviso" class="h-full">
				<p>
					Puede incluir errores u omisiones. Si dispones de una edición mejor, te agradecemos que contactes
					con nosotros para incorporar actualizaciones.
				</p>
			</LegalCard>

			<LegalCard label="Licencia" class="h-full">
				<p>
					Este contenido se ofrece bajo la licencia Creative Commons CC BY-NC 4.0. Reutilización permitida
					con cita; usos comerciales no permitidos.
				</p>
				<a
					class="inline-flex w-fit items-center"
					href="https://creativecommons.org/licenses/by-nc/4.0/deed.es"
					target="_blank"
					rel="noopener noreferrer"
					aria-label="Ver detalles de la licencia Creative Commons CC BY-NC 4.0"
				>
					<img src={byNcLogo} alt="Licencia Creative Commons CC BY-NC 4.0" width="110" height="39" />
				</a>
			</LegalCard>
		</div>

		<CitationSuggestionCard class="w-full" citation={data.citation} />

		<div class="grid place-items-center pt-2">
			<img src={bicuveLogo} alt="Logo BICUVE" class="h-auto w-[min(24rem,78vw)]" />
		</div>

		<h2 class="mt-1 text-center font-ui text-[0.95rem] font-bold uppercase tracking-[0.08em] text-brand-blue-dark">
			{displayWorkTitle.toLocaleUpperCase('es-ES')}
		</h2>

		<div class="mx-auto max-w-[82ch] whitespace-pre-wrap px-0 font-reading text-base leading-[1.8] text-text-main md:px-[clamp(0.5rem,2.8vw,2.25rem)]">
			{data.bicuve.text}
		</div>
	</section>
</div>
