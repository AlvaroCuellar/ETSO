<script lang="ts">
	import { formatAttribution, formatConfidence, type AttributionSet, type Confidence } from '$lib/domain/catalog';
	import Breadcrumbs from '$lib/components/ui/Breadcrumbs.svelte';
	import InfoCard from '$lib/components/ui/InfoCard.svelte';
	import InlineActionButton from '$lib/components/ui/InlineActionButton.svelte';
	import PageHero from '$lib/components/ui/PageHero.svelte';
	import SeoHead from '$lib/components/seo/SeoHead.svelte';
	import heroBg from '$lib/assets/heros/obra-bg.jpg';
	import AlignLeft from 'lucide-svelte/icons/align-left';
	import Archive from 'lucide-svelte/icons/archive';
	import BookOpen from 'lucide-svelte/icons/book-open';
	import Calendar from 'lucide-svelte/icons/calendar';
	import ChartLine from 'lucide-svelte/icons/chart-line';
	import ChartNetwork from 'lucide-svelte/icons/chart-network';
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
	const seoDescription = $derived.by(() => {
		const summary = data.work.shortSummary?.trim();
		if (data.locale === 'es' && summary && summary !== 'Sin resumen breve disponible.') return summary;
		const descriptions = {
			es: `${displayWorkTitle}. ${data.work.genre}. Ficha de obra en ETSO con atribución tradicional, atribución estilométrica, acceso al texto y recursos asociados.`,
			en: `${displayWorkTitle}. Work record in ETSO with traditional attribution, stylometric attribution, text access and related research resources.`,
			fr: `${displayWorkTitle}. Fiche d’œuvre dans ETSO avec attribution traditionnelle, attribution stylométrique, accès au texte et ressources associées.`,
			pt: `${displayWorkTitle}. Ficha da obra no ETSO com atribuição tradicional, atribuição estilométrica, acesso ao texto e recursos associados.`,
			it: `${displayWorkTitle}. Scheda dell’opera in ETSO con attribuzione tradizionale, attribuzione stilometrica, accesso al testo e risorse collegate.`,
			de: `${displayWorkTitle}. Werkdatensatz in ETSO mit traditioneller Zuschreibung, stilometrischer Zuschreibung, Textzugang und zugehörigen Forschungsressourcen.`,
			zh: `${displayWorkTitle}。ETSO 作品记录，包含传统归属、文体计量归属、文本访问和相关研究资源。`,
			ja: `${displayWorkTitle}。ETSO の作品情報。伝統的帰属、文体計量による帰属、本文アクセス、関連研究リソースを含みます。`,
			ko: `${displayWorkTitle}. ETSO 작품 기록으로 전통적 귀속, 문체계량 귀속, 텍스트 접근 및 관련 연구 자료를 제공합니다.`,
			ru: `${displayWorkTitle}. Карточка произведения в ETSO с традиционной атрибуцией, стилометрической атрибуцией, доступом к тексту и связанными исследовательскими ресурсами.`,
			ar: `${displayWorkTitle}. بطاقة عمل في ETSO تتضمن الإسناد التقليدي والإسناد الأسلوبي والوصول إلى النص والموارد البحثية المرتبطة.`
		} as const;
		return descriptions[data.locale] ?? descriptions.es;
	});

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
		'm-0 font-ui text-[0.72rem] font-bold uppercase tracking-[0.05em] text-text-soft';
	const actionLinkClass =
		'group grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3.5 rounded-lg border-0 bg-white px-[0.85rem] py-3 text-inherit no-underline transition hover:no-underline';
</script>

<SeoHead title={displayWorkTitle} description={seoDescription} path={`/obras/${data.work.slug}`} />

