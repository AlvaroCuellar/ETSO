<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		variant?: 'primary' | 'secondary' | 'ghost';
		href?: string;
		type?: 'button' | 'submit' | 'reset';
		disabled?: boolean;
		className?: string;
		onclick?: (event: MouseEvent) => void;
		title?: string;
		ariaPressed?: boolean;
		children?: Snippet;
	}

	let {
		variant = 'primary',
		href = '',
		type = 'button',
		disabled = false,
		className = '',
		onclick = () => {},
		title = '',
		ariaPressed = false,
		children
	}: Props = $props();

	const classes = $derived.by(() => {
		const base =
			'inline-flex appearance-none items-center justify-center rounded-xl px-6 py-3 font-ui text-[14px] font-semibold transition no-underline focus:outline-none';
		const toneMap = {
			primary:
				'border border-transparent bg-[#0033a7] text-white hover:bg-[#002266]',
			secondary:
				'border border-[#d2d8de] bg-white text-[#34495e] hover:border-[#bac4cf] hover:bg-[#eef2f6]',
			ghost:
				'border border-[#cfd8e6] bg-white text-[#2b527f] shadow-[0_2px_8px_rgba(26,52,89,0.12)] hover:border-[#b8c7db] hover:bg-[#f1f6fd]'
		} as const;
		const tone = toneMap[variant];
		const state = disabled ? 'pointer-events-none cursor-not-allowed opacity-70' : '';
		return `${base} ${tone} ${state} ${className}`.trim();
	});
</script>

{#if href}
	<a
		href={href}
		class={classes}
		aria-disabled={disabled ? 'true' : undefined}
		title={title || undefined}
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
	<button type={type} class={classes} {disabled} {onclick} aria-pressed={ariaPressed ? 'true' : undefined} title={title || undefined}>
		{@render children?.()}
	</button>
{/if}
