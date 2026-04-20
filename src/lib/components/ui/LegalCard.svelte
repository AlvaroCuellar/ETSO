<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		label: string;
		highlighted?: boolean;
		class?: string;
		children?: Snippet;
	}

	let { label, highlighted = false, class: className = '', children }: Props = $props();
</script>

<section
	class={`grid content-start gap-2 rounded-card border p-4 shadow-soft ${
		highlighted
			? 'border-[rgba(0,51,167,0.24)] bg-[linear-gradient(180deg,#f4f8ff,#eef4ff)]'
			: 'border-border bg-surface'
	} ${className}`}
>
	<p class="m-0 font-ui text-[0.8rem] font-bold uppercase tracking-[0.04em] text-brand-blue-dark">{label}</p>
	<div class="grid gap-2 text-[0.97rem] leading-[1.65] text-text-main">
		{#if children}
			{@render children()}
		{/if}
	</div>
</section>
