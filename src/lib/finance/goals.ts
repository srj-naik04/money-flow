/** Pure math for savings goals. All money in integer paise. */

export type GoalProgress = {
  remaining: number;
  progressPct: number;
  monthlyNeeded: number;
  onTrack: boolean;
};

/**
 * Derive goal progress from saved/target and the whole calendar months left
 * until the deadline (null when the goal has no deadline). monthlyNeeded rounds
 * up; a passed deadline (monthsLeft <= 0) that isn't funded is "behind".
 */
export function goalProgress(params: {
  savedPaise: number;
  targetPaise: number;
  monthsLeft: number | null;
}): GoalProgress {
  const { savedPaise, targetPaise, monthsLeft } = params;
  const remaining = Math.max(0, targetPaise - savedPaise);
  const progressPct =
    targetPaise > 0
      ? Math.min(100, Math.max(0, (savedPaise / targetPaise) * 100))
      : 0;
  const monthlyNeeded =
    remaining <= 0
      ? 0
      : monthsLeft != null && monthsLeft > 0
        ? Math.ceil(remaining / monthsLeft)
        : remaining;
  const onTrack =
    savedPaise >= targetPaise
      ? true
      : monthsLeft != null && monthsLeft <= 0
        ? false
        : true;
  return { remaining, progressPct, monthlyNeeded, onTrack };
}
