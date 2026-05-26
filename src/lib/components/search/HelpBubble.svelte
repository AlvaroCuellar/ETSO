<script lang="ts">
	interface Props {
		id: string;
		label: string;
		text: string;
	}

	let { id, label, text }: Props = $props();
	let isOpen = $state(false);

	const handlePointerDown = (event: PointerEvent): void => {
		event.preventDefault();
		event.stopPropagation();
	};

	const toggleHelp = (event: MouseEvent): void => {
		event.preventDefault();
		event.stopPropagation();
		isOpen = !isOpen;
	};

	const closeHelp = (): void => {
		isOpen = false;
	};

	const handleKeydown = (event: KeyboardEvent): void => {
		if (event.key === 'Escape' && isOpen) {
			event.stopPropagation();
			closeHelp();
		}
	};
</script>

<svelte:window onclick={closeHelp} onkeydown={handleKeydown} />

<span class="help-anchor" class:is-open={isOpen}>
	<button
		type="button"
		class="help-trigger"
		aria-label={`Ayuda sobre ${label}`}
		aria-describedby={id}
		aria-expanded={isOpen}
		onpointerdown={handlePointerDown}
		onclick={toggleHelp}
	>
		?
	</button>
	<span class="help-popover" id={id} role="tooltip">{text}</span>
</span>

<style>
	.help-anchor {
		position: relative;
		display: inline-flex;
		align-items: center;
	}

	.help-trigger {
		display: inline-flex;
		width: 20px;
		height: 20px;
		align-items: center;
		justify-content: center;
		padding: 0;
		border: 1px solid var(--color-border-accent-blue);
		border-radius: 999px;
		background: var(--color-surface-accent-blue);
		color: var(--color-brand-blue-dark);
		font-size: 12px;
		font-weight: 700;
		line-height: 1;
		cursor: help;
		appearance: none;
	}

	.help-trigger:focus-visible {
		outline: 2px solid color-mix(in srgb, var(--color-brand-blue) 35%, transparent);
		outline-offset: 2px;
	}

	.help-popover {
		position: absolute;
		top: calc(100% + 8px);
		left: 0;
		z-index: 20;
		display: none;
		width: min(320px, calc(100vw - 2rem));
		max-width: calc(100vw - 2rem);
		padding: 8px 10px;
		border: 1px solid var(--color-border);
		border-radius: 6px;
		background: #fff;
		color: var(--color-text-soft);
		font-size: 12px;
		font-weight: 400;
		line-height: 1.35;
		box-shadow: 0 8px 18px rgba(0, 0, 0, 0.08);
	}

	.help-anchor:hover .help-popover,
	.help-anchor:focus-within .help-popover,
	.help-anchor.is-open .help-popover {
		display: block;
	}

	@media (max-width: 767.98px) {
		.help-anchor {
			position: static;
		}

		.help-popover {
			left: 0;
			right: 0;
			width: auto;
			max-width: none;
		}
	}
</style>
