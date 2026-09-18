type PetStage = "Baby" | "Young" | "Junior" | "Adult" | "Mature";

interface PetGrowth {
    stage: PetStage;
    scale: number;
}

interface PetXpResult {
    level: number;
    xp: number;
    leveledUp: boolean;
}

interface PetStatusInfo {
    status: PetStatus;
    imageUrl: string;
}

export function getPetGrowth(level: number): PetGrowth {
    const safeLevel = Math.max(1, Math.min(level, max_level));
    let stage: PetStage;

    if (safeLevel <= 5) {
        stage = "Baby";
    } else if (safeLevel <= 10) {
        stage = "Young";
    } else if (safeLevel <= 15) {
        stage = "Junior";
    } else if (safeLevel <= 20) {
        stage = "Adult";
    } else {
        stage = "Mature";
    }

    const minScale = 0.5;
    const maxScale = 1;

    const scale = minScale + ((safeLevel - 1) / (max_level - 1)) * (maxScale - minScale);

    return { stage, scale };
}

export const xp_per_level = 100; // Assuming each level requires 100 XP
export const max_level = 25; // Maximum level a pet can reach

export function getXpProgress(xp: number): number {
    return Math.min((xp / xp_per_level) * 100, 100);
}

export function addXp(currentLevel: number, currentXp: number, xpToAdd: number): PetXpResult {
    let level = currentLevel;
    let xp = currentXp + xpToAdd;
    let leveledUp = false;

    while (xp >= xp_per_level && level < max_level) {
        xp -= xp_per_level;
        level++;
        leveledUp = true;
    }

    if (level >= max_level) {
        level = max_level;
        xp = 0; // Reset XP if max level is reached
    }

    return {
        level,
        xp,
        leveledUp
    };
}

export type PetStatus =
    | "Energetic"
    | "Happy"
    | "Hungry"
    | "Sleepy"
    | "Sad";

export function getPetStatus(energy: number): PetStatusInfo {
    const safeEnergy = Math.max(0, Math.min(energy, 100));

    if (safeEnergy >= 80) {
        return {
            status: "Energetic",
            imageUrl: "/assets/pet-status/energetic.png"
        };
    }

    if (safeEnergy >= 60) {
        return {
            status: "Happy",
            imageUrl: "/assets/pet-status/happy.png"
        };
    }

    if (safeEnergy >= 40) {
        return {
            status: "Hungry",
            imageUrl: "/assets/pet-status/hungry.png"
        };
    }

    if (safeEnergy >= 20) {
        return {
            status: "Sleepy",
            imageUrl: "/assets/pet-status/sleepy.png"
        };
    }

    return {
        status: "Sad",
        imageUrl: "/assets/pet-status/sad.png"
    };
}