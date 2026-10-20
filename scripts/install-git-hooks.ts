// Production installs omit the hook manager. Archives have no Git checkout.
// Skip those cases, but let actual installation errors fail `bun install`.
export {};

if (await Bun.file("node_modules/simple-git-hooks/package.json").exists()) {
  const git = Bun.spawnSync(["git", "rev-parse", "--git-dir"], {
    stdout: "ignore",
    stderr: "ignore",
  });
  if (git.exitCode === 0) {
    // The CLI catches errors without failing; the API preserves rejections.
    const { setHooksFromConfig, skipInstall } = require("simple-git-hooks");
    if (!skipInstall()) await setHooksFromConfig();
  }
}
