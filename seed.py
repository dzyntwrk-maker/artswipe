#!/usr/bin/env python3
"""
ArtSwipe Seeder — v2
Loads ~500 quality artworks per style from 3 free museum APIs:
  1. Art Institute of Chicago (ARTIC)  — no key, great modern/impressionist coverage
  2. Metropolitan Museum of Art (Met)  — no key, massive classical + all styles
  3. Cleveland Museum of Art           — no key, good general coverage

Run:
  SUPABASE_URL=https://xxx.supabase.co SUPABASE_SECRET_KEY=your_service_key python3 seed.py
"""

import os, time, json, random, sys, re
from urllib.request import urlopen, Request
from urllib.parse import urlencode, quote
from urllib.error import HTTPError, URLError
import ssl

# ── SSL fix for Python 3.14 on macOS ─────────────────────────────────────────
SSL_CTX = ssl.create_default_context()
SSL_CTX.check_hostname = False
SSL_CTX.verify_mode = ssl.CERT_NONE

def http_get(url, timeout=15):
    try:
        req = Request(url, headers={"User-Agent": "ArtSwipe/2.0"})
        with urlopen(req, timeout=timeout, context=SSL_CTX) as r:
            return json.loads(r.read())
    except Exception as e:
        return None

# ── Config ────────────────────────────────────────────────────────────────────
SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://ypbhnhpbcaerxbraciah.supabase.co")
SUPABASE_KEY = os.environ.get("SUPABASE_SECRET_KEY", "")

if not SUPABASE_KEY:
    print("ERROR: Set SUPABASE_SECRET_KEY env var")
    sys.exit(1)

SUPA_HEADERS = {
    "apikey":        SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type":  "application/json",
    # ignore-duplicates = skip rows that violate UNIQUE(source, source_id)
    "Prefer":        "resolution=ignore-duplicates,return=minimal",
}

# ── Existing table columns (no schema migration needed) ───────────────────────
# id, title, artist, image_url, thumb_url, category, tags, source, source_id, year

TARGET_PER_STYLE = 500   # aim for this many per style
BATCH_SIZE       = 50    # rows per Supabase insert

# ── Art styles (matching app.js ART_STYLES + ARTISTS) ────────────────────────
STYLES = [
    # id, display label, search queries for each museum
    ("impressionism",  "Impressionism",          ["impressionism", "impressionist painting"]),
    ("abstract",       "Abstract",               ["abstract painting", "abstract art"]),
    ("surrealism",     "Surrealism",             ["surrealism", "surrealist"]),
    ("pop",            "Pop Art",                ["pop art", "popular art"]),
    ("street",         "Street Art & Graffiti",  ["street art", "graffiti", "urban mural"]),
    ("expressionism",  "Expressionism",          ["expressionism", "expressionist painting"]),
    ("abstractexpr",   "Abstract Expressionism", ["abstract expressionism", "action painting"]),
    ("minimalism",     "Minimalism",             ["minimalism", "minimal art"]),
    ("cubism",         "Cubism",                 ["cubism", "cubist"]),
    ("renaissance",    "Renaissance",            ["renaissance painting", "renaissance art"]),
    ("baroque",        "Baroque",                ["baroque painting", "baroque art"]),
    ("romanticism",    "Romanticism",            ["romanticism", "romantic painting"]),
    ("realism",        "Realism",                ["realism", "realist painting"]),
    ("artnouveau",     "Art Nouveau",            ["art nouveau", "jugendstil"]),
    ("digital",        "Digital Art",            ["digital art", "computer art"]),
    ("photography",    "Photography",            ["fine art photography", "artistic photography"]),
    ("psychedelic",    "Psychedelic",            ["psychedelic art", "visionary art"]),
    ("futurism",       "Futurism",               ["futurism", "futurist painting"]),
    ("contemporary",   "Contemporary",           ["contemporary art", "contemporary painting"]),
    ("japanese",       "Japanese Art",           ["japanese woodblock", "ukiyo-e", "japanese painting"]),
]

