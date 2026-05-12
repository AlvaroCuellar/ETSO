<script lang="ts">
	import ArrowUpRight from 'lucide-svelte/icons/arrow-up-right';
	import InfoCard from '$lib/components/ui/InfoCard.svelte';
	import InlineActionButton from '$lib/components/ui/InlineActionButton.svelte';
	import { formatConfidence, type CatalogWork, type AttributionSet, type Confidence } from '$lib/domain/catalog';

	interface Props {
		work: CatalogWork;
		showLink?: boolean;
	}

	let { work, showLink = true }: Props = $props();

	interface ResultTextPart {
		kind: 'text' | 'author';
		value: string;
		authorId?: string;
	}

	interface AuthorReference {
		authorId: string;
		authorName: string;
	}

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

	const connectorLabel = (connector: 'and' | 'or'): string => (connector === 'and' ? 'y' : 'o');

	const confidenceClass = (confidence?: Confidence): string => {
		if (confidence === 'segura') return 'bg-[#d4edda] text-[#155724]';
		if (confidence === 'probable') return 'bg-[#d1ecf1] text-[#0c5460]';
		if (confidence === 'posible') return 'bg-surface-accent-purple text-text-accent-purple';
		if (confidence === 'no_concluyente') return 'bg-[#fff3cd] text-[#856404]';
		return 'bg-surface-accent-purple text-text-accent-purple';
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

	const buildStylemetryAttributionParts = (set: AttributionSet): ResultTextPart[] => {
		const members = set.groups.flatMap((group) => group.members).filter((member) => member.authorName.trim());
		const names = members.map((member) => member.authorName.trim());

		if (names.length === 0) {
			return [{ kind: 'text', value: 'Sin resultados estilométricos disponibles.' }];
		}

		if (members.length === 1 && members[0].confidence === 'segura') {
			return [
				{ kind: 'text', value: 'Análisis estilométrico: ' },
				{
					kind: 'author',
					value: names[0],
					authorId: members[0].authorId
				},
				{ kind: 'text', value: ' (segura).' }
			];
		}

		if (members.length === 1 && members[0].confidence === 'probable') {
			return [
				{ kind: 'text', value: 'Análisis estilométrico: ' },
				{
					kind: 'author',
					value: names[0],
					authorId: members[0].authorId
				},
				{ kind: 'text', value: ' (probable).' }
			];
		}

		if (members.length > 1 && set.connector === 'and') {
			return [
				{ kind: 'text', value: 'Análisis estilométrico: ' },
				...formatAuthorListParts(
					members.map((m) => ({
						authorId: m.authorId,
						authorName: m.authorName.trim()
					})),
					'y'
				),
				{ kind: 'text', value: ' (posible colaboración).' }
			];
		}

		return [
			{ kind: 'text', value: 'Análisis estilométrico: ' },
			...formatAuthorListParts(
				members.map((m) => ({
					authorId: m.authorId,
					authorName: m.authorName.trim()
				})),
				'o'
			),
			{ kind: 'text', value: '.' }
		];
	};

	const traditionalAttributionParts = $derived.by(() =>
		buildTraditionalAttributionParts(work.traditionalAttribution)
	);

	const procedeValue = $derived.by(() => {
		const origin = work.origin?.trim();
		if (!origin || normalizeText(origin) === 'no disponible') return 'No disponible.';
		const cleaned = origin
			.replace(/^procede\s+de\s+/i, '')
			.replace(/^procede\s+/i, '')
			.trim();
		if (!cleaned) return 'No disponible.';
		return cleaned.endsWith('.') ? cleaned : `${cleaned}.`;
	});
</script>

<InfoCard label="Metadatos de la obra" bodyClass="gap-0">
	{#snippet action()}
		{#if showLink}
			<InlineActionButton href={`/obras/${work.slug}`} icon={ArrowUpRight} iconMotion="diagonal">
				Ficha obra
			</InlineActionButton>
		{/if}
	{/snippet}

	<dl class="m-0 grid gap-x-8 gap-y-4 md:grid-cols-2">
		<div class="grid content-start gap-1.5">
			<dt class="m-0 font-ui text-[0.72rem] font-bold uppercase tracking-[0.06em] text-text-accent-purple">
				Atribución tradicional
			</dt>
			<dd class="m-0 text-[0.97rem] leading-[1.65] text-text-main">
				{#each traditionalAttributionParts as part}
					{#if part.kind === 'author' && part.authorId}
						<a
							href={`/autores/${part.authorId}`}
							class="font-semibold text-brand-blue underline hover:text-brand-blue-dark focus-visible:text-brand-blue-dark"
						>
							{part.value}
						</a>
					{:else}
						{part.value}
					{/if}
				{/each}
			</dd>
		</div>

		<div class="grid content-start gap-1.5">
			<dt class="m-0 font-ui text-[0.72rem] font-bold uppercase tracking-[0.06em] text-text-accent-purple">
				Atribución estilometría
			</dt>
			<dd class="m-0 text-[0.97rem] leading-[1.65] text-text-main">
				{#if work.stylometryAttribution.unresolved || work.stylometryAttribution.groups.length === 0}
					Sin resultados estilométricos disponibles.
				{:else}
					<span class="mr-1">Análisis estilométrico:</span>
					<span class="inline-flex flex-wrap items-center gap-x-2 gap-y-1 align-baseline">
						{#each work.stylometryAttribution.groups as group, groupIndex}
							<span class="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
								{#each group.members as member, memberIndex}
									{#if member.authorId}
										<a
											href={`/autores/${member.authorId}`}
											class="font-semibold text-brand-blue underline hover:text-brand-blue-dark focus-visible:text-brand-blue-dark"
										>
											{member.authorName}
										</a>
									{:else}
										<span>{member.authorName}</span>
									{/if}
									{#if member.confidence}
										<span
											class={`inline-flex rounded-full px-[0.55rem] py-[0.24rem] font-ui text-[0.72rem] font-bold leading-none tracking-[0.02em] uppercase ${confidenceClass(member.confidence)}`}
										>
											{formatConfidence(member.confidence)}
										</span>
									{/if}
									{#if memberIndex < group.members.length - 1}
										<span class="font-ui text-[0.72rem] font-bold text-text-accent-purple lowercase">y</span>
									{/if}
								{/each}
							</span>
							{#if groupIndex < work.stylometryAttribution.groups.length - 1}
								<span class="font-ui text-[0.72rem] font-bold text-text-accent-purple lowercase">
									{connectorLabel(work.stylometryAttribution.connector)}
								</span>
							{/if}
						{/each}
					</span>
					<span>.</span>
				{/if}
			</dd>
		</div>

		<div class="grid content-start gap-1.5">
			<dt class="m-0 font-ui text-[0.72rem] font-bold uppercase tracking-[0.06em] text-text-accent-purple">
				Género
			</dt>
			<dd class="m-0 text-[0.97rem] leading-[1.65] text-text-main">{work.genre}</dd>
		</div>

		<div class="grid content-start gap-1.5">
			<dt class="m-0 font-ui text-[0.72rem] font-bold uppercase tracking-[0.06em] text-text-accent-purple">
				Procedencia
			</dt>
			<dd class="m-0 text-[0.97rem] leading-[1.65] text-text-main">{procedeValue}</dd>
		</div>
	</dl>
</InfoCard>
