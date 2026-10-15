#!/usr/bin/env python3
"""
=============================================================================
LIBROVERSE BACKEND SCRAPER & DATA MIGRATOR
Crawls and extracts book metadata, covers, and formats from BDeBooks
=============================================================================
Usage:
  python scripts/scrape_bdebooks.py --limit 12 --download-covers --update-app
"""

import sys
import os
import re
import json
import time
import html
import urllib.request
import urllib.error
import argparse

if sys.stdout and hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Cache-Control': 'no-cache',
}

BASE_URL = "https://bdebooks.com"
DEFAULT_CATALOG_URL = "https://bdebooks.com/en/ebooks/"

def fetch_html(url, retries=2, delay=1.0):
    """Fetches HTML with retry logic and polite headers."""
    for attempt in range(retries + 1):
        try:
            req = urllib.request.Request(url, headers=HEADERS)
            with urllib.request.urlopen(req, timeout=15) as res:
                return res.read().decode('utf-8', errors='ignore')
        except urllib.error.HTTPError as e:
            if e.code == 404:
                return None
            if attempt < retries:
                time.sleep(delay * 2)
            else:
                print(f"[!] HTTP Error {e.code} for {url}")
                return None
        except Exception as e:
            if attempt < retries:
                time.sleep(delay)
            else:
                print(f"[!] Error fetching {url}: {e}")
                return None
    return None

def download_image(img_url, dest_path):
    """Downloads an image file to local assets folder."""
    try:
        os.makedirs(os.path.dirname(dest_path), exist_ok=True)
        req = urllib.request.Request(img_url, headers=HEADERS)
        with urllib.request.urlopen(req, timeout=15) as response, open(dest_path, 'wb') as out_file:
            out_file.write(response.read())
        return True
    except Exception as e:
        print(f"    [!] Failed to download image {img_url}: {e}")
        return False

def parse_catalog_page(catalog_url):
    """Parses catalog page to extract book links."""
    print(f"[*] Crawling catalog from {catalog_url}...")
    html_content = fetch_html(catalog_url)
    if not html_content:
        return []

    # Find all /books/ links
    links = re.findall(r'href=["\'](/[^"\']*/books/[a-zA-Z0-9_-]+/)["\']', html_content)
    unique_links = []
    seen = set()
    for l in links:
        if l not in seen and not any(x in l for x in ['latest', 'popular', 'genres', 'authors', 'read']):
            seen.add(l)
            unique_links.append(BASE_URL + l if not l.startswith('http') else l)

    print(f"[+] Found {len(unique_links)} unique book pages in catalog.")
    return unique_links

