import Link from "next/link";
import type { ReactNode } from "react";

interface SidebarItemProps {
  icon: ReactNode;
  label: string;
  active: boolean;
  href: string;
}

export default function SidebarItem({
  icon,
  label,
  active,
  href,
}: SidebarItemProps) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200 ${
        active
          ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20 font-bold"
          : "text-gray-500 hover:bg-gray-800/50 hover:text-gray-300"
      }`}
    >
      {icon}
      <span className="text-xs uppercase tracking-wider">{label}</span>
    </Link>
  );
}
