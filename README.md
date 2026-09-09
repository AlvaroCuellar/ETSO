# ETSO — Estilometría aplicada al Teatro del Siglo de Oro

[![Website](https://img.shields.io/badge/website-etso.es-7a1f2b)](https://etso.es)
[![License: MIT](https://img.shields.io/badge/code%20license-MIT-blue.svg)](LICENSE)

**ETSO** is open research infrastructure for the computational study of Spanish Golden Age theatre. It combines large-scale textual analysis with expert philological review to support reproducible research on authorship, chronology, textual transmission, and the recovery of forgotten works.

The project brings together nearly **3,000 plays** and approximately **40 million words**. Its development has involved an international network of around **200 scholars**, connecting digital methods with one of the major literary traditions of the early modern world.

Visit the public platform at **[etso.es](https://etso.es)**.

## Scientific and humanistic impact

ETSO was created to make computational evidence useful, transparent, and open to specialists in Golden Age literature. Its infrastructure supports:

- authorship attribution and the examination of anonymous or disputed plays;
- stylometric comparison across authors, works, genres, and periods;
- chronological analysis and the study of literary development;
- automatic transcription and processing of early modern texts;
- exploration of relationships among works through networks and visualizations;
- publication of evidence, research reports, metadata, and bibliographical context.

Methods developed through ETSO contributed to the identification of *La francesa Laura*, a previously unknown play by **Lope de Vega**. The discovery demonstrated how artificial intelligence, stylometry, and traditional philology can work together to recover cultural heritage and generate new literary knowledge.

ETSO's impact is therefore measured not only through software reuse, but through the scholarship it enables: reproducible attribution studies, international collaboration, public access to evidence, and the recovery and reinterpretation of works from the Spanish Golden Age.

## Open research infrastructure

The repository contains the source code of the public ETSO platform. The application is built with SvelteKit and includes interfaces for browsing works and reports, public metadata services, search and visualization components, and tools supporting the project's research workflows.

The project follows a human-in-the-loop approach. Automated results are treated as research evidence rather than final authority and are reviewed in their philological, bibliographical, and historical context before publication.

## Public metadata API

ETSO provides a public API for consulting its catalogue:

- `GET /api/obras` — complete catalogue of public work metadata.
- `GET /api/obras/{id-publicId-or-slug}` — metadata for an individual work, addressed by internal identifier, numeric public identifier, or public slug.
- `GET /api/autores` — complete author list, including the public identifiers of works supported by stylometry for each author.
- `GET /api/autores/{id-publicId-or-key}` — an individual author, addressed by numeric public identifier or textual key.

### Author–work associations for ASODAT

Each author object includes `stylometryWorkPublicIds: number[]`. This is the list of work `publicId` values shown under **Obras respaldadas por la estilometría** on that author's profile in **Examen de autorías**. It uses the same selection as the website, including probable/possible attributions and collaborations, and excludes unresolved attribution sets. Inclusion records stylometric support and does not imply certain or exclusive authorship. An empty array (`[]`) means that no works meet those criteria for that author.

The numeric author `id` is ETSO's identifier: it matches `authorId` in the public work attributions. It is independent of ASODAT's dramaturge identifiers. The author's `key` is the textual identifier used in ETSO author URLs. Each work identifier in `stylometryWorkPublicIds` can be used with `/api/obras/{publicId}` or linked as `https://etso.es/obras/{publicId}`, which redirects to the canonical work page.

### Selecting response fields

All four endpoints accept an optional `fields` parameter: a comma-separated list of public top-level fields to include in each work or author object. For example:

```text
https://etso.es/api/autores?fields=id,stylometryWorkPublicIds
https://etso.es/api/autores/104?fields=id,stylometryWorkPublicIds
https://etso.es/api/obras/690677?fields=publicId,title,resources
```

The first request retrieves the complete author–work mapping in one response. Author fields are `id`, `key`, `name`, `nameVariants`, `stylometryWorkPublicIds`, and `resources`. Work fields are described on the [API documentation page](https://etso.es/api). Selecting an object such as `resources` returns that entire public object; nested paths such as `resources.work` are not supported.

The existing `authors`, `author`, `works`, or `work` response wrapper and any `meta` information are preserved. With no `fields` parameter, responses retain all their public fields, including the new author association array. Empty selections, unknown fields, nested paths, and private content fields return HTTP 400.

The API exposes a controlled set of catalogue fields, including titles and variants, genre, provenance, textual state, public authorship results, attributions, and links to related resources. It does not expose complete texts or unpublished automatic summaries.

Responses already use public caching (`public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800`). External integrations should cache responses locally. Selecting fields reduces response size and data transfer; it does not itself reduce the number of requests or eliminate all database work.

## Local development

### Requirements

- Node.js 24
- npm

### Installation

```bash
git clone https://github.com/AlvaroCuellar/ETSO.git
cd ETSO
npm install
npm run dev
```

The development server will report the local address when it starts.

### Validation and production build

```bash
npm run check
npm run build
npm run preview
```

Some production features depend on data sources and services that are not distributed with this repository. The public API and platform at [etso.es](https://etso.es) remain the canonical interfaces for published ETSO data.

## Contributing

Contributions that improve reproducibility, accessibility, documentation, data validation, interoperability, visualization, or the responsible application of computational methods to the humanities are welcome.

Before proposing a substantial change, please open a GitHub issue describing:

1. the research or technical problem;
2. the proposed approach;
3. any effect on published data or scholarly interpretation;
4. how the change can be tested and documented.

Contributions affecting authorship conclusions, bibliographical records, or textual evidence require expert review before they can be published on the platform.

## Reuse and citation

Researchers may use the public API and repository to develop reproducible analyses, teaching materials, or interoperable digital-humanities resources. When using ETSO in academic work, please cite the platform and the relevant scholarly publications or individual reports associated with the evidence consulted.

## Licensing and data rights

The software source code in this repository is released under the [MIT License](LICENSE), unless a file states otherwise.

The MIT License does **not** automatically apply to dramatic texts, transcriptions, facsimile images, bibliographical records, research reports, datasets, or other scholarly and cultural-heritage materials. Those materials may be public domain, separately licensed, used with permission, or subject to rights held by libraries, archives, editors, researchers, or other institutions. Consult the source information and rights statement associated with each resource before reuse.

## Maintainer

ETSO is maintained by [Álvaro Cuéllar](https://github.com/AlvaroCuellar), researcher in Digital Humanities and Spanish Golden Age literature.

For the public research platform, visit [etso.es](https://etso.es).
