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
  useMantineColorScheme,
} from "@mantine/core";

import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Clock,
  Flame,
  Plus,
  RefreshCw,
  Sparkles,
  Trophy,
  Upload,
  X,
} from "lucide-react";

import { notifications } from "@mantine/notifications";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { useRouter } from "next/navigation";

import { QUEST_ENERGY_REWARD } from "@/lib/quest-rewards";
import { createClient } from "@/lib/supabase/client";

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

  reward_coins: number | null;
  completed_at: string | null;
};

type PlanBlock = {
  id: string;
  quest_id: string | null;
  starts_at: string;
  ends_at: string;
  source: string;
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

const toISOStringFromLocalDateTime = (
  value: string
) => {
  if (!value) {
    return null;
  }

  const [datePart, timePart] =
    value.split("T");

  const [year, month, day] =
    datePart.split("-").map(Number);

  const [hours, minutes] =
    timePart.split(":").map(Number);

  const localDate = new Date(
    year,
    month - 1,
    day,
    hours,
    minutes
  );

  return localDate.toISOString();
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

  const supabase = useMemo(
    () => createClient(),
    []
  );

  const { colorScheme } =
    useMantineColorScheme();

  const isDarkMode =
    colorScheme === "dark";

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
     SCHEDULE BLOCK STATE
  ======================================================= */

  const [scheduleBlocks, setScheduleBlocks] =
    useState<PlanBlock[]>([]);

  /* =======================================================
     PROFILE SUBJECT STATE
  ======================================================= */

  const [profileSubjects, setProfileSubjects] =
    useState<string[]>([]);

  const [
    courseworkPriorities,
    setCourseworkPriorities,
  ] = useState<Record<string, string>>({});

  /* =======================================================
     UPLOAD STATE
  ======================================================= */

  const fileInputRef =
    useRef<HTMLInputElement | null>(null);

  const questFileInputRef =
    useRef<HTMLInputElement | null>(null);

  const [uploadingMaterial, setUploadingMaterial] =
    useState(false);

  const [uploadingQuestAttachment, setUploadingQuestAttachment] =
    useState(false);

  const [questAttachment, setQuestAttachment] =
    useState<File | null>(null);

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
      reward_coins: 20,
    });

  const [courseworkType, setCourseworkType] =
    useState("");

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
    const load = async () => {
      await loadQuests();
    };

    load();
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
     LOAD SCHEDULE BLOCKS
  ======================================================= */

  const loadScheduleBlocks = useCallback(
    async () => {
      try {
        const { data, error } =
          await supabase
            .from("schedule_blocks")
            .select(
              "id, quest_id, starts_at, ends_at, source"
            )
            .order("starts_at", {
              ascending: true,
            });

        if (error) {
          throw error;
        }

        setScheduleBlocks(data ?? []);
      } catch (error) {
        console.error(
          "Failed to load schedule blocks:",
          error
        );

        setScheduleBlocks([]);
      }
    },
    [supabase]
  );

  useEffect(() => {
    const load = async () => {
      await loadScheduleBlocks();
    };

    load();
  }, [loadScheduleBlocks]);

  /* =======================================================
     LOAD PROFILE SUBJECTS
  ======================================================= */

  useEffect(() => {
    const loadProfileSubjects =
      async () => {
        try {
          const {
            data: { user },
          } = await supabase.auth.getUser();

          if (!user) {
            setProfileSubjects([]);

            return;
          }

          const { data, error } =
            await supabase
              .from("profiles")
              .select(
                "subjects, coursework_priorities"
              )
              .eq("id", user.id)
              .single();

          if (error) {
            throw error;
          }

          const subjects =
            Array.isArray(
              data?.subjects
            )
              ? data.subjects.filter(
                (
                  subject
                ): subject is string =>
                  typeof subject ===
                  "string" &&
                  subject.trim()
                    .length > 0
              )
              : [];

          setProfileSubjects(subjects);

          const priorities =
            data?.coursework_priorities &&
              typeof data.coursework_priorities ===
              "object" &&
              !Array.isArray(
                data.coursework_priorities
              )
              ? (data.coursework_priorities as Record<
                string,
                string
              >)
              : {};

          setCourseworkPriorities(priorities);
        } catch (error) {
          console.error(
            "Failed to load profile subjects:",
            error
          );

          setProfileSubjects([]);
          setCourseworkPriorities({});
        }
      };

    loadProfileSubjects();
  }, [supabase]);

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

  /*
   * Quests that already have a scheduled block are rendered
   * from that block instead of their deadline, so a quest
   * never shows up twice after Regenerate Plan moves it into
   * the user's weekly availability.
   */
  const scheduledQuestIds = new Set(
    scheduleBlocks
      .map((block) => block.quest_id)
      .filter(
        (id): id is string => Boolean(id)
      )
  );

  /*
   * Deadlines are stored as UTC instants, so they must be
   * converted to the user's local date before matching them
   * against a calendar day. Using the raw UTC substring
   * would move early-morning deadlines to the day before.
   */
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

        /*
         * A scheduled quest is rendered from its schedule
         * block instead, so it is not duplicated here.
         */
        if (
          scheduledQuestIds.has(quest.id)
        ) {
          return false;
        }

        return (
          formatDateKey(
            new Date(quest.deadline)
          ) === key
        );
      }
    );
  };

  const getQuestForBlock = (
    block: PlanBlock
  ) =>
    quests.find(
      (quest) =>
        quest.id === block.quest_id
    ) ?? null;

  const getBlocksForDate = (
    date: Date
  ) => {
    const key =
      formatDateKey(date);

    return scheduleBlocks.filter(
      (block) => {
        if (
          formatDateKey(
            new Date(block.starts_at)
          ) !== key
        ) {
          return false;
        }

        const quest =
          getQuestForBlock(block);

        return (
          quest !== null &&
          quest.status !== "completed"
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
            formatDateKey(
              new Date(quest.deadline!)
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

  /*
   * Subjects come from the user's academic profile.
   * Existing quest subjects are merged in so filters
   * and edits still work for quests that reference a
   * subject that is no longer on the profile.
   */
  const subjects =
    Array.from(
      new Set([
        ...profileSubjects,
        ...(quests
          .map(
            (quest) =>
              quest.subject
          )
          .filter(
            Boolean
          ) as string[]),
      ])
    );

  const courseworkTypes =
    Object.keys(
      courseworkPriorities
    );

  const selectedQuestBlocks =
    selectedQuest
      ? scheduleBlocks.filter(
        (block) =>
          block.quest_id ===
          selectedQuest.id
      )
      : [];

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
      reward_coins: 20,
    });

    setCourseworkType("");

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

      reward_coins:
        quest.reward_coins ?? 20,
    });

    setCourseworkType("");

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
                    toISOStringFromLocalDateTime(
                      newQuest.deadline
                    ),

                  priority:
                    newQuest.priority,

                  estimated_duration:
                    newQuest.estimated_duration,

                  reward_coins:
                    newQuest.reward_coins,
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
                    toISOStringFromLocalDateTime(
                      newQuest.deadline
                    ),

                  priority:
                    newQuest.priority,

                  estimated_duration:
                    newQuest.estimated_duration,

                  reward_coins:
                    newQuest.reward_coins,

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
         * Use the dedicated completion endpoint so the
         * complete_quest RPC runs: it awards coins and
         * pet XP, stamps completed_at, and logs the event.
         */
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
            "Failed to complete quest."
          );
        }

        const rewards: string[] = [];

        if ((quest.reward_coins ?? 0) > 0) {
          rewards.push(
            `+${quest.reward_coins} coins`
          );
        }

        if (
          typeof data.xp === "number" &&
          data.xp > 0
        ) {
          rewards.push(`+${data.xp} XP`);
        }

        if (
          typeof data.energy === "number" &&
          data.energy > 0
        ) {
          rewards.push(
            `+${data.energy} energy`
          );
        }

        notifications.show({
          title: "Quest completed!",
          message:
            rewards.length > 0
              ? `${rewards.join(
                " · "
              )} · "${quest.title}"`
              : `"${quest.title}" marked as done.`,
          color: "green",
        });

        if (data.pet?.leveledUp) {
          notifications.show({
            title: "Level up!",
            message:
              "Your pet leveled up from this quest.",
            color: "teal",
          });
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
          refreshedQuest ?? null
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
     QUEST ATTACHMENT
  ======================================================= */

  const handleQuestAttachmentSelected = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];

    event.target.value = "";

    if (!file) {
      return;
    }

    const allowedExtensions = [
      ".pdf",
      ".docx",
      ".txt",
      ".md",
    ];

    const lowerName = file.name.toLowerCase();

    const validExtension = allowedExtensions.some(
      (extension) => lowerName.endsWith(extension)
    );

    if (!validExtension) {
      alert(
        "Unsupported file type. Only PDF, DOCX, TXT, and MD files are allowed."
      );
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert(
        "File is too large. Maximum size is 10 MB."
      );
      return;
    }

    setQuestAttachment(file);
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

        const scheduledCount =
          data.scheduled_count ?? 0;

        if (scheduledCount > 0) {
          notifications.show({
            title: "Plan regenerated",
            message: `${scheduledCount} quest block(s) placed inside your weekly availability.`,
            color: "green",
          });
        } else {
          notifications.show({
            title: "Nothing scheduled",
            message:
              data.message ??
              "No pending quest with a deadline and duration could be placed.",
            color: "yellow",
          });
        }

        await Promise.all([
          loadQuests(),
          loadScheduleBlocks(),
        ]);
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
      bg="light-dark(#ffffff, #000000)"
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
                  event.currentTarget.value
                )
              }
            />

            <Badge
              variant="light"
              color="blue"
              size="lg"
              leftSection={
                <Sparkles size={12} />
              }
            >
              {totalTasks}
            </Badge>

            <Badge
              variant="light"
              color="blue"
              size="lg"
              leftSection={
                <Trophy size={12} />
              }
            >
              {completedTasks}
            </Badge>

            <Badge
              variant="light"
              color="blue"
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
          color="blue"
        >
          <Tabs.List
            style={{
              borderBottom:
                "1px solid #e5e7eb",
            }}
          >
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

              {/* CALENDAR TOOLBAR */}

              <Group
                justify="space-between"
                align="center"
              >
                <Group gap="xs">
                  <Button
                    variant="subtle"
                    color="blue"
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
                    color="blue"
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
                        "1px solid #d9dee7",
                      borderRadius: 20,
                      overflow: "hidden",
                      background:
                        'light-dark(#F7F9FC, #000000)',
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
                      color="blue"
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
                      color="blue"
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
                    color="blue"
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
                    color="blue"
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
                  bg="#f8f9fa"
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

              {/* =================================================
                CALENDAR + DETAILS
            ================================================= */}

              <SimpleGrid
                cols={{
                  base: 1,
                  lg: 3,
                }}
                spacing="md"
              >

                {/* =================================================
                  CALENDAR
              ================================================= */}
                <Paper
                  withBorder
                  radius="lg"
                  p="md"
                  style={{
                    gridColumn: "span 2",
                    backgroundColor:
                      "light-dark(#ffffff, #111111)",
                    borderColor:
                      "light-dark(#e5e7eb, #2b2b2b)",
                  }}
                >
                  {calendarView === "week" ? (
                    <Box
                      style={{
                        display: "grid",
                        gridTemplateColumns:
                          "repeat(7, minmax(0, 1fr))",
                        gap: 8,
                      }}
                    >
                      {weekDays.map((day) => {
                        const questsForDay =
                          getQuestsForDate(day);

                        const isSelected =
                          formatDateKey(day) ===
                          formatDateKey(selectedDate);

                        return (
                          <Box
                            key={formatDateKey(day)}
                          >
                            {/* DAY NAME */}
                            <Text
                              ta="center"
                              size="xs"
                              fw={600}
                              mb={6}
                              c="dimmed"
                            >
                              {day.toLocaleDateString(
                                "en-US",
                                {
                                  weekday: "short",
                                }
                              )}
                            </Text>

                            {/* DAY CELL */}
                            <Paper
                              withBorder
                              radius="md"
                              p={7}
                              mih={205}
                              bg={
                                isSelected
                                  ? "light-dark(#f3f7ff, #1f2937)"
                                  : "light-dark(#ffffff, #181818)"
                              }
                              style={{
                                cursor: "pointer",
                                borderColor:
                                  isSelected
                                    ? "light-dark(#b9d4ff, #3b82f6)"
                                    : "light-dark(#e5e7eb, #2b2b2b)",
                              }}
                              onClick={() =>
                                setSelectedDate(day)
                              }
                            >
                              {/* DATE NUMBER */}
                              <Text
                                ta="center"
                                size="xs"
                                fw={700}
                                mb="xs"
                                c={
                                  isSelected
                                    ? "blue"
                                    : "light-dark(#212529, #f1f3f5)"
                                }
                              >
                                {day.getDate()}
                              </Text>

                              {/* SCHEDULED BLOCKS + QUESTS */}
                              <Stack gap={5}>
                                {getBlocksForDate(day).map((block) => {
                                  const quest =
                                    getQuestForBlock(block);

                                  if (!quest) {
                                    return null;
                                  }

                                  return (
                                    <Box
                                      key={block.id}
                                      p={7}
                                      style={{
                                        background:
                                          "light-dark(#eefbf0, #14311f)",
                                        borderLeft: `3px solid ${getPriorityColor(
                                          quest.priority
                                        )}`,
                                        borderRadius: 6,
                                        cursor: "pointer",
                                      }}
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        setSelectedQuest(quest);
                                      }}
                                    >
                                      <Text
                                        size="xs"
                                        fw={600}
                                        lineClamp={2}
                                        c="light-dark(#212529, #f1f3f5)"
                                      >
                                        {quest.title}
                                      </Text>

                                      <Group gap={4} wrap="nowrap">
                                        <Clock size={11} color="light-dark(#2f9e44, #51cf66)" />

                                        <Text size="xs" c="dimmed">
                                          {formatQuestTime(
                                            block.starts_at
                                          )}
                                          –
                                          {formatQuestTime(
                                            block.ends_at
                                          )}
                                        </Text>
                                      </Group>
                                    </Box>
                                  );
                                })}

                                {questsForDay.map(
                                  (quest) => (
                                    <Box
                                      key={quest.id}
                                      p={7}
                                      style={{
                                        background:
                                          selectedQuest?.id ===
                                            quest.id
                                            ? "light-dark(#e8f1ff, #1e3a5f)"
                                            : "light-dark(#f3f4f6, #252525)",
                                        borderLeft: `3px solid ${getPriorityColor(
                                          quest.priority
                                        )}`,
                                        borderRadius: 6,
                                        cursor: "pointer",
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
                                        lineClamp={2}
                                        c="light-dark(#212529, #f1f3f5)"
                                      >
                                        {quest.title}
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
                      })}
                    </Box>
                  ) : (
                    <Box
                      style={{
                        display: "grid",
                        gridTemplateColumns:
                          "repeat(7, minmax(0, 1fr))",
                        gap: 6,
                      }}
                    >
                      {monthDays.map(
                        (day) => {
                          const questsForDay =
                            getQuestsForDate(
                              day.date
                            );

                          const isSelected =
                            formatDateKey(
                              day.date
                            ) ===
                            formatDateKey(
                              selectedDate
                            );

                          return (
                            <Paper
                              key={formatDateKey(day.date)}
                              withBorder
                              radius="md"
                              p={7}
                              mih={205}
                              bg={
                                isSelected
                                  ? isDarkMode
                                    ? "#263653"
                                    : "#f3f7ff"
                                  : isDarkMode
                                    ? "#111827"
                                    : "#ffffff"
                              }
                              style={{
                                cursor: "pointer",
                                borderColor: isDarkMode
                                  ? "#374151"
                                  : isSelected
                                    ? "#b9d4ff"
                                    : "#e5e7eb",
                              }}
                              onClick={() =>
                                setSelectedDate(
                                  day.date
                                )
                              }
                            >
                              {/* DATE */}
                              <Text
                                size="xs"
                                fw={600}
                                mb={5}
                                c={
                                  isSelected
                                    ? "blue"
                                    : "light-dark(#212529, #f1f3f5)"
                                }
                              >
                                {day.date.getDate()}
                              </Text>

                              {/* SCHEDULED BLOCKS + QUESTS */}
                              <Stack gap={4}>
                                {getBlocksForDate(day.date)
                                  .slice(0, 2)
                                  .map((block) => {
                                    const quest =
                                      getQuestForBlock(block);

                                    if (!quest) {
                                      return null;
                                    }

                                    return (
                                      <Box
                                        key={block.id}
                                        px={5}
                                        py={3}
                                        style={{
                                          background:
                                            "light-dark(#eefbf0, #14311f)",
                                          borderLeft: `3px solid ${getPriorityColor(
                                            quest.priority
                                          )}`,
                                          borderRadius: 4,
                                          cursor: "pointer",
                                        }}
                                        onClick={(event) => {
                                          event.stopPropagation();
                                          setSelectedQuest(quest);
                                        }}
                                      >
                                        <Text
                                          size="xs"
                                          lineClamp={1}
                                          c="light-dark(#212529, #f1f3f5)"
                                        >
                                          {quest.title}
                                        </Text>

                                        <Group gap={4} wrap="nowrap">
                                          <Clock size={10} color="light-dark(#2f9e44, #51cf66)" />

                                          <Text size="xs" c="dimmed">
                                            {formatQuestTime(
                                              block.starts_at
                                            )}
                                            –
                                            {formatQuestTime(
                                              block.ends_at
                                            )}
                                          </Text>
                                        </Group>
                                      </Box>
                                    );
                                  })}

                                {questsForDay
                                  .slice(0, 3)
                                  .map((quest) => (
                                    <Box
                                      key={quest.id}
                                      px={5}
                                      py={3}
                                      style={{
                                        background:
                                          selectedQuest?.id ===
                                            quest.id
                                            ? isDarkMode
                                              ? "#263653"
                                              : "#e9e9e9"
                                            : isDarkMode
                                              ? "#1f2937"
                                              : "#f5f5f5",
                                        borderLeft: `3px solid ${getPriorityColor(
                                          quest.priority
                                        )}`,
                                        borderRadius: 4,
                                        cursor: "pointer",
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
                                        lineClamp={1}
                                        c="light-dark(#212529, #f1f3f5)"
                                      >
                                        {quest.title}
                                      </Text>
                                    </Box>
                                  ))}
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
                  bg={isDarkMode ? "#111827" : "#ffffff"}
                >
                  <Group
                    justify="space-between"
                    mb="sm"
                  >
                    <Text
                      fw={700}
                      size="sm"
                      c={isDarkMode ? "#f3f4f6" : "#222"}
                    >
                      Quest Details
                    </Text>

                    {selectedQuest && (
                      <Button
                        variant="subtle"
                        color="blue"
                        size="compact-xs"
                        onClick={() => setSelectedQuest(null)}
                      >
                        <X size={14} />
                      </Button>
                    )}
                  </Group>

                  <Divider
                    mb="sm"
                    color={isDarkMode ? "#374151" : "#e5e7eb"}
                  />

                  {selectedQuest ? (
                    <Stack gap="sm">

                      {/* TITLE + DESCRIPTION */}
                      <Box>
                        <Text
                          fw={700}
                          size="sm"
                          c={isDarkMode ? "#f3f4f6" : "#222"}
                        >
                          {selectedQuest.title}
                        </Text>

                        <Text
                          size="xs"
                          c={isDarkMode ? "#d1d5db" : "dimmed"}
                          mt={3}
                        >
                          {selectedQuest.description ||
                            "No description provided."}
                        </Text>
                      </Box>

                      {/* BASIC DETAILS */}
                      <Paper
                        radius="md"
                        p="sm"
                        bg={isDarkMode ? "#1f2937" : "#f5f6f8"}
                      >
                        <Stack gap={5}>
                          <Text
                            size="xs"
                            c={isDarkMode ? "#f3f4f6" : "#222"}
                          >
                            <b>Subject:</b>{" "}
                            {selectedQuest.subject || "General"}
                          </Text>

                          <Text
                            size="xs"
                            c={isDarkMode ? "#f3f4f6" : "#222"}
                          >
                            <b>Estimated Duration:</b>{" "}
                            {selectedQuest.estimated_duration ?? 0} minutes
                          </Text>

                          <Text
                            size="xs"
                            c={isDarkMode ? "#f3f4f6" : "#222"}
                          >
                            <b>Priority:</b>{" "}
                            {getPriorityLabel(selectedQuest.priority)}
                          </Text>

                          <Text
                            size="xs"
                            c={isDarkMode ? "#f3f4f6" : "#222"}
                          >
                            <b>Status:</b>{" "}
                            {getStatusLabel(selectedQuest.status)}
                          </Text>

                          <Text
                            size="xs"
                            c={isDarkMode ? "#f3f4f6" : "#222"}
                          >
                            <b>Deadline:</b>
                            <br />
                            {formatQuestDate(selectedQuest.deadline)}
                            <br />
                            {formatQuestTime(selectedQuest.deadline)}
                          </Text>
                        </Stack>
                      </Paper>

                      {/* REWARD */}
                      <Box>
                        <Text
                          size="xs"
                          fw={700}
                          mb={4}
                          c={isDarkMode ? "#f3f4f6" : "#222"}
                        >
                          Reward
                        </Text>

                        <Paper
                          radius="md"
                          p="sm"
                          bg={isDarkMode ? "#1f2937" : "#f5f6f8"}
                        >
                          <Group gap="md">
                            <Text
                              size="xs"
                              c={isDarkMode ? "#f3f4f6" : "#222"}
                            >
                              🪙{" "}
                              <b>
                                +{selectedQuest.reward_coins ?? 0}
                              </b>{" "}
                              Student Coins
                            </Text>

                            <Text
                              size="xs"
                              c={isDarkMode ? "#f3f4f6" : "#222"}
                            >
                              🐾{" "}
                              <b>
                                +{selectedQuest.reward_coins ?? 0}
                              </b>{" "}
                              Pet XP
                            </Text>

                            <Text
                              size="xs"
                              c={isDarkMode ? "#f3f4f6" : "#222"}
                            >
                              ⚡{" "}
                              <b>
                                +{QUEST_ENERGY_REWARD}
                              </b>{" "}
                              Energy
                            </Text>
                          </Group>

                          {selectedQuest.status === "completed" && (
                            <Text
                              size="xs"
                              c="green"
                              mt={6}
                            >
                              Reward claimed when the quest
                              was completed.
                            </Text>
                          )}
                        </Paper>
                      </Box>

                      {/* SCHEDULED TIME */}
                      {selectedQuestBlocks.length > 0 && (
                        <Box>
                          <Text
                            size="xs"
                            fw={700}
                            mb={4}
                            c={isDarkMode ? "#f3f4f6" : "#222"}
                          >
                            Scheduled Time
                          </Text>

                          <Paper
                            radius="md"
                            p="sm"
                            bg={isDarkMode ? "#1f2937" : "#f5f6f8"}
                          >
                            <Stack gap={3}>
                              {selectedQuestBlocks.map(
                                (block) => (
                                  <Group
                                    key={block.id}
                                    gap={6}
                                    wrap="nowrap"
                                  >
                                    <Clock
                                      size={12}
                                      color="light-dark(#2f9e44, #51cf66)"
                                    />

                                    <Text
                                      size="xs"
                                      c={isDarkMode ? "#f3f4f6" : "#222"}
                                    >
                                      {formatQuestDate(
                                        block.starts_at
                                      )}{" "}
                                      ·{" "}
                                      {formatQuestTime(
                                        block.starts_at
                                      )}
                                      –
                                      {formatQuestTime(
                                        block.ends_at
                                      )}
                                      {block.source === "manual"
                                        ? " (manual)"
                                        : " (auto)"}
                                    </Text>
                                  </Group>
                                )
                              )}
                            </Stack>
                          </Paper>
                        </Box>
                      )}

                      {/* SCHEDULING REASON */}
                      <Box>
                        <Text
                          size="xs"
                          fw={700}
                          mb={4}
                          c={isDarkMode ? "#f3f4f6" : "#222"}
                        >
                          Scheduling Reason
                        </Text>

                        <Paper
                          radius="md"
                          p="sm"
                          bg={isDarkMode ? "#1f2937" : "#f5f6f8"}
                        >
                          <Text
                            size="xs"
                            c={isDarkMode ? "#d1d5db" : "dimmed"}
                          >
                            {selectedQuestBlocks.length > 0
                              ? `Placed on ${formatQuestDate(
                                selectedQuestBlocks[0]
                                  .starts_at
                              )} at ${formatQuestTime(
                                selectedQuestBlocks[0]
                                  .starts_at
                              )} using your weekly availability and ${getPriorityLabel(
                                selectedQuest.priority
                              ).toLowerCase()}.`
                              : "No scheduled block yet. Click Regenerate Plan to place this quest inside your weekly availability."}
                          </Text>
                        </Paper>
                      </Box>

                      {/* MATERIALS */}
                      <Box>
                        <Text
                          size="xs"
                          fw={700}
                          mb={4}
                          c={isDarkMode ? "#f3f4f6" : "#222"}
                        >
                          Materials
                        </Text>

                        <Paper
                          radius="md"
                          p="sm"
                          bg={isDarkMode ? "#1f2937" : "#f5f6f8"}
                        >
                          {materials.filter(
                            (material) =>
                              material.quest_id === selectedQuest.id
                          ).length > 0 ? (
                            <Stack gap={3}>
                              {materials
                                .filter(
                                  (material) =>
                                    material.quest_id === selectedQuest.id
                                )
                                .map((material) => (
                                  <Text
                                    key={material.id}
                                    size="xs"
                                    c={isDarkMode ? "#f3f4f6" : "#222"}
                                  >
                                    • {material.filename}
                                  </Text>
                                ))}
                            </Stack>
                          ) : (
                            <Text
                              size="xs"
                              c={isDarkMode ? "#d1d5db" : "dimmed"}
                            >
                              No materials attached.
                            </Text>
                          )}
                        </Paper>
                      </Box>

                      {/* CHECKLIST */}
                      {selectedQuest.checklist?.length > 0 && (
                        <Box>
                          <Text
                            size="xs"
                            fw={700}
                            mb={3}
                            c={isDarkMode ? "#f3f4f6" : "#222"}
                          >
                            Checklist
                          </Text>

                          <Paper
                            radius="md"
                            p="sm"
                            bg={isDarkMode ? "#1f2937" : "#f5f6f8"}
                          >
                            <Stack gap={4}>
                              {selectedQuest.checklist.map(
                                (item, index) => (
                                  <Checkbox
                                    key={`${selectedQuest.id}-${index}`}
                                    size="xs"
                                    label={item}
                                    styles={{
                                      label: {
                                        color: isDarkMode
                                          ? "#f3f4f6"
                                          : "#222",
                                      },
                                    }}
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
                          </Paper>
                        </Box>
                      )}

                      {/* ACTIONS */}
                      <Box>
                        <Text
                          size="xs"
                          fw={700}
                          mb={5}
                          c={isDarkMode ? "#f3f4f6" : "#222"}
                        >
                          Actions
                        </Text>

                        <Stack gap={5}>
                          {selectedQuest.status === "pending" && (
                            <Button
                              size="compact-xs"
                              color="blue"
                              fullWidth
                              loading={updatingQuest}
                              onClick={() =>
                                handleStartQuest(selectedQuest)
                              }
                            >
                              Mark as In Progress
                            </Button>
                          )}

                          <Group grow gap={5}>
                            <Button
                              size="compact-xs"
                              color="blue"
                              onClick={() =>
                                handleAskWasi(selectedQuest)
                              }
                            >
                              Ask Wasi
                            </Button>

                            <Button
                              size="compact-xs"
                              variant="light"
                              color="blue"
                              onClick={() =>
                                openEditQuest(selectedQuest)
                              }
                            >
                              Edit Quest
                            </Button>
                          </Group>

                          {selectedQuest.status === "in_progress" && (
                            <Button
                              size="compact-xs"
                              color="blue"
                              loading={updatingQuest}
                              onClick={() =>
                                handleCompleteQuest(selectedQuest)
                              }
                            >
                              Mark as Done
                            </Button>
                          )}

                          {selectedQuest.status === "completed" && (
                            <Badge
                              color="blue"
                              variant="light"
                              size="sm"
                            >
                              Quest Completed
                            </Badge>
                          )}
                        </Stack>
                      </Box>

                    </Stack>
                  ) : (
                    <Text
                      size="sm"
                      c={isDarkMode ? "#d1d5db" : "dimmed"}
                      ta="center"
                      py="xl"
                    >
                      Select a quest to view its details.
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
                  radius="lg"
                  p="md"
                  bg="light-dark(#F7F9FC, #000000)"
                >
                  <Group gap="xs" style={{ flexDirection: "column", alignItems: "flex-start", justifyContent: "center" }}>
                    <Text
                      size="xs"
                      c={isDarkMode ? "white" : "dimmed"}
                    >
                      Quest Queue
                    </Text>

                    <Text
                      fw={700}
                      size="xs"
                      c={isDarkMode ? "white" : "#222"}
                    >
                      {quests.filter(
                        (quest) =>
                          quest.status !==
                          "completed"
                      ).length}{" "}
                      active quests
                      currently queued.
                    </Text>
                  </Group>
                </Paper>

                <Paper
                  withBorder
                  radius="lg"
                  p="md"
                  bg="light-dark(#F7F9FC, #000000)"
                >
                  <Group gap="xs" style={{ flexDirection: "column", alignItems: "flex-start", justifyContent: "center" }}>
                    <Text
                      size="xs"
                      c={isDarkMode ? "white" : "dimmed"}
                    >
                      Procrastination Nudge
                    </Text>

                    <Text
                      size="xs"
                      c={isDarkMode ? "white" : "dimmed"}
                    >
                      {overdueTasks > 0
                        ? `You have ${overdueTasks} overdue quest(s).`
                        : "You're caught up with your quests."}
                    </Text>
                  </Group>
                </Paper>

                <Paper
                  withBorder
                  radius="lg"
                  p="md"
                  bg="light-dark(#F7F9FC, #000000)"
                >
                  <Group style={{ justifyContent: "space-between", alignItems: "center" }}>
                    <Group gap="xs" style={{ flexDirection: "column", alignItems: "flex-start", justifyContent: "center" }}>
                      <Text
                        fw={700}
                        size="xs"
                        c={isDarkMode ? "white" : "#222"}
                      >
                        Weekly Reward Goal
                      </Text>

                      <Text
                        size="xs"
                        c={isDarkMode ? "white" : "#222"}
                      >
                        {completedTasks} / {totalTasks} completed
                      </Text>
                    </Group>
                    <Trophy
                      size={16}
                      color={isDarkMode ? "white" : undefined}
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

              {/* STATS */}

              <SimpleGrid
                cols={{
                  base: 2,
                  md: 4,
                }}
              >
                {[
                  [
                    "Total Tasks",
                    totalTasks,
                  ],
                  [
                    "Due This Week",
                    dueThisWeek,
                  ],
                  [
                    "Completed",
                    completedTasks,
                  ],
                  [
                    "Overdue",
                    overdueTasks,
                  ],
                ].map(
                  ([label, value]) => (
                    <Paper
                      key={label}
                      withBorder
                      radius="lg"
                      p="md"
                      bg="light-dark(#F7F9FC, #000000)"
                    >
                      <Text
                        size="xs"
                        c="dimmed"
                      >
                        {label}
                      </Text>

                      <Text
                        fw={700}
                        size="xl"
                        mt={3}
                      >
                        {value}
                      </Text>
                    </Paper>
                  )
                )}
              </SimpleGrid>

              {/* SEARCH / FILTER */}

              <Group
                justify="space-between"
                align="center"
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
                        value: "all",
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
                    size="xs"
                    color="blue"
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

              {/* FILTER BUTTONS */}

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
                      size="xs"
                      variant={
                        statusFilter ===
                          value
                          ? "filled"
                          : "light"
                      }
                      color="blue"
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

              {/* QUEST COLUMNS */}

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
                        radius="lg"
                        p="sm"
                        mih={400}
                        bg="light-dark(#F7F9FC, #000000)"
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
                            color="blue"
                            variant="light"
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
                                radius="md"
                                p="sm"
                                bg="#ffffff"
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
                                  color="blue"
                                  variant="light"
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
                                    color="blue"
                                    variant="light"
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
            MODULES / MATERIALS
        ================================================= */}

          <Tabs.Panel
            value="modules"
            pt="md"
          >
            <Stack gap="md">

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

              <Group
                justify="space-between"
              >
                <Box>
                  <Text
                    fw={700}
                    size="sm"
                  >
                    Study Materials
                  </Text>

                  <Text
                    size="xs"
                    c="dimmed"
                  >
                    Upload and manage
                    materials for your
                    quests.
                  </Text>
                </Box>

                <Button
                  size="xs"
                  color="blue"
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

              {materials.length === 0 ? (
                <Paper
                  withBorder
                  radius="lg"
                  p="xl"
                  bg="light-dark(#f8f9fa, #151515)"
                >
                  <Text
                    size="sm"
                    c="dimmed"
                    ta="center"
                  >
                    No materials
                    uploaded yet
                  </Text>
                </Paper>
              ) : (
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
                        key={
                          material.id
                        }
                        withBorder
                        radius="lg"
                        p="md"
                        h={180}
                        bg="light-dark(#ffffff, #151515)"
                        style={{
                          display:
                            "flex",
                          flexDirection:
                            "column",
                          justifyContent:
                            "space-between",
                          borderColor:
                            "light-dark(#e5e7eb, #2b2b2b)",
                        }}
                      >
                        <Stack gap="xs">
                          <Group
                            justify="space-between"
                            align="flex-start"
                          >
                            <BookOpen
                              size={20}
                              color="#228be6"
                            />

                            <Badge
                              size="xs"
                              variant="light"
                              color="blue"
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
                            {
                              material.filename
                            }
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
                            ).toFixed(
                              2
                            )}{" "}
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

            {courseworkTypes.length > 0 && (
              <Select
                label="Coursework Type"
                description="Applies the priority rules from your setup."
                placeholder="Select coursework type"
                searchable
                clearable
                data={courseworkTypes.map(
                  (type) => ({
                    value: type,
                    label: `${type} · ${courseworkPriorities[type] ??
                      "Medium"
                      }`,
                  })
                )}
                value={courseworkType || null}
                onChange={(value) => {
                  setCourseworkType(
                    value ?? ""
                  );

                  const rule = (
                    courseworkPriorities[
                    value ?? ""
                    ] ?? ""
                  ).toLowerCase();

                  const mappedPriority:
                    | QuestPriority
                    | null =
                    rule === "high" ||
                      rule === "medium" ||
                      rule === "low"
                      ? rule
                      : null;

                  if (mappedPriority) {
                    setNewQuest((current) => ({
                      ...current,
                      priority:
                        mappedPriority,
                    }));
                  }
                }}
              />
            )}

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

            <NumberInput
              label="Reward (Student Coins)"
              description="Coins and pet XP granted when this quest is completed."
              min={0}
              max={500}
              step={5}
              value={newQuest.reward_coins}
              onChange={(value) =>
                setNewQuest({
                  ...newQuest,
                  reward_coins:
                    typeof value ===
                      "number"
                      ? value
                      : 20,
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