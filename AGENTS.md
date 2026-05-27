# AGENTS.md — AI Development Guide

## Domo CLI Auto-Login
- Instance: `domo.demo.domo.com`
- If login is needed: `domo login` and select `domo.demo.domo.com`
- Login sessions persist — only re-login when expired
- Preview locally: `domo dev`
- Publish: `domo publish`

## Project Overview
Domo Custom App (Pro-Code) for PM Roadmap Planning with Jira integration. Full requirements in [docs/PRD.md](docs/PRD.md). Jira API reference notes in [docs/JIRA-API.md](docs/JIRA-API.md).

## Tech Stack
- Domo Custom App (Pro-Code CLI)
- **Vanilla JavaScript** — single file, no build step, no framework. The earlier "React/JSX" framing in this doc was aspirational; the actual implementation is plain JS with `innerHTML` rendering and `addEventListener` bindings. Do NOT introduce React/JSX/Vite/etc. without an explicit migration discussion.
- Domo SDK ([ryuu.js](https://unpkg.com/ryuu.js)) — provides `domo.get/post/put/delete` for AppDB + proxies
- Domo Code Engine — runs a server-side Jira proxy (avoids CORS, holds the PAT)
- Domo AppDB — three collections (Projects, Features, JiraTickets)

## File Structure (actual, flat)
```
pm-roadmap-app/
├── AGENTS.md
├── README.md
├── index.html              # shell — loads ryuu.js + app.js
├── app.js                  # entire app (~3000 lines, see App Architecture below)
├── app.css                 # all styles
├── manifest.json           # Domo app manifest + proxy config
├── logo.png
├── thumbnail.png
├── codeengine/
│   └── jiraProxy.js        # server-side Jira API proxy (Code Engine function)
└── docs/
    ├── PRD.md
    ├── PRD-AI-Chart-Generation.md
    └── JIRA-API.md
```

## App Architecture
Everything lives in [app.js](app.js). Approximate landmarks:

| Lines | Section | Purpose |
|---|---|---|
| 6–106 | `CONFIG` | Jira project key, custom field IDs, status maps, designers list, app URL |
| 108–126 | `state` | Global mutable state (projects, features, jiraTickets, filters, UI flags) |
| 128–222 | `Utils` | id(), escapeHtml(), debounce(), timeAgo(), badge helpers |
| 225–239 | `getFeatureSyncState()` | Computes draft / synced / local-changes per feature |
| 241–378 | `DataService` | AppDB CRUD via `domo.get/post/put/delete` with localStorage fallback |
| 380–530 | `JiraService` | All Jira calls — routed through Code Engine (`/api/codeengine/v2/...`) |
| 532–608 | `Toast`, `Modal` | UI primitives |
| 610–876 | Board view renderers | renderHeader, renderToolbar, renderBoardView, project/epic/item rows |
| 878–1043 | Gantt view renderers | renderGanttView |
| 1044–1795 | Modals | Project modal, Link-Existing-Jira modal, Feature modal (with Jira panel) |
| 1795–1916 | Push / refresh flows | Push-all-to-Jira, Jira refresh |
| 1917+ | Data helpers | getProjectFeatures, getFeatureTickets, draft counts |
| ~2407 | `render()` | Top-level entry — rebuilds `#app` innerHTML on every state change |

Rendering model: state mutates → call `render()` → it rebuilds the DOM and re-binds event listeners. There is no virtual DOM, no diffing. Keep handlers idempotent.

### Which CONFIG fields each UI surface consumes
Use this to know what to update when you add/change a CONFIG entry. (`Utils` helpers — like the badge-color helper at ~line 199 — read `typeColors` / `typeIcons` on behalf of multiple surfaces.)

| Surface | Lines | CONFIG fields read |
|---|---|---|
| Toolbar | 641–669 | `itemTypes` (also hosts the global "🔄 Refresh Jira" button → `refreshAllFromJira()`) |
| Board view | 610–876 | `itemTypes`, `jiraInstance` (+ `typeColors` / `typeIcons` via `Utils`) |
| Gantt view | 878–1043 | none directly (renders pre-computed feature data) |
| Project modal | 1044–1165 | `collections`, `customFields`, `squads`, `statuses` |
| Link-Existing-Jira modal | 1166–1295 | `collections`, `jiraStatusToApp`, `typeToJira` |
| Feature modal (+ Jira panel) | 1296–1795 | `collections`, `customFields`, `designers`, `issueTypeColors`, `issueTypeIcons`, `issueTypes`, `itemTypes`, `jiraInstance`, `jiraProject`, `squads`, `statuses`, `transitionMap`, `typeToJira` |
| Design Board view | 2062–2400 | `collections`, `designers`, `jiraInstance`, `transitionMap` |

The Feature modal is the heaviest consumer — most type/status/squad/transition changes need to be verified there first.

## Data Model

### AppDB collections
- **Projects** — `id`, `name`, `description`, `status`, `squad`, `epicKey`, `color`, `startDate`, `endDate`, `createdAt`, `updatedAt`. `epicKey` is the project's own top-level Jira Epic.
- **Features** — `id`, `projectId`, `parentEpicId` (optional, points at a JiraTicket of type Epic), `name`, `description`, `status`, `jiraStatusName` (raw Jira status string like `"Pull Request"`, populated by refresh and the link-existing flow; used to surface specificity beyond the 4 app statuses), `priority`, `squad`, `startDate`, `endDate`, `assignee`, `jiraKey` (set by link-existing or create-with-Jira flow), `source` (`'linked'` for tickets imported via Link Existing), `lastModifiedAt`.
- **JiraTickets** — `id`, `featureId`, `jiraKey`, `issueType`, `title`, `description`, `jiraProject`, `status` (`'draft' | 'synced'`), `assignee`, `squad`, `createdAt`, `lastSyncedAt`.

### Internal-only fields (not part of stored content)
- `_docId` — AppDB document ID, added by `DataService._unwrap()`. Required for `update()` / `remove()`. Strip it before any write that uses the raw payload form.

### Sync states (per feature, computed)
- `null` — no tickets yet
- `draft` — has tickets, none synced
- `synced` — all synced tickets are newer than feature.lastModifiedAt
- `local-changes` — feature edited since last sync

## Jira Integration

### Wiring
- Browser → `domo.post('/api/codeengine/v2/packages/<pkgId>/.../jiraProxy', {...})` → Code Engine function → `https://onjira.domo.com/rest/api/2/...`
- Code Engine function source: [codeengine/jiraProxy.js](codeengine/jiraProxy.js)
- PAT lives in Code Engine env var `JIRA_PAT` — NEVER hardcode or commit it
- `manifest.json` also declares a proxy (`proxyId: "jira"`) as a fallback path, but the active path is Code Engine

### CONFIG.jiraProject = `'DOMO'`
All tickets are created in the DOMO Jira project.

### Custom field IDs (these will bite you if you guess)
| Field | ID | Notes |
|---|---|---|
| Epic Name | `customfield_11001` | Required when creating an Epic |
| Epic Link | `customfield_11000` | Set on non-Epic issues to link to their parent Epic |
| Squad | `customfield_11200` | `{ value: 'Visualizations' \| 'Content Distribution' \| 'Cross Platform' }`. May reject — code retries without it. |

### Issue types
`Epic`, `Story`, `Improvement`, `Bug`, `MockUp` (note: `MockUp`, not `Mockup` — Jira's name is case-sensitive). `Mock` also appears as a display alias in some maps.

### Status transitions (app → Jira) — `CONFIG.transitionMap`
Transitions use numeric IDs, not names. Examples: `'Planned->In Progress': '1351'`, `'In Progress->Done': '1361'`. If you add an app status, add every transition pair it needs.

### Status mapping (Jira → app) — `CONFIG.jiraStatusToApp`
Jira has many granular statuses; the app collapses them to `Planned / In Progress / Done / Blocked`. Statuses actively used by the team and their app-side mapping:

| Jira status | App status |
|---|---|
| Open, To Do, Concept | Planned |
| In Progress, UX/Design, Ready for Dev, Prep, Pull Request, QA Planning, Reopened | In Progress |
| Resolved, Closed | Done |
| On Hold, Blocked | Blocked |

If you add a new Jira status to the team's workflow, also add it here — unmapped statuses cause the refresh-from-Jira flow to silently leave the app status unchanged (see `refreshProjectFromJira` line ~1877: `if (appStatus && ...)`).

### Reporter
Derived from `domo.env.userEmail` → email prefix (e.g. `chris.wright@domo.com` → `chris.wright`). If Jira rejects the reporter, `createIssue` retries without it.

### Assignee
Hardcoded list in `CONFIG.designers`. Add/remove there and republish. Jira Server uses the `name` field (e.g. `lauren.jensen`), not display name.

### App URL appended to MockUp descriptions
`CONFIG.appUrl` is appended ONLY to MockUp issue descriptions, so designers clicking through Jira email notifications land in the roadmap. Don't append it to other types — keeps descriptions clean.

## Draft → Push Workflow
1. User edits a Feature in the Feature modal; tickets are added with `status: 'draft'` and no `jiraKey`.
2. User clicks Push (per-ticket or Push All for a project).
3. `JiraService.pushTicket()` creates the Jira issue. On success, the ticket's `status` flips to `'synced'`, `jiraKey` and `lastSyncedAt` are populated.
4. If the parent project has no `epicKey`, "Push All" creates a project-level Epic first via `JiraService.createEpic()`.

Implication: a ticket is either a draft (AppDB only) or synced (AppDB + Jira). NEVER end up in a third state — Jira-only with no AppDB record, or AppDB "synced" without a `jiraKey`.

## Refresh-from-Jira (pull) Workflow
Linked items can drift from their Jira counterparts as engineers change status/assignee in Jira. Two manual sync entry points exist:

- **Toolbar → "🔄 Refresh Jira"** ([app.js](app.js) renderToolbar, action `refresh-jira-all`) — calls `refreshAllFromJira()` to walk every Jira-linked item across all projects.
- **Per-project 🔄 icon** ([app.js:718](app.js#L718), action `refresh-project`) — calls `refreshProjectFromJira(projectId)` for one project only.
- **Per-epic 🔄 icon** (epic header actions in `renderEpicContainer`, action `refresh-epic`) — calls `refreshEpicFromJira(epicId)` for the epic + all its child items (Features with `parentEpicId === epicId`). Uses `state.refreshingEpicIds` Set for per-epic spinner state so multiple epics can spin independently.

`refreshProjectFromJira` handles **two data shapes** because the app has two ways to attach a Jira issue to an Item:

| Path | How it's created | Where `jiraKey` lives | Notes |
|---|---|---|---|
| **A** | Link Existing Jira Ticket modal OR Create Item with "Create Jira" checkbox | On the **Feature** record itself (`feature.jiraKey`) | The dominant pattern in practice. Marked `source: 'linked'` for the link-existing case. |
| **B** | Add child ticket inside Feature modal → Push to Jira | On a child **JiraTicket** record (`status: 'synced'`, `jiraKey: 'DOMO-...'`) referenced by `featureId` | Rarer; the draft → push flow. |

The refresh walks **both** — for each project's Features, it pulls Path A by checking `feat.jiraKey`, then iterates Path B by querying child JiraTickets where `status === 'synced'`. Each fetch reads `fields.status.name` + `fields.assignee.displayName`, translates the status via `CONFIG.jiraStatusToApp`, and updates the Item's status + assignee. If you add a third attachment path in the future, you MUST add a walk for it here too — otherwise the refresh will silently miss it (the original bug: only Path B was implemented).

`lastModifiedAt` on the Feature is bumped only when something actually changes during the refresh (status, assignee, or `jiraStatusName`). `lastSyncedAt` is bumped on every Path B ticket fetched regardless of change.

The raw Jira status (e.g. `"Pull Request"`, `"UX/Design"`) is preserved on `feature.jiraStatusName` and surfaced in the UI as:
- A `title` tooltip on the status badge (`renderItemRow`, `renderEpicContainer`) — only when `jiraStatusName !== feature.status`
- A small italic sub-label next to the Jira key (`.jira-status-sub` in CSS) on board rows, epic headers, and design board cards — also only when different

This lets the team keep the 4-status dropdown simple while still seeing "Pull Request" vs "Ready for Dev" vs "UX/Design" at a glance.

Items are 1:1 with their Jira ticket in practice. If that ever changes (one Item with multiple tickets via Path B), the Path B code sets `feat.status` from each ticket in iteration order, which is non-deterministic — a deterministic aggregation rule would be needed then (Blocked > In Progress > Done > Planned is the conventional choice).

The toast reports counts as `Synced N items: X updated, Y unchanged, [Z failed]` — failures are no longer silent.

## Sharp Edges — Don't Do These
- **Don't create tickets directly in Jira without mirroring them as synced AppDB JiraTickets records.** Orphan tickets in Jira aren't visible in the roadmap and break the source-of-truth invariant.
- **Don't use Jira's Epic Link to nest child Epics under a parent project Epic.** This Jira instance's epic-of-epic isn't supported via `customfield_11000`. Child Epics are free-standing in Jira; grouping is tracked in the PM Roadmap AppDB via `JiraTickets.featureId` / project membership.
- **Don't introduce React / JSX / a build step.** The app is intentionally a single vanilla-JS file served as-is by Domo. Adding a bundler changes the publish flow.
- **Don't hardcode the JIRA PAT, ever.** It lives in the Code Engine function's env var.
- **Don't strip `_docId` accidentally before an update.** It's the AppDB doc ID needed for PUT/DELETE.
- **Don't assume `createIssue` will accept `squad` for every issue type.** The code already does a retry-without-squad on failure; preserve that pattern.
- **Don't add `appUrl` to non-MockUp ticket descriptions.** Only MockUp gets it.
- **Don't render-loop.** `render()` rebuilds `#app` innerHTML; calling it inside a render path causes flicker and lost focus.
- **Mobile view uses a simplified timeline, not the full Gantt.** Check `domo.env.device` before rendering.

## Coding Conventions
- Vanilla JS, ES2020+. Single file. No imports, no modules.
- camelCase variables, PascalCase for module-like objects (`Utils`, `Modal`, `JiraService`).
- `Utils.escapeHtml()` everything user-provided that goes into `innerHTML` (search bar input, ticket titles from Jira, etc.). The app is XSS-prone by default — the helper exists for a reason.
- Event handlers are bound after each `render()`. If you add a new interactive element, wire its handler in the same render path or in a `bindXyzActions(modal)` helper.
- Dark theme (Bloomberg-style). Custom properties for colors live in `app.css`.

## Important Notes
- Always check [docs/PRD.md](docs/PRD.md) for the latest requirements.
- Jira integration is opt-in per task, not automatic.
- Issue types limited to: Story, Improvement, Bug, MockUp, Epic.

## Domo CLI Commands
```bash
domo login            # auth (pick domo.demo.domo.com)
domo dev              # local preview
domo publish          # publish current dir to Domo
domo ls               # list apps
domo download         # download an existing app
```
