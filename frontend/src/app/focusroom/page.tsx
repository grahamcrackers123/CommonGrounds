"use client";

import { useFocusSession } from "@/components/focus-session-provider";
import {
  PRESET_MINUTES,
  SOUNDS,
  fmt,
  initialsOf,
  statusOf,
  type RewardTier,
} from "@/lib/focus-session";
import {
  DEFAULT_MAX_PARTICIPANTS,
  PARTY_SIZE_MAX,
  PARTY_SIZE_MIN,
  clampMaxParticipants,
} from "@/lib/rooms";
import {
  ActionIcon,
  Avatar,
  Badge,
  Box,
  Button,
  Center,
  CopyButton,
  Divider,
  Group,
  Loader,
  Menu,
  Modal,
  NumberInput,
  Paper,
  Progress,
  Select,
  SimpleGrid,
  Slider,
  Stack,
  Text,
  TextInput,
  ThemeIcon,
  Title,
  Tooltip,
} from "@mantine/core";
import {
  AlarmClock,
  Check,
  Copy,
  Crown,
  Flame,
  Heart,
  Lock,
  LogIn,
  LogOut,
  MoreHorizontal,
  Music,
  Pause,
  Play,
  RefreshCw,
  Sparkles,
  Square,
  Timer,
  Trophy,
  UserMinus,
  UserPlus,
  Users,
  Volume2,
  X,
} from "lucide-react";
import { useEffect, useRef } from "react";

