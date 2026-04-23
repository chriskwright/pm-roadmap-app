# Jira API Reference

## Connection Details
- **Instance**: https://onjira.domo.com
- **API Version**: REST API v2
- **Auth Method**: Jira API Token (Bearer)
- **Project Key**: DOMO

## Endpoints

### Base URL
`https://onjira.domo.com/rest/api/2`

### Create Issue
`POST /issue`

### Get My Profile
`GET /myself`

## Custom Fields

| Field | ID | Used For |
|-------|-----|----------|
| Epic Name | `customfield_11001` | Required when creating an Epic |
| Epic Link | `customfield_11000` | Links a Story/Bug/etc to an Epic |

## Issue Types

| Type | When To Use |
|------|------------|
| Epic | Top-level project/initiative |
| Story | Feature work (default) |
| Improvement | Enhancements to existing features |
| Bug | Defects/issues |
| Mock | Design mockups |

## Example: Create an Epic

```json
{
  "fields": {
    "project": {"key": "DOMO"},
    "summary": "Epic title here",
    "issuetype": {"name": "Epic"},
    "customfield_11001": "Epic name here"
  }
}
{
  "fields": {
    "project": {"key": "DOMO"},
    "summary": "Story title here",
    "issuetype": {"name": "Story"},
    "customfield_11000": "DOMO-XXXXXX"
  }

---

## Status Transitions

### All Available Transitions
| Transition | ID |
|-----------|-----|
| Start Progress | 1351 |
| Resolve Issue | 1361 |
| Close Issue | 1371 |
| On Hold | 1261 |
| Approval Request | 1271 |
| Approved | 1291 |
| VP Approval | 1301 |
| To Do / Concept | 1311 |
| Reopen Issue | 1321 |
| Prep | 1331 |
| UX/Design | 1341 |
| Pull Request | 1381 |
| Ready for Dev | 1391 |
| Blocked | 1401 |
| QA Planning | 1411 |
| Triaged | 1421 |

### App → Jira Status Mapping
| App Status Change | Jira Transition | ID |
|------------------|----------------|-----|
| Planned → In Progress | Start Progress | 1351 |
| In Progress → Done | Resolve Issue | 1361 |
| Done → Closed | Close Issue | 1371 |
| Any → Blocked | Blocked | 1401 |
| Any → Reopen | Reopen Issue | 1321 |

### Jira → App Status Mapping
| Jira Status | App Status |
|------------|-----------|
| Open | Planned |
| To Do | Planned |
| In Progress | In Progress |
| UX/Design | In Progress |
| Ready for Dev | In Progress |
| Resolved | Done |
| Closed | Done |
| On Hold | Blocked |
| Blocked | Blocked |

### Example: Transition a Ticket
```json
POST /rest/api/2/issue/DOMO-XXXXX/transitions
{
  "transition": {
    "id": "1351"
  }
}
}

---

## Save and Push

```bash
git add .
git commit -m "Added Jira API reference docs"
git push
pm-roadmap-app/
├── README.md
├── CLAUDE.md
├── .env              (local only — never pushed)
├── .gitignore
├── docs/
│   ├── PRD.md
│   └── JIRA-API.md   ← NEW!