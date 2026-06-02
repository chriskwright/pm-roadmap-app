# Jira API Reference (Atlassian Cloud)

> Migrated Mar 2026 from on-prem `onjira.domo.com` (Bearer PAT) to Atlassian
> Cloud. Issue keys (DOMO-*) and most status names carried over unchanged.

## Connection Details
- **Instance**: https://domoinc.atlassian.net
- **API Version**: REST API v2 (kept so `description` stays a plain string; v3 requires ADF)
- **Auth Method**: HTTP **Basic** — `base64(email:apiToken)`
- **Project Key**: DOMO
- **Cloud ID**: `99bec84d-0c8d-4803-add0-c2e626043761`

### Credentials (inlined in the Code Engine function, never committed)
Domo Code Engine has **no** environment-variable / secrets store, so the Cloud
creds are inlined as constants at the top of the `jiraProxy` function
(package `6130b21a-b0c1-4462-8124-6684b7fbf3f8`). They exist ONLY in the Code
Engine UI — the repo copy ([../codeengine/jiraProxy.js](../codeengine/jiraProxy.js))
carries `SET_IN_CODE_ENGINE` placeholders.
- `JIRA_EMAIL` — Atlassian account that owns the token (currently `chris.wright@domo.com`)
- `JIRA_API_TOKEN` — token from id.atlassian.com/manage-profile/security/api-tokens
- App pins the function version in [../app.js](../app.js) (`versions/1.0.3`)

## Endpoints
- Base URL: `https://domoinc.atlassian.net/rest/api/2`
- Create Issue: `POST /issue`
- Get Issue: `GET /issue/{key}`
- Transition: `POST /issue/{key}/transitions`
- Update: `PUT /issue/{key}`
- Get My Profile: `GET /myself`
- Search: `GET /search/jql?jql=...` (the old `GET /search` is deprecated on Cloud)

## Custom Fields (changed from on-prem)

| Field | Cloud ID | Was (on-prem) | Used For |
|-------|----------|---------------|----------|
| Epic Name | `customfield_10011` | `customfield_11001` | Required when creating an Epic |
| Epic Link | `customfield_10014` | `customfield_11000` | Links a Story/Bug/etc to an Epic. `parent` is **not** on the DOMO create screen — use Epic Link. |
| Squad | `customfield_10071` | `customfield_11200` | **REQUIRED on create.** `{ value: '<name>' }` |

### Squad allowed values (subset the app uses)
`Visualizations` (10142), `Content Distribution` (10068), `Cross-Platform` (10455).
Note the hyphen in `Cross-Platform` (was `Cross Platform` on-prem). Squad is
required, so every create must include a valid value — the app defaults to
`Visualizations` via `JiraService._squadField()`.

## Users (assignee / reporter)
Cloud identifies users by **`accountId`**, not username. Assignee is sent as
`{ "accountId": "557058:..." }`. The app keeps a username→accountId map in
`CONFIG.designers`. Reporter is not set by the app (the bot account owns
creation).

## Issue Types
| Type | Cloud issuetype id | When To Use |
|------|--------------------|-------------|
| Epic | 10000 | Top-level project/initiative |
| Story | 10004 | Feature work (default) |
| Improvement | 10063 | Enhancements to existing features |
| Bug | 10037 | Defects/issues |
| MockUp | 10038 | Design mockups (note: `MockUp`, case-sensitive) |

## Example: Create an Epic
```json
{
  "fields": {
    "project": { "key": "DOMO" },
    "summary": "Epic title here",
    "issuetype": { "name": "Epic" },
    "customfield_10011": "Epic name here",
    "customfield_10071": { "value": "Visualizations" }
  }
}
```

## Example: Create a Story linked to an Epic
```json
{
  "fields": {
    "project": { "key": "DOMO" },
    "summary": "Story title here",
    "issuetype": { "name": "Story" },
    "customfield_10014": "DOMO-XXXXXX",
    "customfield_10071": { "value": "Visualizations" }
  }
}
```

## Status Transitions (Story workflow)
The Story-workflow transition IDs were **preserved** in the migration, so the
app's `CONFIG.transitionMap` is unchanged. (The Epic workflow uses different
IDs, but the app only transitions items, not epics.)

| App Status Change | Jira Transition | ID |
|------------------|----------------|-----|
| Planned → In Progress | In Progress | 1351 |
| In Progress → Done | Resolve Issue | 1361 |
| Done → Closed | Close Issue | 1371 |
| Any → Blocked | Blocked | 1401 |
| Any → Reopen | Reopen Issue | 1321 |

### Example: Transition a Ticket
```json
POST /rest/api/2/issue/DOMO-XXXXX/transitions
{ "transition": { "id": "1351" } }
```

### Jira → App Status Mapping
See `CONFIG.jiraStatusToApp` in app.js (extended for Cloud statuses: Backlog,
Initial Scoping, Triaged, Dev Planning, Alpha, Beta, Approved, etc.).
