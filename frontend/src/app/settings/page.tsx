"use client";

import { createClient } from '@/lib/supabase/client';
import { Avatar, Badge, Box, Button, Chip, Divider, FileButton, Flex, Group, Paper, Select, Stack, Switch, TagsInput, Text, TextInput, ThemeIcon, Title, UnstyledButton } from "@mantine/core";
import { useForm, type UseFormReturnType } from '@mantine/form';
import { modals } from '@mantine/modals';
import { notifications } from '@mantine/notifications';
import { Bell, BookOpen, CalendarClock, FileDown, FileUp, GraduationCap, KeyRound, LogOut, Moon, Palette, Plus, Save, ShieldCheck, Trash2, User, X } from 'lucide-react';
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

type TabSection = "account" | "academic" | "schedule" | "notifications" | "privacy";
const tabs: { key: TabSection; label: string; icon: typeof User }[] = [
    { key: "account", label: "Account", icon: User },
    { key: "academic", label: "Academic Profile", icon: GraduationCap },
    { key: "schedule", label: "Study Schedule", icon: CalendarClock },
    { key: "notifications", label: "Notifications", icon: Bell },
    { key: "privacy", label: "Privacy & Data", icon: ShieldCheck },
];

const ENROLLMENT_OPTIONS = ["Working Student", "Full time Student", "Part time Student"];
const COURSEWORK_SUGGESTIONS = ["Worksheet", "Quiz", "Project", "Reading", "Flashcards"];
const PRIORITY_OPTIONS = ["High", "Medium", "Low"];
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const TIMES = ["07:00", "08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00", "21:00", "22:00"];
const DEFAULT_START = '09:00';
const DEFAULT_END = '12:00';
const STUDY_PERIODS = ["Morning", "Afternoon", "Evening", "Late Night"];
const FOCUS_LENGTHS = [
    { value: '30', label: '30 mins' },
    { value: '45', label: '45 mins' },
    { value: '60', label: '60 mins' },
    { value: '0', label: 'Custom' },
];

const NOTIFICATION_GROUPS = [
    {
        title: "Reminders",
        items: [
            { key: "deadlineReminders", label: "Deadline reminders" },
            { key: "focusReminders", label: "Focus session reminders" },
            { key: "burnoutNudges", label: "Burnout & wellness nudges" },
        ],
    },
    {
        title: "Motivation & rewards",
        items: [
            { key: "rewardAlerts", label: "Reward alerts" },
            { key: "friendInvites", label: "Friend focus room invites" },
        ],
    },
];

type NotificationPrefs = {
    deadlineReminders: boolean;
    focusReminders: boolean;
    burnoutNudges: boolean;
    rewardAlerts: boolean;
    friendInvites: boolean;
};

type AvailabilitySlot = { day: string; start: string; end: string };

type FormValues = {
    first_name: string;
    last_name: string;
    display_name: string;
    program: string;
    level: string;
    school: string;
    enrollment_status: string;
    study_time: string;
    focus_length: string;
    subjects: string[];
    weekly_availability: AvailabilitySlot[];
    coursework_priorities: Record<string, string>;
    notification_prefs: NotificationPrefs;
};

interface TabProps {
    form: UseFormReturnType<FormValues>;
    markUnsavedChanges: () => void;
}

function to24h(time: string): string {
    const match = time.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (!match) return time;
    let hours = Number(match[1]) % 12;
    if (match[3].toUpperCase() === 'PM') hours += 12;
    return `${String(hours).padStart(2, '0')}:${match[2]}`;
}

