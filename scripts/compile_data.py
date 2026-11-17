#!/usr/bin/env python3
"""Compile public/data/locations.json from cached public sources in data-sources/.

Sources (fetched 2026-11-17):
  ppc_github_list_ka_tn.json   PPC list (name, date, office+rank, district, PIN)
                               https://praneethsaichunduru.github.io/ppcsofindia.github.io/list-pincode.html
  ka_booklet_list_unofficial.json  Unofficial list of the 100 Karnataka passport locations
                               https://philatelypassport.web.app/cancellations/
  osm_post_offices_ka_tn_py.json   OpenStreetMap amenity=post_office (Overpass API), ODbL
  geonames_IN_ka_tn_py.tsv     GeoNames postal codes (CC-BY 4.0), PIN-level approx coordinates
Nothing here is invented: when coordinates are approximate the record says so.
"""
import json, re, math, difflib, sys, os, statistics
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'data-sources'))
from guide_text import G

ROOT = os.path.join(os.path.dirname(__file__), '..')
DS = os.path.join(ROOT, 'data-sources')
gh = json.load(open(f'{DS}/ppc_github_list_ka_tn.json'))
ka100 = json.load(open(f'{DS}/ka_booklet_list_unofficial.json'))
osm = json.load(open(f'{DS}/osm_post_offices_ka_tn_py.json'))['elements']
geo = [l.rstrip('\n').split('\t') for l in open(f'{DS}/geonames_IN_ka_tn_py.tsv')]

SRC_GH = 'ppc-list:praneethsaichunduru.github.io'
SRC_KA = 'ka-list:philatelypassport.web.app'
STOP = {'post','office','branch','head','bo','so','ho','pb','gpo','the','of','and','hpo','sub','po','b','o','s','h','road','india'}

def toks(s): return [w for w in re.findall(r'[a-z]+', s.lower()) if w not in STOP and len(w) > 2]
def hav(a, b):
    r = math.radians; dlat = r(b[0]-a[0]); dlng = r(b[1]-a[1])
    x = math.sin(dlat/2)**2 + math.cos(r(a[0]))*math.cos(r(b[0]))*math.sin(dlng/2)**2
    return 6371 * 2 * math.asin(math.sqrt(x))
def office_type(rank):
    m = re.search(r'\b(GPO|HO|SO|BO|NA)\b', rank)
    return m.group(1) if m and m.group(1) != 'NA' else None
def slug(s): return re.sub(r'[^a-z0-9]+', '-', s.lower()).strip('-')

pin_rows = {}
for r in geo:
    if len(r) > 10 and r[9] and r[10]:
        pin_rows.setdefault(r[1], []).append((r[2], float(r[9]), float(r[10])))

osm_pos = []
for e in osm:
    t = e.get('tags', {}); name = t.get('name') or t.get('name:en')
    if not name: continue
    lat = e.get('lat', e.get('center', {}).get('lat')); lng = e.get('lon', e.get('center', {}).get('lon'))
    osm_pos.append((name, t.get('addr:postcode'), lat, lng, f"osm:{e['type']}/{e['id']}"))

NOM = json.load(open(f'{DS}/nominatim_cache.json')) if os.path.exists(f'{DS}/nominatim_cache.json') else {}

def locality(rank):
    s = re.sub(r'\b(GPO|HO|SO|BO|NA|PB|HPO)\b(-PB)?', '', rank)
    s = re.sub(r'(?i)\b(branch|head|sub)?\s*post office\b', '', s)
    return re.sub(r'[,\-]+\s*$', '', s).strip(' ,-')

def tokset_sim(a, b):
    """Symmetric fuzzy token overlap in [0,1]."""
    if not a or not b: return 0
    hit = lambda x, ys: any(difflib.SequenceMatcher(None, x, y).ratio() >= 0.8 for y in ys)
    return (sum(hit(x, b) for x in a) / len(a) + sum(hit(y, a) for y in b) / len(b)) / 2