def parse_book_page(book_url, download_covers=False, covers_dir="public/assets/covers"):
    """Parses an individual book details page."""
    html_content = fetch_html(book_url)
    if not html_content:
        return None

    # Title
    title_m = re.search(r'<h1[^>]*>(.*?)</h1>', html_content, re.DOTALL)
    title = html.unescape(title_m.group(1).strip()) if title_m else 'Untitled Book'
    # Clean possible HTML tags in title
    title = re.sub(r'<[^>]+>', '', title).strip()

    # Author
    author_m = re.search(r'<a[^>]*href=["\']/[^"\']*/authors/[^"\']+["\'][^>]*>(.*?)</a>', html_content)
    author = html.unescape(author_m.group(1).strip()) if author_m else 'Unknown Author'
    author = re.sub(r'<[^>]+>', '', author).strip()

    # Cover image URL
    # Look for high-res cover image in content or media uploads
    cover_urls = re.findall(r'<img[^>]*src=["\']([^"\']*(?:wp-content/uploads|img\.bdebooks\.com)[^"\']+)["\']', html_content)
    cover_url = ''
    for c in cover_urls:
        if not any(x in c for x in ['logo', 'branding', 'avatar', 'w160']):
            cover_url = c
            break
    if not cover_url and cover_urls:
        cover_url = cover_urls[0]

    # Synopsis / Description
    synopsis_m = re.search(r'<div[^>]*class=["\'][^"\']*(?:synopsis|summary|description|entry-content)[^"\']*["\'][^>]*>(.*?)</div>', html_content, re.DOTALL)
    synopsis = ''
    if synopsis_m:
        synopsis = re.sub(r'<[^>]+>', '', synopsis_m.group(1)).strip()
    if not synopsis:
        # Fallback to paragraph before download
        para_m = re.search(r'<p class=["\']bkp-desc[^"\']*["\'][^>]*>(.*?)</p>', html_content, re.DOTALL)
        if para_m:
            synopsis = re.sub(r'<[^>]+>', '', para_m.group(1)).strip()

    if not synopsis:
        synopsis = f"{title} adalah mahakarya literatur karya {author}, menyajikan kisah abadi yang sarat dengan perenungan mendalam dan eksplorasi karakter manusia."

    # Formats & Download forms
    formats = ['epub', 'pdf']
    if 'audio' in html_content.lower() or 'audiodl' in html_content:
        formats.append('audio')

    # Slug ID
    slug = book_url.rstrip('/').split('/')[-1]
    book_id = re.sub(r'[^a-zA-Z0-9-]', '', slug)

    # Local Cover Path
    local_cover = None
    if download_covers and cover_url:
        ext = '.jpg'
        if '.webp' in cover_url:
            ext = '.webp'
        elif '.png' in cover_url:
            ext = '.png'
        filename = f"{book_id}{ext}"
        dest_path = os.path.join(covers_dir, filename)
        print(f"    [↓] Downloading cover for '{title}'...")
        if download_image(cover_url, dest_path):
            local_cover = f"/assets/covers/{filename}"

    # Generate realistic reading time and pages estimate
    pages = 240 + (hash(title) % 180)
    reading_time = f"{max(2, pages // 70)} jam {pages % 50} mnt"
    rating = round(4.7 + (abs(hash(title)) % 25) / 100, 2)
    reviews_count = 320 + (abs(hash(title)) % 1200)

    # Assign genre based on title/author
    genre = "Klasik Dunia"
    t_lower = title.lower()
    if any(k in t_lower for k in ['space', 'star', 'galaxy', 'odyssey', 'time', 'pirate', 'machine']):
        genre = "Sci-Fi & Antariksa"
    elif any(k in t_lower for k in ['mystery', 'murder', 'seven dials', 'sherlock', 'detective', 'secret']):
        genre = "Misteri & Thriller"
    elif any(k in t_lower for k in ['philosophy', 'truth', 'god', 'meditation', 'moral', 'kingdom']):
        genre = "Filsafat & Sains"
    elif any(k in t_lower for k in ['poetry', 'poems', 'songs', 'gitanjali']):
        genre = "Komik & Puisi"
    elif any(k in t_lower for k in ['nusantara', 'indonesia', 'bintang', 'bumi']):
        genre = "Sastra Nusantara"

    # Generate sample readable chapter
    chapter_text = f"""Kisah '{title}' dibuka dengan suasana hening yang sarat akan antisipasi. {author} melukiskan latar kejadian dengan presisi kata yang begitu menggugah imajinasi pembaca.

Karakter utama berdiri di ambang perubahan besar dalam hidupnya. Setiap keputusan yang diambil bukan hanya menentukan takdir dirinya sendiri, melainkan mengguncang fondasi keyakinan orang-orang di sekitarnya. 

Dalam bab pembuka ini, kita diajak menyelami konflik batin antara kewajiban moral dan hasrat kebebasan pribadi. Suara langkah di lorong batu, desau angin malam yang meniup tirai jendela, dan bayang-bayang masa lalu yang tak pernah benar-benar sirna menjadi saksi bisu awal mula perjalanan monumental ini."""

    return {
        "id": book_id,
        "title": title,
        "author": author,
        "genre": genre,
        "language": "en" if "/en/" in book_url else "bn",
        "langLabel": "English" if "/en/" in book_url else "বাংলা",
        "rating": rating,
        "reviewsCount": reviews_count,
        "pages": pages,
        "readingTime": reading_time,
        "formats": formats,
        "audioDuration": f"{max(3, pages // 60)}j 30m" if "audio" in formats else None,
        "badge": "Klasik Pilihan" if rating > 4.85 else "Populer",
        "featured": False,
        "cover": local_cover or cover_url,
        "coverAlt": f"Sampul buku {title} karya {author}",
        "synopsis": synopsis,
        "quote": f"Kutipan abadi dari {title} yang menggema melintasi zaman.",
        "chapters": [
            {
                "title": "Bab 1: Awal Mula Perjalanan",
                "content": chapter_text
            }
        ],
        "sourceUrl": book_url
    }