ARTIST_TAGS = [
    ("vangogh",      "Van Gogh",           ["van gogh"]),
    ("picasso",      "Picasso",            ["picasso", "pablo picasso"]),
    ("dali",         "Dalí",              ["dali", "salvador dali"]),
    ("warhol",       "Warhol",             ["andy warhol", "warhol"]),
    ("basquiat",     "Basquiat",           ["basquiat", "jean-michel basquiat"]),
    ("klimt",        "Klimt",              ["klimt", "gustav klimt"]),
    ("haring",       "Keith Haring",       ["keith haring"]),
    ("kahlo",        "Frida Kahlo",        ["frida kahlo"]),
    ("monet",        "Monet",              ["monet", "claude monet"]),
    ("pollock",      "Pollock",            ["jackson pollock"]),
    ("hokusai",      "Hokusai",            ["hokusai", "katsushika"]),
    ("magritte",     "Magritte",           ["magritte", "rene magritte"]),
    ("rothko",       "Rothko",             ["mark rothko", "rothko"]),
    ("munch",        "Munch",              ["edvard munch", "munch"]),
    ("matisse",      "Matisse",            ["matisse", "henri matisse"]),
    ("lichtenstein", "Lichtenstein",       ["lichtenstein", "roy lichtenstein"]),
]

ALL_TAGS = STYLES + ARTIST_TAGS   # process both

# ── Quality filter ────────────────────────────────────────────────────────────
BLOCKED_WORDS = {
    "button","buttons","bead","beads","vessel","bowl","bowls","jar","jars",
    "cup","cups","plate","plates","pitcher","pitchers","vase","vases",
    "ewer","flask","amphora","kylix","lekythos","krater","oinochoe",
    "coin","coins","medal","medals","badge","brooch","pin","clasp",
    "buckle","hook","needle","tile","tiles","shard","fragment",
    "textile","tapestry","carpet","rug","furniture","chair","table",
    "cabinet","box","chest","lock","key","knife","sword","helmet",
    "armor","armour","spear","axe","dagger","necklace","bracelet",
    "ring","earring","pendant","fibula","statuette","figurine",
    "amulet","scarab","mummy","inscription","relief","frieze",
    "sarcophagus","weight","seal","stamp","die",
}

BLOCKED_MEDIUMS = {
    "ceramic","earthenware","stoneware","faience","porcelain",
    "terracotta","bone","ivory","shell","amber","glass","enamel",
}

GOOD_DEPARTMENTS = {
    "European Paintings","American Paintings and Sculpture",
    "Drawings and Prints","Photographs","Modern Art",
    "Contemporary Art","Robert Lehman Collection",
    "The American Wing","Asian Art","19th-Century European Paintings",
}

def quality_ok(title="", medium="", department="", obj_type=""):
    t = title.lower()
    m = medium.lower()
    # Block garbage
    for w in BLOCKED_WORDS:
        if re.search(r'\b' + w + r'\b', t):
            return False
    for w in BLOCKED_MEDIUMS:
        if w in m:
            return False
    # Department allow-list (if known)
    if department and department not in GOOD_DEPARTMENTS:
        is_painterly = any(x in m for x in [
            "oil","acrylic","watercolor","gouache","ink","pencil",
            "chalk","pastel","tempera","fresco","lithograph","etching",
        ]) or any(x in obj_type.lower() for x in [
            "painting","print","drawing","photograph","poster",
        ])
        if not is_painterly:
            return False
    return True

# ── Global dedup ──────────────────────────────────────────────────────────────
seen_ids = set()   # "source:source_id" strings — dedup across all queries

# ── Supabase upsert ───────────────────────────────────────────────────────────
def upsert_rows(rows):
    if not rows:
        return 0
    from urllib.request import Request
    import urllib.request
    data = json.dumps(rows).encode()
    req = Request(
        f"{SUPABASE_URL}/rest/v1/artworks",
        data=data,
        headers=SUPA_HEADERS,
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=30, context=SSL_CTX) as r:
            return len(rows)
    except HTTPError as e:
        body = e.read().decode()[:300]
        print(f"\n  ⚠ Supabase error {e.code}: {body}")
        return 0
    except Exception as e:
        print(f"\n  ⚠ Insert error: {e}")
        return 0

# ══════════════════════════════════════════════════════════════════════════════
# SOURCE 1: Art Institute of Chicago
# ══════════════════════════════════════════════════════════════════════════════
ARTIC_FIELDS = "id,title,artist_display,date_display,medium_display,department_title,image_id,artwork_type_title"
IIIF = "https://www.artic.edu/iiif/2"

