"use client";

import ItemCard, { type ShopItemBase } from "@/components/itemcard";
import { createClient } from "@/lib/supabase/client";
import { Badge, Box, Container, Flex, Group, Image, Paper, Stack, Text, UnstyledButton } from "@mantine/core";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import { useEffect, useState } from "react";

type TabSection = 'Eggs' | 'Pet Style' | 'Garden Decor';
const tabs: TabSection[] = ['Eggs', 'Pet Style', 'Garden Decor'];

type ItemCategory = 'egg' | 'pet' | 'garden';
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

type ShopItem = (Egg & { type: 'egg' }) | (PetStyle & { type: 'pet' }) | (GardenDecor & { type: 'garden' });

const shopItems: ShopItem[] = [
    // Eggs
    { id: 1, name: 'Nature Egg', price: 10000, imageUrl: '/assets/eggs/nature-egg.png', backgroundColor: '#DFF8EA', type: 'egg' },
    { id: 2, name: 'Blossom Egg', price: 10000, imageUrl: '/assets/eggs/blossom-egg.png', backgroundColor: '#F8E6D9', type: 'egg' },
    { id: 3, name: 'Celestial Egg', price: 10000, imageUrl: '/assets/eggs/celestial-egg.png', backgroundColor: '#F1EAFF', type: 'egg' },

    // Pet Style
    { id: 1, name: 'Bandana', price: 500, imageUrl: '/assets/accessories/bandana.png', backgroundColor: '#F8E6D9', type: 'pet' },
    { id: 2, name: 'Flower Crown', price: 500, imageUrl: '/assets/accessories/flower-crown.png', backgroundColor: '#DFF8EA', type: 'pet' },
    { id: 3, name: 'Rounded Glasses', price: 500, imageUrl: '/assets/accessories/glasses.png', backgroundColor: '#F1EAFF', type: 'pet' },
    { id: 4, name: 'Party Hat', price: 500, imageUrl: '/assets/accessories/party-hat.png', backgroundColor: '#E0F7FA', type: 'pet' },
    { id: 5, name: 'Ribbon', price: 500, imageUrl: '/assets/accessories/ribbon.png', backgroundColor: '#FFF3E0', type: 'pet' },
    { id: 6, name: 'Scarf', price: 500, imageUrl: '/assets/accessories/scarf.png', backgroundColor: '#FFE0B2', type: 'pet' },
    { id: 7, name: 'Wizard Hat', price: 500, imageUrl: '/assets/accessories/wizard-hat.png', backgroundColor: '#FFCCBC', type: 'pet' },
    { id: 8, name: 'Explorer Outfit', price: 100, imageUrl: '/assets/outfits/explorer-outfit.png', backgroundColor: '#E1BEE7', type: 'pet' },
    { id: 9, name: 'Gardener Outfit', price: 100, imageUrl: '/assets/outfits/gardener-outfit.png', backgroundColor: '#FFF9C4', type: 'pet' },
    { id: 10, name: 'Magical Outfit', price: 100, imageUrl: '/assets/outfits/magical-outfit.png', backgroundColor: '#B2EBF2', type: 'pet' },
    { id: 11, name: 'Pajama Outfit', price: 100, imageUrl: '/assets/outfits/pajama-outfit.png', backgroundColor: '#D1C4E9', type: 'pet' },
    { id: 12, name: 'Uniform Outfit', price: 100, imageUrl: '/assets/outfits/uniform-outfit.png', backgroundColor: '#C8E6C9', type: 'pet' },

    // Garden Decor
    { id: 1, name: 'Moonlight Garden', price: 3000, imageUrl: '/assets/garden-themes/moonlight-garden.png', type: 'garden' },
    { id: 2, name: 'Sakura Garden', price: 3000, imageUrl: '/assets/garden-themes/sakura-garden.png', type: 'garden' },
]

