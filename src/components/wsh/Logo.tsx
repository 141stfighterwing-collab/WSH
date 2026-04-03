'use client';

export default function Logo() {
  return (
    <div className="flex items-center gap-2">
      <svg
        width="32"
        height="32"
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-8 h-8"
      >
        {/* Outer circle */}
        <circle
          cx="50"
          cy="50"
          r="45"
          stroke="currentColor"
          strokeWidth="3"
          className="text-pri-500"
          opacity="0.8"
        />
        {/* Inner circle */}
        <circle
          cx="50"
          cy="50"
          r="30"
          stroke="currentColor"
          strokeWidth="2"
          className="text-pri-400"
          opacity="0.5"
        />
        {/* Center dot */}
        <circle cx="50" cy="50" r="4" fill="currentColor" className="text-pri-500" />
        {/* 8 radiating lines */}
        <line x1="50" y1="5" x2="50" y2="20" stroke="currentColor" strokeWidth="2.5" className="text-pri-500" />
        <line x1="50" y1="80" x2="50" y2="95" stroke="currentColor" strokeWidth="2.5" className="text-pri-500" />
        <line x1="5" y1="50" x2="20" y2="50" stroke="currentColor" strokeWidth="2.5" className="text-pri-500" />
        <line x1="80" y1="50" x2="95" y2="50" stroke="currentColor" strokeWidth="2.5" className="text-pri-500" />
        {/* Diagonal lines */}
        <line x1="18" y1="18" x2="29" y2="29" stroke="currentColor" strokeWidth="2" className="text-pri-400" opacity="0.7" />
        <line x1="71" y1="71" x2="82" y2="82" stroke="currentColor" strokeWidth="2" className="text-pri-400" opacity="0.7" />
        <line x1="82" y1="18" x2="71" y2="29" stroke="currentColor" strokeWidth="2" className="text-pri-400" opacity="0.7" />
        <line x1="29" y1="71" x2="18" y2="82" stroke="currentColor" strokeWidth="2" className="text-pri-400" opacity="0.7" />
        {/* Small tick marks */}
        <line x1="50" y1="8" x2="46" y2="14" stroke="currentColor" strokeWidth="1" className="text-pri-300" opacity="0.4" />
        <line x1="50" y1="8" x2="54" y2="14" stroke="currentColor" strokeWidth="1" className="text-pri-300" opacity="0.4" />
        <line x1="92" y1="50" x2="86" y2="46" stroke="currentColor" strokeWidth="1" className="text-pri-300" opacity="0.4" />
        <line x1="92" y1="50" x2="86" y2="54" stroke="currentColor" strokeWidth="1" className="text-pri-300" opacity="0.4" />
      </svg>
      <span className="text-lg font-black tracking-tight text-foreground hidden sm:inline">
        WSH
      </span>
    </div>
  );
}
