export const QUEST_ENERGY_REWARD = 15;

export const QUEST_REWARD_COINS_BY_PRIORITY = {
  low: 10,
  medium: 25,
  high: 50,
} as const;

export type QuestPriority =
  keyof typeof QUEST_REWARD_COINS_BY_PRIORITY;

export function isQuestPriority(
  value: unknown
): value is QuestPriority {
  return (
    typeof value === "string" &&
    Object.prototype.hasOwnProperty.call(
      QUEST_REWARD_COINS_BY_PRIORITY,
      value
    )
  );
}

export function rewardCoinsForPriority(
  priority: QuestPriority
): number {
  return QUEST_REWARD_COINS_BY_PRIORITY[
    priority
  ];
}
