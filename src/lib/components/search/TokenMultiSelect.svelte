<script lang="ts">
	import { onMount } from 'svelte';
	import Plus from 'lucide-svelte/icons/plus';
	import X from 'lucide-svelte/icons/x';

	interface TokenOption {
		id: string;
		label: string;
		searchText?: string;
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
		onIntent?: () => void;
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
		onChange = () => {},
		onIntent = () => {}
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
			.filter((option) => normalizeForSearch(option.searchText ?? option.label).includes(normalizedQuery))
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
		isOpen = true;
		activeIndex = -1;
	};

	const closeDropdown = (): void => {
		isOpen = false;
		activeIndex = -1;
	};

	const signalIntent = (): void => {
		if (disabled) return;
		onIntent();
	};

	const focusInput = (): void => {
		if (disabled) return;
		signalIntent();
		openDropdown();
		const input = wrapperElement?.querySelector('input');
		if (input) input.focus();
	};

	const handleInput = (event: Event): void => {
		signalIntent();
		query = (event.currentTarget as HTMLInputElement).value;
		isOpen = !disabled;
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
			signalIntent();
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

	<div 
		class="autocomplete-wrapper author-multiselect-wrapper" 
		class:is-disabled={disabled} 
		bind:this={wrapperElement}
		onclick={focusInput}
		onkeydown={(e) => {
			if (e.key === 'Enter') focusInput();
		}}
		role="button"
		tabindex="0"
	>
		<div class="author-chips">
			{#each selectedIds as selectedId}
				<span class="author-chip">
					<span class="author-chip-label">{optionMap.get(selectedId) ?? selectedId}</span>
					<button
						type="button"
						class="author-chip-remove"
						aria-label="Quitar opción"
						disabled={disabled}
						onclick={(e) => {
							e.stopPropagation();
							removeOption(selectedId);
						}}
					>
						<X />
					</button>
				</span>
			{/each}
			
			{#if showAddHint}
				<button 
					type="button" 
					class="author-add-hint" 
					aria-label="Añadir opción"
					disabled={disabled}
					onclick={(e) => {
						e.stopPropagation();
						focusInput();
					}}
				>
					<Plus />
				</button>
			{/if}
			<input
				id={inputId}
				type="text"
				class={inputClass}
				placeholder={selectedIds.length > 0 ? '' : placeholder}
				value={query}
				disabled={disabled}
				onfocus={() => {
					signalIntent();
					openDropdown();
				}}
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
		font-family: 'Roboto', sans-serif;
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
		border-radius: 10px;
		background: #ffffff;
		padding: 6px 12px;
		min-height: 42px;
		transition: border-color 0.2s cubic-bezier(0.4, 0, 0.2, 1);
	}

	.author-multiselect-wrapper:focus-within {
		border-color: rgba(13, 63, 145, 0.35); /* focus:border-brand-blue/35 */
	}

	.author-multiselect-wrapper.is-disabled {
		background: #f2f4f6;
		opacity: 0.8;
	}

	.author-chips {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 6px;
	}

	.author-chip {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		background: var(--color-surface-accent-purple);
		border: 0;
		color: var(--color-text-accent-purple);
		border-radius: 999px;
		padding: 4px 10px;
		font-size: 13px;
		font-weight: 500;
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
		width: 14px;
		height: 14px;
		stroke-width: 2.2;
		transition: opacity 0.2s;
	}

	.author-chip-remove:hover :global(svg) {
		opacity: 0.7;
	}

	.author-add-hint {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 20px;
		height: 20px;
		border: 0;
		border-radius: 999px;
		background: var(--color-surface-accent-purple);
		color: var(--color-text-accent-purple);
		flex: 0 0 auto;
		cursor: pointer;
		padding: 0;
		transition: opacity 0.2s;
	}

	.author-add-hint:hover {
		opacity: 0.8;
	}

	.author-add-hint :global(svg) {
		width: 14px;
		height: 14px;
		stroke-width: 2.2;
	}

	input.js-author-multiselect,
	input.js-static-multiselect {
		border: 0;
		box-shadow: none;
		min-width: 60px;
		flex: 1 1 0%;
		height: auto;
		padding: 4px 2px;
		font-size: 15px;
		color: var(--color-text-main);
		background: transparent;
	}

	input.js-author-multiselect::placeholder,
	input.js-static-multiselect::placeholder {
		font-size: 15px;
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




