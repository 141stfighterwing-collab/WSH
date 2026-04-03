'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date());

  const today = new Date();
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  const days: (number | null)[] = [];
  for (let i = 0; i < firstDayOfMonth; i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  const isToday = (day: number) =>
    day === today.getDate() &&
    month === today.getMonth() &&
    year === today.getFullYear();

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="micro-label text-muted-foreground">📅 Calendar</span>
        <div className="flex gap-0.5">
          <button
            onClick={prevMonth}
            className="p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition-all active:scale-95"
          >
            <ChevronLeft className="w-3 h-3" />
          </button>
          <button
            onClick={nextMonth}
            className="p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition-all active:scale-95"
          >
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      <div className="text-xs text-center text-muted-foreground font-medium">{monthName}</div>

      {/* Day labels */}
      <div className="grid grid-cols-7 gap-1 text-center">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
          <div key={d} className="text-[9px] font-bold uppercase text-muted-foreground/60 py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, idx) => (
          <button
            key={idx}
            disabled={!day}
            onClick={() => day && setCurrentDate(new Date(year, month, day))}
            className={`aspect-square flex items-center justify-center text-xs rounded-lg transition-all duration-200 active:scale-95 ${
              !day
                ? ''
                : isToday(day)
                ? 'bg-pri-500/20 border border-pri-500 text-pri-400 font-bold shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
            }`}
          >
            {day}
          </button>
        ))}
      </div>
    </div>
  );
}
