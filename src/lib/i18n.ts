import { SITE_URL } from '$lib/seo';
import { esToAr, esToDe, esToIt, esToJa, esToKo, esToPt, esToRu, esToZh } from '$lib/i18n-extra';

export const DEFAULT_LOCALE = 'es';
export const SUPPORTED_LOCALES = ['es', 'en', 'fr', 'pt', 'it', 'de', 'zh', 'ja', 'ko', 'ru', 'ar'] as const;

export type Locale = (typeof SUPPORTED_LOCALES)[number];

export interface LocalePath {
	locale: Locale;
	pathname: string;
}

export interface NavItem {
	href: string;
	label: string;
}

export interface UiTranslations {
	localeName: string;
	nav: {
		primaryLabel: string;
		mobileLabel: string;
		moreInfo: string;
		openMenu: string;
		closeMenu: string;
		languageSelector: string;
		switchToLanguage: string;
		items: NavItem[];
		infoItems: NavItem[];
	};
	footer: {
		navigation: string;
		information: string;
		mainFunding: string;
		complementarySupport: string;
		direction: string;
		contentLicenses: string;
		privacy: string;
		and: string;
		webDevelopment: string;
	};
	seo: {
		siteName: string;
		defaultDescription: string;
	};
}

const navHrefs = {
	authorshipExam: '/examen-autorias',
	texoro: '/texoro',
	biteso: '/biteso',
	summaries: '/resumenes',
	network: '/red-obras',
	citation: '/como-citarnos',
	impact: '/repercusion',
	transcriptions: '/transcripciones-automaticas',
	team: '/equipo',
	contact: '/contacto'
} as const;

export const uiTranslations: Record<Locale, UiTranslations> = {
	es: {
		localeName: 'Español',
		nav: {
			primaryLabel: 'Navegación principal',
			mobileLabel: 'Navegación principal móvil',
			moreInfo: 'Más información',
			openMenu: 'Abrir menú principal',
			closeMenu: 'Cerrar menú principal',
			languageSelector: 'Selector de idioma',
			switchToLanguage: 'Cambiar a',
			items: [
				{ href: navHrefs.authorshipExam, label: 'Examen de autorías' },
				{ href: navHrefs.texoro, label: 'TEXORO' },
				{ href: navHrefs.biteso, label: 'BITESO' },
				{ href: navHrefs.summaries, label: 'Resúmenes' },
				{ href: navHrefs.network, label: 'Red 3D' },
				{ href: navHrefs.citation, label: 'Cómo citarnos' }
			],
			infoItems: [
				{ href: navHrefs.impact, label: 'Repercusión' },
				{ href: navHrefs.transcriptions, label: 'Transcripciones automáticas' },
				{ href: navHrefs.team, label: 'Equipo' },
				{ href: navHrefs.contact, label: 'Contacto' }
			]
		},
		footer: {
			navigation: 'Navegación',
			information: 'Información',
			mainFunding: 'Esta página web ha sido desarrollada gracias a la financiación principal de:',
			complementarySupport: 'Con el apoyo complementario de:',
			direction: 'Dirección:',
			contentLicenses: 'Licencias de contenido',
			privacy: 'privacidad',
			and: 'y',
			webDevelopment: 'Desarrollo web:'
		},
		seo: {
			siteName: 'ETSO: Estilometría aplicada al Teatro del Siglo de Oro',
			defaultDescription:
				'ETSO es una infraestructura de investigación dedicada al teatro del Siglo de Oro. Permite consultar informes de análisis estilométrico sobre la autoría de las cerca de 3000 obras conservadas, explorar textos teatrales áureos mediante un buscador léxico y acceder a resúmenes automáticos de todas las obras.'
		}
	},
	en: {
		localeName: 'English',
		nav: {
			primaryLabel: 'Main navigation',
			mobileLabel: 'Mobile main navigation',
			moreInfo: 'More information',
			openMenu: 'Open main menu',
			closeMenu: 'Close main menu',
			languageSelector: 'Language selector',
			switchToLanguage: 'Switch to',
			items: [
				{ href: navHrefs.authorshipExam, label: 'Examen de autorías' },
				{ href: navHrefs.texoro, label: 'TEXORO' },
				{ href: navHrefs.biteso, label: 'BITESO' },
				{ href: navHrefs.summaries, label: 'Summaries' },
				{ href: navHrefs.network, label: '3D network' },
				{ href: navHrefs.citation, label: 'How to cite us' }
			],
			infoItems: [
				{ href: navHrefs.impact, label: 'Impact' },
				{ href: navHrefs.transcriptions, label: 'Automatic transcriptions' },
				{ href: navHrefs.team, label: 'Team' },
				{ href: navHrefs.contact, label: 'Contact' }
			]
		},
		footer: {
			navigation: 'Navigation',
			information: 'Information',
			mainFunding: 'This website has been developed thanks to the main funding provided by:',
			complementarySupport: 'With complementary support from:',
			direction: 'Direction:',
			contentLicenses: 'Content licenses',
			privacy: 'privacy',
			and: 'and',
			webDevelopment: 'Web development:'
		},
		seo: {
			siteName: 'ETSO: Stylometry Applied to Golden Age Theatre',
			defaultDescription:
				'ETSO is a research infrastructure devoted to Golden Age theatre. It provides stylometric authorship reports for nearly 3,000 surviving plays, lexical search across Golden Age dramatic texts, and automatic summaries for the corpus.'
		}
	},
	fr: {
		localeName: 'Français',
		nav: {
			primaryLabel: 'Navigation principale',
			mobileLabel: 'Navigation principale mobile',
			moreInfo: "Plus d'information",
			openMenu: 'Ouvrir le menu principal',
			closeMenu: 'Fermer le menu principal',
			languageSelector: 'Sélecteur de langue',
			switchToLanguage: 'Passer en',
			items: [
				{ href: navHrefs.authorshipExam, label: 'Examen de autorías' },
				{ href: navHrefs.texoro, label: 'TEXORO' },
				{ href: navHrefs.biteso, label: 'BITESO' },
				{ href: navHrefs.summaries, label: 'Résumés' },
				{ href: navHrefs.network, label: 'Réseau 3D' },
				{ href: navHrefs.citation, label: 'Comment nous citer' }
			],
			infoItems: [
				{ href: navHrefs.impact, label: 'Retombées' },
				{ href: navHrefs.transcriptions, label: 'Transcriptions automatiques' },
				{ href: navHrefs.team, label: 'Équipe' },
				{ href: navHrefs.contact, label: 'Contact' }
			]
		},
		footer: {
			navigation: 'Navigation',
			information: 'Information',
			mainFunding: 'Ce site a été développé grâce au financement principal de :',
			complementarySupport: 'Avec le soutien complémentaire de :',
			direction: 'Direction :',
			contentLicenses: 'Licences de contenu',
			privacy: 'confidentialité',
			and: 'et',
			webDevelopment: 'Développement web :'
		},
		seo: {
			siteName: 'ETSO : Stylométrie appliquée au théâtre du Siècle d’or',
			defaultDescription:
				"ETSO est une infrastructure de recherche consacrée au théâtre du Siècle d'or. Elle permet de consulter des rapports stylométriques sur l'attribution de près de 3 000 pièces conservées, d'explorer les textes dramatiques au moyen d'un moteur lexical et d'accéder aux résumés automatiques du corpus."
		}
	},
	pt: {
		localeName: 'Português',
		nav: {
			primaryLabel: 'Navegação principal',
			mobileLabel: 'Navegação principal móvel',
			moreInfo: 'Mais informações',
			openMenu: 'Abrir menu principal',
			closeMenu: 'Fechar menu principal',
			languageSelector: 'Seletor de idioma',
			switchToLanguage: 'Mudar para',
			items: [
				{ href: navHrefs.authorshipExam, label: 'Examen de autorías' },
				{ href: navHrefs.texoro, label: 'TEXORO' },
				{ href: navHrefs.biteso, label: 'BITESO' },
				{ href: navHrefs.summaries, label: 'Resumos' },
				{ href: navHrefs.network, label: 'Rede 3D' },
				{ href: navHrefs.citation, label: 'Como nos citar' }
			],
			infoItems: [
				{ href: navHrefs.impact, label: 'Repercussão' },
				{ href: navHrefs.transcriptions, label: 'Transcrições automáticas' },
				{ href: navHrefs.team, label: 'Equipe' },
				{ href: navHrefs.contact, label: 'Contato' }
			]
		},
		footer: {
			navigation: 'Navegação',
			information: 'Informação',
			mainFunding: 'Este site foi desenvolvido graças ao financiamento principal de:',
			complementarySupport: 'Com o apoio complementar de:',
			direction: 'Direção:',
			contentLicenses: 'Licenças de conteúdo',
			privacy: 'privacidade',
			and: 'e',
			webDevelopment: 'Desenvolvimento web:'
		},
		seo: {
			siteName: 'ETSO: Estilometria aplicada ao teatro do Século de Ouro espanhol',
			defaultDescription:
				'ETSO é uma infraestrutura de pesquisa dedicada ao teatro do Século de Ouro espanhol. Permite consultar relatórios estilométricos sobre a autoria de cerca de 3000 obras conservadas, fazer pesquisa textual em textos dramáticos e acessar resumos automáticos do corpus.'
		}
	},
	it: {
		localeName: 'Italiano',
		nav: {
			primaryLabel: 'Navigazione principale',
			mobileLabel: 'Navigazione principale mobile',
			moreInfo: 'Maggiori informazioni',
			openMenu: 'Apri il menu principale',
			closeMenu: 'Chiudi il menu principale',
			languageSelector: 'Selettore della lingua',
			switchToLanguage: 'Passa a',
			items: [
				{ href: navHrefs.authorshipExam, label: 'Examen de autorías' },
				{ href: navHrefs.texoro, label: 'TEXORO' },
				{ href: navHrefs.biteso, label: 'BITESO' },
				{ href: navHrefs.summaries, label: 'Riassunti' },
				{ href: navHrefs.network, label: 'Rete 3D' },
				{ href: navHrefs.citation, label: 'Come citarci' }
			],
			infoItems: [
				{ href: navHrefs.impact, label: 'Ripercussione' },
				{ href: navHrefs.transcriptions, label: 'Trascrizioni automatiche' },
				{ href: navHrefs.team, label: 'Team' },
				{ href: navHrefs.contact, label: 'Contatto' }
			]
		},
		footer: {
			navigation: 'Navigazione',
			information: 'Informazioni',
			mainFunding: 'Questo sito è stato sviluppato grazie al finanziamento principale di:',
			complementarySupport: 'Con il sostegno complementare di:',
			direction: 'Direzione:',
			contentLicenses: 'Licenze dei contenuti',
			privacy: 'privacy',
			and: 'e',
			webDevelopment: 'Sviluppo web:'
		},
		seo: {
			siteName: 'ETSO: stilometria applicata al teatro del Secolo d’Oro spagnolo',
			defaultDescription:
				'ETSO è un’infrastruttura di ricerca dedicata al teatro del Secolo d’Oro spagnolo. Consente di consultare rapporti stilometrici sull’attribuzione d’autore di circa 3000 opere conservate, effettuare ricerche testuali nei testi drammatici e accedere ai riassunti automatici del corpus.'
		}
	},
	de: {
		localeName: 'Deutsch',
		nav: {
			primaryLabel: 'Hauptnavigation',
			mobileLabel: 'Mobile Hauptnavigation',
			moreInfo: 'Weitere Informationen',
			openMenu: 'Hauptmenü öffnen',
			closeMenu: 'Hauptmenü schließen',
			languageSelector: 'Sprachauswahl',
			switchToLanguage: 'Wechseln zu',
			items: [
				{ href: navHrefs.authorshipExam, label: 'Examen de autorías' },
				{ href: navHrefs.texoro, label: 'TEXORO' },
				{ href: navHrefs.biteso, label: 'BITESO' },
				{ href: navHrefs.summaries, label: 'Zusammenfassungen' },
				{ href: navHrefs.network, label: '3D-Netzwerk' },
				{ href: navHrefs.citation, label: 'Zitierweise' }
			],
			infoItems: [
				{ href: navHrefs.impact, label: 'Auswirkung' },
				{ href: navHrefs.transcriptions, label: 'Automatische Transkriptionen' },
				{ href: navHrefs.team, label: 'Team' },
				{ href: navHrefs.contact, label: 'Kontakt' }
			]
		},
		footer: {
			navigation: 'Navigation',
			information: 'Information',
			mainFunding: 'Diese Website wurde mit der Hauptfinanzierung entwickelt von:',
			complementarySupport: 'Mit ergänzender Unterstützung von:',
			direction: 'Leitung:',
			contentLicenses: 'Inhaltslizenzen',
			privacy: 'Datenschutz',
			and: 'und',
			webDevelopment: 'Webentwicklung:'
		},
		seo: {
			siteName: 'ETSO: Stilometrie angewandt auf das Theater des spanischen Siglo de Oro',
			defaultDescription:
				'ETSO ist eine Forschungsinfrastruktur zum Theater des spanischen Siglo de Oro. Sie bietet stilometrische Berichte zur Autorschaftszuschreibung von fast 3000 erhaltenen Stücken, Textsuche in dramatischen Texten und automatische Zusammenfassungen des Korpus.'
		}
	},
	zh: {
		localeName: '中文',
		nav: {
			primaryLabel: '主导航',
			mobileLabel: '移动端主导航',
			moreInfo: '更多信息',
			openMenu: '打开主菜单',
			closeMenu: '关闭主菜单',
			languageSelector: '语言选择器',
			switchToLanguage: '切换到',
			items: [
				{ href: navHrefs.authorshipExam, label: 'Examen de autorías' },
				{ href: navHrefs.texoro, label: 'TEXORO' },
				{ href: navHrefs.biteso, label: 'BITESO' },
				{ href: navHrefs.summaries, label: '摘要' },
				{ href: navHrefs.network, label: '3D网络' },
				{ href: navHrefs.citation, label: '引用方式' }
			],
			infoItems: [
				{ href: navHrefs.impact, label: '影响' },
				{ href: navHrefs.transcriptions, label: '自动转录' },
				{ href: navHrefs.team, label: '团队' },
				{ href: navHrefs.contact, label: '联系' }
			]
		},
		footer: {
			navigation: '导航',
			information: '信息',
			mainFunding: '本网站主要由以下项目资助开发：',
			complementarySupport: '并得到以下机构的补充支持：',
			direction: '负责人：',
			contentLicenses: '内容许可',
			privacy: '隐私',
			and: '和',
			webDevelopment: '网站开发：'
		},
		seo: {
			siteName: 'ETSO：应用于西班牙黄金时代戏剧的文体计量学',
			defaultDescription:
				'ETSO 是面向西班牙黄金时代戏剧的研究基础设施。它提供近 3000 部存世剧作的文体计量报告、文本检索和语料库自动摘要。'
		}
	},
	ja: {
		localeName: '日本語',
		nav: {
			primaryLabel: 'メインナビゲーション',
			mobileLabel: 'モバイルメインナビゲーション',
			moreInfo: '詳細情報',
			openMenu: 'メインメニューを開く',
			closeMenu: 'メインメニューを閉じる',
			languageSelector: '言語セレクター',
			switchToLanguage: '切り替え先',
			items: [
				{ href: navHrefs.authorshipExam, label: 'Examen de autorías' },
				{ href: navHrefs.texoro, label: 'TEXORO' },
				{ href: navHrefs.biteso, label: 'BITESO' },
				{ href: navHrefs.summaries, label: '要約' },
				{ href: navHrefs.network, label: '3Dネットワーク' },
				{ href: navHrefs.citation, label: '引用方法' }
			],
			infoItems: [
				{ href: navHrefs.impact, label: '反響' },
				{ href: navHrefs.transcriptions, label: '自動転写' },
				{ href: navHrefs.team, label: 'チーム' },
				{ href: navHrefs.contact, label: 'お問い合わせ' }
			]
		},
		footer: {
			navigation: 'ナビゲーション',
			information: '情報',
			mainFunding: 'このウェブサイトは主に以下の資金により開発されました：',
			complementarySupport: '以下の追加支援を受けています：',
			direction: '代表：',
			contentLicenses: 'コンテンツのライセンス',
			privacy: '個人情報保護',
			and: 'と',
			webDevelopment: 'ウェブ開発：'
		},
		seo: {
			siteName: 'ETSO：スペイン黄金世紀演劇に応用した文体計量分析',
			defaultDescription:
				'ETSOはスペイン黄金世紀演劇を対象とする研究基盤です。現存する約3000作品の著者帰属に関する文体計量レポート、演劇テキストの語彙検索、コーパスの自動要約にアクセスできます。'
		}
	},
	ko: {
		localeName: '한국어',
		nav: {
			primaryLabel: '기본 탐색',
			mobileLabel: '모바일 기본 탐색',
			moreInfo: '자세한 정보',
			openMenu: '기본 메뉴 열기',
			closeMenu: '기본 메뉴 닫기',
			languageSelector: '언어 선택기',
			switchToLanguage: '전환',
			items: [
				{ href: navHrefs.authorshipExam, label: 'Examen de autorías' },
				{ href: navHrefs.texoro, label: 'TEXORO' },
				{ href: navHrefs.biteso, label: 'BITESO' },
				{ href: navHrefs.summaries, label: '요약' },
				{ href: navHrefs.network, label: '3D 네트워크' },
				{ href: navHrefs.citation, label: '인용 방법' }
			],
			infoItems: [
				{ href: navHrefs.impact, label: '반향' },
				{ href: navHrefs.transcriptions, label: '자동 전사' },
				{ href: navHrefs.team, label: '팀' },
				{ href: navHrefs.contact, label: '문의' }
			]
		},
		footer: {
			navigation: '탐색',
			information: '정보',
			mainFunding: '이 웹사이트는 주로 다음 지원으로 개발되었습니다:',
			complementarySupport: '추가 지원:',
			direction: '책임자:',
			contentLicenses: '콘텐츠 라이선스',
			privacy: '개인정보',
			and: '및',
			webDevelopment: '웹 개발:'
		},
		seo: {
			siteName: 'ETSO: 스페인 황금세기 연극에 적용한 문체계량학',
			defaultDescription:
				'ETSO는 스페인 황금세기 연극을 위한 연구 인프라입니다. 보존된 약 3000편의 작품에 대한 문체계량 보고서, 텍스트 검색, 말뭉치 자동 요약을 제공합니다.'
		}
	},
	ru: {
		localeName: 'Русский',
		nav: {
			primaryLabel: 'Основная навигация',
			mobileLabel: 'Основная мобильная навигация',
			moreInfo: 'Подробнее',
			openMenu: 'Открыть главное меню',
			closeMenu: 'Закрыть главное меню',
			languageSelector: 'Выбор языка',
			switchToLanguage: 'Перейти на',
			items: [
				{ href: navHrefs.authorshipExam, label: 'Examen de autorías' },
				{ href: navHrefs.texoro, label: 'TEXORO' },
				{ href: navHrefs.biteso, label: 'BITESO' },
				{ href: navHrefs.summaries, label: 'Аннотации' },
				{ href: navHrefs.network, label: '3D-сеть' },
				{ href: navHrefs.citation, label: 'Как цитировать' }
			],
			infoItems: [
				{ href: navHrefs.impact, label: 'Последствия' },
				{ href: navHrefs.transcriptions, label: 'Автоматические транскрипции' },
				{ href: navHrefs.team, label: 'Команда' },
				{ href: navHrefs.contact, label: 'Контакты' }
			]
		},
		footer: {
			navigation: 'Навигация',
			information: 'Информация',
			mainFunding: 'Этот сайт был разработан при основной финансовой поддержке:',
			complementarySupport: 'При дополнительной поддержке:',
			direction: 'Руководство:',
			contentLicenses: 'Лицензии на контент',
			privacy: 'конфиденциальность',
			and: 'и',
			webDevelopment: 'Веб-разработка:'
		},
		seo: {
			siteName: 'ETSO: стилометрия применительно к театру испанского Золотого века',
			defaultDescription:
				'ETSO — исследовательская инфраструктура, посвященная театру испанского Золотого века. Она позволяет изучать стилометрические отчеты по авторской атрибуции почти 3000 сохранившихся пьес, выполнять текстовый поиск по драматическим текстам и обращаться к автоматическим аннотациям корпуса.'
		}
	},
	ar: {
		localeName: 'العربية',
		nav: {
			primaryLabel: 'التنقل الرئيسي',
			mobileLabel: 'التنقل الرئيسي للهاتف',
			moreInfo: 'مزيد من المعلومات',
			openMenu: 'فتح القائمة الرئيسية',
			closeMenu: 'إغلاق القائمة الرئيسية',
			languageSelector: 'اختيار اللغة',
			switchToLanguage: 'التبديل إلى',
			items: [
				{ href: navHrefs.authorshipExam, label: 'Examen de autorías' },
				{ href: navHrefs.texoro, label: 'TEXORO' },
				{ href: navHrefs.biteso, label: 'BITESO' },
				{ href: navHrefs.summaries, label: 'الملخصات' },
				{ href: navHrefs.network, label: 'الشبكة ثلاثية الأبعاد' },
				{ href: navHrefs.citation, label: 'كيفية الاستشهاد بنا' }
			],
			infoItems: [
				{ href: navHrefs.impact, label: 'الأثر' },
				{ href: navHrefs.transcriptions, label: 'النسخ الآلي' },
				{ href: navHrefs.team, label: 'الفريق' },
				{ href: navHrefs.contact, label: 'التواصل' }
			]
		},
		footer: {
			navigation: 'التنقل',
			information: 'معلومات',
			mainFunding: 'طُوّر هذا الموقع بفضل التمويل الرئيسي من:',
			complementarySupport: 'وبدعم تكميلي من:',
			direction: 'الإدارة:',
			contentLicenses: 'تراخيص المحتوى',
			privacy: 'الخصوصية',
			and: 'و',
			webDevelopment: 'تطوير الويب:'
		},
		seo: {
			siteName: 'ETSO: القياس الأسلوبي المطبّق على مسرح العصر الذهبي الإسباني',
			defaultDescription:
				'ETSO بنية بحثية مخصصة لمسرح العصر الذهبي الإسباني. تتيح الاطلاع على التقارير الأسلوبية الخاصة بإسناد تأليف نحو 3000 عمل محفوظ، واستكشاف النصوص المسرحية عبر محرك بحث نصي، والاطلاع على الملخصات الآلية للمجموعة النصية.'
		}
	}
};

