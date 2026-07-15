'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const ITEMS = [
  { href: '/', label: 'Setlists', icon: '🎵' },
  { href: '/canciones', label: 'Canciones', icon: '🎸' },
];

export default function BottomNav() {
  const pathname = usePathname();
  if (pathname?.startsWith('/show')) return null;

  return (
    <>
      <div style={{ height: 64 }} />
      <nav className="fixed bottom-0 inset-x-0 z-40 border-t border-border bg-card">
        <div className="max-w-md mx-auto flex">
          {ITEMS.map((item) => {
            const activo = item.href === '/' ? pathname === '/' : pathname?.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex-1 flex flex-col items-center gap-0.5 py-2.5 text-xs"
                style={{ color: activo ? 'var(--accent)' : 'var(--muted)' }}
              >
                <span className="text-lg leading-none">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
