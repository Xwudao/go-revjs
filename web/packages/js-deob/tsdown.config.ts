import { defineConfig } from 'tsdown';

export default defineConfig([
  {
    entry: 'src/index.ts',
    format: 'esm',
    dts: true,
    sourcemap: true,
    platform: 'browser',
    outDir: 'dist',
    clean: true,
  },
  {
    entry: 'src/cli.ts',
    format: 'esm',
    dts: false,
    sourcemap: true,
    platform: 'node',
    outDir: 'dist',
    clean: false,
  },
]);
