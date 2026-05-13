<script lang="ts">
	import { formatConfidence, type AttributionSet, type Confidence } from '$lib/domain/catalog';
	import Breadcrumbs from '$lib/components/ui/Breadcrumbs.svelte';
	import InfoCard from '$lib/components/ui/InfoCard.svelte';
	import InlineActionButton from '$lib/components/ui/InlineActionButton.svelte';
	import PageHero from '$lib/components/ui/PageHero.svelte';
	import heroBg from '$lib/assets/heros/obra-bg.jpg';
	import AlignLeft from 'lucide-svelte/icons/align-left';
	import Archive from 'lucide-svelte/icons/archive';
	import BookOpen from 'lucide-svelte/icons/book-open';
	import Calendar from 'lucide-svelte/icons/calendar';
	import ChartLine from 'lucide-svelte/icons/chart-line';
	import ChevronRight from 'lucide-svelte/icons/chevron-right';
	import CircleCheck from 'lucide-svelte/icons/circle-check';
	import Drama from 'lucide-svelte/icons/drama';
	import ExternalLink from 'lucide-svelte/icons/external-link';
	import { formatDisplayWorkTitle, formatDisplayWorkTitleList } from '$lib/utils/format-display-work-title';
	import { renderInlineItalicsHtml } from '$lib/utils/render-inline-italics-html';

	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	const displayWorkTitle = $derived.by(() => formatDisplayWorkTitle(data.work.title));
	const displayTitleVariants = $derived.by(() => formatDisplayWorkTitleList(data.work.titleVariants));

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

	const hasAnyAttribution = (): boolean =>
		hasTraditionalAttribution(data.work.traditionalAttribution) ||
		hasStylometryAttribution(data.work.stylometryAttribution);

	const hasTextAccess = (): boolean => data.work.textLinks.length > 0;
	const hasShortSummary = (): boolean => {
		const shortText = data.work.shortSummary.trim();
		return shortText.length > 0 && shortText !== 'Sin resumen breve disponible.';
	};
	const attributionBlockClass = 'mb-4 grid gap-3 rounded-[10px] bg-surface-subtle px-[0.85rem] py-[0.85rem] last:mb-0 md:px-4 md:py-4';
	const attributionHeadingClass =
		'm-0 font-ui text-[0.8rem] font-bold uppercase tracking-[0.04em] text-text-accent-purple';
	const actionLinkClass =
		'grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-[0.65rem] rounded-lg border-0 bg-white px-[0.85rem] py-3 text-inherit no-underline transition hover:bg-surface-accent-blue hover:no-underline';
</script>

