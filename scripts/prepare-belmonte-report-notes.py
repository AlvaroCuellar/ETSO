#!/usr/bin/env python3
"""Prepare local report excerpts from the accepted Belmonte article, without changing catalog attribution."""
import argparse
import hashlib
import html
import json
from pathlib import Path
import re
import shutil

ROOT = Path(__file__).resolve().parents[1]
ALIASES = {
    'MIRA_MartirDeMadrid_SegundaJornada': 'MIRA_MartirDeMadrid',
    'BELMONTE&ROJAS&CALDERON_MejorAmigoElMuerto(VersionManuscritos)_PrimeraJornada': 'BELMONTE&ROJAS&CALDERON_MejorAmigoElMuerto(VersionManuscritos)',
    'MORETO&BELMONTE&MENESES_PrincipePerseguido_PrimeraJornada': 'MORETO&BELMONTE&MENESES_PrincipePerseguido',
}

def italic(text):
    escaped = html.escape(text)
    return re.sub(r'\*([^*]+)\*', r'<i>\1</i>', escaped)

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source-root', type=Path, default=ROOT.parent / 'belmonte')
    args = parser.parse_args()
    source_root = args.source_root.resolve()
    article = source_root / 'articulo/borrador.md'
    article_text = article.read_text()
    catalog_path = source_root / 'data/derived/rolling_filologico_20260912/refinado/catalogo/fichas.json'
    entries = json.loads(catalog_path.read_text())
    panels = json.loads((source_root / 'figures/arte_nuevo/alfabetico/manifest.json').read_text())['panels']
    by_figure = {p['figure']: p for p in panels}
    work_ids = set(json.loads((ROOT / 'data/referencias/catalogo-identificadores.json').read_text())['workIds'])
    sections = re.findall(r'^### (4\.\d+)\. \*(.*?)\*\n\n(.*?)(?=^### |^## |\Z)', article_text, re.M | re.S)
    assert len(sections) == len(entries) == 70
    output = {'schemaVersion': 1, 'referenceId': 'cuellar-2027-belmonte', 'sourceSha256': hashlib.sha256(article.read_bytes()).hexdigest(), 'works': {}}
    audit = {'source': str(article), 'sourceSha256': output['sourceSha256'], 'sections': []}
    image_dir = ROOT / 'static/images/belmonte'
    image_dir.mkdir(parents=True, exist_ok=True)
    for entry, (section, title, body) in zip(entries, sections):
        files = entry['files']
        mapped = list(dict.fromkeys(ALIASES.get(Path(f).stem, Path(f).stem) for f in files))
        assert all(w in work_ids for w in mapped), (title, mapped)
        content = []
        paragraphs = []
        graphic = None
        for block in body.strip().split('\n\n'):
            match = re.fullmatch(r'!\[(.*?)\]\((.*?)\)', block, re.S)
            if match:
                alt, relpath = match.groups()
                figure = Path(relpath).stem
                assert files and {ALIASES.get(Path(f).stem, Path(f).stem) for f in by_figure[figure]['sources']} == set(mapped), title
                src = (article.parent / relpath).resolve()
                svg = src.read_text()
                size = re.search(r'<svg[^>]*width="([\d.]+)pt"[^>]*height="([\d.]+)pt"', svg)
                assert size, src
                width, height = [float(n) for n in size.groups()]
                shutil.copy2(src, image_dir / src.name)
                graphic = {'src': f'/images/belmonte/{src.name}', 'alt': re.sub(r'\*([^*]+)\*', r'\1', alt), 'width': width, 'height': height}
                content.append({'type': 'graphic', **graphic})
            else:
                paragraph = italic(block)
                paragraphs.append(paragraph)
                content.append({'type': 'paragraph', 'html': paragraph})
        assert bool(graphic) == bool(mapped), title
        note = {'section': section, 'title': title, 'paragraphs': paragraphs, 'content': content, 'sourceFiles': files}
        if graphic:
            note['graphic'] = graphic
        for work_id in mapped:
            output['works'].setdefault(work_id, []).append(note)
        audit['sections'].append({'section': section, 'title': title, 'workIds': mapped, 'sourceFiles': files, 'graphic': graphic['src'] if graphic else None, 'mapping': 'exact parent of analyzed jornada' if any(Path(f).stem in ALIASES for f in files) else 'exact analyzed witness' if files else 'unmapped: no analyzed text or corresponding catalog identifier', 'paragraphs': paragraphs if not files else None})
    audit['counts'] = {'sourceSections': len(sections), 'graphedSections': sum(bool(s['graphic']) for s in audit['sections']), 'workIds': len(output['works']), 'unmappedSections': sum(not s['workIds'] for s in audit['sections'])}
    out = ROOT / 'data/referencias/notas-belmonte.json'
    out.write_text(json.dumps(output, ensure_ascii=False, indent=2) + '\n')
    audit_dir = ROOT / 'revisiones/notas_informes/belmonte'
    audit_dir.mkdir(parents=True, exist_ok=True)
    (audit_dir / 'auditoria.json').write_text(json.dumps(audit, ensure_ascii=False, indent=2) + '\n')
    (audit_dir / 'README.md').write_text('# Notas de Belmonte: integración local\n\nSe conservan literalmente los párrafos de las 70 secciones del artículo, con cursivas. Hay 64 secciones con gráfica y texto analizado, vinculadas mediante los nombres exactos del manifiesto a los identificadores de ETSO. Las seis restantes describen obras sin testimonio disponible: no tienen gráfica ni identificador de texto en el catálogo, y se conservan en `auditoria.json` sin asignarlas a otra obra.\n\nLas tres unidades de una sola jornada se vinculan al testimonio completo exacto del que proceden; `sourceFiles` conserva la unidad analizada. Las fichas que comparan testimonios conservan su gráfica conjunta y el comentario completo en cada testimonio analizado, sin extenderlo a versiones no estudiadas. No se alteran las atribuciones del catálogo.\n\nRegenerar: `python3 scripts/prepare-belmonte-report-notes.py`. El resumen de cobertura y cada correspondencia figuran en `auditoria.json`.\n')
    print(json.dumps(audit['counts'], ensure_ascii=False))

if __name__ == '__main__':
    main()
