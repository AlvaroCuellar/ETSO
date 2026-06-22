<script lang="ts">
	import Breadcrumbs from '$lib/components/ui/Breadcrumbs.svelte';
	import SeoHead from '$lib/components/seo/SeoHead.svelte';
	import { localizePath } from '$lib/i18n';
	import transcripcionAutomatica1 from '$lib/assets/transcripcion/transcripcion-automatica-1.jpg';
	import transcripcionAutomatica2 from '$lib/assets/transcripcion/transcripcion-automatica-2.jpg';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const TRANSCRIPCIONES_SEO_DESCRIPTION =
		'Modelos y procesos de transcripción automática aplicados a impresos y manuscritos teatrales del Siglo de Oro.';

	const pageTextByLocale = {
		es: {
			eyebrow: 'Procesamiento textual',
			title: 'Transcripciones automáticas',
			subtitle: 'Procesos de transcripción automática.',
			intro:
				'Recientemente hemos desarrollado procesos de transcripción automática gracias a la herramienta Transkribus. A través de estos procesos hemos podido transcribir y modernizar ortográficamente unos 1000 impresos y 350 manuscritos de teatro del Siglo de Oro, que forman ahora parte de CETSO y TEXORO.',
			publicModels: 'Los tres modelos empleados son públicos y cualquiera puede emplearlos a través de la herramienta Transkribus.',
			accuracy:
				'Estos modelos nos permiten transcribir impresos y manuscritos teatrales con un alto grado de precisión: aproximadamente un 99 % de acierto en impresos y un 90 % en manuscritos. Nuestras transcripciones, además, pueden modernizar automáticamente la ortografía a las normas actuales y detectar ciertos elementos, como cursivas.',
			contact:
				'Si te interesa saber más sobre la herramienta, cómo aplicar nuestros modelos de transcripción a tus documentos, o si necesitas una transcripción concreta de un impreso o manuscrito sobre la que trabajar, por favor, contacta con Álvaro Cuéllar.',
			milestones: [
				{ value: '1.000', label: 'impresos transcritos y modernizados ortográficamente' },
				{ value: '350', label: 'manuscritos incorporados a los flujos de trabajo del proyecto' },
				{ value: '99 %', label: 'de acierto aproximado en impresos' },
				{ value: '90 %', label: 'de acierto aproximado en manuscritos' }
			],
			models: [
				{ title: 'Spanish Golden Age Prints 1.0', description: 'Modelo entrenado para la transcripción automática de impresos teatrales del Siglo de Oro.' },
				{ title: 'Spanish Golden Age Prints (Spelling Modernization) 1.0', description: 'Versión orientada a la modernización ortográfica automática de impresos ya transcritos.' },
				{ title: 'Spanish Golden Age Manuscripts (Spelling Modernization) 1.0', description: 'Modelo centrado en manuscritos teatrales, con modernización ortográfica y detección de rasgos relevantes.' }
			]
		},
		en: {
			eyebrow: 'Text processing',
			title: 'Automatic transcriptions',
			subtitle: 'Automatic transcription workflows.',
			intro:
				'We have recently developed automatic transcription workflows using Transkribus. These workflows have allowed us to automatically transcribe and modernize the spelling of around 1,000 printed books and 350 manuscripts of Golden Age theatre, which are now part of CETSO and TEXORO.',
			publicModels: 'The three models used are public, and anyone can use them through Transkribus.',
			accuracy:
				'These models allow us to transcribe theatrical printed books and manuscripts with a high degree of accuracy: approximately 99% accuracy for printed books and 90% for manuscripts. Our transcriptions can also automatically modernize spelling according to current standards and detect certain elements, such as italics.',
			contact:
				'If you would like to learn more about the tool, apply our transcription models to your documents, or request a specific transcription of a printed book or manuscript for research, please contact Álvaro Cuéllar.',
			milestones: [
				{ value: '1,000', label: 'printed books automatically transcribed and spelling-modernized' },
				{ value: '350', label: 'manuscripts incorporated into the project workflows' },
				{ value: '99%', label: 'approximate accuracy for printed books' },
				{ value: '90%', label: 'approximate accuracy for manuscripts' }
			],
			models: [
				{ title: 'Spanish Golden Age Prints 1.0', description: 'Model trained for automatic transcription of Golden Age theatrical printed books.' },
				{ title: 'Spanish Golden Age Prints (Spelling Modernization) 1.0', description: 'Version designed for automatic spelling modernization of already transcribed printed books.' },
				{ title: 'Spanish Golden Age Manuscripts (Spelling Modernization) 1.0', description: 'Model focused on theatrical manuscripts, with spelling modernization and detection of relevant features.' }
			]
		},
		fr: {
			eyebrow: 'Traitement textuel',
			title: 'Transcriptions automatiques',
			subtitle: 'Processus de transcription automatique.',
			intro:
				'Nous avons récemment développé des processus de transcription automatique grâce à Transkribus. Ces processus nous ont permis de transcrire automatiquement et de moderniser l’orthographe d’environ 1000 imprimés et 350 manuscrits de théâtre du Siècle d’or, qui font désormais partie de CETSO et de TEXORO.',
			publicModels: 'Les trois modèles utilisés sont publics et peuvent être employés par toute personne via Transkribus.',
			accuracy:
				'Ces modèles nous permettent de transcrire des imprimés et manuscrits théâtraux avec un haut degré de précision : environ 99 % pour les imprimés et 90 % pour les manuscrits. Nos transcriptions peuvent en outre moderniser automatiquement l’orthographe selon les normes actuelles et détecter certains éléments, comme les italiques.',
			contact:
				'Si vous souhaitez en savoir plus sur l’outil, appliquer nos modèles de transcription à vos documents ou obtenir la transcription d’un imprimé ou manuscrit précis pour votre recherche, veuillez contacter Álvaro Cuéllar.',
			milestones: [
				{ value: '1 000', label: 'imprimés transcrits et modernisés orthographiquement' },
				{ value: '350', label: 'manuscrits intégrés aux flux de travail du projet' },
				{ value: '99 %', label: 'de précision approximative pour les imprimés' },
				{ value: '90 %', label: 'de précision approximative pour les manuscrits' }
			],
			models: [
				{ title: 'Spanish Golden Age Prints 1.0', description: 'Modèle entraîné pour la transcription automatique d’imprimés théâtraux du Siècle d’or.' },
				{ title: 'Spanish Golden Age Prints (Spelling Modernization) 1.0', description: 'Version orientée vers la modernisation orthographique automatique d’imprimés déjà transcrits.' },
				{ title: 'Spanish Golden Age Manuscripts (Spelling Modernization) 1.0', description: 'Modèle centré sur les manuscrits théâtraux, avec modernisation orthographique et détection de traits pertinents.' }
			]
		},
		pt: {
			eyebrow: 'Processamento textual',
			title: 'Transcrições automáticas',
			subtitle: 'Fluxos de transcrição automática.',
			intro:
				'Recentemente desenvolvemos fluxos de transcrição automática com o Transkribus. Esses processos nos permitiram transcrever automaticamente e modernizar a ortografia de cerca de 1000 impressos e 350 manuscritos de teatro do Século de Ouro espanhol, que agora fazem parte do CETSO e do TEXORO.',
			publicModels: 'Os três modelos utilizados são públicos e podem ser usados por qualquer pessoa por meio do Transkribus.',
			accuracy:
				'Esses modelos nos permitem transcrever impressos e manuscritos teatrais com alto grau de precisão: aproximadamente 99% de acerto em impressos e 90% em manuscritos. Além disso, nossas transcrições podem modernizar automaticamente a ortografia segundo as normas atuais e detectar certos elementos, como itálicos.',
			contact:
				'Se você quiser saber mais sobre a ferramenta, aplicar nossos modelos de transcrição aos seus documentos ou solicitar a transcrição específica de um impresso ou manuscrito para pesquisa, entre em contato com Álvaro Cuéllar.',
			milestones: [
				{ value: '1.000', label: 'impressos transcritos e modernizados ortograficamente' },
				{ value: '350', label: 'manuscritos incorporados aos fluxos de trabalho do projeto' },
				{ value: '99%', label: 'de acerto aproximado em impressos' },
				{ value: '90%', label: 'de acerto aproximado em manuscritos' }
			],
			models: [
				{ title: 'Spanish Golden Age Prints 1.0', description: 'Modelo treinado para a transcrição automática de impressos teatrais do Século de Ouro espanhol.' },
				{ title: 'Spanish Golden Age Prints (Spelling Modernization) 1.0', description: 'Versão voltada à modernização ortográfica automática de impressos já transcritos.' },
				{ title: 'Spanish Golden Age Manuscripts (Spelling Modernization) 1.0', description: 'Modelo centrado em manuscritos teatrais, com modernização ortográfica e detecção de traços relevantes.' }
			]
		},
		it: {
			eyebrow: 'Trattamento testuale',
			title: 'Trascrizioni automatiche',
			subtitle: 'Processi di trascrizione automatica.',
			intro:
				'Di recente abbiamo sviluppato processi di trascrizione automatica grazie a Transkribus. Questi processi ci hanno permesso di trascrivere automaticamente e modernizzare l’ortografia di circa 1000 testi a stampa e 350 manoscritti teatrali del Secolo d’Oro spagnolo, che ora fanno parte di CETSO e TEXORO.',
			publicModels: 'I tre modelli utilizzati sono pubblici e chiunque può impiegarli tramite Transkribus.',
			accuracy:
				'Questi modelli ci permettono di trascrivere testi teatrali a stampa e manoscritti con un alto grado di precisione: circa il 99% per i testi a stampa e il 90% per i manoscritti. Le nostre trascrizioni possono inoltre modernizzare automaticamente l’ortografia secondo le norme attuali e rilevare alcuni elementi, come il corsivo.',
			contact:
				'Se vuoi saperne di più sullo strumento, applicare i nostri modelli di trascrizione ai tuoi documenti o richiedere la trascrizione specifica di un testo a stampa o manoscritto per la ricerca, contatta Álvaro Cuéllar.',
			milestones: [
				{ value: '1.000', label: 'testi a stampa trascritti e modernizzati ortograficamente' },
				{ value: '350', label: 'manoscritti integrati nei flussi di lavoro del progetto' },
				{ value: '99%', label: 'precisione approssimativa per i testi a stampa' },
				{ value: '90%', label: 'precisione approssimativa per i manoscritti' }
			],
			models: [
				{ title: 'Spanish Golden Age Prints 1.0', description: 'Modello addestrato per la trascrizione automatica di testi teatrali a stampa del Secolo d’Oro spagnolo.' },
				{ title: 'Spanish Golden Age Prints (Spelling Modernization) 1.0', description: 'Versione orientata alla modernizzazione ortografica automatica di testi a stampa già trascritti.' },
				{ title: 'Spanish Golden Age Manuscripts (Spelling Modernization) 1.0', description: 'Modello centrato sui manoscritti teatrali, con modernizzazione ortografica e rilevamento di tratti rilevanti.' }
			]
		},
		de: {
			eyebrow: 'Textverarbeitung',
			title: 'Automatische Transkriptionen',
			subtitle: 'Workflows für automatische Transkription.',
			intro:
				'Wir haben kürzlich mithilfe von Transkribus Workflows für automatische Transkription entwickelt. Damit konnten wir rund 1000 Drucke und 350 Handschriften des Theaters des spanischen Siglo de Oro automatisch transkribieren und orthografisch modernisieren; sie sind nun Teil von CETSO und TEXORO.',
			publicModels: 'Die drei verwendeten Modelle sind öffentlich und können über Transkribus von allen genutzt werden.',
			accuracy:
				'Diese Modelle ermöglichen es uns, Theaterdrucke und -handschriften mit hoher Genauigkeit zu transkribieren: etwa 99 % bei Drucken und 90 % bei Handschriften. Unsere Transkriptionen können außerdem die Rechtschreibung automatisch an heutige Normen anpassen und bestimmte Elemente wie Kursivschrift erkennen.',
			contact:
				'Wenn Sie mehr über das Werkzeug erfahren, unsere Transkriptionsmodelle auf Ihre Dokumente anwenden oder eine konkrete Transkription eines Drucks oder einer Handschrift für Ihre Forschung benötigen, wenden Sie sich bitte an Álvaro Cuéllar.',
			milestones: [
				{ value: '1.000', label: 'Drucke automatisch transkribiert und orthografisch modernisiert' },
				{ value: '350', label: 'Handschriften in die Projektworkflows aufgenommen' },
				{ value: '99 %', label: 'ungefähre Genauigkeit bei Drucken' },
				{ value: '90 %', label: 'ungefähre Genauigkeit bei Handschriften' }
			],
			models: [
				{ title: 'Spanish Golden Age Prints 1.0', description: 'Modell für die automatische Transkription von Theaterdrucken des spanischen Siglo de Oro.' },
				{ title: 'Spanish Golden Age Prints (Spelling Modernization) 1.0', description: 'Version für die automatische orthografische Modernisierung bereits transkribierter Drucke.' },
				{ title: 'Spanish Golden Age Manuscripts (Spelling Modernization) 1.0', description: 'Modell für Theaterhandschriften mit orthografischer Modernisierung und Erkennung relevanter Merkmale.' }
			]
		},
		zh: {
			eyebrow: '文本处理',
			title: '自动转录',
			subtitle: '自动转录流程。',
			intro:
				'我们最近借助 Transkribus 开发了自动转录流程。这些流程使我们能够自动转录约 1000 部西班牙黄金时代戏剧印刷本和 350 份手稿，并进行拼写现代化处理；这些文本现已成为 CETSO 和 TEXORO 的一部分。',
			publicModels: '所使用的三个模型均为公开模型，任何人都可以通过 Transkribus 使用。',
			accuracy:
				'这些模型使我们能够以较高准确率转录戏剧印刷本和手稿：印刷本约为 99%，手稿约为 90%。此外，我们的转录还可以按照现代规范自动进行拼写现代化，并检测某些元素，如斜体。',
			contact:
				'如果您想进一步了解该工具、将我们的转录模型应用于您的文档，或需要为研究获取某部印刷本或手稿的具体转录，请联系 Álvaro Cuéllar。',
			milestones: [
				{ value: '1,000', label: '部印刷本已自动转录并完成拼写现代化' },
				{ value: '350', label: '份手稿已纳入项目工作流程' },
				{ value: '99%', label: '印刷本的近似准确率' },
				{ value: '90%', label: '手稿的近似准确率' }
			],
			models: [
				{ title: 'Spanish Golden Age Prints 1.0', description: '用于西班牙黄金时代戏剧印刷本自动转录的模型。' },
				{ title: 'Spanish Golden Age Prints (Spelling Modernization) 1.0', description: '用于已转录印刷本自动拼写现代化的版本。' },
				{ title: 'Spanish Golden Age Manuscripts (Spelling Modernization) 1.0', description: '面向戏剧手稿的模型，包含拼写现代化和相关特征检测。' }
			]
		},
		ja: {
			eyebrow: 'テキスト処理',
			title: '自動転写',
			subtitle: '自動転写のワークフロー。',
			intro:
				'私たちは最近、Transkribus を用いて自動転写のワークフローを開発しました。これにより、スペイン黄金世紀演劇の印刷本約 1000 点と写本 350 点を自動転写し、綴字を現代化することができました。これらは現在 CETSO と TEXORO の一部になっています。',
			publicModels: '使用した 3 つのモデルは公開されており、誰でも Transkribus を通じて利用できます。',
			accuracy:
				'これらのモデルにより、演劇の印刷本と写本を高精度で転写できます。精度は印刷本で約 99%、写本で約 90% です。さらに、私たちの転写では現行規範に合わせた綴字の自動現代化や、イタリックなど特定要素の検出も可能です。',
			contact:
				'このツールの詳細、ご自身の資料への転写モデルの適用、または研究対象となる印刷本・写本の具体的な転写について知りたい場合は、Álvaro Cuéllar までお問い合わせください。',
			milestones: [
				{ value: '1,000', label: '件の印刷本を自動転写し綴字を現代化' },
				{ value: '350', label: '件の写本をプロジェクトのワークフローに組み込み' },
				{ value: '99%', label: '印刷本でのおおよその精度' },
				{ value: '90%', label: '写本でのおおよその精度' }
			],
			models: [
				{ title: 'Spanish Golden Age Prints 1.0', description: 'スペイン黄金世紀の演劇印刷本の自動転写用に訓練されたモデル。' },
				{ title: 'Spanish Golden Age Prints (Spelling Modernization) 1.0', description: '転写済み印刷本の綴字を自動現代化するためのバージョン。' },
				{ title: 'Spanish Golden Age Manuscripts (Spelling Modernization) 1.0', description: '演劇写本を対象とし、綴字現代化と関連特徴の検出を行うモデル。' }
			]
		},
		ko: {
			eyebrow: '텍스트 처리',
			title: '자동 전사',
			subtitle: '자동 전사 워크플로.',
			intro:
				'최근 우리는 Transkribus를 사용해 자동 전사 워크플로를 개발했습니다. 이 과정을 통해 스페인 황금세기 연극의 인쇄본 약 1000점과 필사본 350점을 자동 전사하고 철자를 현대화할 수 있었으며, 이 자료들은 현재 CETSO와 TEXORO의 일부가 되었습니다.',
			publicModels: '사용된 세 모델은 모두 공개되어 있으며 누구나 Transkribus를 통해 사용할 수 있습니다.',
			accuracy:
				'이 모델들은 연극 인쇄본과 필사본을 높은 정확도로 전사할 수 있게 해 줍니다. 인쇄본은 약 99%, 필사본은 약 90%의 정확도를 보입니다. 또한 우리의 전사는 현재 표기 규범에 맞춘 철자 현대화와 이탤릭체 같은 특정 요소의 탐지도 자동으로 수행할 수 있습니다.',
			contact:
				'도구에 대해 더 알고 싶거나, 우리의 전사 모델을 자신의 문서에 적용하고 싶거나, 연구할 인쇄본 또는 필사본의 구체적인 전사가 필요하다면 Álvaro Cuéllar에게 연락해 주세요.',
			milestones: [
				{ value: '1,000', label: '건의 인쇄본 자동 전사 및 철자 현대화' },
				{ value: '350', label: '건의 필사본을 프로젝트 워크플로에 포함' },
				{ value: '99%', label: '인쇄본의 대략적 정확도' },
				{ value: '90%', label: '필사본의 대략적 정확도' }
			],
			models: [
				{ title: 'Spanish Golden Age Prints 1.0', description: '스페인 황금세기 연극 인쇄본의 자동 전사를 위해 학습된 모델.' },
				{ title: 'Spanish Golden Age Prints (Spelling Modernization) 1.0', description: '이미 전사된 인쇄본의 철자 현대화를 자동으로 수행하기 위한 버전.' },
				{ title: 'Spanish Golden Age Manuscripts (Spelling Modernization) 1.0', description: '연극 필사본을 중심으로 철자 현대화와 관련 특징 탐지를 수행하는 모델.' }
			]
		},
		ru: {
			eyebrow: 'Обработка текста',
			title: 'Автоматические транскрипции',
			subtitle: 'Процессы автоматической транскрипции.',
			intro:
				'Недавно мы разработали процессы автоматической транскрипции с помощью Transkribus. Они позволили нам автоматически транскрибировать и орфографически модернизировать около 1000 печатных изданий и 350 рукописей театра испанского Золотого века, которые теперь входят в CETSO и TEXORO.',
			publicModels: 'Три используемые модели являются открытыми, и любой может применять их через Transkribus.',
			accuracy:
				'Эти модели позволяют транскрибировать театральные печатные издания и рукописи с высокой точностью: около 99 % для печатных изданий и 90 % для рукописей. Наши транскрипции также могут автоматически модернизировать орфографию по современным нормам и обнаруживать некоторые элементы, например курсив.',
			contact:
				'Если вы хотите узнать больше об инструменте, применить наши модели транскрипции к своим документам или получить конкретную транскрипцию печатного издания или рукописи для исследования, пожалуйста, свяжитесь с Álvaro Cuéllar.',
			milestones: [
				{ value: '1 000', label: 'печатных изданий автоматически транскрибировано и орфографически модернизировано' },
				{ value: '350', label: 'рукописей включено в рабочие процессы проекта' },
				{ value: '99 %', label: 'приблизительная точность для печатных изданий' },
				{ value: '90 %', label: 'приблизительная точность для рукописей' }
			],
			models: [
				{ title: 'Spanish Golden Age Prints 1.0', description: 'Модель, обученная для автоматической транскрипции театральных печатных изданий испанского Золотого века.' },
				{ title: 'Spanish Golden Age Prints (Spelling Modernization) 1.0', description: 'Версия для автоматической орфографической модернизации уже транскрибированных печатных изданий.' },
				{ title: 'Spanish Golden Age Manuscripts (Spelling Modernization) 1.0', description: 'Модель для театральных рукописей с орфографической модернизацией и выявлением релевантных признаков.' }
			]
		},
		ar: {
			eyebrow: 'معالجة النصوص',
			title: 'النسخ الآلي',
			subtitle: 'سير عمل للنسخ الآلي.',
			intro:
				'طوّرنا مؤخرًا سير عمل للنسخ الآلي باستخدام Transkribus. وقد أتاحت لنا هذه العمليات نسخ نحو 1000 مطبوعة و350 مخطوطة من مسرح العصر الذهبي الإسباني آليًا وتحديث إملائها، وهي الآن جزء من CETSO وTEXORO.',
			publicModels: 'النماذج الثلاثة المستخدمة عامة، ويمكن لأي شخص استخدامها عبر Transkribus.',
			accuracy:
				'تتيح لنا هذه النماذج نسخ المطبوعات والمخطوطات المسرحية بدرجة عالية من الدقة: نحو 99% في المطبوعات و90% في المخطوطات. كما يمكن لنسخنا أن تحدّث الإملاء آليًا وفق المعايير الحالية وأن تكشف بعض العناصر، مثل الخط المائل.',
			contact:
				'إذا كنت ترغب في معرفة المزيد عن الأداة، أو تطبيق نماذج النسخ لدينا على وثائقك، أو الحصول على نسخ محدد لمطبوعة أو مخطوطة لأغراض البحث، يرجى التواصل مع Álvaro Cuéllar.',
			milestones: [
				{ value: '1.000', label: 'مطبوعة نُسخت آليًا وحُدّث إملاؤها' },
				{ value: '350', label: 'مخطوطة أُدرجت في سير عمل المشروع' },
				{ value: '99%', label: 'دقة تقريبية في المطبوعات' },
				{ value: '90%', label: 'دقة تقريبية في المخطوطات' }
			],
			models: [
				{ title: 'Spanish Golden Age Prints 1.0', description: 'نموذج دُرّب للنسخ الآلي للمطبوعات المسرحية من العصر الذهبي الإسباني.' },
				{ title: 'Spanish Golden Age Prints (Spelling Modernization) 1.0', description: 'نسخة موجهة إلى التحديث الإملائي الآلي للمطبوعات المنسوخة سابقًا.' },
				{ title: 'Spanish Golden Age Manuscripts (Spelling Modernization) 1.0', description: 'نموذج يركز على المخطوطات المسرحية، مع تحديث إملائي وكشف للسمات ذات الصلة.' }
			]
		}
	} as const;
	const pageText = $derived(pageTextByLocale[data.locale] ?? pageTextByLocale.es);
	const htrLlmSectionByLocale = {
		es: {
			eyebrow: 'Nuevo flujo de trabajo',
			title: 'HTR + LLM: transcripciones revisadas página a página',
			paragraphs: [
				'Además de los modelos generales de HTR, estamos desarrollando un nuevo proceso de trabajo para manuscritos teatrales especialmente complejos. Primero obtenemos una lectura automática inicial y después la contrastamos página a página con ayuda de modelos lingüísticos y lectura visual directa del facsímil.',
				'El objetivo es producir textos más útiles para la lectura y la investigación: se ordenan por jornadas, se numeran de forma sencilla por páginas, se conservan las dudas cuando la lectura no es segura y se preparan en formato TEI para su consulta en BITESO.',
				'Este procedimiento no sustituye una edición crítica, pero permite convertir manuscritos difíciles en textos digitales navegables, revisables y enlazados con sus imágenes.'
			],
			worksTitle: 'Primeras obras incorporadas con este procedimiento'
		},
		en: {
			eyebrow: 'New workflow',
			title: 'HTR + LLM: page-by-page reviewed transcriptions',
			paragraphs: [
				'Alongside our general HTR models, we are developing a new workflow for complex theatrical manuscripts. An initial automatic reading is checked page by page with language models and direct visual inspection of the facsimile.',
				'The resulting texts are organized by acts, numbered with simple sequential pages, preserve doubts when a reading is uncertain, and are prepared in TEI format for consultation in BITESO.',
				'This process does not replace a critical edition, but it helps turn difficult manuscripts into navigable, reviewable digital texts linked to their images.'
			],
			worksTitle: 'First works produced with this workflow'
		},
		fr: {
			eyebrow: 'Nouveau flux de travail',
			title: 'HTR + LLM : transcriptions relues page par page',
			paragraphs: [
				'En plus de nos modèles généraux de HTR, nous développons un nouveau processus pour les manuscrits théâtraux particulièrement complexes. Nous obtenons d’abord une lecture automatique initiale, puis nous la confrontons page par page à des modèles linguistiques et à une lecture visuelle directe du fac-similé.',
				'L’objectif est de produire des textes plus utiles pour la lecture et la recherche : ils sont organisés par journées, numérotés simplement par pages, conservent les doutes lorsque la lecture n’est pas certaine et sont préparés en TEI pour BITESO.',
				'Ce procédé ne remplace pas une édition critique, mais il permet de transformer des manuscrits difficiles en textes numériques navigables, révisables et liés à leurs images.'
			],
			worksTitle: 'Premières œuvres intégrées avec ce procédé'
		},
		pt: {
			eyebrow: 'Novo fluxo de trabalho',
			title: 'HTR + LLM: transcrições revistas página a página',
			paragraphs: [
				'Além dos modelos gerais de HTR, estamos desenvolvendo um novo processo para manuscritos teatrais especialmente complexos. Primeiro obtemos uma leitura automática inicial e depois a confrontamos página a página com modelos linguísticos e leitura visual direta do fac-símile.',
				'O objetivo é produzir textos mais úteis para a leitura e a pesquisa: eles são organizados por jornadas, numerados de modo simples por páginas, mantêm as dúvidas quando a leitura não é segura e são preparados em TEI para consulta no BITESO.',
				'Esse procedimento não substitui uma edição crítica, mas permite transformar manuscritos difíceis em textos digitais navegáveis, revisáveis e vinculados às suas imagens.'
			],
			worksTitle: 'Primeiras obras incorporadas com esse procedimento'
		},
		it: {
			eyebrow: 'Nuovo flusso di lavoro',
			title: 'HTR + LLM: trascrizioni riviste pagina per pagina',
			paragraphs: [
				'Oltre ai modelli generali di HTR, stiamo sviluppando un nuovo processo per manoscritti teatrali particolarmente complessi. Prima otteniamo una lettura automatica iniziale e poi la confrontiamo pagina per pagina con modelli linguistici e con la lettura visiva diretta del facsimile.',
				'L’obiettivo è produrre testi più utili per la lettura e la ricerca: sono organizzati per giornate, numerati in modo semplice per pagine, conservano i dubbi quando la lettura non è sicura e sono preparati in formato TEI per BITESO.',
				'Questo procedimento non sostituisce un’edizione critica, ma permette di trasformare manoscritti difficili in testi digitali navigabili, rivedibili e collegati alle loro immagini.'
			],
			worksTitle: 'Prime opere incorporate con questo procedimento'
		},
		de: {
			eyebrow: 'Neuer Workflow',
			title: 'HTR + LLM: seitenweise geprüfte Transkriptionen',
			paragraphs: [
				'Neben unseren allgemeinen HTR-Modellen entwickeln wir einen neuen Arbeitsprozess für besonders komplexe Theaterhandschriften. Zunächst erstellen wir eine automatische Erstlesung und vergleichen sie anschließend Seite für Seite mit Sprachmodellen und direkter visueller Prüfung des Faksimiles.',
				'Ziel ist es, Texte zu erstellen, die für Lektüre und Forschung nützlicher sind: Sie werden nach Akten geordnet, einfach nach Seiten nummeriert, behalten unsichere Lesarten sichtbar bei und werden im TEI-Format für BITESO vorbereitet.',
				'Dieses Verfahren ersetzt keine kritische Edition, macht schwierige Handschriften aber zu navigierbaren, überprüfbaren digitalen Texten, die mit ihren Bildern verknüpft sind.'
			],
			worksTitle: 'Erste Werke, die mit diesem Verfahren aufgenommen wurden'
		},
		zh: {
			eyebrow: '新的工作流程',
			title: 'HTR + LLM：逐页校阅的转录',
			paragraphs: [
				'除了通用的 HTR 模型外，我们正在为特别复杂的戏剧手稿开发一种新的工作流程。我们先获得初步的自动识读结果，再借助语言模型和对传真图像的直接目视检查逐页核对。',
				'目标是生成更适合阅读和研究的文本：按幕次组织，使用简单的连续页码，在读法不确定时保留疑问，并以 TEI 格式准备，供 BITESO 查阅。',
				'这一过程并不取代校勘本，但能把难以处理的手稿转化为可浏览、可复核并与图像相连的数字文本。'
			],
			worksTitle: '首批采用这一流程收入的作品'
		},
		ja: {
			eyebrow: '新しいワークフロー',
			title: 'HTR + LLM：ページごとに確認した転写',
			paragraphs: [
				'一般的な HTR モデルに加えて、特に複雑な演劇写本のための新しい作業プロセスを開発しています。まず自動読み取りによる初期転写を作成し、その後、言語モデルとファクシミリ画像の直接的な目視確認によってページごとに照合します。',
				'目的は、読解と研究により役立つテキストを作ることです。作品は幕ごとに整理し、単純な連続ページ番号を付け、不確かな読みは疑問として残し、BITESO で閲覧できるよう TEI 形式で整えます。',
				'この手順は校訂版に代わるものではありませんが、扱いにくい写本を、閲覧・確認が可能で画像と結びついたデジタルテキストへ変換します。'
			],
			worksTitle: 'この手順で最初に組み込まれた作品'
		},
		ko: {
			eyebrow: '새 작업 흐름',
			title: 'HTR + LLM: 페이지별 검토 전사',
			paragraphs: [
				'일반 HTR 모델과 함께, 특히 복잡한 연극 필사본을 위한 새로운 작업 절차를 개발하고 있습니다. 먼저 자동 판독으로 초기 전사를 얻고, 이후 언어 모델과 팩시밀리 이미지의 직접 시각 검토를 통해 페이지별로 대조합니다.',
				'목표는 읽기와 연구에 더 유용한 텍스트를 만드는 것입니다. 작품은 막별로 정리하고, 단순한 연속 페이지 번호를 부여하며, 판독이 불확실한 부분은 의문으로 남기고, BITESO에서 볼 수 있도록 TEI 형식으로 준비합니다.',
				'이 절차는 비평판을 대체하지 않지만, 어려운 필사본을 탐색 가능하고 검토 가능한 디지털 텍스트로 만들며 이미지와 연결해 줍니다.'
			],
			worksTitle: '이 절차로 처음 수록된 작품'
		},
		ru: {
			eyebrow: 'Новый рабочий процесс',
			title: 'HTR + LLM: постранично проверенные транскрипции',
			paragraphs: [
				'Наряду с общими моделями HTR мы разрабатываем новый процесс для особенно сложных театральных рукописей. Сначала создается первоначальное автоматическое чтение, а затем оно постранично сверяется с помощью языковых моделей и прямой визуальной проверки факсимиле.',
				'Цель состоит в том, чтобы получить тексты, более полезные для чтения и исследования: они организуются по хорнадам, получают простую сквозную нумерацию страниц, сохраняют сомнения при неуверенном чтении и готовятся в формате TEI для BITESO.',
				'Этот процесс не заменяет критическое издание, но позволяет превращать сложные рукописи в навигируемые и проверяемые цифровые тексты, связанные с их изображениями.'
			],
			worksTitle: 'Первые произведения, подготовленные этим способом'
		},
		ar: {
			eyebrow: 'سير عمل جديد',
			title: 'HTR + LLM: نسخ مُراجع صفحة بصفحة',
			paragraphs: [
				'إلى جانب نماذج HTR العامة، نطوّر عملية عمل جديدة للمخطوطات المسرحية المعقدة على نحو خاص. نحصل أولًا على قراءة آلية أولية، ثم نقارنها صفحة بصفحة بمساعدة نماذج لغوية وقراءة بصرية مباشرة للصورة الأصلية.',
				'الهدف هو إنتاج نصوص أنفع للقراءة والبحث: تُرتب بحسب الجورنادات، وتُرقم ترقيمًا بسيطًا حسب الصفحات، وتُحفظ مواضع الشك عندما لا تكون القراءة مؤكدة، وتُعد بصيغة TEI للاطلاع عليها في BITESO.',
				'لا يحل هذا الإجراء محل الطبعة النقدية، لكنه يتيح تحويل المخطوطات الصعبة إلى نصوص رقمية قابلة للتصفح والمراجعة ومرتبطة بصورها.'
			],
			worksTitle: 'أولى الأعمال المدرجة بهذا الإجراء'
		}
	} as const;
	const htrLlmSection = $derived(htrLlmSectionByLocale[data.locale] ?? htrLlmSectionByLocale.es);
	const htrLlmWorks = [
		{
			title: 'A averiguados celos no hay prudencia',
			href: '/biteso/averiguados-celos-no-hay-prudencia'
		},
		{
			title: 'A más desdén más amor',
			href: '/biteso/mas-amor-mas-desden'
		},
		{
			title: 'Abraham del yermo',
			href: '/biteso/abraham-del-yermo'
		},
		{
			title: 'Acis y Galatea',
			href: '/biteso/acis-y-galatea'
		},
		{
			title: 'Adonis y Venus',
			href: '/biteso/adonis-y-venus-0'
		}
	] as const;
