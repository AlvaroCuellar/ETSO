<script lang="ts">
	import type { ComponentType, Snippet, SvelteComponent } from 'svelte';

	interface Props {
		href?: string;
		type?: 'button' | 'submit' | 'reset';
		disabled?: boolean;
		ariaLabel?: string;
		title?: string;
		class?: string;
		icon?: ComponentType<SvelteComponent>;
		iconMotion?: 'none' | 'diagonal';
		onclick?: (event: MouseEvent) => void;
		children?: Snippet;
	}

	let {
		href = '',
		type = 'button',
		disabled = false,
		ariaLabel = '',
		title = '',
		class: className = '',
		icon: Icon,
		iconMotion = 'none',
		onclick,
		children
	}: Props = $props();

	const iconClasses = $derived(
		`h-4 w-4 shrink-0 transition ${
			iconMotion === 'diagonal'
				? 'group-hover:translate-x-0.5 group-hover:-translate-y-0.5'
				: 'group-hover:text-brand-blue-dark'
		}`.trim()
	);

	const classes = $derived(
		`inline-action-button group inline-flex appearance-none items-center justify-center rounded-[999px] border-0 bg-surface font-ui text-text-soft no-underline transition-colors hover:bg-white/80 hover:text-brand-blue-dark hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-2 ${
			disabled ? 'pointer-events-none cursor-not-allowed opacity-70' : ''
		} ${className}`.trim()
	);

	const handleClick = (event: MouseEvent): void => {
		if (disabled) {
			event.preventDefault();
			return;
		}
		onclick?.(event);
	};
</script>

{#if href}
	<a
		{href}
		class={classes}
		aria-disabled={disabled ? 'true' : undefined}
		aria-label={ariaLabel || undefined}
		title={title || undefined}
		onclick={handleClick}
	>
		<span>{@render children?.()}</span>
		{#if Icon}
			<Icon class={iconClasses} aria-hidden="true" />
		{/if}
	</a>
{:else}
	<button
		{type}
		class={classes}
		{disabled}
		aria-label={ariaLabel || undefined}
		title={title || undefined}
		onclick={handleClick}
	>
		<span>{@render children?.()}</span>
		{#if Icon}
			<Icon class={iconClasses} aria-hidden="true" />
		{/if}
	</button>
{/if}

<style>
	.inline-action-button {
		gap: 0.375rem;
		min-height: 2rem;
		padding: 0.375rem 0.75rem;
		font-size: 0.82rem;
		font-weight: 500;
		line-height: 1;
		letter-spacing: 0;
		text-decoration: none;
	}

	.inline-action-button :global(span) {
		display: inline-flex;
		align-items: center;
		font: inherit;
		line-height: 1;
	}
</style>
