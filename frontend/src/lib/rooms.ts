export const DEFAULT_MAX_PARTICIPANTS = 1;
export const PARTY_SIZE_MIN = 1;
export const PARTY_SIZE_MAX = 50;

export function clampMaxParticipants(
  value: unknown,
  fallback = DEFAULT_MAX_PARTICIPANTS
): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.min(PARTY_SIZE_MAX, Math.max(PARTY_SIZE_MIN, Math.round(value)));
}
