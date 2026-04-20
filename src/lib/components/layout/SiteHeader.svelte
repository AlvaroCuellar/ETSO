<script lang="ts">
	import { page } from '$app/state';
	import logoEtso from '$lib/assets/logos/logo-etso.png';

	const navItems = [
		{ href: '/examen-autorias', label: 'Examen de autorías' },
		{ href: '/texoro', label: 'TEXORO' },
		{ href: '/bicuve', label: 'BICUVE' },
		{ href: '/como-citarnos', label: 'Cómo citarnos' }
	] as const;

	const infoItems = [
		{ href: '/mas-informacion/transcripciones-automaticas', label: 'Transcripciones automáticas' },
		{ href: '/mas-informacion/colaboradores', label: 'Colaboradores' },
		{ href: '/mas-informacion/repercusion', label: 'Repercusión' }
	] as const;

	const isActive = (href: string): boolean => {
		const path = page.url.pathname;
		return path === href || path.startsWith(`${href}/`);
	};

	const isMoreInfoActive = (): boolean => page.url.pathname.startsWith('/mas-informacion');
</script>

<header class="site-header">
	<div class="container site-header__inner">
		<a class="site-brand" href="/examen-autorias">
			<img class="site-brand__logo" src={logoEtso} alt="ETSO" />
		</a>

		<nav class="site-nav" aria-label="Navegación principal">
			{#each navItems as item}
				<a class="site-nav__link" class:is-active={isActive(item.href)} href={item.href}>{item.label}</a>
			{/each}

			<details class="site-nav__dropdown">
				<summary class="site-nav__link site-nav__trigger" class:is-active={isMoreInfoActive()}>
					Más información
				</summary>
				<div class="site-nav__menu">
					{#each infoItems as item}
						<a class="site-nav__menu-link" class:is-active={isActive(item.href)} href={item.href}>
							{item.label}
						</a>
					{/each}
				</div>
			</details>
		</nav>
	</div>
</header>