def update_libroverse_books_js(scraped_books, books_js_path="src/data/books.js"):
    """Merges scraped books into src/data/books.js without overwriting original showcase books."""
    print(f"[*] Updating {books_js_path} with {len(scraped_books)} scraped books...")

    with open(books_js_path, "r", encoding="utf-8") as f:
        content = f.read()

    # Extract existing BOOKS_DATA
    m = re.search(r'export const BOOKS_DATA = (\[.*?\]);', content, re.DOTALL)
    if not m:
        print("[!] Could not find BOOKS_DATA in books.js")
        return False

    # Append scraped books that aren't already in the list
    new_entries = []
    for b in scraped_books:
        # Check if id already exists in file
        if f'id: "{b["id"]}"' in content or f'"{b["id"]}"' in content:
            continue

        # Pre-clean strings to avoid backslashes inside f-strings
        c_title = b['title'].replace('"', '\\"')
        c_author = b['author'].replace('"', '\\"')
        c_alt = b['coverAlt'].replace('"', '\\"')
        c_synopsis = b['synopsis'][:300].replace('"', '\\"')
        c_quote = b['quote'].replace('"', '\\"')
        c_clean_title = b['title'].replace("'", "")
        c_formats = json.dumps(b['formats'])
        c_audio = b['audioDuration'] or '4j 20m'

        entry_code = f"""  {{
    id: "{b['id']}",
    title: "{c_title}",
    author: "{c_author}",
    genre: "{b['genre']}",
    language: "{b['language']}",
    langLabel: "{b['langLabel']}",
    rating: {b['rating']},
    reviewsCount: {b['reviewsCount']},
    pages: {b['pages']},
    readingTime: "{b['readingTime']}",
    formats: {c_formats},
    audioDuration: "{c_audio}",
    badge: "{b['badge']}",
    featured: false,
    cover: "{b['cover']}",
    coverAlt: "{c_alt}",
    synopsis: "{c_synopsis}...",
    quote: "{c_quote}",
    chapters: [
      {{
        title: "Bab 1: Pembuka",
        content: `Karya klasik '{c_clean_title}' oleh {b['author']}. Nikmati bacaan lengkap buku domain publik ini langsung di perambanmu di Libroverse.`
      }}
    ]
  }},"""
        new_entries.append(entry_code)

    if not new_entries:
        print("[*] No new books to insert into books.js.")
        return True

    # Insert before the closing bracket of BOOKS_DATA
    close_idx = content.find('export const BOOKS_DATA = [')
    bracket_pos = content.find('];', close_idx)
    if bracket_pos == -1:
        print("[!] Could not locate closing bracket of BOOKS_DATA.")
        return False

    before = content[:bracket_pos].rstrip()
    if not before.endswith(',') and not before.endswith('['):
        before += ','

    updated_content = before + "\n\n" + "\n".join(new_entries) + "\n" + content[bracket_pos:]

    with open(books_js_path, "w", encoding="utf-8") as f:
        f.write(updated_content)

    print(f"[✓] Successfully injected {len(new_entries)} books into {books_js_path}!")
    return True

def main():
    parser = argparse.ArgumentParser(description="Libroverse BDeBooks Scraper")
    parser.add_argument("--url", default=DEFAULT_CATALOG_URL, help="Catalog URL to scrape")
    parser.add_argument("--limit", type=int, default=10, help="Number of books to scrape")
    parser.add_argument("--download-covers", action="store_true", help="Download covers locally")
    parser.add_argument("--update-app", action="store_true", help="Update src/data/books.js directly")
    parser.add_argument("--output", default="src/data/bdebooks_scraped.json", help="Output JSON path")
    args = parser.parse_args()

    print("=" * 60)
    print("🚀 LIBROVERSE BDEBOOKS SCRAPER & MIGRATION TOOL")
    print("=" * 60)

    book_links = parse_catalog_page(args.url)
    if not book_links:
        print("[!] No book links found.")
        return

    scraped = []
    target_links = book_links[:args.limit]
    print(f"[*] Processing {len(target_links)} books...")

    for i, link in enumerate(target_links, 1):
        print(f"[{i}/{len(target_links)}] Scraping: {link}")
        book_data = parse_book_page(link, download_covers=args.download_covers)
        if book_data:
            scraped.append(book_data)
            print(f"    -> Title: {book_data['title']} | Author: {book_data['author']}")
        time.sleep(0.8) # Polite delay

    # Save to JSON
    os.makedirs(os.path.dirname(args.output), exist_ok=True)
    with open(args.output, "w", encoding="utf-8") as f:
        json.dump(scraped, f, indent=2, ensure_ascii=False)
    print(f"[✓] Saved {len(scraped)} books to {args.output}")

    # Optionally update books.js
    if args.update_app:
        update_libroverse_books_js(scraped)

    print("=" * 60)
    print(f"🎉 Scraping complete! {len(scraped)} books transferred.")
    print("=" * 60)

if __name__ == "__main__":
    main()
