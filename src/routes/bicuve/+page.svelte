<script lang="ts">
	import Breadcrumbs from '$lib/components/ui/Breadcrumbs.svelte';
	import FeatureHeroSection from '$lib/components/ui/FeatureHeroSection.svelte';
	import HeroStatCard from '$lib/components/ui/HeroStatCard.svelte';
	import fondoLogo from '$lib/assets/fondos/fondo-logo.png';
	import BookOpen from 'lucide-svelte/icons/book-open';
	import Feather from 'lucide-svelte/icons/feather';
</script>

<div class="grid gap-6">
	<Breadcrumbs items={[{ label: 'Inicio', href: '/' }, { label: 'BICUVE' }]} />

	<FeatureHeroSection
		eyebrow=""
		title="BICUVE"
		subtitle="Sección provisional"
		backgroundImage={fondoLogo}
		statsAriaLabel="Indicadores provisionales de BICUVE"
	>
		<p class="mt-[1.8rem] mb-0 max-w-[64ch] font-reading text-[1.01rem] leading-[1.62] text-text-main">
			Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer posuere erat a ante venenatis
			dapibus posuere velit aliquet. Curabitur blandit tempus porttitor, sed posuere consectetur est at
			lobortis. Donec id elit non mi porta gravida at eget metus.
		</p>
		<p class="mt-[1.25rem] mb-0 max-w-[64ch] font-reading text-[1.01rem] leading-[1.62] text-text-main">
			Cras mattis consectetur purus sit amet fermentum. Praesent commodo cursus magna, vel scelerisque nisl
			consectetur et. Aenean lacinia bibendum nulla sed consectetur. Vestibulum id ligula porta felis
			euismod semper.
		</p>
		<p class="mt-[1.25rem] mb-0 max-w-[64ch] font-reading text-[1.01rem] leading-[1.62] text-text-main">
			Nullam quis risus eget urna mollis ornare vel eu leo. Maecenas faucibus mollis interdum. Sed posuere
			consectetur est at lobortis. Nulla vitae elit libero, a pharetra augue. Integer posuere erat a ante
			venenatis dapibus posuere velit aliquet.
		</p>

		{#snippet stats()}
			<HeroStatCard Icon={BookOpen} value="000" label="Transcripciones" desktopOffset="up" />
			<HeroStatCard Icon={Feather} value="000" label="Dramaturgos" desktopOffset="down" />
		{/snippet}
	</FeatureHeroSection>
</div>
