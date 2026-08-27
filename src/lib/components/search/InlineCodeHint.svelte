<script lang="ts">
	interface Props {
		id: string;
		symbol: string;
		label: string;
		text: string;
	}

	let { id, symbol, label, text }: Props = $props();
	let isOpen = $state(false);

	const toggleHint = (event: MouseEvent): void => {
		event.preventDefault();
		event.stopPropagation();
		isOpen = !isOpen;
	};

	const closeHint = (): void => {
		isOpen = false;
	};

	const handleKeydown = (event: KeyboardEvent): void => {
		if (event.key === 'Escape' && isOpen) {
			event.stopPropagation();
			closeHint();
		}
	};
</script>

<svelte:window onclick={closeHint} onkeydown={handleKeydown} />

<span class="hint-anchor" class:is-open={isOpen}>
	<button
		type="button"
		class="hint-trigger"
		aria-label={label}
		aria-describedby={id}
		aria-expanded={isOpen}
		onclick={toggleHint}
	>
		<code>{symbol}</code>
	</button>
	<span class="hint-popover" id={id} role="tooltip">{text}</span>
</span>

<style>
	.hint-anchor {
		position: relative;
		display: inline-flex;
		vertical-align: baseline;
	}

	.hint-trigger {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 1.45rem;
		padding: 0.05rem 0.3rem;
		border: 1px solid var(--color-border-accent-blue);
		border-radius: 5px;
		background: var(--color-surface-accent-blue);
		color: var(--color-brand-blue-dark);
		font: inherit;
		line-height: 1.2;
		cursor: help;
		appearance: none;
	}

	.hint-trigger code {
		font-size: 0.92em;
		font-weight: 700;
	}

	.hint-trigger:focus-visible {
		outline: 2px solid color-mix(in srgb, var(--color-brand-blue) 35%, transparent);
		outline-offset: 2px;
	}

	.hint-popover {
		position: absolute;
		bottom: calc(100% + 8px);
		inset-inline-start: 0;
		z-index: 30;
		display: none;
		width: max-content;
		max-width: min(290px, calc(100vw - 2rem));
		padding: 8px 10px;
		border: 1px solid var(--color-border);
		border-radius: 6px;
		background: #fff;
		color: var(--color-text-soft);
		font-family: 'Roboto', sans-serif;
		font-size: 12px;
		font-weight: 400;
		line-height: 1.4;
		text-align: left;
		white-space: normal;
		box-shadow: 0 8px 18px rgba(0, 0, 0, 0.1);
	}

	.hint-anchor:hover .hint-popover,
	.hint-anchor:focus-within .hint-popover,
	.hint-anchor.is-open .hint-popover {
		display: block;
	}
</style>
