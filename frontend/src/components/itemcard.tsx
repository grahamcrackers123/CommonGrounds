"use client";

import { Box, Group, Image, Paper, Text } from "@mantine/core";

export interface ShopItemBase {
    id: number;
    name: string;
    price: number;
    imageUrl: string;
    backgroundColor?: string;
}

interface ItemCardProps {
    item: ShopItemBase;
    canAfford: boolean;
    owned: boolean;
    selected?: boolean;
    imageWidth?: number;
    imageHeight?: number;
    onBuy: (item: ShopItemBase) => void;
}

export default function ItemCard({ item, owned, selected, imageWidth = 80, imageHeight = 80, onBuy }: ItemCardProps) {
    return (
        <Box
            h='180px'
            w='170px'
            style={{
                backgroundColor: 'light-dark(#FFFFFF, #151515)',
                border: selected ? '2px solid light-dark(#2F80ED, #74C0FC)' : '1px solid light-dark(#CED4DA, #2C2E33)',
                borderRadius: '16px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
            }}
            onClick={() => onBuy(item)}
        >
            <Paper w='100px' h='100px' mb='10px' style={{ backgroundColor: item.backgroundColor, borderRadius: '50px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Image src={item.imageUrl} alt={item.name} w={`${imageWidth}px`} h={`${imageHeight}px`} />
            </Paper>
            <Text
    size="sm"
    fw={500}
    mb="5px"
    c="light-dark(#000000, #FFFFFF)"
>
    {item.name}
</Text>
            {owned ? (
                <Text size="sm" fw={500} c='green'>Owned</Text>
            ) : (
                <Group gap='5px'>
                    <Image src='/assets/currency/student-coin.png' alt='' w='20px' h='20px' />
                    <Text fw={500} size="sm">{item.price}</Text>
                </Group>
            )}
        </Box>
    )
}