export default function SettingsPage() {
    const [activeTab, setActiveTab] = useState<TabSection>('account');
    const [unsavedChanges, setUnsavedChanges] = useState(false);
    const [loading, setLoading] = useState(true);
    const hydratedRef = useRef(false);
    const supabase = useMemo(() => createClient(), []);

    const markUnsavedChanges = () => {
        setUnsavedChanges(true);
    };

    const form = useForm<FormValues>({
        initialValues: {
            first_name: '',
            last_name: '',
            display_name: '',
            program: '',
            level: '',
            school: '',
            enrollment_status: '',
            study_time: '',
            focus_length: '',
            subjects: [],
            weekly_availability: [],
            coursework_priorities: {},
            notification_prefs: {
                deadlineReminders: true,
                focusReminders: true,
                burnoutNudges: false,
                rewardAlerts: false,
                friendInvites: false,
            },
        },
        onValuesChange: () => {
            if (hydratedRef.current) setUnsavedChanges(true);
        },
    })

    useEffect(() => {
        if (hydratedRef.current) return;
        let cancelled = false;
        (async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('first_name, last_name, display_name, school, program, level, enrollment_status, study_time, focus_length, subjects, weekly_availability, coursework_priorities, notification_prefs')
                    .eq('id', user.id)
                    .single();
                if (!cancelled && data) {
                    form.setValues({
                        first_name: data.first_name ?? '',
                        last_name: data.last_name ?? '',
                        display_name: data.display_name ?? '',
                        school: data.school ?? '',
                        program: data.program ?? '',
                        level: data.level != null ? String(data.level) : '',
                        enrollment_status: data.enrollment_status ?? '',
                        study_time: data.study_time ?? '',
                        focus_length: data.focus_length != null ? String(data.focus_length) : '',
                        subjects: data.subjects ?? [],
                        weekly_availability: (data.weekly_availability ?? []).map((slot: { day: string; start: string; end: string }) => ({
                            day: slot.day,
                            start: to24h(slot.start),
                            end: to24h(slot.end),
                        })),
                        coursework_priorities: data.coursework_priorities ?? {},
                        notification_prefs: {
                            deadlineReminders: data.notification_prefs?.deadlineReminders ?? true,
                            focusReminders: data.notification_prefs?.focusReminders ?? true,
                            burnoutNudges: data.notification_prefs?.burnoutNudges ?? false,
                            rewardAlerts: data.notification_prefs?.rewardAlerts ?? false,
                            friendInvites: data.notification_prefs?.friendInvites ?? false,
                        },
                    });
                    form.setInitialValues(form.getValues());
                }
                if (!cancelled) hydratedRef.current = true;
                if (error) console.error('Error loading profile:', error);
            }
            if (!cancelled) setLoading(false);
        })();
        return () => { cancelled = true; };
    }, [supabase, form, hydratedRef]);

    const handleSaveProfile = async (values: typeof form.values) => {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            console.error('No user found');
            return;
        }

        const payload: Record<string, unknown> = {
            first_name: values.first_name,
            last_name: values.last_name,
            display_name: values.display_name,
            school: values.school,
            program: values.program,
            level: values.level,
            enrollment_status: values.enrollment_status,
            study_time: values.study_time,
            subjects: values.subjects,
            weekly_availability: values.weekly_availability,
            coursework_priorities: values.coursework_priorities,
            notification_prefs: values.notification_prefs,
        };
        if (values.focus_length !== '') payload.focus_length = Number(values.focus_length);

        const { error } = await supabase
            .from('profiles')
            .update(payload)
            .eq('id', user.id);

        if (error) {
            console.error('Error updating profile:', error);
            notifications.show({ title: 'Error', message: 'Could not save your changes. Please try again.', color: 'red' });
        } else {
            setUnsavedChanges(false);
            notifications.show({ title: 'Success!', message: 'Settings saved.', color: 'green' });
        }
    };

    return (
        <Box style={{ backgroundColor: '#F7F9FC', minHeight: '100vh' }}>
            <Box maw={1100} mx="auto" p={{ base: 20, md: 40 }}>
                <Group justify="space-between" align="flex-end" mb={24} wrap="wrap">
                    <Box>
                        <Title order={1} fw={800}>
                            Settings
                        </Title>
                        <Text c='dimmed' size='sm' mt={4}>
                            Manage your account, study preferences, and notifications.
                        </Text>
                    </Box>
                    {unsavedChanges && (
                        <Badge color="yellow" variant="light" size="lg" radius='xl' leftSection={<Palette size={13} />}>
                            Unsaved Changes
                        </Badge>
                    )}
                </Group>

                <Flex gap='md' direction={{ base: 'column', md: 'row' }} align='flex-start'>
                    {/* sidebar */}
                    <Paper p='xs' radius='lg' shadow='sm' withBorder style={{ width: '100%', maxWidth: 260, flexShrink: 0 }}>
                        <Stack gap={4}>
                            {tabs.map((tab) => {
                                const isActive = activeTab === tab.key;
                                return (
                                    <UnstyledButton
                                        key={tab.key}
                                        onClick={() => setActiveTab(tab.key)}
                                        style={{ width: '100%' }}
                                    >
                                        <Group gap={10}
                                            p='sm'
                                            style={{
                                                borderRadius: 10,
                                                backgroundColor: isActive ? '#E7F5FF' : 'transparent',
                                                border: `1px solid ${isActive ? "#74C0FC" : "transparent"}`,
                                                transition: 'background-color 0.15s ease'
                                            }}
                                        >
                                            <tab.icon size={17} style={{ color: isActive ? '#1C7ED6' : '#868E96' }} />
                                            <Text fw={600} size='sm' c={isActive ? '#1C7ED6' : '#495057'}>
                                                {tab.label}
                                            </Text>
                                        </Group>
                                    </UnstyledButton>
                                );
                            })}
                        </Stack>
                    </Paper>

                    {/* content */}
                    <Paper p={{ base: 'lg', md: 'xl' }} radius='lg' shadow='sm' withBorder style={{ width: '100%', flex: 1 }}>
                        {loading ? (
                            <Text c="dimmed">Loading your profile…</Text>
                        ) : (
                            <>
                                {activeTab === 'account' && <AccountTab form={form} markUnsavedChanges={markUnsavedChanges} />}
                                {activeTab === 'academic' && <AcademicTab form={form} markUnsavedChanges={markUnsavedChanges} />}
                                {activeTab === 'schedule' && <ScheduleTab form={form} markUnsavedChanges={markUnsavedChanges} />}
                                {activeTab === 'notifications' && <NotificationsTab form={form} markUnsavedChanges={markUnsavedChanges} />}
                                {activeTab === 'privacy' && <PrivacyTab form={form} markUnsavedChanges={markUnsavedChanges} />}
                            </>
                        )}

                        <Divider my='lg' />

                        <Group justify="flex-end" gap='sm'>
                            <Button
                                radius='lg'
                                color='green'
                                onClick={() => handleSaveProfile(form.values)}
                                disabled={!form.isDirty()}
                                leftSection={<Save size={16} />}
                            >
                                Save Changes
                            </Button>
                        </Group>
                    </Paper>
                </Flex>
            </Box>
        </Box>
    );
}

