// v1781255057949
﻿/* ============================================================
   PaperEveryday - Renderer v2
   DOM rendering: sidebar, home, domain view, cards, modal, notes
   ============================================================ */

const Renderer = {
  /* ---------- Sidebar ---------- */
  renderSidebar(domains, activeView) {
    const sidebar = document.getElementById('sidebar');
    sidebar.innerHTML = '';

    // Navigation section
    const navSection = document.createElement('div');
    navSection.className = 'sidebar-section';
    const navLabel = document.createElement('div');
    navLabel.className = 'sidebar-label';
    navLabel.textContent = '导航';
    navSection.appendChild(navLabel);

    const homeItem = document.createElement('div');
    homeItem.className = 'sidebar-item' + (activeView === 'home' ? ' active' : '');
    homeItem.innerHTML = '<span class="icon">🏠</span> 领域总览';
    homeItem.addEventListener('click', () => App.goHome());
    navSection.appendChild(homeItem);

    const confItem = document.createElement('div');
    confItem.className = 'sidebar-item' + (activeView === 'conferences' ? ' active' : '');
    confItem.innerHTML = '<span class="icon">🏆</span> 会议链接';
    confItem.addEventListener('click', () => App.showConferences());
    navSection.appendChild(confItem);

    sidebar.appendChild(navSection);

    // Domain section
    const domSection = document.createElement('div');
    domSection.className = 'sidebar-section';
    const domLabel = document.createElement('div');
    domLabel.className = 'sidebar-label';
    domLabel.textContent = '研究领域';
    domSection.appendChild(domLabel);
    sidebar.appendChild(domSection);

    domains.forEach(d => {
      const count = DataManager.getPaperCount(d.id);
      const item = document.createElement('div');
      item.className = 'sidebar-item' + (activeView === 'domain-' + d.id ? ' active' : '');
      item.dataset.domain = d.id;
      item.innerHTML = `<span class="icon">${d.icon}</span> ${d.name}<span class="badge">${count}</span>`;
      item.addEventListener('click', () => App.switchDomain(d.id));
      domSection.appendChild(item);
    });

    // Latest section
    const latestSection = document.createElement('div');
    latestSection.className = 'sidebar-section';
    const latestLabel = document.createElement('div');
    latestLabel.className = 'sidebar-label';
    latestLabel.textContent = '动态';
    latestSection.appendChild(latestLabel);

    const latestItem = document.createElement('div');
    latestItem.className = 'sidebar-item' + (activeView === 'latest' ? ' active' : '');
    latestItem.innerHTML = '<span class="icon">🔥</span> 最新动态';
    latestItem.addEventListener('click', () => App.switchDomain('latest'));
    latestSection.appendChild(latestItem);
    sidebar.appendChild(latestSection);
  },

  /* ---------- Home: Domain Overview ---------- */
  renderHome() {
    const container = document.getElementById('papers-container');
    const title = document.getElementById('main-title');
    const toolbar = document.getElementById('toolbar');
    toolbar.style.display = 'none';
    title.textContent = '🏠 领域总览';
    container.innerHTML = '';

    // ArXiv Search Section
    const searchSection = document.createElement('div');
    searchSection.className = 'arxiv-search-section';
    searchSection.innerHTML = `
      <div class="arxiv-search-box">
        <div class="arxiv-search-label">🔍 ArXiv 论文搜索</div>
        <div class="arxiv-search-row">
          <input type="text" id="arxiv-search-input" placeholder="输入关键词搜索 ArXiv（如: 3D Gaussian Splatting）" />
          <button class="btn btn-primary" id="arxiv-search-btn">搜索</button>
        </div>
        <div id="arxiv-search-results"></div>
      </div>
    `;
    container.appendChild(searchSection);

    // ArXiv search event
    document.getElementById('arxiv-search-btn').addEventListener('click', () => {
      const query = document.getElementById('arxiv-search-input').value.trim();
      if (!query) return;
      App.searchArxiv(query);
    });
    document.getElementById('arxiv-search-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        document.getElementById('arxiv-search-btn').click();
      }
    });

    // Separator
    const sep = document.createElement('hr');
    sep.style.cssText = 'border:none;border-top:1px solid var(--color-border);margin:24px 0;';
    container.appendChild(sep);

    // Domain intro
    const intro = document.createElement('div');
    intro.className = 'home-intro';
    intro.innerHTML = '<p style="color:var(--color-text-muted);margin-bottom:20px;font-size:0.9rem;">📂 选择领域查看论文详情</p>';
    container.appendChild(intro);

    const grid = document.createElement('div');
    grid.className = 'domain-grid';
    const domains = DataManager.getDomains();

    domains.forEach(d => {
      const count = DataManager.getPaperCount(d.id);
      const latest = DataManager.getLatestPapersPerDomain(d.id, 3);
      const card = document.createElement('div');
      card.className = 'domain-card';

      let latestHtml = '';
      if (latest.length > 0) {
        latestHtml = '<div class="domain-latest-papers">';
        latest.forEach(p => {
          const hasNotes = DataManager.getNotesForPaper(p.title).length > 0;
          const shortTitle = p.title.length > 60 ? p.title.substring(0,60)+'...' : p.title;
          latestHtml += `<div class="domain-latest-paper" data-paper-id="${p.id}">
            📄 ${this._escapeHtml(shortTitle)}
            ${hasNotes ? '<span class="note-badge">📝</span>' : ''}
            <span class="domain-latest-year">${p.year || ''}</span>
          </div>`;
        });
        latestHtml += '</div>';
      }

      card.innerHTML = `
        <div class="domain-card-header">
          <span class="domain-icon">${d.icon}</span>
          <span class="domain-name">${this._escapeHtml(d.name)}</span>
          <span class="domain-count">${count} 篇</span>
        </div>
        ${latestHtml}
        <div class="domain-card-footer">点击查看全部 →</div>
      `;

      card.addEventListener('click', (e) => {
        if (e.target.closest('.domain-latest-paper')) return;
        App.switchDomain(d.id);
      });
      card.querySelectorAll('.domain-latest-paper').forEach(el => {
        el.addEventListener('click', (e) => {
          e.stopPropagation();
          App.showPaperDetail(el.dataset.paperId);
        });
      });
      grid.appendChild(card);
    });

    container.appendChild(grid);
  },/* ---------- Domain Paper View ---------- */
  renderDomainPapers(domainId, papers) {
    const container = document.getElementById('papers-container');
    const title = document.getElementById('main-title');
    const toolbar = document.getElementById('toolbar');
    toolbar.style.display = 'none';

    const domain = DataManager.getDomainById(domainId);
    title.textContent = domain ? domain.icon + ' ' + domain.name : '📄 全部论文';

    if (!papers || papers.length === 0) {
      container.innerHTML = '<div class="empty-state"><div class="empty-icon">📭</div><div class="empty-text">该领域暂无论文</div><div class="empty-hint">点击上方「+ 添加论文」手动添加，或在「最新动态」中从 ArXiv 收录</div></div>';
      return;
    }

    const grid = document.createElement('div');
    grid.className = 'papers-grid';
    papers.forEach(paper => {
      grid.appendChild(this._createPaperCard(paper, domainId));
    });
    container.innerHTML = '';
    container.appendChild(grid);
  },/* ---------- Paper Card ---------- */
  _createPaperCard(paper, domainId) {
    const card = document.createElement('div');
    card.className = 'paper-card paper-card-enhanced';
    card.dataset.paperId = paper.id;

    const hasNotes = DataManager.getNotesForPaper(paper.title).length > 0;const tagsHtml = (paper.tags || []).map(function(t) {
      var cls = 'tag';
      if (t === 'foundational' || t === '代表作') cls += ' tag-primary';
      return '<span class="' + cls + '">' + Renderer._escapeHtml(t) + '</span>';
    }).join('');

    // Authors
    var authorsHtml = '';
    if (paper.authors) {
      var shortAuthors = paper.authors.split(',')[0];
      if (paper.authors.indexOf(',') > 0) shortAuthors += ' et al.';
      authorsHtml = '<div class="card-authors">' + Renderer._escapeHtml(shortAuthors) + '</div>';
    }

    // Venue/Year
    var venueHtml = '';
    if (paper.year || paper.venue) {
      venueHtml = '<div class="card-venue">';
      if (paper.year) venueHtml += paper.year;
      if (paper.year && paper.venue) venueHtml += ' · ';
      if (paper.venue) venueHtml += Renderer._escapeHtml(paper.venue);
      venueHtml += '</div>';
    }

    // Abstract (first 150 chars)
    var abstractHtml = '';
    if (paper.abstract) {
      var abs = paper.abstract.substring(0, 180);
      if (paper.abstract.length > 180) abs += '...';
      abstractHtml = '<div class="card-abstract">' + Renderer._escapeHtml(abs) + '</div>';
    }

    // Innovation preview (first 2)
    var innovationHtml = '';
    if (paper.innovation && paper.innovation.length > 0) {
      var innoList = [];
      for (var k = 0; k < Math.min(2, paper.innovation.length); k++) {
        innoList.push('<span class="innovation-dot">✦ ' + Renderer._escapeHtml(paper.innovation[k].substring(0, 30)) + '</span>');
      }
      if (innoList.length > 0) innovationHtml = '<div class="card-innovation-preview">' + innoList.join('') + '</div>';
    }

    card.innerHTML = 
      '<div class="card-header">' +
        '<div class="card-title">' + Renderer._escapeHtml(paper.title) + '</div>' +
        (hasNotes ? '<span class="note-badge" title="有阅读笔记">📝</span>' : '') +
      '</div>' +
      authorsHtml +
      venueHtml +
      (tagsHtml ? '<div class="card-tags">' + tagsHtml + '</div>' : '') +
      abstractHtml +
      innovationHtml +
      '<div class="card-actions">' +
        
        '<div class="card-links">' +
          (paper.link ? '<a href="' + paper.link + '" target="_blank" class="btn btn-sm" onclick="event.stopPropagation()">📄 论文</a>' : '') +
          (hasNotes ? '<span class="btn btn-sm btn-note" onclick="event.stopPropagation(); App.showNoteForPaper(\'' + paper.id + '\')">📝 笔记</span>' : '') +
          '' +
        '</div>' +
      '</div>';

    card.addEventListener('click', function() { App.showPaperDetail(paper.id); });
    return card;
  },/* ---------- Paper Detail Modal ---------- */
  showPaperModal(paper) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'paper-modal';
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) this.closeModal();
    });

    const hasNotes = DataManager.getNotesForPaper(paper.title);
    const starsHtml = Array.from({ length: 5 }, (_, i) =>
      `<span class="${i < (paper.importance || 0) ? 'star' : 'star-empty'}">★</span>`
    ).join('');
    const tagsHtml = (paper.tags || []).map(t =>
      `<span class="tag ${t === 'foundational' || t === '代表作' ? 'tag-primary' : ''}">${t}</span>`
    ).join('');

    let tabsHtml = `<div class="tab active" data-tab="abstract">摘要</div>
      <div class="tab" data-tab="innovation">💡 创新点</div>
      <div class="tab" data-tab="results">📊 结果对比</div>`;
    if (hasNotes.length > 0) {
      tabsHtml += `<div class="tab" data-tab="notes">📝 我的笔记</div>`;
    }

    let notesHtml = '';
    if (hasNotes.length > 0) {
      notesHtml = `<div class="tab-content" id="tab-notes">
        ${hasNotes.map(n => `
          <div class="note-entry">
            <div class="note-meta">📅 ${n.date || ''} ${n.venue ? '· ' + n.venue : ''}</div>
            <div class="note-content">${this._renderMarkdown(n.note)}</div>
          </div>
        `).join('')}
      </div>`;
    }

    overlay.innerHTML = `
      <div class="modal">
        <div class="modal-header">
          <h2>${this._escapeHtml(paper.title)}</h2>
          <button class="modal-close" onclick="Renderer.closeModal()">✕</button>
        </div>
        <div class="modal-body">
          <div class="field">
            <div class="field-label">作者</div>
            <div class="field-value">${this._escapeHtml(paper.authors || '—')}</div>
          </div>
          <div class="field">
            <div class="field-label">发表信息</div>
            <div class="field-value">${paper.year || '—'} ${paper.venue ? '· ' + this._escapeHtml(paper.venue) : ''}</div>
          </div>
          ${paper.link ? `<div class="field">
            <div class="field-label">链接</div>
            <div class="field-value"><a href="${paper.link}" target="_blank">${paper.link}</a></div>
          </div>` : ''}
          <div class="field">
            <div class="field-label">重要性</div>
            <div class="field-value card-stars">${starsHtml}</div>
          </div>
          ${tagsHtml ? `<div class="field">
            <div class="field-label">标签</div>
            <div class="field-value card-tags">${tagsHtml}</div>
          </div>` : ''}

          <div class="tabs" id="detail-tabs">${tabsHtml}</div>

          <div class="tab-content active" id="tab-abstract">
            <div class="field-value abstract">${this._escapeHtml(paper.abstract || '暂无摘要')}</div>
          </div>
          <div class="tab-content" id="tab-innovation">
            ${(paper.innovation && paper.innovation.length > 0)
              ? `<ul class="innovation-list">${paper.innovation.map(i => `<li>${this._escapeHtml(i)}</li>`).join('')}</ul>`
              : '<div class="field-value" style="color: var(--color-text-muted);">暂无记录</div>'
            }
          </div>
          <div class="tab-content" id="tab-results">
            <div class="results-block">${this._escapeHtml(paper.results || '暂无结果对比')}</div>
          </div>
          ${notesHtml}

          <div class="form-actions" style="margin-top: 20px;">
            <button class="btn" onclick="App.editPaper('${paper.id}')">✏️ 编辑</button>
            <button class="btn" onclick="App.deletePaper('${paper.id}'); Renderer.closeModal();" style="color: var(--color-danger);">🗑️ 删除</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    // Tab switching
    overlay.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', () => {
        overlay.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        overlay.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const tabContent = document.getElementById('tab-' + tab.dataset.tab);
        if (tabContent) tabContent.classList.add('active');
      });
    });

    this._escHandler = (e) => { if (e.key === 'Escape') this.closeModal(); };
    document.addEventListener('keydown', this._escHandler);
  },

  /* ---------- Note-Only Modal ---------- */
  showNoteModal(paper) {
    const notes = DataManager.getNotesForPaper(paper.title);
    if (notes.length === 0) return;

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.addEventListener('click', (e) => { if (e.target === overlay) this.closeModal(); });

    overlay.innerHTML = `
      <div class="modal" style="max-width: 800px;">
        <div class="modal-header">
          <h2>📝 ${this._escapeHtml(paper.title)}</h2>
          <button class="modal-close" onclick="Renderer.closeModal()">✕</button>
        </div>
        <div class="modal-body">
          ${notes.map(n => `
            <div class="note-entry">
              <div class="note-meta">📅 ${n.date || ''} ${n.venue ? '· ' + n.venue : ''}</div>
              <div class="note-content">${this._renderMarkdown(n.note)}</div>
            </div>
            <hr style="border:none;border-top:1px solid var(--color-border);margin:20px 0;">
          `).join('')}
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    this._escHandler = (e) => { if (e.key === 'Escape') this.closeModal(); };
    document.addEventListener('keydown', this._escHandler);
  },

  /* ---------- Conference Links ---------- */
  renderConferences() {
    const container = document.getElementById('papers-container');
    const title = document.getElementById('main-title');
    const toolbar = document.getElementById('toolbar');
    toolbar.style.display = 'none';

    title.textContent = '🏆 会议论文链接';

    const confs = DataManager.getConferences();
    let html = '<div class="conf-grid">';

    confs.forEach(c => {
      html += `<div class="conf-card">
        <div class="conf-name">${c.icon} ${c.name}</div>
        <div class="conf-links">`;
      c.links.forEach(l => {
        html += `<a href="${l.url}" target="_blank" class="conf-link">${l.year}</a>`;
      });
      html += `</div></div>`;
    });

    html += '</div>';
    container.innerHTML = html;
  },

  /* ---------- Latest Papers ---------- */
  renderLatest(latestData) {
    const container = document.getElementById('papers-container');
    const title = document.getElementById('main-title');
    const toolbar = document.getElementById('toolbar');
    toolbar.style.display = 'flex';
    title.textContent = '🔥 最新动态';

    if (!latestData || !latestData.papers || latestData.papers.length === 0) {
      const fetchDate = latestData?.fetchedAt
        ? new Date(latestData.fetchedAt).toLocaleString('zh-CN')
        : '尚未获取';
      container.innerHTML = `
        <div class="latest-header">
          <div class="latest-meta">🕐 上次更新: ${fetchDate}</div>
        </div>
        <div class="empty-state">
          <div class="empty-icon">🔍</div>
          <div class="empty-text">暂无最新论文</div>
          <div class="empty-hint">运行 GitHub Actions 或本地脚本从 ArXiv 拉取，或点击手动刷新</div>
        </div>
      `;
      return;
    }

    const fetchDate = latestData.fetchedAt
      ? new Date(latestData.fetchedAt).toLocaleString('zh-CN')
      : '未知';

    const allKeywords = DataManager.getDomains().flatMap(d => d.keywords).map(k => k.toLowerCase());
    const filtered = latestData.papers.filter(p => {
      const text = (p.title + ' ' + (p.abstract || '')).toLowerCase();
      return allKeywords.some(kw => text.includes(kw));
    });
    const displayPapers = filtered.length > 0 ? filtered : latestData.papers;

    let headerHtml = `
      <div class="latest-header">
        <div class="latest-meta">🕐 上次更新: ${fetchDate} · 显示 ${displayPapers.length} 篇相关论文</div>
        <span>
          <button class="btn btn-sm" onclick="App.refreshLatest()">🔄 手动刷新</button>
        </span>
      </div>
    `;

    const grid = document.createElement('div');
    grid.className = 'papers-grid';

    displayPapers.forEach(paper => {
      const card = document.createElement('div');
      card.className = 'paper-card';
      card.dataset.paperId = paper.id;

      const metaParts = [];
      if (paper.year) metaParts.push(paper.year);
      if (paper.authors) {
        const shortAuthors = paper.authors.split(',')[0] + (paper.authors.includes(',') ? ' et al.' : '');
        metaParts.unshift(shortAuthors);
      }
      const isBookmarked = paper._bookmarked;
      const isAdded = DataManager._data.papers.some(p => p.id === paper.id || (p.arxivId && p.arxivId === paper.arxivId));

      card.innerHTML = `
        <div class="card-header">
          <div class="card-title">${this._escapeHtml(paper.title)}</div>
          <button class="favorite-btn" onclick="event.stopPropagation(); App.toggleBookmark('${paper.id}')" title="${isBookmarked ? '取消收藏' : '收藏'}">
            ${isBookmarked ? '⭐' : '☆'}
          </button>
        </div>
        <div class="card-meta">${this._escapeHtml(metaParts.join(' · '))}</div>
        ${paper.arxivId ? `<div class="card-meta" style="font-size:0.75rem">arxiv: ${paper.arxivId}</div>` : ''}
        <div class="card-actions">
          <div class="card-links">
            ${paper.link ? `<a href="${paper.link}" target="_blank" class="btn btn-sm" onclick="event.stopPropagation()">📄 论文</a>` : ''}
            ${!isAdded ? `<button class="btn btn-sm btn-primary" onclick="event.stopPropagation(); App.addFromLatest('${paper.id}')">📥 纳入管理</button>`
                       : '<span style="font-size:0.78rem;color:var(--color-text-muted)">✓ 已收录</span>'}
          </div>
        </div>
      `;

      card.addEventListener('click', () => this.showLatestDetail(paper));
      grid.appendChild(card);
    });

    container.innerHTML = headerHtml;
    container.appendChild(grid);
  },

  showLatestDetail(paper) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.addEventListener('click', (e) => { if (e.target === overlay) this.closeModal(); });

    overlay.innerHTML = `
      <div class="modal">
        <div class="modal-header">
          <h2>${this._escapeHtml(paper.title)}</h2>
          <button class="modal-close" onclick="Renderer.closeModal()">✕</button>
        </div>
        <div class="modal-body">
          <div class="field">
            <div class="field-label">作者</div>
            <div class="field-value">${this._escapeHtml(paper.authors || '—')}</div>
          </div>
          <div class="field"><div class="field-label">年份</div><div class="field-value">${paper.year || '—'}</div></div>
          ${paper.arxivId ? `<div class="field"><div class="field-label">ArXiv ID</div><div class="field-value">${paper.arxivId}</div></div>` : ''}
          ${paper.link ? `<div class="field"><div class="field-label">链接</div><div class="field-value"><a href="${paper.link}" target="_blank">${paper.link}</a></div></div>` : ''}
          <div class="field">
            <div class="field-label">摘要</div>
            <div class="field-value abstract">${this._escapeHtml(paper.abstract || '暂无摘要')}</div>
          </div>
          <div class="form-actions" style="margin-top:20px;">
            <button class="btn btn-primary" onclick="App.addFromLatest('${paper.id}'); Renderer.closeModal();">📥 纳入管理</button>
            <button class="btn" onclick="App.toggleBookmark('${paper.id}'); Renderer.closeModal();">${paper._bookmarked ? '⭐ 已收藏' : '☆ 收藏'}</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    this._escHandler = (e) => { if (e.key === 'Escape') this.closeModal(); };
    document.addEventListener('keydown', this._escHandler);
  },

  /* ---------- Add/Edit Form Modal ---------- */
  showFormModal(paperToEdit) {
    const isEdit = !!paperToEdit;
    const p = paperToEdit || { title: '', authors: '', year: '', venue: '', arxivId: '', abstract: '', innovation: [], results: '', link: '', domainId: DataManager.getDomains()[0]?.id || '', tags: [], importance: 3 };

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'form-modal';
    overlay.addEventListener('click', (e) => { if (e.target === overlay) this.closeModal(); });

    const domains = DataManager.getDomains();
    const domainOptions = domains.map(d =>
      `<option value="${d.id}" ${d.id === p.domainId ? 'selected' : ''}>${d.icon} ${d.name}</option>`
    ).join('');

    overlay.innerHTML = `
      <div class="modal" style="max-width: 780px;">
        <div class="modal-header">
          <h2>${isEdit ? '✏️ 编辑论文' : '➕ 添加论文'}</h2>
          <button class="modal-close" onclick="Renderer.closeModal()">✕</button>
        </div>
        <div class="modal-body">
          <form id="paper-form" onsubmit="return false;">
            <div class="form-group">
              <label for="f-title">论文标题 *</label>
              <input type="text" id="f-title" value="${this._escapeHtml(p.title)}" required>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label for="f-authors">作者</label>
                <input type="text" id="f-authors" value="${this._escapeHtml(p.authors || '')}">
              </div>
              <div class="form-group">
                <label for="f-year">年份</label>
                <input type="number" id="f-year" value="${p.year || ''}" min="1900" max="2030">
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label for="f-venue">会议/期刊</label>
                <input type="text" id="f-venue" value="${this._escapeHtml(p.venue || '')}">
              </div>
              <div class="form-group">
                <label for="f-domain">研究领域</label>
                <select id="f-domain">${domainOptions}</select>
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label for="f-arxiv">ArXiv ID</label>
                <input type="text" id="f-arxiv" value="${this._escapeHtml(p.arxivId || '')}" placeholder="e.g. 2406.09246">
              </div>
              <div class="form-group">
                <label for="f-importance">重要性 (1-5)</label>
                <input type="number" id="f-importance" value="${p.importance || 3}" min="1" max="5">
              </div>
            </div>
            <div class="form-group">
              <label for="f-link">论文链接</label>
              <input type="url" id="f-link" value="${this._escapeHtml(p.link || '')}" placeholder="https://arxiv.org/abs/...">
            </div>
            <div class="form-group">
              <label for="f-tags">标签 (逗号分隔)</label>
              <input type="text" id="f-tags" value="${this._escapeHtml((p.tags || []).join(', '))}" placeholder="e.g. foundational, 代表作">
            </div>
            <div class="form-group">
              <label for="f-abstract">摘要</label>
              <textarea id="f-abstract" rows="4">${this._escapeHtml(p.abstract || '')}</textarea>
            </div>
            <div class="form-group">
              <label for="f-innovation">创新点 (每行一个)</label>
              <textarea id="f-innovation" rows="3">${this._escapeHtml((p.innovation || []).join('\n'))}</textarea>
            </div>
            <div class="form-group">
              <label for="f-results">结果对比</label>
              <textarea id="f-results" rows="3">${this._escapeHtml(p.results || '')}</textarea>
            </div>
            <div class="form-actions">
              <button type="button" class="btn" onclick="Renderer.closeModal()">取消</button>
              <button type="submit" class="btn btn-primary">${isEdit ? '💾 保存' : '✅ 添加'}</button>
            </div>
          </form>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    document.getElementById('paper-form').addEventListener('submit', () => {
      const data = {
        title: document.getElementById('f-title').value.trim(),
        authors: document.getElementById('f-authors').value.trim(),
        year: parseInt(document.getElementById('f-year').value) || '',
        venue: document.getElementById('f-venue').value.trim(),
        domainId: document.getElementById('f-domain').value,
        arxivId: document.getElementById('f-arxiv').value.trim(),
        importance: parseInt(document.getElementById('f-importance').value) || 3,
        link: document.getElementById('f-link').value.trim(),
        tags: document.getElementById('f-tags').value.split(',').map(t => t.trim()).filter(Boolean),
        abstract: document.getElementById('f-abstract').value.trim(),
        innovation: document.getElementById('f-innovation').value.split('\n').map(t => t.trim()).filter(Boolean),
        results: document.getElementById('f-results').value.trim()
      };
      if (!data.title) { alert('请输入论文标题'); return; }
      if (isEdit) {
        DataManager.updatePaper(p.id, data);
        App.showToast('论文已更新', 'success');
      } else {
        DataManager.addPaper(data);
        App.showToast('论文已添加', 'success');
      }
      this.closeModal();
      App.renderCurrentView();
    });

    this._escHandler = (e) => { if (e.key === 'Escape') this.closeModal(); };
    document.addEventListener('keydown', this._escHandler);
  },

  /* ---------- Utilities ---------- */
  closeModal() {
    document.querySelectorAll('.modal-overlay').forEach(el => el.remove());
    if (this._escHandler) {
      document.removeEventListener('keydown', this._escHandler);
      this._escHandler = null;
    }
  },

  _escapeHtml(str) {
    if (typeof str !== 'string') return str || '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },

  /* ---------- Simple Markdown Renderer for Notes ---------- */
    /* ---------- Simple Markdown Renderer for Notes ---------- */
    /* ---------- Simple Markdown Renderer for Notes ---------- */
  _renderMarkdown(text) {
    if (!text) return '';
    // Escape HTML first
    let html = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Links: [text](url)  (must be before bold/italic to avoid conflicts)
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');

    // Code blocks
    html = html.replace(/```(\w*)\n?([\s\S]*?)```/g, '<pre><code>$2</code></pre>');
    // Inline code
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
    
    // Bold
    html = html.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
    // Italic
    html = html.replace(/\*([^*\n]+)\*/g, '<em>$1</em>');

    // Blockquotes (> text)
    html = html.replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>');
    
    // Lists: - items
    html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*?<\/li>\n?)+/g, '<ul>$&</ul>');

    // LaTeX inline: $...$
    html = html.replace(/\$([^$\n]+)\$/g, '<span class="math-inline">$1</span>');
    // LaTeX display: $$...$$
    html = html.replace(/\$\$([\s\S]*?)\$\$/g, '<div class="math-block">$1</div>');

    // Paragraph breaks
    html = html.replace(/\n{2,}/g, '</p><p>');
    
    // Wrap in paragraph if not already wrapped
    if (!html.startsWith('<')) {
      html = '<p>' + html + '</p>';
    }
    
    // Clean up
    html = html.replace(/<p><\/p>/g, '');
    html = html.replace(/<li><\/li>/g, '');
    html = html.replace(/<ul>\s*<\/ul>/g, '');

    return html;
  },

};







