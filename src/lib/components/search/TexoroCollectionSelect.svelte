<script lang="ts">
	import { tick } from 'svelte';
	import Check from 'lucide-svelte/icons/check';
	import ChevronDown from 'lucide-svelte/icons/chevron-down';
	import { translateText, type Locale } from '$lib/i18n';
	import { TEXORO_COLLECTIONS } from '$lib/search/collections';
	import HelpBubble from './HelpBubble.svelte';

	let { locale, value = $bindable('') }: { locale: Locale; value: string } = $props();

	const id = 'texoro-main-collection';
	const listId = `${id}-options`;
	const options = [{ id: '', label: 'Cualquiera', description: '' }, ...TEXORO_COLLECTIONS];
	const t = (text: string) => translateText(locale, text);
	const help = $derived(t('Limita la búsqueda a los textos de la colección seleccionada. Puedes combinarla con los demás filtros.'));
	const selectedIndex = $derived(Math.max(0, options.findIndex((option) => option.id === value)));
	const optionId = (index: number) => `${listId}-${index}`;
	let wrapper: HTMLDivElement;
	let trigger: HTMLButtonElement;
	let list = $state<HTMLDivElement>();
	let open = $state(false);
	let activeIndex = $state(0);

	const activate = async (index: number) => {
		activeIndex = Math.max(0, Math.min(options.length - 1, index));
		await tick();
		list?.children[activeIndex]?.scrollIntoView({ block: 'nearest' });
	};

	const openMenu = () => {
		open = true;
		void activate(selectedIndex);
	};

	const select = (index: number) => {
		value = options[index].id;
		open = false;
		trigger.focus();
	};

	const closeOutside = (event: PointerEvent) => {
		if (open && event.target instanceof Node && !wrapper.contains(event.target)) open = false;
	};

	const handleKeydown = (event: KeyboardEvent) => {
		switch (event.key) {
			case 'ArrowDown':
			case 'ArrowUp':
				event.preventDefault();
				if (open) void activate(activeIndex + (event.key === 'ArrowDown' ? 1 : -1));
				else openMenu();
				break;
			case 'Home':
			case 'End':
				if (!open) break;
				event.preventDefault();
				void activate(event.key === 'Home' ? 0 : options.length - 1);
				break;
			case 'Enter':
			case ' ':
				event.preventDefault();
				if (open) select(activeIndex);
				else openMenu();
				break;
			case 'Escape':
				if (open) {
					event.preventDefault();
					event.stopPropagation();
					open = false;
				}
				break;
			case 'Tab':
				open = false;
				break;
		}
	};
</script>

<svelte:window onpointerdown={closeOutside} />

<div bind:this={wrapper} class="relative flex w-full flex-wrap items-center gap-3 md:w-auto">
	<span class="inline-flex items-center gap-1.5">
		<label id={`${id}-label`} for={id} class="text-[0.88rem] font-semibold text-brand-blue-dark">{t('Colección')}</label>
		<HelpBubble id={`${id}-help`} label="Colección" text={help} />
	</span>
	<div class="relative w-full md:w-52">
		<button
			bind:this={trigger}
			{id}
			type="button"
			role="combobox"
			aria-expanded={open}
			aria-controls={open ? listId : undefined}
			aria-activedescendant={open ? optionId(activeIndex) : undefined}
			aria-labelledby={`${id}-label ${id}-value`}
			aria-describedby={`${id}-help`}
			title={help}
			class="flex h-[42px] w-full cursor-pointer items-center justify-between gap-2 rounded-[10px] border border-border bg-white px-3 text-start text-[15px] text-text-main outline-none transition focus:border-brand-blue/35"
			onclick={() => open ? (open = false) : openMenu()}
			onkeydown={handleKeydown}
		>
			<span id={`${id}-value`} class="min-w-0 truncate">{t(options[selectedIndex].label)}</span>
			<ChevronDown class="size-4 shrink-0 text-text-soft" aria-hidden="true" />
		</button>
		{#if open}
			<div
				bind:this={list}
				id={listId}
				role="listbox"
				aria-labelledby={`${id}-label`}
				class="absolute end-0 top-[calc(100%+0.375rem)] z-30 max-h-[min(23rem,55dvh)] w-full overflow-auto rounded-[10px] border border-border bg-white p-1 shadow-soft md:w-96 lg:start-0 lg:end-auto"
			>
				{#each options as option, index (option.id)}
					<button
						id={optionId(index)}
						type="button"
						role="option"
						tabindex="-1"
						aria-selected={index === selectedIndex}
						aria-labelledby={`${optionId(index)}-label`}
						aria-describedby={option.description ? `${optionId(index)}-description` : undefined}
						data-active={index === activeIndex}
						class="flex w-full cursor-pointer appearance-none items-start justify-between gap-2 rounded-md border-0 bg-transparent px-3 py-2 text-start hover:bg-surface-accent-blue data-[active=true]:bg-surface-accent-blue"
						onclick={() => select(index)}
					>
						<span>
							<span id={`${optionId(index)}-label`} class="block text-sm font-semibold text-brand-blue-dark">{t(option.label)}</span>
							{#if option.description}
								<span id={`${optionId(index)}-description`} class="mt-0.5 block text-xs leading-snug text-text-soft">{t(option.description)}</span>
							{/if}
						</span>
						{#if index === selectedIndex}
							<Check class="mt-0.5 size-4 shrink-0 text-brand-blue" aria-hidden="true" />
						{/if}
					</button>
				{/each}
			</div>
		{/if}
	</div>
</div>
