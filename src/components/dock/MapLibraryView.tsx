import React, { useMemo, useRef, useState } from 'react';
import {
  Check,
  CopyPlus,
  Download,
  Hammer,
  Search,
  Sparkles,
  Trash2,
  Upload,
} from 'lucide-react';
import {
  AnimationProject,
  MAP_CATEGORY_LABELS,
  MapCategory,
  MapDefinition,
} from '../../engine/types';

interface MapLibraryViewProps {
  project: AnimationProject;
  builtInMaps: MapDefinition[];
  customMaps: MapDefinition[];
  applyAtmosphere: boolean;
  onToggleApplyAtmosphere: () => void;
  onApplyMap: (map: MapDefinition) => void;
  onCloneToBuilder: (map: MapDefinition) => void;
  onCreateBlankMap: () => void;
  onDeleteCustomMap: (mapId: string) => void;
  onExportMaps: () => void;
  onExportSingleMap: (map: MapDefinition) => void;
  onImportMapsJson: (raw: string) => { ok: boolean; message: string };
}

const MapMiniPreview: React.FC<{ map: MapDefinition }> = ({ map }) => {
  const { groundColor, trimColor, pathStyle, size } = map.baseplate;
  const half = Math.max(10, size * 0.5);

  return (
    <svg
      viewBox="0 0 40 40"
      className="w-9 h-9 rounded border border-[#393d47] shrink-0"
      aria-hidden="true"
    >
      <rect x="0" y="0" width="40" height="40" fill={groundColor} />
      {pathStyle === 'cross' && (
        <>
          <rect x="17" y="3" width="6" height="34" fill={trimColor} opacity="0.88" />
          <rect x="3" y="17" width="34" height="6" fill={trimColor} opacity="0.88" />
        </>
      )}
      {pathStyle === 'plaza' && (
        <rect
          x="10"
          y="10"
          width="20"
          height="20"
          rx="1.5"
          fill={trimColor}
          opacity="0.85"
        />
      )}
      {pathStyle === 'runway' && (
        <rect x="16" y="2" width="8" height="36" fill={trimColor} opacity="0.85" />
      )}
      {pathStyle === 'street' && (
        <>
          <rect x="2" y="20" width="36" height="8" fill="#334155" />
          <rect x="18" y="20" width="4" height="8" fill="#f8fafc" opacity="0.85" />
        </>
      )}
      {pathStyle === 'cityGrid' && (
        <>
          <rect x="24" y="24" width="14" height="14" rx="1.5" fill="#4b974b" opacity="0.92" />
          <rect x="16" y="0" width="8" height="40" fill="#272c36" />
          <rect x="0" y="16" width="40" height="8" fill="#272c36" />
          <line x1="20" y1="2" x2="20" y2="14" stroke="#facc15" strokeWidth="0.9" strokeDasharray="2 1.5" />
          <line x1="20" y1="26" x2="20" y2="38" stroke="#facc15" strokeWidth="0.9" strokeDasharray="2 1.5" />
          <line x1="2" y1="20" x2="14" y2="20" stroke="#facc15" strokeWidth="0.9" strokeDasharray="2 1.5" />
          <line x1="26" y1="20" x2="38" y2="20" stroke="#facc15" strokeWidth="0.9" strokeDasharray="2 1.5" />
          <circle cx="30" cy="30" r="2.2" fill="#38bdf8" />
        </>
      )}
      {pathStyle === 'hardwood' && (
        <>
          <rect x="3" y="3" width="34" height="2" fill="#e2e8f0" opacity="0.85" />
          <rect x="3" y="3" width="2" height="34" fill="#e2e8f0" opacity="0.85" />
        </>
      )}
      {map.modules.slice(0, 8).map((mod) => {
        const cx = 20 + (mod.position[0] / half) * 16;
        const cy = 20 + (mod.position[2] / half) * 16;
        return (
          <rect
            key={mod.id}
            x={Math.max(2, Math.min(34, cx - 2))}
            y={Math.max(2, Math.min(34, cy - 2))}
            width="4"
            height="4"
            rx="0.8"
            fill={mod.primaryColor}
            stroke="#0b0d12"
            strokeWidth="0.6"
          />
        );
      })}
    </svg>
  );
};