function SectionTitle({ icon: Icon, children }: { icon: typeof User; children: React.ReactNode }) {
    return (
        <Group gap={8} mb='md'>
            <ThemeIcon radius='lg' variant='light' size={30} color='blue'>
                <Icon size={16} />
            </ThemeIcon>
            <Title order={3} fz='lg' fw={700}>
                {children}
            </Title>
        </Group>
    );
}

function AccountTab({ form, markUnsavedChanges }: TabProps) {
    const router = useRouter();
    const supabase = useMemo(() => createClient(), []);
    const [email, setEmail] = useState('');

    useEffect(() => {
        let cancelled = false;
        (async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!cancelled) setEmail(user?.email ?? '');
        })();
        return () => { cancelled = true; };
    }, [supabase]);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push('/access');
        router.refresh();
    };

    const handleDeleteAccount = () => {
        modals.openConfirmModal({
            title: 'Delete your account?',
            centered: true,
            children: (
                <Text size="sm">
                    This will permanently delete your profile, pet, quests, rewards, badges, and
                    notifications. This action cannot be undone.
                </Text>
            ),
            labels: { confirm: 'Delete forever', cancel: 'Keep my account' },
            confirmProps: { color: 'red' },
            onConfirm: async () => {
                const res = await fetch('/api/account/delete', { method: 'POST' });
                const data = await res.json();

                if (!res.ok) {
                    notifications.show({
                        title: 'Delete failed',
                        message: data.error ?? 'Something went wrong.',
                        color: 'red',
                    });
                    return;
                }

                await supabase.auth.signOut();
                router.push('/access');
                router.refresh();
            },
        });
    };

    const initials = (form.values.display_name || 'NA')
        .split(' ')
        .map((part) => part[0])
        .slice(0, 2)
        .join('') || 'NA';

    return (
        <Stack gap='lg'>
            <div>
                <SectionTitle icon={User}>Account</SectionTitle>
                <Group gap='lg' align='center'>
                    <Avatar size={95} radius={95} color='blue' style={{ border: '3px solid #D3F9D8' }}>
                        <Text fw={800} fz={26}>
                            {initials}
                        </Text>
                    </Avatar>
                    <Box>
                        <FileButton
                            onChange={() => notifications.show({ title: 'Draft', message: 'Avatar upload is not wired up yet.', color: 'blue' })}
                            accept="image/png,image/jpeg,image/webp"
                        >
                            {(props) =>
                                <Button variant='outline' radius='lg' {...props}>
                                    Change Image
                                </Button>}
                        </FileButton>
                        <Text c='dimmed' fz='xs' mt={6}>
                            PNG, JPG, or WebP up to 5MB.
                        </Text>
                    </Box>
                </Group>

                <Flex gap='md' mt='lg' direction={{ base: 'column', md: 'row' }}>
                    <TextInput label='First Name' radius='lg' {...form.getInputProps('first_name')} style={{ flex: 1 }} />
                    <TextInput label='Last Name' radius='lg' {...form.getInputProps('last_name')} style={{ flex: 1 }} />
                    <TextInput label='Display Name' radius='lg' {...form.getInputProps('display_name')} style={{ flex: 1 }} />
                </Flex>
            </div>

            <Divider />

            <div>
                <SectionTitle icon={KeyRound}>Account security</SectionTitle>
                <Stack gap='md'>
                    <Flex gap='md' direction='row' align='flex-end'>
                        <TextInput label='Email' value={email} radius='lg' onChange={(e) => setEmail(e.currentTarget.value)} style={{ flex: 1, width: '100%' }} />
                        <Button variant='outline' radius='lg' onClick={markUnsavedChanges} style={{ width: '100%', maxWidth: 160 }}>
                            Change Email
                        </Button>
                    </Flex>
                    <Flex gap='md' direction='row' align='flex-end'>
                        <TextInput label='Password' type='password' placeholder='Password' radius='lg' onChange={markUnsavedChanges} style={{ flex: 1, width: '100%' }} />
                        <Button variant='outline' radius='lg' onClick={markUnsavedChanges} style={{ width: '100%', maxWidth: 160 }}>
                            Change Password
                        </Button>
                    </Flex>
                </Stack>
            </div>

            <Divider />

            <div>
                <Text fw={700} mb='xs' c='red.7'>
                    Danger zone
                </Text>
                <Flex gap='md' direction='row'>
                    <Button variant="outline" color='red' radius="lg" leftSection={<LogOut size={16} />} style={{ flex: 1 }} onClick={handleLogout}>
                        Logout
                    </Button>
                    <Button variant="filled" color='red' radius="lg" leftSection={<Trash2 size={16} />} style={{ flex: 1 }} onClick={handleDeleteAccount}>
                        Delete Account
                    </Button>
                </Flex>
            </div>
        </Stack>
    );
}

