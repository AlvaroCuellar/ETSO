#!/usr/bin/env python3
"""Build an isolated TEXORO catalogue from the frozen BERTvantes manifest.

Never writes to the source catalogue, the corpus, Turso or R2.
"""
import argparse
import collections
import csv
import hashlib
import json
import os
from pathlib import Path
import sqlite3
import unicodedata
from urllib.parse import urlsplit

COLLECTIONS = {
    'sonetos_siglo_oro': ('Corpus de Sonetos del Siglo de Oro', 'Sonetos'),
    'disco_15_17': ('DISCO: selección del Siglo de Oro', 'Sonetos'),
    'poesia_lirica_general': ('Corpus General de Poesía Lírica Castellana del Siglo de Oro', 'Colección poética'),
    'poesias_period': ('Poesi.as: selección del Siglo de Oro', 'Colección poética'),
    'gongocorpus': ('Gongocorpus', 'Colección poética'),
}

COLLECTION_ORIGINS = {
    'sonetos_siglo_oro': 'El texto procede del Corpus de Sonetos del Siglo de Oro.',
    'disco_15_17': 'El texto procede del corpus DISCO.',
    'poesia_lirica_general': 'El texto procede del Corpus General de Poesía Lírica Castellana del Siglo de Oro.',
    'poesias_period': 'El texto procede de Poesi.as.',
    'gongocorpus': 'El texto procede de Gongocorpus.',
}

def normalized(value):
    return ''.join(c for c in unicodedata.normalize('NFD', value.lower()) if not unicodedata.combining(c))

def author_key(value):
    return ' '.join(sorted(normalized(value).split()))

def stable_public_id(key, occupied):
    candidate = 100000 + int(hashlib.sha256(key.encode()).hexdigest()[:12], 16) % 900000
    while candidate in occupied:
        candidate = 100000 + (candidate - 100000 + 1) % 900000
    occupied.add(candidate)
    return candidate

def load_text_completions(path, prose):
    """Validate optional complete texts without changing the frozen provenance.

    JSON: {canonical_id: {path, sha256, sources: [http(s) URLs], note,
                          title?: full display title}}.
    Text paths are relative to this JSON file. SHA-256 covers the source bytes.
    """
    if path is None:
        return {}
    payload = json.loads(path.read_text(encoding='utf-8'))
    if not isinstance(payload, dict):
        raise ValueError('Text completions must be a JSON object')
    eligible = {r['canonical_id'] for r in prose}
    completions = {}
    for key, entry in payload.items():
        if key not in eligible:
            raise ValueError(f'Text completion is not a selected prose work: {key}')
        required = {'path', 'sha256', 'sources', 'note'}
        if not isinstance(entry, dict) or not required <= entry.keys() or set(entry) - (required | {'title'}):
            raise ValueError(f'Invalid text completion fields: {key}')
        if not all(isinstance(entry[field], str) and entry[field].strip() for field in ('path', 'sha256', 'note')):
            raise ValueError(f'Invalid text completion metadata: {key}')
        expected = entry['sha256'].lower()
        if len(expected) != 64 or any(c not in '0123456789abcdef' for c in expected):
            raise ValueError(f'Invalid text completion checksum: {key}')
        urls = entry['sources']
        if not isinstance(urls, list) or not urls or not all(isinstance(url, str) and urlsplit(url).scheme in ('http', 'https') and urlsplit(url).netloc for url in urls):
            raise ValueError(f'Text completion requires source URLs: {key}')
        if 'title' in entry and (not isinstance(entry['title'], str) or not entry['title'].strip()):
            raise ValueError(f'Invalid text completion title: {key}')
        source_relative = Path(entry['path'])
        source_path = (path.parent / source_relative).resolve()
        if source_relative.is_absolute() or not source_path.is_relative_to(path.parent.resolve()):
            raise ValueError(f'Text completion path must stay within its JSON directory: {key}')
        raw = source_path.read_bytes()
        if hashlib.sha256(raw).hexdigest() != expected:
            raise ValueError(f'Text completion checksum mismatch: {source_path}')
        decoded = raw.decode('utf-8-sig')
        text = decoded.strip()
        if not text or '\f' in decoded:
            raise ValueError(f'Empty text or unexpected section separator: {source_path}')
        completions[key] = {**entry, 'sha256': expected, 'text': text}
    return completions

