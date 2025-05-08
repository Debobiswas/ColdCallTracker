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
    <div className="max-w-5xl mx-auto">
      <h2 className="text-3xl font-bold mb-6">Meetings Calendar</h2>
      <div className="bg-white rounded-xl shadow p-4">
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          style={{ height: 500 }}
          selectable
          onSelectSlot={handleSelectSlot}
          onSelectEvent={handleSelectEvent}
        />
      </div>
      {/* Add Meeting Modal */}
      {showAddModal && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
          onClick={closeAddModal}
        >
          <div
            className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md relative"
            onClick={e => e.stopPropagation()}
          >
            <button onClick={closeAddModal} className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 text-2xl">&times;</button>
            <h3 className="text-xl font-bold mb-4">Add Meeting</h3>
            <form onSubmit={handleAddMeeting} className="flex flex-col gap-4">
              <input
                type="text"
                placeholder="Title"
                className="border rounded px-3 py-2"
                value={meetingTitle}
                onChange={e => setMeetingTitle(e.target.value)}
                required
              />
              <input
                type="datetime-local"
                className="border rounded px-3 py-2"
                value={meetingDateTime}
                onChange={e => setMeetingDateTime(e.target.value)}
                required
              />
              <input
                type="text"
                placeholder="Address"
                className="border rounded px-3 py-2"
                value={meetingAddress}
                onChange={e => setMeetingAddress(e.target.value)}
                required
              />
              <textarea
                placeholder="Notes (optional)"
                className="border rounded px-3 py-2"
                value={meetingNotes}
                onChange={e => setMeetingNotes(e.target.value)}
              />
              <button type="submit" className="bg-blue-500 hover:bg-blue-600 text-white font-semibold px-5 py-2 rounded-lg shadow transition">Add</button>
            </form>
          </div>
        </div>
      )}
      {/* Event Detail Modal */}
      {showEventModal && selectedEvent && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
          onClick={closeEventModal}
        >
          <div
            className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md relative"
            onClick={e => e.stopPropagation()}
          >
            <button onClick={closeEventModal} className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 text-2xl">&times;</button>
            <h3 className="text-xl font-bold mb-4">Meeting Details</h3>
            <div className="mb-2"><span className="font-semibold">Title:</span> {selectedEvent.title}</div>
            <div className="mb-2"><span className="font-semibold">Date & Time:</span> {format(selectedEvent.start ?? new Date(), "PPP p")}</div>
            {selectedEvent.address && <div className="mb-2"><span className="font-semibold">Address:</span> {selectedEvent.address}</div>}
            {selectedEvent.notes && <div className="mb-4"><span className="font-semibold">Notes:</span> {selectedEvent.notes}</div>}
            <button onClick={handleRemoveEvent} className="bg-red-500 hover:bg-red-600 text-white font-semibold px-5 py-2 rounded-lg shadow transition">Remove</button>
          </div>
        </div>
      )}
      {/* Day Modal */}
      {showDayModal && selectedDate && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
          onClick={closeDayModal}
        >
          <div
            className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md relative"
            onClick={e => e.stopPropagation()}
          >
            <button onClick={closeDayModal} className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 text-2xl">&times;</button>
            <h3 className="text-xl font-bold mb-4">Tasks & Meetings for {format(selectedDate ?? new Date(), "PPP")}</h3>
            {eventsForSelectedDate.length === 0 ? (
              <p className="text-gray-500">No tasks or meetings for this day.</p>
            ) : (
              <ul className="space-y-2 mb-4">
                {eventsForSelectedDate.map((ev, idx) => (
                  <li key={idx} className="border-b pb-2 flex items-center justify-between group">
                    <div
                      className="flex-1 cursor-pointer hover:bg-gray-100 rounded px-2 py-1"
                      onClick={() => {
                        setSelectedEvent(ev);
                        setShowEventModal(true);
                        setShowDayModal(false);
                      }}
                      title="View details"
                    >
                      <div className="font-semibold">{ev.title}</div>
                      {ev.address && <div className="text-sm text-gray-500">{ev.address}</div>}
                      {ev.notes && <div className="text-xs text-gray-400 italic">{ev.notes}</div>}
                    </div>
                    <button
                      className="ml-4 text-gray-400 hover:text-red-600 text-xl font-bold px-2"
                      title="Remove"
                      onClick={e => { e.stopPropagation(); handleRemoveEventFromDay(ev); }}
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <button
              className="bg-blue-500 hover:bg-blue-600 text-white font-semibold px-5 py-2 rounded-lg shadow transition"
              onClick={openAddMeetingForSelectedDate}
            >
              + Add Meeting
            </button>
          </div>
        </div>
      )}
    </div>
  );
} 