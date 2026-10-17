import {
    Box,
    Button,
    Divider,
    Group,
    List,
    Paper,
    Stack,
    Text,
    ThemeIcon,
    Title,
} from "@mantine/core";
import {
    Bot,
    CalendarClock,
    Cat,
    ChevronLeft,
    ChevronRight,
    Flower2,
    Lightbulb,
    MapPin,
    ShoppingCart,
    Sparkles,
    Timer,
} from "lucide-react";

export type TutorialSection =
    | "welcome"
    | "meetpet"
    | "questcalendar"
    | "focusroom"
    | "rewardshop"
    | "progressmap"
    | "petgarden"
    | "askwasi";

export const tutorialTabs: { key: TutorialSection; label: string; icon: typeof Sparkles }[] = [
    { key: "welcome", label: "Welcome", icon: Sparkles },
    { key: "meetpet", label: "Your Companion", icon: Cat },
    { key: "questcalendar", label: "Quest Calendar", icon: CalendarClock },
    { key: "focusroom", label: "Focus Room", icon: Timer },
    { key: "rewardshop", label: "Reward Shop", icon: ShoppingCart },
    { key: "progressmap", label: "Progress Map", icon: MapPin },
    { key: "petgarden", label: "Pet Garden", icon: Flower2 },
    { key: "askwasi", label: "Ask Wasi", icon: Bot },
];

export type TutorialStepInfo = {
    title: string;
    intro: string;
    points: string[];
    tip?: string;
    cta: { label: string; path: string };
};

export const tutorialSteps: Record<Exclude<TutorialSection, "welcome">, TutorialStepInfo> = {
    meetpet: {
        title: "Your study companion",
        intro: "The pet you chose grows alongside your study habits.",
        points: [
            "Earn pet XP and energy by completing quests and finishing focus sessions.",
            "Energy slowly decays while you're away, so keep studying to keep your pet happy.",
            "Your pet evolves every 5 levels, from Baby all the way to Mature.",
        ],
        tip: "The Pet Garden shows your pet's energy, growth stage, and recent activity.",
        cta: { label: "Open Pet Garden", path: "/petgarden" },
    },
    questcalendar: {
        title: "Quest Calendar",
        intro: "Quests are your coursework and tasks, organized in one calendar.",
        points: [
            "Add a quest with a title, subject, deadline, estimated minutes, and priority.",
            "The reward preview shows the coins and pet XP you'll earn for completing it.",
            "Priority rules from your setup are applied, and you can filter by status or subject.",
        ],
        tip: "Pending deadlines feed your dashboard reminders and workload alerts.",
        cta: { label: "Open Quest Calendar", path: "/questcalendar" },
    },
    focusroom: {
        title: "Focus Room",
        intro: "Run focused study sessions on your own or with friends.",
        points: [
            "Rooms hold up to 4 people, so invite friends and study together.",
            "Set a duration, pick an ambient sound, and link the session to a quest.",
            "Finishing earns coins, pet energy, and streak XP based on the time you complete.",
        ],
        tip: "Your finished sessions are saved to your history and count toward your stats.",
        cta: { label: "Open Focus Room", path: "/focusroom" },
    },
    rewardshop: {
        title: "Reward Shop",
        intro: "Spend the coins you earn on making your companion your own.",
        points: [
            "Browse three aisles: Eggs, Pet Style, and Garden Decor.",
            "Buy accessories, outfits, eggs, and garden themes with student coins.",
            "Equip accessories and outfits to change how your pet looks in the garden.",
        ],
        tip: "Coins come from quests, focus sessions, daily rewards, and streaks.",
        cta: { label: "Open Reward Shop", path: "/rewardshop" },
    },
    progressmap: {
        title: "Progress Map",
        intro: "See how far you've come and where to focus next.",
        points: [
            "Track your study time and XP over time, broken down by subject.",
            "Follow your streak and watch your pet grow from Baby to Mature.",
            "Spot which subjects are getting your attention and which need more.",
        ],
        cta: { label: "Open Progress Map", path: "/progressmap" },
    },
    petgarden: {
        title: "Pet Garden",
        intro: "Your pet's home and care center.",
        points: [
            "Check its energy, growth stage, and XP progress to the next level.",
            "Energy decays while you're away; focus sessions and completed quests restore it.",
            "Review recent activity, from focus sessions to new purchases and equipped items.",
        ],
        tip: "To equip an accessory or outfit, buy it in the Reward Shop first.",
        cta: { label: "Open Pet Garden", path: "/petgarden" },
    },
    askwasi: {
        title: "Ask Wasi",
        intro: "Wasi is your AI study assistant for whenever you're stuck.",
        points: [
            "Ask for explanations, get quizzed, or get help organizing coursework.",
            "Upload learning materials and ask questions about their content.",
            "Start from quick prompts like 'Explain a concept' or 'Study plan'.",
        ],
        tip: "Notification preferences and everything else can be changed anytime in Settings.",
        cta: { label: "Open Ask Wasi", path: "/askwasi" },
    },
};

