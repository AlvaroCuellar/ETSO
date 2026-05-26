<script lang="ts">
	import Globe from 'lucide-svelte/icons/globe';
	import Mail from 'lucide-svelte/icons/mail';

	interface TeamProfileLink {
		label: string;
		href: string;
	}

	let {
		title,
		image,
		organizations = [],
		summary = '',
		links = []
	}: {
		title: string;
		image: string;
		organizations?: string[];
		summary?: string;
		links?: TeamProfileLink[];
	} = $props();

	let linksVisible = $state(false);

	const isExternalHref = (href: string): boolean => /^https?:\/\//i.test(href);
	const isMailHref = (href: string): boolean => /^mailto:/i.test(href);

	const toggleLinks = (): void => {
		if (links.length === 0) return;
		linksVisible = !linksVisible;
	};
</script>

<article
	class="group relative overflow-hidden rounded-card border border-border bg-surface shadow-soft transition md:mx-auto md:w-full md:max-w-[24rem]"
	class:cursor-pointer={links.length > 0}
>
	{#if links.length > 0}
		<button
			type="button"
			class="absolute inset-0 z-10 cursor-pointer border-0 bg-transparent p-0"
			aria-label={`Mostrar enlaces de ${title}`}
			aria-expanded={linksVisible ? 'true' : 'false'}
			onclick={toggleLinks}
		></button>
	{/if}

	<div class="relative">
		<img src={image} alt={`Imagen de ${title}`} class="block h-auto w-full" loading="lazy" />

		{#if links.length > 0}
			<div
				class={`pointer-events-none absolute inset-0 bg-[rgba(248,248,250,0.42)] transition duration-200 group-hover:opacity-100 group-focus-within:opacity-100 ${linksVisible ? 'opacity-100' : 'opacity-0'}`}
			></div>
			<div
				class={`absolute inset-x-0 bottom-4 z-20 flex justify-center gap-3 transition duration-200 group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100 ${linksVisible ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'}`}
			>
				{#each links as link}
					<a
						href={link.href}
						target={isExternalHref(link.href) ? '_blank' : undefined}
						rel={isExternalHref(link.href) ? 'noopener noreferrer' : undefined}
						aria-label={link.label}
						title={link.label}
						class="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/60 bg-white/92 text-text-accent-purple no-underline shadow-soft transition hover:bg-white hover:text-brand-purple-dark hover:no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
					>
						{#if isMailHref(link.href)}
							<Mail class="h-[1.05rem] w-[1.05rem]" aria-hidden="true" />
						{:else}
							<Globe class="h-[1.05rem] w-[1.05rem]" aria-hidden="true" />
						{/if}
					</a>
				{/each}
			</div>
		{/if}
	</div>

	<div class="grid gap-2 p-4">
		<h3 class="m-0 font-ui text-[1rem] font-semibold leading-[1.3] text-brand-blue-dark">{title}</h3>
		{#if organizations.length > 0}
			<p class="m-0 text-[0.92rem] leading-[1.55] text-text-soft">{organizations.join(' | ')}</p>
		{/if}
		{#if summary}
			<p class="m-0 text-[0.96rem] leading-[1.62] text-text-main">{summary}</p>
		{/if}
	</div>
</article>
