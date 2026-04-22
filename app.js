/* ============================================================
   PM ROADMAP APP — Main Application
   Domo Custom App (Pro-Code) | AppDB + Jira Integration
   ============================================================ */

// ===== CONFIGURATION =====
const CONFIG = {
  collections: {
    projects: 'Projects',
    features: 'Features',
    jiraTickets: 'JiraTickets'
  },
  jiraProject: 'DOMO',
  jiraProxy: '/domo/proxy/jira',
  jiraBaseUrl: '/rest/api/2',
  customFields: {
    epicName: 'customfield_11001',
    epicLink: 'customfield_11000',
    squad: 'customfield_11200'
  },
  issueTypes: ['Epic', 'Story', 'Improvement', 'Bug', 'Mock'],
  statuses: ['Planned', 'In Progress', 'Done', 'Blocked'],
  squads: ['Visualizations', 'Content Distribution', 'Cross Platform'],
  itemTypes: ['Story', 'Bug', 'Improvement', 'MockUp', 'Epic'],
  // Map app item types to Jira issue types
  typeToJira: { Story: 'Story', Bug: 'Bug', Improvement: 'Improvement', MockUp: 'MockUp', Epic: 'Epic' },
  projectColors: [
    '#3b82f6', '#8b5cf6', '#ec4899', '#10b981',
    '#f59e0b', '#06b6d4', '#f97316', '#a855f7',
    '#14b8a6', '#e11d48'
  ],
  typeColors: {
    Epic: '#8b5cf6',
    Story: '#3b82f6',
    Bug: '#ef4444',
    Improvement: '#06b6d4',
    MockUp: '#9333ea'
  },
  typeIcons: {
    Epic: '\u26A1',
    Story: '\u{1F4D6}',
    Bug: '\u{1F41B}',
    Improvement: '\u2B06',
    MockUp: '\u{1F3A8}'
  },
  issueTypeColors: {
    Epic: '#8b5cf6',
    Story: '#3b82f6',
    Improvement: '#06b6d4',
    Bug: '#ef4444',
    Mock: '#ec4899'
  },
  issueTypeIcons: {
    Epic: '\u26A1',
    Story: '\u{1F4D6}',
    Improvement: '\u2B06',
    Bug: '\u{1F41B}',
    Mock: '\u{1F3A8}'
  },
  // App → Jira status transition IDs
  transitionMap: {
    'Planned->In Progress': '1351',
    'In Progress->Done': '1361',
    'Done->Closed': '1371',
    'Planned->Blocked': '1401',
    'In Progress->Blocked': '1401',
    'Done->Blocked': '1401',
    'Blocked->Planned': '1321',
    'Blocked->In Progress': '1351',
    'Done->In Progress': '1321',
    'Done->Planned': '1321',
    'In Progress->Planned': '1321'
  },
  // Jira → App status mapping
  jiraStatusToApp: {
    'Open': 'Planned',
    'To Do': 'Planned',
    'Concept': 'Planned',
    'In Progress': 'In Progress',
    'UX/Design': 'In Progress',
    'Ready for Dev': 'In Progress',
    'Prep': 'In Progress',
    'Pull Request': 'In Progress',
    'QA Planning': 'In Progress',
    'Resolved': 'Done',
    'Closed': 'Done',
    'On Hold': 'Blocked',
    'Blocked': 'Blocked'
  },
  jiraInstance: 'https://onjira.domo.com'
};

// ===== STATE =====
const state = {
  projects: [],
  features: [],
  jiraTickets: [],
  currentView: 'board',
  statusFilter: 'all',
  searchQuery: '',
  collapsedProjects: new Set(),
  collapsedEpics: new Set(),
  designEpicFilter: 'all',
  designEpicPopoverOpen: false,
  loading: true,
  useLocalStorage: false
};

// ===== UTILITIES =====
const Utils = {
  id() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  },

  formatDate(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  },

  formatDateFull(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  },

  formatDateInput(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toISOString().split('T')[0];
  },

  daysBetween(d1, d2) {
    const a = new Date(d1), b = new Date(d2);
    return Math.round((b - a) / 86400000);
  },

  isWeekend(date) {
    const d = new Date(date);
    return d.getDay() === 0 || d.getDay() === 6;
  },

  addDays(dateStr, n) {
    const d = new Date(dateStr);
    d.setDate(d.getDate() + n);
    return d.toISOString().split('T')[0];
  },

  escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },

  getProjectColor(index) {
    return CONFIG.projectColors[index % CONFIG.projectColors.length];
  },

  getStatusBadgeClass(status) {
    switch (status) {
      case 'Planned': return 'badge-planned';
      case 'In Progress': return 'badge-progress';
      case 'Done': return 'badge-done';
      case 'Blocked': return 'badge-blocked';
      default: return 'badge-planned';
    }
  },

  getPriorityClass(priority) {
    return 'badge-' + (priority || 'p3').toLowerCase();
  },

  getPriorityColor(priority) {
    const map = { P1: '#ef4444', P2: '#f97316', P3: '#eab308', P4: '#3b82f6', P5: '#6b7280' };
    return map[priority] || map.P3;
  },

  getTypeColor(type) {
    return CONFIG.typeColors[type] || '#6B7280';
  },

  getTypeBadgeClass(type) {
    return 'badge-type-' + (type || 'story').toLowerCase();
  },

  debounce(fn, ms) {
    let timer;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), ms);
    };
  },

  timeAgo(dateStr) {
    if (!dateStr) return '';
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (diff < 60) return 'just now';
    if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
    if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
    return Math.floor(diff / 86400) + 'd ago';
  }
};

// Sync state for a feature based on its tickets
function getFeatureSyncState(featureId) {
  const tickets = getFeatureTickets(featureId);
  if (tickets.length === 0) return null;
  const synced = tickets.filter(t => t.status === 'synced' && t.jiraKey);
  if (synced.length === 0) return { state: 'draft', lastSynced: null };
  const feature = state.features.find(f => f.id === featureId);
  const featureMod = feature && feature.lastModifiedAt ? new Date(feature.lastModifiedAt).getTime() : 0;
  const lastSync = Math.max(...synced.map(t => t.lastSyncedAt ? new Date(t.lastSyncedAt).getTime() : 0));
  const lastSyncStr = synced.reduce((best, t) => {
    if (!best) return t.lastSyncedAt;
    return (t.lastSyncedAt && t.lastSyncedAt > best) ? t.lastSyncedAt : best;
  }, null);
  if (featureMod > lastSync) return { state: 'local-changes', lastSynced: lastSyncStr };
  return { state: 'synced', lastSynced: lastSyncStr };
}

// ===== DATA SERVICE (AppDB with localStorage fallback) =====
const DataService = {
  basePath: '/domo/datastores/v1/collections',
  _initErrors: [],

  async init() {
    if (typeof domo === 'undefined' || !domo.get) {
      state.useLocalStorage = true;
      return;
    }

    // Step 1: Ensure collections exist by creating them (idempotent — ignores if already exists)
    const collectionNames = [CONFIG.collections.projects, CONFIG.collections.features, CONFIG.collections.jiraTickets];
    for (const name of collectionNames) {
      try {
        await domo.post('/domo/datastores/v1/collections', { name: name });
      } catch (e) {
        // 409 = already exists (good), anything else we log
        this._initErrors.push('create ' + name + ': ' + ((e && e.message) || e));
      }
    }

    // Step 2: Verify we can read from a collection
    try {
      await domo.get(`${this.basePath}/${CONFIG.collections.projects}/documents`);
      state.useLocalStorage = false;
      return;
    } catch (e) {
      this._initErrors.push('read: ' + ((e && e.message) || e));
    }

    // If read failed, fall back to localStorage
    state.useLocalStorage = true;
    console.warn('AppDB init errors:', this._initErrors);
  },

  _unwrap(resp) {
    if (!Array.isArray(resp)) return [];
    return resp.map(item => {
      if (item && item.content && typeof item.content === 'object') {
        return { ...item.content, _docId: item.id };
      }
      return item;
    });
  },

  _url(collection, docId) {
    const base = `${this.basePath}/${collection}/documents`;
    return docId != null ? `${base}/${docId}` : base;
  },

  async getAll(collection) {
    if (state.useLocalStorage) {
      const raw = localStorage.getItem('pmr_' + collection);
      return raw ? JSON.parse(raw) : [];
    }
    try {
      const resp = await domo.get(this._url(collection));
      return this._unwrap(resp);
    } catch {
      return [];
    }
  },

  async create(collection, doc) {
    doc.id = doc.id || Utils.id();
    if (state.useLocalStorage) {
      const items = await this.getAll(collection);
      items.push(doc);
      localStorage.setItem('pmr_' + collection, JSON.stringify(items));
      return doc;
    }
    const payload = { ...doc };
    delete payload._docId;
    try {
      const resp = await domo.post(this._url(collection), { content: payload });
      if (resp && resp.id != null) doc._docId = resp.id;
      return doc;
    } catch (e1) {
      // Retry without content wrapper
      try {
        const resp = await domo.post(this._url(collection), payload);
        if (resp && resp.id != null) doc._docId = resp.id;
        return doc;
      } catch (e2) {
        const msg = (e2 && e2.message) || (e1 && e1.message) || String(e1 || e2);
        console.error('AppDB create failed:', collection, e1, e2);
        return doc;
      }
    }
  },

  async update(collection, doc) {
    if (state.useLocalStorage) {
      const items = await this.getAll(collection);
      const idx = items.findIndex(i => i.id === doc.id);
      if (idx >= 0) items[idx] = { ...items[idx], ...doc };
      localStorage.setItem('pmr_' + collection, JSON.stringify(items));
      return doc;
    }
    const docId = doc._docId || doc.id;
    const payload = { ...doc };
    delete payload._docId;
    try {
      await domo.put(this._url(collection, docId), { content: payload });
      return doc;
    } catch {
      try {
        await domo.put(this._url(collection, docId), payload);
        return doc;
      } catch (e) {
        console.error('AppDB update failed:', collection, doc.id, e);
        return doc;
      }
    }
  },

  async remove(collection, id) {
    if (state.useLocalStorage) {
      let items = await this.getAll(collection);
      items = items.filter(i => i.id !== id);
      localStorage.setItem('pmr_' + collection, JSON.stringify(items));
      return true;
    }
    try {
      let docId = id;
      const allCollections = { Projects: state.projects, Features: state.features, JiraTickets: state.jiraTickets };
      const items = allCollections[collection] || [];
      const item = items.find(i => i.id === id);
      if (item && item._docId) docId = item._docId;
      await domo.delete(this._url(collection, docId));
      return true;
    } catch (e) {
      console.error('AppDB delete failed:', collection, id, e);
      return false;
    }
  }
};

// ===== JIRA SERVICE (via Code Engine) =====
const JiraService = {
  packageId: '6130b21a-b0c1-4462-8124-6684b7fbf3f8',
  functionName: 'jiraProxy',

  async _call(method, path, body) {
    const input = JSON.stringify({ method, path, body });
    const url = `/api/codeengine/v2/packages/${this.packageId}/versions/1.0.0/functions/${this.functionName}`;
    try {
      const resp = await domo.post(url, { inputVariables: { input: input } });
      // Code Engine wraps the result in an execution envelope
      const result = resp && resp.result != null ? resp.result : resp;
      if (result && result.error) {
        throw new Error('Jira ' + (result.status || '') + ': ' + (result.message || result.raw || ''));
      }
      if (resp && resp.status === 'FAILED') {
        throw new Error('Code Engine function failed: ' + (resp.errorInformation || 'unknown error'));
      }
      return result;
    } catch (e) {
      const msg = (e && e.message) || String(e);
      if (msg.startsWith('Jira ') || msg.startsWith('Code Engine')) throw e;
      throw new Error('Code Engine: ' + msg);
    }
  },

  async testConnection() {
    const me = await this._call('GET', '/myself');
    return { user: me, path: 'Code Engine' };
  },

  async createIssue(fields) {
    return this._call('POST', '/issue', { fields });
  },

  async createEpic(name, summary, squad) {
    const fields = {
      project: { key: CONFIG.jiraProject },
      summary: summary,
      issuetype: { name: 'Epic' },
      [CONFIG.customFields.epicName]: name
    };
    if (squad) fields[CONFIG.customFields.squad] = { value: squad };
    return this.createIssue(fields);
  },

  async createLinkedIssue(issueType, title, description, epicKey) {
    const fields = {
      project: { key: CONFIG.jiraProject },
      summary: title,
      issuetype: { name: issueType }
    };
    if (description) fields.description = description;
    if (epicKey) fields[CONFIG.customFields.epicLink] = epicKey;
    return this.createIssue(fields);
  },

  async pushTicket(ticket, epicKey) {
    const fields = {
      project: { key: CONFIG.jiraProject },
      summary: ticket.title,
      issuetype: { name: ticket.issueType }
    };
    if (ticket.description) fields.description = ticket.description;
    if (epicKey) fields[CONFIG.customFields.epicLink] = epicKey;
    if (ticket.squad) {
      try {
        fields[CONFIG.customFields.squad] = { value: ticket.squad };
        return await this.createIssue(fields);
      } catch (e) {
        // Retry without squad if rejected
        delete fields[CONFIG.customFields.squad];
        return this.createIssue(fields);
      }
    }
    return this.createIssue(fields);
  },

  async transitionIssue(jiraKey, transitionId) {
    return this._call('POST', `/issue/${jiraKey}/transitions`, {
      transition: { id: transitionId }
    });
  },

  async updateIssueFields(jiraKey, fields) {
    return this._call('PUT', `/issue/${jiraKey}`, { fields });
  },

  async getIssue(jiraKey) {
    return this._call('GET', `/issue/${jiraKey}`);
  },

  async searchIssues(query, issueTypeFilter) {
    let jql = 'project = ' + CONFIG.jiraProject;
    if (issueTypeFilter) jql += ' AND issuetype in (' + issueTypeFilter + ')';
    // Check if query is a Jira key pattern
    if (/^[A-Z]+-\d+$/i.test(query.trim())) {
      jql += ' AND key = "' + query.trim().toUpperCase() + '"';
    } else if (query.trim()) {
      jql += ' AND text ~ "' + query.trim().replace(/"/g, '\\"') + '"';
    }
    jql += ' ORDER BY updated DESC';
    const encoded = encodeURIComponent(jql);
    return this._call('GET', '/search?jql=' + encoded + '&fields=summary,description,status,issuetype&maxResults=10');
  }
};

// ===== TOAST SYSTEM =====
const Toast = {
  show(message, type = 'info', duration = 4000) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = Utils.escapeHtml(message);
    // Click to dismiss
    toast.style.cursor = 'pointer';
    toast.addEventListener('click', () => {
      toast.classList.add('toast-exit');
      setTimeout(() => toast.remove(), 200);
    });
    container.appendChild(toast);
    setTimeout(() => {
      if (toast.parentNode) {
        toast.classList.add('toast-exit');
        setTimeout(() => toast.remove(), 200);
      }
    }, duration);
  },
  success(msg) { this.show(msg, 'success', 5000); },
  error(msg) { this.show(msg, 'error', 30000); },
  info(msg) { this.show(msg, 'info', 5000); },
  warning(msg) { this.show(msg, 'warning', 15000); }
};

