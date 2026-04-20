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

<div class="grid gap-6">
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

	<section class="grid gap-4 font-ui">
		<div class="grid gap-2.5">
			<p class="m-0 text-base font-medium leading-[1.55] text-[#1b2f45]">
				<strong>{data.work.genre}</strong>
				{attributedWord(data.work.genre)} a <strong>{traditionalAttributionText(data.work.traditionalAttribution)}</strong
				>.
			</p>
			<div class="grid gap-1">
				<div class="m-0 text-[0.72rem] font-bold uppercase tracking-[0.06em] text-[#4c6177]">Procedencia</div>
				<p class="m-0 text-base leading-[1.55] text-[#3e556d]">{procedeValue}</p>
			</div>
		</div>
		<div
			class="rounded-[10px] border border-[rgba(0,51,167,0.16)] px-4 py-3 max-md:px-[0.85rem] max-md:py-[0.8rem]"
			style="background: linear-gradient(180deg, rgba(0, 51, 167, 0.06), rgba(0, 51, 167, 0.03));"
		>
			<p class="m-0 text-[0.97rem] font-normal leading-[1.55] text-[#1a2f45]">{methodologyLead}</p>
		</div>
	</section>

	<section class="mt-1">
		<h2 class="mb-4 mt-0 text-[clamp(1.2rem,2vw,1.45rem)] font-semibold leading-[1.2] text-[#1b2f45]">
			Obras más cercanas por ámbito
		</h2>

		<div class="font-ui">
			{#if availableAmbitos.length > 1}
				<div class="mb-3 md:hidden">
					<select
						id="mobile-acto-selector"
						class="w-full cursor-pointer rounded-[8px] border-2 border-[#0d6efd] bg-[#f8f9fa] px-4 py-3 font-semibold text-[#0d6efd] transition-all focus:outline-none focus:ring-4 focus:ring-[rgba(13,110,253,0.25)]"
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

				<ul class="mb-6 hidden list-none gap-2 border-b-2 border-[#dee2e6] p-0 md:flex" role="tablist">
					{#each availableAmbitos as ambito}
						<li class="-mb-[2px]">
							<button
								type="button"
								class={`cursor-pointer border-b-2 bg-transparent px-6 py-3 text-[0.95rem] transition-all ${
									activeAmbito === ambito
										? 'border-[#0d6efd] font-semibold text-[#0d6efd]'
										: 'border-transparent text-[#6c757d] hover:text-[#495057]'
								}`}
								data-tab={`acto-${ambito}`}
								onclick={() => {
									activeAmbito = ambito;
								}}
							>
								{ambitoLabels[ambito]}
								<span
									class="ml-2 inline-flex rounded-[10px] bg-[#6c757d] px-2 py-1 text-[0.75rem] leading-none text-white"
								>
									{rowsByAmbito[ambito].length}
								</span>
							</button>
						</li>
					{/each}
				</ul>
			{/if}

			<div>
				{#if availableAmbitos.length === 0}
					<div class="rounded-[10px] border border-[rgba(0,51,167,0.15)] bg-[rgba(0,51,167,0.07)] p-4 text-[#29445f]">
						No hay distancias disponibles para este informe.
					</div>
				{:else}
					{#each availableAmbitos as ambito}
						<div class={activeAmbito === ambito ? 'block' : 'hidden'} id={`acto-${ambito}`}>
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

	<section class="grid gap-3 font-ui">
		<h2 class="m-0 text-[clamp(1.2rem,2vw,1.45rem)] font-semibold leading-[1.2] text-[#1b2f45]">Resultados</h2>
		{#if data.work.result1}
			<p
				class="m-0 rounded-[8px] border border-[rgba(0,51,167,0.14)] bg-[rgba(0,51,167,0.04)] px-[0.95rem] py-3 text-base leading-[1.55] text-[#22384f] max-md:px-[0.8rem] max-md:py-[0.7rem]"
			>
				{data.work.result1}
			</p>
		{/if}
		{#if data.work.result2}
			<p
				class="m-0 rounded-[8px] border border-[rgba(0,51,167,0.14)] bg-[rgba(0,51,167,0.04)] px-[0.95rem] py-3 text-base leading-[1.55] text-[#22384f] max-md:px-[0.8rem] max-md:py-[0.7rem]"
			>
				{data.work.result2}
			</p>
		{/if}
	</section>

	<section class="grid gap-4 font-ui">
		<div class="flex flex-wrap items-center justify-between gap-4">
			<h2 class="m-0 text-[clamp(1.2rem,2vw,1.45rem)] font-semibold leading-[1.2] text-[#1b2f45]">
				Referencias
			</h2>
		</div>

		{#if data.bibliography.sections.length === 0}
			<div class="rounded-[10px] border border-[rgba(0,51,167,0.15)] bg-[rgba(0,51,167,0.07)] p-4 text-[#29445f]">
				No hay referencias disponibles para este informe.
			</div>
		{:else}
			<div class="grid gap-3.5">
				{#if citationEntry}
					<CitationSuggestionCard
						citation={citationEntry.text}
						label="Cita sugerida"
						buttonLabel="Copiar cita ETSO"
						successMessage="Cita ETSO copiada."
						emptyCitationMessage="No hay cita ETSO disponible."
						copyErrorMessage="No se pudo copiar automáticamente."
					>
						<p class="m-0 text-[0.95rem] leading-[1.52] text-[#263f58]">
							{#each citationEntry.parts as part}
								{#if part.kind === 'link'}
									<a
										href={part.href ?? part.value}
										target="_blank"
										rel="noopener noreferrer"
										class="break-words text-[#0033a7] underline hover:text-[#00287f] focus-visible:text-[#00287f]"
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
					<section
						class="rounded-[10px] border border-[rgba(0,51,167,0.12)] bg-[rgba(0,51,167,0.03)] px-[0.9rem] py-[0.8rem] max-md:px-[0.8rem] max-md:py-[0.75rem]"
						aria-label={citationSection.lead}
					>
						<p class="mb-[0.65rem] mt-0 text-[0.95rem] font-medium leading-[1.45] text-[#22384f]">
							{citationSection.lead}
						</p>
						<ol class="m-0 grid gap-[0.55rem] pl-[1.2rem]">
							{#each citationSectionEntries as entry}
								<li class="m-0">
									<p class="m-0 text-[0.95rem] leading-[1.52] text-[#263f58]">
										{#each entry.parts as part}
											{#if part.kind === 'link'}
												<a
													href={part.href ?? part.value}
													target="_blank"
													rel="noopener noreferrer"
													class="break-words text-[#0033a7] underline hover:text-[#00287f] focus-visible:text-[#00287f]"
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
					<section
						class="rounded-[10px] border border-[rgba(0,51,167,0.12)] bg-[rgba(0,51,167,0.03)] px-[0.9rem] py-[0.8rem] max-md:px-[0.8rem] max-md:py-[0.75rem]"
						aria-label={section.lead}
					>
						<p class="mb-[0.65rem] mt-0 text-[0.95rem] font-medium leading-[1.45] text-[#22384f]">
							{section.lead}
						</p>
						<ol class="m-0 grid gap-[0.55rem] pl-[1.2rem]">
							{#each section.entries as entry}
								<li class="m-0">
									<p class="m-0 text-[0.95rem] leading-[1.52] text-[#263f58]">
										{#each entry.parts as part}
											{#if part.kind === 'link'}
												<a
													href={part.href ?? part.value}
													target="_blank"
													rel="noopener noreferrer"
													class="break-words text-[#0033a7] underline hover:text-[#00287f] focus-visible:text-[#00287f]"
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
					<details
						class="informe-bibliografia-disclosure overflow-hidden rounded-[10px] border border-[rgba(0,51,167,0.2)] bg-[rgba(0,51,167,0.03)]"
						open={section.defaultOpen === true}
					>
						<summary class="informe-bibliografia-summary cursor-pointer list-none px-[0.9rem] py-[0.65rem] text-[0.9rem] font-semibold text-[#1f344a] max-md:px-[0.8rem] max-md:py-[0.6rem]">
							<span class="inline-flex items-center gap-[0.35rem]">
								<span
									class="informe-bibliografia-summary-icon inline-flex h-[13px] w-[13px] items-center justify-center text-[#0033a7] transition-transform"
									aria-hidden="true"
								>
									<ChevronRight size={13} strokeWidth={2.2} />
								</span>
								<span>{section.collapsibleLabel || 'Más información'}</span>
							</span>
						</summary>
						<div
							class="border-t border-[rgba(0,51,167,0.12)] px-[0.9rem] pb-[0.8rem] pt-0 max-md:px-[0.8rem] max-md:pb-[0.75rem]"
							aria-label={section.lead}
						>
							<p class="mb-[0.65rem] mt-0 text-[0.95rem] font-medium leading-[1.45] text-[#22384f]">
								{section.lead}
							</p>
							<ol class="m-0 grid gap-[0.55rem] pl-[1.2rem]">
								{#each section.entries as entry}
									<li class="m-0">
										<p class="m-0 text-[0.95rem] leading-[1.52] text-[#263f58]">
											{#each entry.parts as part}
												{#if part.kind === 'link'}
													<a
														href={part.href ?? part.value}
														target="_blank"
														rel="noopener noreferrer"
														class="break-words text-[#0033a7] underline hover:text-[#00287f] focus-visible:text-[#00287f]"
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
	.informe-bibliografia-summary::-webkit-details-marker {
		display: none;
	}

	.informe-bibliografia-summary::marker {
		content: '';
	}

	.informe-bibliografia-disclosure[open] .informe-bibliografia-summary-icon {
		transform: rotate(90deg);
	}
</style>


