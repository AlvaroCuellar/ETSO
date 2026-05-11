<script lang="ts">
	import logoEtso from '$lib/assets/logos/etso-logo-light.png';
	import thaliaLogo from '$lib/assets/logos/thalia.png';

	const primaryNavItems = [
		{ href: '/examen-autorias', label: 'Examen de autorías' },
		{ href: '/texoro', label: 'TEXORO' },
		{ href: '/bicuve', label: 'BICUVE' },
		{ href: '/transcripciones-automaticas', label: 'Transcripciones automáticas' }
	] as const;

	const secondaryNavItems = [
		{ href: '/colaboradores', label: 'Colaboradores' },
		{ href: '/privacidad', label: 'Privacidad' },
		{ href: '/como-citarnos', label: 'Cómo citarnos' },
		{ href: '/contacto', label: 'Contacto' }
	] as const;
</script>

<footer class="mt-12 border-t border-brand-purple/20 bg-brand-blue font-ui text-white">
	<div class="mx-auto w-full max-w-7xl px-4 py-10 sm:px-5 lg:px-6">
		<div class="grid items-start gap-8 md:grid-cols-[auto_minmax(0,1fr)_auto] md:gap-10">
			<a class="inline-flex w-fit items-center gap-3 text-white no-underline hover:no-underline" href="/examen-autorias">
				<img class="h-50 w-50 object-contain" src={logoEtso} alt="Logo ETSO" />
			</a>

			<nav class="grid w-full gap-8 sm:grid-cols-2 md:w-fit md:justify-self-center" aria-label="Navegación del pie de página">
				<div class="grid content-start gap-3">
					<p class="m-0 text-[0.8rem] font-ui font-semibold tracking-[0.04em] text-white/72 uppercase">
						Navegación
					</p>
					{#each primaryNavItems as item}
						<a
							class="text-[0.94rem] text-white/90 no-underline transition hover:text-white hover:no-underline"
							href={item.href}
						>
							{item.label}
						</a>
					{/each}
				</div>

				<div class="grid content-start gap-3">
					<p class="m-0 text-[0.8rem] font-ui font-semibold tracking-[0.04em] text-white/72 uppercase">
						Información
					</p>
					{#each secondaryNavItems as item}
						<a
							class="text-[0.94rem] text-white/90 no-underline transition hover:text-white hover:no-underline"
							href={item.href}
						>
							{item.label}
						</a>
					{/each}
				</div>
			</nav>

			<div class="md:justify-self-end md:text-right">
				<p class="m-0 text-[0.8rem] font-ui font-semibold tracking-[0.04em] text-white/72 uppercase">
					Con la financiación de
				</p>
				<img
					class="mt-3 h-14 w-auto max-w-[11rem] object-contain md:ml-auto"
					src={thaliaLogo}
					alt="Logo de Thalia"
				/>
			</div>
		</div>

		<div class="mt-8 border-t border-white/16 pt-6 text-center text-[0.84rem] text-white/80">
			© 2026 ETSO. Todos los derechos reservados.
		</div>
	</div>
</footer>
