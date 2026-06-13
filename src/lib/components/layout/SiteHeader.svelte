<script lang="ts">
	import { page } from '$app/state';
	import ChevronDown from 'lucide-svelte/icons/chevron-down';
	import Languages from 'lucide-svelte/icons/languages';
	import Menu from 'lucide-svelte/icons/menu';
	import X from 'lucide-svelte/icons/x';
	import logoEtso from '$lib/assets/logos/logo-etso.png';
	import {
		getUiTranslations,
		localizePath,
		stripLocaleFromPath,
		SUPPORTED_LOCALES,
		type Locale
	} from '$lib/i18n';
	import { loadClientMemoryCache } from '$lib/utils/client-memory-cache';

	interface Props {
		locale?: Locale;
	}

	let { locale = 'es' }: Props = $props();
	const translations = $derived(getUiTranslations(locale));
	const navItems = $derived(translations.nav.items);
	const infoItems = $derived(translations.nav.infoItems);
	const languageOptions = $derived(
		SUPPORTED_LOCALES.map((optionLocale) => ({
			locale: optionLocale,
			code: optionLocale.toUpperCase(),
			name: getUiTranslations(optionLocale).localeName
		}))
	);
	const currentLanguage = $derived(languageOptions.find((option) => option.locale === locale) ?? languageOptions[0]);

	let desktopMoreInfoOpen = $state(false);
	let languageMenuOpen = $state(false);
	let mobileMenuOpen = $state(false);
	let mobileMoreInfoOpen = $state(false);
	let desktopMoreInfoElement: HTMLDetailsElement | null = null;
	let languageMenuElement: HTMLDetailsElement | null = null;

	const isActive = (href: string): boolean => {
		const path = stripLocaleFromPath(page.url.pathname);
		return path === href || path.startsWith(`${href}/`);
	};

	const isMoreInfoActive = (): boolean => {
		const path = stripLocaleFromPath(page.url.pathname);
		return path === '/mas-informacion' || infoItems.some((item) => isActive(item.href));
	};

	const preloadDataForHref = (href: string): 'off' | undefined =>
		href === '/examen-autorias' || href === '/texoro' || href === '/biteso' ? 'off' : undefined;

	const preloadForHref = (href: string): void => {
		if (typeof window === 'undefined') return;
		if (href === '/examen-autorias') {
			void loadClientMemoryCache('examen-autorias:stats', async () => {
				const response = await fetch('/api/examen-autorias/stats');
				if (!response.ok) throw new Error(`No se pudieron precargar los stats de Examen: ${response.status}`);
				return response.json() as Promise<unknown>;
			}).catch(() => {});
			return;
		}
		if (href !== '/texoro') return;
		void loadClientMemoryCache('texoro:stats', async () => {
			const response = await fetch('/api/texoro/stats');
			if (!response.ok) throw new Error(`No se pudieron precargar los stats de TEXORO: ${response.status}`);
			return response.json() as Promise<unknown>;
		}).catch(() => {});
	};

	const navLinkClass = (active: boolean): string =>
		`inline-flex items-center rounded-card border px-4 py-2 text-[0.9rem] font-ui font-medium text-brand-blue no-underline transition hover:no-underline focus-visible:no-underline ${
			active
				? 'border-transparent bg-surface-accent-purple text-brand-purple'
				: 'border-transparent hover:bg-surface-accent-blue'
		}`;

	const menuLinkClass = (active: boolean): string =>
		`block rounded-md border px-2.5 py-2 text-[0.86rem] font-ui font-medium text-brand-blue no-underline transition hover:no-underline focus-visible:no-underline ${
			active
				? 'border-transparent bg-surface-accent-purple text-brand-purple'
				: 'border-transparent hover:bg-surface-accent-blue'
		}`;

	const mobileLinkClass = (active: boolean): string =>
		`block rounded-card border px-4 py-2.5 text-[0.94rem] font-ui font-medium text-brand-blue no-underline transition hover:no-underline focus-visible:no-underline ${
			active
				? 'border-transparent bg-surface-accent-purple text-brand-purple'
				: 'border-border-accent-blue bg-white hover:bg-surface-accent-blue'
		}`;

	const mobileMoreInfoButtonClass = (active: boolean): string =>
		`mobile-header-tap-reset appearance-none flex w-full items-center justify-between rounded-card border px-4 py-2.5 text-left text-[0.94rem] font-ui font-medium text-brand-blue no-underline transition hover:no-underline focus:outline-none focus:ring-0 focus-visible:no-underline focus-visible:outline-none focus-visible:ring-0 ${
			active
				? 'border-transparent bg-surface-accent-purple text-brand-purple'
				: 'border-border-accent-blue bg-white hover:bg-surface-accent-blue focus:bg-white'
		}`;

	const languageOptionClass = (active: boolean): string =>
		`flex items-center justify-between gap-4 rounded-md px-3 py-2 text-[0.86rem] font-ui font-medium no-underline transition hover:no-underline focus-visible:no-underline ${
			active
				? 'bg-surface-accent-purple text-brand-purple'
				: 'text-brand-blue hover:bg-surface-accent-blue'
		}`;

	const currentPathForLocale = (targetLocale: Locale): string => {
		const internalPath = stripLocaleFromPath(page.url.pathname);
		return localizePath(`${internalPath}${page.url.search}`, targetLocale);
	};

	function closeMobileMenu(): void {
		mobileMenuOpen = false;
		mobileMoreInfoOpen = false;
	}

	function closeDesktopDropdown(): void {
		desktopMoreInfoOpen = false;
	}

	function closeLanguageMenu(): void {
		languageMenuOpen = false;
	}

	function blurAfterPointerActivation(event: MouseEvent): void {
		// Keep focus for keyboard activation (detail === 0), blur only pointer clicks/taps.
		if (event.detail === 0) return;
		const target = event.currentTarget;
		if (target instanceof HTMLElement) target.blur();
	}

	function handleWindowKeydown(event: KeyboardEvent): void {
		if (event.key !== 'Escape') return;
		if (!desktopMoreInfoOpen && !languageMenuOpen && !mobileMenuOpen && !mobileMoreInfoOpen) return;
		closeDesktopDropdown();
		closeLanguageMenu();
		closeMobileMenu();
	}

	function handleWindowClick(event: MouseEvent): void {
		const target = event.target;
		if (!(target instanceof Node)) return;

		if (desktopMoreInfoOpen && desktopMoreInfoElement && !desktopMoreInfoElement.contains(target)) {
			closeDesktopDropdown();
		}

		if (languageMenuOpen && languageMenuElement && !languageMenuElement.contains(target)) {
			closeLanguageMenu();
		}
	}

	$effect(() => {
		page.url.pathname;
		closeDesktopDropdown();
		closeLanguageMenu();
		closeMobileMenu();
	});
