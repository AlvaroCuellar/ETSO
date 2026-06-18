<script lang="ts">
	import Breadcrumbs from '$lib/components/ui/Breadcrumbs.svelte';
	import FeatureHeroSection from '$lib/components/ui/FeatureHeroSection.svelte';
	import HeroStatCard from '$lib/components/ui/HeroStatCard.svelte';
	import SeoHead from '$lib/components/seo/SeoHead.svelte';
	import fondoLogo from '$lib/assets/fondos/fondo-logo.webp';
	import { localizePath } from '$lib/i18n';
	import { formatPublicationDate } from '$lib/resource-publication-dates';
	import { normalizePlainText } from '$lib/search/normalize';
	import {
		buildWorkTitleSearchText,
		formatDisplayWorkTitle
	} from '$lib/utils/format-display-work-title';
	import BookOpen from 'lucide-svelte/icons/book-open';
	import Feather from 'lucide-svelte/icons/feather';

	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	const BITESO_SEO_DESCRIPTION =
		'Biblioteca Textual Siglo de Oro: textos digitales en acceso abierto para lectura, consulta e investigación.';
	const WORKS_PAGE_SIZE = 80;

	let query = $state('');
	let visibleWorkCount = $state(WORKS_PAGE_SIZE);

	const bitesoLabelsByLocale = {
		es: {
			openAccessTexts: 'Textos digitales en acceso abierto',
			authors: 'Autores',
			listHeading: 'Textos digitales en acceso abierto',
			listDescription:
				'Lista alfabética de las obras que tienen texto digital en BITESO. Usa el buscador para encontrar una obra y acceder directamente a su texto.',
			listCount: (shown: number, total: number) => `Mostrando ${shown} de ${total} textos`,
			searchLabel: 'Buscar obra',
			searchPlaceholder: 'Buscar obra',
			publicationDate: 'Fecha de publicación',
			empty: 'No hay textos que coincidan con la búsqueda.',
			showMore: (count: number) => `Ver más (${count} más)`
		},
		en: {
			openAccessTexts: 'Open-access digital texts',
			authors: 'Authors',
			listHeading: 'Open-access digital texts',
			listDescription:
				'Alphabetical list of works for which a digital text is available in BITESO. Use the search box to find a work and open its text directly.',
			listCount: (shown: number, total: number) => `Showing ${shown} of ${total} texts`,
			searchLabel: 'Search for a work',
			searchPlaceholder: 'Search for a work',
			publicationDate: 'Publication date',
			empty: 'No texts match the search.',
			showMore: (count: number) => `View more (${count} more)`
		},
		fr: {
			openAccessTexts: 'Textes numériques en accès ouvert',
			authors: 'Auteurs',
			listHeading: 'Textes numériques en accès ouvert',
			listDescription:
				'Liste alphabétique des œuvres pour lesquelles un texte numérique est disponible dans BITESO. Utilisez le champ de recherche pour trouver une œuvre et accéder directement à son texte.',
			listCount: (shown: number, total: number) => `${shown} textes affichés sur ${total}`,
			searchLabel: 'Rechercher une œuvre',
			searchPlaceholder: 'Rechercher une œuvre',
			publicationDate: 'Date de publication',
			empty: 'Aucun texte ne correspond à la recherche.',
			showMore: (count: number) => `Voir plus (${count} de plus)`
		},
		pt: {
			openAccessTexts: 'Textos digitais em acesso aberto',
			authors: 'Autores',
			listHeading: 'Textos digitais em acesso aberto',
			listDescription:
				'Lista alfabética das obras que têm texto digital disponível no BITESO. Use o campo de pesquisa para encontrar uma obra e acessar diretamente seu texto.',
			listCount: (shown: number, total: number) => `Exibindo ${shown} de ${total} textos`,
			searchLabel: 'Pesquisar obra',
			searchPlaceholder: 'Pesquisar obra',
			publicationDate: 'Data de publicação',
			empty: 'Não há textos que correspondam à pesquisa.',
			showMore: (count: number) => `Ver mais (${count} mais)`
		},
		it: {
			openAccessTexts: 'Testi digitali ad accesso aperto',
			authors: 'Autori',
			listHeading: 'Testi digitali ad accesso aperto',
			listDescription:
				'Elenco alfabetico delle opere per le quali è disponibile un testo digitale in BITESO. Usa il campo di ricerca per trovare un’opera e accedere direttamente al suo testo.',
			listCount: (shown: number, total: number) => `${shown} testi visualizzati su ${total}`,
			searchLabel: 'Cerca un’opera',
			searchPlaceholder: 'Cerca un’opera',
			publicationDate: 'Data di pubblicazione',
			empty: 'Non ci sono testi che corrispondono alla ricerca.',
			showMore: (count: number) => `Vedi altro (${count} altri)`
		},
		de: {
			openAccessTexts: 'Digitale Texte im Open Access',
			authors: 'Autorinnen und Autoren',
			listHeading: 'Digitale Texte im Open Access',
			listDescription:
				'Alphabetische Liste der Werke, für die in BITESO ein digitaler Text verfügbar ist. Verwenden Sie das Suchfeld, um ein Werk zu finden und direkt auf seinen Text zuzugreifen.',
			listCount: (shown: number, total: number) => `${shown} von ${total} Texten angezeigt`,
			searchLabel: 'Werk suchen',
			searchPlaceholder: 'Werk suchen',
			publicationDate: 'Veröffentlichungsdatum',
			empty: 'Es sind keine Texte vorhanden, die zur Suche passen.',
			showMore: (count: number) => `Mehr anzeigen (${count} mehr)`
		},
		zh: {
			openAccessTexts: '开放获取数字文本',
			authors: '作者',
			listHeading: '开放获取数字文本',
			listDescription: '按字母顺序列出 BITESO 中已有数字文本的作品。请使用搜索框查找作品并直接打开其文本。',
			listCount: (shown: number, total: number) => `显示 ${total} 部文本中的 ${shown} 部`,
			searchLabel: '搜索作品',
			searchPlaceholder: '搜索作品',
			publicationDate: '发布日期',
			empty: '没有与搜索匹配的文本。',
			showMore: (count: number) => `查看更多（${count} 部）`
		},
		ja: {
			openAccessTexts: 'オープンアクセスのデジタルテキスト',
			authors: '著者',
			listHeading: 'オープンアクセスのデジタルテキスト',
			listDescription:
				'BITESO でデジタルテキストを利用できる作品のアルファベット順一覧です。検索欄を使って作品を探し、その本文に直接アクセスできます。',
			listCount: (shown: number, total: number) => `${total} 件中 ${shown} 件を表示`,
			searchLabel: '作品を検索',
			searchPlaceholder: '作品を検索',
			publicationDate: '公開日',
			empty: '検索に一致するテキストはありません。',
			showMore: (count: number) => `もっと見る（${count} 件）`
		},
		ko: {
			openAccessTexts: '오픈 액세스 디지털 텍스트',
			authors: '저자',
			listHeading: '오픈 액세스 디지털 텍스트',
			listDescription:
				'BITESO에서 디지털 텍스트를 이용할 수 있는 작품의 알파벳순 목록입니다. 검색창을 사용해 작품을 찾고 해당 텍스트로 바로 이동할 수 있습니다.',
			listCount: (shown: number, total: number) => `전체 ${total}건 중 ${shown}건 표시`,
			searchLabel: '작품 검색',
			searchPlaceholder: '작품 검색',
			publicationDate: '공개일',
			empty: '검색어와 일치하는 텍스트가 없습니다.',
			showMore: (count: number) => `더 보기 (${count}건)`
		},
		ru: {
			openAccessTexts: 'Цифровые тексты в открытом доступе',
			authors: 'Авторы',
			listHeading: 'Цифровые тексты в открытом доступе',
			listDescription:
				'Алфавитный список произведений, для которых в BITESO доступен цифровой текст. Используйте поле поиска, чтобы найти произведение и перейти непосредственно к его тексту.',
			listCount: (shown: number, total: number) => `Показано ${shown} из ${total} текстов`,
			searchLabel: 'Найти произведение',
			searchPlaceholder: 'Найти произведение',
			publicationDate: 'Дата публикации',
			empty: 'Текстов, соответствующих запросу, нет.',
			showMore: (count: number) => `Показать еще (${count})`
		},
		ar: {
			openAccessTexts: 'النصوص الرقمية المتاحة بالوصول المفتوح',
			authors: 'المؤلفون',
			listHeading: 'النصوص الرقمية المتاحة بالوصول المفتوح',
			listDescription:
				'قائمة أبجدية بالأعمال التي يتوفر لها نص رقمي في BITESO. استخدم حقل البحث للعثور على العمل والدخول مباشرةً إلى نصه.',
			listCount: (shown: number, total: number) => `تُعرض ${shown} من أصل ${total} نصًا`,
			searchLabel: 'ابحث عن عمل',
			searchPlaceholder: 'ابحث عن عمل',
			publicationDate: 'تاريخ النشر',
			empty: 'لا توجد نصوص تطابق البحث.',
			showMore: (count: number) => `عرض المزيد (${count} نصًا)`
		}
	} as const;
	const labels = $derived(bitesoLabelsByLocale[data.locale] ?? bitesoLabelsByLocale.es);
	const bitesoIntroByLocale = {
		es: [
			'BITESO ofrece acceso en abierto a textos digitales del Siglo de Oro conseguidos, en su mayoría, a partir de transcripciones automáticas de impresos y manuscritos antiguos. La colección reúne obras producidas para los análisis estilométricos de autoría y materiales incorporados gracias a la colaboración de especialistas, colegas y estudiantes.',
			'Los textos deben entenderse como versiones de trabajo: no sustituyen a las ediciones críticas, pueden contener errores de transcripción y presentan una calidad desigual según la fuente y el estado de revisión. En su estado actual, se ofrecen sin nombres de personajes ni acotaciones escénicas. La colección permanece abierta a correcciones, ampliaciones y mejoras.'
		],
		en: [
			'BITESO provides open access to digital texts from the Spanish Golden Age, mostly obtained from automatic transcriptions of old printed books and manuscripts. The collection brings together works produced for stylometric authorship analyses and materials incorporated thanks to the collaboration of specialists, colleagues and students.',
			'The texts should be understood as working texts: they do not replace critical editions, may contain transcription errors and have uneven quality depending on the source and the state of review. At present, they are offered without character names or stage directions. The collection remains open to corrections, additions and improvements.'
		],
		fr: [
			'BITESO offre un accès ouvert à des textes numériques du Siècle d’or espagnol, obtenus pour la plupart à partir de transcriptions automatiques d’imprimés anciens et de manuscrits. La collection réunit des œuvres produites pour les analyses stylométriques d’attribution et des matériaux intégrés grâce à la collaboration de spécialistes, collègues et étudiants.',
			'Ces textes doivent être compris comme des versions de travail : ils ne remplacent pas les éditions critiques, peuvent contenir des erreurs de transcription et présentent une qualité inégale selon la source et l’état de révision. Dans leur état actuel, ils sont proposés sans noms de personnages ni didascalies. La collection reste ouverte aux corrections, aux ajouts et aux améliorations.'
		],
		pt: [
			'BITESO oferece acesso aberto a textos digitais do Século de Ouro espanhol, obtidos em sua maioria a partir de transcrições automáticas de impressos antigos e manuscritos. A coleção reúne obras produzidas para análises estilométricas de atribuição de autoria e materiais incorporados graças à colaboração de especialistas, colegas e estudantes.',
			'Os textos devem ser entendidos como versões de trabalho: não substituem as edições críticas, podem conter erros de transcrição e apresentam qualidade desigual conforme a fonte e o estado de revisão. No estado atual, são oferecidos sem nomes dos personagens nem didascálias. A coleção permanece aberta a correções, ampliações e melhorias.'
		],
		it: [
			'BITESO offre accesso aperto a testi digitali del Secolo d’Oro spagnolo, ottenuti per lo più da trascrizioni automatiche di antichi testi a stampa e manoscritti. La collezione riunisce opere prodotte per analisi stilometriche di attribuzione d’autore e materiali incorporati grazie alla collaborazione di specialisti, colleghi e studenti.',
			'I testi devono essere intesi come versioni di lavoro: non sostituiscono le edizioni critiche, possono contenere errori di trascrizione e presentano una qualità diseguale a seconda della fonte e dello stato di revisione. Nello stato attuale sono offerti senza nomi dei personaggi né didascalie. La collezione resta aperta a correzioni, ampliamenti e miglioramenti.'
		],
		de: [
			'BITESO bietet offenen Zugang zu digitalen Texten des spanischen Siglo de Oro, die größtenteils aus automatischen Transkriptionen alter Drucke und Handschriften gewonnen wurden. Die Sammlung vereint Werke, die für stilometrische Autorschaftsanalysen erstellt wurden, sowie Materialien, die dank der Zusammenarbeit von Fachleuten, Kolleginnen und Kollegen und Studierenden aufgenommen wurden.',
			'Die Texte sind als Arbeitsfassungen zu verstehen: Sie ersetzen keine kritischen Ausgaben, können Transkriptionsfehler enthalten und weisen je nach Quelle und Bearbeitungsstand eine unterschiedliche Qualität auf. Derzeit werden sie ohne Figurennamen und Bühnenanweisungen angeboten. Die Sammlung bleibt offen für Korrekturen, Erweiterungen und Verbesserungen.'
		],
		zh: [
			'BITESO 开放提供西班牙黄金时代数字文本，这些文本大多来自古代印刷本和手稿的自动转录。该合集包括为文体计量作者归属分析制作的作品，也包括在专家、同事和学生协作下纳入的材料。',
			'这些文本应被视为工作文本：它们不能替代校勘本，可能包含转录错误，并且质量会因来源和校订状态而不同。目前文本不含人物姓名和舞台说明。该合集仍将继续接受修正、扩充和改进。'
		],
		ja: [
			'BITESO は、主に古い印刷本や写本の自動転写から得られたスペイン黄金世紀のデジタルテキストをオープンアクセスで提供します。このコレクションには、文体計量による著者帰属分析のために作成された作品と、専門家、同僚、学生の協力によって取り込まれた資料が含まれます。',
			'これらのテキストは作業用テキストとして理解する必要があります。校訂版に代わるものではなく、転写誤りを含む可能性があり、資料や確認状況によって品質にも差があります。現時点では、登場人物名やト書きは含まれていません。コレクションは今後も修正、追加、改善に開かれています。'
		],
		ko: [
			'BITESO는 주로 고인쇄본과 필사본의 자동 전사에서 얻은 스페인 황금세기 디지털 텍스트를 오픈 액세스로 제공합니다. 이 컬렉션은 문체계량 저자 귀속 분석을 위해 제작된 작품과 전문가, 동료, 학생의 협력으로 포함된 자료를 모았습니다.',
			'이 텍스트들은 작업용 텍스트로 이해해야 합니다. 비평판을 대체하지 않으며, 전사 오류가 있을 수 있고 출처와 검토 상태에 따라 품질도 고르지 않습니다. 현재는 등장인물 이름과 무대 지시문 없이 제공됩니다. 컬렉션은 앞으로도 수정, 확장, 개선에 열려 있습니다.'
		],
		ru: [
			'BITESO предоставляет открытый доступ к цифровым текстам испанского Золотого века, в основном полученным из автоматических транскрипций старопечатных изданий и рукописей. Коллекция объединяет произведения, подготовленные для стилометрического анализа авторства, и материалы, включенные благодаря сотрудничеству специалистов, коллег и студентов.',
			'Эти тексты следует понимать как рабочие версии: они не заменяют критические издания, могут содержать ошибки транскрипции и имеют неодинаковое качество в зависимости от источника и степени проверки. В текущем виде они предлагаются без имен персонажей и сценических ремарок. Коллекция остается открытой для исправлений, расширений и улучшений.'
		],
		ar: [
			'توفّر BITESO وصولًا مفتوحًا إلى نصوص رقمية من العصر الذهبي الإسباني، جرى الحصول على معظمها من النسخ الآلي للمطبوعات القديمة والمخطوطات. وتجمع المجموعة أعمالًا أُنتجت لتحليلات إسناد التأليف بالقياس الأسلوبي ومواد أُدرجت بفضل تعاون المتخصصين والزملاء والطلاب.',
			'ينبغي فهم هذه النصوص بوصفها نسخ عمل: فهي لا تحل محل الطبعات النقدية، وقد تتضمن أخطاء في النسخ، كما تتفاوت جودتها بحسب المصدر وحالة المراجعة. وفي حالتها الحالية تُقدَّم من دون أسماء الشخصيات أو الإرشادات المسرحية. وتظل المجموعة مفتوحة للتصحيحات والإضافات والتحسينات.'
		]
	} as const;
	const bitesoIntro = $derived(bitesoIntroByLocale[data.locale] ?? bitesoIntroByLocale.es);

	const normalizeFilterText = (value: string): string =>
		normalizePlainText(value, false).replace(/\s+/g, ' ').trim();

	const formatGenre = (genre: string): string => genre.trim() || 'Sin género';
	const formatTextState = (textState: string): string => textState.trim() || 'Sin estado textual';
	const formatBitesoPublicationDate = (date: string): string => formatPublicationDate(date, data.locale);
	const hasBitesoPublicationDate = (date: string): boolean => date.trim().length > 0;

	const filteredWorks = $derived.by(() => {
		const normalizedQuery = normalizeFilterText(query);
		if (!normalizedQuery) return data.works;

		return data.works.filter((work) => {
			const haystack = normalizeFilterText(
				[
					buildWorkTitleSearchText(work.title, work.titleVariants),
					work.traditional,
					formatGenre(work.genre),
					formatTextState(work.textState)
				].join(' ')
			);
			return haystack.includes(normalizedQuery);
		});
	});
	const visibleWorks = $derived(filteredWorks.slice(0, visibleWorkCount));
	const hiddenWorksCount = $derived(Math.max(0, filteredWorks.length - visibleWorks.length));

	const showMoreWorks = (): void => {
		visibleWorkCount = Math.min(filteredWorks.length, visibleWorkCount + WORKS_PAGE_SIZE);
	};

	$effect(() => {
		query;
		visibleWorkCount = WORKS_PAGE_SIZE;
	});
