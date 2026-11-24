import React from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { DockTab } from '../engine/types';

interface StudioDockProps {
  activeTab: DockTab;
  onSelectTab: (tab: DockTab) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  children: React.ReactNode;
}

const TABS: { id: DockTab; label: string }[] = [
  { id: 'timeline', label: 'Timeline' },
  { id: 'scene', label: 'Scene' },
  { id: 'character', label: 'Characters' },
  { id: 'cutscene', label: 'Cutscene' },
  { id: 'export', label: 'Export' },
];

export const StudioDock: React.FC<StudioDockProps> = ({
  activeTab,
  onSelectTab,
  isCollapsed,
  onToggleCollapse,
  children,
}) => {
  return (
    <div
      className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-20 w-[min(1020px,95vw)] transition-transform duration-200 ${
        isCollapsed ? 'translate-y-[calc(100%-30px)]' : 'translate-y-0'
      }`}
    >
      <div className="flex justify-center">
        <button
          type="button"
          onClick={onToggleCollapse}
          aria-expanded={!isCollapsed}
          className="inline-flex items-center gap-1.5 px-4 py-1 rounded-t-md bg-[#1e2024] border border-b-0 border-[#393d47] text-xs font-medium text-slate-300 hover:text-white transition-colors whitespace-nowrap"
        >
          {isCollapsed ? (
            <>
              <ChevronUp className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Show Controls</span>
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Hide Controls</span>
            </>
          )}
        </button>
      </div>

      <section
        aria-label="Animation Studio Controls"
        className="rounded-lg bg-[#1e2024]/97 border border-[#393d47] shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between gap-1 px-2.5 py-1.5 border-b border-[#393d47] md:hidden">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => onSelectTab(tab.id)}
              className={`px-2 py-1 rounded text-[11px] font-medium whitespace-nowrap shrink-0 ${
                activeTab === tab.id
                  ? 'bg-[#00a2ff] text-slate-950 font-semibold'
                  : 'text-slate-300 hover:bg-[#2b2e35]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-3.5 md:p-4 max-h-[46vh] md:max-h-none overflow-y-auto">
          {children}
        </div>
      </section>
    </div>
  );
};
