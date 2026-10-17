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
    for kind in ('authorship', 'dating'):
        if not any(f['kind'] == kind for f in figures):
            continue
        prefix = ('El experimento de autoría ' if kind == 'authorship' else
                  'El experimento de datación por caminos (NSC, 12.000 palabras más frecuentes) ')
        specific = [p for p in result['paragraphs'] if p.startswith(prefix)]
        if len(specific) != 1:
            raise ValueError(f'Missing or ambiguous {kind} commentary: {entry["entryId"]}')
        if kind == 'authorship':
            method = ('El análisis de autoría utiliza Support Vector Machine (SVM), un método de aprendizaje automático entrenado con 1030 obras: 280 de Lope de Vega y 750 de otros dramaturgos. A partir de las frecuencias de las palabras, clasifica por separado el texto completo, sus dos mitades y sus tres tercios. ')
            outcome = 'En esta obra, el experimento ' + specific[0][len(prefix):]
            legend = ' La figura representa las clasificaciones como LOPE en verde y como NOLOPE en azul.'
            paragraphs.append(method + outcome + legend)
        else:
            method = ('El análisis de datación utiliza Nearest Shrunken Centroids (NSC), un clasificador que compara perfiles de frecuencias léxicas, con las 12.000 palabras más frecuentes de un corpus de 296 obras fechadas de Lope. Mediante un procedimiento por caminos, compara sucesivamente dos grandes periodos y descarta un lustro del extremo contrario al favorecido, reduciendo el intervalo cronológico. ')
            paragraphs.append(method + 'En este caso, ' + specific[0][len(prefix):])
    for work_id in entry['workIds']:
        if work_id in output['works']: raise ValueError('Two thesis versions mapped to one catalog work: ' + work_id)
        output['works'][work_id] = figures
        output['commentaries'][work_id] = paragraphs
        output['pages'][work_id] = sorted(set(f['page'] for f in figures))
(ROOT / 'data/referencias/graficas-tesis.json').write_text(json.dumps(output, ensure_ascii=False, indent=2)+'\n')
print(f"Prepared {len(output['works'])} works, {sum(map(len,output['works'].values()))} figure links")
