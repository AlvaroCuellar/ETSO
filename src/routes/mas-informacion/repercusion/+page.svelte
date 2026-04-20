<script lang="ts">
	import Breadcrumbs from '$lib/components/ui/Breadcrumbs.svelte';
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
		<p class="max-w-[72ch] leading-[1.62] text-text-main">
			Sección preparada para incorporar impacto, difusión, menciones y resultados del proyecto.
		</p>
	</section>
</div>
