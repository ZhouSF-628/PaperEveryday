/* ============================================================
   PaperEveryday - Main Application v2
   ============================================================ */

const App = {
  _currentView: 'home',  // 'home', 'domain-{id}', 'latest', 'conferences'
  _searchTerm: '',
  _sortBy: 'year',

  async init() {
    await DataManager.init();
    this._currentView = 'home';
    this._setupEventListeners();
    this.renderCurrentView();
  },

  /* ---------- Event Listeners ---------- */
  _setupEventListeners() {
    document.getElementById('search-input')?.addEventListener('input', (e) => {
      this._searchTerm = e.target.value.toLowerCase();
      this.renderCurrentView();
    });

    document.getElementById('sort-select')?.addEventListener('change', (e) => {
      this._sortBy = e.target.value;
      this.renderCurrentView();
    });

    document.getElementById('btn-add')?.addEventListener('click', () => {
      Renderer.showFormModal(null);
    });

    document.getElementById('btn-export')?.addEventListener('click', () => {
      DataManager.exportData();
      App.showToast('数据已导出', 'success');
    });

    document.getElementById('btn-import')?.addEventListener('click', () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        try {
          const count = await DataManager.importData(file);
          App.showToast(`成功导入 ${count} 篇论文`, 'success');
          this.renderCurrentView();
        } catch (err) {
          App.showToast(err.message, 'error');
        }
      };
      input.click();
    });

    document.getElementById('menu-toggle')?.addEventListener('click', () => {
      document.getElementById('sidebar').classList.toggle('open');
      document.getElementById('sidebar-overlay').classList.toggle('show');
    });

    document.getElementById('sidebar-overlay')?.addEventListener('click', () => {
      document.getElementById('sidebar').classList.remove('open');
      document.getElementById('sidebar-overlay').classList.remove('show');
    });
  },

  /* ---------- Navigation ---------- */
  goHome() {
    this._currentView = 'home';
    this._searchTerm = '';
    document.getElementById('search-input').value = '';
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('sidebar-overlay').classList.remove('show');
    this.renderCurrentView();
  },

  switchDomain(domainId) {
    this._currentView = 'domain-' + domainId;
    this._searchTerm = '';
    document.getElementById('search-input').value = '';
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('sidebar-overlay').classList.remove('show');
    this.renderCurrentView();
  },

  showConferences() {
    this._currentView = 'conferences';
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('sidebar-overlay').classList.remove('show');
    this.renderCurrentView();
  },

  /* ---------- Render Current View ---------- */
  renderCurrentView() {
    const view = this._currentView;
    Renderer.renderSidebar(DataManager.getDomains(), view);

    if (view === 'home') {
      Renderer.renderHome();
    } else if (view === 'conferences') {
      Renderer.renderConferences();
    } else if (view === 'latest') {
      this._renderLatestView();
    } else if (view && view.startsWith('domain-')) {
      this._renderDomainView(view.replace('domain-', ''));
    }
  },

  _renderDomainView(domainId) {
    let papers = DataManager.getDomainPapers(domainId);

    // Search
    if (this._searchTerm) {
      const t = this._searchTerm;
      papers = papers.filter(p => {
        return (p.title || '').toLowerCase().includes(t) ||
               (p.authors || '').toLowerCase().includes(t) ||
               (p.abstract || '').toLowerCase().includes(t);
      });
    }

    // Sort
    papers.sort((a, b) => {
      if (this._sortBy === 'importance') return (b.importance || 0) - (a.importance || 0);
      if (this._sortBy === 'year') return (b.year || 0) - (a.year || 0);
      if (this._sortBy === 'title') return (a.title || '').localeCompare(b.title || '');
      return 0;
    });

    Renderer.renderDomainPapers(domainId, papers, this._searchTerm, this._sortBy);
  },

  _renderLatestView() {
    const latest = DataManager.getLatest();
    Renderer.renderLatest(latest);
  },

  /* ---------- Paper Detail ---------- */
  showPaperDetail(paperId) {
    const paper = DataManager.getPaper(paperId);
    if (!paper) { App.showToast('论文未找到', 'error'); return; }
    Renderer.showPaperModal(paper);
  },

  showNoteForPaper(paperId) {
    const paper = DataManager.getPaper(paperId);
    if (!paper) return;
    const notes = DataManager.getNotesForPaper(paper.title);
    if (notes.length === 0) { App.showToast('暂无笔记', ''); return; }
    Renderer.showNoteModal(paper);
  },

  /* ---------- CRUD ---------- */
  addPaper() { Renderer.showFormModal(null); },
  editPaper(paperId) {
    Renderer.closeModal();
    const paper = DataManager.getPaper(paperId);
    if (paper) Renderer.showFormModal(paper);
  },
  deletePaper(paperId) {
    if (!confirm('确定要删除这篇论文吗？')) return;
    DataManager.deletePaper(paperId);
    App.showToast('论文已删除', 'success');
    this.renderCurrentView();
  },

  /* ---------- Latest Actions ---------- */
  toggleBookmark(paperId) {
    DataManager.toggleLatestBookmark(paperId);
    this._renderLatestView();
  },
  addFromLatest(paperId) {
    const paper = DataManager.addFromLatest(paperId);
    if (paper) {
      App.showToast('已纳入管理', 'success');
      this._renderLatestView();
    } else { App.showToast('操作失败', 'error'); }
  },

  async refreshLatest() {
    App.showToast('正在从 ArXiv 获取最新论文...', '');
    try {
      const domains = DataManager.getDomains();
      const allKeywords = domains.flatMap(d => d.keywords);
      const papers = await ArxivFetcher.fetchByKeywords(allKeywords, 15);
      const existing = DataManager.getLatest();
      const existingMap = new Map();
      existing.papers?.forEach(p => existingMap.set(p.id, p));
      papers.forEach(p => {
        if (existingMap.has(p.id)) {
          const old = existingMap.get(p.id);
          p._bookmarked = old._bookmarked || false;
        }
        existingMap.set(p.id, p);
      });

      DataManager.getLatest().papers = Array.from(existingMap.values());
      DataManager.getLatest().fetchedAt = new Date().toISOString();
      try { localStorage.setItem('papereveryday_latest', JSON.stringify(DataManager.getLatest())); } catch {}
      App.showToast(`获取到 ${papers.length} 篇最新论文`, 'success');
      this._renderLatestView();
    } catch (e) {
      console.error(e);
      App.showToast('获取失败，请检查网络', 'error');
    }
  },

  /* ---------- Toast ---------- */
  showToast(message, type = '') {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();
    const toast = document.createElement('div');
    toast.className = `toast ${type ? 'toast-' + type : ''}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 2500);
  }
};

document.addEventListener('DOMContentLoaded', () => App.init());