function AcademicTab({ form }: TabProps) {
    return (
        <Stack gap='lg'>
            <div>
                <SectionTitle icon={GraduationCap}>Academic Profile</SectionTitle>
                <Flex gap='md' direction={{ base: 'column', md: 'row' }} mb='sm'>
                    <TextInput label='Level of education' radius='lg' {...form.getInputProps('level')} style={{ flex: 1 }} />
                    <TextInput label='School or institution' radius='lg' {...form.getInputProps('school')} style={{ flex: 1 }} />
                    <TextInput label='Program / track / strand' radius='lg' {...form.getInputProps('program')} style={{ flex: 1 }} />
                </Flex>
                <Text fz='sm' fw={600} mb={6}>
                    Enrollment status
                </Text>
                <Group gap={8}>
                    {ENROLLMENT_OPTIONS.map((status) => {
                        const active = form.values.enrollment_status === status;
                        return (
                            <Badge
                                key={status}
                                size='lg'
                                radius='xl'
                                px={18}
                                py={10}
                                variant={active ? 'filled' : 'outline'}
                                color={active ? 'green' : 'gray'}
                                style={{ cursor: 'pointer' }}
                                onClick={() => form.setFieldValue('enrollment_status', active ? '' : status)}
                            >
                                {status}
                            </Badge>
                        );
                    })}
                </Group>
            </div>

            <Divider />

            <div>
                <SectionTitle icon={BookOpen}>Subjects & coursework</SectionTitle>
                <TagsInput
                    label="Academic Subjects"
                    description="Type a subject and press Enter to add it."
                    placeholder="e.g. Math, English…"
                    radius="lg"
                    mb="md"
                    w="100%"
                    {...form.getInputProps('subjects')}
                />

                <Text fz="sm" fw={600} mb={6} mt="lg">
                    Coursework types & priorities
                </Text>
                {Object.keys(form.values.coursework_priorities).length === 0 ? (
                    <Text c="dimmed" fz="sm">
                        No coursework types added yet. Use the input below to add some.
                    </Text>
                ) : (
                    <Stack gap={8}>
                        {Object.entries(form.values.coursework_priorities).map(([type, priority]) => (
                            <Group key={type} gap="sm" wrap="nowrap" p="xs" style={{ borderRadius: 10, backgroundColor: '#F8F9FA', border: '1px solid #E9ECEF' }}>
                                <Text fz="sm" fw={600} style={{ flex: 1 }}>
                                    {type}
                                </Text>
                                <Select
                                    data={PRIORITY_OPTIONS}
                                    value={priority}
                                    onChange={(v) =>
                                        form.setFieldValue('coursework_priorities', {
                                            ...form.values.coursework_priorities,
                                            [type]: v ?? 'Medium',
                                        })
                                    }
                                    radius="lg"
                                    size="xs"
                                    w={110}
                                />
                                <Button
                                    variant="subtle"
                                    color="red"
                                    size="xs"
                                    px={6}
                                    onClick={() => {
                                        const next = { ...form.values.coursework_priorities };
                                        delete next[type];
                                        form.setFieldValue('coursework_priorities', next);
                                    }}
                                >
                                    <X size={14} />
                                </Button>
                            </Group>
                        ))}
                    </Stack>
                )}
                <AddCoursework form={form} />
            </div>
        </Stack>
    );
}