{#snippet textAccessActions()}
	{#if hasTextAccess()}
		{#each data.work.textLinks as link}
			<a
				href={link.href}
				class={actionLinkClass}
				target={link.external ? '_blank' : undefined}
				rel={link.external ? 'noopener noreferrer' : undefined}
			>
				<div class="inline-flex items-center justify-center text-brand-blue" aria-hidden="true">
					{#if link.kind === 'bicuve'}
						<BookOpen class="h-[0.9rem] w-[0.9rem] stroke-2" />
					{:else}
						<ExternalLink class="h-[0.9rem] w-[0.9rem] stroke-2" />
					{/if}
				</div>
				<div class="min-w-0 justify-self-start text-left">
					{#if link.kind === 'bicuve'}
						<div class="text-[0.93rem] font-semibold text-brand-blue-dark">{link.label}</div>
						<div class="text-[0.78rem] text-text-soft">BICUVE</div>
					{:else}
						<div class="text-[0.93rem] font-semibold text-brand-blue-dark">Leer texto</div>
						<div class="text-[0.78rem] text-text-soft">{link.label}</div>
					{/if}
				</div>
				<div class="text-text-accent-purple" aria-hidden="true">
					<ChevronRight class="h-[0.78rem] w-[0.78rem] stroke-2" />
				</div>
			</a>
		{/each}
	{:else}
		<p class="m-0 rounded-lg border border-border bg-surface px-4 py-3.5 text-[0.92rem] text-text-soft">
			No hay acceso al texto disponible para esta obra.
		</p>
	{/if}
{/snippet}

<div class="grid gap-6">
	<Breadcrumbs
		items={[
			{ label: 'Inicio', href: '/' },
			{ label: 'Examen de autorías', href: '/examen-autorias' },
			{ label: 'Obras', href: '/examen-autorias/obras' },
			{ label: displayWorkTitle }
		]}
	/>

	<PageHero
		compact
		eyebrow="Ficha de obra"
		title={displayWorkTitle}
		subtitle={displayTitleVariants.length ? displayTitleVariants.join(' | ') : undefined}
		backgroundImage={heroBg}
	/>

	<div class="mx-auto w-full max-w-[1280px] px-[0.35rem] font-ui md:px-0">
		<div class="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(19rem,24rem)]">
			<div class="min-w-0">
				<InfoCard label="Atribución de autoría" class="mb-5" bodyClass="gap-0 font-ui leading-[1.5]">
					{#snippet action()}
						{#if data.informe}
							<InlineActionButton href={`/informes/${data.informe.slug}`} icon={ChartLine}>
								Informe estilométrico
							</InlineActionButton>
						{/if}
					{/snippet}

						{#if hasTraditionalAttribution(data.work.traditionalAttribution)}
							<div class={attributionBlockClass}>
								<h3 class={attributionHeadingClass}>Atribución tradicional</h3>
								<div class="text-[0.97rem] leading-[1.6] text-text-main">
									<div class="flex flex-col items-start gap-[0.65rem]">
										{#each data.work.traditionalAttribution.groups as group, groupIndex}
											<div class="flex flex-wrap items-center gap-3">
												{#each group.members as member, memberIndex}
													<a
														href={`/autores/${member.authorId}`}
														class="font-medium text-brand-blue-dark no-underline hover:text-brand-blue hover:underline"
														>{member.authorName}</a
													>
													{#if memberIndex < group.members.length - 1}
														<span
															class="inline-flex rounded bg-surface-accent-purple px-[0.45rem] py-[0.2rem] text-[0.72rem] font-bold text-text-accent-purple lowercase"
															>y</span
														>
													{/if}
												{/each}
											</div>
											{#if groupIndex < data.work.traditionalAttribution.groups.length - 1}
												<span
													class="inline-flex rounded bg-surface-accent-purple px-[0.45rem] py-[0.2rem] text-[0.72rem] font-bold text-text-accent-purple lowercase"
												>
													{connectorLabel(data.work.traditionalAttribution.connector)}
												</span>
											{/if}
										{/each}
									</div>
								</div>
							</div>
						{/if}

						{#if hasStylometryAttribution(data.work.stylometryAttribution)}
							<div class={attributionBlockClass}>
								<h3 class={attributionHeadingClass}>Atribución estilometría</h3>
								<div class="text-[0.97rem] leading-[1.6] text-text-main">
									<div class="flex flex-col items-start gap-[0.65rem]">
										{#if data.work.stylometryAttribution.unresolved}
											<div class="flex flex-wrap items-center gap-3">
												<span class="font-medium italic text-text-soft">Autoría no determinada</span>
												<span
													class="inline-flex rounded-full px-[0.55rem] py-[0.24rem] text-[0.72rem] font-bold tracking-[0.02em] uppercase {confidenceClass('no_concluyente')}"
												>
													No concluyente
												</span>
											</div>
										{/if}

										{#each data.work.stylometryAttribution.groups as group, groupIndex}
											<div class="flex flex-wrap items-center gap-3">
												{#each group.members as member, memberIndex}
													<a
														href={`/autores/${member.authorId}`}
														class="font-medium text-brand-blue-dark no-underline hover:text-brand-blue hover:underline"
														>{member.authorName}</a
													>
													{#if member.confidence}
														<span
															class={`inline-flex rounded-full px-[0.55rem] py-[0.24rem] text-[0.72rem] font-bold tracking-[0.02em] uppercase ${confidenceClass(member.confidence)}`}
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
											{#if groupIndex < data.work.stylometryAttribution.groups.length - 1}
												<span
													class="inline-flex rounded bg-surface-accent-purple px-[0.45rem] py-[0.2rem] text-[0.72rem] font-bold text-text-accent-purple lowercase"
												>
													{connectorLabel(data.work.stylometryAttribution.connector)}
												</span>
											{/if}
										{/each}
									</div>
								</div>
							</div>
						{/if}

						{#if !hasAnyAttribution()}
							<div
								class="rounded-lg border border-border-accent-blue bg-surface-accent-blue px-4 py-3.5 text-[0.92rem] text-text-main"
							>
								No hay información de autoría disponible.
							</div>
						{/if}
				</InfoCard>

				<InfoCard id="resumen-automatico" label="Resumen automático de la obra" class="mb-5">
					{#snippet action()}
						{#if data.work.hasSummaryFile}
							<InlineActionButton href={`/obras/${data.work.slug}/resumen`} icon={AlignLeft}>
								Resumen completo
							</InlineActionButton>
						{/if}
					{/snippet}

					{#if hasShortSummary()}
						<p>{data.work.shortSummary}</p>
					{:else if data.work.hasSummaryFile}
						<p class="italic text-text-soft">
							No hay resumen breve disponible. Puedes consultar el resumen automático completo.
						</p>
					{:else}
						<p class="italic text-text-soft">No hay resumen disponible para esta obra.</p>
					{/if}
				</InfoCard>

			</div>

			<aside class="min-w-0">
				<InfoCard label="Acceso al texto" class="mb-5" bodyClass="font-ui leading-[1.5]">
					<div class="grid gap-2.5">
						{@render textAccessActions()}
					</div>
				</InfoCard>

				<InfoCard label="Información de la obra" class="lg:sticky lg:top-[calc(2rem+68px)]" bodyClass="font-ui leading-[1.5]">
					<dl class="m-0">
							<div class="flex flex-col gap-[0.45rem] border-b border-border py-[0.9rem] first:pt-0 last:border-b-0 last:pb-0">
								<dt
									class="m-0 flex items-center gap-[0.35rem] text-[0.77rem] font-semibold tracking-[0.03em] text-text-accent-purple uppercase"
								>
									<Drama class="h-[0.82rem] w-[0.82rem] text-text-accent-purple stroke-2" aria-hidden="true" />
									Género
								</dt>
								<dd class="m-0 text-[0.96rem] text-text-main">{data.work.genre}</dd>
							</div>

							<div class="flex flex-col gap-[0.45rem] border-b border-border py-[0.9rem] first:pt-0 last:border-b-0 last:pb-0">
								<dt
									class="m-0 flex items-center gap-[0.35rem] text-[0.77rem] font-semibold tracking-[0.03em] text-text-accent-purple uppercase"
								>
									<CircleCheck class="h-[0.82rem] w-[0.82rem] text-text-accent-purple stroke-2" aria-hidden="true" />
									Estado del texto
								</dt>
								<dd class="m-0 text-[0.96rem] text-text-main">{data.work.textState}</dd>
							</div>

							<div class="flex flex-col gap-[0.45rem] border-b border-border py-[0.9rem] first:pt-0 last:border-b-0 last:pb-0">
								<dt
									class="m-0 flex items-center gap-[0.35rem] text-[0.77rem] font-semibold tracking-[0.03em] text-text-accent-purple uppercase"
								>
									<Archive class="h-[0.82rem] w-[0.82rem] text-text-accent-purple stroke-2" aria-hidden="true" />
									Procedencia
								</dt>
								<dd class="m-0 text-[0.96rem] text-text-main">
									{@html renderInlineItalicsHtml(data.work.origin)}
								</dd>
							</div>

							<div class="flex flex-col gap-[0.45rem] border-b border-border py-[0.9rem] first:pt-0 last:border-b-0 last:pb-0">
								<dt
									class="m-0 flex items-center gap-[0.35rem] text-[0.77rem] font-semibold tracking-[0.03em] text-text-accent-purple uppercase"
								>
									<Calendar class="h-[0.82rem] w-[0.82rem] text-text-accent-purple stroke-2" aria-hidden="true" />
									Fecha de adición
								</dt>
								<dd class="m-0 text-[0.96rem] text-text-main">{data.work.addedOn}</dd>
							</div>
					</dl>
				</InfoCard>
			</aside>
		</div>
	</div>
</div>