</script>

<SeoHead title="BITESO" description={BITESO_SEO_DESCRIPTION} path="/biteso" />

<div class="grid gap-6">
	<Breadcrumbs items={[{ label: 'Inicio', href: '/' }, { label: 'BITESO' }]} />

	<FeatureHeroSection
		eyebrow=""
		title="BITESO"
		subtitle="Biblioteca Textual Siglo de Oro"
		backgroundImage={fondoLogo}
		statsAriaLabel="Indicadores de BITESO"
	>
			<div data-i18n-skip>
				{#each bitesoIntro as paragraph, index}
					<p class={`${index === 0 ? 'mt-[1.8rem]' : 'mt-[1.25rem]'} mb-0 max-w-[64ch] font-reading text-[1.01rem] leading-[1.62] text-text-main`} dir={data.locale === 'ar' ? 'rtl' : undefined}>{paragraph}</p>
				{/each}
			</div>
		
		{#snippet stats()}
			<HeroStatCard
				Icon={BookOpen}
				value={data.stats.bitesoTexts}
				label={labels.openAccessTexts}
				desktopOffset="up"
			/>
			<HeroStatCard Icon={Feather} value={data.stats.authors} label={labels.authors} desktopOffset="down" />
		{/snippet}
	</FeatureHeroSection>

	<section class="grid gap-3">
		<h2 class="m-0 font-ui text-[clamp(1.6rem,2.6vw,2.1rem)] font-bold leading-[1.12] text-brand-blue-dark">
			{labels.listHeading}
		</h2>
		<p class="m-0 leading-[1.65] text-text-main">
			{labels.listDescription}
		</p>
		<p class="m-0 text-[0.92rem] font-medium text-text-soft">
			{labels.listCount(visibleWorks.length, filteredWorks.length)}
		</p>
	</section>

	<section class="grid gap-4">
		<label class="grid gap-1 text-[0.86rem] text-text-soft" for="biteso-textos-query">
			<span class="font-ui font-semibold uppercase tracking-[0.04em]">{labels.searchLabel}</span>
			<input
				id="biteso-textos-query"
				type="search"
				placeholder={labels.searchPlaceholder}
				class="w-full rounded-md border border-border bg-white px-3 py-2 text-[0.95rem] text-text-main"
				bind:value={query}
			/>
		</label>

		{#if filteredWorks.length === 0}
			<p class="m-0 italic text-text-soft">{labels.empty}</p>
		{:else}
			<div class="overflow-hidden bg-[rgba(255,255,255,0.52)]">
				<div class="divide-y divide-[rgba(0,51,167,0.08)]">
					{#each visibleWorks as work}
						<a
							href={localizePath(`/biteso/${work.slug}`, data.locale)}
							class="grid gap-1 px-4 py-3 text-inherit no-underline transition hover:bg-[rgba(237,242,255,0.7)] hover:no-underline md:px-5"
						>
							<p class="m-0 font-ui text-[0.99rem] leading-[1.45] text-brand-blue-dark" data-i18n-skip>
								<span class="font-semibold">{formatDisplayWorkTitle(work.title)}</span>
								<span class="mx-1.5 text-text-soft/70">·</span>
								<span class="font-normal text-text-main">{work.traditional}</span>
								<span class="mx-1.5 text-text-soft/70">·</span>
								<span class="font-normal text-text-soft">{formatGenre(work.genre)}</span>
								<span class="mx-1.5 text-text-soft/70">·</span>
								<span class="font-normal text-text-soft">{formatTextState(work.textState)}</span>
								{#if hasBitesoPublicationDate(work.publishedOn)}
									<span class="mx-1.5 text-text-soft/70">·</span>
									<span class="font-normal text-text-soft"
										>{labels.publicationDate}: {formatBitesoPublicationDate(work.publishedOn)}</span
									>
								{/if}
							</p>
							{#if work.titleVariants.length > 0}
								<p class="m-0 text-[0.92rem] leading-[1.5] text-text-soft" data-i18n-skip>
									{#each work.titleVariants as variante, index}
										<span class="italic">{formatDisplayWorkTitle(variante)}</span>
										{#if index < work.titleVariants.length - 1}
											<span class="mx-1 not-italic text-text-soft/65">|</span>
										{/if}
									{/each}
								</p>
							{/if}
						</a>
					{/each}
				</div>
			</div>
			{#if hiddenWorksCount > 0}
				<div class="flex justify-center pt-1">
					<button
						type="button"
						class="inline-flex items-center justify-center rounded-[9px] border border-border-accent-blue bg-white px-5 py-2.5 font-ui text-[0.94rem] font-semibold text-brand-blue-dark shadow-[0_8px_24px_rgba(25,46,80,0.05)] transition hover:bg-surface-accent-blue"
						onclick={showMoreWorks}
					>
						{labels.showMore(Math.min(WORKS_PAGE_SIZE, hiddenWorksCount))}
					</button>
				</div>
			{/if}
		{/if}
	</section>
</div>
