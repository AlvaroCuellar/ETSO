<script lang="ts">
	import { formatConfidence, type AttributionSet, type Confidence } from '$lib/domain/catalog';
	import Breadcrumbs from '$lib/components/ui/Breadcrumbs.svelte';
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
	const hasAnySummary = (): boolean => Boolean(data.work.shortSummary || data.work.longSummary);

	const cardShellClass = 'mb-5 overflow-hidden rounded-[10px] border border-black/10 bg-white shadow-soft';
	const cardHeaderClass =
		'border-b border-border bg-surface-soft px-[0.85rem] py-[0.85rem] md:px-4 md:py-4';
	const cardTitleClass = 'm-0 text-base font-semibold text-text-main';
	const cardBodyClass = 'px-[0.85rem] py-[0.85rem] md:px-4 md:py-4';
	const actionLinkClass =
		'grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-[0.65rem] rounded-lg border border-border-accent-blue bg-white px-[0.85rem] py-3 text-inherit no-underline transition hover:border-border-accent-blue hover:bg-surface-accent-blue hover:no-underline';
</script>

<div class="grid gap-6">
	<Breadcrumbs
		items={[
			{ label: 'Inicio', href: '/' },
			{ label: 'Examen de autorías', href: '/examen-autorias' },
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
				<section class={cardShellClass}>
					<header class={cardHeaderClass}>
						<h2 class={cardTitleClass}>Atribución de autoría</h2>
					</header>
					<div class={cardBodyClass}>
						{#if hasTraditionalAttribution(data.work.traditionalAttribution)}
							<div
								class="mb-4 rounded-[10px] border border-border bg-surface p-[0.85rem] last:mb-0 md:p-4"
							>
								<div class="mb-3">
									<span
										class="inline-flex rounded-full bg-surface-accent-purple px-[0.7rem] py-[0.35rem] text-[0.76rem] font-bold tracking-[0.03em] text-text-accent-purple uppercase"
										>Atribución tradicional</span
									>
								</div>
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
							<div
								class="mb-4 rounded-[10px] border border-border-accent-blue bg-surface-accent-blue p-[0.85rem] last:mb-0 md:p-4"
							>
								<div class="mb-3">
									<span
										class="inline-flex rounded-full bg-brand-blue/[0.12] px-[0.7rem] py-[0.35rem] text-[0.76rem] font-bold tracking-[0.03em] text-brand-blue uppercase"
										>Atribución estilometría</span
									>
								</div>
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
					</div>
				</section>

				{#if data.informe}
					<section class={`${cardShellClass} lg:hidden`}>
						<header class={cardHeaderClass}>
							<h2 class={cardTitleClass}>Informe de análisis estilométrico</h2>
						</header>
						<div class={cardBodyClass}>
							<div class="flex flex-col gap-2.5">
								<a href={`/informes/${data.informe.id}`} class={actionLinkClass}>
									<div class="inline-flex items-center justify-center text-brand-blue" aria-hidden="true">
										<ChartLine class="h-[0.9rem] w-[0.9rem] stroke-2" />
									</div>
									<div class="min-w-0 justify-self-start text-left">
										<div class="text-[0.93rem] font-semibold text-brand-blue-dark">Informe</div>
										<div class="text-[0.78rem] text-text-soft">Ver análisis completo</div>
									</div>
									<div class="text-text-accent-purple" aria-hidden="true">
										<ChevronRight class="h-[0.78rem] w-[0.78rem] stroke-2" />
									</div>
								</a>
							</div>
						</div>
					</section>
				{/if}

				<section class={cardShellClass} id="resumen-automatico">
					<header class={cardHeaderClass}>
						<h2 class={cardTitleClass}>Resumen automático de la obra</h2>
					</header>
					<div class={cardBodyClass}>
						{#if hasAnySummary()}
							<div class="mb-4">
								<div
									class="[&>p]:m-0 grid gap-[0.85rem] font-reading text-base leading-[1.65] text-text-main"
								>
									{#if data.work.shortSummary}
										<p>{data.work.shortSummary}</p>
									{/if}
								</div>
							</div>

							{#if data.work.longSummary}
								<div class="mt-4">
									<a href={`/obras/${data.work.slug}/resumen`} class={actionLinkClass}>
										<div class="inline-flex items-center justify-center text-brand-blue" aria-hidden="true">
											<AlignLeft class="h-[0.9rem] w-[0.9rem] stroke-2" />
										</div>
										<div class="min-w-0 justify-self-start text-left">
											<div class="text-[0.93rem] font-semibold text-brand-blue-dark">
												Leer resumen automático completo
											</div>
											<div class="text-[0.78rem] text-text-soft">Descripción extensa de la obra</div>
										</div>
										<div class="text-text-accent-purple" aria-hidden="true">
											<ChevronRight class="h-[0.78rem] w-[0.78rem] stroke-2" />
										</div>
									</a>
								</div>
							{/if}
						{:else}
							<div
								class="rounded-lg border border-border-accent-blue bg-surface-accent-blue px-4 py-3.5 text-[0.92rem] text-text-main"
							>
								No hay resumen disponible para esta obra.
							</div>
						{/if}
					</div>
				</section>

				<section class={`${cardShellClass} lg:hidden`}>
					<header class={cardHeaderClass}>
						<h3 class={cardTitleClass}>Acceso al texto</h3>
					</header>
					<div class={cardBodyClass}>
						{#if hasTextAccess()}
							{#each data.work.textLinks as link}
								<a
									href={link.href}
									class={`${actionLinkClass} mb-2.5 last:mb-0`}
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
							<div class="rounded-lg border border-border bg-surface px-4 py-3.5 text-[0.92rem] text-text-soft">
								No hay acceso al texto disponible para esta obra.
							</div>
						{/if}
					</div>
				</section>
			</div>

			<aside class="min-w-0">
				{#if data.informe}
					<section class={`${cardShellClass} hidden lg:block`}>
						<header class={cardHeaderClass}>
							<h3 class={cardTitleClass}>Informe de análisis estilométrico</h3>
						</header>
						<div class={cardBodyClass}>
							<div class="flex flex-col gap-2.5">
								<a href={`/informes/${data.informe.id}`} class={actionLinkClass}>
									<div class="inline-flex items-center justify-center text-brand-blue" aria-hidden="true">
										<ChartLine class="h-[0.9rem] w-[0.9rem] stroke-2" />
									</div>
									<div class="min-w-0 justify-self-start text-left">
										<div class="text-[0.93rem] font-semibold text-brand-blue-dark">Informe</div>
										<div class="text-[0.78rem] text-text-soft">Ver análisis completo</div>
									</div>
									<div class="text-text-accent-purple" aria-hidden="true">
										<ChevronRight class="h-[0.78rem] w-[0.78rem] stroke-2" />
									</div>
								</a>
							</div>
						</div>
					</section>
				{/if}

				<section class={`${cardShellClass} hidden lg:block`}>
					<header class={cardHeaderClass}>
						<h3 class={cardTitleClass}>Acceso al texto</h3>
					</header>
					<div class={cardBodyClass}>
						{#if hasTextAccess()}
							{#each data.work.textLinks as link}
								<a
									href={link.href}
									class={`${actionLinkClass} mb-2.5 last:mb-0`}
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
							<div class="rounded-lg border border-border bg-surface px-4 py-3.5 text-[0.92rem] text-text-soft">
								No hay acceso al texto disponible para esta obra.
							</div>
						{/if}
					</div>
				</section>

				<section class={`${cardShellClass} lg:sticky lg:top-[calc(2rem+68px)]`}>
					<header class={cardHeaderClass}>
						<h3 class={cardTitleClass}>Información de la obra</h3>
					</header>
					<div class={cardBodyClass}>
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
					</div>
				</section>
			</aside>
		</div>
	</div>
</div>
