export const PET_ITEM_SLOTS = {
  1: { slug: 'bandana', slot: 'accessory' },
  2: { slug: 'crown', slot: 'accessory' },
  3: { slug: 'glasses', slot: 'accessory' },
  4: { slug: 'party', slot: 'accessory' },
  5: { slug: 'ribbon', slot: 'accessory' },
  6: { slug: 'scarf', slot: 'accessory' },
  7: { slug: 'wizard', slot: 'accessory' },
  8: { slug: 'explorer', slot: 'outfit' },
  9: { slug: 'gardener', slot: 'outfit' },
  10: { slug: 'magical', slot: 'outfit' },
  11: { slug: 'pajama', slot: 'outfit' },
  12: { slug: 'uniform', slot: 'outfit' },
} as const;

export type PetSlot = 'accessory' | 'outfit';

export interface PetItemInfo {
  id: number;
  slug: string;
  slot: PetSlot;
}

export const resolvePetItemKey = (itemKey: string | null): PetItemInfo | null => {
  if (!itemKey) return null;
  const match = /^pet-(\d+)$/.exec(itemKey);
  if (!match) return null;
  const id = Number(match[1]);
  const meta = PET_ITEM_SLOTS[id as keyof typeof PET_ITEM_SLOTS];
  if (!meta) return null;
  return { id, slug: meta.slug, slot: meta.slot };
};

export const equippedPetImageUrl = (
  species: string,
  item: PetItemInfo | null
): string | null => {
  if (!item) return null;
  const folder = item.slot === 'outfit' ? 'equipped-outfits' : 'equipped-accessories';
  return `/assets/${folder}/${species}-${item.slug}.png`;
};