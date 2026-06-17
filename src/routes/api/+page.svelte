<script lang="ts">
	import Breadcrumbs from '$lib/components/ui/Breadcrumbs.svelte';
	import SeoHead from '$lib/components/seo/SeoHead.svelte';

	const API_SEO_DESCRIPTION =
		'Documentación de la API pública de ETSO para consultar metadatos y resultados estilométricos de obras.';

	const endpoints = [
		{
			method: 'GET',
			path: '/api/obras',
			description: 'Devuelve el catálogo completo de obras con sus metadatos públicos.'
		},
		{
			method: 'GET',
			path: '/api/obras/{id-o-slug}',
			description: 'Devuelve una sola obra usando su identificador o su slug público.'
		}
	];

	const fields = [
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
		['stylometryAttributionText', 'Atribución estilométrica lista para mostrar.'],
		['traditionalAttribution', 'Atribución tradicional normalizada.'],
		['stylometryAttribution', 'Atribución estilométrica normalizada.'],
		['resources', 'Enlaces públicos relacionados dentro de ETSO.']
	];

	const exampleRequest = 'https://etso.es/api/obras/la-francesa-laura';
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
    "stylometryAttributionText": "Lope de Vega Carpio [Segura]",
    "traditionalAttribution": {
      "groups": [
        {
          "members": [
            {
              "authorId": "desconocido",
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
              "authorId": "vega_carpio_lope_de",
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

<SeoHead title="API" description={API_SEO_DESCRIPTION} path="/api" />

<div class="grid gap-8">
	<Breadcrumbs items={[{ label: 'Inicio', href: '/' }, { label: 'Más información', href: '/mas-informacion' }, { label: 'API' }]} />

	<section class="grid gap-4">
		<h1 class="m-0 text-[clamp(1.7rem,2.9vw,2.25rem)] font-bold leading-[1.12] text-brand-blue-dark">
			API
		</h1>
		<p class="m-0 leading-[1.68] text-text-main">
			ETSO ofrece una API pública para consultar los metadatos de las obras del catálogo desde otros proyectos. La API está pensada para reutilizar identificadores, títulos, atribuciones, enlaces y el resultado estilométrico de cada obra.
		</p>
		<p class="m-0 leading-[1.68] text-text-main">
			La información se entrega en formato JSON y puede utilizarse para integrar los datos de ETSO en catálogos, visualizaciones, buscadores o herramientas de investigación.
		</p>
	</section>

	<section class="grid gap-3">
		<h2 class="m-0 text-[clamp(1.25rem,2vw,1.55rem)] font-semibold text-brand-blue-dark">Endpoints</h2>
		<div class="grid gap-3">
			{#each endpoints as endpoint}
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
		<h2 class="m-0 text-[clamp(1.25rem,2vw,1.55rem)] font-semibold text-brand-blue-dark">Campos principales</h2>
		<div class="overflow-x-auto rounded-md border border-border">
			<table class="w-full min-w-[680px] border-collapse bg-white text-left text-[0.95rem]">
				<thead class="bg-surface-soft font-ui text-brand-blue-dark">
					<tr>
						<th class="border-b border-border px-4 py-3 font-semibold">Campo</th>
						<th class="border-b border-border px-4 py-3 font-semibold">Descripción</th>
					</tr>
				</thead>
				<tbody>
					{#each fields as [name, description]}
						<tr class="border-b border-border last:border-b-0">
							<td class="px-4 py-3 align-top"><code>{name}</code></td>
							<td class="px-4 py-3 leading-[1.58] text-text-main">{description}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</section>

	<section class="grid gap-3">
		<h2 class="m-0 text-[clamp(1.25rem,2vw,1.55rem)] font-semibold text-brand-blue-dark">Uso recomendado</h2>
		<p class="m-0 leading-[1.68] text-text-main">
			Las respuestas se sirven con caché pública: <code>public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800</code>. Para integraciones externas se recomienda cachear localmente la respuesta y no llamar a la API en cada renderizado.
		</p>
	</section>

	<section class="grid gap-3">
		<h2 class="m-0 text-[clamp(1.25rem,2vw,1.55rem)] font-semibold text-brand-blue-dark">Ejemplo</h2>
		<p class="m-0 leading-[1.68] text-text-main">
			Consulta de una obra concreta y respuesta completa:
		</p>
		<pre class="overflow-x-auto rounded-md bg-brand-blue-dark p-4 text-[0.9rem] leading-[1.55] text-white"><code>{exampleRequest}</code></pre>
		<pre class="overflow-x-auto rounded-md bg-brand-blue-dark p-4 text-[0.85rem] leading-[1.5] text-white"><code>{exampleResponse}</code></pre>
	</section>
</div>