GOOD_ARTIC_TYPES = {
    "Painting","Drawing and Watercolor","Print","Photograph",
    "Architectural Drawing","Design","Textile","Vessel",
    "Decorative Arts","Mixed Media",
}

def fetch_artic(query, style_id, max_per_query=200):
    results = []
    for page in range(1, 6):
        url = (f"https://api.artic.edu/api/v1/artworks/search"
               f"?q={quote(query)}&fields={ARTIC_FIELDS}&limit=100&page={page}")
        data = http_get(url)
        if not data:
            break
        items = data.get("data", [])
        if not items:
            break
        for d in items:
            img = d.get("image_id")
            if not img:
                continue
            sid = f"artic:{d['id']}"
            if sid in seen_ids:
                continue
            title = (d.get("title") or "Untitled")[:250]
            medium = (d.get("medium_display") or "")[:200]
            dept = d.get("department_title") or ""
            obj_type = d.get("artwork_type_title") or ""
            if not quality_ok(title, medium, dept, obj_type):
                continue
            seen_ids.add(sid)
            results.append({
                "source":    "artic",
                "source_id": str(d["id"]),
                "title":     title,
                "artist":    (d.get("artist_display") or "").split("\n")[0][:200],
                "year":      d.get("date_display") or "",
                "tags":      [style_id],
                "image_url": f"{IIIF}/{img}/full/843,/0/default.jpg",
                "thumb_url": f"{IIIF}/{img}/full/400,/0/default.jpg",
            })
            if len(results) >= max_per_query:
                return results
        time.sleep(0.25)
    return results

# ══════════════════════════════════════════════════════════════════════════════
# SOURCE 2: Metropolitan Museum of Art
# ══════════════════════════════════════════════════════════════════════════════
MET_SEARCH = "https://collectionapi.metmuseum.org/public/collection/v1/search"
MET_OBJECT = "https://collectionapi.metmuseum.org/public/collection/v1/objects"

def fetch_met(query, style_id, max_ids=800, max_results=200):
    # Step 1: get IDs
    url = f"{MET_SEARCH}?hasImages=true&q={quote(query)}"
    data = http_get(url)
    if not data:
        return []
    ids = data.get("objectIDs") or []
    random.shuffle(ids)
    ids = ids[:max_ids]

    results = []
    consecutive_fails = 0

    for oid in ids:
        if len(results) >= max_results:
            break
        sid = f"met:{oid}"
        if sid in seen_ids:
            continue
        d = http_get(f"{MET_OBJECT}/{oid}")
        if not d:
            consecutive_fails += 1
            if consecutive_fails > 10:
                break
            continue
        consecutive_fails = 0

        img_large = d.get("primaryImage") or ""
        img_small = d.get("primaryImageSmall") or img_large
        if not img_large:
            continue

        title = (d.get("title") or "Untitled")[:250]
        medium = (d.get("medium") or "")[:200]
        dept = d.get("department") or ""
        obj_type = (d.get("objectName") or "")

        if not quality_ok(title, medium, dept, obj_type):
            continue

        seen_ids.add(sid)
        results.append({
            "source":    "met",
            "source_id": str(oid),
            "title":     title,
            "artist":    (d.get("artistDisplayName") or "")[:200],
            "year":      d.get("objectDate") or "",
            "tags":      [style_id],
            "image_url": img_large,
            "thumb_url": img_small,
        })
        time.sleep(0.05)   # ~20 req/sec, polite

    return results

# ══════════════════════════════════════════════════════════════════════════════
# SOURCE 3: Cleveland Museum of Art
# ══════════════════════════════════════════════════════════════════════════════
CLEV_BASE = "https://openaccess-api.clevelandart.org/api/artworks"

