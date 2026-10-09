import esbuild from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ccRoot = path.resolve(__dirname, '..');
const outDir = path.join(ccRoot, 'build', 'cc');

fs.mkdirSync(outDir, { recursive: true });

await esbuild.build({
  entryPoints: [path.join(ccRoot, 'dist', 'index.js')],
  outfile: path.join(outDir, 'index.cjs'),
  bundle: true,
  platform: 'node',
  target: 'node18',
  format: 'cjs',
  external: ['fabric-contract-api', 'fabric-shim'],
});

const pkgJson = {
  name: 'rwa-cc',
  version: '1.0.0',
  main: 'index.cjs',
  scripts: {
    'start:server':
      'fabric-chaincode-node server --chaincode-address=$CHAINCODE_SERVER_ADDRESS --chaincode-id=$CHAINCODE_ID',
  },
  dependencies: {
    'fabric-contract-api': '^2.5.4',
    'fabric-shim': '^2.5.4',
  },
};

fs.writeFileSync(
  path.join(outDir, 'package.json'),
  JSON.stringify(pkgJson, null, 2)
);

const dockerfileSrc = path.join(ccRoot, 'ccaas', 'Dockerfile');
if (fs.existsSync(dockerfileSrc)) {
  fs.copyFileSync(dockerfileSrc, path.join(outDir, 'Dockerfile'));
}

console.log('✅ Bundled chaincode to build/cc/index.cjs');
