<script lang="ts">
	import Breadcrumbs from '$lib/components/ui/Breadcrumbs.svelte';
	import CitationSuggestionCard from '$lib/components/ui/CitationSuggestionCard.svelte';
	import LegalCard from '$lib/components/ui/LegalCard.svelte';
	import PageHero from '$lib/components/ui/PageHero.svelte';
	import bicuveLogo from '$lib/assets/logos/bicuve.png';
	import byNcLogo from '$lib/assets/logos/by-nc.svg';

	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<div class="page-stack">
	<Breadcrumbs
		items={[
			{ label: 'Inicio', href: '/' },
			{ label: 'Examen de autorías', href: '/examen-autorias' },
			{ label: data.work.title, href: `/obras/${data.work.slug}` },
			{ label: 'BICUVE' }
		]}
	/>

	<PageHero compact eyebrow="Texto digital" title={data.bicuve.title} />

	<section class="bicuve-view">
		<div class="bicuve-meta">
			<p class="bicuve-label">PROCEDENCIA</p>
			<p class="bicuve-value">{data.work.origin}</p>
		</div>

		<div class="bicuve-legal-stack">
			<LegalCard label="Aviso" class="bicuve-legal-card">
				<p>
					Puede incluir errores u omisiones. Si dispones de una edición mejor, te agradecemos que
					contactes con nosotros para incorporar actualizaciones.
				</p>
			</LegalCard>

			<LegalCard label="Licencia" class="bicuve-legal-card">
				<p>
					Este contenido se ofrece bajo la licencia Creative Commons CC BY-NC 4.0. Reutilización
					permitida con cita; usos comerciales no permitidos.
				</p>
				<a
					class="cc-license-link"
					href="https://creativecommons.org/licenses/by-nc/4.0/deed.es"
					target="_blank"
					rel="noopener noreferrer"
					aria-label="Ver detalles de la licencia Creative Commons CC BY-NC 4.0"
				>
					<img src={byNcLogo} alt="Licencia Creative Commons CC BY-NC 4.0" width="110" height="39" />
				</a>
			</LegalCard>
		</div>

		<CitationSuggestionCard
			class="bicuve-citation-card"
			citation={data.citation}
		/>

		<div class="bicuve-brand">
			<img src={bicuveLogo} alt="Logo BICUVE" class="bicuve-brand__logo" />
		</div>

		<h2 class="bicuve-text-title">{data.work.title.toLocaleUpperCase('es-ES')}</h2>

		<div class="bicuve-text">{data.bicuve.text}</div>
	</section>
</div>

<style>
	.bicuve-view {
		display: grid;
		gap: var(--space-5);
	}

	.bicuve-meta {
		display: grid;
		gap: var(--space-2);
		width: 100%;
	}

	.bicuve-label {
		font-family: var(--font-ui);
		font-size: 0.8rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--color-brand-blue-dark);
	}

	.bicuve-value {
		font-size: 1rem;
		line-height: 1.6;
		color: var(--color-text-main);
	}

	.bicuve-legal-stack {
		display: grid;
		grid-template-columns: 1fr;
		gap: var(--space-3);
		width: 100%;
	}

	.bicuve-legal-stack :global(.bicuve-legal-card) {
		height: 100%;
	}

	.cc-license-link {
		display: inline-flex;
		align-items: center;
		width: fit-content;
	}

	:global(.bicuve-citation-card) {
		width: 100%;
	}

	.bicuve-brand {
		display: grid;
		place-items: center;
		padding-top: var(--space-2);
	}

	.bicuve-brand__logo {
		width: min(24rem, 78vw);
		height: auto;
	}

	.bicuve-text-title {
		margin-top: var(--space-1);
		font-family: var(--font-ui);
		font-size: 0.95rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		text-align: center;
		color: var(--color-brand-blue-dark);
	}

	.bicuve-text {
		max-width: 82ch;
		margin: 0 auto;
		padding-inline: clamp(0.5rem, 2.8vw, 2.25rem);
		font-family: var(--font-reading);
		font-size: 1rem;
		line-height: 1.8;
		white-space: pre-wrap;
		color: var(--color-text-main);
	}

	@media (min-width: 980px) {
		.bicuve-legal-stack {
			grid-template-columns: repeat(2, minmax(0, 1fr));
			align-items: stretch;
		}
	}

	@media (max-width: 768px) {
		.bicuve-view {
			gap: var(--space-4);
		}

		.bicuve-text {
			padding-inline: 0;
		}
	}
</style>
