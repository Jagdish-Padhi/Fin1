import { Context } from 'fabric-contract-api';

export interface CallerIdentity {
  mspId: string;
  role: string;
  participantId?: string;
  userId?: string;
}

export function getCaller(ctx: Context): CallerIdentity {
  const clientIdentity = ctx.clientIdentity;
  const mspId = clientIdentity.getMSPID();

  // Extract certificate attributes issued by Fabric CA
  const role = clientIdentity.getAttributeValue('role') || 'UNKNOWN';
  const participantId = clientIdentity.getAttributeValue('participantId') || undefined;
  const userId = clientIdentity.getAttributeValue('userId') || undefined;

  return {
    mspId,
    role,
    participantId,
    userId,
  };
}

export function requireRole(ctx: Context, ...allowedRoles: string[]): CallerIdentity {
  const caller = getCaller(ctx);
  if (!allowedRoles.includes(caller.role)) {
    throw new Error(`Unauthorized: Role '${caller.role}' not permitted. Required: ${allowedRoles.join(', ')}`);
  }
  return caller;
}
