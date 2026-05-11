<script lang="ts">
	import Breadcrumbs from '$lib/components/ui/Breadcrumbs.svelte';
</script>

<div class="grid gap-6">
	<Breadcrumbs items={[{ label: 'Inicio', href: '/' }, { label: 'Más información' }]} />

	<section class="grid gap-3">
		<h1 class="text-[clamp(1.7rem,2.9vw,2.25rem)] font-bold text-brand-blue-dark">Más información</h1>
		<p class="max-w-[72ch] leading-[1.62] text-text-main">Selecciona una sección:</p>
		<ul class="grid gap-2 font-ui">
			<li><a class="font-medium hover:underline" href="/transcripciones-automaticas">Transcripciones automáticas</a></li>
			<li><a class="font-medium hover:underline" href="/colaboradores">Colaboradores</a></li>
			<li><a class="font-medium hover:underline" href="/repercusion">Repercusión</a></li>
			<li><a class="font-medium hover:underline" href="/contacto">Contacto</a></li>
		</ul>
	</section>
</div>
