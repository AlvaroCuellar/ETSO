<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		variant?: 'primary' | 'secondary';
		href?: string;
		type?: 'button' | 'submit' | 'reset';
		disabled?: boolean;
		className?: string;
		onclick?: (event: MouseEvent) => void;
		children?: Snippet;
	}

	let {
		variant = 'primary',
		href = '',
		type = 'button',
		disabled = false,
		className = '',
		onclick = () => {},
		children
	}: Props = $props();

	const classes = $derived.by(() => {
		const base =
			'inline-flex items-center justify-center rounded-xl border px-6 py-3 text-[14px] font-semibold transition no-underline';
		const tone =
			variant === 'primary'
				? 'border-transparent bg-[#0033a7] text-white hover:bg-[#002266] focus-visible:outline-3 focus-visible:outline-[rgba(0,51,167,0.2)] focus-visible:outline-offset-1'
				: 'border-[#d2d8de] bg-white text-[#34495e] hover:border-[#bac4cf] hover:bg-[#eef2f6] focus-visible:outline-3 focus-visible:outline-[rgba(52,73,94,0.16)] focus-visible:outline-offset-1';
		const state = disabled ? 'pointer-events-none cursor-not-allowed opacity-70' : '';
		return `${base} ${tone} ${state} ${className}`.trim();
	});
</script>

{#if href}
	<a
		href={href}
		class={classes}
		aria-disabled={disabled ? 'true' : undefined}
		onclick={(event) => {
			if (disabled) {
				event.preventDefault();
				return;
			}
			onclick(event);
		}}
	>
		{@render children?.()}
	</a>
{:else}
	<button type={type} class={classes} {disabled} {onclick}>
		{@render children?.()}
	</button>
{/if}