export default function RewardShopPage() {
    const [activeTab, setActiveTab] = useState<TabSection>('Eggs');
    const [coins, setCoins] = useState(0);
    const [ownedItems, setOwnedItems] = useState<string[]>([]);
    const isOwned = (category: ItemCategory, id: number) => ownedItems.includes(itemKey(category, id));

    // loads the coin balance
    useEffect(() => {
        fetch('/api/rewards/balance')
            .then((res) => res.json())
            .then((data) => setCoins(data.coins ?? 0))
            .catch(() => {
                notifications.show({ title: 'Error', message: 'Could not load your coin balance.', color: 'red' });
            });
    }, []);

    // loads items user own
    useEffect(() => {
        const supabase = createClient();
        (async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            const { data, error } = await supabase.from('user_items').select('item_key').eq('user_id', user.id);
            if (!error && data) setOwnedItems(data.map((row) => row.item_key));
        })();
    }, []);

    const openPurchaseModal = (category: ItemCategory, item: ShopItemBase) => {
        const canAfford = coins >= item.price;
        modals.openConfirmModal({
            title: 'Please Confirm your Purchase',
            size: 'sm',
            centered: true,
            children: (
                <>
                    <Group>
                        <Image src={item.imageUrl} alt={item.name} style={{ display: 'block', margin: '0 auto' }} />
                        <Text size="sm" ta='center'>
                            Are you sure you want to buy this item {item.name} for {item.price} coins?
                        </Text>
                    </Group>

                    {!canAfford && (
                        <Paper style={{ backgroundColor: '#FF999C', padding: '10px', marginTop: '10px', borderRadius: '8px' }}>
                            <Text size="sm" ta='center'>
                                Insufficient balance. You need {item.price - coins} more coins to purchase this item.
                            </Text>
                        </Paper>
                    )}
                </>
            ),
            confirmProps: { color: canAfford ? 'blue' : 'gray', disabled: !canAfford },
            labels: { confirm: 'Confirm', cancel: 'Cancel' },
            onConfirm: async () => {
                const res = await fetch('/api/rewards/purchase', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ itemId: itemKey(category, item.id) }),
                });
                const data = await res.json();

                if (!res.ok) {
                    notifications.show({
                        title: 'Purchase Failed',
                        message: data.error ?? 'Something went wrong.',
                        color: 'red',
                    });
                    return;
                }

                setOwnedItems((prev) => [...prev, itemKey(category, item.id)]);
                setCoins(data.coins);
                notifications.show({
                    title: 'Successful Purchase',
                    message: 'Your purchase was successful.',
                    color: 'green',
                });
            },
            onCancel: () =>
                notifications.show({
                    title: 'Cancelled',
                    message: 'Purchase was cancelled.',
                    color: 'red',
                }),
        })
    };

    return (
        <Container mih="100vh" p={{ base: 20, md: 40 }} miw='100%' style={{ backgroundColor: "#F7F9FC" }}>
            <Stack gap='md'>
                <Group>
                    {tabs.map((tab) => {
                        const isActive = activeTab === tab;
                        return (
                            <UnstyledButton
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                aria-selected={isActive}
                            >
                                <Badge
                                    size='lg'
                                    py='12'
                                    px='25'
                                    variant={isActive ? 'filled' : 'outline'}
                                    color={isActive ? '#2F80ED' : '#adb5bd'}
                                    style={{ cursor: 'pointer' }}
                                >
                                    {tab}
                                </Badge>
                            </UnstyledButton>
                        );
                    })}
                </Group>

                <Flex direction='row' gap='md' >
                    <Box miw='70%' mih='100%'>
                        {activeTab === 'Eggs' &&
                            <Group>
                                {shopItems.filter((item) => item.type === 'egg').map((item) => (
                                    <ItemCard
                                        key={item.id}
                                        item={item}
                                        canAfford={coins >= item.price}
                                        owned={isOwned('egg', item.id)}
                                        onBuy={(it) => openPurchaseModal('egg', it)}
                                    />
                                ))}
                            </Group>
                        }

                        {activeTab === 'Pet Style' &&
                            <Group>
                                {shopItems.filter((item) => item.type === 'pet').map((item) => (
                                    <ItemCard
                                        key={item.id}
                                        item={item}
                                        canAfford={coins >= item.price}
                                        owned={isOwned('pet', item.id)}
                                        onBuy={(it) => openPurchaseModal('pet', it)}
                                    />
                                ))}
                            </Group>
                        }

                        {activeTab === 'Garden Decor' &&
                            <Group>
                                {shopItems.filter((item) => item.type === 'garden').map((item) => (
                                    <ItemCard
                                        key={item.id}
                                        item={item}
                                        canAfford={coins >= item.price}
                                        owned={isOwned('garden', item.id)}
                                        onBuy={(it) => openPurchaseModal('garden', it)}
                                        imageWidth={200}
                                        imageHeight={80}
                                    />
                                ))}
                            </Group>
                        }
                    </Box>
                    <Box miw='30%' mih='100%' style={{ backgroundColor: 'white', border: '1px solid #ced4da', borderRadius: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                        <Flex direction='row' gap='md' style={{ alignItems: 'flex-start', justifyContent: 'center', height: '100%', width: '100%', padding: '16px' }}>
                            <Box style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                                <Text fz={{ xs: 'xs', sm: 'sm', md: 'md' }} fw={500} >Your Coins:</Text>
                                <Box style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                    <Image src='/assets/currency/student-coin.png' alt='' w='20px' h='20px' />
                                    <Text fw={500} fz={{ xs: 'xs', sm: 'sm', md: 'md' }}>
                                        {coins}
                                    </Text>
                                </Box>
                            </Box>
                        </Flex>
                    </Box>
                </Flex>
            </Stack >
        </Container >
    );
}