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
  itemTypes: ['Story', 'Improvement', 'Bug', 'UX', 'Epic'],
  // Map app item types to Jira issue types
  typeToJira: { Story: 'Story', Improvement: 'Improvement', Bug: 'Bug', UX: 'Mock', Epic: 'Epic' },
  projectColors: [
    '#3b82f6', '#8b5cf6', '#ec4899', '#10b981',
    '#f59e0b', '#06b6d4', '#f97316', '#a855f7',
    '#14b8a6', '#e11d48'
  ],
  typeColors: {
    Epic: '#8b5cf6',
    Story: '#3b82f6',
    Improvement: '#06b6d4',
    Bug: '#ef4444',
    UX: '#ec4899'
  },
  typeIcons: {
    Epic: '\u26A1',
    Story: '\u{1F4D6}',
    Improvement: '\u2B06',
    Bug: '\u{1F41B}',
    UX: '\u{1F3A8}'
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
    return this.createLinkedIssue(
      ticket.issueType,
      ticket.title,
      ticket.description || '',
      epicKey
    );
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
        <div class="view-toggle">
          <button class="view-toggle-btn ${state.currentView === 'board' ? 'active' : ''}"
            data-action="set-view" data-view="board">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
              <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
            </svg>
            <span>Board</span>
          </button>
          <button class="view-toggle-btn ${state.currentView === 'gantt' ? 'active' : ''}"
            data-action="set-view" data-view="gantt">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="4" y1="6" x2="16" y2="6"/><line x1="8" y1="12" x2="20" y2="12"/>
              <line x1="4" y1="18" x2="14" y2="18"/>
            </svg>
            <span>Gantt</span>
          </button>
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

  return `
    <div class="project-group ${isCollapsed ? 'collapsed' : ''}" data-project-id="${project.id}">
      <div class="project-header" data-action="toggle-project" data-project-id="${project.id}">
        <div class="project-header-top">
          <span class="project-collapse-icon">&#9660;</span>
          <span class="project-color-dot" style="background:${color}"></span>
          <span class="project-name">${Utils.escapeHtml(project.name)}</span>
          <span class="badge ${Utils.getStatusBadgeClass(project.status)}">${project.status}</span>
          ${project.squad ? `<span class="project-squad-badge">${Utils.escapeHtml(project.squad)}</span>` : ''}
          ${project.epicKey ? `<a class="project-epic-badge" href="${CONFIG.jiraInstance}/browse/${Utils.escapeHtml(project.epicKey)}" target="_blank" onclick="event.stopPropagation()">&#9889; ${Utils.escapeHtml(project.epicKey)}</a>` : ''}
          <span class="project-meta">
            <span class="project-feature-count">${features.length} item${features.length !== 1 ? 's' : ''}</span>
          </span>
          <div class="project-progress-wrap">
            <div class="progress-bar" style="flex:1">
              <div class="progress-fill ${pct === 100 ? 'complete' : ''}" style="width:${pct}%"></div>
            </div>
            <span class="project-progress-pct">${pct}%</span>
          </div>
          <div class="project-header-actions">
            <button class="btn-icon" data-action="refresh-project" data-project-id="${project.id}" title="Refresh from Jira">&#x1F504;</button>
            <button class="btn-icon" data-action="edit-project" data-project-id="${project.id}" title="Edit project">&#9998;</button>
            <button class="btn-icon" data-action="delete-project" data-project-id="${project.id}" title="Delete project">&#128465;</button>
          </div>
        </div>
        ${project.description ? `<div class="project-description">${Utils.escapeHtml(project.description)}</div>` : ''}
      </div>
      <div class="project-collapse-body">
        <div class="project-collapse-inner">
          <div class="project-body">
            ${filtered.map(f => renderFeatureCard(f, color)).join('')}
            <div class="add-feature-card" data-action="add-feature" data-project-id="${project.id}">
              + Add Item
            </div>
          </div>
          ${draftCount > 0 ? `
            <div class="push-all-bar">
              <span><span class="draft-count">${draftCount}</span> draft ticket${draftCount !== 1 ? 's' : ''} ready to push</span>
              <button class="btn btn-sm btn-success" data-action="push-all-project" data-project-id="${project.id}">
                Push All to Jira
              </button>
            </div>` : ''}
        </div>
      </div>
    </div>`;
}

function renderFeatureCard(feature, projectColor) {
  const itemType = feature.type || 'Story';
  const typeColor = Utils.getTypeColor(itemType);

  return `
    <div class="feature-card" data-action="edit-feature" data-feature-id="${feature.id}">
      <div class="feature-card-priority-line" style="background:${typeColor}"></div>
      <div class="feature-card-top">
        <span class="feature-card-name">${Utils.escapeHtml(feature.name)}</span>
        <div class="feature-card-badges">
          <span class="badge-type" style="background:${typeColor}15;color:${typeColor};border:1px solid ${typeColor}30">${itemType}</span>
          <span class="badge ${Utils.getStatusBadgeClass(feature.status)}">${feature.status}</span>
        </div>
      </div>
      ${feature.description ? `<div class="feature-card-desc">${Utils.escapeHtml(feature.description)}</div>` : ''}
      <div class="feature-card-bottom">
        <span class="feature-card-dates">
          ${Utils.formatDate(feature.startDate)}
          <span class="date-sep">&#8594;</span>
          ${Utils.formatDate(feature.endDate)}
        </span>
        <div class="feature-card-jira">
          ${feature.jiraKey ? `<a class="jira-item-link" href="${CONFIG.jiraInstance}/browse/${Utils.escapeHtml(feature.jiraKey)}" target="_blank" onclick="event.stopPropagation()">${Utils.escapeHtml(feature.jiraKey)}</a>` : ''}
        </div>
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
          Toast.success('Project updated');
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
          Modal.confirm('Are you sure you want to delete this project? This will also delete all Jira tickets and the Epic. You cannot undo this.', async () => {
            // Delete features, their Jira issues, and tickets from Jira and AppDB
            const feats = getProjectFeatures(project.id);
            for (const f of feats) {
              await deleteFeatureFromJira(f);
              const tickets = getFeatureTickets(f.id);
              for (const t of tickets) {
                await deleteTicketFromJira(t);
                await DataService.remove(CONFIG.collections.jiraTickets, t.id);
                state.jiraTickets = state.jiraTickets.filter(x => x.id !== t.id);
              }
              await DataService.remove(CONFIG.collections.features, f.id);
              state.features = state.features.filter(x => x.id !== f.id);
            }
            await deleteEpicFromJira(project);
            await DataService.remove(CONFIG.collections.projects, project.id);
            state.projects = state.projects.filter(p => p.id !== project.id);
            Toast.success('Project and Jira issues deleted');
            render();
          });
        });
      }
    }
  });
}

