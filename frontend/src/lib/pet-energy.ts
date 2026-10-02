import type { SupabaseClient } from "@supabase/supabase-js";

export const ENERGY_MAX = 100;

// Energy starts draining only after this many hours of inactivity...
export const ENERGY_DECAY_GRACE_HOURS = 1;
// ...then loses this many points per hour until it reaches 0.
export const ENERGY_DECAY_PER_HOUR = 2;

export type PetEnergyRow = {
    id?: string;
    pet_energy?: number | null;
    updated_at?: string | null;
};

export function decayedEnergy(pet: PetEnergyRow, now: Date = new Date()): number {
    const stored = Math.max(0, Math.min(pet.pet_energy ?? ENERGY_MAX, ENERGY_MAX));
    if (!pet.updated_at) return stored;
    const last = new Date(pet.updated_at).getTime();
    if (Number.isNaN(last)) return stored;
    const elapsedHours = (now.getTime() - last) / 3_600_000;
    if (elapsedHours <= ENERGY_DECAY_GRACE_HOURS) return stored;
    const loss = Math.floor((elapsedHours - ENERGY_DECAY_GRACE_HOURS) * ENERGY_DECAY_PER_HOUR);
    return Math.max(0, stored - loss);
}

// Lazy decay: applies any decay accumulated since the pet was last touched
// and persists it, so the stored value is always fresh. No cron needed.
export async function applyEnergyDecay(
    supabase: SupabaseClient,
    pet: PetEnergyRow
): Promise<number> {
    const energy = decayedEnergy(pet);
    const stored = Math.max(0, Math.min(pet.pet_energy ?? ENERGY_MAX, ENERGY_MAX));
    if (energy < stored && pet.id) {
        await supabase.from("pets").update({ pet_energy: energy }).eq("id", pet.id);
    }
    return energy;
}