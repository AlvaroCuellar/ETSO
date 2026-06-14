<script lang="ts">
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import AlignLeft from 'lucide-svelte/icons/align-left';
	import BookOpen from 'lucide-svelte/icons/book-open';
	import ChartLine from 'lucide-svelte/icons/chart-line';
	import ChartNetwork from 'lucide-svelte/icons/chart-network';
	import ChevronDown from 'lucide-svelte/icons/chevron-down';
	import ChevronRight from 'lucide-svelte/icons/chevron-right';
	import CornerDownRight from 'lucide-svelte/icons/corner-down-right';
	import ExternalLink from 'lucide-svelte/icons/external-link';
	import FolderOpen from 'lucide-svelte/icons/folder-open';
	import {
		UNRESOLVED_AUTHOR_ID,
		formatConfidence,
		type AttributionSet,
		type CatalogWork,
		type Confidence,
		type ObraTableFilterFlags,
		type ObraTableRow
	} from '$lib/domain/catalog';
	import { DEFAULT_LOCALE, translateText, type Locale } from '$lib/i18n';
	import { buildWorkTitleSearchText, formatDisplayWorkTitle } from '$lib/utils/format-display-work-title';
	import { renderInlineItalicsHtml } from '$lib/utils/render-inline-italics-html';

	interface Props {
		rows: ObraTableRow[];
		mode?: 'standard' | 'informe';
		emptyMessage?: string;
	}

	type ShortSummaryStatus = 'loading' | 'loaded' | 'error' | 'missing';
	type MobileWorksView = 'cards' | 'table';

	const MOBILE_VIEW_STORAGE_KEY = 'etso:works-table-mobile-view';

	interface ShortSummaryState {
		status: ShortSummaryStatus;
		text: string;
	}

	let {
		rows,
		mode = 'standard',
		emptyMessage = 'No se encontraron obras que coincidan con los criterios de búsqueda.'
	}: Props = $props();

	let expandedRows = $state<Set<string>>(new Set());
	let openDropdownRowId = $state<string | null>(null);
	let shortSummaryByWorkId = $state<Map<string, ShortSummaryState>>(new Map());
	const shortSummaryPromises = new Map<string, Promise<void>>();
	let mobileView = $state<MobileWorksView>('cards');

	const locale = $derived((page.data.locale ?? DEFAULT_LOCALE) as Locale);
	const logicOperatorLabels: Record<Locale, { and: string; or: string }> = {
		es: { and: 'Y', or: 'O' },
		en: { and: 'AND', or: 'OR' },
		fr: { and: 'ET', or: 'OU' },
		pt: { and: 'E', or: 'OU' },
		it: { and: 'E', or: 'O' },
		de: { and: 'UND', or: 'ODER' },
		zh: { and: '和', or: '或' },
		ja: { and: 'と', or: 'または' },
		ko: { and: '및', or: '또는' },
		ru: { and: 'И', or: 'ИЛИ' },
		ar: { and: 'و', or: 'أو' }
	};
	const logicOperators = $derived(logicOperatorLabels[locale] ?? logicOperatorLabels.es);
	const t = $derived.by(() => (value: string): string => translateText(locale, value));
	const isMobileTableView = $derived(mobileView === 'table');

	const resultsShellClass = 'works-table-results min-w-0 w-full max-w-full';
	const tableClass = $derived.by(() =>
		`${mode === 'informe' ? 'obra-table-shared--informe' : 'obra-table-shared--standard'} obra-table-shared w-[980px] min-w-[980px] border-collapse text-[13px] md:w-full`
	);
	const wrapperClass = 'table-wrapper obra-table-shared-container min-w-0 w-full max-w-full overflow-x-auto overflow-y-visible rounded-t-[15px] font-[\'Roboto\',sans-serif] max-md:overscroll-x-contain';
	const tableHeadClass = 'bg-brand-blue text-white';
	const tableBodyClass = '';
	const detailColspan = $derived.by(() => (mode === 'informe' ? 7 : 5));
	const dataCellClass = 'overflow-visible px-3 py-4 align-top text-[13px]';
	const mobileCardLabelClass = 'mb-[6px] block text-[12px] font-semibold uppercase text-text-soft';
	const mobileCardFieldClass = 'grid min-w-0 max-w-full gap-[6px] text-[13px] leading-[1.55] text-text-main';
	const actionButtonBaseClass = $derived.by(
		() =>
			`btn-action grid w-full min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-2 rounded-[8px] border text-left font-normal text-text-main no-underline transition-all ${
				mode === 'informe' ? 'px-[9px] py-[7px] text-[11px] rounded-[7px]' : 'px-[10px] py-2 text-[12px]'
			}`
	);
	const actionButtonEnabledClass = $derived.by(
		() =>
			`${actionButtonBaseClass} cursor-pointer border-border-accent-blue bg-white hover:border-border-accent-blue hover:bg-surface-accent-blue hover:no-underline focus:no-underline focus-visible:no-underline focus:outline-3 focus:outline-brand-blue/15 focus:outline-offset-1`
	);
	const actionButtonDisabledClass = $derived.by(
		() =>
			`${actionButtonBaseClass} cursor-not-allowed border-[rgba(91,111,132,0.22)] bg-[#f8f9fb] text-[rgba(73,90,108,0.62)] opacity-[0.78]`
	);
	const actionLabelClass = $derived.by(
		() =>
			`btn-label block overflow-hidden text-ellipsis whitespace-nowrap leading-[1.2] ${
				mode === 'informe' ? 'text-[0.77rem]' : 'text-[0.82rem]'
			}`
	);
	const disabledIconClass = 'text-[rgba(114,130,145,0.75)]';

	const mobileViewButtonClass = (view: MobileWorksView): string =>
		`relative z-10 rounded-full border-0 bg-transparent px-3 py-1.5 text-[0.78rem] font-semibold outline-none transition-colors ${
			mobileView === view ? 'text-brand-blue-dark' : 'text-text-soft hover:text-brand-blue-dark'
		}`;

	const setMobileView = (view: MobileWorksView): void => {
		mobileView = view;
		openDropdownRowId = null;
		try {
			window.localStorage.setItem(MOBILE_VIEW_STORAGE_KEY, view);
		} catch {
			// La preferencia es opcional; si localStorage no está disponible, la UI sigue funcionando.
		}
	};

	const rowClass = (rowId: string): string => {
		const expanded = isRowExpanded(rowId);
		const base = 'obra-row cursor-pointer border-b border-border transition-colors hover:bg-surface-soft';
		return `${base} ${expanded ? 'expanded border-b-border-accent-blue' : ''}`;
	};

	const expandIconClass = (rowId: string): string =>
		`expand-icon inline-flex h-3 w-3 flex-shrink-0 items-center justify-center ${isRowExpanded(rowId) ? 'text-brand-blue-dark' : 'text-text-soft'}`;

	const detailRowClass = (rowId: string): string => {
		const expanded = isRowExpanded(rowId);
		return `${expanded ? 'table-row' : 'hidden'} detail-row border-b border-border bg-white`;
	};

	const detailCellClass = '';
	const detailMetadataGridClass = 'metadata-grid grid grid-cols-3 gap-[14px]';

	onMount(() => {
		try {
			const storedView = window.localStorage.getItem(MOBILE_VIEW_STORAGE_KEY);
			if (storedView === 'cards' || storedView === 'table') {
				mobileView = storedView;
			}
		} catch {
			mobileView = 'cards';
		}

		const onDocumentClick = (event: MouseEvent): void => {
			if (!openDropdownRowId) return;
			const target = event.target as HTMLElement | null;
			if (!target) {
				closeTextDropdown();
				return;
			}

			if (target.closest('.textos-dropdown-wrapper')) return;
			if (target.closest('.textos-dropdown')) return;

			closeTextDropdown();
		};

		const onEscape = (event: KeyboardEvent): void => {
			if (event.key !== 'Escape') return;
			closeTextDropdown();
		};

		document.addEventListener('click', onDocumentClick);
		document.addEventListener('keydown', onEscape);

		return () => {
			document.removeEventListener('click', onDocumentClick);
			document.removeEventListener('keydown', onEscape);
		};
	});

	const normalizeForSearch = (value: string): string =>
		value
			.normalize('NFD')
			.replace(/[\u0300-\u036f]/g, '')
			.toLowerCase()
			.trim();

	const resolveFilterFlags = (row: ObraTableRow): ObraTableFilterFlags =>
		row.filterFlags ?? {
			relatedAny: true,
			tradAny: false,
			etsoYes: false,
			onlyEtso: false,
			onlyTrad: false
		};

	const isUsableShortSummary = (value: string): boolean => {
		const shortText = value.trim();
		return shortText.length > 0 && shortText !== 'Sin resumen breve disponible.';
	};

	const isRowExpanded = (rowId: string): boolean => expandedRows.has(rowId);

	const getShortSummaryState = (work: CatalogWork): ShortSummaryState | undefined =>
		shortSummaryByWorkId.get(work.id);

	const getShortSummaryText = (work: CatalogWork): string => {
		const cached = getShortSummaryState(work);
		if (cached?.status === 'loaded') return cached.text;
		return work.shortSummary;
	};

	const setShortSummaryState = (workId: string, state: ShortSummaryState): void => {
		shortSummaryByWorkId = new Map(shortSummaryByWorkId).set(workId, state);
	};

	const loadShortSummary = async (work: CatalogWork): Promise<void> => {
		if (!work.hasSummaryFile) return;
		if (isUsableShortSummary(work.shortSummary)) return;
		const current = shortSummaryByWorkId.get(work.id);
		if (current && current.status !== 'loading') return;
		const pending = shortSummaryPromises.get(work.id);
		if (pending) return pending;

		const promise = (async () => {
			setShortSummaryState(work.id, { status: 'loading', text: '' });
			try {
				const response = await fetch(`/api/works/${encodeURIComponent(work.id)}/short-summary`);
				if (response.status === 404) {
					setShortSummaryState(work.id, { status: 'missing', text: '' });
					return;
				}
				if (!response.ok) {
					throw new Error(`No se pudo cargar el resumen breve: ${response.status}`);
				}

				const parsed = (await response.json()) as { shortSummary?: unknown };
				const shortSummary = typeof parsed.shortSummary === 'string' ? parsed.shortSummary : '';
				setShortSummaryState(
					work.id,
					isUsableShortSummary(shortSummary)
						? { status: 'loaded', text: shortSummary }
						: { status: 'missing', text: '' }
				);
			} catch {
				setShortSummaryState(work.id, { status: 'error', text: '' });
			} finally {
				shortSummaryPromises.delete(work.id);
			}
		})();

		shortSummaryPromises.set(work.id, promise);
		return promise;
	};

	const prefetchShortSummary = async (work: CatalogWork): Promise<void> => {
		await loadShortSummary(work);
	};

	const toggleRowExpanded = async (row: ObraTableRow): Promise<void> => {
		const next = new Set(expandedRows);
		const rowId = row.rowId;
		if (next.has(rowId)) {
			next.delete(rowId);
		} else {
			await loadShortSummary(row.work);
			next.add(rowId);
		}
		expandedRows = next;
	};

	const handleRowClick = (event: MouseEvent, row: ObraTableRow): void => {
		const target = event.target as HTMLElement | null;
		if (!target) return;
		if (target.closest('a')) return;
		if (target.closest('button')) return;
		if (target.closest('.textos-dropdown')) return;
		void toggleRowExpanded(row);
	};

	const hasAuthorLinks = (set: AttributionSet): boolean => !set.unresolved && set.groups.length > 0;

	const connectorLabel = (set: AttributionSet): string => (set.connector === 'and' ? logicOperators.and : logicOperators.or);

	const canLinkAuthor = (authorId: string): boolean => authorId.length > 0 && authorId !== UNRESOLVED_AUTHOR_ID;

	const confidenceClass = (confidence?: Confidence): string => {
		const baseClass =
			'inline-block rounded-[12px] px-[7px] py-[2px] text-[10px] font-medium uppercase tracking-[0.2px] align-middle ml-1';
		if (confidence === 'segura') return `${baseClass} bg-[#d4edda] text-[#155724]`;
		if (confidence === 'probable') return `${baseClass} bg-[#d1ecf1] text-[#0c5460]`;
		return `${baseClass} bg-[#fff3cd] text-[#856404]`;
	};

	const distanceValue = (row: ObraTableRow): string => {
		if (typeof row.distancia !== 'number' || Number.isNaN(row.distancia)) return '-';
		return row.distancia.toFixed(3);
	};

	const positionValue = (row: ObraTableRow): string => {
		if (typeof row.position !== 'number' || Number.isNaN(row.position)) return '-';
		return `${Math.trunc(row.position)}ª`;
	};

	const hasSummaryFile = (work: CatalogWork): boolean => work.hasSummaryFile;

	const hasShortSummary = (work: CatalogWork): boolean => {
		return isUsableShortSummary(getShortSummaryText(work));
	};

	const summaryUrl = (work: CatalogWork): string => `/obras/${work.slug}/resumen`;

	const closeTextDropdown = (): void => {
		openDropdownRowId = null;
	};

	const toggleTextDropdown = (event: MouseEvent, rowId: string): void => {
		event.preventDefault();
		event.stopPropagation();
		if (openDropdownRowId === rowId) {
			closeTextDropdown();
			return;
		}
		openDropdownRowId = rowId;
	};
