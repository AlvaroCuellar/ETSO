<script lang="ts">
	import Breadcrumbs from '$lib/components/ui/Breadcrumbs.svelte';
	import CitationSuggestionCard from '$lib/components/ui/CitationSuggestionCard.svelte';
	import LegalCard from '$lib/components/ui/LegalCard.svelte';
	import PageHero from '$lib/components/ui/PageHero.svelte';
	import bicuveLogo from '$lib/assets/logos/bicuve.png';
	import byNcLogo from '$lib/assets/logos/by-nc.svg';
	import {
		formatDisplayWorkTitle,
		formatPrefixedDisplayWorkTitleHtml
	} from '$lib/utils/format-display-work-title';
	import { renderInlineItalicsHtml } from '$lib/utils/render-inline-italics-html';

	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	const displayWorkTitle = $derived.by(() => formatDisplayWorkTitle(data.work.title));
	const displayBicuveTitle = $derived.by(() => `Texto digital de ${displayWorkTitle}`);
	const displayBicuveTitleHtml = $derived.by(() =>
		formatPrefixedDisplayWorkTitleHtml('Texto digital de', data.work.title)
	);

	interface TextSegment {
		id?: string;
		label?: string;
		text: string;
		type: 'text' | 'jornada';
	}

	const jornadaPattern = /^\s*--(?<label>[^-].*?)--\s*$/;

	const normalizeJornadaLabel = (value: string): string => value.replace(/\s+/g, ' ').trim();

	const buildTextSegments = (text: string): TextSegment[] => {
		const segments: TextSegment[] = [];
		const pendingText: string[] = [];
		let jornadaIndex = 0;

		for (const line of text.split(/\r?\n/)) {
			const match = line.match(jornadaPattern);
			const label = match?.groups?.label ? normalizeJornadaLabel(match.groups.label) : '';

			if (!label) {
				pendingText.push(line);
				continue;
			}

			const previousText = pendingText.join('\n').trim();
			if (previousText) {
				segments.push({
					type: 'text',
					text: previousText
				});
			}
			pendingText.length = 0;

			jornadaIndex += 1;
			segments.push({
				type: 'jornada',
				id: `jornada-${jornadaIndex}`,
				label,
				text: line
			});
		}

		const finalText = pendingText.join('\n').trim();
		if (finalText) {
			segments.push({
				type: 'text',
				text: finalText
			});
		}

		return segments;
	};

	const textSegments = $derived.by(() => buildTextSegments(data.bicuve.text));
	const jornadaMarks = $derived.by(() =>
		textSegments.filter(
			(segment): segment is TextSegment & { id: string; label: string } =>
				segment.type === 'jornada' && Boolean(segment.id) && Boolean(segment.label)
		)
	);
</script>

<div class="grid gap-6">
	<Breadcrumbs
		items={[
			{ label: 'Inicio', href: '/' },
			{ label: 'BICUVE', href: '/bicuve' },
			{ label: displayWorkTitle }
		]}
	/>

	<PageHero compact eyebrow="Texto digital" title={displayBicuveTitle} titleHtml={displayBicuveTitleHtml} />

	<section class="grid gap-5 max-md:gap-4">
		<div class="grid w-full gap-2">
			<p class="font-ui text-[0.8rem] font-bold uppercase tracking-[0.04em] text-brand-blue-dark">PROCEDENCIA</p>
			<p class="text-base leading-[1.6] text-text-main">
				{@html renderInlineItalicsHtml(data.work.origin)}
			</p>
		</div>

		<div class="grid w-full grid-cols-1 gap-3 min-[980px]:grid-cols-2 min-[980px]:items-stretch">
			<LegalCard label="Aviso" class="h-full">
				<p>
					Puede incluir errores u omisiones. Si dispones de una edición mejor, te agradecemos que contactes
					con nosotros para incorporar actualizaciones.
				</p>
			</LegalCard>

			<LegalCard label="Licencia" class="h-full">
				<p>
					Este contenido se ofrece bajo la licencia Creative Commons CC BY-NC 4.0. Reutilización permitida
					con cita; usos comerciales no permitidos.
				</p>
				<a
					class="inline-flex w-fit items-center"
					href="https://creativecommons.org/licenses/by-nc/4.0/deed.es"
					target="_blank"
					rel="noopener noreferrer"
					aria-label="Ver detalles de la licencia Creative Commons CC BY-NC 4.0"
				>
					<img src={byNcLogo} alt="Licencia Creative Commons CC BY-NC 4.0" width="110" height="39" />
				</a>
			</LegalCard>
		</div>

		<CitationSuggestionCard class="w-full" citation={data.citation} allowHtml />

		<div class="grid place-items-center pt-2">
			<img src={bicuveLogo} alt="Logo BICUVE" class="h-auto w-[min(24rem,78vw)]" />
		</div>

		<h2 class="mt-1 text-center font-ui text-[0.95rem] font-bold uppercase tracking-[0.08em] text-brand-blue-dark">
			{displayWorkTitle.toLocaleUpperCase('es-ES')}
		</h2>

		<div class="grid gap-5 lg:grid-cols-[11rem_minmax(0,1fr)] lg:items-start lg:gap-8">
			<nav
				class="hidden font-ui lg:sticky lg:top-[calc(5rem+68px)] lg:block"
				aria-label="Navegación del texto BICUVE"
			>
				<div class="grid gap-2 border-l-2 border-border-accent-blue pl-3">
					<a
						href="#bicuve-text-start"
						class="text-[0.78rem] font-bold uppercase tracking-[0.04em] text-brand-blue-dark no-underline hover:underline"
					>
						Inicio
					</a>
					{#each jornadaMarks as mark}
						<a
							href={`#${mark.id}`}
							class="text-[0.82rem] leading-[1.3] text-text-soft no-underline transition hover:text-brand-blue-dark hover:underline"
						>
							{mark.label}
						</a>
					{/each}
				</div>
			</nav>

			<div
				id="bicuve-text-start"
				class="mx-auto grid w-full max-w-[82ch] scroll-mt-28 gap-4 px-0 font-reading text-base leading-[1.8] text-text-main md:px-[clamp(0.5rem,2.8vw,2.25rem)]"
			>
				{#each textSegments as segment}
					{#if segment.type === 'jornada'}
						<h3
							id={segment.id}
							class="mt-8 mb-4 scroll-mt-28 border-y border-border-accent-blue bg-surface-accent-blue px-4 py-3 text-center font-ui text-[0.9rem] font-bold uppercase tracking-[0.08em] text-brand-blue-dark"
						>
							{segment.label}
						</h3>
					{:else}
						<p class="m-0 whitespace-pre-wrap">{segment.text}</p>
					{/if}
				{/each}
			</div>
		</div>
	</section>
</div>
