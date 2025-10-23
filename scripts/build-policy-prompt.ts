import { readFileSync, readdirSync, writeFileSync, mkdirSync } from "fs";
import { dirname, join, resolve } from "path";

interface Args {
  template: string;
  diff: string;
  output: string;
}

function parseArgs(): Args {
  const args = process.argv.slice(2);
  const result: Partial<Args> = {};

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (!arg.startsWith("--")) {
      continue;
    }

    const key = arg.slice(2);
    const value = args[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`Missing value for --${key}`);
    }

    index += 1;

    if (key === "template") {
      result.template = value;
    } else if (key === "diff") {
      result.diff = value;
    } else if (key === "output") {
      result.output = value;
    } else {
      throw new Error(`Unknown option: --${key}`);
    }
  }

  if (!result.template || !result.diff || !result.output) {
    throw new Error(
      "Usage: ts-node build-policy-prompt.ts --template <path> --diff <path> --output <path>"
    );
  }

  return result as Args;
}

function renderTemplate(templatePath: string): string {
  const template = readFileSync(templatePath, "utf8");
  const templateDir = dirname(resolve(templatePath));

  const pattern = /{{\s*concatenate all ([^}]+)\s*}}/g;

  return template.replace(pattern, (_, rawInstruction: string) => {
    const instruction = rawInstruction.trim();
    const concatenateMatch = /^(\*\.md) in (.+)$/.exec(instruction);
    if (!concatenateMatch) {
      throw new Error(`Unsupported prompt instruction: ${instruction}`);
    }

    const [, filePattern, relativeDir] = concatenateMatch;
    if (filePattern !== "*.md") {
      throw new Error(`Unsupported file pattern: ${filePattern}`);
    }

    const targetDir = resolve(templateDir, relativeDir.trim());

    const files = readdirSync(targetDir)
      .filter((file) => file.endsWith(".md"))
      .sort();

    const contents = files.map((file) => readFileSync(join(targetDir, file), "utf8").trim());

    return contents.join("\n\n");
  });
}

function buildPrompt(template: string, diff: string): string {
  const normalizedTemplate = template.trimEnd();
  const normalizedDiff = diff.trimEnd();

  return `${normalizedTemplate}

Git diff to review:
\`\`\`diff
${normalizedDiff}
\`\`\`
`;
}

function main(): void {
  const { template, diff, output } = parseArgs();

  const rendered = renderTemplate(template);
  const diffContents = readFileSync(diff, "utf8");
  const prompt = buildPrompt(rendered, diffContents);

  const outputDir = dirname(resolve(output));
  mkdirSync(outputDir, { recursive: true });
  writeFileSync(output, prompt);
  console.log(`Wrote rendered policy prompt to ${output}.`);
}

try {
  main();
} catch (error) {
  console.error(
    "Failed to build policy prompt:",
    error instanceof Error ? error.message : error
  );
  process.exit(1);
}

