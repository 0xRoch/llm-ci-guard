# AI Policy Check

This repository demonstrates an automated pull request policy review powered by the OpenAI Codex GitHub Action and a TypeScript helper script. It simulates a lightweight Node.js + TypeScript service with opinionated code review rules enforced by an AI assistant.

## How it works

- Policy rules live in `policy/rules/*.md` and are concatenated into the `policy/main_prompt.md` prompt file that is sent to the model.
- The workflow `.github/workflows/ai-policy-check.yml` downloads the pull request diff, renders the prompt via `scripts/build-policy-prompt.ts`, runs `openai/codex-action@v1` with `gpt-4o-mini` (using `OPENAI_API_KEY`), and stores the response in `result.json`.
- `scripts/parse-result.ts` parses the model output, posts one comment per violation via Octokit, and fails the job if the violation refers to a critical rule (IDs 1 or 2).

## Policy catalog

1. **No direct database queries in controllers** – Controllers should rely on repositories.
2. **Async error handling required** – Awaited calls must be wrapped in error handling.
3. **No `console.log` in production code** – Use a logger instead.
4. **No deprecated imports** – Disallows importing from `legacy/` or `utils_old/` paths.

## Demo application code

- `src/controllers/user.ts` intentionally violates the policies by calling the database directly and using `console.log`.
- `src/repositories/userRepo.ts` shows the preferred repository abstraction.

## Example model output

```json
{
  "violations": [
    {
      "rule": 1,
      "file": "src/controllers/user.ts",
      "comment": "Detected direct prisma.user.findMany usage inside a controller."
    },
    {
      "rule": 3,
      "file": "src/controllers/user.ts",
      "comment": "Found console.log; prefer the shared logger."
    }
  ]
}
```

## Reproducing the demo branches

After pushing this repository to GitHub, create the sample branches and pull requests described below to exercise the workflow:

| Branch | Purpose | Expected Result |
| ------ | ------- | --------------- |
| `fix/refactor-controller` | Moves database access into `userRepo` and removes `console.log`. | ✅ Passes – no violations. |
| `violation/console-log` | Leaves a `console.log` statement in the controller. | ⚠️ Warns – rule 3 comment, CI passes. |
| `violation/missing-try` | Introduces an async controller without error handling. | ❌ Fails – rule 2 violation causes CI failure. |

Each pull request should target the default branch so that the `AI Policy Check` workflow runs on creation and updates.

## Local development

```bash
npm install
npm run build
npx ts-node scripts/parse-result.ts path/to/result.json
```

`parse-result.ts` can run locally using `GITHUB_TOKEN`, `GITHUB_REPOSITORY`, and `GITHUB_EVENT_PATH` environment variables to emulate the GitHub Actions context. Without them it prints the violations to stdout.

The project depends on the standard `@octokit/rest`, `ts-node`, and `typescript` packages from the public npm registry.
