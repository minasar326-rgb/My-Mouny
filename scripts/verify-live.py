import urllib.request, json, re

req = urllib.request.Request('https://minasar326-rgb.github.io/Zaker-MB/manifest.json', headers={'User-Agent': 'Mozilla/5.0'})
with urllib.request.urlopen(req) as resp:
    data = json.loads(resp.read().decode('utf-8'))
    print('Manifest Name:', data.get('name'))
    print('Manifest ID:', data.get('id'))
    print('Manifest Scope:', data.get('scope'))

req2 = urllib.request.Request('https://minasar326-rgb.github.io/Zaker-MB/icons/icon-192.png', headers={'User-Agent': 'Mozilla/5.0'})
with urllib.request.urlopen(req2) as resp2:
    print('Icon Status:', resp2.status)

req3 = urllib.request.Request('https://minasar326-rgb.github.io/Zaker-MB/', headers={'User-Agent': 'Mozilla/5.0'})
with urllib.request.urlopen(req3) as resp3:
    html = resp3.read().decode('utf-8')
    title = re.search(r'<title>(.*?)</title>', html)
    print('Title:', title.group(1) if title else 'No title')
    css = re.search(r'href="([^"]*styles[^"]*)"', html)
    print('CSS Link:', css.group(1) if css else 'No css')
