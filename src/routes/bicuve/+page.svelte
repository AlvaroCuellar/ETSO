<script lang="ts">
	import Breadcrumbs from '$lib/components/ui/Breadcrumbs.svelte';
</script>

<div class="grid gap-6">
	<Breadcrumbs items={[{ label: 'Examen de autorías', href: '/examen-autorias' }, { label: 'BICUVE' }]} />

	<section class="grid gap-3">
		<h1 class="text-[clamp(1.7rem,2.9vw,2.25rem)] font-bold text-brand-blue-dark">BICUVE</h1>
		<p class="max-w-[72ch] leading-[1.62] text-text-main">
			Página índice de BICUVE preparada. Cuando me pases los contenidos, dejamos esta sección cerrada con el diseño
			final.
		</p>
	</section>
</div>