// ===== MODAL SYSTEM =====
const Modal = {
  open(html, opts = {}) {
    const root = document.getElementById('modal-root');
    root.innerHTML = `
      <div class="modal-overlay" data-action="modal-close-overlay">
        <div class="modal ${opts.className || ''}" onclick="event.stopPropagation()">
          ${html}
        </div>
      </div>`;
    const overlay = root.querySelector('.modal-overlay');
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) Modal.close();
    });
    root.querySelectorAll('[data-action="modal-close"]').forEach(btn => {
      btn.addEventListener('click', () => Modal.close());
    });
    if (opts.onOpen) opts.onOpen(root.querySelector('.modal'));
    return root.querySelector('.modal');
  },

  close() {
    document.getElementById('modal-root').innerHTML = '';
  },

  confirm(message, onConfirm) {
    this.open(`
      <div class="modal-header">
        <div class="modal-title">Confirm</div>
        <button class="modal-close" data-action="modal-close">&times;</button>
      </div>
      <div class="modal-body">
        <p class="confirm-message">${Utils.escapeHtml(message)}</p>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" data-action="modal-close">Cancel</button>
        <button class="btn btn-danger" id="confirm-yes">Delete</button>
      </div>
    `, {
      className: 'confirm-dialog',
      onOpen(modal) {
        modal.querySelector('#confirm-yes').addEventListener('click', () => {
          Modal.close();
          onConfirm();
        });
      }
    });
  }
};

// ===== HEADER RENDERING =====
function renderHeader() {
  const totalProjects = state.projects.length;
  const totalFeatures = state.features.length;
  const doneFeatures = state.features.filter(f => f.status === 'Done').length;
  const completionPct = totalFeatures > 0 ? Math.round((doneFeatures / totalFeatures) * 100) : 0;

  return `
    <header class="app-header">
      <div class="app-logo">
        <div class="logo-icon">R</div>
        <span>PM Roadmap</span>
      </div>
      <div class="header-stats">
        <div class="stat-item">
          <span class="stat-value accent">${totalProjects}</span>
          <span>Projects</span>
        </div>
        <div class="stat-item">
          <span class="stat-value">${totalFeatures}</span>
          <span>Features</span>
        </div>
        <div class="stat-item">
          <span class="stat-value success">${completionPct}%</span>
          <span>Complete</span>
        </div>
      </div>
      <div class="header-actions">
        <div class="tabs">
          <button class="tab ${state.currentView === 'board' ? 'active' : ''}" data-action="set-view" data-view="board">Roadmap</button>
          <button class="tab ${state.currentView === 'design' ? 'active' : ''}" data-action="set-view" data-view="design">Design Board</button>
          <button class="tab ${state.currentView === 'gantt' ? 'active' : ''}" data-action="set-view" data-view="gantt">Gantt</button>
        </div>
        <button class="btn btn-secondary btn-sm" data-action="test-jira" title="Test Jira connection">Test Jira</button>
        <button class="btn btn-secondary btn-sm" data-action="refresh-all" title="Refresh all from Jira">&#x1F504; Refresh</button>
        <button class="btn btn-primary" data-action="add-project">+ Project</button>
      </div>
    </header>`;
}

// ===== TOOLBAR =====
function renderToolbar() {
  return `
    <div class="toolbar">
      <div class="toolbar-search">
        <span class="search-icon">&#128269;</span>
        <input type="text" placeholder="Search projects & features..."
          value="${Utils.escapeHtml(state.searchQuery)}"
          data-action="search-input">
      </div>
      <select class="filter-select" data-action="status-filter">
        <option value="all" ${state.statusFilter === 'all' ? 'selected' : ''}>All Statuses</option>
        <option value="Planned" ${state.statusFilter === 'Planned' ? 'selected' : ''}>Planned</option>
        <option value="In Progress" ${state.statusFilter === 'In Progress' ? 'selected' : ''}>In Progress</option>
        <option value="Done" ${state.statusFilter === 'Done' ? 'selected' : ''}>Done</option>
        <option value="Blocked" ${state.statusFilter === 'Blocked' ? 'selected' : ''}>Blocked</option>
      </select>
      <div class="toolbar-spacer"></div>
      <button class="btn btn-secondary btn-sm" data-action="toggle-collapse-all">
        ${state.collapsedProjects.size > 0 ? 'Expand All' : 'Collapse All'}
      </button>
    </div>`;
}

// ===== BOARD VIEW =====
function renderBoardView() {
  const projects = getFilteredProjects();

  if (projects.length === 0) {
    return `
      <div class="board-view">
        <div class="empty-state">
          <div class="empty-state-icon">&#128506;</div>
          <div class="empty-state-title">No projects yet</div>
          <div class="empty-state-desc">Create your first project to start planning your roadmap.</div>
          <button class="btn btn-primary btn-lg" data-action="add-project">+ New Project</button>
        </div>
      </div>`;
  }

  return `
    <div class="board-view">
      <div class="page-header">
        <div class="page-title">AI, Apps, BI, and Semantic Roadmap</div>
        <div class="page-subtitle">Projects start collapsed to reduce noise when each one contains many items.</div>
      </div>
      ${projects.map((project, index) => renderProjectGroup(project, index)).join('')}
    </div>`;
}

function renderProjectGroup(project, index) {
  const features = getProjectFeatures(project.id);
  const filtered = filterFeatures(features);
  const doneCount = features.filter(f => f.status === 'Done').length;
  const pct = features.length > 0 ? Math.round((doneCount / features.length) * 100) : 0;
  const color = Utils.getProjectColor(index);
  const isCollapsed = state.collapsedProjects.has(project.id);
  const draftCount = getDraftCountForProject(project.id);

  const epicCount = filtered.filter(f => f.type === 'Epic').length;
  const otherCount = filtered.filter(f => f.type !== 'Epic' && !f.parentEpicId).length;

  return `
    <div class="project-group ${isCollapsed ? 'collapsed' : ''}" data-project-id="${project.id}">
      <div class="project-header" data-action="toggle-project" data-project-id="${project.id}">
        <div class="project-header-top">
          <button class="project-collapse-icon">${isCollapsed ? '&#9656;' : '&#9662;'}</button>
          <span class="project-color-dot" style="background:${color}"></span>
          <span class="project-name">${Utils.escapeHtml(project.name)}</span>
          <span class="badge ${Utils.getStatusBadgeClass(project.status)}">${project.status}</span>
          <div class="project-header-actions">
            <button class="btn-icon" data-action="move-project-up" data-project-id="${project.id}" title="Move up">&#8593;</button>
            <button class="btn-icon" data-action="move-project-down" data-project-id="${project.id}" title="Move down">&#8595;</button>
            <button class="btn-icon" data-action="refresh-project" data-project-id="${project.id}" title="Refresh from Jira">&#x1F504;</button>
            <button class="btn-icon" data-action="edit-project" data-project-id="${project.id}" title="Edit project">&#9998;</button>
            <button class="btn-icon" data-action="delete-project" data-project-id="${project.id}" title="Delete project">&#128465;</button>
          </div>
        </div>
        ${project.description ? `<div class="project-description">${Utils.escapeHtml(project.description)}</div>` : ''}
        <div class="project-count-pills">
          <span class="count-pill count-pill-epic">${epicCount} epic${epicCount !== 1 ? 's' : ''}</span>
          <span class="count-pill count-pill-other">${otherCount} standalone item${otherCount !== 1 ? 's' : ''}</span>
          ${isCollapsed ? '<span class="expand-hint">Expand to view details</span>' : ''}
        </div>
      </div>
      <div class="project-body-wrap ${isCollapsed ? 'collapsed' : ''}">
        <div class="project-body">${renderTwoLanes(filtered, project)}</div>
      </div>
    </div>`;
}

function renderTwoLanes(items, project) {
  const epics = items.filter(f => f.type === 'Epic').sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  const otherItems = items.filter(f => f.type !== 'Epic' && !f.parentEpicId).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  const epicCount = epics.length;
  const otherCount = otherItems.length;

  return `
    <div class="lane">
      <div class="lane-header">
        <span class="lane-label">EPICS</span>
        <span class="lane-count">${epicCount}</span>
        <div class="lane-actions" style="position:relative">
          <div class="split-btn">
            <span class="split-main" data-action="add-epic" data-project-id="${project.id}">+ Add Epic</span>
            <span class="split-arrow" data-action="toggle-add-menu" data-menu-id="epic-menu-${project.id}">&#9662;</span>
          </div>
          <div class="add-menu hidden" id="epic-menu-${project.id}">
            <div class="menu-item" data-action="add-epic" data-project-id="${project.id}">
              <span class="menu-icon">＋</span>
              <div><div class="menu-main">Create new epic</div><div class="menu-hint">Draft a new epic in the roadmap.</div></div>
            </div>
            <div class="menu-divider"></div>
            <div class="menu-item" data-action="link-epic" data-project-id="${project.id}">
              <span class="menu-icon">&#128279;</span>
              <div><div class="menu-main">Link existing Jira epic</div><div class="menu-hint">Pull in an epic that's already in Jira.</div></div>
            </div>
          </div>
        </div>
      </div>
      <div class="lane-body">
        ${epicCount > 0 ? epics.map(epic => renderEpicContainer(epic, items, project)).join('') : `
          <div class="lane-empty">No epics yet — add one to group related items</div>
        `}
      </div>
    </div>
    <div class="lane">
      <div class="lane-header">
        <span class="lane-label">STANDALONE ITEMS</span>
        <span class="lane-count">${otherCount}</span>
        <div class="lane-actions">
          <button class="btn btn-sm btn-secondary" data-action="add-other-item" data-project-id="${project.id}">+ Add</button>
        </div>
      </div>
      <div class="lane-body">
        ${otherCount > 0 ? otherItems.map(item => renderItemRow(item, true)).join('') : `
          <div class="lane-empty">No other items</div>
        `}
      </div>
    </div>`;
}

function renderEpicContainer(epic, allItems, project) {
  const children = allItems.filter(f => f.parentEpicId === epic.id && f.type !== 'Epic').sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  const isCollapsed = state.collapsedEpics.has(epic.id);
  const typeColor = Utils.getTypeColor('Epic');

  return `
    <div class="epic-container" data-epic-id="${epic.id}">
      <div class="epic-header" data-action="toggle-epic" data-feature-id="${epic.id}">
        <span class="epic-caret ${isCollapsed ? 'collapsed' : ''}">${isCollapsed ? '&#9656;' : '&#9662;'}</span>
        <div class="epic-content">
          <div class="epic-title-row">
            <span class="epic-title">${Utils.escapeHtml(epic.name)}</span>
            <span class="epic-child-count ${children.length === 0 ? 'empty' : ''}">${children.length} child${children.length !== 1 ? 'ren' : ''}</span>
            ${epic.source === 'linked' ? '<span class="link-badge">&#128279; Linked</span>' : ''}
          </div>
          ${epic.description ? `<div class="epic-desc">${Utils.escapeHtml(epic.description)}</div>` : ''}
        </div>
        <div class="epic-meta-right">
          <span class="badge ${Utils.getStatusBadgeClass(epic.status)}">${epic.status}</span>
          ${epic.squad ? `<span class="epic-meta">${Utils.escapeHtml(epic.squad)}</span>` : ''}
          ${epic.jiraKey ? `<a class="jira-item-link" href="${CONFIG.jiraInstance}/browse/${Utils.escapeHtml(epic.jiraKey)}">${Utils.escapeHtml(epic.jiraKey)}</a>` : ''}
          ${epic.mockLink ? `<a class="tag-pill" href="${Utils.escapeHtml(epic.mockLink)}" title="${Utils.escapeHtml(epic.mockLink)}">Mock</a>` : ''}
        </div>
        <div class="epic-header-actions">
          <button class="btn-icon" data-action="move-item-up" data-feature-id="${epic.id}" title="Move up">&#8593;</button>
          <button class="btn-icon" data-action="move-item-down" data-feature-id="${epic.id}" title="Move down">&#8595;</button>
          <button class="btn-icon" data-action="edit-feature" data-feature-id="${epic.id}" title="Edit">&#9998;</button>
          <button class="btn-icon" data-action="delete-item" data-feature-id="${epic.id}" title="Delete">&#128465;</button>
        </div>
      </div>
      ${isCollapsed ? '' : `<div class="epic-body">
        ${children.length > 0 ? children.map(child => renderItemRow(child)).join('') : `
          <div class="epic-empty">No child items — add stories, bugs, or improvements</div>
        `}
        <div class="add-child-wrap" style="position:relative">
          <div class="add-child-card" data-action="toggle-add-menu" data-menu-id="child-menu-${epic.id}">
            + Add child item &#9662;
          </div>
          <div class="add-menu hidden" id="child-menu-${epic.id}">
            <div class="menu-item" data-action="add-child-item" data-project-id="${epic.projectId}" data-epic-id="${epic.id}">
              <span class="menu-icon">＋</span>
              <div><div class="menu-main">Create new child item</div><div class="menu-hint">Draft a new story, bug, improvement, or mockup.</div></div>
            </div>
            <div class="menu-divider"></div>
            <div class="menu-item" data-action="link-child" data-project-id="${epic.projectId}" data-epic-id="${epic.id}">
              <span class="menu-icon">&#128279;</span>
              <div><div class="menu-main">Link existing Jira ticket</div><div class="menu-hint">Pull in an existing Jira story, bug, or improvement.</div></div>
            </div>
          </div>
        </div>
      </div>`}
    </div>`;
}

