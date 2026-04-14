# CLAUDE.md — AI Development Guide

## Project Overview
This is a Domo Custom App (Pro-Code) for PM Roadmap Planning 
with Jira integration. See /docs/PRD.md for full requirements.

## Tech Stack
- Domo Custom App (Pro-Code CLI)
- React (JSX)
- Domo AppDB for data storage
- Jira/Atlassian API for ticket sync
- Deployed via Domo CLI

## Key Architecture Decisions
- Tasks are NOT 1:1 with Jira tickets
- Jira tickets use a draft → push workflow
- Responsive design uses domo.env.device + CSS media queries
- All data persists in Domo AppDB (3 collections: Projects, Features, Jira Tickets)

## Coding Conventions
- Use functional React components with hooks
- Use consistent naming: camelCase for variables, PascalCase for components
- Keep components modular and reusable
- Dark theme UI (Bloomberg-style aesthetic)

## File Structure
pm-roadmap-app/
├── README.md
├── CLAUDE.md
├── docs/
│ └── PRD.md
├── manifest.json
├── src/
│ ├── index.html
│ ├── index.js
│ ├── App.jsx
│ ├── components/
│ │ ├── BoardView.jsx
│ │ ├── GanttView.jsx
│ │ ├── ProjectCard.jsx
│ │ ├── FeatureModal.jsx
│ │ └── JiraPanel.jsx
│ ├── services/
│ │ ├── appdb.js
│ │ └── jira.js
│ └── styles/
│ └── main.css

## AppDB Collections
- **Projects** — id, name, description, status, createdAt, updatedAt
- **Features** — id, projectId, name, description, status, priority, startDate, endDate
- **JiraTickets** — id, featureId, jiraKey, issueType, title, description, jiraProject, status

## Important Notes
- Always check /docs/PRD.md for the latest requirements
- Jira integration is opt-in per task, not automatic
- Mobile view should use simplified timeline, not full Gantt
- Issue types limited to: Story, Improvement, Bug, Mockup