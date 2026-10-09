import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '../..');

function resolveFabricHome() {
  if (process.env.FABRIC_HOME && fs.existsSync(process.env.FABRIC_HOME)) {
    return process.env.FABRIC_HOME;
  }
  const home = process.env.HOME || process.env.USERPROFILE || '';
  const candidates = [
    path.join(home, '.fabric-samples', 'fabric-samples'),
    path.join(home, '.fabric-samples'),
    path.join(home, 'fabric-samples'),
    path.join(REPO_ROOT, 'fabric-samples'),
  ];
  for (const c of candidates) {
    if (fs.existsSync(path.join(c, 'test-network'))) {
      return c;
    }
  }
  return path.join(home, '.fabric-samples', 'fabric-samples');
}

const fabricHome = resolveFabricHome();
const orgsDir = path.join(fabricHome, 'test-network', 'organizations');

const orgConfigs = [
  {
    mspId: 'Org1MSP',
    orgName: 'Org1',
    domain: 'org1.example.com',
    peerEndpoint: 'localhost:7051',
    peerHostAlias: 'peer0.org1.example.com',
    caUrl: 'https://localhost:7054',
    caName: 'ca-org1',
  },
  {
    mspId: 'Org2MSP',
    orgName: 'Org2',
    domain: 'org2.example.com',
    peerEndpoint: 'localhost:9051',
    peerHostAlias: 'peer0.org2.example.com',
    caUrl: 'https://localhost:8054',
    caName: 'ca-org2',
  },
  {
    mspId: 'Org3MSP',
    orgName: 'Org3',
    domain: 'org3.example.com',
    peerEndpoint: 'localhost:11051',
    peerHostAlias: 'peer0.org3.example.com',
    caUrl: 'https://localhost:11054',
    caName: 'ca-org3',
  },
];

const connectionProfile = {
  version: '1.0.0',
  channel: 'rwa-channel',
  chaincode: 'rwa',
  organizations: {},
};

for (const org of orgConfigs) {
  const peerOrgDir = path.join(
    orgsDir,
    'peerOrganizations',
    org.domain
  );
  const tlsCertPath = path.join(
    peerOrgDir,
    'tlsca',
    `tlsca.${org.domain}-cert.pem`
  );
  const caCertPath = path.join(
    peerOrgDir,
    'ca',
    `ca.${org.domain}-cert.pem`
  );

  connectionProfile.organizations[org.mspId] = {
    mspId: org.mspId,
    orgName: org.orgName,
    domain: org.domain,
    peer: {
      endpoint: org.peerEndpoint,
      hostAlias: org.peerHostAlias,
      tlsCaCertPath: tlsCertPath,
    },
    certificateAuthority: {
      url: org.caUrl,
      caName: org.caName,
      tlsCaCertPath: caCertPath,
    },
  };
}

const outputDir = path.join(REPO_ROOT, '.fabric');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const outputPath = path.join(outputDir, 'connection.json');
fs.writeFileSync(outputPath, JSON.stringify(connectionProfile, null, 2), 'utf8');
console.log(`✅ Generated Fabric connection profile at: ${outputPath}`);
