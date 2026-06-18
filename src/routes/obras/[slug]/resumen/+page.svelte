<script lang="ts">
	import { onMount } from 'svelte';
	import Breadcrumbs from '$lib/components/ui/Breadcrumbs.svelte';
	import CitationSuggestionCard from '$lib/components/ui/CitationSuggestionCard.svelte';
	import InlineActionButton from '$lib/components/ui/InlineActionButton.svelte';
	import LegalCard from '$lib/components/ui/LegalCard.svelte';
	import PageHero from '$lib/components/ui/PageHero.svelte';
	import SeoHead from '$lib/components/seo/SeoHead.svelte';
	import heroBg from '$lib/assets/heros/obra-bg.jpg';
	import { formatPublicationDate } from '$lib/resource-publication-dates';
	import { formatDisplayWorkTitle } from '$lib/utils/format-display-work-title';
	import Download from 'lucide-svelte/icons/download';

	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	const displayWorkTitle = $derived.by(() => formatDisplayWorkTitle(data.work.title));
	const summaryPublicationDateLabel = $derived.by(() => {
		const labels = {
			es: 'Fecha de publicación del resumen',
			en: 'Summary publication date',
			fr: 'Date de publication du résumé',
			pt: 'Data de publicação do resumo',
			it: 'Data di pubblicazione del riassunto',
			de: 'Veröffentlichungsdatum der Zusammenfassung',
			zh: '摘要发布日期',
			ja: '要約の公開日',
			ko: '요약 공개일',
			ru: 'Дата публикации краткого содержания',
			ar: 'تاريخ نشر الملخص'
		} as const;
		return labels[data.locale] ?? labels.es;
	});
	const hasPublishedOn = $derived(data.publishedOn.trim().length > 0);
	const formattedPublishedOn = $derived.by(() => formatPublicationDate(data.publishedOn, data.locale));
	const seoDescription = $derived.by(() => {
		const descriptions = {
			es: `Resumen automático de ${displayWorkTitle}, obra del corpus de ETSO, como ayuda inicial para conocer su argumento y contenido.`,
			en: `Automatic summary of ${displayWorkTitle}, a work in the ETSO corpus, offered as a preliminary aid to understand its plot and content.`,
			fr: `Résumé automatique de ${displayWorkTitle}, œuvre du corpus ETSO, proposé comme aide préliminaire pour connaître son intrigue et son contenu.`,
			pt: `Resumo automático de ${displayWorkTitle}, obra do corpus do ETSO, oferecido como auxílio inicial para conhecer seu enredo e conteúdo.`,
			it: `Riassunto automatico di ${displayWorkTitle}, opera del corpus ETSO, offerto come aiuto preliminare per conoscerne trama e contenuto.`,
			de: `Automatische Zusammenfassung von ${displayWorkTitle}, einem Werk des ETSO-Korpus, als erste Orientierung zum Verständnis von Handlung und Inhalt.`,
			zh: `${displayWorkTitle} 的自动摘要，属于 ETSO 语料库作品，可作为了解情节和内容的初步辅助。`,
			ja: `${displayWorkTitle} の自動要約。ETSO コーパスの作品で、筋と内容を把握するための初期的な補助として提供されます。`,
			ko: `${displayWorkTitle}의 자동 요약입니다. ETSO 말뭉치 작품의 줄거리와 내용을 파악하기 위한 예비적 도움으로 제공됩니다.`,
			ru: `Автоматическое краткое содержание ${displayWorkTitle}, произведения корпуса ETSO, как предварительная помощь для понимания сюжета и содержания.`,
			ar: `ملخص آلي لعمل ${displayWorkTitle} من corpus ETSO، يقدَّم بوصفه مساعدة أولية لفهم الحبكة والمحتوى.`
		} as const;
		return descriptions[data.locale] ?? descriptions.es;
	});
	let summary = $state({
		resumenBreve: [] as string[],
		resumenLargo: [] as string[],
		personajes: [] as Array<{ nombre: string; descripcion: string }>,
		espacios: [] as Array<{ nombre: string; descripcion: string }>,
		tematicas: [] as Array<{ tema: string; descripcion: string }>
	});
	let summaryLoading = $state(true);
	let summaryError = $state('');
	const resumenBreveText = $derived(summary.resumenBreve.join(' ').replace(/\s+/g, ' ').trim());

	const summaryCitation =
		'Cuéllar, Álvaro. "Resúmenes asistidos por modelos de lenguaje para un vasto corpus de obras literarias del Siglo de Oro". En: <i>El teatro del Siglo de Oro en el horizonte de las humanidades digitales</i>. Peter Lang, 2026 (en prensa).';
	const summaryCitationPlainText = $derived(
		summaryCitation
			.replace(/<[^>]+>/g, '')
			.replace(/&nbsp;/g, ' ')
			.replace(/\s+/g, ' ')
			.trim()
	);
	const downloadFilename = $derived(`${data.work.slug || 'resumen-automatico'}-resumen.txt`);
	const hasDownloadableSummary = $derived(
		summary.resumenBreve.length > 0 ||
			summary.resumenLargo.length > 0 ||
			summary.personajes.length > 0 ||
			summary.espacios.length > 0 ||
			summary.tematicas.length > 0
	);

	const buildDownloadedSummaryText = (): string => {
		const lines: string[] = [
			'Gracias por descargar este resumen automático de ETSO.',
			'Si utilizas este resumen en una publicación, trabajo académico o material docente, por favor cita la siguiente referencia:',
			'',
			summaryCitationPlainText,
			'',
			`Obra resumida: ${displayWorkTitle}`
		];
		if (hasPublishedOn) {
			lines.push(`Fecha de publicación del resumen: ${formattedPublishedOn}`);
		}
		lines.push(
			`Texto descargado desde ETSO: https://etso.es/obras/${data.work.slug}/resumen`,
			'',
			'----------------------------------------',
			''
		);

		if (summary.resumenBreve.length > 0) {
			lines.push('RESUMEN AUTOMÁTICO BREVE', '');
			lines.push(resumenBreveText, '');
		}

		if (summary.resumenLargo.length > 0) {
			lines.push('RESUMEN AUTOMÁTICO AMPLIO', '');
			lines.push(...summary.resumenLargo.flatMap((paragraph) => [paragraph, '']));
		}

		if (summary.personajes.length > 0) {
			lines.push('PERSONAJES PRINCIPALES', '');
			for (const item of summary.personajes) {
				lines.push([item.nombre, item.descripcion].filter(Boolean).join(': '));
			}
			lines.push('');
		}

		if (summary.espacios.length > 0) {
			lines.push('ESPACIOS PRINCIPALES', '');
			for (const item of summary.espacios) {
				lines.push([item.nombre, item.descripcion].filter(Boolean).join(': '));
			}
			lines.push('');
		}

		if (summary.tematicas.length > 0) {
			lines.push('TEMÁTICAS PRINCIPALES', '');
			for (const item of summary.tematicas) {
				lines.push([item.tema, item.descripcion].filter(Boolean).join(': '));
			}
			lines.push('');
		}

		return lines.join('\n').replace(/\n{4,}/g, '\n\n\n').trimEnd() + '\n';
	};

	const downloadSummary = () => {
		const blob = new Blob([buildDownloadedSummaryText()], {
			type: 'text/plain;charset=utf-8'
		});
		const url = URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.href = url;
		link.download = downloadFilename;
		document.body.append(link);
		link.click();
		link.remove();
		URL.revokeObjectURL(url);
	};

	const normalizeNamedItems = (rows: unknown): Array<{ nombre: string; descripcion: string }> =>
		Array.isArray(rows)
			? rows
					.map((row) => ({
						nombre:
							row && typeof row === 'object' && typeof (row as { nombre?: unknown }).nombre === 'string'
								? (row as { nombre: string }).nombre.trim()
								: '',
						descripcion:
							row &&
							typeof row === 'object' &&
							typeof (row as { descripcion?: unknown }).descripcion === 'string'
								? (row as { descripcion: string }).descripcion.trim()
								: ''
					}))
					.filter((row) => row.nombre || row.descripcion)
			: [];

	const normalizeThemeItems = (rows: unknown): Array<{ tema: string; descripcion: string }> =>
		Array.isArray(rows)
			? rows
					.map((row) => ({
						tema:
							row && typeof row === 'object' && typeof (row as { tema?: unknown }).tema === 'string'
								? (row as { tema: string }).tema.trim()
								: '',
						descripcion:
							row &&
							typeof row === 'object' &&
							typeof (row as { descripcion?: unknown }).descripcion === 'string'
								? (row as { descripcion: string }).descripcion.trim()
								: ''
					}))
					.filter((row) => row.tema || row.descripcion)
			: [];

	onMount(() => {
		void (async () => {
			try {
				const response = await fetch(data.summaryUrl);
				if (!response.ok) {
					throw new Error(`No se pudo cargar el resumen desde R2: ${response.status}`);
				}
				const parsed = (await response.json()) as Record<string, unknown>;
				summary = {
					resumenBreve: Array.isArray(parsed.resumen_breve)
						? parsed.resumen_breve
								.map((paragraph) => (typeof paragraph === 'string' ? paragraph.trim() : ''))
								.filter(Boolean)
						: [],
					resumenLargo: Array.isArray(parsed.resumen_largo)
						? parsed.resumen_largo
								.map((paragraph) => (typeof paragraph === 'string' ? paragraph.trim() : ''))
								.filter(Boolean)
						: [],
					personajes: normalizeNamedItems(parsed.personajes_principales),
					espacios: normalizeNamedItems(parsed.espacios_principales),
					tematicas: normalizeThemeItems(parsed.tematicas_principales)
				};
			} catch (cause) {
				summaryError = cause instanceof Error ? cause.message : 'No se pudo cargar el resumen desde R2';
			} finally {
				summaryLoading = false;
			}
		})();
	});
