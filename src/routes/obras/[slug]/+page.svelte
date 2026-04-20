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

	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const connectorLabel = (connector: 'and' | 'or'): string => (connector === 'and' ? 'y' : 'o');

	const confidenceClass = (confidence?: Confidence): string => {
		if (confidence === 'segura') return 'bg-[#d4edda] text-[#155724]';
		if (confidence === 'probable') return 'bg-[#d1ecf1] text-[#0c5460]';
		if (confidence === 'posible') return 'bg-[#e9ecef] text-[#495057]';
		if (confidence === 'no_concluyente') return 'bg-[#fff3cd] text-[#856404]';
		return 'bg-[#e9ecef] text-[#495057]';
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
	const cardHeaderClass = 'border-b border-black/5 bg-[#f8f9fa] px-[0.85rem] py-[0.85rem] md:px-4 md:py-4';
	const cardTitleClass = 'm-0 text-base font-semibold text-[#343a40]';
	const cardBodyClass = 'px-[0.85rem] py-[0.85rem] md:px-4 md:py-4';
	const actionLinkClass =
		'grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-[0.65rem] rounded-lg border border-brand-blue/20 bg-white px-[0.85rem] py-3 text-inherit no-underline transition hover:border-brand-blue/35 hover:bg-[#f6f9ff] hover:no-underline';
</script>

<div class="grid gap-6">
	<Breadcrumbs
		items={[
			{ label: 'Inicio', href: '/' },
			{ label: 'Examen de autorías', href: '/examen-autorias' },
			{ label: data.work.title }
		]}
	/>

	<PageHero
		compact
		eyebrow="Ficha de obra"
		title={data.work.title}
		subtitle={data.work.titleVariants.length ? data.work.titleVariants.join(' | ') : undefined}
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
								class="mb-4 rounded-[10px] border border-[#e9ecef] bg-[linear-gradient(to_right,rgba(108,117,125,0.06),transparent)] p-[0.85rem] last:mb-0 md:p-4"
							>
								<div class="mb-3">
									<span
										class="inline-flex rounded-full bg-[#6c757d]/15 px-[0.7rem] py-[0.35rem] text-[0.76rem] font-bold tracking-[0.03em] text-[#495057] uppercase"
										>Atribución tradicional</span
									>
								</div>
								<div class="text-[0.97rem] leading-[1.6] text-[#495057]">
									<div class="flex flex-col items-start gap-[0.65rem]">
										{#each data.work.traditionalAttribution.groups as group, groupIndex}
											<div class="flex flex-wrap items-center gap-3">
												{#each group.members as member, memberIndex}
													<a
														href={`/autores/${member.authorId}`}
														class="font-medium text-[#343a40] no-underline hover:text-brand-blue hover:underline"
														>{member.authorName}</a
													>
													{#if memberIndex < group.members.length - 1}
														<span
															class="inline-flex rounded bg-[#ecf0f1] px-[0.45rem] py-[0.2rem] text-[0.72rem] font-bold text-[#555] lowercase"
															>y</span
														>
													{/if}
												{/each}
											</div>
											{#if groupIndex < data.work.traditionalAttribution.groups.length - 1}
												<span
													class="inline-flex rounded bg-[#ecf0f1] px-[0.45rem] py-[0.2rem] text-[0.72rem] font-bold text-[#555] lowercase"
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
								class="mb-4 rounded-[10px] border border-[#e9ecef] bg-[linear-gradient(to_right,rgba(102,126,234,0.07),transparent)] p-[0.85rem] last:mb-0 md:p-4"
							>
								<div class="mb-3">
									<span
										class="inline-flex rounded-full bg-brand-blue/[0.12] px-[0.7rem] py-[0.35rem] text-[0.76rem] font-bold tracking-[0.03em] text-brand-blue uppercase"
										>Atribución estilometría</span
									>
								</div>
								<div class="text-[0.97rem] leading-[1.6] text-[#495057]">
									<div class="flex flex-col items-start gap-[0.65rem]">
										{#if data.work.stylometryAttribution.unresolved}
											<div class="flex flex-wrap items-center gap-3">
												<span class="font-medium text-[#6c757d] italic">Autoría no determinada</span>
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
														class="font-medium text-[#343a40] no-underline hover:text-brand-blue hover:underline"
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
															class="inline-flex rounded bg-[#ecf0f1] px-[0.45rem] py-[0.2rem] text-[0.72rem] font-bold text-[#555] lowercase"
															>y</span
														>
													{/if}
												{/each}
											</div>
											{#if groupIndex < data.work.stylometryAttribution.groups.length - 1}
												<span
													class="inline-flex rounded bg-[#ecf0f1] px-[0.45rem] py-[0.2rem] text-[0.72rem] font-bold text-[#555] lowercase"
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
								class="rounded-lg border border-brand-blue/20 bg-brand-blue/[0.08] px-4 py-3.5 text-[0.92rem] text-[#24425d]"
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
							<p class="mt-[0.65rem] text-[0.8rem] text-[#516273]">
								Consulta el informe para contextualizar la atribución de esta obra.
							</p>
						</header>
						<div class={cardBodyClass}>
							<div class="flex flex-col gap-2.5">
								<a href={`/informes/${data.informe.id}`} class={actionLinkClass}>
									<div class="inline-flex items-center justify-center text-brand-blue" aria-hidden="true">
										<ChartLine class="h-[0.9rem] w-[0.9rem] stroke-2" />
									</div>
									<div class="min-w-0 justify-self-start text-left">
										<div class="text-[0.93rem] font-semibold text-[#213549]">Informe</div>
										<div class="text-[0.78rem] text-[#62758a]">Ver análisis completo</div>
									</div>
									<div class="text-[#5b6f84]" aria-hidden="true">
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
									class="[&>p]:m-0 grid gap-[0.85rem] font-reading text-base leading-[1.65] text-[#495057]"
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
											<div class="text-[0.93rem] font-semibold text-[#213549]">
												Leer resumen automático completo
											</div>
											<div class="text-[0.78rem] text-[#62758a]">Descripción extensa de la obra</div>
										</div>
										<div class="text-[#5b6f84]" aria-hidden="true">
											<ChevronRight class="h-[0.78rem] w-[0.78rem] stroke-2" />
										</div>
									</a>
								</div>
							{/if}
						{:else}
							<div
								class="rounded-lg border border-brand-blue/20 bg-brand-blue/[0.08] px-4 py-3.5 text-[0.92rem] text-[#24425d]"
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
											<div class="text-[0.93rem] font-semibold text-[#213549]">{link.label}</div>
											<div class="text-[0.78rem] text-[#62758a]">BICUVE</div>
										{:else}
											<div class="text-[0.93rem] font-semibold text-[#213549]">Leer texto</div>
											<div class="text-[0.78rem] text-[#62758a]">{link.label}</div>
										{/if}
									</div>
									<div class="text-[#5b6f84]" aria-hidden="true">
										<ChevronRight class="h-[0.78rem] w-[0.78rem] stroke-2" />
									</div>
								</a>
							{/each}
						{:else}
							<div class="rounded-lg border border-[#dee5ee] bg-[#f5f7fa] px-4 py-3.5 text-[0.92rem] text-[#4f5f6f]">
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
							<p class="mt-[0.65rem] text-[0.8rem] text-[#516273]">
								Consulta el informe para contextualizar la atribución de esta obra.
							</p>
						</header>
						<div class={cardBodyClass}>
							<div class="flex flex-col gap-2.5">
								<a href={`/informes/${data.informe.id}`} class={actionLinkClass}>
									<div class="inline-flex items-center justify-center text-brand-blue" aria-hidden="true">
										<ChartLine class="h-[0.9rem] w-[0.9rem] stroke-2" />
									</div>
									<div class="min-w-0 justify-self-start text-left">
										<div class="text-[0.93rem] font-semibold text-[#213549]">Informe</div>
										<div class="text-[0.78rem] text-[#62758a]">Ver análisis completo</div>
									</div>
									<div class="text-[#5b6f84]" aria-hidden="true">
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
											<div class="text-[0.93rem] font-semibold text-[#213549]">{link.label}</div>
											<div class="text-[0.78rem] text-[#62758a]">BICUVE</div>
										{:else}
											<div class="text-[0.93rem] font-semibold text-[#213549]">Leer texto</div>
											<div class="text-[0.78rem] text-[#62758a]">{link.label}</div>
										{/if}
									</div>
									<div class="text-[#5b6f84]" aria-hidden="true">
										<ChevronRight class="h-[0.78rem] w-[0.78rem] stroke-2" />
									</div>
								</a>
							{/each}
						{:else}
							<div class="rounded-lg border border-[#dee5ee] bg-[#f5f7fa] px-4 py-3.5 text-[0.92rem] text-[#4f5f6f]">
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
							<div class="flex flex-col gap-[0.45rem] border-b border-[#e9ecef] py-[0.9rem] first:pt-0 last:border-b-0 last:pb-0">
								<dt
									class="m-0 flex items-center gap-[0.35rem] text-[0.77rem] font-semibold tracking-[0.03em] text-[#6c757d] uppercase"
								>
									<Drama class="h-[0.82rem] w-[0.82rem] text-[#667eea] stroke-2" aria-hidden="true" />
									Género
								</dt>
								<dd class="m-0 text-[0.96rem] text-[#2c3e50]">{data.work.genre}</dd>
							</div>

							<div class="flex flex-col gap-[0.45rem] border-b border-[#e9ecef] py-[0.9rem] first:pt-0 last:border-b-0 last:pb-0">
								<dt
									class="m-0 flex items-center gap-[0.35rem] text-[0.77rem] font-semibold tracking-[0.03em] text-[#6c757d] uppercase"
								>
									<CircleCheck class="h-[0.82rem] w-[0.82rem] text-[#667eea] stroke-2" aria-hidden="true" />
									Estado del texto
								</dt>
								<dd class="m-0 text-[0.96rem] text-[#2c3e50]">{data.work.textState}</dd>
							</div>

							<div class="flex flex-col gap-[0.45rem] border-b border-[#e9ecef] py-[0.9rem] first:pt-0 last:border-b-0 last:pb-0">
								<dt
									class="m-0 flex items-center gap-[0.35rem] text-[0.77rem] font-semibold tracking-[0.03em] text-[#6c757d] uppercase"
								>
									<Archive class="h-[0.82rem] w-[0.82rem] text-[#667eea] stroke-2" aria-hidden="true" />
									Procedencia
								</dt>
								<dd class="m-0 text-[0.96rem] text-[#2c3e50]">{data.work.origin}</dd>
							</div>

							<div class="flex flex-col gap-[0.45rem] border-b border-[#e9ecef] py-[0.9rem] first:pt-0 last:border-b-0 last:pb-0">
								<dt
									class="m-0 flex items-center gap-[0.35rem] text-[0.77rem] font-semibold tracking-[0.03em] text-[#6c757d] uppercase"
								>
									<Calendar class="h-[0.82rem] w-[0.82rem] text-[#667eea] stroke-2" aria-hidden="true" />
									Fecha de adición
								</dt>
								<dd class="m-0 text-[0.96rem] text-[#2c3e50]">{data.work.addedOn}</dd>
							</div>
						</dl>
					</div>
				</section>
			</aside>
		</div>
	</div>
</div>
