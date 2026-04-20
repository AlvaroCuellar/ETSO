<script lang="ts">
	import ChevronRight from 'lucide-svelte/icons/chevron-right';
	import WorksTable from '$lib/components/search/WorksTable.svelte';
	import Breadcrumbs from '$lib/components/ui/Breadcrumbs.svelte';
	import CitationSuggestionCard from '$lib/components/ui/CitationSuggestionCard.svelte';
	import PageHero from '$lib/components/ui/PageHero.svelte';
	import informeBg from '$lib/assets/heros/informes.png';
	import { ambitoLabels, ambitos, type Ambito, type AttributionSet, type ObraTableRow } from '$lib/domain/catalog';

	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let activeAmbito = $state<Ambito>('obracompleta');

	const availableAmbitos = $derived.by(() =>
		ambitos.filter((ambito) => (data.distances[ambito] ?? []).length > 0)
	);

	$effect(() => {
		if (availableAmbitos.length === 0) return;
		if (availableAmbitos.includes(activeAmbito)) return;
		activeAmbito = availableAmbitos[0];
	});

	const badgeColor = (distance: number): string => {
		if (distance <= 0.75) return '#1f7a4a';
		if (distance <= 1.15) return '#2f855a';
		if (distance <= 1.5) return '#3366cc';
		return '#6c757d';
	};

	const normalizeText = (value: string): string =>
		value
			.normalize('NFD')
			.replace(/[\u0300-\u036f]/g, '')
			.toLowerCase()
			.trim();

	const traditionalAttributionText = (set: AttributionSet): string => {
		if (set.unresolved || set.groups.length === 0) return 'autoría no determinada';
		const connector = set.connector === 'and' ? ' y ' : ' o ';
		const groups = set.groups.map((group) => group.members.map((member) => member.authorName).join(' y '));
		return groups.join(connector);
	};

	const attributedWord = (genre: string): 'atribuido' | 'atribuida' => {
		const normalized = normalizeText(genre);
		if (!normalized) return 'atribuido';
		if (
			normalized.endsWith('a') ||
			normalized.includes('comedia') ||
			normalized.includes('tragedia') ||
			normalized.includes('loa') ||
			normalized.includes('zarzuela') ||
			normalized.includes('farsa')
		) {
			return 'atribuida';
		}
		return 'atribuido';
	};

	const procedeValue = $derived.by(() => {
		const origin = data.work.origin?.trim();
		if (!origin || normalizeText(origin) === 'no disponible') return 'No disponible.';
		const cleaned = origin
			.replace(/^procede\s+de\s+/i, '')
			.replace(/^procede\s+/i, '')
			.trim();
		if (!cleaned) return 'No disponible.';
		return cleaned.endsWith('.') ? cleaned : `${cleaned}.`;
	});

	const methodologyLead =
		'Se ofrecen a continuación las 20 obras con usos léxicos más cercanos, tanto a la obra completa como, cuando es posible, a cada una de sus jornadas, empleando un corpus constituido por 3000 obras de 400 autores diferentes. Las distancias han sido calculadas usando las frecuencias de las 500 palabras más usuales con el método Delta de Burrows. Cuanto mayor cercanía hay a 0,0 es mayor la afinidad.';

	const regularSections = $derived.by(() => data.bibliography.sections.filter((section) => !section.collapsible));
	const collapsibleSections = $derived.by(() =>
		data.bibliography.sections.filter((section) => section.collapsible)
	);
	const citationSection = $derived.by(() => regularSections[0] ?? null);
	const citationEntry = $derived.by(() => {
		if (!citationSection) return null;
		return (
			citationSection.entries.find((entry) => entry.id === 'etso-web') ??
			citationSection.entries[0] ??
			null
		);
	});
	const citationSectionEntries = $derived.by(() => {
		if (!citationSection) return [];
		if (!citationEntry) return citationSection.entries;
		return citationSection.entries.filter((entry) => entry.id !== citationEntry.id);
	});
	const extraRegularSections = $derived.by(() => {
		if (!citationSection) return regularSections;
		return regularSections.filter((section) => section.id !== citationSection.id);
	});

	const rowsByAmbito = $derived.by<Record<Ambito, ObraTableRow[]>>(() => ({
		obracompleta: data.distances.obracompleta.map((row) => ({
			rowId: `obracompleta-${row.relatedWork.id}`,
			work: row.relatedWork,
			position: row.rank,
			distancia: row.distancia,
			badgeColor: badgeColor(row.distancia)
		})),
		jornada1: data.distances.jornada1.map((row) => ({
			rowId: `jornada1-${row.relatedWork.id}`,
			work: row.relatedWork,
			position: row.rank,
			distancia: row.distancia,
			badgeColor: badgeColor(row.distancia)
		})),
		jornada2: data.distances.jornada2.map((row) => ({
			rowId: `jornada2-${row.relatedWork.id}`,
			work: row.relatedWork,
			position: row.rank,
			distancia: row.distancia,
			badgeColor: badgeColor(row.distancia)
		})),
		jornada3: data.distances.jornada3.map((row) => ({
			rowId: `jornada3-${row.relatedWork.id}`,
			work: row.relatedWork,
			position: row.rank,
			distancia: row.distancia,
			badgeColor: badgeColor(row.distancia)
		})),
		jornada4: data.distances.jornada4.map((row) => ({
			rowId: `jornada4-${row.relatedWork.id}`,
			work: row.relatedWork,
			position: row.rank,
			distancia: row.distancia,
			badgeColor: badgeColor(row.distancia)
		})),
		jornada5: data.distances.jornada5.map((row) => ({
			rowId: `jornada5-${row.relatedWork.id}`,
			work: row.relatedWork,
			position: row.rank,
			distancia: row.distancia,
			badgeColor: badgeColor(row.distancia)
		}))
	}));
