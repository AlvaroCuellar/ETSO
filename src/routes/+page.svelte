<script lang="ts">
	import type { ComponentType } from 'svelte';
	import { onMount } from 'svelte';
	import ChevronLeft from 'lucide-svelte/icons/chevron-left';
	import ChevronRight from 'lucide-svelte/icons/chevron-right';
	import Globe from 'lucide-svelte/icons/globe';
	import Mail from 'lucide-svelte/icons/mail';
	import estilometriaHero from '$lib/assets/heros/estilometria.png';
	import texoroHero from '$lib/assets/heros/texoro.png';
	import transcripcionHero from '$lib/assets/heros/transcripcion.jpeg';
	import grafoImage from '$lib/assets/heros/grafo.png';
	import informesImage from '$lib/assets/heros/informes.png';
	import ayudaImage from '$lib/assets/heros/ayuda.jpg';
	import fondoEscritura from '$lib/assets/fondos/fondo-escritura.png';

	interface HomeSlide {
		image: string;
		title: string;
		description: string;
		alt: string;
	}

	interface TeamMember {
		title: string;
		organizations: string[];
		summary: string;
		image: string;
		links: TeamLink[];
	}

	interface TeamLink {
		label: string;
		href: string;
		icon: ComponentType;
	}

	const slides: HomeSlide[] = [
		{
			image: estilometriaHero,
			title: 'Análisis estilométrico de autoría',
			description: 'Consulta el examen de autorías y los informes de cada obra.',
			alt: 'Visualización de análisis estilométrico del proyecto ETSO'
		},
		{
			image: texoroHero,
			title: 'Búsquedas en el corpus',
			description: 'En TEXORO puedes realizar búsquedas en 3000 textos teatrales.',
			alt: 'Interfaz de búsqueda textual de TEXORO'
		},
		{
			image: transcripcionHero,
			title: 'Transcripción y modernización automática de impresos y manuscritos',
			description: 'Consulta nuestros procesos de transcripción automática.',
			alt: 'Proceso de transcripción automática de textos antiguos'
		}
	];

	const teamMembers: TeamMember[] = [
		{
			title: 'Álvaro Cuéllar',
			organizations: ['Universitat Autònoma de Barcelona'],
			summary: '',
			image: '/images/colaboradores/FotoAlvaroCuellar.png',
			links: [
				{
					label: 'Correo de Álvaro Cuéllar',
					href: 'mailto:alvaro.cuellar@uab.cat',
					icon: Mail
				},
				{
					label: 'Web de Álvaro Cuéllar',
					href: 'https://www.alvarocuellar.com/',
					icon: Globe
				}
			]
		},
		{
			title: 'Germán Vega García-Luengos',
			organizations: ['Universidad de Valladolid'],
			summary: '',
			image: '/images/colaboradores/FotoGermanVega.jpg',
			links: [
				{
					label: 'Correo de Germán Vega García-Luengos',
					href: 'mailto:german.vega@uva.es',
					icon: Mail
				}
			]
		}
	];

	const AUTOPLAY_MS = 7000;
	let activeIndex = $state(0);
	let autoplayHandle: ReturnType<typeof setInterval> | null = null;
	let prefersReducedMotion = false;

	const goToSlide = (nextIndex: number): void => {
		activeIndex = (nextIndex + slides.length) % slides.length;
	};

	const goToPrevious = (): void => {
		goToSlide(activeIndex - 1);
	};

	const goToNext = (): void => {
		goToSlide(activeIndex + 1);
	};

	const stopAutoplay = (): void => {
		if (!autoplayHandle) return;
		clearInterval(autoplayHandle);
		autoplayHandle = null;
	};

	const startAutoplay = (): void => {
		if (prefersReducedMotion || autoplayHandle) return;
		autoplayHandle = setInterval(() => {
			activeIndex = (activeIndex + 1) % slides.length;
		}, AUTOPLAY_MS);
	};

	const handleCarouselKeydown = (event: KeyboardEvent): void => {
		if (
			event.target instanceof HTMLInputElement ||
			event.target instanceof HTMLTextAreaElement ||
			event.target instanceof HTMLSelectElement
		) {
			return;
		}

		if (event.key === 'ArrowLeft') {
			event.preventDefault();
			goToPrevious();
			return;
		}

		if (event.key === 'ArrowRight') {
			event.preventDefault();
			goToNext();
		}
	};

	onMount(() => {
		prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		startAutoplay();

		return () => {
			stopAutoplay();
		};
	});
