"use client";

import { createClient } from "@/lib/supabase/client";
import { Badge, Box, Button, Divider, Group, Image, Paper, SimpleGrid, Stack, Text, ThemeIcon, Title, UnstyledButton } from "@mantine/core";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import { Check, Crown, Egg, Flower2, Gift, Info, Shirt, ShoppingBag, Sparkles, Star } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type TabSection = "Eggs" | "Pet Style" | "Garden Decor";
const tabs: TabSection[] = ["Eggs", "Pet Style", "Garden Decor"];

type ItemCategory = "egg" | "pet" | "garden";
const itemKey = (category: ItemCategory, id: number) => `${category}-${id}`;

interface Egg {
    id: number;
    name: string;
    price: number;
    imageUrl: string;
    backgroundColor?: string;
}

interface PetStyle {
    id: number;
    name: string;
    slug: string;
    slot: 'accessory' | 'outfit';
    price: number;
    imageUrl: string;
    backgroundColor?: string;
}

interface GardenDecor {
    id: number;
    name: string;
    price: number;
    imageUrl: string;
}

type ShopItem =
    | (Egg & { type: "egg" })
    | (PetStyle & { type: "pet" })
    | (GardenDecor & { type: "garden" });

const shopItems: ShopItem[] = [
    // Eggs
    {
        id: 1,
        name: "Nature Egg",
        price: 10000,
        imageUrl: "/assets/eggs/nature-egg.png",
        backgroundColor: "#DFF8EA",
        type: "egg",
    },
    {
        id: 2,
        name: "Blossom Egg",
        price: 10000,
        imageUrl: "/assets/eggs/blossom-egg.png",
        backgroundColor: "#F8E6D9",
        type: "egg",
    },
    {
        id: 3,
        name: "Celestial Egg",
        price: 10000,
        imageUrl: "/assets/eggs/celestial-egg.png",
        backgroundColor: "#F1EAFF",
        type: "egg",
    },

    // Pet Style
    { id: 1, name: 'Bandana', slug: 'bandana', slot: 'accessory', price: 500, imageUrl: '/assets/accessories/bandana.png', backgroundColor: '#F8E6D9', type: 'pet' },
    { id: 2, name: 'Flower Crown', slug: 'crown', slot: 'accessory', price: 500, imageUrl: '/assets/accessories/flower-crown.png', backgroundColor: '#DFF8EA', type: 'pet' },
    { id: 3, name: 'Rounded Glasses', slug: 'glasses', slot: 'accessory', price: 500, imageUrl: '/assets/accessories/glasses.png', backgroundColor: '#F1EAFF', type: 'pet' },
    { id: 4, name: 'Party Hat', slug: 'party', slot: 'accessory', price: 500, imageUrl: '/assets/accessories/party-hat.png', backgroundColor: '#E0F7FA', type: 'pet' },
    { id: 5, name: 'Ribbon', slug: 'ribbon', slot: 'accessory', price: 500, imageUrl: '/assets/accessories/ribbon.png', backgroundColor: '#FFF3E0', type: 'pet' },
    { id: 6, name: 'Scarf', slug: 'scarf', slot: 'accessory', price: 500, imageUrl: '/assets/accessories/scarf.png', backgroundColor: '#FFE0B2', type: 'pet' },
    { id: 7, name: 'Wizard Hat', slug: 'wizard', slot: 'accessory', price: 500, imageUrl: '/assets/accessories/wizard-hat.png', backgroundColor: '#FFCCBC', type: 'pet' },
    { id: 8, name: 'Explorer Outfit', slug: 'explorer', slot: 'outfit', price: 100, imageUrl: '/assets/outfits/explorer-outfit.png', backgroundColor: '#E1BEE7', type: 'pet' },
    { id: 9, name: 'Gardener Outfit', slug: 'gardener', slot: 'outfit', price: 100, imageUrl: '/assets/outfits/gardener-outfit.png', backgroundColor: '#FFF9C4', type: 'pet' },
    { id: 10, name: 'Magical Outfit', slug: 'magical', slot: 'outfit', price: 100, imageUrl: '/assets/outfits/magical-outfit.png', backgroundColor: '#B2EBF2', type: 'pet' },
    { id: 11, name: 'Pajama Outfit', slug: 'pajama', slot: 'outfit', price: 100, imageUrl: '/assets/outfits/pajama-outfit.png', backgroundColor: '#D1C4E9', type: 'pet' },
    { id: 12, name: 'Uniform Outfit', slug: 'uniform', slot: 'outfit', price: 100, imageUrl: '/assets/outfits/uniform-outfit.png', backgroundColor: '#C8E6C9', type: 'pet' },

    // Garden Decor
    { id: 1, name: 'Moonlight Garden', price: 3000, imageUrl: '/assets/garden-themes/moonlight-garden.png', type: 'garden' },
    { id: 2, name: 'Sakura Garden', price: 3000, imageUrl: '/assets/garden-themes/sakura-garden.png', type: 'garden' },
];

