<script lang="ts">
	import { page } from '$app/state';
	import ChevronDown from 'lucide-svelte/icons/chevron-down';
	import Menu from 'lucide-svelte/icons/menu';
	import X from 'lucide-svelte/icons/x';
	import logoEtso from '$lib/assets/logos/logo-etso.png';

	const navItems = [
		{ href: '/examen-autorias', label: 'Examen de autorías' },
		{ href: '/texoro', label: 'TEXORO' },
		{ href: '/bicuve', label: 'BICUVE' },
		{ href: '/como-citarnos', label: 'Cómo citarnos' }
	] as const;

	const infoItems = [
		{ href: '/transcripciones-automaticas', label: 'Transcripciones automáticas' },
		{ href: '/colaboradores', label: 'Colaboradores' },
		{ href: '/repercusion', label: 'Repercusión' }
	] as const;

	let mobileMenuOpen = $state(false);
	let mobileMoreInfoOpen = $state(false);

	const isActive = (href: string): boolean => {
		const path = page.url.pathname;
		return path === href || path.startsWith(`${href}/`);
	};

	const isMoreInfoActive = (): boolean => {
		const path = page.url.pathname;
		return path === '/mas-informacion' || infoItems.some((item) => isActive(item.href));
	};

	const navLinkClass = (active: boolean): string =>
		`inline-flex items-center rounded-card border px-4 py-2 text-[0.9rem] font-ui font-medium text-brand-blue no-underline transition hover:no-underline focus-visible:no-underline ${
			active
				? 'border-[rgba(0,51,167,0.28)] bg-[linear-gradient(135deg,rgba(0,51,167,0.15),rgba(105,0,93,0.14))]'
				: 'border-transparent hover:bg-surface-accent'
		}`;

	const menuLinkClass = (active: boolean): string =>
		`block rounded-md border px-2.5 py-2 text-[0.86rem] font-ui font-medium text-brand-blue no-underline transition hover:no-underline focus-visible:no-underline ${
			active
				? 'border-[rgba(0,51,167,0.28)] bg-[linear-gradient(135deg,rgba(0,51,167,0.15),rgba(105,0,93,0.14))]'
				: 'border-transparent hover:bg-surface-accent'
		}`;

	const mobileLinkClass = (active: boolean): string =>
		`block rounded-card border px-4 py-2.5 text-[0.94rem] font-ui font-medium text-brand-blue no-underline transition hover:no-underline focus-visible:no-underline ${
			active
				? 'border-[rgba(0,51,167,0.28)] bg-[linear-gradient(135deg,rgba(0,51,167,0.15),rgba(105,0,93,0.14))]'
				: 'border-[rgba(0,51,167,0.14)] bg-white hover:bg-surface-accent'
		}`;

	function closeMobileMenu(): void {
		mobileMenuOpen = false;
		mobileMoreInfoOpen = false;
	}

	function handleWindowKeydown(event: KeyboardEvent): void {
		if (event.key !== 'Escape') return;
		if (!mobileMenuOpen && !mobileMoreInfoOpen) return;
		closeMobileMenu();
	}

	$effect(() => {
		page.url.pathname;
		closeMobileMenu();
	});
</script>

<svelte:window onkeydown={handleWindowKeydown} />

<header class="sticky top-0 z-20 border-b border-[rgba(0,51,167,0.1)] bg-[rgba(255,255,255,0.94)] backdrop-blur-[6px]">
	<div class="mx-auto w-full max-w-7xl px-4 sm:px-5 lg:px-6">
		<div class="flex min-h-[4.75rem] items-center justify-between gap-4">
			<a class="inline-flex items-center" href="/">
				<img class="block h-[2.35rem] w-auto" src={logoEtso} alt="ETSO" />
			</a>

			<nav class="hidden items-center justify-end gap-2 font-ui min-[860px]:flex" aria-label="Navegación principal">
				{#each navItems as item}
					<a class={navLinkClass(isActive(item.href))} href={item.href}>{item.label}</a>
				{/each}

				<details class="group relative">
					<summary
						class={`${navLinkClass(isMoreInfoActive())} list-none cursor-pointer gap-[0.4rem] [&::-webkit-details-marker]:hidden`}
					>
						Más información
						<span class="inline-flex h-[0.44rem] w-[0.44rem] rotate-45 border-b-2 border-r-2 border-current transition-transform group-open:-rotate-[135deg]" aria-hidden="true"></span>
					</summary>
					<div class="absolute right-0 top-[calc(100%+0.35rem)] z-30 grid min-w-64 gap-1 rounded-card border border-border bg-white p-1.5 shadow-soft">
						{#each infoItems as item}
							<a class={menuLinkClass(isActive(item.href))} href={item.href}>{item.label}</a>
						{/each}
					</div>
				</details>
			</nav>

			<button
				type="button"
				class="inline-flex h-10 w-10 items-center justify-center rounded-card border border-[rgba(0,51,167,0.18)] bg-white text-brand-blue transition hover:bg-surface-accent focus-visible:outline-2 focus-visible:outline-[rgba(0,51,167,0.3)] min-[860px]:hidden"
				aria-controls="mobile-primary-nav"
				aria-expanded={mobileMenuOpen ? 'true' : 'false'}
				aria-label={mobileMenuOpen ? 'Cerrar menú principal' : 'Abrir menú principal'}
				onclick={() => {
					const next = !mobileMenuOpen;
					mobileMenuOpen = next;
					if (!next) mobileMoreInfoOpen = false;
				}}
			>
				{#if mobileMenuOpen}
					<X class="h-5 w-5" aria-hidden="true" />
				{:else}
					<Menu class="h-5 w-5" aria-hidden="true" />
				{/if}
			</button>
		</div>

		{#if mobileMenuOpen}
			<div id="mobile-primary-nav" class="border-t border-[rgba(0,51,167,0.12)] py-3 min-[860px]:hidden">
				<nav class="grid gap-2 font-ui" aria-label="Navegación principal móvil">
					{#each navItems as item}
						<a
							class={mobileLinkClass(isActive(item.href))}
							href={item.href}
							onclick={() => {
								closeMobileMenu();
							}}
						>
							{item.label}
						</a>
					{/each}

					<div class="rounded-card border border-[rgba(0,51,167,0.14)] bg-white p-1.5">
						<button
							type="button"
							class="flex w-full items-center justify-between rounded-md px-2.5 py-2 text-left text-[0.9rem] font-medium text-brand-blue transition hover:bg-surface-accent focus-visible:outline-2 focus-visible:outline-[rgba(0,51,167,0.25)]"
							aria-expanded={mobileMoreInfoOpen ? 'true' : 'false'}
							aria-controls="mobile-more-info"
							onclick={() => {
								mobileMoreInfoOpen = !mobileMoreInfoOpen;
							}}
						>
							<span>Más información</span>
							<ChevronDown
								class={`h-4 w-4 transition-transform ${mobileMoreInfoOpen ? 'rotate-180' : ''}`}
								aria-hidden="true"
							/>
						</button>

						{#if mobileMoreInfoOpen}
							<div id="mobile-more-info" class="mt-1 grid gap-1">
								{#each infoItems as item}
									<a
										class={menuLinkClass(isActive(item.href))}
										href={item.href}
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
