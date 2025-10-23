const { request } = require('node:https');
const { URL } = require('node:url');

function performRequest(url, options, body) {
  return new Promise((resolve, reject) => {
    const target = new URL(url);
    const requestOptions = {
      method: options.method || 'GET',
      headers: options.headers || {},
      hostname: target.hostname,
      port: target.port || 443,
      path: `${target.pathname}${target.search}`,
    };

    const req = request(requestOptions, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const raw = Buffer.concat(chunks).toString('utf8');
        const payload = {
          status: res.statusCode || 0,
          headers: res.headers,
          data: raw,
        };
        resolve(payload);
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(body);
    }

    req.end();
  });
}

class Octokit {
  constructor(options = {}) {
    this._authToken = options.auth;
    this.issues = {
      createComment: this._createComment.bind(this),
    };
  }

  async _createComment({ owner, repo, issue_number, body }) {
    if (!owner || !repo || !issue_number) {
      throw new Error('Missing owner, repo, or issue number for comment request.');
    }

    const requestBody = JSON.stringify({ body });
    const response = await performRequest(
      `https://api.github.com/repos/${owner}/${repo}/issues/${issue_number}/comments`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(requestBody),
          'User-Agent': 'local-octokit-stub',
          ...(this._authToken ? { Authorization: `Bearer ${this._authToken}` } : {}),
        },
      },
      requestBody,
    );

    if (response.status < 200 || response.status >= 300) {
      let details = response.data;
      try {
        const parsed = JSON.parse(response.data);
        details = parsed.message || response.data;
      } catch (error) {
        // ignore parse failure and keep raw data
      }
      throw new Error(`GitHub API request failed with status ${response.status}: ${details}`);
    }

    try {
      return JSON.parse(response.data || '{}');
    } catch (error) {
      return { data: response.data };
    }
  }
}

module.exports = { Octokit };
