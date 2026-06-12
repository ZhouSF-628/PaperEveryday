/* ============================================================
   PaperEveryday - Data Manager v2
   Handles all JSON data: domains, papers, conferences, notes
   ============================================================ */

const DataManager = {
  _data: {
    domains: [],
    papers: [],
    latest: { fetchedAt: null, papers: [] },
    conferences: [],
    notes: []
  },
  _dirty: false,

  /* ---------- Initialization ---------- */
  async init() {
    try {
      const [domains, papers, latest, conferences, notes] = await Promise.all([
        this._loadJSON('data/domains.json'),
        this._loadJSON('data/papers.json'),
        this._loadJSON('data/latest.json'),
        this._loadJSON('data/conferences.json'),
        this._loadJSON('data/notes.json')
      ]);
      this._data.domains = domains || [];
      this._data.papers = papers || [];
      this._data.conferences = conferences || [];
      this._data.notes = notes || [];

      // Restore latest from localStorage
      const saved = this._loadLocal('papereveryday_latest');
      this._data.latest = latest || { fetchedAt: null, papers: [] };
      if (saved && saved.fetchedAt) {
        if (!this._data.latest.fetchedAt || new Date(saved.fetchedAt) > new Date(this._data.latest.fetchedAt)) {
          this._data.latest = saved;
        }
      }

      // Merge local edits
      const localPapers = this._loadLocal('papereveryday_papers');
      if (localPapers) {
        const merged = this._mergePapers(this._data.papers, localPapers);
        this._data.papers = merged;
      }
      this._dirty = false;
    } catch (e) {
      console.error('DataManager.init error:', e);
    }
  },

  async _loadJSON(path) {
    const resp = await fetch(path);
    if (!resp.ok) throw new Error(`Failed to load ${path}`);
    return resp.json();
  },

  _loadLocal(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  },

  _saveLocal(key, data) {
    try { localStorage.setItem(key, JSON.stringify(data)); }
    catch { /* ignore */ }
  },

  _mergePapers(filePapers, localPapers) {
    const map = new Map();
    filePapers.forEach(p => map.set(p.id, { ...p, _source: 'file' }));
    localPapers.forEach(p => {
      if (map.has(p.id)) {
        const existing = map.get(p.id);
        if (p._edited) {
          map.set(p.id, { ...existing, ...p, _edited: true, _source: 'local' });
        }
      } else {
        map.set(p.id, { ...p, _source: 'local' });
      }
    });
    return Array.from(map.values());
  },

  /* ---------- Getters ---------- */
  getDomains() { return this._data.domains; },
  getDomainById(id) { return this._data.domains.find(d => d.id === id); },

  getPapers(domainId) {
    if (!domainId) return this._data.papers;
    return this._data.papers.filter(p => p.domainId === domainId);
  },

  getPaper(id) { return this._data.papers.find(p => p.id === id); },
  getLatest() { return this._data.latest; },
  getConferences() { return this._data.conferences; },
  getNotes() { return this._data.notes; },

  /** Get notes for a specific paper by matching title */
  getNotesForPaper(title) {
    if (!title) return [];
    const t = title.toLowerCase().trim().replace(/[^a-z0-9\s]/g, '');
    return this._data.notes.filter(n => {
      const nt = (n.title || '').toLowerCase().trim().replace(/[^a-z0-9\s]/g, '');
      return nt.includes(t) || t.includes(nt);
    });
  },

  /** Get latest papers per domain (for domain overview) */
  getLatestPapersPerDomain(domainId, count = 3) {
    let papers = this._data.papers.filter(p => p.domainId === domainId && p.year);
    papers.sort((a, b) => (b.year || 0) - (a.year || 0));
    return papers.slice(0, count);
  },

  getPaperCount(domainId) {
    return this._data.papers.filter(p => p.domainId === domainId).length;
  },

  /* ---------- Paper CRUD ---------- */
  addPaper(paper) {
    paper.id = paper.id || 'paper_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
    paper._edited = true;
    paper._source = 'local';
    this._data.papers.push(paper);
    this._dirty = true;
    this._persistPapers();
    return paper;
  },

  updatePaper(id, updates) {
    const idx = this._data.papers.findIndex(p => p.id === id);
    if (idx === -1) return false;
    this._data.papers[idx] = { ...this._data.papers[idx], ...updates, _edited: true };
    this._dirty = true;
    this._persistPapers();
    return true;
  },

  deletePaper(id) {
    const idx = this._data.papers.findIndex(p => p.id === id);
    if (idx === -1) return false;
    this._data.papers.splice(idx, 1);
    this._dirty = true;
    this._persistPapers();
    return true;
  },

  addFromLatest(paperId) {
    const lp = this._data.latest.papers.find(p => p.id === paperId);
    if (!lp) return null;
    const newPaper = {
      ...lp,
      domainId: this._guessDomain(lp),
      innovation: [],
      results: '',
      tags: ['from-arxiv'],
      importance: 3,
      _edited: true,
      _source: 'local'
    };
    return this.addPaper(newPaper);
  },

  _guessDomain(paper) {
    const text = (paper.title + ' ' + (paper.abstract || '')).toLowerCase();
    for (const d of this._data.domains) {
      for (const kw of d.keywords) {
        if (text.includes(kw.toLowerCase())) return d.id;
      }
    }
    return this._data.domains[0]?.id || 'unknown';
  },

  toggleLatestBookmark(paperId) {
    const p = this._data.latest.papers.find(x => x.id === paperId);
    if (!p) return;
    p._bookmarked = !p._bookmarked;
    this._saveLocal('papereveryday_latest', this._data.latest);
  },

  _persistPapers() {
    const localPapers = this._data.papers.filter(p => p._source === 'local' || p._edited);
    this._saveLocal('papereveryday_papers', localPapers);
  },

  /* ---------- Export / Import ---------- */
  exportData() {
    const exportObj = {
      version: 2,
      exportedAt: new Date().toISOString(),
      domains: this._data.domains,
      papers: this._data.papers.map(p => {
        const { _edited, _source, ...rest } = p;
        return rest;
      })
    };
    const blob = new Blob([JSON.stringify(exportObj, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `papereveryday_export_${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  },

  importData(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target.result);
          if (!data.papers || !Array.isArray(data.papers)) {
            reject(new Error('无效的数据文件'));
            return;
          }
          const existingIds = new Set(this._data.papers.map(p => p.id));
          let imported = 0;
          data.papers.forEach(p => {
            if (!existingIds.has(p.id)) {
              this._data.papers.push({ ...p, _edited: true, _source: 'local' });
              existingIds.add(p.id);
              imported++;
            }
          });
          if (imported > 0) this._persistPapers();
          resolve(imported);
        } catch (err) {
          reject(new Error('文件解析失败: ' + err.message));
        }
      };
      reader.onerror = () => reject(new Error('文件读取失败'));
      reader.readAsText(file);
    });
  }
};