const categoryByTab: Record<TabSection, ItemCategory> = {
    'Eggs': 'egg',
    'Pet Style': 'pet',
    'Garden Decor': 'garden',
};

const CATEGORY_META: Record<ItemCategory, { label: TabSection; icon: typeof Egg; color: string; tint: string }> = {
    egg: { label: 'Eggs', icon: Egg, color: '#7048E8', tint: '#F3F0FF' },
    pet: { label: 'Pet Style', icon: Shirt, color: '#E64980', tint: '#FFF0F6' },
    garden: { label: 'Garden Decor', icon: Flower2, color: '#0C8599', tint: '#E3FAFC' },
};

const formatCoins = (n: number) => n.toLocaleString('en-US');

const itemBackground = (item: ShopItem): string =>
    item.type === 'garden' ? '#F1F3F5' : (item.backgroundColor ?? '#F1F3F5');

export default function RewardShopPage() {
    const [activeTab, setActiveTab] = useState<TabSection>('Eggs');
    const [coins, setCoins] = useState<number | null>(null);
    const balance = coins ?? 0;
    const [ownedItems, setOwnedItems] = useState<string[]>([]);
    const isOwned = (category: ItemCategory, id: number) => ownedItems.includes(itemKey(category, id));
    const [selectedItem, setSelectedItem] = useState<ShopItem | null>(null);
    const [petSpecies, setPetSpecies] = useState<string | null>(null);
    const [equipped, setEquipped] = useState<{ accessory: string | null; outfit: string | null }>({ accessory: null, outfit: null });
    const [slotFilter, setSlotFilter] = useState<'all' | 'accessory' | 'outfit'>('all');
    const [confirming, setConfirming] = useState(false);
    const [justBoughtId, setJustBoughtId] = useState<number | null>(null);

    // loads the coin balance
    useEffect(() => {
        fetch("/api/rewards/balance")
            .then((res) => res.json())
            .then((data) => setCoins(data.coins ?? 0))
            .catch(() => {
                notifications.show({
                    title: "Error",
                    message: "Could not load your coin balance.",
                    color: "red",
                });
            });
    }, []);

    // loads items user own
    useEffect(() => {
        const supabase = createClient();

        (async () => {
            const {
                data: { user },
            } = await supabase.auth.getUser();

            if (!user) return;

            const { data, error } = await supabase
                .from("user_items")
                .select("item_key")
                .eq("user_id", user.id);

            if (!error && data) {
                setOwnedItems(data.map((row) => row.item_key));
            }
        })();
    }, []);

    // load the pet species and currently equipped items
    useEffect(() => {
        const loadPet = async () => {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            const { data } = await supabase.from('pets').select('species, equipped_accessory, equipped_outfit').eq('owner_id', user.id).maybeSingle();
            setPetSpecies(data?.species ?? null);
            setEquipped({
                accessory: data?.equipped_accessory ?? null,
                outfit: data?.equipped_outfit ?? null,
            });
        };
        loadPet();
    }, []);

    const activeCategory = categoryByTab[activeTab];

    const visibleItems = useMemo(() => {
        let items = shopItems.filter((item) => item.type === activeCategory);
        if (activeCategory === 'pet' && slotFilter !== 'all') {
            items = items.filter((item) => item.type === 'pet' && item.slot === slotFilter);
        }
        return items;
    }, [activeCategory, slotFilter]);

    const selectedOwned = selectedItem ? isOwned(selectedItem.type, selectedItem.id) : false;
    const canAfford = selectedItem ? balance >= selectedItem.price : false;
    const isEquipped = (item: ShopItem) =>
        item.type === 'pet' && equipped[item.slot] === itemKey(item.type, item.id);

    const handleEquip = async () => {
        if (!selectedItem || selectedItem.type !== 'pet') return;
        const res = await fetch("/api/rewards/equip", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                itemId: itemKey(selectedItem.type, selectedItem.id),
                slot: selectedItem.slot,
            }),
        });

        const data = await res.json();

        if (!res.ok) {
            notifications.show({
                title: "Equip Failed",
                message: data.error ?? "Something went wrong.",
                color: "red",
            });
            return;
        }

        setEquipped(data.equipped);

        notifications.show({
            title: isEquipped(selectedItem) ? "Unequipped" : "Equipped",
            message: isEquipped(selectedItem)
                ? "Your pet is no longer wearing this item."
                : "Your pet is now wearing this item!",
            color: "green",
        });
    };

    const handleSelect = (item: ShopItem) => {
        setSelectedItem(item);
        setConfirming(false);
        setJustBoughtId(null);

    }
    const openPurchaseModal = () => {
        const item = selectedItem;
        if (!item) return;
        const canAfford = balance >= item.price;

        modals.openConfirmModal({
            title: <Text fw={800}> Please Confirm Your Purchase </Text>,
            size: "sm",
            centered: true,

            children: (
                <>
                    <Group>
                        <Image
                            src={item.imageUrl}
                            alt={item.name}
                            style={{
                                display: "block",
                                margin: "0 auto",
                            }}
                        />

                        <Text size="sm" ta="center">
                            Are you sure you want to buy this item{" "}
                            {item.name} for {item.price} coins?
                        </Text>
                    </Group>

                    {!canAfford && (
                        <Paper
                            style={{
                                backgroundColor: "light-dark(#FF999C, #5C2022)",
                                color: "light-dark(#000000, #FFFFFF)",
                                padding: "10px",
                                marginTop: "10px",
                                borderRadius: "8px",
                            }}
                        >
                            <Text size="sm" ta="center">
                                Insufficient balance. You need{" "}
                                {item.price - balance} more coins to
                                purchase this item.
                            </Text>
                        </Paper>
                    )}
                </>
            ),

            confirmProps: {
                color: canAfford ? "blue" : "gray",
                disabled: !canAfford,
            },

            labels: {
                confirm: "Confirm",
                cancel: "Cancel",
            },

            onConfirm: async () => {
                const res = await fetch("/api/rewards/purchase", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        itemId: itemKey(selectedItem.type, selectedItem.id),
                    }),
                });

                const data = await res.json();

                if (!res.ok) {
                    notifications.show({
                        title: "Purchase Failed",
                        message:
                            data.error ?? "Something went wrong.",
                        color: "red",
                    });

                    return;
                }

                setOwnedItems((prev) => [
                    ...prev,
                    itemKey(selectedItem.type, selectedItem.id),
                ]);

                setCoins(data.coins);

                setConfirming(false);

                setJustBoughtId(selectedItem.id);

                notifications.show({
                    title: "Successful Purchase",
                    message: "Your purchase was successful.",
                    color: "green",
                });
            },

            onCancel: () =>
                notifications.show({
                    title: "Cancelled",
                    message: "Purchase was cancelled.",
                    color: "red",
                }),
        });
    };

    const categoryMeta = CATEGORY_META[activeCategory];

    return (
        <Box style={{ backgroundColor: '#F7F9FC', minHeight: '100vh' }}>
            <Box maw={1150} mx="auto" p={{ base: 20, md: 40 }}>
                {/* Header */}
                <Group justify="space-between" align="flex-end" mb={24} wrap="wrap">
                    <Box>
                        <Group gap={10} mb={6}>
                            <ThemeIcon radius="lg" size={36} variant="light" color="yellow">
                                <ShoppingBag size={20} />
                            </ThemeIcon>
                            <Title order={1} fw={800}>
                                Reward Shop
                            </Title>
                        </Group>
                        <Text c="dimmed" size="sm">
                            Spend your hard-earned coins on surprises for you and your pet.
                        </Text>
                    </Box>
                    <Paper px="lg" py="xs" radius="xl" shadow="sm" withBorder>
                        <Group gap={8}>
                            <Image src="/assets/currency/student-coin.png" alt="Coins" w={24} h={24} />
                            <Text fw={800} fz="lg">
                                {coins === null ? '—' : formatCoins(balance)}
                            </Text>
                            <Text c="dimmed" fz="xs" fw={600}>
                                coins
                            </Text>
                        </Group>
                    </Paper>
                </Group>

                <SimpleGrid cols={{ base: 1, lg: 3 }} spacing="md" mb={28}>
                    {/* Left column: category + grid */}
                    <Stack gap="md" style={{ gridColumn: 'span 2' }}>
                        {/* Category tabs */}
                        <Paper p="xs" radius="lg" shadow="sm" withBorder style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            {tabs.map((tab) => {
                                const meta = CATEGORY_META[categoryByTab[tab]];
                                const count = shopItems.filter((item) => item.type === categoryByTab[tab]).length;
                                const isActive = activeTab === tab;
                                return (
                                    <UnstyledButton
                                        key={tab}
                                        onClick={() => {
                                            setActiveTab(tab);
                                            setSlotFilter('all');
                                            setSelectedItem(null);
                                            setConfirming(false);
                                            setJustBoughtId(null);
                                        }}
                                        style={{ flex: 1, minWidth: 150 }}
                                    >
                                        <Paper
                                            p="sm"
                                            radius="md"
                                            style={{
                                                backgroundColor: isActive ? meta.tint : 'transparent',
                                                border: `1px solid ${isActive ? meta.color : '#E9ECEF'}`,
                                                transition: 'all 0.15s ease',
                                            }}
                                        >
                                            <Group justify="center" gap={8} wrap="nowrap">
                                                <meta.icon size={18} style={{ color: isActive ? meta.color : '#868E96' }} />
                                                <Text fw={700} size="sm" c={isActive ? meta.color : '#495057'}>
                                                    {tab}
                                                </Text>
                                                <Badge size="xs" variant="light" color="gray" radius="xl">
                                                    {count}
                                                </Badge>
                                            </Group>
                                        </Paper>
                                    </UnstyledButton>
                                );
                            })}
                        </Paper>

                        {/* Slot filter for Pet Style */}
                        {activeTab === 'Pet Style' && (
                            <Group gap={8}>
                                {(['all', 'accessory', 'outfit'] as const).map((slot) => (
                                    <Badge
                                        key={slot}
                                        size="lg"
                                        radius="xl"
                                        px={18}
                                        py={10}
                                        variant={slotFilter === slot ? 'filled' : 'outline'}
                                        color={slotFilter === slot ? 'pink' : 'gray'}
                                        style={{ cursor: 'pointer', textTransform: 'capitalize' }}
                                        onClick={() => setSlotFilter(slot)}
                                    >
                                        {slot === 'all' ? 'Everything' : slot === 'accessory' ? 'Accessories' : 'Outfits'}
                                    </Badge>
                                ))}
                            </Group>
                        )}

                        {/* Item grid */}
                        {visibleItems.length === 0 ? (
                            <Paper p="xl" radius="lg" shadow="sm" withBorder ta="center">
                                <Text c="dimmed">No items in this filter yet.</Text>
                            </Paper>
                        ) : (
                            <SimpleGrid cols={{ base: 2, sm: 3, xl: 4 }} spacing="md">
                                {visibleItems.map((item) => {
                                    const itemOwned = isOwned(item.type, item.id);
                                    const affordable = balance >= item.price;
                                    const isSelected = selectedItem?.id === item.id && selectedItem?.type === item.type;
                                    return (
                                        <UnstyledButton key={itemKey(item.type, item.id)} onClick={() => handleSelect(item)} style={{ width: '100%' }}>
                                            <Paper
                                                p="md"
                                                radius="lg"
                                                shadow="sm"
                                                withBorder
                                                style={{
                                                    backgroundColor: '#FFFFFF',
                                                    borderColor: isSelected ? CATEGORY_META[item.type].color : '#E9ECEF',
                                                    borderWidth: isSelected ? 2 : 1,
                                                    opacity: affordable || itemOwned ? 1 : 0.65,
                                                    transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                                                }}
                                            >
                                                <Stack gap="xs" align="center">
                                                    <Box
                                                        w={88}
                                                        h={88}
                                                        style={{
                                                            borderRadius: 28,
                                                            backgroundColor: itemBackground(item),
                                                            display: 'grid',
                                                            placeItems: 'center',
                                                            position: 'relative',
                                                        }}
                                                    >
                                                        <Image src={item.imageUrl} alt={item.name} w={56} h={56} fit="contain" />
                                                        {itemOwned && (
                                                            <Badge
                                                                variant="filled"
                                                                color={isEquipped(item) ? 'blue' : 'green'}
                                                                size="xs"
                                                                radius="xl"
                                                                style={{ position: 'absolute', top: -6, right: -6 }}
                                                            >
                                                                {isEquipped(item) ? 'Equipped' : 'Owned'}
                                                            </Badge>
                                                        )}
                                                    </Box>
                                                    <Text fw={700} size="sm" ta="center" lh={1.3} style={{ minHeight: 34 }}>
                                                        {item.name}
                                                    </Text>
                                                    {itemOwned ? (
                                                        <Text fw={700} size="sm" c="green">
                                                            Owned
                                                        </Text>
                                                    ) : (
                                                        <Group gap={4} justify="center">
                                                            <Image src="/assets/currency/student-coin.png" alt="" w={16} h={16} />
                                                            <Text fw={800} size="sm" c={affordable ? '#212529' : '#E03131'}>
                                                                {formatCoins(item.price)}
                                                            </Text>
                                                        </Group>
                                                    )}
                                                    {!affordable && !itemOwned && (
                                                        <Text fz="xs" c="dimmed" ta="center">
                                                            {formatCoins(item.price - balance)} more needed
                                                        </Text>
                                                    )}
                                                </Stack>
                                            </Paper>
                                        </UnstyledButton>
                                    );
                                })}
                            </SimpleGrid>
                        )}
                    </Stack>

                    {/* Right column: preview panel */}
                    <Box>
                        <Paper p="lg" radius="lg" shadow="sm" withBorder style={{ position: 'sticky', top: 20 }}>
                            {selectedItem ? (
                                <Stack gap="md">
                                    <Group justify="space-between">
                                        <Group gap={8}>
                                            <categoryMeta.icon size={16} style={{ color: categoryMeta.color }} />
                                            <Text fz="xs" tt="uppercase" fw={700} c="dimmed" lts={1}>
                                                {categoryMeta.label}
                                            </Text>
                                        </Group>
                                        {justBoughtId === selectedItem.id && (
                                            <Badge variant="filled" color="green" leftSection={<Check size={12} />}>
                                                Just purchased
                                            </Badge>
                                        )}
                                    </Group>

                                    <Box
                                        h={180}
                                        style={{
                                            borderRadius: 24,
                                            backgroundColor: itemBackground(selectedItem),
                                            display: 'grid',
                                            placeItems: 'center',
                                        }}
                                    >
                                        <Image
                                            src={
                                                selectedItem.type === 'pet' && petSpecies
                                                    ? `/assets/equipped-${selectedItem.slot === 'outfit' ? 'outfits' : 'accessories'}/${petSpecies}-${selectedItem.slug}.png`
                                                    : selectedItem.imageUrl
                                            }
                                            alt={selectedItem.name}
                                            mah={150}
                                            fit="contain"
                                        />
                                    </Box>

                                    <Box>
                                        <Title order={3} fw={800}>
                                            {selectedItem.name}
                                        </Title>
                                        {selectedItem.type === 'pet' && (
                                            <Badge
                                                mt={8}
                                                variant="light"
                                                color="pink"
                                                leftSection={selectedItem.slot === 'outfit' ? <Shirt size={12} /> : <Crown size={12} />}
                                            >
                                                {selectedItem.slot === 'outfit' ? 'Outfit' : 'Accessory'}
                                            </Badge>
                                        )}
                                    </Box>

                                    <Divider />

                                    {selectedOwned ? (
                                        <Stack gap="sm">
                                            <Group gap={6}>
                                                <Image src="/assets/currency/student-coin.png" alt="" w={18} h={18} />
                                                <Text fw={700} c="dimmed">
                                                    Purchased for {formatCoins(selectedItem.price)}
                                                </Text>
                                            </Group>
                                            <Button
                                                radius="lg"
                                                fullWidth
                                                variant={isEquipped(selectedItem) ? 'light' : 'filled'}
                                                color={isEquipped(selectedItem) ? 'gray' : 'green'}
                                                onClick={handleEquip}
                                                rightSection={isEquipped(selectedItem) ? <Crown size={16} /> : <Check size={16} />}
                                            >
                                                {isEquipped(selectedItem) ? 'Unequip' : 'Equip'}
                                            </Button>
                                        </Stack>
                                    ) : confirming ? (
                                        <Stack gap="sm">
                                            <Paper p="sm" radius="md" style={{ backgroundColor: '#FFF9DB', border: '1px solid #FFEC99' }}>
                                                <Group gap={6}>
                                                    <Info size={16} color="#E8590C" />
                                                    <Text size="sm" fw={600}>
                                                        Confirm purchase of {formatCoins(selectedItem.price)} coins?
                                                    </Text>
                                                </Group>
                                            </Paper>
                                            <Group grow>
                                                <Button variant="light" radius="lg" onClick={() => setConfirming(false)}>
                                                    Keep browsing
                                                </Button>
                                                <Button radius="lg" color="green" onClick={openPurchaseModal} rightSection={<Gift size={16} />}>
                                                    Confirm
                                                </Button>
                                            </Group>
                                        </Stack>
                                    ) : (
                                        <Stack gap="sm">
                                            {!canAfford && (
                                                <Paper p="sm" radius="md" style={{ backgroundColor: '#FFF5F5', border: '1px solid #FFC9C9' }}>
                                                    <Text size="sm" fw={600} c="#E03131" ta="center">
                                                        You need {formatCoins(selectedItem.price - balance)} more coins
                                                    </Text>
                                                </Paper>
                                            )}
                                            <Group justify="space-between" align="center">
                                                <Box>
                                                    <Text c="dimmed" fz="xs" fw={600}>
                                                        PRICE
                                                    </Text>
                                                    <Group gap={6}>
                                                        <Image src="/assets/currency/student-coin.png" alt="" w={18} h={18} />
                                                        <Text fw={800} fz="lg">
                                                            {formatCoins(selectedItem.price)}
                                                        </Text>
                                                    </Group>
                                                </Box>
                                                <Box ta="right">
                                                    <Text c="dimmed" fz="xs" fw={600}>
                                                        AFTER PURCHASE
                                                    </Text>
                                                    <Text fw={700} c={canAfford ? '#2F9E44' : '#E03131'}>
                                                        {formatCoins(balance - selectedItem.price)}
                                                    </Text>
                                                </Box>
                                            </Group>
                                            <Button
                                                radius="lg"
                                                fullWidth
                                                color="yellow"
                                                variant="filled"
                                                disabled={!canAfford}
                                                onClick={() => setConfirming(true)}
                                                rightSection={<ShoppingBag size={16} />}
                                            >
                                                {canAfford ? 'Purchase' : 'Not enough coins'}
                                            </Button>
                                        </Stack>
                                    )}

                                    <Text c="dimmed" fz="xs" ta="center">
                                        Balance: {coins === null ? '…' : `${formatCoins(balance)} coins`}
                                    </Text>
                                </Stack>
                            ) : (
                                <Stack align="center" gap="sm" py="xl">
                                    <ThemeIcon radius="xl" size={56} variant="light" color="gray">
                                        <Sparkles size={26} />
                                    </ThemeIcon>
                                    <Text fw={600} ta="center">
                                        Select an item to preview it here
                                    </Text>
                                    <Text c="dimmed" size="sm" ta="center">
                                        Compare styles, check your balance after purchase, and grab it in one tap.
                                    </Text>
                                </Stack>
                            )}
                        </Paper>

                        {/* Quick tip */}
                        <Paper p="md" radius="lg" shadow="sm" withBorder mt="md">
                            <Group gap={10} align="flex-start" wrap="nowrap">
                                <ThemeIcon radius="xl" size={30} variant="light" color="yellow">
                                    <Star size={16} />
                                </ThemeIcon>
                                <Box>
                                    <Text fw={700} size="sm">
                                        Earning more coins
                                    </Text>
                                    <Text c="dimmed" fz="xs" mt={2}>
                                        Complete daily quests and study sessions to earn XP and coins. New deals rotate weekly.
                                    </Text>
                                </Box>
                            </Group>
                        </Paper>
                    </Box>
                </SimpleGrid>
            </Box>
        </Box>
    );
}