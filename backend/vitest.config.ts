import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    coverage: { include: ['src/domain/**', 'src/application/**'] },
  },
  resolve: {
    alias: {
      '@domain': r('./src/domain'),
      '@application': r('./src/application'),
      '@infrastructure': r('./src/infrastructure'),
      '@config': r('./src/config'),
    },
  },
});
