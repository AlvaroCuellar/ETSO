<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		eyebrow?: string;
		title: string;
		subtitle?: string;
		backgroundImage: string;
		titleTag?: 'h1' | 'h2';
		statsAriaLabel?: string;
		statsLayout?: 'balanced' | 'wide-second';
		children?: Snippet;
		stats?: Snippet;
	}

	let {
		eyebrow,
		title,
		subtitle,
		backgroundImage,
		titleTag = 'h1',
		statsAriaLabel,
		statsLayout = 'balanced',
		children,
		stats
	}: Props = $props();

	const sectionClass = $derived(
		statsLayout === 'wide-second'
			? 'grid items-start gap-[2.1rem] rounded-[14px] bg-surface-soft p-[clamp(1.2rem,2.4vw,2rem)] [background-repeat:no-repeat] [background-size:min(130vw,720px)_auto] [background-position:right_-120px_bottom_-35px] md:[background-size:min(90vw,680px)_auto] md:[background-position:right_-80px_bottom_-58px] min-[1201px]:grid-cols-[minmax(0,1.25fr)_minmax(580px,1fr)] min-[1201px]:[background-size:min(60vw,860px)_auto] min-[1201px]:[background-position:right_-56px_bottom_-66px]'
			: 'grid items-start gap-[2.1rem] rounded-[14px] bg-surface-soft p-[clamp(1.2rem,2.4vw,2rem)] [background-repeat:no-repeat] [background-size:min(130vw,720px)_auto] [background-position:right_-120px_bottom_-35px] md:[background-size:min(90vw,680px)_auto] md:[background-position:right_-80px_bottom_-58px] min-[1201px]:grid-cols-[minmax(0,1.9fr)_minmax(320px,1fr)] min-[1201px]:[background-size:min(60vw,860px)_auto] min-[1201px]:[background-position:right_-56px_bottom_-66px]'
	);

	const statsClass = $derived(
		statsLayout === 'wide-second'
			? 'grid w-full max-w-[420px] grid-cols-1 content-center items-end gap-[1.05rem] self-center justify-self-center md:max-w-[620px] md:grid-cols-[minmax(170px,0.82fr)_minmax(250px,1.18fr)] md:justify-self-start min-[1201px]:max-w-[620px] min-[1201px]:justify-self-start'
			: 'grid w-full max-w-[420px] grid-cols-1 content-center items-end gap-[1.05rem] self-center justify-self-center md:max-w-[520px] md:grid-cols-2 md:justify-self-start min-[1201px]:max-w-[420px] min-[1201px]:justify-self-center'
	);
</script>

<section
	class={sectionClass}
	style={`background-image: url('${backgroundImage}')`}
>
	<div class="flex flex-col">
		{#if eyebrow}
			<p class="mb-0 mt-0 font-ui text-[0.8rem] font-semibold uppercase tracking-[0.05em] text-text-accent-purple">
				{eyebrow}
			</p>
		{/if}

		<svelte:element
			this={titleTag}
			class="mb-0 mt-2 font-ui text-[clamp(2rem,4.3vw,2.85rem)] leading-[1.05] font-bold text-brand-blue-dark"
		>
			{title}
		</svelte:element>

		{#if subtitle}
			<p class="mt-[1.05rem] mb-0 max-w-none font-ui text-[clamp(1.28rem,2.2vw,1.78rem)] leading-[1.22] font-semibold text-brand-blue min-[1201px]:max-w-[25ch]">
				{subtitle}
			</p>
		{/if}

		<div class="contents">
			{@render children?.()}
		</div>
	</div>

	<div
		class={statsClass}
		aria-label={statsAriaLabel}
	>
		{@render stats?.()}
	</div>
</section>
