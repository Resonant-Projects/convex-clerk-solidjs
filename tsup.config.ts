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
    // The dts step runs on the TypeScript 6 pocket (see package.json) and
    // tsup injects `baseUrl`, which TS 6 flags as deprecated; silence only
    // that deprecation, scoped to the dts build.
    dts: d.dts
      ? { compilerOptions: { ignoreDeprecations: '6.0' } }
      : undefined,
    external: [
      ...(Array.isArray(d.external) ? d.external : []),
      'solid-js',
      'convex',
      'clerk-solidjs',
      '@solidjs/router',
    ],
  }));
});
