"use client";
import React, { useState, useEffect } from "react";
import { Calendar, dateFnsLocalizer, Event, SlotInfo } from "react-big-calendar";
import { format } from "date-fns/format";
import { parse } from "date-fns/parse";
import { startOfWeek } from "date-fns/startOfWeek";
import { getDay } from "date-fns/getDay";
import { enUS } from "date-fns/locale/en-US";
import { isSameDay } from "date-fns/isSameDay";
import "react-big-calendar/lib/css/react-big-calendar.css";

const locales = {
  "en-US": enUS,
};
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 0 }),
  getDay,
  locales,
});

type MeetingEvent = Event & {
  id?: string;
  address?: string;
  notes?: string;
};

export default function CalendarPage() {
  const [events, setEvents] = useState<MeetingEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showDayModal, setShowDayModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<MeetingEvent | null>(null);
  const [showEventModal, setShowEventModal] = useState(false);

  // Add Meeting form state
  const [meetingTitle, setMeetingTitle] = useState("");
  const [meetingDateTime, setMeetingDateTime] = useState("");
  const [meetingAddress, setMeetingAddress] = useState("");
  const [meetingNotes, setMeetingNotes] = useState("");

  // Load meetings from backend on mount
  useEffect(() => {
    async function fetchMeetings() {
      const res = await fetch("http://localhost:8001/api/meetings");
      const data = await res.json();
      setEvents(
        data.map((m: any) => ({
          id: m.id,
          title: m.business_name,
          start: new Date(`${m.date}T${m.time}`),
          end: new Date(`${m.date}T${m.time}`),
          address: m.address || "",
          notes: m.notes || "",
          allDay: false,
        }))
      );
    }
    fetchMeetings();
  }, []);

  async function handleAddMeeting(e: React.FormEvent) {
    e.preventDefault();
    if (!meetingTitle || !meetingDateTime) return;
    const [date, time] = meetingDateTime.split("T");
    const res = await fetch("http://localhost:8001/api/meetings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        business_name: meetingTitle,
        date,
        time,
        notes: meetingNotes,
      }),
    });
    const newMeeting = await res.json();
    setEvents([
      ...events,
      {
        id: newMeeting.id,
        title: newMeeting.business_name,
        start: new Date(`${newMeeting.date}T${newMeeting.time}`),
        end: new Date(`${newMeeting.date}T${newMeeting.time}`),
        address: "",
        notes: newMeeting.notes || "",
        allDay: false,
      },
    ]);
    setMeetingTitle("");
    setMeetingDateTime("");
    setMeetingAddress("");
    setMeetingNotes("");
    setShowAddModal(false);
  }

  function handleSelectSlot(slotInfo: SlotInfo) {
    const clickedDate = slotInfo.start ? new Date(slotInfo.start) : null;
    if (clickedDate) {
      setSelectedDate(clickedDate);
      setShowDayModal(true);
    }
  }

  function handleSelectEvent(event: MeetingEvent) {
    setSelectedDate(event.start ? new Date(event.start) : null);
    setShowDayModal(true);
  }

  function closeDayModal() {
    setShowDayModal(false);
    setSelectedDate(null);
  }

  function closeAddModal() {
    setShowAddModal(false);
  }

  function closeEventModal() {
    setShowEventModal(false);
    setSelectedEvent(null);
    if (selectedDate) setShowDayModal(true);
  }

  function handleRemoveEvent() {
    if (!selectedEvent) return;
    setEvents(events.filter(ev => ev !== selectedEvent));
    closeEventModal();
  }

  function openAddMeetingForSelectedDate() {
    if (selectedDate) {
      setMeetingDateTime(format(selectedDate, "yyyy-MM-dd'T'HH:mm"));
    } else {
      setMeetingDateTime("");
    }
    setShowDayModal(false);
    setShowAddModal(true);
  }

  async function handleRemoveEventFromDay(eventToRemove: MeetingEvent) {
    await fetch(`http://localhost:8001/api/meetings/${eventToRemove.id}`, {
      method: "DELETE",
    });
    setEvents(events.filter(ev => ev.id !== eventToRemove.id));
  }

  const eventsForSelectedDate = selectedDate
    ? events.filter(ev => {
        const eventStart = ev.start ? (ev.start instanceof Date ? ev.start : new Date(ev.start)) : new Date();
        return isSameDay(eventStart, selectedDate ?? new Date());
      })
    : [];

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Calendar</h1>
      <div className="bg-white rounded-lg shadow p-6">
        <p>Calendar content will be displayed here</p>
      </div>
    </div>
  );
} 