def read_summary(directory, work_id, title):
    summary = json.loads((directory / f'{work_id}.json').read_text(encoding='utf-8'))
    fields = {'archivo', 'titulo', 'resumen_largo', 'resumen_breve',
              'personajes_principales', 'espacios_principales', 'tematicas_principales'}
    if not isinstance(summary, dict) or set(summary) != fields:
        raise ValueError(f'Invalid summary fields: {work_id}')
    if summary['archivo'] != f'{work_id}.txt' or summary['titulo'] != title:
        raise ValueError(f'Summary title or file mismatch: {work_id}')
    for field in ('resumen_largo', 'resumen_breve'):
        values = summary[field]
        if (not isinstance(values, list) or len(values) != 3 or
            not all(isinstance(value, str) and value.strip() for value in values) or
            len(set(values)) != 3):
            raise ValueError(f'Summary requires three distinct paragraphs: {work_id}/{field}')
    for field in ('personajes_principales', 'espacios_principales', 'tematicas_principales'):
        values = summary[field]
        keys = {'tema', 'descripcion'} if field == 'tematicas_principales' else {'nombre', 'descripcion'}
        if (not isinstance(values, list) or not values or
            not all(isinstance(value, dict) and set(value) == keys and
                    all(isinstance(text, str) and text.strip() for text in value.values())
                    for value in values)):
            raise ValueError(f'Invalid summary entities: {work_id}/{field}')
    return summary

