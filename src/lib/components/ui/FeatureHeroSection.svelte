<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		eyebrow?: string;
		title: string;
		subtitle?: string;
		backgroundImage: string;
		titleTag?: 'h1' | 'h2';
		statsAriaLabel?: string;
		statsLayout?: 'balanced' | 'wide-second' | 'three';
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
		statsLayout === 'three'
			? 'grid overflow-hidden items-start gap-[1.6rem] rounded-[14px] bg-surface-soft p-[clamp(1.05rem,2.4vw,2rem)] [background-repeat:no-repeat] [background-size:min(140vw,720px)_auto] [background-position:right_bottom] md:gap-[2rem] md:[background-size:min(90vw,680px)_auto] min-[1201px]:grid-cols-[minmax(0,1fr)_minmax(0,560px)] min-[1201px]:[background-size:min(58vw,840px)_auto]'
			: statsLayout === 'wide-second'
			? 'grid overflow-hidden items-start gap-[1.6rem] rounded-[14px] bg-surface-soft p-[clamp(1.05rem,2.4vw,2rem)] [background-repeat:no-repeat] [background-size:min(140vw,720px)_auto] [background-position:right_bottom] md:gap-[2rem] md:[background-size:min(90vw,680px)_auto] min-[1280px]:grid-cols-[minmax(0,1fr)_minmax(0,620px)] min-[1280px]:[background-size:min(58vw,840px)_auto]'
			: 'grid overflow-hidden items-start gap-[1.6rem] rounded-[14px] bg-surface-soft p-[clamp(1.05rem,2.4vw,2rem)] [background-repeat:no-repeat] [background-size:min(140vw,720px)_auto] [background-position:right_bottom] md:gap-[2rem] md:[background-size:min(90vw,680px)_auto] min-[1201px]:grid-cols-[minmax(0,1.9fr)_minmax(0,420px)] min-[1201px]:[background-size:min(60vw,860px)_auto]'
	);

	const statsClass = $derived(
		statsLayout === 'three'
			? 'grid w-full max-w-[420px] grid-cols-1 content-center items-stretch gap-[1rem] self-center justify-self-center sm:max-w-[560px] sm:grid-cols-2 sm:[&>*:nth-child(3)]:col-span-2 sm:[&>*:nth-child(3)]:justify-self-center sm:[&>*:nth-child(3)]:w-full sm:[&>*:nth-child(3)]:max-w-[272px] min-[1201px]:gap-x-[1rem] min-[1201px]:gap-y-[2.75rem] min-[1201px]:justify-self-start'
		: statsLayout === 'wide-second'
			? 'grid w-full max-w-[420px] grid-cols-1 content-center items-stretch gap-[1rem] self-center justify-self-center md:max-w-[620px] md:grid-cols-[minmax(170px,0.82fr)_minmax(250px,1.18fr)] min-[1280px]:justify-self-start'
			: 'grid w-full max-w-[420px] grid-cols-1 content-center items-stretch gap-[1rem] self-center justify-self-center md:max-w-[520px] md:grid-cols-2 min-[1201px]:max-w-[420px]'
	);
</script>

<section
	class={sectionClass}
	style={`background-image: url('${backgroundImage}')`}
>
	<div class="flex min-w-0 flex-col">
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
