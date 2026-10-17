#!/usr/bin/env python3
"""Apply explicitly reviewed, source-verified notes without overwriting manual TSV edits."""
import argparse
import csv
import hashlib
import io
import json
import os
from pathlib import Path
import tempfile

ROOT = Path(__file__).resolve().parents[1]
def digest(text): return hashlib.sha256(text.encode('utf-8')).hexdigest()
def citation(entry, pages):
    chunks = [entry['author'] + '.', '(' + str(entry['year']) + ').', entry['title'].rstrip('.') + '.']
    for key in ['journal', 'containerTitle', 'details', 'publisher']:
        if entry.get(key): chunks.append(entry[key].rstrip('.') + '.')
    url = 'https://doi.org/' + entry['doi'] if entry.get('doi') else entry.get('url', '')
    if url: chunks.append(url)
    if pages:
        chunks.append('Pasaje: ' + ('p. ' if len(pages) == 1 else 'pp. ') + ', '.join(map(str, pages)) + '.')
    return ' '.join(chunks)
def build_notes(bundle, bibliography):
    if bundle.get('schemaVersion') != 1: raise ValueError('Unsupported notes schema')
    grouped, seen = {}, set()
    for record in bundle['notes']:
        if record.get('reviewStatus') != 'verified_for_catalog': raise ValueError('Unreviewed note: ' + record['id'])
        if record['id'] in seen: raise ValueError('Duplicate note id: ' + record['id'])
        seen.add(record['id'])
        source = record['source']; path = Path(source['path'])
        if hashlib.sha256(path.read_bytes()).hexdigest() != source['sha256']: raise ValueError('Source changed: ' + str(path))
        paragraphs = record['standaloneParagraphs']
        if not paragraphs or any(not isinstance(p, str) or not p.strip() for p in paragraphs): raise ValueError('Empty paragraphs: ' + record['id'])
        if record.get('mode') not in ('literal', 'summary'): raise ValueError('Unknown note mode')
        if not record['workIds']: raise ValueError('No mapped work: ' + record['id'])
        ref = bibliography['entriesByKey'][record['referenceKey']]
        intro = ('Como se apunta en ' if record['mode'] == 'literal' else 'Resumen del estudio: ') + citation(ref, record.get('pages', []))
        if record.get('context'): intro += ' ' + record['context']
        text = intro + '\n\n' + '\n\n'.join(paragraphs)
        for work_id in record['workIds']:
            if text in grouped.setdefault(work_id, []): raise ValueError('Duplicated source text for ' + work_id)
            grouped[work_id].append(text)
    return {key: '\n\n'.join(values) for key, values in grouped.items()}
def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--bundle', type=Path, required=True)
    p.add_argument('--tsv', type=Path, required=True)
    p.add_argument('--ledger', type=Path, required=True)
    p.add_argument('--apply', action='store_true')
    a = p.parse_args()
    bundle = json.loads(a.bundle.read_text()); bibliography = json.loads((ROOT/'data/referencias/bibliografia.json').read_text())
    notes = build_notes(bundle, bibliography)
    before = list(csv.reader(io.StringIO(a.tsv.read_text()), delimiter='\t')); headers = before[0]
    col, file_col = headers.index('Notas'), headers.index('Archivo')
    if any(len(row) != len(headers) for row in before): raise ValueError('Malformed TSV width')
    rows = {Path(row[file_col]).stem: row for row in before[1:]}
    if len(rows) != len(before)-1: raise ValueError('Duplicate Archivo in TSV')
    ledger = json.loads(a.ledger.read_text()) if a.ledger.exists() else {}
    after = [row[:] for row in before]
    targets = set(notes) | set(ledger)
    for work_id in targets:
        if work_id not in rows: raise ValueError('Unknown work: ' + work_id)
        existing = rows[work_id][col]
        if (work_id in ledger and digest(existing) != ledger[work_id]) or (work_id not in ledger and existing):
            raise ValueError('Manual change protected: ' + work_id)
    for row in after[1:]:
        work_id = Path(row[file_col]).stem
        if work_id in targets: row[col] = notes.get(work_id, '')
    assert all(x[:col]+x[col+1:]==y[:col]+y[col+1:] for x,y in zip(before,after))
    changed = sum(x != y for x,y in zip(before,after))
    print(f'{len(notes)} works, {len(bundle["notes"])} reviewed notes; {changed} rows would change.')
    if not a.apply: return
    out = io.StringIO(newline='');csv.writer(out, delimiter='\t', lineterminator='\n').writerows(after)
    fd, temp = tempfile.mkstemp(prefix='cetso-notas-',suffix='.tsv',dir=a.tsv.parent)
    try:
        with os.fdopen(fd,'w',encoding='utf-8',newline='') as f: f.write(out.getvalue())
        os.replace(temp,a.tsv)
    finally:
        if Path(temp).exists(): Path(temp).unlink()
    a.ledger.write_text(json.dumps({key:digest(value) for key,value in notes.items()},ensure_ascii=False,indent=2)+'\n')
if __name__ == '__main__': main()
