// Domo Code Engine — Jira API Proxy (Atlassian Cloud)
// Runs server-side on Domo infrastructure (no CORS restrictions).
//
// DEPLOYMENT NOTE: This is a REFERENCE COPY of the function that lives in
// Domo Code Engine (package 6130b21a-b0c1-4462-8124-6684b7fbf3f8, function
// `jiraProxy`). Domo Code Engine has NO environment-variable / secrets store,
// so the Cloud credentials are inlined as constants in the deployed function.
// The REAL email + token exist ONLY in the Code Engine UI — the placeholders
// below must never be replaced with real values in this repo.
//
// MIGRATION (Mar 2026): Domo moved from on-prem Jira (onjira.domo.com,
// Bearer PAT, /rest/api/2) to Atlassian Cloud (domoinc.atlassian.net).
// Cloud auth is HTTP Basic with an Atlassian account email + API token,
// NOT a Bearer PAT. We stay on REST v2 so `description` stays a plain string
// (v3 would require ADF JSON).
//
// The function takes a single input variable `input` (a JSON string), matching
// JiraService._call() in app.js: JSON.stringify({ method, path, body }).

var JIRA_BASE_URL  = 'https://domoinc.atlassian.net/rest/api/2';
var JIRA_EMAIL     = 'SET_IN_CODE_ENGINE';   // real value lives only in the Code Engine UI
var JIRA_API_TOKEN = 'SET_IN_CODE_ENGINE';   // real value lives only in the Code Engine UI

// Cloud uses HTTP Basic: base64("email:apiToken").
var AUTH_HEADER = 'Basic ' + Buffer.from(JIRA_EMAIL + ':' + JIRA_API_TOKEN).toString('base64');

async function jiraProxy(input) {
  var parsed;
  try {
    parsed = JSON.parse(input);
  } catch (e) {
    parsed = { method: 'GET', path: '/myself' };
  }
  var method = parsed.method || 'GET';
  var path = parsed.path || '/myself';
  var body = parsed.body;

  var resp = await fetch(JIRA_BASE_URL + path, {
    method: method,
    headers: {
      'Authorization': AUTH_HEADER,
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    body: body ? JSON.stringify(body) : undefined
  });

  // 204 No Content (transitions, some updates)
  if (resp.status === 204) return { success: true };

  var text = await resp.text();
  var data;
  try { data = JSON.parse(text); } catch (e) { data = { rawResponse: text.slice(0, 500) }; }

  if (!resp.ok) {
    // Cloud returns errors in `errorMessages` (array) and/or `errors` (object).
    var message = text.slice(0, 300);
    if (data.errorMessages && data.errorMessages.length) {
      message = data.errorMessages.join(', ');
    } else if (data.errors && Object.keys(data.errors).length) {
      message = Object.entries(data.errors).map(function (e) { return e[0] + ': ' + e[1]; }).join(', ');
    }
    return { error: true, status: resp.status, message: message };
  }
  return data;
}
