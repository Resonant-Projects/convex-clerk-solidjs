#!/usr/bin/env bun
/**
 * Pre-commit guard: block committing files over MAX_TOKENS estimated tokens.
 *
 * Tokens are estimated as bytes / 4, so the limit is MAX_TOKENS * 4 bytes.
 * Only STAGED files are checked, and the size measured is the staged blob
 * (`git cat-file -s :path`), not the working-tree file.
 *
 * Dependency-free: runs with `bun scripts/check-file-tokens.ts`.
 * Wired up as a pre-commit hook via simple-git-hooks (see package.json).
 *
 * Exit codes: 0 = ok, 1 = at least one staged file is over the limit.
 */

import { spawnSync } from "node:child_process";

const MAX_TOKENS = 5_000;
const BYTES_PER_TOKEN = 4;
const MAX_BYTES = MAX_TOKENS * BYTES_PER_TOKEN; // 20,000 bytes

// ---------------------------------------------------------------------------
// IGNORE LIST — files that are not authored by humans or agents.
// Patterns are gitignore-style globs matched against the repo-relative path:
//   `**`  matches any number of path segments (including none)
//   `*`   matches anything within a single segment
//   A pattern without a `/` matches the basename in any directory.
//   A pattern with a `/` is anchored to the repo root; prefix it with `**/`
//   to match that directory anywhere in the tree.
// Add a path here (and nothing else) if a file is genuinely generated.
// ---------------------------------------------------------------------------
const IGNORE_PATTERNS: string[] = [
  // --- Lockfiles ---
  "bun.lock",
  "bun.lockb",
  "package-lock.json",
  "npm-shrinkwrap.json",
  "pnpm-lock.yaml",
  "yarn.lock",
  "Cargo.lock",
  "poetry.lock",
  "uv.lock",
  "Pipfile.lock",
  "Gemfile.lock",
  "go.sum",
  "composer.lock",
  "flake.lock",
  "deno.lock",

  // --- Generated / codegen output ---
  "**/_generated/**", // convex/_generated/** and any other _generated dir
  "**/generated/**",
  "**/__generated__/**",
  "*.gen.*",
  "routeTree.gen.ts",
  "worker-configuration.d.ts",
  "*.d.ts.map",
  "*.js.map",
  "*.css.map",
  "**/dist/**", // tsup output (gitignored, listed for safety)
  "**/build/**",
  "**/out/**", // gitignored in this repo, listed for safety
  "**/coverage/**",
  "*.tsbuildinfo",

  // --- Minified / bundled ---
  "*.min.*",
  "*.bundle.*",

  // --- Snapshots & fixtures ---
  "**/__snapshots__/**",
  "*.snap",

  // --- Images ---
  "*.png", "*.jpg", "*.jpeg", "*.gif", "*.webp", "*.avif", "*.bmp", "*.ico",
  "*.svg", "*.tiff", "*.tif", "*.psd", "*.heic",

  // --- Fonts ---
  "*.woff", "*.woff2", "*.ttf", "*.otf", "*.eot",

  // --- Archives / binaries / databases ---
  "*.zip", "*.gz", "*.tgz", "*.tar", "*.bz2", "*.xz", "*.7z", "*.rar",
  "*.db", "*.sqlite", "*.sqlite3", "*.lockb", "*.wasm", "*.bin", "*.exe",
  "*.dll", "*.so", "*.dylib", "*.pdf", "*.jar", "*.class", "*.pyc",

  // --- Video / audio ---
  "*.mp4", "*.mov", "*.avi", "*.mkv", "*.webm", "*.mp3", "*.wav", "*.ogg",
  "*.flac", "*.m4a", "*.aac",
];

// ---------------------------------------------------------------------------

function globToRegExp(pattern: string): RegExp {
  // Patterns without a slash match the basename anywhere in the tree.
  const anchored = pattern.includes("/") ? pattern : `**/${pattern}`;
  let re = "";
  for (let i = 0; i < anchored.length; i++) {
    const ch = anchored[i];
    if (ch === "*") {
      if (anchored[i + 1] === "*") {
        // `**/` -> zero or more full segments; trailing `**` -> anything.
        if (anchored[i + 2] === "/") {
          re += "(?:.*/)?";
          i += 2;
        } else {
          re += ".*";
          i += 1;
        }
      } else {
        re += "[^/]*";
      }
    } else if (ch === "?") {
      re += "[^/]";
    } else {
      re += ch!.replace(/[.+^${}()|[\]\\]/g, "\\$&");
    }
  }
  return new RegExp(`^${re}$`);
}