const esToEn: Record<string, string> = {
	'ETSO: Estilometría aplicada al Teatro del Siglo de Oro': 'ETSO: Stylometry Applied to Golden Age Theatre',
	'Inicio': 'Home',
	'Más información': 'More information',
	'Examen de autorías': 'Examen de autorías',
	'Análisis estilométrico de obras teatrales del Siglo de Oro': 'Stylometric analysis of Golden Age plays',
	'Obras': 'Works',
	'Autores': 'Authors',
	'Dramaturgos': 'Playwrights',
	'Resúmenes': 'Summaries',
	'Resumen': 'Summary',
	'Resumen automático': 'Automatic summary',
	'Resumen automático breve': 'Short automatic summary',
	'Resumen automático amplio': 'Extended automatic summary',
	'Resúmenes automáticos': 'Automatic summaries',
	'Red estilométrica': 'Stylometric network',
	'Red de obras (BETA)': 'Works network (BETA)',
	'Red 3D': '3D network',
	'Cómo citarnos': 'How to cite us',
	'Transcripciones automáticas': 'Automatic transcriptions',
	'Equipo': 'Team',
	'Contacto': 'Contact',
	'Derechos y licencias': 'Rights and licenses',
	'Política de privacidad': 'Privacy policy',
	'Acceso restringido': 'Restricted access',
	'Ficha de obra': 'Work record',
	'Ficha de autor': 'Author record',
	'Texto digital': 'Digital text',
	'Informe': 'Report',
	'Informe estilométrico': 'Stylometric report',
	'Descarga informe': 'Download report',
	'Descargar XLSX': 'Download XLSX',
	'Descargar BibTeX': 'Download BibTeX',
	'Descargar todas las referencias en BibTeX': 'Download all references in BibTeX',
	'Descargar TXT': 'Download TXT',
	'Descargar texto en TXT': 'Download text as TXT',
	'Descargar resumen en TXT': 'Download summary as TXT',
	'Descargar datos del informe en XLSX': 'Download report data as XLSX',
	'Atribución de autoría': 'Authorship attribution',
	'Atribución tradicional': 'Traditional attribution',
	'Atribución estilometría': 'Stylometric attribution',
	'Atribución estilométrica': 'Stylometric attribution',
	'Género': 'Genre',
	'Procedencia': 'Source',
	'Obras más cercanas': 'Closest works',
	'Resultados': 'Results',
	'Resultados de búsqueda': 'Search results',
	'Referencias': 'References',
	'Recursos': 'Resources',
	'Referencias bibliográficas recomendadas para citar ETSO, TEXORO, CETSO y los recursos del proyecto.':
		'Recommended bibliographic references for citing ETSO, TEXORO, CETSO, and the project resources.',
	'Para poder seguir nuestra labor es importante que el trabajo del proyecto sea citado. Por favor, incluye en la bibliografía alguna de estas referencias si el portal te ha ayudado en tu investigación.':
		'To help us continue our work, it is important that the project be cited. Please include one of these references in your bibliography if the portal has helped you in your research.',
	'Esta página recoge una selección de trabajos que hacen uso de los resultados, recursos y materiales del proyecto ETSO. Incluye referencias vinculadas con la estilometría, la atribución de autoría, la transcripción automática, TEXORO y otros desarrollos derivados o relacionados con el proyecto.':
		'This page brings together a selection of works that make use of the results, resources, and materials of the ETSO project. It includes references related to stylometry, authorship attribution, automatic transcription, TEXORO, and other developments derived from or connected with the project.',
	'referencias seleccionadas': 'selected references',
	'Para entender los procesos aquí seguidos, puedes consultar:':
		'To understand the processes followed here, you can consult:',
	'Se puede obtener más información sobre cómo trabaja ETSO en las tareas de atribución de obras dramáticas del Siglo de Oro en:':
		'More information on how ETSO works on authorship attribution for Golden Age plays is available in:',
	'Proyecto': 'Project',
	'Algunos trabajos': 'Selected publications',
	'Nuestros trabajos': 'Our publications',
	'Trabajos relacionados con el proyecto': 'Project-related works',
	'Selección de trabajos de otros investigadores relacionados con ETSO, TEXORO, la estilometría, la transcripción automática y el teatro del Siglo de Oro.':
		'Selection of works by other researchers related to ETSO, TEXORO, stylometry, automatic transcription, and Spanish Golden Age theatre.',
	'Modelos para la transcripción automática': 'Automatic transcription models',
	'Cita sugerida': 'Suggested citation',
	'Copiar cita': 'Copy citation',
	'Cita copiada.': 'Citation copied.',
	'No hay cita disponible.': 'No citation available.',
	'No se pudo copiar.': 'Could not copy.',
	'No se pudo copiar automáticamente.': 'Could not copy automatically.',
	'Aviso': 'Notice',
	'Licencia': 'License',
	'Licencias de contenido': 'Content licenses',
	'privacidad': 'privacy',
	'Desarrollo web:': 'Web development:',
	'Navegación': 'Navigation',
	'Información': 'Information',
	'Dirección:': 'Direction:',
	'Buscar': 'Search',
	'Cargando...': 'Loading...',
	'Acceder': 'Open',
	'Ver diapositiva anterior': 'Previous slide',
	'Ver diapositiva siguiente': 'Next slide',
	'Ir a la diapositiva': 'Go to slide',
	'Secciones destacadas de ETSO': 'Featured ETSO sections',
	'Carrusel de secciones destacadas': 'Featured sections carousel',
	'Buscando': 'Searching',
	'Preparando resultados': 'Preparing results',
	'Buscar en Examen de autorías': "Search in Examen de autorías",
	'Filtra las obras del corpus por título, género, atribuciones, estado textual y fecha de incorporación.':
		'Filter the works in the corpus by title, genre, attributions, textual status, and date added.',
	'Para combinar varios términos o buscar cercanías, abre la búsqueda avanzada.':
		'To combine several terms or search by proximity, open advanced search.',
	'Búsqueda avanzada': 'Advanced search',
	'Búsqueda básica': 'Basic search',
	'Uso del buscador textual y de sus opciones avanzadas.': 'How to use the text search engine and its advanced options.',
	'Qué hace el buscador': 'What the search engine does',
	'TEXORO busca palabras, frases exactas y patrones en el corpus. Primero localiza obras candidatas con índices de búsqueda y, cuando hace falta, verifica los textos para confirmar coincidencias y preparar contextos de lectura.':
		'TEXORO searches for words, exact phrases, and patterns in the corpus. It first locates candidate works with search indexes and, when needed, checks the texts to confirm matches and prepare reading contexts.',
	'Hemos generado resúmenes automáticos de las obras incluidas en la base de datos de ETSO. Estos textos ofrecen una primera orientación sobre el argumento y el contenido de cada obra, aunque deben entenderse como una ayuda inicial y no como sustituto de la lectura ni del análisis filológico.':
		'We have generated automatic summaries of the works included in the ETSO database. These texts offer an initial orientation to the plot and contents of each work, although they should be understood as a preliminary aid and not as a substitute for reading or philological analysis.',
	'Puedes acceder al resumen de cada obra desde este listado o desde la ficha individual de la obra, clicando en el acceso al resumen automático.':
		'You can access each work summary from this list or from the individual work record by clicking the automatic summary link.',
	'Buscar en los resúmenes': 'Search the summaries',
	'Escribe al menos dos caracteres y pulsa Enter.': 'Enter at least two characters and press Enter.',
	'Buscando resúmenes... La primera búsqueda puede tardar un poco.':
		'Searching summaries... The first search may take a moment.',
	'No hay resúmenes que contengan esas palabras.': 'No summaries contain those words.',
	'Buscar obra por título': 'Search work by title',
	'No hay obras que coincidan con la búsqueda.': 'No works match the search.',
	'Buscar por título': 'Search by title',
	'Filtrar por género': 'Filter by genre',
	'Todos los géneros': 'All genres',
	'Título': 'Title',
	'Texto empleado': 'Text used',
	'Estado del texto': 'Text status',
	'Fecha de adición o modificación': 'Date added or modified',
	'Fecha de adición o modificación (desde)': 'Date added or modified (from)',
	'Fecha de adición o modificación (hasta)': 'Date added or modified (to)',
	'Texto': 'Text',
	'Acceso al texto': 'Text access',
	'Leer texto': 'Read text',
	'No hay acceso al texto disponible para esta obra.': 'No text access is available for this work.',
	'No hay información de autoría disponible.': 'No authorship information is available.',
	'No apunta hacia ningún autor': 'Does not point to any author',
	'El análisis no apunta hacia ningún autor': 'The analysis does not point to any author',
	'No concluyente': 'Inconclusive',
	'Segura': 'Secure',
	'Probable': 'Probable',
	'Posible': 'Possible',
	'Sin datos': 'No data',
	'Desconocido': 'Unknown author',
	'No disponible': 'Not available',
	'No disponible.': 'Not available.',
	'Cargando resumen...': 'Loading summary...',
	'No se pudo cargar el resumen breve.': 'The short summary could not be loaded.',
	'No se encontraron obras que coincidan con los criterios de búsqueda.': 'No works matching the search criteria were found.',
	'No hay obras que coincidan con el filtro actual.': 'No works match the current filter.',
	'No hay distancias disponibles para este informe.': 'No distances are available for this report.',
	'No hay obras cercanas disponibles en este ámbito.': 'No close works are available for this scope.',
	'No hay referencias disponibles para este informe.': 'No references are available for this report.',
	'Obra completa': 'Complete work',
	'Jornada 1': 'Act 1',
	'Jornada 2': 'Act 2',
	'Jornada 3': 'Act 3',
	'Jornada 4': 'Act 4',
	'Jornada 5': 'Act 5',
	'Página anterior': 'Previous page',
	'Página siguiente': 'Next page',
	'Paginación de obras': 'Works pagination',
	'Vista de resultados': 'Results view',
	'Tarjetas': 'Cards',
	'Tabla': 'Table',
	'Ver más': 'Show more',
	'Ver menos': 'Show less',
	'Posición': 'Position',
	'Distancia': 'Distance',
	'Resumen breve automático': 'Short automatic summary',
	'Personajes principales': 'Main characters',
	'Espacios principales': 'Main settings',
	'Temáticas principales': 'Main themes',
	'Aviso y cita': 'Notice and citation',
	'Obras relacionadas con el autor': 'Works related to the author',
	'Obras respaldadas por la tradición': 'Works supported by tradition',
	'Obras respaldadas por la estilometría': 'Works supported by stylometry',
	'Obras respaldadas solo por la tradición': 'Works supported only by tradition',
	'Novedades respaldadas por la estilometría': 'New attributions supported by stylometry',
	'Escribe y selecciona géneros': 'Type and select genres',
	'Escribe y selecciona autores': 'Type and select authors',
	'Selecciona uno o varios niveles': 'Select one or more levels',
	'Cualquiera': 'Any',
	'Escribe y selecciona estados': 'Type and select states',
	'Escribe y selecciona títulos': 'Type and select titles',
	'Término cercano': 'Nearby term',
	'Distancia máxima en palabras intermedias': 'Maximum distance in intervening words',
	'Quitar opción': 'Remove option',
	'Añadir opción': 'Add option',
	'Cerrar modal': 'Close modal',
	'Cerrar guía': 'Close guide',
	'Guía de búsqueda en TEXORO': 'TEXORO search guide',
	'Obras de TEXORO': 'TEXORO works',
	'Autores de TEXORO': 'TEXORO authors',
	'Guía de búsqueda': 'Search guide',
	'Indicadores de TEXORO': 'TEXORO indicators',
	'Obras indexadas': 'Indexed works',
	'Palabras indexadas': 'Indexed words',
	'Ver listado de obras indexadas': 'View the list of indexed works',
	'Ver listado de autores': 'View the list of authors',
	'Buscar en TEXORO': 'Search in TEXORO',
	'Busca por palabras del título.': 'Search by words in the title.',
	'Atribución': 'Attribution',
	'Más filtros': 'More filters',
	'Filtros de autoría': 'Authorship filters',
	'Filtros técnicos': 'Technical filters',
	'Nivel de confianza': 'Confidence level',
	'Tipo de autoría': 'Authorship type',
	'Búsqueda principal': 'Main search',
	'Términos adicionales': 'Additional terms',
	'Cada término puede ser una palabra, frase o patrón.': 'Each term can be a word, phrase, or pattern.',
	'Principal + adicionales': 'Main + additional',
	'Principal + algún adicional': 'Main + any additional',
	'Añadir términos adicionales': 'Add additional terms',
	'Proximidad respecto a la búsqueda principal': 'Proximity to the main search',
	'Busca términos cercanos a la palabra o frase principal.': 'Search for terms near the main word or phrase.',
	'Todas las condiciones': 'All conditions',
	'Basta con una': 'One is enough',
	'Añadir términos de distancia': 'Add distance terms',
	'Filtros': 'Filters',
	'Limpiar campos': 'Clear fields',
	'Coincidencia': 'Match',
	'Todos': 'All',
	'Ayuda sobre': 'Help for',
	'Selecciona una o varias obras para limitar la búsqueda textual a esos títulos.':
		'Select one or more works to limit the text search to those titles.',
	'Selecciona uno o varios géneros para limitar los resultados.':
		'Select one or more genres to limit the results.',
	'Selecciona uno o varios géneros. Puedes escribir para filtrar opciones.':
		'Select one or more genres. You can type to filter options.',
	'Permite multiselección de autores. Este campo se desactiva si usas Atribución tradicional o estilometría en Más filtros.':
		'Allows multiple author selection. This field is disabled if you use Traditional attribution or stylometry in More filters.',
	'Autores propuestos por la tradición filológica.': 'Authors proposed by the philological tradition.',
	'Autores sugeridos por el análisis estilométrico.': 'Authors suggested by the stylometric analysis.',
	'Autores propuestos desde la tradición filológica. Puedes seleccionar varios.':
		'Authors proposed by the philological tradition. You can select several.',
	'Autores propuestos a partir del análisis estilométrico. Puedes seleccionar varios.':
		'Authors proposed by the stylometric analysis. You can select several.',
	'Filtra por el grado de certeza de la atribución resultante del análisis estilométrico.':
		'Filter by the certainty level of the attribution resulting from the stylometric analysis.',
	'Deja este campo en Cualquiera para mostrar obras de cualquier tipo de autoría. Puedes filtrar por obras de un solo autor (Única) o de varios autores (Colaboración).':
		'Leave this field as Any to show works of any authorship type. You can filter by single-author works (Single) or multi-author works (Collaboration).',
	'Selecciona uno o varios estados del texto utilizado para el análisis estilométrico.':
		'Select one or more statuses of the text used for the stylometric analysis.',
	'Incluye obras añadidas o modificadas desde esta fecha.':
		'Includes works added or modified from this date.',
	'Incluye obras añadidas o modificadas hasta esta fecha.':
		'Includes works added or modified up to this date.',
	'Limita los resultados al estado del texto utilizado en TEXORO.':
		'Limit results to the status of the text used in TEXORO.',
	'Busca una palabra, frase exacta o patrón con comodines':
		'Search for a word, exact phrase, or wildcard pattern',
	'Si escribes varias': 'If you enter several',
	'Si escribes varias palabras, se buscan como frase exacta.':
		'If you enter several words, they are searched as an exact phrase.',
	'Añade términos y condiciones de cercanía sin escribir operadores. El límite total es de':
		'Add terms and proximity conditions without writing operators. The total limit is',
	'condiciones contando la búsqueda principal.': 'conditions, counting the main search.',
	'Modo de combinación de términos adicionales': 'Combination mode for additional terms',
	'Modo de combinación de condiciones de proximidad': 'Combination mode for proximity conditions',
	'OR muestra obras con cualquiera de los autores seleccionados. AND exige que estén todos.':
		'OR shows works with any of the selected authors. AND requires all of them.',
	'Búsqueda textual': 'Text search',
	'Consulta': 'Query',
	'Frecuencia': 'Frequency',
	'Ocurrencias': 'Occurrences',
	'Exportar resultados filtrados': 'Export filtered results',
	'Ver más ocurrencias de': 'View more occurrences of',
	'Ocurrencias de': 'Occurrences of',
	'Cargando resultados...': 'Loading results...',
	'Ejemplos: amor | amor constante | honor*': 'Examples: love | constant love | honor*',
	'Escribe una palabra y pulsa Enter...': 'Enter a word and press Enter...',
	'Ej: La dama boba, Don Gil de las calzas verdes...': 'E.g.: La dama boba, Don Gil de las calzas verdes...',
	'Ej: cada paso peligro, verdades amor...': 'E.g.: cada paso peligro, verdades amor...',
	'Ej: La monja alférez, El castigo sin venganza...': 'E.g.: La monja alférez, El castigo sin venganza...',
	'Sin acceso al texto': 'No text access',
	'Obras de Examen de autorías': 'Examen de autorías works',
	'Dramaturgos de Examen de autorías': 'Examen de autorías playwrights',
	'Biblioteca Textual Siglo de Oro': 'Golden Age Textual Library',
	'Biblioteca Textual Siglo de Oro: textos digitales en acceso abierto para lectura, consulta e investigación.':
		'Golden Age Textual Library: open-access digital texts for reading, consultation, and research.',
	'acceso en abierto a textos digitales del Siglo de Oro': 'open access to Golden Age digital texts',
	'conseguidos, en su mayoría, a partir de transcripciones automáticas de impresos y manuscritos antiguos. La colección reúne obras producidas para los análisis estilométricos de autoría y materiales incorporados gracias a la colaboración de especialistas, colegas y estudiantes.':
		'obtained mostly from automatic transcriptions of old printed books and manuscripts. The collection brings together works produced for stylometric authorship analyses and materials incorporated through collaboration with specialists, colleagues, and students.',
	'Los textos deben': 'The texts must',
	'entenderse como versiones de trabajo': 'be understood as working versions',
	': no sustituyen a las ediciones críticas, pueden contener errores de transcripción y presentan una calidad desigual según la fuente y el estado de revisión. En su estado actual, se ofrecen sin nombres de personajes ni acotaciones escénicas. La colección permanece abierta a correcciones, ampliaciones y mejoras.':
		': they do not replace critical editions, may contain transcription errors, and vary in quality depending on the source and review status. In their current state, they are offered without character names or stage directions. The collection remains open to corrections, additions, and improvements.',
	'Listado alfabético de las obras con texto digital BITESO. Usa el buscador para localizar una obra y entrar directamente en su texto.':
		'Alphabetical list of works with a BITESO digital text. Use the search field to find a work and go directly to its text.',
	'Buscar obra': 'Search work',
	'No hay textos que coincidan con la búsqueda.': 'No texts match the search.',
	'textos visibles': 'visible texts',
	'Búsquedas textuales en 3000 obras del Siglo de Oro': 'Text searches across 3,000 Golden Age plays',
	'Consulta informes estilométricos y relaciones de autoría en un corpus de obras teatrales del Siglo de Oro.':
		'Search stylometric reports and authorship relations in a corpus of Golden Age plays.',
	'Búsquedas textuales complejas en TEXORO, un corpus del Siglo de Oro con millones de palabras indexadas.':
		'Complex textual searches in TEXORO, a Golden Age corpus with millions of indexed words.',
	'Estilometría aplicada al teatro del Siglo de Oro: examen de autorías, TEXORO, BITESO, resúmenes automáticos y recursos digitales para la investigación.':
		"Stylometry applied to Golden Age theatre: Examen de autorías, TEXORO, BITESO, automatic summaries, and digital research resources.",
	'Consulta los informes estilométricos de 3000 obras teatrales del Siglo de Oro':
		'Search the stylometric reports for 3,000 Golden Age plays',
	'Realiza búsquedas textuales complejas en un corpus del Siglo de Oro de 38 millones de palabras':
		'Run complex textual searches in a 38-million-word Golden Age corpus',
	'Consulta más de 1500 textos digitales del Siglo de Oro en acceso abierto':
		'Access more than 1,500 open-access digital Golden Age texts',
	'Consulta los resúmenes automáticos de todas las obras de la base de datos':
		'Consult the automatic summaries for all works in the database',
	'Visualiza la red de relaciones estilométricas para las 3000 obras del corpus':
		'Visualize the network of stylometric relations for the 3,000 works in the corpus',
	'Visualización de análisis estilométrico del proyecto ETSO': 'Visualization of ETSO stylometric analysis',
	'Interfaz de búsqueda textual de TEXORO': 'TEXORO text-search interface',
	'Biblioteca digital BITESO': 'BITESO digital library',
	'Resúmenes automáticos de las obras': 'Automatic work summaries',
	'Red estilométrica del proyecto ETSO': 'ETSO stylometric network',
	'Grafo de relaciones estilométricas del proyecto ETSO': 'Graph of ETSO stylometric relations',
	'Panel de informes estilométricos de ETSO': 'ETSO stylometric reports panel',
	'El proyecto': 'The project',
	'surge del interés del investigador': 'arises from the interest of researcher',
	'(Universitat Autònoma de Barcelona) y del catedrático':
		'(Universitat Autònoma de Barcelona) and professor',
	'(Universidad de Valladolid) en aplicar las nuevas herramientas informáticas a los numerosos problemas':
		'(University of Valladolid) in applying new computational tools to the many',
	'de autoría que presenta el teatro del Siglo de Oro español. Este portal trata de ofrecer análisis que':
		'authorship problems posed by Spanish Golden Age theatre. This portal aims to offer analyses that',
	'puedan arrojar luz sobre las atribuciones de la vasta producción teatral del periodo aurisecular.':
		'can shed light on attributions across the vast theatrical production of the Golden Age.',
	'frecuencias en léxico más cercanas a las del texto que nos interesa en el corpus del que dispongamos.':
		'lexical frequencies closest to those of the text under study within the available corpus.',
	'Cada autor usa las palabras en unas proporciones distintas, por lo que las obras suelen relacionarse en':
		'Each author uses words in different proportions, so works tend to be related according to',
	'función de su autoría. Bien es cierto que debemos ser siempre precavidos por otras relaciones que pueden':
		'their authorship. Nevertheless, we must always be cautious about other relationships that may',
	'estarse produciendo por razón del género literario, la temática, la datación, la procedencia, el estado':
		'arise because of literary genre, subject matter, dating, source, textual condition,',
	'del texto, etc.': 'and other factors.',
	'Se pueden consultar aquí ejemplos en los que la estilometría ratifica la atribución tradicional, como':
		'Here you can consult examples in which stylometry confirms the traditional attribution, such as',
	'y también casos en los que la estilometría apunta hacia una autoría inesperada y potencialmente esclarecedora, como en':
		'and also cases in which stylometry points to an unexpected and potentially illuminating authorship, such as',
	'Debemos tener en cuenta que las nuevas':
		'We must bear in mind that the new',
	'atribuciones aquí señaladas son meros indicios de autoría arrojados por el proceso informático de forma':
		'attributions indicated here are merely authorship clues produced automatically by the computational process.',
	'automática. Todos los casos deben ser estudiados pormenorizadamente desde la filología atendiendo a sus':
		'All cases must be studied in detail from a philological perspective, taking into account their',
	'complejidades particulares.': 'particular complexities.',
	'Humanidades digitales': 'Digital humanities',
	'Estilometría, Inteligencia Artificial, Transcripción automática (HTR)...':
		'Stylometry, Artificial Intelligence, automatic transcription (HTR)...',
	'podemos relacionar los textos por sus usos': 'we can relate texts through their',
	'nos posibilita transcribir y modernizar': 'allows us to transcribe and modernize',
	'impresos y manuscritos antiguos automáticamente con un alto grado de acierto.':
		'old printed books and manuscripts automatically with a high degree of accuracy.',
	'Además, empleamos otras técnicas estilométricas o de Inteligencia Artificial para tratar los textos.':
		'We also use other stylometric and artificial-intelligence techniques to process texts.',
	'TEXORO: Textos del Siglo de Oro': 'TEXORO: Golden Age Texts',
	'Textos digitales del Siglo de Oro en acceso abierto': 'Open-access digital Golden Age texts',
	'BITESO reúne y pone en acceso abierto una amplia colección de textos digitales del Siglo de Oro.':
		'BITESO brings together and provides open access to a broad collection of Golden Age digital texts.',
	'El recurso nace, en buena medida, de las transcripciones automáticas de impresos y manuscritos realizadas para los análisis estilométricos de autoría, así como de materiales revisados, facilitados o contrastados gracias a la colaboración de distintos especialistas.':
		'The resource largely stems from automatic transcriptions of printed books and manuscripts produced for stylometric authorship analyses, together with materials reviewed, provided, or checked through collaboration with specialists.',
	'Su objetivo es ofrecer a la comunidad un punto de acceso sencillo a textos que, en muchos casos, permanecían contenidos en documentos antiguos, de difícil manejo o lectura.':
		'Its aim is to offer the community a simple access point to texts that in many cases remained inside old documents that were difficult to handle or read.',
	'Los textos incorporados a BITESO no aspiran a sustituir a las ediciones críticas ni presentan siempre la misma calidad ecdótica.':
		'The texts included in BITESO are not intended to replace critical editions and do not always have the same editorial quality.',
	'Además, en su estado actual no incluyen los nombres de los personajes ni las acotaciones escénicas, sino únicamente los versos limpios de cada obra.':
		'In their current state, they do not include character names or stage directions, but only the clean verse text of each work.',
	'Sin embargo, constituyen materiales útiles para la lectura, la consulta, la docencia, la investigación filológica y la exploración computacional del patrimonio literario aurisecular.':
		'Even so, they are useful materials for reading, consultation, teaching, philological research, and computational exploration of Golden Age literary heritage.',
	'¿Cómo te podemos ayudar? ¿Cómo nos puedes ayudar?': 'How can we help you? How can you help us?',
	'Podemos ayudarte a explorar los distintos recursos disponibles para el estudio del teatro y la literatura del Siglo de Oro.':
		'We can help you explore the different resources available for the study of Golden Age theatre and literature.',
	'En Examen de autorías se pueden consultar los informes estilométricos de las obras incorporadas al corpus, con indicios sobre sus posibles relaciones de autoría.':
		'In Examen de autorías you can consult stylometric reports for the works included in the corpus, with clues about possible authorship relations.',
	'TEXORO permite realizar búsquedas textuales sobre cerca de 3000 obras y más de 38 millones de palabras, con opciones para localizar palabras, frases, patrones, combinaciones de términos y relaciones de proximidad.':
		'TEXORO enables text searches across nearly 3,000 works and more than 38 million words, with options for locating words, phrases, patterns, term combinations, and proximity relations.',
	'Además, los resúmenes automáticos permiten obtener una primera orientación sobre el argumento y el contenido de las obras, siempre como ayuda inicial y no como sustituto de la lectura o del análisis filológico.':
		'Automatic summaries also provide an initial orientation to the plot and contents of the works, always as a preliminary aid and not as a substitute for reading or philological analysis.',
	'También puedes colaborar con nosotros enviándonos textos del Siglo de Oro que todavía no estén incorporados a nuestros recursos, información bibliográfica, noticias sobre atribuciones, datos sobre testimonios o cualquier material que pueda mejorar el conjunto.':
		'You can also collaborate with us by sending Golden Age texts that are not yet included in our resources, bibliographic information, news about attributions, data on textual witnesses, or any material that can improve the collection.',
	'La colaboración de investigadores, docentes y especialistas resulta fundamental para seguir ampliando, revisando y corrigiendo la información disponible.':
		'The collaboration of researchers, teachers, and specialists is essential for continuing to expand, review, and correct the available information.',
	'Por ello, si encuentras errores, erratas, problemas en los textos, fallos en los resúmenes automáticos o datos que puedan precisarse mejor, te agradeceremos que nos envíes tus sugerencias de corrección.':
		'If you find errors, typos, textual problems, issues in the automatic summaries, or data that could be refined, we would be grateful if you sent us correction suggestions.',
	'Citar nuestros recursos en publicaciones, trabajos académicos o actividades docentes también nos ayuda a difundir el proyecto y a obtener el apoyo necesario para mantenerlo y ampliarlo.':
		'Citing our resources in publications, academic work, or teaching activities also helps us disseminate the project and obtain the support needed to maintain and expand it.',
	'Contacta con nosotros': 'Contact us',
	'consultar de forma unificada un amplio corpus de obras del Siglo de Oro':
		'search a large corpus of Golden Age works in a unified way',
	'El recurso reúne cerca de 3000 textos, con más de 38 millones de palabras indexadas y obras de más de 400 autores, y ofrece distintas posibilidades para explorar el patrimonio literario aurisecular desde criterios léxicos, textuales y documentales.':
		'The resource brings together nearly 3,000 texts, with more than 38 million indexed words and works by more than 400 authors, and offers several ways to explore Golden Age literary heritage through lexical, textual, and documentary criteria.',
	'El buscador permite localizar palabras, frases exactas y patrones con comodines, así como realizar consultas avanzadas mediante la combinación de términos, condiciones de proximidad y filtros por título, género, atribución tradicional, atribución estilométrica o estado del texto.':
		'The search engine can locate words, exact phrases, and wildcard patterns, and it also supports advanced queries that combine terms, proximity conditions, and filters by title, genre, traditional attribution, stylometric attribution, or text status.',
	'búsquedas puntuales como exploraciones más complejas':
		'targeted searches and more complex explorations',
	'sobre la presencia, distribución y relación de palabras o expresiones en el conjunto del corpus.':
		'of the presence, distribution, and relationship of words or expressions across the corpus.',
	'Esta página web ha sido desarrollada gracias a la financiación principal de:':
		'This website has been developed thanks to the main funding provided by:',
	'Con el apoyo complementario de:': 'With complementary support from:',
	'Logo de Thal-IA': 'Thal-IA logo'
};

