"use client";

import {
  Badge,
  Box,
  Button,
  Checkbox,
  Divider,
  Group,
  Modal,
  NumberInput,
  Paper,
  Select,
  SimpleGrid,
  Stack,
  Tabs,
  Text,
  Textarea,
  TextInput,
} from "@mantine/core";

import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Flame,
  Plus,
  RefreshCw,
  Sparkles,
  Trophy,
  Upload,
  X,
} from "lucide-react";

import { useEffect, useMemo, useState } from "react";

/* =========================================================
   TYPES
========================================================= */

type Quest = {
  id: string;
  user_id?: string;

  title: string;
  description: string | null;
  subject: string | null;

  deadline: string | null;
  priority: "low" | "medium" | "high";
  status: "pending" | "in_progress" | "completed";

  estimated_duration: number | null;
  checklist: string[];

  // Calendar-only fields
  startTime?: string;
  endTime?: string;

  // UI-only fields for now
  reward?: number;
  energy?: number;
  reason?: string;
  materials?: string[];
};

type Module = {
  id: number;
  code: string;
  title: string;
  instructor: string;
  schedule: string;
  description: string;
};

type QuestPriority = "low" | "medium" | "high";

/* =========================================================
   MODULE DATA
   Keep this as UI placeholder data for now.
   Replace with API data later if your team creates a
   modules endpoint.
========================================================= */

const MODULES: Module[] = [
  {
    id: 1,
    code: "CCS101",
    title: "Data Structures",
    instructor: "Prof. Santos",
    schedule: "Mon & Wed • 7:00 PM - 8:00 PM",
    description:
      "Data structures, algorithms, and problem solving.",
  },
  {
    id: 2,
    code: "DB201",
    title: "Database Systems",
    instructor: "Prof. Cruz",
    schedule: "Tue & Thu • 5:00 PM - 6:00 PM",
    description:
      "Relational databases, SQL, and normalization.",
  },
  {
    id: 3,
    code: "IAS202",
    title: "Information Assurance",
    instructor: "Prof. Reyes",
    schedule: "Wed • 6:00 PM - 7:00 PM",
    description:
      "Security controls, risk management, and auditing.",
  },
  {
    id: 4,
    code: "WD301",
    title: "Web Development",
    instructor: "Prof. Garcia",
    schedule: "Thu • 4:00 PM - 5:00 PM",
    description:
      "Modern web development and application architecture.",
  },
  {
    id: 5,
    code: "CAP400",
    title: "Capstone Project",
    instructor: "Prof. Dela Cruz",
    schedule: "Fri • 7:00 PM - 8:30 PM",
    description:
      "Capstone development and project implementation.",
  },
  {
    id: 6,
    code: "UX210",
    title: "User Experience Design",
    instructor: "Prof. Lim",
    schedule: "Sat • 10:00 AM - 12:00 PM",
    description:
      "Interface design, usability, and user research.",
  },
];

/* =========================================================
   HELPERS
========================================================= */

const pad = (value: number) =>
  String(value).padStart(2, "0");

const formatDateKey = (date: Date) =>
  `${date.getFullYear()}-${pad(
    date.getMonth() + 1
  )}-${pad(date.getDate())}`;

const formatMonthYear = (date: Date) =>
  date.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

const formatShortDate = (date: Date) =>
  date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

const addDays = (date: Date, amount: number) => {
  const result = new Date(date);
  result.setDate(result.getDate() + amount);
  return result;
};

const getStartOfWeek = (date: Date) => {
  const result = new Date(date);
  const day = result.getDay();

  result.setDate(result.getDate() - day);
  result.setHours(0, 0, 0, 0);

  return result;
};

const getDaysInMonth = (date: Date) => {
  return new Date(
    date.getFullYear(),
    date.getMonth() + 1,
    0
  ).getDate();
};

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case "high":
      return "#e03131";

    case "medium":
      return "#f08c00";

    case "low":
      return "#1971c2";

    default:
      return "#868e96";
  }
};

const getPriorityLabel = (priority: string) => {
  switch (priority) {
    case "high":
      return "High Priority";

    case "medium":
      return "Medium Priority";

    case "low":
      return "Low Priority";

    default:
      return priority;
  }
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case "pending":
      return "Not Started";

    case "in_progress":
      return "In Progress";

    case "completed":
      return "Completed";

    default:
      return status;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case "completed":
      return "green";

    case "in_progress":
      return "blue";

    default:
      return "gray";
  }
};

const formatQuestTime = (deadline: string | null) => {
  if (!deadline) return "No time";

  return new Date(deadline).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
};

const formatQuestDate = (deadline: string | null) => {
  if (!deadline) return "No deadline";

  return new Date(deadline).toLocaleDateString(
    "en-US",
    {
      month: "short",
      day: "numeric",
      year: "numeric",
    }
  );
};

/* =========================================================
   COMPONENT
========================================================= */

