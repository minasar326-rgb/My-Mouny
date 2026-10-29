import urllib.request, re, time

t = int(time.time())
req = urllib.request.Request(f'https://minasar326-rgb.github.io/Zaker-MB/?t={t}', headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
try:
    with urllib.request.urlopen(req) as resp:
        html = resp.read().decode('utf-8')
        print('Status:', resp.status)
        title_match = re.search(r'<title>(.*?)</title>', html)
        print('Title:', title_match.group(1) if title_match else 'None')
        
        # Check all css links
        css_links = re.findall(r'href=[\'"]([^\'"]*?\.css[^\'"]*?)[\'"]', html)
        print('CSS links count:', len(css_links))
        for c in css_links:
            url = c if c.startswith('http') else f'https://minasar326-rgb.github.io{c}'
            try:
                with urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})) as cr:
                    print('  CSS OK:', cr.status, url)
            except Exception as e:
                print('  CSS FAIL:', e, url)
                
        # Check all script links
        scripts = re.findall(r'src=[\'"]([^\'"]*?\.js[^\'"]*?)[\'"]', html)
        print('Script links count:', len(scripts))
        for s in scripts:
            url = s if s.startswith('http') else f'https://minasar326-rgb.github.io{s}'
            try:
                with urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})) as sr:
                    print('  Script OK:', sr.status, url)
            except Exception as e:
                print('  Script FAIL:', e, url)
except Exception as e:
    print('Page load failed:', e)
