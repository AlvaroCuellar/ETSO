<script lang="ts">
	import { onMount } from 'svelte';
	import ChevronLeft from 'lucide-svelte/icons/chevron-left';
	import ChevronRight from 'lucide-svelte/icons/chevron-right';
	import SeoHead from '$lib/components/seo/SeoHead.svelte';
	import TeamProfileCard from '$lib/components/ui/TeamProfileCard.svelte';
	import estilometriaHero from '$lib/assets/heros/estilometria.webp';
	import texoroHero from '$lib/assets/heros/texoro.webp';
	import bitesoHero from '$lib/assets/heros/biblioteca.webp';
	import resumenesHero from '$lib/assets/heros/resumenes.webp';
	import grafoImage from '$lib/assets/heros/grafo.webp';
	import redEstilometricaImage from '$lib/assets/heros/red-estilometrica.svg';
	import informesImage from '$lib/assets/heros/informes.webp';
	import librosHero from '$lib/assets/heros/libros.webp';
	import fondoEscritura from '$lib/assets/fondos/fondo-escritura.webp';
	import { createWebPageJsonLd, SITE_NAME } from '$lib/seo';

	interface HomeSlide {
		image: string;
		title: string;
		description: string;
		alt: string;
		link?: string;
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
	}

	const slides: HomeSlide[] = [
		{
			image: estilometriaHero,
			title: 'Examen de autorías',
			description: 'Consulta los informes estilométricos de 3000 obras teatrales del Siglo de Oro',
			alt: 'Visualización de análisis estilométrico del proyecto ETSO',
			link: '/examen-autorias'
		},
		{
			image: texoroHero,
			title: 'TEXORO',
			description: 'Realiza búsquedas textuales complejas en un corpus del Siglo de Oro de 38 millones de palabras',
			alt: 'Interfaz de búsqueda textual de TEXORO',
			link: '/texoro'
		},
		{
			image: bitesoHero,
			title: 'BITESO',
			description: 'Consulta más de 1500 textos digitales del Siglo de Oro en acceso abierto',
			alt: 'Biblioteca digital BITESO',
			link: '/biteso'
		},
		{
			image: resumenesHero,
			title: 'Resúmenes automáticos',
			description: 'Consulta los resúmenes automáticos de todas las obras de la base de datos',
			alt: 'Resúmenes automáticos de las obras',
			link: '/resumenes'
		}
		,
		{
			image: redEstilometricaImage,
			title: 'Red estilométrica',
			description: 'Visualiza la red de relaciones estilométricas para las 3000 obras del corpus',
			alt: 'Red estilométrica del proyecto ETSO',
			link: '/red-obras'
		}
	];

	const teamMembers: TeamMember[] = [
		{
			title: 'Álvaro Cuéllar',
			organizations: ['Universitat Autònoma de Barcelona'],
			summary: '',
			image: '/images/colaboradores/FotoAlvaroCuellar.webp',
			links: [
				{
					label: 'Correo de Álvaro Cuéllar',
					href: 'mailto:alvaro.cuellar@uab.cat'
				},
				{
					label: 'Web de Álvaro Cuéllar',
					href: 'https://www.alvarocuellar.com/'
				}
			]
		},
		{
			title: 'Germán Vega García-Luengos',
			organizations: ['Universidad de Valladolid'],
			summary: '',
			image: '/images/colaboradores/FotoGermanVega.webp',
			links: [
				{
					label: 'Correo de Germán Vega García-Luengos',
					href: 'mailto:german.vega@uva.es'
				}
			]
		}
	];

	const AUTOPLAY_MS = 7000;
	const HOME_DESCRIPTION =
		'Estilometría aplicada al teatro del Siglo de Oro: examen de autorías, TEXORO, BITESO, resúmenes automáticos y recursos digitales para la investigación.';
	const homeJsonLd = createWebPageJsonLd({
		title: SITE_NAME,
		description: HOME_DESCRIPTION,
		path: '/'
	});
	let activeIndex = $state(0);
	let autoplayHandle: ReturnType<typeof setInterval> | null = null;
	let prefersReducedMotion = false;
	let carouselTouchStartX = 0;
	let carouselTouchStartY = 0;

	const normalizeSlideIndex = (index: number): number => (index + slides.length) % slides.length;

	const goToSlide = (nextIndex: number): void => {
		const normalizedIndex = normalizeSlideIndex(nextIndex);
		activeIndex = normalizedIndex;
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
			goToSlide(activeIndex + 1);
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

	const handleCarouselTouchStart = (event: TouchEvent): void => {
		const touch = event.changedTouches[0];
		if (!touch) return;
		carouselTouchStartX = touch.clientX;
		carouselTouchStartY = touch.clientY;
	};

	const handleCarouselTouchEnd = (event: TouchEvent): void => {
		const touch = event.changedTouches[0];
		if (!touch) return;
		const deltaX = touch.clientX - carouselTouchStartX;
		const deltaY = touch.clientY - carouselTouchStartY;
		if (Math.abs(deltaX) < 48 || Math.abs(deltaX) < Math.abs(deltaY) * 1.25) return;
		stopAutoplay();
		if (deltaX < 0) {
			goToNext();
		} else {
			goToPrevious();
		}
		startAutoplay();
	};

	onMount(() => {
		prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		startAutoplay();

		return () => {
			stopAutoplay();
		};
	});
</script>

<SeoHead title={SITE_NAME} description={HOME_DESCRIPTION} path="/" jsonLd={homeJsonLd} />

<svelte:window onkeydown={handleCarouselKeydown} />

<section
	class="group relative left-1/2 right-1/2 w-[100dvw] max-w-[100dvw] -translate-x-1/2 overflow-hidden"
	aria-label="Secciones destacadas de ETSO"
>
	<div
		class="relative h-[56vh] min-h-[25rem] w-full max-h-[44rem] [touch-action:pan-y]"
		role="group"
		aria-label="Carrusel de secciones destacadas"
		ontouchstart={handleCarouselTouchStart}
		ontouchend={handleCarouselTouchEnd}
	>
		<div
			class="absolute inset-0 flex transition-transform duration-700 ease-out"
			style={`transform: translateX(-${activeIndex * 100}%);`}
		>
			{#each slides as slide, index}
				<article class="relative h-full min-w-full">
					<img
						src={slide.image}
						alt={slide.alt}
						class="h-full w-full object-cover"
						loading={index === 0 ? 'eager' : 'lazy'}
						fetchpriority={index === 0 ? 'high' : 'low'}
						decoding="async"
					/>
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

								{#if slide.link}
									<div class="mt-8">
										<a
											href={slide.link}
											class="inline-flex items-center rounded-card border border-white/60 bg-white/15 px-6 py-3 font-ui text-[0.95rem] font-semibold tracking-[0.03em] text-white no-underline transition hover:bg-white/25 hover:no-underline"
										>
											Acceder
										</a>
									</div>
								{/if}
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
				El proyecto
				<a
					href="https://etso.es/"
					class="font-bold text-brand-blue-dark no-underline hover:underline"
				>
					ETSO: Estilometría aplicada al Teatro del Siglo de Oro
				</a>
				surge del interés del investigador
				<a
					href="https://www.alvarocuellar.com/"
					class="font-bold text-brand-blue-dark no-underline hover:underline"
				>
					Álvaro Cuéllar
				</a>
				(Universitat Autònoma de Barcelona) y del catedrático
				<a
					href="https://literaturaespanola.uva.es/german-jose-vega-garcia-luengos/"
					class="font-bold text-brand-blue-dark no-underline hover:underline"
				>
					Germán Vega García-Luengos
				</a>
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
				en
				<a
					href="/informes/analisis-estilometrico-la-dama-boba"
					class="font-bold italic text-brand-blue-dark no-underline hover:underline"
				>
					La dama boba
				</a>,
				<a
					href="/informes/analisis-estilometrico-don-gil-de-las-calzas-verdes"
					class="font-bold italic text-brand-blue-dark no-underline hover:underline"
				>
					Don Gil de las calzas verdes
				</a>
				o
				<a
					href="/informes/analisis-estilometrico-el-medico-de-su-honra-el-celoso-de-su-honra"
					class="font-bold italic text-brand-blue-dark no-underline hover:underline"
				>
					El médico de su honra
				</a>, y también casos en los que la estilometría apunta hacia una autoría inesperada y potencialmente esclarecedora, como en
				<a
					href="/informes/analisis-estilometrico-la-francesa-laura"
					class="font-bold italic text-brand-blue-dark no-underline hover:underline"
				>
					La francesa Laura
				</a>,
				<a
					href="/informes/analisis-estilometrico-la-monja-alferez"
					class="font-bold italic text-brand-blue-dark no-underline hover:underline"
				>
					La monja alférez
				</a>
				o
				<a
					href="/informes/analisis-estilometrico-la-puerta-macarena-primera-parte"
					class="font-bold italic text-brand-blue-dark no-underline hover:underline"
				>
					La puerta Macarena (primera parte)
				</a>. Debemos tener en cuenta que las nuevas
				atribuciones aquí señaladas son meros indicios de autoría arrojados por el proceso informático de forma
				automática. Todos los casos deben ser estudiados pormenorizadamente desde la filología atendiendo a sus
				complejidades particulares.
			</p>
		</div>
	</div>
</section>

<section class="relative left-1/2 right-1/2 mt-6 w-[100dvw] max-w-[100dvw] -translate-x-1/2 md:left-auto md:right-auto md:mx-auto md:w-full md:max-w-7xl md:translate-x-0 md:p-6 lg:p-8">
	<div class="grid items-stretch gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,35%)] lg:gap-8">
		<div class="grid gap-4 rounded-card bg-brand-blue px-5 py-6 text-white shadow-soft md:px-7 md:py-7 lg:px-8 lg:py-8">
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

		<div class="min-h-[18rem] overflow-hidden md:min-h-[24rem] lg:min-h-full">
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
	class="relative left-1/2 right-1/2 mt-8 w-[100dvw] max-w-[100dvw] -translate-x-1/2 overflow-hidden bg-cover bg-center bg-no-repeat"
	style={`background-image: linear-gradient(rgba(0, 38, 129, 0.52), rgba(0, 38, 129, 0.52)), url('${fondoEscritura}')`}
>
	<div class="mx-auto w-full max-w-7xl px-4 py-14 text-left text-white sm:px-5 md:py-16 md:text-center lg:px-6 lg:py-20">
		<div class="mx-auto max-w-5xl">
			<h2 class="font-ui text-[clamp(1.6rem,3.2vw,2.5rem)] leading-[1.15] font-bold">
				TEXORO: Textos del Siglo de Oro
			</h2>
			<p class="mt-3 font-ui text-[clamp(1rem,1.6vw,1.28rem)] font-medium">Búsquedas textuales en 3000 obras del Siglo de Oro</p>

			<div class="mt-8 grid gap-5 text-left font-reading text-[1.03rem] leading-[1.72] text-white/95 md:text-center">
				<p class="m-0">
					TEXORO es una plataforma de búsqueda textual que permite consultar de forma unificada un amplio corpus de obras del Siglo de Oro. El recurso reúne cerca de 3000 textos, con más de 38 millones de palabras indexadas y obras de más de 400 autores, y ofrece distintas posibilidades para explorar el patrimonio literario aurisecular desde criterios léxicos, textuales y documentales.
				</p>
				<p class="m-0">
					El buscador permite localizar palabras, frases exactas y patrones con comodines, así como realizar consultas avanzadas mediante la combinación de términos, condiciones de proximidad y filtros por título, género, atribución tradicional, atribución estilométrica o estado del texto. De este modo, TEXORO facilita tanto búsquedas puntuales como exploraciones más complejas sobre la presencia, distribución y relación de palabras o expresiones en el conjunto del corpus.
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

<section class="mx-auto mt-8 w-full max-w-7xl px-2 md:px-6 lg:px-8">
	<div class="relative overflow-hidden rounded-card bg-neutral-100 px-5 py-6 text-brand-blue-dark md:px-7 md:py-8 lg:px-10 lg:py-10">
		<img
			src={librosHero}
			alt=""
			aria-hidden="true"
			class="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-[0.26]"
			loading="lazy"
		/>
		<div
			class="pointer-events-none absolute inset-0"
			style="background-image: linear-gradient(rgba(243, 244, 246, 0.58), rgba(243, 244, 246, 0.58));"
		></div>

		<div class="relative z-10 grid content-start gap-5">
			<div class="grid gap-2">
				<h2 class="m-0 font-ui text-[clamp(1.6rem,3.2vw,2.5rem)] leading-[1.15] font-bold">
					BITESO
				</h2>
				<p class="m-0 font-ui text-[clamp(1rem,1.6vw,1.28rem)] font-medium text-brand-blue">
					Textos digitales del Siglo de Oro en acceso abierto
				</p>
			</div>

			<div class="grid max-w-6xl gap-4 text-[1.03rem] leading-[1.72] text-text-soft">
				<p class="m-0">
					BITESO reúne y pone en acceso abierto una amplia colección de textos digitales del Siglo de Oro. El recurso nace, en buena medida, de las transcripciones automáticas de impresos y manuscritos realizadas para los análisis estilométricos de autoría, así como de materiales revisados, facilitados o contrastados gracias a la colaboración de distintos especialistas. Su objetivo es ofrecer a la comunidad un punto de acceso sencillo a textos que, en muchos casos, permanecían contenidos en documentos antiguos, de difícil manejo o lectura.
				</p>
				<p class="m-0">
					Los textos incorporados a BITESO no aspiran a sustituir a las ediciones críticas ni presentan siempre la misma calidad ecdótica. Además, en su estado actual no incluyen los nombres de los personajes ni las acotaciones escénicas, sino únicamente los versos limpios de cada obra. Sin embargo, constituyen materiales útiles para la lectura, la consulta, la docencia, la investigación filológica y la exploración computacional del patrimonio literario aurisecular. Con este recurso se quiere favorecer la circulación abierta de estos materiales y facilitar nuevas formas de acceso al teatro y a la literatura del Siglo de Oro.
				</p>
			</div>

			<div class="pt-1">
				<a
					href="/biteso"
					class="inline-flex items-center rounded-card border border-border bg-white/85 px-6 py-3 font-ui text-[0.95rem] font-semibold tracking-[0.03em] text-text-soft no-underline transition hover:bg-surface-soft hover:text-text-main hover:no-underline"
				>
					BITESO
				</a>
			</div>
		</div>
	</div>
</section>

<section class="mx-auto mt-8 w-full max-w-7xl p-5 md:p-6 lg:p-8">
	<div class="grid gap-5 text-left text-[1.03rem] leading-[1.72] text-text-soft md:text-center">
		<h2 class="m-0 font-ui text-[clamp(1.6rem,3.2vw,2.5rem)] leading-[1.15] font-bold text-brand-blue-dark">
			¿Cómo te podemos ayudar? ¿Cómo nos puedes ayudar?
		</h2> 
		<p class="m-0">
			Podemos ayudarte a explorar los distintos recursos disponibles para el estudio del teatro y la literatura del Siglo de Oro. En Examen de autorías se pueden consultar los informes estilométricos de las obras incorporadas al corpus, con indicios sobre sus posibles relaciones de autoría. TEXORO permite realizar búsquedas textuales sobre cerca de 3000 obras y más de 38 millones de palabras, con opciones para localizar palabras, frases, patrones, combinaciones de términos y relaciones de proximidad. BITESO ofrece acceso abierto a textos digitales procedentes, en buena medida, de transcripciones automáticas de impresos y manuscritos. Además, los resúmenes automáticos permiten obtener una primera orientación sobre el argumento y el contenido de las obras, siempre como ayuda inicial y no como sustituto de la lectura o del análisis filológico.
		</p>
		<p class="m-0">
			También puedes colaborar con nosotros enviándonos textos del Siglo de Oro que todavía no estén incorporados a nuestros recursos, información bibliográfica, noticias sobre atribuciones, datos sobre testimonios o cualquier material que pueda mejorar el conjunto. La colaboración de investigadores, docentes y especialistas resulta fundamental para seguir ampliando, revisando y corrigiendo la información disponible. Por ello, si encuentras errores, erratas, problemas en los textos, fallos en los resúmenes automáticos o datos que puedan precisarse mejor, te agradeceremos que nos envíes tus sugerencias de corrección. Citar nuestros recursos en publicaciones, trabajos académicos o actividades docentes también nos ayuda a difundir el proyecto y a obtener el apoyo necesario para mantenerlo y ampliarlo.
		</p>
		<div class="pt-1">
			<a
				href="/contacto"
				class="inline-flex items-center rounded-card border border-brand-blue/25 bg-brand-blue px-5 py-2.5 font-ui text-[0.92rem] font-semibold text-white no-underline transition hover:bg-brand-blue-dark hover:no-underline"
			>
				Contacta con nosotros
			</a>
		</div>
	</div>
</section>

<section class="mx-auto mt-8 w-full max-w-7xl p-5 md:p-6 lg:p-8">
		<div class="grid gap-4">
			<div class="grid gap-1 text-left md:text-center">
				<h2 class="m-0 font-ui text-[clamp(1.4rem,2.6vw,2rem)] font-semibold leading-[1.2] text-brand-blue-dark">
					ETSO es un proyecto de
				</h2>
			</div>

		<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
			{#each teamMembers as member}
				<TeamProfileCard
					title={member.title}
					image={member.image}
					organizations={member.organizations}
					summary={member.summary}
					links={member.links}
				/>
			{/each}
		</div>
	</div>
</section>
