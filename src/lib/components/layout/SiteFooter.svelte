<script lang="ts">
	import iconEtso from '$lib/assets/logos/icon-etso.png';

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
		<div class="grid gap-8 border-b border-white/16 pb-8 md:grid-cols-[auto_minmax(0,1fr)] md:gap-10">
			<a class="inline-flex w-fit items-center gap-3 text-white no-underline hover:no-underline" href="/examen-autorias">
				<img class="h-50 w-50 object-contain" src={iconEtso} alt="Logo ETSO" />
			</a>

			<nav class="grid w-full gap-8 sm:grid-cols-2 md:w-fit md:justify-self-end" aria-label="Navegación del pie de página">
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
		</div>

		<div class="pt-4 text-[0.84rem] text-white/80">© 2026 ETSO. Todos los derechos reservados.</div>
	</div>
</footer>