function AddCoursework({ form }: { form: UseFormReturnType<FormValues> }) {
    const [newType, setNewType] = useState('');

    const add = () => {
        const trimmed = newType.trim();
        if (!trimmed || form.values.coursework_priorities[trimmed]) return;
        form.setFieldValue('coursework_priorities', {
            ...form.values.coursework_priorities,
            [trimmed]: 'Medium',
        });
        setNewType('');
    };

    return (
        <Box mt="sm">
            <Text fz="sm" fw={600} mb={6}>
                Add coursework type
            </Text>
            <Group gap={8} mb={8}>
                {COURSEWORK_SUGGESTIONS.filter((s) => !form.values.coursework_priorities[s]).map((s) => (
                    <Badge
                        key={s}
                        variant="light"
                        color="blue"
                        size="md"
                        radius="xl"
                        style={{ cursor: 'pointer' }}
                        onClick={() =>
                            form.setFieldValue('coursework_priorities', {
                                ...form.values.coursework_priorities,
                                [s]: 'Medium',
                            })
                        }
                    >
                        + {s}
                    </Badge>
                ))}
            </Group>
            <Flex gap="sm" align="flex-end" direction={{ base: 'column', sm: 'row' }}>
                <TextInput
                    placeholder="e.g. Essay, Lab report…"
                    value={newType}
                    onChange={(e) => setNewType(e.currentTarget.value)}
                    onKeyDown={(e) => e.key === 'Enter' && add()}
                    radius="lg"
                    style={{ flex: 1, width: '100%' }}
                />
                <Button variant="light" color="blue" radius="lg" leftSection={<Plus size={16} />} onClick={add} disabled={!newType.trim()}>
                    Add
                </Button>
            </Flex>
        </Box>
    );
}