function renderItemRow(feature, isStandalone) {
  const itemType = feature.type || 'Story';

  return `
    <div class="item-row ${isStandalone ? 'item-row-standalone' : ''}" data-action="edit-feature" data-feature-id="${feature.id}">
      <div class="item-row-type" data-type="${itemType}">${itemType}</div>
      <div class="item-row-name">${Utils.escapeHtml(feature.name)}${feature.source === 'linked' ? ' <span class="link-badge">&#128279;</span>' : ''}</div>
      <div class="item-row-status"><span class="badge ${Utils.getStatusBadgeClass(feature.status)}">${feature.status || ''}</span></div>
      <div class="item-row-squad">${feature.squad ? Utils.escapeHtml(feature.squad) : '--'}</div>
      <div class="item-row-dates">${feature.startDate ? Utils.formatDate(feature.startDate) + '  ' + Utils.formatDate(feature.endDate) : '-- --'}</div>
      <div class="item-row-tag">
        ${feature.mockLink ? `<a class="tag-pill" href="${Utils.escapeHtml(feature.mockLink)}" title="${Utils.escapeHtml(feature.mockLink)}">Mock</a>` : ''}
      </div>
      <div class="item-row-jira">
        ${feature.jiraKey ? `<a class="jira-item-link" href="${CONFIG.jiraInstance}/browse/${Utils.escapeHtml(feature.jiraKey)}">${Utils.escapeHtml(feature.jiraKey)}</a>` : ''}
      </div>
      <div class="item-row-actions">
        <button class="btn-icon" data-action="move-item-up" data-feature-id="${feature.id}" title="Move up">&#9650;</button>
        <button class="btn-icon" data-action="move-item-down" data-feature-id="${feature.id}" title="Move down">&#9660;</button>
        <button class="btn-icon" data-action="edit-feature" data-feature-id="${feature.id}" title="Edit">&#9998;</button>
      </div>
    </div>`;
}

// ===== GANTT VIEW =====
function renderGanttView() {
  const projects = getFilteredProjects();
  const allFeatures = [];
  projects.forEach(p => {
    const feats = filterFeatures(getProjectFeatures(p.id));
    feats.forEach(f => allFeatures.push({ ...f, _project: p }));
  });

  const datedFeatures = allFeatures.filter(f => f.startDate && f.endDate);

  if (datedFeatures.length === 0) {
    return `
      <div class="gantt-view">
        <div class="empty-state">
          <div class="empty-state-icon">&#128197;</div>
          <div class="empty-state-title">No timeline data</div>
          <div class="empty-state-desc">Add features with start and end dates to see the Gantt chart.</div>
        </div>
      </div>`;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split('T')[0];

  let minDate = new Date(datedFeatures[0].startDate);
  let maxDate = new Date(datedFeatures[0].endDate);
  datedFeatures.forEach(f => {
    const s = new Date(f.startDate), e = new Date(f.endDate);
    if (s < minDate) minDate = s;
    if (e > maxDate) maxDate = e;
  });
  if (today < minDate) minDate = new Date(today);
  if (today > maxDate) maxDate = new Date(today);

  // Pad by 14 days each side
  minDate.setDate(minDate.getDate() - 14);
  maxDate.setDate(maxDate.getDate() + 14);
  // Snap to month start
  minDate.setDate(1);

  const startDate = new Date(minDate);
  const totalDays = Utils.daysBetween(startDate, maxDate) + 1;
  const dayWidth = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--gantt-day-width')) || 32;
  const totalWidth = totalDays * dayWidth;

  // Build rows: project headers + feature rows
  const rows = [];
  projects.forEach((p, pi) => {
    const feats = filterFeatures(getProjectFeatures(p.id)).filter(f => f.startDate && f.endDate);
    if (feats.length === 0) return;
    rows.push({ type: 'project', project: p, index: pi });
    feats.forEach(f => rows.push({ type: 'feature', feature: f, project: p, index: pi }));
  });

  // Build month headers
  const months = [];
  const cur = new Date(startDate);
  while (cur <= maxDate) {
    const monthStart = new Date(cur);
    const monthEnd = new Date(cur.getFullYear(), cur.getMonth() + 1, 0);
    const endClamp = monthEnd > maxDate ? maxDate : monthEnd;
    const dayOffset = Utils.daysBetween(startDate, monthStart);
    const span = Utils.daysBetween(monthStart, endClamp) + 1;
    months.push({
      label: monthStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      offset: dayOffset,
      span: span
    });
    cur.setMonth(cur.getMonth() + 1);
    cur.setDate(1);
  }

  // Build day cells
  const dayCells = [];
  for (let i = 0; i < totalDays; i++) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    const ds = d.toISOString().split('T')[0];
    dayCells.push({
      label: d.getDate(),
      isWeekend: Utils.isWeekend(d),
      isToday: ds === todayStr,
      date: ds
    });
  }

  const todayOffset = Utils.daysBetween(startDate, today);

  return `
    <div class="gantt-view">
      <div class="gantt-container">
        <div class="gantt-labels" id="gantt-labels">
          <div class="gantt-labels-header">Features</div>
          ${rows.map(r => {
            if (r.type === 'project') {
              const color = Utils.getProjectColor(r.index);
              return `<div class="gantt-label-row project-row">
                <span class="label-color-dot" style="background:${color}"></span>
                <span class="label-text">${Utils.escapeHtml(r.project.name)}</span>
              </div>`;
            }
            const f = r.feature;
            return `<div class="gantt-label-row" data-action="edit-feature" data-feature-id="${f.id}">
              <span class="label-text" style="padding-left:16px">${Utils.escapeHtml(f.name)}</span>
              <span class="label-badge badge-type" style="background:${Utils.getTypeColor(f.type || 'Story')}20;color:${Utils.getTypeColor(f.type || 'Story')}">${f.type || 'Story'}</span>
            </div>`;
          }).join('')}
        </div>
        <div class="gantt-timeline" id="gantt-timeline">
          <div class="gantt-timeline-inner" style="width:${totalWidth}px">
            <div class="gantt-time-header">
              <div class="gantt-months-row">
                ${months.map(m => `<div class="gantt-month-cell" style="width:${m.span * dayWidth}px">${m.label}</div>`).join('')}
              </div>
              <div class="gantt-days-row">
                ${dayCells.map(d => `<div class="gantt-day-cell ${d.isWeekend ? 'weekend' : ''} ${d.isToday ? 'today' : ''}">${d.label}</div>`).join('')}
              </div>
            </div>
            <div class="gantt-rows">
              ${dayCells.filter(d => d.isWeekend).map(d => {
                const idx = dayCells.indexOf(d);
                return `<div class="gantt-weekend-col" style="left:${idx * dayWidth}px"></div>`;
              }).join('')}
              ${todayOffset >= 0 && todayOffset < totalDays ? `<div class="gantt-today-marker" style="left:${todayOffset * dayWidth + dayWidth / 2}px"></div>` : ''}
              ${rows.map((r, ri) => {
                if (r.type === 'project') {
                  // Project summary bar (min start to max end of its features)
                  const feats = filterFeatures(getProjectFeatures(r.project.id)).filter(f => f.startDate && f.endDate);
                  if (feats.length === 0) return `<div class="gantt-row project-row"></div>`;
                  let ps = new Date(feats[0].startDate), pe = new Date(feats[0].endDate);
                  feats.forEach(f => {
                    const s = new Date(f.startDate), e = new Date(f.endDate);
                    if (s < ps) ps = s;
                    if (e > pe) pe = e;
                  });
                  const left = Utils.daysBetween(startDate, ps) * dayWidth;
                  const width = (Utils.daysBetween(ps, pe) + 1) * dayWidth;
                  const color = Utils.getProjectColor(r.index);
                  return `<div class="gantt-row project-row">
                    <div class="gantt-bar project-bar" style="left:${left}px;width:${width}px;background:${color}"></div>
                  </div>`;
                }
                const f = r.feature;
                const left = Utils.daysBetween(startDate, new Date(f.startDate)) * dayWidth;
                const width = (Utils.daysBetween(new Date(f.startDate), new Date(f.endDate)) + 1) * dayWidth;
                const color = Utils.getProjectColor(r.index);
                return `<div class="gantt-row">
                  <div class="gantt-bar" style="left:${left}px;width:${width}px;background:${color}"
                    data-action="edit-feature" data-feature-id="${f.id}"
                    data-tooltip-name="${Utils.escapeHtml(f.name)}"
                    data-tooltip-project="${Utils.escapeHtml(r.project.name)}"
                    data-tooltip-dates="${Utils.formatDateFull(f.startDate)} — ${Utils.formatDateFull(f.endDate)}"
                    data-tooltip-status="${f.status}"
                    data-tooltip-priority="${f.priority || 'P3'}">
                    ${width > 80 ? Utils.escapeHtml(f.name) : ''}
                  </div>
                </div>`;
              }).join('')}
            </div>
          </div>
        </div>
      </div>
    </div>`;
}