</script>

<svelte:window onkeydown={handleCarouselKeydown} />

<section
	class="group relative left-1/2 right-1/2 w-screen -translate-x-1/2 overflow-hidden"
	aria-label="Secciones destacadas de ETSO"
>
	<div class="relative h-[56vh] min-h-[25rem] w-full max-h-[44rem]">
		<div
			class="absolute inset-0 flex transition-transform duration-700 ease-out"
			style={`transform: translateX(-${activeIndex * 100}%);`}
		>
			{#each slides as slide}
				<article class="relative h-full min-w-full">
					<img src={slide.image} alt={slide.alt} class="h-full w-full object-cover" loading="eager" />
					<div class="absolute inset-0 bg-[rgba(8,21,52,0.48)]"></div>

					<div class="absolute inset-0 flex items-end pb-12 md:items-center md:pb-0">
						<div class="mx-auto w-full max-w-7xl px-4 sm:px-5 lg:px-6">
							<div class="max-w-[58rem] text-white">
								<h1 class="font-ui text-[clamp(1.9rem,4.5vw,3.4rem)] leading-[1.08] font-bold tracking-[-0.01em]">
									{slide.title}
								</h1>
								<p class="mt-4 max-w-[50rem] font-reading text-[clamp(1rem,1.5vw,1.35rem)] leading-[1.45] text-white/92">
									{slide.description}
								</p>
							</div>
						</div>
					</div>
				</article>
			{/each}
		</div>

		<button
			type="button"
			class="pointer-events-auto absolute top-1/2 left-[max(0.75rem,env(safe-area-inset-left))] z-10 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/45 bg-black/20 text-white opacity-0 transition duration-200 hover:bg-black/32 group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:left-[max(1rem,env(safe-area-inset-left))] lg:left-[max(1.25rem,env(safe-area-inset-left))]"
			onclick={goToPrevious}
			aria-label="Ver diapositiva anterior"
		>
			<ChevronLeft class="h-5 w-5" aria-hidden="true" />
		</button>

		<button
			type="button"
			class="pointer-events-auto absolute top-1/2 right-[max(0.75rem,env(safe-area-inset-right))] z-10 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/45 bg-black/20 text-white opacity-0 transition duration-200 hover:bg-black/32 group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:right-[max(1rem,env(safe-area-inset-right))] lg:right-[max(1.25rem,env(safe-area-inset-right))]"
			onclick={goToNext}
			aria-label="Ver diapositiva siguiente"
		>
			<ChevronRight class="h-5 w-5" aria-hidden="true" />
		</button>

		<div class="absolute bottom-5 left-1/2 flex -translate-x-1/2 items-center gap-2">
			{#each slides as _, index}
				<button
					type="button"
					class={`h-2.5 rounded-full border border-white/65 transition ${index === activeIndex ? 'w-8 bg-white' : 'w-2.5 bg-white/35 hover:bg-white/55'}`}
					onclick={() => {
						goToSlide(index);
					}}
					aria-label={`Ir a la diapositiva ${index + 1}`}
					aria-pressed={index === activeIndex ? 'true' : 'false'}
				></button>
			{/each}
		</div>
	</div>
</section>

<section class="mx-auto mt-10 w-full max-w-7xl p-5 md:p-6 lg:p-8">
	<div class="grid items-stretch gap-6 lg:grid-cols-[minmax(16rem,35%)_minmax(0,1fr)] lg:gap-8">
		<div class="h-full overflow-hidden">
			<img
				src={grafoImage}
				alt="Grafo de relaciones estilométricas del proyecto ETSO"
				class="h-full w-full object-cover"
				loading="lazy"
			/>
		</div>

		<div class="grid gap-5 text-[1.02rem] leading-[1.72] text-text-soft">
			<p class="m-0">
				El proyecto ETSO: Estilometría aplicada al Teatro del Siglo de Oro surge del interés del investigador
				Álvaro Cuéllar (Universitat Autònoma de Barcelona) y del catedrático Germán Vega García-Luengos
				(Universidad de Valladolid) en aplicar las nuevas herramientas informáticas a los numerosos problemas
				de autoría que presenta el teatro del Siglo de Oro español. Este portal trata de ofrecer análisis que
				puedan arrojar luz sobre las atribuciones de la vasta producción teatral del periodo aurisecular.
				Gracias a la estilometría podemos averiguar, en una de sus más útiles funcionalidades, qué obras tienen
				frecuencias en léxico más cercanas a las del texto que nos interesa en el corpus del que dispongamos.
				Cada autor usa las palabras en unas proporciones distintas, por lo que las obras suelen relacionarse en
				función de su autoría. Bien es cierto que debemos ser siempre precavidos por otras relaciones que pueden
				estarse produciendo por razón del género literario, la temática, la datación, la procedencia, el estado
				del texto, etc.
			</p>
			<p class="m-0">
				Se pueden consultar aquí ejemplos en los que la estilometría ratifica la atribución tradicional, como
				en La dama boba, Don Gil de las calzas verdes o El médico de su honra, y también casos en los que la
				estilometría apunta hacia una autoría inesperada y potencialmente esclarecedora, como en La francesa
				Laura, La monja alférez o La puerta Macarena (Primera parte). Debemos tener en cuenta que las nuevas
				atribuciones aquí señaladas son meros indicios de autoría arrojados por el proceso informático de forma
				automática. Todos los casos deben ser estudiados pormenorizadamente desde la filología atendiendo a sus
				complejidades particulares.
			</p>
		</div>
	</div>
</section>

<section class="mx-auto mt-6 w-full max-w-7xl p-5 md:p-6 lg:p-8">
	<div class="grid items-stretch gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,35%)] lg:gap-8">
		<div class="grid gap-4 rounded-card bg-brand-blue px-5 py-5 text-white shadow-soft md:px-6 md:py-6 lg:px-8 lg:py-8">
			<p class="m-0 font-ui text-[0.78rem] font-semibold uppercase tracking-[0.05em] text-white/85">
				Humanidades digitales
			</p>
			<p class="m-0 font-ui text-[1.18rem] font-semibold leading-[1.35]">
				Estilometría, Inteligencia Artificial, Transcripción automática (HTR)...
			</p>
			<p class="m-0 text-[1.01rem] leading-[1.7] text-white/95">
				En ETSO empleamos diferentes técnicas informáticas que nos permiten trabajar los textos como nunca
				antes había sido posible.
			</p>
			<p class="m-0 text-[1.01rem] leading-[1.7] text-white/95">
				Gracias a <b>Stylo</b> (Maciej Eder, Jan Rybicki y Mike Kestemont) podemos relacionar los textos por sus usos
				léxicos.
			</p>
			<p class="m-0 text-[1.01rem] leading-[1.7] text-white/95">
				<b>Transkribus</b> (P. Kahle, S. Colutto, G. Hackl y G. Mühlberger) nos posibilita transcribir y modernizar
				impresos y manuscritos antiguos automáticamente con un alto grado de acierto.
			</p>
			<p class="m-0 text-[1.01rem] leading-[1.7] text-white/95">
				Además, empleamos otras técnicas estilométricas o de Inteligencia Artificial para tratar los textos.
			</p>
		</div>

		<div class="overflow-hidden">
			<img
				src={informesImage}
				alt="Panel de informes estilométricos de ETSO"
				class="h-full w-full object-cover"
				loading="lazy"
			/>
		</div>
	</div>
</section>

<section
	class="relative left-1/2 right-1/2 mt-8 w-screen -translate-x-1/2 overflow-hidden bg-cover bg-center bg-no-repeat"
	style={`background-image: linear-gradient(rgba(0, 38, 129, 0.52), rgba(0, 38, 129, 0.52)), url('${fondoEscritura}')`}
>
	<div class="mx-auto w-full max-w-7xl px-4 py-14 text-center text-white sm:px-5 md:py-16 lg:px-6 lg:py-20">
		<div class="mx-auto max-w-5xl">
			<h2 class="font-ui text-[clamp(1.6rem,3.2vw,2.5rem)] leading-[1.15] font-bold">
				TEXORO: Textos del Siglo de Oro
			</h2>
			<p class="mt-3 font-ui text-[clamp(1rem,1.6vw,1.28rem)] font-medium">Búsquedas en el corpus</p>

			<div class="mt-8 grid gap-5 text-left font-reading text-[1.03rem] leading-[1.72] text-white/95 md:text-center">
				<p class="m-0">
					Después de haber recopilado los más de 2800 textos de más de 350 dramaturgos que componen CETSO,
					queríamos ofrecer a la comunidad la posibilidad de realizar búsquedas internas en ellos. Así surge
					TEXORO: Textos del Siglo de Oro, donde, a través de la celda "Buscar en TEXORO", se puede consultar
					en qué obras aparecen las palabras que indiquemos.
				</p>
				<p class="m-0">
					En estos momentos TEXORO cuenta con los mismos textos que CETSO, pero es nuestra intención que un
					futuro crezca ofreciendo otros tipos de textos fuera del ámbito teatral. Es por esta razón que le
					hemos dado una entidad propia dentro del proyecto, alejándonos de los análisis de estilometría del
					teatro aurisecular.
				</p>
				<p class="m-0">
					Ahora solo es posible realizar búsquedas de palabras en TEXORO, pero estamos trabajando para que se
					puedan lanzar búsquedas más complejas, como grupos de palabras, y otras opciones de interés, como
					operadores lógicos o distancias entre las palabras.
				</p>
			</div>

			<div class="mt-9">
				<a
					href="/texoro"
					class="inline-flex items-center rounded-card border border-white/60 bg-white/15 px-6 py-3 font-ui text-[0.95rem] font-semibold tracking-[0.03em] text-white no-underline transition hover:bg-white/25 hover:no-underline"
				>
					TEXORO
				</a>
			</div>
		</div>
	</div>
</section>

<section class="mx-auto mt-8 w-full max-w-7xl p-5 md:p-6 lg:p-8">
	<div class="grid items-stretch gap-6 lg:grid-cols-[minmax(16rem,35%)_minmax(0,1fr)] lg:gap-8">
		<div class="h-full overflow-hidden rounded-card">
			<img
				src={ayudaImage}
				alt="Documentos en un archivo"
				class="h-full w-full object-cover"
				loading="lazy"
			/>
		</div>

		<div class="grid gap-5 text-[1.02rem] leading-[1.72] text-text-soft">
			<h2 class="m-0 font-ui text-[clamp(1.4rem,2.6vw,2rem)] leading-[1.2] font-semibold text-brand-blue-dark">
				¿Cómo te podemos ayudar? ¿Cómo nos puedes ayudar?
			</h2>
			<p class="m-0">
				Podemos ayudarte a investigar la autoría de obras teatrales del Siglo de Oro. Si el informe de la obra
				que te interesa no está todavía en CETSO, escríbenos y nos pondremos en contacto contigo. De igual
				manera, si tienes interés en algún texto procedente de la transcripción y modernización automática de
				impresos y manuscritos, o si quieres más información sobre estos procesos, puedes escribirnos al
				respecto. En TEXORO se pueden realizar búsquedas en los 36 millones de palabras que componen el corpus
				actualmente, pero si te interesa realizar una búsqueda avanzada (en construcción ahora mismo) puedes
				escribirnos.
			</p>
			<p class="m-0">
				Nos puedes ayudar enviándonos textos del Siglo de Oro que todavía no tengamos en la base de datos. Nos
				comprometemos a responderte con un informe personalizado y a indicar la procedencia del texto en nuestro
				portal (si es que quieres que se haga público). Necesitamos también ayuda en múltiples trabajos dentro
				del proyecto, así que si te interesa el mundo de las Humanidades Digitales y el Siglo de Oro ponte en
				contacto con nosotros. Citar el proyecto nos ayuda mucho a difundir nuestro trabajo y a conseguir becas
				y financiación para poder seguir nuestra labor. Finalmente, se trata de un trabajo amplio que abarca
				multitud de textos y autores, por lo que es difícil tener todos los datos controlados. Si encuentras
				cualquier tipo de error o errata en la información de la página te estaremos muy agradecidos si nos los
				comunicas a través del contacto.
			</p>
			<div class="pt-1">
				<a
					href="/mas-informacion"
					class="inline-flex items-center rounded-card border border-brand-blue/25 bg-brand-blue px-5 py-2.5 font-ui text-[0.92rem] font-semibold text-white no-underline transition hover:bg-brand-blue-dark hover:no-underline"
				>
					Contacta con nosotros
				</a>
			</div>
		</div>
	</div>
</section>

<section class="mx-auto mt-8 w-full max-w-7xl p-5 md:p-6 lg:p-8">
		<div class="grid gap-4">
			<div class="grid gap-1 text-center">
				<h2 class="m-0 font-ui text-[clamp(1.4rem,2.6vw,2rem)] font-semibold leading-[1.2] text-brand-blue-dark">
					ETSO es un proyecto de
				</h2>
			</div>

		<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
			{#each teamMembers as member}
				<article class="group overflow-hidden rounded-card border border-border bg-surface shadow-soft transition md:mx-auto md:w-full md:max-w-[24rem]">
					<div class="relative">
						<img src={member.image} alt={`Imagen de ${member.title}`} class="block h-auto w-full" loading="lazy" />

						{#if member.links.length > 0}
							<div
								class="pointer-events-none absolute inset-0 bg-[rgba(248,248,250,0.42)] opacity-0 transition duration-200 group-hover:opacity-100 group-focus-within:opacity-100"
							></div>
							<div
								class="absolute inset-x-0 bottom-4 flex justify-center gap-3 opacity-0 transition duration-200 group-hover:opacity-100 group-focus-within:opacity-100"
							>
								{#each member.links as link}
									<a
										href={link.href}
										target={link.href.startsWith('http') ? '_blank' : undefined}
										rel={link.href.startsWith('http') ? 'noopener noreferrer' : undefined}
										aria-label={link.label}
										title={link.label}
										class="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/60 bg-white/92 text-text-accent-purple no-underline shadow-soft transition hover:bg-white hover:text-brand-purple-dark hover:no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
									>
										<link.icon class="h-[1.05rem] w-[1.05rem]" aria-hidden="true" />
									</a>
								{/each}
							</div>
						{/if}
					</div>

					<div class="grid gap-2 p-4">
						<h3 class="m-0 font-ui text-[1rem] font-semibold leading-[1.3] text-brand-blue-dark">{member.title}</h3>
						<p class="m-0 text-[0.92rem] leading-[1.55] text-text-soft">{member.organizations.join(' | ')}</p>
						{#if member.summary}
							<p class="m-0 text-[0.96rem] leading-[1.62] text-text-main">{member.summary}</p>
						{/if}
					</div>
				</article>
			{/each}
		</div>
	</div>
</section>