function ScheduleTab({ form }: TabProps) {
    const toggleDay = (day: string) => {
        const current = form.values.weekly_availability;
        const exists = current.some((slot) => slot.day === day);
        form.setFieldValue(
            'weekly_availability',
            exists ? current.filter((slot) => slot.day !== day) : [...current, { day, start: DEFAULT_START, end: DEFAULT_END }]
        );
    };

    const updateSlot = (day: string, field: 'start' | 'end', value: string) => {
        form.setFieldValue(
            'weekly_availability',
            form.values.weekly_availability.map((slot) => (slot.day === day ? { ...slot, [field]: value } : slot))
        );
    };

    return (
        <Stack gap='lg'>
            <div>
                <SectionTitle icon={CalendarClock}>Weekly availability</SectionTitle>
                <Text fz="sm" fw={600} mb={6}>
                    Which days can you study?
                </Text>
                <Group gap={8}>
                    {DAYS.map((day) => {
                        const active = form.values.weekly_availability.some((slot) => slot.day === day);
                        return (
                            <Chip key={day} checked={active} onChange={() => toggleDay(day)} radius="xl" size="md" color="green">
                                {day}
                            </Chip>
                        );
                    })}
                </Group>

                {form.values.weekly_availability.length > 0 ? (
                    <Stack gap={8} mt="md">
                        {form.values.weekly_availability.map((slot) => (
                            <Group key={slot.day} gap="lg" wrap="nowrap" p="xs" style={{ borderRadius: 10, backgroundColor: '#F8F9FA', border: '1px solid #E9ECEF' }}>
                                <Text fz="sm" fw={700} w={56}>
                                    {slot.day}
                                </Text>
                                <Select
                                    label="Start"
                                    data={TIMES}
                                    value={slot.start}
                                    onChange={(v) => updateSlot(slot.day, 'start', v ?? DEFAULT_START)}
                                    radius="lg"
                                    size="xs"
                                    style={{ flex: 1 }}
                                    ml={10}
                                />
                                <Select
                                    label="End"
                                    data={TIMES}
                                    value={slot.end}
                                    onChange={(v) => updateSlot(slot.day, 'end', v ?? DEFAULT_END)}
                                    radius="lg"
                                    size="xs"
                                    style={{ flex: 1 }}
                                />
                            </Group>
                        ))}
                    </Stack>
                ) : (
                    <Text c="dimmed" fz="sm" mt="md">
                        No study days selected. Toggle the days above to build your schedule.
                    </Text>
                )}

                <Divider my='lg' />

                <div>
                    <SectionTitle icon={Moon}>Preferred study period</SectionTitle>
                    <Group gap={8}>
                        {STUDY_PERIODS.map((period) => {
                            const active = form.values.study_time === period;
                            return (
                                <Badge
                                    key={period}
                                    size='lg'
                                    radius='xl'
                                    px={18}
                                    py={10}
                                    variant={active ? 'filled' : 'outline'}
                                    color={active ? 'indigo' : 'gray'}
                                    style={{ cursor: 'pointer' }}
                                    onClick={() => form.setFieldValue('study_time', active ? '' : period)}
                                >
                                    {period}
                                </Badge>
                            );
                        })}
                    </Group>
                </div>

                <div>
                    <Text fz="sm" fw={600} mb={6} mt="lg">
                        Preferred focus session length
                    </Text>
                    <Select
                        data={FOCUS_LENGTHS}
                        value={form.values.focus_length}
                        onChange={(v) => form.setFieldValue('focus_length', v ?? '')}
                        radius="lg"
                        w={{ base: '100%', sm: 220 }}
                    />
                </div>
            </div>
        </Stack>
    );
}

