<script lang="ts">
	import ChevronRight from 'lucide-svelte/icons/chevron-right';
	import Download from 'lucide-svelte/icons/download';
	import WorksTable from '$lib/components/search/WorksTable.svelte';
	import Breadcrumbs from '$lib/components/ui/Breadcrumbs.svelte';
	import CitationSuggestionCard from '$lib/components/ui/CitationSuggestionCard.svelte';
	import InlineActionButton from '$lib/components/ui/InlineActionButton.svelte';
	import PageHero from '$lib/components/ui/PageHero.svelte';
	import SeoHead from '$lib/components/seo/SeoHead.svelte';
	import informeBg from '$lib/assets/heros/informes.webp';
	import { ambitoLabels, ambitos, type Ambito, type AttributionSet, type ObraTableRow } from '$lib/domain/catalog';
	import {
		formatDisplayWorkTitle,
		formatPrefixedDisplayWorkTitleHtml
	} from '$lib/utils/format-display-work-title';
	import { translateText } from '$lib/i18n';
	import { renderInlineItalicsHtml } from '$lib/utils/render-inline-italics-html';
	import {
		buildTraditionalAttributionParts,
		type AttributionPhrasePart
	} from '$lib/utils/traditional-attribution-phrase';

	import type { PageData } from './$types';

	type ResultTextPart = AttributionPhrasePart;

	let { data }: { data: PageData } = $props();
	const t = (value: string): string => translateText(data.locale, value);
	const displayWorkTitle = $derived.by(() => formatDisplayWorkTitle(data.work.title));
	const displayInformeTitle = $derived.by(() => `${t('Análisis estilométrico de')} ${displayWorkTitle}`);
	const displayInformeTitleHtml = $derived.by(() =>
		formatPrefixedDisplayWorkTitleHtml(t('Análisis estilométrico de'), data.work.title)
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

	const formatNameList = (names: string[], connector: string): string => {
		if (names.length <= 1) return names[0] ?? '';
		if (names.length === 2) return `${names[0]} ${connector} ${names[1]}`;
		return `${names.slice(0, -1).join(', ')} ${connector} ${names[names.length - 1]}`;
	};

	const localizedListConnector = (connector: 'and' | 'or'): string => {
		const connectors = {
			es: { and: 'y', or: 'o' },
			en: { and: 'and', or: 'or' },
			fr: { and: 'et', or: 'ou' },
			pt: { and: 'e', or: 'ou' },
			it: { and: 'e', or: 'o' },
			de: { and: 'und', or: 'oder' },
			zh: { and: '和', or: '或' },
			ja: { and: 'および', or: 'または' },
			ko: { and: '및', or: '또는' },
			ru: { and: 'и', or: 'или' },
			ar: { and: 'و', or: 'أو' }
		} as const;
		return (connectors[data.locale] ?? connectors.es)[connector];
	};

	const traditionalAttributionParts = $derived.by(() =>
		buildTraditionalAttributionParts(data.work.traditionalAttribution, {
			translate: t,
			connectorLabels: {
				and: localizedListConnector('and'),
				or: localizedListConnector('or')
			}
		})
	);

	const hasAutomaticMarker = (value: string): boolean => {
		const normalized = normalizeText(value);
		return normalized.includes('automatico') || /\bauto\b/.test(normalized);
	};

	const stylometryResultSentence = (set: AttributionSet): string => {
		const rawExpression = normalizeText(set.rawExpression ?? '');
		if (rawExpression.includes('no_apunta_a_ningun_autor')) {
			return t('Los análisis de estilometría no permiten asociar esta obra de forma clara con ningún perfil autorial del corpus.');
		}
		if (rawExpression.includes('no_es_posible')) {
			return t('Los análisis no pueden asociar esta obra con el perfil estilístico del autor tradicional, debido a lo reducido de su corpus. Tampoco identifican de forma clara una alternativa autorial.');
		}
		if (rawExpression.includes('no_analizada')) {
			return t('Esta obra no ha sido analizada estilométricamente, por lo que no es posible valorar su asociación con ningún perfil autorial del corpus.');
		}
		if (rawExpression.includes('pendiente_profundidad')) {
			return t('Los resultados estilométricos disponibles requieren una revisión en profundidad antes de formular una conclusión autorial.');
		}

		const members = set.groups.flatMap((group) => group.members).filter((member) => member.authorName.trim());
		const names = members.map((member) => member.authorName.trim());
		const allProbable = members.length > 0 && members.every((member) => member.confidence === 'probable');

		if (members.length === 1 && members[0].confidence === 'segura') {
			return `${t('Los análisis de estilometría permiten asociar esta obra de forma clara con el perfil autorial de')} ${names[0]}.`;
		}
		if (members.length === 1 && members[0].confidence === 'probable') {
			return `${t('Los análisis de estilometría permiten asociar esta obra con el perfil autorial de')} ${names[0]}, ${t('por cuanto algunas de sus obras aparecen en las primeras posiciones, aunque no de forma concluyente.')}`;
		}
		if (members.length > 1 && set.connector === 'and' && allProbable) {
			return `${t('Los análisis de estilometría permiten asociar esta obra con los perfiles autoriales de')} ${formatNameList(names, localizedListConnector('and'))}, ${t('por cuanto algunas de sus obras aparecen en las primeras posiciones, aunque no de forma concluyente.')}`;
		}

		return t('Los resultados estilométricos disponibles requieren revisión antes de formular una conclusión autorial.');
	};

	const reportFallbackReplacement = (source: string): string => {
		const en: Record<string, string> = {
			'Lectura preliminar para': 'Preliminary reading for',
			'con perfil': 'with profile',
			'y nivel': 'and level',
			'sin autoria determinada': 'without determined authorship',
			'sin confianza explicita': 'without explicit confidence',
			desconocida: 'unknown',
			colaboracion: 'collaboration',
			unica: 'single-author'
		};
		const fr: Record<string, string> = {
			'Lectura preliminar para': 'Lecture préliminaire pour',
			'con perfil': 'avec profil',
			'y nivel': 'et niveau',
			'sin autoria determinada': 'sans attribution déterminée',
			'sin confianza explicita': 'sans confiance explicite',
			desconocida: 'inconnue',
			colaboracion: 'collaboration',
			unica: 'unique'
		};
		const pt: Record<string, string> = {
			'Lectura preliminar para': 'Leitura preliminar para',
			'con perfil': 'com perfil',
			'y nivel': 'e nível',
			'sin autoria determinada': 'sem autoria determinada',
			'sin confianza explicita': 'sem confiança explícita',
			desconocida: 'desconhecida',
			colaboracion: 'colaboração',
			unica: 'única'
		};
		const it: Record<string, string> = {
			'Lectura preliminar para': 'Lettura preliminare per',
			'con perfil': 'con profilo',
			'y nivel': 'e livello',
			'sin autoria determinada': 'senza attribuzione determinata',
			'sin confianza explicita': 'senza fiducia esplicita',
			desconocida: 'sconosciuta',
			colaboracion: 'collaborazione',
			unica: 'unica'
		};
		const de: Record<string, string> = {
			'Lectura preliminar para': 'Vorläufige Lektüre zu',
			'con perfil': 'mit Profil',
			'y nivel': 'und Niveau',
			'sin autoria determinada': 'ohne bestimmte Autorschaft',
			'sin confianza explicita': 'ohne ausdrückliche Sicherheit',
			desconocida: 'unbekannt',
			colaboracion: 'Zusammenarbeit',
			unica: 'einzeln'
		};
		const zh: Record<string, string> = {
			'Lectura preliminar para': '初步解读：',
			'con perfil': '作者类型',
			'y nivel': '置信度',
			'sin autoria determinada': '未确定作者',
			'sin confianza explicita': '无明确置信度',
			desconocida: '未知',
			colaboracion: '合作',
			unica: '单一作者'
		};
		const ja: Record<string, string> = {
			'Lectura preliminar para': '予備的読解：',
			'con perfil': '著者プロファイル',
			'y nivel': '信頼度',
			'sin autoria determinada': '著者未確定',
			'sin confianza explicita': '明示的な信頼度なし',
			desconocida: '不明',
			colaboracion: '共同執筆',
			unica: '単独著者'
		};
		const ko: Record<string, string> = {
			'Lectura preliminar para': '예비 판독:',
			'con perfil': '저자 프로필',
			'y nivel': '신뢰 수준',
			'sin autoria determinada': '저자 미확정',
			'sin confianza explicita': '명시적 신뢰도 없음',
			desconocida: '알 수 없음',
			colaboracion: '공동 집필',
			unica: '단독 저자'
		};
		const ru: Record<string, string> = {
			'Lectura preliminar para': 'Предварительное прочтение для',
			'con perfil': 'с профилем',
			'y nivel': 'и уровнем',
			'sin autoria determinada': 'без установленного авторства',
			'sin confianza explicita': 'без явной уверенности',
			desconocida: 'неизвестно',
			colaboracion: 'соавторство',
			unica: 'единоличное авторство'
		};
		const ar: Record<string, string> = {
			'Lectura preliminar para': 'قراءة أولية لـ',
			'con perfil': 'وفق ملف',
			'y nivel': 'ومستوى',
			'sin autoria determinada': 'دون إسناد تأليف محدد',
			'sin confianza explicita': 'دون مستوى ثقة محدد',
			desconocida: 'غير معروفة',
			colaboracion: 'تأليف مشترك',
			unica: 'تأليف منفرد'
		};
		if (data.locale === 'en') return en[source] ?? source;
		if (data.locale === 'fr') return fr[source] ?? source;
		if (data.locale === 'pt') return pt[source] ?? source;
		if (data.locale === 'it') return it[source] ?? source;
		if (data.locale === 'de') return de[source] ?? source;
		if (data.locale === 'zh') return zh[source] ?? source;
		if (data.locale === 'ja') return ja[source] ?? source;
		if (data.locale === 'ko') return ko[source] ?? source;
		if (data.locale === 'ru') return ru[source] ?? source;
		if (data.locale === 'ar') return ar[source] ?? source;
		return source;
	};

	const localizeStoredReportText = (value: string): string => {
		if (data.locale === 'es') return value;
		let next = translateText(data.locale, value);
		if (next !== value) return next;

		const replacements: Array<[string, string]> = [
			['Lectura preliminar para', reportFallbackReplacement('Lectura preliminar para')],
			['con perfil', reportFallbackReplacement('con perfil')],
			['y nivel', reportFallbackReplacement('y nivel')],
			['sin autoria determinada', reportFallbackReplacement('sin autoria determinada')],
			['sin confianza explicita', reportFallbackReplacement('sin confianza explicita')],
			['desconocida', reportFallbackReplacement('desconocida')],
			['colaboracion', reportFallbackReplacement('colaboracion')],
			['unica', reportFallbackReplacement('unica')]
		];

		for (const [source, target] of replacements) {
			next = next.replaceAll(source, target);
		}
		return next;
	};

	const seoDescription = $derived.by(() => {
		const intro = data.informe.intro?.trim();
		const localizedIntro = intro ? localizeStoredReportText(intro) : '';
		if (localizedIntro.length >= 50 && localizedIntro.split(/\s+/).length >= 6) return localizedIntro;
		const descriptions = {
			es: `Informe estilométrico de ${displayWorkTitle} en ETSO, con distancias léxicas, obras cercanas e indicios de atribución para el estudio de la autoría teatral del Siglo de Oro.`,
			en: `Stylometric report for ${displayWorkTitle} in ETSO, with lexical distances, closest works and authorship clues for the study of Golden Age theatre.`,
			fr: `Rapport stylométrique de ${displayWorkTitle} dans ETSO, avec distances lexicales, œuvres les plus proches et indices d’attribution pour l’étude du théâtre du Siècle d’or.`,
			pt: `Relatório estilométrico de ${displayWorkTitle} no ETSO, com distâncias lexicais, obras mais próximas e indícios de atribuição para o estudo do teatro do Século de Ouro espanhol.`,
			it: `Rapporto stilometrico di ${displayWorkTitle} in ETSO, con distanze lessicali, opere più vicine e indizi di attribuzione per lo studio del teatro del Secolo d’Oro spagnolo.`,
			de: `Stilometrischer Bericht zu ${displayWorkTitle} in ETSO, mit lexikalischen Distanzen, nächstliegenden Werken und Hinweisen zur Autorschaft des Theaters des spanischen Siglo de Oro.`,
			zh: `ETSO 中 ${displayWorkTitle} 的文体计量报告，包含词汇距离、相近作品和作者归属线索，用于研究西班牙黄金时代戏剧。`,
			ja: `ETSO における ${displayWorkTitle} の文体計量レポート。語彙距離、近接作品、著者帰属の手がかりを通じてスペイン黄金世紀演劇を研究します。`,
			ko: `ETSO의 ${displayWorkTitle} 문체계량 보고서입니다. 어휘 거리, 가까운 작품, 저자 귀속 단서를 통해 스페인 황금세기 연극을 연구합니다.`,
			ru: `Стилометрический отчет о ${displayWorkTitle} в ETSO: лексические расстояния, ближайшие произведения и признаки авторской атрибуции для изучения театра испанского Золотого века.`,
			ar: `تقرير قياس أسلوبي عن ${displayWorkTitle} في ETSO، يتضمن المسافات المعجمية والأعمال الأقرب ومؤشرات إسناد التأليف لدراسة مسرح العصر الذهبي الإسباني.`
		} as const;
		return descriptions[data.locale] ?? descriptions.es;
	});

	const resolveResult1Text = (): string => {
		const result = data.work.result1?.trim() ?? '';
		if (!result) return '';
		return hasAutomaticMarker(result)
			? stylometryResultSentence(data.work.stylometryAttribution)
			: localizeStoredReportText(result);
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
	const result2Parts = $derived.by(() => tokenizeResultText(localizeStoredReportText(data.work.result2?.trim() ?? '')));

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
		t('Se ofrecen a continuación las 20 obras con usos léxicos más cercanos, tanto a la obra completa como, cuando es posible, a cada una de sus jornadas, empleando un corpus constituido por 3000 obras de 400 autores diferentes. Las distancias han sido calculadas usando las frecuencias de las 500 palabras más usuales con el método Delta de Burrows. Cuanto mayor cercanía hay a 0,0 es mayor la afinidad.');

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

<SeoHead title={displayInformeTitle} description={seoDescription} path={`/informes/${data.informe.slug}`} />

<div class="grid min-w-0 max-w-full gap-6">
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

	<section class="min-w-0 max-w-full font-ui">
		<dl class="m-0 grid min-w-0 max-w-full gap-4 rounded-[10px] bg-surface-soft px-4 py-4 md:grid-cols-[minmax(9rem,0.55fr)_minmax(0,1.45fr)] md:px-5">
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
				<dd class="m-0 text-base leading-[1.6] text-text-main">
					{@html renderInlineItalicsHtml(procedeValue)}
				</dd>
			</div>
		</dl>
	</section>

	<section class="mt-1 min-w-0 max-w-full">
		<div class="mb-5 grid min-w-0 max-w-full gap-2">
			<div class="flex flex-wrap items-center justify-between gap-3">
				<h2 class="m-0 text-[clamp(1.2rem,2vw,1.45rem)] font-semibold leading-[1.2] text-brand-blue-dark">
					Obras más cercanas
				</h2>
				<InlineActionButton
					href={`/api/informes/${data.informe.slug}/export.xlsx`}
					icon={Download}
					preloadData="off"
					ariaLabel="Descargar datos del informe en XLSX"
					title="Descargar XLSX"
				>
					Descarga informe
				</InlineActionButton>
			</div>
			<p class="m-0 text-[0.97rem] leading-[1.62] text-text-soft">{methodologyLead}</p>
		</div>

		<div class="min-w-0 max-w-full font-ui">
			{#if availableAmbitos.length > 1}
				<div class="mb-3 min-w-0 max-w-full md:hidden">
					<select
						id="mobile-acto-selector"
						class="w-full min-w-0 max-w-full cursor-pointer rounded-[8px] border-2 border-border-accent-blue bg-surface-accent-blue px-4 py-3 font-semibold text-brand-blue-dark transition-all focus:outline-none focus:ring-4 focus:ring-brand-blue/15"
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

			<div class="min-w-0 max-w-full">
				{#if availableAmbitos.length === 0}
					<div class="rounded-[10px] border border-border-accent-blue bg-surface-accent-blue p-4 text-text-main">
						No hay distancias disponibles para este informe.
					</div>
				{:else}
					{#each availableAmbitos as ambito}
						<div class={`${activeAmbito === ambito ? 'block' : 'hidden'} min-w-0 max-w-full`} id={`acto-${ambito}`}>
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
		<article class="rounded-[8px] bg-surface-accent-blue px-4 py-3.5 max-md:px-[0.9rem] max-md:py-3">
			<div class="grid gap-2">
				<p class="m-0 text-base leading-[1.72] text-text-main">
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
			</div>
		</article>
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
						class="rounded-[10px] bg-white px-[0.9rem] py-[0.8rem] max-md:px-[0.8rem] max-md:py-[0.75rem]"
						aria-label={t(citationSection.lead)}
					>
						<p class="mb-[0.65rem] mt-0 text-[0.95rem] font-medium leading-[1.45] text-brand-blue-dark">
							{t(citationSection.lead)}
						</p>
						<ol class="m-0 grid gap-[0.55rem] pl-[1.2rem]">
							{#each citationSectionEntries as entry}
								<li class="m-0">
									<p class="m-0 text-[0.95rem] leading-[1.52] text-text-main" data-i18n-skip>
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
						class="rounded-[10px] bg-white px-[0.9rem] py-[0.8rem] max-md:px-[0.8rem] max-md:py-[0.75rem]"
						aria-label={t(section.lead)}
					>
						<p class="mb-[0.65rem] mt-0 text-[0.95rem] font-medium leading-[1.45] text-brand-blue-dark">
							{t(section.lead)}
						</p>
						<ol class="m-0 grid gap-[0.55rem] pl-[1.2rem]">
							{#each section.entries as entry}
								<li class="m-0">
									<p class="m-0 text-[0.95rem] leading-[1.52] text-text-main" data-i18n-skip>
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
						class="informe-bibliografia-disclosure rounded-[10px] bg-white transition-[background-color,box-shadow] duration-200 open:overflow-visible open:bg-[var(--color-surface-subtle)] open:shadow-[0_8px_24px_rgba(25,46,80,0.06)]"
						open={section.defaultOpen === true}
					>
						<summary class="informe-bibliografia-summary cursor-pointer list-none px-[0.9rem] py-[0.65rem] text-[0.9rem] font-semibold text-brand-blue-dark transition hover:rounded-[10px] hover:bg-surface-accent-blue max-md:px-[0.8rem] max-md:py-[0.6rem]">
							<span class="inline-flex items-center gap-[0.35rem]">
								<span
									class="informe-bibliografia-summary-icon inline-flex h-[13px] w-[13px] items-center justify-center text-text-accent-purple transition-transform"
									aria-hidden="true"
								>
									<ChevronRight size={13} strokeWidth={2.2} />
								</span>
								<span>{t(section.collapsibleLabel || 'Más información')}</span>
							</span>
						</summary>
						<div
							class="px-[0.9rem] pb-[0.8rem] pt-0 max-md:px-[0.8rem] max-md:pb-[0.75rem]"
							aria-label={t(section.lead)}
						>
							<p class="mb-[0.65rem] mt-0 text-[0.95rem] font-medium leading-[1.45] text-brand-blue-dark">
								{t(section.lead)}
							</p>
							<ol class="m-0 grid gap-[0.55rem] pl-[1.2rem]">
								{#each section.entries as entry}
									<li class="m-0">
										<p class="m-0 text-[0.95rem] leading-[1.52] text-text-main" data-i18n-skip>
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
