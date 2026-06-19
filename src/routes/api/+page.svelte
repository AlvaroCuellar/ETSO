<script lang="ts">
	import Breadcrumbs from '$lib/components/ui/Breadcrumbs.svelte';
	import SeoHead from '$lib/components/seo/SeoHead.svelte';
	import type { Locale } from '$lib/i18n';

	import type { PageData } from './$types';

	interface ApiEndpointText {
		method: string;
		path: string;
		description: string;
	}

	interface ApiPageText {
		seoDescription: string;
		breadcrumbHome: string;
		breadcrumbMoreInfo: string;
		intro: string[];
		endpointsHeading: string;
		endpoints: ApiEndpointText[];
		fieldsHeading: string;
		fieldColumn: string;
		descriptionColumn: string;
		fields: Array<[string, string]>;
		recommendedUseHeading: string;
		cachePrefix: string;
		cacheSuffix: string;
		exampleHeading: string;
		exampleLead: string;
	}

	let { data }: { data: PageData } = $props();

	const baseEndpoints = (
		one: string,
		all: string,
		authors = 'Devuelve el listado completo de autores con id numérico, clave textual y nombre.'
	): ApiEndpointText[] => [
		{
			method: 'GET',
			path: '/api/obras',
			description: all
		},
		{
			method: 'GET',
			path: '/api/obras/{id-publicId-o-slug}',
			description: one
		},
		{
			method: 'GET',
			path: '/api/autores',
			description: authors
		}
	];

	const publicIdDescriptionByLocale: Record<Locale, string> = {
		es: 'Identificador público numérico estable de la obra.',
		en: 'Stable numeric public identifier for the work.',
		fr: 'Identifiant public numérique stable de l’œuvre.',
		pt: 'Identificador público numérico estável da obra.',
		it: 'Identificatore pubblico numerico stabile dell’opera.',
		de: 'Stabile numerische öffentliche Kennung des Werkes.',
		zh: '作品的稳定数字公共标识符。',
		ja: '作品の安定した数値公開識別子。',
		ko: '작품의 안정적인 숫자 공개 식별자입니다.',
		ru: 'Стабильный числовой публичный идентификатор произведения.',
		ar: 'معرّف عام رقمي ثابت للعمل.'
	};

	const esFields: Array<[string, string]> = [
		['id', 'Identificador estable de la obra.'],
		['slug', 'Identificador legible usado en las URLs públicas.'],
		['title', 'Título tal como viene en la base de datos, incluido el artículo final cuando exista.'],
		['displayTitle', 'Título transformado con el mismo proceso que utiliza la web de ETSO.'],
		['titleVariants', 'Otros títulos de la obra tal como vienen en la base de datos.'],
		['displayTitleVariants', 'Otros títulos transformados con el mismo proceso que utiliza la web.'],
		['genre', 'Género de la obra.'],
		['origin', 'Procedencia o fuente del texto usado por ETSO.'],
		['textState', 'Estado del texto dentro del catálogo.'],
		['addedOn', 'Fecha de incorporación al catálogo, cuando consta.'],
		['resultado1', 'Resultado estilométrico de la obra en forma de frase.'],
		['flags', 'Indicadores booleanos sobre informe, resumen, examen de autorías y acceso textual.'],
		['traditionalAttributionText', 'Atribución tradicional lista para mostrar.'],
		['traditionalAttributionPhrase', 'Frase de atribución tradicional con texto, Markdown, HTML y partes enlazables.'],
		['stylometryAttributionText', 'Atribución estilométrica lista para mostrar.'],
		['traditionalAttribution', 'Atribución tradicional normalizada.'],
		['stylometryAttribution', 'Atribución estilométrica normalizada.'],
		['authorId / authorKey', 'Dentro de las autorías, authorId es el identificador público numérico del autor y authorKey conserva la clave textual usada por las URLs de ETSO.'],
		['resources', 'Enlaces públicos relacionados dentro de ETSO.']
	];

	const pageTextByLocale: Record<Locale, ApiPageText> = {
		es: {
			seoDescription:
				'Documentación de la API pública de ETSO para consultar metadatos y resultados estilométricos de obras.',
			breadcrumbHome: 'Inicio',
			breadcrumbMoreInfo: 'Más información',
			intro: [
				'ETSO ofrece una API pública para consultar los metadatos de las obras del catálogo desde otros proyectos. La API está pensada para reutilizar identificadores, títulos, atribuciones, enlaces y el resultado estilométrico de cada obra.',
				'La información se entrega en formato JSON y puede utilizarse para integrar los datos de ETSO en catálogos, visualizaciones, buscadores o herramientas de investigación.'
			],
			endpointsHeading: 'Endpoints',
			endpoints: baseEndpoints(
				'Devuelve una sola obra usando su identificador o su slug público.',
				'Devuelve el catálogo completo de obras con sus metadatos públicos.'
			),
			fieldsHeading: 'Campos principales',
			fieldColumn: 'Campo',
			descriptionColumn: 'Descripción',
			fields: esFields,
			recommendedUseHeading: 'Uso recomendado',
			cachePrefix: 'Las respuestas se sirven con caché pública:',
			cacheSuffix:
				'Para integraciones externas se recomienda cachear localmente la respuesta y no llamar a la API en cada renderizado.',
			exampleHeading: 'Ejemplo',
			exampleLead: 'Consulta de una obra concreta y respuesta completa:'
		},
		en: {
			seoDescription: 'Documentation for the public ETSO API for querying work metadata and stylometric results.',
			breadcrumbHome: 'Home',
			breadcrumbMoreInfo: 'More information',
			intro: [
				'ETSO provides a public API for querying catalogue work metadata from other projects. The API is designed to reuse identifiers, titles, attributions, links, and the stylometric result for each work.',
				'The information is returned as JSON and can be used to integrate ETSO data into catalogues, visualizations, search engines, or research tools.'
			],
			endpointsHeading: 'Endpoints',
			endpoints: baseEndpoints(
				'Returns a single work using its identifier or public slug.',
				'Returns the complete work catalogue with its public metadata.'
			),
			fieldsHeading: 'Main Fields',
			fieldColumn: 'Field',
			descriptionColumn: 'Description',
			fields: [
				['id', 'Stable work identifier.'],
				['slug', 'Readable identifier used in public URLs.'],
				['title', 'Title as stored in the database, including the final article when present.'],
				['displayTitle', 'Title transformed with the same process used by the ETSO website.'],
				['titleVariants', 'Other work titles as stored in the database.'],
				['displayTitleVariants', 'Other titles transformed with the same process used by the website.'],
				['genre', 'Work genre.'],
				['origin', 'Source or provenance of the text used by ETSO.'],
				['textState', 'Text state in the catalogue.'],
				['addedOn', 'Date added to the catalogue, when available.'],
				['resultado1', 'Stylometric result for the work as a sentence.'],
				['flags', 'Boolean indicators for report, summary, authorship exam, and text access.'],
				['traditionalAttributionText', 'Traditional attribution ready for display.'],
				['traditionalAttributionPhrase', 'Traditional attribution sentence with text, Markdown, HTML, and linkable parts.'],
				['stylometryAttributionText', 'Stylometric attribution ready for display.'],
				['traditionalAttribution', 'Normalized traditional attribution.'],
				['stylometryAttribution', 'Normalized stylometric attribution.'],
				['resources', 'Related public links within ETSO.']
			],
			recommendedUseHeading: 'Recommended Use',
			cachePrefix: 'Responses are served with public cache:',
			cacheSuffix:
				'For external integrations, cache the response locally and avoid calling the API on every render.',
			exampleHeading: 'Example',
			exampleLead: 'Query for a specific work and complete response:'
		},
		fr: {
			seoDescription: "Documentation de l’API publique d’ETSO pour consulter les métadonnées et les résultats stylométriques des œuvres.",
			breadcrumbHome: 'Accueil',
			breadcrumbMoreInfo: "Plus d'information",
			intro: [
				"ETSO propose une API publique pour consulter depuis d’autres projets les métadonnées des œuvres du catalogue. L’API permet de réutiliser les identifiants, les titres, les attributions, les liens et le résultat stylométrique de chaque œuvre.",
				"Les informations sont fournies au format JSON et peuvent servir à intégrer les données d’ETSO dans des catalogues, visualisations, moteurs de recherche ou outils de recherche."
			],
			endpointsHeading: 'Endpoints',
			endpoints: baseEndpoints(
				"Renvoie une seule œuvre à partir de son identifiant ou de son slug public.",
				"Renvoie le catalogue complet des œuvres avec leurs métadonnées publiques."
			),
			fieldsHeading: 'Champs principaux',
			fieldColumn: 'Champ',
			descriptionColumn: 'Description',
			fields: [
				['id', "Identifiant stable de l’œuvre."],
				['slug', "Identifiant lisible utilisé dans les URL publiques."],
				['title', "Titre tel qu’il figure dans la base de données, avec l’article final le cas échéant."],
				['displayTitle', "Titre transformé selon le même procédé que celui utilisé sur le site ETSO."],
				['titleVariants', "Autres titres de l’œuvre tels qu’ils figurent dans la base de données."],
				['displayTitleVariants', "Autres titres transformés selon le même procédé que celui utilisé sur le site."],
				['genre', "Genre de l’œuvre."],
				['origin', "Provenance ou source du texte utilisé par ETSO."],
				['textState', "État du texte dans le catalogue."],
				['addedOn', "Date d’incorporation au catalogue, lorsqu’elle est indiquée."],
				['resultado1', "Résultat stylométrique de l’œuvre sous forme de phrase."],
				['flags', "Indicateurs booléens sur le rapport, le résumé, l’examen d’autorie et l’accès textuel."],
				['traditionalAttributionText', "Attribution traditionnelle prête à afficher."],
				['traditionalAttributionPhrase', "Phrase d’attribution traditionnelle avec texte, Markdown, HTML et parties liables."],
				['stylometryAttributionText', "Attribution stylométrique prête à afficher."],
				['traditionalAttribution', "Attribution traditionnelle normalisée."],
				['stylometryAttribution', "Attribution stylométrique normalisée."],
				['resources', "Liens publics associés dans ETSO."]
			],
			recommendedUseHeading: 'Utilisation recommandée',
			cachePrefix: 'Les réponses sont servies avec un cache public :',
			cacheSuffix:
				'Pour les intégrations externes, il est recommandé de mettre la réponse en cache localement et de ne pas appeler l’API à chaque rendu.',
			exampleHeading: 'Exemple',
			exampleLead: "Requête pour une œuvre précise et réponse complète :"
		},
		pt: {
			seoDescription: 'Documentação da API pública do ETSO para consultar metadados e resultados estilométricos das obras.',
			breadcrumbHome: 'Início',
			breadcrumbMoreInfo: 'Mais informações',
			intro: [
				'O ETSO oferece uma API pública para consultar, a partir de outros projetos, os metadados das obras do catálogo. A API foi pensada para reutilizar identificadores, títulos, atribuições, links e o resultado estilométrico de cada obra.',
				'As informações são entregues em formato JSON e podem ser usadas para integrar os dados do ETSO em catálogos, visualizações, mecanismos de busca ou ferramentas de pesquisa.'
			],
			endpointsHeading: 'Endpoints',
			endpoints: baseEndpoints(
				'Devolve uma única obra usando seu identificador ou slug público.',
				'Devolve o catálogo completo de obras com seus metadados públicos.'
			),
			fieldsHeading: 'Campos principais',
			fieldColumn: 'Campo',
			descriptionColumn: 'Descrição',
			fields: [
				['id', 'Identificador estável da obra.'],
				['slug', 'Identificador legível usado nas URLs públicas.'],
				['title', 'Título como aparece na base de dados, incluindo o artigo final quando existir.'],
				['displayTitle', 'Título transformado com o mesmo processo usado pelo site do ETSO.'],
				['titleVariants', 'Outros títulos da obra como aparecem na base de dados.'],
				['displayTitleVariants', 'Outros títulos transformados com o mesmo processo usado pelo site.'],
				['genre', 'Gênero da obra.'],
				['origin', 'Procedência ou fonte do texto usado pelo ETSO.'],
				['textState', 'Estado do texto dentro do catálogo.'],
				['addedOn', 'Data de incorporação ao catálogo, quando consta.'],
				['resultado1', 'Resultado estilométrico da obra em forma de frase.'],
				['flags', 'Indicadores booleanos sobre relatório, resumo, exame de autorias e acesso textual.'],
				['traditionalAttributionText', 'Atribuição tradicional pronta para exibição.'],
				['traditionalAttributionPhrase', 'Frase de atribuição tradicional com texto, Markdown, HTML e partes linkáveis.'],
				['stylometryAttributionText', 'Atribuição estilométrica pronta para exibição.'],
				['traditionalAttribution', 'Atribuição tradicional normalizada.'],
				['stylometryAttribution', 'Atribuição estilométrica normalizada.'],
				['resources', 'Links públicos relacionados dentro do ETSO.']
			],
			recommendedUseHeading: 'Uso recomendado',
			cachePrefix: 'As respostas são servidas com cache público:',
			cacheSuffix:
				'Para integrações externas, recomenda-se armazenar a resposta em cache localmente e não chamar a API a cada renderização.',
			exampleHeading: 'Exemplo',
			exampleLead: 'Consulta de uma obra específica e resposta completa:'
		},
		it: {
			seoDescription: 'Documentazione dell’API pubblica di ETSO per consultare metadati e risultati stilometrici delle opere.',
			breadcrumbHome: 'Inizio',
			breadcrumbMoreInfo: 'Altre informazioni',
			intro: [
				'ETSO offre un’API pubblica per consultare da altri progetti i metadati delle opere del catalogo. L’API è pensata per riutilizzare identificatori, titoli, attribuzioni, link e il risultato stilometrico di ogni opera.',
				'Le informazioni sono fornite in formato JSON e possono essere usate per integrare i dati di ETSO in cataloghi, visualizzazioni, motori di ricerca o strumenti di ricerca.'
			],
			endpointsHeading: 'Endpoint',
			endpoints: baseEndpoints(
				'Restituisce una singola opera usando il suo identificatore o slug pubblico.',
				'Restituisce il catalogo completo delle opere con i relativi metadati pubblici.'
			),
			fieldsHeading: 'Campi principali',
			fieldColumn: 'Campo',
			descriptionColumn: 'Descrizione',
			fields: [
				['id', 'Identificatore stabile dell’opera.'],
				['slug', 'Identificatore leggibile usato negli URL pubblici.'],
				['title', 'Titolo come compare nel database, incluso l’articolo finale quando presente.'],
				['displayTitle', 'Titolo trasformato con lo stesso processo usato dal sito ETSO.'],
				['titleVariants', 'Altri titoli dell’opera come compaiono nel database.'],
				['displayTitleVariants', 'Altri titoli trasformati con lo stesso processo usato dal sito.'],
				['genre', 'Genere dell’opera.'],
				['origin', 'Provenienza o fonte del testo usato da ETSO.'],
				['textState', 'Stato del testo nel catalogo.'],
				['addedOn', 'Data di inserimento nel catalogo, quando disponibile.'],
				['resultado1', 'Risultato stilometrico dell’opera in forma di frase.'],
				['flags', 'Indicatori booleani su rapporto, riassunto, esame delle autorie e accesso testuale.'],
				['traditionalAttributionText', 'Attribuzione tradizionale pronta per la visualizzazione.'],
				['traditionalAttributionPhrase', 'Frase di attribuzione tradizionale con testo, Markdown, HTML e parti collegabili.'],
				['stylometryAttributionText', 'Attribuzione stilometrica pronta per la visualizzazione.'],
				['traditionalAttribution', 'Attribuzione tradizionale normalizzata.'],
				['stylometryAttribution', 'Attribuzione stilometrica normalizzata.'],
				['resources', 'Link pubblici correlati all’interno di ETSO.']
			],
			recommendedUseHeading: 'Uso consigliato',
			cachePrefix: 'Le risposte sono servite con cache pubblica:',
			cacheSuffix:
				'Per integrazioni esterne si consiglia di memorizzare localmente la risposta e di non chiamare l’API a ogni rendering.',
			exampleHeading: 'Esempio',
			exampleLead: 'Query di un’opera specifica e risposta completa:'
		},
		de: {
			seoDescription: 'Dokumentation der öffentlichen ETSO-API zum Abrufen von Werkmetadaten und stilometrischen Ergebnissen.',
			breadcrumbHome: 'Start',
			breadcrumbMoreInfo: 'Weitere Informationen',
			intro: [
				'ETSO stellt eine öffentliche API bereit, mit der andere Projekte die Metadaten der Werke im Katalog abrufen können. Die API ist dafür gedacht, Kennungen, Titel, Zuschreibungen, Links und das stilometrische Ergebnis jedes Werkes wiederzuverwenden.',
				'Die Informationen werden im JSON-Format geliefert und können in Kataloge, Visualisierungen, Suchsysteme oder Forschungswerkzeuge integriert werden.'
			],
			endpointsHeading: 'Endpoints',
			endpoints: baseEndpoints(
				'Gibt ein einzelnes Werk anhand seiner Kennung oder seines öffentlichen Slugs zurück.',
				'Gibt den vollständigen Werkkatalog mit seinen öffentlichen Metadaten zurück.'
			),
			fieldsHeading: 'Hauptfelder',
			fieldColumn: 'Feld',
			descriptionColumn: 'Beschreibung',
			fields: [
				['id', 'Stabile Werkkennung.'],
				['slug', 'Lesbare Kennung, die in öffentlichen URLs verwendet wird.'],
				['title', 'Titel wie in der Datenbank gespeichert, einschließlich nachgestelltem Artikel, falls vorhanden.'],
				['displayTitle', 'Titel, der mit demselben Verfahren umgeformt wird wie auf der ETSO-Website.'],
				['titleVariants', 'Weitere Werktitel wie in der Datenbank gespeichert.'],
				['displayTitleVariants', 'Weitere Titel, die mit demselben Verfahren wie auf der Website umgeformt werden.'],
				['genre', 'Gattung des Werkes.'],
				['origin', 'Herkunft oder Quelle des von ETSO verwendeten Textes.'],
				['textState', 'Textzustand im Katalog.'],
				['addedOn', 'Datum der Aufnahme in den Katalog, sofern vorhanden.'],
				['resultado1', 'Stilometrisches Ergebnis des Werkes als Satz.'],
				['flags', 'Boolesche Angaben zu Bericht, Zusammenfassung, Autorschaftsprüfung und Textzugang.'],
				['traditionalAttributionText', 'Traditionelle Zuschreibung zur direkten Anzeige.'],
				['traditionalAttributionPhrase', 'Satz der traditionellen Zuschreibung mit Text, Markdown, HTML und verlinkbaren Teilen.'],
				['stylometryAttributionText', 'Stilometrische Zuschreibung zur direkten Anzeige.'],
				['traditionalAttribution', 'Normalisierte traditionelle Zuschreibung.'],
				['stylometryAttribution', 'Normalisierte stilometrische Zuschreibung.'],
				['resources', 'Zugehörige öffentliche Links innerhalb von ETSO.']
			],
			recommendedUseHeading: 'Empfohlene Nutzung',
			cachePrefix: 'Antworten werden mit öffentlichem Cache ausgeliefert:',
			cacheSuffix:
				'Für externe Integrationen wird empfohlen, die Antwort lokal zwischenzuspeichern und die API nicht bei jedem Rendern aufzurufen.',
			exampleHeading: 'Beispiel',
			exampleLead: 'Abfrage eines bestimmten Werkes und vollständige Antwort:'
		},
		zh: {
			seoDescription: 'ETSO 公共 API 文档，用于查询作品元数据和文体计量结果。',
			breadcrumbHome: '首页',
			breadcrumbMoreInfo: '更多信息',
			intro: [
				'ETSO 提供公共 API，供其他项目查询目录中作品的元数据。该 API 可用于复用每部作品的标识符、标题、归属、链接和文体计量结果。',
				'信息以 JSON 格式返回，可用于将 ETSO 数据整合到目录、可视化、搜索系统或研究工具中。'
			],
			endpointsHeading: '端点',
			endpoints: baseEndpoints(
				'使用作品标识符或公共 slug 返回单部作品。',
				'返回完整作品目录及其公共元数据。'
			),
			fieldsHeading: '主要字段',
			fieldColumn: '字段',
			descriptionColumn: '说明',
			fields: [
				['id', '作品的稳定标识符。'],
				['slug', '公共 URL 中使用的可读标识符。'],
				['title', '数据库中的标题，包括存在时位于末尾的冠词。'],
				['displayTitle', '按照 ETSO 网站使用的同一流程转换后的标题。'],
				['titleVariants', '数据库中的其他作品标题。'],
				['displayTitleVariants', '按照网站同一流程转换后的其他标题。'],
				['genre', '作品体裁。'],
				['origin', 'ETSO 使用文本的来源或出处。'],
				['textState', '目录中的文本状态。'],
				['addedOn', '加入目录的日期，如有记录。'],
				['resultado1', '作品的文体计量结果，以句子形式提供。'],
				['flags', '关于报告、摘要、作者归属检查和文本访问的布尔标记。'],
				['traditionalAttributionText', '可直接显示的传统归属。'],
				['traditionalAttributionPhrase', '包含文本、Markdown、HTML 和可链接片段的传统归属句。'],
				['stylometryAttributionText', '可直接显示的文体计量归属。'],
				['traditionalAttribution', '规范化的传统归属。'],
				['stylometryAttribution', '规范化的文体计量归属。'],
				['resources', 'ETSO 内部相关的公共链接。']
			],
			recommendedUseHeading: '推荐用法',
			cachePrefix: '响应使用公共缓存：',
			cacheSuffix: '外部集成建议在本地缓存响应，不要在每次渲染时调用 API。',
			exampleHeading: '示例',
			exampleLead: '查询某一具体作品及完整响应：'
		},
		ja: {
			seoDescription: '作品メタデータと文体計量結果を取得するための ETSO 公開 API ドキュメント。',
			breadcrumbHome: 'ホーム',
			breadcrumbMoreInfo: '詳細情報',
			intro: [
				'ETSO は、他のプロジェクトからカタログ作品のメタデータを参照できる公開 API を提供しています。この API は、各作品の識別子、タイトル、帰属、リンク、文体計量結果を再利用するためのものです。',
				'情報は JSON 形式で返され、ETSO のデータをカタログ、可視化、検索システム、研究ツールに統合できます。'
			],
			endpointsHeading: 'エンドポイント',
			endpoints: baseEndpoints(
				'識別子または公開 slug を使って単一の作品を返します。',
				'公開メタデータ付きの作品カタログ全体を返します。'
			),
			fieldsHeading: '主なフィールド',
			fieldColumn: 'フィールド',
			descriptionColumn: '説明',
			fields: [
				['id', '作品の安定した識別子。'],
				['slug', '公開 URL で使用される読みやすい識別子。'],
				['title', 'データベース内のタイトル。末尾の冠詞がある場合はそれも含みます。'],
				['displayTitle', 'ETSO のウェブサイトと同じ処理で変換されたタイトル。'],
				['titleVariants', 'データベース内の作品の別タイトル。'],
				['displayTitleVariants', 'ウェブサイトと同じ処理で変換された別タイトル。'],
				['genre', '作品のジャンル。'],
				['origin', 'ETSO が使用するテキストの出典または由来。'],
				['textState', 'カタログ内でのテキストの状態。'],
				['addedOn', '記録がある場合のカタログ追加日。'],
				['resultado1', '作品の文体計量結果を文として示したもの。'],
				['flags', '報告書、要約、作者帰属調査、テキストアクセスに関する真偽値。'],
				['traditionalAttributionText', '表示用の伝統的帰属。'],
				['traditionalAttributionPhrase', 'テキスト、Markdown、HTML、リンク可能な部分を含む伝統的帰属文。'],
				['stylometryAttributionText', '表示用の文体計量帰属。'],
				['traditionalAttribution', '正規化された伝統的帰属。'],
				['stylometryAttribution', '正規化された文体計量帰属。'],
				['resources', 'ETSO 内の関連する公開リンク。']
			],
			recommendedUseHeading: '推奨される使い方',
			cachePrefix: 'レスポンスは公開キャッシュ付きで配信されます：',
			cacheSuffix: '外部連携ではレスポンスをローカルにキャッシュし、レンダリングごとに API を呼び出さないことを推奨します。',
			exampleHeading: '例',
			exampleLead: '特定の作品のクエリと完全なレスポンス：'
		},
		ko: {
			seoDescription: '작품 메타데이터와 문체계량 결과를 조회하기 위한 ETSO 공개 API 문서입니다.',
			breadcrumbHome: '홈',
			breadcrumbMoreInfo: '추가 정보',
			intro: [
				'ETSO는 다른 프로젝트에서 카탈로그 작품의 메타데이터를 조회할 수 있는 공개 API를 제공합니다. 이 API는 각 작품의 식별자, 제목, 귀속, 링크, 문체계량 결과를 재사용하도록 설계되었습니다.',
				'정보는 JSON 형식으로 제공되며 ETSO 데이터를 카탈로그, 시각화, 검색 시스템 또는 연구 도구에 통합하는 데 사용할 수 있습니다.'
			],
			endpointsHeading: '엔드포인트',
			endpoints: baseEndpoints(
				'식별자 또는 공개 slug를 사용해 단일 작품을 반환합니다.',
				'공개 메타데이터가 포함된 전체 작품 카탈로그를 반환합니다.'
			),
			fieldsHeading: '주요 필드',
			fieldColumn: '필드',
			descriptionColumn: '설명',
			fields: [
				['id', '작품의 안정적인 식별자입니다.'],
				['slug', '공개 URL에서 사용하는 읽기 쉬운 식별자입니다.'],
				['title', '데이터베이스에 저장된 제목이며, 끝에 오는 관사가 있으면 포함합니다.'],
				['displayTitle', 'ETSO 웹사이트와 같은 절차로 변환된 제목입니다.'],
				['titleVariants', '데이터베이스에 저장된 작품의 다른 제목입니다.'],
				['displayTitleVariants', '웹사이트와 같은 절차로 변환된 다른 제목입니다.'],
				['genre', '작품의 장르입니다.'],
				['origin', 'ETSO가 사용하는 텍스트의 출처입니다.'],
				['textState', '카탈로그 내 텍스트 상태입니다.'],
				['addedOn', '기록이 있을 경우 카탈로그에 추가된 날짜입니다.'],
				['resultado1', '작품의 문체계량 결과를 문장 형태로 제공합니다.'],
				['flags', '보고서, 요약, 저자 귀속 조사, 텍스트 접근에 관한 불리언 표시입니다.'],
				['traditionalAttributionText', '표시용 전통적 귀속입니다.'],
				['traditionalAttributionPhrase', '텍스트, Markdown, HTML, 링크 가능한 부분을 포함한 전통적 귀속 문장입니다.'],
				['stylometryAttributionText', '표시용 문체계량 귀속입니다.'],
				['traditionalAttribution', '정규화된 전통적 귀속입니다.'],
				['stylometryAttribution', '정규화된 문체계량 귀속입니다.'],
				['resources', 'ETSO 내부의 관련 공개 링크입니다.']
			],
			recommendedUseHeading: '권장 사용법',
			cachePrefix: '응답은 공개 캐시와 함께 제공됩니다:',
			cacheSuffix: '외부 연동에서는 응답을 로컬에 캐시하고 렌더링마다 API를 호출하지 않는 것을 권장합니다.',
			exampleHeading: '예시',
			exampleLead: '특정 작품 조회와 전체 응답:'
		},
		ru: {
			seoDescription: 'Документация публичного API ETSO для получения метаданных произведений и стилометрических результатов.',
			breadcrumbHome: 'Главная',
			breadcrumbMoreInfo: 'Дополнительная информация',
			intro: [
				'ETSO предоставляет публичный API для получения метаданных произведений каталога из других проектов. API предназначен для повторного использования идентификаторов, названий, атрибуций, ссылок и стилометрического результата каждого произведения.',
				'Данные возвращаются в формате JSON и могут использоваться для интеграции данных ETSO в каталоги, визуализации, поисковые системы или исследовательские инструменты.'
			],
			endpointsHeading: 'Эндпоинты',
			endpoints: baseEndpoints(
				'Возвращает одно произведение по его идентификатору или публичному slug.',
				'Возвращает полный каталог произведений с публичными метаданными.'
			),
			fieldsHeading: 'Основные поля',
			fieldColumn: 'Поле',
			descriptionColumn: 'Описание',
			fields: [
				['id', 'Стабильный идентификатор произведения.'],
				['slug', 'Читаемый идентификатор, используемый в публичных URL.'],
				['title', 'Название в базе данных, включая конечный артикль, если он есть.'],
				['displayTitle', 'Название, преобразованное тем же способом, что и на сайте ETSO.'],
				['titleVariants', 'Другие названия произведения в базе данных.'],
				['displayTitleVariants', 'Другие названия, преобразованные тем же способом, что и на сайте.'],
				['genre', 'Жанр произведения.'],
				['origin', 'Происхождение или источник текста, используемого ETSO.'],
				['textState', 'Состояние текста в каталоге.'],
				['addedOn', 'Дата добавления в каталог, если указана.'],
				['resultado1', 'Стилометрический результат произведения в виде фразы.'],
				['flags', 'Логические индикаторы отчета, резюме, проверки авторства и доступа к тексту.'],
				['traditionalAttributionText', 'Традиционная атрибуция, готовая для отображения.'],
				['traditionalAttributionPhrase', 'Фраза традиционной атрибуции с текстом, Markdown, HTML и ссылочными частями.'],
				['stylometryAttributionText', 'Стилометрическая атрибуция, готовая для отображения.'],
				['traditionalAttribution', 'Нормализованная традиционная атрибуция.'],
				['stylometryAttribution', 'Нормализованная стилометрическая атрибуция.'],
				['resources', 'Связанные публичные ссылки внутри ETSO.']
			],
			recommendedUseHeading: 'Рекомендуемое использование',
			cachePrefix: 'Ответы отдаются с публичным кэшем:',
			cacheSuffix: 'Для внешних интеграций рекомендуется кэшировать ответ локально и не вызывать API при каждом рендеринге.',
			exampleHeading: 'Пример',
			exampleLead: 'Запрос конкретного произведения и полный ответ:'
		},
		ar: {
			seoDescription: 'توثيق واجهة API العامة في ETSO للاستعلام عن بيانات الأعمال الوصفية ونتائج القياس الأسلوبي.',
			breadcrumbHome: 'الرئيسية',
			breadcrumbMoreInfo: 'مزيد من المعلومات',
			intro: [
				'توفّر ETSO واجهة API عامة للاستعلام من مشاريع أخرى عن البيانات الوصفية لأعمال الفهرس. صُممت الواجهة لإعادة استخدام المعرّفات والعناوين والإسنادات والروابط ونتيجة القياس الأسلوبي لكل عمل.',
				'تُقدَّم المعلومات بصيغة JSON ويمكن استخدامها لدمج بيانات ETSO في الفهارس أو التصورات البيانية أو محركات البحث أو أدوات البحث.'
			],
			endpointsHeading: 'نقاط الوصول',
			endpoints: baseEndpoints(
				'تعيد عملًا واحدًا باستخدام معرّفه أو slug العام الخاص به.',
				'تعيد فهرس الأعمال الكامل مع بياناته الوصفية العامة.'
			),
			fieldsHeading: 'الحقول الرئيسية',
			fieldColumn: 'الحقل',
			descriptionColumn: 'الوصف',
			fields: [
				['id', 'معرّف ثابت للعمل.'],
				['slug', 'معرّف مقروء يُستخدم في عناوين URL العامة.'],
				['title', 'العنوان كما يظهر في قاعدة البيانات، بما في ذلك أداة التعريف النهائية عند وجودها.'],
				['displayTitle', 'العنوان بعد تحويله بالعملية نفسها التي يستخدمها موقع ETSO.'],
				['titleVariants', 'عناوين أخرى للعمل كما تظهر في قاعدة البيانات.'],
				['displayTitleVariants', 'عناوين أخرى بعد تحويلها بالعملية نفسها التي يستخدمها الموقع.'],
				['genre', 'نوع العمل الأدبي.'],
				['origin', 'مصدر النص أو منشؤه كما تستخدمه ETSO.'],
				['textState', 'حالة النص داخل الفهرس.'],
				['addedOn', 'تاريخ إدراج العمل في الفهرس، عند توفره.'],
				['resultado1', 'نتيجة القياس الأسلوبي للعمل في صيغة جملة.'],
				['flags', 'مؤشرات منطقية حول التقرير والملخص وفحص الإسناد والوصول إلى النص.'],
				['traditionalAttributionText', 'الإسناد التقليدي جاهزًا للعرض.'],
				['traditionalAttributionPhrase', 'جملة الإسناد التقليدي مع نص وMarkdown وHTML وأجزاء قابلة للربط.'],
				['stylometryAttributionText', 'الإسناد الأسلوبي جاهزًا للعرض.'],
				['traditionalAttribution', 'الإسناد التقليدي بصيغة موحدة.'],
				['stylometryAttribution', 'الإسناد الأسلوبي بصيغة موحدة.'],
				['resources', 'روابط عامة مرتبطة داخل ETSO.']
			],
			recommendedUseHeading: 'الاستخدام الموصى به',
			cachePrefix: 'تُقدَّم الاستجابات مع ذاكرة تخزين مؤقت عامة:',
			cacheSuffix: 'في عمليات الدمج الخارجية، يُنصح بتخزين الاستجابة محليًا وعدم استدعاء API في كل عملية عرض.',
			exampleHeading: 'مثال',
			exampleLead: 'استعلام عن عمل محدد والاستجابة الكاملة:'
		}
	};

	const text = $derived(pageTextByLocale[data.locale] ?? pageTextByLocale.es);
	const publicIdDescription = $derived(
		publicIdDescriptionByLocale[data.locale] ?? publicIdDescriptionByLocale.es
	);

	const exampleRequest = 'https://etso.es/api/obras/690677';
	const exampleResponse = `{
  "meta": {
    "contentPolicy": {
      "includesFullText": false,
      "includesSummaries": false,
      "excludedFields": [
        "fullText",
        "text",
        "shortSummary",
        "summaryText",
        "resumen_breve",
        "resumen_largo"
      ]
    }
  },
  "work": {
    "id": "DESCONOCIDO_FrancesaLaura",
    "publicId": 690677,
    "slug": "la-francesa-laura",
    "title": "Francesa Laura, La",
    "displayTitle": "La francesa Laura",
    "titleVariants": [],
    "displayTitleVariants": [],
    "genre": "Comedia",
    "origin": "El texto procede de la edición de Cuéllar y Vega.",
    "textState": "Bueno",
    "addedOn": "2021/03",
    "resultado1": "Los analisis de estilometria permiten asociar esta obra de forma clara con el perfil autorial de Lope de Vega Carpio.",
    "flags": {
      "inAuthorshipExam": true,
      "hasSummary": true,
      "hasReport": true,
      "hasTextAccess": true
    },
    "traditionalAttributionText": "Desconocido",
    "traditionalAttributionPhrase": {
      "text": "Obra de atribución desconocida.",
      "markdown": "Obra de atribución [desconocida](https://etso.es/autores/desconocido).",
      "html": "Obra de atribución <a href=\\"/autores/desconocido\\">desconocida</a>.",
      "parts": [
        {
          "kind": "text",
          "value": "Obra de atribución "
        },
        {
          "kind": "author",
          "value": "desconocida",
          "authorId": 104,
          "authorKey": "desconocido",
          "href": "/autores/desconocido",
          "url": "https://etso.es/autores/desconocido"
        },
        {
          "kind": "text",
          "value": "."
        }
      ]
    },
    "stylometryAttributionText": "Lope de Vega Carpio [Segura]",
    "traditionalAttribution": {
      "groups": [
        {
          "members": [
            {
              "authorId": 104,
              "authorKey": "desconocido",
              "authorName": "Desconocido"
            }
          ]
        }
      ],
      "connector": "and",
      "rawExpression": "desconocido"
    },
    "stylometryAttribution": {
      "groups": [
        {
          "members": [
            {
              "authorId": 364,
              "authorKey": "vega_carpio_lope_de",
              "authorName": "Lope de Vega Carpio",
              "confidence": "segura"
            }
          ]
        }
      ],
      "connector": "and",
      "rawExpression": "vega_carpio_lope_de[segura]"
    },
    "resources": {
      "work": "/obras/la-francesa-laura",
      "summary": "/obras/la-francesa-laura/resumen",
      "report": "/informes/analisis-estilometrico-la-francesa-laura",
      "textAccess": [
        {
          "label": "Texto BITESO",
          "href": "/biteso/francesa-laura-la",
          "kind": "biteso"
        }
      ]
    }
  }
}`;
</script>

