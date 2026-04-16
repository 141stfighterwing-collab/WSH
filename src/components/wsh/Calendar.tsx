'use client';

import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useWSHStore } from '@/store/wshStore';

export default function Calendar() {
  const { notes, calendarDateFilter, setCalendarDateFilter } = useWSHStore();
  const [currentDate, setCurrentDate] = useState(new Date());
  const today = new Date();

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Build a set of date strings (YYYY-MM-DD) that have notes
  const notesByDate = useMemo(() => {
    const map: Record<string, number> = {};
    notes
      .filter((n) => !n.isDeleted && n.createdAt)
      .forEach((n) => {
        const dateStr = n.createdAt.slice(0, 10); // YYYY-MM-DD
        map[dateStr] = (map[dateStr] || 0) + 1;
      });
    return map;
  }, [notes]);

  const { days, monthName } = useMemo(() => {
    const dim = new Date(year, month + 1, 0).getDate();
    const fdm = new Date(year, month, 1).getDay();
    const mn = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
    const result: (number | null)[] = [];
    for (let i = 0; i < fdm; i++) result.push(null);
    for (let i = 1; i <= dim; i++) result.push(i);
    return { monthName: mn, days: result };
  }, [year, month]);

  const isToday = (day: number) =>
    day === today.getDate() &&
    month === today.getMonth() &&
    year === today.getFullYear();

  const toDateStr = (day: number) => {
    const m = String(month + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    return `${year}-${m}-${d}`;
  };

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const handleDateClick = (day: number) => {
    const dateStr = toDateStr(day);
    // If clicking the same date that's already filtered, clear the filter
    if (calendarDateFilter === dateStr) {
      setCalendarDateFilter(null);
    } else {
      setCalendarDateFilter(dateStr);
    }
  };

  const clearFilter = () => {
    setCalendarDateFilter(null);
  };

  // Format the active filter date for display
  const filterDisplay = useMemo(() => {
    if (!calendarDateFilter) return null;
    try {
      const d = new Date(calendarDateFilter + 'T00:00:00');
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return calendarDateFilter;
    }
  }, [calendarDateFilter]);

  // Count notes for the active filter date
  const filteredCount = useMemo(() => {
    if (!calendarDateFilter) return 0;
    return notes.filter((n) => !n.isDeleted && n.createdAt && n.createdAt.startsWith(calendarDateFilter)).length;
  }, [notes, calendarDateFilter]);

  const isSelected = (day: number) => calendarDateFilter === toDateStr(day);

  return (
    <div className="space-y-2">
      {/* Active date filter indicator */}
      {calendarDateFilter && (
        <div className="flex items-center justify-between bg-pri-500/10 border border-pri-500/20 rounded-lg px-2 py-1.5 animate-fadeIn">
          <div className="flex items-center gap-1.5 min-w-0">
            <div className="w-1.5 h-1.5 rounded-full bg-pri-400 shrink-0" />
            <span className="text-[9px] font-bold text-pri-400 truncate">
              {filterDisplay}
              <span className="text-muted-foreground ml-1">({filteredCount})</span>
            </span>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); clearFilter(); }}
            className="p-0.5 rounded-full hover:bg-pri-500/20 text-pri-400 hover:text-pri-300 transition-colors shrink-0 active:scale-90"
            title="Clear date filter"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold text-muted-foreground">{monthName}</span>
        <div className="flex gap-0.5">
          <button
            onClick={prevMonth}
            className="p-1 rounded hover:bg-secondary transition-all active:scale-95"
          >
            <ChevronLeft className="w-3 h-3 text-muted-foreground" />
          </button>
          <button
            onClick={nextMonth}
            className="p-1 rounded hover:bg-secondary transition-all active:scale-95"
          >
            <ChevronRight className="w-3 h-3 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Day labels */}
      <div className="grid grid-cols-7 gap-0.5 text-center">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
          <div key={d + i} className="text-[8px] font-bold text-muted-foreground/50 py-0.5">
            {d}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 gap-0.5">
        {days.map((day, idx) => {
          if (!day) return <div key={`empty-${idx}`} className="h-7" />;

          const dateStr = toDateStr(day);
          const hasNotes = notesByDate[dateStr] && notesByDate[dateStr] > 0;
          const todayFlag = isToday(day);
          const selected = isSelected(day);

          return (
            <button
              key={idx}
              onClick={() => handleDateClick(day)}
              className={`relative flex flex-col items-center justify-center h-7 rounded-lg transition-all duration-150 active:scale-95 ${
                selected
                  ? 'bg-pri-500/25 border border-pri-500/50 shadow-sm'
                  : todayFlag
                  ? 'bg-pri-500/15 border border-pri-500/30'
                  : 'hover:bg-secondary border border-transparent'
              }`}
            >
              <span
                className={`text-[9px] font-medium leading-none ${
                  selected
                    ? 'text-pri-300 font-bold'
                    : todayFlag
                    ? 'text-pri-400 font-bold'
                    : 'text-muted-foreground'
                }`}
              >
                {day}
              </span>
              {/* Dot indicator for notes on this day */}
              {hasNotes && (
                <div
                  className={`w-1 h-1 rounded-full mt-0.5 ${
                    selected
                      ? 'bg-pri-300'
                      : 'bg-[var(--pri-500)]'
                  }`}
                  style={{ opacity: selected ? 1 : 0.7 }}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