export function TutorialWelcome({
    showActions,
    onStart,
    onSkip,
}: {
    showActions: boolean;
    onStart: () => void;
    onSkip: () => void;
}) {
    return (
        <Stack gap='lg'>
            <Group gap={10}>
                <ThemeIcon radius='lg' variant='light' color='blue' size={38}>
                    <Sparkles size={20} />
                </ThemeIcon>
                <Title order={3} fz='xl' fw={700}>
                    Welcome to CommonGrounds!
                </Title>
            </Group>

            <Text>
                Your profile is set and your companion is waiting for you. This short tour
                shows how everything connects, so you can get the most out of your study time.
            </Text>

            <Paper radius='lg' p='md' withBorder style={{ backgroundColor: 'light-dark(#F1F9FF, #1B2A3A)' }}>
                <Text fw={700} mb={6}>
                    The study loop
                </Text>
                <List size='sm' spacing={4}>
                    <List.Item>
                        <Text span fw={600}>Quests</Text>: turn coursework into tasks with deadlines and rewards.
                    </List.Item>
                    <List.Item>
                        <Text span fw={600}>Focus sessions</Text>: study solo or with friends and log your time.
                    </List.Item>
                    <List.Item>
                        <Text span fw={600}>Coins & pet XP</Text>: earn them as you complete quests and sessions.
                    </List.Item>
                    <List.Item>
                        <Text span fw={600}>Rewards</Text>: spend coins on your pet and watch it grow.
                    </List.Item>
                </List>
            </Paper>

            {showActions ? (
                <>
                    <Text c='dimmed' size='sm'>
                        Seven short steps, about a minute in total. You can skip now and come back
                        to any tutorial from the sidebar at any time.
                    </Text>

                    <Group gap='sm'>
                        <Button
                            radius='lg'
                            color='green'
                            rightSection={<ChevronRight size={16} />}
                            onClick={onStart}
                        >
                            Start Tutorial
                        </Button>
                        <Button radius='lg' variant='subtle' color='gray' onClick={onSkip}>
                            Skip for now
                        </Button>
                    </Group>
                </>
            ) : (
                <Text c='dimmed' size='sm' ta='center'>
                    Pick any topic from the sidebar to explore.
                </Text>
            )}
        </Stack>
    );
}

export function TutorialStepPanel({
    icon: Icon,
    title,
    intro,
    points,
    tip,
    cta,
    isLast,
    showCta = true,
    onOpen,
    onBack,
    onNext,
}: TutorialStepInfo & {
    icon: typeof Sparkles;
    isLast: boolean;
    showCta?: boolean;
    onOpen?: () => void;
    onBack: () => void;
    onNext: () => void;
}) {
    return (
        <Stack gap='lg'>
            <Group gap={10}>
                <ThemeIcon radius='lg' variant='light' color='blue' size={38}>
                    <Icon size={20} />
                </ThemeIcon>
                <Title order={3} fz='xl' fw={700}>
                    {title}
                </Title>
            </Group>

            <Text>{intro}</Text>

            <List spacing='sm' size='sm'>
                {points.map((point) => (
                    <List.Item key={point}>{point}</List.Item>
                ))}
            </List>

            {tip && (
                <Paper radius='lg' p='sm' withBorder style={{ backgroundColor: 'light-dark(#FFF9DB, #332D13)' }}>
                    <Group gap={8} wrap='nowrap' align='flex-start'>
                        <Lightbulb size={16} style={{ color: 'light-dark(#E67700, #FFD43B)', flexShrink: 0, marginTop: 2 }} />
                        <Text size='sm' c='light-dark(#856404, #FFE066)'>
                            {tip}
                        </Text>
                    </Group>
                </Paper>
            )}

            {showCta && onOpen && (
                <Box>
                    <Button variant='light' radius='lg' onClick={onOpen}>
                        {cta.label}
                    </Button>
                </Box>
            )}

            <Divider />

            <Group justify='space-between' gap='sm'>
                <Button
                    variant='default'
                    radius='lg'
                    leftSection={<ChevronLeft size={16} />}
                    onClick={onBack}
                >
                    Back
                </Button>
                <Button
                    radius='lg'
                    color='green'
                    rightSection={isLast ? undefined : <ChevronRight size={16} />}
                    onClick={onNext}
                >
                    {isLast ? "Finish" : "Next"}
                </Button>
            </Group>
        </Stack>
    );
}
