import { transformAsync } from '@babel/core';
import { plugin } from 'bun';
import { isServer } from 'solid-js/web';

/**
 * bun test preload: compile `.tsx`/`.jsx` with Solid's JSX compiler
 * (babel-preset-solid, the same compiler the tsup build uses) instead of
 * Bun's React-style automatic runtime, which Solid does not provide.
 */
if (isServer) {
  throw new Error(
    "solid-js resolved to its server build, where effects never run. Run the suite with 'bun run test' (bun test --conditions browser).",
  );
}

plugin({
  name: 'solid-jsx',
  setup(build) {
    build.onLoad({ filter: /\.[jt]sx$/ }, async ({ path }) => {
      const source = await Bun.file(path).text();
      const result = await transformAsync(source, {
        filename: path,
        babelrc: false,
        configFile: false,
        sourceMaps: 'inline',
        presets: [
          ['babel-preset-solid', { generate: 'dom', hydratable: false }],
          ['@babel/preset-typescript', { onlyRemoveTypeImports: true }],
        ],
      });
      if (!result?.code) {
        throw new Error(`Solid JSX transform produced no output for ${path}`);
      }
      return { contents: result.code, loader: 'js' };
    });
  },
});
