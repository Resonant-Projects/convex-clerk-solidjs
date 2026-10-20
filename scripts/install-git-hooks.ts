// Production installs omit the hook manager. Only this checkout may own hooks.
// Skip those cases, but let actual installation errors fail `bun install`.
export {};

if (await Bun.file("node_modules/simple-git-hooks/package.json").exists()) {
  const git = Bun.spawnSync(["git", "rev-parse", "--show-prefix"], {
    stderr: "ignore",
  });
  // An empty prefix means cwd is the checkout root, including linked worktrees.
  // A nested package must never replace its enclosing repository's hooks.
  if (git.exitCode === 0 && git.stdout.toString().trim() === "") {
    // The CLI catches errors without failing; the API preserves rejections.
    const { setHooksFromConfig, skipInstall } = require("simple-git-hooks");
    if (!skipInstall()) await setHooksFromConfig();
  }
}
