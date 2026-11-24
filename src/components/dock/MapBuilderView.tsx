import React, { useRef, useState } from 'react';
import {
  Copy,
  Download,
  Hammer,
  Plus,
  Save,
  Trash2,
  Upload,
} from 'lucide-react';
import { createModuleInstance, MAP_MODULE_CATALOG } from '../../engine/mapLibrary';
import {
  MAP_CATEGORIES,
  MAP_CATEGORY_LABELS,
  MapCategory,
  MapDefinition,
  MapModuleInstance,
  MapModuleKind,
  MapPathStyle,
  MapPerimeterStyle,
} from '../../engine/types';

interface MapBuilderViewProps {
  activeCustomMap: MapDefinition | undefined;
  selectedModuleId: string | null;
  onSelectModule: (moduleId: string | null) => void;
  onCloneCurrentToBuilder: () => void;
  onCreateBlankMap: () => void;
  onUpdateCustomMap: (updater: (prev: MapDefinition) => MapDefinition) => void;
  onSaveCustomMap: (map: MapDefinition) => void;
  onExportSingleMap: (map: MapDefinition) => void;
  onImportMapsJson: (raw: string) => { ok: boolean; message: string };
}

const PATH_STYLES: { id: MapPathStyle; label: string }[] = [
  { id: 'cross', label: 'Crossroads' },
  { id: 'plaza', label: 'Plaza' },
  { id: 'street', label: 'Main Street' },
  { id: 'cityGrid', label: 'City Grid' },
  { id: 'hardwood', label: 'Hardwood' },
  { id: 'runway', label: 'Runway' },
  { id: 'none', label: 'Clean' },
];

const PERIMETER_STYLES: { id: MapPerimeterStyle; label: string }[] = [
  { id: 'trees', label: 'Trees' },
  { id: 'citySkyline', label: 'City Skyline' },
  { id: 'picketFence', label: 'Picket Fence' },
  { id: 'bedroomCorner', label: 'Bedroom L-Wall' },
  { id: 'rocks', label: 'Rocks' },
  { id: 'neonRim', label: 'Neon Rim' },
  { id: 'open', label: 'Open' },
];

