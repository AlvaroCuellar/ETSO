#!/usr/bin/env python3
"""Prepare verified original thesis figures and per-work explanations for local reports."""
import hashlib
import json
import shutil
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / 'revisiones/notas_informes/tesis'
manifest = json.loads((BASE / 'manifest_graficas.json').read_text())
results = {e['entryId']: e for e in json.loads((BASE / 'resultados_por_obra.json').read_text())['entries']}
output = {'schemaVersion': 1, 'source': {'referenceKey': 'cuellar-2022-tesis', 'url': 'https://doi.org/' + manifest['source']['doi']}, 'works': {}, 'commentaries': {}, 'pages': {}}
destination = ROOT / 'static/graficas/tesis-2022'
destination.mkdir(parents=True, exist_ok=True)
for entry in manifest['entries']:
    result = results.get(entry['entryId'])
    if not entry['workIds'] or not result or not result['paragraphs']: continue
    figures = []
    for figure in entry['graphics']:
        if not figure.get('publicEligible'): continue
        path = BASE / figure['file']
        if hashlib.sha256(path.read_bytes()).hexdigest() != figure['sha256']: raise ValueError(f'Changed asset: {path}')
        shutil.copy2(path, destination / path.name)
        figures.append(dict(src='/graficas/tesis-2022/' + path.name, kind=figure['kind'], page=figure['printedPage'], width=figure['nativeWidth'], height=figure['nativeHeight'], sha256=figure['sha256']))
    if not figures: continue
    paragraphs = []
    if any(f['kind'] == 'authorship' for f in figures):
        paragraphs.append('El experimento de autoría emplea aprendizaje automático para clasificar el texto completo, sus dos mitades y sus tres tercios. Las filas de la figura representan esas tres divisiones del texto; el verde corresponde a LOPE y el azul a NOLOPE.')
    if any(f['kind'] == 'dating' for f in figures):
        paragraphs.append('El experimento de datación compara el vocabulario con el de 296 obras fechadas de Lope mediante NSC y las 12.000 palabras más frecuentes. El procedimiento por caminos reduce progresivamente el intervalo cronológico descartando un lustro de uno de sus extremos.')
    paragraphs += result['paragraphs']
    for work_id in entry['workIds']:
        if work_id in output['works']: raise ValueError('Two thesis versions mapped to one catalog work: ' + work_id)
        output['works'][work_id] = figures
        output['commentaries'][work_id] = paragraphs
        output['pages'][work_id] = sorted(set(f['page'] for f in figures))
(ROOT / 'data/referencias/graficas-tesis.json').write_text(json.dumps(output, ensure_ascii=False, indent=2)+'\n')
print(f"Prepared {len(output['works'])} works, {sum(map(len,output['works'].values()))} figure links")
