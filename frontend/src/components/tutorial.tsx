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
    CalendarCheck2,
    CalendarClock,
    Cat,
    ChevronLeft,
    ChevronRight,
    ClipboardList,
    Flower2,
    FolderOpen,
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
    | "createquest"
    | "scheduling"
    | "materials"
    | "focusroom"
    | "rewardshop"
    | "progressmap"
    | "petgarden"
    | "askwasi";

export const tutorialTabs: { key: TutorialSection; label: string; icon: typeof Sparkles }[] = [
    { key: "welcome", label: "Welcome", icon: Sparkles },
    { key: "meetpet", label: "Your Companion", icon: Cat },
    { key: "questcalendar", label: "Quest Calendar", icon: CalendarClock },
    { key: "createquest", label: "Create a Quest", icon: ClipboardList },
    { key: "scheduling", label: "Auto-Scheduling", icon: CalendarCheck2 },
    { key: "materials", label: "Study Materials", icon: FolderOpen },
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
            "Switch between Week and Month views with the buttons above the calendar, or use the arrows to move ahead and back.",
            "Use the Calendar View, Quest List, and Modules tabs to move between your plan, a filterable list, and your study files.",
            "Click a day to focus it, then open a quest to see its subject, coursework type, priority, status, deadline, and rewards.",
            "Completed quests leave the calendar; overdue quests stay visible so nothing slips through.",
            "Search or filter by status and subject in the Quest List tab to find work quickly.",
        ],
        tip: "Pending deadlines feed your dashboard reminders and workload alerts.",
        cta: { label: "Open Quest Calendar", path: "/questcalendar" },
    },
    createquest: {
        title: "Create a quest",
        intro: "Every assignment, reading, or project becomes a quest with a deadline and a reward.",
        points: [
            "Open Quest Calendar and click Add Quest. Title, subject, deadline, and estimated duration are required.",
            "Pick a coursework type (required once you've added types in Settings): it sets the quest's priority and its coin, pet XP, and energy rewards.",
            "Estimate how long it will take (at least 15 minutes). The planner uses this duration to reserve a study block for you.",
            "Optionally add a description or attach a PDF, DOCX, TXT, or MD file up to 10 MB.",
            "Use Mark as In Progress when you start, then Mark as Done to claim the quest's rewards.",
        ],
        tip: "You can edit a quest from its details panel, and the edit form also lets you delete it. Coursework types and priorities can be changed in Settings.",
        cta: { label: "Create a Quest", path: "/questcalendar" },
    },
    scheduling: {
        title: "Automatic scheduling",
        intro: "Regenerate Plan turns your quests into study blocks inside the availability you set during setup.",
        points: [
            "Check your weekly availability in Settings first. The planner only places blocks inside those windows.",
            "Click Regenerate Plan and quests are ordered by earliest deadline, then by priority: high, medium, then low.",
            "Each quest is packed into a free 15-minute slot, must fit entirely before its deadline, and never overlaps another block.",
            "Regenerating rebuilds only auto-generated blocks; blocks marked manual are left untouched.",
            "If a quest cannot be placed, you get a reason such as no availability, window too short, deadline too soon, or no free slot.",
            "For an overdue quest, open it in Edit and set a To-do day so the planner can schedule it again.",
        ],
        tip: "Scheduled blocks appear on the calendar, and each quest's details show its scheduled time and scheduling reason.",
        cta: { label: "Open Quest Calendar", path: "/questcalendar" },
    },
    materials: {
        title: "Study materials",
        intro: "Keep the files for each quest close to the work.",
        points: [
            "Open the Modules tab in Quest Calendar to see everything you have uploaded.",
            "Upload PDF, DOCX, TXT, or MD files up to 10 MB, then attach them to a quest when you create or edit it.",
            "Click a material to open it, or ask Wasi questions about your learning materials.",
        ],
        tip: "Materials attached to a quest also appear in its details panel.",
        cta: { label: "Open Study Materials", path: "/questcalendar" },
    },
    focusroom: {
        title: "Focus Room",
        intro: "Run focused study sessions on your own or with friends.",
        points: [
            "Rooms hold up to 50 people, so invite friends and study together.",
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
                walks through quests, automatic scheduling, focus sessions, and rewards so
                you can get the most out of your study time.
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
                        <Text span fw={600}>Scheduling</Text>: let the planner fit quests into your weekly availability.
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
                        {tutorialTabs.length - 1} short steps, about two minutes in total. You can
                        skip now and come back to any tutorial from Help &amp; Tutorials at any time.
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
