import urllib.request, json
req = urllib.request.Request('https://api.github.com/repos/minasar326-rgb/Zaker-MB/actions/runs/40867125108/jobs', headers={'User-Agent': 'Mozilla/5.0'})
with urllib.request.urlopen(req) as r:
    d = json.load(r)
    for j in d['jobs']:
        if j['conclusion'] == 'failure':
            jid = j['id']
            req2 = urllib.request.urlopen(urllib.request.Request(f'https://api.github.com/repos/minasar326-rgb/Zaker-MB/check-runs/{jid}/annotations', headers={'User-Agent': 'Mozilla/5.0'}))
            ann = json.load(req2)
            for a in ann:
                print('MSG:', a.get('message'))