export default function FocusRoomPage() {
  const {
    phase,
    roomName,
    setRoomName,
    studyGoal,
    setStudyGoal,
    durationPreset,
    setDurationPreset,
    customMinutes,
    setCustomMinutes,
    maxParticipants,
    setMaxParticipants,
    linkedTask,
    setLinkedTask,
    quests,
    rewardTiers,
    history,
    inviteModalOpen,
    setInviteModalOpen,
    friendCode,
    setFriendCode,
    friendReqSending,
    joinCode,
    setJoinCode,
    joining,
    joinedRoom,
    restoring,
    remaining,
    running,
    sound,
    setSound,
    volume,
    setVolume,
    sessionResult,
    isLeader,
    lobbyParticipants,
    isParticipantLeader,
    selectedMinutes,
    total,
    progress,
    activeSound,
    soundFile,
    inviteCode,
    roomCode,
    todaySessions,
    todayMinutes,
    runningTodayMinutes,
    todayProgress,
    onlineFriends,
    incomingRequests,
    outgoingRequests,
    enterFocusRoom,
    startSession,
    toggleRunning,
    resetTimer,
    endEarly,
    backToLobby,
    leaveLobby,
    joinRoomWithCode,
    inviteFriend,
    unfriend,
    respondToRequest,
    submitAddFriend,
  } = useFocusSession();

  const partySize = clampMaxParticipants(maxParticipants);

  const enteredRef = useRef(false);
  useEffect(() => {
    if (enteredRef.current) return;
    enteredRef.current = true;
    const params = new URLSearchParams(window.location.search);
    const invite = params.get("code");
    if (invite) {
      window.history.replaceState({}, "", window.location.pathname);
    }
    enterFocusRoom(invite);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tierFor = (minutes: number): RewardTier => {
    let best: RewardTier | null = null;
    for (const tier of rewardTiers) {
      if (tier.duration_min <= minutes && (!best || tier.duration_min > best.duration_min)) {
        best = tier;
      }
    }
    if (best) return best;
    return { duration_min: minutes, coins: 0, pet_energy: 0, streak_xp: 0 };
  };

  if (restoring) {
    return (
      <Center style={{ minHeight: "60vh" }}>
        <Loader />
      </Center>
    );
  }

  // live view: shared countdown, ambience and members
  if (phase === "live") {
    return (
      <Box style={{ backgroundColor: "light-dark(#F7F9FC, #000000)", minHeight: "100vh" }}>
        <Box maw={1150} mx="auto" p={{ base: 20, md: 40 }}>
          {/* Header */}
          <Group justify="space-between" align="flex-end" mb={24} wrap="wrap">
            <Box>
              <Title order={1} fw={800}>
                Focus Room
              </Title>
              <Text c="dimmed" size="sm" mt={4}>
                {roomName.trim() || "Focus Room"}
              </Text>
            </Box>
            <Group gap={8}>
              <Badge variant="light" color="green" size="lg" radius="xl" leftSection={<Flame size={14} />}>
                {todaySessions} sessions today
              </Badge>
              <Badge variant="light" color="blue" size="lg" radius="xl" leftSection={<AlarmClock size={14} />}>
                {Math.floor(runningTodayMinutes)} min
              </Badge>
            </Group>
          </Group>

          <SimpleGrid cols={{ base: 1, lg: 3 }} spacing="md" mb={28}>
            {/* Timer card */}
            <Paper p="lg" radius="lg" shadow="sm" withBorder style={{ gridColumn: "span 2" }}>
              <Group justify="space-between" mb="md">
                <Title order={3} fz="lg" fw={700}>
                  {running ? "Focusing…" : "Ready when you are"}
                </Title>
                <Badge
                  variant={running ? "filled" : "light"}
                  color={running ? "green" : "gray"}
                  size="lg"
                  radius="xl"
                  leftSection={running ? <Play size={12} /> : <Pause size={12} />}
                >
                  {running ? "In progress" : "Paused"}
                </Badge>
              </Group>

              {/* progress ring */}
              <Box style={{ display: "grid", placeItems: "center", padding: "24px 0 8px" }}>
                <Box style={{ position: "relative", width: 260, height: 260 }}>
                  <svg width={260} height={260} viewBox="0 0 260 260" style={{ transform: "rotate(-90deg)" }}>
                    <circle cx={130} cy={130} r={118} fill="none" stroke="light-dark(#F1F3F5, #2C2E33)" strokeWidth={14} />
                    <circle
                      cx={130}
                      cy={130}
                      r={118}
                      fill="none"
                      stroke={running ? "light-dark(#2F80ED, #82B3F4)" : "light-dark(#ADB5BD, #6C757D)"}
                      strokeWidth={14}
                      strokeLinecap="round"
                      strokeDasharray={2 * Math.PI * 118}
                      strokeDashoffset={2 * Math.PI * 118 * (1 - progress / 100)}
                      style={{ transition: "stroke-dashoffset 0.5s linear, stroke 0.3s ease" }}
                    />
                  </svg>
                  <Box
                    style={{
                      position: "absolute",
                      inset: 0,
                      display: "grid",
                      placeItems: "center",
                    }}
                  >
                    <Stack align="center" gap={0}>
                      <Text fz={56} fw={800} lh={1} style={{ fontVariantNumeric: "tabular-nums" }}>
                        {fmt(remaining)}
                      </Text>
                      <Text c="dimmed" fz="sm" fw={600} mt={4}>
                        {selectedMinutes}-minute session
                      </Text>
                    </Stack>
                  </Box>
                </Box>
              </Box>

              {studyGoal.trim() && (
                <Text c="dimmed" fz="xs" ta="center" mt={4}>
                  Goal: {studyGoal.trim()}
                </Text>
              )}

              {/* controls */}
              <Group justify="center" gap="sm" mt="lg">
                <Tooltip label="Reset" withArrow>
                  <Button
                    variant="light"
                    radius="xl"
                    px={14}
                    onClick={resetTimer}
                    disabled={!running && remaining === total}
                  >
                    <RefreshCw size={17} />
                  </Button>
                </Tooltip>
                <Button
                  size="lg"
                  radius="xl"
                  px={48}
                  color={running ? "yellow" : "blue"}
                  onClick={toggleRunning}
                  leftSection={running ? <Pause size={18} /> : <Play size={18} />}
                >
                  {running ? "Pause" : "Start"}
                </Button>
              </Group>

              <Button
                fullWidth
                variant="subtle"
                color="red"
                mt="lg"
                leftSection={<Square size={14} />}
                onClick={endEarly}
              >
                End session early
              </Button>
            </Paper>

            <Stack gap="md">
              {/* Ambience section */}
              <Paper p="lg" radius="lg" shadow="sm" withBorder>
                <Group gap={8} mb="md">
                  <ThemeIcon radius="lg" variant="light" color="blue" size={32}>
                    <Music size={18} />
                  </ThemeIcon>
                  <Title order={3} fz="lg" fw={700}>
                    Ambience
                  </Title>
                </Group>
                <SimpleGrid cols={2} spacing="xs">
                  {SOUNDS.map((s) => {
                    const active = sound === s.key;
                    return (
                      <Box
                        key={s.key}
                        p="sm"
                        style={{
                          borderRadius: 12,
                          border: `1px solid ${active ? "light-dark(#ACCCF8, #5999F1)" : "light-dark(#E9ECEF, #2C2E33)"}`,
                          backgroundColor: active ? "light-dark(#E7F5FF, #1B2A3A)" : "light-dark(#FFFFFF, #151515)",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 8,
                        }}
                        onClick={() => setSound(s.key)}
                      >
                        <s.icon size={16} color={active ? "light-dark(#2F80ED, #82B3F4)" : "light-dark(#868E96, #ADB5BD)"} />
                        <Text fz="sm" fw={600} c={active ? "light-dark(#2F80ED, #82B3F4)" : "light-dark(#495057, #CED4DA)"}>
                          {s.label}
                        </Text>
                      </Box>
                    );
                  })}
                </SimpleGrid>
                <Group justify="space-between" mt="md" mb={4}>
                  <Group gap={6}>
                    <Volume2 size={15} color="light-dark(#868E96, #ADB5BD)" />
                    <Text fz="sm" fw={600} c="dimmed">
                      Volume
                    </Text>
                  </Group>
                  <Text fz="xs" fw={600} c="dimmed">
                    {volume}%
                  </Text>
                </Group>
                <Slider
                  value={volume}
                  onChange={setVolume}
                  disabled={!soundFile}
                  size="sm"
                  color="blue"
                  label={(value) => `${value}%`}
                  aria-label="Ambience volume"
                />
                <Text c="dimmed" fz="xs" mt={10} ta="center">
                  Now playing: {activeSound.label === "Silence" ? "silence" : `${activeSound.label} sounds`}
                </Text>
              </Paper>

              {/* Room members */}
              <Paper p="lg" radius="lg" shadow="sm" withBorder>
                <Group justify="space-between" mb="md">
                  <Group gap={8}>
                    <ThemeIcon radius="lg" variant="light" color="green" size={32}>
                      <Users size={18} />
                    </ThemeIcon>
                    <Title order={3} fz="lg" fw={700}>
                      Room Members
                    </Title>
                  </Group>
                  <Badge variant="light" color="blue" radius="xl">
                    {lobbyParticipants.length}/{partySize}
                  </Badge>
                </Group>
                <Stack gap="xs">
                  {lobbyParticipants.map((p) => (
                    <Group
                      key={p.name}
                      justify="space-between"
                      p="xs"
                      style={{ borderRadius: 10, backgroundColor: "light-dark(#F8F9FA, #151515)" }}
                      wrap="nowrap"
                    >
                      <Group gap={10} wrap="nowrap">
                        <Avatar color={p.color} radius="xl" size={32}>
                          {p.initials}
                        </Avatar>
                        <Box>
                          <Text fz="sm" fw={600}>
                            {p.name}
                          </Text>
                          <Group gap={5}>
                            <Box
                              w={7}
                              h={7}
                              style={{ borderRadius: 99, backgroundColor: statusOf(p.status).color }}
                            />
                            <Text fz="xs" c="dimmed">
                              {statusOf(p.status).label}
                            </Text>
                          </Group>
                        </Box>
                      </Group>
                      <Group gap={6} wrap="nowrap">
                        {isParticipantLeader(p) && (
                          <Badge
                            variant="light"
                            color="yellow"
                            size="xs"
                            radius="xl"
                            leftSection={<Crown size={10} />}
                          >
                            Leader
                          </Badge>
                        )}
                        {p.status === "focus" && (
                          <Badge variant="light" color="green" size="xs" radius="xl">
                            <Flame size={10} />
                          </Badge>
                        )}
                      </Group>
                    </Group>
                  ))}
                </Stack>
              </Paper>
            </Stack>
          </SimpleGrid>

          {/* Today's focus goal */}
          <Paper p="lg" radius="lg" shadow="sm" withBorder>
            <Group justify="space-between" mb="sm">
              <Group gap={8}>
                <ThemeIcon radius="lg" variant="light" color="yellow" size={32}>
                  <Trophy size={18} />
                </ThemeIcon>
                <Title order={3} fz="lg" fw={700}>
                  Today&apos;s Focus Goal
                </Title>
              </Group>
              <Text fz="sm" fw={700} c="green">
                {Math.round(todayProgress)}%
              </Text>
            </Group>
            <Progress
              value={todayProgress}
              color="green"
              radius="xl"
              size="lg"
              striped
              animated
            />
            <Text c="dimmed" fz="xs" mt={8}>
              {Math.floor(runningTodayMinutes)} of 120 minutes • {todaySessions} sessions completed
            </Text>
          </Paper>
        </Box>
      </Box>
    );
  }

  // summary view: session report + rewards
  if (phase === "summary" && sessionResult) {
    const result = sessionResult;
    const tier = tierFor(result.actualMinutes);
    const coins = tier.coins;
    const xp = tier.streak_xp;
    const petEnergy = tier.pet_energy;
    const groupBonus = result.participantNames.length > 1;

    return (
      <Box style={{ backgroundColor: "light-dark(#F7F9FC, #000000)", minHeight: "100vh" }}>
        <Box maw={760} mx="auto" p={{ base: 20, md: 40 }}>
          <Paper p="xl" radius="lg" shadow="sm" withBorder>
            {/* result header */}
            <Stack align="center" gap={8} mb="lg">
              <ThemeIcon size={64} radius="xl" variant="filled" color={result.completed ? "green" : "yellow"}>
                {result.completed ? <Check size={30} /> : <Timer size={30} />}
              </ThemeIcon>
              <Title order={2} fw={800}>
                {result.completed ? "Session Complete!" : "Session Ended"}
              </Title>
              <Text c="dimmed" size="sm" ta="center">
                {result.completed
                  ? "Great work. Your focus session is finished."
                  : "You ended the session early. Nice work anyway!"}
              </Text>
            </Stack>

            <Divider mb="lg" />

            {/* session details */}
            <Stack gap="sm">
              <Group justify="space-between" wrap="nowrap">
                <Text fz="sm" c="dimmed">
                  Room
                </Text>
                <Text fz="sm" fw={700} ta="right">
                  {result.roomName}
                </Text>
              </Group>
              <Group justify="space-between" wrap="nowrap">
                <Text fz="sm" c="dimmed">
                  Study Goal
                </Text>
                <Text fz="sm" fw={700} ta="right">
                  {result.studyGoal}
                </Text>
              </Group>
              <Group justify="space-between" wrap="nowrap">
                <Text fz="sm" c="dimmed">
                  Linked Task
                </Text>
                <Text fz="sm" fw={700} ta="right">
                  {result.linkedTask ?? "—"}
                </Text>
              </Group>
              <Group justify="space-between" wrap="nowrap">
                <Text fz="sm" c="dimmed">
                  Planned Duration
                </Text>
                <Text fz="sm" fw={700} ta="right">
                  {result.plannedMinutes} minutes
                </Text>
              </Group>
              <Group justify="space-between" wrap="nowrap">
                <Text fz="sm" c="dimmed">
                  Time Focused
                </Text>
                <Text fz="sm" fw={700} ta="right">
                  {result.actualMinutes} minutes
                </Text>
              </Group>
              <Group justify="space-between" wrap="nowrap">
                <Text fz="sm" c="dimmed">
                  Participants
                </Text>
                <Group gap={6} justify="flex-end">
                  {result.participantNames.map((name) => (
                    <Tooltip key={name} label={name} withArrow>
                      <Avatar color="blue" radius="xl" size={24}>
                        {initialsOf(name)}
                      </Avatar>
                    </Tooltip>
                  ))}
                </Group>
              </Group>
            </Stack>

            <Divider my="lg" />

            {/* rewards earned */}
            <Stack align="center" gap={6}>
              <Text fz="sm" fw={700} tt="uppercase" c="dimmed">
                Rewards Earned
              </Text>
              <Group gap={8} justify="center">
                <Badge size="lg" variant="light" color="yellow" radius="xl" leftSection={<Flame size={13} />}>
                  +{coins} Coins
                </Badge>
                <Badge size="lg" variant="light" color="green" radius="xl" leftSection={<Sparkles size={13} />}>
                  +{xp} XP
                </Badge>
                <Badge size="lg" variant="light" color="pink" radius="xl" leftSection={<Heart size={13} />}>
                  +{petEnergy} Pet Energy
                </Badge>
              </Group>
              {groupBonus && (
                <Text fz="xs" c="dimmed">
                  Group bonus applied, focusing together earned extra rewards
                </Text>
              )}
            </Stack>

            {/* actions */}
            <Group justify="center" mt="xl">
              <Button size="md" radius="xl" leftSection={<RefreshCw size={16} />} onClick={backToLobby}>
                Start Another Session
              </Button>
              <Button size="md" radius="xl" variant="default" onClick={backToLobby}>
                Back to Lobby
              </Button>
            </Group>
          </Paper>
        </Box>
      </Box>
    );
  }

  // lobby / setup view
  return (
    <Box style={{ backgroundColor: "light-dark(#F7F9FC, #000000)", minHeight: "100vh" }}>
      <Box maw={1150} mx="auto" p={{ base: 20, md: 40 }}>
        {/* Header */}
        <Group justify="space-between" align="flex-end" mb={24} wrap="wrap">
          <Box>
            <Title order={1} fw={800}>
              Focus Room
            </Title>
            <Text c="dimmed" size="sm" mt={4}>
              Set a sprint, invite your crew, and lock in.
            </Text>
          </Box>
          <Group gap={8}>
            <Badge variant="light" color="green" size="lg" radius="xl" leftSection={<Flame size={14} />}>
              {todaySessions} sessions today
            </Badge>
            <Badge variant="light" color="blue" size="lg" radius="xl" leftSection={<AlarmClock size={14} />}>
              {todayMinutes} min focused
            </Badge>
          </Group>
        </Group>

        <SimpleGrid cols={{ base: 1, lg: 3 }} spacing="md" mb={28}>
          <Stack gap="md" style={{ gridColumn: "span 2" }}>
            {/* Room setup */}
            <Paper p="lg" radius="lg" shadow="sm" withBorder>
              <Group gap={8} mb="lg">
                <ThemeIcon radius="lg" variant="light" color="blue" size={32}>
                  <Timer size={18} />
                </ThemeIcon>
                <Title order={3} fz="lg" fw={700}>
                  Room Setup
                </Title>
              </Group>

              <Stack gap="md">
                <TextInput
                  label="Room Name"
                  value={roomName}
                  onChange={(e) => setRoomName(e.currentTarget.value)}
                  disabled={!isLeader}
                />
                <TextInput
                  label="Study Goal"
                  value={studyGoal}
                  onChange={(e) => setStudyGoal(e.currentTarget.value)}
                  disabled={!isLeader}
                />

                <Box>
                  <Text fz="sm" fw={600} mb={6}>
                    Duration
                  </Text>
                  <Group gap={8}>
                    {PRESET_MINUTES.map((m) => (
                      <Button
                        key={m}
                        size="xs"
                        radius="xl"
                        variant={durationPreset === m ? "filled" : "default"}
                        onClick={() => setDurationPreset(m)}
                        disabled={!isLeader}
                      >
                        {m}m
                      </Button>
                    ))}
                    <Button
                      size="xs"
                      radius="xl"
                      variant={durationPreset === "custom" ? "filled" : "default"}
                      onClick={() => setDurationPreset("custom")}
                      disabled={!isLeader}
                    >
                      Custom
                    </Button>
                  </Group>
                  {durationPreset === "custom" && (
                    <NumberInput
                      mt="xs"
                      label="Minutes"
                      value={customMinutes}
                      onChange={(v) => setCustomMinutes(Number(v) || 1)}
                      min={5}
                      max={240}
                      style={{ maxWidth: 160 }}
                      disabled={!isLeader}
                    />
                  )}
                </Box>

                <Select
                  label="Linked Task"
                  data={quests.map((q) => ({ value: q.id, label: q.title }))}
                  value={linkedTask}
                  onChange={(v) => setLinkedTask(v)}
                  searchable
                  clearable
                  nothingFoundMessage="No pending quests"
                  disabled={!isLeader}
                />

                <Button
                  size="md"
                  fullWidth
                  mt="sm"
                  leftSection={isLeader ? <Play size={16} /> : <Lock size={16} />}
                  onClick={startSession}
                  disabled={!isLeader}
                >
                  {isLeader ? "Start Focus Room" : "Waiting for leader to start"}
                </Button>

                <Divider label="Or join a friend's room" labelPosition="center" my={4} />

                <Group gap="xs" align="flex-end" wrap="nowrap">
                  <TextInput
                    label="Invite Code"
                    placeholder="ABCD12"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.currentTarget.value.toUpperCase())}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") joinRoomWithCode(joinCode);
                    }}
                    style={{ flex: 1 }}
                  />
                  <Button
                    variant="default"
                    leftSection={<LogIn size={16} />}
                    onClick={() => joinRoomWithCode(joinCode)}
                    loading={joining}
                  >
                    Join
                  </Button>
                </Group>
              </Stack>
            </Paper>
          </Stack>

          <Stack gap="md">
            {/* lobby participants */}
            <Paper p="lg" radius="lg" shadow="sm" withBorder>
              <Group justify="space-between" mb={4}>
                <Group gap={8}>
                  <ThemeIcon radius="lg" variant="light" color="green" size={32}>
                    <Users size={18} />
                  </ThemeIcon>
                  <Title order={3} fz="lg" fw={700}>
                    Participants in the Lobby
                  </Title>
                </Group>
                <Badge variant="light" color="blue" radius="xl" mb="md">
                  {lobbyParticipants.length}/{partySize}
                </Badge>
              </Group>
              {/* <Text c="dimmed" fz="xs" mb="md">
                Invite up to {partySize - 1} friends to join the room
              </Text> */}

              <Stack gap="xs">
                {lobbyParticipants.map((p) => (
                  <Group
                    key={p.name}
                    justify="space-between"
                    p="xs"
                    style={{ borderRadius: 10, backgroundColor: p.isYou ? "light-dark(#E7F5FF, #1B2A3A)" : "light-dark(#F8F9FA, #151515)" }}
                    wrap="nowrap"
                  >
                    <Group gap={10} wrap="nowrap">
                      <Avatar color={p.color} radius="xl" size={32}>
                        {p.initials}
                      </Avatar>
                      <Box>
                        <Text fz="sm" fw={600}>
                          {p.name}
                        </Text>
                        <Text fz="xs" c="dimmed">
                          {isParticipantLeader(p)
                            ? p.isYou
                              ? "You · Leader"
                              : "Leader"
                            : p.isYou
                              ? "You"
                              : "In lobby"}
                        </Text>
                      </Box>
                    </Group>
                    {isParticipantLeader(p) ? (
                      <Badge
                        variant="light"
                        color="yellow"
                        size="xs"
                        radius="xl"
                        leftSection={<Crown size={10} />}
                      >
                        Leader
                      </Badge>
                    ) : (
                      <Badge variant="light" color={p.isYou ? "blue" : "green"} size="xs" radius="xl">
                        {p.isYou ? "You" : "Ready"}
                      </Badge>
                    )}
                  </Group>
                ))}
                <NumberInput
                  label="Max Members"
                  description={`Includes you · up to ${PARTY_SIZE_MAX}`}
                  value={maxParticipants}
                  onChange={(v) => setMaxParticipants(Number(v) || DEFAULT_MAX_PARTICIPANTS)}
                  min={PARTY_SIZE_MIN}
                  max={PARTY_SIZE_MAX}
                  disabled={!isLeader}
                />
                {lobbyParticipants.length < partySize && (
                  <Text c="dimmed" fz="xs" ta="center">
                    Invite friends to fill the room
                  </Text>
                )}
              </Stack>
              {joinedRoom && (
                <Button
                  fullWidth
                  mt="sm"
                  variant="light"
                  color="red"
                  leftSection={<LogOut size={14} />}
                  onClick={leaveLobby}
                >
                  Leave Lobby
                </Button>
              )}
            </Paper>

            {/* friends online */}
            <Paper p="lg" radius="lg" shadow="sm" withBorder>
              <Group gap={8} mb="md">
                <ThemeIcon radius="lg" variant="light" color="blue" size={32}>
                  <Users size={18} />
                </ThemeIcon>
                <Title order={3} fz="lg" fw={700}>
                  Friends Online
                </Title>
              </Group>

              {/* incoming friend requests */}
              {incomingRequests.length > 0 && (
                <Stack gap="xs" mb="md">
                  {incomingRequests.map((f) => (
                    <Group
                      key={f.id ?? f.userId ?? f.name}
                      justify="space-between"
                      p="xs"
                      style={{ borderRadius: 10, backgroundColor: "light-dark(#FFF9DB, #332D13)" }}
                      wrap="nowrap"
                    >
                      <Group gap={10} wrap="nowrap">
                        <Avatar color={f.color} radius="xl" size={32}>
                          {f.initials}
                        </Avatar>
                        <Box>
                          <Text fz="sm" fw={600}>
                            {f.name}
                          </Text>
                          <Text fz="xs" c="dimmed">
                            Wants to be friends
                          </Text>
                        </Box>
                      </Group>
                      <Group gap={4}>
                        <Tooltip label="Accept">
                          <ActionIcon
                            variant="light"
                            color="green"
                            aria-label={`Accept friend request from ${f.name}`}
                            onClick={() => respondToRequest(f, "accept")}
                          >
                            <Check size={14} />
                          </ActionIcon>
                        </Tooltip>
                        <Tooltip label="Decline">
                          <ActionIcon
                            variant="light"
                            color="red"
                            aria-label={`Decline friend request from ${f.name}`}
                            onClick={() => respondToRequest(f, "reject")}
                          >
                            <X size={14} />
                          </ActionIcon>
                        </Tooltip>
                      </Group>
                    </Group>
                  ))}
                </Stack>
              )}

              {/* outgoing friend requests */}
              {outgoingRequests.length > 0 && (
                <Stack gap="xs" mb="md">
                  {outgoingRequests.map((f) => (
                    <Group
                      key={f.id ?? f.userId ?? f.name}
                      justify="space-between"
                      p="xs"
                      style={{ borderRadius: 10, backgroundColor: "light-dark(#F8F9FA, #151515)" }}
                      wrap="nowrap"
                    >
                      <Group gap={10} wrap="nowrap">
                        <Avatar color={f.color} radius="xl" size={32}>
                          {f.initials}
                        </Avatar>
                        <Box>
                          <Text fz="sm" fw={600}>
                            {f.name}
                          </Text>
                          <Text fz="xs" c="dimmed">
                            Request pending
                          </Text>
                        </Box>
                      </Group>
                      <Tooltip label="Cancel request">
                        <ActionIcon
                          variant="subtle"
                          color="gray"
                          aria-label={`Cancel friend request to ${f.name}`}
                          onClick={() => unfriend(f)}
                        >
                          <UserMinus size={14} />
                        </ActionIcon>
                      </Tooltip>
                    </Group>
                  ))}
                </Stack>
              )}

              {/* online friends */}
              <Stack gap="xs" mb="md">
                {onlineFriends.map((f) => (
                  <Group
                    key={f.name}
                    justify="space-between"
                    p="xs"
                    style={{ borderRadius: 10, backgroundColor: "light-dark(#F8F9FA, #151515)" }}
                    wrap="nowrap"
                  >
                    <Group gap={10} wrap="nowrap">
                      <Avatar color={f.color} radius="xl" size={32}>
                        {f.initials}
                      </Avatar>
                      <Box>
                        <Text fz="sm" fw={600}>
                          {f.name}
                        </Text>
                        <Group gap={5}>
                          <Box w={7} h={7} style={{ borderRadius: 99, backgroundColor: "light-dark(#2F9E44, #51CF66)" }} />
                          <Text fz="xs" c="dimmed">
                            Online
                          </Text>
                        </Group>
                      </Box>
                    </Group>
                    <Menu position="bottom-end" withinPortal>
                      <Menu.Target>
                        <ActionIcon variant="subtle" color="gray" aria-label={`Actions for ${f.name}`}>
                          <MoreHorizontal size={16} />
                        </ActionIcon>
                      </Menu.Target>
                      <Menu.Dropdown>
                        <Menu.Item leftSection={<UserPlus size={14} />} onClick={() => inviteFriend(f)}>
                          Invite to Lobby
                        </Menu.Item>
                        <Menu.Item leftSection={<UserMinus size={14} />} color="red" onClick={() => unfriend(f)}>
                          Unfriend
                        </Menu.Item>
                      </Menu.Dropdown>
                    </Menu>
                  </Group>
                ))}
                {onlineFriends.length === 0 && (
                  <Text c="dimmed" fz="sm">
                    No friends online right now.
                  </Text>
                )}
              </Stack>

              {/* invite actions */}
              <Stack gap="xs">
                <CopyButton value={inviteCode}>
                  {({ copied, copy }) => (
                    <Button
                      fullWidth
                      variant="filled"
                      color="dark"
                      disabled={!roomCode}
                      leftSection={copied ? <Check size={14} /> : <Copy size={14} />}
                      onClick={copy}
                    >
                      {copied
                        ? "Copied!"
                        : roomCode
                          ? `Copy Invite Code · ${inviteCode}`
                          : "Copy Invite Code"}
                    </Button>
                  )}
                </CopyButton>
                <Button
                  fullWidth
                  variant="default"
                  leftSection={<UserPlus size={14} />}
                  onClick={() => setInviteModalOpen(true)}
                >
                  Add Friend
                </Button>
              </Stack>
            </Paper>
          </Stack>
        </SimpleGrid>

        {/* focus room history */}
        <Paper p="lg" radius="lg" shadow="sm" withBorder>
          <Group gap={8} mb="md">
            <ThemeIcon radius="lg" variant="light" color="yellow" size={32}>
              <Trophy size={18} />
            </ThemeIcon>
            <Title order={3} fz="lg" fw={700}>
              Focus Room History
            </Title>
          </Group>
          <SimpleGrid cols={3} mb={8}>
            <Text fz="xs" fw={700} tt="uppercase" c="dimmed">
              Room
            </Text>
            <Text fz="xs" fw={700} tt="uppercase" c="dimmed" ta='end'>
              Sprint Time
            </Text>
            <Text fz="xs" fw={700} tt="uppercase" c="dimmed" ta='end'>
              Date
            </Text>
          </SimpleGrid>
          <Divider mb="sm" />
          <Stack gap="xs">
            {history.map((row, i) => (
              <Group
                key={row.id ?? `${row.room}-${i}`}
                justify="space-between"
                p="xs"
                style={{ borderRadius: 10, backgroundColor: "light-dark(#F8F9FA, #151515)" }}
                wrap="nowrap"
              >
                <Text fz="sm" fw={600} truncate style={{ flex: 1 }} maw={340}>
                  {row.room}
                </Text>
                <Badge variant="light" color="blue" radius="xl">
                  {row.minutes}m
                </Badge>
                <Text fz="xs" c="dimmed" w={90} ta="right">
                  {row.date
                    ? new Date(row.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })
                    : "—"}
                </Text>
              </Group>
            ))}
            {history.length === 0 && (
              <Text c="dimmed" fz="sm">
                No sessions yet. Start your first focus room!
              </Text>
            )}
          </Stack>
        </Paper>
      </Box>

      {/* add friend modal */}
      <Modal
        opened={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
        title="Add Friend"
        centered
      >
        <Text fz="sm" c="dimmed" mb="md">
          Ask your classmate for their user code and send a friend request.
        </Text>
        <TextInput
          value={friendCode}
          onChange={(e) => setFriendCode(e.currentTarget.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submitAddFriend();
          }}
          mb="md"
        />
        <Button
          fullWidth
          leftSection={<UserPlus size={14} />}
          onClick={submitAddFriend}
          loading={friendReqSending}
        >
          Send Request
        </Button>
      </Modal>
    </Box>
  );
}