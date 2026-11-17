#!/usr/bin/env python3
"""Geocode the town/locality of each post office via Nominatim (1 req/s, cached).
Result is a locality centroid, NOT the post office building: always flagged approximate."""
import json, os, re, time, urllib.parse, urllib.request
ROOT = os.path.join(os.path.dirname(__file__), '..')
CACHE = f'{ROOT}/data-sources/nominatim_cache.json'
cache = json.load(open(CACHE)) if os.path.exists(CACHE) else {}
locs = json.load(open(f'{ROOT}/public/data/locations.json'))['locations']
def locality(rank):
    s = re.sub(r'\b(GPO|HO|SO|BO|NA|PB|HPO)\b(-PB)?', '', rank)
    s = re.sub(r'(?i)\b(branch|head|sub)?\s*post office\b', '', s)
    return re.sub(r'[,\-]+\s*$', '', s).strip(' ,-')
for l in locs:
    q = f"{locality(l['postOfficeRank'])}, {l['district']}, {l['state']}, India"
    if q in cache: continue
    url = 'https://nominatim.openstreetmap.org/search?' + urllib.parse.urlencode({'q': q, 'format': 'jsonv2', 'limit': 1, 'countrycodes': 'in'})
    req = urllib.request.Request(url, headers={'User-Agent': 'philately-passport-mvp/0.1 (unofficial companion; one-off build)'})
    try:
        cache[q] = json.load(urllib.request.urlopen(req, timeout=30))
    except Exception as e:
        print('ERR', q, e); cache[q] = None
    json.dump(cache, open(CACHE, 'w'), indent=0)
    time.sleep(1.2)
print('done', len(cache))
