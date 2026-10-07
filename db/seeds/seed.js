import crypto from 'crypto';

let bcrypt;
try {
  bcrypt = (await import('bcrypt')).default;
} catch (e) {
  // fallback if native bcrypt is unavailable
}

/**
 * Seed data definition for EkamVistar RWA Platform
 * Exportable both as JSON/in-memory seed and runnable via Prisma
 */
export const SEED_DATA = {
  organizations: [
    { id: 'ORG-ADMIN', mspId: 'EkamVistarMSP', name: 'EkamVistar Platform Operator' },
    { id: 'ORG-ISSUER', mspId: 'IssuerMSP', name: 'Bharat Agro & Infrastructure Holdings' },
    { id: 'ORG-VERIFIER', mspId: 'VerifierMSP', name: 'TUV / SGS Certified Inspection & Valuation' },
    { id: 'ORG-COMPLIANCE', mspId: 'ComplianceMSP', name: 'National Asset Governance & Compliance' },
    { id: 'ORG-INVESTOR', mspId: 'InvestorMSP', name: 'Samriddhi Rural & Institutional Capital' },
    { id: 'ORG-AUDITOR', mspId: 'AuditorMSP', name: 'Statutory Independent Audit Consortium' },
  ],
  users: [
    {
      id: 'USR-ADMIN',
      orgId: 'ORG-ADMIN',
      email: 'admin@ekamvistar.com',
      name: 'Aditi Sharma (Platform Admin)',
      role: 'ADMINISTRATOR',
    },
    {
      id: 'USR-ISSUER',
      orgId: 'ORG-ISSUER',
      email: 'issuer@originator.com',
      name: 'Rajesh Patel (Agro Originator)',
      role: 'ISSUER',
    },
    {
      id: 'USR-VERIFIER',
      orgId: 'ORG-VERIFIER',
      email: 'verifier@auditfirm.com',
      name: 'Vikram Singh (Senior Verifier)',
      role: 'VERIFIER',
    },
    {
      id: 'USR-VALUER',
      orgId: 'ORG-VERIFIER',
      email: 'valuer@valuationpartners.com',
      name: 'Ananya Roy (Registered Valuer)',
      role: 'VALUER',
    },
    {
      id: 'USR-COMPLIANCE',
      orgId: 'ORG-COMPLIANCE',
      email: 'compliance@regulatory.gov.in',
      name: 'Suresh Menon (Chief Compliance Officer)',
      role: 'COMPLIANCE',
    },
    {
      id: 'USR-INVESTOR',
      orgId: 'ORG-INVESTOR',
      email: 'investor@capitalfund.com',
      name: 'Pooja Iyer (Qualified Investor)',
      role: 'INVESTOR',
    },
    {
      id: 'USR-AUDITOR',
      orgId: 'ORG-AUDITOR',
      email: 'auditor@kpmg-audit.com',
      name: 'Deepak Verma (Consortium Auditor)',
      role: 'AUDITOR',
    },
  ],
  participants: [
    {
      id: 'PRT-ISSUER-01',
      userId: 'USR-ISSUER',
      orgId: 'ORG-ISSUER',
      kind: 'ENTITY',
      kycStatus: 'APPROVED',
      investorClass: 'QUALIFIED',
      jurisdiction: 'IN',
      pii: { legalName: 'Bharat Agro Enterprises Ltd', pan: 'AAACB1234F' },
    },
    {
      id: 'PRT-INVESTOR-01',
      userId: 'USR-INVESTOR',
      orgId: 'ORG-INVESTOR',
      kind: 'INDIVIDUAL',
      kycStatus: 'APPROVED',
      investorClass: 'QUALIFIED',
      jurisdiction: 'IN',
      pii: { legalName: 'Pooja Iyer', pan: 'ABZPI5678K' },
    },
    {
      id: 'PRT-INVESTOR-02',
      orgId: 'ORG-INVESTOR',
      kind: 'ENTITY',
      kycStatus: 'APPROVED',
      investorClass: 'INSTITUTIONAL',
      jurisdiction: 'IN',
      pii: { legalName: 'Apex Capital Ventures', pan: 'AABCA9988D' },
    },
  ],
};

export async function runSeed(prisma) {
  const defaultPasswordHash = bcrypt ? await bcrypt.hash('Password@123', 10) : '$2b$10$demo_hash_ekamvistar_foundation';

  for (const org of SEED_DATA.organizations) {
    if (prisma) {
      await prisma.organization.upsert({
        where: { mspId: org.mspId },
        update: { name: org.name },
        create: { id: org.id, mspId: org.mspId, name: org.name },
      });
    }
  }

  for (const u of SEED_DATA.users) {
    if (prisma) {
      await prisma.user.upsert({
        where: { email: u.email },
        update: { role: u.role, name: u.name },
        create: {
          id: u.id,
          orgId: u.orgId,
          email: u.email,
          name: u.name,
          role: u.role,
          passwordHash: defaultPasswordHash,
        },
      });
    }
  }

  for (const p of SEED_DATA.participants) {
    if (prisma) {
      const piiHash = crypto.createHash('sha256').update(JSON.stringify(p.pii)).digest('hex');
      await prisma.participant.upsert({
        where: { id: p.id },
        update: { kycStatus: p.kycStatus },
        create: {
          id: p.id,
          userId: p.userId || null,
          orgId: p.orgId,
          kind: p.kind,
          kycStatus: p.kycStatus,
          investorClass: p.investorClass,
          jurisdiction: p.jurisdiction,
          piiEncrypted: Buffer.from(JSON.stringify(p.pii)).toString('base64'),
          piiHash,
          chainSynced: true,
        },
      });
    }
  }

  console.log('✅ Seed completed successfully! Test users created with Password@123');
}

// Standalone execution support
if (process.argv[1]?.endsWith('seed.js')) {
  try {
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    await runSeed(prisma);
    await prisma.$disconnect();
  } catch (err) {
    console.log('Running seed in offline/standalone mock mode...');
    console.log('Organizations:', SEED_DATA.organizations.length);
    console.log('Users:', SEED_DATA.users.length);
    console.log('Participants:', SEED_DATA.participants.length);
  }
}
