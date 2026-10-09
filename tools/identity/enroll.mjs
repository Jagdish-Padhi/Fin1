import FabricCAServices from 'fabric-ca-client';
import fabricCommon from 'fabric-common';
const { User, Utils } = fabricCommon;
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SEED_DATA } from '../../db/seeds/seed.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '../..');

const connectionProfilePath =
  process.env.FABRIC_CONNECTION ||
  path.join(REPO_ROOT, '.fabric', 'connection.json');
const orgMapPath = path.join(REPO_ROOT, 'network', 'org-map.json');

if (!fs.existsSync(connectionProfilePath)) {
  console.error(`Connection profile not found at ${connectionProfilePath}`);
  console.error('Run scripts/fabric/network-up.sh first to start the network and generate connection profile.');
  process.exit(1);
}

const connection = JSON.parse(fs.readFileSync(connectionProfilePath, 'utf8'));
const orgMap = JSON.parse(fs.readFileSync(orgMapPath, 'utf8'));

// Build reverse lookup from role to MSP
const roleToMsp = {};
for (const [mspId, cfg] of Object.entries(orgMap)) {
  for (const role of cfg.roles) {
    roleToMsp[role] = mspId;
  }
}

const walletsDir = path.join(REPO_ROOT, '.fabric', 'wallets');
const identityMap = {};

// Helper to get or create CA client and enrolled admin for an MSP
const caAdmins = new Map();

async function getCaAdmin(mspId) {
  if (caAdmins.has(mspId)) {
    return caAdmins.get(mspId);
  }

  const orgConfig = connection.organizations[mspId];
  if (!orgConfig) {
    throw new Error(`MSP ${mspId} not found in connection profile`);
  }

  const caTlsCert = fs.readFileSync(
    orgConfig.certificateAuthority.tlsCaCertPath,
    'utf8'
  );
  const caClient = new FabricCAServices(
    orgConfig.certificateAuthority.url,
    {
      trustedRoots: [caTlsCert],
      verify: false,
    },
    orgConfig.certificateAuthority.caName
  );

  console.log(`Enrolling CA bootstrap admin for ${mspId}...`);
  const adminEnrollment = await caClient.enroll({
    enrollmentID: 'admin',
    enrollmentSecret: 'adminpw',
  });

  const adminUser = new User('admin');
  adminUser.setCryptoSuite(Utils.newCryptoSuite());
  await adminUser.setEnrollment(
    adminEnrollment.key,
    adminEnrollment.certificate,
    mspId
  );

  const context = { caClient, adminUser, mspId };
  caAdmins.set(mspId, context);
  return context;
}

async function registerAndEnrollUser({ id, role, participantId, mspId }) {
  const { caClient, adminUser } = await getCaAdmin(mspId);
  const secret = 'password123';

  const attrs = [
    { name: 'role', value: role, ecert: true },
    { name: 'userId', value: id, ecert: true },
    { name: 'participantId', value: participantId || '', ecert: true },
  ];

  try {
    await caClient.register(
      {
        enrollmentID: id,
        enrollmentSecret: secret,
        role: 'client',
        attrs,
        maxEnrollments: -1,
      },
      adminUser
    );
    console.log(`  Registered identity ${id} with role ${role} in ${mspId}`);
  } catch (err) {
    if (err.message && err.message.includes('already registered')) {
      console.log(`  Identity ${id} already registered; proceeding to enroll`);
    } else {
      throw err;
    }
  }

  console.log(`  Enrolling identity ${id}...`);
  const enrollment = await caClient.enroll({
    enrollmentID: id,
    enrollmentSecret: secret,
    attr_reqs: [
      { name: 'role', optional: false },
      { name: 'userId', optional: false },
      { name: 'participantId', optional: true },
    ],
  });

  const mspWalletDir = path.join(walletsDir, mspId);
  fs.mkdirSync(mspWalletDir, { recursive: true });

  const walletFile = path.join(mspWalletDir, `${id}.json`);
  const walletContent = {
    mspId,
    certificate: enrollment.certificate,
    privateKey: enrollment.key.toBytes(),
  };

  fs.writeFileSync(walletFile, JSON.stringify(walletContent, null, 2), 'utf8');

  const relativeWalletPath = path.relative(REPO_ROOT, walletFile).replace(/\\/g, '/');
  identityMap[id] = {
    mspId,
    wallet: relativeWalletPath,
    role,
    participantId: participantId || '',
  };

  console.log(`  ✅ Saved wallet for ${id} -> ${relativeWalletPath}`);
}

async function main() {
  console.log('======================================================');
  console.log('🚀 Enrolling Fabric identities with role attributes');
  console.log('======================================================');

  // 1. Seed users
  for (const user of SEED_DATA.users) {
    const mspId = roleToMsp[user.role];
    if (!mspId) {
      console.warn(`No MSP mapped for role ${user.role}, skipping user ${user.id}`);
      continue;
    }
    const participant = SEED_DATA.participants.find(
      (p) => p.userId === user.id
    );
    await registerAndEnrollUser({
      id: user.id,
      role: user.role,
      participantId: participant ? participant.id : '',
      mspId,
    });
  }

  // 2. Ledger bootstrap admin and compliance identities
  console.log('\nEnrolling ledger bootstrap identities...');
  await registerAndEnrollUser({
    id: 'ledger-bootstrap-admin',
    role: 'ADMINISTRATOR',
    participantId: 'PRT-ADMIN-SYS',
    mspId: 'Org1MSP',
  });

  await registerAndEnrollUser({
    id: 'ledger-bootstrap-compliance',
    role: 'COMPLIANCE',
    participantId: 'PRT-COMPLIANCE-SYS',
    mspId: 'Org2MSP',
  });

  // 3. Write identity map
  const identityMapPath = path.join(REPO_ROOT, '.fabric', 'identity-map.json');
  fs.writeFileSync(
    identityMapPath,
    JSON.stringify(identityMap, null, 2),
    'utf8'
  );
  console.log(`\n✅ Generated identity map at: ${identityMapPath}`);
  console.log('Total identities enrolled:', Object.keys(identityMap).length);
}

main().catch((err) => {
  console.error('Enrollment failed:', err);
  process.exit(1);
});
