import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import test from 'node:test';
import { load } from 'cheerio';
import { createServer } from 'vite';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataRepo = path.resolve(root, '../ETSOdatos');
const payload = JSON.parse(execFileSync(path.join(dataRepo, '.venv/bin/python'), ['-c', `
import importlib.util,json,pathlib
r=pathlib.Path.cwd()
s=importlib.util.spec_from_file_location('prepare',r/'scripts/prepare_cetso_web_data.py')
p=importlib.util.module_from_spec(s);s.loader.exec_module(p)
out=[]
for title,name in [('El falso nuncio de Portugal','DESCONOCIDO_FalsoNuncioDePortugal(Quiroga1796)(Transk-IMPR)'),('El nacimiento (égloga)','DESCONOCIDO_NacimientoEgloga(Transk-MSS)')]:
 p.tei_path_desde_archivo=lambda _,name=name:str(r/'tei'/(name+'.tei.xml'))
 v=p.Validador();o=p.parse_tei_for_biteso(v,name+'.txt')
 assert not v.errores,v.errores
 out.append({'title':title,'name':name,'tei':o['tei_viewer'],'text':o['clean_text']})
print(json.dumps(out,ensure_ascii=False))
`], { cwd: dataRepo, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 }));

test('BITESO renders both real native TEI documents without losing prose or its speaker', async (context) => {
  const server = await createServer({ root, server: { middlewareMode: true }, appType: 'custom' });
  try {
    const { default: Page } = await server.ssrLoadModule('/src/routes/biteso/[id]/+page.svelte');
    const { render } = await server.ssrLoadModule('svelte/server');
    for (const item of payload) {
      await context.test(item.title, () => {
        const work = {
          id: item.name, title: item.title, slug: item.name, genre: 'Teatro', generalGenre: 'Teatro',
          origin: 'Edición digital de consulta.', textState: 'Transcripción normalizada', addedOn: '2026/10',
          traditionalAttribution: { groups: [], connector: 'and' },
          stylometryAttribution: { groups: [], connector: 'and' },
          textLinks: [], inAuthorshipExam: false, shortSummary: '', hasSummaryFile: true
        };
        const data = {
          locale: 'es', work, publishedOn: '', citation: 'Edición local de consulta.',
          canonicalUrl: 'http://localhost/biteso/local',
          biteso: { id: item.name, workId: item.name, title: item.title, bitesoNombre: 'ETSO',
            bitesoRevisores: [], text: item.text, tei: item.tei }
        };
        const request = { page: { data, url: new URL(data.canonicalUrl), params: {},
          route: { id: '/biteso/[id]' }, status: 200 } };
        const html = render(Page, { props: { data }, context: new Map([['__request__', request]]) }).body;
        const $ = load(html);
        const normalize = (value) => value.replace(/\s+/g, ' ').trim();
        const expected = item.tei.pages.flatMap((page) => page.blocks.flatMap((block) =>
          (block.lines ?? []).map((line) => ({ kind: line.kind ?? 'verse',
            text: normalize(line.text), speaker: normalize(block.speaker ?? '') }))));
        const paragraphs = $('[data-text-kind]');
        assert.equal(paragraphs.length, expected.length);
        paragraphs.each((index, node) => {
          const paragraph = $(node);
          assert.equal(node.tagName, 'p');
          assert.equal(paragraph.attr('data-text-kind'), expected[index].kind);
          assert.equal(normalize(paragraph.text()), expected[index].text);
          assert.equal(normalize(paragraph.parent().prev().text()), expected[index].speaker);
          if (expected[index].kind === 'prose') {
            assert.ok(paragraph.hasClass('mb-3'));
            assert.equal(paragraph.find('br').length, 0);
            assert.ok(expected[index].text.length > 100, 'The entire letter remains one prose paragraph');
          }
        });
        assert.equal($('[data-text-kind="prose"]').length, item.name.includes('FalsoNuncio') ? 4 : 0);
        assert.equal($('section[id^="tei-page-"]').length, item.tei.stats.pages);
      });
    }
  } finally {
    await server.close();
  }
});
