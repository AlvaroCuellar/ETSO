<script lang="ts">
 import { page } from '$app/state';
 import ArrowUpRight from 'lucide-svelte/icons/arrow-up-right';
 import Database from 'lucide-svelte/icons/database';
 import BookOpen from 'lucide-svelte/icons/book-open';
 import ScanText from 'lucide-svelte/icons/scan-text';
 import Breadcrumbs from '$lib/components/ui/Breadcrumbs.svelte';
 import SeoHead from '$lib/components/seo/SeoHead.svelte';
 import { localizePath, DEFAULT_LOCALE } from '$lib/i18n';

 const description = 'Corpus, frecuencias léxicas, datos métricos y modelos de transcripción para comprobar, reproducir y ampliar la investigación de ETSO sobre el Siglo de Oro.';
 const locale = $derived(page.data.locale ?? DEFAULT_LOCALE);
 const corpora = [
  {
   title: 'Corpus rítmico de cien comedias',
   original: 'Rhythmic Corpus of 100 Spanish Golden Age Plays',
   description: 'Cien comedias de nueve dramaturgos con su texto y su escansión rítmica revisada. Permite reproducir los experimentos de estilometría rítmica y explorar la métrica del teatro del Siglo de Oro.',
   href: 'https://doi.org/10.5281/zenodo.17537343',
   platform: 'Zenodo', detail: 'CC BY 4.0 · Versión 3', doi: '10.5281/zenodo.17537343'
  },
  {
   title: 'Escansión rítmica de 326 comedias',
   original: 'Rhythmic Scansion Dataset of 326 Spanish Golden Age Plays for Authorship Attribution',
   description: 'Corpus compilado e integrado a partir de materiales previos para reproducir experimentos de atribución y estudiar los patrones métricos de 326 comedias. La documentación del depósito identifica las fuentes y el tratamiento de los datos.',
   href: 'https://doi.org/10.5281/zenodo.19418278',
   platform: 'Zenodo', detail: 'CC BY 4.0 · 2026', doi: '10.5281/zenodo.19418278'
  },
  {
   title: 'Cronología y estilometría de Lope de Vega',
   original: 'Datos para la datación automática de comedias',
   description: 'Tablas de frecuencias de palabras, lemas y categorías gramaticales del corpus de autógrafos, junto con frecuencias léxicas del corpus amplio. Materiales para estudiar la evolución del estilo y la datación de las comedias de Lope.',
   href: 'https://github.com/AlvaroCuellar/Cronologia-y-Estilometria-Lope-de-Vega',
   platform: 'GitHub', detail: 'Tablas CSV · Documentación', doi: ''
  }
 ];
 const tools = [
  {title: 'BITESO', subtitle: 'Textos digitales para leer y estudiar', description: 'Acceso a los textos disponibles en la biblioteca, sus procedencias y los materiales asociados a cada obra. Un punto de partida para contrastar las lecturas y trabajar directamente con los textos.', href: '/biteso', label: 'Consultar BITESO'},
  {title: 'TEXORO', subtitle: 'Búsquedas en teatro, prosa y poesía', description: 'Consulta palabras, frases y patrones en el corpus, combina filtros y condiciones de proximidad y examina los pasajes encontrados. Los resultados pueden descargarse para continuar el análisis.', href: '/texoro', label: 'Buscar en TEXORO'},
  {title: 'API de ETSO', subtitle: 'Acceso a los datos desde otras herramientas', description: 'Documentación de los puntos de acceso públicos para consultar el catálogo y sus recursos. Permite integrar los datos en programas, cuadernos de investigación y otros proyectos.', href: '/api', label: 'Consultar la API'}
 ];
 const models = [
  {title: 'Spanish Golden Age Prints 1.0', description: 'Transcripción de impresos del Siglo de Oro conservando sus grafías históricas.', href: 'https://www.transkribus.org/models/spanish-golden-age-prints-1-0'},
  {title: 'Spanish Golden Age Prints (Spelling Modernization) 1.0', description: 'Transcripción de impresos del Siglo de Oro con modernización ortográfica.', href: 'https://www.transkribus.org/models/spanish-golden-age-theatre-prints-spelling-modernization-1-0'},
  {title: 'Spanish Golden Age Manuscripts (Spelling Modernization) 1.0', description: 'Transcripción y modernización ortográfica de manuscritos teatrales del Siglo de Oro.', href: 'https://www.transkribus.org/models/spanish-golden-age-theatre-prints-1-0'},
  {title: 'Coloso Español', description: 'Modelo general de reconocimiento de textos en español, desarrollado colectivamente bajo la coordinación de Álvaro Cuéllar.', href: 'https://www.transkribus.org/models/coloso-espaol'}
 ];
 const linkClass = 'inline-flex items-center gap-2 font-ui text-[0.9rem] font-semibold text-brand-blue-dark no-underline hover:text-brand-blue hover:underline focus-visible:underline';
</script>

<SeoHead title="Open Science" {description} path="/open-science" />