const IGNORE_REGEXPS = IGNORE_PATTERNS.map(globToRegExp);

function isIgnored(path: string): boolean {
  return IGNORE_REGEXPS.some((re) => re.test(path));
}

function git(args: string[]): string {
  const result = spawnSync("git", args, { encoding: "utf8" });
  if (result.status !== 0) {
    process.stderr.write(result.stderr ?? "");
    throw new Error(`git ${args.join(" ")} failed with status ${result.status}`);
  }
  return result.stdout;
}

/** Staged files (Added, Copied, Modified, Renamed) with their binary status. */
function stagedFiles(): { path: string; binary: boolean }[] {
  // --numstat prints "-\t-\tpath" for files git treats as binary.
  // --no-renames keeps the -z output a flat (added, deleted, path) triple;
  // a rename then shows up as an Add, which --diff-filter=ACM still includes.
  const out = git([
    "diff", "--cached", "--numstat", "--no-renames", "--diff-filter=ACMR", "-z",
  ]);
  const files: { path: string; binary: boolean }[] = [];
  for (const entry of out.split("\0")) {
    if (!entry) continue;
    // Split on the first two tabs only: with -z, git keeps literal tabs in
    // filenames, so the path is everything after the second tab.
    const firstTab = entry.indexOf("\t");
    const secondTab = entry.indexOf("\t", firstTab + 1);
    if (firstTab === -1 || secondTab === -1) continue;
    const added = entry.slice(0, firstTab);
    const deleted = entry.slice(firstTab + 1, secondTab);
    const path = entry.slice(secondTab + 1);
    if (!path) continue;
    files.push({ path, binary: added === "-" && deleted === "-" });
  }
  return files;
}

/** Size in bytes of the STAGED blob for `path` (not the working-tree file).
 *  `:0:` pins index stage 0 so a filename like `0:notes.ts` is not misread. */
function stagedBlobSize(path: string): number {
  return Number.parseInt(git(["cat-file", "-s", `:0:${path}`]).trim(), 10);
}

function estimateTokens(bytes: number): number {
  return Math.ceil(bytes / BYTES_PER_TOKEN);
}

function main(): number {
  const offenders: { path: string; bytes: number; tokens: number }[] = [];

  for (const { path, binary } of stagedFiles()) {
    if (binary || isIgnored(path)) continue;
    const bytes = stagedBlobSize(path);
    if (bytes > MAX_BYTES) {
      offenders.push({ path, bytes, tokens: estimateTokens(bytes) });
    }
  }

  if (offenders.length === 0) return 0;

  offenders.sort((a, b) => b.bytes - a.bytes);
  const fmt = (n: number) => n.toLocaleString("en-US");
  const lines = [
    "",
    `✖ Commit blocked: ${offenders.length} staged file(s) exceed ${fmt(MAX_TOKENS)} estimated tokens (${fmt(MAX_BYTES)} bytes; tokens ≈ bytes / ${BYTES_PER_TOKEN}).`,
    "",
    ...offenders.map(
      (o) => `  ${o.path}  —  ~${fmt(o.tokens)} tokens (${fmt(o.bytes)} bytes)`,
    ),
    "",
    "Large files are expensive for humans and agents to read and edit. Split each file",
    "above so every resulting file stays under 5,000 tokens (20,000 bytes):",
    "  1. Split by responsibility: break the file into smaller modules, one concern each.",
    "  2. Move types, interfaces, constants, and small helpers into their own files",
    "     (e.g. foo.types.ts, foo.constants.ts, foo.helpers.ts).",
    "  3. Extract components, hooks, and sub-functions into separate files.",
    "  4. If callers import from a single path, re-export the pieces from an index file",
    "     (e.g. foo/index.ts) so the public API does not change.",
    "  5. Re-stage the new files and commit again.",
    "",
    "If this file is genuinely generated or not hand-authored, add a pattern for it to",
    "IGNORE_PATTERNS in scripts/check-file-tokens.ts instead of splitting it.",
    "",
    "Emergency bypass (use sparingly):  git commit --no-verify",
    "",
  ];
  process.stderr.write(lines.join("\n"));
  return 1;
}

process.exit(main());