def geocode(rank, pin, district, state):
    """Returns (lat, lng, method, confidence, note). Never fabricates: every point traces to a source row."""
    rows = pin_rows.get(pin, [])
    centroid = (statistics.median(r[1] for r in rows), statistics.median(r[2] for r in rows)) if rows else None
    q = f"{locality(rank)}, {district}, {state}, India"
    nom = None
    for r in (NOM.get(q) or [])[:1]:
        pt = (float(r['lat']), float(r['lon']))
        st_ok = state.split()[0].lower() in r.get('display_name', '').lower() or (state == 'Puducherry' and 'pondicherry' in r.get('display_name', '').lower())
        if st_ok and (not centroid or hav(pt, centroid) < 60):
            nom = (pt, r.get('display_name', ''), f"osm:{r.get('osm_type')}/{r.get('osm_id')}", r.get('addresstype') or r.get('type'))
    ref = nom[0] if nom else centroid
    ot = toks(locality(rank))
    # 1) OSM amenity=post_office whose name matches the office name, near the reference point
    if ot and ref:
        best = None
        for name, pc, lat, lng, oref in osm_pos:
            if pc and pc.replace(' ', '') != pin: continue
            sim = tokset_sim(ot, toks(name))
            if sim < 0.85: continue
            d = hav(ref, (lat, lng))
            if d > 12: continue
            sc = sim - d / 50
            if not best or sc > best[0]: best = (sc, lat, lng, name, oref)
        if best:
            return round(best[1], 6), round(best[2], 6), 'osm-post-office', 'medium', f'OpenStreetMap post office "{best[3]}" ({best[4]}) matched by name'
    # 2) Town/village centre from Nominatim
    if nom:
        return round(nom[0][0], 6), round(nom[0][1], 6), 'nominatim-locality', 'approximate', f'Centre of {nom[3]} "{nom[1].split(",")[0]}" ({nom[2]}) via Nominatim; the post office itself is not pinned'
    # 3) GeoNames locality with the same name inside the PIN
    for name, lat, lng in rows:
        if ot and toks(name) and toks(name)[0][:5] == ot[0][:5]:
            return lat, lng, 'geonames-locality', 'approximate', f'GeoNames locality "{name}" in PIN {pin}; the post office itself is not pinned'
    if centroid:
        return round(centroid[0], 5), round(centroid[1], 5), 'pin-centroid', 'approximate', f'Median of GeoNames points for PIN {pin}; could be several km off'
    return None, None, 'none', 'missing', 'No coordinates found'

# ---- Karnataka: booklet list (unofficial) matched to PPC list
OVERRIDE = {'KGF Miner Statue': '237', 'Badami Cave Temples': '322', 'Pattadakal Temples': '323'}
AMBIG = {'Bandipur Tiger Reserve': 'Bandipur BO has two PPCs (Tiger Face, Tiger Paw); which one the booklet uses is unconfirmed.',
         'Tipu Sultan, Srirangapatna': 'Srirangapatna HO has two PPCs (Gumbaz; Crown and Sword of Tipu Sultan); the booklet theme suggests the latter.',
         'Mysuru Dasara Emblem': 'Theme match to "Mysuru: Our Heritage - Your Destination" is a guess.'}
def score(e, c):
    s = 2 if c[6] == e['pin'] else 0
    a, b = toks(e['po']), toks(c[3])
    if a and b and a[0][:5] == b[0][:5]: s += 3
    return s + 2 * difflib.SequenceMatcher(None, e['place'].lower(), c[1].lower()).ratio()

out = []
ghk = {c[0]: c for c in gh['ka']}
for i, e in enumerate(sorted(ka100, key=lambda x: (x['district'], x['place']))):
    c = ghk[OVERRIDE[e['place']]] if e['place'] in OVERRIDE else max(gh['ka'], key=lambda c: score(e, c))
    sc = score(e, c); notes = []
    pin = e['pin']
    if c[6] != e['pin']:
        notes.append(f"PIN differs between sources: {e['pin']} (passport list) vs {c[6]} (PPC list, office {c[3]}).")
    if e['place'] in AMBIG: notes.append(AMBIG[e['place']])
    lat, lng, gm, gconf, gnote = geocode(c[3], pin, e['district'], 'Karnataka')
    out.append({
        'id': f"ka-{i+1:03d}-{slug(e['place'])[:40]}", 'passport': 'KA', 'order': i + 1,
        'state': 'Karnataka', 'district': e['district'], 'place': e['place'],
        'ppcTheme': c[1], 'ppcSince': c[2] if re.match(r'\d', c[2]) else None,
        'guide': G.get(c[0]), 'postOffice': e['po'], 'postOfficeRank': c[3], 'officeType': office_type(c[3]),
        'pin': pin, 'lat': lat, 'lng': lng,
        'booklet': {'status': 'listed', 'note': 'Listed among the 100 Karnataka passport locations by an unofficial tracker; not verified against the printed booklet.'},
        'confidence': {'place': 'medium', 'ppcTheme': 'high' if sc >= 5 and not e['place'] in AMBIG else 'medium',
                       'postOffice': 'medium' if c[6] == e['pin'] else 'low', 'pin': 'high' if c[6] == e['pin'] else 'low',
                       'officeType': 'high' if office_type(c[3]) else 'missing', 'coords': gconf, 'guide': 'editorial'},
        'geocode': {'method': gm, 'note': gnote}, 'notes': notes, 'sources': [SRC_KA + e['link'], SRC_GH + '#' + c[0]],
    })

