<script lang="ts">
	import { onMount } from 'svelte';
	import Plus from 'lucide-svelte/icons/plus';
	import X from 'lucide-svelte/icons/x';

	interface TokenOption {
		id: string;
		label: string;
	}

	interface Props {
		label: string;
		placeholder: string;
		options: TokenOption[];
		selectedIds: string[];
		disabled?: boolean;
		helpText?: string;
		inputClass?: string;
		name?: string;
		onChange?: (nextIds: string[]) => void;
	}

	let {
		label,
		placeholder,
		options,
		selectedIds,
		disabled = false,
		helpText = '',
		inputClass = 'js-static-multiselect',
		name = '',
		onChange = () => {}
	}: Props = $props();

	let wrapperElement = $state<HTMLDivElement | null>(null);
	let query = $state('');
	let isOpen = $state(false);
	let activeIndex = $state(-1);

	const normalizeForSearch = (value: string): string =>
		value
			.normalize('NFD')
			.replace(/[\u0300-\u036f]/g, '')
			.toLowerCase()
			.trim();

	const inputId = $derived.by(() => {
		const fallback = label.toLowerCase().replace(/[^a-z0-9]+/g, '-');
		return `token-${name || fallback}`;
	});
	const helpId = $derived.by(() => `${inputId}-help`);
	const selectedSet = $derived.by(() => new Set(selectedIds));
	const optionMap = $derived.by(() => new Map(options.map((option) => [option.id, option.label] as const)));
	const normalizedQuery = $derived.by(() => normalizeForSearch(query));
	const showAddHint = $derived.by(() => selectedIds.length > 0 && query.trim() === '' && !disabled);
	const filteredOptions = $derived.by(() => {
		const baseOptions = options.filter((option) => !selectedSet.has(option.id));
		if (!normalizedQuery) return baseOptions.slice(0, 80);
		return baseOptions
			.filter((option) => normalizeForSearch(option.label).includes(normalizedQuery))
			.slice(0, 80);
	});

	$effect(() => {
		if (!disabled) return;
		isOpen = false;
		activeIndex = -1;
		query = '';
	});

	onMount(() => {
		const handleDocumentClick = (event: MouseEvent): void => {
			if (!wrapperElement) return;
			const target = event.target as Node | null;
			if (target && wrapperElement.contains(target)) return;
			closeDropdown();
		};

		document.addEventListener('click', handleDocumentClick);
		return () => {
			document.removeEventListener('click', handleDocumentClick);
		};
	});

	const emitChange = (nextIds: string[]): void => {
		onChange(nextIds);
	};

	const addOption = (option: TokenOption): void => {
		if (selectedSet.has(option.id)) return;
		emitChange([...selectedIds, option.id]);
		query = '';
		closeDropdown();
	};

	const removeOption = (optionId: string): void => {
		if (!selectedSet.has(optionId)) return;
		emitChange(selectedIds.filter((id) => id !== optionId));
	};

	const removeLastOption = (): void => {
		if (selectedIds.length === 0) return;
		removeOption(selectedIds[selectedIds.length - 1]);
	};

	const openDropdown = (): void => {
		if (disabled) return;
		isOpen = filteredOptions.length > 0;
		activeIndex = -1;
	};

	const closeDropdown = (): void => {
		isOpen = false;
		activeIndex = -1;
	};

	const handleInput = (event: Event): void => {
		query = (event.currentTarget as HTMLInputElement).value;
		isOpen = !disabled && filteredOptions.length > 0;
		activeIndex = -1;
	};

	const handleKeyDown = (event: KeyboardEvent): void => {
		if (disabled) return;

		if (event.key === 'Backspace' && query.trim() === '' && selectedIds.length > 0) {
			event.preventDefault();
			removeLastOption();
			return;
		}

		if (!isOpen && (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ')) {
			event.preventDefault();
			openDropdown();
			return;
		}

		if (!isOpen || filteredOptions.length === 0) return;

		if (event.key === 'ArrowDown') {
			event.preventDefault();
			activeIndex = (activeIndex + 1) % filteredOptions.length;
			return;
		}

		if (event.key === 'ArrowUp') {
			event.preventDefault();
			activeIndex = activeIndex <= 0 ? filteredOptions.length - 1 : activeIndex - 1;
			return;
		}

		if (event.key === 'Enter' || event.key === ' ') {
			if (activeIndex < 0 || activeIndex >= filteredOptions.length) return;
			event.preventDefault();
			addOption(filteredOptions[activeIndex]);
			return;
		}

		if (event.key === 'Escape') {
			closeDropdown();
		}
	};
</script>

<div class="field-with-help filter-group">
	<label class="field-label-with-help" for={inputId}>
		{label}
		{#if helpText}
			<span class="field-help-anchor">
				<span class="field-help-trigger" role="button" tabindex="0" aria-label={`Ayuda sobre ${label}`}>
					?
				</span>
				<span class="field-help-popover" id={helpId}>{helpText}</span>
			</span>
		{/if}
	</label>

	<div class="autocomplete-wrapper author-multiselect-wrapper" class:is-disabled={disabled} bind:this={wrapperElement}>
		<div class="author-chips">
			{#each selectedIds as selectedId}
				<span class="author-chip">
					<span class="author-chip-label">{optionMap.get(selectedId) ?? selectedId}</span>
					<button
						type="button"
						class="author-chip-remove"
						aria-label="Quitar opción"
						disabled={disabled}
						onclick={() => removeOption(selectedId)}
					>
						<X />
					</button>
				</span>
			{/each}
		</div>

		<div class="author-input-row">
			{#if showAddHint}
				<span class="author-add-hint" aria-hidden="true">
					<Plus />
				</span>
			{/if}
			<input
				id={inputId}
				type="text"
				class={inputClass}
				placeholder={selectedIds.length > 0 ? '' : placeholder}
				value={query}
				disabled={disabled}
				onfocus={openDropdown}
				onclick={openDropdown}
				oninput={handleInput}
				onkeydown={handleKeyDown}
			/>
		</div>

		{#if isOpen && filteredOptions.length > 0}
			<div class="autocomplete-dropdown">
				{#each filteredOptions as option, index}
					<button
						type="button"
						class="autocomplete-item"
						class:active={index === activeIndex}
						onmouseenter={() => {
							activeIndex = index;
						}}
						onclick={() => addOption(option)}
					>
						{option.label}
					</button>
				{/each}
			</div>
		{/if}
	</div>
</div>

<style>
	.field-with-help {
		position: relative;
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}

	.field-label-with-help {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		font-size: 14px;
		font-weight: 600;
		color: var(--color-text-soft);
	}

	.field-help-anchor {
		position: relative;
		display: inline-flex;
		align-items: center;
	}

	.field-help-trigger {
		width: 20px;
		height: 20px;
		border: 1px solid var(--color-border-accent-blue);
		border-radius: 999px;
		background: var(--color-surface-accent-blue);
		color: var(--color-brand-blue-dark);
		font-size: 12px;
		font-weight: 700;
		line-height: 1;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		cursor: help;
	}

	.field-help-popover {
		position: absolute;
		top: calc(100% + 8px);
		left: 0;
		width: min(320px, 78vw);
		padding: 8px 10px;
		border: 1px solid var(--color-border);
		border-radius: 6px;
		background: #fff;
		color: #3d4c63;
		font-size: 12px;
		line-height: 1.35;
		font-weight: 400;
		box-shadow: 0 8px 18px rgba(0, 0, 0, 0.08);
		display: none;
		z-index: 20;
	}

	.field-help-anchor:hover .field-help-popover,
	.field-help-anchor:focus-within .field-help-popover {
		display: block;
	}

	.autocomplete-wrapper {
		position: relative;
		width: 100%;
	}

	.author-multiselect-wrapper {
		border: 1px solid var(--color-border);
		border-radius: 4px;
		background: var(--color-surface);
		padding: 6px 8px;
		min-height: 44px;
	}

	.author-multiselect-wrapper.is-disabled {
		background: #f2f4f6;
		opacity: 0.8;
	}

	.author-chips {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		margin-bottom: 4px;
	}

	.author-chips:empty {
		margin-bottom: 0;
	}

	.author-chip {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		background: var(--color-surface-accent-purple);
		border: 1px solid var(--color-border-accent-purple);
		color: var(--color-text-accent-purple);
		border-radius: 999px;
		padding: 3px 8px;
		font-size: 12px;
		line-height: 1;
	}

	.author-chip-remove {
		border: 0;
		background: transparent;
		color: inherit;
		cursor: pointer;
		padding: 0;
		width: 14px;
		height: 14px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		flex: 0 0 auto;
	}

	.author-chip-remove :global(svg) {
		width: 12px;
		height: 12px;
		stroke-width: 2.2;
	}

	.author-input-row {
		display: flex;
		align-items: center;
		gap: 6px;
	}

	.author-add-hint {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 18px;
		height: 18px;
		border: 1px solid var(--color-border-accent-purple);
		border-radius: 999px;
		background: var(--color-surface-accent-purple);
		color: var(--color-text-accent-purple);
		flex: 0 0 auto;
	}

	.author-add-hint :global(svg) {
		width: 12px;
		height: 12px;
		stroke-width: 2.2;
	}

	input.js-author-multiselect,
	input.js-static-multiselect {
		border: 0;
		box-shadow: none;
		width: 100%;
		height: auto;
		padding: 4px 2px;
		font-size: 14px;
		background: transparent;
	}

	input.js-author-multiselect:focus,
	input.js-static-multiselect:focus {
		outline: none;
		box-shadow: none;
		border: 0;
	}

	.autocomplete-dropdown {
		position: absolute;
		top: calc(100% + 1px);
		left: 0;
		right: 0;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: 0 0 4px 4px;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
		max-height: 250px;
		overflow-y: auto;
		z-index: 25;
	}

	.autocomplete-item {
		display: block;
		width: 100%;
		padding: 10px 12px;
		cursor: pointer;
		border: 0;
		border-bottom: 1px solid #f0f0f0;
		font-size: 14px;
		text-align: left;
		background: var(--color-surface);
	}

	.autocomplete-item:last-child {
		border-bottom: 0;
	}

	.autocomplete-item:hover,
	.autocomplete-item.active {
		background: var(--color-surface-accent-blue);
		color: var(--color-brand-blue-dark);
	}
</style>




