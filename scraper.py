"""
Skoob Bookshelf Scraper
Uses Playwright for login, then hits the API directly for book data.
"""

import os
import re
import csv
import json
import time
import requests
from concurrent.futures import ThreadPoolExecutor, as_completed
from dotenv import load_dotenv
from playwright.sync_api import sync_playwright

load_dotenv()

# Config
USER_ID = "67bd128e70c4abc33794c484"
FILTER = "all"
API_BASE = "https://prd-api.skoob.com.br/api/v1"
SKOOB_BASE = "https://www.skoob.com.br"
OUTPUT_FILE = "books.json"


def get_session_cookies() -> dict:
    """Login via Playwright and return session cookies."""
    email = os.getenv("SKOOB_EMAIL")
    password = os.getenv("SKOOB_PASSWORD")

    if not email or not password:
        print("❌ Defina SKOOB_EMAIL e SKOOB_PASSWORD no .env")
        raise SystemExit(1)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        page = browser.new_page(viewport={"width": 1280, "height": 900})

        bookshelf_url = f"{SKOOB_BASE}/pt/user/{USER_ID}/bookshelf"
        page.goto(bookshelf_url, wait_until="domcontentloaded", timeout=60_000)
        page.wait_for_timeout(3000)

        if "/login" not in page.url:
            print("✅ Já logado!")
        else:
            print("🔒 Fazendo login...")

            # Dismiss cookie banner
            try:
                page.locator("#adopt-accept-all-button").click(timeout=3000)
                page.wait_for_timeout(1000)
            except Exception:
                pass

            # Click Entrar
            page.get_by_role("button", name="Entrar").locator("visible=true").first.click()
            page.wait_for_timeout(3000)

            # Fill email
            page.fill('input[name="email"]', email)
            page.wait_for_timeout(500)

            try:
                page.locator("#adopt-accept-all-button").click(timeout=2000)
                page.wait_for_timeout(500)
            except Exception:
                pass

            page.get_by_role("button", name="Avançar").locator("visible=true").first.click()
            page.wait_for_timeout(3000)

            # Fill password
            try:
                page.locator("#adopt-accept-all-button").click(timeout=2000)
                page.wait_for_timeout(500)
            except Exception:
                pass

            page.locator('input[name="password"]').first.fill(password)
            page.wait_for_timeout(500)
            page.get_by_role("button", name="Avançar").locator("visible=true").first.click()

            page.wait_for_url(lambda url: "/auth" not in url and "/login" not in url, timeout=30_000)
            page.wait_for_timeout(2000)
            print("✅ Logado!")

        # Navigate to bookshelf to trigger the API call, and intercept its headers
        auth_headers = {}

        def capture_auth(request):
            if "prd-api.skoob.com.br" in request.url and "bookshelf" in request.url:
                auth_headers.update(dict(request.headers))

        page.on("request", capture_auth)

        bookshelf_url = f"{SKOOB_BASE}/pt/user/{USER_ID}/bookshelf"
        if "/bookshelf" not in page.url:
            page.goto(bookshelf_url, wait_until="domcontentloaded", timeout=60_000)
        else:
            page.reload(wait_until="domcontentloaded", timeout=60_000)
        page.wait_for_timeout(5000)

        cookies = page.context.cookies()
        browser.close()

    cookie_dict = {c["name"]: c["value"] for c in cookies}
    print(f"🍪 {len(cookie_dict)} cookies capturados")
    print(f"🔑 {len(auth_headers)} headers da API capturados")
    return cookie_dict, auth_headers