const esToFr: Record<string, string> = {
	'ETSO: Estilometría aplicada al Teatro del Siglo de Oro': 'ETSO : Stylométrie appliquée au théâtre du Siècle d’or',
	'Inicio': 'Accueil',
	'Más información': "Plus d'information",
	'Examen de autorías': 'Examen de autorías',
	'Análisis estilométrico de obras teatrales del Siglo de Oro': "Analyse stylométrique de pièces du Siècle d'or",
	'Obras': 'Œuvres',
	'Autores': 'Auteurs',
	'Dramaturgos': 'Dramaturges',
	'Resúmenes': 'Résumés',
	'Resumen': 'Résumé',
	'Resumen automático': 'Résumé automatique',
	'Resumen automático breve': 'Résumé automatique bref',
	'Resumen automático amplio': 'Résumé automatique étendu',
	'Resúmenes automáticos': 'Résumés automatiques',
	'Red estilométrica': 'Réseau stylométrique',
	'Red de obras (BETA)': "Réseau d'œuvres (BETA)",
	'Red 3D': 'Réseau 3D',
	'Cómo citarnos': 'Comment nous citer',
	'Transcripciones automáticas': 'Transcriptions automatiques',
	'Equipo': 'Équipe',
	'Contacto': 'Contact',
	'Derechos y licencias': 'Droits et licences',
	'Política de privacidad': 'Politique de confidentialité',
	'Acceso restringido': 'Accès restreint',
	'Ficha de obra': "Fiche d'œuvre",
	'Ficha de autor': "Fiche d'auteur",
	'Texto digital': 'Texte numérique',
	'Informe': 'Rapport',
	'Informe estilométrico': 'Rapport stylométrique',
	'Descarga informe': 'Télécharger le rapport',
	'Descargar XLSX': 'Télécharger XLSX',
	'Descargar BibTeX': 'Télécharger BibTeX',
	'Descargar todas las referencias en BibTeX': 'Télécharger toutes les références en BibTeX',
	'Descargar TXT': 'Télécharger TXT',
	'Descargar texto en TXT': 'Télécharger le texte en TXT',
	'Descargar resumen en TXT': 'Télécharger le résumé en TXT',
	'Descargar datos del informe en XLSX': 'Télécharger les données du rapport au format XLSX',
	'Atribución de autoría': "Attribution d'auteur",
	'Atribución tradicional': 'Attribution traditionnelle',
	'Atribución estilometría': 'Attribution stylométrique',
	'Atribución estilométrica': 'Attribution stylométrique',
	'Género': 'Genre',
	'Procedencia': 'Source',
	'Obras más cercanas': 'Œuvres les plus proches',
	'Resultados': 'Résultats',
	'Resultados de búsqueda': 'Résultats de recherche',
	'Referencias': 'Références',
	'Recursos': 'Ressources',
	'Referencias bibliográficas recomendadas para citar ETSO, TEXORO, CETSO y los recursos del proyecto.':
		'Références bibliographiques recommandées pour citer ETSO, TEXORO, CETSO et les ressources du projet.',
	'Para poder seguir nuestra labor es importante que el trabajo del proyecto sea citado. Por favor, incluye en la bibliografía alguna de estas referencias si el portal te ha ayudado en tu investigación.':
		'Pour nous permettre de poursuivre notre travail, il est important que le projet soit cité. Veuillez inclure l’une de ces références dans votre bibliographie si le portail vous a aidé dans vos recherches.',
	'Esta página recoge una selección de trabajos que hacen uso de los resultados, recursos y materiales del proyecto ETSO. Incluye referencias vinculadas con la estilometría, la atribución de autoría, la transcripción automática, TEXORO y otros desarrollos derivados o relacionados con el proyecto.':
		'Cette page rassemble une sélection de travaux qui utilisent les résultats, les ressources et les matériaux du projet ETSO. Elle comprend des références liées à la stylométrie, à l’attribution d’auteur, à la transcription automatique, à TEXORO et à d’autres développements dérivés du projet ou en lien avec lui.',
	'referencias seleccionadas': 'références sélectionnées',
	'Para entender los procesos aquí seguidos, puedes consultar:':
		'Pour comprendre les procédures suivies ici, vous pouvez consulter :',
	'Se puede obtener más información sobre cómo trabaja ETSO en las tareas de atribución de obras dramáticas del Siglo de Oro en:':
		'On trouvera davantage d’informations sur la manière dont ETSO travaille sur l’attribution des œuvres dramatiques du Siècle d’or dans :',
	'Proyecto': 'Projet',
	'Algunos trabajos': 'Quelques travaux',
	'Nuestros trabajos': 'Nos travaux',
	'Trabajos relacionados con el proyecto': 'Travaux liés au projet',
	'Selección de trabajos de otros investigadores relacionados con ETSO, TEXORO, la estilometría, la transcripción automática y el teatro del Siglo de Oro.':
		'Sélection de travaux d’autres chercheurs liés à ETSO, TEXORO, à la stylométrie, à la transcription automatique et au théâtre du Siècle d’or.',
	'Modelos para la transcripción automática': 'Modèles pour la transcription automatique',
	'Cita sugerida': 'Citation suggérée',
	'Copiar cita': 'Copier la citation',
	'Cita copiada.': 'Citation copiée.',
	'No hay cita disponible.': 'Aucune citation disponible.',
	'No se pudo copiar.': 'Impossible de copier.',
	'No se pudo copiar automáticamente.': 'Impossible de copier automatiquement.',
	'Aviso': 'Avis',
	'Licencia': 'Licence',
	'Licencias de contenido': 'Licences de contenu',
	'privacidad': 'confidentialité',
	'Desarrollo web:': 'Développement web :',
	'Navegación': 'Navigation',
	'Información': 'Information',
	'Dirección:': 'Direction :',
	'Buscar': 'Rechercher',
	'Cargando...': 'Chargement...',
	'Acceder': 'Accéder',
	'Ver diapositiva anterior': 'Diapositive précédente',
	'Ver diapositiva siguiente': 'Diapositive suivante',
	'Ir a la diapositiva': 'Aller à la diapositive',
	'Secciones destacadas de ETSO': 'Sections mises en avant d’ETSO',
	'Carrusel de secciones destacadas': 'Carrousel des sections mises en avant',
	'Buscando': 'Recherche en cours',
	'Preparando resultados': 'Préparation des résultats',
	'Buscar en Examen de autorías': "Rechercher dans Examen de autorías",
	'Filtra las obras del corpus por título, género, atribuciones, estado textual y fecha de incorporación.':
		"Filtrez les œuvres du corpus par titre, genre, attributions, état textuel et date d'incorporation.",
	'Para combinar varios términos o buscar cercanías, abre la búsqueda avanzada.':
		'Pour combiner plusieurs termes ou rechercher des proximités, ouvrez la recherche avancée.',
	'Búsqueda avanzada': 'Recherche avancée',
	'Búsqueda básica': 'Recherche de base',
	'Uso del buscador textual y de sus opciones avanzadas.': 'Utilisation du moteur de recherche textuelle et de ses options avancées.',
	'Qué hace el buscador': 'Ce que fait le moteur de recherche',
	'TEXORO busca palabras, frases exactas y patrones en el corpus. Primero localiza obras candidatas con índices de búsqueda y, cuando hace falta, verifica los textos para confirmar coincidencias y preparar contextos de lectura.':
		'TEXORO recherche des mots, des phrases exactes et des motifs dans le corpus. Il repère d’abord les œuvres candidates au moyen des index de recherche puis, si nécessaire, vérifie les textes pour confirmer les occurrences et préparer les contextes de lecture.',
	'Hemos generado resúmenes automáticos de las obras incluidas en la base de datos de ETSO. Estos textos ofrecen una primera orientación sobre el argumento y el contenido de cada obra, aunque deben entenderse como una ayuda inicial y no como sustituto de la lectura ni del análisis filológico.':
		"Nous avons généré des résumés automatiques des œuvres incluses dans la base de données d'ETSO. Ces textes offrent une première orientation sur l'intrigue et le contenu de chaque œuvre, mais doivent être compris comme une aide initiale et non comme un substitut à la lecture ou à l'analyse philologique.",
	'Puedes acceder al resumen de cada obra desde este listado o desde la ficha individual de la obra, clicando en el acceso al resumen automático.':
		"Vous pouvez accéder au résumé de chaque œuvre depuis cette liste ou depuis la fiche individuelle de l'œuvre, en cliquant sur l'accès au résumé automatique.",
	'Buscar en los resúmenes': 'Rechercher dans les résumés',
	'Escribe al menos dos caracteres y pulsa Enter.': 'Saisissez au moins deux caractères et appuyez sur Entrée.',
	'Buscando resúmenes... La primera búsqueda puede tardar un poco.':
		'Recherche dans les résumés... La première recherche peut prendre un moment.',
	'No hay resúmenes que contengan esas palabras.': 'Aucun résumé ne contient ces mots.',
	'Buscar obra por título': 'Rechercher une œuvre par titre',
	'No hay obras que coincidan con la búsqueda.': 'Aucune œuvre ne correspond à la recherche.',
	'Buscar por título': 'Rechercher par titre',
	'Filtrar por género': 'Filtrer par genre',
	'Todos los géneros': 'Tous les genres',
	'Título': 'Titre',
	'Texto empleado': 'Texte utilisé',
	'Estado del texto': 'État du texte',
	'Fecha de adición o modificación': "Date d'ajout ou de modification",
	'Fecha de adición o modificación (desde)': "Date d'ajout ou de modification (depuis)",
	'Fecha de adición o modificación (hasta)': "Date d'ajout ou de modification (jusqu'à)",
	'Texto': 'Texte',
	'Acceso al texto': 'Accès au texte',
	'Leer texto': 'Lire le texte',
	'No hay acceso al texto disponible para esta obra.': "Aucun accès au texte n'est disponible pour cette œuvre.",
	'No hay información de autoría disponible.': "Aucune information d'attribution n'est disponible.",
	'No apunta hacia ningún autor': 'Ne pointe vers aucun auteur',
	'El análisis no apunta hacia ningún autor': "L'analyse ne pointe vers aucun auteur",
	'No concluyente': 'Non concluant',
	'Segura': 'Certaine',
	'Probable': 'Probable',
	'Posible': 'Possible',
	'Sin datos': 'Sans données',
	'Desconocido': 'Auteur inconnu',
	'No disponible': 'Non disponible',
	'No disponible.': 'Non disponible.',
	'Cargando resumen...': 'Chargement du résumé...',
	'No se pudo cargar el resumen breve.': "Le résumé bref n'a pas pu être chargé.",
	'No se encontraron obras que coincidan con los criterios de búsqueda.': 'Aucune œuvre ne correspond aux critères de recherche.',
	'No hay obras que coincidan con el filtro actual.': 'Aucune œuvre ne correspond au filtre actuel.',
	'No hay distancias disponibles para este informe.': 'Aucune distance disponible pour ce rapport.',
	'No hay obras cercanas disponibles en este ámbito.': 'Aucune œuvre proche disponible pour ce périmètre.',
	'No hay referencias disponibles para este informe.': 'Aucune référence disponible pour ce rapport.',
	'Obra completa': 'Œuvre complète',
	'Jornada 1': 'Journée 1',
	'Jornada 2': 'Journée 2',
	'Jornada 3': 'Journée 3',
	'Jornada 4': 'Journée 4',
	'Jornada 5': 'Journée 5',
	'Página anterior': 'Page précédente',
	'Página siguiente': 'Page suivante',
	'Paginación de obras': 'Pagination des œuvres',
	'Vista de resultados': 'Vue des résultats',
	'Tarjetas': 'Cartes',
	'Tabla': 'Tableau',
	'Ver más': 'Voir plus',
	'Ver menos': 'Voir moins',
	'Posición': 'Position',
	'Distancia': 'Distance',
	'Resumen breve automático': 'Résumé automatique bref',
	'Personajes principales': 'Personnages principaux',
	'Espacios principales': 'Espaces principaux',
	'Temáticas principales': 'Thèmes principaux',
	'Aviso y cita': 'Avis et citation',
	'Obras relacionadas con el autor': "Œuvres liées à l'auteur",
	'Obras respaldadas por la tradición': 'Œuvres appuyées par la tradition',
	'Obras respaldadas por la estilometría': 'Œuvres appuyées par la stylométrie',
	'Obras respaldadas solo por la tradición': 'Œuvres appuyées uniquement par la tradition',
	'Novedades respaldadas por la estilometría': 'Nouvelles attributions appuyées par la stylométrie',
	'Escribe y selecciona géneros': 'Saisissez et sélectionnez des genres',
	'Escribe y selecciona autores': 'Saisissez et sélectionnez des auteurs',
	'Selecciona uno o varios niveles': 'Sélectionnez un ou plusieurs niveaux',
	'Cualquiera': "N'importe lequel",
	'Escribe y selecciona estados': 'Saisissez et sélectionnez des états',
	'Escribe y selecciona títulos': 'Saisissez et sélectionnez des titres',
	'Término cercano': 'Terme proche',
	'Distancia máxima en palabras intermedias': 'Distance maximale en mots intermédiaires',
	'Quitar opción': "Retirer l'option",
	'Añadir opción': 'Ajouter une option',
	'Cerrar modal': 'Fermer la fenêtre',
	'Cerrar guía': 'Fermer le guide',
	'Guía de búsqueda en TEXORO': 'Guide de recherche dans TEXORO',
	'Obras de TEXORO': 'Œuvres de TEXORO',
	'Autores de TEXORO': 'Auteurs de TEXORO',
	'Guía de búsqueda': 'Guide de recherche',
	'Indicadores de TEXORO': 'Indicateurs de TEXORO',
	'Obras indexadas': 'Œuvres indexées',
	'Palabras indexadas': 'Mots indexés',
	'Ver listado de obras indexadas': 'Voir la liste des œuvres indexées',
	'Ver listado de autores': 'Voir la liste des auteurs',
	'Buscar en TEXORO': 'Rechercher dans TEXORO',
	'Busca por palabras del título.': 'Recherche par mots du titre.',
	'Atribución': 'Attribution',
	'Más filtros': 'Plus de filtres',
	'Filtros de autoría': "Filtres d'attribution",
	'Filtros técnicos': 'Filtres techniques',
	'Nivel de confianza': 'Niveau de confiance',
	'Tipo de autoría': "Type d'attribution",
	'Búsqueda principal': 'Recherche principale',
	'Términos adicionales': 'Termes additionnels',
	'Cada término puede ser una palabra, frase o patrón.': 'Chaque terme peut être un mot, une phrase ou un motif.',
	'Principal + adicionales': 'Principal + additionnels',
	'Principal + algún adicional': 'Principal + un additionnel',
	'Añadir términos adicionales': 'Ajouter des termes additionnels',
	'Proximidad respecto a la búsqueda principal': 'Proximité par rapport à la recherche principale',
	'Busca términos cercanos a la palabra o frase principal.': 'Recherchez des termes proches du mot ou de la phrase principale.',
	'Todas las condiciones': 'Toutes les conditions',
	'Basta con una': 'Une seule suffit',
	'Añadir términos de distancia': 'Ajouter des termes de distance',
	'Filtros': 'Filtres',
	'Limpiar campos': 'Effacer les champs',
	'Coincidencia': 'Correspondance',
	'Todos': 'Tous',
	'Ayuda sobre': 'Aide sur',
	'Selecciona una o varias obras para limitar la búsqueda textual a esos títulos.':
		'Sélectionnez une ou plusieurs œuvres pour limiter la recherche textuelle à ces titres.',
	'Selecciona uno o varios géneros para limitar los resultados.':
		'Sélectionnez un ou plusieurs genres pour limiter les résultats.',
	'Selecciona uno o varios géneros. Puedes escribir para filtrar opciones.':
		'Sélectionnez un ou plusieurs genres. Vous pouvez saisir du texte pour filtrer les options.',
	'Permite multiselección de autores. Este campo se desactiva si usas Atribución tradicional o estilometría en Más filtros.':
		"Permet la sélection multiple d'auteurs. Ce champ est désactivé si vous utilisez Attribution traditionnelle ou stylométrie dans Plus de filtres.",
	'Autores propuestos por la tradición filológica.': 'Auteurs proposés par la tradition philologique.',
	'Autores sugeridos por el análisis estilométrico.': "Auteurs suggérés par l'analyse stylométrique.",
	'Autores propuestos desde la tradición filológica. Puedes seleccionar varios.':
		'Auteurs proposés par la tradition philologique. Vous pouvez en sélectionner plusieurs.',
	'Autores propuestos a partir del análisis estilométrico. Puedes seleccionar varios.':
		"Auteurs proposés à partir de l'analyse stylométrique. Vous pouvez en sélectionner plusieurs.",
	'Filtra por el grado de certeza de la atribución resultante del análisis estilométrico.':
		"Filtre selon le degré de certitude de l'attribution issue de l'analyse stylométrique.",
	'Deja este campo en Cualquiera para mostrar obras de cualquier tipo de autoría. Puedes filtrar por obras de un solo autor (Única) o de varios autores (Colaboración).':
		"Laissez ce champ sur N'importe lequel pour afficher les œuvres de tout type d'attribution. Vous pouvez filtrer les œuvres d'un seul auteur (Unique) ou de plusieurs auteurs (Collaboration).",
	'Selecciona uno o varios estados del texto utilizado para el análisis estilométrico.':
		"Sélectionnez un ou plusieurs états du texte utilisé pour l'analyse stylométrique.",
	'Incluye obras añadidas o modificadas desde esta fecha.':
		'Inclut les œuvres ajoutées ou modifiées depuis cette date.',
	'Incluye obras añadidas o modificadas hasta esta fecha.':
		"Inclut les œuvres ajoutées ou modifiées jusqu'à cette date.",
	'Limita los resultados al estado del texto utilizado en TEXORO.':
		"Limite les résultats à l'état du texte utilisé dans TEXORO.",
	'Busca una palabra, frase exacta o patrón con comodines':
		'Recherchez un mot, une phrase exacte ou un motif avec jokers',
	'Si escribes varias': 'Si vous saisissez plusieurs',
	'Si escribes varias palabras, se buscan como frase exacta.':
		'Si vous saisissez plusieurs mots, ils sont recherchés comme une phrase exacte.',
	'Añade términos y condiciones de cercanía sin escribir operadores. El límite total es de':
		'Ajoutez des termes et des conditions de proximité sans écrire d’opérateurs. La limite totale est de',
	'condiciones contando la búsqueda principal.': 'conditions en comptant la recherche principale.',
	'Modo de combinación de términos adicionales': 'Mode de combinaison des termes additionnels',
	'Modo de combinación de condiciones de proximidad': 'Mode de combinaison des conditions de proximité',
	'OR muestra obras con cualquiera de los autores seleccionados. AND exige que estén todos.':
		'OR affiche les œuvres avec l’un des auteurs sélectionnés. AND exige qu’ils soient tous présents.',
	'Búsqueda textual': 'Recherche textuelle',
	'Consulta': 'Requête',
	'Frecuencia': 'Fréquence',
	'Ocurrencias': 'Occurrences',
	'Exportar resultados filtrados': 'Exporter les résultats filtrés',
	'Ver más ocurrencias de': "Voir plus d'occurrences de",
	'Ocurrencias de': 'Occurrences de',
	'Cargando resultados...': 'Chargement des résultats...',
	'Ejemplos: amor | amor constante | honor*': 'Exemples : amor | amor constante | honor*',
	'Escribe una palabra y pulsa Enter...': 'Saisissez un mot et appuyez sur Entrée...',
	'Ej: La dama boba, Don Gil de las calzas verdes...': 'Ex. : La dama boba, Don Gil de las calzas verdes...',
	'Ej: cada paso peligro, verdades amor...': 'Ex. : cada paso peligro, verdades amor...',
	'Ej: La monja alférez, El castigo sin venganza...': 'Ex. : La monja alférez, El castigo sin venganza...',
	'Sin acceso al texto': 'Pas d’accès au texte',
	'Obras de Examen de autorías': "Œuvres d’Examen de autorías",
	'Dramaturgos de Examen de autorías': "Dramaturges d’Examen de autorías",
	'Biblioteca Textual Siglo de Oro': "Bibliothèque textuelle du Siècle d'or",
	'Biblioteca Textual Siglo de Oro: textos digitales en acceso abierto para lectura, consulta e investigación.':
		"Bibliothèque textuelle du Siècle d'or : textes numériques en accès ouvert pour la lecture, la consultation et la recherche.",
	'acceso en abierto a textos digitales del Siglo de Oro': "un accès ouvert à des textes numériques du Siècle d'or",
	'conseguidos, en su mayoría, a partir de transcripciones automáticas de impresos y manuscritos antiguos. La colección reúne obras producidas para los análisis estilométricos de autoría y materiales incorporados gracias a la colaboración de especialistas, colegas y estudiantes.':
		"obtenus pour la plupart à partir de transcriptions automatiques d'imprimés et de manuscrits anciens. La collection réunit des œuvres produites pour les analyses stylométriques d'attribution et des matériaux intégrés grâce à la collaboration de spécialistes, collègues et étudiants.",
	'Los textos deben': 'Les textes doivent',
	'entenderse como versiones de trabajo': 'être compris comme des versions de travail',
	': no sustituyen a las ediciones críticas, pueden contener errores de transcripción y presentan una calidad desigual según la fuente y el estado de revisión. En su estado actual, se ofrecen sin nombres de personajes ni acotaciones escénicas. La colección permanece abierta a correcciones, ampliaciones y mejoras.':
		" : ils ne remplacent pas les éditions critiques, peuvent contenir des erreurs de transcription et présentent une qualité variable selon la source et l'état de révision. Dans leur état actuel, ils sont proposés sans noms de personnages ni didascalies. La collection reste ouverte aux corrections, extensions et améliorations.",
	'Listado alfabético de las obras con texto digital BITESO. Usa el buscador para localizar una obra y entrar directamente en su texto.':
		"Liste alphabétique des œuvres disposant d'un texte numérique BITESO. Utilisez le moteur de recherche pour trouver une œuvre et accéder directement à son texte.",
	'Buscar obra': 'Rechercher une œuvre',
	'No hay textos que coincidan con la búsqueda.': 'Aucun texte ne correspond à la recherche.',
	'textos visibles': 'textes visibles',
	'Búsquedas textuales en 3000 obras del Siglo de Oro': "Recherches textuelles dans 3000 pièces du Siècle d'or",
	'Consulta informes estilométricos y relaciones de autoría en un corpus de obras teatrales del Siglo de Oro.':
		"Consultez des rapports stylométriques et des relations d'attribution dans un corpus de pièces du Siècle d'or.",
	'Búsquedas textuales complejas en TEXORO, un corpus del Siglo de Oro con millones de palabras indexadas.':
		"Recherches textuelles complexes dans TEXORO, un corpus du Siècle d'or contenant des millions de mots indexés.",
	'Estilometría aplicada al teatro del Siglo de Oro: examen de autorías, TEXORO, BITESO, resúmenes automáticos y recursos digitales para la investigación.':
		"Stylométrie appliquée au théâtre du Siècle d’or : Examen de autorías, TEXORO, BITESO, résumés automatiques et ressources numériques pour la recherche.",
	'Consulta los informes estilométricos de 3000 obras teatrales del Siglo de Oro':
		"Consultez les rapports stylométriques de 3 000 pièces du Siècle d'or",
	'Realiza búsquedas textuales complejas en un corpus del Siglo de Oro de 38 millones de palabras':
		"Effectuez des recherches textuelles complexes dans un corpus du Siècle d'or de 38 millions de mots",
	'Consulta más de 1500 textos digitales del Siglo de Oro en acceso abierto':
		"Consultez plus de 1 500 textes numériques du Siècle d'or en accès ouvert",
	'Consulta los resúmenes automáticos de todas las obras de la base de datos':
		'Consultez les résumés automatiques de toutes les œuvres de la base de données',
	'Visualiza la red de relaciones estilométricas para las 3000 obras del corpus':
		'Visualisez le réseau de relations stylométriques des 3 000 œuvres du corpus',
	'Visualización de análisis estilométrico del proyecto ETSO': 'Visualisation de l’analyse stylométrique du projet ETSO',
	'Interfaz de búsqueda textual de TEXORO': 'Interface de recherche textuelle de TEXORO',
	'Biblioteca digital BITESO': 'Bibliothèque numérique BITESO',
	'Resúmenes automáticos de las obras': 'Résumés automatiques des œuvres',
	'Red estilométrica del proyecto ETSO': 'Réseau stylométrique du projet ETSO',
	'Grafo de relaciones estilométricas del proyecto ETSO': 'Graphe des relations stylométriques du projet ETSO',
	'Panel de informes estilométricos de ETSO': 'Panneau des rapports stylométriques d’ETSO',
	'El proyecto': 'Le projet',
	'surge del interés del investigador': "naît de l'intérêt du chercheur",
	'(Universitat Autònoma de Barcelona) y del catedrático':
		'(Universitat Autònoma de Barcelona) et du professeur',
	'(Universidad de Valladolid) en aplicar las nuevas herramientas informáticas a los numerosos problemas':
		'(Université de Valladolid) pour appliquer les nouveaux outils informatiques aux nombreux problèmes',
	'de autoría que presenta el teatro del Siglo de Oro español. Este portal trata de ofrecer análisis que':
		"d'attribution que présente le théâtre espagnol du Siècle d'or. Ce portail vise à offrir des analyses qui",
	'puedan arrojar luz sobre las atribuciones de la vasta producción teatral del periodo aurisecular.':
		"puissent éclairer les attributions de la vaste production théâtrale du Siècle d'or.",
	'frecuencias en léxico más cercanas a las del texto que nos interesa en el corpus del que dispongamos.':
		"des fréquences lexicales plus proches de celles du texte qui nous intéresse dans le corpus disponible.",
	'Cada autor usa las palabras en unas proporciones distintas, por lo que las obras suelen relacionarse en':
		'Chaque auteur utilise les mots dans des proportions différentes, de sorte que les œuvres se rapprochent souvent en',
	'función de su autoría. Bien es cierto que debemos ser siempre precavidos por otras relaciones que pueden':
		"fonction de leur attribution. Il faut toutefois rester prudent face à d'autres relations qui peuvent",
	'estarse produciendo por razón del género literario, la temática, la datación, la procedencia, el estado':
		'se produire en raison du genre littéraire, de la thématique, de la datation, de la provenance, de l’état',
	'del texto, etc.': 'du texte, etc.',
	'Se pueden consultar aquí ejemplos en los que la estilometría ratifica la atribución tradicional, como':
		"Vous pouvez consulter ici des exemples dans lesquels la stylométrie confirme l'attribution traditionnelle, comme",
	'y también casos en los que la estilometría apunta hacia una autoría inesperada y potencialmente esclarecedora, como en':
		"ainsi que des cas où la stylométrie indique une attribution inattendue et potentiellement éclairante, comme",
	'Debemos tener en cuenta que las nuevas':
		'Il faut tenir compte du fait que les nouvelles',
	'atribuciones aquí señaladas son meros indicios de autoría arrojados por el proceso informático de forma':
		"attributions indiquées ici ne sont que des indices produits automatiquement par le processus informatique.",
	'automática. Todos los casos deben ser estudiados pormenorizadamente desde la filología atendiendo a sus':
		'Tous les cas doivent être étudiés en détail selon une approche philologique, en tenant compte de leurs',
	'complejidades particulares.': 'complexités particulières.',
	'Humanidades digitales': 'Humanités numériques',
	'Estilometría, Inteligencia Artificial, Transcripción automática (HTR)...':
		'Stylométrie, intelligence artificielle, transcription automatique (HTR)...',
	'podemos relacionar los textos por sus usos': 'nous pouvons relier les textes par leurs usages',
	'nos posibilita transcribir y modernizar': 'nous permet de transcrire et de moderniser',
	'impresos y manuscritos antiguos automáticamente con un alto grado de acierto.':
		'des imprimés et manuscrits anciens automatiquement avec un haut degré de précision.',
	'Además, empleamos otras técnicas estilométricas o de Inteligencia Artificial para tratar los textos.':
		'Nous employons également d’autres techniques stylométriques ou d’intelligence artificielle pour traiter les textes.',
	'TEXORO: Textos del Siglo de Oro': "TEXORO : textes du Siècle d'or",
	'Textos digitales del Siglo de Oro en acceso abierto': "Textes numériques du Siècle d'or en accès ouvert",
	'BITESO reúne y pone en acceso abierto una amplia colección de textos digitales del Siglo de Oro.':
		"BITESO rassemble et met en accès ouvert une vaste collection de textes numériques du Siècle d'or.",
	'El recurso nace, en buena medida, de las transcripciones automáticas de impresos y manuscritos realizadas para los análisis estilométricos de autoría, así como de materiales revisados, facilitados o contrastados gracias a la colaboración de distintos especialistas.':
		"La ressource provient en grande partie des transcriptions automatiques d'imprimés et de manuscrits réalisées pour les analyses stylométriques d'attribution, ainsi que de matériaux révisés, fournis ou vérifiés grâce à la collaboration de spécialistes.",
	'Su objetivo es ofrecer a la comunidad un punto de acceso sencillo a textos que, en muchos casos, permanecían contenidos en documentos antiguos, de difícil manejo o lectura.':
		"Son objectif est d'offrir à la communauté un point d'accès simple à des textes qui, dans de nombreux cas, restaient contenus dans des documents anciens difficiles à manipuler ou à lire.",
	'Los textos incorporados a BITESO no aspiran a sustituir a las ediciones críticas ni presentan siempre la misma calidad ecdótica.':
		"Les textes intégrés à BITESO ne prétendent pas remplacer les éditions critiques et ne présentent pas toujours la même qualité éditoriale.",
	'Además, en su estado actual no incluyen los nombres de los personajes ni las acotaciones escénicas, sino únicamente los versos limpios de cada obra.':
		"En outre, dans leur état actuel, ils n'incluent ni les noms des personnages ni les didascalies, mais uniquement les vers nettoyés de chaque œuvre.",
	'Sin embargo, constituyen materiales útiles para la lectura, la consulta, la docencia, la investigación filológica y la exploración computacional del patrimonio literario aurisecular.':
		"Ils constituent néanmoins des matériaux utiles pour la lecture, la consultation, l'enseignement, la recherche philologique et l'exploration computationnelle du patrimoine littéraire auriséculaire.",
	'¿Cómo te podemos ayudar? ¿Cómo nos puedes ayudar?': 'Comment pouvons-nous vous aider ? Comment pouvez-vous nous aider ?',
	'Podemos ayudarte a explorar los distintos recursos disponibles para el estudio del teatro y la literatura del Siglo de Oro.':
		"Nous pouvons vous aider à explorer les différentes ressources disponibles pour l'étude du théâtre et de la littérature du Siècle d'or.",
	'En Examen de autorías se pueden consultar los informes estilométricos de las obras incorporadas al corpus, con indicios sobre sus posibles relaciones de autoría.':
		"Dans Examen de autorías, vous pouvez consulter les rapports stylométriques des œuvres intégrées au corpus, avec des indices sur leurs possibles relations d’attribution.",
	'TEXORO permite realizar búsquedas textuales sobre cerca de 3000 obras y más de 38 millones de palabras, con opciones para localizar palabras, frases, patrones, combinaciones de términos y relaciones de proximidad.':
		"TEXORO permet d'effectuer des recherches textuelles sur près de 3 000 œuvres et plus de 38 millions de mots, avec des options pour localiser mots, phrases, motifs, combinaisons de termes et relations de proximité.",
	'Además, los resúmenes automáticos permiten obtener una primera orientación sobre el argumento y el contenido de las obras, siempre como ayuda inicial y no como sustituto de la lectura o del análisis filológico.':
		"Les résumés automatiques permettent aussi d'obtenir une première orientation sur l'intrigue et le contenu des œuvres, toujours comme aide initiale et non comme substitut à la lecture ou à l'analyse philologique.",
	'También puedes colaborar con nosotros enviándonos textos del Siglo de Oro que todavía no estén incorporados a nuestros recursos, información bibliográfica, noticias sobre atribuciones, datos sobre testimonios o cualquier material que pueda mejorar el conjunto.':
		"Vous pouvez également collaborer avec nous en nous envoyant des textes du Siècle d'or non encore intégrés à nos ressources, des informations bibliographiques, des nouvelles d'attribution, des données sur les témoins ou tout matériau susceptible d'améliorer l'ensemble.",
	'La colaboración de investigadores, docentes y especialistas resulta fundamental para seguir ampliando, revisando y corrigiendo la información disponible.':
		"La collaboration des chercheurs, enseignants et spécialistes est essentielle pour continuer à élargir, réviser et corriger l'information disponible.",
	'Por ello, si encuentras errores, erratas, problemas en los textos, fallos en los resúmenes automáticos o datos que puedan precisarse mejor, te agradeceremos que nos envíes tus sugerencias de corrección.':
		"Si vous trouvez des erreurs, coquilles, problèmes dans les textes, défauts dans les résumés automatiques ou données à préciser, nous vous remercierons de nous envoyer vos suggestions de correction.",
	'Citar nuestros recursos en publicaciones, trabajos académicos o actividades docentes también nos ayuda a difundir el proyecto y a obtener el apoyo necesario para mantenerlo y ampliarlo.':
		"Citer nos ressources dans des publications, travaux académiques ou activités d'enseignement nous aide aussi à diffuser le projet et à obtenir le soutien nécessaire pour le maintenir et l'élargir.",
	'Contacta con nosotros': 'Contactez-nous',
	'consultar de forma unificada un amplio corpus de obras del Siglo de Oro':
		"consulter de manière unifiée un vaste corpus d'œuvres du Siècle d'or",
	'El recurso reúne cerca de 3000 textos, con más de 38 millones de palabras indexadas y obras de más de 400 autores, y ofrece distintas posibilidades para explorar el patrimonio literario aurisecular desde criterios léxicos, textuales y documentales.':
		"La ressource rassemble près de 3 000 textes, plus de 38 millions de mots indexés et des œuvres de plus de 400 auteurs, et offre plusieurs façons d'explorer le patrimoine littéraire auriséculaire selon des critères lexicaux, textuels et documentaires.",
	'El buscador permite localizar palabras, frases exactas y patrones con comodines, así como realizar consultas avanzadas mediante la combinación de términos, condiciones de proximidad y filtros por título, género, atribución tradicional, atribución estilométrica o estado del texto.':
		"Le moteur de recherche permet de localiser des mots, des phrases exactes et des motifs avec jokers, ainsi que d'effectuer des requêtes avancées combinant termes, conditions de proximité et filtres par titre, genre, attribution traditionnelle, attribution stylométrique ou état du texte.",
	'búsquedas puntuales como exploraciones más complejas':
		'les recherches ponctuelles que les explorations plus complexes',
	'sobre la presencia, distribución y relación de palabras o expresiones en el conjunto del corpus.':
		'sur la présence, la distribution et les relations de mots ou expressions dans l’ensemble du corpus.',
	'Esta página web ha sido desarrollada gracias a la financiación principal de:':
		'Ce site a été développé grâce au financement principal de :',
	'Con el apoyo complementario de:': 'Avec le soutien complémentaire de :',
	"Logo ETSO": "Logo ETSO",
	"Logo de Thal-IA": "Logo Thal-IA",
	"Logo BITESO": "Logo BITESO"
};

