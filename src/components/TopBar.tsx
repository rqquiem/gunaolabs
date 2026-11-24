import React from 'react';
import { Play, Pause } from 'lucide-react';
import { DockTab } from '../engine/types';

interface TopBarProps {
  activeTab: DockTab;
  onSelectTab: (tab: DockTab) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  isDockCollapsed: boolean;
  onExpandDock: () => void;
}

const NAV_TABS: { id: DockTab; label: string }[] = [
  { id: 'timeline', label: 'Timeline' },
  { id: 'scene', label: 'Scene' },
  { id: 'character', label: 'Characters' },
  { id: 'cutscene', label: 'Cutscene' },
  { id: 'export', label: 'Export' },
];

export const TopBar: React.FC<TopBarProps> = ({
  activeTab,
  onSelectTab,
  isPlaying,
  onTogglePlay,
  isDockCollapsed,
  onExpandDock,
}) => {
  return (
    <header className="relative z-20 flex items-center justify-between gap-8 px-6 py-2.5 bg-[#1e2024] border-b border-[#393d47]">
      <span className="text-base font-semibold tracking-tight text-slate-100 whitespace-nowrap shrink-0">
        Stagecraft 3D
      </span>

      <nav
        aria-label="Workspace Sections"
        className="hidden md:flex items-center gap-6"
      >
        {NAV_TABS.map((tab) => {
          const isActive = activeTab === tab.id && !isDockCollapsed;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                onSelectTab(tab.id);
                if (isDockCollapsed) onExpandDock();
              }}
              className={`text-sm font-medium transition-colors whitespace-nowrap shrink-0 pb-0.5 border-b-2 focus-visible:outline-2 focus-visible:outline-[#00a2ff] ${
                isActive
                  ? 'text-[#00a2ff] border-[#00a2ff]'
                  : 'text-slate-300 border-transparent hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </nav>

      <div className="flex items-center shrink-0">
        <button
          type="button"
          onClick={onTogglePlay}
          className="inline-flex items-center gap-2 px-4 py-1.5 text-xs font-semibold rounded-md bg-[#00a2ff] text-slate-950 hover:bg-[#33b5ff] transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00a2ff]"
        >
          {isPlaying ? (
            <>
              <Pause className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Pause</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Play Cutscene</span>
            </>
          )}
        </button>
      </div>
    </header>
  );
};
