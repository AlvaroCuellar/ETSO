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

<section class={`legal-card ${highlighted ? 'is-highlighted' : ''} ${className}`}>
	<p class="legal-card__label">{label}</p>
	<div class="legal-card__content">
		{#if children}
			{@render children()}
		{/if}
	</div>
</section>

<style>
	.legal-card {
		display: grid;
		gap: var(--space-2);
		align-content: start;
		padding: var(--space-4);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		background: var(--color-surface);
		box-shadow: var(--shadow-soft);
	}

	.legal-card.is-highlighted {
		border-color: rgba(0, 51, 167, 0.24);
		background: linear-gradient(180deg, #f4f8ff, #eef4ff);
	}

	.legal-card__label {
		margin: 0;
		font-family: var(--font-ui);
		font-size: 0.8rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--color-brand-blue-dark);
	}

	.legal-card__content {
		display: grid;
		gap: var(--space-2);
	}

	.legal-card__content :global(p) {
		margin: 0;
		font-size: 0.97rem;
		line-height: 1.65;
		color: var(--color-text-main);
	}
</style>