Object.assign(esToEn, {
	'Indicadores del catálogo': 'Catalogue indicators',
	'Ver listado de obras': 'View the works list',
	'Ver listado de dramaturgos': 'View the playwrights list',
	'Examen de autorías es un espacio dedicado a la': 'Examen de autorías is a space devoted to',
	'atribución computacional': 'computational attribution',
	'de autoría en el teatro': 'of authorship in',
	'del Siglo de Oro a gran escala. La plataforma, desarrollada por Álvaro Cuéllar y Germán Vega':
		'Golden Age theatre at scale. The platform, developed by Álvaro Cuéllar and Germán Vega',
	'García-Luengos, ofrece resultados estilométricos sobre un corpus en expansión de unas 3.000 obras':
		'García-Luengos, offers stylometric results for an expanding corpus of around 3,000 plays',
	'pertenecientes a más de 400 dramaturgos, con el propósito de facilitar la investigación y el':
		'belonging to more than 400 playwrights, with the aim of supporting research and the',
	'contraste de hipótesis autorales.': 'testing of authorship hypotheses.',
	'Los textos han sido': 'The texts have been',
	'modernizados y regularizados': 'modernized and regularized',
	'para hacer posible su comparación, y se han depurado': 'to make comparison possible, and they have been cleaned',
	'en lo posible para reducir interferencias (por ejemplo, acotaciones y marcas de intervención). A':
		'as far as possible to reduce interference, such as stage directions and intervention marks. From',
	'partir de esta base, el sitio permite confrontar atribuciones transmitidas por la tradición con':
		'this basis, the site makes it possible to compare attributions transmitted by tradition with',
	'propuestas derivadas del análisis cuantitativo del estilo. El objetivo no es sustituir la lectura':
		'proposals derived from quantitative analysis of style. The aim is not to replace philological reading,',
	'filológica, sino aportar evidencia adicional, reproducible y acumulativa que ayude a orientar futuras':
		'but to provide additional, reproducible, cumulative evidence that can help guide future',
	'comprobaciones documentales y críticas.': 'documentary and critical checks.',
	'El corpus se nutre de': 'The corpus draws on',
	'fuentes abiertas y de aportaciones de investigadores y grupos': 'open sources and contributions from researchers and groups',
	', e integra': ', and it also includes',
	'también textos procedentes de transcripciones automáticas de impresos y manuscritos antiguos. Se':
		'texts derived from automatic transcriptions of old printed books and manuscripts. We',
	'aceptan consultas, colaboraciones y propuestas de ampliación: si dispones de una obra o conoces cómo':
		'welcome queries, collaborations, and proposals for expansion: if you have a work or know how',
	'acceder a ella, escríbenos y nos comprometemos a reconocer tu contribución y a compartir los resultados del análisis.':
		'to access one, write to us and we will acknowledge your contribution and share the analysis results.',
	'La fecha "hasta" debe ser mayor o igual que la fecha "desde".':
		'The "to" date must be greater than or equal to the "from" date.',
	'No se pudieron cargar los indicadores.': 'The indicators could not be loaded.',
	'No se pudieron cargar los filtros': 'The filters could not be loaded',
	'No se pudieron cargar los resultados': 'The results could not be loaded',
	'Preparando resultados y contextos...': 'Preparing results and contexts...',
	'Buscando en TEXORO...': 'Searching TEXORO...',
	'Los resultados están recalculados sobre el subconjunto filtrado.':
		'Results are recalculated over the filtered subset.',
	'Distribución general de ocurrencias': 'Overall occurrence distribution',
	'Comparativa por términos': 'Term comparison',
	'Métrica activa:': 'Active metric:',
	'Se muestran los primeros 6 términos de la consulta.': 'The first 6 terms in the query are shown.',
	'Uso de términos por autor': 'Term use by author',
	'Uso de términos por género': 'Term use by genre',
	'No hay datos suficientes de autoría para comparar términos.':
		'There is not enough authorship data to compare terms.',
	'No hay datos suficientes de género para comparar términos.': 'There is not enough genre data to compare terms.',
	'Caracteres permitidos:': 'Allowed characters:',
	'letras, números, espacios y los comodines': 'letters, numbers, spaces, and the wildcards',
	'Términos adicionales:': 'Additional terms:',
	'puedes exigir que aparezcan todos, al menos uno, o buscar cualquiera de los términos.':
		'you can require all of them, at least one, or search for any of the terms.',
	'Proximidad:': 'Proximity:',
	'añade términos que deban aparecer cerca de la búsqueda principal, con distancia máxima y orden.':
		'add terms that must appear near the main search, with maximum distance and order.',
	'limita por título, género, atribución tradicional, atribución estilométrica o estado del texto.':
		'limit by title, genre, traditional attribution, stylometric attribution, or text status.',
	'La consulta interpretada resume antes de buscar qué se enviará al motor.':
		'The interpreted query summarizes what will be sent to the engine before searching.',
	'Los resultados se ordenan por relevancia y número de ocurrencias.':
		'Results are sorted by relevance and number of occurrences.',
	'En cada obra se cargan contextos breves de las primeras ocurrencias visibles.':
		'Brief contexts for the first visible occurrences are loaded for each work.',
	'El detalle de ocurrencias muestra fragmentos localizados y posición aproximada en la obra.':
		'Occurrence details show located fragments and their approximate position in the work.',
	'La exportación XLSX guarda consulta, filtros, resultados y ocurrencias disponibles.':
		'The XLSX export stores the query, filters, results, and available occurrences.',
	'Derechos, licencias y condiciones de reutilización de contenidos, datos, textos y materiales de ETSO.':
		'Rights, licenses, and reuse conditions for ETSO content, data, texts, and materials.',
	'Salvo indicación contraria, los contenidos descriptivos elaborados por ETSO pueden consultarse, citarse y reutilizarse con fines académicos y no comerciales, siempre que se indique la procedencia (':
		'Unless otherwise indicated, descriptive content produced by ETSO may be consulted, cited, and reused for academic and non-commercial purposes, provided that its source is acknowledged (',
	'Los textos identificados como procedentes de BITESO se ofrecen bajo licencia Creative Commons CC BY-NC 4.0 cuando así conste expresamente en su ficha.':
		'Texts identified as coming from BITESO are offered under a Creative Commons CC BY-NC 4.0 license when this is expressly stated in their record.',
	'El corpus de TEXORO se ofrece únicamente como herramienta de búsqueda textual. Los fragmentos mostrados son contextos breves de consulta y no permiten ni autorizan la reconstrucción, descarga, copia o reutilización de los textos completos. Algunos textos integrados en TEXORO proceden de investigadores, proyectos o instituciones que conservan sus derechos sobre los materiales aportados.':
		'The TEXORO corpus is offered only as a text-search tool. The fragments shown are brief consultation contexts and do not permit or authorize reconstruction, download, copying, or reuse of the complete texts. Some texts included in TEXORO come from researchers, projects, or institutions that retain rights over the contributed materials.',
	'Los datos del Examen de autorías, los resúmenes y los metadatos pueden citarse de forma puntual. La extracción masiva, reproducción íntegra o reutilización sustancial de la base de datos de ETSO requiere autorización expresa.':
		'Data from Examen de autorías, summaries, and metadata may be cited selectively. Massive extraction, full reproduction, or substantial reuse of the ETSO database requires express authorization.',
	'Las imágenes, documentos, logotipos y materiales procedentes de terceros se rigen por las condiciones indicadas por sus respectivas fuentes o titulares.':
		'Images, documents, logos, and materials from third parties are governed by the conditions indicated by their respective sources or rights holders.',
	'La identidad visual y diseño de ETSO queda protegida por los derechos de autor. El código fuente y componentes técnicos están disponibles en abierto en':
		'ETSO’s visual identity and design are protected by copyright. The source code and technical components are openly available on',
	', pero su uso o adaptación para proyectos externos requiere autorización y atribución adecuada.':
		', but their use or adaptation for external projects requires authorization and appropriate attribution.',
	'Para solicitar autorización para usos no previstos en esta página, puede contactarse con el equipo del proyecto':
		'To request authorization for uses not covered on this page, you may contact the project team',
	'Política de privacidad y tratamiento de datos personales en la web de ETSO.':
		'Privacy policy and personal data processing on the ETSO website.',
	'Responsable del tratamiento:': 'Data controller:',
	'ETSO recoge y trata únicamente los datos personales necesarios para el funcionamiento de la web y para la gestión de las comunicaciones enviadas por las personas usuarias.':
		'ETSO collects and processes only the personal data necessary for the operation of the website and for managing communications sent by users.',
	'Los datos facilitados a través de formularios, correo electrónico u otros canales de contacto se utilizarán exclusivamente para responder a la consulta, gestionar colaboraciones o atender solicitudes relacionadas con el proyecto.':
		'Data provided through forms, email, or other contact channels will be used exclusively to answer the query, manage collaborations, or handle requests related to the project.',
	'La web puede registrar datos técnicos básicos de navegación, como dirección IP, fecha y hora de acceso, navegador o páginas visitadas, con fines de seguridad, mantenimiento técnico y análisis general del funcionamiento del sitio.':
		'The website may record basic technical browsing data, such as IP address, access date and time, browser, or pages visited, for security, technical maintenance, and general analysis of site operation.',
	'Los datos personales no se cederán a terceros, salvo obligación legal o cuando sea necesario para la prestación técnica del servicio mediante proveedores de alojamiento, despliegue, formularios, analítica o correo electrónico.':
		'Personal data will not be transferred to third parties except under legal obligation or when necessary for the technical provision of the service through hosting, deployment, forms, analytics, or email providers.',
	'Los datos se conservarán durante el tiempo necesario para cumplir la finalidad para la que fueron recogidos y, en su caso, para atender responsabilidades legales o administrativas.':
		'Data will be kept for the time necessary to fulfill the purpose for which it was collected and, where applicable, to address legal or administrative responsibilities.',
	'Las personas usuarias pueden solicitar el acceso, rectificación, supresión, limitación u oposición al tratamiento de sus datos, así como cualquier otra información relacionada con su privacidad, escribiendo al equipo del proyecto.':
		'Users may request access, rectification, deletion, restriction, or objection to the processing of their data, as well as any other information related to their privacy, by writing to the project team.',
	'ETSO no utiliza los datos personales para fines comerciales ni para la elaboración de perfiles publicitarios.':
		'ETSO does not use personal data for commercial purposes or for advertising profiling.',
	'Esta política podrá actualizarse para reflejar cambios técnicos, legales o de funcionamiento de la web.':
		'This policy may be updated to reflect technical, legal, or operational changes to the website.',
	'Formulario y direcciones de contacto para consultas, colaboraciones y solicitudes relacionadas con ETSO.':
		'Contact form and addresses for queries, collaborations, and requests related to ETSO.',
	'ETSO está abierto a todo tipo de consultas, colaboraciones, preguntas y peticiones.':
		'ETSO is open to all kinds of queries, collaborations, questions, and requests.',
	'Estaremos encantados de ayudar a todo aquel que lo requiera a través del siguiente':
		'We will be happy to help anyone who needs it through the following',
	'formulario.': 'form.',
	'Nombre': 'Name',
	'Correo electrónico': 'Email',
	'Asunto': 'Subject',
	'Consulta sobre ETSO': 'Query about ETSO',
	'Mensaje': 'Message',
	'El envío abrirá tu aplicación de correo predeterminada con el mensaje ya preparado.':
		'Submitting will open your default email application with the message already prepared.',
	'Preparar correo': 'Prepare email',
	'Correos de contacto': 'Contact email addresses',
	'Si lo prefieres, también puedes escribir directamente a cualquiera de estas direcciones:':
		'If you prefer, you can also write directly to either of these addresses:',
	'Acceso a información complementaria sobre transcripciones automáticas, equipo y contacto de ETSO.':
		'Access to complementary information about automatic transcriptions, team, and contact for ETSO.',
	'Selecciona una sección:': 'Select a section:',
	'Modelos y procesos de transcripción automática aplicados a impresos y manuscritos teatrales del Siglo de Oro.':
		'Automatic transcription models and processes applied to printed and manuscript Golden Age plays.',
	'Procesamiento textual': 'Text processing',
	'Procesos de transcripción automática.': 'Automatic transcription processes.',
	'Recientemente hemos desarrollado procesos de transcripción automática gracias a la': 'We have recently developed automatic transcription processes thanks to the',
	'automáticamente unos 1000 impresos y 350 manuscritos de teatro del Siglo de Oro, que forman':
		'automatically around 1,000 printed books and 350 manuscripts of Golden Age theatre, which now form',
	'ahora parte de CETSO y TEXORO.': 'part of CETSO and TEXORO.',
	'impresos transcritos y modernizados automáticamente': 'printed books transcribed and modernized automatically',
	'manuscritos incorporados a los flujos de trabajo del proyecto': 'manuscripts incorporated into the project workflows',
	'de acierto aproximado en impresos': 'approximate accuracy for printed books',
	'de acierto aproximado en manuscritos': 'approximate accuracy for manuscripts',
	'Los tres modelos empleados son públicos y cualquiera puede emplearlos a través de la':
		'The three models used are public and anyone can use them through the',
	'Modelo entrenado para la transcripción automática de impresos teatrales del Siglo de Oro.':
		'Model trained for the automatic transcription of printed Golden Age plays.',
	'Versión orientada a la modernización ortográfica automática de impresos ya transcritos.':
		'Version focused on automatic spelling modernization of already transcribed printed books.',
	'Modelo centrado en manuscritos teatrales, con modernización ortográfica y detección de rasgos relevantes.':
		'Model focused on theatrical manuscripts, with spelling modernization and detection of relevant features.',
	'Estos modelos nos permiten transcribir impresos y manuscritos teatrales con un alto grado':
		'These models allow us to transcribe printed books and theatrical manuscripts with a high degree',
	'de precisión: aproximadamente un 99 % de acierto en impresos y un 90 % en manuscritos.':
		'of accuracy: approximately 99% accuracy for printed books and 90% for manuscripts.',
	'Nuestras transcripciones, además, pueden modernizar automáticamente la ortografía a las':
		'Our transcriptions can also automatically modernize spelling according to',
	'normas actuales y detectar ciertos elementos, como cursivas.':
		'current standards and detect certain elements, such as italics.',
	'Ejemplo de transcripción automática aplicada a un texto teatral del Siglo de Oro.':
		'Example of automatic transcription applied to a Golden Age theatrical text.',
	'Segundo ejemplo de transcripción automática y modernización ortográfica.':
		'Second example of automatic transcription and spelling modernization.',
	'Si te interesa saber más sobre la herramienta, cómo aplicar nuestros modelos de transcripción':
		'If you are interested in learning more about the tool, how to apply our transcription models',
	'a tus documentos, o si necesitas una transcripción concreta de un impreso o manuscrito sobre':
		'to your documents, or if you need a specific transcription of a printed book or manuscript',
	'la que trabajar, por favor, contacta con Álvaro Cuéllar.':
		'to work on, please contact Álvaro Cuéllar.',
	'Texto digital de': 'Digital text for',
	'Texto digital BITESO de': 'BITESO digital text for',
	'disponible en ETSO.': 'available on ETSO.',
	'Puede incluir errores u omisiones. Si dispones de una edición mejor, te agradecemos que contactes':
		'It may include errors or omissions. If you have a better edition, we would be grateful if you contacted',
	'con nosotros para incorporar actualizaciones.': 'us so that we can incorporate updates.',
	'Este contenido se ofrece bajo la licencia Creative Commons CC BY-NC 4.0. Reutilización permitida':
		'This content is offered under the Creative Commons CC BY-NC 4.0 license. Reuse is allowed',
	'con cita; usos comerciales no permitidos.': 'with citation; commercial uses are not allowed.',
	'Ver detalles de la licencia Creative Commons CC BY-NC 4.0':
		'View Creative Commons CC BY-NC 4.0 license details',
	'Licencia Creative Commons CC BY-NC 4.0': 'Creative Commons CC BY-NC 4.0 license',
	'Navegación del texto BITESO': 'BITESO text navigation',
	'Cerrar navegación de jornadas': 'Close act navigation',
	'Abrir navegación de jornadas': 'Open act navigation',
	'Resumen automático de': 'Automatic summary of',
	'obra del corpus de ETSO.': 'work in the ETSO corpus.',
	'A continuación se ofrece un resumen automático no revisado de la obra, generado con ChatGPT':
		'Below is an unreviewed automatic summary of the work, generated with ChatGPT',
	'(modelo 5.4) a partir del texto disponible. Puede incluir errores y omisiones. Si detectas':
		'(model 5.4) from the available text. It may include errors and omissions. If you detect',
	'problemas o incoherencias, te agradecemos que contactes con nosotros para incorporar':
		'problems or inconsistencies, we would be grateful if you contacted us so that we can incorporate',
	'actualizaciones.': 'updates.',
	'Resumen automático de la obra': 'Automatic summary of the work',
	'Resumen completo': 'Full summary',
	'No hay resumen breve disponible. Puedes consultar el resumen automático completo.':
		'No short summary is available. You can consult the full automatic summary.',
	'No hay resumen disponible para esta obra.': 'No summary is available for this work.',
	'Metadatos de la obra': 'Work metadata',
	'Ficha obra': 'Work record',
	'Sin atribución tradicional determinada': 'No traditional attribution determined',
	'No apunta hacia ningún autor de forma clara': 'Does not point clearly to any author',
	'Análisis estilométrico:': 'Stylometric analysis:',
	'(posible colaboración).': '(possible collaboration).',
	'Fecha de adición': 'Date added',
	'Estamos trabajando para vincular esta obra con': 'We are working to link this work with',
	'Visualización experimental de relaciones estilométricas entre obras de Examen de autorías.':
		'Experimental visualization of stylometric relationships between works in Examen de autorías.',
	'Visualización experimental de relaciones estilométricas. Cada obra se conecta con sus tres obras más cercanas según las distancias de obra completa.':
		'Experimental visualization of stylometric relationships. Each work is connected to its three closest works according to complete-work distances.',
	'Título, género y atribuciones': 'Title, genre, and attributions',
	'Busca por palabras del título, género, atribución tradicional o atribución estilométrica.':
		'Search by words in the title, genre, traditional attribution, or stylometric attribution.',
	'Ej: La dama boba, comedia, Lope...': 'E.g.: La dama boba, comedy, Lope...',
	'Limpiar': 'Clear',
	'Tradicional': 'Traditional',
	'Autor': 'Author',
	'Permite seleccionar hasta': 'Allows selecting up to',
	'autores para colorear sus obras en la red.': 'authors to color their works in the network.',
	'Colores de autores seleccionados': 'Selected author colors',
	'Obra seleccionada': 'Selected work',
	'Centrar': 'Center',
	'Ficha': 'Record',
	'Obras conectadas (se indican las 3 más próximas)': 'Connected works (the 3 closest are shown)',
	'Calculando red de fuerzas...': 'Calculating force network...',
	'No se pudo cargar el grafo': 'The graph could not be loaded',
	'Listado de obras indexadas en TEXORO, con acceso a sus fichas y metadatos.':
		'List of works indexed in TEXORO, with access to their records and metadata.',
	'Listado alfabético de las obras indexadas en TEXORO. Usa el buscador para localizar una obra y entrar directamente en su ficha.':
		'Alphabetical list of works indexed in TEXORO. Use the search field to find a work and go directly to its record.',
	'obras visibles': 'visible works',
	'Listado de autores presentes en TEXORO, con sus obras asociadas por atribución tradicional.':
		'List of authors present in TEXORO, with their works associated by traditional attribution.',
	'Listado alfabético de los autores presentes en TEXORO según la atribución tradicional. Usa el buscador para localizar un nombre o una obra.':
		'Alphabetical list of authors present in TEXORO according to traditional attribution. Use the search field to find a name or a work.',
	'Buscar autor': 'Search author',
	'Ej: Lope de Vega, Moreto, Ruiz de Alarcón...': 'E.g.: Lope de Vega, Moreto, Ruiz de Alarcón...',
	'No hay autores que coincidan con la búsqueda.': 'No authors match the search.',
	'autores visibles': 'visible authors',
	'Listado de obras disponibles en Examen de autorías, con fichas, atribuciones e informes estilométricos.':
		'List of works available in Examen de autorías, with records, attributions, and stylometric reports.',
	'Listado alfabético de las obras disponibles en Examen de autorías. Usa el buscador para localizar una obra y entrar directamente en su ficha.':
		'Alphabetical list of works available in Examen de autorías. Use the search field to find a work and go directly to its record.',
	'Listado de dramaturgos presentes en Examen de autorías, con acceso a sus obras y relaciones estilométricas.':
		'List of playwrights present in Examen de autorías, with access to their works and stylometric relationships.',
	'Listado alfabético de los dramaturgos presentes en Examen de autorías según la atribución tradicional. Usa el buscador para localizar un nombre o una obra.':
		'Alphabetical list of playwrights present in Examen de autorías according to traditional attribution. Use the search field to find a name or a work.',
	'Buscar dramaturgo': 'Search playwright',
	'No hay dramaturgos que coincidan con la búsqueda.': 'No playwrights match the search.',
	'dramaturgos visibles': 'visible playwrights',
	'Equipo, colaboradores, estudiantes, entidades y recursos vinculados a ETSO.':
		'Team, collaborators, students, institutions, and resources linked to ETSO.',
	'No hay datos de equipo disponibles.': 'No team data is available.',
	'Imagen de': 'Image of',
	'Repercusión': 'Impact',
	'Referencias, colaboraciones, noticias y trabajos académicos relacionados con ETSO y su repercusión investigadora.':
		'References, collaborations, news, and academic work related to ETSO and its research impact.',
	'referencias visibles': 'visible references',
	'No hay referencias de repercusión disponibles.': 'No impact references are available.',
	'Años': 'Years',
	'Todas': 'All',
	'Tipo': 'Type',
	'Buscar texto': 'Search text',
	'Ej: Lope, congreso, edición, Alarcón...': 'E.g.: Lope, conference, edition, Alarcón...',
	'Relación con ETSO': 'Relationship with ETSO',
	'No hay resultados con los filtros actuales.': 'No results match the current filters.',
	'Artículo': 'Article',
	'Libro': 'Book',
	'Tesis': 'Thesis',
	'Edición': 'Edition',
	'Noticia': 'News',
	'Congreso': 'Conference',
	'Seminario': 'Seminar',
	'Exposición': 'Exhibition',
	'Premio': 'Award',
	'Otra referencia': 'Other reference',
	'Colaboración': 'Collaboration',
	'Mención': 'Mention',
	'Difusión': 'Dissemination',
	'Resultado': 'Result',
	'Reconocimiento': 'Recognition',
	'Acceso temporal': 'Temporary access',
	'Sitio en pruebas': 'Test site',
	'Introduce la contraseña de acceso para entrar en la web mientras el proyecto sigue en revisión.':
		'Enter the access password to enter the website while the project remains under review.',
	'Contraseña': 'Password',
	'La contraseña no es correcta.': 'The password is not correct.',
	'Entrar': 'Enter'
});