def fetch_cleveland(query, style_id, max_per_query=150):
    results = []
    for skip in range(0, 600, 100):
        url = (f"{CLEV_BASE}/?has_image=1"
               f"&q={quote(query)}&limit=100&skip={skip}")
        data = http_get(url)
        if not data:
            break
        items = data.get("data", [])
        if not items:
            break
        for d in items:
            imgs = d.get("images") or {}
            img_large = (imgs.get("full") or {}).get("url") or \
                        (imgs.get("web") or {}).get("url") or ""
            img_small = (imgs.get("web") or {}).get("url") or img_large
            if not img_large:
                continue
            sid = f"cleveland:{d.get('id','')}"
            if sid in seen_ids:
                continue
            title = (d.get("title") or "Untitled")[:250]
            medium = (d.get("technique") or "")[:200]
            dept = d.get("department") or ""
            obj_type = d.get("type") or ""
            if not quality_ok(title, medium, dept, obj_type):
                continue
            creators = d.get("creators") or []
            artist = ", ".join(c.get("description","") for c in creators[:2])[:200]
            seen_ids.add(sid)
            results.append({
                "source":    "cleveland",
                "source_id": str(d.get("id","")),
                "title":     title,
                "artist":    artist,
                "year":      d.get("creation_date") or "",
                "tags":      [style_id],
                "image_url": img_large,
                "thumb_url": img_small,
            })
            if len(results) >= max_per_query:
                return results
        time.sleep(0.2)
    return results

# ══════════════════════════════════════════════════════════════════════════════
# MAIN: iterate all styles + artists
# ══════════════════════════════════════════════════════════════════════════════
def merge_tags(existing_rows, new_rows):
    """Merge tags for artworks already seen (so one artwork can have many tags)."""
    by_key = {}
    for r in existing_rows:
        k = f"{r['source']}:{r['source_id']}"
        by_key[k] = r
    for r in new_rows:
        k = f"{r['source']}:{r['source_id']}"
        if k in by_key:
            # merge tags
            merged = list(set(by_key[k]["tags"] + r["tags"]))
            by_key[k]["tags"] = merged
        else:
            by_key[k] = r
    return list(by_key.values())

def flush(batch, total):
    n = upsert_rows(batch)
    total += n
    return [], total

def main():
    grand_total = 0
    batch = []

    print("=" * 60)
    print("  ArtSwipe Seeder v2  —  ~500 artworks per style")
    print(f"  Target: {len(ALL_TAGS)} tags × {TARGET_PER_STYLE} = "
          f"{len(ALL_TAGS) * TARGET_PER_STYLE:,} artworks")
    print("=" * 60)

    for tag_id, tag_label, queries in ALL_TAGS:
        print(f"\n▶ {tag_label} [{tag_id}]")
        collected = []

        for query in queries:
            remaining = TARGET_PER_STYLE - len(collected)
            if remaining <= 0:
                break

            # Distribute across 3 sources
            per_src = max(80, remaining // 3 + 50)

            # ARTIC — fastest, paginated
            print(f"   ARTIC '{query}' ...", end=" ", flush=True)
            rows = fetch_artic(query, tag_id, max_per_query=per_src)
            collected = merge_tags(collected, rows)
            print(f"{len(rows)} → {len(collected)} total")
            time.sleep(0.3)

            # Met — big collection, slower (individual fetches)
            if len(collected) < TARGET_PER_STYLE:
                print(f"   Met   '{query}' ...", end=" ", flush=True)
                rows = fetch_met(query, tag_id, max_ids=600, max_results=min(150, per_src))
                collected = merge_tags(collected, rows)
                print(f"{len(rows)} → {len(collected)} total")
                time.sleep(0.3)

            # Cleveland — supplementary
            if len(collected) < TARGET_PER_STYLE:
                print(f"   Clev  '{query}' ...", end=" ", flush=True)
                rows = fetch_cleveland(query, tag_id, max_per_query=min(100, per_src))
                collected = merge_tags(collected, rows)
                print(f"{len(rows)} → {len(collected)} total")
                time.sleep(0.2)

        # Flush this style's artworks
        print(f"   → Upserting {len(collected)} artworks to Supabase ...", end=" ", flush=True)
        for i in range(0, len(collected), BATCH_SIZE):
            chunk = collected[i:i + BATCH_SIZE]
            batch.extend(chunk)
            if len(batch) >= BATCH_SIZE:
                batch, grand_total = flush(batch, grand_total)

        print(f"done  (running total: {grand_total:,})")

    # Final flush
    if batch:
        batch, grand_total = flush(batch, grand_total)

    print(f"\n{'=' * 60}")
    print(f"  ✅  Seeding complete!  {grand_total:,} artworks in Supabase")
    print(f"{'=' * 60}")

if __name__ == "__main__":
    main()