// ===== MODALS: PROJECT =====
function openProjectModal(projectId) {
  const isEdit = !!projectId;
  const project = isEdit ? state.projects.find(p => p.id === projectId) : {};

  Modal.open(`
    <div class="modal-header">
      <div class="modal-title">${isEdit ? 'Edit Project' : 'New Project'}</div>
      <button class="modal-close" data-action="modal-close">&times;</button>
    </div>
    <div class="modal-body">
      <div class="form-group">
        <label class="form-label">Project Name</label>
        <input class="form-input" id="proj-name" placeholder="e.g. Platform Modernization"
          value="${Utils.escapeHtml(project.name || '')}">
      </div>
      <div class="form-group">
        <label class="form-label">Description</label>
        <textarea class="form-textarea" id="proj-desc" placeholder="What is this project about?"
          rows="3">${Utils.escapeHtml(project.description || '')}</textarea>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Status</label>
          <select class="form-select" id="proj-status">
            ${CONFIG.statuses.map(s => `<option value="${s}" ${project.status === s ? 'selected' : ''}>${s}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Squad</label>
          <select class="form-select" id="proj-squad">
            <option value="">— None —</option>
            ${CONFIG.squads.map(s => `<option value="${s}" ${project.squad === s ? 'selected' : ''}>${s}</option>`).join('')}
          </select>
        </div>
      </div>
      ${!isEdit ? `
        <div class="form-group">
          <label class="form-checkbox">
            <input type="checkbox" id="proj-create-epic">
            Create Epic in Jira (${CONFIG.jiraProject} project)
          </label>
        </div>` : ''}
    </div>
    <div class="modal-footer">
      ${isEdit ? '<div class="modal-footer-left"><button class="btn btn-danger" id="proj-delete">Delete Project</button></div>' : ''}
      <button class="btn btn-secondary" data-action="modal-close">Cancel</button>
      <button class="btn btn-primary" id="proj-save">${isEdit ? 'Save Changes' : 'Create Project'}</button>
    </div>
  `, {
    onOpen(modal) {
      modal.querySelector('#proj-name').focus();

      modal.querySelector('#proj-save').addEventListener('click', async () => {
        const name = modal.querySelector('#proj-name').value.trim();
        if (!name) { Toast.warning('Project name is required'); return; }

        const now = new Date().toISOString();
        const doc = {
          id: isEdit ? project.id : Utils.id(),
          _docId: isEdit ? project._docId : undefined,
          name,
          description: modal.querySelector('#proj-desc').value.trim(),
          status: modal.querySelector('#proj-status').value,
          squad: modal.querySelector('#proj-squad').value,
          epicKey: isEdit ? (project.epicKey || '') : '',
          createdAt: isEdit ? project.createdAt : now,
          updatedAt: now
        };

        // Create Jira Epic if checked
        const epicCheckbox = modal.querySelector('#proj-create-epic');
        if (epicCheckbox && epicCheckbox.checked) {
          try {
            Toast.info('Creating Epic in Jira...');
            let result;
            try {
              result = await JiraService.createEpic(name, name, doc.squad);
            } catch (squadErr) {
              // Retry without squad if it failed
              if (doc.squad) {
                result = await JiraService.createEpic(name, name, null);
                Toast.warning('Epic created but squad was rejected by Jira');
              } else {
                throw squadErr;
              }
            }
            doc.epicKey = result.key;
            Toast.success('Epic created: ' + result.key);
          } catch (e) {
            Toast.error('Epic creation failed: ' + e.message);
          }
        }

        if (isEdit) {
          await DataService.update(CONFIG.collections.projects, doc);
          const idx = state.projects.findIndex(p => p.id === doc.id);
          if (idx >= 0) state.projects[idx] = doc;
          // Sync name/description to Jira Epic if it exists
          if (doc.epicKey) {
            const nameChanged = name !== (project.name || '');
            const descChanged = doc.description !== (project.description || '');
            if (nameChanged || descChanged) {
              try {
                const fields = {};
                if (nameChanged) { fields.summary = name; fields[CONFIG.customFields.epicName] = name; }
                if (descChanged) fields.description = doc.description;
                await JiraService.updateIssueFields(doc.epicKey, fields);
                Toast.success('Project and Jira Epic updated');
              } catch (e) {
                Toast.warning('Project saved but Jira Epic update failed');
              }
            } else {
              Toast.success('Project updated');
            }
          } else {
            Toast.success('Project updated');
          }
        } else {
          await DataService.create(CONFIG.collections.projects, doc);
          state.projects.push(doc);
          Toast.success('Project created');
        }
        Modal.close();
        render();
      });

      if (isEdit) {
        modal.querySelector('#proj-delete').addEventListener('click', () => {
          Modal.close();
          Modal.confirm('This removes the project and its epics and items from the roadmap. Jira tickets linked to this project will remain in Jira.', async () => {
            const feats = getProjectFeatures(project.id);
            for (const f of feats) {
              const tickets = getFeatureTickets(f.id);
              for (const t of tickets) {
                await DataService.remove(CONFIG.collections.jiraTickets, t.id);
                state.jiraTickets = state.jiraTickets.filter(x => x.id !== t.id);
              }
              await DataService.remove(CONFIG.collections.features, f.id);
              state.features = state.features.filter(x => x.id !== f.id);
            }
            await DataService.remove(CONFIG.collections.projects, project.id);
            state.projects = state.projects.filter(p => p.id !== project.id);
            Toast.success('Project deleted');
            render();
          });
        });
      }
    }
  });
}

// ===== MODALS: FEATURE (with Jira Panel) =====
// ===== LINK EXISTING JIRA MODAL =====
function openLinkJiraModal(projectId, opts) {
  opts = opts || {};
  const isEpic = opts.isEpic || false;
  const parentEpicId = opts.parentEpicId || '';
  const project = state.projects.find(p => p.id === projectId);
  const title = isEpic ? 'Link existing Jira epic' : 'Link existing Jira ticket';
  const subtitle = isEpic
    ? 'Find an epic already in Jira and add it to this project.'
    : 'Find a story, bug, or improvement already in Jira and add it as a child of this epic.';
  const issueTypeFilter = isEpic ? 'Epic' : 'Story, Bug, Improvement, MockUp';
  let selectedIssue = null;

  Modal.open(`
    <div class="modal-header">
      <div class="modal-title">${title}</div>
      <button class="modal-close" data-action="modal-close">&times;</button>
    </div>
    <div class="modal-body">
      <p style="font-size:12px;color:#5a5a5a;margin-bottom:14px">${subtitle}</p>
      <div class="form-group">
        <label class="form-label">Search</label>
        <input class="form-input" id="link-search" placeholder="Paste DOMO-XXXXX or search by title...">
      </div>
      <div id="link-results" class="link-results"></div>
      <div id="link-confirm" class="link-confirm hidden"></div>
      <div id="link-error" class="link-error hidden"></div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" data-action="modal-close">Cancel</button>
      <button class="btn btn-primary" id="link-submit" disabled>${isEpic ? 'Link Epic' : 'Link Ticket'}</button>
    </div>
  `, {
    onOpen(modal) {
      const searchInput = modal.querySelector('#link-search');
      const resultsDiv = modal.querySelector('#link-results');
      const confirmDiv = modal.querySelector('#link-confirm');
      const errorDiv = modal.querySelector('#link-error');
      const submitBtn = modal.querySelector('#link-submit');

      searchInput.focus();

      const doSearch = Utils.debounce(async (query) => {
        if (!query || query.length < 2) { resultsDiv.innerHTML = ''; return; }
        resultsDiv.innerHTML = '<div style="padding:8px;color:#94a3b8;font-size:12px">Searching...</div>';
        errorDiv.classList.add('hidden');
        try {
          const resp = await JiraService.searchIssues(query, issueTypeFilter);
          const issues = resp.issues || [];
          if (issues.length === 0) {
            resultsDiv.innerHTML = '<div style="padding:8px;color:#94a3b8;font-size:12px">No results found</div>';
            return;
          }
          resultsDiv.innerHTML = issues.map(issue => {
            const statusName = issue.fields && issue.fields.status ? issue.fields.status.name : '';
            const appStatus = CONFIG.jiraStatusToApp[statusName] || 'Planned';
            return '<div class="link-result-row" data-key="' + Utils.escapeHtml(issue.key) + '">' +
              '<span class="link-result-key">' + Utils.escapeHtml(issue.key) + '</span>' +
              '<span class="link-result-title">' + Utils.escapeHtml(issue.fields.summary) + '</span>' +
              '<span class="badge ' + Utils.getStatusBadgeClass(appStatus) + '">' + Utils.escapeHtml(appStatus) + '</span>' +
            '</div>';
          }).join('');

          resultsDiv.querySelectorAll('.link-result-row').forEach(row => {
            row.addEventListener('click', () => {
              resultsDiv.querySelectorAll('.link-result-row').forEach(r => r.classList.remove('selected'));
              row.classList.add('selected');
              const key = row.dataset.key;
              selectedIssue = issues.find(i => i.key === key);
              confirmDiv.innerHTML = '\u2713 Will pull title, description, and status from Jira';
              confirmDiv.classList.remove('hidden');
              submitBtn.disabled = false;
            });
          });
        } catch (e) {
          resultsDiv.innerHTML = '';
          errorDiv.textContent = "Couldn't reach Jira. Please try again.";
          errorDiv.classList.remove('hidden');
        }
      }, 300);

      searchInput.addEventListener('input', (e) => {
        selectedIssue = null;
        submitBtn.disabled = true;
        confirmDiv.classList.add('hidden');
        doSearch(e.target.value);
      });

      submitBtn.addEventListener('click', async () => {
        if (!selectedIssue) { Toast.warning('No issue selected'); return; }
        try {
          const fields = selectedIssue.fields || {};
          const statusName = fields.status ? fields.status.name : '';
          const appStatus = CONFIG.jiraStatusToApp[statusName] || 'Planned';
          const issueType = fields.issuetype ? fields.issuetype.name : 'Story';
          const appType = isEpic ? 'Epic' : (Object.keys(CONFIG.typeToJira).find(k => CONFIG.typeToJira[k] === issueType) || issueType);

          const now = new Date().toISOString();
          const doc = {
            id: Utils.id(),
            projectId: projectId,
            parentEpicId: parentEpicId,
            name: fields.summary || selectedIssue.key,
            description: (typeof fields.description === 'string') ? fields.description : '',
            status: appStatus,
            type: isEpic ? 'Epic' : appType,
            squad: project ? (project.squad || '') : '',
            startDate: null,
            endDate: null,
            jiraKey: selectedIssue.key,
            source: 'linked',
            mockLink: '',
            featureSwitch: '',
            createdAt: now,
            lastModifiedAt: now
          };

          await DataService.create(CONFIG.collections.features, doc);
          state.features.push(doc);
          Toast.success('Linked: ' + selectedIssue.key);
          Modal.close();
          render();
        } catch (err) {
          Toast.error('Link failed: ' + (err.message || err));
        }
      });
    }
  });
}

function openFeatureModal(featureId, projectId, opts) {
  opts = opts || {};
  const isEdit = !!featureId;
  const feature = isEdit ? state.features.find(f => f.id === featureId) : { projectId, type: opts.forceType || 'Story', parentEpicId: opts.parentEpicId || '', status: opts.forceStatus || 'Planned' };
  const project = state.projects.find(p => p.id === (feature.projectId || projectId));
  const tickets = isEdit ? getFeatureTickets(feature.id) : [];

  let showAddForm = false;

  function renderTicketsList() {
    const currentTickets = isEdit ? state.jiraTickets.filter(t => t.featureId === feature.id) : tickets;
    if (currentTickets.length === 0 && !showAddForm) {
      return '<p style="font-size:12px;color:var(--text-muted);margin-bottom:8px">No Jira tickets yet.</p>';
    }
    return `
      <div class="jira-ticket-list">
        ${currentTickets.map(t => `
          <div class="jira-ticket-item">
            <div class="jira-ticket-type-icon" style="background:${CONFIG.issueTypeColors[t.issueType] || '#3b82f6'}">
              ${CONFIG.issueTypeIcons[t.issueType] || 'T'}
            </div>
            <div class="jira-ticket-info">
              <div class="jira-ticket-title">${Utils.escapeHtml(t.title)}</div>
              ${t.jiraKey ? `<a class="jira-ticket-key" href="${CONFIG.jiraInstance}/browse/${Utils.escapeHtml(t.jiraKey)}" target="_blank" onclick="event.stopPropagation()">${Utils.escapeHtml(t.jiraKey)}</a>` : ''}
              ${t.assignee ? `<span class="jira-ticket-assignee">${Utils.escapeHtml(t.assignee)}</span>` : ''}
            </div>
            <span class="badge-jira ${t.status === 'synced' ? 'badge-jira-synced' : 'badge-jira-draft'}">
              ${t.status === 'synced' ? 'Synced' : 'Draft'}
            </span>
            <div class="jira-ticket-actions">
              ${t.status === 'draft' ? `
                <button class="btn-icon" data-action="push-ticket" data-ticket-id="${t.id}" title="Push to Jira">&#9650;</button>
                <button class="btn-icon" data-action="delete-ticket" data-ticket-id="${t.id}" title="Delete">&#128465;</button>
              ` : ''}
            </div>
          </div>
        `).join('')}
      </div>`;
  }

  function renderJiraSection() {
    return `
      <div class="jira-section">
        <div class="jira-section-header">
          <span class="jira-section-title">&#127899; Jira Tickets</span>
          <button class="btn btn-sm btn-secondary" id="jira-add-toggle">+ Add Ticket</button>
        </div>
        <div id="jira-tickets-list">
          ${renderTicketsList()}
        </div>
        <div id="jira-add-form-container" class="hidden">
          <div class="jira-add-form">
            <div class="form-group">
              <label class="form-label">Issue Type</label>
              <select class="form-select" id="jt-type">
                ${CONFIG.issueTypes.filter(t => t !== 'Epic').map(t => `<option value="${t}">${t}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Title</label>
              <input class="form-input" id="jt-title" placeholder="Ticket summary">
            </div>
            <div class="form-group">
              <label class="form-label">Description</label>
              <textarea class="form-textarea" id="jt-desc" placeholder="Optional description" rows="2"></textarea>
            </div>
            <div class="form-group">
              <label class="form-label">Squad</label>
              <select class="form-select" id="jt-squad">
                <option value="">— None —</option>
                ${CONFIG.squads.map(s => `<option value="${s}" ${(feature.squad || (project && project.squad) || '') === s ? 'selected' : ''}>${s}</option>`).join('')}
              </select>
            </div>
            <div style="display:flex;gap:8px;justify-content:flex-end">
              <button class="btn btn-sm btn-secondary" id="jt-cancel">Cancel</button>
              <button class="btn btn-sm btn-primary" id="jt-save">Save Draft</button>
            </div>
          </div>
        </div>
      </div>`;
  }

  const hasJiraKey = isEdit && feature.jiraKey;
  const parentEpic = feature.parentEpicId ? state.features.find(f => f.id === feature.parentEpicId) : null;
  const epicLinkKey = (parentEpic && parentEpic.jiraKey) || (project && project.epicKey) || '';

  Modal.open(`
    <div class="modal-header">
      <div class="modal-title">${isEdit ? 'Edit Item' : (opts.forceType === 'Epic' ? 'New Epic' : (opts.parentEpicId ? 'New Child Item' : 'New Item'))}</div>
      <button class="modal-close" data-action="modal-close">&times;</button>
    </div>
    <div class="modal-body">
      <div class="form-group">
        <label class="form-label">Item Name</label>
        <input class="form-input" id="feat-name" placeholder="e.g. User Authentication Overhaul"
          value="${Utils.escapeHtml(feature.name || '')}">
      </div>
      <div class="form-group">
        <label class="form-label">Description</label>
        <textarea class="form-textarea" id="feat-desc" placeholder="Describe this item..."
          rows="5">${Utils.escapeHtml(feature.description || '')}</textarea>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Type</label>
          <select class="form-select" id="feat-type" ${opts.forceType === 'Epic' ? 'disabled' : ''}>
            ${(feature.parentEpicId ? CONFIG.itemTypes.filter(t => t !== 'Epic') : CONFIG.itemTypes).map(t => `<option value="${t}" ${(feature.type || 'Story') === t ? 'selected' : ''}>${t}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Status</label>
          <select class="form-select" id="feat-status">
            ${CONFIG.statuses.map(s => `<option value="${s}" ${feature.status === s ? 'selected' : ''}>${s}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Squad</label>
        <select class="form-select" id="feat-squad">
          <option value="">— None —</option>
          ${CONFIG.squads.map(s => `<option value="${s}" ${(feature.squad || (project && project.squad) || '') === s ? 'selected' : ''}>${s}</option>`).join('')}
        </select>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Start Date</label>
          <input class="form-input" type="date" id="feat-start"
            value="${Utils.formatDateInput(feature.startDate)}">
        </div>
        <div class="form-group">
          <label class="form-label">End Date</label>
          <input class="form-input" type="date" id="feat-end"
            value="${Utils.formatDateInput(feature.endDate)}">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Mock Link</label>
        <input class="form-input" id="feat-mocklink" placeholder="Paste Figma link here..."
          value="${Utils.escapeHtml(feature.mockLink || '')}">
      </div>
      <div class="form-group">
        <label class="form-label">Feature Switch</label>
        <input class="form-input" id="feat-featureswitch" placeholder="Feature switch name..."
          value="${Utils.escapeHtml(feature.featureSwitch || '')}">
      </div>
      ${epicLinkKey && feature.type !== 'Epic' ? `
        <div class="form-group">
          <label class="form-label">Epic Link</label>
          <span class="epic-link-readonly">${Utils.escapeHtml(epicLinkKey)}</span>
        </div>
      ` : ''}
      ${hasJiraKey ? `
        <div class="form-group">
          <label class="form-label">Jira Issue</label>
          <a class="jira-item-link-large" href="${CONFIG.jiraInstance}/browse/${Utils.escapeHtml(feature.jiraKey)}" target="_blank">
            ${Utils.escapeHtml(feature.jiraKey)}
          </a>
        </div>
      ` : `
        <div class="form-group">
          <label class="form-checkbox">
            <input type="checkbox" id="feat-create-jira">
            Create Jira issue${epicLinkKey ? ' (linked to ' + Utils.escapeHtml(epicLinkKey) + ')' : ''}
          </label>
        </div>
      `}
      ${isEdit ? renderJiraSection() : ''}
    </div>
    <div class="modal-footer">
      ${isEdit ? '<div class="modal-footer-left"><button class="btn btn-danger" id="feat-delete">Delete</button></div>' : ''}
      <button class="btn btn-secondary" data-action="modal-close">Cancel</button>
      <button class="btn btn-primary" id="feat-save">${isEdit ? 'Save Changes' : 'Create Item'}</button>
    </div>
  `, {
    onOpen(modal) {
      modal.querySelector('#feat-name').focus();

      // Save item
      modal.querySelector('#feat-save').addEventListener('click', async () => {
        const name = modal.querySelector('#feat-name').value.trim();
        if (!name) { Toast.warning('Item name is required'); return; }

        const now = new Date().toISOString();
        const oldStatus = isEdit ? feature.status : null;
        const newStatus = modal.querySelector('#feat-status').value;
        const newDesc = modal.querySelector('#feat-desc').value.trim();
        const newType = modal.querySelector('#feat-type').value;
        const newMockLink = modal.querySelector('#feat-mocklink').value.trim();
        const newFeatureSwitch = modal.querySelector('#feat-featureswitch').value.trim();
        const doc = {
          id: isEdit ? feature.id : Utils.id(),
          _docId: isEdit ? feature._docId : undefined,
          projectId: feature.projectId || projectId,
          parentEpicId: isEdit ? (feature.parentEpicId || '') : (feature.parentEpicId || ''),
          name,
          description: newDesc,
          mockLink: newMockLink,
          featureSwitch: newFeatureSwitch,
          status: newStatus,
          type: newType,
          squad: modal.querySelector('#feat-squad').value,
          startDate: modal.querySelector('#feat-start').value || null,
          endDate: modal.querySelector('#feat-end').value || null,
          jiraKey: isEdit ? (feature.jiraKey || '') : '',
          createdAt: isEdit ? feature.createdAt : now,
          lastModifiedAt: now
        };

        // Create Jira issue if checkbox is checked
        const createJiraCheckbox = modal.querySelector('#feat-create-jira');
        if (createJiraCheckbox && createJiraCheckbox.checked) {
          try {
            Toast.info('Creating Jira issue...');
            const jiraType = CONFIG.typeToJira[newType] || 'Story';
            const fields = {
              project: { key: CONFIG.jiraProject },
              summary: name,
              issuetype: { name: jiraType }
            };
            // Build description with mock link appended
            let jiraDesc = newDesc || '';
            if (newMockLink) {
              jiraDesc = jiraDesc ? jiraDesc + '\n\nMock Link: ' + newMockLink : 'Mock Link: ' + newMockLink;
            }
            if (jiraDesc) fields.description = jiraDesc;
            // Link to parent epic's Jira key (child item) or project's epic key (standalone)
            if (jiraType !== 'Epic') {
              const parentEpic = doc.parentEpicId ? state.features.find(f => f.id === doc.parentEpicId) : null;
              const epicJiraKey = (parentEpic && parentEpic.jiraKey) || (project && project.epicKey) || '';
              if (epicJiraKey) {
                fields[CONFIG.customFields.epicLink] = epicJiraKey;
              }
            }
            if (jiraType === 'Epic') {
              fields[CONFIG.customFields.epicName] = name;
            }

            // Try with squad first, retry without if it fails
            const itemSquad = modal.querySelector('#feat-squad').value;
            let result;
            try {
              if (itemSquad) fields[CONFIG.customFields.squad] = { value: itemSquad };
              result = await JiraService.createIssue(fields);
            } catch (squadErr) {
              // Squad value may not match Jira — retry without it
              if (itemSquad) {
                delete fields[CONFIG.customFields.squad];
                result = await JiraService.createIssue(fields);
                Toast.warning('Jira issue created but squad "' + itemSquad + '" was rejected');
              } else {
                throw squadErr;
              }
            }
            doc.jiraKey = result.key;
            Toast.success('Jira issue created: ' + result.key);
          } catch (e) {
            Toast.error('Jira creation failed: ' + e.message);
          }
        }

        if (!isEdit) {
          await DataService.create(CONFIG.collections.features, doc);
          state.features.push(doc);
          Toast.success('Item created');
          Modal.close();
          render();
          return;
        }

        // Save feature locally
        await DataService.update(CONFIG.collections.features, doc);
        const fIdx = state.features.findIndex(f => f.id === doc.id);
        if (fIdx >= 0) state.features[fIdx] = { ...doc };

        // Collect all Jira keys to sync: item's own key + old-model synced tickets
        const jiraKeysToSync = [];
        if (doc.jiraKey) jiraKeysToSync.push(doc.jiraKey);
        const syncedTickets = state.jiraTickets.filter(
          t => t.featureId === feature.id && t.status === 'synced' && t.jiraKey
        );
        syncedTickets.forEach(t => { if (!jiraKeysToSync.includes(t.jiraKey)) jiraKeysToSync.push(t.jiraKey); });

        let jiraOk = true;
        let jiraSynced = false;

        // 1. Status transition
        if (oldStatus !== newStatus && jiraKeysToSync.length > 0) {
          const transKey = `${oldStatus}->${newStatus}`;
          const transitionId = CONFIG.transitionMap[transKey];
          if (transitionId) {
            try {
              for (const jk of jiraKeysToSync) {
                await JiraService.transitionIssue(jk, transitionId);
              }
              jiraSynced = true;
              Toast.success('Status synced to Jira');
            } catch (e) {
              jiraOk = false;
              doc.status = oldStatus;
              await DataService.update(CONFIG.collections.features, doc);
              if (fIdx >= 0) state.features[fIdx] = { ...doc };
              Toast.error('Jira transition failed \u2014 status reverted');
            }
          }
        }

        // 2. Field push (title/description/mock link)
        if (jiraOk && jiraKeysToSync.length > 0) {
          const nameChanged = name !== (feature.name || '');
          const descChanged = newDesc !== (feature.description || '');
          const mockChanged = newMockLink !== (feature.mockLink || '');
          if (nameChanged || descChanged || mockChanged) {
            try {
              // Build Jira description with mock link
              let jiraDesc = newDesc || '';
              if (newMockLink) {
                jiraDesc = jiraDesc ? jiraDesc + '\n\nMock Link: ' + newMockLink : 'Mock Link: ' + newMockLink;
              }
              for (const jk of jiraKeysToSync) {
                const fields = {};
                if (nameChanged) fields.summary = name;
                if (descChanged || mockChanged) fields.description = jiraDesc;
                await JiraService.updateIssueFields(jk, fields);
              }
              if (!jiraSynced) Toast.success('Synced to Jira');
              jiraSynced = true;
            } catch (e) {
              Toast.warning('Item saved but Jira field update failed');
            }
          }
        }

        if (!jiraSynced) Toast.success('Item updated');
        Modal.close();
        render();
      });

      // Delete feature
      if (isEdit) {
        modal.querySelector('#feat-delete').addEventListener('click', () => {
          Modal.close();
          Modal.confirm(`Delete "${feature.name}"? This removes it from the roadmap only. Any linked Jira ticket will remain in Jira.`, async () => {
            const fTickets = getFeatureTickets(feature.id);
            for (const t of fTickets) {
              await DataService.remove(CONFIG.collections.jiraTickets, t.id);
              state.jiraTickets = state.jiraTickets.filter(x => x.id !== t.id);
            }
            await DataService.remove(CONFIG.collections.features, feature.id);
            state.features = state.features.filter(f => f.id !== feature.id);
            Toast.success('Item deleted');
            render();
          });
        });
      }

      // Jira ticket interactions (only in edit mode)
      if (isEdit) {
        const addToggle = modal.querySelector('#jira-add-toggle');
        const addFormContainer = modal.querySelector('#jira-add-form-container');

        addToggle.addEventListener('click', () => {
          showAddForm = !showAddForm;
          addFormContainer.classList.toggle('hidden', !showAddForm);
          if (showAddForm) {
            modal.querySelector('#jt-title').focus();
          }
        });

        const cancelBtn = modal.querySelector('#jt-cancel');
        if (cancelBtn) {
          cancelBtn.addEventListener('click', () => {
            showAddForm = false;
            addFormContainer.classList.add('hidden');
          });
        }

        const saveTicketBtn = modal.querySelector('#jt-save');
        if (saveTicketBtn) {
          saveTicketBtn.addEventListener('click', async () => {
            const title = modal.querySelector('#jt-title').value.trim();
            if (!title) { Toast.warning('Ticket title is required'); return; }

            const ticket = {
              id: Utils.id(),
              featureId: feature.id,
              jiraKey: '',
              issueType: modal.querySelector('#jt-type').value,
              title,
              description: modal.querySelector('#jt-desc').value.trim(),
              squad: modal.querySelector('#jt-squad').value,
              jiraProject: CONFIG.jiraProject,
              status: 'draft',
              createdAt: new Date().toISOString()
            };

            await DataService.create(CONFIG.collections.jiraTickets, ticket);
            state.jiraTickets.push(ticket);

            // Reset form
            modal.querySelector('#jt-title').value = '';
            modal.querySelector('#jt-desc').value = '';
            showAddForm = false;
            addFormContainer.classList.add('hidden');

            // Refresh ticket list
            modal.querySelector('#jira-tickets-list').innerHTML = renderTicketsList();
            bindTicketActions(modal);
            Toast.success('Draft ticket saved');
          });
        }

        bindTicketActions(modal);
      }
    }
  });
}

function bindTicketActions(modal) {
  modal.querySelectorAll('[data-action="push-ticket"]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const ticketId = btn.dataset.ticketId;
      const ticket = state.jiraTickets.find(t => t.id === ticketId);
      if (!ticket) return;

      const feature = state.features.find(f => f.id === ticket.featureId);
      const project = feature ? state.projects.find(p => p.id === feature.projectId) : null;
      const epicKey = project ? project.epicKey : '';

      try {
        Toast.info('Pushing to Jira...');
        const result = await JiraService.pushTicket(ticket, epicKey);
        ticket.jiraKey = result.key;
        ticket.status = 'synced';
        await DataService.update(CONFIG.collections.jiraTickets, ticket);
        const idx = state.jiraTickets.findIndex(t => t.id === ticketId);
        if (idx >= 0) state.jiraTickets[idx] = ticket;
        Toast.success('Pushed: ' + result.key);
        // Refresh list
        const list = modal.querySelector('#jira-tickets-list');
        if (list) {
          list.innerHTML = renderTicketsList();
          bindTicketActions(modal);
        }
      } catch (err) {
        Toast.error(err.message);
      }
    });
  });

  modal.querySelectorAll('[data-action="delete-ticket"]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const ticketId = btn.dataset.ticketId;
      await DataService.remove(CONFIG.collections.jiraTickets, ticketId);
      state.jiraTickets = state.jiraTickets.filter(t => t.id !== ticketId);
      const list = modal.querySelector('#jira-tickets-list');
      if (list) {
        list.innerHTML = renderTicketsList();
        bindTicketActions(modal);
      }
      Toast.success('Ticket removed');
    });
  });
}

