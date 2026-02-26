import { build } from 'esbuild'
import { readFileSync, writeFileSync } from 'fs'

// 1. Run esbuild to bundle the code (resolves @repo/shared via alias)
await build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  outfile: 'dist/index.js',
  platform: 'node',
  target: 'node24',
  format: 'esm',
  // Resolve @repo/shared directly from source so it gets bundled in
  // without needing it in package.json (which Cloud Build can't resolve).
  alias: {
    '@repo/shared': '../../packages/shared/src/index.ts',
  },
  // Mark Firebase/GCP SDKs as external — they're installed at deploy time
  // from package.json dependencies. Everything else (like @repo/shared) gets bundled in.
  external: [
    'firebase-admin',
    'firebase-admin/*',
    'firebase-functions',
    'firebase-functions/*',
    '@google/genai',
    'google-auth-library',
    '@trpc/server',
    '@trpc/server/*',
    'express',
    'cors',
    'express-rate-limit',
    'zod',
  ],
  // Needed for ESM output with external packages
  banner: {
    js: "import { createRequire } from 'module'; const require = createRequire(import.meta.url);",
  },
})

console.log('Bundle complete: dist/index.js')

// 2. Strip devDependencies from package.json for Cloud Build.
//    Cloud Build uses npm which can't resolve workspace:* refs or peer conflicts.
//    The code is pre-bundled, so devDeps aren't needed at deploy time.
//    The original is restored after deploy via: git restore apps/functions/package.json
const pkg = JSON.parse(readFileSync('package.json', 'utf-8'))
delete pkg.devDependencies
delete pkg.dependencies['@repo/shared']
writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n')
console.log('Stripped workspace deps from package.json for deployment')