# ---- Tamil Nadu circle (incl. Puducherry): all PPCs in the circle are candidates for the 58 slots
PRESS = {'334': 'dtnext 13-Nov-2026', '335': 'New Indian Express 17-Nov-2026; dtnext', '336': 'dtnext', '337': 'dtnext',
         '391': 'dtnext (Puducherry HO)', '338': 'TNC 31-Oct-2026 (Pulicat)', '390': 'TNC (Mudumalai)',
         '373': 'TNC (Kanyakumari — could also be Muttom)', '387': 'dtnext (Anaimalai Tiger Reserve)',
         '375': 'dtnext (Kancheepuram)', '341': 'dtnext (Gingee Fort)'}
tn = sorted(gh['tn'] + gh['py'], key=lambda c: c[6])
for i, c in enumerate(tn):
    state = 'Puducherry' if c[5].upper() == 'PUDUCHERRY' else 'Tamil Nadu'
    lat, lng, gm, gconf, gnote = geocode(c[3], c[6], c[4], state)
    press = PRESS.get(c[0])
    out.append({
        'id': f"tn-{i+1:03d}-{slug(c[1])[:40]}", 'passport': 'TN', 'order': i + 1,
        'state': state, 'district': c[4], 'place': c[1], 'ppcTheme': c[1],
        'ppcSince': c[2] if re.match(r'\d', c[2]) else None, 'guide': G.get(c[0]),
        'postOffice': c[3], 'postOfficeRank': c[3], 'officeType': office_type(c[3]), 'pin': c[6], 'lat': lat, 'lng': lng,
        'booklet': {'status': 'press-mentioned' if press else 'candidate',
                    'note': (f'Location named in press coverage of the passport ({press}). ' if press else '') +
                            'Tamil Nadu circle PPC; press says the passport covers the circle\'s 58 PPCs, this list has 59 candidates, so one may not be in the booklet.'},
        'confidence': {'place': 'medium', 'ppcTheme': 'medium', 'postOffice': 'medium', 'pin': 'medium',
                       'officeType': 'high' if office_type(c[3]) else 'missing', 'coords': gconf, 'guide': 'editorial'},
        'geocode': {'method': gm, 'note': gnote}, 'notes': [], 'sources': [SRC_GH + '#' + c[0]],
    })

os.makedirs(f'{ROOT}/public/data', exist_ok=True)
meta = {'generated': '2026-11-17', 'disclaimer': 'Unofficial compilation from public sources. Not affiliated with India Post.',
        'passports': {'KA': {'name': 'Karnataka Philately Passport', 'edition': 'v3 2026', 'slots': 100, 'price': 600},
                      'TN': {'name': 'Tamil Nadu Philately Passport', 'edition': 'Oct 2026', 'slots': 58, 'price': 650}},
        'sources': {SRC_GH: 'https://praneethsaichunduru.github.io/ppcsofindia.github.io/list-pincode.html',
                    SRC_KA: 'https://philatelypassport.web.app/cancellations/',
                    'osm': 'https://www.openstreetmap.org (ODbL)', 'geonames': 'https://download.geonames.org/export/zip/ (CC-BY 4.0)'}}
json.dump({'meta': meta, 'locations': out}, open(f'{ROOT}/public/data/locations.json', 'w'), ensure_ascii=False, indent=1)

from collections import Counter
for p in ('KA', 'TN'):
    L = [l for l in out if l['passport'] == p]
    print(p, len(L), Counter(l['booklet']['status'] for l in L), Counter(l['geocode']['method'] for l in L),
          'pin conflicts', sum(1 for l in L if l['confidence']['pin'] == 'low'), 'no guide', sum(1 for l in L if not l['guide']))