// ===== PUSH ALL TO JIRA =====
async function pushAllForProject(projectId) {
  const project = state.projects.find(p => p.id === projectId);
  if (!project) return;

  const feats = getProjectFeatures(projectId);
  const draftTickets = [];
  feats.forEach(f => {
    state.jiraTickets.filter(t => t.featureId === f.id && t.status === 'draft').forEach(t => draftTickets.push(t));
  });

  if (draftTickets.length === 0) {
    Toast.info('No draft tickets to push');
    return;
  }

  // Create Epic first if needed
  if (!project.epicKey) {
    try {
      Toast.info('Creating Epic in Jira...');
      const result = await JiraService.createEpic(project.name, project.name);
      project.epicKey = result.key;
      await DataService.update(CONFIG.collections.projects, project);
      const idx = state.projects.findIndex(p => p.id === projectId);
      if (idx >= 0) state.projects[idx] = project;
      Toast.success('Epic created: ' + result.key);
    } catch (e) {
      Toast.error('Failed to create Epic: ' + e.message);
      return;
    }
  }

  let pushed = 0;
  Toast.info(`Pushing ${draftTickets.length} tickets...`);

  for (const ticket of draftTickets) {
    try {
      const result = await JiraService.pushTicket(ticket, project.epicKey);
      ticket.jiraKey = result.key;
      ticket.status = 'synced';
      await DataService.update(CONFIG.collections.jiraTickets, ticket);
      const idx = state.jiraTickets.findIndex(t => t.id === ticket.id);
      if (idx >= 0) state.jiraTickets[idx] = ticket;
      pushed++;
    } catch (e) {
      Toast.error('Failed: ' + ticket.title);
    }
  }

  if (pushed > 0) {
    Toast.success(`Pushed ${pushed}/${draftTickets.length} tickets to Jira`);
    render();
  }
}

// ===== JIRA REFRESH =====
async function refreshProjectFromJira(projectId) {
  const feats = getProjectFeatures(projectId);
  let total = 0, updated = 0, unchanged = 0, errors = 0;
  const now = new Date().toISOString();

  for (const feat of feats) {
    const tickets = getFeatureTickets(feat.id).filter(t => t.status === 'synced' && t.jiraKey);
    for (const ticket of tickets) {
      total++;
      try {
        const issue = await JiraService.getIssue(ticket.jiraKey);
        const jiraStatusName = issue.fields && issue.fields.status ? issue.fields.status.name : '';
        const appStatus = CONFIG.jiraStatusToApp[jiraStatusName] || null;
        const assignee = (issue.fields && issue.fields.assignee && issue.fields.assignee.displayName) || '';
        let changed = false;

        if (ticket.assignee !== assignee) {
          ticket.assignee = assignee;
          changed = true;
        }
        ticket.lastSyncedAt = now;
        await DataService.update(CONFIG.collections.jiraTickets, ticket);
        const tIdx = state.jiraTickets.findIndex(t => t.id === ticket.id);
        if (tIdx >= 0) state.jiraTickets[tIdx] = { ...ticket };

        // Update feature status if Jira status maps to a different app status
        if (appStatus && appStatus !== feat.status) {
          feat.status = appStatus;
          feat.lastModifiedAt = now;
          await DataService.update(CONFIG.collections.features, feat);
          const fIdx = state.features.findIndex(f => f.id === feat.id);
          if (fIdx >= 0) state.features[fIdx] = { ...feat };
          changed = true;
        }

        if (changed) updated++;
        else unchanged++;
      } catch (e) {
        errors++;
      }
    }
  }
  return { total, updated, unchanged, errors };
}

