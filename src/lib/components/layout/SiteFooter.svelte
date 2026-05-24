<script lang="ts">
	import logoEtso from '$lib/assets/logos/etso-logo-light.png';
	import thaliaLogo from '$lib/assets/logos/thalia.png';
	import prolopeLogo from '$lib/assets/logos/prolope-logo.png';
	import istaeLogo from '$lib/assets/logos/istae-logo.png';

	const primaryNavItems = [
		{ href: '/examen-autorias', label: 'Examen de autorías' },
		{ href: '/texoro', label: 'TEXORO' },
		{ href: '/bicuve', label: 'BICUVE' },
		{ href: '/transcripciones-automaticas', label: 'Transcripciones automáticas' }
	] as const;

	const secondaryNavItems = [
		{ href: '/equipo', label: 'Equipo' },
		{ href: '/como-citarnos', label: 'Cómo citarnos' },
		{ href: '/contacto', label: 'Contacto' }
	] as const;
</script>

<footer class="mt-12 border-t border-brand-purple/20 bg-brand-blue font-ui text-white">
	<div class="mx-auto w-full max-w-7xl px-4 py-10 sm:px-5 lg:px-6">
		<div class="grid items-start gap-8 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_auto] md:gap-x-16 md:gap-y-10 lg:gap-x-20">
			<div class="grid max-w-[28rem] gap-3 text-[0.9rem] leading-[1.55] text-white/86">
				<p class="m-0">
					Esta página web ha sido desarrollada gracias a la financiación principal de:
				</p>
				<a
					href="https://webs.uab.cat/thal-ia/"
					class="inline-block w-fit no-underline hover:no-underline"
					target="_blank"
					rel="noopener noreferrer"
				>
					<img
						class="h-16 w-auto max-w-[12.5rem] object-contain"
						src={thaliaLogo}
						alt="Logo de Thal-IA"
					/>
				</a>
				<div class="grid gap-1">
					<p class="m-0">
						<span class="font-semibold text-border-accent-blue">Dirección:</span>
						<span class="ml-1 text-white/78">Sònia Boadas</span>
					</p>
				</div>
				<p class="m-0 pt-5">Con el apoyo complementario de:</p>
				<div class="grid gap-3">
					<div class="grid gap-1">
						<a
							href="https://prolope.uab.cat/"
							class="inline-block w-fit no-underline hover:no-underline"
							target="_blank"
							rel="noopener noreferrer"
						>
							<img class="h-8 w-auto object-contain" src={prolopeLogo} alt="Logo de PROLOPE" />
						</a>
						<p class="m-0">
							<span class="font-semibold text-border-accent-blue">Dirección:</span>
							<span class="ml-1 text-white/78">Sònia Boadas y Gonzalo Pontón</span>
						</p>
					</div>
					<div class="grid gap-1">
						<a
							href="https://istae.uv.es/"
							class="inline-block w-fit no-underline hover:no-underline"
							target="_blank"
							rel="noopener noreferrer"
						>
							<img class="h-8 w-auto object-contain" src={istaeLogo} alt="Logo de ISTAE" />
						</a>
						<p class="m-0">
							<span class="font-semibold text-border-accent-blue">Dirección:</span>
							<span class="ml-1 text-white/78">Alejandra Ulla Lorenzo</span>
						</p>
					</div>
				</div>
			</div>

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

			<div class="md:justify-self-end">
				<img class="h-36 w-auto max-w-[13rem] object-contain" src={logoEtso} alt="Logo ETSO" />
			</div>
		</div>

		<div class="mt-8 border-t border-white/16 pt-6 text-center text-[0.84rem] text-white/80">
			&copy; 2026 ETSO.
			<a class="text-white/90 underline transition hover:text-white" href="/licencias">Licencias de contenido</a>
			y
			<a class="text-white/90 underline transition hover:text-white" href="/privacidad">privacidad</a>.
			Desarrollo web:
			<a
				class="text-white/90 underline transition hover:text-white"
				href="https://dxvidmr.github.io"
				target="_blank"
				rel="noopener noreferrer"
			>
				David Merino Recalde
			</a>.
		</div>
	</div>
</footer>

