#!/usr/bin/env python3
"""
ArXiv Paper Fetcher for PaperEveryday
Fetches latest papers by keywords and updates data/latest.json

Usage:
    python scripts/fetch_arxiv.py

Output:
    Updates data/latest.json with fetched papers
"""

import json
import os
import time
import urllib.request
import urllib.parse
import xml.etree.ElementTree as ET
from datetime import datetime

# Configuration
DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data")
DOMAINS_FILE = os.path.join(DATA_DIR, "domains.json")
LATEST_FILE = os.path.join(DATA_DIR, "latest.json")

ARXIV_API_URL = "http://export.arxiv.org/api/query"
MAX_RESULTS = 30  # Total max results across all keywords
RESULTS_PER_KEYWORD = 10
DELAY_BETWEEN_REQUESTS = 3  # seconds (ArXiv rate limit)


def load_domains():
    """Load domain configuration."""
    with open(DOMAINS_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


def load_existing_latest():
    """Load existing latest.json to preserve bookmarks."""
    if os.path.exists(LATEST_FILE):
        with open(LATEST_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return {"fetchedAt": None, "papers": []}


def build_query(keywords):
    """Build ArXiv API query string from keywords."""
    parts = []
    for kw in keywords:
        escaped = kw.replace('"', '').strip()
        parts.append(f'all:"{escaped}"')
    return "+OR+".join(parts)


def fetch_arxiv_papers(keywords, max_results=RESULTS_PER_KEYWORD):
    """Fetch papers from ArXiv API."""
    query = build_query(keywords)
    params = urllib.parse.urlencode({
        "search_query": query,
        "start": 0,
        "max_results": max_results,
        "sortBy": "submittedDate",
        "sortOrder": "descending"
    })
    url = f"{ARXIV_API_URL}?{params}"

    print(f"  Fetching: {url[:100]}...")

    req = urllib.request.Request(url, headers={"User-Agent": "PaperEveryday/1.0"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        return resp.read().decode("utf-8")


def parse_arxiv_response(xml_text):
    """Parse ArXiv API XML response into paper list."""
    ns = {"atom": "http://www.w3.org/2005/Atom",
          "arxiv": "http://arxiv.org/schemas/atom"}
    root = ET.fromstring(xml_text)
    entries = root.findall("atom:entry", ns)
    papers = []

    for entry in entries:
        def find_text(tag):
            el = entry.find(f"atom:{tag}", ns)
            return el.text.strip() if el is not None and el.text else ""

        def find_attr(tag, attr):
            el = entry.find(f"atom:{tag}", ns)
            return el.get(attr, "") if el is not None else ""

        entry_id = find_text("id")
        arxiv_id = entry_id.split("/")[-1].split("v")[0] if entry_id else ""
        title = " ".join(find_text("title").split())
        published = find_text("published")
        summary = " ".join(find_text("summary").split())

        authors = ", ".join(
            n.text.strip()
            for n in entry.findall("atom:author/atom:name", ns)
            if n.text
        )

        categories = [
            c.get("term", "")
            for c in entry.findall("atom:category", ns)
        ]

        papers.append({
            "id": f"arxiv_{arxiv_id.replace('.', '_')}",
            "title": title,
            "authors": authors,
            "year": datetime.fromisoformat(published.replace("Z", "+00:00")).year if published else "",
            "venue": categories[0] if categories else "",
            "arxivId": arxiv_id,
            "abstract": summary,
            "link": f"https://arxiv.org/abs/{arxiv_id}",
            "tags": ["arxiv"],
            "importance": 0,
            "_bookmarked": False,
            "_source": "arxiv"
        })

    return papers


def merge_papers(new_papers, existing_papers):
    """Merge new papers with existing ones, preserving bookmarks."""
    existing_map = {}
    for p in existing_papers:
        existing_map[p["id"]] = p

    for p in new_papers:
        if p["id"] in existing_map:
            old = existing_map[p["id"]]
            p["_bookmarked"] = old.get("_bookmarked", False)

    # De-duplicate by ID, preferring new ones
    merged_map = {}
    for p in new_papers:
        merged_map[p["id"]] = p
    for p in existing_papers:
        if p["id"] not in merged_map:
            merged_map[p["id"]] = p

    return list(merged_map.values())


def main():
    print("=" * 60)
    print(f"PaperEveryday - ArXiv Fetcher")
    print(f"Started at: {datetime.now().isoformat()}")
    print("=" * 60)

    # Load domains
    domains = load_domains()
    print(f"\nLoaded {len(domains)} domains:")
    for d in domains:
        print(f"  {d['icon']} {d['name']}: {', '.join(d['keywords'])}")

    # Load existing data
    existing = load_existing_latest()
    existing_papers = existing.get("papers", [])
    print(f"\nExisting papers: {len(existing_papers)}")

    # Fetch papers for each domain
    all_new_papers = []
    for domain in domains:
        print(f"\n--- Fetching for {domain['name']} ---")
        try:
            xml_text = fetch_arxiv_papers(domain["keywords"])
            papers = parse_arxiv_response(xml_text)
            print(f"  Got {len(papers)} papers")
            all_new_papers.extend(papers)
            time.sleep(DELAY_BETWEEN_REQUESTS)
        except Exception as e:
            print(f"  ERROR: {e}")

    # Merge and save
    merged = merge_papers(all_new_papers, existing_papers)
    merged.sort(key=lambda p: p.get("year", 0) or 0, reverse=True)

    output = {
        "fetchedAt": datetime.now().isoformat(),
        "papers": merged
    }

    with open(LATEST_FILE, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    print(f"\n{'=' * 60}")
    print(f"Done! Total papers: {len(merged)}")
    print(f"New papers fetched: {len(all_new_papers)}")
    print(f"Saved to: {LATEST_FILE}")
    print(f"{'=' * 60}")


if __name__ == "__main__":
    main()