</script>

<SeoHead
	title="Transcripciones automáticas"
	description={TRANSCRIPCIONES_SEO_DESCRIPTION}
	path="/transcripciones-automaticas"
/>

<div class="grid gap-7 lg:gap-8">
	<Breadcrumbs
		items={[
			{ label: 'Inicio', href: '/' },
			{ label: 'Transcripciones automáticas' }
		]}
	/>

		<section class="grid gap-4" data-i18n-skip>
			<p class="m-0 font-ui text-[0.8rem] font-semibold uppercase tracking-[0.05em] text-text-accent-purple">
				{pageText.eyebrow}
			</p>
			<h1 class="m-0 text-[clamp(1.7rem,2.9vw,2.25rem)] font-bold leading-[1.12] text-brand-blue-dark">
				{pageText.title}
			</h1>
			<p class="m-0 leading-[1.72] text-text-main">{pageText.subtitle}</p>
		</section>

	<section class="grid gap-6 lg:gap-7">
		<blockquote class="m-0 border-l-4 border-border-accent-purple pl-5 text-[1.02rem] leading-[1.75] text-text-main lg:pl-6" data-i18n-skip>
			<p class="m-0">
				<a
					href="https://doi.org/10.13035/H.2023.11.01.08"
					target="_blank"
					rel="noopener noreferrer"
					class="underline"
				>
					Cuéllar, Álvaro. (2023). «La Inteligencia Artificial al rescate del Siglo de Oro. Transcripción y modernización automática de mil trescientos impresos y manuscritos teatrales»
				</a>
				. <em>Hipogrifo. Revista de literatura y cultura del Siglo de Oro</em>, vol. 11, núm. 1,
				pp. 101-115.
			</p>
		</blockquote>

			<section class="grid gap-5 border-y border-border bg-surface-soft px-5 py-6 lg:px-7" data-i18n-skip>
				<div class="grid gap-2">
					<p class="m-0 font-ui text-[0.76rem] font-semibold uppercase tracking-[0.05em] text-text-accent-purple">
						{htrLlmSection.eyebrow}
					</p>
					<h2 class="m-0 font-ui text-[1.25rem] font-bold leading-[1.25] text-brand-blue-dark">
						{htrLlmSection.title}
					</h2>
				</div>

				<div class="grid gap-3">
					{#each htrLlmSection.paragraphs as paragraph}
						<p class="m-0 leading-[1.72] text-text-main" dir={data.locale === 'ar' ? 'rtl' : undefined}>
							{paragraph}
						</p>
					{/each}
				</div>

				<div class="grid gap-3">
					<h3 class="m-0 font-ui text-[0.95rem] font-semibold leading-[1.4] text-brand-blue-dark">
						{htrLlmSection.worksTitle}
					</h3>
					<ul class="m-0 grid list-none gap-2 p-0 sm:grid-cols-2">
						{#each htrLlmWorks as work}
							<li>
								<a
									href={localizePath(work.href, data.locale)}
									class="inline-flex w-full items-center justify-between gap-3 rounded-[8px] border border-border bg-surface px-4 py-3 font-ui text-[0.92rem] font-semibold text-brand-blue-dark no-underline transition hover:border-border-accent-blue hover:bg-surface-accent-blue hover:text-brand-blue-dark hover:no-underline"
								>
									<span>{work.title}</span>
									<span aria-hidden="true">→</span>
								</a>
							</li>
						{/each}
					</ul>
				</div>
			</section>

			<p class="m-0 leading-[1.72] text-text-main" data-i18n-skip dir={data.locale === 'ar' ? 'rtl' : undefined}>
				{pageText.intro}
			</p>

			<div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" data-i18n-skip>
				{#each pageText.milestones as item}
					<article class="grid gap-2 rounded-card border border-border bg-surface p-5 shadow-soft">
						<p class="m-0 font-ui text-[1.5rem] font-semibold leading-none text-brand-blue-dark">{item.value}</p>
						<p class="m-0 text-[0.95rem] leading-[1.6] text-text-main" dir={data.locale === 'ar' ? 'rtl' : undefined}>{item.label}</p>
					</article>
				{/each}
			</div>

			<p class="m-0 leading-[1.72] text-text-main" data-i18n-skip dir={data.locale === 'ar' ? 'rtl' : undefined}>
				{pageText.publicModels}
			</p>

			<div class="grid gap-4 lg:grid-cols-3" data-i18n-skip>
				{#each pageText.models as model}
					<article class="grid gap-3 rounded-card border border-border-accent-blue bg-surface-accent-blue px-5 py-4">
						<p class="m-0 text-[0.76rem] font-ui font-semibold uppercase tracking-[0.04em] text-text-accent-purple">
							Transkribus, 2021
					</p>
					<h2 class="m-0 font-ui text-[1rem] font-semibold leading-[1.35] text-brand-blue-dark">
						{model.title}
					</h2>
						<p class="m-0 text-[0.95rem] leading-[1.68] text-text-main" dir={data.locale === 'ar' ? 'rtl' : undefined}>{model.description}</p>
					</article>
				{/each}
			</div>

			<p class="m-0 leading-[1.72] text-text-main" data-i18n-skip dir={data.locale === 'ar' ? 'rtl' : undefined}>
				{pageText.accuracy}
			</p>

		<div class="grid gap-5 sm:grid-cols-2">
			<img
				src={transcripcionAutomatica1}
				alt="Ejemplo de transcripción automática aplicada a un texto teatral del Siglo de Oro."
				class="aspect-[4/3] w-full rounded-card object-cover shadow-soft"
				loading="lazy"
			/>
			<img
				src={transcripcionAutomatica2}
				alt="Segundo ejemplo de transcripción automática y modernización ortográfica."
				class="aspect-[4/3] w-full rounded-card object-cover shadow-soft"
				loading="lazy"
			/>
		</div>

			<p class="m-0 leading-[1.72] text-text-main" data-i18n-skip dir={data.locale === 'ar' ? 'rtl' : undefined}>
				{pageText.contact}
			</p>
	</section>
</div>
