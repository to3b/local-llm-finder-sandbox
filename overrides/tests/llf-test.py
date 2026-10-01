#!/usr/bin/env python3
"""Run a small repeatable test against an existing local Ollama model.
Uses only Python's standard library. Never uploads anything.
"""
import argparse, datetime, json, platform, subprocess, sys, urllib.error, urllib.request
from pathlib import Path

BASE='http://127.0.0.1:11434'
PROMPT=('Write a practical guide for someone organizing a small home library. '
        'Explain how to sort books, label shelves, track borrowed books, and maintain the system. '
        'Give concrete examples and continue for at least 250 words. Do not use tools.')
CODE_PROMPT=('Write a Python function that accepts a list of dictionaries containing title, author, and year, '
             'then groups the books by author and sorts each group by year. Include input validation and a short '
             'example showing the result. Do not use external packages or tools.')

def api(path,body=None):
    data=json.dumps(body).encode() if body is not None else None
    req=urllib.request.Request(BASE+path,data=data,headers={'Content-Type':'application/json'})
    with urllib.request.urlopen(req,timeout=300) as response:return json.load(response)

def hardware_name():
    try:
        r=subprocess.run(['nvidia-smi','--query-gpu=name,memory.total','--format=csv,noheader'],capture_output=True,text=True,timeout=5,check=True)
        line=r.stdout.strip().splitlines()[0];name,memory=line.rsplit(',',1)
        return f'{name.strip()} — {int(round(float(memory.strip().split()[0])/1024))} GB'
    except (FileNotFoundError,subprocess.SubprocessError,ValueError,IndexError):return ''

def main():
    parser=argparse.ArgumentParser(description='Test an installed Ollama model. Saves a file; never uploads it.')
    parser.add_argument('--model');parser.add_argument('--hardware');parser.add_argument('--output',default='llf-test-result.json')
    parser.add_argument('--prompt',choices=['writing','code'],default='writing',help='Baseline prompt; writing is the default.')
    args=parser.parse_args()
    try:
        models=api('/api/tags').get('models',[])
        if not models:print('No installed models found. Use a model you already have, then try again.');return 1
        if args.model:
            model=next((m for m in models if m['name']==args.model),None)
            if not model:print('That model is not installed. Choose a name shown by ollama list.');return 1
        else:
            print('Choose an installed model to test:')
            for i,m in enumerate(models,1):print(f'  {i}. {m["name"]}')
            selection=input('Model number: ').strip()
            if not selection.isdigit() or not 1<=int(selection)<=len(models):print('Choose one of the model numbers.');return 1
            model=models[int(selection)-1]
        hardware=args.hardware or hardware_name()
        if not hardware:hardware=input('Hardware (for example Mac M2 16 GB): ').strip()
        version=api('/api/version').get('version','')
        options={'num_ctx':4096,'num_predict':128,'temperature':0,'seed':42}
        body={'model':model['name'],'prompt':CODE_PROMPT if args.prompt=='code' else PROMPT,'stream':False,'options':options,'keep_alive':'5m'}
        print('Warming up the model, then running five short tests. No results are uploaded.')
        api('/api/generate',body)
        samples=[]
        for i in range(5):
            result=api('/api/generate',body);tokens=result.get('eval_count',0);seconds=result.get('eval_duration',0)/1e9
            if not tokens or seconds<=0:print('This model did not return generation timing. You can send a quick report instead.');return 1
            samples.append({'outputTokens':tokens,'generationSeconds':seconds,'promptTokens':result.get('prompt_eval_count',0)})
            print(f'  Run {i+1}/5: {tokens/seconds:.1f} tokens/second')
        loaded=next((m for m in api('/api/ps').get('models',[]) if m.get('name')==model['name'] or m.get('model')==model['name']),{})
        vram=loaded.get('size_vram',0);size=loaded.get('size',0)
        report={'protocol':'llf-ollama-v1','promptId':'baseline-code-v1' if args.prompt=='code' else 'baseline-writing-v1','testedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'hardware':hardware,'model':model['name'],'modelDigest':model.get('digest',''),'quant':model.get('details',{}).get('quantization_level',''),'runtimeVersion':version,'contextTokens':loaded.get('context_length') or 4096,'numPredict':128,'samples':samples,'loadedVramGB':round(vram/1e9,3) if vram else None,'offload':'all_on_gpu' if size and vram>=size*.99 else 'mixed_or_cpu'}
        Path(args.output).write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
        print(f'Saved {args.output}. Import this file on the Share a test page, check the details, and submit if you want to contribute.')
        return 0
    except (urllib.error.URLError,TimeoutError,ConnectionError,json.JSONDecodeError) as e:
        print('Could not complete the local test. Make sure Ollama is running with an installed model. You can still send a quick report.');return 1
    except OSError:
        print('Could not save the result file. Run the helper from a folder you can write to, or choose another --output path. Nothing was uploaded.');return 1
    except (KeyboardInterrupt,EOFError):print('\nTest stopped. Nothing was uploaded.');return 1

if __name__=='__main__':sys.exit(main())
