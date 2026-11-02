export const QUEST_ENERGY_REWARD = 15;

export const QUEST_REWARD_COINS_BY_PRIORITY = {
  low: 10,
  medium: 25,
  high: 50,
} as const;

export const QUEST_XP_REWARD_BY_PRIORITY = {
  low: 10,
  medium: 20,
  high: 30,
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

export function normalizeQuestPriority(
  value: unknown
): QuestPriority | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.toLowerCase();

  return isQuestPriority(normalized)
    ? normalized
    : null;
}

export function priorityForCourseworkType(
  courseworkType: string | null | undefined,
  courseworkPriorities:
    | Record<string, unknown>
    | null
    | undefined
): QuestPriority {
  if (!courseworkType) {
    return "medium";
  }

  return (
    normalizeQuestPriority(
      courseworkPriorities?.[courseworkType]
    ) ?? "medium"
  );
}

export function rewardCoinsForPriority(
  priority: QuestPriority
): number {
  return QUEST_REWARD_COINS_BY_PRIORITY[
    priority
  ];
}

export function rewardXpForPriority(
  priority: QuestPriority
): number {
  return QUEST_XP_REWARD_BY_PRIORITY[
    priority
  ];
}
