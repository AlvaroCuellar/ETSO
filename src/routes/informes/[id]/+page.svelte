<script lang="ts">
	import ChevronRight from 'lucide-svelte/icons/chevron-right';
	import WorksTable from '$lib/components/search/WorksTable.svelte';
	import Breadcrumbs from '$lib/components/ui/Breadcrumbs.svelte';
	import CitationSuggestionCard from '$lib/components/ui/CitationSuggestionCard.svelte';
	import PageHero from '$lib/components/ui/PageHero.svelte';
	import informeBg from '$lib/assets/heros/informes.png';
	import { ambitoLabels, ambitos, type Ambito, type AttributionSet, type ObraTableRow } from '$lib/domain/catalog';
	import {
		formatDisplayWorkTitle,
		formatPrefixedDisplayWorkTitleHtml
	} from '$lib/utils/format-display-work-title';

	import type { PageData } from './$types';

	interface ResultTextPart {
		kind: 'text' | 'author';
		value: string;
		authorId?: string;
	}

	interface AuthorReference {
		authorId: string;
		authorName: string;
	}

	let { data }: { data: PageData } = $props();
	const displayWorkTitle = $derived.by(() => formatDisplayWorkTitle(data.work.title));
	const displayInformeTitle = $derived.by(() => `Análisis estilométrico de ${displayWorkTitle}`);
	const displayInformeTitleHtml = $derived.by(() =>
		formatPrefixedDisplayWorkTitleHtml('Análisis estilométrico de', data.work.title)
	);

	let activeAmbito = $state<Ambito>('obracompleta');

	const authorNameById = $derived.by(() => new Map(data.authors.map((author) => [author.id, author.name] as const)));

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
		if (distance <= 1.5) return '#0D3F91';
		return '#6c757d';
	};

	const normalizeText = (value: string): string =>
		value
			.normalize('NFD')
			.replace(/[\u0300-\u036f]/g, '')
			.toLowerCase()
			.trim();

	const formatNameList = (names: string[], connector: 'y' | 'o'): string => {
		if (names.length <= 1) return names[0] ?? '';
		if (names.length === 2) return `${names[0]} ${connector} ${names[1]}`;
		return `${names.slice(0, -1).join(', ')} ${connector} ${names[names.length - 1]}`;
	};

	const formatAuthorListParts = (authors: AuthorReference[], connector: 'y' | 'o'): ResultTextPart[] => {
		const parts: ResultTextPart[] = [];
		for (const [index, author] of authors.entries()) {
			if (index > 0) {
				parts.push({
					kind: 'text',
					value: index === authors.length - 1 ? ` ${connector} ` : ', '
				});
			}
			parts.push({
				kind: 'author',
				value: author.authorName,
				authorId: author.authorId
			});
		}
		return parts;
	};

	const buildTraditionalAttributionParts = (set: AttributionSet): ResultTextPart[] => {
		const authors = set.groups.flatMap((group) =>
			group.members
				.map((member) => ({
					authorId: member.authorId,
					authorName: member.authorName.trim()
				}))
				.filter((member) => member.authorName.length > 0)
		);
		if (set.unresolved || authors.length === 0) {
			return [{ kind: 'text', value: 'Obra sin atribución tradicional determinada.' }];
		}
		if (authors.length === 1) {
			return [
				{ kind: 'text', value: 'Obra atribuida a ' },
				...formatAuthorListParts(authors, 'y'),
				{ kind: 'text', value: '.' }
			];
		}
		if (set.connector === 'and') {
			return [
				{ kind: 'text', value: 'Obra atribuida a la escritura en colaboración entre ' },
				...formatAuthorListParts(authors, 'y'),
				{ kind: 'text', value: '.' }
			];
		}
		return [
			{ kind: 'text', value: 'Obra atribuida a ' },
			...formatAuthorListParts(authors, 'o'),
			{ kind: 'text', value: '.' }
		];
	};

	const traditionalAttributionParts = $derived.by(() =>
		buildTraditionalAttributionParts(data.work.traditionalAttribution)
	);

	const hasAutomaticMarker = (value: string): boolean => {
		const normalized = normalizeText(value);
		return normalized.includes('automatico') || /\bauto\b/.test(normalized);
	};

	const stylometryResultSentence = (set: AttributionSet): string => {
		const rawExpression = normalizeText(set.rawExpression ?? '');
		if (rawExpression.includes('no_apunta_a_ningun_autor')) {
			return 'Los análisis de estilometría no permiten asociar esta obra de forma clara con ningún perfil autorial del corpus.';
		}
		if (rawExpression.includes('no_es_posible')) {
			return 'Los análisis de estilometría no permiten evaluar la asociación de esta obra con el perfil autorial del autor tradicional, debido a lo reducido de su corpus de comparación. Tampoco identifican de forma clara una alternativa autorial.';
		}
		if (rawExpression.includes('no_analizada')) {
			return 'Esta obra no ha sido analizada estilométricamente, por lo que no es posible valorar su asociación con ningún perfil autorial del corpus.';
		}
		if (rawExpression.includes('pendiente_profundidad')) {
			return 'Los resultados estilométricos disponibles requieren una revisión en profundidad antes de formular una conclusión autorial.';
		}

		const members = set.groups.flatMap((group) => group.members).filter((member) => member.authorName.trim());
		const names = members.map((member) => member.authorName.trim());
		const allProbable = members.length > 0 && members.every((member) => member.confidence === 'probable');

		if (members.length === 1 && members[0].confidence === 'segura') {
			return `Los análisis de estilometría permiten asociar esta obra de forma clara con el perfil autorial de ${names[0]}.`;
		}
		if (members.length === 1 && members[0].confidence === 'probable') {
			return `Los análisis de estilometría permiten asociar esta obra con el perfil autorial de ${names[0]}, por cuanto algunas de sus obras aparecen en las primeras posiciones, aunque no de forma concluyente.`;
		}
		if (members.length > 1 && set.connector === 'and' && allProbable) {
			return `Los análisis de estilometría permiten asociar esta obra con los perfiles autoriales de ${formatNameList(names, 'y')}, por cuanto algunas de sus obras aparecen en las primeras posiciones, aunque no de forma concluyente.`;
		}

		return 'Los resultados estilométricos disponibles requieren revisión antes de formular una conclusión autorial.';
	};

	const resolveResult1Text = (): string => {
		const result = data.work.result1?.trim() ?? '';
		if (!result) return '';
		return hasAutomaticMarker(result) ? stylometryResultSentence(data.work.stylometryAttribution) : result;
	};

	const tokenizeResultText = (value: string): ResultTextPart[] => {
		const parts: ResultTextPart[] = [];
		const authorKeyPattern = /#([A-Za-z0-9_]+)/g;
		let lastIndex = 0;
		let match: RegExpExecArray | null;

		while ((match = authorKeyPattern.exec(value)) !== null) {
			if (match.index > lastIndex) {
				parts.push({
					kind: 'text',
					value: value.slice(lastIndex, match.index)
				});
			}

			const authorId = match[1];
			const authorName = authorNameById.get(authorId);
			parts.push(
				authorName
					? {
							kind: 'author',
							value: authorName,
							authorId
						}
					: {
							kind: 'text',
							value: match[0]
						}
			);
			lastIndex = authorKeyPattern.lastIndex;
		}

		if (lastIndex < value.length) {
			parts.push({
				kind: 'text',
				value: value.slice(lastIndex)
			});
		}

		return parts;
	};

	const result1Parts = $derived.by(() => tokenizeResultText(resolveResult1Text()));
	const result2Parts = $derived.by(() => tokenizeResultText(data.work.result2?.trim() ?? ''));

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
			{ label: 'Obras', href: '/examen-autorias/obras' },
			{ label: displayWorkTitle, href: `/obras/${data.work.slug}` },
			{ label: 'Informe' }
		]}
	/>

	<PageHero
		compact
		eyebrow="Informe estilométrico"
		title={displayInformeTitle}
		titleHtml={displayInformeTitleHtml}
		backgroundImage={informeBg}
	/>

	<section class="font-ui">
		<dl class="m-0 grid gap-4 rounded-[10px] bg-surface-soft px-4 py-4 md:grid-cols-[minmax(9rem,0.55fr)_minmax(0,1.45fr)] md:px-5">
			<div class="grid content-start gap-1.5">
				<dt class="m-0 text-[0.72rem] font-bold uppercase tracking-[0.06em] text-text-accent-purple">
					Atribución tradicional
				</dt>
				<dd class="m-0 text-base leading-[1.55] text-text-main">
					{#each traditionalAttributionParts as part}
						{#if part.kind === 'author' && part.authorId}
							<a href={`/autores/${part.authorId}`} class="font-semibold text-brand-blue underline hover:text-brand-blue-dark focus-visible:text-brand-blue-dark">
								{part.value}
							</a>
						{:else}
							{part.value}
						{/if}
					{/each}
				</dd>
			</div>

			<div class="grid content-start gap-1.5">
				<dt class="m-0 text-[0.72rem] font-bold uppercase tracking-[0.06em] text-text-accent-purple">
					Género
				</dt>
				<dd class="m-0 text-base leading-[1.55] text-text-main">{data.work.genre}</dd>
			</div>

			<div class="grid content-start gap-1.5 md:col-span-2">
				<dt class="m-0 text-[0.72rem] font-bold uppercase tracking-[0.06em] text-text-accent-purple">
					Procedencia
				</dt>
				<dd class="m-0 text-base leading-[1.6] text-text-main">{procedeValue}</dd>
			</div>
		</dl>
	</section>

	<section class="mt-1">
		<div class="mb-5 grid gap-2">
			<h2 class="m-0 text-[clamp(1.2rem,2vw,1.45rem)] font-semibold leading-[1.2] text-brand-blue-dark">
				Obras más cercanas por ámbito
			</h2>
			<p class="m-0 text-[0.97rem] leading-[1.62] text-text-soft">{methodologyLead}</p>
		</div>

		<div class="font-ui">
			{#if availableAmbitos.length > 1}
				<div class="mb-3 md:hidden">
					<select
						id="mobile-acto-selector"
						class="w-full cursor-pointer rounded-[8px] border-2 border-border-accent-blue bg-surface-accent-blue px-4 py-3 font-semibold text-brand-blue-dark transition-all focus:outline-none focus:ring-4 focus:ring-brand-blue/15"
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

				<ul class="mb-6 hidden list-none gap-2 border-b-2 border-border-accent-blue p-0 pb-2 md:flex" role="tablist">
					{#each availableAmbitos as ambito}
						<li>
							<button
								type="button"
								class={`informe-ambito-tab inline-flex cursor-pointer items-center rounded-card px-4 py-2 text-[0.9rem] font-ui font-medium transition hover:no-underline ${
									activeAmbito === ambito
										? 'bg-surface-soft text-brand-blue-dark'
										: 'bg-transparent text-text-soft hover:bg-surface-soft hover:text-brand-blue-dark'
								}`}
								data-tab={`acto-${ambito}`}
								onclick={(event) => {
									activeAmbito = ambito;
									event.currentTarget.blur();
								}}
							>
								{ambitoLabels[ambito]}
								<span
									class="ml-2 inline-flex rounded-[10px] bg-surface-accent-purple px-2 py-1 text-[0.75rem] leading-none text-text-accent-purple"
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
					<div class="rounded-[10px] border border-border-accent-blue bg-surface-accent-blue p-4 text-text-main">
						No hay distancias disponibles para este informe.
					</div>
				{:else}
					{#each availableAmbitos as ambito}
						<div class={activeAmbito === ambito ? 'block' : 'hidden'} id={`acto-${ambito}`}>
							<WorksTable
								rows={rowsByAmbito[ambito]}
								mode="informe"
								prefetchShortSummaries={activeAmbito === ambito}
								emptyMessage="No hay obras cercanas disponibles en este ámbito."
							/>
						</div>
					{/each}
				{/if}
			</div>
		</div>
	</section>

	<section class="grid gap-3 font-ui">
		<h2 class="m-0 text-[clamp(1.2rem,2vw,1.45rem)] font-semibold leading-[1.2] text-brand-blue-dark">Resultados</h2>
		{#if result1Parts.length > 0}
			<article class="rounded-[8px] bg-surface-soft px-4 py-3.5 max-md:px-[0.9rem] max-md:py-3">
				<div class="grid gap-2">
					<p class="m-0 text-base leading-[1.62] text-text-main">
						{#each result1Parts as part}
							{#if part.kind === 'author' && part.authorId}
								<a href={`/autores/${part.authorId}`} class="font-semibold text-text-main underline hover:text-brand-blue-dark focus-visible:text-brand-blue-dark">
									{part.value}
								</a>
							{:else}
								{part.value}
							{/if}
						{/each}
					</p>
				</div>
			</article>
		{/if}
		{#if result2Parts.length > 0}
			<p class="m-0 max-w-[78ch] text-base leading-[1.72] text-text-main">
				{#each result2Parts as part}
					{#if part.kind === 'author' && part.authorId}
						<a href={`/autores/${part.authorId}`} class="font-semibold text-brand-blue underline hover:text-brand-blue-dark focus-visible:text-brand-blue-dark">
							{part.value}
						</a>
					{:else}
						{part.value}
					{/if}
				{/each}
			</p>
		{/if}
	</section>

	<section class="grid gap-4 font-ui">
		<div class="flex flex-wrap items-center justify-between gap-4">
			<h2 class="m-0 text-[clamp(1.2rem,2vw,1.45rem)] font-semibold leading-[1.2] text-brand-blue-dark">
				Referencias
			</h2>
		</div>

		{#if data.bibliography.sections.length === 0}
			<div class="rounded-[10px] border border-border-accent-blue bg-surface-accent-blue p-4 text-text-main">
				No hay referencias disponibles para este informe.
			</div>
		{:else}
			<div class="grid gap-3.5">
				{#if citationEntry}
					<CitationSuggestionCard
						citation={citationEntry.text}
						label="Cita sugerida"
						buttonLabel="Copiar cita"
						successMessage="Cita copiada."
						emptyCitationMessage="No hay cita disponible."
						copyErrorMessage="No se pudo copiar automáticamente."
					>
						<p class="m-0 text-[0.95rem] leading-[1.52] text-text-main">
							{#each citationEntry.parts as part}
								{#if part.kind === 'link'}
									<a
										href={part.href ?? part.value}
										target="_blank"
										rel="noopener noreferrer"
										class="break-words text-brand-blue underline hover:text-brand-blue-dark focus-visible:text-brand-blue-dark"
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
						class="rounded-[10px] border border-border-accent-blue bg-surface px-[0.9rem] py-[0.8rem] max-md:px-[0.8rem] max-md:py-[0.75rem]"
						aria-label={citationSection.lead}
					>
						<p class="mb-[0.65rem] mt-0 text-[0.95rem] font-medium leading-[1.45] text-brand-blue-dark">
							{citationSection.lead}
						</p>
						<ol class="m-0 grid gap-[0.55rem] pl-[1.2rem]">
							{#each citationSectionEntries as entry}
								<li class="m-0">
									<p class="m-0 text-[0.95rem] leading-[1.52] text-text-main">
										{#each entry.parts as part}
											{#if part.kind === 'link'}
												<a
													href={part.href ?? part.value}
													target="_blank"
													rel="noopener noreferrer"
													class="break-words text-brand-blue underline hover:text-brand-blue-dark focus-visible:text-brand-blue-dark"
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
						class="rounded-[10px] border border-border-accent-blue bg-surface px-[0.9rem] py-[0.8rem] max-md:px-[0.8rem] max-md:py-[0.75rem]"
						aria-label={section.lead}
					>
						<p class="mb-[0.65rem] mt-0 text-[0.95rem] font-medium leading-[1.45] text-brand-blue-dark">
							{section.lead}
						</p>
						<ol class="m-0 grid gap-[0.55rem] pl-[1.2rem]">
							{#each section.entries as entry}
								<li class="m-0">
									<p class="m-0 text-[0.95rem] leading-[1.52] text-text-main">
										{#each entry.parts as part}
											{#if part.kind === 'link'}
												<a
													href={part.href ?? part.value}
													target="_blank"
													rel="noopener noreferrer"
													class="break-words text-brand-blue underline hover:text-brand-blue-dark focus-visible:text-brand-blue-dark"
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
						class="informe-bibliografia-disclosure overflow-hidden rounded-[10px] border border-border-accent-blue bg-surface"
						open={section.defaultOpen === true}
					>
						<summary class="informe-bibliografia-summary cursor-pointer list-none px-[0.9rem] py-[0.65rem] text-[0.9rem] font-semibold text-brand-blue-dark max-md:px-[0.8rem] max-md:py-[0.6rem]">
							<span class="inline-flex items-center gap-[0.35rem]">
								<span
									class="informe-bibliografia-summary-icon inline-flex h-[13px] w-[13px] items-center justify-center text-text-accent-purple transition-transform"
									aria-hidden="true"
								>
									<ChevronRight size={13} strokeWidth={2.2} />
								</span>
								<span>{section.collapsibleLabel || 'Más información'}</span>
							</span>
						</summary>
						<div
							class="border-t border-border-accent-blue px-[0.9rem] pb-[0.8rem] pt-0 max-md:px-[0.8rem] max-md:pb-[0.75rem]"
							aria-label={section.lead}
						>
							<p class="mb-[0.65rem] mt-0 text-[0.95rem] font-medium leading-[1.45] text-brand-blue-dark">
								{section.lead}
							</p>
							<ol class="m-0 grid gap-[0.55rem] pl-[1.2rem]">
								{#each section.entries as entry}
									<li class="m-0">
										<p class="m-0 text-[0.95rem] leading-[1.52] text-text-main">
											{#each entry.parts as part}
												{#if part.kind === 'link'}
													<a
														href={part.href ?? part.value}
														target="_blank"
														rel="noopener noreferrer"
														class="break-words text-brand-blue underline hover:text-brand-blue-dark focus-visible:text-brand-blue-dark"
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
	.informe-ambito-tab,
	.informe-ambito-tab:focus,
	.informe-ambito-tab:focus-visible,
	.informe-ambito-tab:active {
		border: 0 solid transparent !important;
		border-bottom-width: 0 !important;
		outline: none !important;
		box-shadow: none !important;
		text-decoration: none !important;
		-webkit-tap-highlight-color: transparent;
	}

	.informe-ambito-tab::-moz-focus-inner {
		border: 0;
	}

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