Object.assign(esToFr, {
	'Indicadores del catálogo': 'Indicateurs du catalogue',
	'Ver listado de obras': 'Voir la liste des œuvres',
	'Ver listado de dramaturgos': 'Voir la liste des dramaturges',
	'Examen de autorías es un espacio dedicado a la': "Examen de autorías est un espace consacré à",
	'atribución computacional': "l'attribution computationnelle",
	'de autoría en el teatro': "d'auteur dans le théâtre",
	'del Siglo de Oro a gran escala. La plataforma, desarrollada por Álvaro Cuéllar y Germán Vega':
		"du Siècle d'or à grande échelle. La plateforme, développée par Álvaro Cuéllar et Germán Vega",
	'García-Luengos, ofrece resultados estilométricos sobre un corpus en expansión de unas 3.000 obras':
		"García-Luengos, offre des résultats stylométriques sur un corpus en expansion d'environ 3 000 pièces",
	'pertenecientes a más de 400 dramaturgos, con el propósito de facilitar la investigación y el':
		"appartenant à plus de 400 dramaturges, afin de faciliter la recherche et le",
	'contraste de hipótesis autorales.': "contrôle des hypothèses d'attribution.",
	'Los textos han sido': 'Les textes ont été',
	'modernizados y regularizados': 'modernisés et régularisés',
	'para hacer posible su comparación, y se han depurado': 'pour rendre leur comparaison possible, et ils ont été nettoyés',
	'en lo posible para reducir interferencias (por ejemplo, acotaciones y marcas de intervención). A':
		"autant que possible afin de réduire les interférences, par exemple les didascalies et marques d'intervention. À",
	'partir de esta base, el sitio permite confrontar atribuciones transmitidas por la tradición con':
		"partir de cette base, le site permet de confronter les attributions transmises par la tradition avec",
	'propuestas derivadas del análisis cuantitativo del estilo. El objetivo no es sustituir la lectura':
		"des propositions issues de l'analyse quantitative du style. L'objectif n'est pas de remplacer la lecture",
	'filológica, sino aportar evidencia adicional, reproducible y acumulativa que ayude a orientar futuras':
		"philologique, mais d'apporter des preuves supplémentaires, reproductibles et cumulatives pour orienter de futures",
	'comprobaciones documentales y críticas.': 'vérifications documentaires et critiques.',
	'El corpus se nutre de': "Le corpus s'appuie sur",
	'fuentes abiertas y de aportaciones de investigadores y grupos': 'des sources ouvertes et des contributions de chercheurs et de groupes',
	', e integra': ', et il intègre',
	'también textos procedentes de transcripciones automáticas de impresos y manuscritos antiguos. Se':
		"également des textes issus de transcriptions automatiques d'imprimés et de manuscrits anciens. Les",
	'aceptan consultas, colaboraciones y propuestas de ampliación: si dispones de una obra o conoces cómo':
		"demandes, collaborations et propositions d'élargissement sont bienvenues : si vous disposez d'une œuvre ou savez comment",
	'acceder a ella, escríbenos y nos comprometemos a reconocer tu contribución y a compartir los resultados del análisis.':
		"y accéder, écrivez-nous ; nous nous engageons à reconnaître votre contribution et à partager les résultats de l'analyse.",
	'La fecha "hasta" debe ser mayor o igual que la fecha "desde".':
		'La date "jusqu’à" doit être postérieure ou égale à la date "depuis".',
	'No se pudieron cargar los indicadores.': "Les indicateurs n'ont pas pu être chargés.",
	'No se pudieron cargar los filtros': "Les filtres n'ont pas pu être chargés",
	'No se pudieron cargar los resultados': "Les résultats n'ont pas pu être chargés",
	'Preparando resultados y contextos...': 'Préparation des résultats et des contextes...',
	'Buscando en TEXORO...': 'Recherche dans TEXORO...',
	'Los resultados están recalculados sobre el subconjunto filtrado.':
		'Les résultats sont recalculés sur le sous-ensemble filtré.',
	'Distribución general de ocurrencias': 'Distribution générale des occurrences',
	'Comparativa por términos': 'Comparaison par termes',
	'Métrica activa:': 'Métrique active :',
	'Se muestran los primeros 6 términos de la consulta.': 'Les 6 premiers termes de la requête sont affichés.',
	'Uso de términos por autor': 'Usage des termes par auteur',
	'Uso de términos por género': 'Usage des termes par genre',
	'No hay datos suficientes de autoría para comparar términos.':
		"Il n'y a pas assez de données d'attribution pour comparer les termes.",
	'No hay datos suficientes de género para comparar términos.':
		"Il n'y a pas assez de données de genre pour comparer les termes.",
	'Caracteres permitidos:': 'Tipoctères autorisés :',
	'letras, números, espacios y los comodines': 'lettres, chiffres, espaces et jokers',
	'Términos adicionales:': 'Termes additionnels :',
	'puedes exigir que aparezcan todos, al menos uno, o buscar cualquiera de los términos.':
		'vous pouvez exiger qu’ils apparaissent tous, au moins un, ou rechercher n’importe lequel des termes.',
	'Proximidad:': 'Proximité :',
	'añade términos que deban aparecer cerca de la búsqueda principal, con distancia máxima y orden.':
		'ajoute des termes devant apparaître près de la recherche principale, avec distance maximale et ordre.',
	'limita por título, género, atribución tradicional, atribución estilométrica o estado del texto.':
		'limite par titre, genre, attribution traditionnelle, attribution stylométrique ou état du texte.',
	'La consulta interpretada resume antes de buscar qué se enviará al motor.':
		"La requête interprétée résume avant la recherche ce qui sera envoyé au moteur.",
	'Los resultados se ordenan por relevancia y número de ocurrencias.':
		'Les résultats sont classés par pertinence et nombre d’occurrences.',
	'En cada obra se cargan contextos breves de las primeras ocurrencias visibles.':
		'Dans chaque œuvre, de courts contextes des premières occurrences visibles sont chargés.',
	'El detalle de ocurrencias muestra fragmentos localizados y posición aproximada en la obra.':
		'Le détail des occurrences affiche les fragments localisés et leur position approximative dans l’œuvre.',
	'La exportación XLSX guarda consulta, filtros, resultados y ocurrencias disponibles.':
		"L'export XLSX conserve la requête, les filtres, les résultats et les occurrences disponibles.",
	'Derechos, licencias y condiciones de reutilización de contenidos, datos, textos y materiales de ETSO.':
		'Droits, licences et conditions de réutilisation des contenus, données, textes et matériaux d’ETSO.',
	'Salvo indicación contraria, los contenidos descriptivos elaborados por ETSO pueden consultarse, citarse y reutilizarse con fines académicos y no comerciales, siempre que se indique la procedencia (':
		'Sauf indication contraire, les contenus descriptifs élaborés par ETSO peuvent être consultés, cités et réutilisés à des fins académiques et non commerciales, à condition d’en indiquer la provenance (',
	'Los textos identificados como procedentes de BITESO se ofrecen bajo licencia Creative Commons CC BY-NC 4.0 cuando así conste expresamente en su ficha.':
		'Les textes identifiés comme provenant de BITESO sont proposés sous licence Creative Commons CC BY-NC 4.0 lorsque cela est expressément indiqué dans leur fiche.',
	'El corpus de TEXORO se ofrece únicamente como herramienta de búsqueda textual. Los fragmentos mostrados son contextos breves de consulta y no permiten ni autorizan la reconstrucción, descarga, copia o reutilización de los textos completos. Algunos textos integrados en TEXORO proceden de investigadores, proyectos o instituciones que conservan sus derechos sobre los materiales aportados.':
		"Le corpus TEXORO est proposé uniquement comme outil de recherche textuelle. Les fragments affichés sont de courts contextes de consultation et ne permettent ni n'autorisent la reconstruction, le téléchargement, la copie ou la réutilisation des textes complets. Certains textes intégrés à TEXORO proviennent de chercheurs, projets ou institutions qui conservent leurs droits sur les matériaux fournis.",
	'Los datos del Examen de autorías, los resúmenes y los metadatos pueden citarse de forma puntual. La extracción masiva, reproducción íntegra o reutilización sustancial de la base de datos de ETSO requiere autorización expresa.':
		"Les données d’Examen de autorías, les résumés et les métadonnées peuvent être cités ponctuellement. L’extraction massive, la reproduction intégrale ou la réutilisation substantielle de la base de données ETSO requiert une autorisation expresse.",
	'Las imágenes, documentos, logotipos y materiales procedentes de terceros se rigen por las condiciones indicadas por sus respectivas fuentes o titulares.':
		'Les images, documents, logos et matériaux provenant de tiers sont régis par les conditions indiquées par leurs sources ou titulaires respectifs.',
	'La identidad visual y diseño de ETSO queda protegida por los derechos de autor. El código fuente y componentes técnicos están disponibles en abierto en':
		"L'identité visuelle et le design d’ETSO sont protégés par le droit d’auteur. Le code source et les composants techniques sont disponibles en accès ouvert sur",
	', pero su uso o adaptación para proyectos externos requiere autorización y atribución adecuada.':
		', mais leur utilisation ou adaptation pour des projets externes requiert une autorisation et une attribution appropriée.',
	'Para solicitar autorización para usos no previstos en esta página, puede contactarse con el equipo del proyecto':
		'Pour demander une autorisation pour des usages non prévus sur cette page, vous pouvez contacter l’équipe du projet',
	'Política de privacidad y tratamiento de datos personales en la web de ETSO.':
		'Politique de confidentialité et traitement des données personnelles sur le site d’ETSO.',
	'Responsable del tratamiento:': 'Responsable du traitement :',
	'ETSO recoge y trata únicamente los datos personales necesarios para el funcionamiento de la web y para la gestión de las comunicaciones enviadas por las personas usuarias.':
		'ETSO collecte et traite uniquement les données personnelles nécessaires au fonctionnement du site et à la gestion des communications envoyées par les personnes utilisatrices.',
	'Los datos facilitados a través de formularios, correo electrónico u otros canales de contacto se utilizarán exclusivamente para responder a la consulta, gestionar colaboraciones o atender solicitudes relacionadas con el proyecto.':
		'Les données fournies au moyen de formulaires, du courrier électronique ou d’autres canaux de contact seront utilisées exclusivement pour répondre à la demande, gérer des collaborations ou traiter des sollicitations liées au projet.',
	'La web puede registrar datos técnicos básicos de navegación, como dirección IP, fecha y hora de acceso, navegador o páginas visitadas, con fines de seguridad, mantenimiento técnico y análisis general del funcionamiento del sitio.':
		'Le site peut enregistrer des données techniques de navigation de base, comme l’adresse IP, la date et l’heure d’accès, le navigateur ou les pages visitées, à des fins de sécurité, de maintenance technique et d’analyse générale du fonctionnement du site.',
	'Los datos personales no se cederán a terceros, salvo obligación legal o cuando sea necesario para la prestación técnica del servicio mediante proveedores de alojamiento, despliegue, formularios, analítica o correo electrónico.':
		'Les données personnelles ne seront pas transmises à des tiers, sauf obligation légale ou lorsque cela est nécessaire à la prestation technique du service par des fournisseurs d’hébergement, de déploiement, de formulaires, d’analytique ou de courrier électronique.',
	'Los datos se conservarán durante el tiempo necesario para cumplir la finalidad para la que fueron recogidos y, en su caso, para atender responsabilidades legales o administrativas.':
		'Les données seront conservées pendant le temps nécessaire pour remplir la finalité pour laquelle elles ont été collectées et, le cas échéant, pour répondre à des responsabilités légales ou administratives.',
	'Las personas usuarias pueden solicitar el acceso, rectificación, supresión, limitación u oposición al tratamiento de sus datos, así como cualquier otra información relacionada con su privacidad, escribiendo al equipo del proyecto.':
		'Les personnes utilisatrices peuvent demander l’accès, la rectification, la suppression, la limitation ou l’opposition au traitement de leurs données, ainsi que toute autre information relative à leur confidentialité, en écrivant à l’équipe du projet.',
	'ETSO no utiliza los datos personales para fines comerciales ni para la elaboración de perfiles publicitarios.':
		'ETSO n’utilise pas les données personnelles à des fins commerciales ni pour l’élaboration de profils publicitaires.',
	'Esta política podrá actualizarse para reflejar cambios técnicos, legales o de funcionamiento de la web.':
		'Cette politique pourra être mise à jour pour refléter des changements techniques, juridiques ou de fonctionnement du site.',
	'Formulario y direcciones de contacto para consultas, colaboraciones y solicitudes relacionadas con ETSO.':
		'Formulaire et adresses de contact pour les demandes, collaborations et sollicitations liées à ETSO.',
	'ETSO está abierto a todo tipo de consultas, colaboraciones, preguntas y peticiones.':
		'ETSO est ouvert à tout type de demandes, collaborations, questions et sollicitations.',
	'Estaremos encantados de ayudar a todo aquel que lo requiera a través del siguiente':
		'Nous serons ravis d’aider toute personne qui en aurait besoin au moyen du',
	'formulario.': 'formulaire suivant.',
	'Nombre': 'Nom',
	'Correo electrónico': 'Adresse électronique',
	'Asunto': 'Sujet',
	'Consulta sobre ETSO': 'Demande concernant ETSO',
	'Mensaje': 'Message',
	'El envío abrirá tu aplicación de correo predeterminada con el mensaje ya preparado.':
		"L'envoi ouvrira votre application de courrier par défaut avec le message déjà préparé.",
	'Preparar correo': 'Préparer le courriel',
	'Correos de contacto': 'Adresses de contact',
	'Si lo prefieres, también puedes escribir directamente a cualquiera de estas direcciones:':
		'Si vous préférez, vous pouvez aussi écrire directement à l’une de ces adresses :',
	'Acceso a información complementaria sobre transcripciones automáticas, equipo y contacto de ETSO.':
		'Accès aux informations complémentaires sur les transcriptions automatiques, l’équipe et le contact d’ETSO.',
	'Selecciona una sección:': 'Sélectionnez une section :',
	'Modelos y procesos de transcripción automática aplicados a impresos y manuscritos teatrales del Siglo de Oro.':
		"Modèles et processus de transcription automatique appliqués aux imprimés et manuscrits théâtraux du Siècle d'or.",
	'Procesamiento textual': 'Traitement textuel',
	'Procesos de transcripción automática.': 'Processus de transcription automatique.',
	'Recientemente hemos desarrollado procesos de transcripción automática gracias a la':
		'Nous avons récemment développé des processus de transcription automatique grâce à',
	'automáticamente unos 1000 impresos y 350 manuscritos de teatro del Siglo de Oro, que forman':
		"automatiquement environ 1 000 imprimés et 350 manuscrits de théâtre du Siècle d'or, qui font",
	'ahora parte de CETSO y TEXORO.': 'désormais partie de CETSO et TEXORO.',
	'impresos transcritos y modernizados automáticamente': 'imprimés transcrits et modernisés automatiquement',
	'manuscritos incorporados a los flujos de trabajo del proyecto': 'manuscrits intégrés aux flux de travail du projet',
	'de acierto aproximado en impresos': 'de précision approximative pour les imprimés',
	'de acierto aproximado en manuscritos': 'de précision approximative pour les manuscrits',
	'Los tres modelos empleados son públicos y cualquiera puede emplearlos a través de la':
		'Les trois modèles utilisés sont publics et chacun peut les employer au moyen de',
	'Modelo entrenado para la transcripción automática de impresos teatrales del Siglo de Oro.':
		"Modèle entraîné pour la transcription automatique d'imprimés théâtraux du Siècle d'or.",
	'Versión orientada a la modernización ortográfica automática de impresos ya transcritos.':
		"Version orientée vers la modernisation orthographique automatique d'imprimés déjà transcrits.",
	'Modelo centrado en manuscritos teatrales, con modernización ortográfica y detección de rasgos relevantes.':
		'Modèle centré sur les manuscrits théâtraux, avec modernisation orthographique et détection de traits pertinents.',
	'Estos modelos nos permiten transcribir impresos y manuscritos teatrales con un alto grado':
		'Ces modèles nous permettent de transcrire des imprimés et manuscrits théâtraux avec un haut degré',
	'de precisión: aproximadamente un 99 % de acierto en impresos y un 90 % en manuscritos.':
		'de précision : environ 99 % pour les imprimés et 90 % pour les manuscrits.',
	'Nuestras transcripciones, además, pueden modernizar automáticamente la ortografía a las':
		'Nos transcriptions peuvent en outre moderniser automatiquement l’orthographe selon les',
	'normas actuales y detectar ciertos elementos, como cursivas.':
		'normes actuelles et détecter certains éléments, comme les italiques.',
	'Ejemplo de transcripción automática aplicada a un texto teatral del Siglo de Oro.':
		"Exemple de transcription automatique appliquée à un texte théâtral du Siècle d'or.",
	'Segundo ejemplo de transcripción automática y modernización ortográfica.':
		'Second exemple de transcription automatique et de modernisation orthographique.',
	'Si te interesa saber más sobre la herramienta, cómo aplicar nuestros modelos de transcripción':
		'Si vous souhaitez en savoir plus sur l’outil, sur la manière d’appliquer nos modèles de transcription',
	'a tus documentos, o si necesitas una transcripción concreta de un impreso o manuscrito sobre':
		'à vos documents, ou si vous avez besoin d’une transcription concrète d’un imprimé ou manuscrit',
	'la que trabajar, por favor, contacta con Álvaro Cuéllar.':
		'sur lequel travailler, veuillez contacter Álvaro Cuéllar.',
	'Texto digital de': 'Texte numérique de',
	'Texto digital BITESO de': 'Texte numérique BITESO de',
	'disponible en ETSO.': 'disponible sur ETSO.',
	'Puede incluir errores u omisiones. Si dispones de una edición mejor, te agradecemos que contactes':
		'Il peut contenir des erreurs ou omissions. Si vous disposez d’une meilleure édition, nous vous remercions de nous contacter',
	'con nosotros para incorporar actualizaciones.': 'afin que nous puissions intégrer des mises à jour.',
	'Este contenido se ofrece bajo la licencia Creative Commons CC BY-NC 4.0. Reutilización permitida':
		'Ce contenu est proposé sous licence Creative Commons CC BY-NC 4.0. Réutilisation autorisée',
	'con cita; usos comerciales no permitidos.': 'avec citation ; usages commerciaux non autorisés.',
	'Ver detalles de la licencia Creative Commons CC BY-NC 4.0':
		'Voir les détails de la licence Creative Commons CC BY-NC 4.0',
	'Licencia Creative Commons CC BY-NC 4.0': 'Licence Creative Commons CC BY-NC 4.0',
	'Navegación del texto BITESO': 'Navigation du texte BITESO',
	'Cerrar navegación de jornadas': 'Fermer la navigation des journées',
	'Abrir navegación de jornadas': 'Ouvrir la navigation des journées',
	'Resumen automático de': 'Résumé automatique de',
	'obra del corpus de ETSO.': 'œuvre du corpus ETSO.',
	'A continuación se ofrece un resumen automático no revisado de la obra, generado con ChatGPT':
		'Voici un résumé automatique non révisé de l’œuvre, généré avec ChatGPT',
	'(modelo 5.4) a partir del texto disponible. Puede incluir errores y omisiones. Si detectas':
		'(modèle 5.4) à partir du texte disponible. Il peut contenir des erreurs et omissions. Si vous détectez',
	'problemas o incoherencias, te agradecemos que contactes con nosotros para incorporar':
		'des problèmes ou incohérences, nous vous remercions de nous contacter afin d’intégrer des',
	'actualizaciones.': 'mises à jour.',
	'Resumen automático de la obra': "Résumé automatique de l'œuvre",
	'Resumen completo': 'Résumé complet',
	'No hay resumen breve disponible. Puedes consultar el resumen automático completo.':
		"Aucun résumé bref n'est disponible. Vous pouvez consulter le résumé automatique complet.",
	'No hay resumen disponible para esta obra.': "Aucun résumé n'est disponible pour cette œuvre.",
	'Metadatos de la obra': "Métadonnées de l'œuvre",
	'Ficha obra': "Fiche d'œuvre",
	'Sin atribución tradicional determinada': 'Aucune attribution traditionnelle déterminée',
	'No apunta hacia ningún autor de forma clara': 'Ne pointe clairement vers aucun auteur',
	'Análisis estilométrico:': 'Analyse stylométrique :',
	'(posible colaboración).': '(collaboration possible).',
	'Fecha de adición': "Date d'ajout",
	'Estamos trabajando para vincular esta obra con': 'Nous travaillons à relier cette œuvre à',
	'Visualización experimental de relaciones estilométricas entre obras de Examen de autorías.':
		"Visualisation expérimentale des relations stylométriques entre les œuvres d’Examen de autorías.",
	'Visualización experimental de relaciones estilométricas. Cada obra se conecta con sus tres obras más cercanas según las distancias de obra completa.':
		"Visualisation expérimentale des relations stylométriques. Chaque œuvre est reliée à ses trois œuvres les plus proches selon les distances d'œuvre complète.",
	'Título, género y atribuciones': 'Titre, genre et attributions',
	'Busca por palabras del título, género, atribución tradicional o atribución estilométrica.':
		"Recherche par mots du titre, genre, attribution traditionnelle ou attribution stylométrique.",
	'Ej: La dama boba, comedia, Lope...': 'Ex. : La dama boba, comédie, Lope...',
	'Limpiar': 'Effacer',
	'Tradicional': 'Traditionnelle',
	'Autor': 'Auteur',
	'Permite seleccionar hasta': 'Permet de sélectionner jusqu’à',
	'autores para colorear sus obras en la red.': 'auteurs pour colorer leurs œuvres dans le réseau.',
	'Colores de autores seleccionados': 'Couleurs des auteurs sélectionnés',
	'Obra seleccionada': 'Œuvre sélectionnée',
	'Centrar': 'Centrer',
	'Ficha': 'Fiche',
	'Obras conectadas (se indican las 3 más próximas)': 'Œuvres connectées (les 3 plus proches sont indiquées)',
	'Calculando red de fuerzas...': 'Calcul du réseau de forces...',
	'No se pudo cargar el grafo': "Le graphe n'a pas pu être chargé",
	'Listado de obras indexadas en TEXORO, con acceso a sus fichas y metadatos.':
		'Liste des œuvres indexées dans TEXORO, avec accès à leurs fiches et métadonnées.',
	'Listado alfabético de las obras indexadas en TEXORO. Usa el buscador para localizar una obra y entrar directamente en su ficha.':
		"Liste alphabétique des œuvres indexées dans TEXORO. Utilisez le moteur de recherche pour trouver une œuvre et accéder directement à sa fiche.",
	'obras visibles': 'œuvres visibles',
	'Listado de autores presentes en TEXORO, con sus obras asociadas por atribución tradicional.':
		'Liste des auteurs présents dans TEXORO, avec leurs œuvres associées par attribution traditionnelle.',
	'Listado alfabético de los autores presentes en TEXORO según la atribución tradicional. Usa el buscador para localizar un nombre o una obra.':
		"Liste alphabétique des auteurs présents dans TEXORO selon l'attribution traditionnelle. Utilisez le moteur de recherche pour trouver un nom ou une œuvre.",
	'Buscar autor': 'Rechercher un auteur',
	'Ej: Lope de Vega, Moreto, Ruiz de Alarcón...': 'Ex. : Lope de Vega, Moreto, Ruiz de Alarcón...',
	'No hay autores que coincidan con la búsqueda.': 'Aucun auteur ne correspond à la recherche.',
	'autores visibles': 'auteurs visibles',
	'Listado de obras disponibles en Examen de autorías, con fichas, atribuciones e informes estilométricos.':
		"Liste des œuvres disponibles dans Examen de autorías, avec fiches, attributions et rapports stylométriques.",
	'Listado alfabético de las obras disponibles en Examen de autorías. Usa el buscador para localizar una obra y entrar directamente en su ficha.':
		"Liste alphabétique des œuvres disponibles dans Examen de autorías. Utilisez le moteur de recherche pour trouver une œuvre et accéder directement à sa fiche.",
	'Listado de dramaturgos presentes en Examen de autorías, con acceso a sus obras y relaciones estilométricas.':
		"Liste des dramaturges présents dans Examen de autorías, avec accès à leurs œuvres et relations stylométriques.",
	'Listado alfabético de los dramaturgos presentes en Examen de autorías según la atribución tradicional. Usa el buscador para localizar un nombre o una obra.':
		"Liste alphabétique des dramaturges présents dans Examen de autorías selon l'attribution traditionnelle. Utilisez le moteur de recherche pour trouver un nom ou une œuvre.",
	'Buscar dramaturgo': 'Rechercher un dramaturge',
	'No hay dramaturgos que coincidan con la búsqueda.': 'Aucun dramaturge ne correspond à la recherche.',
	'dramaturgos visibles': 'dramaturges visibles',
	'Equipo, colaboradores, estudiantes, entidades y recursos vinculados a ETSO.':
		'Équipe, collaborateurs, étudiants, entités et ressources liés à ETSO.',
	'No hay datos de equipo disponibles.': "Aucune donnée d'équipe n'est disponible.",
	'Imagen de': 'Image de',
	'Repercusión': 'Retombées',
	'Referencias, colaboraciones, noticias y trabajos académicos relacionados con ETSO y su repercusión investigadora.':
		'Références, collaborations, actualités et travaux académiques liés à ETSO et à ses retombées de recherche.',
	'referencias visibles': 'références visibles',
	'No hay referencias de repercusión disponibles.': 'Aucune référence de retombées disponible.',
	'Años': 'Années',
	'Todas': 'Toutes',
	'Tipo': 'Type',
	'Buscar texto': 'Rechercher dans le texte',
	'Ej: Lope, congreso, edición, Alarcón...': 'Ex. : Lope, congrès, édition, Alarcón...',
	'Relación con ETSO': 'Relation avec ETSO',
	'No hay resultados con los filtros actuales.': 'Aucun résultat ne correspond aux filtres actuels.',
	'Artículo': 'Article',
	'Libro': 'Livre',
	'Tesis': 'Thèse',
	'Edición': 'Édition',
	'Noticia': 'Actualité',
	'Congreso': 'Congrès',
	'Seminario': 'Séminaire',
	'Exposición': 'Exposition',
	'Premio': 'Prix',
	'Otra referencia': 'Autre référence',
	'Colaboración': 'Collaboration',
	'Mención': 'Mention',
	'Difusión': 'Diffusion',
	'Resultado': 'Résultat',
	'Reconocimiento': 'Reconnaissance',
	'Acceso temporal': 'Accès temporaire',
	'Sitio en pruebas': 'Site en test',
	'Introduce la contraseña de acceso para entrar en la web mientras el proyecto sigue en revisión.':
		'Introduisez le mot de passe d’accès pour entrer sur le site pendant que le projet reste en révision.',
	'Contraseña': 'Mot de passe',
	'La contraseña no es correcta.': "Le mot de passe n'est pas correct.",
	'Entrar': 'Entrer'
});

