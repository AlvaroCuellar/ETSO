<script lang="ts">
	import { onMount } from 'svelte';
	import ChevronLeft from 'lucide-svelte/icons/chevron-left';
	import ChevronRight from 'lucide-svelte/icons/chevron-right';
	import SeoHead from '$lib/components/seo/SeoHead.svelte';
	import TeamProfileCard from '$lib/components/ui/TeamProfileCard.svelte';
	import estilometriaHero from '$lib/assets/heros/estilometria.webp';
	import texoroHero from '$lib/assets/heros/texoro.webp';
	import bitesoHero from '$lib/assets/heros/biblioteca.webp';
	import resumenesHero from '$lib/assets/heros/resumenes.webp';
	import grafoImage from '$lib/assets/heros/grafo.webp';
	import redEstilometricaImage from '$lib/assets/heros/red-estilometrica.svg';
	import informesImage from '$lib/assets/heros/informes.webp';
	import librosHero from '$lib/assets/heros/libros.webp';
	import fondoEscritura from '$lib/assets/fondos/fondo-escritura.webp';
	import { localizePath, type Locale } from '$lib/i18n';
	import { createWebPageJsonLd, SITE_NAME } from '$lib/seo';

	import type { PageData } from './$types';

	interface HomeSlide {
		image: string;
		title: string;
		description: string;
		alt: string;
		link?: string;
	}

	interface TeamMember {
		title: string;
		organizations: string[];
		summary: string;
		image: string;
		links: TeamLink[];
	}

	interface TeamLink {
		label: string;
		href: string;
	}

	let { data }: { data: PageData } = $props();

	const bodyLinkClass = 'font-bold text-brand-blue-dark no-underline hover:underline';
	const workLinkClass = 'font-bold italic text-brand-blue-dark no-underline hover:underline';
	const ltrIsolate = 'display:inline-block;direction:ltr;unicode-bidi:isolate';
	const rtlIsolate = 'direction:rtl;unicode-bidi:isolate';

	const homeLink = (href: string, label: string, className = bodyLinkClass, attrs = '') =>
		`<a href="${href}" class="${className}"${attrs ? ` ${attrs}` : ''}>${label}</a>`;
	const workLink = (locale: Locale, href: string, label: string) =>
		homeLink(
			localizePath(href, locale),
			label,
			workLinkClass,
			locale === 'ar' ? `dir="ltr" style="${ltrIsolate}"` : ''
		);
	const ltrSpan = (content: string) => `<span style="${ltrIsolate}">${content}</span>`;

	const homeProjectParagraphs = (locale: Locale): string[] => {
		const etso = homeLink('https://etso.es/', 'ETSO: Estilometría aplicada al Teatro del Siglo de Oro');
		const etsoAr = homeLink(
			'https://etso.es/',
			'ETSO، «القياس الأسلوبي المطبّق على مسرح العصر الذهبي الإسباني»',
			bodyLinkClass,
			`dir="rtl" style="${rtlIsolate}"`
		);
		const alvaro = homeLink('https://www.alvarocuellar.com/', 'Álvaro Cuéllar');
		const german = homeLink(
			'https://literaturaespanola.uva.es/german-jose-vega-garcia-luengos/',
			'Germán Vega García-Luengos'
		);
		const alvaroWithUniversity = `${alvaro} (Universitat Autònoma de Barcelona)`;
		const germanWithUniversity = `${german} (Universidad de Valladolid)`;
		const worksTraditional = [
			workLink(locale, '/informes/analisis-estilometrico-la-dama-boba', 'La dama boba'),
			workLink(locale, '/informes/analisis-estilometrico-don-gil-de-las-calzas-verdes', 'Don Gil de las calzas verdes'),
			workLink(locale, '/informes/analisis-estilometrico-el-medico-de-su-honra-el-celoso-de-su-honra', 'El médico de su honra')
		];
		const worksUnexpected = [
			workLink(locale, '/informes/analisis-estilometrico-la-francesa-laura', 'La francesa Laura'),
			workLink(locale, '/informes/analisis-estilometrico-la-monja-alferez', 'La monja alférez'),
			workLink(locale, '/informes/analisis-estilometrico-la-puerta-macarena-primera-parte', 'La puerta Macarena (primera parte)')
		];

		if (locale === 'ar') {
			return [
				`نشأ مشروع ${etsoAr} من اهتمام الباحث ${ltrSpan(alvaroWithUniversity)} والأستاذ ${ltrSpan(germanWithUniversity)} بتطبيق أدوات حاسوبية جديدة على مشكلات إسناد التأليف الكثيرة التي يطرحها مسرح العصر الذهبي الإسباني. وتهدف هذه البوابة إلى تقديم تحليلات تساعد على إلقاء الضوء على مسائل النسبة في الإنتاج المسرحي الواسع لتلك الحقبة. فمن خلال القياس الأسلوبي يمكن، في أحد أهم استخداماته، تحديد الأعمال التي تُظهر تواترات معجمية أقرب إلى تواترات النص موضع الدراسة ضمن المجموعة النصية المتاحة. وبما أن كل مؤلف يستخدم الكلمات بنسب مختلفة، فإن الأعمال تميل غالبًا إلى التقارب فيما بينها بحسب مؤلفيها. ومع ذلك ينبغي توخي الحذر دائمًا، لأن أوجه تشابه أخرى قد تنشأ بسبب النوع الأدبي أو الموضوع أو التأريخ أو المنشأ أو حالة النص أو غير ذلك من العوامل.`,
				`يمكن الاطلاع هنا على أمثلة يؤيد فيها القياس الأسلوبي النسبة التقليدية، مثل ${worksTraditional.join(' و')}، وكذلك على حالات يشير فيها القياس الأسلوبي إلى نسبة غير متوقعة قد تكون كاشفة، مثل ${worksUnexpected.join(' و')}. وينبغي التذكير بأن النِّسب الجديدة المشار إليها هنا ليست سوى مؤشرات أولية على التأليف نتجت عن معالجة حاسوبية آلية. لذلك يجب دراسة كل حالة دراسة فيلولوجية مفصلة، مع مراعاة تعقيداتها الخاصة.`
			];
		}

		if (locale === 'en') {
			return [
				`The project ${etso} arose from the interest of researcher ${alvaroWithUniversity} and Professor ${germanWithUniversity} in applying new computational tools to the many problems of authorship attribution posed by Spanish Golden Age theatre. The portal offers analyses that can help shed light on questions of attribution within the vast theatrical production of that period. Stylometry makes it possible, in one of its most useful applications, to identify the works whose lexical frequencies are closest to those of the text under study within the available corpus. Since every author uses words in different proportions, works often tend to cluster according to authorship. Nevertheless, caution is always necessary, because other similarities may arise from genre, subject matter, dating, provenance, textual condition or other factors.`,
				`Here you can consult examples in which stylometry supports the traditional attribution, such as ${worksTraditional.join(', ')}, as well as cases in which stylometry points to an unexpected and potentially revealing attribution, such as ${worksUnexpected.join(', ')}. The new attributions indicated here should be understood only as preliminary authorship clues produced by an automatic computational process. Each case must therefore be studied in detail from a philological perspective, taking its specific complexities into account.`
			];
		}

		if (locale === 'fr') {
			return [
				`Le projet ${etso} est né de l’intérêt du chercheur ${alvaroWithUniversity} et du professeur ${germanWithUniversity} pour l’application de nouveaux outils informatiques aux nombreux problèmes d’attribution que pose le théâtre du Siècle d’or espagnol. Ce portail propose des analyses susceptibles d’éclairer les questions d’attribution dans la vaste production théâtrale de cette période. La stylométrie permet notamment d’identifier, dans le corpus disponible, les œuvres dont les fréquences lexicales sont les plus proches de celles du texte étudié. Comme chaque auteur emploie les mots dans des proportions différentes, les œuvres tendent souvent à se rapprocher selon leur auteur. Il faut toutefois rester prudent, car d’autres ressemblances peuvent tenir au genre, au thème, à la datation, à la provenance, à l’état du texte ou à d’autres facteurs.`,
				`On peut consulter ici des exemples où la stylométrie confirme l’attribution traditionnelle, comme ${worksTraditional.join(', ')}, ainsi que des cas où elle suggère une attribution inattendue et potentiellement éclairante, comme ${worksUnexpected.join(', ')}. Les nouvelles attributions signalées ici ne sont que des indices préliminaires produits par un traitement informatique automatique. Chaque cas doit donc faire l’objet d’une étude philologique détaillée, attentive à ses complexités propres.`
			];
		}

		if (locale === 'pt') {
			return [
				`O projeto ${etso} nasceu do interesse do pesquisador ${alvaroWithUniversity} e do professor ${germanWithUniversity} em aplicar novas ferramentas computacionais aos numerosos problemas de atribuição de autoria apresentados pelo teatro do Século de Ouro espanhol. O portal oferece análises que podem ajudar a esclarecer questões de atribuição na vasta produção teatral desse período. A estilometria permite, em uma de suas aplicações mais úteis, identificar as obras cujas frequências lexicais mais se aproximam das do texto em estudo dentro do corpus disponível. Como cada autor usa as palavras em proporções diferentes, as obras tendem muitas vezes a se agrupar segundo a autoria. Ainda assim, é preciso manter cautela, pois outras semelhanças podem decorrer do gênero literário, do tema, da datação, da procedência, do estado do texto ou de outros fatores.`,
				`Aqui é possível consultar exemplos em que a estilometria confirma a atribuição tradicional, como ${worksTraditional.join(', ')}, e também casos em que aponta para uma autoria inesperada e potencialmente esclarecedora, como ${worksUnexpected.join(', ')}. As novas atribuições indicadas aqui devem ser entendidas apenas como indícios preliminares de autoria produzidos por processamento computacional automático. Cada caso precisa, portanto, ser estudado em detalhe do ponto de vista filológico, considerando suas complexidades próprias.`
			];
		}

		if (locale === 'it') {
			return [
				`Il progetto ${etso} nasce dall’interesse del ricercatore ${alvaroWithUniversity} e del professor ${germanWithUniversity} per l’applicazione di nuovi strumenti informatici ai numerosi problemi di attribuzione d’autore posti dal teatro del Secolo d’Oro spagnolo. Il portale offre analisi che possono contribuire a chiarire le questioni attributive nella vasta produzione teatrale di quel periodo. La stilometria consente, in una delle sue applicazioni più utili, di individuare nel corpus disponibile le opere le cui frequenze lessicali sono più vicine a quelle del testo studiato. Poiché ogni autore usa le parole in proporzioni diverse, le opere tendono spesso ad avvicinarsi in base alla loro autorialità. È tuttavia necessario procedere con cautela, perché altre somiglianze possono dipendere dal genere, dal tema, dalla datazione, dalla provenienza, dallo stato del testo o da altri fattori.`,
				`Qui si possono consultare esempi in cui la stilometria conferma l’attribuzione tradizionale, come ${worksTraditional.join(', ')}, e casi in cui suggerisce un’attribuzione inattesa e potenzialmente rivelatrice, come ${worksUnexpected.join(', ')}. Le nuove attribuzioni indicate qui sono soltanto indizi preliminari prodotti da un’elaborazione informatica automatica. Ogni caso deve quindi essere studiato in modo approfondito sul piano filologico, tenendo conto delle sue specifiche complessità.`
			];
		}

		if (locale === 'de') {
			return [
				`Das Projekt ${etso} entstand aus dem Interesse des Forschers ${alvaroWithUniversity} und des Professors ${germanWithUniversity}, neue computergestützte Werkzeuge auf die zahlreichen Fragen der Autorschaftszuschreibung im Theater des spanischen Siglo de Oro anzuwenden. Das Portal bietet Analysen, die Zuschreibungsfragen innerhalb der umfangreichen Theaterproduktion dieser Zeit erhellen können. Die Stilometrie ermöglicht es in einer ihrer wichtigsten Anwendungen, im verfügbaren Korpus diejenigen Werke zu bestimmen, deren lexikalische Häufigkeiten dem untersuchten Text am nächsten stehen. Da jeder Autor Wörter in unterschiedlichen Proportionen verwendet, nähern sich Werke häufig nach ihrer Autorschaft an. Dennoch ist stets Vorsicht geboten, denn Ähnlichkeiten können auch durch Gattung, Thema, Datierung, Herkunft, Textzustand oder andere Faktoren entstehen.`,
				`Hier lassen sich Beispiele einsehen, in denen die Stilometrie die traditionelle Zuschreibung stützt, etwa ${worksTraditional.join(', ')}, sowie Fälle, in denen sie auf eine unerwartete und möglicherweise aufschlussreiche Zuschreibung verweist, etwa ${worksUnexpected.join(', ')}. Die hier genannten neuen Zuschreibungen sind lediglich erste Autorschaftshinweise aus einer automatischen computergestützten Verarbeitung. Jeder Fall muss daher philologisch im Detail untersucht werden, unter Berücksichtigung seiner jeweiligen Komplexität.`
			];
		}

		if (locale === 'zh') {
			return [
				`${etso} 项目源于研究者 ${alvaroWithUniversity} 与教授 ${germanWithUniversity} 的共同兴趣：将新的计算工具应用于西班牙黄金时代戏剧中大量作者归属问题。本门户提供的分析旨在帮助理解这一时期庞大戏剧生产中的归属问题。文体计量学的一项重要用途，是在现有语料库中识别词汇频率最接近待研究文本的作品。由于每位作者使用词语的比例各不相同，作品往往会按照作者归属呈现相互接近的关系。不过，必须始终保持谨慎，因为相似性也可能来自体裁、主题、年代、来源、文本状况或其他因素。`,
				`这里可以查看文体计量学支持传统归属的例子，如 ${worksTraditional.join('、')}，也可以查看文体计量学指向意外且可能具有启发性的归属案例，如 ${worksUnexpected.join('、')}。这里提出的新归属只应视为由自动计算处理产生的初步作者归属线索。因此，每一个案例都必须结合其具体复杂性进行细致的文献学研究。`
			];
		}

		if (locale === 'ja') {
			return [
				`${etso} プロジェクトは、研究者 ${alvaroWithUniversity} と教授 ${germanWithUniversity} が、スペイン黄金世紀演劇に数多く見られる著者帰属の問題に新しい計算機的手法を適用しようとした関心から生まれました。このポータルは、その時代の広大な演劇作品群における帰属問題を考えるための分析を提供します。文体計量学では、利用可能なコーパスの中から、研究対象のテキストと語彙頻度が近い作品を特定できます。著者ごとに語の使用比率は異なるため、作品はしばしば著者帰属に応じて近づいて見えます。ただし、類似性はジャンル、主題、年代、来歴、テキストの状態、その他の要因によっても生じ得るため、常に慎重に扱う必要があります。`,
				`ここでは、文体計量学が伝統的な帰属を支持する例として ${worksTraditional.join('、')} を参照できます。また、予想外で示唆的な帰属を文体計量学が示す例として ${worksUnexpected.join('、')} も見ることができます。ここで示す新しい帰属は、自動的な計算処理によって得られた著者帰属の初期的な手がかりにすぎません。したがって、それぞれの事例は固有の複雑さを踏まえ、文献学的に詳細に検討される必要があります。`
			];
		}

		if (locale === 'ko') {
			return [
				`${etso} 프로젝트는 연구자 ${alvaroWithUniversity}와 교수 ${germanWithUniversity}가 스페인 황금세기 연극이 제기하는 수많은 저자 귀속 문제에 새로운 컴퓨터 도구를 적용하려는 관심에서 시작되었습니다. 이 포털은 그 시대의 방대한 연극 생산 속에서 저자 귀속 문제를 밝히는 데 도움이 되는 분석을 제공합니다. 문체계량학은 중요한 활용 방식 중 하나로, 이용 가능한 말뭉치 안에서 연구 대상 텍스트와 어휘 빈도가 가장 가까운 작품을 찾아낼 수 있습니다. 각 저자는 단어를 서로 다른 비율로 사용하므로 작품들은 저자 귀속에 따라 서로 가까워지는 경향을 보입니다. 그러나 장르, 주제, 연대, 출처, 텍스트 상태 또는 다른 요인 때문에도 유사성이 생길 수 있으므로 항상 신중해야 합니다.`,
				`여기에서는 문체계량학이 전통적 귀속을 뒷받침하는 사례인 ${worksTraditional.join(', ')}를 확인할 수 있으며, 예상 밖이지만 설명력이 있을 수 있는 귀속을 가리키는 사례인 ${worksUnexpected.join(', ')}도 볼 수 있습니다. 여기에서 제시하는 새로운 귀속은 자동 계산 처리에서 나온 예비적인 저자 귀속 단서일 뿐입니다. 따라서 각 사례는 그 고유한 복잡성을 고려하여 문헌학적으로 면밀히 검토되어야 합니다.`
			];
		}

		if (locale === 'ru') {
			return [
				`Проект ${etso} возник из интереса исследователя ${alvaroWithUniversity} и профессора ${germanWithUniversity} к применению новых компьютерных инструментов к многочисленным проблемам авторской атрибуции, которые ставит театр испанского Золотого века. Портал предлагает анализы, способные прояснить вопросы атрибуции в обширной театральной продукции этого периода. Стилометрия позволяет, в одном из своих наиболее полезных применений, определить в доступном корпусе произведения, чьи лексические частоты наиболее близки к частотам изучаемого текста. Поскольку каждый автор использует слова в разных пропорциях, произведения часто сближаются в соответствии с авторством. Однако всегда необходима осторожность: сходства могут быть связаны также с жанром, темой, датировкой, происхождением, состоянием текста или другими факторами.`,
				`Здесь можно ознакомиться с примерами, в которых стилометрия подтверждает традиционную атрибуцию, такими как ${worksTraditional.join(', ')}, а также со случаями, где она указывает на неожиданную и потенциально значимую атрибуцию, такими как ${worksUnexpected.join(', ')}. Новые атрибуции, указанные здесь, являются лишь предварительными признаками авторства, полученными в результате автоматической компьютерной обработки. Поэтому каждый случай требует подробного филологического изучения с учетом его особой сложности.`
			];
		}

		return [
			`El proyecto ${etso} surge del interés del investigador ${alvaroWithUniversity} y del catedrático ${germanWithUniversity} en aplicar las nuevas herramientas informáticas a los numerosos problemas de autoría que presenta el teatro del Siglo de Oro español. Este portal trata de ofrecer análisis que puedan arrojar luz sobre las atribuciones de la vasta producción teatral del periodo aurisecular. Gracias a la estilometría podemos averiguar, en una de sus más útiles funcionalidades, qué obras tienen frecuencias en léxico más cercanas a las del texto que nos interesa en el corpus del que dispongamos. Cada autor usa las palabras en unas proporciones distintas, por lo que las obras suelen relacionarse en función de su autoría. Bien es cierto que debemos ser siempre precavidos por otras relaciones que pueden estarse produciendo por razón del género literario, la temática, la datación, la procedencia, el estado del texto, etc.`,
			`Se pueden consultar aquí ejemplos en los que la estilometría ratifica la atribución tradicional, como en ${worksTraditional.join(', ')}, y también casos en los que la estilometría apunta hacia una autoría inesperada y potencialmente esclarecedora, como en ${worksUnexpected.join(', ')}. Debemos tener en cuenta que las nuevas atribuciones aquí señaladas son meros indicios de autoría arrojados por el proceso informático de forma automática. Todos los casos deben ser estudiados pormenorizadamente desde la filología atendiendo a sus complejidades particulares.`
		];
	};

	const slides: HomeSlide[] = [
		{
			image: estilometriaHero,
			title: 'Examen de autorías',
			description: 'Consulta los informes estilométricos de 3000 obras teatrales del Siglo de Oro',
			alt: 'Visualización de análisis estilométrico del proyecto ETSO',
			link: '/examen-autorias'
		},
		{
			image: texoroHero,
			title: 'TEXORO',
			description: 'Realiza búsquedas textuales complejas en un corpus del Siglo de Oro de 38 millones de palabras',
			alt: 'Interfaz de búsqueda textual de TEXORO',
			link: '/texoro'
		},
		{
			image: bitesoHero,
			title: 'BITESO',
			description: 'Consulta más de 1500 textos digitales del Siglo de Oro en acceso abierto',
			alt: 'Biblioteca digital BITESO',
			link: '/biteso'
		},
		{
			image: resumenesHero,
			title: 'Resúmenes automáticos',
			description: 'Consulta los resúmenes automáticos de todas las obras de la base de datos',
			alt: 'Resúmenes automáticos de las obras',
			link: '/resumenes'
		}
		,
		{
			image: redEstilometricaImage,
			title: 'Red estilométrica',
			description: 'Visualiza la red de relaciones estilométricas para las 3000 obras del corpus',
			alt: 'Red estilométrica del proyecto ETSO',
			link: '/red-obras'
		}
	];

	const teamMembers: TeamMember[] = [
		{
			title: 'Álvaro Cuéllar',
			organizations: ['Universitat Autònoma de Barcelona'],
			summary: '',
			image: '/images/colaboradores/FotoAlvaroCuellar.webp',
			links: [
				{
					label: 'Correo de Álvaro Cuéllar',
					href: 'mailto:alvaro.cuellar@uab.cat'
				},
				{
					label: 'Web de Álvaro Cuéllar',
					href: 'https://www.alvarocuellar.com/'
				}
			]
		},
		{
			title: 'Germán Vega García-Luengos',
			organizations: ['Universidad de Valladolid'],
			summary: '',
			image: '/images/colaboradores/FotoGermanVega.webp',
			links: [
				{
					label: 'Correo de Germán Vega García-Luengos',
					href: 'mailto:german.vega@uva.es'
				}
			]
		}
	];

	const AUTOPLAY_MS = 7000;
	const HOME_DESCRIPTION =
		'Estilometría aplicada al teatro del Siglo de Oro: examen de autorías, TEXORO, BITESO, resúmenes automáticos y recursos digitales para la investigación.';
	const homeJsonLd = createWebPageJsonLd({
		title: SITE_NAME,
		description: HOME_DESCRIPTION,
		path: '/'
	});
	let activeIndex = $state(0);
	let autoplayHandle: ReturnType<typeof setInterval> | null = null;
	let prefersReducedMotion = false;
	let carouselTouchStartX = 0;
	let carouselTouchStartY = 0;

	const normalizeSlideIndex = (index: number): number => (index + slides.length) % slides.length;

	const goToSlide = (nextIndex: number): void => {
		const normalizedIndex = normalizeSlideIndex(nextIndex);
		activeIndex = normalizedIndex;
	};

	const goToPrevious = (): void => {
		goToSlide(activeIndex - 1);
	};

	const goToNext = (): void => {
		goToSlide(activeIndex + 1);
	};

	const stopAutoplay = (): void => {
		if (!autoplayHandle) return;
		clearInterval(autoplayHandle);
		autoplayHandle = null;
	};

	const startAutoplay = (): void => {
		if (prefersReducedMotion || autoplayHandle) return;
		autoplayHandle = setInterval(() => {
			goToSlide(activeIndex + 1);
		}, AUTOPLAY_MS);
	};

	const handleCarouselKeydown = (event: KeyboardEvent): void => {
		if (
			event.target instanceof HTMLInputElement ||
			event.target instanceof HTMLTextAreaElement ||
			event.target instanceof HTMLSelectElement
		) {
			return;
		}

		if (event.key === 'ArrowLeft') {
			event.preventDefault();
			goToPrevious();
			return;
		}

		if (event.key === 'ArrowRight') {
			event.preventDefault();
			goToNext();
		}
	};

	const handleCarouselTouchStart = (event: TouchEvent): void => {
		const touch = event.changedTouches[0];
		if (!touch) return;
		carouselTouchStartX = touch.clientX;
		carouselTouchStartY = touch.clientY;
	};

	const handleCarouselTouchEnd = (event: TouchEvent): void => {
		const touch = event.changedTouches[0];
		if (!touch) return;
		const deltaX = touch.clientX - carouselTouchStartX;
		const deltaY = touch.clientY - carouselTouchStartY;
		if (Math.abs(deltaX) < 48 || Math.abs(deltaX) < Math.abs(deltaY) * 1.25) return;
		stopAutoplay();
		if (deltaX < 0) {
			goToNext();
		} else {
			goToPrevious();
		}
		startAutoplay();
	};

	onMount(() => {
		prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		startAutoplay();

		return () => {
			stopAutoplay();
		};
	});
