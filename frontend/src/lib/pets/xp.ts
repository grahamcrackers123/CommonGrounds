const XP_PER_LEVEL = 100;
const MAX_LEVEL = 25;

export function applyXp(currentLevel: number, currentXp: number, xpGain: number) {
  let level = currentLevel;
  let xp = currentXp + xpGain;
  let leveledUp = false;

  while (xp >= XP_PER_LEVEL && level < MAX_LEVEL) {
    xp -= XP_PER_LEVEL;
    level++;
    leveledUp = true;
  }

  if (level >= MAX_LEVEL) {
    level = MAX_LEVEL;
    xp = 0;
  }

  return { level, xp, leveledUp };
}