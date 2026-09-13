"use client";

import { createClient } from "@/lib/supabase/client";
import { Avatar, Button, Chip, Container, Flex, Group, List, Paper, Stepper, Switch, TagsInput, Text, TextInput } from "@mantine/core";
import { TimePicker } from "@mantine/dates";
import { useForm } from "@mantine/form";
import { useMediaQuery } from "@mantine/hooks";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

// user code generator, may change 
function generateUserCode() {
    return `U${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

const STORAGE_KEY = 'setupFormData';
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

type DaySlot = { day: string; enabled: boolean; start: string; end: string };

type SetupDraft = {
    level?: string;
    school?: string;
    program?: string;
    enrollmentStatus?: string;
    studyTime?: string;
    focusLength?: string;
    subjects?: string[];
    deadlineReminders?: boolean;
    focusReminders?: boolean;
    burnoutNudges?: boolean;
    rewardAlerts?: boolean;
    friendInvites?: boolean;
    slots?: DaySlot[];
    courseworkTypes?: string[];
    priorities?: Record<string, string>;
    active?: number;
};

function defaultSlots(): DaySlot[] {
    return DAYS.map((day) => ({ day, enabled: false, start: '09:00', end: '12:00' }));
}

function readDraft(): SetupDraft {
    if (typeof window === 'undefined') return {};
    try {
        const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
        if (!raw || typeof raw !== 'object') return {};
        return raw.form && typeof raw.form === 'object' ? { ...raw.form, ...raw } : raw;
    } catch {
        return {};
    }
}

export default function SetupPage() {
    const isMobile = useMediaQuery('(max-width: 768px)');
    const initialDraft = readDraft();
    const [active, setActive] = useState(initialDraft.active ?? 0);
    const router = useRouter();
    const prevStep = () => setActive((current) => (current > 0 ? current - 1 : current));
    const totalSteps = 5;
    const isLastStep = active === totalSteps - 1;
    const [courseworkTypes, setCourseworkTypes] = useState<string[]>(initialDraft.courseworkTypes ?? []);
    const [priorities, setPriorities] = useState<Record<string, string>>(initialDraft.priorities ?? {});
    const [courseworkInput, setCourseworkInput] = useState('');

    const [slots, setSlots] = useState<DaySlot[]>(
        initialDraft.slots && initialDraft.slots.length === DAYS.length ? initialDraft.slots : defaultSlots()
    );

    const updateSlot = (day: string, patch: Partial<DaySlot>) =>
        setSlots((prev) => prev.map((s) => (s.day === day ? { ...s, ...patch } : s)));

    const addCoursework = () => {
        const value = courseworkInput.trim();
        if (value && !courseworkTypes.includes(value)) {
            setCourseworkTypes((prev) => [...prev, value]);
            setCourseworkInput('');
        }
    };

    const enabledSlots = slots.filter(slot => slot.enabled === true);

    // for setup form
    const setUpForm = useForm({
        mode: 'uncontrolled',
        initialValues: {
            level: initialDraft.level ?? '',
            school: initialDraft.school ?? '',
            program: initialDraft.program ?? '',
            enrollmentStatus: initialDraft.enrollmentStatus ?? '',
            studyTime: initialDraft.studyTime ?? '',
            focusLength: initialDraft.focusLength ?? '',
            subjects: initialDraft.subjects ?? [],
            deadlineReminders: initialDraft.deadlineReminders ?? false,
            focusReminders: initialDraft.focusReminders ?? false,
            burnoutNudges: initialDraft.burnoutNudges ?? false,
            rewardAlerts: initialDraft.rewardAlerts ?? false,
            friendInvites: initialDraft.friendInvites ?? false,
        },

        validate: {
            level: (value) => (value.length > 0 ? null : 'Education level is required'),
            school: (value) => (value.length > 0 ? null : 'School is required'),
            program: (value) => (value.length > 0 ? null : 'Program/Track/Strand is required'),
            enrollmentStatus: (value) => (value.length > 0 ? null : 'Enrollment status is required'),
            studyTime: (value) => (value.length > 0 ? null : 'Preferred study time is required'),
            focusLength: (value) => (value.length > 0 ? null : 'Preferred focus session length is required'),
            subjects: (value) => (value.length > 0 ? null : 'Subjects are required'),
        }
    });

    const handleNextStep = async () => {
        const fieldsToValidate = stepFields[active] ?? [];
        const hasErrors = fieldsToValidate.some((field) => setUpForm.validateField(field).hasError);
        if (hasErrors) return;

        if (active === totalSteps - 1) {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: profile } = await supabase
                .from('profiles')
                .select('user_code')
                .eq('id', user.id)
                .single();

            const payload: Record<string, unknown> = {
                id: user.id,
                level: setUpForm.values.level,
                school: setUpForm.values.school,
                program: setUpForm.values.program,
                enrollment_status: setUpForm.values.enrollmentStatus,
                study_time: setUpForm.values.studyTime,
                focus_length: setUpForm.values.focusLength === 'Custom' ? 0 : parseInt(setUpForm.values.focusLength, 10), // revisit when a custom-minutes input is added
                subjects: setUpForm.values.subjects,
                weekly_availability: slots.filter((s) => s.enabled).map(({ day, start, end }) => ({ day, start, end })), // disabled days are not included
                coursework_priorities: priorities,
                // stored as one object for the five booleans
                notification_prefs: {
                    deadlineReminders: setUpForm.values.deadlineReminders,
                    focusReminders: setUpForm.values.focusReminders,
                    burnoutNudges: setUpForm.values.burnoutNudges,
                    rewardAlerts: setUpForm.values.rewardAlerts,
                    friendInvites: setUpForm.values.friendInvites,
                },
                setup_complete: true,
            };

            if (!profile) {
                payload.user_code = generateUserCode();
                payload.display_name = '';
            }

            const { error } = await supabase.from('profiles').upsert(payload);

            if (error) {
                notifications.show({ title: 'Error', message: 'Could not save your setup. Please try again.', color: 'red' });
                console.error('Error saving setup:', error);
                return;
            }

            notifications.show({ title: 'Success!', message: 'Setup complete.', color: 'green' });
            localStorage.removeItem(STORAGE_KEY);
            router.push('/dashboard');
            return;
        }

        setActive((prev) => prev + 1);
    };

    const openConfirmationModal = () => modals.openConfirmModal({
        title: 'Please Confirm your Setup',
        size: 'sm',
        centered: true,
        children: (
            <Text size="sm">
                Are you sure you want to submit your setup?
            </Text>
        ),
        labels: { confirm: 'Confirm', cancel: 'Cancel' },
        onConfirm: handleNextStep,
        onCancel: () =>
            notifications.show({
                title: 'Cancelled',
                message: 'Setup submission was cancelled.',
                color: 'red',
            }),
    })

    const notificationPref = [
        { label: 'Deadline Reminders', value: 'deadlineReminders' },
        { label: 'Focus Session Reminders', value: 'focusReminders' },
        { label: 'Burnout and Wellness Nudges', value: 'burnoutNudges' },
        { label: 'Reward Alerts', value: 'rewardAlerts' },
        { label: 'Friend Focus Room Invites', value: 'friendInvites' }
    ]

    // double check the fields that needs to be validated or required
    const stepFields: Record<number, (keyof typeof setUpForm.values)[]> = {
        0: ['level', 'school', 'program', 'enrollmentStatus'],
        1: ['studyTime', 'focusLength'],
        2: ['subjects'],
    };

    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({
                ...setUpForm.values,
                slots, courseworkTypes, priorities, active,
            }));
        } catch (error) {
            console.error('Failed to persist setup draft', error);
        }
    }, [setUpForm.values, slots, courseworkTypes, priorities, active]);

    return (
        <Container fluid mih='100vh' p={{ base: '20px', sm: '60px' }} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#F7F9FC' }}>
            <Paper w={{ base: '100%', md: '70%' }} radius='xl' p='xl' style={{ border: '2px solid #DDE5F0', boxShadow: '0px 4px 6px rgba(0, 0, 0, 0.1)' }}>
                <Group miw='100%' style={{ display: 'flex', flexDirection: 'column' }}>
                    <Group style={{ justifyContent: 'flex-start', alignItems: 'flex-start', width: '100%', gap: '10px' }}>
                        <Avatar variant='filled' color='#2F80ED' radius='md'>CG</Avatar>
                        <Text fw={700} size='xl'>CommonGrounds Setup</Text>
                    </Group>
                    <Stepper active={active} onStepClick={setActive} allowNextStepsSelect={false} size={isMobile ? 'xs' : 'md'}>
                        <Stepper.Step label='Step 1' description='Academic Profile'>
                            <Flex direction={{ base: 'column', md: 'row' }} gap='md' style={{ justifyContent: 'space-between', minWidth: '100%' }}>
                                <Flex direction='column' w={{ base: '100%', md: '40%' }} mih={{ base: 'auto', md: 577 }} style={{ padding: '20px', border: '1px solid #DDE5F0', borderRadius: '16px', backgroundColor: '#EAF3FF' }}>
                                    <Text fw={700} fz={{ base: 'md', md: 'lg' }}>Let’s personalize your learning companion.</Text>
                                    <Text fz={{ base: 'xs', md: 'sm' }} mb='md'>Your answers help CommonGrounds create realistic schedules, quests, reminders, and wellness nudges.</Text>
                                    <Text fw={700} fz={{ base: 'sm', md: 'md' }}>Why this matters:</Text>
                                    <List fz={{ base: 'sm', md: 'md' }}>
                                        <List.Item>Better adaptive study planning</List.Item>
                                        <List.Item>More accurate workload alerts</List.Item>
                                        <List.Item>Relevant task categories</List.Item>
                                        <List.Item>Notifications that fit your routine</List.Item>
                                    </List>
                                </Flex>
                                <Flex direction='column' w={{ base: '100%', md: '60%' }} mih={{ base: 'auto', md: 577 }} style={{ padding: '20px', border: '1px solid #DDE5F0', borderRadius: '16px' }}>
                                    <Text fw={700} fz={{ base: 'md', md: 'lg' }}>Tell us about your academic profile.</Text>
                                    <Text fz={{ base: 'xs', md: 'sm' }} mb='md'>This helps the app understand your learning environment and task expectations.</Text>
                                    <TextInput
                                        label="Level of Education"
                                        placeholder="Enter your level of education"
                                        radius="lg"
                                        mb="md"
                                        w='100%'
                                        key={setUpForm.key('level')}
                                        {...setUpForm.getInputProps('level')}
                                        size={isMobile ? 'xs' : 'md'}
                                    />
                                    <TextInput
                                        label="School or Institution"
                                        placeholder="Enter your school or institution"
                                        radius="lg"
                                        mb="md"
                                        w='100%'
                                        key={setUpForm.key('school')}
                                        {...setUpForm.getInputProps('school')}
                                        size={isMobile ? 'xs' : 'md'}
                                    />
                                    <TextInput
                                        label="Program / Track / Strand"
                                        placeholder="Enter your program, track, or strand"
                                        radius="lg"
                                        mb="md"
                                        w='100%'
                                        key={setUpForm.key('program')}
                                        {...setUpForm.getInputProps('program')}
                                        size={isMobile ? 'xs' : 'md'}
                                    />
                                    <Text size={isMobile ? 'xs' : 'md'} fw={500} mb='5px'>What is your enrollment status?</Text>
                                    <Flex direction='row' gap='md' wrap='wrap' mb='xs' style={{ alignItems: 'flex-start', justifyContent: 'flex-start' }}>
                                        <Chip.Group value={setUpForm.values.enrollmentStatus} onChange={(value) => setUpForm.setFieldValue('enrollmentStatus', value)}>
                                            <Chip radius="lg" variant='light' value='Working Student' size={isMobile ? 'xs' : 'md'}>Working Student</Chip>
                                            <Chip radius="lg" variant='light' value='Full time Student' size={isMobile ? 'xs' : 'md'}>Full time Student</Chip>
                                            <Chip radius="lg" variant='light' value='Part time Student' size={isMobile ? 'xs' : 'md'}>Part time Student</Chip>
                                        </Chip.Group>
                                    </Flex>
                                </Flex>
                            </Flex>
                        </Stepper.Step>
                        <Stepper.Step label='Step 2' description='Study Time'>
                            <Flex direction={{ base: 'column', md: 'row' }} gap='md' style={{ justifyContent: 'space-between', minWidth: '100%' }}>
                                <Flex direction='column' w={{ base: '100%', md: '40%' }} mih={{ base: 'auto', md: 577 }} style={{ padding: '20px', border: '1px solid #DDE5F0', borderRadius: '16px', backgroundColor: '#EAF3FF' }}>
                                    <Text fw={700} fz={{ base: 'md', md: 'lg' }}>Let’s personalize your learning companion.</Text>
                                    <Text fz={{ base: 'xs', md: 'sm' }} mb='md'>Your answers help CommonGrounds create realistic schedules, quests, reminders, and wellness nudges.</Text>
                                    <Text fw={700} fz={{ base: 'sm', md: 'md' }}>Why this matters:</Text>
                                    <List fz={{ base: 'sm', md: 'md' }}>
                                        <List.Item>Better adaptive study planning</List.Item>
                                        <List.Item>More accurate workload alerts</List.Item>
                                        <List.Item>Relevant task categories</List.Item>
                                        <List.Item>Notifications that fit your routine</List.Item>
                                    </List>
                                </Flex>
                                <Flex direction='column' w={{ base: '100%', md: '60%' }} mih={{ base: 'auto', md: 577 }} style={{ padding: '20px', border: '1px solid #DDE5F0', borderRadius: '16px' }}>
                                    <Text fw={700} fz={{ base: 'md', md: 'lg' }}>When are you usually available to study?</Text>
                                    <Text fz={{ base: 'xs', md: 'sm' }} mb='md'>CommonGrounds uses this to generate realistic focus blocks and prevent overloaded schedules.</Text>
                                    <Text fz={{ base: 'xs', md: 'sm' }} fw={500} mb='5px'>Preferred Study Time</Text>
                                    <Flex direction='row' gap='md' wrap='wrap' mb='xs' style={{ alignItems: 'flex-start', justifyContent: 'flex-start' }}>
                                        <Chip.Group value={setUpForm.values.studyTime} onChange={(value) => setUpForm.setFieldValue('studyTime', value)}>
                                            <Chip radius="lg" variant='light' value='Morning' size={isMobile ? 'xs' : 'md'}>Morning</Chip>
                                            <Chip radius="lg" variant='light' value='Afternoon' size={isMobile ? 'xs' : 'md'}>Afternoon</Chip>
                                            <Chip radius="lg" variant='light' value='Evening' size={isMobile ? 'xs' : 'md'}>Evening</Chip>
                                            <Chip radius="lg" variant='light' value='Late Night' size={isMobile ? 'xs' : 'md'}>Late Night</Chip>
                                        </Chip.Group>
                                    </Flex>
                                    <Text fz={{ base: 'xs', md: 'sm' }} fw={500} mb='5px'>Availability to Study</Text>
                                    {slots.map((slot) => (
                                        <Flex key={slot.day} direction={{ base: 'column', sm: 'row' }} align='center' gap='md' mb='xs' w='100%'>
                                            <Chip checked={slot.enabled} onChange={() => updateSlot(slot.day, { enabled: !slot.enabled })} variant='light' size={isMobile ? 'xs' : 'md'}>
                                                {slot.day}
                                            </Chip>
                                            <Flex direction='row' gap='xs' wrap='wrap' style={{ alignItems: 'center', justifyContent: 'center' }}>
                                                <TimePicker
                                                    format="12h"
                                                    withDropdown
                                                    value={slot.start}
                                                    onChange={(v) => updateSlot(slot.day, { start: v })}
                                                    disabled={!slot.enabled}
                                                    radius='lg'
                                                    size={isMobile ? 'xs' : 'md'}
                                                />
                                                <Text fz={{ base: 'xs', md: 'sm' }}>to</Text>
                                                <TimePicker
                                                    format="12h"
                                                    withDropdown
                                                    value={slot.end}
                                                    onChange={(v) => updateSlot(slot.day, { end: v })}
                                                    disabled={!slot.enabled}
                                                    radius='lg'
                                                    size={isMobile ? 'xs' : 'md'}
                                                />
                                            </Flex>
                                        </Flex>
                                    ))}
                                    <Text fz={{ base: 'xs', md: 'sm' }} fw={500} mb='5px'>Preferred Focus Session Length</Text>
                                    <Flex direction='row' gap='md' wrap='wrap' style={{ alignItems: 'flex-start', justifyContent: 'flex-start' }}>
                                        <Chip.Group value={setUpForm.values.focusLength} onChange={(value) => setUpForm.setFieldValue('focusLength', value)}>
                                            <Chip radius="lg" variant='light' value='30 mins' size={isMobile ? 'xs' : 'md'}>30 mins</Chip>
                                            <Chip radius="lg" variant='light' value='45 mins' size={isMobile ? 'xs' : 'md'}>45 mins</Chip>
                                            <Chip radius="lg" variant='light' value='60 mins' size={isMobile ? 'xs' : 'md'}>60 mins</Chip>
                                            <Chip radius="lg" variant='light' value='Custom' size={isMobile ? 'xs' : 'md'}>Custom</Chip>
                                        </Chip.Group>
                                    </Flex>
                                </Flex>
                            </Flex>
                        </Stepper.Step>
                        <Stepper.Step label='Step 3' description='Subjects'>
                            <Flex direction={{ base: 'column', md: 'row' }} w={{ base: '100%', md: '40%' }} gap='md' style={{ justifyContent: 'space-between', minWidth: '100%' }}>
                                <Flex direction='column' w={{ base: '100%', md: '40%' }} mih={{ base: 'auto', md: 577 }} style={{ padding: '20px', border: '1px solid #DDE5F0', borderRadius: '16px', backgroundColor: '#EAF3FF' }}>
                                    <Text fw={700} fz={{ base: 'md', md: 'lg' }}>Let’s personalize your learning companion.</Text>
                                    <Text fz={{ base: 'xs', md: 'sm' }} mb='md'>Your answers help CommonGrounds create realistic schedules, quests, reminders, and wellness nudges.</Text>
                                    <Text fw={700} fz={{ base: 'sm', md: 'md' }}>Why this matters:</Text>
                                    <List fz={{ base: 'sm', md: 'md' }}>
                                        <List.Item>Better adaptive study planning</List.Item>
                                        <List.Item>More accurate workload alerts</List.Item>
                                        <List.Item>Relevant task categories</List.Item>
                                        <List.Item>Notifications that fit your routine</List.Item>
                                    </List>
                                </Flex>
                                <Flex direction='column' w={{ base: '100%', md: '60%' }} mih={{ base: 'auto', md: 577 }} style={{ padding: '20px', border: '1px solid #DDE5F0', borderRadius: '16px' }}>
                                    <Text fw={700} fz={{ base: 'md', md: 'lg' }}>What subjects and coursework do you track?</Text>
                                    <Text fz={{ base: 'xs', md: 'sm' }} mb='md'>These become categories for tasks, quests, deadlines, rewards, and analytics.</Text>
                                    <TagsInput
                                        label="Academic Subjects"
                                        placeholder="Enter a subject and press Enter"
                                        radius="lg"
                                        mb="md"
                                        w='100%'
                                        size={isMobile ? 'xs' : 'md'}
                                        key={setUpForm.key('subjects')}
                                        {...setUpForm.getInputProps('subjects')}
                                    />
                                    <Flex direction='row' align='flex-end' gap='sm' mb='md' w='100%'>
                                        <TextInput
                                            label="Coursework Types"
                                            placeholder="Enter your coursework types"
                                            radius="lg"
                                            style={{ flex: 1 }}
                                            value={courseworkInput}
                                            onChange={(e) => setCourseworkInput(e.currentTarget.value)}
                                            size={isMobile ? 'xs' : 'md'}
                                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCoursework(); } }}
                                        />
                                        <Button size={isMobile ? 'xs' : 'md'} radius="lg" onClick={addCoursework} leftSection={<Plus size={16} />} style={{ flexShrink: 0 }}>Add</Button>
                                    </Flex>
                                    <Text fw={500} fz={{ base: 'xs', md: 'sm' }}>Priority Rules:</Text>
                                    <Flex direction='column' w='100%' gap='md'>
                                        {courseworkTypes.length === 0 ? (
                                            <Text fz={{ base: 'sm', md: 'md' }} c='dimmed'>Add coursework types above to set their priority.</Text>
                                        ) : (
                                            courseworkTypes.map((type) => (
                                                <Flex key={type} direction={{ base: 'column', sm: 'row' }} w={{ base: '100%', md: '60%' }} gap={{ base: '0', sm: 'md' }} style={{ alignItems: 'center', justifyContent: 'flex-start' }}>
                                                    <Text fz={{ base: 'xs', md: 'sm' }} fw={500} mb='5px'>{type}</Text>
                                                    <Flex direction='row' gap='md' w={{ base: '100%', md: '60%' }} style={{ justifyContent: 'space-between' }}>
                                                        <Chip.Group
                                                            value={priorities[type]}
                                                            onChange={(v) => setPriorities((prev) => ({ ...prev, [type]: v }))}
                                                        >
                                                            <Chip radius='lg' variant='light' value='High' size={isMobile ? 'xs' : 'md'}>High</Chip>
                                                            <Chip radius='lg' variant='light' value='Medium' size={isMobile ? 'xs' : 'md'}>Medium</Chip>
                                                            <Chip radius='lg' variant='light' value='Low' size={isMobile ? 'xs' : 'md'}>Low</Chip>
                                                        </Chip.Group>
                                                    </Flex>
                                                </Flex>
                                            ))
                                        )}
                                    </Flex>
                                </Flex>
                            </Flex>
                        </Stepper.Step>
                        <Stepper.Step label='Step 4' description='Notifications'>
                            <Flex direction={{ base: 'column', md: 'row' }} gap='md' style={{ justifyContent: 'space-between', minWidth: '100%' }}>
                                <Flex direction='column' w={{ base: '100%', md: '40%' }} mih={{ base: 'auto', md: 577 }} style={{ padding: '20px', border: '1px solid #DDE5F0', borderRadius: '16px', backgroundColor: '#EAF3FF' }}>
                                    <Text fw={700} fz={{ base: 'md', md: 'lg' }}>Let’s personalize your learning companion.</Text>
                                    <Text fz={{ base: 'xs', md: 'sm' }} mb='md'>Your answers help CommonGrounds create realistic schedules, quests, reminders, and wellness nudges.</Text>
                                    <Text fw={700} fz={{ base: 'sm', md: 'md' }}>Why this matters:</Text>
                                    <List fz={{ base: 'sm', md: 'md' }}>
                                        <List.Item>Better adaptive study planning</List.Item>
                                        <List.Item>More accurate workload alerts</List.Item>
                                        <List.Item>Relevant task categories</List.Item>
                                        <List.Item>Notifications that fit your routine</List.Item>
                                    </List>
                                </Flex>
                                <Flex direction='column' w={{ base: '100%', md: '60%' }} mih={{ base: 'auto', md: 577 }} style={{ padding: '20px', border: '1px solid #DDE5F0', borderRadius: '16px' }}>
                                    <Text fw={700} fz={{ base: 'md', md: 'lg' }}>How should we remind you?</Text>
                                    <Text fz={{ base: 'xs', md: 'sm' }} mb='md'>Choose notification settings that support consistency without becoming stressful.</Text>
                                    <Flex w='100%' direction='column' gap='md'>
                                        <Group w='100%' align='center' justify='space-between'>
                                            <Text fz={{ base: 'sm', md: 'md' }}>Deadline Reminders</Text>
                                            <Switch size={isMobile ? 'xs' : 'md'} checked={setUpForm.values.deadlineReminders} onChange={(e) => setUpForm.setFieldValue('deadlineReminders', e.currentTarget.checked)} />
                                        </Group>
                                        <Group w='100%' align='center' justify='space-between'>
                                            <Text fz={{ base: 'sm', md: 'md' }}>Focus Session Reminders</Text>
                                            <Switch size={isMobile ? 'xs' : 'md'} checked={setUpForm.values.focusReminders} onChange={(e) => setUpForm.setFieldValue('focusReminders', e.currentTarget.checked)} />
                                        </Group>
                                        <Group w='100%' align='center' justify='space-between'>
                                            <Text fz={{ base: 'sm', md: 'md' }}>Burnout and Wellness Nudges</Text>
                                            <Switch size={isMobile ? 'xs' : 'md'} checked={setUpForm.values.burnoutNudges} onChange={(e) => setUpForm.setFieldValue('burnoutNudges', e.currentTarget.checked)} />
                                        </Group>
                                        <Group w='100%' align='center' justify='space-between'>
                                            <Text fz={{ base: 'sm', md: 'md' }}>Reward Alerts</Text>
                                            <Switch size={isMobile ? 'xs' : 'md'} checked={setUpForm.values.rewardAlerts} onChange={(e) => setUpForm.setFieldValue('rewardAlerts', e.currentTarget.checked)} />
                                        </Group>
                                        <Group w='100%' align='center' justify='space-between'>
                                            <Text fz={{ base: 'sm', md: 'md' }}>Friend Focus Room Invites</Text>
                                            <Switch size={isMobile ? 'xs' : 'md'} checked={setUpForm.values.friendInvites} onChange={(e) => setUpForm.setFieldValue('friendInvites', e.currentTarget.checked)} />
                                        </Group>
                                    </Flex>
                                </Flex>
                            </Flex>
                        </Stepper.Step>
                        <Stepper.Step label='Step 5' description='Review Setup'>
                            <Flex direction={{ base: 'column', md: 'row' }} gap='md' style={{ justifyContent: 'space-between', minWidth: '100%' }}>
                                <Flex direction='column' w={{ base: '100%', md: '40%' }} mih={{ base: 'auto', md: 577 }} style={{ padding: '20px', border: '1px solid #DDE5F0', borderRadius: '16px', backgroundColor: '#EAF3FF' }}>
                                    <Text fw={700} fz={{ base: 'md', md: 'lg' }}>Let’s personalize your learning companion.</Text>
                                    <Text fz={{ base: 'xs', md: 'sm' }} mb='md'>Your answers help CommonGrounds create realistic schedules, quests, reminders, and wellness nudges.</Text>
                                    <Text fw={700} fz={{ base: 'sm', md: 'md' }}>Why this matters:</Text>
                                    <List fz={{ base: 'sm', md: 'md' }}>
                                        <List.Item>Better adaptive study planning</List.Item>
                                        <List.Item>More accurate workload alerts</List.Item>
                                        <List.Item>Relevant task categories</List.Item>
                                        <List.Item>Notifications that fit your routine</List.Item>
                                    </List>
                                </Flex>
                                <Flex direction='column' w={{ base: '100%', md: '60%' }} mih={{ base: 'auto', md: 577 }} style={{ padding: '20px', border: '1px solid #DDE5F0', borderRadius: '16px' }}>
                                    <Text fw={700} fz={{ base: 'md', md: 'lg' }}>Your learning companion is ready.</Text>
                                    <Text fz={{ base: 'xs', md: 'sm' }} mb='md'>CommonGrounds can now create a starter schedule, task categories, reminders, quests, and pet rewards.</Text>
                                    <Flex w='100%' direction='column'>
                                        <Text fw={700} fz={{ base: 'sm', md: 'md' }}>Summary of Your Setup:</Text>
                                        <Text fz={{ base: 'sm', md: 'md' }}>Level of Education: {setUpForm.values.level}</Text>
                                        <Text fz={{ base: 'sm', md: 'md' }}>School or Institution: {setUpForm.values.school}</Text>
                                        <Text fz={{ base: 'sm', md: 'md' }}>Program / Track / Strand: {setUpForm.values.program}</Text>
                                        <Text fz={{ base: 'sm', md: 'md' }}>Enrollment Status: {setUpForm.values.enrollmentStatus}</Text>
                                        <Text fz={{ base: 'sm', md: 'md' }}>Preferred Study Time: {setUpForm.values.studyTime}</Text>
                                        <Text fz={{ base: 'sm', md: 'md' }}>Availability to Study: {enabledSlots.map(slot => `${slot.day} (${slot.start} - ${slot.end})`).join(', ') || 'No days selected'}</Text>
                                        <Text fz={{ base: 'sm', md: 'md' }}>Preferred Focus Session Length: {setUpForm.values.focusLength}</Text>
                                        <Text fz={{ base: 'sm', md: 'md' }}>Academic Subjects: {setUpForm.values.subjects.join(', ')}</Text>
                                        <Text fz={{ base: 'sm', md: 'md' }}>Coursework Types and Priorities: {courseworkTypes.map(type => `${type} (${priorities[type] || 'No priority set'})`).join(', ') || 'No coursework types added'}</Text>
                                        <Text fz={{ base: 'sm', md: 'md' }}>Notification Preferences: {notificationPref.filter((p) => setUpForm.values[p.value as keyof typeof setUpForm.values]).map((p) => p.label).join(', ') || 'All off'}</Text>
                                    </Flex>
                                </Flex>
                            </Flex>
                        </Stepper.Step>
                    </Stepper>

                    <Flex direction={{ base: 'column', sm: 'row' }} gap='md' style={{ alignItems: 'flex-end', justifyContent: 'flex-end', width: '100%' }}>
                        <Flex direction={{ base: 'column', sm: 'row' }} style={{ width: '100%', alignItems: 'flex-start', justifyContent: 'flex-start', gap: '16px' }}>
                            <Button fullWidth radius="lg" variant="outline" onClick={prevStep}>Back</Button>
                            <Button fullWidth radius="lg" onClick={isLastStep ? openConfirmationModal : handleNextStep}>
                                {isLastStep ? 'Confirm and Submit' : 'Next Step'}
                            </Button>
                        </Flex>
                    </Flex>
                </Group>
            </Paper>
        </Container >
    );
}