</script>

<SeoHead
	title={`Resumen automático de ${displayWorkTitle}`}
	description={seoDescription}
	path={`/obras/${data.work.slug}/resumen`}
/>

<div class="grid gap-6">
	<Breadcrumbs
		items={[
			{ label: 'Inicio', href: '/' },
			{ label: 'Examen de autorías', href: '/examen-autorias' },
			{ label: 'Obras', href: '/examen-autorias/obras' },
			{ label: displayWorkTitle, href: `/obras/${data.work.slug}` },
			{ label: 'Resumen automático' }
		]}
	/>

	<div class="mx-auto grid w-full max-w-[1280px] gap-6">
		<PageHero compact eyebrow="Resumen automático" title={displayWorkTitle} backgroundImage={heroBg} />

		<section class="grid gap-3" aria-label="Aviso y cita">
			{#if hasPublishedOn}
				<p class="m-0 font-ui text-[0.92rem] font-semibold text-text-soft" data-i18n-skip>
					{summaryPublicationDateLabel}: {formattedPublishedOn}
				</p>
			{/if}

			<LegalCard label="Aviso" class="w-full">
				<p>
					A continuación se ofrece un resumen automático no revisado de la obra, generado con ChatGPT
					(modelo 5.4) a partir del texto disponible. Puede incluir errores y omisiones. Si detectas
					problemas o incoherencias, te agradecemos que contactes con nosotros para incorporar
					actualizaciones.
				</p>
			</LegalCard>

			<CitationSuggestionCard class="w-full" citation={summaryCitation} allowHtml />

			<div class="flex min-w-0 max-w-full justify-end">
				<InlineActionButton
					type="button"
					icon={Download}
					disabled={summaryLoading || !hasDownloadableSummary}
					ariaLabel="Descargar resumen en TXT"
					title="Descargar TXT"
					onclick={downloadSummary}
				>
					Descargar TXT
				</InlineActionButton>
			</div>
		</section>

		<div class="grid gap-8">
			<section class="grid gap-3">
				<h2 class="m-0 text-[1.25rem] font-semibold leading-[1.2] text-brand-blue-dark">Resumen automático breve</h2>
				{#if summaryLoading}
					<p class="m-0 italic text-[#546b82]">Cargando resumen...</p>
				{:else if summaryError}
					<p class="m-0 rounded-[9px] border border-[#f3c0ca] bg-[#fff5f7] px-3 py-2 text-[#8f1e36]">{summaryError}</p>
				{:else if summary.resumenBreve.length > 0}
					<p class="m-0 text-base leading-[1.68] text-[#2f465c]">{resumenBreveText}</p>
				{:else}
					<p class="m-0 italic text-[#546b82]">No disponible.</p>
				{/if}
			</section>

			<section class="grid gap-3">
				<h2 class="m-0 text-[1.25rem] font-semibold leading-[1.2] text-brand-blue-dark">Resumen automático amplio</h2>
				{#if summaryLoading}
					<p class="m-0 italic text-[#546b82]">Cargando resumen...</p>
				{:else if summaryError}
					<p class="m-0 rounded-[9px] border border-[#f3c0ca] bg-[#fff5f7] px-3 py-2 text-[#8f1e36]">{summaryError}</p>
				{:else if summary.resumenLargo.length > 0}
					<div class="grid gap-3">
						{#each summary.resumenLargo as paragraph}
							<p class="m-0 text-base leading-[1.68] text-[#2f465c]">{paragraph}</p>
						{/each}
					</div>
				{:else}
					<p class="m-0 italic text-[#546b82]">No disponible.</p>
				{/if}
			</section>

			<section class="grid gap-3">
				<h2 class="m-0 text-[1.25rem] font-semibold leading-[1.2] text-brand-blue-dark">Personajes principales</h2>
				{#if summary.personajes.length > 0}
					<div class="grid gap-2">
						{#each summary.personajes as item}
							<article class="border-b border-[rgba(0,51,167,0.14)] py-2 last:border-b-0">
								{#if item.nombre}
									<h3 class="m-0 mb-1 text-base font-semibold leading-[1.28] text-[#20354b]">{item.nombre}</h3>
								{/if}
								{#if item.descripcion}
									<p class="m-0 leading-[1.62] text-[#355069]">{item.descripcion}</p>
								{/if}
							</article>
						{/each}
					</div>
				{:else}
					<p class="m-0 italic text-[#546b82]">No disponible.</p>
				{/if}
			</section>

			<section class="grid gap-3">
				<h2 class="m-0 text-[1.25rem] font-semibold leading-[1.2] text-brand-blue-dark">Espacios principales</h2>
				{#if summary.espacios.length > 0}
					<div class="grid gap-2">
						{#each summary.espacios as item}
							<article class="border-b border-[rgba(0,51,167,0.14)] py-2 last:border-b-0">
								{#if item.nombre}
									<h3 class="m-0 mb-1 text-base font-semibold leading-[1.28] text-[#20354b]">{item.nombre}</h3>
								{/if}
								{#if item.descripcion}
									<p class="m-0 leading-[1.62] text-[#355069]">{item.descripcion}</p>
								{/if}
							</article>
						{/each}
					</div>
				{:else}
					<p class="m-0 italic text-[#546b82]">No disponible.</p>
				{/if}
			</section>

			<section class="grid gap-3">
				<h2 class="m-0 text-[1.25rem] font-semibold leading-[1.2] text-brand-blue-dark">Temáticas principales</h2>
				{#if summary.tematicas.length > 0}
					<div class="grid gap-2">
						{#each summary.tematicas as item}
							<article class="border-b border-[rgba(0,51,167,0.14)] py-2 last:border-b-0">
								{#if item.tema}
									<h3 class="m-0 mb-1 text-base font-semibold leading-[1.28] text-[#20354b]">{item.tema}</h3>
								{/if}
								{#if item.descripcion}
									<p class="m-0 leading-[1.62] text-[#355069]">{item.descripcion}</p>
								{/if}
							</article>
						{/each}
					</div>
				{:else}
					<p class="m-0 italic text-[#546b82]">No disponible.</p>
				{/if}
			</section>
		</div>
	</div>
</div>