def fetch_bookshelf(cookies: dict, auth_headers: dict) -> list[dict]:
    """Fetch all books from the bookshelf API."""
    session = requests.Session()
    session.cookies.update(cookies)
    # Use the exact headers the browser sent to the API
    session.headers.update(auth_headers)
    # Override host for direct API calls
    session.headers["host"] = "prd-api.skoob.com.br"

    # First page to get total
    params = {
        "page": 1,
        "limit": 30,
        "bookshelf_type": "book",
        "user_id": USER_ID,
        "filter": FILTER,
        "search_type": "title",
    }

    resp = session.get(f"{API_BASE}/bookshelf", params=params)
    resp.raise_for_status()
    data = resp.json()

    total_pages = data["total_pages"]
    total_items = data["total_items"]
    print(f"📚 {total_items} livros em {total_pages} páginas")

    all_books = data["items"]
    print(f"📖 Página 1/{total_pages} — {len(data['items'])} livros")

    for page_num in range(2, total_pages + 1):
        params["page"] = page_num
        resp = session.get(f"{API_BASE}/bookshelf", params=params)
        resp.raise_for_status()
        data = resp.json()
        all_books.extend(data["items"])
        print(f"📖 Página {page_num}/{total_pages} — {len(data['items'])} livros")

    return all_books


def fetch_book_ratings(session: requests.Session, slug: str) -> dict:
    """Fetch average rating and rating count from a book's page via JSON-LD."""
    url = f"{SKOOB_BASE}/pt/book/{slug}"
    try:
        resp = session.get(url, timeout=15)
        if resp.status_code != 200:
            return {}
        html = resp.text

        avg_match = re.search(r'"ratingValue"\s*:\s*([\d.]+)', html)
        count_match = re.search(r'"ratingCount"\s*:\s*(\d+)', html)
        # readers is in RSC escaped JSON: \"readers\":123
        readers_match = re.search(r'\\?"readers\\?"\s*:\s*(\d+)', html)

        result = {}
        if avg_match:
            result["avg_rating"] = float(avg_match.group(1))
        if count_match:
            result["rating_count"] = int(count_match.group(1))
        if readers_match:
            result["readers"] = int(readers_match.group(1))
        return result
    except Exception:
        return {}


def enrich_with_ratings(cookies: dict, books: list[dict]) -> list[dict]:
    """Fetch ratings for all books in parallel."""
    session = requests.Session()
    session.cookies.update(cookies)
    session.headers.update({
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    })

    total = len(books)
    print(f"\n⭐ Buscando notas e avaliações de {total} livros...")

    done = 0

    def fetch_one(book):
        nonlocal done
        slug = book.get("slug", "")
        if not slug:
            return book, {}
        ratings = fetch_book_ratings(session, slug)
        done += 1
        if done % 20 == 0 or done == total:
            print(f"   {done}/{total} livros processados")
        return book, ratings

    with ThreadPoolExecutor(max_workers=5) as executor:
        futures = [executor.submit(fetch_one, book) for book in books]
        for future in as_completed(futures):
            book, ratings = future.result()
            book.update(ratings)

    return books


def main():
    cookies, auth_headers = get_session_cookies()
    books = fetch_bookshelf(cookies, auth_headers)

    # Enrich with ratings from book detail pages
    books = enrich_with_ratings(cookies, books)

    # Build clean output
    output = []
    for book in books:
        output.append({
            "book_id": book.get("book_id"),
            "edition_id": book.get("edition_id"),
            "title": book.get("title"),
            "author": book.get("author"),
            "publisher": book.get("publisher"),
            "year": book.get("year"),
            "pages": book.get("pages"),
            "status": book.get("status"),
            "my_rating": book.get("rating"),
            "avg_rating": book.get("avg_rating"),
            "rating_count": book.get("rating_count"),
            "readers": book.get("readers"),
            "progress": book.get("progress"),
            "finished_at": book.get("finished_at"),
            "url": f"{SKOOB_BASE}/book/{book.get('edition_id')}",
            "cover": book.get("cover_filename"),
        })

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    # CSV export
    csv_file = OUTPUT_FILE.replace(".json", ".csv")
    with open(csv_file, "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=output[0].keys())
        writer.writeheader()
        writer.writerows(output)

    print(f"\n✅ {len(output)} livros salvos em {OUTPUT_FILE} e {csv_file}")


if __name__ == "__main__":
    main()