<SeoHead title="API" description={text.seoDescription} path="/api" />

<div class="grid gap-8">
	<Breadcrumbs items={[{ label: text.breadcrumbHome, href: '/' }, { label: text.breadcrumbMoreInfo, href: '/mas-informacion' }, { label: 'API' }]} />

	<section class="grid gap-4">
		<h1 class="m-0 text-[clamp(1.7rem,2.9vw,2.25rem)] font-bold leading-[1.12] text-brand-blue-dark">
			API
		</h1>
		{#each text.intro as paragraph}
			<p class="m-0 leading-[1.68] text-text-main">{paragraph}</p>
		{/each}
	</section>

	<section class="grid gap-3">
		<h2 class="m-0 text-[clamp(1.25rem,2vw,1.55rem)] font-semibold text-brand-blue-dark">{text.endpointsHeading}</h2>
		<div class="grid gap-3">
			{#each text.endpoints as endpoint}
				<article class="grid gap-2 rounded-md border border-border bg-white p-4">
					<div class="flex flex-wrap items-center gap-2 font-ui">
						<code class="rounded bg-surface-accent-purple px-2 py-1 text-[0.82rem] font-bold text-text-accent-purple">{endpoint.method}</code>
						<code class="text-[0.95rem] text-brand-blue-dark">{endpoint.path}</code>
					</div>
					<p class="m-0 leading-[1.62] text-text-main">{endpoint.description}</p>
				</article>
			{/each}
		</div>
	</section>

	<section class="grid gap-3">
		<h2 class="m-0 text-[clamp(1.25rem,2vw,1.55rem)] font-semibold text-brand-blue-dark">{text.fieldsHeading}</h2>
		<div class="overflow-x-auto rounded-md border border-border">
			<table class="w-full min-w-[680px] border-collapse bg-white text-left text-[0.95rem]">
				<thead class="bg-surface-soft font-ui text-brand-blue-dark">
					<tr>
						<th class="border-b border-border px-4 py-3 font-semibold">{text.fieldColumn}</th>
						<th class="border-b border-border px-4 py-3 font-semibold">{text.descriptionColumn}</th>
					</tr>
				</thead>
				<tbody>
					{#each text.fields as [name, description]}
						<tr class="border-b border-border last:border-b-0">
							<td class="px-4 py-3 align-top"><code>{name}</code></td>
							<td class="px-4 py-3 leading-[1.58] text-text-main">{description}</td>
						</tr>
						{#if name === 'id'}
							<tr class="border-b border-border last:border-b-0">
								<td class="px-4 py-3 align-top"><code>publicId</code></td>
								<td class="px-4 py-3 leading-[1.58] text-text-main">{publicIdDescription}</td>
							</tr>
						{/if}
					{/each}
				</tbody>
			</table>
		</div>
	</section>

	<section class="grid gap-3">
		<h2 class="m-0 text-[clamp(1.25rem,2vw,1.55rem)] font-semibold text-brand-blue-dark">{text.recommendedUseHeading}</h2>
		<p class="m-0 leading-[1.68] text-text-main">
			{text.cachePrefix} <code>public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800</code>. {text.cacheSuffix}
		</p>
	</section>

	<section class="grid gap-3">
		<h2 class="m-0 text-[clamp(1.25rem,2vw,1.55rem)] font-semibold text-brand-blue-dark">{text.exampleHeading}</h2>
		<p class="m-0 leading-[1.68] text-text-main">
			{text.exampleLead}
		</p>
		<pre class="overflow-x-auto rounded-md bg-brand-blue-dark p-4 text-[0.9rem] leading-[1.55] text-white"><code>{exampleRequest}</code></pre>
		<pre class="overflow-x-auto rounded-md bg-brand-blue-dark p-4 text-[0.85rem] leading-[1.5] text-white"><code>{exampleResponse}</code></pre>
	</section>
</div>