async function refreshAllFromJira() {
  Toast.info('Refreshing from Jira...');
  let totalAll = 0, updatedAll = 0, unchangedAll = 0;

  for (const project of state.projects) {
    const result = await refreshProjectFromJira(project.id);
    totalAll += result.total;
    updatedAll += result.updated;
    unchangedAll += result.unchanged;
  }

  if (totalAll === 0) {
    Toast.info('No synced tickets to refresh');
  } else {
    Toast.success(`Synced ${totalAll} tickets: ${updatedAll} updated, ${unchangedAll} unchanged`);
  }
  render();
}

// Jira delete removed — roadmap deletes never touch Jira

// ===== DATA HELPERS =====
function getProjectFeatures(projectId) {
  return state.features.filter(f => f.projectId === projectId);
}

function getFeatureTickets(featureId) {
  return state.jiraTickets.filter(t => t.featureId === featureId);
}

function getDraftCountForProject(projectId) {
  const feats = getProjectFeatures(projectId);
  let count = 0;
  feats.forEach(f => {
    count += state.jiraTickets.filter(t => t.featureId === f.id && t.status === 'draft').length;
  });
  return count;
}

function getFilteredProjects() {
  let projects = [...state.projects];
  // Sort by sortOrder (lower first), fallback to creation order
  projects.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

  if (state.searchQuery) {
    const q = state.searchQuery.toLowerCase();
    const matchingProjectIds = new Set();
    // Match projects by name
    projects.forEach(p => {
      if (p.name.toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q)) {
        matchingProjectIds.add(p.id);
      }
    });
    // Match features (include their parent project)
    state.features.forEach(f => {
      if (f.name.toLowerCase().includes(q) || (f.description || '').toLowerCase().includes(q)) {
        matchingProjectIds.add(f.projectId);
      }
    });
    projects = projects.filter(p => matchingProjectIds.has(p.id));
  }

  if (state.statusFilter !== 'all') {
    // Keep projects that have features matching the filter, or the project itself matches
    projects = projects.filter(p => {
      if (p.status === state.statusFilter) return true;
      return getProjectFeatures(p.id).some(f => f.status === state.statusFilter);
    });
  }

  return projects;
}

function filterFeatures(features) {
  let filtered = features;
  if (state.statusFilter !== 'all') {
    filtered = filtered.filter(f => f.status === state.statusFilter);
  }
  if (state.searchQuery) {
    const q = state.searchQuery.toLowerCase();
    filtered = filtered.filter(f =>
      f.name.toLowerCase().includes(q) ||
      (f.description || '').toLowerCase().includes(q)
    );
  }
  return filtered;
}

// ===== DESIGN BOARD (MockUp Kanban) =====
const DESIGN_LANES = [
  { name: 'To Do',       status: 'Planned',     dotClass: 'dot-todo' },
  { name: 'In Progress', status: 'In Progress', dotClass: 'dot-progress' },
  { name: 'Done',        status: 'Done',        dotClass: 'dot-done' }
];

function getDesignBoardMockUps() {
  let mockUps = state.features.filter(f => f.type === 'MockUp');
  if (state.designEpicFilter && state.designEpicFilter !== 'all') {
    mockUps = mockUps.filter(f => f.parentEpicId === state.designEpicFilter);
  }
  return mockUps;
}

function getMockUpEpicsForFilter() {
  // Epics that currently have MockUp children
  const mockUps = state.features.filter(f => f.type === 'MockUp');
  const epicIds = new Set(mockUps.map(f => f.parentEpicId).filter(Boolean));
  return state.features.filter(f => f.type === 'Epic' && epicIds.has(f.id));
}

function renderDesignBoardView() {
  const allMockUps = state.features.filter(f => f.type === 'MockUp');
  if (allMockUps.length === 0) {
    return `
      <div class="design-board">
        <div class="design-page-header">
          <div class="design-page-title">Design Board</div>
          <div class="design-page-subtitle">MockUp tickets from the Roadmap, flowing through design review.</div>
        </div>
        <div class="design-empty-state">No mockups yet. Create a MockUp from the Roadmap or use + Add mockup below.</div>
      </div>`;
  }

  const mockUps = getDesignBoardMockUps();
  const activeEpic = state.designEpicFilter !== 'all'
    ? state.features.find(f => f.id === state.designEpicFilter)
    : null;
  const epicFilterLabel = activeEpic ? activeEpic.name : 'All epics';
  const epicOptions = getMockUpEpicsForFilter();

  return `
    <div class="design-board">
      <div class="design-page-header">
        <div class="design-page-title">Design Board</div>
        <div class="design-page-subtitle">MockUp tickets from the Roadmap, flowing through design review.</div>
      </div>
      <div class="filter-bar">
        <div style="position:relative;">
          <button class="filter-chip ${state.designEpicFilter !== 'all' ? 'active' : ''}" data-action="toggle-epic-filter">
            <span>${Utils.escapeHtml(epicFilterLabel)}</span>
            <span class="filter-chip-caret">&#9662;</span>
          </button>
          ${state.designEpicPopoverOpen ? `
            <div class="epic-filter-popover" data-epic-popover>
              <button class="epic-filter-item ${state.designEpicFilter === 'all' ? 'active' : ''}" data-action="set-epic-filter" data-epic-id="all">All epics</button>
              ${epicOptions.map(ep => `
                <button class="epic-filter-item ${state.designEpicFilter === ep.id ? 'active' : ''}" data-action="set-epic-filter" data-epic-id="${ep.id}">${Utils.escapeHtml(ep.name)}</button>
              `).join('')}
            </div>
          ` : ''}
        </div>
      </div>
      <div class="kanban">
        ${DESIGN_LANES.map(lane => renderKanbanLane(lane, mockUps.filter(f => f.status === lane.status))).join('')}
      </div>
    </div>`;
}

function renderKanbanLane(lane, cards) {
  const sorted = [...cards].sort((a, b) => {
    const ad = new Date(a.createdAt || 0).getTime();
    const bd = new Date(b.createdAt || 0).getTime();
    return bd - ad;
  });
  return `
    <div class="lane" data-lane-status="${lane.status}">
      <div class="lane-head">
        <span class="lane-dot ${lane.dotClass}"></span>
        <span class="lane-title">${lane.name}</span>
        <span class="lane-count">${sorted.length}</span>
      </div>
      <div class="lane-body">
        ${sorted.length === 0
          ? `<div class="lane-empty">No mockups here yet.</div>`
          : sorted.map(f => renderMockCard(f)).join('')}
      </div>
      <button class="add-card-btn" data-action="add-mockup" data-lane-status="${lane.status}">+ Add mockup</button>
    </div>`;
}

function renderMockCard(feature) {
  const parentEpic = feature.parentEpicId
    ? state.features.find(f => f.id === feature.parentEpicId)
    : null;
  const squad = feature.squad || '';
  const initials = squad ? squad.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() : '';
  const dueDate = feature.endDate ? Utils.formatDate(feature.endDate) : '';
  const mockLink = feature.mockLink || '';

  return `
    <div class="mock-card" draggable="true" data-action="edit-feature" data-feature-id="${feature.id}">
      <div class="card-head">
        <span class="tag-mockup">MockUp</span>
        ${feature.jiraKey ? `<span class="card-key">${Utils.escapeHtml(feature.jiraKey)}</span>` : ''}
      </div>
      <div class="card-title">${Utils.escapeHtml(feature.name || '')}</div>
      ${parentEpic ? `<div class="epic-context">${Utils.escapeHtml(parentEpic.name)}</div>` : ''}
      ${mockLink ? `
        <div class="mock-links">
          <a class="mock-link figma" href="${Utils.escapeHtml(mockLink)}" target="_blank" rel="noopener" data-no-card-click>
            <span class="icon">&#9670;</span>
            <span class="mock-link-name">Figma mock</span>
          </a>
        </div>
      ` : ''}
      <div class="card-footer">
        ${squad
          ? `<div class="avatar">${Utils.escapeHtml(initials || '?')}</div><span>${Utils.escapeHtml(squad)}</span>`
          : `<div class="avatar unassigned">&mdash;</div><span>Unassigned</span>`}
        ${dueDate ? `<div class="footer-right"><span class="due-date">${Utils.escapeHtml(dueDate)}</span></div>` : ''}
      </div>
    </div>`;
}

async function updateFeatureStatus(featureId, newStatus) {
  const feature = state.features.find(f => f.id === featureId);
  if (!feature) return false;
  const oldStatus = feature.status;
  if (oldStatus === newStatus) return true;

  const doc = { ...feature, status: newStatus, lastModifiedAt: new Date().toISOString() };
  await DataService.update(CONFIG.collections.features, doc);
  const fIdx = state.features.findIndex(f => f.id === featureId);
  if (fIdx >= 0) state.features[fIdx] = doc;

  // Sync to Jira if linked
  if (doc.jiraKey) {
    const transitionId = CONFIG.transitionMap[`${oldStatus}->${newStatus}`];
    if (transitionId) {
      try {
        await JiraService.transitionIssue(doc.jiraKey, transitionId);
        Toast.success('Status synced to Jira');
      } catch (e) {
        // Revert
        const reverted = { ...doc, status: oldStatus, lastModifiedAt: new Date().toISOString() };
        await DataService.update(CONFIG.collections.features, reverted);
        if (fIdx >= 0) state.features[fIdx] = reverted;
        Toast.error("Couldn't update Jira. Please try again.");
        render();
        return false;
      }
    } else {
      Toast.warning(`No Jira transition mapped for ${oldStatus} → ${newStatus}`);
    }
  } else {
    Toast.success('Status updated');
  }
  render();
  return true;
}