Object.assign(esToEn, {
	'Análisis estilométrico de': 'Stylometric analysis of',
	'Informe estilométrico de': 'Stylometric report for',
	'en ETSO.': 'in ETSO.',
	'Obra sin atribución tradicional determinada.': 'Work with no determined traditional attribution.',
	'Obra atribuida a': 'Work attributed to',
	'Obra atribuida a la escritura en colaboración entre': 'Work attributed to collaborative writing by',
	'Los análisis de estilometría no permiten asociar esta obra de forma clara con ningún perfil autorial del corpus.':
		'The stylometric analyses do not allow this work to be clearly associated with any authorial profile in the corpus.',
	'Los análisis no pueden asociar esta obra con el perfil estilístico del autor tradicional, debido a lo reducido de su corpus. Tampoco identifican de forma clara una alternativa autorial.':
		'The analyses cannot associate this work with the stylistic profile of the traditional author because the corpus is too small. Nor do they clearly identify an alternative authorship.',
	'Esta obra no ha sido analizada estilométricamente, por lo que no es posible valorar su asociación con ningún perfil autorial del corpus.':
		'This work has not been analyzed stylometrically, so it is not possible to assess its association with any authorial profile in the corpus.',
	'Los resultados estilométricos disponibles requieren una revisión en profundidad antes de formular una conclusión autorial.':
		'The available stylometric results require in-depth review before an authorship conclusion can be formulated.',
	'Los análisis de estilometría permiten asociar esta obra de forma clara con el perfil autorial de':
		'The stylometric analyses allow this work to be clearly associated with the authorial profile of',
	'Los análisis de estilometría permiten asociar esta obra con el perfil autorial de':
		'The stylometric analyses allow this work to be associated with the authorial profile of',
	'Los análisis de estilometría permiten asociar esta obra con los perfiles autoriales de':
		'The stylometric analyses allow this work to be associated with the authorial profiles of',
	'por cuanto algunas de sus obras aparecen en las primeras posiciones, aunque no de forma concluyente.':
		'because some of their works appear in the first positions, although not conclusively.',
	'Los resultados estilométricos disponibles requieren revisión antes de formular una conclusión autorial.':
		'The available stylometric results require review before an authorship conclusion can be formulated.',
	'Se ofrecen a continuación las 20 obras con usos léxicos más cercanos, tanto a la obra completa como, cuando es posible, a cada una de sus jornadas, empleando un corpus constituido por 3000 obras de 400 autores diferentes. Las distancias han sido calculadas usando las frecuencias de las 500 palabras más usuales con el método Delta de Burrows. Cuanto mayor cercanía hay a 0,0 es mayor la afinidad.':
		'The 20 works with the closest lexical usage are shown below, both for the complete work and, when possible, for each act, using a corpus made up of 3,000 works by 400 different authors. Distances have been calculated from the frequencies of the 500 most frequent words using Burrows’s Delta method. The closer the value is to 0.0, the greater the affinity.',
	'Informe generado desde Turso para validar visualización y flujo de consulta.':
		'Report generated from Turso to validate visualization and query flow.',
	'Se muestran las distancias cargadas en work_distances desde Turso. En la versión final, esta sección podrá enriquecerse con servicios de cálculo oficiales del proyecto.':
		'Distances loaded into work_distances from Turso are shown. In the final version, this section may be enriched with the project’s official calculation services.'
});

