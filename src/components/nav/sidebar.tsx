'use client';

import { Clock, Home, LogOut, Settings } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { signOut } from '@/lib/profile/actions';
import { cn } from '@/lib/utils/cn';

interface SidebarProps {
  user: {
    email: string;
    displayName: string | null;
    role: string | null;
  };
}

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Practice', icon: Home },
  { href: '/history', label: 'History', icon: Clock },
  { href: '/settings', label: 'Settings', icon: Settings },
] as const;

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col border-r bg-background">
      <div className="px-6 py-6">
        <Link href="/dashboard" className="block">
          <span className="font-mono text-base font-semibold tracking-tight">RehersoAI</span>
        </Link>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {NAV_ITEMS.map((item) => {
          const active =
            pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                active
                  ? 'bg-muted text-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t px-4 py-4">
        <div className="mb-3 px-2 text-xs">
          <div className="truncate font-medium text-foreground">
            {user.displayName ?? user.email}
          </div>
          {user.role && (
            <div className="mt-0.5 text-muted-foreground">{user.role}</div>
          )}
        </div>
        <form action={signOut}>
          <Button
            type="submit"
            variant="ghost"
            size="sm"
            className="w-full justify-start text-muted-foreground"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        </form>
      </div>
    </aside>
  );
}
