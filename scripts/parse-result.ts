import { readFileSync } from "fs";
import { Octokit } from "@octokit/rest";

interface Violation {
  rule: number | string;
  file: string;
  comment?: string;
  line?: number;
}

async function main(): Promise<void> {
  const [, , resultPath] = process.argv;

  if (!resultPath) {
    console.error("Missing result path argument.");
    process.exit(1);
    return;
  }

  const raw = readFileSync(resultPath, "utf8");
  const parsed = parseResult(raw);
  const violations: Violation[] = Array.isArray(parsed?.violations)
    ? (parsed.violations as Violation[])
    : [];

  if (violations.length === 0) {
    console.log("No policy violations detected.");
    return;
  }

  const token = process.env.GITHUB_TOKEN;
  const repository = process.env.GITHUB_REPOSITORY ?? "";
  const [owner, repo] = repository.split("/");
  const eventPath = process.env.GITHUB_EVENT_PATH;
  const event = eventPath
    ? (JSON.parse(readFileSync(eventPath, "utf8")) as {
        pull_request?: { number?: number };
        number?: number;
      })
    : undefined;
  const pullNumber = event?.pull_request?.number ?? event?.number;

  const octokit = token ? new Octokit({ auth: token }) : undefined;

  if (!octokit) {
    console.warn("GITHUB_TOKEN not set. Running in dry-run mode without PR comments.");
  }

  if (!owner || !repo || !pullNumber) {
    console.warn(
      "Missing repository or pull request context. Comments will not be posted."
    );
  }

  let hasCriticalViolation = false;

  for (const violation of violations) {
    const ruleId = Number(violation.rule);
    if (!Number.isNaN(ruleId) && ruleId <= 2) {
      hasCriticalViolation = true;
    }

    const bodyLines = [
      `⚠️ Policy violation detected for rule ${violation.rule}.`,
      `File: ${violation.file}`,
      violation.line ? `Line: ${violation.line}` : undefined,
      violation.comment ? `Details: ${violation.comment}` : undefined,
    ].filter(Boolean) as string[];

    const body = bodyLines.join("\n");

    if (octokit && owner && repo && pullNumber) {
      await octokit.issues.createComment({
        owner,
        repo,
        issue_number: pullNumber,
        body,
      });
      console.log(`Commented on PR for rule ${violation.rule} in ${violation.file}.`);
    } else {
      console.log(`[dry-run] ${body}`);
    }
  }

  if (hasCriticalViolation) {
    console.error("Critical policy violations detected. Failing workflow.");
    process.exit(1);
    return;
  }

  console.log("Policy violations detected but none were critical.");
}

void main().catch((error) => {
  console.error("Failed to parse policy result:", error);
  process.exit(1);
});

function parseResult(raw: string): { violations?: unknown } {
  const direct = tryParseJson(raw);
  if (direct) {
    return direct;
  }

  const extracted =
    extractJsonFromFence(raw) ?? extractFirstJsonObject(raw) ?? raw.trim();

  const fallback = tryParseJson(extracted);
  if (fallback) {
    console.warn("Policy result contained extra text. Parsed JSON payload.");
    return fallback;
  }

  throw new Error("Unable to extract JSON payload from policy result.");
}

function tryParseJson<T>(input: string): T | undefined {
  try {
    return JSON.parse(input) as T;
  } catch {
    return undefined;
  }
}

function extractJsonFromFence(raw: string): string | undefined {
  const match = /```(?:json)?\s*([\s\S]*?)```/i.exec(raw);
  return match ? match[1].trim() : undefined;
}

function extractFirstJsonObject(raw: string): string | undefined {
  const startIndex = findFirstJsonStart(raw);
  if (startIndex === -1) {
    return undefined;
  }

  const closingIndex = findMatchingEnd(raw, startIndex);
  if (closingIndex === -1) {
    return undefined;
  }

  return raw.slice(startIndex, closingIndex + 1);
}

function findFirstJsonStart(raw: string): number {
  for (let index = 0; index < raw.length; index += 1) {
    const char = raw[index];
    if (char === "{" || char === "[") {
      return index;
    }
  }
  return -1;
}

function findMatchingEnd(raw: string, startIndex: number): number {
  const startChar = raw[startIndex];
  const endChar = startChar === "{" ? "}" : "]";
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = startIndex; index < raw.length; index += 1) {
    const char = raw[index];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
    } else if (char === startChar) {
      depth += 1;
    } else if (char === endChar) {
      depth -= 1;
      if (depth === 0) {
        return index;
      }
    }
  }

  return -1;
}
