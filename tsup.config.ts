import { defineConfig } from 'tsup';
import * as preset from 'tsup-preset-solid';

const presetOptions: preset.PresetOptions = {
  entries: [
    {
      entry: 'src/index.tsx',
      dev_entry: 'src/index.tsx',
    },
    {
      name: 'guards',
      entry: 'src/guards/index.ts',
      dev_entry: 'src/guards/index.ts',
    },
  ],
  drop_console: false,
  cjs: false,
};

export default defineConfig(config => {
  const watching = !!config.watch;
  const parsed = preset.parsePresetOptions(presetOptions, watching);
  const tsupOptions = preset.generateTsupOptions(parsed);

  return tsupOptions.map(d => ({
    ...d,
    // Declarations are emitted by `tsc -p tsconfig.build.json` (TypeScript 7)
    // after tsup runs; tsup's own dts step needs the TypeScript 6 compiler API.
    dts: false,
    external: [
      ...(Array.isArray(d.external) ? d.external : []),
      'solid-js',
      'convex',
      '@resonant-projects/clerk-solidjs',
      '@solidjs/router',
    ],
  }));
});
