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
  const parsed = JSON.parse(raw) as { violations?: unknown };
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
