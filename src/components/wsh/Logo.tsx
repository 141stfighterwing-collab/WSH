'use client';

import Image from 'next/image';

export default function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <Image
        src="/logo.png"
        alt="WSH Logo"
        width={40}
        height={40}
        className="h-10 w-auto rounded-lg shadow-sm"
        priority
      />
      <span className="text-lg font-black tracking-tight text-foreground hidden sm:inline">
        WSH
      </span>
    </div>
  );
}
