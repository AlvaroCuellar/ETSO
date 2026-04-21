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
				'border border-transparent bg-brand-blue text-white hover:bg-brand-blue-dark',
			secondary:
				'border border-border-accent-blue bg-white text-text-soft hover:border-border-accent-blue hover:bg-surface-soft',
			ghost:
				'border border-border-accent-blue bg-white text-brand-blue shadow-[0_2px_8px_rgba(26,52,89,0.12)] hover:border-border-accent-blue hover:bg-surface-soft'
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
