<script lang="ts">
	import { page } from '$app/state';
	import { DEFAULT_LOCALE, translateText } from '$lib/i18n';
	import ArrowUpRight from 'lucide-svelte/icons/arrow-up-right';
	import InfoCard from '$lib/components/ui/InfoCard.svelte';
	import InlineActionButton from '$lib/components/ui/InlineActionButton.svelte';
	import { isPersonAuthor, type CatalogWork, type AttributionSet } from '$lib/domain/catalog';
	import { renderInlineItalicsHtml } from '$lib/utils/render-inline-italics-html';
	import { buildStylometryResultParts } from '$lib/utils/stylometry-result';
	import { buildTraditionalAttributionParts, type AuthorReference } from '$lib/utils/traditional-attribution-phrase';

	interface Props {
		work: CatalogWork;
		showLink?: boolean;
		resultAuthors?: AuthorReference[];
	}

	let { work, showLink = true, resultAuthors = [] }: Props = $props();

	const normalizeText = (value: string): string =>
		value
			.normalize('NFD')
			.replace(/[\u0300-\u036f]/g, '')
			.toLowerCase()
			.trim();

	const t = (value: string): string => translateText(page.data.locale ?? DEFAULT_LOCALE, value);

	const resultAndLabel = (): string => {
		const labels: Record<string, string> = { es: 'y', en: 'and', fr: 'et', pt: 'e', it: 'e', de: 'und', zh: '和', ja: 'および', ko: '및', ru: 'и', ar: 'و' };
		return labels[page.data.locale ?? DEFAULT_LOCALE] ?? labels.es;
	};
	const resultParts = $derived.by(() => work.inAuthorshipExam
		? buildStylometryResultParts({ ...work, result2: undefined }, { translate: t, andLabel: resultAndLabel() }, resultAuthors)
		: []);


	const hasTraditionalAttribution = (set: AttributionSet): boolean => !set.unresolved && set.groups.length > 0;
	const hasStylometryAttribution = (set: AttributionSet): boolean =>
		Boolean(set.unresolved || set.groups.length > 0);

	const procedeValue = $derived.by(() => {
		const origin = work.origin?.trim();
		if (!origin || normalizeText(origin) === 'no disponible') return 'No disponible.';
		const cleaned = origin
			.replace(/^procede\s+de\s+/i, '')
			.replace(/^procede\s+/i, '')
			.trim();
		if (!cleaned) return 'No disponible.';
		return cleaned.endsWith('.') ? cleaned : `${cleaned}.`;
	});
</script>

<InfoCard label="Metadatos de la obra" bodyClass="gap-0">
	{#snippet action()}
		{#if showLink}
			<InlineActionButton href={`/obras/${work.slug}`} icon={ArrowUpRight} iconMotion="diagonal">
				Ficha obra
			</InlineActionButton>
		{/if}
	{/snippet}

	<dl class="m-0 grid gap-x-8 gap-y-4 md:grid-cols-2">
		{#if hasTraditionalAttribution(work.traditionalAttribution)}
			<div class="grid content-start gap-1.5">
				<dt class="m-0 font-ui text-[0.72rem] font-bold uppercase tracking-[0.05em] text-text-soft">
					{!work.inAuthorshipExam ? 'Autoría' : work.collectionSize ? 'Autores de la colección' : 'Atribución tradicional'}
				</dt>
				<dd class="m-0 font-ui text-[0.97rem] leading-[1.65] text-text-main">
					{#if !work.traditionalAttribution.reviewedPhrase && work.collectionSize && new Set(work.traditionalAttribution.groups.flatMap((group) => group.members.map((member) => member.authorId))).size > 1}<span>Varios</span>{:else}<p class="m-0 break-words leading-relaxed" data-i18n-skip>{#each buildTraditionalAttributionParts(work.traditionalAttribution) as part}{#if work.inAuthorshipExam && part.kind === 'author' && part.authorId && isPersonAuthor(part.authorId)}<a href={`/autores/${part.authorId}`} class="font-medium text-brand-blue-dark no-underline hover:text-brand-blue hover:underline">{part.value}</a>{:else}{part.value}{/if}{/each}</p>{/if}
				</dd>
			</div>
		{/if}

		{#if work.inAuthorshipExam && (hasStylometryAttribution(work.stylometryAttribution) || resultParts.length > 0)}
			<div class="grid content-start gap-1.5">
				<dt class="m-0 font-ui text-[0.72rem] font-bold uppercase tracking-[0.05em] text-text-soft">
					Atribución estilométrica
				</dt>
				<dd class="m-0 font-ui text-[0.97rem] leading-[1.65] text-text-main">

				{#if work.inAuthorshipExam && resultParts.length > 0}
					<p data-stylometry-result class="m-0 whitespace-pre-line break-words leading-relaxed" data-i18n-skip>{#each resultParts as part}{#if part.kind === 'author' && part.authorId && isPersonAuthor(part.authorId)}<a href={`/autores/${part.authorId}`} class="font-medium text-brand-blue-dark no-underline hover:text-brand-blue hover:underline">{part.value}</a>{:else}{part.value}{/if}{/each}</p>
				{/if}
				</dd>
			</div>
		{/if}



		{#if !work.inAuthorshipExam}
		<div class="grid content-start gap-1.5">
			<dt class="m-0 font-ui text-[0.72rem] font-bold uppercase tracking-[0.05em] text-text-soft">Género</dt>
			<dd class="m-0 font-ui text-[0.97rem] leading-[1.65] text-text-main">{work.generalGenre || 'Teatro'}</dd>
		</div>
		{/if}
		<div class="grid content-start gap-1.5">
			<dt class="m-0 font-ui text-[0.72rem] font-bold uppercase tracking-[0.05em] text-text-soft">
				{work.inAuthorshipExam ? 'Género' : 'Subgénero'}
			</dt>
			<dd class="m-0 font-ui text-[0.97rem] leading-[1.65] text-text-main">{work.genre}</dd>
		</div>

		<div class="grid content-start gap-1.5">
			<dt class="m-0 font-ui text-[0.72rem] font-bold uppercase tracking-[0.05em] text-text-soft">
				Estado del texto
			</dt>
			<dd class="m-0 font-ui text-[0.97rem] leading-[1.65] text-text-main">
				{work.textState}
			</dd>
		</div>

		<div class="grid content-start gap-1.5">
			<dt class="m-0 font-ui text-[0.72rem] font-bold uppercase tracking-[0.05em] text-text-soft">
				Procedencia
			</dt>
			<dd class="m-0 font-ui text-[0.97rem] leading-[1.65] text-text-main" data-i18n-skip={procedeValue !== 'No disponible.' || undefined}>
				{@html renderInlineItalicsHtml(procedeValue)}
			</dd>
		</div>
	</dl>
</InfoCard>
