import { FileText, Mic, Settings, Video } from "lucide-react";

import SidebarItem from "@/components/ui/SidebarItem";

export type TabKey =
  | "recap"
  | "transcribe"
  | "captioner"
  | "recapper"
  | "settings";

interface SidebarProps {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
}

const NAV_ITEMS: Array<{ key: TabKey; label: string; icon: JSX.Element }> = [
  { key: "recap", label: "VIDEO RECAP", icon: <Video size={20} /> },
  { key: "transcribe", label: "TRANSCRIBE", icon: <Mic size={20} /> },
  { key: "captioner", label: "AUTO CAPTIONER", icon: <FileText size={20} /> },
  { key: "recapper", label: "RECAPPER", icon: <FileText size={20} /> },
  { key: "settings", label: "SETTINGS", icon: <Settings size={20} /> },
];

export default function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  return (
    <aside className="w-64 bg-[#0f111d] border-r border-gray-800 flex flex-col p-6">
      <div className="flex items-center gap-3 mb-10 px-2">
        <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/20">
          <Video className="text-white" size={24} />
        </div>
        <span className="text-xl font-bold tracking-tight text-white">
          MASTER
          <br />
          <span className="text-[10px] text-indigo-400 -mt-2 block">
            AI WORKFLOW
          </span>
        </span>
      </div>

      <nav className="flex-1 space-y-2">
        {NAV_ITEMS.map((item) => (
          <SidebarItem
            key={item.key}
            icon={item.icon}
            label={item.label}
            active={activeTab === item.key}
            onClick={() => onTabChange(item.key)}
          />
        ))}
      </nav>

      <div className="mt-auto p-4 bg-indigo-600/10 border border-indigo-500/20 rounded-xl">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs text-indigo-300">BALANCE</span>
          <span className="text-sm font-bold">20 CRD</span>
        </div>
        <button
          type="button"
          className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-all"
        >
          TOPUP NOW
        </button>
      </div>
    </aside>
  );
}
