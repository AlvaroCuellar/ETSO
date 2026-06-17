<script lang="ts">
	import Download from 'lucide-svelte/icons/download';
	import Breadcrumbs from '$lib/components/ui/Breadcrumbs.svelte';
	import BibliographyEntryList from '$lib/components/ui/BibliographyEntryList.svelte';
	import InlineActionButton from '$lib/components/ui/InlineActionButton.svelte';
	import SeoHead from '$lib/components/seo/SeoHead.svelte';

	import type { ComoCitarnosBibliographySection } from '$lib/domain/catalog';
	import type { InformeBibliographyEntry } from '$lib/domain/catalog';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	const REPERCUSION_SEO_DESCRIPTION =
		'Selección de trabajos académicos que hacen uso de los resultados, recursos y materiales del proyecto ETSO.';
	const REPERCUSION_INTRO =
		'Esta página recoge una selección de trabajos que hacen uso de los resultados, recursos y materiales del proyecto ETSO. Incluye referencias vinculadas con la estilometría, la atribución de autoría, la transcripción automática, TEXORO y otros desarrollos derivados o relacionados con el proyecto.';
	const BIBTEX_FILENAME = 'etso-repercusion.bib';
	const RELATED_PROJECT_WORKS_TITLE_PATTERN = /^Trabajos relacionados con el proyecto\s*\((\d{4})\)$/;

	type YearSection = ComoCitarnosBibliographySection & { year: string };

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

	const relatedSections = $derived.by(() =>
		data.bibliography.sections
			.map((section): YearSection | null => {
				const year = section.title.match(RELATED_PROJECT_WORKS_TITLE_PATTERN)?.[1];
				if (!year) return null;
				return {
					...section,
					title: year,
					year
				};
			})
			.filter((section): section is YearSection => Boolean(section))
	);

	const totalReferences = $derived(
		relatedSections.reduce((count, section) => count + section.entries.length, 0)
	);

	const downloadableEntries = $derived.by(() => {
		const seen = new Set<string>();
		return relatedSections
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

<SeoHead title="Repercusión" description={REPERCUSION_SEO_DESCRIPTION} path="/repercusion" />

<div class="grid min-w-0 max-w-full gap-6 overflow-x-hidden">
	<Breadcrumbs
		items={[
			{ label: 'Inicio', href: '/' },
			{ label: 'Repercusión' }
		]}
	/>

	<section class="grid min-w-0 max-w-full gap-3 overflow-x-hidden">
		<h1
			class="m-0 text-[clamp(1.85rem,3vw,2.4rem)] font-bold leading-[1.12] text-brand-blue-dark"
		>
			Repercusión
		</h1>
		<p
			class="m-0 min-w-0 max-w-full break-words leading-[1.65] text-text-main [overflow-wrap:anywhere]"
		>
			{REPERCUSION_INTRO}
		</p>
		{#if totalReferences > 0}
			<p class="m-0 pt-1 text-center text-[0.92rem] font-medium text-text-soft">
				{totalReferences} referencias seleccionadas
			</p>
			<div class="mt-2 flex min-w-0 max-w-full justify-center">
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
		{/if}
	</section>

	{#if relatedSections.length === 0}
		<p class="m-0 italic text-text-soft">No hay referencias de repercusión disponibles.</p>
	{:else}
		<section
			class="grid min-w-0 max-w-full gap-5 overflow-x-hidden border-t border-border/70 pt-5"
			aria-label="Trabajos relacionados con el proyecto"
		>
			<div class="grid gap-9">
				{#each relatedSections as section}
					<section class="grid min-w-0 max-w-full gap-4 overflow-x-hidden" aria-label={section.year}>
						<div class="flex justify-center">
							<h3
								class="m-0 inline-flex min-w-[5rem] justify-center rounded-full border border-border-accent-blue bg-surface-accent-blue px-4 py-1.5 font-ui text-[1rem] font-semibold leading-[1.2] text-brand-blue-dark"
							>
								{section.year}
							</h3>
						</div>

						<BibliographyEntryList entries={section.entries} />
					</section>
				{/each}
			</div>
		</section>
	{/if}
</div>