Object.assign(esToFr, {
	'Análisis estilométrico de': 'Analyse stylométrique de',
	'Informe estilométrico de': 'Rapport stylométrique de',
	'en ETSO.': 'dans ETSO.',
	'Obra sin atribución tradicional determinada.': 'Œuvre sans attribution traditionnelle déterminée.',
	'Obra atribuida a': 'Œuvre attribuée à',
	'Obra atribuida a la escritura en colaboración entre': 'Œuvre attribuée à une écriture collaborative entre',
	'Los análisis de estilometría no permiten asociar esta obra de forma clara con ningún perfil autorial del corpus.':
		"Les analyses stylométriques ne permettent pas d'associer clairement cette œuvre à un profil d'auteur du corpus.",
	'Los análisis no pueden asociar esta obra con el perfil estilístico del autor tradicional, debido a lo reducido de su corpus. Tampoco identifican de forma clara una alternativa autorial.':
		"Les analyses ne peuvent pas associer cette œuvre au profil stylistique de l'auteur traditionnel, en raison de la taille réduite de son corpus. Elles n'identifient pas non plus clairement une autre attribution.",
	'Esta obra no ha sido analizada estilométricamente, por lo que no es posible valorar su asociación con ningún perfil autorial del corpus.':
		"Cette œuvre n'a pas été analysée stylométriquement ; il n'est donc pas possible d'évaluer son association avec un profil d'auteur du corpus.",
	'Los resultados estilométricos disponibles requieren una revisión en profundidad antes de formular una conclusión autorial.':
		"Les résultats stylométriques disponibles nécessitent une révision approfondie avant de formuler une conclusion d'attribution.",
	'Los análisis de estilometría permiten asociar esta obra de forma clara con el perfil autorial de':
		"Les analyses stylométriques permettent d'associer clairement cette œuvre au profil d'auteur de",
	'Los análisis de estilometría permiten asociar esta obra con el perfil autorial de':
		"Les analyses stylométriques permettent d'associer cette œuvre au profil d'auteur de",
	'Los análisis de estilometría permiten asociar esta obra con los perfiles autoriales de':
		"Les analyses stylométriques permettent d'associer cette œuvre aux profils d'auteur de",
	'por cuanto algunas de sus obras aparecen en las primeras posiciones, aunque no de forma concluyente.':
		"car certaines de leurs œuvres apparaissent dans les premières positions, bien que de manière non concluante.",
	'Los resultados estilométricos disponibles requieren revisión antes de formular una conclusión autorial.':
		"Les résultats stylométriques disponibles nécessitent une révision avant de formuler une conclusion d'attribution.",
	'Se ofrecen a continuación las 20 obras con usos léxicos más cercanos, tanto a la obra completa como, cuando es posible, a cada una de sus jornadas, empleando un corpus constituido por 3000 obras de 400 autores diferentes. Las distancias han sido calculadas usando las frecuencias de las 500 palabras más usuales con el método Delta de Burrows. Cuanto mayor cercanía hay a 0,0 es mayor la afinidad.':
		"Les 20 œuvres aux usages lexicaux les plus proches sont présentées ci-dessous, à la fois pour l'œuvre complète et, lorsque c'est possible, pour chacune de ses journées, à partir d'un corpus de 3 000 œuvres de 400 auteurs différents. Les distances ont été calculées avec les fréquences des 500 mots les plus usuels selon la méthode Delta de Burrows. Plus la valeur est proche de 0,0, plus l'affinité est grande.",
	'Informe generado desde Turso para validar visualización y flujo de consulta.':
		'Rapport généré depuis Turso pour valider la visualisation et le flux de consultation.',
	'Se muestran las distancias cargadas en work_distances desde Turso. En la versión final, esta sección podrá enriquecerse con servicios de cálculo oficiales del proyecto.':
		'Les distances chargées dans work_distances depuis Turso sont affichées. Dans la version finale, cette section pourra être enrichie par les services de calcul officiels du projet.'
});

