'use client';

import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const today = new Date();

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

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

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  return (
    <div className="space-y-2">
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

      {/* Days grid - compact */}
      <div className="grid grid-cols-7 gap-0.5">
        {days.map((day, idx) => (
          <button
            key={idx}
            disabled={!day}
            onClick={() => day && setCurrentDate(new Date(year, month, day))}
            className={`h-6 w-6 text-[9px] font-medium rounded-full flex items-center justify-center transition-all active:scale-95 ${
              !day
                ? ''
                : isToday(day)
                ? 'bg-pri-500/20 border border-pri-500 text-pri-400 font-bold'
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
