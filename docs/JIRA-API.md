# Jira API Reference

## Connection Details
- **Instance**: https://onjira.domo.com
- **API Version**: REST API v2
- **Auth Method**: Personal Access Token (Bearer)
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