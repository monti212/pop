import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    // Edge-function logic lives under supabase/functions/_shared as plain TS so it
    // can be imported here. Files that call Deno.serve() or import npm: specifiers
    // are NOT importable from Node and must not be included.
    include: ['src/**/*.test.ts', 'supabase/functions/**/*.test.ts'],
    clearMocks: true,
    restoreMocks: true,
  },
});
