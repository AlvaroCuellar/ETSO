<script lang="ts">
	import Breadcrumbs from '$lib/components/ui/Breadcrumbs.svelte';
	import transcripcionAutomatica1 from '$lib/assets/transcripcion/transcripcion-automatica-1.jpg';
	import transcripcionAutomatica2 from '$lib/assets/transcripcion/transcripcion-automatica-2.jpg';

	const milestones = [
		{ value: '1.000', label: 'impresos transcritos y modernizados automáticamente' },
		{ value: '350', label: 'manuscritos incorporados a los flujos de trabajo del proyecto' },
		{ value: '99 %', label: 'de acierto aproximado en impresos' },
		{ value: '90 %', label: 'de acierto aproximado en manuscritos' }
	];

	const models = [
		{
			title: 'Spanish Golden Age Prints 1.0',
			description: 'Modelo entrenado para la transcripción automática de impresos teatrales del Siglo de Oro.'
		},
		{
			title: 'Spanish Golden Age Prints (Spelling Modernization) 1.0',
			description: 'Versión orientada a la modernización ortográfica automática de impresos ya transcritos.'
		},
		{
			title: 'Spanish Golden Age Manuscripts (Spelling Modernization) 1.0',
			description: 'Modelo centrado en manuscritos teatrales, con modernización ortográfica y detección de rasgos relevantes.'
		}
	];
</script>

<div class="grid gap-7 lg:gap-8">
	<Breadcrumbs
		items={[
			{ label: 'Examen de autorías', href: '/examen-autorias' },
			{ label: 'Más información', href: '/mas-informacion' },
			{ label: 'Transcripciones automáticas' }
		]}
	/>

	<section class="grid gap-4">
		<p class="m-0 font-ui text-[0.8rem] font-semibold uppercase tracking-[0.05em] text-text-accent-purple">
			Procesamiento textual
		</p>
		<h1 class="m-0 text-[clamp(1.7rem,2.9vw,2.25rem)] font-bold leading-[1.12] text-brand-blue-dark">
			Transcripciones automáticas
		</h1>
		<p class="m-0 leading-[1.72] text-text-main">Procesos de transcripción automática.</p>
	</section>

	<section class="grid gap-6 lg:gap-7">
		<blockquote class="m-0 border-l-4 border-border-accent-purple pl-5 text-[1.02rem] leading-[1.75] text-text-main lg:pl-6">
			<p class="m-0">
				<a
					href="https://doi.org/10.13035/H.2023.11.01.08"
					target="_blank"
					rel="noopener noreferrer"
					class="underline"
				>
					Cuéllar, Álvaro. (2023). «La Inteligencia Artificial al rescate del Siglo de Oro. Transcripción y modernización automática de mil trescientos impresos y manuscritos teatrales»
				</a>
				. <em>Hipogrifo. Revista de literatura y cultura del Siglo de Oro</em>, vol. 11, núm. 1,
				pp. 101-115.
			</p>
		</blockquote>

		<p class="m-0 leading-[1.72] text-text-main">
			Recientemente hemos desarrollado procesos de transcripción automática gracias a la
			herramienta Transkribus. A través de estos procesos hemos podido transcribir y modernizar
			automáticamente unos 1000 impresos y 350 manuscritos de teatro del Siglo de Oro, que forman
			ahora parte de CETSO y TEXORO.
		</p>

		<div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
			{#each milestones as item}
				<article class="grid gap-2 rounded-card border border-border bg-surface p-5 shadow-soft">
					<p class="m-0 font-ui text-[1.5rem] font-semibold leading-none text-brand-blue-dark">{item.value}</p>
					<p class="m-0 text-[0.95rem] leading-[1.6] text-text-main">{item.label}</p>
				</article>
			{/each}
		</div>

		<p class="m-0 leading-[1.72] text-text-main">
			Los tres modelos empleados son públicos y cualquiera puede emplearlos a través de la
			herramienta Transkribus.
		</p>

		<div class="grid gap-4 lg:grid-cols-3">
			{#each models as model}
				<article class="grid gap-3 rounded-card border border-border-accent-blue bg-surface-accent-blue px-5 py-4">
					<p class="m-0 text-[0.76rem] font-ui font-semibold uppercase tracking-[0.04em] text-text-accent-purple">
						Transkribus, 2021
					</p>
					<h2 class="m-0 font-ui text-[1rem] font-semibold leading-[1.35] text-brand-blue-dark">
						{model.title}
					</h2>
					<p class="m-0 text-[0.95rem] leading-[1.68] text-text-main">{model.description}</p>
				</article>
			{/each}
		</div>

		<p class="m-0 leading-[1.72] text-text-main">
			Estos modelos nos permiten transcribir impresos y manuscritos teatrales con un alto grado
			de precisión: aproximadamente un 99 % de acierto en impresos y un 90 % en manuscritos.
			Nuestras transcripciones, además, pueden modernizar automáticamente la ortografía a las
			normas actuales y detectar ciertos elementos, como cursivas.
		</p>

		<div class="grid gap-5 sm:grid-cols-2">
			<img
				src={transcripcionAutomatica1}
				alt="Ejemplo de transcripción automática aplicada a un texto teatral del Siglo de Oro."
				class="aspect-[4/3] w-full rounded-card object-cover shadow-soft"
				loading="lazy"
			/>
			<img
				src={transcripcionAutomatica2}
				alt="Segundo ejemplo de transcripción automática y modernización ortográfica."
				class="aspect-[4/3] w-full rounded-card object-cover shadow-soft"
				loading="lazy"
			/>
		</div>

		<p class="m-0 leading-[1.72] text-text-main">
			Si te interesa saber más sobre la herramienta, cómo aplicar nuestros modelos de transcripción
			a tus documentos, o si necesitas una transcripción concreta de un impreso o manuscrito sobre
			la que trabajar, por favor, contacta con Álvaro Cuéllar.
		</p>
	</section>
</div>
