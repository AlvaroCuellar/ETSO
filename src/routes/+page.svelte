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

	const homeDigitalHumanitiesByLocale: Record<Locale, { eyebrow: string; title: string; paragraphs: string[] }> = {
		es: {
			eyebrow: 'Humanidades digitales',
			title: 'Estilometría, Inteligencia Artificial, Transcripción automática (HTR)...',
			paragraphs: [
				'En ETSO empleamos diferentes técnicas informáticas que nos permiten trabajar los textos de formas que antes no eran posibles.',
				'Gracias a <b>Stylo</b> (Maciej Eder, Jan Rybicki y Mike Kestemont), podemos relacionar los textos según sus usos léxicos.',
				'<b>Transkribus</b> (P. Kahle, S. Colutto, G. Hackl y G. Mühlberger) nos permite transcribir automáticamente impresos antiguos y manuscritos con un alto grado de precisión.',
				'Además, empleamos otras técnicas estilométricas y de inteligencia artificial para tratar y analizar los textos.'
			]
		},
		en: {
			eyebrow: 'Digital humanities',
			title: 'Stylometry, artificial intelligence, automatic transcription (HTR)...',
			paragraphs: [
				'At ETSO, we use different computational techniques that allow us to work with texts in ways that were not previously possible.',
				'Thanks to <b>Stylo</b> (Maciej Eder, Jan Rybicki, and Mike Kestemont), we can relate texts according to their lexical usage.',
				'<b>Transkribus</b> (P. Kahle, S. Colutto, G. Hackl, and G. Mühlberger) allows us to automatically transcribe old printed books and manuscripts with a high degree of accuracy.',
				'We also use other stylometric and artificial intelligence techniques to process and analyze texts.'
			]
		},
		fr: {
			eyebrow: 'Humanités numériques',
			title: 'Stylométrie, intelligence artificielle, transcription automatique (HTR)...',
			paragraphs: [
				'Chez ETSO, nous employons différentes techniques informatiques qui nous permettent de travailler sur les textes d’une manière auparavant impossible.',
				'Grâce à <b>Stylo</b> (Maciej Eder, Jan Rybicki et Mike Kestemont), nous pouvons rapprocher les textes selon leurs usages lexicaux.',
				'<b>Transkribus</b> (P. Kahle, S. Colutto, G. Hackl et G. Mühlberger) nous permet de transcrire automatiquement des imprimés anciens et des manuscrits avec un haut degré de précision.',
				'Nous utilisons également d’autres techniques de stylométrie et d’intelligence artificielle pour traiter et analyser les textes.'
			]
		},
		pt: {
			eyebrow: 'Humanidades digitais',
			title: 'Estilometria, inteligência artificial, transcrição automática (HTR)...',
			paragraphs: [
				'No ETSO, usamos diferentes técnicas computacionais que nos permitem trabalhar com textos de maneiras que antes não eram possíveis.',
				'Graças ao <b>Stylo</b> (Maciej Eder, Jan Rybicki e Mike Kestemont), podemos relacionar os textos segundo seus usos lexicais.',
				'O <b>Transkribus</b> (P. Kahle, S. Colutto, G. Hackl e G. Mühlberger) nos permite transcrever automaticamente impressos antigos e manuscritos com alto grau de precisão.',
				'Também usamos outras técnicas estilométricas e de inteligência artificial para tratar e analisar os textos.'
			]
		},
		it: {
			eyebrow: 'Umanistica digitale',
			title: 'Stilometria, intelligenza artificiale, trascrizione automatica (HTR)...',
			paragraphs: [
				'In ETSO usiamo diverse tecniche informatiche che ci permettono di lavorare sui testi in modi che prima non erano possibili.',
				'Grazie a <b>Stylo</b> (Maciej Eder, Jan Rybicki e Mike Kestemont), possiamo mettere in relazione i testi in base ai loro usi lessicali.',
				'<b>Transkribus</b> (P. Kahle, S. Colutto, G. Hackl e G. Mühlberger) ci permette di trascrivere automaticamente antichi testi a stampa e manoscritti con un alto grado di precisione.',
				'Usiamo inoltre altre tecniche stilometriche e di intelligenza artificiale per trattare e analizzare i testi.'
			]
		},
		de: {
			eyebrow: 'Digitale Geisteswissenschaften',
			title: 'Stilometrie, künstliche Intelligenz, automatische Transkription (HTR)...',
			paragraphs: [
				'Bei ETSO setzen wir verschiedene computergestützte Verfahren ein, die es uns ermöglichen, auf eine Weise mit Texten zu arbeiten, die zuvor nicht möglich war.',
				'Dank <b>Stylo</b> (Maciej Eder, Jan Rybicki und Mike Kestemont) können wir Texte anhand ihres lexikalischen Gebrauchs miteinander in Beziehung setzen.',
				'<b>Transkribus</b> (P. Kahle, S. Colutto, G. Hackl und G. Mühlberger) ermöglicht es uns, alte Drucke und Handschriften mit hoher Genauigkeit automatisch zu transkribieren.',
				'Darüber hinaus nutzen wir weitere stilometrische und KI-gestützte Verfahren zur Aufbereitung und Analyse der Texte.'
			]
		},
		zh: {
			eyebrow: '数字人文',
			title: '文体计量学、人工智能、自动转录（HTR）……',
			paragraphs: [
				'在 ETSO，我们使用多种计算技术，使我们能够以前所未有的方式处理文本。',
				'借助 <b>Stylo</b>（Maciej Eder、Jan Rybicki 和 Mike Kestemont），我们可以根据词汇使用情况将文本相互关联。',
				'<b>Transkribus</b>（P. Kahle、S. Colutto、G. Hackl 和 G. Mühlberger）使我们能够以较高准确率自动转录古代印刷本和手稿。',
				'此外，我们还使用其他文体计量和人工智能技术来处理和分析文本。'
			]
		},
		ja: {
			eyebrow: 'デジタル人文学',
			title: '文体計量学、人工知能、自動転写（HTR）...',
			paragraphs: [
				'ETSO では、これまで不可能だった方法でテキストを扱うために、さまざまな計算技術を用いています。',
				'<b>Stylo</b>（Maciej Eder、Jan Rybicki、Mike Kestemont）により、語彙使用に基づいてテキスト同士を関連づけることができます。',
				'<b>Transkribus</b>（P. Kahle、S. Colutto、G. Hackl、G. Mühlberger）により、古い印刷本や写本を高精度で自動転写できます。',
				'さらに、文体計量学や人工知能の他の手法も用いて、テキストの処理と分析を行っています。'
			]
		},
		ko: {
			eyebrow: '디지털 인문학',
			title: '문체계량학, 인공지능, 자동 전사(HTR)...',
			paragraphs: [
				'ETSO에서는 이전에는 불가능했던 방식으로 텍스트를 다룰 수 있게 해 주는 다양한 컴퓨터 기술을 사용합니다.',
				'<b>Stylo</b>(Maciej Eder, Jan Rybicki 및 Mike Kestemont)를 통해 텍스트의 어휘 사용을 기준으로 서로의 관계를 파악할 수 있습니다.',
				'<b>Transkribus</b>(P. Kahle, S. Colutto, G. Hackl 및 G. Mühlberger)를 통해 고인쇄본과 필사본을 높은 정확도로 자동 전사할 수 있습니다.',
				'또한 문체계량학과 인공지능의 다른 기법을 사용해 텍스트를 처리하고 분석합니다.'
			]
		},
		ru: {
			eyebrow: 'Цифровые гуманитарные науки',
			title: 'Стилометрия, искусственный интеллект, автоматическая транскрипция (HTR)...',
			paragraphs: [
				'В ETSO мы используем разные компьютерные технологии, которые позволяют нам работать с текстами так, как прежде было невозможно.',
				'Благодаря <b>Stylo</b> (Maciej Eder, Jan Rybicki и Mike Kestemont) мы можем сопоставлять тексты по особенностям их лексического употребления.',
				'<b>Transkribus</b> (P. Kahle, S. Colutto, G. Hackl и G. Mühlberger) позволяет нам автоматически транскрибировать старопечатные издания и рукописи с высокой степенью точности.',
				'Кроме того, мы используем другие стилометрические и ИИ-методы для обработки и анализа текстов.'
			]
		},
		ar: {
			eyebrow: 'العلوم الإنسانية الرقمية',
			title: 'القياس الأسلوبي، الذكاء الاصطناعي، النسخ الآلي (HTR)...',
			paragraphs: [
				'في ETSO نستخدم تقنيات حاسوبية متنوعة تتيح لنا التعامل مع النصوص بطرائق لم تكن ممكنة من قبل.',
				'بفضل <b>Stylo</b> (Maciej Eder وJan Rybicki وMike Kestemont) يمكننا الربط بين النصوص بحسب استعمالاتها المعجمية.',
				'<b>Transkribus</b> (P. Kahle وS. Colutto وG. Hackl وG. Mühlberger) يتيح لنا نسخ المطبوعات القديمة والمخطوطات آليًا بدرجة عالية من الدقة.',
				'ونستخدم أيضًا تقنيات أخرى من القياس الأسلوبي والذكاء الاصطناعي لمعالجة النصوص وتحليلها.'
			]
		}
	};

	const texoroIntroByLocale: Record<Locale, { subtitle: string; paragraphs: string[] }> = {
		es: {
			subtitle: 'Búsquedas textuales en 3000 obras del Siglo de Oro',
			paragraphs: [
				'TEXORO es una plataforma de búsqueda textual que permite consultar de forma unificada un amplio corpus de obras del Siglo de Oro. El recurso reúne cerca de 3000 textos, con más de 38 millones de palabras indexadas y obras de más de 400 autores, y ofrece distintas posibilidades para explorar el patrimonio literario aurisecular desde criterios léxicos, textuales y documentales.',
				'El buscador permite localizar palabras, frases exactas y patrones con comodines, así como realizar consultas avanzadas mediante la combinación de términos, condiciones de proximidad y filtros por título, género, atribución tradicional, atribución estilométrica o estado del texto. De este modo, TEXORO facilita tanto búsquedas puntuales como exploraciones más complejas sobre la presencia, distribución y relación de palabras o expresiones en el conjunto del corpus.'
			]
		},
		en: {
			subtitle: 'Textual searches across 3,000 Golden Age works',
			paragraphs: [
				'TEXORO is a textual search platform that allows users to search a large corpus of Spanish Golden Age works through a unified interface. The resource brings together nearly 3,000 texts, more than 38 million indexed words and works by more than 400 authors, offering several ways to explore this literary heritage through lexical, textual and documentary criteria.',
				'The search engine can locate words, exact phrases and wildcard patterns, and it also supports advanced queries combining terms, proximity conditions and filters by title, genre, traditional attribution, stylometric attribution or textual condition. In this way, TEXORO supports both targeted searches and more complex explorations of the presence, distribution and relationships of words or expressions across the corpus.'
			]
		},
		fr: {
			subtitle: 'Recherches textuelles dans 3000 œuvres du Siècle d’or',
			paragraphs: [
				'TEXORO est une plateforme de recherche textuelle qui permet d’interroger de manière unifiée un vaste corpus d’œuvres du Siècle d’or espagnol. La ressource réunit près de 3000 textes, plus de 38 millions de mots indexés et des œuvres de plus de 400 auteurs, et offre plusieurs façons d’explorer ce patrimoine littéraire selon des critères lexicaux, textuels et documentaires.',
				'Le moteur de recherche permet de localiser des mots, des expressions exactes et des motifs avec jokers, ainsi que de lancer des requêtes avancées combinant termes, conditions de proximité et filtres par titre, genre, attribution traditionnelle, attribution stylométrique ou état du texte. TEXORO facilite ainsi aussi bien les recherches ciblées que les explorations plus complexes de la présence, de la distribution et des relations des mots ou expressions dans l’ensemble du corpus.'
			]
		},
		pt: {
			subtitle: 'Pesquisas textuais em 3000 obras do Século de Ouro espanhol',
			paragraphs: [
				'TEXORO é uma plataforma de pesquisa textual que permite consultar de forma unificada um amplo corpus de obras do Século de Ouro espanhol. O recurso reúne cerca de 3000 textos, mais de 38 milhões de palavras indexadas e obras de mais de 400 autores, oferecendo diferentes possibilidades para explorar esse patrimônio literário por critérios lexicais, textuais e documentais.',
				'O buscador permite localizar palavras, frases exatas e padrões com curingas, além de realizar consultas avançadas mediante a combinação de termos, condições de proximidade e filtros por título, gênero, atribuição tradicional, atribuição estilométrica ou estado do texto. Desse modo, TEXORO facilita tanto pesquisas específicas quanto explorações mais complexas sobre a presença, a distribuição e a relação de palavras ou expressões no conjunto do corpus.'
			]
		},
		it: {
			subtitle: 'Ricerche testuali in 3000 opere del Secolo d’Oro spagnolo',
			paragraphs: [
				'TEXORO è una piattaforma di ricerca testuale che permette di consultare in modo unitario un ampio corpus di opere del Secolo d’Oro spagnolo. La risorsa riunisce circa 3000 testi, più di 38 milioni di parole indicizzate e opere di oltre 400 autori, offrendo diverse possibilità per esplorare questo patrimonio letterario secondo criteri lessicali, testuali e documentari.',
				'Il motore di ricerca consente di individuare parole, frasi esatte e pattern con caratteri jolly, nonché di effettuare ricerche avanzate combinando termini, condizioni di prossimità e filtri per titolo, genere, attribuzione tradizionale, attribuzione stilometrica o stato del testo. In questo modo, TEXORO facilita sia ricerche specifiche sia esplorazioni più complesse sulla presenza, distribuzione e relazione di parole o espressioni nell’intero corpus.'
			]
		},
		de: {
			subtitle: 'Textsuche in 3000 Werken des spanischen Siglo de Oro',
			paragraphs: [
				'TEXORO ist eine Textsuchplattform, mit der sich ein umfangreiches Korpus von Werken des spanischen Siglo de Oro einheitlich durchsuchen lässt. Die Ressource umfasst rund 3000 Texte mit mehr als 38 Millionen indexierten Wörtern und Werke von über 400 Autorinnen und Autoren; sie bietet verschiedene Möglichkeiten, dieses literarische Erbe nach lexikalischen, textuellen und dokumentarischen Kriterien zu erschließen.',
				'Die Suche findet Wörter, exakte Phrasen und Muster mit Platzhaltern und ermöglicht erweiterte Abfragen durch die Kombination von Begriffen, Nähebedingungen und Filtern nach Titel, Gattung, traditioneller Zuschreibung, stilometrischer Zuschreibung oder Textzustand. So unterstützt TEXORO sowohl gezielte Suchen als auch komplexere Untersuchungen zur Präsenz, Verteilung und Beziehung von Wörtern oder Ausdrücken im gesamten Korpus.'
			]
		},
		zh: {
			subtitle: '在 3000 部西班牙黄金时代作品中进行文本检索',
			paragraphs: [
				'TEXORO 是一个文本搜索平台，可通过统一界面检索西班牙黄金时代的大型作品语料库。该资源汇集近 3000 篇文本、超过 3800 万个索引词以及 400 多位作者的作品，可从词汇、文本和文献等角度探索这一文学遗产。',
				'检索器可以查找词语、精确短语和带通配符的模式，也支持通过组合术语、邻近条件以及标题、体裁、传统归属、文体计量归属或文本状态等筛选条件进行高级查询。通过这种方式，TEXORO 既支持有针对性的检索，也支持对整个语料库中词语或表达的出现、分布和关系进行更复杂的探索。'
			]
		},
		ja: {
			subtitle: 'スペイン黄金世紀の 3000 作品を対象とするテキスト検索',
			paragraphs: [
				'TEXORO は、スペイン黄金世紀作品の大規模コーパスを統一的に検索できるテキスト検索プラットフォームです。このリソースは約 3000 件のテキスト、3800 万語以上の索引語、400 人を超える著者の作品を収録し、語彙・テキスト・文献の観点からこの文学遺産を探索するための複数の方法を提供します。',
				'検索機能では、単語、完全一致のフレーズ、ワイルドカードを用いたパターンを探せるほか、語、近接条件、タイトル、ジャンル、伝統的帰属、文体計量による帰属、テキストの状態などのフィルターを組み合わせた高度な検索も可能です。これにより TEXORO は、対象を絞った検索と、コーパス全体における語句の出現、分布、関係についてのより複雑な探索の両方を支援します。'
			]
		},
		ko: {
			subtitle: '스페인 황금세기 작품 3000편 대상 텍스트 검색',
			paragraphs: [
				'TEXORO는 스페인 황금세기 작품의 대규모 말뭉치를 통합적으로 검색할 수 있는 텍스트 검색 플랫폼입니다. 이 리소스는 약 3000편의 텍스트, 3800만 개가 넘는 색인어, 400명 이상의 저자 작품을 모아 어휘, 텍스트, 문헌 기준으로 이 문학 유산을 탐색할 수 있게 합니다.',
				'검색기는 단어, 정확한 구, 와일드카드 패턴을 찾을 수 있으며, 용어 조합, 근접 조건, 제목, 장르, 전통적 귀속, 문체계량 귀속 또는 텍스트 상태 필터를 결합한 고급 검색도 지원합니다. 이를 통해 TEXORO는 특정 검색뿐 아니라 전체 말뭉치에서 단어나 표현의 출현, 분포, 관계를 살피는 더 복합적인 탐색도 가능하게 합니다.'
			]
		},
		ru: {
			subtitle: 'Текстовый поиск по 3000 произведениям испанского Золотого века',
			paragraphs: [
				'TEXORO — это платформа текстового поиска, которая позволяет единообразно обращаться к большому корпусу произведений испанского Золотого века. Ресурс объединяет около 3000 текстов, более 38 миллионов проиндексированных слов и произведения более чем 400 авторов, предлагая разные способы изучать это литературное наследие по лексическим, текстовым и документальным критериям.',
				'Поиск позволяет находить слова, точные фразы и шаблоны с подстановочными знаками, а также выполнять расширенные запросы с сочетанием терминов, условий близости и фильтров по названию, жанру, традиционной атрибуции, стилометрической атрибуции или состоянию текста. Так TEXORO поддерживает как точечный поиск, так и более сложные исследования присутствия, распределения и связей слов или выражений во всем корпусе.'
			]
		},
		ar: {
			subtitle: 'بحث نصي في 3000 عمل من العصر الذهبي الإسباني',
			paragraphs: [
				'TEXORO منصة للبحث النصي تتيح البحث عبر واجهة موحّدة في مجموعة واسعة من أعمال العصر الذهبي الإسباني. يجمع المورد قرابة 3000 نص، تضم أكثر من 38 مليون كلمة مفهرسة وأعمالًا لأكثر من 400 مؤلف، ويوفر إمكانات متعددة لاستكشاف هذا التراث الأدبي وفق معايير معجمية ونصية ووثائقية.',
				'يتيح محرك البحث العثور على الكلمات والعبارات الدقيقة والأنماط ذات العلامات البديلة، كما يتيح إجراء عمليات بحث متقدمة تجمع بين المصطلحات وشروط التقارب ومرشحات العنوان والنوع والإسناد التقليدي والإسناد الأسلوبي وحالة النص. وبهذا يدعم TEXORO البحث الموجّه والاستكشافات الأكثر تعقيدًا لحضور الكلمات أو العبارات وتوزيعها وعلاقاتها داخل corpus كامل.'
			]
		}
	};

	const bitesoIntroByLocale: Record<Locale, { subtitle: string; paragraphs: string[] }> = {
		es: {
			subtitle: 'Textos digitales del Siglo de Oro en acceso abierto',
			paragraphs: [
				'BITESO reúne y pone en acceso abierto una amplia colección de textos digitales del Siglo de Oro. El recurso nace, en buena medida, de las transcripciones automáticas de impresos y manuscritos realizadas para los análisis estilométricos de autoría, así como de materiales revisados, facilitados o contrastados gracias a la colaboración de distintos especialistas.',
				'Los textos incorporados a BITESO deben entenderse como versiones de trabajo: no sustituyen a las ediciones críticas, pueden contener errores de transcripción y presentan una calidad textual desigual según la fuente y el estado de revisión. En su estado actual, se ofrecen sin nombres de personajes ni acotaciones escénicas, y contienen únicamente el texto depurado de cada obra.'
			]
		},
		en: {
			subtitle: 'Open-access digital texts from the Golden Age',
			paragraphs: [
				'BITESO brings together and provides open access to a broad collection of digital texts from the Spanish Golden Age. The resource is largely based on automatic transcriptions of old printed books and manuscripts prepared for stylometric authorship analyses, together with materials reviewed, supplied or checked through collaboration with specialists.',
				'The texts included in BITESO should be understood as working texts: they do not replace critical editions, may contain transcription errors and have uneven textual quality depending on the source and the degree of review. At present, they are offered without character names or stage directions and contain only the clean text of each work.'
			]
		},
		fr: {
			subtitle: 'Textes numériques du Siècle d’or en accès ouvert',
			paragraphs: [
				'BITESO réunit et met en accès ouvert une vaste collection de textes numériques du Siècle d’or espagnol. La ressource repose en grande partie sur des transcriptions automatiques d’imprimés anciens et de manuscrits préparées pour les analyses stylométriques d’attribution, ainsi que sur des matériaux relus, fournis ou vérifiés grâce à la collaboration de spécialistes.',
				'Les textes intégrés à BITESO doivent être compris comme des versions de travail : ils ne remplacent pas les éditions critiques, peuvent contenir des erreurs de transcription et présentent une qualité textuelle inégale selon la source et l’état de révision. Dans leur état actuel, ils sont proposés sans noms de personnages ni didascalies et ne contiennent que le texte épuré de chaque œuvre.'
			]
		},
		pt: {
			subtitle: 'Textos digitais do Século de Ouro espanhol em acesso aberto',
			paragraphs: [
				'BITESO reúne e disponibiliza em acesso aberto uma ampla coleção de textos digitais do Século de Ouro espanhol. O recurso se baseia, em grande parte, em transcrições automáticas de impressos antigos e manuscritos preparadas para análises estilométricas de atribuição de autoria, além de materiais revisados, fornecidos ou conferidos graças à colaboração de especialistas.',
				'Os textos incorporados ao BITESO devem ser entendidos como versões de trabalho: não substituem as edições críticas, podem conter erros de transcrição e apresentam qualidade textual desigual conforme a fonte e o estado de revisão. No estado atual, são oferecidos sem nomes dos personagens nem didascálias e contêm apenas o texto depurado de cada obra.'
			]
		},
		it: {
			subtitle: 'Testi digitali del Secolo d’Oro spagnolo ad accesso aperto',
			paragraphs: [
				'BITESO riunisce e rende disponibile ad accesso aperto un’ampia collezione di testi digitali del Secolo d’Oro spagnolo. La risorsa nasce in larga misura da trascrizioni automatiche di antichi testi a stampa e manoscritti preparate per le analisi stilometriche di attribuzione d’autore, insieme a materiali rivisti, forniti o verificati grazie alla collaborazione di specialisti.',
				'I testi inclusi in BITESO devono essere considerati versioni di lavoro: non sostituiscono le edizioni critiche, possono contenere errori di trascrizione e presentano una qualità testuale diseguale a seconda della fonte e dello stato di revisione. Nello stato attuale sono offerti senza nomi dei personaggi né didascalie e contengono soltanto il testo depurato di ciascuna opera.'
			]
		},
		de: {
			subtitle: 'Digitale Texte des spanischen Siglo de Oro im Open Access',
			paragraphs: [
				'BITESO vereint und bietet offenen Zugang zu einer umfangreichen Sammlung digitaler Texte des spanischen Siglo de Oro. Die Ressource beruht zu einem großen Teil auf automatischen Transkriptionen alter Drucke und Handschriften, die für stilometrische Autorschaftsanalysen erstellt wurden, sowie auf Materialien, die dank der Zusammenarbeit mit Fachleuten geprüft, bereitgestellt oder abgeglichen wurden.',
				'Die in BITESO enthaltenen Texte sind als Arbeitsfassungen zu verstehen: Sie ersetzen keine kritischen Ausgaben, können Transkriptionsfehler enthalten und weisen je nach Quelle und Bearbeitungsstand eine unterschiedliche textkritische Qualität auf. Derzeit werden sie ohne Figurennamen und Bühnenanweisungen angeboten und enthalten nur den bereinigten Text jedes Werks.'
			]
		},
		zh: {
			subtitle: '开放获取的西班牙黄金时代数字文本',
			paragraphs: [
				'BITESO 汇集并开放提供一批西班牙黄金时代数字文本。该资源在很大程度上基于为文体计量作者归属分析而制作的古代印刷本和手稿自动转录文本，同时也包括经专家合作校阅、提供或核验的材料。',
				'BITESO 中的文本应被视为工作文本：它们不能替代校勘本，可能包含转录错误，并且文本质量会因来源和校订程度而不同。目前这些文本不含人物姓名和舞台说明，只提供每部作品的整理正文。'
			]
		},
		ja: {
			subtitle: 'スペイン黄金世紀のオープンアクセス・デジタルテキスト',
			paragraphs: [
				'BITESO は、スペイン黄金世紀のデジタルテキストを幅広く収集し、オープンアクセスで提供します。このリソースは主に、文体計量による著者帰属分析のために作成された古い印刷本や写本の自動転写に基づき、専門家の協力によって確認・提供・照合された資料も含みます。',
				'BITESO に収録されたテキストは作業用テキストとして理解する必要があります。校訂版に代わるものではなく、転写誤りを含む可能性があり、資料や確認状況によってテキスト品質にも差があります。現時点では、登場人物名やト書きは含まず、各作品の整理済み本文のみを提供しています。'
			]
		},
		ko: {
			subtitle: '스페인 황금세기 디지털 텍스트의 오픈 액세스',
			paragraphs: [
				'BITESO는 스페인 황금세기의 디지털 텍스트를 폭넓게 모아 오픈 액세스로 제공합니다. 이 리소스는 주로 문체계량 저자 귀속 분석을 위해 작성된 고인쇄본과 필사본의 자동 전사에 기반하며, 전문가와의 협력을 통해 검토, 제공 또는 대조된 자료도 포함합니다.',
				'BITESO에 포함된 텍스트는 작업용 텍스트로 이해해야 합니다. 비평판을 대체하지 않으며, 전사 오류가 있을 수 있고 출처와 검토 상태에 따라 텍스트 품질도 고르지 않습니다. 현재는 등장인물 이름과 무대 지시문 없이 각 작품의 정리된 본문만 제공합니다.'
			]
		},
		ru: {
			subtitle: 'Цифровые тексты испанского Золотого века в открытом доступе',
			paragraphs: [
				'BITESO объединяет и предоставляет в открытом доступе широкую коллекцию цифровых текстов испанского Золотого века. Ресурс во многом основан на автоматических транскрипциях старопечатных изданий и рукописей, подготовленных для стилометрического анализа авторства, а также на материалах, проверенных, предоставленных или сопоставленных благодаря сотрудничеству со специалистами.',
				'Тексты, включенные в BITESO, следует понимать как рабочие тексты: они не заменяют критические издания, могут содержать ошибки транскрипции и имеют неодинаковое текстологическое качество в зависимости от источника и степени проверки. В текущем виде они предлагаются без имен персонажей и сценических ремарок и содержат только основной очищенный текст каждого произведения.'
			]
		},
		ar: {
			subtitle: 'نصوص رقمية من العصر الذهبي الإسباني بالوصول المفتوح',
			paragraphs: [
				'تجمع BITESO وتتيح بالوصول المفتوح مجموعة واسعة من النصوص الرقمية من العصر الذهبي الإسباني. ويستند المورد في جانب كبير منه إلى النسخ الآلي للمطبوعات القديمة والمخطوطات المعدّة لتحليلات إسناد التأليف بالقياس الأسلوبي، وإلى مواد راجعها أو قدّمها أو قابلها متخصصون متعاونون.',
				'ينبغي فهم النصوص المدرجة في BITESO بوصفها نصوص عمل: فهي لا تحل محل الطبعات النقدية، وقد تتضمن أخطاء في النسخ، كما تتفاوت جودتها النصية بحسب المصدر ودرجة المراجعة. وفي حالتها الحالية تُقدَّم من دون أسماء الشخصيات أو الإرشادات المسرحية، وتحتوي فقط على النص الصافي لكل عمل.'
			]
		}
	};

	const helpIntroByLocale: Record<Locale, { title: string; paragraphs: string[]; button: string; projectHeading: string }> = {
		es: {
			title: '¿Cómo te podemos ayudar? ¿Cómo nos puedes ayudar?',
			paragraphs: [
				'Podemos ayudarte a explorar los distintos recursos disponibles para el estudio del teatro y la literatura del Siglo de Oro. En Examen de autorías se pueden consultar los informes estilométricos de las obras incorporadas al corpus, con indicios sobre sus posibles relaciones de autoría. TEXORO permite realizar búsquedas textuales sobre cerca de 3000 obras y más de 38 millones de palabras. BITESO ofrece acceso abierto a textos digitales procedentes, en buena medida, de transcripciones automáticas de impresos y manuscritos. Además, los resúmenes automáticos permiten obtener una primera orientación sobre el argumento y el contenido de las obras, siempre como ayuda inicial y no como sustituto de la lectura o del análisis filológico.',
				'También puedes colaborar con nosotros enviándonos textos del Siglo de Oro que todavía no estén incorporados a nuestros recursos, información bibliográfica, noticias sobre atribuciones, datos sobre testimonios o cualquier material que pueda mejorar el conjunto. Citar nuestros recursos en publicaciones, trabajos académicos o actividades docentes también nos ayuda a difundir el proyecto y a obtener el apoyo necesario para mantenerlo y ampliarlo.'
			],
			button: 'Contacta con nosotros',
			projectHeading: 'ETSO es un proyecto dirigido por:'
		},
		en: {
			title: 'How can we help you? How can you help us?',
			paragraphs: [
				'We can help you explore the resources available for studying Golden Age theatre and literature. Examen de autorías provides stylometric reports on works in the corpus, with indications of possible authorship relations. TEXORO enables textual searches across nearly 3,000 works and more than 38 million words. BITESO offers open access to digital texts, many of them derived from automatic transcriptions of old printed books and manuscripts. Automatic summaries also provide an initial orientation to the plot and content of works, always as a preliminary aid and never as a substitute for reading or philological analysis.',
				'You can also collaborate with us by sending Golden Age texts that are not yet included in our resources, bibliographic information, news about attributions, data on textual witnesses or any material that may improve the collection. Citing our resources in publications, academic work or teaching also helps us disseminate the project and obtain the support needed to maintain and expand it.'
			],
			button: 'Contact us',
			projectHeading: 'ETSO is a project directed by:'
		},
		fr: {
			title: 'Comment pouvons-nous vous aider ? Comment pouvez-vous nous aider ?',
			paragraphs: [
				'Nous pouvons vous aider à explorer les ressources disponibles pour l’étude du théâtre et de la littérature du Siècle d’or. Examen de autorías donne accès aux rapports stylométriques des œuvres du corpus, avec des indices sur leurs possibles relations d’auteur. TEXORO permet d’effectuer des recherches textuelles dans près de 3000 œuvres et plus de 38 millions de mots. BITESO offre un accès ouvert à des textes numériques issus en grande partie de transcriptions automatiques d’imprimés anciens et de manuscrits. Les résumés automatiques fournissent également une première orientation sur l’intrigue et le contenu des œuvres, toujours comme aide préliminaire et non comme substitut à la lecture ou à l’analyse philologique.',
				'Vous pouvez aussi collaborer avec nous en envoyant des textes du Siècle d’or qui ne figurent pas encore dans nos ressources, des informations bibliographiques, des informations sur les attributions, des données sur les témoins textuels ou tout matériau susceptible d’améliorer l’ensemble. Citer nos ressources dans des publications, travaux académiques ou activités d’enseignement nous aide également à diffuser le projet et à obtenir le soutien nécessaire pour le maintenir et l’élargir.'
			],
			button: 'Nous contacter',
			projectHeading: 'ETSO est un projet dirigé par :'
		},
		pt: {
			title: 'Como podemos ajudar? Como você pode nos ajudar?',
			paragraphs: [
				'Podemos ajudar você a explorar os recursos disponíveis para o estudo do teatro e da literatura do Século de Ouro espanhol. Em Examen de autorías, é possível consultar relatórios estilométricos das obras incorporadas ao corpus, com indícios sobre suas possíveis relações de autoria. TEXORO permite realizar pesquisas textuais em cerca de 3000 obras e mais de 38 milhões de palavras. BITESO oferece acesso aberto a textos digitais provenientes, em grande parte, de transcrições automáticas de impressos antigos e manuscritos. Além disso, os resumos automáticos oferecem uma orientação inicial sobre o enredo e o conteúdo das obras, sempre como auxílio preliminar e não como substituto da leitura ou da análise filológica.',
				'Você também pode colaborar conosco enviando textos do Século de Ouro espanhol que ainda não estejam incorporados aos nossos recursos, informações bibliográficas, notícias sobre atribuições, dados sobre testemunhos textuais ou qualquer material que possa melhorar a coleção. Citar nossos recursos em publicações, trabalhos acadêmicos ou atividades docentes também nos ajuda a divulgar o projeto e obter o apoio necessário para mantê-lo e ampliá-lo.'
			],
			button: 'Entrar em contato',
			projectHeading: 'ETSO é um projeto dirigido por:'
		},
		it: {
			title: 'Come possiamo aiutarti? Come puoi aiutarci?',
			paragraphs: [
				'Possiamo aiutarti a esplorare le risorse disponibili per lo studio del teatro e della letteratura del Secolo d’Oro spagnolo. In Examen de autorías si possono consultare i rapporti stilometrici delle opere incluse nel corpus, con indizi sulle loro possibili relazioni d’autore. TEXORO consente ricerche testuali su circa 3000 opere e oltre 38 milioni di parole. BITESO offre accesso aperto a testi digitali provenienti in larga parte da trascrizioni automatiche di antichi testi a stampa e manoscritti. I riassunti automatici offrono inoltre un primo orientamento sulla trama e sul contenuto delle opere, sempre come aiuto preliminare e non come sostituto della lettura o dell’analisi filologica.',
				'Puoi anche collaborare con noi inviando testi del Secolo d’Oro spagnolo non ancora inclusi nelle nostre risorse, informazioni bibliografiche, notizie sulle attribuzioni, dati sui testimoni testuali o qualunque materiale possa migliorare la collezione. Citare le nostre risorse in pubblicazioni, lavori accademici o attività didattiche ci aiuta inoltre a diffondere il progetto e a ottenere il sostegno necessario per mantenerlo e ampliarlo.'
			],
			button: 'Contattaci',
			projectHeading: 'ETSO è un progetto diretto da:'
		},
		de: {
			title: 'Wie können wir Ihnen helfen? Wie können Sie uns helfen?',
			paragraphs: [
				'Wir können Ihnen helfen, die verfügbaren Ressourcen für die Erforschung des Theaters und der Literatur des spanischen Siglo de Oro zu nutzen. In Examen de autorías lassen sich stilometrische Berichte zu den Werken des Korpus einsehen, mit Hinweisen auf mögliche Autorschaftsbeziehungen. TEXORO ermöglicht Textsuchen in rund 3000 Werken und mehr als 38 Millionen Wörtern. BITESO bietet offenen Zugang zu digitalen Texten, die zu einem großen Teil aus automatischen Transkriptionen alter Drucke und Handschriften hervorgegangen sind. Die automatischen Zusammenfassungen bieten außerdem eine erste Orientierung zu Handlung und Inhalt der Werke, stets als vorläufige Hilfe und nicht als Ersatz für Lektüre oder philologische Analyse.',
				'Sie können auch mit uns zusammenarbeiten, indem Sie uns Texte des spanischen Siglo de Oro senden, die noch nicht in unseren Ressourcen enthalten sind, bibliografische Informationen, Hinweise zu Zuschreibungen, Daten zu Textzeugen oder anderes Material, das die Sammlung verbessern kann. Die Zitierung unserer Ressourcen in Publikationen, wissenschaftlichen Arbeiten oder Lehrveranstaltungen hilft uns ebenfalls, das Projekt bekannt zu machen und die nötige Unterstützung für seine Pflege und Erweiterung zu erhalten.'
			],
			button: 'Kontakt aufnehmen',
			projectHeading: 'ETSO ist ein Projekt unter der Leitung von:'
		},
		zh: {
			title: '我们可以怎样帮助您？您可以怎样帮助我们？',
			paragraphs: [
				'我们可以帮助您探索用于研究西班牙黄金时代戏剧和文学的各项资源。Examen de autorías 提供语料库中作品的文体计量报告，并给出可能的作者归属关系线索。TEXORO 可在近 3000 部作品和 3800 多万个词中进行文本检索。BITESO 开放提供数字文本，其中很大一部分来自古代印刷本和手稿的自动转录。自动摘要还可为作品情节和内容提供初步参考，但它们始终只是辅助工具，不能替代阅读或文献学分析。',
				'您也可以向我们提供尚未纳入资源的西班牙黄金时代文本、书目信息、归属研究动态、文本见证资料，或任何有助于改进合集的材料。在出版物、学术研究或教学活动中引用我们的资源，也有助于传播项目并获得维护和扩展所需的支持。'
			],
			button: '联系我们',
			projectHeading: 'ETSO 项目由以下人员主持：'
		},
		ja: {
			title: 'どのようにお手伝いできますか。どのようにご協力いただけますか。',
			paragraphs: [
				'スペイン黄金世紀の演劇と文学を研究するために利用できる各種リソースの活用をお手伝いします。Examen de autorías では、コーパスに含まれる作品の文体計量レポートを参照し、著者帰属に関する可能な関係を確認できます。TEXORO では、約 3000 作品、3800 万語以上を対象にテキスト検索を行えます。BITESO は、主に古い印刷本や写本の自動転写に由来するデジタルテキストをオープンアクセスで提供します。自動要約は作品の筋や内容を把握するための初期的な手がかりを提供しますが、読解や文献学的分析の代替ではありません。',
				'また、まだリソースに含まれていないスペイン黄金世紀のテキスト、書誌情報、帰属に関する情報、本文証言に関するデータ、またはコレクションの改善に役立つ資料をお送りいただくことでもご協力いただけます。出版物、学術研究、教育活動で私たちのリソースを引用することも、プロジェクトの周知と維持・拡充に必要な支援につながります。'
			],
			button: 'お問い合わせ',
			projectHeading: 'ETSO は以下の者が主導するプロジェクトです：'
		},
		ko: {
			title: '어떻게 도와드릴까요? 어떻게 함께할 수 있을까요?',
			paragraphs: [
				'스페인 황금세기 연극과 문학 연구에 사용할 수 있는 여러 리소스를 살펴볼 수 있도록 도와드립니다. Examen de autorías에서는 말뭉치에 포함된 작품의 문체계량 보고서를 확인하고 가능한 저자 귀속 관계에 대한 단서를 볼 수 있습니다. TEXORO는 약 3000편의 작품과 3800만 단어 이상을 대상으로 텍스트 검색을 제공합니다. BITESO는 주로 고인쇄본과 필사본의 자동 전사에서 나온 디지털 텍스트를 오픈 액세스로 제공합니다. 자동 요약은 작품의 줄거리와 내용을 파악하기 위한 예비적 도움을 제공하지만, 읽기나 문헌학적 분석을 대체하지 않습니다.',
				'아직 리소스에 포함되지 않은 스페인 황금세기 텍스트, 서지 정보, 귀속 관련 소식, 텍스트 증언 자료 또는 컬렉션 개선에 도움이 되는 자료를 보내 주셔도 협력할 수 있습니다. 출판물, 학술 연구 또는 교육 활동에서 우리의 리소스를 인용하는 것도 프로젝트를 알리고 유지·확장하는 데 필요한 지원을 얻는 데 도움이 됩니다.'
			],
			button: '문의하기',
			projectHeading: 'ETSO는 다음 연구자가 이끄는 프로젝트입니다:'
		},
		ru: {
			title: 'Как мы можем вам помочь? Как вы можете помочь нам?',
			paragraphs: [
				'Мы можем помочь вам освоить ресурсы для изучения театра и литературы испанского Золотого века. В Examen de autorías можно ознакомиться со стилометрическими отчетами по произведениям корпуса и с признаками возможных авторских связей. TEXORO позволяет выполнять текстовый поиск примерно по 3000 произведениям и более чем 38 миллионам слов. BITESO предоставляет открытый доступ к цифровым текстам, многие из которых получены из автоматических транскрипций старопечатных изданий и рукописей. Автоматические аннотации дают первое представление о сюжете и содержании произведений, но служат только предварительной помощью и не заменяют чтение или филологический анализ.',
				'Вы также можете сотрудничать с нами, присылая тексты испанского Золотого века, еще не включенные в наши ресурсы, библиографическую информацию, сведения об атрибуциях, данные о текстовых свидетелях или любые материалы, способные улучшить коллекцию. Ссылки на наши ресурсы в публикациях, научных работах или преподавании также помогают распространять проект и получать поддержку, необходимую для его поддержания и расширения.'
			],
			button: 'Связаться с нами',
			projectHeading: 'ETSO — проект под руководством:'
		},
		ar: {
			title: 'كيف يمكننا مساعدتك؟ وكيف يمكنك مساعدتنا؟',
			paragraphs: [
				'يمكننا مساعدتك على استكشاف الموارد المتاحة لدراسة مسرح العصر الذهبي الإسباني وأدبه. في Examen de autorías يمكن الاطلاع على التقارير الأسلوبية للأعمال المدرجة في corpus، مع مؤشرات على علاقات إسناد التأليف المحتملة. يتيح TEXORO إجراء بحث نصي في نحو 3000 عمل وأكثر من 38 مليون كلمة. وتوفّر BITESO وصولًا مفتوحًا إلى نصوص رقمية ناتجة إلى حد كبير من النسخ الآلي للمطبوعات القديمة والمخطوطات. كما تتيح الملخصات الآلية توجيهًا أوليًا حول حبكة الأعمال ومحتواها، بوصفها مساعدة تمهيدية لا بديلًا عن القراءة أو التحليل الفيلولوجي.',
				'يمكنك أيضًا التعاون معنا بإرسال نصوص من العصر الذهبي الإسباني لم تُدرج بعد في مواردنا، أو معلومات ببليوغرافية، أو أخبار عن الإسنادات، أو بيانات عن الشواهد النصية، أو أي مادة يمكن أن تحسّن المجموعة. كما أن الاستشهاد بمواردنا في المنشورات والأعمال الأكاديمية والأنشطة التعليمية يساعدنا على نشر المشروع والحصول على الدعم اللازم لصيانته وتوسيعه.'
			],
			button: 'تواصل معنا',
			projectHeading: 'ETSO مشروع بإدارة:'
		}
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
			<div class="grid gap-4 rounded-card bg-brand-blue px-5 py-6 text-white shadow-soft md:px-7 md:py-7 lg:px-8 lg:py-8" data-i18n-skip>
				<p class="m-0 font-ui text-[0.78rem] font-semibold uppercase tracking-[0.05em] text-white/85">
					{homeDigitalHumanitiesByLocale[data.locale].eyebrow}
				</p>
				<p class="m-0 font-ui text-[1.18rem] font-semibold leading-[1.35]">
					{homeDigitalHumanitiesByLocale[data.locale].title}
				</p>
				{#each homeDigitalHumanitiesByLocale[data.locale].paragraphs as paragraph}
					<p class="m-0 text-[1.01rem] leading-[1.7] text-white/95" dir={data.locale === 'ar' ? 'rtl' : undefined}>{@html paragraph}</p>
				{/each}
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
				<p class="mt-3 font-ui text-[clamp(1rem,1.6vw,1.28rem)] font-medium" data-i18n-skip>
					{texoroIntroByLocale[data.locale].subtitle}
				</p>

				<div class="mt-8 grid gap-5 text-left font-reading text-[1.03rem] leading-[1.72] text-white/95 md:text-center" data-i18n-skip>
					{#each texoroIntroByLocale[data.locale].paragraphs as paragraph}
						<p class="m-0" dir={data.locale === 'ar' ? 'rtl' : undefined}>{paragraph}</p>
					{/each}
				</div>

			<div class="mt-9">
				<a
						href={localizePath('/texoro', data.locale)}
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
						{bitesoIntroByLocale[data.locale].subtitle}
					</p>
				</div>

				<div class="grid max-w-6xl gap-4 text-[1.03rem] leading-[1.72] text-text-soft" data-i18n-skip>
					{#each bitesoIntroByLocale[data.locale].paragraphs as paragraph}
						<p class="m-0" dir={data.locale === 'ar' ? 'rtl' : undefined}>{paragraph}</p>
					{/each}
				</div>

			<div class="pt-1">
				<a
						href={localizePath('/biteso', data.locale)}
					class="inline-flex items-center rounded-card border border-border bg-white/85 px-6 py-3 font-ui text-[0.95rem] font-semibold tracking-[0.03em] text-text-soft no-underline transition hover:bg-surface-soft hover:text-text-main hover:no-underline"
				>
					BITESO
				</a>
			</div>
		</div>
	</div>
</section>

<section class="mx-auto mt-8 w-full max-w-7xl p-5 md:p-6 lg:p-8">
		<div class="grid gap-5 text-left text-[1.03rem] leading-[1.72] text-text-soft md:text-center" data-i18n-skip>
			<h2 class="m-0 font-ui text-[clamp(1.6rem,3.2vw,2.5rem)] leading-[1.15] font-bold text-brand-blue-dark">
				{helpIntroByLocale[data.locale].title}
			</h2>
			{#each helpIntroByLocale[data.locale].paragraphs as paragraph}
				<p class="m-0" dir={data.locale === 'ar' ? 'rtl' : undefined}>{paragraph}</p>
			{/each}
			<div class="pt-1">
				<a
					href={localizePath('/contacto', data.locale)}
				class="inline-flex items-center rounded-card border border-brand-blue/25 bg-brand-blue px-5 py-2.5 font-ui text-[0.92rem] font-semibold text-white no-underline transition hover:bg-brand-blue-dark hover:no-underline"
			>
					{helpIntroByLocale[data.locale].button}
				</a>
			</div>
	</div>
</section>

<section class="mx-auto mt-8 w-full max-w-7xl p-5 md:p-6 lg:p-8">
		<div class="grid gap-4">
			<div class="grid gap-1 text-left md:text-center">
				<h2 class="m-0 font-ui text-[clamp(1.4rem,2.6vw,2rem)] font-semibold leading-[1.2] text-brand-blue-dark">
						{helpIntroByLocale[data.locale].projectHeading}
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
