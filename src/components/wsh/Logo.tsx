'use client';

import Image from 'next/image';

export default function Logo() {
  return (
    <div className="flex items-center gap-2">
      <Image
        src="/logo.png"
        alt="WSH Logo"
        width={32}
        height={32}
        className="w-8 h-8 rounded-lg"
        priority
      />
      <span className="text-lg font-black tracking-tight text-foreground hidden sm:inline">
        WSH
      </span>
    </div>
  );
}
