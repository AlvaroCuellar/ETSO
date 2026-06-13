<script lang="ts">
	import logoEtso from '$lib/assets/logos/etso-logo-light.svg';
	import thaliaLogo from '$lib/assets/logos/thalia.webp';
	import { getUiTranslations, localizePath, type Locale } from '$lib/i18n';

	interface Props {
		locale?: Locale;
	}

	let { locale = 'es' }: Props = $props();
	const translations = $derived(getUiTranslations(locale));
	const primaryNavItems = $derived(translations.nav.items.slice(0, 3).concat(translations.nav.infoItems.slice(0, 1)));
	const secondaryNavItems = $derived([
		translations.nav.infoItems[1],
		translations.nav.items[5],
		translations.nav.infoItems[2]
	].filter(Boolean));
</script>

<footer class="mt-12 border-t border-brand-purple/20 bg-brand-blue font-ui text-white">
	<div class="mx-auto w-full max-w-7xl px-4 py-10 sm:px-5 lg:px-14 xl:px-10">
		<div class="grid gap-10">
			<div class="order-3 grid items-start gap-8 md:grid-cols-2 md:gap-10">
				<div class="grid w-full gap-8 sm:grid-cols-2">
					<div class="grid content-start gap-3">
						<p class="m-0 text-[0.8rem] font-ui font-semibold tracking-[0.04em] text-white/72 uppercase">
							{translations.footer.navigation}
						</p>
						{#each primaryNavItems as item}
							<a
								class="text-[0.94rem] text-white/90 no-underline transition hover:text-white hover:no-underline"
								href={localizePath(item.href, locale)}
							>
								{item.label}
							</a>
						{/each}
					</div>

					<div class="grid content-start gap-3">
						<p class="m-0 text-[0.8rem] font-ui font-semibold tracking-[0.04em] text-white/72 uppercase">
							{translations.footer.information}
						</p>
						{#each secondaryNavItems as item}
							<a
								class="text-[0.94rem] text-white/90 no-underline transition hover:text-white hover:no-underline"
								href={localizePath(item.href, locale)}
							>
								{item.label}
							</a>
						{/each}
					</div>
				</div>

				<div class="md:justify-self-end md:self-center">
					<img class="h-36 w-auto max-w-[13rem] object-contain" src={logoEtso} alt="Logo ETSO" />
				</div>
			</div>

			<div class="order-2 border-t border-white/16"></div>

			<div class="order-1 grid items-start gap-8 lg:grid-cols-[minmax(0,1.18fr)_minmax(20rem,0.82fr)] lg:gap-10">
				<div class="grid max-w-none gap-2 text-[0.9rem] leading-[1.55] text-white/86">
					<p class="m-0 text-white/64">{translations.footer.mainFunding}</p>
					<a
						href="https://webs.uab.cat/thal-ia/"
						class="-mt-2 mb-3 inline-block w-fit no-underline hover:no-underline"
						target="_blank"
						rel="noopener noreferrer"
					>
						<img
							class="h-14 w-auto max-w-[12.5rem] object-contain lg:h-15"
							src={thaliaLogo}
							alt="Logo de Thal-IA"
						/>
					</a>
					<a
						href="https://webs.uab.cat/thal-ia/"
						class="w-fit font-reading text-[1rem] leading-[1.4] text-white no-underline hover:underline xl:whitespace-nowrap"
						target="_blank"
						rel="noopener noreferrer"
					>
						Thal-IA · Patrimonio teatral áureo: Inteligencia Artificial y Fotografía Espectral
					</a>
					<p class="m-0">
						<span class="font-semibold text-border-accent-blue">{translations.footer.direction}</span>
						<span class="ml-1 text-white/78">Sònia Boadas</span>
					</p>
				</div>

				<div class="grid max-w-[34rem] gap-4 text-[0.9rem] leading-[1.55] text-white/86">
					<p class="m-0 text-white/64">{translations.footer.complementarySupport}</p>
					<div class="grid gap-4">
						<div class="grid gap-1">
							<a
								href="https://prolope.uab.cat/"
								class="w-fit font-reading text-[1rem] leading-[1.4] text-white no-underline hover:underline"
								target="_blank"
								rel="noopener noreferrer"
							>
								Prolope · Grupo de investigación sobre Lope de Vega
							</a>
							<p class="m-0">
								<span class="font-semibold text-border-accent-blue">{translations.footer.direction}</span>
								<span class="ml-1 text-white/78">Sònia Boadas y Gonzalo Pontón</span>
							</p>
						</div>

						<div class="grid gap-1">
							<a
								href="https://istae.uv.es/"
								class="w-fit font-reading text-[1rem] leading-[1.4] text-white no-underline hover:underline"
								target="_blank"
								rel="noopener noreferrer"
							>
								Istae · Impresos sueltos del teatro antiguo español
							</a>
							<p class="m-0">
								<span class="font-semibold text-border-accent-blue">{translations.footer.direction}</span>
								<span class="ml-1 text-white/78">Alejandra Ulla Lorenzo</span>
							</p>
						</div>
					</div>
				</div>
			</div>
		</div>

		<div class="mt-8 border-t border-white/16 pt-6 text-center text-[0.84rem] text-white/80">
			&copy; 2026 ETSO |
			<a class="text-white/90 underline transition hover:text-white" href={localizePath('/licencias', locale)}>{translations.footer.contentLicenses}</a>
			{translations.footer.and}
			<a class="text-white/90 underline transition hover:text-white" href={localizePath('/privacidad', locale)}>{translations.footer.privacy}</a> |
			{translations.footer.webDevelopment}
			<a
				class="text-white/90 underline transition hover:text-white"
				href="https://dxvidmr.github.io"
				target="_blank"
				rel="noopener noreferrer"
			>
				David Merino Recalde
			</a>
		</div>
	</div>
</footer>
