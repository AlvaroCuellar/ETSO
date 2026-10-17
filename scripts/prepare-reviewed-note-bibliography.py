#!/usr/bin/env python3
"""Link reviewed source passages to their exact catalog works, preserving editorial rules."""
import json
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
bundle = json.loads((ROOT/'revisiones/notas_informes/revisadas/notas_revisadas.json').read_text())
path = ROOT/'data/referencias/informes-relacionados.json'
config = json.loads(path.read_text())
groups = {}
for note in bundle['notes']:
    if note['reviewStatus'] != 'verified_for_catalog':
        raise ValueError('Unreviewed note: ' + note['id'])
    groups.setdefault(note['referenceKey'], set()).update(note['workIds'])
config['rules'] = [r for r in config['rules'] if not r['id'].startswith('pasajes-verificados-')]
for key, ids in groups.items():
    config['rules'].append(dict(id='pasajes-verificados-'+key, workIds=sorted(ids), entryKeys=[key]))
path.write_text(json.dumps(config,ensure_ascii=False,indent='\t')+'\n')
print(f'Updated {len(groups)} reviewed-passage bibliography rules')
