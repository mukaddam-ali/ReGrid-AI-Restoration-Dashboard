"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/overview", label: "Overview" },
  { href: "/infrastructure", label: "Infrastructure" },
  { href: "/restoration-plan", label: "Restoration Plan" },
  { href: "/scenarios", label: "Scenarios" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <nav className="sidebar" aria-label="Primary">
      <div className="sidebar-brand">
        <div className="sidebar-brand-title">ReGrid AI</div>
        <div className="sidebar-brand-subtitle">Restoration Planner</div>
      </div>

      <div className="sidebar-nav">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`sidebar-link${active ? " sidebar-link-active" : ""}`}
              aria-current={active ? "page" : undefined}
            >
              {item.label}
            </Link>
          );
        })}
      </div>

      <div className="sidebar-callout">
        <div className="sidebar-callout-title">AI recommends. Engineers decide.</div>
        <div className="sidebar-callout-body">
          ReGrid is decision support only. All switching and repair authorization rests
          with qualified engineers.
        </div>
      </div>
    </nav>
  );
}