</script>

{#snippet workTitle(row: ObraTableRow, showExpandIcon: boolean)}
	<div class="obra-title flex min-w-0 select-none items-center gap-2 font-medium text-text-main">
		{#if showExpandIcon}
			<span class={expandIconClass(row.rowId)} aria-hidden="true">
				{#if isRowExpanded(row.rowId)}
					<ChevronDown class="h-3 w-3 stroke-[2.3]" />
				{:else}
					<ChevronRight class="h-3 w-3 stroke-[2.3]" />
				{/if}
			</span>
		{/if}
		<a
			href={`/obras/${row.work.slug}`}
			class="inline-flex min-w-0 items-baseline gap-1 text-text-main visited:text-text-main no-underline hover:underline focus:underline focus-visible:underline"
		>
			<span class="min-w-0 overflow-wrap-anywhere">{formatDisplayWorkTitle(row.work.title)}</span>
			<span class="hidden flex-none translate-y-[2px] text-text-soft max-md:inline-flex" aria-hidden="true">
				<ExternalLink class="h-3.5 w-3.5" />
			</span>
		</a>
	</div>
	{#if row.work.titleVariants.length > 0}
		<div class="variantes-titulo mt-1.5 min-w-0 pl-5 text-[13px] leading-[1.4] text-text-soft">
			<span class="variantes-prefix mr-1 inline-flex align-middle text-text-soft not-italic" aria-hidden="true">
				<CornerDownRight class="h-3 w-3 stroke-[2.1]" />
			</span>
			{#each row.work.titleVariants as variante, index}
				<span class="variante-item italic">{formatDisplayWorkTitle(variante)}</span>
				{#if index < row.work.titleVariants.length - 1}
					<span class="variantes-sep mx-1 text-text-soft/55 not-italic">|</span>
				{/if}
			{/each}
		</div>
	{/if}
{/snippet}

{#snippet traditionalAttribution(row: ObraTableRow)}
	{#if hasAuthorLinks(row.work.traditionalAttribution)}
		<div class="autor-list min-w-0 leading-[1.6]">
			{#each row.work.traditionalAttribution.groups as group, groupIndex}
				<span class="autor-group">
					{#each group.members as member, memberIndex}
						{#if canLinkAuthor(member.authorId)}
							<a
								href={`/autores/${member.authorId}`}
								class="autor-name inline font-normal text-text-main visited:text-text-main no-underline hover:underline focus:underline focus-visible:underline"
							>
								<span class="overflow-wrap-anywhere">{member.authorName}</span>
								<span class="hidden flex-none translate-y-[2px] text-text-soft max-md:inline-flex" aria-hidden="true">
									<ExternalLink class="h-3 w-3" />
								</span>
							</a>
						{:else}
							<span class="autor-name font-normal text-text-main">{member.authorName}</span>
						{/if}
						{#if memberIndex < group.members.length - 1}
							<span class="logic-operator mx-1 inline-block rounded-[3px] bg-surface-accent-purple px-1.5 py-[1px] align-middle text-[10px] font-semibold text-text-accent-purple uppercase">
								{logicOperators.and}
							</span>
						{/if}
					{/each}
				</span>
				{#if groupIndex < row.work.traditionalAttribution.groups.length - 1}
					<span class="logic-operator mx-1 inline-block rounded-[3px] bg-surface-accent-purple px-1.5 py-[1px] align-middle text-[10px] font-semibold text-text-accent-purple uppercase">
						{connectorLabel(row.work.traditionalAttribution)}
					</span>
				{/if}
			{/each}
		</div>
	{:else}
		<span class="desconocido text-text-soft italic">Desconocido</span>
	{/if}
{/snippet}

{#snippet stylometryAttribution(row: ObraTableRow)}
	{#if row.work.stylometryAttribution.unresolved}
		<span class="desconocido text-text-soft italic">El análisis no apunta hacia ningún autor</span>
	{:else if row.work.stylometryAttribution.groups.length > 0}
		<div class="autor-list min-w-0 leading-[1.6]">
			{#each row.work.stylometryAttribution.groups as group, groupIndex}
				<span class="autor-group">
					{#each group.members as member, memberIndex}
						{#if canLinkAuthor(member.authorId)}
							<a
								href={`/autores/${member.authorId}`}
								class="autor-name inline font-normal text-text-main visited:text-text-main no-underline hover:underline focus:underline focus-visible:underline"
							>
								<span class="overflow-wrap-anywhere">{member.authorName}</span>
								<span class="hidden flex-none translate-y-[2px] text-text-soft max-md:inline-flex" aria-hidden="true">
									<ExternalLink class="h-3 w-3" />
								</span>
							</a>
						{:else}
							<span class="autor-name font-normal text-text-main">{member.authorName}</span>
						{/if}
						{#if member.confidence}
							<span class={confidenceClass(member.confidence)}>
								{formatConfidence(member.confidence)}
							</span>
						{/if}
						{#if memberIndex < group.members.length - 1}
							<span class="logic-operator mx-1 inline-block rounded-[3px] bg-surface-accent-purple px-1.5 py-[1px] align-middle text-[10px] font-semibold text-text-accent-purple uppercase">
								{logicOperators.and}
							</span>
						{/if}
					{/each}
				</span>
				{#if groupIndex < row.work.stylometryAttribution.groups.length - 1}
					<span class="logic-operator mx-1 inline-block rounded-[3px] bg-surface-accent-purple px-1.5 py-[1px] align-middle text-[10px] font-semibold text-text-accent-purple uppercase">
						{connectorLabel(row.work.stylometryAttribution)}
					</span>
				{/if}
			{/each}
		</div>
	{:else}
		<span class="desconocido text-text-soft italic">No disponible</span>
	{/if}
{/snippet}

{#snippet genreValue(row: ObraTableRow)}
	{row.work.genre || '-'}
{/snippet}

{#snippet resourceActions(row: ObraTableRow, showToggle: boolean)}
	<div class="actions relative flex min-w-0 max-w-full flex-col gap-2">
		{#if row.work.reportId && row.work.reportSlug}
			<a href={`/informes/${row.work.reportSlug}`} class={actionButtonEnabledClass} data-sveltekit-preload-data="off">
				<span class="btn-left col-span-2 flex min-w-0 items-center gap-[7px]">
					<span class="btn-icon inline-flex h-[14px] w-[14px] flex-none items-center justify-center text-brand-blue-dark" aria-hidden="true">
						<ChartLine class="h-[14px] w-[14px] stroke-[2.1]" />
					</span>
					<span class={actionLabelClass}>
						{mode === 'informe' ? 'Informe' : 'Informe estilométrico'}
					</span>
				</span>
				<span class="btn-arrow col-[3] inline-flex h-[13px] w-[13px] items-center justify-center text-text-soft" aria-hidden="true">
					<ChevronRight class="h-[13px] w-[13px] stroke-[2.2]" />
				</span>
			</a>
		{:else}
			<span class={actionButtonDisabledClass}>
				<span class="btn-left col-span-2 flex min-w-0 items-center gap-[7px]">
					<span class={`btn-icon inline-flex h-[14px] w-[14px] flex-none items-center justify-center ${disabledIconClass}`} aria-hidden="true">
						<ChartLine class="h-[14px] w-[14px] stroke-[2.1]" />
					</span>
					<span class={actionLabelClass}>
						{mode === 'informe' ? 'Informe' : 'Informe estilométrico'}
					</span>
				</span>
				<span class={`btn-arrow col-[3] inline-flex h-[13px] w-[13px] items-center justify-center ${disabledIconClass}`} aria-hidden="true">
					<ChevronRight class="h-[13px] w-[13px] stroke-[2.2]" />
				</span>
			</span>
		{/if}

		{#if row.work.textLinks.length > 0}
			<div class="textos-dropdown-wrapper relative w-full max-w-full">
				<button
					type="button"
					class={`${actionButtonEnabledClass} btn-texto textos-toggle`}
					aria-haspopup="true"
					aria-expanded={openDropdownRowId === row.rowId ? 'true' : 'false'}
					onclick={(event) => toggleTextDropdown(event, row.rowId)}
				>
					<span class="btn-left col-span-2 flex min-w-0 items-center gap-[7px]">
						<span class="btn-icon inline-flex h-[14px] w-[14px] flex-none items-center justify-center text-brand-blue-dark" aria-hidden="true">
							<FolderOpen class="h-[14px] w-[14px] stroke-[2.1]" />
						</span>
						<span class={actionLabelClass}>{mode === 'informe' ? 'Texto' : 'Acceso al texto'}</span>
					</span>
					<span class="btn-arrow col-[3] inline-flex h-[13px] w-[13px] items-center justify-center text-text-soft" aria-hidden="true">
						{#if openDropdownRowId === row.rowId}
							<ChevronDown class="h-[13px] w-[13px] stroke-[2.2]" />
						{:else}
							<ChevronRight class="h-[13px] w-[13px] stroke-[2.2]" />
						{/if}
					</span>
				</button>
				{#if openDropdownRowId === row.rowId}
					<div
						class="textos-dropdown absolute left-0 top-[calc(100%+4px)] z-10 max-h-[min(300px,calc(100vh-24px))] min-w-full max-w-[320px] overflow-x-hidden overflow-y-auto rounded-[8px] border border-border-accent-blue bg-white p-1.5 font-['Roboto',sans-serif] shadow-[0_10px_28px_rgba(7,36,110,0.16)] max-md:w-full max-md:min-w-0 max-md:max-w-full"
					>
						{#each row.work.textLinks as link}
							<a
								href={link.href}
								data-sveltekit-preload-data={link.kind === 'biteso' ? 'off' : undefined}
								class="textos-dropdown-item grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-2 rounded-[6px] px-2.5 py-[9px] text-[12px] font-normal text-text-main no-underline transition-all hover:bg-surface-accent-blue hover:text-text-main hover:no-underline focus:bg-surface-accent-blue focus:text-text-main focus:no-underline focus:outline-none focus-visible:bg-surface-accent-blue focus-visible:text-text-main focus-visible:no-underline focus-visible:outline-none"
								target={link.external ? '_blank' : undefined}
								rel={link.external ? 'noopener noreferrer' : undefined}
							>
								<span class="textos-dropdown-icon inline-flex h-[14px] w-[14px] flex-none items-center justify-center text-brand-blue-dark" aria-hidden="true">
									{#if link.kind === 'biteso'}
										<BookOpen class="h-[14px] w-[14px] stroke-[2.1]" />
									{:else}
										<ExternalLink class="h-[14px] w-[14px] stroke-[2.1]" />
									{/if}
								</span>
								<span class="textos-dropdown-body flex min-w-0 flex-col">
									<span class="textos-dropdown-label block whitespace-normal break-words leading-[1.35]">{link.label}</span>
								</span>
								<span class="textos-dropdown-item-arrow mt-[2px] inline-flex h-3 w-3 flex-none items-center justify-center text-text-soft" aria-hidden="true">
									<ChevronRight class="h-3 w-3 stroke-[2.1]" />
								</span>
							</a>
						{/each}
					</div>
				{/if}
			</div>
		{:else}
			<span class={actionButtonDisabledClass}>
				<span class="btn-left col-span-2 flex min-w-0 items-center gap-[7px]">
					<span class={`btn-icon inline-flex h-[14px] w-[14px] flex-none items-center justify-center ${disabledIconClass}`} aria-hidden="true">
						<FolderOpen class="h-[14px] w-[14px] stroke-[2.1]" />
					</span>
					<span class={actionLabelClass}>{mode === 'informe' ? 'Texto' : 'Acceso al texto'}</span>
				</span>
				<span class={`btn-arrow col-[3] inline-flex h-[13px] w-[13px] items-center justify-center ${disabledIconClass}`} aria-hidden="true">
					<ChevronRight class="h-[13px] w-[13px] stroke-[2.2]" />
				</span>
			</span>
		{/if}

		{#if hasSummaryFile(row.work)}
			<a href={summaryUrl(row.work)} class={actionButtonEnabledClass}>
				<span class="btn-left col-span-2 flex min-w-0 items-center gap-[7px]">
					<span class="btn-icon inline-flex h-[14px] w-[14px] flex-none items-center justify-center text-brand-blue-dark" aria-hidden="true">
						<AlignLeft class="h-[14px] w-[14px] stroke-[2.1]" />
					</span>
					<span class={actionLabelClass}>{mode === 'informe' ? 'Resumen' : 'Resumen automático'}</span>
				</span>
				<span class="btn-arrow col-[3] inline-flex h-[13px] w-[13px] items-center justify-center text-text-soft" aria-hidden="true">
					<ChevronRight class="h-[13px] w-[13px] stroke-[2.2]" />
				</span>
			</a>
		{:else}
			<span class={actionButtonDisabledClass}>
				<span class="btn-left col-span-2 flex min-w-0 items-center gap-[7px]">
					<span class={`btn-icon inline-flex h-[14px] w-[14px] flex-none items-center justify-center ${disabledIconClass}`} aria-hidden="true">
						<AlignLeft class="h-[14px] w-[14px] stroke-[2.1]" />
					</span>
					<span class={actionLabelClass}>{mode === 'informe' ? 'Resumen' : 'Resumen automático'}</span>
				</span>
				<span class={`btn-arrow col-[3] inline-flex h-[13px] w-[13px] items-center justify-center ${disabledIconClass}`} aria-hidden="true">
					<ChevronRight class="h-[13px] w-[13px] stroke-[2.2]" />
				</span>
			</span>
		{/if}

		{#if row.work.inAuthorshipExam}
			<a href={`/red-obras?obra=${row.work.slug}`} class={actionButtonEnabledClass}>
				<span class="btn-left col-span-2 flex min-w-0 items-center gap-[7px]">
					<span class="btn-icon inline-flex h-[14px] w-[14px] flex-none items-center justify-center text-brand-blue-dark" aria-hidden="true">
						<ChartNetwork class="h-[14px] w-[14px] stroke-[2.1]" />
					</span>
					<span class={actionLabelClass}>{mode === 'informe' ? 'Red' : 'Red estilométrica'}</span>
				</span>
				<span class="btn-arrow col-[3] inline-flex h-[13px] w-[13px] items-center justify-center text-text-soft" aria-hidden="true">
					<ChevronRight class="h-[13px] w-[13px] stroke-[2.2]" />
				</span>
			</a>
		{:else}
			<span class={actionButtonDisabledClass}>
				<span class="btn-left col-span-2 flex min-w-0 items-center gap-[7px]">
					<span class={`btn-icon inline-flex h-[14px] w-[14px] flex-none items-center justify-center ${disabledIconClass}`} aria-hidden="true">
						<ChartNetwork class="h-[14px] w-[14px] stroke-[2.1]" />
					</span>
					<span class={actionLabelClass}>{mode === 'informe' ? 'Red' : 'Red estilométrica'}</span>
				</span>
				<span class={`btn-arrow col-[3] inline-flex h-[13px] w-[13px] items-center justify-center ${disabledIconClass}`} aria-hidden="true">
					<ChevronRight class="h-[13px] w-[13px] stroke-[2.2]" />
				</span>
			</span>
		{/if}

		{#if showToggle}
			<div class="ver-mas mt-[10px] text-center">
				<span
					class="toggle-detail inline-block rounded-[4px] bg-transparent px-2 py-1.5 text-[14px] leading-none font-semibold text-brand-blue-dark"
					role="button"
					tabindex="0"
					aria-expanded={isRowExpanded(row.rowId) ? 'true' : 'false'}
					onpointerenter={() => {
						void prefetchShortSummary(row.work);
					}}
					onfocus={() => {
						void prefetchShortSummary(row.work);
					}}
					ontouchstart={() => {
						void prefetchShortSummary(row.work);
					}}
					onclick={(event) => {
						event.preventDefault();
						event.stopPropagation();
						void toggleRowExpanded(row);
					}}
					onkeydown={(event) => {
						if (event.key !== 'Enter' && event.key !== ' ') return;
						event.preventDefault();
						event.stopPropagation();
						void toggleRowExpanded(row);
					}}
				>
					{isRowExpanded(row.rowId) ? 'Ver menos' : 'Ver más'}
				</span>
				<div
					class={`toggle-down mt-1.5 inline-flex items-center justify-center leading-none text-brand-blue-dark transition-transform ${
						isRowExpanded(row.rowId) ? 'rotate-180' : ''
					}`}
					aria-hidden="true"
				>
					<ChevronDown class="h-[14px] w-[14px] stroke-[2.2]" />
				</div>
			</div>
		{/if}
	</div>
{/snippet}

{#snippet detailPanel(row: ObraTableRow, summaryState: ShortSummaryState | undefined, compact: boolean)}
	<div class={`detail-content animate-[works-table-slide-down_0.24s_ease] ${compact ? 'border-t border-border px-3 py-4' : 'px-6 py-5'}`}>
		{#if hasShortSummary(row.work)}
			<div class="detail-section detail-section--resumen mb-5 border-b border-[#dfe5ee] pb-3 last:mb-0">
				<div class="detail-section-title mb-2.5 text-[12px] font-semibold tracking-[0.5px] text-text-soft uppercase">
					Resumen breve automático
				</div>
				<p class="resumen-text mb-3 text-[14px] leading-[1.7] text-text-soft">{getShortSummaryText(row.work)}</p>
			</div>
		{:else if summaryState?.status === 'loading'}
			<div class="detail-section detail-section--resumen mb-5 border-b border-[#dfe5ee] pb-3 last:mb-0">
				<div class="detail-section-title mb-2.5 text-[12px] font-semibold tracking-[0.5px] text-text-soft uppercase">
					Resumen breve automático
				</div>
				<p class="resumen-text mb-3 text-[14px] leading-[1.7] text-text-soft italic">Cargando resumen...</p>
			</div>
		{:else if summaryState?.status === 'error'}
			<div class="detail-section detail-section--resumen mb-5 border-b border-[#dfe5ee] pb-3 last:mb-0">
				<p class="m-0 text-[13px] leading-[1.55] text-text-soft italic">
					No se pudo cargar el resumen breve.
				</p>
			</div>
		{/if}

		<div class="detail-section mb-5 last:mb-0">
			<div class={compact ? 'metadata-grid grid grid-cols-1 gap-[14px]' : detailMetadataGridClass}>
				<div class="metadata-item flex min-w-0 flex-col gap-1">
					<span class="metadata-label mb-1 block text-[12px] font-semibold text-text-soft uppercase">
						Texto empleado
					</span>
					{#if row.work.origin}
						<span class="metadata-value overflow-wrap-anywhere text-[14px] text-text-main">
							{@html renderInlineItalicsHtml(row.work.origin)}
						</span>
					{:else}
						<span class="metadata-value not-available text-[14px] text-text-soft italic">No disponible</span>
					{/if}
				</div>

				<div class="metadata-item flex min-w-0 flex-col gap-1">
					<span class="metadata-label mb-1 block text-[12px] font-semibold text-text-soft uppercase">
						Estado del texto
					</span>
					{#if row.work.textState}
						<span class="metadata-value overflow-wrap-anywhere text-[14px] text-text-main">{row.work.textState}</span>
					{:else}
						<span class="metadata-value not-available text-[14px] text-text-soft italic">No disponible</span>
					{/if}
				</div>

				<div class="metadata-item flex min-w-0 flex-col gap-1">
					<span class="metadata-label mb-1 block text-[12px] font-semibold text-text-soft uppercase">
						Fecha de adición o modificación
					</span>
					{#if row.work.addedOn}
						<span class="metadata-value text-[14px] text-text-main">{row.work.addedOn}</span>
					{:else}
						<span class="metadata-value not-available text-[14px] text-text-soft italic">No disponible</span>
					{/if}
				</div>
			</div>
		</div>
	</div>
{/snippet}

{#if rows.length === 0}
	<div class="py-10 px-5 text-center text-[16px] text-text-soft">{emptyMessage}</div>
{:else}
	<div class={resultsShellClass} data-mobile-view={mobileView}>
		<div class="works-table-mobile-view-toggle mb-3 justify-end">
			<div
				role="group"
				aria-label="Vista de resultados"
				class="relative grid grid-cols-2 rounded-full bg-surface-soft p-1"
			>
				<span
					class={`pointer-events-none absolute top-1 bottom-1 left-1 w-[calc(50%-0.25rem)] rounded-full bg-white shadow-soft transition-transform duration-200 ease-out ${
						mobileView === 'table' ? 'translate-x-full' : 'translate-x-0'
					}`}
					aria-hidden="true"
				></span>
				<button
					type="button"
					class={mobileViewButtonClass('cards')}
					aria-pressed={mobileView === 'cards'}
					onclick={() => setMobileView('cards')}
				>
					Tarjetas
				</button>
				<button
					type="button"
					class={mobileViewButtonClass('table')}
					aria-pressed={mobileView === 'table'}
					onclick={() => setMobileView('table')}
				>
					Tabla
				</button>
			</div>
		</div>
		{#if !isMobileTableView}
			<div class="works-table-mobile-cards grid min-w-0 max-w-full gap-3 md:hidden">
				{#each rows as row}
					{@const flags = resolveFilterFlags(row)}
					{@const summaryState = getShortSummaryState(row.work)}
					<article
						class="works-table-mobile-card min-w-0 max-w-full rounded-card border border-border bg-white p-3 font-['Roboto',sans-serif] text-text-main"
						data-obra-id={row.work.id}
						data-title-search={normalizeForSearch(
							buildWorkTitleSearchText(row.work.title, row.work.titleVariants)
						)}
						data-genero={normalizeForSearch(row.work.genre)}
						data-filter-related-any={flags.relatedAny ? '1' : '0'}
						data-filter-trad-any={flags.tradAny ? '1' : '0'}
						data-filter-etso-yes={flags.etsoYes ? '1' : '0'}
						data-filter-only-etso={flags.onlyEtso ? '1' : '0'}
						data-filter-only-trad={flags.onlyTrad ? '1' : '0'}
					>
						<div class="grid min-w-0 max-w-full gap-4">
							{#if mode === 'informe'}
								<div class="grid grid-cols-2 items-start gap-4 text-center">
									<div class="grid min-w-0 gap-[6px]">
										<span class={mobileCardLabelClass}>Posición</span>
										<span class="font-medium text-text-main">{positionValue(row)}</span>
									</div>
									<div class="grid min-w-0 justify-items-center gap-[6px]">
										<span class={mobileCardLabelClass}>Distancia</span>
										<span
											class="distance-badge inline-block rounded-[12px] px-[0.55rem] py-[0.22rem] text-[0.75rem] font-medium"
											style={`background-color: ${row.badgeColor ?? '#0D3F91'}; color: #fff;`}
										>
											{distanceValue(row)}
										</span>
									</div>
								</div>
							{/if}

							<div class={mobileCardFieldClass}>
								<span class={mobileCardLabelClass}>Título</span>
								{@render workTitle(row, false)}
							</div>

							<div class={mobileCardFieldClass}>
								<span class={mobileCardLabelClass}>Atribución tradicional</span>
								{@render traditionalAttribution(row)}
							</div>

							<div class={mobileCardFieldClass}>
								<span class={mobileCardLabelClass}>Atribución estilometría</span>
								{@render stylometryAttribution(row)}
							</div>

							<div class={mobileCardFieldClass}>
								<span class={mobileCardLabelClass}>Género</span>
								{@render genreValue(row)}
							</div>

							<div class={mobileCardFieldClass}>
								<span class={mobileCardLabelClass}>{t('Recursos')}</span>
								{@render resourceActions(row, true)}
							</div>
						</div>

						{#if isRowExpanded(row.rowId)}
							{@render detailPanel(row, summaryState, true)}
						{/if}
					</article>
				{/each}
			</div>
		{/if}

		<div class={`${wrapperClass} ${isMobileTableView ? '' : 'max-md:hidden'}`}>
			<table class={tableClass}>
			<thead class={tableHeadClass}>
				<tr>
					{#if mode === 'informe'}
						<th class="obra-table-col--position w-[82px] px-3 py-[14px] text-left text-[13px] font-medium tracking-[0.5px] uppercase" scope="col">
							Posición
						</th>
						<th class="obra-table-col--distance w-[90px] px-3 py-[14px] text-left text-[13px] font-medium tracking-[0.5px] uppercase" scope="col">
							Distancia
						</th>
					{/if}
					<th
						class={`obra-table-col--title px-3 py-[14px] text-left text-[13px] font-medium tracking-[0.5px] uppercase ${
							mode === 'standard' ? 'w-[29%]' : ''
						}`}
						scope="col"
					>
						Título
					</th>
					<th
						class={`obra-table-col--trad px-3 py-[14px] text-left text-[13px] font-medium tracking-[0.5px] uppercase ${
							mode === 'standard' ? 'w-[21.5%]' : ''
						}`}
						scope="col"
					>
						Atribución tradicional
					</th>
					<th
						class={`obra-table-col--etso px-3 py-[14px] text-left text-[13px] font-medium tracking-[0.5px] uppercase ${
							mode === 'standard' ? 'w-[21.5%]' : ''
						}`}
						scope="col"
					>
						Atribución estilometría
					</th>
					<th
						class={`obra-table-col--genre px-3 py-[14px] text-left text-[13px] font-medium tracking-[0.5px] uppercase ${
							mode === 'informe' ? 'w-[110px]' : 'w-[8%]'
						}`}
						scope="col"
					>
						Género
					</th>
					<th
						class={`obra-table-col--resources px-3 py-[14px] text-left text-[13px] font-medium tracking-[0.5px] uppercase ${
							mode === 'informe' ? 'w-[190px]' : 'w-[20%]'
						}`}
						scope="col"
					>
						{t('Recursos')}
					</th>
				</tr>
			</thead>
			<tbody class={tableBodyClass}>
				{#each rows as row}
					{@const flags = resolveFilterFlags(row)}
					{@const summaryState = getShortSummaryState(row.work)}
					<tr
						class={rowClass(row.rowId)}
						data-obra-id={row.work.id}
						data-title-search={normalizeForSearch(
							buildWorkTitleSearchText(row.work.title, row.work.titleVariants)
						)}
						data-genero={normalizeForSearch(row.work.genre)}
						data-filter-related-any={flags.relatedAny ? '1' : '0'}
						data-filter-trad-any={flags.tradAny ? '1' : '0'}
						data-filter-etso-yes={flags.etsoYes ? '1' : '0'}
						data-filter-only-etso={flags.onlyEtso ? '1' : '0'}
						data-filter-only-trad={flags.onlyTrad ? '1' : '0'}
						onpointerenter={() => {
							void prefetchShortSummary(row.work);
						}}
						onfocusin={() => {
							void prefetchShortSummary(row.work);
						}}
						ontouchstart={() => {
							void prefetchShortSummary(row.work);
						}}
						onclick={(event) => handleRowClick(event, row)}
					>
						{#if mode === 'informe'}
							<td class={`${dataCellClass} text-center font-medium`} data-label="Posición">
								{positionValue(row)}
							</td>
							<td class={`${dataCellClass} text-right whitespace-nowrap`} data-label="Distancia">
								<span
									class="distance-badge inline-block rounded-[12px] px-[0.55rem] py-[0.22rem] text-[0.75rem] font-medium"
									style={`background-color: ${row.badgeColor ?? '#0D3F91'}; color: #fff;`}
								>
									{distanceValue(row)}
								</span>
							</td>
						{/if}

						<td class={dataCellClass} data-label="Título">
							{@render workTitle(row, true)}
						</td>

						<td class={dataCellClass} data-label="Atribución tradicional">
							{@render traditionalAttribution(row)}
						</td>

						<td class={dataCellClass} data-label="Atribución estilometría">
							{@render stylometryAttribution(row)}
						</td>

						<td class={dataCellClass} data-label="Género">
							{@render genreValue(row)}
						</td>

						<td class={dataCellClass} data-label={t('Recursos')}>
							{@render resourceActions(row, false)}
						</td>
					</tr>

					<tr
						class={detailRowClass(row.rowId)}
						hidden={!isRowExpanded(row.rowId)}
					>
						<td colspan={detailColspan} class={detailCellClass}>
							{@render detailPanel(row, summaryState, false)}
						</td>
					</tr>
				{/each}
			</tbody>
			</table>
		</div>
	</div>
{/if}

<style>
	.overflow-wrap-anywhere {
		overflow-wrap: anywhere;
	}

	.obra-table-shared-container a,
	.obra-table-shared-container a:link,
	.obra-table-shared-container a:visited,
	.works-table-mobile-cards a,
	.works-table-mobile-cards a:link,
	.works-table-mobile-cards a:visited {
		color: inherit;
	}

	.obra-table-shared-container a:hover,
	.obra-table-shared-container a:focus-visible,
	.works-table-mobile-cards a:hover,
	.works-table-mobile-cards a:focus-visible {
		text-decoration: underline;
	}

	.obra-table-shared-container .obra-title a,
	.obra-table-shared-container .obra-title a:visited,
	.obra-table-shared-container .autor-name,
	.obra-table-shared-container .autor-name:visited,
	.works-table-mobile-cards .obra-title a,
	.works-table-mobile-cards .obra-title a:visited,
	.works-table-mobile-cards .autor-name,
	.works-table-mobile-cards .autor-name:visited {
		color: var(--color-text-main);
	}

	.obra-table-shared-container .btn-action,
	.obra-table-shared-container .textos-dropdown-item,
	.works-table-mobile-cards .btn-action,
	.works-table-mobile-cards .textos-dropdown-item {
		color: var(--color-text-main);
	}

	.obra-table-shared-container .btn-action:hover,
	.obra-table-shared-container .btn-action:focus-visible,
	.obra-table-shared-container .textos-dropdown-item:hover,
	.obra-table-shared-container .textos-dropdown-item:focus-visible,
	.works-table-mobile-cards .btn-action:hover,
	.works-table-mobile-cards .btn-action:focus-visible,
	.works-table-mobile-cards .textos-dropdown-item:hover,
	.works-table-mobile-cards .textos-dropdown-item:focus-visible {
		text-decoration: none;
	}

	.obra-table-shared-container thead th:first-child {
		border-top-left-radius: 8px;
	}

	.obra-table-shared-container thead th:last-child {
		border-top-right-radius: 8px;
	}

	.works-table-mobile-view-toggle {
		display: none;
	}

	@media (max-width: 767.98px) {
		.works-table-mobile-view-toggle {
			display: flex;
			justify-content: center;
		}

		.works-table-results {
			contain: inline-size;
			width: 100%;
			max-width: 100%;
			min-width: 0;
		}

		.works-table-mobile-cards,
		.works-table-mobile-card {
			width: 100%;
			max-width: 100%;
			min-width: 0;
		}

		.works-table-results[data-mobile-view='table'] .obra-table-shared-container {
			display: block;
			width: 100%;
			max-width: 100%;
			min-width: 0;
			overflow-x: auto;
			overflow-y: hidden;
			-webkit-overflow-scrolling: touch;
			overscroll-behavior-x: contain;
		}

		.works-table-results[data-mobile-view='table'] .obra-table-shared {
			width: 980px;
			min-width: 980px;
			max-width: none;
		}
	}

	@keyframes works-table-slide-down {
		from {
			opacity: 0;
			transform: translateY(-8px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
</style>
