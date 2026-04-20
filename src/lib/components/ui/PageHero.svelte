<script lang="ts">
	interface Props {
		eyebrow?: string;
		title: string;
		subtitle?: string;
		compact?: boolean;
		backgroundImage?: string;
	}

	let { eyebrow, title, subtitle, compact = false, backgroundImage }: Props = $props();
</script>

<section
	class="page-hero"
	class:page-hero--compact={compact}
	style={backgroundImage ? `--page-hero-image: url("${backgroundImage}")` : undefined}
>
	{#if eyebrow}
		<span class="page-hero__eyebrow">{eyebrow}</span>
	{/if}
	<h1 class="page-hero__title">{title}</h1>
	{#if subtitle}
		<p class="page-hero__subtitle">{subtitle}</p>
	{/if}
</section>
