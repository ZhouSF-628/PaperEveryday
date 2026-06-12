/* ============================================================
   PaperEveryday - ArXiv API fetcher (client-side)
   Uses CORS proxy for browser-based fetching.
   For production, use the Python script via GitHub Actions.
   ============================================================ */

const ArxivFetcher = {
  // CORS proxies to try (in order)
  _proxies: [
    'https://api.allorigins.win/raw?url={url}',
    'https://corsproxy.io/?{url}'
  ],

  /**
   * Fetch papers from ArXiv by keywords
   * @param {string[]} keywords - Search keywords
   * @param {number} maxResults - Max results per keyword group
   * @returns {Promise<Array>}
   */
  async fetchByKeywords(keywords, maxResults = 10) {
    // Build query: all keywords OR'd together
    const queryParts = keywords.map(kw => {
      // Escape special chars and wrap in quotes for phrase search
      const escaped = kw.replace(/[()&|]/g, '').trim();
      return `(all:"${escaped}")`;
    });
    const query = queryParts.join('+OR+');
    const url = `http://export.arxiv.org/api/query?search_query=${query}&start=0&max_results=${maxResults}&sortBy=submittedDate&sortOrder=descending`;

    try {
      const xml = await this._fetchWithProxy(url);
      return this._parseResponse(xml);
    } catch (e) {
      console.error('ArXiv fetch failed:', e);
      throw e;
    }
  },

  async _fetchWithProxy(url) {
    // Try direct fetch first (may fail due to CORS)
    try {
      const resp = await fetch(url);
      if (resp.ok) return resp.text();
    } catch { /* CORS blocked, try proxy */ }

    // Try proxies
    for (const proxy of this._proxies) {
      try {
        const proxyUrl = proxy.replace('{url}', encodeURIComponent(url));
        const resp = await fetch(proxyUrl);
        if (resp.ok) return resp.text();
      } catch { continue; }
    }
    throw new Error('All fetch methods failed');
  },

  _parseResponse(xmlText) {
    const parser = new DOMParser();
    const xml = parser.parseFromString(xmlText, 'text/xml');
    const entries = xml.querySelectorAll('entry');
    const papers = [];

    entries.forEach(entry => {
      const id = entry.querySelector('id')?.textContent || '';
      const arxivId = id.split('/').pop()?.split('v')[0] || '';
      const title = entry.querySelector('title')?.textContent?.replace(/\s+/g, ' ').trim() || '';
      const published = entry.querySelector('published')?.textContent || '';
      const summary = entry.querySelector('summary')?.textContent?.replace(/\s+/g, ' ').trim() || '';
      const link = entry.querySelector('link[title="pdf"]')?.getAttribute('href') || id;

      const authors = Array.from(entry.querySelectorAll('author name'))
        .map(n => n.textContent.trim())
        .join(', ');

      // Extract categories (first one is primary)
      const categories = Array.from(entry.querySelectorAll('category'))
        .map(c => c.getAttribute('term'));

      papers.push({
        id: 'arxiv_' + arxivId.replace(/\./g, '_'),
        title,
        authors,
        year: published ? new Date(published).getFullYear() : '',
        venue: categories[0] || '',
        arxivId,
        abstract: summary,
        link: `https://arxiv.org/abs/${arxivId}`,
        tags: ['arxiv'],
        importance: 0,
        _source: 'arxiv',
        _bookmarked: false
      });
    });

    return papers;
  }
};