export const literalTranslations: Record<Exclude<Locale, 'es'>, Record<string, string>> = {
	en: esToEn,
	fr: esToFr,
	pt: esToPt,
	it: esToIt,
	de: esToDe,
	zh: esToZh,
	ja: esToJa,
	ko: esToKo,
	ru: esToRu,
	ar: esToAr
};

export const isSupportedLocale = (value: string): value is Locale =>
	(SUPPORTED_LOCALES as readonly string[]).includes(value);

export const splitLocalePath = (pathname: string): LocalePath => {
	const [firstSegment] = pathname.split('/').filter(Boolean);
	if (firstSegment && isSupportedLocale(firstSegment) && firstSegment !== DEFAULT_LOCALE) {
		const stripped = pathname.slice(firstSegment.length + 1) || '/';
		return { locale: firstSegment, pathname: stripped.startsWith('/') ? stripped : `/${stripped}` };
	}
	return { locale: DEFAULT_LOCALE, pathname };
};

export const getLocaleFromPath = (pathname: string): Locale => splitLocalePath(pathname).locale;

export const stripLocaleFromPath = (pathname: string): string => splitLocalePath(pathname).pathname;

export const getLocaleTextDirection = (locale: Locale): 'ltr' | 'rtl' => (locale === 'ar' ? 'rtl' : 'ltr');

export const localizePath = (path: string, locale: Locale): string => {
	if (!path || path.startsWith('#')) return path;
	if (/^[a-z][a-z\d+.-]*:/i.test(path) || path.startsWith('//')) return path;

	const [pathnameWithQuery, hash = ''] = path.split('#');
	const hashSuffix = hash ? `#${hash}` : '';
	const [pathnameOnly, query = ''] = pathnameWithQuery.split('?');
	const querySuffix = query ? `?${query}` : '';
	const pathname = pathnameOnly.startsWith('/') ? pathnameOnly : `/${pathnameOnly}`;
	const stripped = stripLocaleFromPath(pathname);

	if (locale === DEFAULT_LOCALE) return `${stripped}${querySuffix}${hashSuffix}`;
	if (isAssetLikePath(stripped)) return `${stripped}${querySuffix}${hashSuffix}`;
	return `/${locale}${stripped === '/' ? '' : stripped}${querySuffix}${hashSuffix}`;
};

export const localizeUrl = (pathOrUrl: string, locale: Locale): string => {
	if (/^https?:\/\//i.test(pathOrUrl)) {
		const url = new URL(pathOrUrl);
		if (url.origin !== SITE_URL) return pathOrUrl;
		url.pathname = localizePath(url.pathname, locale);
		return url.toString();
	}
	return `${SITE_URL}${localizePath(pathOrUrl, locale)}`;
};

export const getLocalizedAlternates = (pathOrUrl: string): Array<{ locale: Locale | 'x-default'; href: string }> => {
	const url = /^https?:\/\//i.test(pathOrUrl) ? new URL(pathOrUrl) : new URL(pathOrUrl, SITE_URL);
	const internalPath = stripLocaleFromPath(url.pathname);
	const suffix = `${url.search}${url.hash}`;
	return [
		...SUPPORTED_LOCALES.map((locale) => ({
			locale,
			href: `${SITE_URL}${localizePath(`${internalPath}${suffix}`, locale)}`
		})),
		{ locale: 'x-default', href: `${SITE_URL}${internalPath}${suffix}` }
	];
};

export const translateText = (locale: Locale, value: string): string => {
	if (locale === DEFAULT_LOCALE) return value;
	return literalTranslations[locale][value] ?? value;
};

export const translateJsonLd = (locale: Locale, value: unknown): unknown => {
	if (locale === DEFAULT_LOCALE) return value;
	if (Array.isArray(value)) return value.map((item) => translateJsonLd(locale, item));
	if (!value || typeof value !== 'object') return typeof value === 'string' ? translateText(locale, value) : value;

	return Object.fromEntries(
		Object.entries(value).map(([key, entry]) => {
			if (key === 'inLanguage') return [key, locale];
			if ((key === 'url' || key === '@id') && typeof entry === 'string') return [key, localizeUrl(entry, locale)];
			return [key, translateJsonLd(locale, entry)];
		})
	);
};

export const getUiTranslations = (locale: Locale): UiTranslations => uiTranslations[locale] ?? uiTranslations.es;

export const isAssetLikePath = (pathname: string): boolean => {
	const normalized = pathname.startsWith('/') ? pathname.slice(1) : pathname;
	if (!normalized) return false;
	const [firstSegment] = normalized.split('/');
	if (firstSegment === '_app' || firstSegment === 'api' || firstSegment === 'images') return true;
	if (firstSegment === 'favicon.svg' || firstSegment === 'robots.txt' || firstSegment === 'sitemap.xml') return true;
	return /\.[a-z0-9]{2,5}$/i.test(normalized);
};
