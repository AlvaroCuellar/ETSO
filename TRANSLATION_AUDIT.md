# ETSO Translation Audit

## Locale Files Found

- `src/lib/i18n.ts`
  - Locale registry and UI translations for `es`, `en`, `fr`, `pt`, `it`, `de`, `zh`, `ja`, `ko`, `ru`, `ar`.
  - Literal runtime translation maps for `en` and `fr`.
- `src/lib/i18n-extra.ts`
  - Literal runtime translation maps for `pt`, `it`, `de`, `zh`, `ja`, `ko`, `ru`, `ar`.
- `static/llms.txt`
  - Public multilingual entry-point descriptions for crawlers/LLMs.

Supported public locales found: `es`, `en`, `fr`, `pt`, `it`, `de`, `zh`, `ja`, `ko`, `ru`, `ar`.

## Localized Public Surfaces

- Pages: home, Examen de autorías, TEXORO, BITESO, Resúmenes, Cómo citarnos, Transcripciones automáticas, Equipo, Contacto.
- Additional public pages with localized framework text: Informes, Obras, Autores, Red de obras, Repercusión, Licencias, Privacidad, Acceso.
- Shared UI: navigation, footer, language selector, SEO metadata, breadcrumbs, page heroes, citation cards, work metadata cards, search tables, token selectors, TEXORO charts.
- Public-facing generated outputs: search/list labels, empty/loading states, filters, placeholders, alt texts, XLSX export labels, citation strings, summary/search API labels.

## Worst Locales By Severity

- Highest severity: `pt`, `it`, `de`, `zh`, `ja`, `ko`, `ru`.
  - These maps showed broad machine-translation artifacts across interface labels and long explanatory fragments.
- Medium severity: `en`, `fr`.
  - Translation quality is generally better, but both maps were stale: each had 314 literal keys versus 539 keys in the generated locale maps.
- Lower severity: `ar`.
  - Still needs full review, but fewer obvious public artifacts were found in this pass.

## Visible Artifact Examples

- `Cita sugerida` was translated as appointment/meeting language in several locales.
- `No hay cita disponible.` was translated as no booking/appointment available in several locales.
- `Algunos trabajos` became employment/job language in `pt`, `de`, `zh`, `ja`, `ko`, and `ru`.
- `Título` became qualification/credential language in `pt`, `it`, `de`, `zh`, `ja`, `ko`, and `ru`.
- `Tipo` became face/guy/man language in `pt`, `de`, `zh`, `ja`, `ko`, and `ru`.
- Fragmented Spanish connector text produced pronoun leftovers such as `ELE`, `LUI`, `ER`, Chinese/Japanese/Korean pronouns, and Russian `ОН`.
- `acotaciones` was mistranslated as dimensions/measurements in several locales.
- `Ficha de obra` was mistranslated as worksheet/spreadsheet in several locales.

## Source/Target Inconsistencies

- `en` and `fr` were missing 225 Spanish literal keys that were present in `pt`, `it`, `de`, `zh`, `ja`, `ko`, `ru`, and `ar`.
- Several attribute strings, including logo alt text, were present in Svelte as Spanish source literals and needed literal-map entries to avoid Spanish text in non-Spanish locales.
- Bibliographic titles on the Cómo citarnos page are source references and should remain unchanged; only headings and surrounding interface text should be translated.

## Product-Name Consistency

- `ETSO`, `TEXORO`, and `BITESO` should remain unchanged in every locale.
- `Examen de autorías` is a resource name and must remain exactly `Examen de autorías` in navigation, cards, headings, breadcrumbs, links, and resource-name contexts.
- `BITESO` is the resource name currently present in source and UI strings.

## East Asian Cleanup Status

- JA, KO, and ZH target strings were rewritten for the main public pages, shared navigation/footer, search/list UI, metadata, alt texts, filters, placeholders, loading/empty states, and form labels.
- Target-value scans for the catastrophic JA, KO, and ZH strings listed in the cleanup task now return no hits.
- Remaining raw `rg` hits for `Golden Age` are English target strings, not JA/KO/ZH. Remaining raw `Logo de Thal-IA` hits are Spanish source keys whose JA/KO/ZH target values are localized alt texts.
- No target-value occurrences remain for translated resource titles such as `作者归属检验`, `作者归属分析`, `著者帰属判定`, or `저자 귀속 검사`; resource-title contexts now use `Examen de autorías`.

## DE/RU/PT/IT Cleanup Status

- DE, RU, PT-BR, and IT target strings were rewritten across the main public pages, shared UI, TEXORO/BITESO/Resúmenes list interfaces, contact labels, transcription-page fragments, metadata, filters, placeholders, loading/empty states, and logo alt texts.
- Target-value scans for the catastrophic DE, RU, PT, and IT strings listed in the cleanup task now return no hits.
- Remaining raw `rg` hits for `Logo de Thal-IA` are Spanish source keys. Their DE/RU/PT/IT target values are localized as `Logo von Thal-IA`, `Логотип Thal-IA`, `Logo da Thal-IA`, and `Logo di Thal-IA`.
- No target-value occurrences remain for translated resource titles such as `Autorschaftsprüfung`, `Проверка авторства`, `Exame de autoria`, or `Esame di attribuzione`; resource-title contexts now use `Examen de autorías`.

## Final QA Summary

- Locales modified: `en`, `fr`, `pt`, `it`, `de`, `zh`, `ja`, `ko`, `ru`, `ar`. Spanish remains the source locale.
- Pages/components modified: home, Examen de autorías, TEXORO, BITESO, Resúmenes, Cómo citarnos, Transcripciones automáticas, Equipo, Contacto, shared navigation/footer, language selector, SEO metadata, alt texts, list/search labels, filters, placeholders, empty/loading states, and dynamic `Desconocido` labels.
- Major terminology decisions: `ETSO`, `TEXORO`, `BITESO`, and `Examen de autorías` remain invariant as resource names; literary titles, personal names, institutions, project names, bibliographic titles, and DOI references are preserved; `Desconocido` is localized as an unknown-author label rather than as a generic unknown/stranger label.
- Remaining known limitations: raw searches still find Spanish source keys such as `Dirección:`, `Logo de Thal-IA`, and Spanish connector fragments because the literal translation system uses Spanish strings as lookup keys. Target-value scans and rendered preview checks are clean.
- Validation run:
  - `npm run check`: passed with 0 errors and 0 warnings.
  - `npm run build`: passed. Vite reported existing large-chunk/plugin-timing warnings and the adapter-auto environment notice.
  - `npm run index:validate`: failed because `data/search-index/manifest.json` is absent in this checkout; no search-index artifacts were generated for this translation-only commit.
  - Production preview spot-check: passed for 80 pages: home, Examen de autorías, TEXORO, BITESO, Resúmenes, Transcripciones automáticas, Equipo, and Contacto in `en`, `fr`, `pt`, `it`, `de`, `zh`, `ja`, `ko`, `ru`, and `ar`.
  - Static QA scans: supported locales match the expected public list; resource-title variants are absent; target-value banned-string scan passed; proper-name/title artifact scan returned no hits.
