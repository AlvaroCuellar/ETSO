#!/usr/bin/env python3
"""Validate versioned thesis graphics without private sources, SQLite, or network."""
import hashlib
import json
from pathlib import Path
import re
import struct

ROOT = Path(__file__).resolve().parents[1]
def validate(root=ROOT):
    data=json.loads((root/'data/referencias/graficas-tesis.json').read_text())
    def require(condition,message):
        if not condition:raise ValueError(message)
    require(isinstance(data,dict) and data.get('schemaVersion')==1,'Invalid graphics schema')
    works=data.get('works');commentaries=data.get('commentaries');pages=data.get('pages')
    require(all(isinstance(x,dict) for x in (works,commentaries,pages)),'Invalid graphics maps')
    require(set(works)==set(commentaries)==set(pages),'Graphics/commentary/page work keys differ')
    snapshot=json.loads((root/'data/referencias/catalogo-identificadores.json').read_text())
    require(isinstance(snapshot,dict) and snapshot.get('schemaVersion')==1 and isinstance(snapshot.get('workIds'),list),'Invalid catalog snapshot')
    require(set(works)<=set(snapshot['workIds']),'Unknown graphics work ID')
    source=data.get('source');require(isinstance(source,dict),'Missing graphics source')
    bibliography=json.loads((root/'data/referencias/bibliografia.json').read_text())
    require(source.get('referenceKey') in bibliography['entriesByKey'],'Unknown graphics reference')
    require(isinstance(source.get('url'),str) and source['url'].startswith('https://'),'Invalid graphics source URL')
    total=0
    for work,figures in works.items():
        require(isinstance(commentaries[work],list) and bool(commentaries[work]) and all(isinstance(p,str) and p.strip() for p in commentaries[work]),'Invalid commentary: '+work)
        require(isinstance(figures,list) and 1<=len(figures)<=2,'Invalid figure list: '+work)
        kinds=[];actualpages=[]
        for figure in figures:
            require(isinstance(figure,dict),'Invalid figure object: '+work)
            kind=figure.get('kind');require(kind in ('authorship','dating') and kind not in kinds,'Invalid/duplicate figure kind: '+work);kinds.append(kind)
            page=figure.get('page');require(type(page)is int and 86<=page<=455,'Invalid printed page: '+work);actualpages.append(page)
            src=figure.get('src');require(isinstance(src,str) and bool(re.fullmatch(r'/graficas/tesis-2022/tesis-\d{4}-(autoria|datacion)\.png',src)),'Unsafe figure path: '+work)
            require(src.endswith('-autoria.png')==(kind=='authorship'),'Kind/path mismatch: '+work)
            payload=(root/'static'/src.lstrip('/')).read_bytes()
            require(hashlib.sha256(payload).hexdigest()==figure.get('sha256'),'Figure hash mismatch: '+src)
            require(payload[:8]==b'\x89PNG\r\n\x1a\n' and payload[12:16]==b'IHDR','Invalid PNG: '+src)
            width,height=struct.unpack('>II',payload[16:24])
            require(type(figure.get('width'))is int and type(figure.get('height'))is int and (width,height)==(figure['width'],figure['height']),'PNG dimensions mismatch: '+src)
            total+=1
        require(pages[work]==sorted(set(actualpages)),'Printed page registry mismatch: '+work)
    return len(works),total
if __name__=='__main__':
    works,total=validate();print(f'Validated {works} thesis works and {total} native PNGs.')
