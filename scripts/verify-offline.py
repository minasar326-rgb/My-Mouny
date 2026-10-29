import urllib.request, json, re, time

t = int(time.time())
req1 = urllib.request.Request(f'https://minasar326-rgb.github.io/Zaker-MB/manifest.json?t={t}', headers={'User-Agent': 'Mozilla/5.0'})
with urllib.request.urlopen(req1) as r1:
    m = json.loads(r1.read().decode('utf-8'))
    print('Live Manifest Name:', m.get('name'))
    print('Live Manifest ID:', m.get('id'))

req2 = urllib.request.Request(f'https://minasar326-rgb.github.io/Zaker-MB/offline.html?t={t}', headers={'User-Agent': 'Mozilla/5.0'})
with urllib.request.urlopen(req2) as r2:
    print('Live Offline.html Status:', r2.status)

req3 = urllib.request.Request(f'https://minasar326-rgb.github.io/Zaker-MB/sw.js?t={t}', headers={'User-Agent': 'Mozilla/5.0'})
with urllib.request.urlopen(req3) as r3:
    sw = r3.read().decode('utf-8')
    m_cache = re.search(r'const CACHE = "([^"]*)"', sw)
    m_fb = re.search(r'const offlineFallbackPage = "([^"]*)"', sw)
    print('SW CACHE:', m_cache.group(1) if m_cache else 'Not found')
    print('SW Fallback:', m_fb.group(1) if m_fb else 'Not found')