def build_text_access_links(key, projects, urls, completion=None):
    """Expose one access per source; detailed recovery URLs stay in source-details.json."""
    links = []
    if completion:
        bvmc_url = next((url for url in completion['sources']
                         if urlsplit(url).hostname in ('cervantesvirtual.com', 'www.cervantesvirtual.com')), None)
        if not bvmc_url:
            raise ValueError(f'Recovered text requires a BVMC access link: {key}')
        links.append(('Biblioteca Virtual Miguel de Cervantes', bvmc_url))
        # These complete editions replace the original partial NovelaBarroca texts.
        if key in ('novelabarroca-0010', 'novelabarroca-0018'):
            return links
    if urls:
        links.append((', '.join(projects), urls[0]))
    return links[:2]

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--corpus', required=True, type=Path)
    parser.add_argument('--catalogue', default='deploy/input/turso/etso.sqlite', type=Path)
    parser.add_argument('--texts', default='deploy/input/private-assets/texts', type=Path)
    parser.add_argument('--output', default='.local/texoro-multigenre', type=Path)
    parser.add_argument('--text-completions', type=Path,
                        help='Optional JSON of independently sourced complete prose texts; paths relative to JSON')
    parser.add_argument('--summaries', type=Path, help='Directory of reviewed summary JSON files for every imported work')
    args = parser.parse_args()
    records = [json.loads(line) for line in (args.corpus / 'provenance/frozen/manifest.jsonl').open(encoding='utf-8')]
    prose = sorted((r for r in records if r['genre'] == 'prosa'), key=lambda r: r['canonical_id'])
    completions = load_text_completions(args.text_completions, prose)
    output = args.output.resolve()
    output.mkdir(parents=True, exist_ok=True)
    texts = output / 'texts'
    texts.mkdir(exist_ok=True)
    source = sqlite3.connect(f'file:{args.catalogue.resolve()}?mode=ro', uri=True)
    db = sqlite3.connect(output / 'catalogue.build.sqlite')
    source.backup(db)
    db.execute('PRAGMA foreign_keys=ON')
    baseline = source.execute('SELECT id,public_id,slug,genero,examen_autorias,asodat_id FROM works ORDER BY id').fetchall()
    db.execute("ALTER TABLE works ADD COLUMN genero_general TEXT NOT NULL DEFAULT 'Teatro'")
    db.execute('ALTER TABLE works ADD COLUMN collection_size INTEGER')
    for (work_id, *_) in baseline:
        origin = (args.texts / f'{work_id}.txt').resolve()
        if not origin.is_file():
            raise ValueError(f'Missing existing text: {work_id}')
        target = texts / origin.name
        if not target.exists():
            os.link(origin, target)  # Read-only input; avoid duplicating the theatrical corpus.
    script_dir = Path(__file__).resolve().parent
    summaries_output = output / 'resumenes'
    if args.summaries:
        summaries_output.mkdir(exist_ok=True)
        for existing in (script_dir.parent / 'deploy/input/public-assets/resumenes').glob('*.json'):
            target = summaries_output / existing.name
            if existing.name != 'search-index.json' and not target.exists():
                os.link(existing, target)
    aliases = json.loads((script_dir/'texoro-author-aliases.json').read_text(encoding='utf-8'))
    author_overrides = json.loads((script_dir/'texoro-record-author-overrides.json').read_text(encoding='utf-8'))
    def canonical_name(name):
        name = name.strip()
        visited = set()
        while name in aliases:
            if name in visited:
                raise ValueError(f'Cyclic author alias: {name}')
            visited.add(name)
            name = aliases[name].strip()
        return name
    def canonical_author(row):
        return canonical_name(author_overrides.get(row['canonical_id'], row['author']))
    metadata_path = script_dir/'texoro-prose-metadata.json'
    prose_metadata = json.loads(metadata_path.read_text(encoding='utf-8')) if metadata_path.exists() else {}
    work_slugs = json.loads((script_dir/'texoro-work-slugs.json').read_text(encoding='utf-8'))
    occupied_slugs = {row[2] for row in baseline}
    poetry = collections.defaultdict(list)
    for row in records:
        if row['genre'] == 'poesia':
            poetry[row['collection']].append(row)
    if set(poetry) - set(COLLECTIONS):
        raise ValueError('Unknown poetic collections; review before importing')
    author_ids = collections.defaultdict(list)
    for aid, name in db.execute('SELECT id,nombre FROM authors'):
        author_ids[author_key(name)].append(aid)
    occupied_authors = {r[0] for r in db.execute('SELECT public_id FROM authors')}
    occupied_works = {r[1] for r in baseline}
    def resolve_author(name):
        name = canonical_name(name)
        key = author_key(name.strip())
        candidates = author_ids[key]
        if len(candidates) > 1:
            raise ValueError(f'Ambiguous author: {name}')
        if candidates:
            return candidates[0]
        suffix = hashlib.sha256(key.encode()).hexdigest()[:16]
        aid = 'texoro_author_' + suffix
        # Preserve the numeric public ID assigned before renaming this local import.
        public_id = stable_public_id('bertvantes_author_' + suffix, occupied_authors)
        db.execute('INSERT INTO authors(id,public_id,nombre) VALUES (?,?,?)', (aid, public_id, name.strip()))
        candidates.append(aid)
        return aid
    def read_text(row):
        path = args.corpus / 'texts' / row['collection'] / f"{row['canonical_id']}.txt"
        raw = path.read_bytes()
        if hashlib.sha256(raw).hexdigest() != row['frozen_sha256']:
            raise ValueError(f'Corpus checksum mismatch: {path}')
        text = raw.decode('utf-8-sig').strip()
        if '\f' in text:
            raise ValueError(f'Unexpected section separator: {path}')
        return text
    additions = []
    components = []
    source_details = []
    summaries_added = 0
    completed_texts = []
    units = [(r['canonical_id'], prose_metadata.get(r['canonical_id'], {}).get('title', r['title']), 'Prosa', prose_metadata.get(r['canonical_id'], {}).get('subgenre', 'Sin especificar'), [r]) for r in prose]
    units += [(key, COLLECTIONS[key][0], 'Poesía', COLLECTIONS[key][1], sorted(rows, key=lambda r: r['canonical_id'])) for key, rows in sorted(poetry.items())]
    for key, title, genre, subgenre, rows in units:
        work_id = 'TEXORO_' + key
        slug = work_slugs[key]
        if not slug or slug in occupied_slugs or 'bertvantes' in slug.lower():
            raise ValueError(f'Invalid or duplicated public work slug: {key}')
        occupied_slugs.add(slug)
        public_id = stable_public_id('BERTVANTES_' + key, occupied_works)
        bodies = [read_text(r) for r in rows]
        completion = completions.get(key)
        if completion:
            bodies = [completion['text']]
            title = completion.get('title', title).strip()
        output_text = '\n\f\n'.join(bodies) + '\n'
        (texts / f'{work_id}.txt').write_text(output_text, encoding='utf-8')
        names = sorted(set(canonical_author(r) for r in rows if r['author'].strip()))
        authors = list(dict.fromkeys(resolve_author(name) for name in names))
        repositories = sorted(set(r['source_repository'] for r in rows if r.get('source_repository')))
        urls = sorted(set(r['source_url'] for r in rows if r.get('source_url')))
        urls += [f'https://github.com/{repo}' for repo in repositories if not any(repo in url for url in urls)]
        notes = sorted(set(r['provenance_note'] for r in rows if r.get('provenance_note')))
        licenses = sorted(set(r['license'] for r in rows if r.get('license')))
        projects = [COLLECTIONS[key][0]] if genre == 'Poesía' else sorted(set(r['source_project'] for r in rows))
        source_details.append({'workId': work_id, 'projects': projects,
                               'urls': urls, 'notes': notes, 'licenses': licenses,
                               'frozenDocuments': len(rows)})
        origin = COLLECTION_ORIGINS[key] if genre == 'Poesía' else 'El texto procede del corpus NovelaBarroca.'
        if completion:
            origin = ('El texto procede de la Biblioteca Virtual Miguel de Cervantes.'
                      if key in ('novelabarroca-0010', 'novelabarroca-0018') else
                      'El texto procede del corpus NovelaBarroca, completado con textos de la Biblioteca Virtual Miguel de Cervantes.')
            source_details[-1]['completion'] = {field: completion[field] for field in ('sources', 'note', 'sha256')}
            completed_texts.append({
                'canonicalId': key, 'title': title,
                'frozenSha256': rows[0]['frozen_sha256'],
                'completionSha256': completion['sha256'],
                'outputSha256': hashlib.sha256(output_text.encode('utf-8')).hexdigest(),
                'sources': completion['sources'], 'note': completion['note'].strip(),
            })
        size = len(rows) if genre == 'Poesía' else None
        db.execute('''INSERT INTO works(id,public_id,slug,archivo,titulo,titulo_busqueda,genero,genero_general,collection_size,
                      adicion,estado_texto,examen_autorias,biteso,tiene_tei,procede,tiene_acceso_externo)
                      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)''',
                   (work_id, public_id, slug, work_id+'.txt', title, normalized(title), subgenre, genre, size,
                    '2026/10', 'Bueno', 0, 0, 0, origin, bool(urls)))
        if args.summaries:
            summary = read_summary(args.summaries, work_id, title)
            db.execute('UPDATE works SET resumen_breve=? WHERE id=?',
                       ('\n'.join(summary['resumen_breve']), work_id))
            (summaries_output / f'{work_id}.json').write_text(
                json.dumps(summary, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
            summaries_added += 1
        set_id = db.execute('INSERT INTO attribution_sets(work_id,attribution_type,raw_expression) VALUES (?,?,?)', (work_id,'tradicional','/'.join(authors))).lastrowid
        group_id = db.execute('INSERT INTO attribution_groups(attribution_set_id,group_order) VALUES (?,0)', (set_id,)).lastrowid
        for order, aid in enumerate(authors):
            db.execute('INSERT INTO attribution_members(attribution_group_id,author_id,member_order) VALUES (?,?,?)', (group_id,aid,order))
            db.execute('INSERT INTO work_author_index(work_id,author_id,attribution_type,occurrences) VALUES (?,?,?,1)', (work_id,aid,'tradicional'))
        set_id = db.execute('INSERT INTO attribution_sets(work_id,attribution_type,raw_expression) VALUES (?,?,?)', (work_id,'estilometria','no_analizada')).lastrowid
        group_id = db.execute('INSERT INTO attribution_groups(attribution_set_id,group_order) VALUES (?,0)', (set_id,)).lastrowid
        db.execute('INSERT INTO attribution_members(attribution_group_id,author_id,member_order) VALUES (?,?,0)', (group_id,'no_analizada'))
        db.execute('INSERT INTO work_author_index(work_id,author_id,attribution_type,occurrences) VALUES (?,?,?,1)', (work_id,'no_analizada','estilometria'))
        access_links = build_text_access_links(key, projects, urls, completion)
        for order, (label, url) in enumerate(access_links):
            db.execute('INSERT INTO text_access(work_id,tipo,etiqueta,url,position) VALUES (?,?,?,?,?)', (work_id,'texto_externo',label,url,order))
        additions.append({'id':work_id,'publicId':public_id,'title':title,'genre':genre,'subgenre':subgenre,'documents':len(rows),'authors':'; '.join(names),'source':'; '.join(projects)})
        for r in rows:
            components.append({'collection_work':work_id,'canonical_id':r['canonical_id'],'title':r['title'],'author':r['author'],'canonical_author':canonical_author(r),'source_project':r['source_project'],'source_repository':r['source_repository'],'source_url':r.get('source_url',''),'source_commit':r.get('source_commit',''),'license':r.get('license',''),'sha256':r['frozen_sha256']})
    db.commit()
    assert db.execute('SELECT id,public_id,slug,genero,examen_autorias,asodat_id FROM works WHERE id NOT LIKE ? ORDER BY id', ('TEXORO_%',)).fetchall() == baseline
    assert not db.execute("SELECT 1 FROM works WHERE id LIKE 'TEXORO_%' AND (examen_autorias<>0 OR asodat_id IS NOT NULL OR resultado1 IS NOT NULL OR resultado2 IS NOT NULL)").fetchone()
    assert not db.execute('PRAGMA foreign_key_check').fetchall()
    db.close()
    source.close()
    (output/'catalogue.build.sqlite').replace(output/'catalogue.sqlite')
    for name, rows in [('imported-works.tsv',additions),('document-provenance.tsv',components)]:
        with (output/name).open('w',encoding='utf-8',newline='') as handle:
            writer=csv.DictWriter(handle,fieldnames=list(rows[0]),delimiter='\t')
            writer.writeheader();writer.writerows(rows)
    report={'baselineWorks':len(baseline),'proseWorks':len(prose),'poetryCollections':len(poetry),'poems':sum(map(len,poetry.values())),'totalWorks':len(baseline)+len(additions),'sourceCorpus':str(args.corpus.resolve()),'asodatAssociationsPreserved':True}
    report['automaticSummaries'] = summaries_added
    if args.text_completions is not None:
        report['textCompletions'] = completed_texts
    (output/'import-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    (output/'source-details.json').write_text(json.dumps(source_details,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps(report,ensure_ascii=False))

if __name__ == '__main__':
    main()
