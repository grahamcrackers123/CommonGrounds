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

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { useRouter } from "next/navigation";

/* =========================================================
   TYPES
========================================================= */

type QuestStatus =
  | "pending"
  | "in_progress"
  | "completed";

type QuestPriority =
  | "low"
  | "medium"
  | "high";

type Quest = {
  id: string;
  user_id?: string;

  title: string;
  description: string | null;
  subject: string | null;

  deadline: string | null;

  priority: QuestPriority;
  status: QuestStatus;

  estimated_duration: number | null;
  checklist: string[];

  startTime?: string;
  endTime?: string;

  reward?: number;
  energy?: number;
  reason?: string;
  materials?: string[];
};

type Material = {
  id: string;
  filename: string;
  storage_path: string;
  subject: string | null;
  quest_id: string | null;
  file_type: string;
  file_size: number;
  created_at: string;
};

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

const addDays = (
  date: Date,
  amount: number
) => {
  const result = new Date(date);

  result.setDate(
    result.getDate() + amount
  );

  return result;
};

const getStartOfWeek = (date: Date) => {
  const result = new Date(date);
  const day = result.getDay();

  result.setDate(
    result.getDate() - day
  );

  result.setHours(0, 0, 0, 0);

  return result;
};

const getDaysInMonth = (date: Date) =>
  new Date(
    date.getFullYear(),
    date.getMonth() + 1,
    0
  ).getDate();

