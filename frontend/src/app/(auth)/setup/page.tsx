"use client";

import { Avatar, Button, Chip, Container, Flex, Group, List, MaskInput, Paper, Stepper, Switch, Text, TextInput } from "@mantine/core";
import { useForm } from "@mantine/form";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function SetupPage() {
    const [active, setActive] = useState(0);
    const router = useRouter();
    const prevStep = () => setActive((current) => (current > 0 ? current - 1 : current));
    const totalSteps = 5;
    const isLastStep = active === totalSteps - 1;
    const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const [courseworkTypes, setCourseworkTypes] = useState<string[]>([]);
    const [priorities, setPriorities] = useState<Record<string, string>>({});
    const [courseworkInput, setCourseworkInput] = useState('');

    type DaySlot = { day: string; enabled: boolean; start: string; end: string };

    const [slots, setSlots] = useState<DaySlot[]>(
        DAYS.map((day) => ({ day, enabled: false, start: '09:00', end: '12:00' }))
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

    const handleNextStep = () => {
        const fieldsToValidate = stepFields[active] ?? [];
        const hasErrors = fieldsToValidate.some((field) => setUpForm.validateField(field).hasError);
        if (hasErrors) return;
        setActive((prev) => {
            const next = prev + 1;
            if (next === totalSteps) {
                notifications.show({
                    title: 'Success!',
                    message: 'Setup complete.',
                    color: 'green',
                });
                router.push('/dashboard');
                return prev;
            }
            return next;
        });
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

    // for setup form
    const setUpForm = useForm({
        mode: 'uncontrolled',
        initialValues: {
            level: '',
            school: '',
            program: '',
            enrollmentStatus: '',
            studyTime: '',
            focusLength: '',
            subjects: '',
            deadlineReminders: false,
            focusReminders: false,
            burnoutNudges: false,
            rewardAlerts: false,
            friendInvites: false,
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

    const notificationPref = [
        { label: 'Deadline Reminders', value: 'deadlineReminders' },
        { label: 'Focus Session Reminders', value: 'focusReminders' },
        { label: 'Burnout and Wellness Nudges', value: 'burnoutNudges' },
        { label: 'Reward Alerts', value: 'rewardAlerts' },
        { label: 'Friend Focus Room Invites', value: 'friendInvites' }
    ]

    const stepFields: Record<number, (keyof typeof setUpForm.values)[]> = {
        0: ['level', 'school', 'program', 'enrollmentStatus'],
        1: ['studyTime', 'focusLength'],
        2: ['subjects'],
    };

    return (
        <Container fluid mih='100vh' p='60px' style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#F7F9FC' }}>
            <Paper miw='100%' radius='xl' p='xl' style={{ border: '2px solid #DDE5F0', boxShadow: '0px 4px 6px rgba(0, 0, 0, 0.1)' }}>
                <Group miw='100%' style={{ display: 'flex', flexDirection: 'column' }}>
                    <Group style={{ justifyContent: 'flex-start', alignItems: 'flex-start', width: '100%', gap: '10px' }}>
                        <Avatar variant='filled' color='#2F80ED' radius='md'>CG</Avatar>
                        <Text fw={700} size='xl'>CommonGrounds Setup</Text>
                    </Group>
                    <Stepper active={active} onStepClick={setActive} allowNextStepsSelect={false} style={{ width: '100%', alignItems: 'flex-start' }}>
                        <Stepper.Step label='Step 1' description='Academic Profile'>
                            <Flex direction='row' gap='md' style={{ justifyContent: 'space-between', minWidth: '100%' }}>
                                <Flex direction='column' w='40%' mih={577} style={{ padding: '20px', border: '1px solid #DDE5F0', borderRadius: '16px', backgroundColor: '#EAF3FF' }}>
                                    <Text fw={700} size='lg'>Let’s personalize your learning companion.</Text>
                                    <Text size='sm' mb='md'>Your answers help CommonGrounds create realistic schedules, quests, reminders, and wellness nudges.</Text>
                                    <Text fw={700} size='md'>Why this matters:</Text>
                                    <List>
                                        <List.Item>Better adaptive study planning</List.Item>
                                        <List.Item>More accurate workload alerts</List.Item>
                                        <List.Item>Relevant task categories</List.Item>
                                        <List.Item>Notifications that fit your routine</List.Item>
                                    </List>
                                </Flex>
                                <Flex direction='column' w='60%' mih={577} style={{ padding: '20px', border: '1px solid #DDE5F0', borderRadius: '16px' }}>
                                    <Text fw={700} size='lg'>Tell us about your academic profile.</Text>
                                    <Text size='sm' mb='md'>This helps the app understand your learning environment and task expectations.</Text>
                                    <TextInput
                                        label="Level of Education"
                                        placeholder="Enter your level of education"
                                        radius="lg"
                                        mb="md"
                                        w='100%'
                                        key={setUpForm.key('level')}
                                        {...setUpForm.getInputProps('level')}
                                    />
                                    <TextInput
                                        label="School or Institution"
                                        placeholder="Enter your school or institution"
                                        radius="lg"
                                        mb="md"
                                        w='100%'
                                        key={setUpForm.key('school')}
                                        {...setUpForm.getInputProps('school')}
                                    />
                                    <TextInput
                                        label="Program / Track / Strand"
                                        placeholder="Enter your program, track, or strand"
                                        radius="lg"
                                        mb="md"
                                        w='100%'
                                        key={setUpForm.key('program')}
                                        {...setUpForm.getInputProps('program')}
                                    />
                                    <Text size='sm' fw={500} mb='5px'>What is your enrollment status?</Text>
                                    <Flex direction='row' gap='md' wrap='wrap' mb='xs' style={{ alignItems: 'flex-start', justifyContent: 'flex-start' }}>
                                        <Chip.Group value={setUpForm.values.enrollmentStatus} onChange={(value) => setUpForm.setFieldValue('enrollmentStatus', value)}>
                                            <Chip radius="lg" variant='light' value='Working Student'>Working Student</Chip>
                                            <Chip radius="lg" variant='light' value='Full time Student'>Full time Student</Chip>
                                            <Chip radius="lg" variant='light' value='Part time Student'>Part time Student</Chip>
                                        </Chip.Group>
                                    </Flex>
                                </Flex>
                            </Flex>
                        </Stepper.Step>
                        <Stepper.Step label='Step 2' description='Study Time'>
                            <Flex direction='row' gap='md' style={{ justifyContent: 'space-between', minWidth: '100%' }}>
                                <Flex direction='column' w='40%' mih={577} style={{ padding: '20px', border: '1px solid #DDE5F0', borderRadius: '16px', backgroundColor: '#EAF3FF' }}>
                                    <Text fw={700} size='lg'>Let’s personalize your learning companion.</Text>
                                    <Text size='sm' mb='md'>Your answers help CommonGrounds create realistic schedules, quests, reminders, and wellness nudges.</Text>
                                    <Text fw={700} size='md'>Why this matters:</Text>
                                    <List>
                                        <List.Item>Better adaptive study planning</List.Item>
                                        <List.Item>More accurate workload alerts</List.Item>
                                        <List.Item>Relevant task categories</List.Item>
                                        <List.Item>Notifications that fit your routine</List.Item>
                                    </List>
                                </Flex>
                                <Flex direction='column' w='60%' mih={577} style={{ padding: '20px', border: '1px solid #DDE5F0', borderRadius: '16px' }}>
                                    <Text fw={700} size='lg'>When are you usually available to study?</Text>
                                    <Text size='sm' mb='md'>CommonGrounds uses this to generate realistic focus blocks and prevent overloaded schedules.</Text>
                                    <Text size='sm' fw={500} mb='5px'>Preferred Study Time</Text>
                                    <Flex direction='row' gap='md' wrap='wrap' mb='md' style={{ alignItems: 'flex-start', justifyContent: 'flex-start' }}>
                                        <Chip.Group value={setUpForm.values.studyTime} onChange={(value) => setUpForm.setFieldValue('studyTime', value)}>
                                            <Chip radius="lg" variant='light' value='Morning'>Morning</Chip>
                                            <Chip radius="lg" variant='light' value='Afternoon'>Afternoon</Chip>
                                            <Chip radius="lg" variant='light' value='Evening'>Evening</Chip>
                                            <Chip radius="lg" variant='light' value='Late Night'>Late Night</Chip>
                                        </Chip.Group>
                                    </Flex>
                                    <Text size='sm' fw={500} mb='5px'>Availability to Study</Text>
                                    {slots.map((slot) => (
                                        <Flex key={slot.day} direction='row' align='center' gap='md' mb='xs' w='100%'>
                                            <Chip checked={slot.enabled} onChange={() => updateSlot(slot.day, { enabled: !slot.enabled })} variant='light'>
                                                {slot.day}
                                            </Chip>
                                            <MaskInput
                                                mask='99:99'
                                                placeholder='09:00'
                                                value={slot.start}
                                                onChangeRaw={(raw, masked) => updateSlot(slot.day, { start: masked })}
                                                disabled={!slot.enabled}
                                                radius='lg'
                                                w='100%'
                                            />
                                            <Text size='sm'>to</Text>
                                            <MaskInput
                                                mask='99:99'
                                                placeholder='12:00'
                                                value={slot.end}
                                                onChangeRaw={(raw, masked) => updateSlot(slot.day, { end: masked })}
                                                disabled={!slot.enabled}
                                                radius='lg'
                                                w='100%'
                                            />
                                        </Flex>
                                    ))}
                                    <Text size='sm' fw={500} mb='5px'>Preferred Focus Session Length</Text>
                                    <Flex direction='row' gap='md' wrap='wrap' style={{ alignItems: 'flex-start', justifyContent: 'flex-start' }}>
                                        <Chip.Group value={setUpForm.values.focusLength} onChange={(value) => setUpForm.setFieldValue('focusLength', value)}>
                                            <Chip radius="lg" variant='light' value='30 mins'>30 mins</Chip>
                                            <Chip radius="lg" variant='light' value='45 mins'>45 mins</Chip>
                                            <Chip radius="lg" variant='light' value='60 mins'>60 mins</Chip>
                                            <Chip radius="lg" variant='light' value='Custom'>Custom</Chip>
                                        </Chip.Group>
                                    </Flex>
                                </Flex>
                            </Flex>
                        </Stepper.Step>
                        <Stepper.Step label='Step 3' description='Subjects'>
                            <Flex direction='row' gap='md' style={{ justifyContent: 'space-between', minWidth: '100%' }}>
                                <Flex direction='column' w='40%' mih={577} style={{ padding: '20px', border: '1px solid #DDE5F0', borderRadius: '16px', backgroundColor: '#EAF3FF' }}>
                                    <Text fw={700} size='lg'>Let’s personalize your learning companion.</Text>
                                    <Text size='sm' mb='md'>Your answers help CommonGrounds create realistic schedules, quests, reminders, and wellness nudges.</Text>
                                    <Text fw={700} size='md'>Why this matters:</Text>
                                    <List>
                                        <List.Item>Better adaptive study planning</List.Item>
                                        <List.Item>More accurate workload alerts</List.Item>
                                        <List.Item>Relevant task categories</List.Item>
                                        <List.Item>Notifications that fit your routine</List.Item>
                                    </List>
                                </Flex>
                                <Flex direction='column' w='60%' mih={577} style={{ padding: '20px', border: '1px solid #DDE5F0', borderRadius: '16px' }}>
                                    <Text fw={700} size='lg'>What subjects and coursework do you track?</Text>
                                    <Text size='sm' mb='md'>These become categories for tasks, quests, deadlines, rewards, and analytics.</Text>
                                    <TextInput
                                        label="Academic Subjects"
                                        placeholder="Enter your academic subjects"
                                        radius="lg"
                                        mb="md"
                                        w='100%'
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
                                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCoursework(); } }}
                                        />
                                        <Button radius="lg" onClick={addCoursework} leftSection={<Plus size={16} />} style={{ flexShrink: 0 }}>Add</Button>
                                    </Flex>
                                    <Text size='sm' fw={500} mb='5px'>Priority Rules:</Text>
                                    {courseworkTypes.length === 0 ? (
                                        <Text size='sm' c='dimmed'>Add coursework types above to set their priority.</Text>
                                    ) : (
                                        courseworkTypes.map((type) => (
                                            <Flex key={type} direction='row' mb='sm' w='100%' gap='md' style={{ alignItems: 'center', justifyContent: 'flex-start' }}>
                                                <Text size='sm' fw={500}>{type}</Text>
                                                <Chip.Group
                                                    value={priorities[type]}
                                                    onChange={(v) => setPriorities((prev) => ({ ...prev, [type]: v }))}
                                                >
                                                    <Chip radius='lg' variant='light' value='High'>High</Chip>
                                                    <Chip radius='lg' variant='light' value='Medium'>Medium</Chip>
                                                    <Chip radius='lg' variant='light' value='Low'>Low</Chip>
                                                </Chip.Group>
                                            </Flex>
                                        ))
                                    )}
                                </Flex>
                            </Flex>
                        </Stepper.Step>
                        <Stepper.Step label='Step 4' description='Notifications'>
                            <Flex direction='row' gap='md' style={{ justifyContent: 'space-between', minWidth: '100%' }}>
                                <Flex direction='column' w='40%' mih={577} style={{ padding: '20px', border: '1px solid #DDE5F0', borderRadius: '16px', backgroundColor: '#EAF3FF' }}>
                                    <Text fw={700} size='lg'>Let’s personalize your learning companion.</Text>
                                    <Text size='sm' mb='md'>Your answers help CommonGrounds create realistic schedules, quests, reminders, and wellness nudges.</Text>
                                    <Text fw={700} size='md'>Why this matters:</Text>
                                    <List>
                                        <List.Item>Better adaptive study planning</List.Item>
                                        <List.Item>More accurate workload alerts</List.Item>
                                        <List.Item>Relevant task categories</List.Item>
                                        <List.Item>Notifications that fit your routine</List.Item>
                                    </List>
                                </Flex>
                                <Flex direction='column' w='60%' mih={577} style={{ padding: '20px', border: '1px solid #DDE5F0', borderRadius: '16px' }}>
                                    <Text fw={700} size='lg'>How should we remind you?</Text>
                                    <Text size='sm' mb='md'>Choose notification settings that support consistency without becoming stressful.</Text>
                                    <Flex w='100%' direction='column' gap='md'>
                                        <Group w='100%' align='center' justify='space-between'>
                                            <Text>Deadline Reminders</Text>
                                            <Switch checked={setUpForm.values.deadlineReminders} onChange={(e) => setUpForm.setFieldValue('deadlineReminders', e.currentTarget.checked)} />
                                        </Group>
                                        <Group w='100%' align='center' justify='space-between'>
                                            <Text>Focus Session Reminders</Text>
                                            <Switch checked={setUpForm.values.focusReminders} onChange={(e) => setUpForm.setFieldValue('focusReminders', e.currentTarget.checked)} />
                                        </Group>
                                        <Group w='100%' align='center' justify='space-between'>
                                            <Text>Burnout and Wellness Nudges</Text>
                                            <Switch checked={setUpForm.values.burnoutNudges} onChange={(e) => setUpForm.setFieldValue('burnoutNudges', e.currentTarget.checked)} />
                                        </Group>
                                        <Group w='100%' align='center' justify='space-between'>
                                            <Text>Reward Alerts</Text>
                                            <Switch checked={setUpForm.values.rewardAlerts} onChange={(e) => setUpForm.setFieldValue('rewardAlerts', e.currentTarget.checked)} />
                                        </Group>
                                        <Group w='100%' align='center' justify='space-between'>
                                            <Text>Friend Focus Room Invites</Text>
                                            <Switch checked={setUpForm.values.friendInvites} onChange={(e) => setUpForm.setFieldValue('friendInvites', e.currentTarget.checked)} />
                                        </Group>
                                    </Flex>
                                </Flex>
                            </Flex>
                        </Stepper.Step>
                        <Stepper.Step label='Step 5' description='Review Setup'>
                            <Flex direction='row' gap='md' style={{ justifyContent: 'space-between', minWidth: '100%' }}>
                                <Flex direction='column' w='40%' mih={577} style={{ padding: '20px', border: '1px solid #DDE5F0', borderRadius: '16px', backgroundColor: '#EAF3FF' }}>
                                    <Text fw={700} size='lg'>Let’s personalize your learning companion.</Text>
                                    <Text size='sm' mb='md'>Your answers help CommonGrounds create realistic schedules, quests, reminders, and wellness nudges.</Text>
                                    <Text fw={700} size='md'>Why this matters:</Text>
                                    <List>
                                        <List.Item>Better adaptive study planning</List.Item>
                                        <List.Item>More accurate workload alerts</List.Item>
                                        <List.Item>Relevant task categories</List.Item>
                                        <List.Item>Notifications that fit your routine</List.Item>
                                    </List>
                                </Flex>
                                <Flex direction='column' w='60%' mih={577} style={{ padding: '20px', border: '1px solid #DDE5F0', borderRadius: '16px' }}>
                                    <Text fw={700} size='lg'>Your learning companion is ready.</Text>
                                    <Text size='sm' mb='md'>CommonGrounds can now create a starter schedule, task categories, reminders, quests, and pet rewards.</Text>
                                    <Flex w='100%' direction='column'>
                                        <Text fw={700} size='md'>Summary of Your Setup:</Text>
                                        <Text size='sm'>Level of Education: {setUpForm.values.level}</Text>
                                        <Text size='sm'>School or Institution: {setUpForm.values.school}</Text>
                                        <Text size='sm'>Program / Track / Strand: {setUpForm.values.program}</Text>
                                        <Text size='sm'>Enrollment Status: {setUpForm.values.enrollmentStatus}</Text>
                                        <Text size='sm'>Preferred Study Time: {setUpForm.values.studyTime}</Text>
                                        <Text size='sm'>Availability to Study:
                                            {enabledSlots.map(slot => `${slot.day} (${slot.start} - ${slot.end})`).join(', ') || 'No days selected'}
                                        </Text>
                                        <Text size='sm'>Preferred Focus Session Length: {setUpForm.values.focusLength}</Text>
                                        <Text size='sm'>Academic Subjects: {setUpForm.values.subjects}</Text>
                                        <Text size='sm'>Coursework Types and Priorities:
                                            {courseworkTypes.map(type => `${type} (${priorities[type] || 'No priority set'})`).join(', ') || 'No coursework types added'}
                                        </Text>
                                        <Text size='sm'>Notification Preferences:
                                            {notificationPref.filter((p) => setUpForm.values[p.value as keyof typeof setUpForm.values]).map((p) => p.label).join(', ') || 'All off'}
                                        </Text>
                                    </Flex>
                                </Flex>
                            </Flex>
                        </Stepper.Step>
                    </Stepper>

                    <Flex direction='row' gap='md' style={{ alignItems: 'flex-end', justifyContent: 'flex-end', width: '100%' }}>
                        <Flex direction='row' style={{ width: '50%', alignItems: 'flex-start', justifyContent: 'flex-start', gap: '16px' }}>
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