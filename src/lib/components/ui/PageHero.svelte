<script lang="ts">
	interface Props {
		eyebrow?: string;
		title: string;
		titleHtml?: string;
		subtitle?: string;
		compact?: boolean;
		backgroundImage?: string;
	}

	let { eyebrow, title, titleHtml, subtitle, compact = false, backgroundImage }: Props = $props();

	const heroStyle = $derived.by(() => {
		if (backgroundImage) {
			return `background-image: linear-gradient(rgba(0, 38, 129, 0.84), rgba(0, 38, 129, 0.84)), url("${backgroundImage}")`;
		}
		return '';
	});
</script>

<section
	class={`relative overflow-hidden rounded-card bg-brand-blue-dark bg-cover bg-center bg-no-repeat text-white shadow-strong ${compact ? 'p-8' : 'p-10'}`}
	style={heroStyle}
>
	{#if eyebrow}
		<span class="inline-flex rounded-card bg-surface-accent-purple px-3 py-1 font-ui text-[0.75rem] font-semibold uppercase tracking-[0.03em] text-text-accent-purple">
			{eyebrow}
		</span>
	{/if}
	<h1 class="mt-3 font-ui text-[clamp(1.55rem,2.7vw,2.5rem)] leading-[1.2] font-bold text-white">
		{#if titleHtml}
			{@html titleHtml}
		{:else}
			{title}
		{/if}
	</h1>
	{#if subtitle}
		<p class="mt-3 max-w-[68ch] font-reading text-[1.02rem] text-white/90">{subtitle}</p>
	{/if}
</section>
