"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type NavItem = {
  href: string;
  label: string;
};

export function NavLinks({
  items,
  label = "Main",
  horizontal = false,
}: {
  items: NavItem[];
  label?: string;
  horizontal?: boolean;
}) {
  const pathname = usePathname();

  return (
    <nav
      aria-label={label}
      className={
        horizontal
          ? "flex items-center gap-1 whitespace-nowrap"
          : "flex flex-col gap-0.5"
      }
    >
      {items.map((item) => {
        const active =
          item.href === "/dashboard" ? pathname === item.href : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`rounded-lg text-sm font-medium transition-colors ${
              horizontal ? "px-3 py-1.5" : "px-3 py-2"
            } ${
              active
                ? "bg-brand-50 text-brand-700"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