{#snippet textAccessActions()}
	{#if hasTextAccess()}
		{#each data.work.textLinks as link}
			<a
				href={link.href}
				class={actionLinkClass}
				target={link.external ? '_blank' : undefined}
				rel={link.external ? 'noopener noreferrer' : undefined}
			>
				<div class="inline-flex items-center justify-center text-text-soft transition-colors group-hover:text-brand-blue-dark" aria-hidden="true">
					{#if link.kind === 'biteso'}
						<BookOpen class="h-[0.9rem] w-[0.9rem] stroke-2" />
					{:else}
						<ExternalLink class="h-[0.9rem] w-[0.9rem] stroke-2" />
					{/if}
				</div>
				<div class="min-w-0 justify-self-start text-left">
					{#if link.kind === 'biteso'}
						<div class="text-[0.93rem] font-semibold text-text-soft transition-colors group-hover:text-brand-blue-dark">{link.label}</div>
						<div class="text-[0.78rem] text-text-soft transition-colors group-hover:text-brand-blue-dark">BITESO</div>
					{:else}
						<div class="text-[0.93rem] font-semibold text-text-soft transition-colors group-hover:text-brand-blue-dark">Leer texto</div>
						<div class="text-[0.78rem] text-text-soft transition-colors group-hover:text-brand-blue-dark">{link.label}</div>
					{/if}
				</div>
				<div class="text-text-soft transition-colors group-hover:text-brand-blue-dark" aria-hidden="true">
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

<div class="grid min-w-0 max-w-full gap-6">
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

	<div class="mx-auto w-full min-w-0 max-w-[1280px] font-ui">
		<div class="grid min-w-0 max-w-full grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(19rem,24rem)] lg:gap-8">
			<div class="grid min-w-0 max-w-full gap-5">
				<InfoCard label="Atribución de autoría" bodyClass="gap-0 font-ui leading-[1.5]">
					{#snippet action()}
						<div class="flex flex-wrap items-center justify-end gap-2">
							{#if data.informe}
								<InlineActionButton href={`/informes/${data.informe.slug}`} icon={ChartLine}>
									Informe estilométrico
								</InlineActionButton>
							{/if}
							<InlineActionButton href={`/red-obras?obra=${data.work.slug}`} icon={ChartNetwork}>
								Red estilométrica
							</InlineActionButton>
						</div>
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
														class="inline-flex items-baseline gap-1 font-medium text-brand-blue-dark no-underline hover:text-brand-blue hover:underline"
													>
														<span>{member.authorName}</span>
														<span class="hidden flex-none translate-y-[2px] text-text-soft max-md:inline-flex" aria-hidden="true">
															<ExternalLink class="h-3 w-3" />
														</span>
													</a>
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
												<span class="font-medium italic text-text-soft">No apunta hacia ningún autor</span>
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
														class="inline-flex items-baseline gap-1 font-medium text-brand-blue-dark no-underline hover:text-brand-blue hover:underline"
													>
														<span>{member.authorName}</span>
														<span class="hidden flex-none translate-y-[2px] text-text-soft max-md:inline-flex" aria-hidden="true">
															<ExternalLink class="h-3 w-3" />
														</span>
													</a>
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

				<InfoCard id="resumen-automatico" label="Resumen automático de la obra">
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

			<aside class="grid min-w-0 max-w-full content-start gap-5">
				<InfoCard label="Acceso al texto" bodyClass="font-ui leading-[1.5]">
					<div class="grid gap-2.5">
						{@render textAccessActions()}
					</div>
				</InfoCard>

				<InfoCard label="Información de la obra" class="lg:sticky lg:top-[calc(2rem+68px)]" bodyClass="font-ui leading-[1.5]">
					<dl class="m-0">
							<div class="flex flex-col gap-[0.45rem] border-b border-border py-[0.9rem] first:pt-0 last:border-b-0 last:pb-0">
								<dt
									class="m-0 flex items-center gap-[0.35rem] text-[0.72rem] font-bold tracking-[0.05em] text-text-soft uppercase"
								>
									<Drama class="h-[0.82rem] w-[0.82rem] text-text-soft stroke-2" aria-hidden="true" />
									Género
								</dt>
								<dd class="m-0 text-[0.96rem] text-text-main">{data.work.genre}</dd>
							</div>

							<div class="flex flex-col gap-[0.45rem] border-b border-border py-[0.9rem] first:pt-0 last:border-b-0 last:pb-0">
								<dt
									class="m-0 flex items-center gap-[0.35rem] text-[0.72rem] font-bold tracking-[0.05em] text-text-soft uppercase"
								>
									<CircleCheck class="h-[0.82rem] w-[0.82rem] text-text-soft stroke-2" aria-hidden="true" />
									Estado del texto
								</dt>
								<dd class="m-0 text-[0.96rem] text-text-main">{data.work.textState}</dd>
							</div>

							<div class="flex flex-col gap-[0.45rem] border-b border-border py-[0.9rem] first:pt-0 last:border-b-0 last:pb-0">
								<dt
									class="m-0 flex items-center gap-[0.35rem] text-[0.72rem] font-bold tracking-[0.05em] text-text-soft uppercase"
								>
									<Archive class="h-[0.82rem] w-[0.82rem] text-text-soft stroke-2" aria-hidden="true" />
									Procedencia
								</dt>
								<dd class="m-0 text-[0.96rem] text-text-main">
									{@html renderInlineItalicsHtml(data.work.origin)}
								</dd>
							</div>

							<div class="flex flex-col gap-[0.45rem] border-b border-border py-[0.9rem] first:pt-0 last:border-b-0 last:pb-0">
								<dt
									class="m-0 flex items-center gap-[0.35rem] text-[0.72rem] font-bold tracking-[0.05em] text-text-soft uppercase"
								>
									<Calendar class="h-[0.82rem] w-[0.82rem] text-text-soft stroke-2" aria-hidden="true" />
									Fecha de adición
								</dt>
								<dd class="m-0 text-[0.96rem] text-text-main">{data.work.addedOn}</dd>
							</div>

							<div class="flex flex-col gap-[0.45rem] border-b border-border py-[0.9rem] first:pt-0 last:border-b-0 last:pb-0">
								<dt
									class="m-0 flex items-center gap-[0.35rem] text-[0.72rem] font-bold tracking-[0.05em] text-text-soft uppercase"
								>
									<ExternalLink class="h-[0.82rem] w-[0.82rem] text-text-soft stroke-2" aria-hidden="true" />
									ASODAT
								</dt>
								<dd class="m-0 text-[0.96rem] leading-[1.55] text-text-main">
									Estamos trabajando para vincular esta obra con
									<a
										href="https://asodat.uv.es/"
										target="_blank"
										rel="noopener noreferrer"
										class="font-medium text-brand-blue underline hover:text-brand-blue-dark focus-visible:text-brand-blue-dark"
									>
										ASODAT
									</a>.
								</dd>
							</div>
					</dl>
				</InfoCard>
			</aside>
		</div>
	</div>
</div>