// ===== MODALS: FEATURE (with Jira Panel) =====
function openFeatureModal(featureId, projectId) {
  const isEdit = !!featureId;
  const feature = isEdit ? state.features.find(f => f.id === featureId) : { projectId };
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
            <div style="display:flex;gap:8px;justify-content:flex-end">
              <button class="btn btn-sm btn-secondary" id="jt-cancel">Cancel</button>
              <button class="btn btn-sm btn-primary" id="jt-save">Save Draft</button>
            </div>
          </div>
        </div>
      </div>`;
  }

  const hasJiraKey = isEdit && feature.jiraKey;

  Modal.open(`
    <div class="modal-header">
      <div class="modal-title">${isEdit ? 'Edit Item' : 'New Item'}</div>
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
          rows="2">${Utils.escapeHtml(feature.description || '')}</textarea>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Type</label>
          <select class="form-select" id="feat-type">
            ${CONFIG.itemTypes.map(t => `<option value="${t}" ${(feature.type || 'Story') === t ? 'selected' : ''}>${t}</option>`).join('')}
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
      ${hasJiraKey ? `
        <div class="form-group">
          <label class="form-label">Jira Issue</label>
          <a class="jira-item-link-large" href="${CONFIG.jiraInstance}/browse/${Utils.escapeHtml(feature.jiraKey)}" target="_blank">
            ${Utils.escapeHtml(feature.jiraKey)}
          </a>
          ${project && project.epicKey ? `<span class="jira-epic-ref">linked to ${Utils.escapeHtml(project.epicKey)}</span>` : ''}
        </div>
      ` : `
        <div class="form-group">
          <label class="form-checkbox">
            <input type="checkbox" id="feat-create-jira">
            Create Jira issue${project && project.epicKey ? ' (linked to Epic ' + Utils.escapeHtml(project.epicKey) + ')' : ''}
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
        const doc = {
          id: isEdit ? feature.id : Utils.id(),
          _docId: isEdit ? feature._docId : undefined,
          projectId: feature.projectId || projectId,
          name,
          description: newDesc,
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
            if (newDesc) fields.description = newDesc;
            if (project && project.epicKey && jiraType !== 'Epic') {
              fields[CONFIG.customFields.epicLink] = project.epicKey;
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

        // Jira sync for synced tickets
        const syncedTickets = state.jiraTickets.filter(
          t => t.featureId === feature.id && t.status === 'synced' && t.jiraKey
        );
        let jiraOk = true;
        let jiraSynced = false;

        // 1. Status transition
        if (oldStatus !== newStatus && syncedTickets.length > 0) {
          const transKey = `${oldStatus}->${newStatus}`;
          const transitionId = CONFIG.transitionMap[transKey];
          if (transitionId) {
            try {
              for (const ticket of syncedTickets) {
                await JiraService.transitionIssue(ticket.jiraKey, transitionId);
                ticket.lastSyncedAt = now;
                await DataService.update(CONFIG.collections.jiraTickets, ticket);
                const tIdx = state.jiraTickets.findIndex(t => t.id === ticket.id);
                if (tIdx >= 0) state.jiraTickets[tIdx] = { ...ticket };
              }
              jiraSynced = true;
              Toast.success('Status synced to Jira');
            } catch (e) {
              jiraOk = false;
              // Revert status locally
              doc.status = oldStatus;
              await DataService.update(CONFIG.collections.features, doc);
              if (fIdx >= 0) state.features[fIdx] = { ...doc };
              Toast.error('Jira transition failed \u2014 status reverted');
            }
          }
        }

        // 2. Field push (title/description)
        if (jiraOk && syncedTickets.length > 0) {
          const nameChanged = name !== (feature.name || '');
          const descChanged = newDesc !== (feature.description || '');
          if (nameChanged || descChanged) {
            try {
              for (const ticket of syncedTickets) {
                const fields = {};
                if (nameChanged) fields.summary = name;
                if (descChanged) fields.description = newDesc;
                await JiraService.updateIssueFields(ticket.jiraKey, fields);
                ticket.lastSyncedAt = now;
                await DataService.update(CONFIG.collections.jiraTickets, ticket);
                const tIdx = state.jiraTickets.findIndex(t => t.id === ticket.id);
                if (tIdx >= 0) state.jiraTickets[tIdx] = { ...ticket };
              }
              if (!jiraSynced) Toast.success('Synced to Jira');
              jiraSynced = true;
            } catch (e) {
              // Non-critical — feature saved, Jira field push failed
            }
          }
        }

        if (!jiraSynced) Toast.success('Feature updated');
        Modal.close();
        render();
      });

      // Delete feature
      if (isEdit) {
        modal.querySelector('#feat-delete').addEventListener('click', () => {
          Modal.close();
          Modal.confirm(`Delete "${feature.name}"? This will also delete any linked Jira issues.`, async () => {
            // Delete the item's own Jira issue
            await deleteFeatureFromJira(feature);
            // Delete any linked Jira tickets (old model)
            const fTickets = getFeatureTickets(feature.id);
            for (const t of fTickets) {
              await deleteTicketFromJira(t);
              await DataService.remove(CONFIG.collections.jiraTickets, t.id);
              state.jiraTickets = state.jiraTickets.filter(x => x.id !== t.id);
            }
            await DataService.remove(CONFIG.collections.features, feature.id);
            state.features = state.features.filter(f => f.id !== feature.id);
            Toast.success('Item and Jira issue deleted');
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

// ===== JIRA DELETE HELPERS =====
async function deleteJiraIssue(jiraKey) {
  if (!jiraKey) return;
  try {
    await JiraService._call('DELETE', `/issue/${jiraKey}`);
  } catch (e) {
    console.warn('Failed to delete Jira issue ' + jiraKey + ':', e.message);
  }
}

async function deleteTicketFromJira(ticket) {
  if (ticket.jiraKey) await deleteJiraIssue(ticket.jiraKey);
}

async function deleteEpicFromJira(project) {
  if (project.epicKey) await deleteJiraIssue(project.epicKey);
}

async function deleteFeatureFromJira(feature) {
  if (feature.jiraKey) await deleteJiraIssue(feature.jiraKey);
}

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

// ===== RENDER =====
function render() {
  const app = document.getElementById('app');
  app.innerHTML = `
    ${renderHeader()}
    ${renderToolbar()}
    <div class="app-main">
      ${state.currentView === 'board' ? renderBoardView() : renderGanttView()}
    </div>`;
  bindEvents();

  // Sync Gantt label scrolling
  if (state.currentView === 'gantt') {
    syncGanttScroll();
  }
}

// ===== EVENT BINDING =====
function bindEvents() {
  const app = document.getElementById('app');

  // Delegate clicks
  app.addEventListener('click', (e) => {
    // Clicks on Jira links — copy URL to clipboard (iframe sandbox blocks popups)
    const clickedLink = e.target.closest('a[href]');
    if (clickedLink) {
      e.preventDefault();
      e.stopPropagation();
      const href = clickedLink.getAttribute('href');
      navigator.clipboard.writeText(href).then(() => {
        Toast.success('Copied: ' + href);
      }).catch(() => {
        Toast.info(href);
      });
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
          Modal.confirm('Are you sure you want to delete this project? This will also delete all Jira tickets and the Epic. You cannot undo this.', async () => {
            const feats = getProjectFeatures(proj.id);
            for (const f of feats) {
              await deleteFeatureFromJira(f);
              const tickets = getFeatureTickets(f.id);
              for (const t of tickets) {
                await deleteTicketFromJira(t);
                await DataService.remove(CONFIG.collections.jiraTickets, t.id);
                state.jiraTickets = state.jiraTickets.filter(x => x.id !== t.id);
              }
              await DataService.remove(CONFIG.collections.features, f.id);
              state.features = state.features.filter(x => x.id !== f.id);
            }
            await deleteEpicFromJira(proj);
            await DataService.remove(CONFIG.collections.projects, proj.id);
            state.projects = state.projects.filter(p => p.id !== proj.id);
            Toast.success('Project and Jira issues deleted');
            render();
          });
        }
        break;
      case 'toggle-project':
        const pid = target.dataset.projectId;
        const group = document.querySelector(`.project-group[data-project-id="${pid}"]`);
        if (state.collapsedProjects.has(pid)) {
          state.collapsedProjects.delete(pid);
          if (group) group.classList.remove('collapsed');
        } else {
          state.collapsedProjects.add(pid);
          if (group) group.classList.add('collapsed');
        }
        break;
      case 'toggle-collapse-all':
        if (state.collapsedProjects.size > 0) {
          state.collapsedProjects.clear();
        } else {
          state.projects.forEach(p => state.collapsedProjects.add(p.id));
        }
        // Apply to all current DOM groups
        document.querySelectorAll('.project-group').forEach(g => {
          g.classList.toggle('collapsed', state.collapsedProjects.size > 0);
        });
        // Update button text (find fresh reference)
        document.querySelectorAll('[data-action="toggle-collapse-all"]').forEach(btn => {
          btn.textContent = state.collapsedProjects.size > 0 ? 'Expand All' : 'Collapse All';
        });
        break;
      case 'add-feature':
        openFeatureModal(null, target.dataset.projectId);
        break;
      case 'edit-feature':
        openFeatureModal(target.dataset.featureId, null);
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
      epicKey: 'DOMO-481000',
      createdAt: '2025-12-15T00:00:00Z',
      updatedAt: '2026-03-20T00:00:00Z'
    },
    {
      id: 'proj-2',
      name: 'Analytics Dashboard v3',
      description: 'Next-generation analytics with real-time streaming and custom widget support.',
      status: 'In Progress',
      epicKey: 'DOMO-481050',
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
      epicKey: 'DOMO-480900',
      createdAt: '2025-09-15T00:00:00Z',
      updatedAt: '2026-01-31T00:00:00Z'
    },
    {
      id: 'proj-5',
      name: 'Data Pipeline Upgrade',
      description: 'Kafka integration, ETL optimization, and real-time data quality monitoring.',
      status: 'In Progress',
      epicKey: 'DOMO-481100',
      createdAt: '2026-02-01T00:00:00Z',
      updatedAt: '2026-04-10T00:00:00Z'
    }
  ];

  const features = [
    // Platform Modernization
    { id: 'feat-1a', projectId: 'proj-1', name: 'Migrate Auth Service', description: 'Move authentication to OAuth2/OIDC with SSO support.', status: 'Done', type: 'Story', startDate: '2026-01-06', endDate: '2026-02-14', jiraKey: 'DOMO-481001', createdAt: '2025-12-15T00:00:00Z', lastModifiedAt: '2026-02-14T10:00:00Z' },
    { id: 'feat-1b', projectId: 'proj-1', name: 'API Gateway v2', description: 'Implement new API gateway with circuit breakers and observability.', status: 'In Progress', type: 'Improvement', startDate: '2026-02-01', endDate: '2026-04-15', jiraKey: 'DOMO-481010', createdAt: '2025-12-15T00:00:00Z', lastModifiedAt: '2026-04-14T11:00:00Z' },
    { id: 'feat-1c', projectId: 'proj-1', name: 'Database Sharding', description: 'Horizontal sharding strategy for user and event tables.', status: 'In Progress', type: 'Story', startDate: '2026-03-01', endDate: '2026-05-30', createdAt: '2026-01-10T00:00:00Z', lastModifiedAt: '2026-04-10T00:00:00Z' },
    { id: 'feat-1d', projectId: 'proj-1', name: 'Legacy Deprecation', description: 'Sunset v1 APIs and migrate remaining consumers.', status: 'Planned', type: 'Story', startDate: '2026-06-01', endDate: '2026-08-15', createdAt: '2026-02-01T00:00:00Z', lastModifiedAt: '2026-02-01T00:00:00Z' },

    // Analytics Dashboard v3
    { id: 'feat-2a', projectId: 'proj-2', name: 'Real-time Streaming', description: 'WebSocket-based live data streaming for dashboards.', status: 'In Progress', type: 'Story', startDate: '2026-02-15', endDate: '2026-05-01', jiraKey: 'DOMO-481051', createdAt: '2026-01-10T00:00:00Z', lastModifiedAt: '2026-04-13T00:00:00Z' },
    { id: 'feat-2b', projectId: 'proj-2', name: 'Custom Widgets', description: 'Drag-and-drop widget builder with custom data bindings.', status: 'Planned', type: 'UX', startDate: '2026-04-01', endDate: '2026-06-30', createdAt: '2026-01-15T00:00:00Z', lastModifiedAt: '2026-03-22T00:00:00Z' },
    { id: 'feat-2c', projectId: 'proj-2', name: 'Export to PDF', description: 'One-click PDF export with scheduled report delivery.', status: 'Planned', type: 'Improvement', startDate: '2026-05-15', endDate: '2026-07-15', createdAt: '2026-02-01T00:00:00Z', lastModifiedAt: '2026-02-01T00:00:00Z' },
    { id: 'feat-2d', projectId: 'proj-2', name: 'Dashboard Templates', description: 'Pre-built templates for common analytics use cases.', status: 'In Progress', type: 'Story', startDate: '2026-03-01', endDate: '2026-04-30', jiraKey: 'DOMO-481055', createdAt: '2026-01-20T00:00:00Z', lastModifiedAt: '2026-04-12T00:00:00Z' },

    // Mobile Experience
    { id: 'feat-3a', projectId: 'proj-3', name: 'Responsive Redesign', description: 'Fully responsive layouts for all core views.', status: 'Planned', type: 'UX', startDate: '2026-05-01', endDate: '2026-07-31', createdAt: '2026-03-01T00:00:00Z', lastModifiedAt: '2026-03-01T00:00:00Z' },
    { id: 'feat-3b', projectId: 'proj-3', name: 'Offline Mode', description: 'Service worker and IndexedDB for offline data access.', status: 'Planned', type: 'Story', startDate: '2026-07-01', endDate: '2026-09-30', createdAt: '2026-03-01T00:00:00Z', lastModifiedAt: '2026-03-01T00:00:00Z' },
    { id: 'feat-3c', projectId: 'proj-3', name: 'Push Notifications', description: 'Real-time alerts for status changes and mentions.', status: 'Planned', type: 'Improvement', startDate: '2026-08-01', endDate: '2026-10-15', createdAt: '2026-03-01T00:00:00Z', lastModifiedAt: '2026-03-01T00:00:00Z' },

    // API Gateway (Done)
    { id: 'feat-4a', projectId: 'proj-4', name: 'Rate Limiting', description: 'Sliding window rate limiter with per-client quotas.', status: 'Done', type: 'Story', startDate: '2025-10-01', endDate: '2025-12-15', jiraKey: 'DOMO-480901', createdAt: '2025-09-15T00:00:00Z', lastModifiedAt: '2025-12-15T00:00:00Z' },
    { id: 'feat-4b', projectId: 'proj-4', name: 'Auth Tokens', description: 'JWT-based auth with refresh token rotation.', status: 'Done', type: 'Story', startDate: '2025-11-01', endDate: '2026-01-15', jiraKey: 'DOMO-480910', createdAt: '2025-09-20T00:00:00Z', lastModifiedAt: '2026-01-15T00:00:00Z' },
    { id: 'feat-4c', projectId: 'proj-4', name: 'Documentation Portal', description: 'Auto-generated API docs with interactive sandbox.', status: 'Done', type: 'Improvement', startDate: '2025-12-01', endDate: '2026-01-31', jiraKey: 'DOMO-480920', createdAt: '2025-10-01T00:00:00Z', lastModifiedAt: '2026-01-31T00:00:00Z' },

    // Data Pipeline Upgrade
    { id: 'feat-5a', projectId: 'proj-5', name: 'Kafka Integration', description: 'Replace polling with event-driven Kafka consumers.', status: 'In Progress', type: 'Story', startDate: '2026-03-15', endDate: '2026-06-15', jiraKey: 'DOMO-481101', createdAt: '2026-02-01T00:00:00Z', lastModifiedAt: '2026-04-13T00:00:00Z' },
    { id: 'feat-5b', projectId: 'proj-5', name: 'ETL Optimization', description: 'Rewrite slow transforms with Apache Spark.', status: 'Planned', type: 'Improvement', startDate: '2026-05-01', endDate: '2026-07-31', createdAt: '2026-02-15T00:00:00Z', lastModifiedAt: '2026-04-01T00:00:00Z' },
    { id: 'feat-5c', projectId: 'proj-5', name: 'Data Quality Checks', description: 'Automated validation rules with anomaly detection.', status: 'Planned', type: 'Bug', startDate: '2026-06-15', endDate: '2026-08-31', createdAt: '2026-03-01T00:00:00Z', lastModifiedAt: '2026-03-01T00:00:00Z' },
    { id: 'feat-5d', projectId: 'proj-5', name: 'Monitoring Dashboard', description: 'Real-time pipeline health and throughput metrics.', status: 'In Progress', type: 'UX', startDate: '2026-04-01', endDate: '2026-05-31', createdAt: '2026-03-15T00:00:00Z', lastModifiedAt: '2026-04-14T09:00:00Z' }
  ];

  const jiraTickets = [
    // Platform Modernization - Auth Service (synced, green — lastSynced after lastModified)
    { id: 'jt-1a1', featureId: 'feat-1a', jiraKey: 'DOMO-481001', issueType: 'Story', title: 'Implement OAuth2 provider integration', description: '', jiraProject: 'DOMO', status: 'synced', createdAt: '2026-01-06T00:00:00Z', lastSyncedAt: '2026-04-14T08:00:00Z', assignee: 'Sarah Chen' },
    { id: 'jt-1a2', featureId: 'feat-1a', jiraKey: 'DOMO-481002', issueType: 'Story', title: 'SSO configuration and testing', description: '', jiraProject: 'DOMO', status: 'synced', createdAt: '2026-01-08T00:00:00Z', lastSyncedAt: '2026-04-14T08:00:00Z', assignee: 'Mike Torres' },
    // API Gateway v2 (mix — yellow, feature modified after sync)
    { id: 'jt-1b1', featureId: 'feat-1b', jiraKey: 'DOMO-481010', issueType: 'Story', title: 'Circuit breaker implementation', description: '', jiraProject: 'DOMO', status: 'synced', createdAt: '2026-02-05T00:00:00Z', lastSyncedAt: '2026-04-13T10:00:00Z', assignee: 'James Park' },
    { id: 'jt-1b2', featureId: 'feat-1b', jiraKey: '', issueType: 'Improvement', title: 'Add OpenTelemetry tracing', description: 'Distributed tracing for all gateway routes.', jiraProject: 'DOMO', status: 'draft', createdAt: '2026-03-10T00:00:00Z' },
    // Database Sharding (draft — gray)
    { id: 'jt-1c1', featureId: 'feat-1c', jiraKey: '', issueType: 'Story', title: 'Design sharding key strategy', description: '', jiraProject: 'DOMO', status: 'draft', createdAt: '2026-03-15T00:00:00Z' },

    // Analytics - Real-time (synced, green)
    { id: 'jt-2a1', featureId: 'feat-2a', jiraKey: 'DOMO-481051', issueType: 'Story', title: 'WebSocket server infrastructure', description: '', jiraProject: 'DOMO', status: 'synced', createdAt: '2026-02-20T00:00:00Z', lastSyncedAt: '2026-04-14T08:00:00Z', assignee: 'Lisa Wang' },
    // Custom Widgets (drafts — gray)
    { id: 'jt-2b1', featureId: 'feat-2b', jiraKey: '', issueType: 'Story', title: 'Widget drag-and-drop framework', description: '', jiraProject: 'DOMO', status: 'draft', createdAt: '2026-03-20T00:00:00Z' },
    { id: 'jt-2b2', featureId: 'feat-2b', jiraKey: '', issueType: 'Mock', title: 'Widget builder UI mockups', description: 'Design all widget builder screens.', jiraProject: 'DOMO', status: 'draft', createdAt: '2026-03-22T00:00:00Z' },
    // Dashboard Templates (synced, green)
    { id: 'jt-2d1', featureId: 'feat-2d', jiraKey: 'DOMO-481055', issueType: 'Story', title: 'Template engine implementation', description: '', jiraProject: 'DOMO', status: 'synced', createdAt: '2026-03-05T00:00:00Z', lastSyncedAt: '2026-04-14T08:00:00Z', assignee: 'David Kim' },

    // API Gateway - Rate Limiting (synced, green)
    { id: 'jt-4a1', featureId: 'feat-4a', jiraKey: 'DOMO-480901', issueType: 'Story', title: 'Sliding window rate limiter', description: '', jiraProject: 'DOMO', status: 'synced', createdAt: '2025-10-05T00:00:00Z', lastSyncedAt: '2026-04-14T08:00:00Z', assignee: 'Alex Rivera' },
    // Auth Tokens (synced, green)
    { id: 'jt-4b1', featureId: 'feat-4b', jiraKey: 'DOMO-480910', issueType: 'Story', title: 'JWT generation and validation', description: '', jiraProject: 'DOMO', status: 'synced', createdAt: '2025-11-05T00:00:00Z', lastSyncedAt: '2026-04-14T08:00:00Z', assignee: 'Alex Rivera' },
    // Documentation Portal (synced, green)
    { id: 'jt-4c1', featureId: 'feat-4c', jiraKey: 'DOMO-480920', issueType: 'Story', title: 'Auto-gen API docs from OpenAPI spec', description: '', jiraProject: 'DOMO', status: 'synced', createdAt: '2025-12-10T00:00:00Z', lastSyncedAt: '2026-04-14T08:00:00Z', assignee: 'Priya Sharma' },

    // Data Pipeline - Kafka (synced, green)
    { id: 'jt-5a1', featureId: 'feat-5a', jiraKey: 'DOMO-481101', issueType: 'Story', title: 'Kafka consumer service setup', description: '', jiraProject: 'DOMO', status: 'synced', createdAt: '2026-03-20T00:00:00Z', lastSyncedAt: '2026-04-14T08:00:00Z', assignee: 'Raj Patel' },
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

  state.loading = false;
  render();
}

// Start app
document.addEventListener('DOMContentLoaded', init);
