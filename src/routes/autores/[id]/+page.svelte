<script lang="ts">
	import WorksTable from '$lib/components/search/WorksTable.svelte';
	import Breadcrumbs from '$lib/components/ui/Breadcrumbs.svelte';
	import PageHero from '$lib/components/ui/PageHero.svelte';
	import autorBg from '$lib/assets/heros/autor-bg.jpg';
	import type { ObraTableRow } from '$lib/domain/catalog';

	import type { PageData } from './$types';

	type AuthorFilterKey = 'related_any' | 'trad_any' | 'etso_yes' | 'only_trad' | 'only_etso';

	let { data }: { data: PageData } = $props();

	let activeFilter = $state<AuthorFilterKey>('related_any');
	let titleFilter = $state('');
	let genreFilter = $state('');

	const normalizeText = (value: string): string =>
		value
			.normalize('NFD')
			.replace(/[\u0300-\u036f]/g, '')
			.toLowerCase()
			.trim();

	const genreOptions = $derived.by(() => {
		const values = Array.from(new Set(data.works.map((item) => item.work.genre)));
		values.sort((a, b) => a.localeCompare(b));
		return values;
	});

	const tableRows = $derived.by<ObraTableRow[]>(() => {
		const normalizedTitle = normalizeText(titleFilter);
		const normalizedGenre = normalizeText(genreFilter);

		return data.works
			.filter((relation) => {
				const filterFlags = {
					related_any: true,
					trad_any: relation.inTraditional,
					etso_yes: relation.inStylometry,
					only_trad: relation.inTraditional && !relation.inStylometry,
					only_etso: !relation.inTraditional && relation.inStylometry
				};
				if (!filterFlags[activeFilter]) return false;

				if (normalizedTitle) {
					const haystack = normalizeText([relation.work.title, ...relation.work.titleVariants].join(' '));
					if (!haystack.includes(normalizedTitle)) return false;
				}

				if (normalizedGenre) {
					if (normalizeText(relation.work.genre) !== normalizedGenre) return false;
				}

				return true;
			})
			.map((relation) => ({
				rowId: relation.work.id,
				work: relation.work,
				filterFlags: {
					relatedAny: true,
					tradAny: relation.inTraditional,
					etsoYes: relation.inStylometry,
					onlyEtso: !relation.inTraditional && relation.inStylometry,
					onlyTrad: relation.inTraditional && !relation.inStylometry
				}
			}));
	});

	const cardClass = (filter: AuthorFilterKey): string =>
		`autor-stat-card ${filter === 'related_any' || filter === 'trad_any' || filter === 'etso_yes' ? 'autor-stat-card--primary' : ''} ${activeFilter === filter ? 'is-active' : ''}`
			.trim();
</script>