export const MapLibraryView: React.FC<MapLibraryViewProps> = ({
  project,
  builtInMaps,
  customMaps,
  applyAtmosphere,
  onToggleApplyAtmosphere,
  onApplyMap,
  onCloneToBuilder,
  onCreateBlankMap,
  onDeleteCustomMap,
  onExportMaps,
  onExportSingleMap,
  onImportMapsJson,
}) => {
  const [categoryFilter, setCategoryFilter] = useState<'all' | MapCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [feedback, setFeedback] = useState<{
    type: 'ok' | 'err';
    text: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const allMaps = useMemo(
    () => [...customMaps, ...builtInMaps],
    [customMaps, builtInMaps],
  );

  const activeMapKey =
    project.environment === 'custom'
      ? project.customMap?.id ?? project.mapId ?? 'custom'
      : `map_${project.environment}`;

  const filteredMaps = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return allMaps.filter((m) => {
      if (categoryFilter === 'custom') {
        if (m.builtIn) return false;
      } else if (categoryFilter !== 'all') {
        if (m.category !== categoryFilter) return false;
      }
      if (q.length > 0) {
        const hay = `${m.name} ${MAP_CATEGORY_LABELS[m.category]} ${m.description}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [allMaps, categoryFilter, searchQuery]);

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const content = typeof reader.result === 'string' ? reader.result : '';
      const res = onImportMapsJson(content);
      setFeedback({ type: res.ok ? 'ok' : 'err', text: res.message });
    };
    reader.onerror = () => {
      setFeedback({ type: 'err', text: 'Could not read the selected map JSON file.' });
    };
    reader.readAsText(file);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
      {/* Left/Main: Category Filter, Search & Map Cards */}
      <div className="lg:col-span-8 space-y-2 min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
            {(
              [
                { id: 'all', label: `All (${allMaps.length})` },
                { id: 'arena', label: 'Arena' },
                { id: 'town', label: 'Town' },
                { id: 'interior', label: 'Interior' },
                { id: 'nature', label: 'Nature' },
                { id: 'scifi', label: 'Sci-Fi' },
                { id: 'custom', label: `Custom (${customMaps.length})` },
              ] as const
            ).map((tab) => {
              const active = categoryFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setCategoryFilter(tab.id)}
                  className={`px-2 py-1 rounded text-[11px] font-medium border transition-colors whitespace-nowrap shrink-0 ${
                    active
                      ? 'bg-[#00a2ff] border-[#00a2ff] text-slate-950 font-semibold'
                      : 'bg-[#14161a] border-[#393d47] text-slate-300 hover:bg-[#2b2e35]'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="relative flex items-center shrink-0">
            <Search
              className="w-3.5 h-3.5 text-slate-500 absolute left-2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="text"
              aria-label="Search maps"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search maps..."
              className="w-36 pl-7 pr-2 py-1 rounded bg-[#14161a] border border-[#393d47] text-[11px] text-slate-200 placeholder:text-slate-500"
            />
          </div>
        </div>

        {filteredMaps.length === 0 ? (
          <div className="py-6 px-4 rounded bg-[#14161a] border border-[#393d47] text-center">
            <p className="text-xs text-slate-400">
              {categoryFilter === 'custom'
                ? 'No custom maps saved yet. Click "New Blank Map" or remix any built-in map.'
                : 'No maps match the current filter.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-40 overflow-y-auto pr-1">
            {filteredMaps.map((map) => {
              const isActive =
                (project.environment === 'custom' &&
                  project.customMap?.id === map.id) ||
                (project.environment !== 'custom' &&
                  map.builtIn &&
                  map.builtInSourceId === project.environment) ||
                activeMapKey === map.id;

              return (
                <div
                  key={map.id}
                  className={`flex items-center justify-between gap-2 p-2 rounded border transition-colors ${
                    isActive
                      ? 'bg-[#2b2e35] border-[#00a2ff]'
                      : 'bg-[#14161a] border-[#393d47] hover:border-slate-500'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <MapMiniPreview map={map} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span
                          className={`text-xs font-medium truncate ${
                            isActive ? 'text-white' : 'text-slate-200'
                          }`}
                        >
                          {map.name}
                        </span>
                        {isActive && (
                          <Check
                            className="w-3.5 h-3.5 text-[#00a2ff] shrink-0"
                            aria-label="Active map"
                          />
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">
                        {MAP_CATEGORY_LABELS[map.category]} · {map.modules.length} modules ·{' '}
                        {map.baseplate.size}×{map.baseplate.size}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        onApplyMap(map);
                        setFeedback({
                          type: 'ok',
                          text: `Swapped stage to "${map.name}" (actors & timeline kept).`,
                        });
                      }}
                      className={`px-2 py-1 rounded text-[11px] font-medium border transition-colors whitespace-nowrap shrink-0 ${
                        isActive
                          ? 'bg-[#00a2ff] border-[#00a2ff] text-slate-950 font-semibold'
                          : 'bg-[#2b2e35] border-[#393d47] text-slate-100 hover:bg-[#363a43]'
                      }`}
                    >
                      Apply
                    </button>
                    <button
                      type="button"
                      onClick={() => onCloneToBuilder(map)}
                      title="Edit a copy in Map Builder"
                      aria-label={`Edit copy of ${map.name}`}
                      className="p-1.5 rounded bg-[#2b2e35] border border-[#393d47] text-slate-300 hover:text-white hover:bg-[#363a43]"
                    >
                      <Hammer className="w-3 h-3" aria-hidden="true" />
                    </button>
                    {!map.builtIn && (
                      <>
                        <button
                          type="button"
                          onClick={() => onExportSingleMap(map)}
                          title="Export map JSON"
                          aria-label={`Export ${map.name}`}
                          className="p-1.5 rounded bg-[#2b2e35] border border-[#393d47] text-slate-300 hover:text-white hover:bg-[#363a43]"
                        >
                          <Download className="w-3 h-3" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            onDeleteCustomMap(map.id);
                            setFeedback({
                              type: 'ok',
                              text: `Removed custom map "${map.name}".`,
                            });
                          }}
                          title="Delete custom map"
                          aria-label={`Delete ${map.name}`}
                          className="p-1.5 rounded bg-[#2b2e35] border border-[#393d47] text-slate-400 hover:text-red-400 hover:bg-[#363a43]"
                        >
                          <Trash2 className="w-3 h-3" aria-hidden="true" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Right: Swap Options, Builder Entry & JSON Pack Controls */}
      <div className="lg:col-span-4 space-y-2 border-t lg:border-t-0 lg:border-l border-[#393d47] pt-2 lg:pt-0 lg:pl-3">
        <div className="space-y-1.5">
          <span className="block text-xs font-medium text-slate-400">
            Map Swap Behavior
          </span>
          <label className="flex items-start gap-2 p-2 rounded bg-[#14161a] border border-[#393d47] cursor-pointer">
            <input
              type="checkbox"
              checked={applyAtmosphere}
              onChange={onToggleApplyAtmosphere}
              className="accent-[#00a2ff] mt-0.5"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-1 text-xs font-medium text-slate-200">
                <Sparkles className="w-3 h-3 text-amber-400 shrink-0" aria-hidden="true" />
                <span>Apply Recommended Atmosphere</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-snug">
                Swapping maps always keeps your characters, poses, camera track, and subtitles intact.
              </p>
            </div>
          </label>
        </div>

        <div className="pt-1.5 border-t border-[#393d47]/70 space-y-1.5">
          <span className="block text-[11px] font-medium text-slate-400">
            Create or Remix
          </span>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={onCreateBlankMap}
              className="inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded bg-[#00a2ff] text-slate-950 text-xs font-semibold hover:bg-[#33b5ff] whitespace-nowrap shrink-0"
            >
              <CopyPlus className="w-3.5 h-3.5" aria-hidden="true" />
              <span>New Blank Map</span>
            </button>
            <button
              type="button"
              onClick={() => {
                const current =
                  project.environment === 'custom' && project.customMap
                    ? project.customMap
                    : builtInMaps.find((m) => m.builtInSourceId === project.environment) ??
                      builtInMaps[0];
                onCloneToBuilder(current);
              }}
              className="inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded bg-[#2b2e35] border border-[#393d47] text-slate-100 text-xs font-medium hover:bg-[#363a43] whitespace-nowrap shrink-0"
            >
              <Hammer className="w-3.5 h-3.5 text-[#38bdf8]" aria-hidden="true" />
              <span>Remix Active</span>
            </button>
          </div>
        </div>

        <div className="pt-1.5 border-t border-[#393d47]/70 flex flex-wrap items-center justify-between gap-1.5">
          <span className="text-[11px] text-slate-500">Map Pack JSON</span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onExportMaps}
              className="inline-flex items-center gap-1 px-2 py-1 rounded bg-[#2b2e35] border border-[#393d47] text-[11px] text-slate-200 hover:bg-[#363a43] whitespace-nowrap shrink-0"
            >
              <Download className="w-3 h-3" aria-hidden="true" />
              <span>Export</span>
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1 px-2 py-1 rounded bg-[#2b2e35] border border-[#393d47] text-[11px] text-slate-200 hover:bg-[#363a43] whitespace-nowrap shrink-0"
            >
              <Upload className="w-3 h-3" aria-hidden="true" />
              <span>Import</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              onChange={handleImportFile}
              className="hidden"
            />
          </div>
        </div>

        {feedback && (
          <div
            role="status"
            className={`text-[11px] px-2 py-1 rounded border ${
              feedback.type === 'ok'
                ? 'bg-emerald-950/50 border-emerald-700/60 text-emerald-300'
                : 'bg-red-950/50 border-red-700/60 text-red-300'
            }`}
          >
            {feedback.text}
          </div>
        )}
      </div>
    </div>
  );
};