export default function QuestCalendarPage() {
  /* =======================================================
     GENERAL STATE
  ======================================================= */

  const [activeTab, setActiveTab] =
    useState<string | null>("calendar");

  const [selectedDate, setSelectedDate] =
    useState(new Date());

  const [calendarView, setCalendarView] =
    useState<"month" | "week">("week");

  /* =======================================================
     QUEST STATE
  ======================================================= */

  const [quests, setQuests] = useState<Quest[]>([]);

  const [selectedQuest, setSelectedQuest] =
    useState<Quest | null>(null);

  const [loadingQuests, setLoadingQuests] =
    useState(true);

  const [generatingPlan, setGeneratingPlan] =
    useState(false);

  const [completingQuest, setCompletingQuest] =
    useState(false);

  /* =======================================================
     MODAL STATE
  ======================================================= */

  const [modalOpened, setModalOpened] =
    useState(false);

  const [editingQuest, setEditingQuest] =
    useState<Quest | null>(null);

  const [savingQuest, setSavingQuest] =
    useState(false);

  const [deletingQuest, setDeletingQuest] =
    useState(false);

  /* =======================================================
     FILTER STATE
  ======================================================= */

  const [statusFilter, setStatusFilter] =
    useState("all");

  const [subjectFilter, setSubjectFilter] =
    useState("all");

  const [searchQuery, setSearchQuery] =
    useState("");

  /* =======================================================
     FORM STATE
  ======================================================= */

  const [newQuest, setNewQuest] = useState({
    title: "",
    description: "",
    subject: "",
    deadline: "",
    priority: "medium" as QuestPriority,
    estimated_duration: 60,
  });

  /* =======================================================
     LOAD QUESTS
  ======================================================= */

  const loadQuests = async () => {
    try {
      setLoadingQuests(true);

      const response = await fetch("/api/quests", {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(
          "Failed to load quests"
        );
      }

      const data = await response.json();

      console.log(
        "Quests from API:",
        data.quests
      );

      setQuests(data.quests ?? []);
    } catch (error) {
      console.error(
        "Failed to load quests:",
        error
      );
    } finally {
      setLoadingQuests(false);
    }
  };

  useEffect(() => {
    loadQuests();
  }, []);

  /* =======================================================
     CALENDAR CALCULATIONS
  ======================================================= */

  const weekDays = useMemo(() => {
    const start =
      getStartOfWeek(selectedDate);

    return Array.from(
      { length: 7 },
      (_, index) =>
        addDays(start, index)
    );
  }, [selectedDate]);

  const monthDays = useMemo(() => {
    const year =
      selectedDate.getFullYear();

    const month =
      selectedDate.getMonth();

    const firstDay =
      new Date(
        year,
        month,
        1
      ).getDay();

    const daysInMonth =
      getDaysInMonth(selectedDate);

    const days: Array<{
      date: Date;
      currentMonth: boolean;
    }> = [];

    for (
      let i = firstDay - 1;
      i >= 0;
      i--
    ) {
      days.push({
        date: new Date(
          year,
          month - 1,
          getDaysInMonth(
            new Date(
              year,
              month - 1,
              1
            )
          ) - i
        ),
        currentMonth: false,
      });
    }

    for (
      let i = 1;
      i <= daysInMonth;
      i++
    ) {
      days.push({
        date: new Date(
          year,
          month,
          i
        ),
        currentMonth: true,
      });
    }

    let nextDay = 1;

    while (days.length < 42) {
      days.push({
        date: new Date(
          year,
          month + 1,
          nextDay
        ),
        currentMonth: false,
      });

      nextDay++;
    }

    return days;
  }, [selectedDate]);

  /* =======================================================
     QUEST DATE MATCHING
  ======================================================= */

  const getQuestsForDate = (
    date: Date
  ) => {
    const key =
      formatDateKey(date);

    return quests.filter(
      (quest) => {
        if (!quest.deadline) {
          return false;
        }

        return (
          quest.deadline.slice(0, 10) ===
          key
        );
      }
    );
  };

  /* =======================================================
     STATS
  ======================================================= */

  const totalTasks =
    quests.length;

  const completedTasks =
    quests.filter(
      (quest) =>
        quest.status ===
        "completed"
    ).length;

  const dueThisWeek =
    quests.filter(
      (quest) =>
        quest.deadline &&
        weekDays.some(
          (day) =>
            quest.deadline!.slice(
              0,
              10
            ) ===
            formatDateKey(day)
        )
    ).length;

  const overdueTasks =
    quests.filter(
      (quest) => {
        if (
          !quest.deadline ||
          quest.status ===
            "completed"
        ) {
          return false;
        }

        return (
          new Date(
            quest.deadline
          ).getTime() <
          Date.now()
        );
      }
    ).length;

  /* =======================================================
     SUBJECT OPTIONS
  ======================================================= */

  const subjects = Array.from(
    new Set(
      quests
        .map(
          (quest) =>
            quest.subject
        )
        .filter(Boolean) as string[]
    )
  );

  /* =======================================================
     FILTERED QUESTS
  ======================================================= */

  const filteredQuests =
    quests.filter(
      (quest) => {
        const matchesStatus =
          statusFilter === "all" ||
          (statusFilter ===
            "completed" &&
            quest.status ===
              "completed") ||
          (statusFilter ===
            "in-progress" &&
            quest.status ===
              "in_progress") ||
          (statusFilter ===
            "not-started" &&
            quest.status ===
              "pending") ||
          (statusFilter ===
            "overdue" &&
            quest.deadline &&
            quest.status !==
              "completed" &&
            new Date(
              quest.deadline
            ).getTime() <
              Date.now());

        const matchesSubject =
          subjectFilter ===
            "all" ||
          quest.subject ===
            subjectFilter;

        const search =
          searchQuery
            .trim()
            .toLowerCase();

        const matchesSearch =
          !search ||
          quest.title
            .toLowerCase()
            .includes(search) ||
          (quest.subject ??
            "")
            .toLowerCase()
            .includes(search) ||
          (quest.description ??
            "")
            .toLowerCase()
            .includes(search);

        return (
          matchesStatus &&
          matchesSubject &&
          matchesSearch
        );
      }
    );

  /* =======================================================
     CALENDAR NAVIGATION
  ======================================================= */

  const handlePrevious = () => {
    if (
      calendarView === "week"
    ) {
      setSelectedDate(
        addDays(
          selectedDate,
          -7
        )
      );
    } else {
      setSelectedDate(
        new Date(
          selectedDate.getFullYear(),
          selectedDate.getMonth() -
            1,
          1
        )
      );
    }
  };

  const handleNext = () => {
    if (
      calendarView === "week"
    ) {
      setSelectedDate(
        addDays(
          selectedDate,
          7
        )
      );
    } else {
      setSelectedDate(
        new Date(
          selectedDate.getFullYear(),
          selectedDate.getMonth() +
            1,
          1
        )
      );
    }
  };

  /* =======================================================
     ADD QUEST
  ======================================================= */

  const openAddQuest = () => {
    setEditingQuest(null);

    const selectedDateKey =
      formatDateKey(
        selectedDate
      );

    setNewQuest({
      title: "",
      description: "",
      subject: "",
      deadline: `${selectedDateKey}T19:00`,
      priority: "medium",
      estimated_duration: 60,
    });

    setModalOpened(true);
  };

  /* =======================================================
     EDIT QUEST
  ======================================================= */

  const openEditQuest = (
    quest: Quest
  ) => {
    setEditingQuest(quest);

    let deadline = "";

    if (quest.deadline) {
      const date =
        new Date(
          quest.deadline
        );

      const year =
        date.getFullYear();

      const month =
        pad(
          date.getMonth() + 1
        );

      const day =
        pad(date.getDate());

      const hours =
        pad(date.getHours());

      const minutes =
        pad(date.getMinutes());

      deadline =
        `${year}-${month}-${day}T${hours}:${minutes}`;
    }

    setNewQuest({
      title: quest.title,
      description:
        quest.description ??
        "",
      subject:
        quest.subject ??
        "",
      deadline,
      priority:
        (quest.priority ===
          "high" ||
        quest.priority ===
          "medium" ||
        quest.priority ===
          "low"
          ? quest.priority
          : "medium") as QuestPriority,
      estimated_duration:
        quest.estimated_duration ??
        60,
    });

    setModalOpened(true);
  };

  /* =======================================================
     SAVE QUEST
  ======================================================= */

  const handleSaveQuest =
    async () => {
      if (
        !newQuest.title.trim()
      ) {
        return;
      }

      try {
        setSavingQuest(true);

        /* ================================================
           EDIT EXISTING QUEST
        ================================================ */

        if (editingQuest) {
          const response =
            await fetch(
              `/api/quests/${editingQuest.id}`,
              {
                method: "PATCH",
                headers: {
                  "Content-Type":
                    "application/json",
                },
                body: JSON.stringify({
                  title:
                    newQuest.title,
                  description:
                    newQuest.description ||
                    null,
                  subject:
                    newQuest.subject ||
                    null,
                  deadline:
                    newQuest.deadline ||
                    null,
                  priority:
                    newQuest.priority,
                  estimated_duration:
                    newQuest.estimated_duration,
                }),
              }
            );

          const data =
            await response.json();

          if (!response.ok) {
            throw new Error(
              data.error ||
                "Failed to update quest"
            );
          }

          await loadQuests();

          setSelectedQuest(
            data.quest
          );
        }

        /* ================================================
           CREATE NEW QUEST
        ================================================ */

        else {
          const response =
            await fetch(
              "/api/quests",
              {
                method: "POST",
                headers: {
                  "Content-Type":
                    "application/json",
                },
                body: JSON.stringify({
                  title:
                    newQuest.title,
                  description:
                    newQuest.description ||
                    null,
                  subject:
                    newQuest.subject ||
                    null,
                  deadline:
                    newQuest.deadline ||
                    null,
                  priority:
                    newQuest.priority,
                  estimated_duration:
                    newQuest.estimated_duration,
                  checklist: [],
                  status:
                    "pending",
                }),
              }
            );

          const data =
            await response.json();

          if (!response.ok) {
            throw new Error(
              data.error ||
                "Failed to create quest"
            );
          }

          await loadQuests();

          setSelectedQuest(
            data.quest
          );
        }

        setModalOpened(false);
      } catch (error) {
        console.error(
          "Save quest error:",
          error
        );

        alert(
          error instanceof Error
            ? error.message
            : "Failed to save quest."
        );
      } finally {
        setSavingQuest(false);
      }
    };

  /* =======================================================
     DELETE QUEST
  ======================================================= */

  const handleDeleteQuest =
    async () => {
      if (!editingQuest) {
        return;
      }

      try {
        setDeletingQuest(true);

        const response =
          await fetch(
            `/api/quests/${editingQuest.id}`,
            {
              method: "DELETE",
            }
          );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data.error ||
              "Failed to delete quest"
          );
        }

        await loadQuests();

        if (
          selectedQuest?.id ===
          editingQuest.id
        ) {
          setSelectedQuest(null);
        }

        setModalOpened(false);
      } catch (error) {
        console.error(
          "Delete quest error:",
          error
        );

        alert(
          error instanceof Error
            ? error.message
            : "Failed to delete quest."
        );
      } finally {
        setDeletingQuest(false);
      }
    };

  /* =======================================================
     COMPLETE QUEST
  ======================================================= */

  const handleCompleteQuest =
    async (
      quest: Quest
    ) => {
      try {
        setCompletingQuest(
          true
        );

        const response =
          await fetch(
            `/api/quests/${quest.id}/complete`,
            {
              method: "PATCH",
            }
          );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data.error ||
              "Failed to complete quest"
          );
        }

        console.log(
          "Quest completed:",
          data
        );

        await loadQuests();

        setSelectedQuest(
          null
        );
      } catch (error) {
        console.error(
          "Complete quest error:",
          error
        );

        alert(
          error instanceof Error
            ? error.message
            : "Failed to complete quest."
        );
      } finally {
        setCompletingQuest(
          false
        );
      }
    };

  /* =======================================================
     REGENERATE PLAN
  ======================================================= */

  const handleRegeneratePlan =
    async () => {
      try {
        setGeneratingPlan(
          true
        );

        const response =
          await fetch(
            "/api/schedule/generate",
            {
              method: "POST",
            }
          );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data.error ||
              "Failed to regenerate plan"
          );
        }

        console.log(
          "Generated schedule:",
          data
        );

        alert(
          `${data.scheduled_count ?? 0} quest(s) scheduled successfully.`
        );

        await loadQuests();
      } catch (error) {
        console.error(
          "Regenerate plan error:",
          error
        );

        alert(
          error instanceof Error
            ? error.message
            : "Failed to regenerate schedule."
        );
      } finally {
        setGeneratingPlan(
          false
        );
      }
    };

  /* =======================================================
     CHECKLIST
  ======================================================= */

  const handleToggleChecklist =
    (
      questId: string,
      checklistIndex: number
    ) => {
      console.log(
        "Checklist clicked",
        questId,
        checklistIndex
      );

      /*
       * Your current backend does not expose a
       * dedicated checklist endpoint.
       *
       * We leave this UI-only until the backend
       * supports checklist updates.
       */
    };

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <Box
      bg="#f5f5f5"
      mih="calc(100vh - 72px)"
      px={{
        base: "sm",
        md: "lg",
      }}
      py="lg"
    >
      <Stack
        maw={1500}
        mx="auto"
        gap="md"
      >
        {/* =================================================
            PAGE HEADER
        ================================================= */}

        <Group
          justify="space-between"
          align="flex-start"
        >
          <Box>
            <Text
              fw={700}
              size="xl"
              c="#222"
            >
              Quest Calendar
            </Text>

            <Text
              size="xs"
              c="dimmed"
            >
              Plan your learning quests
              and stay on track.
            </Text>
          </Box>

          <Group gap="xs">
            <TextInput
              placeholder="Search quests..."
              size="xs"
              w={230}
              value={searchQuery}
              onChange={(event) =>
                setSearchQuery(
                  event.currentTarget
                    .value
                )
              }
            />

            <Badge
              variant="outline"
              color="gray"
              size="lg"
              leftSection={
                <Sparkles
                  size={12}
                />
              }
            >
              {totalTasks}
            </Badge>

            <Badge
              variant="outline"
              color="gray"
              size="lg"
              leftSection={
                <Trophy
                  size={12}
                />
              }
            >
              {completedTasks}
            </Badge>

            <Badge
              variant="outline"
              color="gray"
              size="lg"
              leftSection={
                <Flame
                  size={12}
                />
              }
            >
              {overdueTasks}
            </Badge>
          </Group>
        </Group>

        {/* =================================================
            MAIN TABS
        ================================================= */}

        <Tabs
          value={activeTab}
          onChange={setActiveTab}
          color="dark"
          variant="default"
        >
          <Tabs.List>
            <Tabs.Tab value="calendar">
              Calendar View
            </Tabs.Tab>

            <Tabs.Tab value="quests">
              Quest List
            </Tabs.Tab>

            <Tabs.Tab value="modules">
              Modules
            </Tabs.Tab>
          </Tabs.List>

          {/* =================================================
              CALENDAR VIEW
          ================================================= */}

          <Tabs.Panel
            value="calendar"
            pt="md"
          >
            <Stack gap="md">
              {/* Calendar Controls */}

              <Group
                justify="space-between"
              >
                <Group gap="xs">
                  <Button
                    variant="subtle"
                    size="compact-sm"
                    px={4}
                    onClick={
                      handlePrevious
                    }
                  >
                    <ChevronLeft
                      size={16}
                    />
                  </Button>

                  <Text
                    fw={600}
                    size="sm"
                  >
                    {calendarView ===
                    "week"
                      ? `${formatMonthYear(
                          weekDays[0]
                        )}`
                      : formatMonthYear(
                          selectedDate
                        )}
                  </Text>

                  <Button
                    variant="subtle"
                    size="compact-sm"
                    px={4}
                    onClick={
                      handleNext
                    }
                  >
                    <ChevronRight
                      size={16}
                    />
                  </Button>
                </Group>

                <Group gap="xs">
                  <Group
                    gap={0}
                    style={{
                      border:
                        "1px solid #d9d9d9",
                      borderRadius: 20,
                      overflow:
                        "hidden",
                    }}
                  >
                    <Button
                      size="compact-sm"
                      radius={0}
                      variant={
                        calendarView ===
                        "month"
                          ? "filled"
                          : "subtle"
                      }
                      color="dark"
                      onClick={() =>
                        setCalendarView(
                          "month"
                        )
                      }
                    >
                      Month
                    </Button>

                    <Button
                      size="compact-sm"
                      radius={0}
                      variant={
                        calendarView ===
                        "week"
                          ? "filled"
                          : "subtle"
                      }
                      color="dark"
                      onClick={() =>
                        setCalendarView(
                          "week"
                        )
                      }
                    >
                      Week
                    </Button>
                  </Group>

                  <Button
                    size="xs"
                    color="dark"
                    leftSection={
                      <Plus size={14} />
                    }
                    onClick={
                      openAddQuest
                    }
                  >
                    Add Quest
                  </Button>

                  <Button
                    size="xs"
                    variant="filled"
                    color="dark"
                    leftSection={
                      <RefreshCw
                        size={14}
                      />
                    }
                    loading={
                      generatingPlan
                    }
                    onClick={
                      handleRegeneratePlan
                    }
                  >
                    Regenerate Plan
                  </Button>
                </Group>
              </Group>

              {/* Loading */}

              {loadingQuests && (
                <Paper
                  withBorder
                  radius="md"
                  p="md"
                >
                  <Text
                    size="sm"
                    c="dimmed"
                    ta="center"
                  >
                    Loading quests...
                  </Text>
                </Paper>
              )}

              {/* Calendar + Details */}

              <SimpleGrid
                cols={{
                  base: 1,
                  lg: 3,
                }}
                spacing="md"
              >
                {/* CALENDAR */}

                <Paper
                  withBorder
                  radius="md"
                  p="sm"
                  style={{
                    gridColumn:
                      "span 2",
                  }}
                >
                  {calendarView ===
                  "week" ? (
                    <Box
                      style={{
                        display:
                          "grid",
                        gridTemplateColumns:
                          "repeat(7, minmax(0, 1fr))",
                        gap: 6,
                      }}
                    >
                      {weekDays.map(
                        (day) => {
                          const questsForDay =
                            getQuestsForDate(
                              day
                            );

                          const isSelected =
                            formatDateKey(
                              day
                            ) ===
                            formatDateKey(
                              selectedDate
                            );

                          return (
                            <Box
                              key={formatDateKey(
                                day
                              )}
                            >
                              <Text
                                ta="center"
                                size="xs"
                                fw={600}
                                c="dimmed"
                                mb={6}
                              >
                                {day.toLocaleDateString(
                                  "en-US",
                                  {
                                    weekday:
                                      "short",
                                  }
                                )}
                              </Text>

                              <Paper
                                withBorder
                                radius="sm"
                                p={6}
                                mih={205}
                                style={{
                                  backgroundColor:
                                    isSelected
                                      ? "#f1f1f1"
                                      : "#fff",
                                  cursor:
                                    "pointer",
                                }}
                                onClick={() =>
                                  setSelectedDate(
                                    day
                                  )
                                }
                              >
                                <Text
                                  ta="center"
                                  size="xs"
                                  fw={700}
                                  mb="xs"
                                >
                                  {day.getDate()}
                                </Text>

                                <Stack gap={5}>
                                  {questsForDay.map(
                                    (
                                      quest
                                    ) => (
                                      <Box
                                        key={
                                          quest.id
                                        }
                                        p={6}
                                        style={{
                                          background:
                                            selectedQuest?.id ===
                                            quest.id
                                              ? "#e9e9e9"
                                              : "#f5f5f5",
                                          borderLeft: `3px solid ${getPriorityColor(
                                            quest.priority
                                          )}`,
                                          borderRadius: 4,
                                          cursor:
                                            "pointer",
                                        }}
                                        onClick={(
                                          event
                                        ) => {
                                          event.stopPropagation();

                                          setSelectedQuest(
                                            quest
                                          );
                                        }}
                                      >
                                        <Text
                                          size="xs"
                                          fw={600}
                                          lineClamp={
                                            2
                                          }
                                        >
                                          {
                                            quest.title
                                          }
                                        </Text>

                                        <Text
                                          size="xs"
                                          c="dimmed"
                                        >
                                          {formatQuestTime(
                                            quest.deadline
                                          )}
                                        </Text>
                                      </Box>
                                    )
                                  )}
                                </Stack>
                              </Paper>
                            </Box>
                          );
                        }
                      )}
                    </Box>
                  ) : (
                    <Box
                      style={{
                        display:
                          "grid",
                        gridTemplateColumns:
                          "repeat(7, minmax(0, 1fr))",
                        gap: 6,
                      }}
                    >
                      {monthDays.map(
                        (
                          day,
                          index
                        ) => {
                          const questsForDay =
                            getQuestsForDate(
                              day.date
                            );

                          return (
                            <Box
                              key={index}
                            >
                              <Paper
                                withBorder
                                radius="sm"
                                p={6}
                                mih={105}
                                style={{
                                  opacity:
                                    day.currentMonth
                                      ? 1
                                      : 0.4,
                                  cursor:
                                    "pointer",
                                }}
                                onClick={() =>
                                  setSelectedDate(
                                    day.date
                                  )
                                }
                              >
                                <Text
                                  size="xs"
                                  fw={600}
                                  mb={5}
                                >
                                  {day.date.getDate()}
                                </Text>

                                <Stack gap={4}>
                                  {questsForDay
                                    .slice(
                                      0,
                                      3
                                    )
                                    .map(
                                      (
                                        quest
                                      ) => (
                                        <Box
                                          key={
                                            quest.id
                                          }
                                          px={5}
                                          py={3}
                                          style={{
                                            background:
                                              "#f1f1f1",
                                            borderLeft: `3px solid ${getPriorityColor(
                                              quest.priority
                                            )}`,
                                            borderRadius: 3,
                                          }}
                                          onClick={(
                                            event
                                          ) => {
                                            event.stopPropagation();

                                            setSelectedQuest(
                                              quest
                                            );
                                          }}
                                        >
                                          <Text
                                            size="xs"
                                            lineClamp={
                                              1
                                            }
                                          >
                                            {
                                              quest.title
                                            }
                                          </Text>
                                        </Box>
                                      )
                                    )}
                                </Stack>
                              </Paper>
                            </Box>
                          );
                        }
                      )}
                    </Box>
                  )}
                </Paper>

                {/* QUEST DETAILS */}

                <Paper
                  withBorder
                  radius="md"
                  p="md"
                  mih={250}
                >
                  <Group
                    justify="space-between"
                    mb="sm"
                  >
                    <Text
                      fw={700}
                      size="sm"
                    >
                      Quest Details
                    </Text>

                    {selectedQuest && (
                      <Button
                        variant="subtle"
                        size="compact-xs"
                        onClick={() =>
                          setSelectedQuest(
                            null
                          )
                        }
                      >
                        <X
                          size={14}
                        />
                      </Button>
                    )}
                  </Group>

                  <Divider mb="sm" />

                  {selectedQuest ? (
                    <Stack gap="xs">
                      <Text
                        fw={700}
                        size="sm"
                      >
                        {
                          selectedQuest.title
                        }
                      </Text>

                      <Text
                        size="xs"
                        c="dimmed"
                      >
                        {selectedQuest.description ||
                          "No description provided."}
                      </Text>

                      <Text size="xs">
                        <b>
                          Subject:
                        </b>{" "}
                        {selectedQuest.subject ||
                          "General"}
                      </Text>

                      <Text size="xs">
                        <b>
                          Estimated
                          Duration:
                        </b>{" "}
                        {selectedQuest.estimated_duration ??
                          0}{" "}
                        minutes
                      </Text>

                      <Text size="xs">
                        <b>
                          Priority:
                        </b>{" "}
                        {getPriorityLabel(
                          selectedQuest.priority
                        )}
                      </Text>

                      <Text size="xs">
                        <b>
                          Status:
                        </b>{" "}
                        {getStatusLabel(
                          selectedQuest.status
                        )}
                      </Text>

                      <Text size="xs">
                        <b>
                          Deadline:
                        </b>{" "}
                        {formatQuestDate(
                          selectedQuest.deadline
                        )}
                        <br />
                        {formatQuestTime(
                          selectedQuest.deadline
                        )}
                      </Text>

                      {selectedQuest.checklist &&
                        selectedQuest
                          .checklist
                          .length >
                          0 && (
                          <Box>
                            <Text
                              size="xs"
                              fw={700}
                              mb={3}
                            >
                              Checklist:
                            </Text>

                            <Stack gap={4}>
                              {selectedQuest.checklist.map(
                                (
                                  item,
                                  index
                                ) => (
                                  <Checkbox
                                    key={`${selectedQuest.id}-${index}`}
                                    size="xs"
                                    label={
                                      item
                                    }
                                    onChange={() =>
                                      handleToggleChecklist(
                                        selectedQuest.id,
                                        index
                                      )
                                    }
                                  />
                                )
                              )}
                            </Stack>
                          </Box>
                        )}

                      <Text
                        size="xs"
                        fw={700}
                        mt="xs"
                      >
                        Actions:
                      </Text>

                      <Group gap={5}>
                        <Button
                          size="compact-xs"
                          color="dark"
                          onClick={() =>
                            openEditQuest(
                              selectedQuest
                            )
                          }
                        >
                          Edit Quest
                        </Button>

                        <Button
                          size="compact-xs"
                          variant="outline"
                          color="dark"
                          onClick={() =>
                            console.log(
                              "Ask Wasi:",
                              selectedQuest
                            )
                          }
                        >
                          Ask Wasi
                        </Button>
                      </Group>

                      {selectedQuest.status !==
                        "completed" && (
                        <Button
                          size="compact-xs"
                          variant="outline"
                          color="dark"
                          loading={
                            completingQuest
                          }
                          onClick={() =>
                            handleCompleteQuest(
                              selectedQuest
                            )
                          }
                        >
                          Mark Done
                        </Button>
                      )}

                      <Button
                        size="compact-xs"
                        variant="outline"
                        color="dark"
                        onClick={() =>
                          openEditQuest(
                            selectedQuest
                          )
                        }
                      >
                        Edit / Reschedule
                      </Button>
                    </Stack>
                  ) : (
                    <Text
                      size="sm"
                      c="dimmed"
                      ta="center"
                      py="xl"
                    >
                      Select a quest to
                      view its details.
                    </Text>
                  )}
                </Paper>
              </SimpleGrid>

              {/* =================================================
                  LOWER CARDS
              ================================================= */}

              <SimpleGrid
                cols={{
                  base: 1,
                  md: 3,
                }}
              >
                <Paper
                  withBorder
                  radius="md"
                  p="md"
                  mih={90}
                >
                  <Text
                    fw={700}
                    size="xs"
                  >
                    Quest Queue
                  </Text>

                  <Text
                    size="xs"
                    c="dimmed"
                    mt="xs"
                  >
                    {totalTasks} quests
                    currently loaded.
                  </Text>
                </Paper>

                <Paper
                  withBorder
                  radius="md"
                  p="md"
                  mih={90}
                >
                  <Text
                    fw={700}
                    size="xs"
                  >
                    Procrastination
                    Nudge
                  </Text>

                  <Text
                    size="xs"
                    c="dimmed"
                    mt="xs"
                  >
                    {overdueTasks > 0
                      ? `You have ${overdueTasks} overdue quest(s).`
                      : "You're caught up with your quests."}
                  </Text>
                </Paper>

                <Paper
                  withBorder
                  radius="md"
                  p="md"
                  mih={90}
                >
                  <Text
                    fw={700}
                    size="xs"
                  >
                    Weekly Progress
                  </Text>

                  <Group
                    justify="space-between"
                    mt="xs"
                  >
                    <Text size="xs">
                      {completedTasks} /{" "}
                      {totalTasks}{" "}
                      completed
                    </Text>

                    <Trophy
                      size={16}
                    />
                  </Group>
                </Paper>
              </SimpleGrid>
            </Stack>
          </Tabs.Panel>

          {/* =================================================
              QUEST LIST
          ================================================= */}

          <Tabs.Panel
            value="quests"
            pt="md"
          >
            <Stack gap="md">
              {/* Statistics */}

              <SimpleGrid
                cols={{
                  base: 1,
                  sm: 2,
                  md: 4,
                }}
              >
                <Paper
                  withBorder
                  radius="md"
                  p="md"
                >
                  <Text
                    size="xs"
                    c="dimmed"
                  >
                    Total Tasks
                  </Text>

                  <Text
                    fw={700}
                    size="xl"
                  >
                    {totalTasks}
                  </Text>

                  <Text
                    size="xs"
                    c="dimmed"
                  >
                    From Quest API
                  </Text>
                </Paper>

                <Paper
                  withBorder
                  radius="md"
                  p="md"
                >
                  <Text
                    size="xs"
                    c="dimmed"
                  >
                    Due This Week
                  </Text>

                  <Text
                    fw={700}
                    size="xl"
                  >
                    {dueThisWeek}
                  </Text>

                  <Text
                    size="xs"
                    c="dimmed"
                  >
                    Based on deadlines
                  </Text>
                </Paper>

                <Paper
                  withBorder
                  radius="md"
                  p="md"
                >
                  <Text
                    size="xs"
                    c="dimmed"
                  >
                    Completed
                  </Text>

                  <Text
                    fw={700}
                    size="xl"
                  >
                    {completedTasks}
                  </Text>

                  <Text
                    size="xs"
                    c="dimmed"
                  >
                    Completed quests
                  </Text>
                </Paper>

                <Paper
                  withBorder
                  radius="md"
                  p="md"
                >
                  <Text
                    size="xs"
                    c="dimmed"
                  >
                    Overdue
                  </Text>

                  <Text
                    fw={700}
                    size="xl"
                  >
                    {overdueTasks}
                  </Text>

                  <Text
                    size="xs"
                    c="dimmed"
                  >
                    Needs attention
                  </Text>
                </Paper>
              </SimpleGrid>

              {/* Filters */}

              <Group
                justify="space-between"
              >
                <Group gap="xs">
                  {[
                    [
                      "all",
                      "All",
                    ],
                    [
                      "not-started",
                      "Due Soon",
                    ],
                    [
                      "overdue",
                      "Overdue",
                    ],
                    [
                      "completed",
                      "Completed",
                    ],
                    [
                      "in-progress",
                      "In Progress",
                    ],
                  ].map(
                    ([
                      value,
                      label,
                    ]) => (
                      <Button
                        key={value}
                        size="compact-xs"
                        variant={
                          statusFilter ===
                          value
                            ? "filled"
                            : "subtle"
                        }
                        color="dark"
                        onClick={() =>
                          setStatusFilter(
                            value
                          )
                        }
                      >
                        {label}
                      </Button>
                    )
                  )}
                </Group>

                <Group gap="xs">
                  <Select
                    size="xs"
                    placeholder="Subject"
                    clearable
                    data={[
                      {
                        value:
                          "all",
                        label:
                          "All Subjects",
                      },
                      ...subjects.map(
                        (
                          subject
                        ) => ({
                          value:
                            subject,
                          label:
                            subject,
                        })
                      ),
                    ]}
                    value={
                      subjectFilter ===
                      "all"
                        ? null
                        : subjectFilter
                    }
                    onChange={(
                      value
                    ) =>
                      setSubjectFilter(
                        value ||
                          "all"
                      )
                    }
                  />

                  <Button
                    size="compact-xs"
                    color="dark"
                    leftSection={
                      <Plus
                        size={13}
                      />
                    }
                    onClick={
                      openAddQuest
                    }
                  >
                    Add Quest
                  </Button>
                </Group>
              </Group>

              {/* Quest Columns */}

              <SimpleGrid
                cols={{
                  base: 1,
                  md: 3,
                }}
                spacing="md"
              >
                {[
                  "pending",
                  "in_progress",
                  "completed",
                ].map(
                  (status) => {
                    const statusQuests =
                      filteredQuests.filter(
                        (quest) =>
                          quest.status ===
                          status
                      );

                    return (
                      <Paper
                        key={
                          status
                        }
                        withBorder
                        radius="md"
                        p="sm"
                        mih={400}
                      >
                        <Group
                          justify="space-between"
                          mb="sm"
                        >
                          <Text
                            fw={700}
                            size="sm"
                          >
                            {getStatusLabel(
                              status
                            )}
                          </Text>

                          <Badge
                            size="sm"
                            color={getStatusColor(
                              status
                            )}
                          >
                            {
                              statusQuests.length
                            }
                          </Badge>
                        </Group>

                        <Stack gap="xs">
                          {statusQuests.map(
                            (
                              quest
                            ) => (
                              <Paper
                                key={
                                  quest.id
                                }
                                withBorder
                                radius="sm"
                                p="sm"
                                style={{
                                  cursor:
                                    "pointer",
                                  borderLeft: `4px solid ${getPriorityColor(
                                    quest.priority
                                  )}`,
                                }}
                                onClick={() => {
                                  setSelectedQuest(
                                    quest
                                  );

                                  setActiveTab(
                                    "calendar"
                                  );
                                }}
                              >
                                <Text
                                  fw={600}
                                  size="sm"
                                >
                                  {
                                    quest.title
                                  }
                                </Text>

                                <Text
                                  size="xs"
                                  c="dimmed"
                                  mt={3}
                                >
                                  {quest.subject ||
                                    "General"}
                                </Text>

                                <Group
                                  justify="space-between"
                                  mt="sm"
                                >
                                  <Text
                                    size="xs"
                                  >
                                    {formatQuestDate(
                                      quest.deadline
                                    )}
                                  </Text>

                                  <Badge
                                    size="xs"
                                    color={
                                      quest.priority ===
                                      "high"
                                        ? "red"
                                        : quest.priority ===
                                          "medium"
                                        ? "orange"
                                        : "blue"
                                    }
                                  >
                                    {getPriorityLabel(
                                      quest.priority
                                    ).replace(
                                      " Priority",
                                      ""
                                    )}
                                  </Badge>
                                </Group>

                                <Text
                                  size="xs"
                                  c="dimmed"
                                  mt={4}
                                >
                                  {formatQuestTime(
                                    quest.deadline
                                  )}
                                </Text>
                              </Paper>
                            )
                          )}

                          {statusQuests.length ===
                            0 && (
                            <Text
                              size="xs"
                              c="dimmed"
                              ta="center"
                              py="xl"
                            >
                              No quests
                              here.
                            </Text>
                          )}
                        </Stack>
                      </Paper>
                    );
                  }
                )}
              </SimpleGrid>
            </Stack>
          </Tabs.Panel>

          {/* =================================================
              MODULES
          ================================================= */}

          <Tabs.Panel
            value="modules"
            pt="md"
          >
            <Stack gap="md">
              <Group justify="flex-end">
                <Button
                  size="xs"
                  color="dark"
                  leftSection={
                    <Upload
                      size={14}
                    />
                  }
                >
                  Upload Material
                </Button>
              </Group>

              <SimpleGrid
                cols={{
                  base: 1,
                  sm: 2,
                  md: 3,
                }}
                spacing="md"
              >
                {MODULES.map(
                  (module) => (
                    <Paper
                      key={module.id}
                      withBorder
                      radius="md"
                      p="md"
                      mih={170}
                    >
                      <Stack gap="xs">
                        <Group
                          justify="space-between"
                          align="flex-start"
                        >
                          <Box>
                            <Text
                              size="xs"
                              c="dimmed"
                              fw={600}
                            >
                              {
                                module.code
                              }
                            </Text>

                            <Text fw={700}>
                              {
                                module.title
                              }
                            </Text>
                          </Box>

                          <BookOpen
                            size={18}
                          />
                        </Group>

                        <Text
                          size="xs"
                          c="dimmed"
                        >
                          {
                            module.description
                          }
                        </Text>

                        <Divider />

                        <Text size="xs">
                          <b>
                            Instructor:
                          </b>{" "}
                          {
                            module.instructor
                          }
                        </Text>

                        <Text size="xs">
                          <b>
                            Schedule:
                          </b>{" "}
                          {
                            module.schedule
                          }
                        </Text>
                      </Stack>
                    </Paper>
                  )
                )}
              </SimpleGrid>
            </Stack>
          </Tabs.Panel>
        </Tabs>

        {/* =================================================
            ADD / EDIT QUEST MODAL
        ================================================= */}

        <Modal
          opened={modalOpened}
          onClose={() =>
            setModalOpened(false)
          }
          title={
            <Text fw={700}>
              {editingQuest
                ? "Edit Quest"
                : "Add Quest"}
            </Text>
          }
          centered
          size="md"
        >
          <Stack gap="md">
            <TextInput
              label="Quest Title"
              placeholder="Enter quest title"
              required
              value={
                newQuest.title
              }
              onChange={(
                event
              ) =>
                setNewQuest({
                  ...newQuest,
                  title:
                    event
                      .currentTarget
                      .value,
                })
              }
            />

            <Textarea
              label="Description"
              placeholder="Describe the quest..."
              minRows={3}
              value={
                newQuest.description
              }
              onChange={(
                event
              ) =>
                setNewQuest({
                  ...newQuest,
                  description:
                    event
                      .currentTarget
                      .value,
                })
              }
            />

            <Select
              label="Subject"
              placeholder="Select subject"
              searchable
              clearable
              data={MODULES.map(
                (module) => ({
                  value:
                    module.title,
                  label: `${module.code} - ${module.title}`,
                })
              )}
              value={
                newQuest.subject ||
                null
              }
              onChange={(
                value
              ) =>
                setNewQuest({
                  ...newQuest,
                  subject:
                    value || "",
                })
              }
            />

            <TextInput
              label="Deadline"
              type="datetime-local"
              value={
                newQuest.deadline
              }
              onChange={(
                event
              ) =>
                setNewQuest({
                  ...newQuest,
                  deadline:
                    event
                      .currentTarget
                      .value,
                })
              }
            />

            <NumberInput
              label="Estimated Duration"
              description="How many minutes this quest should take."
              min={15}
              step={15}
              value={
                newQuest.estimated_duration
              }
              onChange={(
                value
              ) =>
                setNewQuest({
                  ...newQuest,
                  estimated_duration:
                    typeof value ===
                    "number"
                      ? value
                      : 60,
                })
              }
            />

            <Select
              label="Priority"
              data={[
                {
                  value: "low",
                  label:
                    "Low Priority",
                },
                {
                  value: "medium",
                  label:
                    "Medium Priority",
                },
                {
                  value: "high",
                  label:
                    "High Priority",
                },
              ]}
              value={
                newQuest.priority
              }
              onChange={(
                value
              ) =>
                setNewQuest({
                  ...newQuest,
                  priority:
                    (value ||
                      "medium") as QuestPriority,
                })
              }
            />

            <Group
              justify="space-between"
              mt="md"
            >
              {editingQuest ? (
                <Button
                  color="red"
                  variant="light"
                  loading={
                    deletingQuest
                  }
                  onClick={
                    handleDeleteQuest
                  }
                >
                  Delete
                </Button>
              ) : (
                <Box />
              )}

              <Group>
                <Button
                  variant="subtle"
                  onClick={() =>
                    setModalOpened(
                      false
                    )
                  }
                >
                  Cancel
                </Button>

                <Button
                  color="dark"
                  loading={
                    savingQuest
                  }
                  onClick={
                    handleSaveQuest
                  }
                >
                  {editingQuest
                    ? "Save Changes"
                    : "Create Quest"}
                </Button>
              </Group>
            </Group>
          </Stack>
        </Modal>
      </Stack>
    </Box>
  );
}