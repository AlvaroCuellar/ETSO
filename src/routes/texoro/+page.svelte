<script lang="ts">
	import Breadcrumbs from '$lib/components/ui/Breadcrumbs.svelte';
	import fondoLogo from '$lib/assets/fondos/fondo-logo.png';
	import BookOpen from 'lucide-svelte/icons/book-open';
	import Feather from 'lucide-svelte/icons/feather';
</script>

<div class="grid gap-6">
	<Breadcrumbs items={[{ label: 'Inicio', href: '/' }, { label: 'TEXORO' }]} />

	<section
		class="grid items-start gap-[2.1rem] rounded-[14px] bg-[#ececf0] p-[clamp(1.2rem,2.4vw,2rem)] [background-repeat:no-repeat,no-repeat] [background-size:auto,min(130vw,720px)_auto] [background-position:center,right_-120px_bottom_-35px] md:[background-size:auto,min(90vw,680px)_auto] md:[background-position:center,right_-80px_bottom_-58px] min-[1201px]:grid-cols-[minmax(0,1.9fr)_minmax(320px,1fr)] min-[1201px]:[background-size:auto,min(60vw,860px)_auto] min-[1201px]:[background-position:center,right_-56px_bottom_-66px]"
		style={`background-image: linear-gradient(100deg, rgba(239,240,244,0.95) 0%, rgba(236,237,242,0.88) 46%, rgba(236,237,242,0.52) 70%, rgba(236,237,242,0.22) 100%), url('${fondoLogo}')`}
	>
		<div class="flex flex-col">
			<h1 class="mb-0 mt-0 font-ui text-[clamp(2rem,4.3vw,2.85rem)] leading-[1.05] font-bold text-[#0033a7]">TEXORO</h1>
			<p class="mt-[1.05rem] mb-0 max-w-none font-ui text-[clamp(1.28rem,2.2vw,1.78rem)] leading-[1.22] font-semibold text-[#003aa5] min-[1201px]:max-w-[25ch]">
				Búsquedas textuales en 3000 obras del Siglo de Oro
			</p>
			<p class="mt-[1.8rem] mb-0 max-w-[64ch] font-['Lora',serif] text-[1.01rem] leading-[1.62] text-[#17293f]">
				TEXORO es una plataforma de búsqueda textual que permite consultar de forma unificada una amplia colección de textos del Siglo de Oro. El sistema ofrece acceso directo a obras teatrales y otros textos literarios procedentes de distintas tradiciones editoriales y documentales, con el objetivo de facilitar la exploración, localización y análisis del patrimonio textual aurisecular.
			</p>
			<p class="mt-[1.25rem] mb-0 max-w-[64ch] font-['Lora',serif] text-[1.01rem] leading-[1.62] text-[#17293f]">
				La plataforma permite realizar búsquedas por palabras y expresiones en el conjunto del corpus, localizando ocurrencias concretas y mostrando sus contextos de aparición. Los textos han sido normalizados y procesados para garantizar una consulta homogénea, independientemente de su procedencia o del soporte original.
			</p>
			<p class="mt-[1.25rem] mb-0 max-w-[64ch] font-['Lora',serif] text-[1.01rem] leading-[1.62] text-[#17293f]">
				TEXORO integra materiales procedentes de fuentes abiertas, proyectos de investigación y transcripciones automáticas de impresos y manuscritos antiguos. El corpus se encuentra en constante ampliación y está concebido como una herramienta de apoyo tanto para la investigación filológica y literaria como para la docencia y la divulgación especializada.
			</p>
		</div>

		<div
			class="grid w-full max-w-[420px] grid-cols-1 content-center items-end gap-[1.05rem] self-center justify-self-center md:max-w-[520px] md:grid-cols-2 md:justify-self-start min-[1201px]:max-w-[420px] min-[1201px]:justify-self-center"
			aria-label="Indicadores de TEXORO"
		>
			<article
				class="flex min-h-[170px] flex-col items-start gap-[0.65rem] rounded-[10px] border border-[rgba(6,33,93,0.08)] bg-[rgba(249,249,251,0.88)] px-[1.1rem] pb-[1.1rem] pt-[1.35rem] shadow-[0_8px_20px_rgba(25,37,77,0.08)] lg:-translate-y-[14px]"
			>
				<div class="inline-flex h-[2.2rem] w-[2.2rem] items-center justify-center text-[#70006b]" aria-hidden="true">
					<BookOpen class="h-[1.9rem] w-[1.9rem] stroke-[2.2]" />
				</div>
				<div>
					<div class="text-[clamp(2rem,3vw,2.35rem)] leading-none font-bold text-[#0033a7]">--</div>
					<div class="font-['Roboto'] text-[1.04rem] font-medium text-[#1f2f45]">Contador 1</div>
				</div>
			</article>

			<article
				class="flex min-h-[170px] flex-col items-start gap-[0.65rem] rounded-[10px] border border-[rgba(6,33,93,0.08)] bg-[rgba(249,249,251,0.88)] px-[1.1rem] pb-[1.1rem] pt-[1.35rem] shadow-[0_8px_20px_rgba(25,37,77,0.08)] lg:translate-y-[14px]"
			>
				<div class="inline-flex h-[2.2rem] w-[2.2rem] items-center justify-center text-[#70006b]" aria-hidden="true">
					<Feather class="h-[1.9rem] w-[1.9rem] stroke-[2.2]" />
				</div>
				<div>
					<div class="text-[clamp(2rem,3vw,2.35rem)] leading-none font-bold text-[#0033a7]">--</div>
					<div class="font-['Roboto'] text-[1.04rem] font-medium text-[#1f2f45]">Contador 2</div>
				</div>
			</article>
		</div>
	</section>
</div>
