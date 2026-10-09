/**
 * Shared helpers for the investment-offer flow.
 * Investor proposes (buy) -> Issuer reviews / counters / accepts & settles.
 * Underneath this is the existing transfers ledger (propose / evaluate /
 * execute / cancel) — no chaincode change, so compliance oversight,
 * fixtures and the Settlement engine keep working untouched.
 */

export const pricePaiseToInr = (paise) =>
  paise ? (Number(paise) / 100).toLocaleString('en-IN') : '0';

export const inrToPaise = (inr) => Math.round(Number(inr || 0) * 100);

/** Identity of the signed-in user on the ledger (participant > user fallback). */
export const myLedgerId = (user) =>
  user?.participantId || user?.id || user?.email || '';

/** True when this transfer was proposed by someone other than me. */
export const isIncoming = (transfer, user) => {
  const me = myLedgerId(user);
  if (transfer?.proposedBy) return transfer.proposedBy !== me;
  // Fallback when proposedBy is missing: I'm the seller being asked.
  return transfer?.fromParticipantId === me && transfer?.toParticipantId !== me;
};

/** The other party in this transfer relative to me. */
export const counterpartyOf = (transfer, user) => {
  const me = myLedgerId(user);
  if (transfer?.proposedBy && transfer.proposedBy !== me) return transfer.proposedBy;
  if (transfer?.fromParticipantId === me) return transfer?.toParticipantId;
  if (transfer?.toParticipantId === me) return transfer?.fromParticipantId;
  return transfer?.proposedBy || transfer?.toParticipantId || 'UNKNOWN';
};

/**
 * Negotiation thread key: same token + same two parties (direction-agnostic).
 * Counter-offers create a NEW transfer in the same thread; the parent is
 * cancelled as superseded so the ledger stays unambiguous.
 */
export const threadKeyOf = (transfer) => {
  const parties = [transfer?.fromParticipantId, transfer?.toParticipantId]
    .filter(Boolean)
    .sort()
    .join('<>');
  return `${transfer?.tokenId || 'NO-TOKEN'}||${parties}`;
};

/** Group a flat transfer list into negotiation threads (newest first). */
export const groupThreads = (transfers = []) => {
  const map = new Map();
  for (const t of transfers) {
    const key = threadKeyOf(t);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(t);
  }
  return [...map.entries()]
    .map(([key, items]) => {
      const sorted = [...items].sort(
        (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
      );
      return {
        key,
        tokenId: sorted[0]?.tokenId,
        parties: [sorted[0]?.fromParticipantId, sorted[0]?.toParticipantId],
        items: [...sorted].reverse(), // timeline oldest -> newest
        latest: sorted[0],
        actionable: sorted[0]?.status === 'PROPOSED' ? sorted[0] : null,
        counts: {
          proposed: items.filter((i) => i.status === 'PROPOSED').length,
          executed: items.filter((i) => i.status === 'EXECUTED').length,
        },
      };
    })
    .sort((a, b) => new Date(b.latest?.createdAt || 0) - new Date(a.latest?.createdAt || 0));
};

/** Am I involved in this transfer at all (seller, buyer, or proposer)? */
export const involvesMe = (transfer, user) => {
  const me = myLedgerId(user);
  return (
    transfer?.fromParticipantId === me ||
    transfer?.toParticipantId === me ||
    transfer?.proposedBy === me
  );
};

/** Reference tag linking a counter-offer back to its parent offer. */
export const counterRef = (parentId, note = '') =>
  [`Re: ${parentId}`, note].filter(Boolean).join(' — ');