</script>

<div class="page-stack">
	<Breadcrumbs
		items={[
			{ label: 'Inicio', href: '/' },
			{ label: 'Examen de autorías', href: '/examen-autorias' },
			{ label: data.work.title, href: `/obras/${data.work.slug}` },
			{ label: 'Informe' }
		]}
	/>

	<PageHero
		compact
		eyebrow="Informe estilométrico"
		title={data.informe.title}
		backgroundImage={informeBg}
	/>
	<section class="informe-contexto">
		<div class="informe-contexto-intro">
			<p class="informe-contexto-line informe-contexto-line--principal">
				<strong>{data.work.genre}</strong>
				{attributedWord(data.work.genre)} a <strong>{traditionalAttributionText(data.work.traditionalAttribution)}</strong>.
			</p>
			<div class="informe-contexto-bloque">
				<div class="informe-mini-title ui-title-kicker">Procedencia</div>
				<p class="informe-contexto-line informe-contexto-line--secundaria">{procedeValue}</p>
			</div>
		</div>
		<div class="informe-metodologia-card">
			<p class="informe-metodologia-text">{methodologyLead}</p>
		</div>
	</section>

	<section class="informe-obras-section">
		<h2 class="informe-obras-title ui-title-section">Obras más cercanas por ámbito</h2>

		<div class="obras-cercanas-tabs mt-4">
			{#if availableAmbitos.length > 1}
				<div class="mobile-tab-selector mb-3">
					<select
						id="mobile-acto-selector"
						value={activeAmbito}
						onchange={(event) => {
							activeAmbito = (event.currentTarget as HTMLSelectElement).value as Ambito;
						}}
					>
						{#each availableAmbitos as ambito}
							<option value={ambito}>{ambitoLabels[ambito]} ({rowsByAmbito[ambito].length})</option>
						{/each}
					</select>
				</div>

				<ul class="nav nav-tabs" role="tablist">
					{#each availableAmbitos as ambito}
						<li class="nav-item">
							<button
								type="button"
								class="nav-link"
								class:active={activeAmbito === ambito}
								data-tab={`acto-${ambito}`}
								onclick={() => {
									activeAmbito = ambito;
								}}
							>
								{ambitoLabels[ambito]} <span class="badge">{rowsByAmbito[ambito].length}</span>
							</button>
						</li>
					{/each}
				</ul>
			{/if}

			<div class="tab-content">
				{#if availableAmbitos.length === 0}
					<div class="alert alert-info">No hay distancias disponibles para este informe.</div>
				{:else}
					{#each availableAmbitos as ambito}
						<div class="tab-pane" id={`acto-${ambito}`} class:active={activeAmbito === ambito}>
							<WorksTable
								rows={rowsByAmbito[ambito]}
								mode="informe"
								emptyMessage="No hay obras cercanas disponibles en este ámbito."
							/>
						</div>
					{/each}
				{/if}
			</div>
		</div>
	</section>

	<section class="informe-resultados">
		<h2 class="informe-resultados-title ui-title-section">Resultados</h2>
		{#if data.work.result1}
			<p class="informe-resultado-item">{data.work.result1}</p>
		{/if}
		{#if data.work.result2}
			<p class="informe-resultado-item">{data.work.result2}</p>
		{/if}
	</section>

	<section class="informe-bibliografia">
		<div class="informe-bibliografia-header">
			<h2 class="informe-bibliografia-title ui-title-section">Referencias</h2>
		</div>

		{#if data.bibliography.sections.length === 0}
			<div class="alert alert-info">No hay referencias disponibles para este informe.</div>
		{:else}
			<div class="informe-bibliografia-grid">
				{#if citationEntry}
					<CitationSuggestionCard
						citation={citationEntry.text}
						label="Cita sugerida"
						buttonLabel="Copiar cita ETSO"
						successMessage="Cita ETSO copiada."
						emptyCitationMessage="No hay cita ETSO disponible."
						copyErrorMessage="No se pudo copiar automáticamente."
					>
						<p class="informe-bibliografia-entry">
							{#each citationEntry.parts as part}
								{#if part.kind === 'link'}
									<a
										href={part.href ?? part.value}
										target="_blank"
										rel="noopener noreferrer"
										class="informe-bibliografia-link"
									>
										{part.value}
									</a>
								{:else if part.kind === 'italic'}
									<em>{part.value}</em>
								{:else}
									{part.value}
								{/if}
							{/each}
						</p>
					</CitationSuggestionCard>
				{/if}

				{#if citationSection && citationSectionEntries.length > 0}
					<section class="informe-bibliografia-section" aria-label={citationSection.lead}>
						<p class="informe-bibliografia-lead">{citationSection.lead}</p>
						<ol class="informe-bibliografia-list">
							{#each citationSectionEntries as entry}
								<li>
									<p class="informe-bibliografia-entry">
										{#each entry.parts as part}
											{#if part.kind === 'link'}
												<a
													href={part.href ?? part.value}
													target="_blank"
													rel="noopener noreferrer"
													class="informe-bibliografia-link"
												>
													{part.value}
												</a>
											{:else if part.kind === 'italic'}
												<em>{part.value}</em>
											{:else}
												{part.value}
											{/if}
										{/each}
									</p>
								</li>
							{/each}
						</ol>
					</section>
				{/if}

				{#each extraRegularSections as section}
					<section class="informe-bibliografia-section" aria-label={section.lead}>
						<p class="informe-bibliografia-lead">{section.lead}</p>
						<ol class="informe-bibliografia-list">
							{#each section.entries as entry}
								<li>
									<p class="informe-bibliografia-entry">
										{#each entry.parts as part}
											{#if part.kind === 'link'}
												<a
													href={part.href ?? part.value}
													target="_blank"
													rel="noopener noreferrer"
													class="informe-bibliografia-link"
												>
													{part.value}
												</a>
											{:else if part.kind === 'italic'}
												<em>{part.value}</em>
											{:else}
												{part.value}
											{/if}
										{/each}
									</p>
								</li>
							{/each}
						</ol>
					</section>
				{/each}

				{#each collapsibleSections as section}
					<details class="informe-bibliografia-disclosure" open={section.defaultOpen === true}>
						<summary class="informe-bibliografia-summary">
							<span class="informe-bibliografia-summary-inner">
								<span class="informe-bibliografia-summary-icon" aria-hidden="true">
									<ChevronRight />
								</span>
								<span>{section.collapsibleLabel || 'Más información'}</span>
							</span>
						</summary>
						<div class="informe-bibliografia-disclosure-body" aria-label={section.lead}>
							<p class="informe-bibliografia-lead">{section.lead}</p>
							<ol class="informe-bibliografia-list">
								{#each section.entries as entry}
									<li>
										<p class="informe-bibliografia-entry">
											{#each entry.parts as part}
												{#if part.kind === 'link'}
													<a
														href={part.href ?? part.value}
														target="_blank"
														rel="noopener noreferrer"
														class="informe-bibliografia-link"
													>
														{part.value}
													</a>
												{:else if part.kind === 'italic'}
													<em>{part.value}</em>
												{:else}
													{part.value}
												{/if}
											{/each}
										</p>
									</li>
								{/each}
							</ol>
						</div>
					</details>
				{/each}
			</div>
		{/if}
	</section>
</div>

<style>
	.obras-cercanas-tabs,
	.obras-cercanas-tabs .nav-link,
	.obras-cercanas-tabs .badge,
	.mobile-tab-selector select {
		font-family: 'Roboto', sans-serif;
	}

	.mobile-tab-selector {
		margin-bottom: 1rem;
	}

	.informe-contexto {
		font-family: 'Roboto', sans-serif;
		display: grid;
		gap: 0.9rem;
	}

	.informe-contexto-intro {
		display: grid;
		gap: 0.55rem;
	}

	.informe-contexto-bloque {
		display: grid;
		gap: 0.2rem;
	}

	.informe-mini-title {
		margin: 0;
	}

	.informe-contexto-line {
		margin: 0;
		font-size: 1rem;
		line-height: 1.55;
		color: #1f344a;
	}

	.informe-contexto-line--principal {
		font-weight: 500;
		color: #1b2f45;
	}

	.informe-contexto-line--secundaria {
		color: #3e556d;
	}

	.informe-metodologia-card {
		border: 1px solid rgba(0, 51, 167, 0.16);
		border-radius: 10px;
		background: linear-gradient(180deg, rgba(0, 51, 167, 0.06), rgba(0, 51, 167, 0.03));
		padding: 0.9rem 1rem;
	}

	.informe-metodologia-text {
		margin: 0;
		font-size: 0.97rem;
		line-height: 1.55;
		color: #1a2f45;
		font-weight: 400;
	}

	.informe-resultados {
		display: grid;
		gap: 0.65rem;
		font-family: 'Roboto', sans-serif;
	}

	.informe-resultados-title {
		margin: 0 0 0.1rem;
	}

	.informe-resultado-item {
		margin: 0;
		padding: 0.75rem 0.95rem;
		font-size: 1rem;
		line-height: 1.55;
		color: #22384f;
		background: rgba(0, 51, 167, 0.04);
		border: 1px solid rgba(0, 51, 167, 0.14);
		border-radius: 8px;
	}

	.informe-bibliografia {
		display: grid;
		gap: 0.9rem;
		font-family: 'Roboto', sans-serif;
	}

	.informe-bibliografia-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.9rem;
		flex-wrap: wrap;
	}

	.informe-bibliografia-title {
		margin: 0;
	}

	.informe-bibliografia-grid {
		display: grid;
		gap: 0.85rem;
	}

	.informe-bibliografia-disclosure {
		border: 1px solid rgba(0, 51, 167, 0.2);
		border-radius: 10px;
		background: rgba(0, 51, 167, 0.03);
		overflow: hidden;
	}

	.informe-bibliografia-summary {
		cursor: pointer;
		padding: 0.65rem 0.9rem;
		font-size: 0.9rem;
		font-weight: 600;
		color: #1f344a;
		list-style: none;
	}

	.informe-bibliografia-summary::-webkit-details-marker {
		display: none;
	}

	.informe-bibliografia-summary::marker {
		content: '';
	}

	.informe-bibliografia-summary-inner {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
	}

	.informe-bibliografia-summary-icon {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 13px;
		height: 13px;
		color: #0033a7;
		transition: transform 0.15s ease;
	}

	.informe-bibliografia-summary-icon :global(svg) {
		width: 13px;
		height: 13px;
		stroke-width: 2.2;
	}

	.informe-bibliografia-disclosure[open] .informe-bibliografia-summary-icon {
		transform: rotate(90deg);
	}

	.informe-bibliografia-disclosure-body {
		padding: 0 0.9rem 0.8rem;
		border-top: 1px solid rgba(0, 51, 167, 0.12);
	}

	.informe-bibliografia-section {
		border: 1px solid rgba(0, 51, 167, 0.12);
		background: rgba(0, 51, 167, 0.03);
		border-radius: 10px;
		padding: 0.8rem 0.9rem;
	}

	.informe-bibliografia-lead {
		margin: 0 0 0.65rem;
		font-size: 0.95rem;
		font-weight: 500;
		line-height: 1.45;
		color: #22384f;
	}

	.informe-bibliografia-list {
		margin: 0;
		padding-left: 1.2rem;
		display: grid;
		gap: 0.55rem;
	}

	.informe-bibliografia-list li {
		margin: 0;
	}

	.informe-bibliografia-entry {
		margin: 0;
		font-size: 0.95rem;
		line-height: 1.52;
		color: #263f58;
	}

	.informe-bibliografia-entry em {
		font-style: italic;
	}

	.informe-bibliografia-link {
		color: #0033a7;
		text-decoration: underline;
		word-break: break-word;
	}

	.informe-bibliografia-link:hover,
	.informe-bibliografia-link:focus-visible {
		color: #00287f;
	}

	.mobile-tab-selector select {
		width: 100%;
		font-weight: 600;
		color: #0d6efd;
		border: 2px solid #0d6efd;
		border-radius: 8px;
		padding: 0.75rem 1rem;
		background-color: #f8f9fa;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.mobile-tab-selector select:focus {
		box-shadow: 0 0 0 0.25rem rgba(13, 110, 253, 0.25);
		outline: none;
	}

	.obras-cercanas-tabs .nav-tabs {
		list-style: none;
		padding: 0;
		display: flex;
		gap: 0.5rem;
		border-bottom: 2px solid #dee2e6;
		margin-bottom: 1.5rem;
	}

	.obras-cercanas-tabs .nav-item {
		margin-bottom: -2px;
	}

	.obras-cercanas-tabs .nav-link {
		border: none;
		color: #6c757d;
		padding: 0.75rem 1.5rem;
		cursor: pointer;
		background: none;
		transition: all 0.2s ease;
	}

	.obras-cercanas-tabs .nav-link:hover {
		color: #495057;
	}

	.obras-cercanas-tabs .nav-link.active {
		color: #0d6efd;
		border-bottom: 2px solid #0d6efd;
		font-weight: 600;
	}

	.obras-cercanas-tabs .badge {
		background: #6c757d;
		color: #fff;
		font-size: 0.75rem;
		padding: 0.25rem 0.5rem;
		border-radius: 10px;
		margin-left: 0.5rem;
	}

	.obras-cercanas-tabs .tab-pane {
		display: none;
	}

	.obras-cercanas-tabs .tab-pane.active {
		display: block;
	}

	.alert.alert-info {
		border: 1px solid rgba(0, 51, 167, 0.15);
		background: rgba(0, 51, 167, 0.07);
		color: #29445f;
		border-radius: 10px;
		padding: 1rem;
		font-family: 'Roboto', sans-serif;
	}

	.informe-obras-section {
		margin-top: 0.25rem;
	}

	.informe-obras-title {
		margin: 0 0 0.9rem;
	}

	@media (max-width: 768px) {
		.informe-metodologia-card {
			padding: 0.8rem 0.85rem;
		}

		.informe-resultado-item {
			padding: 0.7rem 0.8rem;
		}

		.informe-bibliografia-section {
			padding: 0.75rem 0.8rem;
		}

		.informe-bibliografia-summary {
			padding: 0.6rem 0.8rem;
		}

		.informe-bibliografia-disclosure-body {
			padding: 0 0.8rem 0.75rem;
		}
	}
</style>



