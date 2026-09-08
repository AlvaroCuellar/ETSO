import type { Locale } from '$lib/i18n';

const CONTACT_PARAGRAPH =
	'ETSO está abierto a todo tipo de consultas, colaboraciones, preguntas y peticiones. Estaremos encantados de ayudar a todo aquel que lo requiera a través del siguiente formulario.';
const COMPARISON_PARAGRAPH =
	'para hacer posible su comparación, y se han depurado en lo posible para reducir interferencias (por ejemplo, acotaciones y marcas de intervención). A partir de esta base, el sitio permite confrontar atribuciones transmitidas por la tradición con propuestas derivadas del análisis cuantitativo del estilo. El objetivo no es sustituir la lectura filológica, sino aportar evidencia adicional, reproducible y acumulativa que ayude a orientar futuras comprobaciones documentales y críticas.';
const CONTRIBUTION_PARAGRAPH =
	', e integra también textos procedentes de transcripciones automáticas de impresos y manuscritos antiguos. Se aceptan consultas, colaboraciones y propuestas de ampliación: si dispones de una obra o conoces cómo acceder a ella, escríbenos y nos comprometemos a reconocer tu contribución y a compartir los resultados del análisis.';

export const completeCopyTranslations: Record<Exclude<Locale, 'es'>, Record<string, string>> = {
	en: {
		[CONTACT_PARAGRAPH]: 'ETSO welcomes all kinds of queries, collaborations, questions, and requests. We will be happy to help through the following form.',
		[COMPARISON_PARAGRAPH]: 'to allow comparison, and they have been cleaned as far as possible to reduce interference, such as stage directions and speaker labels. On this basis, the site allows attributions inherited from tradition to be compared with proposals derived from quantitative analysis of style. The aim is not to replace philological reading, but to provide additional, reproducible, cumulative evidence that can help guide future documentary and critical checks.',
		[CONTRIBUTION_PARAGRAPH]: ', and also includes texts derived from automatic transcriptions of early printed books and manuscripts. We welcome queries, collaborations, and proposals to expand the corpus: if you have a work or know how to access one, write to us. We will acknowledge your contribution and share the analysis results.',
		'Contacto:': 'Contact:',
		'Todas junto a la principal': 'All together with the main term'
	},
	fr: {
		[CONTACT_PARAGRAPH]: 'ETSO accueille toute demande, collaboration, question ou proposition. Nous serons heureux de vous aider au moyen du formulaire ci-dessous.',
		[COMPARISON_PARAGRAPH]: 'pour permettre leur comparaison et ont été nettoyés autant que possible afin de réduire les interférences, notamment les didascalies et les indications de locuteur. Sur cette base, le site permet de confronter les attributions transmises par la tradition aux propositions issues de l’analyse quantitative du style. L’objectif n’est pas de remplacer la lecture philologique, mais d’apporter des éléments supplémentaires, reproductibles et cumulatifs, afin d’orienter de futures vérifications documentaires et critiques.',
		[CONTRIBUTION_PARAGRAPH]: ', et intègre également des textes issus de transcriptions automatiques d’imprimés anciens et de manuscrits. Les demandes, collaborations et propositions d’élargissement sont les bienvenues : si vous disposez d’une œuvre ou savez comment y accéder, écrivez-nous. Nous nous engageons à reconnaître votre contribution et à partager les résultats de l’analyse.',
		'Contacto:': 'Contact :',
		'Todas junto a la principal': 'Tous avec le terme principal'
	},
	pt: {
		[CONTACT_PARAGRAPH]: 'O ETSO está aberto a consultas, colaborações, perguntas e pedidos de todo tipo. Teremos prazer em ajudar por meio do formulário abaixo.',
		[COMPARISON_PARAGRAPH]: 'para permitir a comparação e foram depurados, tanto quanto possível, para reduzir interferências, como rubricas e indicações de fala. Com essa base, o site permite comparar atribuições transmitidas pela tradição com propostas derivadas da análise quantitativa do estilo. O objetivo não é substituir a leitura filológica, mas fornecer evidências adicionais, reproduzíveis e cumulativas que ajudem a orientar futuras verificações documentais e críticas.',
		[CONTRIBUTION_PARAGRAPH]: ', e também integra textos provenientes de transcrições automáticas de impressos antigos e manuscritos. São bem-vindas consultas, colaborações e propostas de ampliação: se você dispõe de uma obra ou sabe como acessá-la, escreva-nos. Comprometemo-nos a reconhecer sua contribuição e compartilhar os resultados da análise.',
		'Contacto:': 'Contato:',
		'Todas junto a la principal': 'Todos com o termo principal'
	},
	it: {
		[CONTACT_PARAGRAPH]: 'ETSO accoglie richieste, collaborazioni, domande e proposte di ogni tipo. Saremo lieti di aiutarti tramite il modulo seguente.',
		[COMPARISON_PARAGRAPH]: 'per consentirne il confronto e sono stati ripuliti, per quanto possibile, da elementi che potrebbero interferire con l’analisi, come le didascalie e le indicazioni dei personaggi che parlano. Su questa base, il sito permette di confrontare le attribuzioni tramandate dalla tradizione con proposte derivate dall’analisi quantitativa dello stile. L’obiettivo non è sostituire la lettura filologica, ma offrire ulteriori elementi di prova, riproducibili e cumulativi, che possano orientare future verifiche documentarie e critiche.',
		[CONTRIBUTION_PARAGRAPH]: ', e comprende anche testi ricavati da trascrizioni automatiche di stampe antiche e manoscritti. Accogliamo richieste, collaborazioni e proposte di ampliamento: se disponi di un’opera o sai come accedervi, scrivici. Ci impegniamo a riconoscere il tuo contributo e a condividere i risultati dell’analisi.',
		'Contacto:': 'Contatti:',
		'Todas junto a la principal': 'Tutti con il termine principale'
	},
	de: {
		[CONTACT_PARAGRAPH]: 'ETSO ist offen für Anfragen, Kooperationen, Fragen und Anliegen aller Art. Wir helfen Ihnen gerne über das folgende Formular weiter.',
		[COMPARISON_PARAGRAPH]: 'um einen Vergleich zu ermöglichen, und so weit wie möglich von störenden Elementen wie Bühnenanweisungen und Sprecherangaben bereinigt. Auf dieser Grundlage lassen sich überlieferte Zuschreibungen mit Vorschlägen aus der quantitativen Stilanalyse vergleichen. Ziel ist nicht, die philologische Lektüre zu ersetzen, sondern zusätzliche, reproduzierbare und kumulative Belege zu liefern, die künftige dokumentarische und kritische Prüfungen unterstützen.',
		[CONTRIBUTION_PARAGRAPH]: ', und umfasst auch Texte aus automatischen Transkriptionen alter Drucke und Handschriften. Anfragen, Kooperationen und Vorschläge zur Erweiterung sind willkommen: Wenn Sie über ein Werk verfügen oder wissen, wie es zugänglich ist, schreiben Sie uns. Wir werden Ihren Beitrag würdigen und die Analyseergebnisse mit Ihnen teilen.',
		'Contacto:': 'Kontakt:',
		'Todas junto a la principal': 'Alle zusammen mit dem Hauptbegriff'
	},
	zh: {
		[CONTACT_PARAGRAPH]: 'ETSO 欢迎各类咨询、合作、问题和请求。我们很乐意通过下方表单为您提供帮助。',
		[COMPARISON_PARAGRAPH]: '处理，以便进行比较，并尽可能清理舞台说明和人物发言标记等可能干扰分析的内容。在此基础上，网站可以将传统的作者归属与文体定量分析提出的归属建议进行比较。目的不是取代文献学阅读，而是提供额外的、可复现且可积累的证据，为今后的文献核验与批判性研究提供参考。',
		[CONTRIBUTION_PARAGRAPH]: '，还收录了通过自动转录古代印刷本和手稿获得的文本。欢迎咨询、合作及扩充语料库的建议。如果您拥有某部作品或知道如何获取，请联系我们。我们承诺注明您的贡献，并分享分析结果。',
		'Contacto:': '联系方式：',
		'Todas junto a la principal': '全部与主词同时出现'
	},
	ja: {
		[CONTACT_PARAGRAPH]: 'ETSO は、各種お問い合わせ、研究協力、ご質問、ご要望を受け付けています。以下のフォームからお気軽にご連絡ください。',
		[COMPARISON_PARAGRAPH]: 'により比較できるように整えられ、ト書きや話者を示す表記など、分析への干渉を生む要素が可能な限り除かれています。これを基に、従来伝えられてきた作者帰属と、文体の定量分析から得られた帰属候補を比較できます。目的は文献学的な読解に取って代わることではなく、再現可能で蓄積できる追加の証拠を提供し、今後の文献調査や批判的検証に役立てることです。',
		[CONTRIBUTION_PARAGRAPH]: 'を基に構築され、古い印刷本や写本の自動転写によるテキストも収録しています。お問い合わせ、研究協力、収録範囲の拡充に関するご提案を歓迎します。作品をお持ちの方や、その入手方法をご存じの方はご連絡ください。ご協力を明記し、分析結果を共有することをお約束します。',
		'Contacto:': '連絡先：',
		'Todas junto a la principal': '主検索語とすべての追加語'
	},
	ko: {
		[CONTACT_PARAGRAPH]: 'ETSO는 각종 문의, 연구 협력, 질문 및 요청을 환영합니다. 아래 양식을 통해 연락해 주시면 기꺼이 도와드리겠습니다.',
		[COMPARISON_PARAGRAPH]: '을 거쳐 비교가 가능하도록 정비되었으며, 무대 지시와 화자 표시 등 분석에 영향을 줄 수 있는 요소를 최대한 제거했습니다. 이를 바탕으로 전통적으로 전해진 저자 귀속과 문체의 정량 분석에서 도출한 귀속 후보를 비교할 수 있습니다. 목표는 문헌학적 독해를 대체하는 것이 아니라, 재현하고 축적할 수 있는 추가 증거를 제공하여 향후 문헌 조사와 비판적 검증에 도움을 주는 것입니다.',
		[CONTRIBUTION_PARAGRAPH]: '를 바탕으로 구축되었으며, 옛 인쇄본과 필사본의 자동 전사로 얻은 텍스트도 포함합니다. 문의, 연구 협력, 수록 범위 확대에 관한 제안을 환영합니다. 작품을 보유하고 있거나 접근 방법을 알고 있다면 연락해 주세요. 기여를 명시하고 분석 결과를 공유하겠습니다.',
		'Contacto:': '연락처:',
		'Todas junto a la principal': '주 검색어와 모두 함께'
	},
	ru: {
		[CONTACT_PARAGRAPH]: 'ETSO открыт для любых обращений, предложений о сотрудничестве, вопросов и запросов. Мы будем рады помочь вам через форму ниже.',
		[COMPARISON_PARAGRAPH]: 'для обеспечения сопоставимости и по возможности очищены от элементов, способных повлиять на анализ, например сценических ремарок и обозначений говорящих персонажей. На этой основе сайт позволяет сопоставлять традиционные атрибуции с предположениями, полученными путём количественного анализа стиля. Цель состоит не в замене филологического чтения, а в предоставлении дополнительных, воспроизводимых и накапливаемых свидетельств, которые помогут направить будущие документальные и критические проверки.',
		[CONTRIBUTION_PARAGRAPH]: ', а также включает тексты, полученные при автоматической транскрипции старопечатных изданий и рукописей. Мы приветствуем обращения, сотрудничество и предложения по расширению корпуса: если у вас есть произведение или вы знаете, как получить к нему доступ, напишите нам. Мы обязуемся отметить ваш вклад и поделиться результатами анализа.',
		'Contacto:': 'Контакты:',
		'Todas junto a la principal': 'Все вместе с основным термином'
	},
	ar: {
		[CONTACT_PARAGRAPH]: 'يرحب ETSO بجميع الاستفسارات وأشكال التعاون والأسئلة والطلبات. يسرنا تقديم المساعدة عبر النموذج التالي.',
		[COMPARISON_PARAGRAPH]: 'لتيسير المقارنة بينها، ونُقّحت قدر الإمكان لتقليل العناصر التي قد تؤثر في التحليل، مثل الإرشادات المسرحية وعلامات المتحدثين. وعلى هذا الأساس، يتيح الموقع مقارنة الإسنادات المتوارثة بمقترحات مستمدة من التحليل الكمي للأسلوب. والهدف ليس استبدال القراءة الفيلولوجية، بل تقديم أدلة إضافية قابلة للتكرار والتراكم تساعد على توجيه عمليات التحقق الوثائقي والنقدي اللاحقة.',
		[CONTRIBUTION_PARAGRAPH]: '، وتضم كذلك نصوصًا ناتجة عن النسخ الآلي لمطبوعات قديمة ومخطوطات. نرحب بالاستفسارات والتعاون ومقترحات توسيع المجموعة: فإذا كان لديك عمل أو تعرف كيفية الوصول إليه، فاكتب إلينا. ونتعهد بذكر مساهمتك ومشاركة نتائج التحليل.',
		'Contacto:': 'للتواصل:',
		'Todas junto a la principal': 'جميعها مع المصطلح الرئيسي'
	}
};
