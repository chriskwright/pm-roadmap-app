// Domo Code Engine — Jira API Proxy
// Runs server-side on Domo infrastructure (no CORS restrictions)

const JIRA_BASE_URL = 'https://onjira.domo.com/rest/api/2';
const JIRA_TOKEN = process.env.JIRA_PAT || 'SET_IN_CODE_ENGINE';

async function jiraRequest(method, path, body) {
  const url = JIRA_BASE_URL + path;
  const opts = {
    method: method || 'GET',
    headers: {
      'Authorization': 'Bearer ' + JIRA_TOKEN,
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    }
  };
  if (body && (method === 'POST' || method === 'PUT')) {
    opts.body = JSON.stringify(body);
  }

  const resp = await fetch(url, opts);

  // 204 No Content (transitions, some updates)
  if (resp.status === 204) {
    return { success: true };
  }

  const text = await resp.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { rawResponse: text.slice(0, 500) };
  }

  if (!resp.ok) {
    return {
      error: true,
      status: resp.status,
      message: data.errorMessages ? data.errorMessages.join(', ') : text.slice(0, 300)
    };
  }

  return data;
}

// === Exported functions (called from Custom App) ===

// Test connection: GET /myself
exports.testConnection = async function() {
  return jiraRequest('GET', '/myself');
};

// Create issue: POST /issue
exports.createIssue = async function(request) {
  return jiraRequest('POST', '/issue', { fields: request.fields });
};

// Get issue: GET /issue/{key}
exports.getIssue = async function(request) {
  return jiraRequest('GET', '/issue/' + request.jiraKey);
};

// Transition issue: POST /issue/{key}/transitions
exports.transitionIssue = async function(request) {
  return jiraRequest('POST', '/issue/' + request.jiraKey + '/transitions', {
    transition: { id: request.transitionId }
  });
};

// Update issue fields: PUT /issue/{key}
exports.updateIssue = async function(request) {
  return jiraRequest('PUT', '/issue/' + request.jiraKey, { fields: request.fields });
};

// Generic passthrough for any Jira API call
exports.apiCall = async function(request) {
  return jiraRequest(request.method || 'GET', request.path, request.body);
};