<div class="grid min-w-0 gap-10 md:gap-12">
 <Breadcrumbs items={[{ label: 'Inicio', href: '/' }, { label: 'Open Science' }]} />
 <section class="grid max-w-[80ch] gap-4">
  <p class="m-0 font-ui text-[0.75rem] font-bold uppercase tracking-[0.09em] text-text-accent-purple">Recursos para la investigación</p>
  <h1 class="m-0 text-[clamp(2.1rem,4vw,3.1rem)] font-bold leading-[1.1] text-brand-blue-dark">Open Science</h1>
  <p class="m-0 text-[clamp(1.08rem,1.8vw,1.3rem)] leading-[1.6] text-text-main">Datos, corpus y modelos para investigar el Siglo de Oro.</p>
  <p class="m-0 leading-[1.75] text-text-soft">Reunimos los recursos que permiten comprobar, reproducir y ampliar los análisis de ETSO. Cada entrada conduce a los textos, datos o modelos y a la documentación de su uso. Las condiciones de reutilización se indican en cada depósito o plataforma.</p>
 </section>

 <section aria-labelledby="cofre-title" class="overflow-hidden rounded-[12px] border border-border-accent-purple bg-surface-accent-purple">
  <div class="grid gap-7 p-5 sm:p-7 lg:grid-cols-[minmax(0,1fr)_17rem] lg:gap-10 lg:p-8">
   <div class="grid content-start gap-4">
    <div class="flex flex-wrap items-center gap-3 font-ui text-[0.74rem] font-semibold">
     <span class="inline-flex items-center gap-2 uppercase tracking-[0.06em] text-text-accent-purple"><Database class="h-4 w-4" aria-hidden="true" />Corpus de frecuencias</span>
     <span class="rounded-full border border-border-accent-purple bg-white/70 px-2.5 py-1 text-text-accent-purple">Publicado · Versión 1.0</span>
    </div>
    <h2 id="cofre-title" class="m-0 text-[clamp(1.5rem,2.5vw,2rem)] font-bold leading-tight text-brand-blue-dark">COFRE del TEXORO</h2>
    <p class="m-0 text-[1.05rem] font-semibold leading-[1.5] text-text-main">Corpus de frecuencias léxicas de la literatura del Siglo de Oro</p>
    <p class="m-0 max-w-[72ch] leading-[1.75] text-text-main">Recuentos de palabras de las obras de teatro, prosa y poesía de TEXORO, con frecuencias por obra y para el corpus completo. Incluye un catálogo con atribuciones, procedencias, estado de los textos y enlaces de consulta, junto con tablas TSV y una guía de uso en español e inglés.</p>
    <dl class="m-0 grid grid-cols-1 gap-4 border-y border-border-accent-purple py-4 font-ui sm:grid-cols-3">
     <div><dt class="text-[0.76rem] text-text-soft">Obras y colecciones</dt><dd class="m-0 mt-1 text-[1.25rem] font-bold text-brand-blue-dark">3.222</dd></div>
     <div><dt class="text-[0.76rem] text-text-soft">Apariciones de palabras</dt><dd class="m-0 mt-1 text-[1.25rem] font-bold text-brand-blue-dark">48.314.924</dd></div>
     <div><dt class="text-[0.76rem] text-text-soft">Formas distintas</dt><dd class="m-0 mt-1 text-[1.25rem] font-bold text-brand-blue-dark">419.798</dd></div>
    </dl>
    <p class="m-0 text-[0.9rem] leading-[1.6] text-text-soft">Álvaro Cuéllar · Publicado el 29 de octubre de 2026</p>
   </div>
   <div class="grid content-start gap-4 rounded-[9px] border border-border-accent-purple bg-white/70 p-5">
    <div class="grid gap-1"><p class="m-0 font-ui text-[0.72rem] font-bold uppercase tracking-wide text-text-accent-purple">Depósito</p><p class="m-0 font-semibold text-brand-blue-dark">Zenodo</p></div>
    <div class="grid gap-1"><p class="m-0 font-ui text-[0.72rem] font-bold uppercase tracking-wide text-text-accent-purple">Licencia</p><a class={linkClass} href="https://creativecommons.org/licenses/by-nc/4.0/" target="_blank" rel="noopener noreferrer">CC BY-NC 4.0<ArrowUpRight class="h-3.5 w-3.5" aria-hidden="true" /></a></div>
    <div class="grid gap-1"><p class="m-0 font-ui text-[0.72rem] font-bold uppercase tracking-wide text-text-accent-purple">DOI · Todas las versiones</p><a class="break-all text-[0.85rem] font-semibold text-brand-blue-dark underline" href="https://doi.org/10.5281/zenodo.23771582" target="_blank" rel="noopener noreferrer" data-i18n-skip>10.5281/zenodo.23771582</a></div>
    <a class="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-blue px-4 py-3 font-ui text-[0.9rem] font-semibold text-white no-underline transition hover:bg-brand-blue-dark hover:text-white hover:no-underline" href="https://doi.org/10.5281/zenodo.23771582" target="_blank" rel="noopener noreferrer">Acceder al COFRE<ArrowUpRight class="h-4 w-4" aria-hidden="true" /></a>
    <a class={linkClass} href="https://doi.org/10.5281/zenodo.23771583" target="_blank" rel="noopener noreferrer">Consultar la versión 1.0<ArrowUpRight class="h-3.5 w-3.5" aria-hidden="true" /></a>
    <p class="m-0 border-t border-border-accent-purple pt-4 text-[0.8rem] leading-[1.6] text-text-soft">Los datos y la documentación propia se ofrecen bajo CC BY-NC 4.0. Las fuentes y los materiales de terceros conservan sus condiciones.</p>
   </div>
  </div>
 </section>

 <section aria-labelledby="corpora-title" class="grid gap-5">
  <div class="grid gap-2"><h2 id="corpora-title" class="m-0 flex items-center gap-2.5 text-[1.45rem] font-bold text-brand-blue-dark"><Database class="h-5 w-5 shrink-0" aria-hidden="true" />Corpus y datos de investigación</h2><p class="m-0 leading-[1.7] text-text-soft">Materiales para estudiar la autoría, el ritmo y la cronología de las obras.</p></div>
  <div class="grid gap-4 lg:grid-cols-3">
   {#each corpora as resource}
    <article class="flex min-w-0 flex-col gap-4 rounded-[10px] border border-border bg-white p-5 sm:p-6">
     <p class="m-0 font-ui text-[0.73rem] font-bold uppercase tracking-[0.06em] text-text-accent-purple">{resource.platform}</p>
     <h3 class="m-0 text-[1.12rem] font-bold leading-[1.4] text-brand-blue-dark">{resource.title}</h3>
     <p class="m-0 text-[0.85rem] italic leading-[1.5] text-text-soft" data-i18n-skip>{resource.original}</p>
     <p class="m-0 flex-1 leading-[1.7] text-text-main">{resource.description}</p>
     <p class="m-0 font-ui text-[0.78rem] text-text-soft">{resource.detail}</p>
     {#if resource.doi}<p class="m-0 break-all text-[0.77rem] text-text-soft" data-i18n-skip>DOI: {resource.doi}</p>{/if}
     <a class={linkClass} href={resource.href} target="_blank" rel="noopener noreferrer">{resource.platform === 'Zenodo' ? 'Consultar el depósito' : 'Ver el repositorio'}<ArrowUpRight class="h-3.5 w-3.5" aria-hidden="true" /></a>
    </article>
   {/each}
  </div>
 </section>

 <section aria-labelledby="tools-title" class="grid gap-5">
  <h2 id="tools-title" class="m-0 flex items-center gap-2.5 text-[1.45rem] font-bold text-brand-blue-dark"><BookOpen class="h-5 w-5 shrink-0" aria-hidden="true" />Textos y herramientas de consulta</h2>
  <div class="grid gap-4 lg:grid-cols-3">
   {#each tools as resource}
    <article class="flex min-w-0 flex-col gap-3 rounded-[10px] border border-border-accent-blue bg-surface-accent-blue p-5 sm:p-6">
     <h3 class="m-0 text-[1.2rem] font-bold text-brand-blue-dark">{resource.title}</h3>
     <p class="m-0 text-[0.9rem] font-semibold leading-[1.5] text-text-main">{resource.subtitle}</p>
     <p class="m-0 flex-1 leading-[1.7] text-text-main">{resource.description}</p>
     <a class={linkClass} href={localizePath(resource.href, locale)}>{resource.label}<ArrowUpRight class="h-3.5 w-3.5" aria-hidden="true" /></a>
    </article>
   {/each}
  </div>
 </section>

 <section aria-labelledby="models-title" class="grid gap-5">
  <div class="grid gap-2"><h2 id="models-title" class="m-0 flex items-center gap-2.5 text-[1.45rem] font-bold text-brand-blue-dark"><ScanText class="h-5 w-5 shrink-0" aria-hidden="true" />Modelos de transcripción</h2><p class="m-0 max-w-[85ch] leading-[1.7] text-text-soft">Modelos públicos que pueden utilizarse desde Transkribus para reconocer impresos y manuscritos. El acceso y las condiciones de uso se consultan en la plataforma.</p></div>
  <div class="grid gap-4 md:grid-cols-2">
   {#each models as resource}
    <article class="flex min-w-0 flex-col gap-3 rounded-[10px] border border-border bg-white p-5 sm:p-6">
     <p class="m-0 font-ui text-[0.73rem] font-bold uppercase tracking-[0.06em] text-text-accent-purple">Transkribus</p>
     <h3 class="m-0 break-words text-[1.03rem] font-bold leading-[1.5] text-brand-blue-dark" data-i18n-skip>{resource.title}</h3>
     <p class="m-0 flex-1 leading-[1.7] text-text-main">{resource.description}</p>
     <a class={linkClass} href={resource.href} target="_blank" rel="noopener noreferrer">Ver el modelo<ArrowUpRight class="h-3.5 w-3.5" aria-hidden="true" /></a>
    </article>
   {/each}
  </div>
  <a class={linkClass} href={localizePath('/transcripciones-automaticas', locale)}>Conocer el proceso de transcripción<ArrowUpRight class="h-3.5 w-3.5" aria-hidden="true" /></a>
 </section>
</div>
