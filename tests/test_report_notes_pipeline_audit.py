"""Independent invariants: manual edits, generated-note removal, and public assets."""
import csv
import hashlib
import io
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
ROOT = Path(__file__).resolve().parents[1]

class NotesPipelineAudit(unittest.TestCase):
    def test_importer_preserves_manual_edits_and_removes_only_owned_notes(self):
        with tempfile.TemporaryDirectory() as d:
            base = Path(d); tsv = base/'catalog.tsv'; ledger = base/'ledger.json'; bundle = base/'bundle.json'; source = base/'source.pdf'
            source.write_bytes(b'source fixture')
            bib = json.loads((ROOT/'data/referencias/bibliografia.json').read_text())
            key = next(k for k,v in bib['entriesByKey'].items() if all(x in v for x in ('author','year','title')))
            note = dict(id='fixture', reviewStatus='verified_for_catalog', source=dict(path=str(source),sha256=hashlib.sha256(source.read_bytes()).hexdigest()), standaloneParagraphs=['Párrafo con "comillas".','Verso uno\nVerso dos.'],mode='literal',workIds=['WORK'],referenceKey=key,pages=[1])
            bundle.write_text(json.dumps(dict(schemaVersion=1,notes=[note])))
            def write(notes=''):
                with tsv.open('w',newline='') as f:csv.writer(f,delimiter='\t').writerows([['Archivo','Notas','Otro'],['WORK.txt',notes,'Preservar'],['MANUAL.txt','Nota manual','Intacto']])
            def run():return subprocess.run([sys.executable,str(ROOT/'scripts/apply-reviewed-report-notes.py'),'--bundle',str(bundle),'--tsv',str(tsv),'--ledger',str(ledger),'--apply'],capture_output=True)
            write();result=run();self.assertEqual(result.returncode,0,result.stderr.decode())
            rows=list(csv.reader(io.StringIO(tsv.read_text()),delimiter='\t'));self.assertIn('\n\nPárrafo con "comillas".\n\nVerso uno\nVerso dos.',rows[1][1]);self.assertEqual(rows[2],['MANUAL.txt','Nota manual','Intacto'])
            owned=rows[1][1];write(owned+' cambio manual');before=tsv.read_bytes();oldledger=ledger.read_bytes();self.assertNotEqual(run().returncode,0);self.assertEqual(tsv.read_bytes(),before);self.assertEqual(ledger.read_bytes(),oldledger)
            write(owned);bundle.write_text(json.dumps(dict(schemaVersion=1,notes=[])));self.assertEqual(run().returncode,0);rows=list(csv.reader(io.StringIO(tsv.read_text()),delimiter='\t'));self.assertEqual(rows[1],['WORK.txt','','Preservar']);self.assertEqual(rows[2][1],'Nota manual')

    def test_public_thesis_assets_have_hashes_and_no_blocked_versions(self):
        registry=json.loads((ROOT/'data/referencias/graficas-tesis.json').read_text())
        self.assertEqual(set(registry['works']),set(registry['commentaries']))
        self.assertEqual(set(registry['works']),set(registry['pages']))
        forbidden={'tesis-0091-autoria.png','tesis-0091-datacion.png','tesis-0204-autoria.png','tesis-0355-autoria.png','tesis-0355-datacion.png','tesis-0377-autoria.png','tesis-0377-datacion.png'}
        for work,figures in registry['works'].items():
            self.assertTrue(registry['commentaries'][work]);self.assertEqual(len({f['kind'] for f in figures}),len(figures))
            self.assertEqual(sorted({f['page'] for f in figures}),registry['pages'][work])
            for f in figures:
                self.assertTrue(f['src'].startswith('/graficas/tesis-2022/'));self.assertNotIn(Path(f['src']).name,forbidden)
                self.assertGreater(f['width'],0);self.assertGreater(f['height'],0)
                self.assertEqual(hashlib.sha256((ROOT/'static'/f['src'].lstrip('/')).read_bytes()).hexdigest(),f['sha256'])
    def test_public_validator_rejects_missing_changed_assets_and_unknown_ids(self):
        import importlib.util
        spec=importlib.util.spec_from_file_location('graphics_validator',ROOT/'scripts/validate-thesis-report-graphics.py');module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
        current=json.loads((ROOT/'data/referencias/graficas-tesis.json').read_text());work=next(iter(current['works']));figure=current['works'][work][0]
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory);refs=root/'data/referencias';refs.mkdir(parents=True)
            data=dict(schemaVersion=1,source=current['source'],works={work:[figure]},commentaries={work:['Resultado.']},pages={work:[figure['page']]})
            registry=refs/'graficas-tesis.json';registry.write_text(json.dumps(data))
            (refs/'bibliografia.json').write_text(json.dumps({'entriesByKey':{current['source']['referenceKey']:{}}}))
            snapshot=refs/'catalogo-identificadores.json';snapshot.write_text(json.dumps(dict(schemaVersion=1,workIds=[work])))
            with self.assertRaises(FileNotFoundError):module.validate(root)
            asset=root/'static'/figure['src'].lstrip('/');asset.parent.mkdir(parents=True);asset.write_bytes((ROOT/'static'/figure['src'].lstrip('/')).read_bytes());self.assertEqual(module.validate(root),(1,1))
            asset.write_bytes(asset.read_bytes()+b'changed')
            with self.assertRaisesRegex(ValueError,'hash mismatch'):module.validate(root)
            asset.write_bytes((ROOT/'static'/figure['src'].lstrip('/')).read_bytes());snapshot.write_text(json.dumps(dict(schemaVersion=1,workIds=[])))
            with self.assertRaisesRegex(ValueError,'Unknown graphics work'):module.validate(root)
if __name__=='__main__':unittest.main()
