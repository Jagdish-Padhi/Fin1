import { ParticipantContract } from './contracts/ParticipantContract.js';
import { AssetTypeContract } from './contracts/AssetTypeContract.js';
import { AssetContract } from './contracts/AssetContract.js';
import { VerificationContract } from './contracts/VerificationContract.js';
import { ValuationContract } from './contracts/ValuationContract.js';
import { TokenContract } from './contracts/TokenContract.js';
import { TransferContract } from './contracts/TransferContract.js';
import { LifecycleContract } from './contracts/LifecycleContract.js';
import { AuditContract } from './contracts/AuditContract.js';
import { DevFixtureContract } from './contracts/DevFixtureContract.js';

export const contracts: any[] = [
  ParticipantContract,
  AssetTypeContract,
  AssetContract,
  VerificationContract,
  ValuationContract,
  TokenContract,
  TransferContract,
  LifecycleContract,
  AuditContract,
];

if (process.env.CC_ENV === 'dev') {
  contracts.push(DevFixtureContract);
}
