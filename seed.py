#!/usr/bin/env python3
"""
ArtSwipe Seeder
Pulls modern/contemporary art from Art Institute of Chicago API
+ street art & graffiti from Unsplash source
and stores in Supabase.
"""

import os
import requests
import time
import json
import random

SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://ypbhnhpbcaerxbraciah.supabase.co")
SUPABASE_KEY = os.environ.get("SUPABASE_SECRET_KEY", "")
AIC_BASE = "https://api.artic.edu/api/v1"
IIIF_BASE = "https://www.artic.edu/iiif/2"

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=minimal,resolution=ignore-duplicates"
}

# ── Art Institute of Chicago queries ─────────────────────────────────────────
# Focused on things a 20-40 yr old would actually find cool
AIC_QUERIES = [
    ("abstract expressionism", "abstract"),
    ("abstract painting", "abstract"),
    ("surrealism", "surrealism"),
    ("cubism", "modern"),
    ("pop art", "pop"),
    ("color field painting", "abstract"),
    ("street photography", "photography"),
    ("urban photography", "photography"),
    ("contemporary painting", "modern"),
    ("graffiti", "street"),
    ("street art", "street"),
    ("mural", "street"),
    ("neon", "digital"),
    ("digital", "digital"),
    ("psychedelic", "surrealism"),
    ("geometric abstraction", "abstract"),
    ("minimalism", "modern"),
    ("expressionism", "modern"),
    ("collage", "modern"),
    ("conceptual art", "modern"),
    ("figurative painting", "modern"),
    ("assemblage", "modern"),
]

# ── Unsplash source images for street art / graffiti ─────────────────────────
UNSPLASH_QUERIES = [
    ("graffiti art wall colorful", "street", "Graffiti Art"),
    ("street art mural urban", "street", "Urban Mural"),
    ("banksy style street art", "street", "Street Art"),
    ("abstract colorful painting", "abstract", "Abstract Painting"),
    ("neon lights art", "digital", "Neon Art"),
    ("glitch art digital", "digital", "Digital Art"),
    ("spray paint art colorful", "street", "Spray Art"),
    ("contemporary abstract art", "abstract", "Contemporary Abstract"),
    ("pop art bright colors", "pop", "Pop Art"),
    ("psychedelic art trippy", "surrealism", "Psychedelic Art"),
    ("urban street photography", "photography", "Urban Photography"),
    ("cyberpunk neon art", "digital", "Cyberpunk Art"),
    ("bold graphic design art", "pop", "Graphic Art"),
    ("modern art gallery", "modern", "Modern Art"),
    ("fluid abstract art pour", "abstract", "Fluid Art"),
]

seen_source_ids = set()

def fetch_aic_page(query, page=1, limit=50):
    """Fetch artworks from Art Institute of Chicago API."""
    try:
        r = requests.get(
            f"{AIC_BASE}/artworks/search",
            params={
                "q": query,
                "limit": limit,
                "page": page,
                "fields": "id,title,artist_display,image_id,department_title,date_display",
            },
            timeout=15
        )
        if r.status_code != 200:
            return []
        data = r.json().get("data", [])
        artworks = []
        for d in data:
            if not d.get("image_id"):
                continue
            sid = f"aic_{d['id']}"
            if sid in seen_source_ids:
                continue
            seen_source_ids.add(sid)
            artworks.append({
                "title": (d.get("title") or "Untitled")[:200],
                "artist": (d.get("artist_display") or "Unknown Artist")[:200].split("\n")[0],
                "image_url": f"{IIIF_BASE}/{d['image_id']}/full/800,/0/default.jpg",
                "thumb_url": f"{IIIF_BASE}/{d['image_id']}/full/400,/0/default.jpg",
                "category": "",  # filled by caller
                "tags": [],
                "source": "aic",
                "source_id": sid,
                "year": d.get("date_display", ""),
            })
        return artworks
    except Exception as e:
        print(f"  AIC error: {e}")
        return []

def fetch_unsplash_url(query, sig):
    """Follow source.unsplash.com redirect to get stable CDN URL."""
    try:
        url = f"https://source.unsplash.com/800x1200/?{requests.utils.quote(query)}&sig={sig}"
        r = requests.head(url, allow_redirects=True, timeout=10)
        final = r.url
        if "images.unsplash.com" in final:
            # Strip existing size params and set our own
            base = final.split("?")[0]
            return (
                base + "?w=800&h=1000&fit=crop&q=85&auto=format",
                base + "?w=400&h=500&fit=crop&q=80&auto=format",
                f"unsplash_{query[:20]}_{sig}"
            )
        return None, None, None
    except Exception as e:
        print(f"  Unsplash error ({query}, {sig}): {e}")
        return None, None, None

def insert_batch(rows):
    """Insert a batch into Supabase artworks table."""
    if not rows:
        return 0
    r = requests.post(
        f"{SUPABASE_URL}/rest/v1/artworks",
        headers=HEADERS,
        json=rows,
        timeout=20
    )
    if r.status_code in (200, 201):
        return len(rows)
    else:
        print(f"  Insert error {r.status_code}: {r.text[:200]}")
        return 0

def main():
    total = 0
    batch = []

    print("=" * 55)
    print("  ArtSwipe Seeder — pulling modern & street art")
    print("=" * 55)

    # ── Phase 1: Art Institute of Chicago ────────────────────
    print("\n📦 Phase 1: Art Institute of Chicago (modern/abstract/surreal)")
    for query, category in AIC_QUERIES:
        print(f"  → '{query}'", end="", flush=True)
        for page in range(1, 3):  # 2 pages × 50 = 100 per query
            rows = fetch_aic_page(query, page=page, limit=50)
            for row in rows:
                row["category"] = category
                row["tags"] = [query, category]
                batch.append(row)
            time.sleep(0.3)

        # Flush batch every 100 items
        if len(batch) >= 100:
            n = insert_batch(batch)
            total += n
            print(f" → inserted {total} total")
            batch = []
        else:
            print(f" ✓ ({len(rows)} found)")
        time.sleep(0.5)

    # Flush remainder
    if batch:
        n = insert_batch(batch)
        total += n
        print(f"  → flushed {n}, total: {total}")
        batch = []

    # ── Phase 2: Unsplash street/graffiti/digital ─────────────
    print(f"\n🎨 Phase 2: Unsplash — street art, graffiti, digital")
    for query, category, label in UNSPLASH_QUERIES:
        print(f"  → '{query}'", end="", flush=True)
        count = 0
        for sig in range(1, 26):  # 25 images per query
            img_url, thumb_url, sid = fetch_unsplash_url(query, sig)
            if not img_url or sid in seen_source_ids:
                continue
            seen_source_ids.add(sid)
            batch.append({
                "title": f"{label} #{sig}",
                "artist": "Various Artists",
                "image_url": img_url,
                "thumb_url": thumb_url,
                "category": category,
                "tags": [query, category],
                "source": "unsplash",
                "source_id": sid,
                "year": "",
            })
            count += 1
            time.sleep(0.4)

        if len(batch) >= 50:
            n = insert_batch(batch)
            total += n
            batch = []

        print(f" ✓ ({count} images)")

    if batch:
        n = insert_batch(batch)
        total += n
        print(f"  → flushed {n}")

    print(f"\n✅ Done! {total} artworks seeded into Supabase.")

if __name__ == "__main__":
    main()
