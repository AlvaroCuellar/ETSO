<script lang="ts">
	import ArrowUpRight from 'lucide-svelte/icons/arrow-up-right';
	import InfoCard from '$lib/components/ui/InfoCard.svelte';
	import InlineActionButton from '$lib/components/ui/InlineActionButton.svelte';
	import { formatConfidence, type CatalogWork, type AttributionSet, type Confidence } from '$lib/domain/catalog';
	import { renderInlineItalicsHtml } from '$lib/utils/render-inline-italics-html';

	interface Props {
		work: CatalogWork;
		showLink?: boolean;
	}

	let { work, showLink = true }: Props = $props();

	const normalizeText = (value: string): string =>
		value
			.normalize('NFD')
			.replace(/[\u0300-\u036f]/g, '')
			.toLowerCase()
			.trim();

	const connectorLabel = (connector: 'and' | 'or'): string => (connector === 'and' ? 'y' : 'o');

	const confidenceClass = (confidence?: Confidence): string => {
		if (confidence === 'segura') return 'bg-[#d4edda] text-[#155724]';
		if (confidence === 'probable') return 'bg-[#d1ecf1] text-[#0c5460]';
		if (confidence === 'posible') return 'bg-surface-accent-purple text-text-accent-purple';
		if (confidence === 'no_concluyente') return 'bg-[#fff3cd] text-[#856404]';
		return 'bg-surface-accent-purple text-text-accent-purple';
	};

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
					Atribución tradicional
				</dt>
				<dd class="m-0 font-ui text-[0.97rem] leading-[1.65] text-text-main">
					<div class="flex flex-col items-start gap-[0.65rem]">
						{#each work.traditionalAttribution.groups as group, groupIndex}
							<div class="flex flex-wrap items-center gap-3">
								{#each group.members as member, memberIndex}
									<a
										href={`/autores/${member.authorId}`}
										class="inline-flex items-baseline gap-1 font-medium text-brand-blue-dark no-underline hover:text-brand-blue hover:underline"
									>
										<span>{member.authorName}</span>
									</a>
									{#if memberIndex < group.members.length - 1}
										<span
											class="inline-flex rounded bg-surface-accent-purple px-[0.45rem] py-[0.2rem] text-[0.72rem] font-bold text-text-accent-purple lowercase"
											>y</span
										>
									{/if}
								{/each}
							</div>
							{#if groupIndex < work.traditionalAttribution.groups.length - 1}
								<span
									class="inline-flex rounded bg-surface-accent-purple px-[0.45rem] py-[0.2rem] text-[0.72rem] font-bold text-text-accent-purple lowercase"
								>
									{connectorLabel(work.traditionalAttribution.connector)}
								</span>
							{/if}
						{/each}
					</div>
				</dd>
			</div>
		{/if}

		{#if hasStylometryAttribution(work.stylometryAttribution)}
			<div class="grid content-start gap-1.5">
				<dt class="m-0 font-ui text-[0.72rem] font-bold uppercase tracking-[0.05em] text-text-soft">
					Atribución estilometría
				</dt>
				<dd class="m-0 font-ui text-[0.97rem] leading-[1.65] text-text-main">
					<div class="flex flex-col items-start gap-[0.65rem]">
						{#if work.stylometryAttribution.unresolved}
							<div class="flex flex-wrap items-center gap-3">
								<span class="font-medium italic text-text-soft">No apunta hacia ningún autor</span>
								<span
									class={`inline-flex rounded-full px-[0.55rem] py-[0.24rem] font-ui text-[0.72rem] font-bold leading-none tracking-[0.02em] uppercase ${confidenceClass('no_concluyente')}`}
								>
									No concluyente
								</span>
							</div>
						{/if}

						{#each work.stylometryAttribution.groups as group, groupIndex}
							<div class="flex flex-wrap items-center gap-3">
								{#each group.members as member, memberIndex}
									<a
										href={`/autores/${member.authorId}`}
										class="inline-flex items-baseline gap-1 font-medium text-brand-blue-dark no-underline hover:text-brand-blue hover:underline"
									>
										<span>{member.authorName}</span>
									</a>
									{#if member.confidence}
										<span
											class={`inline-flex rounded-full px-[0.55rem] py-[0.24rem] font-ui text-[0.72rem] font-bold leading-none tracking-[0.02em] uppercase ${confidenceClass(member.confidence)}`}
										>
											{formatConfidence(member.confidence)}
										</span>
									{/if}
									{#if memberIndex < group.members.length - 1}
										<span
											class="inline-flex rounded bg-surface-accent-purple px-[0.45rem] py-[0.2rem] text-[0.72rem] font-bold text-text-accent-purple lowercase"
											>y</span
										>
									{/if}
								{/each}
							</div>
							{#if groupIndex < work.stylometryAttribution.groups.length - 1}
								<span
									class="inline-flex rounded bg-surface-accent-purple px-[0.45rem] py-[0.2rem] text-[0.72rem] font-bold text-text-accent-purple lowercase"
								>
									{connectorLabel(work.stylometryAttribution.connector)}
								</span>
							{/if}
						{/each}
					</div>
				</dd>
			</div>
		{/if}

		<div class="grid content-start gap-1.5">
			<dt class="m-0 font-ui text-[0.72rem] font-bold uppercase tracking-[0.05em] text-text-soft">
				Género
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
			<dd class="m-0 font-ui text-[0.97rem] leading-[1.65] text-text-main">
				{@html renderInlineItalicsHtml(procedeValue)}
			</dd>
		</div>
	</dl>
</InfoCard>