</script>

<svelte:window onkeydown={handleWindowKeydown} onclick={handleWindowClick} />

<header class="sticky top-0 z-20 border-b border-border-accent-blue bg-[rgba(255,255,255,0.94)] backdrop-blur-[6px]">
	<div class="mx-auto w-full max-w-7xl px-4 sm:px-5 lg:px-6">
		<div class="flex min-h-[4.75rem] items-center justify-between gap-4">
			<a class="inline-flex items-center" href={localizePath('/', locale)}>
				<img class="block h-[2.35rem] w-auto" src={logoEtso} alt="ETSO" />
			</a>

			<nav class="hidden items-center justify-end gap-2 font-ui min-[1180px]:flex" aria-label={translations.nav.primaryLabel}>
				{#each navItems as item}
					<a
						class={navLinkClass(isActive(item.href))}
						href={localizePath(item.href, locale)}
						data-sveltekit-preload-data={preloadDataForHref(item.href)}
						onpointerenter={() => {
							preloadForHref(item.href);
						}}
						onfocus={() => {
							preloadForHref(item.href);
						}}
						ontouchstart={() => {
							preloadForHref(item.href);
						}}
					>
						{item.label}
					</a>
				{/each}

				<details class="group relative" bind:open={desktopMoreInfoOpen} bind:this={desktopMoreInfoElement}>
					<summary
						class={`${navLinkClass(isMoreInfoActive())} list-none cursor-pointer gap-[0.4rem] [&::-webkit-details-marker]:hidden`}
					>
						{translations.nav.moreInfo}
						<span class="inline-flex h-[0.44rem] w-[0.44rem] rotate-45 border-b-2 border-r-2 border-current transition-transform group-open:-rotate-[135deg]" aria-hidden="true"></span>
					</summary>
					<div class="absolute right-0 top-[calc(100%+0.35rem)] z-30 grid min-w-64 gap-1 rounded-card border border-border bg-white p-1.5 shadow-soft">
						{#each infoItems as item}
							<a
								class={menuLinkClass(isActive(item.href))}
								href={localizePath(item.href, locale)}
								onclick={() => {
									closeDesktopDropdown();
								}}
							>
								{item.label}
							</a>
						{/each}
					</div>
				</details>
			</nav>

			<div class="flex shrink-0 items-center justify-end gap-2">
				<details class="group relative" bind:open={languageMenuOpen} bind:this={languageMenuElement}>
					<summary
						class="mobile-header-tap-reset inline-flex h-10 cursor-pointer list-none items-center gap-2 rounded-card border border-border-accent-blue bg-white/90 px-3 font-ui text-[0.82rem] font-semibold tracking-[0.04em] text-brand-blue shadow-[0_1px_8px_rgba(13,63,145,0.08)] transition hover:bg-surface-accent-blue focus-visible:outline-2 focus-visible:outline-brand-blue/25 [&::-webkit-details-marker]:hidden"
						aria-label={translations.nav.languageSelector}
						onmouseup={blurAfterPointerActivation}
					>
						<Languages class="h-4 w-4" aria-hidden="true" />
						<span>{currentLanguage.code}</span>
						<ChevronDown class="h-3.5 w-3.5 transition-transform group-open:rotate-180" aria-hidden="true" />
					</summary>

					<nav
						id="language-selector-menu"
						class="absolute right-0 top-[calc(100%+0.35rem)] z-30 grid min-w-[11rem] gap-1 rounded-card border border-border bg-white p-1.5 shadow-soft"
						aria-label={translations.nav.languageSelector}
					>
						{#each languageOptions as option}
							<a
								class={languageOptionClass(option.locale === locale)}
								href={currentPathForLocale(option.locale)}
								hreflang={option.locale}
								data-i18n-preserve-locale
								aria-current={option.locale === locale ? 'true' : undefined}
								aria-label={`${translations.nav.switchToLanguage} ${option.name}`}
								onclick={() => {
									closeLanguageMenu();
								}}
							>
								<span>{option.name}</span>
								<span class="text-[0.72rem] font-semibold tracking-[0.08em] opacity-70">{option.code}</span>
							</a>
						{/each}
					</nav>
				</details>

				<button
					type="button"
					class="mobile-header-tap-reset appearance-none inline-flex h-10 w-10 items-center justify-center rounded-card border border-border-accent-blue bg-white text-brand-blue transition hover:bg-surface-accent-blue focus-visible:outline-2 focus-visible:outline-brand-blue/25 min-[1180px]:hidden"
					aria-controls="mobile-primary-nav"
					aria-expanded={mobileMenuOpen ? 'true' : 'false'}
					aria-label={mobileMenuOpen ? translations.nav.closeMenu : translations.nav.openMenu}
					onclick={() => {
						const next = !mobileMenuOpen;
						mobileMenuOpen = next;
						if (!next) mobileMoreInfoOpen = false;
					}}
					onmouseup={blurAfterPointerActivation}
				>
					{#if mobileMenuOpen}
						<X class="h-5 w-5" aria-hidden="true" />
					{:else}
						<Menu class="h-5 w-5" aria-hidden="true" />
					{/if}
				</button>
			</div>
		</div>

		{#if mobileMenuOpen}
			<div id="mobile-primary-nav" class="border-t border-border-accent-blue py-3 min-[1180px]:hidden">
				<nav class="grid gap-2 font-ui" aria-label={translations.nav.mobileLabel}>
					{#each navItems as item}
						<a
							class={`mobile-header-tap-reset ${mobileLinkClass(isActive(item.href))}`}
							href={localizePath(item.href, locale)}
							data-sveltekit-preload-data={preloadDataForHref(item.href)}
							onpointerenter={() => {
								preloadForHref(item.href);
							}}
							onfocus={() => {
								preloadForHref(item.href);
							}}
							ontouchstart={() => {
								preloadForHref(item.href);
							}}
							onclick={() => {
								closeMobileMenu();
							}}
						>
							{item.label}
						</a>
					{/each}

					<div class="grid gap-1">
						<button
							type="button"
							class={`mobile-more-info-trigger ${mobileMoreInfoButtonClass(isMoreInfoActive())}`}
							aria-expanded={mobileMoreInfoOpen ? 'true' : 'false'}
							aria-controls="mobile-more-info"
							onclick={() => {
								mobileMoreInfoOpen = !mobileMoreInfoOpen;
							}}
							onmouseup={blurAfterPointerActivation}
						>
							<span class="pointer-events-none">{translations.nav.moreInfo}</span>
							<ChevronDown
								class={`pointer-events-none h-4 w-4 transition-transform ${mobileMoreInfoOpen ? 'rotate-180' : ''}`}
								aria-hidden="true"
							/>
						</button>

						{#if mobileMoreInfoOpen}
							<div id="mobile-more-info" class="mt-1 grid gap-1">
								{#each infoItems as item}
									<a
										class={`mobile-header-tap-reset ${menuLinkClass(isActive(item.href))}`}
										href={localizePath(item.href, locale)}
										onclick={() => {
											closeMobileMenu();
										}}
									>
										{item.label}
									</a>
								{/each}
							</div>
						{/if}
					</div>
				</nav>
			</div>
		{/if}
	</div>
</header>

<style>
	@media (hover: none) and (pointer: coarse) {
		.mobile-header-tap-reset {
			-webkit-tap-highlight-color: transparent;
			appearance: none;
			-webkit-appearance: none;
			-webkit-touch-callout: none;
		}

		.mobile-header-tap-reset:focus,
		.mobile-header-tap-reset:focus-visible,
		.mobile-header-tap-reset:active {
			outline: none;
			box-shadow: none;
		}
	}

	/* The global reset `button { font: inherit; }` can override Tailwind font utilities.
	   Force this trigger to match mobile nav links exactly. */
	.mobile-more-info-trigger {
		font-family: var(--font-ui) !important;
		font-size: 15.04px !important; /* 0.94rem with 16px root */
		font-weight: 500 !important;
		line-height: 22.56px !important; /* 1.5 * 15.04px */
	}
</style>
