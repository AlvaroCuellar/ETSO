<script lang="ts">
	import Download from 'lucide-svelte/icons/download';
	import Breadcrumbs from '$lib/components/ui/Breadcrumbs.svelte';
	import BibliographyEntryList from '$lib/components/ui/BibliographyEntryList.svelte';
	import InlineActionButton from '$lib/components/ui/InlineActionButton.svelte';
	import SeoHead from '$lib/components/seo/SeoHead.svelte';

	import type { PageData } from './$types';
	import type { InformeBibliographyEntry } from '$lib/domain/catalog';

	let { data }: { data: PageData } = $props();
	const COMO_CITARNOS_SEO_DESCRIPTION =
		'Referencias bibliográficas recomendadas para citar ETSO, TEXORO, CETSO y los recursos del proyecto.';
	const BIBTEX_FILENAME = 'etso-referencias.bib';
	const RELATED_PROJECT_WORKS_TITLE_PATTERN = /^Trabajos relacionados con el proyecto\s*\((\d{4})\)$/;

	const normalizeBibtexKey = (value: string): string => {
		const normalized = value
			.normalize('NFD')
			.replace(/[\u0300-\u036f]/g, '')
			.replace(/[^A-Za-z0-9_-]+/g, '-')
			.replace(/^-+|-+$/g, '');
		return normalized || 'referencia';
	};

	const escapeBibtexValue = (value: string): string =>
		value
			.replace(/\\/g, '\\textbackslash{}')
			.replace(/[{}]/g, (match) => `\\${match}`)
			.replace(/\s+/g, ' ')
			.trim();

	const buildFallbackBibtex = (entry: InformeBibliographyEntry): string =>
		`@misc{${normalizeBibtexKey(entry.id)},\n  note = {${escapeBibtexValue(entry.text)}}\n}`;

	const citationSections = $derived(
		data.bibliography.sections.filter((section) => !RELATED_PROJECT_WORKS_TITLE_PATTERN.test(section.title))
	);

	const downloadableEntries = $derived.by(() => {
		const seen = new Set<string>();
		return citationSections
			.flatMap((section) => section.entries)
			.filter((entry) => {
				if (seen.has(entry.id)) return false;
				seen.add(entry.id);
				return true;
			});
	});

	const bibtexContent = $derived(
		downloadableEntries.map((entry) => entry.bibtex ?? buildFallbackBibtex(entry)).join('\n\n')
	);

	const downloadBibtex = () => {
		if (!bibtexContent) return;

		const blob = new Blob([`${bibtexContent}\n`], {
			type: 'application/x-bibtex;charset=utf-8'
		});
		const url = URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.href = url;
		link.download = BIBTEX_FILENAME;
		document.body.append(link);
		link.click();
		link.remove();
		URL.revokeObjectURL(url);
	};
</script>

<SeoHead title="Cómo citarnos" description={COMO_CITARNOS_SEO_DESCRIPTION} path="/como-citarnos" />

<div class="grid min-w-0 max-w-full gap-6 overflow-x-hidden">
	<Breadcrumbs items={[{ label: 'Inicio', href: '/' }, { label: 'Cómo citarnos' }]} />

	<section class="grid min-w-0 max-w-full gap-3 overflow-x-hidden">
		<h1
			class="m-0 text-[clamp(1.85rem,3vw,2.4rem)] font-bold leading-[1.12] text-brand-blue-dark"
		>
			Cómo citarnos
		</h1>

		{#if data.bibliography.intro}
			<p
				class="m-0 min-w-0 max-w-full break-words leading-[1.65] text-text-main [overflow-wrap:anywhere]"
			>
				{data.bibliography.intro}
			</p>
		{/if}

		{#if citationSections.length === 0}
			<p class="m-0 italic text-text-soft">No hay referencias disponibles.</p>
		{:else}
			<div class="mt-2 flex min-w-0 max-w-full justify-end">
				<InlineActionButton
					type="button"
					disabled={downloadableEntries.length === 0}
					icon={Download}
					ariaLabel="Descargar todas las referencias en BibTeX"
					title="Descargar BibTeX"
					onclick={downloadBibtex}
				>
					Descargar BibTeX
				</InlineActionButton>
			</div>

			<div class="mt-2 grid min-w-0 max-w-full gap-7 overflow-x-hidden">
				{#each citationSections as section}
					<section
						class="grid min-w-0 max-w-full gap-3 overflow-x-hidden border-t border-border/70 pt-5 first:border-t-0 first:pt-0"
						aria-label={section.title}
					>
						<h2
							class="m-0 min-w-0 max-w-full break-words text-[1.25rem] font-semibold leading-[1.2] text-brand-blue-dark [overflow-wrap:anywhere]"
						>
							{section.title}
						</h2>

						{#if section.lead}
							<p
								class="m-0 min-w-0 max-w-full break-words text-[0.96rem] leading-[1.55] text-text-soft [overflow-wrap:anywhere]"
							>
								{section.lead}
							</p>
						{/if}

						<BibliographyEntryList entries={section.entries} />
					</section>
				{/each}
			</div>
		{/if}
	</section>
</div>