export const MapBuilderView: React.FC<MapBuilderViewProps> = ({
  activeCustomMap,
  selectedModuleId,
  onSelectModule,
  onCloneCurrentToBuilder,
  onCreateBlankMap,
  onUpdateCustomMap,
  onSaveCustomMap,
  onExportSingleMap,
  onImportMapsJson,
}) => {
  const [feedback, setFeedback] = useState<{
    type: 'ok' | 'err';
    text: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!activeCustomMap) {
    return (
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded bg-[#14161a] border border-[#393d47]">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-100">
            <Hammer className="w-4 h-4 text-[#00a2ff]" aria-hidden="true" />
            <span>Custom Modular Map Builder</span>
          </div>
          <p className="text-xs text-slate-400 max-w-xl">
            Built-in stages are read-only templates. Clone the active stage into an editable custom map or start from a fresh studded baseplate to place watchtowers, forts, shops, bridges, beacons, and terrain modules.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onCloneCurrentToBuilder}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#00a2ff] text-slate-950 text-xs font-semibold hover:bg-[#33b5ff] whitespace-nowrap shrink-0"
          >
            <Copy className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Remix Active Map</span>
          </button>
          <button
            type="button"
            onClick={onCreateBlankMap}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#2b2e35] border border-[#393d47] text-slate-100 text-xs font-medium hover:bg-[#363a43] whitespace-nowrap shrink-0"
          >
            <Plus className="w-3.5 h-3.5" aria-hidden="true" />
            <span>New Blank Stage</span>
          </button>
        </div>
      </div>
    );
  }

  const selectedModule =
    activeCustomMap.modules.find((m) => m.id === selectedModuleId) ??
    activeCustomMap.modules[0] ??
    null;

  const updateModule = (
    moduleId: string,
    patch: Partial<MapModuleInstance>,
  ) => {
    onUpdateCustomMap((prev) => ({
      ...prev,
      modules: prev.modules.map((m) =>
        m.id === moduleId ? { ...m, ...patch } : m,
      ),
    }));
  };

  const handleAddModule = (kind: MapModuleKind) => {
    const nextMod = createModuleInstance(kind, activeCustomMap.modules.length);
    onUpdateCustomMap((prev) => ({
      ...prev,
      modules: [...prev.modules, nextMod],
    }));
    onSelectModule(nextMod.id);
  };

  const handleDuplicateModule = (mod: MapModuleInstance) => {
    const dup: MapModuleInstance = {
      ...mod,
      id: `mod_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      label: `${mod.label} Copy`.slice(0, 40),
      position: [
        Math.min(42, Number((mod.position[0] + 2.5).toFixed(1))),
        mod.position[1],
        mod.position[2],
      ],
    };
    onUpdateCustomMap((prev) => ({
      ...prev,
      modules: [...prev.modules, dup],
    }));
    onSelectModule(dup.id);
  };

  const handleDeleteModule = (moduleId: string) => {
    onUpdateCustomMap((prev) => {
      const remaining = prev.modules.filter((m) => m.id !== moduleId);
      if (selectedModule?.id === moduleId) {
        onSelectModule(remaining[0]?.id ?? null);
      }
      return { ...prev, modules: remaining };
    });
  };

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
      setFeedback({ type: 'err', text: 'Failed to read map JSON file.' });
    };
    reader.readAsText(file);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
      {/* Column 1: Map Meta & Baseplate Properties */}
      <div className="lg:col-span-4 space-y-2 min-w-0">
        <div className="flex items-center gap-1.5">
          <input
            type="text"
            aria-label="Custom Map Name"
            value={activeCustomMap.name}
            onChange={(e) =>
              onUpdateCustomMap((prev) => ({ ...prev, name: e.target.value }))
            }
            className="flex-1 min-w-0 px-2 py-1 rounded bg-[#14161a] border border-[#393d47] text-xs font-medium text-slate-100"
          />
          <select
            aria-label="Map Category"
            value={activeCustomMap.category}
            onChange={(e) =>
              onUpdateCustomMap((prev) => ({
                ...prev,
                category: e.target.value as MapCategory,
              }))
            }
            className="w-22 px-1.5 py-1 rounded bg-[#14161a] border border-[#393d47] text-[11px] text-slate-200"
          >
            {MAP_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {MAP_CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
        </div>

        <div className="p-2 rounded bg-[#14161a] border border-[#393d47] space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-medium text-slate-400">
              Baseplate Size
            </span>
            <span className="text-[11px] font-mono-tabular text-slate-200">
              {activeCustomMap.baseplate.size}×{activeCustomMap.baseplate.size} studs
            </span>
          </div>
          <input
            type="range"
            aria-label="Baseplate Size"
            min={24}
            max={96}
            step={2}
            value={activeCustomMap.baseplate.size}
            onChange={(e) =>
              onUpdateCustomMap((prev) => ({
                ...prev,
                baseplate: { ...prev.baseplate, size: Number(e.target.value) },
              }))
            }
            className="studio-slider w-full"
          />

          <div className="grid grid-cols-2 gap-2 pt-0.5">
            <label className="flex items-center justify-between gap-2 text-[11px] text-slate-300">
              <span>Ground</span>
              <input
                type="color"
                aria-label="Ground Color"
                value={activeCustomMap.baseplate.groundColor}
                onChange={(e) =>
                  onUpdateCustomMap((prev) => ({
                    ...prev,
                    baseplate: { ...prev.baseplate, groundColor: e.target.value },
                  }))
                }
                className="w-6 h-5 rounded border border-[#393d47] bg-transparent cursor-pointer"
              />
            </label>
            <label className="flex items-center justify-between gap-2 text-[11px] text-slate-300">
              <span>Trim / Path</span>
              <input
                type="color"
                aria-label="Trim Color"
                value={activeCustomMap.baseplate.trimColor}
                onChange={(e) =>
                  onUpdateCustomMap((prev) => ({
                    ...prev,
                    baseplate: { ...prev.baseplate, trimColor: e.target.value },
                  }))
                }
                className="w-6 h-5 rounded border border-[#393d47] bg-transparent cursor-pointer"
              />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-1.5 pt-0.5">
            <label className="space-y-0.5">
              <span className="block text-[10px] text-slate-500">Path Inlay</span>
              <select
                aria-label="Path Style"
                value={activeCustomMap.baseplate.pathStyle}
                onChange={(e) =>
                  onUpdateCustomMap((prev) => ({
                    ...prev,
                    baseplate: {
                      ...prev.baseplate,
                      pathStyle: e.target.value as MapPathStyle,
                    },
                  }))
                }
                className="w-full px-1.5 py-1 rounded bg-[#1e2024] border border-[#393d47] text-[11px] text-slate-200"
              >
                {PATH_STYLES.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-0.5">
              <span className="block text-[10px] text-slate-500">Perimeter</span>
              <select
                aria-label="Perimeter Style"
                value={activeCustomMap.baseplate.perimeter}
                onChange={(e) =>
                  onUpdateCustomMap((prev) => ({
                    ...prev,
                    baseplate: {
                      ...prev.baseplate,
                      perimeter: e.target.value as MapPerimeterStyle,
                    },
                  }))
                }
                className="w-full px-1.5 py-1 rounded bg-[#1e2024] border border-[#393d47] text-[11px] text-slate-200"
              >
                {PERIMETER_STYLES.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              onSaveCustomMap(activeCustomMap);
              setFeedback({
                type: 'ok',
                text: `Saved "${activeCustomMap.name}" to Map Library.`,
              });
            }}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#00a2ff] text-slate-950 text-xs font-semibold hover:bg-[#33b5ff] whitespace-nowrap shrink-0"
          >
            <Save className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Save to Library</span>
          </button>
          <button
            type="button"
            onClick={() => onExportSingleMap(activeCustomMap)}
            className="inline-flex items-center gap-1 px-2 py-1 rounded bg-[#2b2e35] border border-[#393d47] text-[11px] text-slate-200 hover:bg-[#363a43] whitespace-nowrap shrink-0"
          >
            <Download className="w-3 h-3" aria-hidden="true" />
            <span>Export JSON</span>
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

      {/* Column 2: Add Brick Modules + Placed Module Hierarchy */}
      <div className="lg:col-span-4 space-y-2 border-t lg:border-t-0 lg:border-l border-[#393d47] pt-2 lg:pt-0 lg:pl-3 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-medium text-slate-400">
            Add Stage Module
          </span>
          <span className="text-[11px] font-mono-tabular text-slate-500">
            {activeCustomMap.modules.length} placed
          </span>
        </div>

        <div className="grid grid-cols-3 gap-1 max-h-24 overflow-y-auto pr-1">
          {MAP_MODULE_CATALOG.map((spec) => (
            <button
              key={spec.kind}
              type="button"
              onClick={() => handleAddModule(spec.kind)}
              title={spec.shortDesc}
              className="flex items-center gap-1 px-1.5 py-1 rounded bg-[#14161a] border border-[#393d47] text-[11px] text-slate-200 hover:border-[#00a2ff] hover:bg-[#20232a] truncate"
            >
              <Plus className="w-2.5 h-2.5 text-[#00a2ff] shrink-0" aria-hidden="true" />
              <span className="truncate">{spec.label}</span>
            </button>
          ))}
        </div>

        <div className="space-y-1 max-h-28 overflow-y-auto pr-1">
          {activeCustomMap.modules.length === 0 ? (
            <p className="text-[11px] text-slate-500 py-3 text-center border border-dashed border-[#393d47] rounded">
              Click any brick module above to place it on your baseplate.
            </p>
          ) : (
            activeCustomMap.modules.map((mod) => {
              const isSelected = selectedModule?.id === mod.id;
              return (
                <div
                  key={mod.id}
                  className={`flex items-center justify-between gap-1.5 px-2 py-1 rounded border text-xs ${
                    isSelected
                      ? 'bg-[#2b2e35] border-[#00a2ff] text-white'
                      : 'bg-[#14161a] border-[#393d47] text-slate-300 hover:border-slate-500'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => onSelectModule(mod.id)}
                    className="flex items-center gap-2 min-w-0 flex-1 text-left"
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-sm border border-black/40 shrink-0"
                      style={{ backgroundColor: mod.primaryColor }}
                      aria-hidden="true"
                    />
                    <span className="truncate font-medium">{mod.label}</span>
                  </button>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleDuplicateModule(mod)}
                      aria-label={`Duplicate ${mod.label}`}
                      className="p-0.5 text-slate-400 hover:text-slate-100"
                    >
                      <Copy className="w-3 h-3" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteModule(mod.id)}
                      aria-label={`Remove ${mod.label}`}
                      className="p-0.5 text-slate-500 hover:text-red-400"
                    >
                      <Trash2 className="w-3 h-3" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Column 3: Selected Module Transform & Brick Colors */}
      <div className="lg:col-span-4 space-y-2 border-t lg:border-t-0 lg:border-l border-[#393d47] pt-2 lg:pt-0 lg:pl-3 min-w-0">
        {!selectedModule ? (
          <div className="h-full flex items-center justify-center text-xs text-slate-500 p-4 border border-dashed border-[#393d47] rounded">
            Select a placed module to adjust position, rotation, scale, and brick colors.
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <input
                type="text"
                aria-label="Selected Module Label"
                value={selectedModule.label}
                onChange={(e) =>
                  updateModule(selectedModule.id, { label: e.target.value })
                }
                className="flex-1 min-w-0 px-2 py-1 rounded bg-[#14161a] border border-[#393d47] text-xs font-medium text-slate-100"
              />
              <div className="flex items-center gap-1.5 shrink-0">
                <input
                  type="color"
                  aria-label="Module Primary Color"
                  value={selectedModule.primaryColor}
                  onChange={(e) =>
                    updateModule(selectedModule.id, { primaryColor: e.target.value })
                  }
                  className="w-6 h-6 rounded border border-[#393d47] bg-transparent cursor-pointer"
                />
                <input
                  type="color"
                  aria-label="Module Accent Color"
                  value={selectedModule.accentColor}
                  onChange={(e) =>
                    updateModule(selectedModule.id, { accentColor: e.target.value })
                  }
                  className="w-6 h-6 rounded border border-[#393d47] bg-transparent cursor-pointer"
                />
              </div>
            </div>

            <div className="space-y-1.5 p-2 rounded bg-[#14161a] border border-[#393d47]">
              <label className="flex items-center gap-2 text-[11px] text-slate-300">
                <span className="w-12 text-slate-400 shrink-0">Pos X</span>
                <input
                  type="range"
                  min={-42}
                  max={42}
                  step={0.5}
                  value={selectedModule.position[0]}
                  onChange={(e) =>
                    updateModule(selectedModule.id, {
                      position: [
                        Number(e.target.value),
                        selectedModule.position[1],
                        selectedModule.position[2],
                      ],
                    })
                  }
                  className="studio-slider flex-1"
                />
                <span className="w-10 text-right font-mono-tabular">
                  {selectedModule.position[0].toFixed(1)}
                </span>
              </label>

              <label className="flex items-center gap-2 text-[11px] text-slate-300">
                <span className="w-12 text-slate-400 shrink-0">Pos Z</span>
                <input
                  type="range"
                  min={-42}
                  max={42}
                  step={0.5}
                  value={selectedModule.position[2]}
                  onChange={(e) =>
                    updateModule(selectedModule.id, {
                      position: [
                        selectedModule.position[0],
                        selectedModule.position[1],
                        Number(e.target.value),
                      ],
                    })
                  }
                  className="studio-slider flex-1"
                />
                <span className="w-10 text-right font-mono-tabular">
                  {selectedModule.position[2].toFixed(1)}
                </span>
              </label>

              <label className="flex items-center gap-2 text-[11px] text-slate-300">
                <span className="w-12 text-slate-400 shrink-0">Yaw</span>
                <input
                  type="range"
                  min={-180}
                  max={180}
                  step={15}
                  value={selectedModule.rotationYDeg}
                  onChange={(e) =>
                    updateModule(selectedModule.id, {
                      rotationYDeg: Number(e.target.value),
                    })
                  }
                  className="studio-slider flex-1"
                />
                <span className="w-10 text-right font-mono-tabular">
                  {Math.round(selectedModule.rotationYDeg)}°
                </span>
              </label>

              <label className="flex items-center gap-2 text-[11px] text-slate-300">
                <span className="w-12 text-slate-400 shrink-0">Scale</span>
                <input
                  type="range"
                  min={0.5}
                  max={2.2}
                  step={0.05}
                  value={selectedModule.scale}
                  onChange={(e) =>
                    updateModule(selectedModule.id, {
                      scale: Number(e.target.value),
                    })
                  }
                  className="studio-slider flex-1"
                />
                <span className="w-10 text-right font-mono-tabular">
                  {selectedModule.scale.toFixed(2)}×
                </span>
              </label>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
