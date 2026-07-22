'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ListMusic, Guitar } from 'lucide-react';

const ITEMS = [
  { href: '/', label: 'Setlists', Icon: ListMusic },
  { href: '/canciones', label: 'Canciones', Icon: Guitar },
];

export default function BottomNav() {
  const pathname = usePathname();
  if (pathname?.startsWith('/show')) return null;

  return (
    <>
      <div style={{ height: 64 }} />
      <nav className="fixed bottom-0 inset-x-0 z-40 border-t border-border bg-card">
        <div className="max-w-md mx-auto flex">
          {ITEMS.map(({ href, label, Icon }) => {
            const activo = href === '/' ? pathname === '/' : pathname?.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className="flex-1 flex flex-col items-center gap-0.5 py-2.5 text-xs"
                style={{ color: activo ? 'var(--accent)' : 'var(--muted)' }}
              >
                <Icon size={22} />
                {label}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
