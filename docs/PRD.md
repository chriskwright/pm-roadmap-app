# Product Requirements Document: PM Roadmap App

## 1. Overview
A custom Domo Pro-Code application that enables Product Managers 
to plan, track, and manage their product roadmap. The app provides 
Board and Gantt views for visualizing projects and features, 
stores data in Domo AppDB, and integrates with Jira for 
ticket management.

## 2. Problem Statement
Product Managers need a centralized tool within Domo to plan 
roadmaps, track feature progress, and sync work items to Jira — 
without switching between multiple tools. Existing solutions 
lack tight Domo integration and require manual data entry 
across platforms.

## 3. Target Users
- Product Managers
- UX designers
- Program Managers
- Engineering Leads
- Stakeholders who need roadmap visibility

## 4. Goals & Success Metrics
### Goals
- Provide a single source of truth for roadmap planning inside Domo
- Eliminate manual syncing between roadmap tools and Jira
- Enable both high-level (Gantt) and detailed (Board) views

### Success Metrics
- Reduction in time spent updating roadmaps manually
- Number of projects/features managed in the app
- Jira ticket sync accuracy

## 5. User Stories

### Projects
- As a PM, I want to create a new project so I can group related features
- As a PM, I want to edit/delete a project so I can keep my roadmap current
- As a PM, I want to see project progress so I know how features are tracking

### Features/Tasks
- As a PM, I want to add features under a project with status, priority, and date range
- As a PM, I want to edit/delete features as plans change
- As a PM, I want to filter features by status to focus on what matters

### Board View
- As a PM, I want to see all projects as collapsible groups with feature cards
- As a PM, I want to see status badges, priority, date ranges, and progress bars

### Gantt View
- As a PM, I want to see a horizontal timeline of all features
- As a PM, I want to see a today marker, month/day headers, and weekend shading
- As a PM, I want to click a Gantt bar to edit the feature
- As a PM, I want color-coded bars per project

### Jira Integration
- As a PM, I want to optionally create Jira tickets from a task
- As a PM, I want one task to have zero, one, or many Jira tickets
- As a PM, I want to choose the issue type: Story (default), Improvement, Bug, Mockup
- As a PM, I want to batch draft tickets and push them to Jira when ready
- As a PM, I want to see the Jira ticket key (e.g., ROAD-42) once pushed

### Responsive Design
- As a user on mobile, I want a simplified view optimized for small screens
- As a user on desktop, I want the full Board and Gantt experience

## 6. Functional Requirements

### 6.1 Board View
| ID | Requirement | Priority |
|----|------------|----------|
| BR-1 | Collapsible project groups | High |
| BR-2 | Feature cards with status, priority, date range | High |
| BR-3 | Progress bar per project | High |
| BR-4 | Add/edit/delete projects and features via modals | High |
| BR-5 | Filter by status across all projects | Medium |
| BR-6 | Stats summary in header (total projects, features, completion) | Medium |

### 6.2 Gantt View
| ID | Requirement | Priority |
|----|------------|----------|
| GR-1 | Horizontal timeline with color-coded bars per project | High |
| GR-2 | Today marker | High |
| GR-3 | Month/day headers | High |
| GR-4 | Weekend shading | Low |
| GR-5 | Hover to expand bars with details | Medium |
| GR-6 | Click bar to edit feature | High |

### 6.3 Jira Integration
| ID | Requirement | Priority |
|----|------------|----------|
| JR-1 | Tasks are NOT 1:1 with Jira tickets | High |
| JR-2 | Per-task Jira Tickets panel (add 0, 1, or many) | High |
| JR-3 | Issue type selector: Story, Improvement, Bug, Mockup | High |
| JR-4 | Jira project picker (auto-discover or manual entry) | Medium |
| JR-5 | Draft → Push workflow (batch plan, then send) | High |
| JR-6 | Show Jira key once pushed (e.g., ROAD-42) | High |
| JR-7 | Project-level "Push X to Jira" button for bulk push | Medium |

### 6.4 Data Storage (Domo AppDB)
| ID | Requirement | Priority |
|----|------------|----------|
| DB-1 | Store projects in AppDB collection | High |
| DB-2 | Store features/tasks in AppDB collection | High |
| DB-3 | Store Jira ticket references in AppDB collection | High |
| DB-4 | CRUD operations for all collections | High |

### 6.5 Responsive Design
| ID | Requirement | Priority |
|----|------------|----------|
| RD-1 | Use domo.env.device for device detection | High |
| RD-2 | Desktop: full Board + Gantt views | High |
| RD-3 | Mobile: stacked card layout for Board | High |
| RD-4 | Mobile: simplified timeline instead of full Gantt | Medium |
| RD-5 | Mobile: full-screen slide-up modals | Medium |
| RD-6 | CSS media queries for fine-tuned layout adjustments | Medium |

## 7. Non-Functional Requirements
| Requirement | Details |
|-------------|---------|
| Performance | App should load within 2 seconds |
| Security | Respect Domo user permissions |
| Scalability | Support 50+ projects with 500+ features |
| Accessibility | Keyboard navigable, readable contrast |
| Browser Support | Chrome, Safari, Edge (latest) |

## 8. Tech Stack
| Layer | Technology |
|-------|-----------|
| Platform | Domo Custom App (Pro-Code) |
| Frontend | React (JSX) |
| Data Storage | Domo AppDB |
| External Integration | Jira (Atlassian API) |
| Deployment | Domo CLI |
| Version Control | GitHub |
| AI Assistance | Claude |

## 9. Data Model (AppDB Collections)

### Projects Collection
| Field | Type | Description |
|-------|------|-------------|
| id | string | Unique identifier |
| name | string | Project name |
| description | string | Project description |
| status | string | Planned / In Progress / Done |
| createdAt | date | Date created |
| updatedAt | date | Last modified |

### Features Collection
| Field | Type | Description |
|-------|------|-------------|
| id | string | Unique identifier |
| projectId | string | Parent project reference |
| name | string | Feature name |
| description | string | Feature description |
| status | string | Planned / In Progress / Done |
| priority | string | High / Medium / Low |
| startDate | date | Start date |
| endDate | date | End date |
| createdAt | date | Date created |

### Jira Tickets Collection
| Field | Type | Description |
|-------|------|-------------|
| id | string | Unique identifier |
| featureId | string | Parent feature reference |
| jiraKey | string | Jira issue key (e.g., ROAD-42) |
| issueType | string | Story / Improvement / Bug / Mockup |
| title | string | Ticket title |
| description | string | Ticket description |
| jiraProject | string | Target Jira project key |
| status | string | draft / pushing / synced |
| createdAt | date | Date created |

## 10. Milestones & Timeline
- [ ] Phase 1: Project setup, AppDB schema, basic CRUD
- [ ] Phase 2: Board View with full project/feature management
- [ ] Phase 3: Gantt View with timeline visualization
- [ ] Phase 4: Jira integration (draft/push workflow)
- [ ] Phase 5: Responsive design (mobile/tablet)
- [ ] Phase 6: Testing, polish, and deployment

## 11. Open Questions
- Which Jira project(s) will this connect to?
- Are there existing Domo datasets that need to feed into this?
- Do we need role-based access (e.g., view-only for stakeholders)?
- Should the Gantt support drag-to-resize bars?
- Do we need export functionality (PDF/CSV)?