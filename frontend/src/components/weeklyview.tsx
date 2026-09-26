"use client";

import { WeekView } from "@mantine/schedule";
import dayjs from "dayjs";
import { useState } from "react";

export default function WeeklyView() {
    const [date, setDate] = useState(dayjs().format('YYYY-MM-DD'));
    const weekStart = dayjs(date).subtract((dayjs(date).day() + 6) % 7, 'day');

    return (
        <WeekView
            date={date}
            onDateChange={setDate}
        />
    );
}