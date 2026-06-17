<script lang="ts">
	import Breadcrumbs from '$lib/components/ui/Breadcrumbs.svelte';
	import SeoHead from '$lib/components/seo/SeoHead.svelte';

	const MAS_INFORMACION_SEO_DESCRIPTION =
		'Acceso a información complementaria sobre la API, transcripciones automáticas, equipo y contacto de ETSO.';
</script>

<SeoHead title="Más información" description={MAS_INFORMACION_SEO_DESCRIPTION} path="/mas-informacion" />

<div class="grid gap-6">
	<Breadcrumbs items={[{ label: 'Inicio', href: '/' }, { label: 'Más información' }]} />

	<section class="grid gap-3">
		<h1 class="text-[clamp(1.7rem,2.9vw,2.25rem)] font-bold text-brand-blue-dark">Más información</h1>
		<p class="max-w-[72ch] leading-[1.62] text-text-main">Selecciona una sección:</p>
		<ul class="grid gap-2 font-ui">
			<li><a class="font-medium hover:underline" href="/api">API</a></li>
			<li><a class="font-medium hover:underline" href="/transcripciones-automaticas">Transcripciones automáticas</a></li>
			<li><a class="font-medium hover:underline" href="/equipo">Equipo</a></li>
			<li><a class="font-medium hover:underline" href="/contacto">Contacto</a></li>
		</ul>
	</section>
</div>
