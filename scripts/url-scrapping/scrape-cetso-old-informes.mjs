import fs from 'node:fs';
import * as cheerio from 'cheerio';

const BASE_URL = 'https://etso.es';
const START_URL = 'https://etso.es/cetso';
const AJAX_URL = 'https://etso.es/views/ajax?_wrapper_format=drupal_ajax';

const OUTPUT_CSV = 'old-cetso-informes.csv';
const SAMPLE_HTML_PAGE_0 = 'sample-cetso-page-0.html';
const SAMPLE_HTML_PAGE_1 = 'sample-cetso-page-1.html';

/**
 * La vista CETSO tiene 119 páginas:
 * page=0 ... page=118
 */
const LAST_PAGE = 118;

function csvEscape(value) {
  return `"${String(value ?? '').replaceAll('"', '""')}"`;
}

function absoluteUrl(href) {
  return new URL(href, BASE_URL).href;
}

async function fetchInitialPage() {
  const res = await fetch(START_URL, {
    headers: {
      'user-agent': 'ETSO old URL scraper'
    }
  });

  if (!res.ok) {
    throw new Error(`Error descargando ${START_URL}: HTTP ${res.status}`);
  }

  return await res.text();
}

function extractViewDomId(html) {
  const $ = cheerio.load(html);

  const fromAttribute = $('[data-drupal-views-ajax-view-dom-id]')
    .first()
    .attr('data-drupal-views-ajax-view-dom-id');

  if (fromAttribute) {
    return fromAttribute;
  }

  const fromClass = html.match(/js-view-dom-id-([a-f0-9]+)/i);
  if (fromClass) {
    return fromClass[1];
  }

  const fromText = html.match(/view_dom_id["']?\s*[:=]\s*["']([a-f0-9]+)["']/i);
  if (fromText) {
    return fromText[1];
  }

  throw new Error('No se ha podido encontrar view_dom_id.');
}

async function fetchDrupalPage(page, viewDomId) {
  const body = new URLSearchParams();

  body.set('view_name', 'cetso');
  body.set('view_display_id', 'block_2');
  body.set('view_args', '');
  body.set('view_path', '/node/4');
  body.set('view_base_path', '');
  body.set('view_dom_id', viewDomId);
  body.set('pager_element', '0');

  body.set('atribucion', 'All');
  body.set('atribucion_etso', 'All');
  body.set('genero', 'All');
  body.set('estado', 'All');
  body.set('procedencia', 'All');

  /**
   * Estos campos aparecen en la URL de paginación de Drupal.
   * Conviene enviarlos aunque estén vacíos.
   */
  body.set('title', '');
  body.set('adicion_min', '');
  body.set('adicion_max', '');

  body.set('page', String(page));
  body.set('_drupal_ajax', '1');

  body.set('ajax_page_state[theme]', 'etso');
  body.set('ajax_page_state[theme_token]', '');

  const res = await fetch(AJAX_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'x-requested-with': 'XMLHttpRequest',
      'user-agent': 'ETSO old URL scraper',
      'referer': START_URL
    },
    body
  });

  if (!res.ok) {
    throw new Error(`Error en page=${page}: HTTP ${res.status}`);
  }

  return await res.json();
}

function extractMainHtml(drupalResponse) {
  if (!Array.isArray(drupalResponse)) {
    return '';
  }

  const mainInsert = drupalResponse.find(item =>
    item?.command === 'insert' &&
    item?.method === 'replaceWith' &&
    typeof item?.data === 'string' &&
    item.data.includes('view-id-cetso')
  );

  return mainInsert?.data ?? '';
}

function extractTitleLinks(html, pageNumber) {
  const $ = cheerio.load(html);
  const rows = [];

  /**
   * Selector exacto de la columna de título.
   * Evita capturar enlaces de encabezados, filtros, procedencia o estado.
   */
  $('td.views-field-title a[href]').each((_, el) => {
    const titulo = $(el).text().replace(/\s+/g, ' ').trim();
    const href = $(el).attr('href');

    if (!titulo || !href) return;

    const url = absoluteUrl(href);
    const path = new URL(url).pathname;

    if (!path.startsWith('/informes/')) return;

    rows.push({
      titulo,
      url,
      page: pageNumber
    });
  });

  return rows;
}

async function main() {
  console.log('Descargando página inicial...');
  const initialHtml = await fetchInitialPage();

  const viewDomId = extractViewDomId(initialHtml);
  console.log(`view_dom_id detectado: ${viewDomId}`);

  console.log(`Recorriendo páginas 0-${LAST_PAGE}...`);

  const allRows = [];

  for (let page = 0; page <= LAST_PAGE; page++) {
    const response = await fetchDrupalPage(page, viewDomId);
    const html = extractMainHtml(response);

    if (!html) {
      console.warn(`page=${page}: sin HTML principal`);
      continue;
    }

    if (page === 0) {
      fs.writeFileSync(SAMPLE_HTML_PAGE_0, html, 'utf8');
    }

    if (page === 1) {
      fs.writeFileSync(SAMPLE_HTML_PAGE_1, html, 'utf8');
    }

    const rows = extractTitleLinks(html, page);

    console.log(`page=${page}: ${rows.length} informes extraídos`);

    allRows.push(...rows);

    await new Promise(resolve => setTimeout(resolve, 250));
  }

  /**
   * Elimina duplicados por URL.
   */
  const unique = new Map();

  for (const row of allRows) {
    unique.set(row.url, row);
  }

  const finalRows = [...unique.values()];

  const csv = [
    ['titulo', 'url'].join(','),
    ...finalRows.map(row =>
      [row.titulo, row.url].map(csvEscape).join(',')
    )
  ].join('\n');

  fs.writeFileSync(OUTPUT_CSV, csv, 'utf8');

  console.log('');
  console.log(`CSV generado: ${OUTPUT_CSV}`);
  console.log(`Total bruto extraído: ${allRows.length}`);
  console.log(`Total de informes únicos: ${finalRows.length}`);
  console.log(`Muestras HTML guardadas: ${SAMPLE_HTML_PAGE_0}, ${SAMPLE_HTML_PAGE_1}`);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});