function openMockUpCreateFlow(laneStatus) {
  const projects = state.projects;
  if (projects.length === 0) {
    Toast.warning('Create a project first, then add mockups.');
    return;
  }

  Modal.open(`
    <div class="modal-header">
      <div class="modal-title">New MockUp</div>
      <button class="modal-close" data-action="modal-close">&times;</button>
    </div>
    <div class="modal-body">
      <div class="form-group">
        <label class="form-label">Project</label>
        <select class="form-select" id="mockup-project">
          ${projects.map(p => `<option value="${p.id}">${Utils.escapeHtml(p.name)}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Parent Epic (optional)</label>
        <select class="form-select" id="mockup-epic">
          <option value="">— None (standalone) —</option>
        </select>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" data-action="modal-close">Cancel</button>
      <button class="btn btn-primary" id="mockup-continue">Continue</button>
    </div>
  `, {
    className: 'confirm-dialog',
    onOpen(modal) {
      const projectSel = modal.querySelector('#mockup-project');
      const epicSel = modal.querySelector('#mockup-epic');

      function repopulateEpics() {
        const pid = projectSel.value;
        const epics = state.features.filter(f => f.type === 'Epic' && f.projectId === pid);
        epicSel.innerHTML = '<option value="">— None (standalone) —</option>' +
          epics.map(e => `<option value="${e.id}">${Utils.escapeHtml(e.name)}</option>`).join('');
      }
      repopulateEpics();
      projectSel.addEventListener('change', repopulateEpics);

      modal.querySelector('#mockup-continue').addEventListener('click', () => {
        const projectId = projectSel.value;
        const epicId = epicSel.value || '';
        Modal.close();
        openFeatureModal(null, projectId, {
          forceType: 'MockUp',
          forceStatus: laneStatus,
          parentEpicId: epicId
        });
      });
    }
  });
}

let _draggedFeatureId = null;
function bindDesignBoardDragDrop() {
  const cards = document.querySelectorAll('.mock-card');
  const lanes = document.querySelectorAll('.lane');

  cards.forEach(card => {
    card.addEventListener('dragstart', (e) => {
      _draggedFeatureId = card.dataset.featureId;
      card.classList.add('dragging');
      try { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', _draggedFeatureId); } catch {}
    });
    card.addEventListener('dragend', () => {
      card.classList.remove('dragging');
      document.querySelectorAll('.lane.drop-target').forEach(l => l.classList.remove('drop-target'));
    });
  });

  lanes.forEach(lane => {
    lane.addEventListener('dragover', (e) => {
      e.preventDefault();
      try { e.dataTransfer.dropEffect = 'move'; } catch {}
      lane.classList.add('drop-target');
    });
    lane.addEventListener('dragleave', (e) => {
      if (e.target === lane) lane.classList.remove('drop-target');
    });
    lane.addEventListener('drop', (e) => {
      e.preventDefault();
      lane.classList.remove('drop-target');
      const newStatus = lane.dataset.laneStatus;
      const fid = _draggedFeatureId;
      _draggedFeatureId = null;
      if (fid && newStatus) updateFeatureStatus(fid, newStatus);
    });
  });
}

// ===== RENDER =====
function render() {
  const app = document.getElementById('app');
  app.innerHTML = `
    ${renderHeader()}
    ${state.currentView === 'design' ? '' : renderToolbar()}
    <div class="app-main">
      ${state.currentView === 'board' ? renderBoardView()
        : state.currentView === 'design' ? renderDesignBoardView()
        : renderGanttView()}
    </div>`;
  bindEvents();

  // Sync Gantt label scrolling
  if (state.currentView === 'gantt') {
    syncGanttScroll();
  }

  // Bind drag/drop for Design Board cards
  if (state.currentView === 'design') {
    bindDesignBoardDragDrop();
  }
}

// ===== EVENT BINDING =====
let _eventsBound = false;
function bindEvents() {
  const app = document.getElementById('app');
  if (_eventsBound) return;
  _eventsBound = true;

  // Close dropdown menus when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.split-arrow') && !e.target.closest('.add-child-card') && !e.target.closest('.add-menu')) {
      document.querySelectorAll('.add-menu').forEach(m => m.classList.add('hidden'));
    }
    // Close epic-filter popover on outside click
    if (state.designEpicPopoverOpen && !e.target.closest('[data-epic-popover]') && !e.target.closest('[data-action="toggle-epic-filter"]')) {
      state.designEpicPopoverOpen = false;
      if (state.currentView === 'design') render();
    }
  });

  // Delegate clicks — bound ONCE, survives render() since app element persists
  app.addEventListener('click', (e) => {
    // Links — Cmd/Ctrl+Click opens in new tab, plain click does nothing
    if (e.target.closest('a[href]')) {
      if (!e.metaKey && !e.ctrlKey) {
        e.preventDefault();
      }
      e.stopPropagation();
      return;
    }
    const target = e.target.closest('[data-action]');
    if (!target) return;
    const action = target.dataset.action;

    switch (action) {
      case 'set-view':
        state.currentView = target.dataset.view;
        render();
        break;
      case 'add-project':
        openProjectModal(null);
        break;
      case 'edit-project':
        e.stopPropagation();
        openProjectModal(target.dataset.projectId);
        break;
      case 'delete-project':
        e.stopPropagation();
        const proj = state.projects.find(p => p.id === target.dataset.projectId);
        if (proj) {
          Modal.confirm('This removes the project and its epics and items from the roadmap. Jira tickets linked to this project will remain in Jira.', async () => {
            const feats = getProjectFeatures(proj.id);
            for (const f of feats) {
              const tickets = getFeatureTickets(f.id);
              for (const t of tickets) {
                await DataService.remove(CONFIG.collections.jiraTickets, t.id);
                state.jiraTickets = state.jiraTickets.filter(x => x.id !== t.id);
              }
              await DataService.remove(CONFIG.collections.features, f.id);
              state.features = state.features.filter(x => x.id !== f.id);
            }
            await DataService.remove(CONFIG.collections.projects, proj.id);
            state.projects = state.projects.filter(p => p.id !== proj.id);
            Toast.success('Project deleted');
            render();
          });
        }
        break;
      case 'move-project-up':
      case 'move-project-down':
        e.stopPropagation();
        e.preventDefault();
        e.stopPropagation();
        e.preventDefault();
        (async () => {
          // Assign sequential sortOrder based on current position
          const sorted = [...state.projects].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
          sorted.forEach((p, i) => { p.sortOrder = i; });
          const idx = sorted.findIndex(p => p.id === target.dataset.projectId);
          const swapIdx = action === 'move-project-up' ? idx - 1 : idx + 1;
          if (idx < 0 || swapIdx < 0 || swapIdx >= sorted.length) return;
          // Swap
          const temp = sorted[idx].sortOrder;
          sorted[idx].sortOrder = sorted[swapIdx].sortOrder;
          sorted[swapIdx].sortOrder = temp;
          // Save both
          await DataService.update(CONFIG.collections.projects, sorted[idx]);
          await DataService.update(CONFIG.collections.projects, sorted[swapIdx]);
          const si = state.projects.findIndex(p => p.id === sorted[idx].id);
          const oi = state.projects.findIndex(p => p.id === sorted[swapIdx].id);
          if (si >= 0) state.projects[si] = { ...sorted[idx] };
          if (oi >= 0) state.projects[oi] = { ...sorted[swapIdx] };
          render();
        })();
        break;
      case 'toggle-project':
        {
          const tpid = target.dataset.projectId;
          if (state.collapsedProjects.has(tpid)) {
            state.collapsedProjects.delete(tpid);
          } else {
            state.collapsedProjects.add(tpid);
          }
          const grp = document.querySelector(`.project-group[data-project-id="${tpid}"]`);
          if (grp) {
            const nowCollapsed = state.collapsedProjects.has(tpid);
            grp.classList.toggle('collapsed', nowCollapsed);
            const wrap = grp.querySelector('.project-body-wrap');
            if (wrap) wrap.classList.toggle('collapsed', nowCollapsed);
            const caret = grp.querySelector('.project-collapse-icon');
            if (caret) caret.innerHTML = nowCollapsed ? '&#9656;' : '&#9662;';
          }
        }
        break;
      case 'toggle-collapse-all':
        {
          if (state.collapsedProjects.size > 0) {
            state.collapsedProjects.clear();
          } else {
            state.projects.forEach(p => state.collapsedProjects.add(p.id));
          }
          const isNowCollapsed = state.collapsedProjects.size > 0;
          document.querySelectorAll('.project-group').forEach(g => {
            g.classList.toggle('collapsed', isNowCollapsed);
            const w = g.querySelector('.project-body-wrap');
            if (w) w.classList.toggle('collapsed', isNowCollapsed);
          });
          document.querySelectorAll('[data-action="toggle-collapse-all"]').forEach(btn => {
            btn.textContent = isNowCollapsed ? 'Expand All' : 'Collapse All';
          });
        }
        break;
      case 'toggle-epic':
        {
          const epicId = target.dataset.featureId;
          if (state.collapsedEpics.has(epicId)) {
            state.collapsedEpics.delete(epicId);
          } else {
            state.collapsedEpics.add(epicId);
          }
          render();
        }
        break;
      case 'move-item-up':
      case 'move-item-down':
        e.stopPropagation();
        (async () => {
          const item = state.features.find(f => f.id === target.dataset.featureId);
          if (!item) return;
          const siblings = state.features.filter(f => {
            if (f.projectId !== item.projectId) return false;
            if (item.type === 'Epic') return f.type === 'Epic';
            if (item.parentEpicId) return f.parentEpicId === item.parentEpicId && f.type !== 'Epic';
            return !f.parentEpicId && f.type !== 'Epic';
          }).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
          // Assign sequential sortOrder based on current position
          siblings.forEach((s, i) => { s.sortOrder = i; });
          const idx = siblings.findIndex(f => f.id === item.id);
          const swapIdx = action === 'move-item-up' ? idx - 1 : idx + 1;
          if (idx < 0 || swapIdx < 0 || swapIdx >= siblings.length) return;
          const other = siblings[swapIdx];
          const temp = item.sortOrder;
          item.sortOrder = other.sortOrder;
          other.sortOrder = temp;
          await DataService.update(CONFIG.collections.features, item);
          await DataService.update(CONFIG.collections.features, other);
          const si = state.features.findIndex(f => f.id === item.id);
          const oi = state.features.findIndex(f => f.id === other.id);
          if (si >= 0) state.features[si] = { ...item };
          if (oi >= 0) state.features[oi] = { ...other };
          render();
        })();
        break;
      case 'add-feature':
        openFeatureModal(null, target.dataset.projectId);
        break;
      case 'add-epic':
        document.querySelectorAll('.add-menu').forEach(m => m.classList.add('hidden'));
        openFeatureModal(null, target.dataset.projectId, { forceType: 'Epic' });
        break;
      case 'add-other-item':
        openFeatureModal(null, target.dataset.projectId, { forceType: 'Story' });
        break;
      case 'add-child-item':
        document.querySelectorAll('.add-menu').forEach(m => m.classList.add('hidden'));
        openFeatureModal(null, target.dataset.projectId, { parentEpicId: target.dataset.epicId, forceType: 'Story' });
        break;
      case 'link-epic':
        document.querySelectorAll('.add-menu').forEach(m => m.classList.add('hidden'));
        openLinkJiraModal(target.dataset.projectId, { isEpic: true });
        break;
      case 'link-child':
        document.querySelectorAll('.add-menu').forEach(m => m.classList.add('hidden'));
        openLinkJiraModal(target.dataset.projectId, { isEpic: false, parentEpicId: target.dataset.epicId });
        break;
      case 'toggle-add-menu':
        {
          e.stopPropagation();
          const menuId = target.dataset.menuId;
          const menu = document.getElementById(menuId);
          if (menu) {
            const wasHidden = menu.classList.contains('hidden');
            document.querySelectorAll('.add-menu').forEach(m => m.classList.add('hidden'));
            if (wasHidden) menu.classList.remove('hidden');
          }
        }
        break;
      case 'edit-feature':
        openFeatureModal(target.dataset.featureId, null);
        break;
      case 'add-mockup':
        openMockUpCreateFlow(target.dataset.laneStatus || 'Planned');
        break;
      case 'toggle-epic-filter':
        e.stopPropagation();
        state.designEpicPopoverOpen = !state.designEpicPopoverOpen;
        render();
        break;
      case 'set-epic-filter':
        state.designEpicFilter = target.dataset.epicId;
        state.designEpicPopoverOpen = false;
        render();
        break;
      case 'push-all-project':
        e.stopPropagation();
        pushAllForProject(target.dataset.projectId);
        break;
      case 'refresh-project':
        e.stopPropagation();
        (async () => {
          Toast.info('Refreshing...');
          const result = await refreshProjectFromJira(target.dataset.projectId);
          if (result.total === 0) {
            Toast.info('No synced tickets to refresh');
          } else {
            Toast.success(`Synced ${result.total} tickets: ${result.updated} updated, ${result.unchanged} unchanged`);
          }
          render();
        })();
        break;
      case 'refresh-all':
        refreshAllFromJira();
        break;
      case 'test-jira':
        (async () => {
          Toast.info('Testing Jira connection (trying multiple paths)...');
          try {
            const result = await JiraService.testConnection();
            const user = result.user;
            Toast.success('Connected via ' + result.path + ' as: ' + (user.displayName || user.name || JSON.stringify(user)));
          } catch (err) {
            Toast.error(err.message);
          }
        })();
        break;
    }
  });

  // Search
  const searchInput = app.querySelector('[data-action="search-input"]');
  if (searchInput) {
    searchInput.addEventListener('input', Utils.debounce((e) => {
      state.searchQuery = e.target.value;
      render();
      // Re-focus search and set cursor to end
      const newInput = document.querySelector('[data-action="search-input"]');
      if (newInput) {
        newInput.focus();
        newInput.selectionStart = newInput.selectionEnd = newInput.value.length;
      }
    }, 250));
  }

  // Status filter
  const filterSelect = app.querySelector('[data-action="status-filter"]');
  if (filterSelect) {
    filterSelect.addEventListener('change', (e) => {
      state.statusFilter = e.target.value;
      render();
    });
  }

  // Gantt tooltip
  if (state.currentView === 'gantt') {
    initGanttTooltip();
  }
}

// ===== GANTT SCROLL SYNC =====
function syncGanttScroll() {
  const timeline = document.getElementById('gantt-timeline');
  const labels = document.getElementById('gantt-labels');
  if (!timeline || !labels) return;

  timeline.addEventListener('scroll', () => {
    labels.scrollTop = timeline.scrollTop;
  });
  labels.addEventListener('scroll', () => {
    timeline.scrollTop = labels.scrollTop;
  });

  // Scroll to today
  const todayMarker = timeline.querySelector('.gantt-today-marker');
  if (todayMarker) {
    const left = parseInt(todayMarker.style.left);
    timeline.scrollLeft = Math.max(0, left - timeline.clientWidth / 3);
  }
}

// ===== GANTT TOOLTIP =====
function initGanttTooltip() {
  let tooltip = null;

  document.addEventListener('mouseover', (e) => {
    const bar = e.target.closest('.gantt-bar:not(.project-bar)');
    if (!bar || !bar.dataset.tooltipName) return;

    if (!tooltip) {
      tooltip = document.createElement('div');
      tooltip.className = 'gantt-tooltip';
      document.body.appendChild(tooltip);
    }

    tooltip.innerHTML = `
      <div class="tt-title">${bar.dataset.tooltipName}</div>
      <div class="tt-meta">${bar.dataset.tooltipProject}</div>
      <div class="tt-meta">${bar.dataset.tooltipDates}</div>
      <div class="tt-meta">${bar.dataset.tooltipStatus} &middot; ${bar.dataset.tooltipPriority}</div>
    `;
    tooltip.style.display = 'block';
  });

  document.addEventListener('mousemove', (e) => {
    if (tooltip && tooltip.style.display === 'block') {
      tooltip.style.left = (e.clientX + 12) + 'px';
      tooltip.style.top = (e.clientY - 10) + 'px';
    }
  });

  document.addEventListener('mouseout', (e) => {
    const bar = e.target.closest('.gantt-bar:not(.project-bar)');
    if (bar && tooltip) {
      tooltip.style.display = 'none';
    }
  });
}

// ===== SAMPLE DATA =====
function getSampleData() {
  const projects = [
    {
      id: 'proj-1',
      name: 'Platform Modernization',
      description: 'Migrate core infrastructure to modern stack with improved scalability and performance.',
      status: 'In Progress',
      epicKey: '',
      createdAt: '2025-12-15T00:00:00Z',
      updatedAt: '2026-03-20T00:00:00Z'
    },
    {
      id: 'proj-2',
      name: 'Analytics Dashboard v3',
      description: 'Next-generation analytics with real-time streaming and custom widget support.',
      status: 'In Progress',
      epicKey: '',
      createdAt: '2026-01-10T00:00:00Z',
      updatedAt: '2026-04-01T00:00:00Z'
    },
    {
      id: 'proj-3',
      name: 'Mobile Experience',
      description: 'Complete responsive redesign with offline capabilities and push notifications.',
      status: 'Planned',
      epicKey: '',
      createdAt: '2026-03-01T00:00:00Z',
      updatedAt: '2026-03-01T00:00:00Z'
    },
    {
      id: 'proj-4',
      name: 'API Gateway',
      description: 'Centralized API gateway with rate limiting, auth, and developer portal.',
      status: 'Done',
      epicKey: '',
      createdAt: '2025-09-15T00:00:00Z',
      updatedAt: '2026-01-31T00:00:00Z'
    },
    {
      id: 'proj-5',
      name: 'Data Pipeline Upgrade',
      description: 'Kafka integration, ETL optimization, and real-time data quality monitoring.',
      status: 'In Progress',
      epicKey: '',
      createdAt: '2026-02-01T00:00:00Z',
      updatedAt: '2026-04-10T00:00:00Z'
    }
  ];

  const features = [
    // Platform Modernization
    { id: 'feat-1a', projectId: 'proj-1', name: 'Migrate Auth Service', description: 'Move authentication to OAuth2/OIDC with SSO support.', status: 'Done', type: 'Story', startDate: '2026-01-06', endDate: '2026-02-14', jiraKey: '', createdAt: '2025-12-15T00:00:00Z', lastModifiedAt: '2026-02-14T10:00:00Z' },
    { id: 'feat-1b', projectId: 'proj-1', name: 'API Gateway v2', description: 'Implement new API gateway with circuit breakers and observability.', status: 'In Progress', type: 'Improvement', startDate: '2026-02-01', endDate: '2026-04-15', jiraKey: '', createdAt: '2025-12-15T00:00:00Z', lastModifiedAt: '2026-04-14T11:00:00Z' },
    { id: 'feat-1c', projectId: 'proj-1', name: 'Database Sharding', description: 'Horizontal sharding strategy for user and event tables.', status: 'In Progress', type: 'Story', startDate: '2026-03-01', endDate: '2026-05-30', createdAt: '2026-01-10T00:00:00Z', lastModifiedAt: '2026-04-10T00:00:00Z' },
    { id: 'feat-1d', projectId: 'proj-1', name: 'Legacy Deprecation', description: 'Sunset v1 APIs and migrate remaining consumers.', status: 'Planned', type: 'Story', startDate: '2026-06-01', endDate: '2026-08-15', createdAt: '2026-02-01T00:00:00Z', lastModifiedAt: '2026-02-01T00:00:00Z' },

    // Analytics Dashboard v3
    { id: 'feat-2a', projectId: 'proj-2', name: 'Real-time Streaming', description: 'WebSocket-based live data streaming for dashboards.', status: 'In Progress', type: 'Story', startDate: '2026-02-15', endDate: '2026-05-01', jiraKey: '', createdAt: '2026-01-10T00:00:00Z', lastModifiedAt: '2026-04-13T00:00:00Z' },
    { id: 'feat-2b', projectId: 'proj-2', name: 'Custom Widgets', description: 'Drag-and-drop widget builder with custom data bindings.', status: 'Planned', type: 'UX', startDate: '2026-04-01', endDate: '2026-06-30', createdAt: '2026-01-15T00:00:00Z', lastModifiedAt: '2026-03-22T00:00:00Z' },
    { id: 'feat-2c', projectId: 'proj-2', name: 'Export to PDF', description: 'One-click PDF export with scheduled report delivery.', status: 'Planned', type: 'Improvement', startDate: '2026-05-15', endDate: '2026-07-15', createdAt: '2026-02-01T00:00:00Z', lastModifiedAt: '2026-02-01T00:00:00Z' },
    { id: 'feat-2d', projectId: 'proj-2', name: 'Dashboard Templates', description: 'Pre-built templates for common analytics use cases.', status: 'In Progress', type: 'Story', startDate: '2026-03-01', endDate: '2026-04-30', jiraKey: '', createdAt: '2026-01-20T00:00:00Z', lastModifiedAt: '2026-04-12T00:00:00Z' },

    // Mobile Experience
    { id: 'feat-3a', projectId: 'proj-3', name: 'Responsive Redesign', description: 'Fully responsive layouts for all core views.', status: 'Planned', type: 'UX', startDate: '2026-05-01', endDate: '2026-07-31', createdAt: '2026-03-01T00:00:00Z', lastModifiedAt: '2026-03-01T00:00:00Z' },
    { id: 'feat-3b', projectId: 'proj-3', name: 'Offline Mode', description: 'Service worker and IndexedDB for offline data access.', status: 'Planned', type: 'Story', startDate: '2026-07-01', endDate: '2026-09-30', createdAt: '2026-03-01T00:00:00Z', lastModifiedAt: '2026-03-01T00:00:00Z' },
    { id: 'feat-3c', projectId: 'proj-3', name: 'Push Notifications', description: 'Real-time alerts for status changes and mentions.', status: 'Planned', type: 'Improvement', startDate: '2026-08-01', endDate: '2026-10-15', createdAt: '2026-03-01T00:00:00Z', lastModifiedAt: '2026-03-01T00:00:00Z' },

    // API Gateway (Done)
    { id: 'feat-4a', projectId: 'proj-4', name: 'Rate Limiting', description: 'Sliding window rate limiter with per-client quotas.', status: 'Done', type: 'Story', startDate: '2025-10-01', endDate: '2025-12-15', jiraKey: '', createdAt: '2025-09-15T00:00:00Z', lastModifiedAt: '2025-12-15T00:00:00Z' },
    { id: 'feat-4b', projectId: 'proj-4', name: 'Auth Tokens', description: 'JWT-based auth with refresh token rotation.', status: 'Done', type: 'Story', startDate: '2025-11-01', endDate: '2026-01-15', jiraKey: '', createdAt: '2025-09-20T00:00:00Z', lastModifiedAt: '2026-01-15T00:00:00Z' },
    { id: 'feat-4c', projectId: 'proj-4', name: 'Documentation Portal', description: 'Auto-generated API docs with interactive sandbox.', status: 'Done', type: 'Improvement', startDate: '2025-12-01', endDate: '2026-01-31', jiraKey: '', createdAt: '2025-10-01T00:00:00Z', lastModifiedAt: '2026-01-31T00:00:00Z' },

    // Data Pipeline Upgrade
    { id: 'feat-5a', projectId: 'proj-5', name: 'Kafka Integration', description: 'Replace polling with event-driven Kafka consumers.', status: 'In Progress', type: 'Story', startDate: '2026-03-15', endDate: '2026-06-15', jiraKey: '', createdAt: '2026-02-01T00:00:00Z', lastModifiedAt: '2026-04-13T00:00:00Z' },
    { id: 'feat-5b', projectId: 'proj-5', name: 'ETL Optimization', description: 'Rewrite slow transforms with Apache Spark.', status: 'Planned', type: 'Improvement', startDate: '2026-05-01', endDate: '2026-07-31', createdAt: '2026-02-15T00:00:00Z', lastModifiedAt: '2026-04-01T00:00:00Z' },
    { id: 'feat-5c', projectId: 'proj-5', name: 'Data Quality Checks', description: 'Automated validation rules with anomaly detection.', status: 'Planned', type: 'Bug', startDate: '2026-06-15', endDate: '2026-08-31', createdAt: '2026-03-01T00:00:00Z', lastModifiedAt: '2026-03-01T00:00:00Z' },
    { id: 'feat-5d', projectId: 'proj-5', name: 'Monitoring Dashboard', description: 'Real-time pipeline health and throughput metrics.', status: 'In Progress', type: 'UX', startDate: '2026-04-01', endDate: '2026-05-31', createdAt: '2026-03-15T00:00:00Z', lastModifiedAt: '2026-04-14T09:00:00Z' }
  ];

  const jiraTickets = [
    // Platform Modernization - Auth Service (synced, green — lastSynced after lastModified)
    { id: 'jt-1a1', featureId: 'feat-1a', jiraKey: '', issueType: 'Story', title: 'Implement OAuth2 provider integration', description: '', jiraProject: 'DOMO', status: 'synced', createdAt: '2026-01-06T00:00:00Z', lastSyncedAt: '2026-04-14T08:00:00Z', assignee: 'Sarah Chen' },
    { id: 'jt-1a2', featureId: 'feat-1a', jiraKey: '', issueType: 'Story', title: 'SSO configuration and testing', description: '', jiraProject: 'DOMO', status: 'synced', createdAt: '2026-01-08T00:00:00Z', lastSyncedAt: '2026-04-14T08:00:00Z', assignee: 'Mike Torres' },
    // API Gateway v2 (mix — yellow, feature modified after sync)
    { id: 'jt-1b1', featureId: 'feat-1b', jiraKey: '', issueType: 'Story', title: 'Circuit breaker implementation', description: '', jiraProject: 'DOMO', status: 'synced', createdAt: '2026-02-05T00:00:00Z', lastSyncedAt: '2026-04-13T10:00:00Z', assignee: 'James Park' },
    { id: 'jt-1b2', featureId: 'feat-1b', jiraKey: '', issueType: 'Improvement', title: 'Add OpenTelemetry tracing', description: 'Distributed tracing for all gateway routes.', jiraProject: 'DOMO', status: 'draft', createdAt: '2026-03-10T00:00:00Z' },
    // Database Sharding (draft — gray)
    { id: 'jt-1c1', featureId: 'feat-1c', jiraKey: '', issueType: 'Story', title: 'Design sharding key strategy', description: '', jiraProject: 'DOMO', status: 'draft', createdAt: '2026-03-15T00:00:00Z' },

    // Analytics - Real-time (synced, green)
    { id: 'jt-2a1', featureId: 'feat-2a', jiraKey: '', issueType: 'Story', title: 'WebSocket server infrastructure', description: '', jiraProject: 'DOMO', status: 'synced', createdAt: '2026-02-20T00:00:00Z', lastSyncedAt: '2026-04-14T08:00:00Z', assignee: 'Lisa Wang' },
    // Custom Widgets (drafts — gray)
    { id: 'jt-2b1', featureId: 'feat-2b', jiraKey: '', issueType: 'Story', title: 'Widget drag-and-drop framework', description: '', jiraProject: 'DOMO', status: 'draft', createdAt: '2026-03-20T00:00:00Z' },
    { id: 'jt-2b2', featureId: 'feat-2b', jiraKey: '', issueType: 'Mock', title: 'Widget builder UI mockups', description: 'Design all widget builder screens.', jiraProject: 'DOMO', status: 'draft', createdAt: '2026-03-22T00:00:00Z' },
    // Dashboard Templates (synced, green)
    { id: 'jt-2d1', featureId: 'feat-2d', jiraKey: '', issueType: 'Story', title: 'Template engine implementation', description: '', jiraProject: 'DOMO', status: 'synced', createdAt: '2026-03-05T00:00:00Z', lastSyncedAt: '2026-04-14T08:00:00Z', assignee: 'David Kim' },

    // API Gateway - Rate Limiting (synced, green)
    { id: 'jt-4a1', featureId: 'feat-4a', jiraKey: '', issueType: 'Story', title: 'Sliding window rate limiter', description: '', jiraProject: 'DOMO', status: 'synced', createdAt: '2025-10-05T00:00:00Z', lastSyncedAt: '2026-04-14T08:00:00Z', assignee: 'Alex Rivera' },
    // Auth Tokens (synced, green)
    { id: 'jt-4b1', featureId: 'feat-4b', jiraKey: '', issueType: 'Story', title: 'JWT generation and validation', description: '', jiraProject: 'DOMO', status: 'synced', createdAt: '2025-11-05T00:00:00Z', lastSyncedAt: '2026-04-14T08:00:00Z', assignee: 'Alex Rivera' },
    // Documentation Portal (synced, green)
    { id: 'jt-4c1', featureId: 'feat-4c', jiraKey: '', issueType: 'Story', title: 'Auto-gen API docs from OpenAPI spec', description: '', jiraProject: 'DOMO', status: 'synced', createdAt: '2025-12-10T00:00:00Z', lastSyncedAt: '2026-04-14T08:00:00Z', assignee: 'Priya Sharma' },

    // Data Pipeline - Kafka (synced, green)
    { id: 'jt-5a1', featureId: 'feat-5a', jiraKey: '', issueType: 'Story', title: 'Kafka consumer service setup', description: '', jiraProject: 'DOMO', status: 'synced', createdAt: '2026-03-20T00:00:00Z', lastSyncedAt: '2026-04-14T08:00:00Z', assignee: 'Raj Patel' },
    // ETL (draft — gray)
    { id: 'jt-5b1', featureId: 'feat-5b', jiraKey: '', issueType: 'Story', title: 'Spark ETL pipeline POC', description: '', jiraProject: 'DOMO', status: 'draft', createdAt: '2026-04-01T00:00:00Z' },
    // Monitoring (draft — gray, feature modified after → yellow when synced)
    { id: 'jt-5d1', featureId: 'feat-5d', jiraKey: '', issueType: 'Bug', title: 'Fix pipeline throughput metric calculation', description: 'Throughput metric underreporting by ~15%.', jiraProject: 'DOMO', status: 'draft', createdAt: '2026-04-05T00:00:00Z' }
  ];

  return { projects, features, jiraTickets };
}

// ===== INITIALIZATION =====
async function init() {
  try {
    await DataService.init();
  } catch (e) {
    // DataService.init crashed — force localStorage so app still works
    state.useLocalStorage = true;
    console.warn('Storage init failed:', e);
  }

  // Load data
  state.projects = await DataService.getAll(CONFIG.collections.projects);
  state.features = await DataService.getAll(CONFIG.collections.features);
  state.jiraTickets = await DataService.getAll(CONFIG.collections.jiraTickets);

  // Seed sample data if empty
  if (state.projects.length === 0) {
    const sample = getSampleData();
    for (const p of sample.projects) {
      await DataService.create(CONFIG.collections.projects, p);
    }
    for (const f of sample.features) {
      await DataService.create(CONFIG.collections.features, f);
    }
    for (const t of sample.jiraTickets) {
      await DataService.create(CONFIG.collections.jiraTickets, t);
    }
    state.projects = sample.projects;
    state.features = sample.features;
    state.jiraTickets = sample.jiraTickets;
  }

  // Collapse all projects and epics by default
  state.projects.forEach(p => state.collapsedProjects.add(p.id));
  state.features.filter(f => f.type === 'Epic').forEach(f => state.collapsedEpics.add(f.id));

  state.loading = false;
  render();
}

// Start app
document.addEventListener('DOMContentLoaded', init);
