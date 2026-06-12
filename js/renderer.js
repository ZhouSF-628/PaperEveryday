/* ============================================================
   PaperEveryday - Renderer
   DOM rendering: sidebar, cards, modal, form
   ============================================================ */

const Renderer = {
  /* ---------- Sidebar ---------- */
  renderSidebar(domains, activeDomainId) {
    const sidebar = document.getElementById('sidebar');
    sidebar.innerHTML = '';

    // Domain section
    const section = document.createElement('div');
    section.className = 'sidebar-section';
    const label = document.createElement('div');
    label.className = 'sidebar-label';
    label.textContent = '研究领域';
    section.appendChild(label);
    sidebar.appendChild(section);

    domains.forEach(d => {
      const item = document.createElement('div');
      item.className = 'sidebar-item' + (d.id === activeDomainId ? ' active' : '');
      item.dataset.domain = d.id;
      item.innerHTML = `<span class="icon">${d.icon}</span> ${d.name}`;
      item.addEventListener('click', () => App.switchDomain(d.id));
      section.appendChild(item);
    });

    // Latest section
    const latestSection = document.createElement('div');
    latestSection.className = 'sidebar-section';
    const latestLabel = document.createElement('div');
    latestLabel.className = 'sidebar-label';
    latestLabel.textContent = '动态';
    latestSection.appendChild(latestLabel);
    sidebar.appendChild(latestSection);

    const latestItem = document.createElement('div');
    latestItem.className = 'sidebar-item' + ('latest' === activeDomainId ? ' active' : '');
    latestItem.dataset.domain = 'latest';
    latestItem.innerHTML = '<span class="icon">🔥</span> 最新动态';
    latestItem.addEventListener('click', () => App.switchDomain('latest'));
    latestSection.appendChild(latestItem);
  },

  /* ---------- Paper Cards Grid ---------- */
  renderPapers(papers, domainId) {
    const container = document.getElementById('papers-container');
    const title = document.getElementById('main-title');
    const domain = DataManager.getDomainById(domainId);

    if (domain) {
      title.textContent = `${domain.icon} ${domain.name}`;
    } else if (domainId === 'latest') {
      title.textContent = '🔥 最新动态';
    } else {
      title.textContent = '📄 全部论文';
    }

    if (!papers || papers.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📭</div>
          <div class="empty-text">还没有论文</div>
          <div class="empty-hint">点击上方「+ 添加论文」开始整理</div>
        </div>
      `;
      return;
    }

    const grid = document.createElement('div');
    grid.className = 'papers-grid';

    papers.forEach(paper => {
      grid.appendChild(this._createCard(paper, domainId));
    });

    container.innerHTML = '';
    container.appendChild(grid);
  },

  /* ---------- Single Card ---------- */
  _createCard(paper, domainId) {
    const card = document.createElement('div');
    card.className = 'paper-card';
    card.dataset.paperId = paper.id;

    // Stars
    const starsHtml = Array.from({ length: 5 }, (_, i) =>
      `<span class="${i < (paper.importance || 0) ? 'star' : 'star-empty'}">★</span>`
    ).join('');

    // Tags
    const tagsHtml = (paper.tags || []).map(t =>
      `<span class="tag ${t === 'foundational' || t === '代表作' ? 'tag-primary' : ''}">${t}</span>`
    ).join('');

    // Venue/year
    const metaParts = [];
    if (paper.year) metaParts.push(paper.year);
    if (paper.venue) metaParts.push(paper.venue);
    if (paper.authors) {
      const shortAuthors = paper.authors.split(',')[0] + (paper.authors.includes(',') ? ' et al.' : '');
      metaParts.unshift(shortAuthors);
    }

    card.innerHTML = `
      <div class="card-header">
        <div class="card-title">${this._escapeHtml(paper.title)}</div>
      </div>
      <div class="card-meta">${this._escapeHtml(metaParts.join(' · '))}</div>
      ${tagsHtml ? `<div class="card-tags">${tagsHtml}</div>` : ''}
      <div class="card-actions">
        <div class="card-stars">${starsHtml}</div>
        <div class="card-links">
          ${paper.link ? `<a href="${paper.link}" target="_blank" class="btn btn-sm" onclick="event.stopPropagation()">📄 论文</a>` : ''}
          <button class="btn-icon" onclick="event.stopPropagation(); App.deletePaper('${paper.id}')" title="删除">🗑️</button>
        </div>
      </div>
    `;

    card.addEventListener('click', () => App.showPaperDetail(paper.id));
    return card;
  },

  /* ---------- Paper Detail Modal ---------- */
  showPaperModal(paper) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'paper-modal';
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) this.closeModal();
    });

    const starsHtml = Array.from({ length: 5 }, (_, i) =>
      `<span class="${i < (paper.importance || 0) ? 'star' : 'star-empty'}">★</span>`
    ).join('');

    const tagsHtml = (paper.tags || []).map(t =>
      `<span class="tag ${t === 'foundational' || t === '代表作' ? 'tag-primary' : ''}">${t}</span>`
    ).join('');

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

          <div class="tabs" id="detail-tabs">
            <div class="tab active" data-tab="abstract">摘要</div>
            <div class="tab" data-tab="innovation">💡 创新点</div>
            <div class="tab" data-tab="results">📊 结果对比</div>
          </div>

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
        document.getElementById('tab-' + tab.dataset.tab).classList.add('active');
      });
    });

    // ESC to close
    this._escHandler = (e) => { if (e.key === 'Escape') this.closeModal(); };
    document.addEventListener('keydown', this._escHandler);
  },

  /* ---------- Latest Papers ---------- */
  renderLatest(latestData, domainKeywords) {
    const container = document.getElementById('papers-container');
    const title = document.getElementById('main-title');
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
          <div class="empty-hint">运行 GitHub Actions 或本地脚本从 ArXiv 拉取最新论文</div>
        </div>
      `;
      return;
    }

    const fetchDate = latestData.fetchedAt
      ? new Date(latestData.fetchedAt).toLocaleString('zh-CN')
      : '未知';

    // Filter to relevant domains using keywords
    const allKeywords = (DataManager.getDomains() || []).flatMap(d => d.keywords).map(k => k.toLowerCase());
    const filtered = latestData.papers.filter(p => {
      const text = (p.title + ' ' + (p.abstract || '')).toLowerCase();
      return allKeywords.some(kw => text.includes(kw));
    });

    const displayPapers = filtered.length > 0 ? filtered : latestData.papers;

    let html = `
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

    container.innerHTML = '';
    container.appendChild(grid);
  },

  showLatestDetail(paper) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'paper-modal';
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) this.closeModal();
    });

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
            <div class="field-label">年份</div>
            <div class="field-value">${paper.year || '—'}</div>
          </div>
          ${paper.arxivId ? `<div class="field">
            <div class="field-label">ArXiv ID</div>
            <div class="field-value">${paper.arxivId}</div>
          </div>` : ''}
          ${paper.link ? `<div class="field">
            <div class="field-label">链接</div>
            <div class="field-value"><a href="${paper.link}" target="_blank">${paper.link}</a></div>
          </div>` : ''}
          <div class="field">
            <div class="field-label">摘要</div>
            <div class="field-value abstract">${this._escapeHtml(paper.abstract || '暂无摘要')}</div>
          </div>
          <div class="form-actions" style="margin-top: 20px;">
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
      <div class="modal">
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

    // Form submit
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

      if (!data.title) {
        alert('请输入论文标题');
        return;
      }

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
  }
};
