<script lang="ts">
	import { onMount } from 'svelte';
	import AlignLeft from 'lucide-svelte/icons/align-left';
	import BookOpen from 'lucide-svelte/icons/book-open';
	import ChartLine from 'lucide-svelte/icons/chart-line';
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

	interface Props {
		rows: ObraTableRow[];
		mode?: 'standard' | 'informe';
		emptyMessage?: string;
	}

	let {
		rows,
		mode = 'standard',
		emptyMessage = 'No se encontraron obras que coincidan con los criterios de búsqueda.'
	}: Props = $props();

	let expandedRows = $state<Set<string>>(new Set());
	let openDropdownRowId = $state<string | null>(null);
	let dropdownStyles = $state<Record<string, string>>({});

	const buttonRefs = new Map<string, HTMLButtonElement>();

	const tableClass = $derived.by(() =>
		mode === 'informe'
			? 'obra-table-shared obra-table-shared--informe w-full min-w-[980px] border-collapse text-[13px] max-md:block max-md:min-w-0'
			: 'obra-table-shared obra-table-shared--standard w-full min-w-[980px] border-collapse text-[13px] max-md:block max-md:min-w-0'
	);
	const detailColspan = $derived.by(() => (mode === 'informe' ? 7 : 5));
	const dataCellClass =
		'overflow-visible px-3 py-4 align-top text-[13px] max-md:block max-md:border-0 max-md:px-3 max-md:py-[10px]';
	const mobileCellLabelClass =
		'mb-[6px] hidden text-[12px] font-semibold uppercase text-[#5a7a8a] max-md:block';
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

	onMount(() => {
		const onDocumentClick = (event: MouseEvent): void => {
			if (!openDropdownRowId) return;
			const target = event.target as HTMLElement | null;
			if (!target) {
				openDropdownRowId = null;
				return;
			}

			if (target.closest('.textos-dropdown-wrapper')) return;
			if (target.closest(`.textos-dropdown[data-row-id="${openDropdownRowId}"]`)) return;

			openDropdownRowId = null;
		};

		const onEscape = (event: KeyboardEvent): void => {
			if (event.key !== 'Escape') return;
			openDropdownRowId = null;
		};

		const onViewportChange = (): void => {
			if (!openDropdownRowId) return;
			positionDropdown(openDropdownRowId);
		};

		document.addEventListener('click', onDocumentClick);
		document.addEventListener('keydown', onEscape);
		window.addEventListener('resize', onViewportChange);
		window.addEventListener('scroll', onViewportChange, true);

		return () => {
			document.removeEventListener('click', onDocumentClick);
			document.removeEventListener('keydown', onEscape);
			window.removeEventListener('resize', onViewportChange);
			window.removeEventListener('scroll', onViewportChange, true);
		};
	});

	const registerTextButton = (node: HTMLButtonElement, rowId: string) => {
		buttonRefs.set(rowId, node);
		return {
			destroy: () => {
				buttonRefs.delete(rowId);
			}
		};
	};

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

	const isRowExpanded = (rowId: string): boolean => expandedRows.has(rowId);

	const toggleRowExpanded = (rowId: string): void => {
		const next = new Set(expandedRows);
		if (next.has(rowId)) {
			next.delete(rowId);
		} else {
			next.add(rowId);
		}
		expandedRows = next;
	};

	const handleRowClick = (event: MouseEvent, rowId: string): void => {
		const target = event.target as HTMLElement | null;
		if (!target) return;
		if (target.closest('a')) return;
		if (target.closest('button')) return;
		if (target.closest('.textos-dropdown')) return;
		toggleRowExpanded(rowId);
	};

	const hasAuthorLinks = (set: AttributionSet): boolean => !set.unresolved && set.groups.length > 0;

	const connectorLabel = (set: AttributionSet): string => (set.connector === 'and' ? 'Y' : 'O');

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

	const hasLongSummary = (work: CatalogWork): boolean => Boolean(work.longSummary?.trim());

	const hasShortSummary = (work: CatalogWork): boolean => {
		const shortText = work.shortSummary.trim();
		if (shortText && shortText !== 'Sin resumen breve disponible.') return true;
		return false;
	};

	const summaryUrl = (work: CatalogWork): string => `/obras/${work.slug}/resumen`;

	const toggleTextDropdown = (event: MouseEvent, rowId: string): void => {
		event.preventDefault();
		event.stopPropagation();
		if (openDropdownRowId === rowId) {
			openDropdownRowId = null;
			return;
		}
		openDropdownRowId = rowId;
		positionDropdown(rowId);
	};

	const positionDropdown = (rowId: string): void => {
		const button = buttonRefs.get(rowId);
		if (!button) return;

		const rect = button.getBoundingClientRect();
		const width = Math.max(220, rect.width);
		const left = Math.max(10, Math.min(rect.left, window.innerWidth - width - 10));
		const top = Math.min(rect.bottom + 4, Math.max(10, window.innerHeight - 320));

		dropdownStyles = {
			...dropdownStyles,
			[rowId]: `left:${left}px;top:${top}px;width:${width}px;`
		};
	};