</script>

<SeoHead title={SITE_NAME} description={HOME_DESCRIPTION} path="/" jsonLd={homeJsonLd} />

<svelte:window onkeydown={handleCarouselKeydown} />

<section
	class="home-bleed group relative w-[100dvw] max-w-[100dvw] overflow-hidden"
	aria-label="Secciones destacadas de ETSO"
>
	<div
		class="relative h-[56vh] min-h-[25rem] w-full max-h-[44rem] [touch-action:pan-y]"
		role="group"
		aria-label="Carrusel de secciones destacadas"
		ontouchstart={handleCarouselTouchStart}
		ontouchend={handleCarouselTouchEnd}
	>
		<div
			class="absolute inset-0 flex transition-transform duration-700 ease-out"
			dir="ltr"
			style={`transform: translateX(-${activeIndex * 100}%);`}
		>
			{#each slides as slide, index}
				<article class="relative h-full min-w-full" dir="auto">
					<img
						src={slide.image}
						alt={slide.alt}
						class="h-full w-full object-cover"
						loading={index === 0 ? 'eager' : 'lazy'}
						fetchpriority={index === 0 ? 'high' : 'low'}
						decoding="async"
					/>
					<div class="absolute inset-0 bg-[rgba(8,21,52,0.48)]"></div>

					<div class="absolute inset-0 flex items-end pb-12 md:items-center md:pb-0">
						<div class="mx-auto w-full max-w-7xl px-4 sm:px-5 lg:px-6">
							<div class="max-w-[58rem] text-white">
								<h1 class="font-ui text-[clamp(1.9rem,4.5vw,3.4rem)] leading-[1.08] font-bold tracking-[-0.01em]">
									{slide.title}
								</h1>
								<p class="mt-4 max-w-[50rem] font-reading text-[clamp(1rem,1.5vw,1.35rem)] leading-[1.45] text-white/92">
									{slide.description}
								</p>

								{#if slide.link}
									<div class="mt-8">
										<a
											href={slide.link}
											class="inline-flex items-center rounded-card border border-white/60 bg-white/15 px-6 py-3 font-ui text-[0.95rem] font-semibold tracking-[0.03em] text-white no-underline transition hover:bg-white/25 hover:no-underline"
										>
											Acceder
										</a>
									</div>
								{/if}
							</div>
						</div>
					</div>
				</article>
			{/each}
		</div>

		<button
			type="button"
			class="pointer-events-auto absolute top-1/2 left-[max(0.75rem,env(safe-area-inset-left))] z-10 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/45 bg-black/20 text-white opacity-0 transition duration-200 hover:bg-black/32 group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:left-[max(1rem,env(safe-area-inset-left))] lg:left-[max(1.25rem,env(safe-area-inset-left))]"
			onclick={goToPrevious}
			aria-label="Ver diapositiva anterior"
		>
			<ChevronLeft class="h-5 w-5" aria-hidden="true" />
		</button>

		<button
			type="button"
			class="pointer-events-auto absolute top-1/2 right-[max(0.75rem,env(safe-area-inset-right))] z-10 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/45 bg-black/20 text-white opacity-0 transition duration-200 hover:bg-black/32 group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:right-[max(1rem,env(safe-area-inset-right))] lg:right-[max(1.25rem,env(safe-area-inset-right))]"
			onclick={goToNext}
			aria-label="Ver diapositiva siguiente"
		>
			<ChevronRight class="h-5 w-5" aria-hidden="true" />
		</button>

		<div class="absolute bottom-5 left-1/2 flex -translate-x-1/2 items-center gap-2">
			{#each slides as _, index}
				<button
					type="button"
					class={`h-2.5 rounded-full border border-white/65 transition ${index === activeIndex ? 'w-8 bg-white' : 'w-2.5 bg-white/35 hover:bg-white/55'}`}
					onclick={() => {
						goToSlide(index);
					}}
					aria-label={`Ir a la diapositiva ${index + 1}`}
					aria-pressed={index === activeIndex ? 'true' : 'false'}
				></button>
			{/each}
		</div>
	</div>
</section>

<section class="mx-auto mt-10 w-full max-w-7xl p-5 md:p-6 lg:p-8">
	<div class="grid items-stretch gap-6 lg:grid-cols-[minmax(16rem,35%)_minmax(0,1fr)] lg:gap-8">
		<div class="h-full overflow-hidden">
			<img
				src={grafoImage}
				alt="Grafo de relaciones estilométricas del proyecto ETSO"
				class="h-full w-full object-cover"
				loading="lazy"
			/>
		</div>

			<div class="grid gap-5 text-[1.02rem] leading-[1.72] text-text-soft" data-i18n-skip>
				{#each homeProjectParagraphs(data.locale) as paragraph}
					<p class="m-0" dir={data.locale === 'ar' ? 'rtl' : undefined}>{@html paragraph}</p>
				{/each}
			</div>
	</div>
</section>

<section class="home-bleed home-bleed-contained-md relative mt-6 w-[100dvw] max-w-[100dvw] md:mx-auto md:w-full md:max-w-7xl md:p-6 lg:p-8">
	<div class="grid items-stretch gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,35%)] lg:gap-8">
		<div class="grid gap-4 rounded-card bg-brand-blue px-5 py-6 text-white shadow-soft md:px-7 md:py-7 lg:px-8 lg:py-8">
			<p class="m-0 font-ui text-[0.78rem] font-semibold uppercase tracking-[0.05em] text-white/85">
				Humanidades digitales
			</p>
			<p class="m-0 font-ui text-[1.18rem] font-semibold leading-[1.35]">
				Estilometría, Inteligencia Artificial, Transcripción automática (HTR)...
			</p>
			<p class="m-0 text-[1.01rem] leading-[1.7] text-white/95">
				En ETSO empleamos diferentes técnicas informáticas que nos permiten trabajar los textos como nunca
				antes había sido posible.
			</p>
			<p class="m-0 text-[1.01rem] leading-[1.7] text-white/95">
				{#if data.locale === 'ar'}
					بفضل <b>Stylo</b> (Maciej Eder وJan Rybicki وMike Kestemont) يمكننا الربط بين النصوص بحسب استعمالاتها المعجمية.
				{:else}
					Gracias a <b>Stylo</b> (Maciej Eder, Jan Rybicki y Mike Kestemont) podemos relacionar los textos por sus usos
					léxicos.
				{/if}
			</p>
			<p class="m-0 text-[1.01rem] leading-[1.7] text-white/95">
				{#if data.locale === 'ar'}
					<b>Transkribus</b> (P. Kahle، S. Colutto، G. Hackl وG. Mühlberger) يتيح لنا نسخ المطبوعات القديمة والمخطوطات وتحديثها إملائيًا بصورة آلية وبدرجة عالية من الدقة.
				{:else}
					<b>Transkribus</b> (P. Kahle, S. Colutto, G. Hackl y G. Mühlberger) nos posibilita transcribir y modernizar
					impresos y manuscritos antiguos automáticamente con un alto grado de acierto.
				{/if}
			</p>
			<p class="m-0 text-[1.01rem] leading-[1.7] text-white/95">
				Además, empleamos otras técnicas estilométricas o de Inteligencia Artificial para tratar los textos.
			</p>
		</div>

		<div class="min-h-[18rem] overflow-hidden md:min-h-[24rem] lg:min-h-full">
			<img
				src={informesImage}
				alt="Panel de informes estilométricos de ETSO"
				class="h-full w-full object-cover"
				loading="lazy"
			/>
		</div>
	</div>
</section>

<section
	class="home-bleed relative mt-8 w-[100dvw] max-w-[100dvw] overflow-hidden bg-cover bg-center bg-no-repeat"
	style={`background-image: linear-gradient(rgba(0, 38, 129, 0.52), rgba(0, 38, 129, 0.52)), url('${fondoEscritura}')`}
>
	<div class="mx-auto w-full max-w-7xl px-4 py-14 text-left text-white sm:px-5 md:py-16 md:text-center lg:px-6 lg:py-20">
		<div class="mx-auto max-w-5xl">
			<h2 class="font-ui text-[clamp(1.6rem,3.2vw,2.5rem)] leading-[1.15] font-bold">
				TEXORO: Textos del Siglo de Oro
			</h2>
			<p class="mt-3 font-ui text-[clamp(1rem,1.6vw,1.28rem)] font-medium">Búsquedas textuales en 3000 obras del Siglo de Oro</p>

			<div class="mt-8 grid gap-5 text-left font-reading text-[1.03rem] leading-[1.72] text-white/95 md:text-center">
				<p class="m-0">
					TEXORO es una plataforma de búsqueda textual que permite consultar de forma unificada un amplio corpus de obras del Siglo de Oro. El recurso reúne cerca de 3000 textos, con más de 38 millones de palabras indexadas y obras de más de 400 autores, y ofrece distintas posibilidades para explorar el patrimonio literario aurisecular desde criterios léxicos, textuales y documentales.
				</p>
				<p class="m-0">
					El buscador permite localizar palabras, frases exactas y patrones con comodines, así como realizar consultas avanzadas mediante la combinación de términos, condiciones de proximidad y filtros por título, género, atribución tradicional, atribución estilométrica o estado del texto. De este modo, TEXORO facilita tanto búsquedas puntuales como exploraciones más complejas sobre la presencia, distribución y relación de palabras o expresiones en el conjunto del corpus.
				</p>
			</div>

			<div class="mt-9">
				<a
					href="/texoro"
					class="inline-flex items-center rounded-card border border-white/60 bg-white/15 px-6 py-3 font-ui text-[0.95rem] font-semibold tracking-[0.03em] text-white no-underline transition hover:bg-white/25 hover:no-underline"
				>
					TEXORO
				</a>
			</div>
		</div>
	</div>
</section>

<style>
	.home-bleed {
		margin-left: calc(50% - 50dvw);
		margin-right: calc(50% - 50dvw);
	}

	@media (min-width: 768px) {
		.home-bleed-contained-md {
			margin-left: auto;
			margin-right: auto;
		}
	}
</style>

<section class="mx-auto mt-8 w-full max-w-7xl px-2 md:px-6 lg:px-8">
	<div class="relative overflow-hidden rounded-card bg-neutral-100 px-5 py-6 text-brand-blue-dark md:px-7 md:py-8 lg:px-10 lg:py-10">
		<img
			src={librosHero}
			alt=""
			aria-hidden="true"
			class="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-[0.26]"
			loading="lazy"
		/>
		<div
			class="pointer-events-none absolute inset-0"
			style="background-image: linear-gradient(rgba(243, 244, 246, 0.58), rgba(243, 244, 246, 0.58));"
		></div>

		<div class="relative z-10 grid content-start gap-5">
			<div class="grid gap-2">
				<h2 class="m-0 font-ui text-[clamp(1.6rem,3.2vw,2.5rem)] leading-[1.15] font-bold">
					BITESO
				</h2>
				<p class="m-0 font-ui text-[clamp(1rem,1.6vw,1.28rem)] font-medium text-brand-blue">
					Textos digitales del Siglo de Oro en acceso abierto
				</p>
			</div>

			<div class="grid max-w-6xl gap-4 text-[1.03rem] leading-[1.72] text-text-soft">
				<p class="m-0">
					BITESO reúne y pone en acceso abierto una amplia colección de textos digitales del Siglo de Oro. El recurso nace, en buena medida, de las transcripciones automáticas de impresos y manuscritos realizadas para los análisis estilométricos de autoría, así como de materiales revisados, facilitados o contrastados gracias a la colaboración de distintos especialistas. Su objetivo es ofrecer a la comunidad un punto de acceso sencillo a textos que, en muchos casos, permanecían contenidos en documentos antiguos, de difícil manejo o lectura.
				</p>
				<p class="m-0">
					Los textos incorporados a BITESO no aspiran a sustituir a las ediciones críticas ni presentan siempre la misma calidad ecdótica. Además, en su estado actual no incluyen los nombres de los personajes ni las acotaciones escénicas, sino únicamente los versos limpios de cada obra. Sin embargo, constituyen materiales útiles para la lectura, la consulta, la docencia, la investigación filológica y la exploración computacional del patrimonio literario aurisecular. Con este recurso se quiere favorecer la circulación abierta de estos materiales y facilitar nuevas formas de acceso al teatro y a la literatura del Siglo de Oro.
				</p>
			</div>

			<div class="pt-1">
				<a
					href="/biteso"
					class="inline-flex items-center rounded-card border border-border bg-white/85 px-6 py-3 font-ui text-[0.95rem] font-semibold tracking-[0.03em] text-text-soft no-underline transition hover:bg-surface-soft hover:text-text-main hover:no-underline"
				>
					BITESO
				</a>
			</div>
		</div>
	</div>
</section>

<section class="mx-auto mt-8 w-full max-w-7xl p-5 md:p-6 lg:p-8">
	<div class="grid gap-5 text-left text-[1.03rem] leading-[1.72] text-text-soft md:text-center">
		<h2 class="m-0 font-ui text-[clamp(1.6rem,3.2vw,2.5rem)] leading-[1.15] font-bold text-brand-blue-dark">
			¿Cómo te podemos ayudar? ¿Cómo nos puedes ayudar?
		</h2> 
		<p class="m-0">
			Podemos ayudarte a explorar los distintos recursos disponibles para el estudio del teatro y la literatura del Siglo de Oro. En Examen de autorías se pueden consultar los informes estilométricos de las obras incorporadas al corpus, con indicios sobre sus posibles relaciones de autoría. TEXORO permite realizar búsquedas textuales sobre cerca de 3000 obras y más de 38 millones de palabras, con opciones para localizar palabras, frases, patrones, combinaciones de términos y relaciones de proximidad. BITESO ofrece acceso abierto a textos digitales procedentes, en buena medida, de transcripciones automáticas de impresos y manuscritos. Además, los resúmenes automáticos permiten obtener una primera orientación sobre el argumento y el contenido de las obras, siempre como ayuda inicial y no como sustituto de la lectura o del análisis filológico.
		</p>
		<p class="m-0">
			También puedes colaborar con nosotros enviándonos textos del Siglo de Oro que todavía no estén incorporados a nuestros recursos, información bibliográfica, noticias sobre atribuciones, datos sobre testimonios o cualquier material que pueda mejorar el conjunto. La colaboración de investigadores, docentes y especialistas resulta fundamental para seguir ampliando, revisando y corrigiendo la información disponible. Por ello, si encuentras errores, erratas, problemas en los textos, fallos en los resúmenes automáticos o datos que puedan precisarse mejor, te agradeceremos que nos envíes tus sugerencias de corrección. Citar nuestros recursos en publicaciones, trabajos académicos o actividades docentes también nos ayuda a difundir el proyecto y a obtener el apoyo necesario para mantenerlo y ampliarlo.
		</p>
		<div class="pt-1">
			<a
				href="/contacto"
				class="inline-flex items-center rounded-card border border-brand-blue/25 bg-brand-blue px-5 py-2.5 font-ui text-[0.92rem] font-semibold text-white no-underline transition hover:bg-brand-blue-dark hover:no-underline"
			>
				Contacta con nosotros
			</a>
		</div>
	</div>
</section>

<section class="mx-auto mt-8 w-full max-w-7xl p-5 md:p-6 lg:p-8">
		<div class="grid gap-4">
			<div class="grid gap-1 text-left md:text-center">
				<h2 class="m-0 font-ui text-[clamp(1.4rem,2.6vw,2rem)] font-semibold leading-[1.2] text-brand-blue-dark">
					ETSO es un proyecto de
				</h2>
			</div>

		<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
			{#each teamMembers as member}
				<TeamProfileCard
					title={member.title}
					image={member.image}
					organizations={member.organizations}
					summary={member.summary}
					links={member.links}
				/>
			{/each}
		</div>
	</div>
</section>
