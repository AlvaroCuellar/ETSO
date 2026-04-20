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
			? 'obra-table-shared obra-table-shared--informe'
			: 'obra-table-shared obra-table-shared--standard'
	);
	const detailColspan = $derived.by(() => (mode === 'informe' ? 7 : 5));

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

	const confidenceClass = (confidence?: Confidence): string =>
		`confidence-${confidence ?? 'no_concluyente'}`;

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
	<div class="no-results">{emptyMessage}</div>
{:else}
	<div class="table-wrapper obra-table-shared-container">
		<table class={tableClass}>
			<thead>
				<tr>
					{#if mode === 'informe'}
						<th class="obra-table-col--position" scope="col"></th>
						<th class="obra-table-col--distance" scope="col">Distancia</th>
					{/if}
					<th class="obra-table-col--title" scope="col">Título</th>
					<th class="obra-table-col--trad" scope="col">Atribución tradicional</th>
					<th class="obra-table-col--etso" scope="col">Atribución estilometría</th>
					<th class="obra-table-col--genre" scope="col">Género</th>
					<th class="obra-table-col--resources" scope="col">Recursos</th>
				</tr>
			</thead>
			<tbody>
				{#each rows as row}
					{@const flags = resolveFilterFlags(row)}
					<tr
						class="obra-row"
						class:expanded={isRowExpanded(row.rowId)}
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
							<td class="text-center obra-position-cell" data-label="Posición">
								{row.position ?? '-'}
							</td>
							<td class="text-end obra-distance-cell" data-label="Distancia">
								<span
									class="distance-badge"
									style={`background-color: ${row.badgeColor ?? '#3366cc'}; color: #fff;`}
								>
									{distanceValue(row)}
								</span>
							</td>
						{/if}

						<td data-label="Título">
							<div class="obra-title">
								<span class="expand-icon" aria-hidden="true">
									{#if isRowExpanded(row.rowId)}
										<ChevronDown />
									{:else}
										<ChevronRight />
									{/if}
								</span>
								<a href={`/obras/${row.work.slug}`}>{row.work.title}</a>
							</div>
							{#if row.work.titleVariants.length > 0}
								<div class="variantes-titulo">
									<span class="variantes-prefix" aria-hidden="true"><CornerDownRight /></span>
									{#each row.work.titleVariants as variante, index}
										<span class="variante-item">{variante}</span>
										{#if index < row.work.titleVariants.length - 1}
											<span class="variantes-sep"> | </span>
										{/if}
									{/each}
								</div>
							{/if}
						</td>

						<td data-label="Atribución tradicional">
							{#if hasAuthorLinks(row.work.traditionalAttribution)}
								<div class="autor-list">
									{#each row.work.traditionalAttribution.groups as group, groupIndex}
										<span class="autor-group">
											{#each group.members as member, memberIndex}
												{#if canLinkAuthor(member.authorId)}
													<a href={`/autores/${member.authorId}`} class="autor-name">{member.authorName}</a>
												{:else}
													<span class="autor-name">{member.authorName}</span>
												{/if}
												{#if memberIndex < group.members.length - 1}
													<span class="logic-operator">Y</span>
												{/if}
											{/each}
										</span>
										{#if groupIndex < row.work.traditionalAttribution.groups.length - 1}
											<span class="logic-operator">{connectorLabel(row.work.traditionalAttribution)}</span>
										{/if}
									{/each}
								</div>
							{:else}
								<span class="desconocido">Desconocido</span>
							{/if}
						</td>

						<td data-label="Atribución estilometría">
							{#if row.work.stylometryAttribution.unresolved}
								<span class="desconocido">El análisis no apunta hacia ningún autor</span>
							{:else if row.work.stylometryAttribution.groups.length > 0}
								<div class="autor-list">
									{#each row.work.stylometryAttribution.groups as group, groupIndex}
										<span class="autor-group">
											{#each group.members as member, memberIndex}
												{#if canLinkAuthor(member.authorId)}
													<a href={`/autores/${member.authorId}`} class="autor-name">{member.authorName}</a>
												{:else}
													<span class="autor-name">{member.authorName}</span>
												{/if}
												{#if member.confidence}
													<span class={`confidence-badge ${confidenceClass(member.confidence)}`}>
														{formatConfidence(member.confidence)}
													</span>
												{/if}
												{#if memberIndex < group.members.length - 1}
													<span class="logic-operator">Y</span>
												{/if}
											{/each}
										</span>
										{#if groupIndex < row.work.stylometryAttribution.groups.length - 1}
											<span class="logic-operator">{connectorLabel(row.work.stylometryAttribution)}</span>
										{/if}
									{/each}
								</div>
							{:else}
								<span class="desconocido">No disponible</span>
							{/if}
						</td>

						<td data-label="Género">{row.work.genre || '-'}</td>

						<td data-label="Recursos">
							<div class="actions">
								{#if row.work.reportId}
									<a href={`/informes/${row.work.reportId}`} class="btn-action btn-informe">
										<span class="btn-left">
											<span class="btn-icon" aria-hidden="true"><ChartLine /></span>
											<span class="btn-label">
												{mode === 'informe' ? 'Informe' : 'Informe estilométrico'}
											</span>
										</span>
										<span class="btn-arrow" aria-hidden="true"><ChevronRight /></span>
									</a>
								{:else}
									<span class="btn-action btn-disabled">
										<span class="btn-left">
											<span class="btn-icon" aria-hidden="true"><ChartLine /></span>
											<span class="btn-label">
												{mode === 'informe' ? 'Informe' : 'Informe estilométrico'}
											</span>
										</span>
										<span class="btn-arrow" aria-hidden="true"><ChevronRight /></span>
									</span>
								{/if}

								{#if row.work.textLinks.length > 0}
									<div class="textos-dropdown-wrapper">
										<button
											type="button"
											class="btn-action btn-texto textos-toggle"
											aria-haspopup="true"
											aria-expanded={openDropdownRowId === row.rowId ? 'true' : 'false'}
											use:registerTextButton={row.rowId}
											onclick={(event) => toggleTextDropdown(event, row.rowId)}
										>
											<span class="btn-left">
												<span class="btn-icon" aria-hidden="true">
													<FolderOpen />
												</span>
												<span class="btn-label">{mode === 'informe' ? 'Texto' : 'Acceso al texto'}</span>
											</span>
											<span class="btn-arrow" aria-hidden="true">
												{#if openDropdownRowId === row.rowId}
													<ChevronDown />
												{:else}
													<ChevronRight />
												{/if}
											</span>
										</button>
										<div
											class="textos-dropdown textos-dropdown-portal"
											data-row-id={row.rowId}
											hidden={openDropdownRowId !== row.rowId}
											style={dropdownStyles[row.rowId] ?? ''}
										>
											{#each row.work.textLinks as link}
												<a
													href={link.href}
													class="textos-dropdown-item"
													target={link.external ? '_blank' : undefined}
													rel={link.external ? 'noopener noreferrer' : undefined}
												>
													<span class="textos-dropdown-icon" aria-hidden="true">
														{#if link.kind === 'bicuve'}
															<BookOpen />
														{:else}
															<ExternalLink />
														{/if}
													</span>
													<span class="textos-dropdown-body">
														<span class="textos-dropdown-label">{link.label}</span>
														<span class="textos-dropdown-kind">
															{#if link.kind === 'bicuve'}
																BICUVE
															{:else}
																Enlace externo
															{/if}
														</span>
													</span>
													<span class="textos-dropdown-item-arrow" aria-hidden="true">
														<ChevronRight />
													</span>
												</a>
											{/each}
										</div>
									</div>
								{:else}
									<span class="btn-action btn-disabled">
										<span class="btn-left">
											<span class="btn-icon" aria-hidden="true"><FolderOpen /></span>
											<span class="btn-label">{mode === 'informe' ? 'Texto' : 'Acceso al texto'}</span>
										</span>
										<span class="btn-arrow" aria-hidden="true"><ChevronRight /></span>
									</span>
								{/if}

								{#if hasLongSummary(row.work)}
									<a href={summaryUrl(row.work)} class="btn-action btn-resumen">
										<span class="btn-left">
											<span class="btn-icon" aria-hidden="true"><AlignLeft /></span>
											<span class="btn-label">{mode === 'informe' ? 'Resumen' : 'Resumen automático'}</span>
										</span>
										<span class="btn-arrow" aria-hidden="true"><ChevronRight /></span>
									</a>
								{:else}
									<span class="btn-action btn-disabled">
										<span class="btn-left">
											<span class="btn-icon" aria-hidden="true"><AlignLeft /></span>
											<span class="btn-label">{mode === 'informe' ? 'Resumen' : 'Resumen automático'}</span>
										</span>
										<span class="btn-arrow" aria-hidden="true"><ChevronRight /></span>
									</span>
								{/if}

								<div class="ver-mas">
									<span
										class="toggle-detail"
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
									<div class="toggle-down" aria-hidden="true"><ChevronDown /></div>
								</div>
							</div>
						</td>
					</tr>

					<tr class="detail-row" class:show={isRowExpanded(row.rowId)} hidden={!isRowExpanded(row.rowId)}>
						<td colspan={detailColspan}>
							<div class="detail-content">
								{#if hasShortSummary(row.work)}
									<div class="detail-section detail-section--resumen">
										<div class="detail-section-title">Resumen breve automático</div>
										<p class="resumen-text">{row.work.shortSummary}</p>
									</div>
								{/if}

								<div class="detail-section">
									<div class="metadata-grid">
										<div class="metadata-item">
											<span class="metadata-label">Texto empleado</span>
											{#if row.work.origin}
												<span class="metadata-value">{row.work.origin}</span>
											{:else}
												<span class="metadata-value not-available">No disponible</span>
											{/if}
										</div>

										<div class="metadata-item">
											<span class="metadata-label">Estado del texto</span>
											{#if row.work.textState}
												<span class="metadata-value">{row.work.textState}</span>
											{:else}
												<span class="metadata-value not-available">No disponible</span>
											{/if}
										</div>

										<div class="metadata-item">
											<span class="metadata-label">Fecha de adición o modificación</span>
											{#if row.work.addedOn}
												<span class="metadata-value">{row.work.addedOn}</span>
											{:else}
												<span class="metadata-value not-available">No disponible</span>
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
	.obra-table-shared-container {
		font-family: 'Roboto', sans-serif;
		overflow-x: auto;
		overflow-y: visible;
		width: 100%;
		max-width: 100%;
		min-width: 0;
	}

	.obra-table-shared {
		width: 100%;
		border-collapse: collapse;
		font-size: 13px;
		min-width: 980px;
	}

	.obra-table-shared thead {
		background: #34495e;
		color: #fff;
	}

	.obra-table-shared th {
		padding: 14px 12px;
		text-align: left;
		font-weight: 500;
		font-size: 13px;
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.obra-table-shared--standard .obra-table-col--title {
		width: 29%;
	}

	.obra-table-shared--standard .obra-table-col--trad,
	.obra-table-shared--standard .obra-table-col--etso {
		width: 21.5%;
	}

	.obra-table-shared--standard .obra-table-col--genre {
		width: 8%;
	}

	.obra-table-shared--standard .obra-table-col--resources {
		width: 20%;
	}

	.obra-table-shared--informe .obra-table-col--position {
		width: 36px;
	}

	.obra-table-shared--informe .obra-table-col--distance {
		width: 90px;
	}

	.obra-table-shared--informe .obra-table-col--genre {
		width: 110px;
	}

	.obra-table-shared--informe .obra-table-col--resources {
		width: 190px;
	}

	.obra-row {
		border-bottom: 1px solid #ecf0f1;
		transition: background 0.15s;
		cursor: pointer;
	}

	.obra-row:hover {
		background: #f8f9fa;
	}

	.obra-row.expanded {
		background: #f5f5f5;
		border-bottom-color: #e0e0e0;
	}

	td {
		padding: 16px 12px;
		vertical-align: top;
		font-size: 13px;
		overflow: visible;
	}

	.obra-title {
		font-weight: 500;
		color: #2c3e50;
		display: flex;
		align-items: center;
		gap: 8px;
		user-select: none;
	}

	.obra-title a {
		color: inherit;
		text-decoration: none;
	}

	.obra-title a:hover,
	.obra-title a:focus,
	.obra-title a:focus-visible {
		text-decoration: underline;
	}

	.expand-icon {
		color: #7f8c8d;
		flex-shrink: 0;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 12px;
		height: 12px;
	}

	.expand-icon :global(svg) {
		width: 12px;
		height: 12px;
		stroke-width: 2.3;
	}

	.obra-row.expanded .expand-icon {
		color: #0033a7;
	}

	.variantes-titulo {
		margin-top: 6px;
		padding-left: 20px;
		color: #7f8c8d;
		font-size: 13px;
		font-style: italic;
		line-height: 1.4;
	}

	.variantes-prefix {
		color: #7f8c8d;
		margin-right: 4px;
		font-style: normal;
		display: inline-flex;
		vertical-align: middle;
	}

	.variantes-prefix :global(svg) {
		width: 12px;
		height: 12px;
		stroke-width: 2.1;
	}

	.variantes-sep {
		color: #9aa8b7;
	}

	.detail-row {
		display: none;
		background: #f5f5f5;
		border-bottom: 1px solid #e0e0e0;
	}

	.detail-row.show {
		display: table-row;
	}

	.detail-content {
		padding: 20px 24px;
		animation: slideDown 0.24s ease;
	}

	@keyframes slideDown {
		from {
			opacity: 0;
			transform: translateY(-8px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.detail-section {
		margin-bottom: 20px;
	}

	.detail-section:last-child {
		margin-bottom: 0;
	}

	.detail-section--resumen {
		border-bottom: 1px solid #dfe5ee;
		padding-bottom: 12px;
	}

	.detail-section-title {
		font-size: 12px;
		font-weight: 600;
		text-transform: uppercase;
		color: #5a7a8a;
		margin-bottom: 10px;
		letter-spacing: 0.5px;
	}

	.resumen-text {
		color: #555;
		line-height: 1.7;
		font-size: 14px;
		margin-bottom: 12px;
	}

	.metadata-grid {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 14px;
	}

	.metadata-item {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.metadata-label {
		display: block;
		font-size: 12px;
		font-weight: 600;
		text-transform: uppercase;
		color: #5a7a8a;
		margin-bottom: 4px;
	}

	.metadata-value {
		font-size: 14px;
		color: #2c3e50;
	}

	.metadata-value.not-available,
	.desconocido {
		color: #7f8c8d;
		font-style: italic;
	}

	.autor-list {
		display: block;
		line-height: 1.6;
	}

	.autor-group {
		display: inline;
	}

	.autor-name {
		color: #2c3e50;
		font-weight: 400;
		text-decoration: none;
	}

	.autor-name:hover,
	.autor-name:focus,
	.autor-name:focus-visible {
		text-decoration: underline;
	}

	.logic-operator {
		display: inline-block;
		padding: 1px 6px;
		background: #ecf0f1;
		border-radius: 3px;
		font-size: 10px;
		font-weight: 600;
		color: #555;
		text-transform: uppercase;
		margin: 0 4px;
		vertical-align: middle;
	}

	.confidence-badge {
		display: inline-block;
		padding: 2px 7px;
		border-radius: 12px;
		font-size: 10px;
		font-weight: 500;
		text-transform: uppercase;
		letter-spacing: 0.2px;
		margin-left: 4px;
		vertical-align: middle;
	}

	.confidence-segura {
		background: #d4edda;
		color: #155724;
	}

	.confidence-probable {
		background: #d1ecf1;
		color: #0c5460;
	}

	.confidence-posible {
		background: #fff3cd;
		color: #856404;
	}

	.confidence-no_concluyente {
		background: #fff3cd;
		color: #856404;
	}

	.actions {
		display: flex;
		flex-direction: column;
		gap: 6px;
		position: relative;
	}

	.btn-action {
		display: grid;
		grid-template-columns: auto minmax(0, 1fr) auto;
		align-items: center;
		column-gap: 8px;
		padding: 8px 10px;
		border: 1px solid rgba(0, 51, 167, 0.18);
		border-radius: 8px;
		font-size: 12px;
		font-weight: 500;
		color: #213549;
		background: #fff;
		text-decoration: none;
		text-transform: none;
		width: 100%;
		min-width: 0;
		transition: all 0.15s ease;
		cursor: pointer;
		font-family: inherit;
		text-align: left;
	}

	.btn-action:hover:not(.btn-disabled) {
		border-color: rgba(0, 51, 167, 0.34);
		background: #f6f9ff;
		color: #213549;
	}

	.btn-action:focus,
	.btn-action:focus-visible {
		outline: 3px solid rgba(0, 51, 167, 0.16);
		outline-offset: 1px;
	}

	.btn-action.btn-disabled,
	.btn-action.btn-disabled:hover,
	.btn-action.btn-disabled:focus,
	.btn-action.btn-disabled:focus-visible {
		background: #f8f9fb;
		border-color: rgba(91, 111, 132, 0.22);
		color: rgba(73, 90, 108, 0.62);
		cursor: not-allowed;
		opacity: 0.78;
	}

	.btn-left {
		display: flex;
		align-items: center;
		gap: 7px;
		min-width: 0;
		grid-column: 1 / span 2;
	}

	.btn-icon {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		color: #0033a7;
		width: 14px;
		height: 14px;
		flex: 0 0 auto;
	}

	.btn-icon :global(svg) {
		width: 14px;
		height: 14px;
		stroke-width: 2.1;
	}

	.btn-label {
		display: block;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		font-size: 0.82rem;
		line-height: 1.2;
		color: inherit;
	}

	.btn-arrow {
		color: #5b6f84;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 13px;
		height: 13px;
		grid-column: 3;
	}

	.btn-arrow :global(svg) {
		width: 13px;
		height: 13px;
		stroke-width: 2.2;
	}

	.btn-action.btn-disabled .btn-icon,
	.btn-action.btn-disabled .btn-arrow {
		color: rgba(114, 130, 145, 0.75);
	}

	.obra-table-shared--informe .btn-action {
		padding: 7px 9px;
		font-size: 11px;
		border-radius: 7px;
	}

	.obra-table-shared--informe .btn-label {
		font-size: 0.77rem;
	}

	.textos-dropdown-wrapper {
		position: relative;
		width: 100%;
	}

	.btn-texto {
		width: 100%;
	}

	.textos-dropdown-portal {
		font-family: 'Roboto', sans-serif;
		position: fixed;
		top: 0;
		left: 0;
		background: #fff;
		border: 1px solid rgba(0, 51, 167, 0.18);
		border-radius: 8px;
		box-shadow: 0 10px 28px rgba(7, 36, 110, 0.16);
		padding: 6px;
		z-index: 1200;
		min-width: 220px;
		max-width: 320px;
		max-height: 300px;
		overflow-y: auto;
	}

	.textos-dropdown-portal[hidden] {
		display: none;
	}

	.textos-dropdown-item {
		display: grid;
		grid-template-columns: auto minmax(0, 1fr) auto;
		align-items: center;
		gap: 8px;
		padding: 9px 10px;
		color: #213549;
		text-decoration: none;
		border-radius: 6px;
		font-size: 12px;
		font-weight: 600;
		transition: all 0.15s ease;
	}

	.textos-dropdown-icon {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		color: #0033a7;
		width: 14px;
		height: 14px;
		flex: 0 0 auto;
	}

	.textos-dropdown-icon :global(svg) {
		width: 14px;
		height: 14px;
		stroke-width: 2.1;
	}

	.textos-dropdown-body {
		display: flex;
		flex-direction: column;
		gap: 2px;
		min-width: 0;
	}

	.textos-dropdown-label {
		display: block;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.textos-dropdown-kind {
		font-size: 0.68rem;
		font-weight: 600;
		letter-spacing: 0.02em;
		text-transform: uppercase;
		color: #6b7b8d;
	}

	.textos-dropdown-item-arrow {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 12px;
		height: 12px;
		color: #5b6f84;
		flex: 0 0 auto;
	}

	.textos-dropdown-item-arrow :global(svg) {
		width: 12px;
		height: 12px;
		stroke-width: 2.1;
	}

	.textos-dropdown-item + .textos-dropdown-item {
		margin-top: 2px;
	}

	.textos-dropdown-item:hover,
	.textos-dropdown-item:focus,
	.textos-dropdown-item:focus-visible {
		background: #f6f9ff;
		color: #0033a7;
		outline: none;
	}

	.textos-dropdown-item:hover .textos-dropdown-kind,
	.textos-dropdown-item:focus .textos-dropdown-kind,
	.textos-dropdown-item:focus-visible .textos-dropdown-kind {
		color: #476483;
	}

	.ver-mas {
		margin-top: 8px;
		text-align: center;
		display: none;
	}

	.toggle-detail {
		display: inline-block;
		cursor: pointer;
		font-size: 14px;
		color: #0033a7;
		font-weight: 600;
		line-height: 1;
		padding: 6px 8px;
		border-radius: 4px;
		background: transparent;
		text-decoration: none;
	}

	.toggle-detail:focus,
	.toggle-detail:focus-visible {
		outline: 3px solid rgba(0, 51, 167, 0.12);
		outline-offset: 2px;
	}

	.toggle-down {
		margin-top: 6px;
		line-height: 1;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		color: #0033a7;
		transition: transform 0.15s ease;
	}

	.toggle-down :global(svg) {
		width: 14px;
		height: 14px;
		stroke-width: 2.2;
	}

	.obra-row.expanded .toggle-down {
		transform: rotate(180deg);
	}

	.distance-badge {
		display: inline-block;
		padding: 0.22rem 0.55rem;
		border-radius: 12px;
		font-size: 0.75rem;
		font-weight: 500;
	}

	.obra-position-cell {
		font-weight: 500;
	}

	.obra-distance-cell {
		white-space: nowrap;
	}

	.no-results {
		text-align: center;
		padding: 40px 20px;
		color: #7f8c8d;
		font-size: 16px;
	}

	@media (max-width: 768px) {
		.obra-table-shared thead {
			display: none;
		}

		.obra-table-shared,
		.obra-table-shared tbody,
		.obra-table-shared tr,
		.obra-table-shared td {
			display: block;
			min-width: 0;
		}

		.obra-row {
			margin-bottom: 12px;
			border: 1px solid #e9ecef;
			border-radius: 8px;
			padding: 8px;
			background: #fff;
		}

		.obra-table-shared td {
			border: 0;
			padding: 10px 12px;
		}

		.obra-table-shared td[data-label]::before {
			content: attr(data-label);
			display: block;
			font-size: 12px;
			color: #5a7a8a;
			font-weight: 600;
			margin-bottom: 6px;
			text-transform: uppercase;
		}

		.metadata-grid {
			grid-template-columns: 1fr;
		}

		.actions {
			gap: 8px;
			flex-wrap: wrap;
			justify-content: flex-start;
		}

		.ver-mas {
			margin-top: 10px;
			display: block;
		}

		.expand-icon {
			display: none;
		}

		.textos-dropdown-portal {
			min-width: 260px;
			max-width: calc(100vw - 20px);
		}
	}
</style>


