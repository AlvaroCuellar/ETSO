<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		id?: string;
		label?: string;
		highlighted?: boolean;
		class?: string;
		bodyClass?: string;
		action?: Snippet;
		children?: Snippet;
	}

	let {
		id = '',
		label = '',
		highlighted = false,
		class: className = '',
		bodyClass = '',
		action,
		children
	}: Props = $props();
</script>

<section
	id={id || undefined}
	class={`grid content-start gap-3 rounded-[10px] px-4 py-4 md:px-5 md:py-5 ${
		highlighted ? 'bg-surface-accent-blue' : 'bg-surface-soft'
	} ${className}`}
>
	{#if label || action}
		<div class="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
			{#if label}
				<p class="m-0 font-ui text-[0.8rem] font-bold uppercase tracking-[0.04em] text-text-accent-purple">
					{label}
				</p>
			{/if}
			{#if action}
				<div class="flex shrink-0 items-center justify-end">
					{@render action()}
				</div>
			{/if}
		</div>
	{/if}

	<div class={`info-card-body grid gap-2 font-reading text-[0.97rem] leading-[1.65] text-text-main ${bodyClass}`}>
		{#if children}
			{@render children()}
		{/if}
	</div>
</section>

<style>
	.info-card-body :global(> :first-child) {
		margin-top: 0;
	}

	.info-card-body :global(> :last-child) {
		margin-bottom: 0;
	}
</style>