function NotificationsTab({ form }: TabProps) {
    return (
        <Stack gap='lg'>
            <SectionTitle icon={Bell}>Notification settings</SectionTitle>
            {NOTIFICATION_GROUPS.map((group) => (
                <div key={group.title}>
                    <Text fz="xs" tt="uppercase" fw={700} c="dimmed" lts={1} mb={8}>
                        {group.title}
                    </Text>
                    <Paper radius="lg" withBorder p="xs">
                        <Stack gap={4}>
                            {group.items.map((item) => (
                                <Group
                                    key={item.key}
                                    justify="space-between"
                                    p="sm"
                                    style={{ borderRadius: 10 }}
                                    wrap="nowrap"
                                >
                                    <Text size="sm" fw={600}>
                                        {item.label}
                                    </Text>
                                    <Switch
                                        {...form.getInputProps(`notification_prefs.${item.key}`, { type: 'checkbox' })}
                                        size="md"
                                        color="green"
                                    />
                                </Group>
                            ))}
                        </Stack>
                    </Paper>
                </div>
            ))}
        </Stack>
    );
}

function PrivacyTab({ markUnsavedChanges }: TabProps) {
    return (
        <Stack gap='lg'>
            <div>
                <SectionTitle icon={ShieldCheck}>Privacy & Data</SectionTitle>
                <Paper radius='lg' p='xs' withBorder>
                    <Stack gap={4}>
                        <ToggleRow
                            label="Share study stats with friends"
                            description='Let friends see your streaks and focus time.'
                            checked={true}
                            onChange={() => { }}
                        />
                        <ToggleRow
                            label="Anonymous usage analytics"
                            description='Help us improve CommonGrounds with anonymized data.'
                            checked={false}
                            onChange={() => { }}
                        />
                    </Stack>
                </Paper>
            </div>

            <Divider />

            <div>
                <Text fw={700} mb='xs'>
                    Your data
                </Text>
                <Stack gap='sm'>
                    <ActionRow icon={FileUp} label='Uploaded learning materials' action='Manage files' onClick={markUnsavedChanges} />
                    <ActionRow icon={FileDown} label='Export account data' action='Export' onClick={markUnsavedChanges} />
                    <ActionRow icon={Trash2} label='Delete all data' action='Delete' danger onClick={markUnsavedChanges} />
                </Stack>
            </div>
        </Stack>
    );
}

function ToggleRow({
    label,
    description,
    checked,
    onChange,
}: {
    label: string;
    description: string;
    checked?: boolean;
    onChange: () => void;
}) {
    return (
        <Group justify="space-between" p='sm' style={{ borderRadius: 10 }} wrap='nowrap'>
            <Box>
                <Text size='sm' fw={600}>
                    {label}
                </Text>
                <Text c='dimmed' fz='xs' mt={1}>
                    {description}
                </Text>
            </Box>
            <Switch checked={checked} onChange={onChange} size='md' color='green' />
        </Group>
    );
}

function ActionRow({
    icon: Icon,
    label,
    action,
    danger,
    onClick,
}: {
    icon: typeof FileUp;
    label: string;
    action: string;
    danger?: boolean;
    onClick: () => void;
}) {
    return (
        <Group justify="space-between" p="sm" style={{ borderRadius: 10, backgroundColor: "#F8F9FA" }} wrap="nowrap">
            <Group gap={10} wrap="nowrap">
                <ThemeIcon radius="xl" size={32} variant="light" color={danger ? "red" : "blue"}>
                    <Icon size={16} />
                </ThemeIcon>
                <Text size="sm" fw={600}>
                    {label}
                </Text>
            </Group>
            <Button variant={danger ? "outline" : "light"} color={danger ? "red" : "blue"} size="xs" radius="lg" onClick={onClick}>
                {action}
            </Button>
        </Group>
    );
}