const getPriorityColor = (
  priority: string
) => {
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

const getPriorityLabel = (
  priority: string
) => {
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

const getStatusLabel = (
  status: string
) => {
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

const getStatusColor = (
  status: string
) => {
  switch (status) {
    case "completed":
      return "green";

    case "in_progress":
      return "blue";

    default:
      return "gray";
  }
};

const formatQuestTime = (
  deadline: string | null
) => {
  if (!deadline) {
    return "No time";
  }

  return new Date(
    deadline
  ).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
};

const formatQuestDate = (
  deadline: string | null
) => {
  if (!deadline) {
    return "No deadline";
  }

  return new Date(
    deadline
  ).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

/* =========================================================
   COMPONENT
========================================================= */

export default function QuestCalendarPage() {
  const router = useRouter();

  /* =======================================================
     GENERAL STATE
  ======================================================= */

  const [activeTab, setActiveTab] =
    useState<string | null>("calendar");

  const [selectedDate, setSelectedDate] =
    useState(new Date());

  const [calendarView, setCalendarView] =
    useState<"month" | "week">("week");

  /*
   * Current time is refreshed every 60 seconds.
   * This prevents overdue calculations from becoming stale
   * while the page remains open.
   */
  const [now, setNow] =
    useState(() => new Date());

  /* =======================================================
     QUEST STATE
  ======================================================= */

  const [quests, setQuests] =
    useState<Quest[]>([]);

  const [selectedQuest, setSelectedQuest] =
    useState<Quest | null>(null);

  const [loadingQuests, setLoadingQuests] =
    useState(true);

  const [generatingPlan, setGeneratingPlan] =
    useState(false);

  const [updatingQuest, setUpdatingQuest] =
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
     MATERIAL STATE
  ======================================================= */

  const [materials, setMaterials] =
    useState<Material[]>([]);

  /* =======================================================
     UPLOAD STATE
  ======================================================= */

  const fileInputRef =
    useRef<HTMLInputElement | null>(null);

  const [uploadingMaterial, setUploadingMaterial] =
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

  const [newQuest, setNewQuest] =
    useState({
      title: "",
      description: "",
      subject: "",
      deadline: "",
      priority:
        "medium" as QuestPriority,
      estimated_duration: 60,
    });

  /* =======================================================
     LOAD QUESTS
  ======================================================= */

  const loadQuests = useCallback(
    async () => {
      try {
        setLoadingQuests(true);

        const response = await fetch(
          "/api/quests",
          {
            cache: "no-store",
          }
        );

        if (!response.ok) {
          throw new Error(
            "Failed to load quests."
          );
        }

        const data =
          await response.json();

        const loadedQuests: Quest[] =
          data.quests ?? [];

        setQuests(loadedQuests);

        /*
         * Keep the selected quest synchronized
         * with the backend after every refresh.
         */
        setSelectedQuest((current) => {
          if (!current) {
            return null;
          }

          return (
            loadedQuests.find(
              (quest) =>
                quest.id === current.id
            ) ?? null
          );
        });

        return loadedQuests;
      } catch (error) {
        console.error(
          "Failed to load quests:",
          error
        );

        return [];
      } finally {
        setLoadingQuests(false);
      }
    },
    []
  );

  useEffect(() => {
    loadQuests();
  }, [loadQuests]);

  /* =======================================================
     LOAD MATERIALS
  ======================================================= */

  useEffect(() => {
    const loadMaterials = async () => {
      try {
        const response = await fetch(
          "/api/materials"
        );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data.error ||
              "Failed to load materials."
          );
        }

        setMaterials(
          Array.isArray(data.materials)
            ? data.materials
            : []
        );
      } catch (error) {
        console.error(
          "Failed to load materials:",
          error
        );

        setMaterials([]);
      }
    };

    loadMaterials();
  }, []);

  /* =======================================================
     CURRENT TIME REFRESH
  ======================================================= */

  useEffect(() => {
    const interval =
      window.setInterval(() => {
        setNow(new Date());
      }, 60_000);

    return () => {
      window.clearInterval(
        interval
      );
    };
  }, []);

  /* =======================================================
     CALENDAR CALCULATIONS
  ======================================================= */

  const weekDays = useMemo(() => {
    const start =
      getStartOfWeek(
        selectedDate
      );

    return Array.from(
      { length: 7 },
      (_, index) =>
        addDays(
          start,
          index
        )
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
      getDaysInMonth(
        selectedDate
      );

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

    while (
      days.length < 42
    ) {
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
        /*
         * Completed quests are removed
         * from the calendar.
         */
        if (
          quest.status ===
          "completed"
        ) {
          return false;
        }

        if (!quest.deadline) {
          return false;
        }

        return (
          quest.deadline.slice(
            0,
            10
          ) === key
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
        quest.status !==
          "completed" &&
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

        /*
         * IMPORTANT:
         * Use the reactive `now` state rather than
         * Date.now() so the UI updates automatically.
         */
        return (
          new Date(
            quest.deadline
          ).getTime() <
          now.getTime()
        );
      }
    ).length;

  /* =======================================================
     SUBJECT OPTIONS
  ======================================================= */

  const subjects =
    Array.from(
      new Set(
        quests
          .map(
            (quest) =>
              quest.subject
          )
          .filter(
            Boolean
          ) as string[]
      )
    );

  /* =======================================================
     SEARCH + FILTER
  ======================================================= */

  const filteredQuests =
    quests.filter(
      (quest) => {
        const search =
          searchQuery
            .trim()
            .toLowerCase();

        const matchesStatus =
          statusFilter ===
            "all" ||
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
              now.getTime());

        const matchesSubject =
          subjectFilter ===
            "all" ||
          quest.subject ===
            subjectFilter;

        const matchesSearch =
          !search ||
          quest.title
            .toLowerCase()
            .includes(search) ||
          (
            quest.subject ??
            ""
          )
            .toLowerCase()
            .includes(search) ||
          (
            quest.description ??
            ""
          )
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
      calendarView ===
      "week"
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
          selectedDate.getMonth() - 1,
          1
        )
      );
    }
  };

  const handleNext = () => {
    if (
      calendarView ===
      "week"
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
          selectedDate.getMonth() + 1,
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
      deadline:
        `${selectedDateKey}T19:00`,
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
    setEditingQuest(
      quest
    );

    let deadline = "";

    if (quest.deadline) {
      const date =
        new Date(
          quest.deadline
        );

      deadline =
        `${date.getFullYear()}-${pad(
          date.getMonth() + 1
        )}-${pad(
          date.getDate()
        )}T${pad(
          date.getHours()
        )}:${pad(
          date.getMinutes()
        )}`;
    }

    setNewQuest({
      title:
        quest.title,

      description:
        quest.description ??
        "",

      subject:
        quest.subject ??
        "",

      deadline,

      priority:
        quest.priority,

      estimated_duration:
        quest.estimated_duration ??
        60,
    });

    setModalOpened(
      true
    );
  };

  /* =======================================================
     SAVE QUEST
  ======================================================= */

  const handleSaveQuest =
    async () => {
      if (
        !newQuest.title.trim()
      ) {
        alert(
          "Please enter a quest title."
        );

        return;
      }

      try {
        setSavingQuest(true);

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
                    newQuest.title.trim(),

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
                "Failed to update quest."
            );
          }
        } else {
          /*
           * New quests always begin as
           * pending / Not Started.
           */
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
                    newQuest.title.trim(),

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
                "Failed to create quest."
            );
          }
        }

        await loadQuests();

        setModalOpened(
          false
        );
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
        setSavingQuest(
          false
        );
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
        setDeletingQuest(
          true
        );

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
              "Failed to delete quest."
          );
        }

        setModalOpened(
          false
        );

        setSelectedQuest(
          null
        );

        await loadQuests();
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
        setDeletingQuest(
          false
        );
      }
    };

  /* =======================================================
     START QUEST
  ======================================================= */

  const handleStartQuest =
    async (
      quest: Quest
    ) => {
      /*
       * START QUEST ONLY WORKS FOR
       * PENDING / NOT STARTED QUESTS.
       */
      if (
        quest.status !==
        "pending"
      ) {
        return;
      }

      try {
        setUpdatingQuest(
          true
        );

        /*
         * Update the backend using the existing
         * PATCH /api/quests/[id] endpoint.
         */
        const response =
          await fetch(
            `/api/quests/${quest.id}`,
            {
              method: "PATCH",
              headers: {
                "Content-Type":
                  "application/json",
              },
              body: JSON.stringify({
                status:
                  "in_progress",
              }),
            }
          );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data.error ||
              "Failed to start quest."
          );
        }

        /*
         * Refresh the entire quest list from
         * the backend.
         */
        const refreshedQuests =
          await loadQuests();

        /*
         * Keep Quest Details synchronized
         * with the actual backend record.
         */
        const refreshedQuest =
          refreshedQuests.find(
            (item) =>
              item.id ===
              quest.id
          );

        setSelectedQuest(
          refreshedQuest ??
            data.quest ??
            null
        );
      } catch (error) {
        console.error(
          "Start quest error:",
          error
        );

        alert(
          error instanceof Error
            ? error.message
            : "Failed to start quest."
        );
      } finally {
        setUpdatingQuest(
          false
        );
      }
    };

  /* =======================================================
     MARK DONE
  ======================================================= */

  const handleCompleteQuest =
    async (
      quest: Quest
    ) => {
      /*
       * MARK DONE ONLY WORKS FOR
       * IN-PROGRESS QUESTS.
       */
      if (
        quest.status !==
        "in_progress"
      ) {
        return;
      }

      try {
        setUpdatingQuest(
          true
        );

        /*
         * Use the existing PATCH endpoint.
         */
        const response =
          await fetch(
            `/api/quests/${quest.id}`,
            {
              method: "PATCH",
              headers: {
                "Content-Type":
                  "application/json",
              },
              body: JSON.stringify({
                status:
                  "completed",
              }),
            }
          );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data.error ||
              "Failed to complete quest."
          );
        }

        /*
         * Refresh from backend so the
         * Quest List and Calendar update.
         */
        const refreshedQuests =
          await loadQuests();

        /*
         * Keep the completed quest selected
         * so its new status is immediately visible.
         */
        const refreshedQuest =
          refreshedQuests.find(
            (item) =>
              item.id ===
              quest.id
          );

        setSelectedQuest(
          refreshedQuest ??
            data.quest ??
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
        setUpdatingQuest(
          false
        );
      }
    };

  /* =======================================================
     ASK WASI
  ======================================================= */

  const handleAskWasi = (
    quest: Quest
  ) => {
    router.push(
      `/askwasi?questId=${encodeURIComponent(
        quest.id
      )}`
    );
  };

  /* =======================================================
     UPLOAD MATERIAL
  ======================================================= */

  const handleUploadMaterial =
    () => {
      fileInputRef.current?.click();
    };

  const handleMaterialSelected =
    async (
      event: React.ChangeEvent<HTMLInputElement>
    ) => {
      const file =
        event.target.files?.[0];

      /*
       * Allow selecting the same file
       * again later.
       */
      event.target.value = "";

      if (!file) {
        return;
      }

      const allowedTypes = [
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "text/plain",
        "text/markdown",
      ];

      const allowedExtensions = [
        ".pdf",
        ".docx",
        ".txt",
        ".md",
      ];

      const lowerName =
        file.name.toLowerCase();

      const validType =
        allowedTypes.includes(
          file.type
        );

      const validExtension =
        allowedExtensions.some(
          (extension) =>
            lowerName.endsWith(
              extension
            )
        );

      if (
        !validType &&
        !validExtension
      ) {
        alert(
          "Please select a PDF, DOCX, TXT, or MD file."
        );

        return;
      }

      if (
        file.size >
        10 * 1024 * 1024
      ) {
        alert(
          "The maximum file size is 10 MB."
        );

        return;
      }

      try {
        setUploadingMaterial(
          true
        );

        const formData =
          new FormData();

        formData.append(
          "file",
          file
        );

        if (selectedQuest) {
          formData.append(
            "questId",
            selectedQuest.id
          );
        }

        const response =
          await fetch(
            "/api/materials",
            {
              method: "POST",
              body: formData,
            }
          );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data.error ||
              "Failed to upload material."
          );
        }

        if (data.material) {
          setMaterials((current) => [
            data.material,
            ...current,
          ]);
        }

        alert(
          "Material uploaded successfully."
        );
      } catch (error) {
        console.error(
          "Upload material error:",
          error
        );

        alert(
          error instanceof Error
            ? error.message
            : "Failed to upload material."
        );
      } finally {
        setUploadingMaterial(
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
              "Failed to regenerate plan."
          );
        }

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
            HEADER
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
                <Sparkles size={12} />
              }
            >
              {totalTasks}
            </Badge>

            <Badge
              variant="outline"
              color="gray"
              size="lg"
              leftSection={
                <Trophy size={12} />
              }
            >
              {completedTasks}
            </Badge>

            <Badge
              variant="outline"
              color="gray"
              size="lg"
              leftSection={
                <Flame size={12} />
              }
            >
              {overdueTasks}
            </Badge>
          </Group>
        </Group>
{/* =================================================
    TABS
================================================= */}

 <Tabs
  value={activeTab}
  onChange={setActiveTab}
  color="dark"
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
              CALENDAR
          ================================================= */}

          <Tabs.Panel
            value="calendar"
            pt="md"
          >
            <Stack gap="md">
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
                      ? formatMonthYear(
                          weekDays[0]
                        )
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

              <SimpleGrid
                cols={{
                  base: 1,
                  lg: 3,
                }}
                spacing="md"
              >
                {/* =================================================
                    CALENDAR GRID
                ================================================= */}

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
                            <Paper
                              key={index}
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
                          );
                        }
                      )}
                    </Box>
                  )}
                </Paper>

                {/* =================================================
                    QUEST DETAILS
                ================================================= */}

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
                        <X size={14} />
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
                          Estimated Duration:
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

                      {selectedQuest.checklist?.length >
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

                      {/* =================================================
                          START QUEST BUTTON
                      ================================================= */}

                      {selectedQuest.status ===
                        "pending" && (
                        <Button
                          size="compact-xs"
                          color="dark"
                          loading={
                            updatingQuest
                          }
                          onClick={() =>
                            handleStartQuest(
                              selectedQuest
                            )
                          }
                        >
                          Start Quest
                        </Button>
                      )}

                      {/* =================================================
                          EDIT + ASK WASI
                      ================================================= */}

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
                            handleAskWasi(
                              selectedQuest
                            )
                          }
                        >
                          Ask Wasi
                        </Button>
                      </Group>

                      {/* =================================================
                          MARK DONE
                      ================================================= */}

                      {selectedQuest.status ===
                        "in_progress" && (
                        <Button
                          size="compact-xs"
                          variant="outline"
                          color="dark"
                          loading={
                            updatingQuest
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

                      {/* =================================================
                          COMPLETED STATE
                      ================================================= */}

                      {selectedQuest.status ===
                        "completed" && (
                        <Badge
                          color="green"
                          variant="light"
                        >
                          Quest Completed
                        </Badge>
                      )}
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

                    <Trophy size={16} />
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
              <Group
                justify="space-between"
              >
                <TextInput
                  placeholder="Search title, subject, or description..."
                  value={searchQuery}
                  onChange={(event) =>
                    setSearchQuery(
                      event.currentTarget
                        .value
                    )
                  }
                  w={350}
                />

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

              <Group gap="xs">
                {[
                  ["all", "All"],
                  [
                    "not-started",
                    "Not Started",
                  ],
                  [
                    "in-progress",
                    "In Progress",
                  ],
                  [
                    "completed",
                    "Completed",
                  ],
                  [
                    "overdue",
                    "Overdue",
                  ],
                ].map(
                  ([value, label]) => (
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
                        key={status}
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

                                  setSelectedDate(
                                    quest.deadline
                                      ? new Date(
                                          quest.deadline
                                        )
                                      : new Date()
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

                                <Badge
                                  size="xs"
                                  mt="xs"
                                  color={getStatusColor(
                                    quest.status
                                  )}
                                >
                                  {getStatusLabel(
                                    quest.status
                                  )}
                                </Badge>

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

   {/* =================================================
    MODULES / MATERIALS
================================================= */}

<Tabs.Panel
  value="modules"
  pt="md"
>
  <Stack gap="md">

    {/* Hidden file input */}
    <input
      ref={fileInputRef}
      type="file"
      accept=".pdf,.docx,.txt,.md,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown"
      style={{
        display: "none",
      }}
      onChange={
        handleMaterialSelected
      }
    />

    {/* Upload button */}
    <Group
      justify="flex-end"
    >
      <Button
        size="xs"
        color="dark"
        leftSection={
          <Upload size={14} />
        }
        loading={
          uploadingMaterial
        }
        onClick={
          handleUploadMaterial
        }
      >
        Upload Material
      </Button>
    </Group>

    {/* =================================================
        EMPTY STATE / MATERIAL CARDS
    ================================================= */}

    {materials.length === 0 ? (
      <Paper
        withBorder
        radius="md"
        p="xl"
      >
        <Text
          size="sm"
          c="dimmed"
          ta="center"
        >
          No materials uploaded yet
        </Text>
      </Paper>
    ) : (
      <>
        {/* =================================================
            MATERIAL CARDS
        ================================================= */}

        <SimpleGrid
          cols={{
            base: 1,
            sm: 2,
            md: 3,
          }}
          spacing="md"
        >
          {materials.map(
            (material) => (
              <Paper
                key={material.id}
                withBorder
                radius="md"
                p="md"
                h={180}
                style={{
                  display: "flex",
                  flexDirection:
                    "column",
                  justifyContent:
                    "space-between",
                }}
              >
                <Stack gap="xs">
                  <Group
                    justify="space-between"
                    align="flex-start"
                  >
                    <BookOpen
                      size={20}
                    />

                    <Badge
                      size="xs"
                      variant="light"
                      color="gray"
                    >
                      {material.file_type ||
                        "File"}
                    </Badge>
                  </Group>

                  <Text
                    fw={700}
                    size="sm"
                    lineClamp={2}
                  >
                    {material.filename}
                  </Text>

                  <Text
                    size="xs"
                    c="dimmed"
                  >
                    {material.subject ||
                      "General Material"}
                  </Text>
                </Stack>

                <Stack gap={4}>
                  <Text
                    size="xs"
                    c="dimmed"
                  >
                    {(
                      material.file_size /
                      1024 /
                      1024
                    ).toFixed(2)}{" "}
                    MB
                  </Text>

                  <Text
                    size="xs"
                    c="dimmed"
                  >
                    Uploaded{" "}
                    {new Date(
                      material.created_at
                    ).toLocaleDateString(
                      "en-US",
                      {
                        month:
                          "short",
                        day:
                          "numeric",
                        year:
                          "numeric",
                      }
                    )}
                  </Text>
                </Stack>
              </Paper>
            )
          )}
        </SimpleGrid>
      </>
    )}
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
      onChange={(event) =>
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
      onChange={(event) =>
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
      data={subjects.map(
        (subject) => ({
          value: subject,
          label: subject,
        })
      )}
      value={
        newQuest.subject ||
        null
      }
      onChange={(value) =>
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
      onChange={(event) =>
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
      onChange={(value) =>
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
      onChange={(value) =>
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