</script>

{#if rows.length === 0}
	<div class="py-10 px-5 text-center text-[16px] text-text-soft">{emptyMessage}</div>
{:else}
	<div class="table-wrapper obra-table-shared-container min-w-0 w-full max-w-full overflow-x-auto overflow-y-visible font-['Roboto',sans-serif]">
		<table class={tableClass}>
			<thead class="bg-brand-blue-dark text-white max-md:hidden">
				<tr>
					{#if mode === 'informe'}
						<th class="obra-table-col--position w-[36px] px-3 py-[14px] text-left text-[13px] font-medium tracking-[0.5px] uppercase" scope="col"></th>
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
						Recursos
					</th>
				</tr>
			</thead>
			<tbody class="max-md:block">
				{#each rows as row}
					{@const flags = resolveFilterFlags(row)}
					<tr
						class={`obra-row cursor-pointer border-b border-border transition-colors hover:bg-surface-accent-blue/45 max-md:mb-3 max-md:block max-md:rounded-[8px] max-md:border max-md:border-border max-md:bg-white max-md:p-2 ${
							isRowExpanded(row.rowId) ? 'expanded border-b-border-accent-blue bg-surface-accent-blue/55' : ''
						}`}
						data-obra-id={row.work.id}
						data-title-search={normalizeForSearch([row.work.title, ...row.work.titleVariants].join(' '))}
						data-genero={normalizeForSearch(row.work.genre)}
						data-filter-related-any={flags.relatedAny ? '1' : '0'}
						data-filter-trad-any={flags.tradAny ? '1' : '0'}
						data-filter-etso-yes={flags.etsoYes ? '1' : '0'}
						data-filter-only-etso={flags.onlyEtso ? '1' : '0'}
						data-filter-only-trad={flags.onlyTrad ? '1' : '0'}
						onclick={(event) => handleRowClick(event, row.rowId)}
					>
						{#if mode === 'informe'}
							<td class={`${dataCellClass} text-center font-medium`} data-label="Posición">
								<span class={mobileCellLabelClass}>Posición</span>
								{row.position ?? '-'}
							</td>
							<td class={`${dataCellClass} text-right whitespace-nowrap`} data-label="Distancia">
								<span class={mobileCellLabelClass}>Distancia</span>
								<span
									class="distance-badge inline-block rounded-[12px] px-[0.55rem] py-[0.22rem] text-[0.75rem] font-medium"
									style={`background-color: ${row.badgeColor ?? '#0D3F91'}; color: #fff;`}
								>
									{distanceValue(row)}
								</span>
							</td>
						{/if}

						<td class={dataCellClass} data-label="Título">
							<span class={mobileCellLabelClass}>Título</span>
							<div class="obra-title flex select-none items-center gap-2 font-medium text-text-main">
								<span
									class={`expand-icon inline-flex h-3 w-3 flex-shrink-0 items-center justify-center max-md:hidden ${
										isRowExpanded(row.rowId) ? 'text-brand-blue-dark' : 'text-text-soft'
									}`}
									aria-hidden="true"
								>
									{#if isRowExpanded(row.rowId)}
										<ChevronDown class="h-3 w-3 stroke-[2.3]" />
									{:else}
										<ChevronRight class="h-3 w-3 stroke-[2.3]" />
									{/if}
								</span>
								<a
									href={`/obras/${row.work.slug}`}
									class="text-text-main visited:text-text-main no-underline hover:underline focus:underline focus-visible:underline"
								>
									{row.work.title}
								</a>
							</div>
							{#if row.work.titleVariants.length > 0}
								<div class="variantes-titulo mt-1.5 pl-5 text-[13px] leading-[1.4] text-text-soft italic">
									<span class="variantes-prefix mr-1 inline-flex align-middle text-text-soft not-italic" aria-hidden="true">
										<CornerDownRight class="h-3 w-3 stroke-[2.1]" />
									</span>
									{#each row.work.titleVariants as variante, index}
										<span class="variante-item">{variante}</span>
										{#if index < row.work.titleVariants.length - 1}
											<span class="variantes-sep text-text-soft/55"> | </span>
										{/if}
									{/each}
								</div>
							{/if}
						</td>

						<td class={dataCellClass} data-label="Atribución tradicional">
							<span class={mobileCellLabelClass}>Atribución tradicional</span>
							{#if hasAuthorLinks(row.work.traditionalAttribution)}
								<div class="autor-list leading-[1.6]">
									{#each row.work.traditionalAttribution.groups as group, groupIndex}
										<span class="autor-group">
											{#each group.members as member, memberIndex}
												{#if canLinkAuthor(member.authorId)}
													<a
														href={`/autores/${member.authorId}`}
														class="autor-name font-normal text-text-main visited:text-text-main no-underline hover:underline focus:underline focus-visible:underline"
													>
														{member.authorName}
													</a>
												{:else}
													<span class="autor-name font-normal text-text-main">{member.authorName}</span>
												{/if}
												{#if memberIndex < group.members.length - 1}
													<span class="logic-operator mx-1 inline-block rounded-[3px] bg-surface-accent-purple px-1.5 py-[1px] align-middle text-[10px] font-semibold text-text-accent-purple uppercase">
														Y
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
						</td>

						<td class={dataCellClass} data-label="Atribución estilometría">
							<span class={mobileCellLabelClass}>Atribución estilometría</span>
							{#if row.work.stylometryAttribution.unresolved}
								<span class="desconocido text-text-soft italic">El análisis no apunta hacia ningún autor</span>
							{:else if row.work.stylometryAttribution.groups.length > 0}
								<div class="autor-list leading-[1.6]">
									{#each row.work.stylometryAttribution.groups as group, groupIndex}
										<span class="autor-group">
											{#each group.members as member, memberIndex}
												{#if canLinkAuthor(member.authorId)}
													<a
														href={`/autores/${member.authorId}`}
														class="autor-name font-normal text-text-main visited:text-text-main no-underline hover:underline focus:underline focus-visible:underline"
													>
														{member.authorName}
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
														Y
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
						</td>

						<td class={dataCellClass} data-label="Género">
							<span class={mobileCellLabelClass}>Género</span>
							{row.work.genre || '-'}
						</td>

						<td class={dataCellClass} data-label="Recursos">
							<span class={mobileCellLabelClass}>Recursos</span>
							<div class="actions relative flex flex-col gap-1.5 max-md:flex-wrap max-md:justify-start max-md:gap-2">
								{#if row.work.reportId}
									<a href={`/informes/${row.work.reportId}`} class={actionButtonEnabledClass}>
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
									<div class="textos-dropdown-wrapper relative w-full">
										<button
											type="button"
											class={`${actionButtonEnabledClass} btn-texto textos-toggle`}
											aria-haspopup="true"
											aria-expanded={openDropdownRowId === row.rowId ? 'true' : 'false'}
											use:registerTextButton={row.rowId}
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
										<div
											class="textos-dropdown textos-dropdown-portal fixed left-0 top-0 z-[1200] max-h-[300px] min-w-[220px] max-w-[320px] overflow-y-auto rounded-[8px] border border-border-accent-blue bg-white p-1.5 font-['Roboto',sans-serif] shadow-[0_10px_28px_rgba(7,36,110,0.16)] max-md:min-w-[260px] max-md:max-w-[calc(100vw-20px)]"
											data-row-id={row.rowId}
											hidden={openDropdownRowId !== row.rowId}
											style={dropdownStyles[row.rowId] ?? ''}
										>
											{#each row.work.textLinks as link}
												<a
													href={link.href}
													class="textos-dropdown-item grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 rounded-[6px] px-2.5 py-[9px] text-[12px] font-normal text-text-main no-underline transition-all hover:bg-surface-accent-blue hover:text-text-main hover:no-underline focus:bg-surface-accent-blue focus:text-text-main focus:no-underline focus:outline-none focus-visible:bg-surface-accent-blue focus-visible:text-text-main focus-visible:no-underline focus-visible:outline-none"
													target={link.external ? '_blank' : undefined}
													rel={link.external ? 'noopener noreferrer' : undefined}
												>
													<span class="textos-dropdown-icon inline-flex h-[14px] w-[14px] flex-none items-center justify-center text-brand-blue-dark" aria-hidden="true">
														{#if link.kind === 'bicuve'}
															<BookOpen class="h-[14px] w-[14px] stroke-[2.1]" />
														{:else}
															<ExternalLink class="h-[14px] w-[14px] stroke-[2.1]" />
														{/if}
													</span>
													<span class="textos-dropdown-body flex min-w-0 flex-col gap-0.5">
														<span class="textos-dropdown-label block overflow-hidden text-ellipsis whitespace-nowrap">{link.label}</span>
														<span class="textos-dropdown-kind text-[0.68rem] font-normal tracking-[0.02em] text-text-accent-purple uppercase">
															{#if link.kind === 'bicuve'}
																BICUVE
															{:else}
																Enlace externo
															{/if}
														</span>
													</span>
													<span class="textos-dropdown-item-arrow inline-flex h-3 w-3 flex-none items-center justify-center text-text-soft" aria-hidden="true">
														<ChevronRight class="h-3 w-3 stroke-[2.1]" />
													</span>
												</a>
											{/each}
										</div>
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

								{#if hasLongSummary(row.work)}
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

								<div class="ver-mas mt-2 hidden text-center max-md:mt-[10px] max-md:block">
									<span
										class="toggle-detail inline-block rounded-[4px] bg-transparent px-2 py-1.5 text-[14px] leading-none font-semibold text-brand-blue-dark"
										role="button"
										tabindex="0"
										aria-expanded={isRowExpanded(row.rowId) ? 'true' : 'false'}
										onclick={(event) => {
											event.preventDefault();
											event.stopPropagation();
											toggleRowExpanded(row.rowId);
										}}
										onkeydown={(event) => {
											if (event.key !== 'Enter' && event.key !== ' ') return;
											event.preventDefault();
											event.stopPropagation();
											toggleRowExpanded(row.rowId);
										}}
									>
										Ver más
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
							</div>
						</td>
					</tr>

					<tr
						class={`${isRowExpanded(row.rowId) ? 'table-row' : 'hidden'} detail-row border-b border-border bg-surface-accent-blue/55 max-md:block`}
						hidden={!isRowExpanded(row.rowId)}
					>
						<td colspan={detailColspan} class="max-md:block max-md:border-0 max-md:p-0">
							<div class="detail-content animate-[works-table-slide-down_0.24s_ease] px-6 py-5">
								{#if hasShortSummary(row.work)}
									<div class="detail-section detail-section--resumen mb-5 border-b border-[#dfe5ee] pb-3 last:mb-0">
										<div class="detail-section-title mb-2.5 text-[12px] font-semibold tracking-[0.5px] text-[#5a7a8a] uppercase">
											Resumen breve automático
										</div>
										<p class="resumen-text mb-3 text-[14px] leading-[1.7] text-text-soft">{row.work.shortSummary}</p>
									</div>
								{/if}

								<div class="detail-section mb-5 last:mb-0">
									<div class="metadata-grid grid grid-cols-3 gap-[14px] max-md:grid-cols-1">
										<div class="metadata-item flex flex-col gap-1">
											<span class="metadata-label mb-1 block text-[12px] font-semibold text-[#5a7a8a] uppercase">
												Texto empleado
											</span>
											{#if row.work.origin}
												<span class="metadata-value text-[14px] text-text-main">{row.work.origin}</span>
											{:else}
												<span class="metadata-value not-available text-[14px] text-text-soft italic">No disponible</span>
											{/if}
										</div>

										<div class="metadata-item flex flex-col gap-1">
											<span class="metadata-label mb-1 block text-[12px] font-semibold text-[#5a7a8a] uppercase">
												Estado del texto
											</span>
											{#if row.work.textState}
												<span class="metadata-value text-[14px] text-text-main">{row.work.textState}</span>
											{:else}
												<span class="metadata-value not-available text-[14px] text-text-soft italic">No disponible</span>
											{/if}
										</div>

										<div class="metadata-item flex flex-col gap-1">
											<span class="metadata-label mb-1 block text-[12px] font-semibold text-[#5a7a8a] uppercase">
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
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
{/if}

<style>
	.obra-table-shared-container a,
	.obra-table-shared-container a:link,
	.obra-table-shared-container a:visited {
		color: inherit;
	}

	.obra-table-shared-container a:hover,
	.obra-table-shared-container a:focus-visible {
		text-decoration: underline;
	}

	.obra-table-shared-container .obra-title a,
	.obra-table-shared-container .obra-title a:visited,
	.obra-table-shared-container .autor-name,
	.obra-table-shared-container .autor-name:visited {
		color: var(--color-text-main);
	}

	.obra-table-shared-container .btn-action,
	.obra-table-shared-container .textos-dropdown-item {
		color: var(--color-text-main);
	}

	.obra-table-shared-container .btn-action:hover,
	.obra-table-shared-container .btn-action:focus-visible,
	.obra-table-shared-container .textos-dropdown-item:hover,
	.obra-table-shared-container .textos-dropdown-item:focus-visible {
		text-decoration: none;
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