<div class="page-stack">
	<Breadcrumbs
		items={[
			{ label: 'Inicio', href: '/' },
			{ label: 'Examen de autorías', href: '/examen-autorias' },
			{ label: data.author.name }
		]}
	/>

	<PageHero
		compact
		eyebrow="Ficha de autor"
		title={data.author.name}
		subtitle={data.author.nameVariants.length ? data.author.nameVariants.join(' | ') : undefined}
		backgroundImage={autorBg}
	/>

	<div class="autor-view-wrapper obra-view-wrapper">
		<div class="autor-main-grid obra-main-grid">
			<div class="autor-main-content obra-main-content">
				<div class="autor-metricas-row">
					<div class="autor-stats-grid autor-stats-grid--primary">
						<div class="autor-stat-card-shell">
							<button
								type="button"
								class={cardClass('related_any')}
								data-filter="related_any"
								aria-pressed={activeFilter === 'related_any' ? 'true' : 'false'}
								onclick={() => {
									activeFilter = 'related_any';
								}}
							>
								<div class="autor-stat-value">{data.metrics.relatedAny}</div>
								<div class="autor-stat-label">Obras relacionadas con el autor</div>
							</button>
						</div>

						<div class="autor-stat-card-shell">
							<button
								type="button"
								class={cardClass('trad_any')}
								data-filter="trad_any"
								aria-pressed={activeFilter === 'trad_any' ? 'true' : 'false'}
								onclick={() => {
									activeFilter = 'trad_any';
								}}
							>
								<div class="autor-stat-value">{data.metrics.tradAny}</div>
								<div class="autor-stat-label">Obras respaldadas por la tradición</div>
							</button>
						</div>

						<div class="autor-stat-card-shell">
							<button
								type="button"
								class={cardClass('etso_yes')}
								data-filter="etso_yes"
								aria-pressed={activeFilter === 'etso_yes' ? 'true' : 'false'}
								onclick={() => {
									activeFilter = 'etso_yes';
								}}
							>
								<div class="autor-stat-value">{data.metrics.etsoYes}</div>
								<div class="autor-stat-label">Obras respaldadas por la estilometría</div>
							</button>
						</div>
					</div>

					<div class="autor-stats-grid autor-stats-grid--secondary">
						<div class="autor-stat-card-shell">
							<button
								type="button"
								class={cardClass('only_trad')}
								data-filter="only_trad"
								aria-pressed={activeFilter === 'only_trad' ? 'true' : 'false'}
								onclick={() => {
									activeFilter = 'only_trad';
								}}
							>
								<div class="autor-stat-value">{data.metrics.onlyTrad}</div>
								<div class="autor-stat-label">Obras respaldadas solo por la tradición</div>
							</button>
						</div>

						<div class="autor-stat-card-shell">
							<button
								type="button"
								class={cardClass('only_etso')}
								data-filter="only_etso"
								aria-pressed={activeFilter === 'only_etso' ? 'true' : 'false'}
								onclick={() => {
									activeFilter = 'only_etso';
								}}
							>
								<div class="autor-stat-value">{data.metrics.onlyEtso}</div>
								<div class="autor-stat-label">Obras atribuidas a partir de la estilometría</div>
							</button>
						</div>
					</div>
				</div>

				<div class="autor-obras-section">
					<div class="autor-obras-toolbar">
						<label class="autor-search-field">
							<span class="autor-search-label">Buscar por título</span>
							<input
								type="search"
								class="autor-search-input"
								placeholder="Buscar por título"
								aria-label="Buscar por título"
								bind:value={titleFilter}
							/>
						</label>
						<label class="autor-filter-field">
							<span class="autor-filter-label">Filtrar por género</span>
							<select class="autor-genero-select" aria-label="Filtrar por género" bind:value={genreFilter}>
								<option value="">Todos los géneros</option>
								{#each genreOptions as genre}
									<option value={genre}>{genre}</option>
								{/each}
							</select>
						</label>
					</div>

					<WorksTable rows={tableRows} mode="standard" emptyMessage="" />

					{#if tableRows.length === 0}
						<div class="autor-table-empty-state alert alert-info">
							No hay obras que coincidan con el filtro actual.
						</div>
					{/if}
				</div>
			</div>
		</div>
	</div>
</div>

<style>
	.autor-view-wrapper {
		font-family: 'Roboto', sans-serif;
	}

	.autor-main-grid {
		display: grid;
		grid-template-columns: 1fr;
	}

	.autor-main-content {
		min-width: 0;
	}

	.autor-metricas-row {
		margin-bottom: 1.25rem;
	}

	.autor-stats-grid {
		display: grid;
		gap: 0.9rem;
	}

	.autor-stats-grid--primary {
		grid-template-columns: repeat(3, minmax(0, 1fr));
		margin-bottom: 0.9rem;
	}

	.autor-stats-grid--secondary {
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}

	.autor-stat-card-shell {
		position: relative;
		min-width: 0;
	}

	.autor-stat-card {
		display: block;
		width: 100%;
		border: 1px solid rgba(52, 58, 64, 0.08);
		border-radius: 10px;
		background-color: rgba(0, 51, 167, 0.05);
		padding: 1rem;
		padding-right: 3rem;
		text-align: left;
		cursor: pointer;
		transition: border-color 0.18s ease, background-color 0.18s ease, box-shadow 0.18s ease;
		appearance: none;
		font-family: 'Roboto', sans-serif;
		height: 100%;
	}

	.autor-stat-card--primary {
		padding: 1.15rem 3.25rem 1.15rem 1.25rem;
	}

	.autor-stat-card:hover,
	.autor-stat-card:focus-visible,
	.autor-stat-card.is-active {
		border-color: rgba(0, 51, 167, 0.28);
		background-color: rgba(0, 51, 167, 0.12);
		box-shadow: 0 8px 20px rgba(0, 51, 167, 0.1);
	}

	.autor-stat-card:focus-visible {
		outline: 2px solid rgba(0, 51, 167, 0.22);
		outline-offset: 2px;
	}

	.autor-stat-value {
		color: #0033a7;
		font-size: clamp(1.6rem, 2.8vw, 2rem);
		font-weight: 700;
		line-height: 1;
	}

	.autor-stat-label {
		margin-top: 0.45rem;
		color: #5a6c7d;
		font-size: 0.9rem;
		font-weight: 500;
		line-height: 1.35;
	}

	.autor-obras-section {
		margin-top: 0.2rem;
	}

	.autor-obras-toolbar {
		display: flex;
		align-items: flex-end;
		justify-content: space-between;
		gap: 1rem;
		margin-bottom: 1rem;
	}

	.autor-search-field,
	.autor-filter-field {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		width: 100%;
		font-family: 'Roboto', sans-serif;
	}

	.autor-search-field {
		max-width: 360px;
	}

	.autor-filter-field {
		min-width: 220px;
		max-width: 280px;
	}

	.autor-search-label,
	.autor-filter-label {
		color: #30465e;
		font-size: 0.9rem;
		font-weight: 500;
		line-height: 1.2;
	}

	.autor-search-input,
	.autor-genero-select {
		width: 100%;
		border: 1px solid rgba(52, 58, 64, 0.12);
		border-radius: 8px;
		background-color: #fff;
		padding: 0.7rem 0.85rem;
		color: #23384d;
		font-size: 0.95rem;
		font-family: 'Roboto', sans-serif;
		transition: border-color 0.18s ease, box-shadow 0.18s ease;
	}

	.autor-search-input:focus,
	.autor-genero-select:focus {
		border-color: rgba(0, 51, 167, 0.35);
		box-shadow: 0 0 0 3px rgba(0, 51, 167, 0.1);
		outline: none;
	}

	.autor-table-empty-state {
		margin-top: 1rem;
		border: 1px solid rgba(0, 51, 167, 0.15);
		background: rgba(0, 51, 167, 0.07);
		color: #29445f;
		border-radius: 10px;
		padding: 1rem;
	}

	@media (max-width: 1024px) {
		.autor-stats-grid--primary,
		.autor-stats-grid--secondary {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}

	@media (max-width: 768px) {
		.autor-obras-toolbar {
			align-items: stretch;
			flex-direction: column;
		}

		.autor-search-field,
		.autor-filter-field {
			min-width: 0;
			max-width: none;
		}

		.autor-stats-grid--primary,
		.autor-stats-grid--secondary {
			grid-template-columns: 1fr;
		}
	}
</style>


