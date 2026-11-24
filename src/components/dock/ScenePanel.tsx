import React, { useState } from 'react';
import {
  Clapperboard,
  Eye,
  EyeOff,
  Hammer,
  Lightbulb,
  Map as MapIcon,
  Plus,
  Sun,
  Trash2,
} from 'lucide-react';
import { getActiveMapLabel } from '../../engine/mapLibrary';
import { evaluateLightingAt, evaluateStageAt, formatTimecode } from '../../engine/timeline';
import {
  AnimationProject,
  LightingMood,
  MAX_SCENE_DURATION,
  MIN_SCENE_DURATION,
  MapDefinition,
  SceneCategory,
  SceneLibraryEntry,
  StageLightConfig,
  StageLightType,
} from '../../engine/types';
import { MapBuilderView } from './MapBuilderView';
import { MapLibraryView } from './MapLibraryView';
import { SceneLibraryView } from './SceneLibraryView';

type SceneSubTab = 'maps' | 'builder' | 'scenes' | 'lighting';

interface ScenePanelProps {
  project: AnimationProject;
  currentTime: number;
  showLightHelpers: boolean;
  builtInMaps: MapDefinition[];
  customMaps: MapDefinition[];
  builtInScenes: SceneLibraryEntry[];
  customScenes: SceneLibraryEntry[];
  selectedMapModuleId: string | null;
  onUpdateProject: (updater: (prev: AnimationProject) => AnimationProject) => void;
  onLoadPreset: (preset: AnimationProject) => void;
  onKeyLightingAtCurrentTime: () => void;
  onKeyMapAtCurrentTime?: (map: MapDefinition, applyAtmosphere: boolean) => void;
  onToggleLightHelpers: () => void;
  onUpsertStageLight: (light: StageLightConfig) => void;
  onDeleteStageLight: (lightId: string) => void;
  onApplyMap: (map: MapDefinition, applyAtmosphere: boolean) => void;
  onCloneMapToBuilder: (map: MapDefinition) => void;
  onCreateBlankMap: () => void;
  onSelectMapModule: (moduleId: string | null) => void;
  onUpdateCustomMap: (updater: (prev: MapDefinition) => MapDefinition) => void;
  onSaveCustomMap: (map: MapDefinition) => void;
  onDeleteCustomMap: (mapId: string) => void;
  onExportMaps: () => void;
  onExportSingleMap: (map: MapDefinition) => void;
  onImportMapsJson: (raw: string) => { ok: boolean; message: string };
  onSaveCurrentScene: (name: string, category: SceneCategory) => void;
  onDeleteCustomScene: (sceneId: string) => void;
  onExportScenes: () => void;
  onExportSingleScene: (scene: SceneLibraryEntry) => void;
  onImportScenesJson: (raw: string) => { ok: boolean; message: string };
}

const MOODS: { id: LightingMood; label: string }[] = [
  { id: 'noon', label: 'Classic Noon' },
  { id: 'sunset', label: 'Golden Sunset' },
  { id: 'midnight', label: 'Midnight Sky' },
  { id: 'overcast', label: 'Cloudy Day' },
];

const DURATION_PRESETS: { label: string; sec: number }[] = [
  { label: '15s', sec: 15 },
  { label: '3m', sec: 180 },
  { label: '5m', sec: 300 },
  { label: '8m', sec: 480 },
  { label: '10m', sec: 600 },
];

export const ScenePanel: React.FC<ScenePanelProps> = ({
  project,
  currentTime,
  showLightHelpers,
  builtInMaps,
  customMaps,
  builtInScenes,
  customScenes,
  selectedMapModuleId,
  onUpdateProject,
  onLoadPreset,
  onKeyLightingAtCurrentTime,
  onKeyMapAtCurrentTime,
  onToggleLightHelpers,
  onUpsertStageLight,
  onDeleteStageLight,
  onApplyMap,
  onCloneMapToBuilder,
  onCreateBlankMap,
  onSelectMapModule,
  onUpdateCustomMap,
  onSaveCustomMap,
  onDeleteCustomMap,
  onExportMaps,
  onExportSingleMap,
  onImportMapsJson,
  onSaveCurrentScene,
  onDeleteCustomScene,
  onExportScenes,
  onExportSingleScene,
  onImportScenesJson,
}) => {
  const [subTab, setSubTab] = useState<SceneSubTab>('maps');
  const [applyAtmosphere, setApplyAtmosphere] = useState(true);

  const evalStage = evaluateStageAt(project, currentTime);
  const evalLight = evaluateLightingAt(project, currentTime, evalStage);
  const stageLights = project.stageLights ?? [];
  const activeMapLabel = evalStage.label || getActiveMapLabel(project);

  const handleChangeSubTab = (next: SceneSubTab) => {
    setSubTab(next);
    if (next !== 'builder') {
      onSelectMapModule(null);
    } else if (
      project.environment === 'custom' &&
      project.customMap &&
      !selectedMapModuleId
    ) {
      onSelectMapModule(project.customMap.modules[0]?.id ?? null);
    }
  };

  const updateLiveLighting = (
    patch: Partial<{
      sunAzimuth: number;
      sunElevation: number;
      keyIntensity: number;
      rimIntensity: number;
      exposure: number;
    }>,
  ) => {
    onUpdateProject((prev) => {
      const track = prev.lightingTrack ?? [];
      const nearIdx = track.findIndex(
        (kf) => Math.abs(kf.time - currentTime) < 0.08,
      );
      const nextTrack = [...track];
      if (nearIdx >= 0) {
        nextTrack[nearIdx] = { ...nextTrack[nearIdx], ...patch };
      }
      return {
        ...prev,
        ...patch,
        lightingTrack: nextTrack,
      };
    });
  };

  const handleAddStageLight = (type: StageLightType) => {
    const idx = stageLights.length + 1;
    const isSpot = type === 'spot';
    onUpsertStageLight({
      id: `slight_${Date.now()}`,
      name: isSpot ? `Spot Light ${idx}` : `Point Light ${idx}`,
      type,
      color: isSpot ? '#fff1c2' : '#00a2ff',
      intensity: isSpot ? 16 : 7,
      distance: isSpot ? 16 : 9,
      angleDeg: 38,
      penumbra: 0.5,
      position: isSpot ? [0, 5.2, 2.4] : [-1.5 + (idx % 3) * 1.4, 1.8, 0.5],
      target: [0, 1.0, 0],
      enabled: true,
      castShadow: false,
    });
  };

  const activeBuiltInOrCustomMap =
    project.environment === 'custom' && project.customMap
      ? project.customMap
      : builtInMaps.find((m) => m.builtInSourceId === project.environment) ??
        builtInMaps[0];

  return (
    <div className="space-y-2.5">
      {/* Sub-navigation + Active Stage & Duration Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#393d47]">
        <div className="flex items-center gap-1 overflow-x-auto">
          {(
            [
              { id: 'maps', label: 'Maps', icon: MapIcon },
              { id: 'builder', label: 'Map Builder', icon: Hammer },
              { id: 'scenes', label: 'Scenes', icon: Clapperboard },
              { id: 'lighting', label: 'Lighting', icon: Sun },
            ] as const
          ).map((item) => {
            const Icon = item.icon;
            const active = subTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleChangeSubTab(item.id)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium border transition-colors whitespace-nowrap shrink-0 ${
                  active
                    ? 'bg-[#00a2ff] border-[#00a2ff] text-slate-950 font-semibold'
                    : 'bg-[#14161a] border-[#393d47] text-slate-300 hover:bg-[#2b2e35]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs shrink-0">
          <span className="hidden lg:inline text-slate-400 truncate max-w-[210px]">
            Stage: <strong className="text-slate-200 font-medium">{activeMapLabel}</strong>
          </span>
          {onKeyMapAtCurrentTime && (
            <button
              type="button"
              onClick={() => onKeyMapAtCurrentTime(activeBuiltInOrCustomMap, applyAtmosphere)}
              title="Cue current active map on the Stage/Map timeline track at the playhead"
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#2b2e35] border border-[#393d47] text-[11px] font-medium text-slate-100 hover:bg-[#363a43] whitespace-nowrap shrink-0"
            >
              <Plus className="w-3 h-3 text-orange-400" aria-hidden="true" />
              <span>Key Map ({formatTimecode(currentTime)})</span>
            </button>
          )}
          <div className="flex items-center gap-1">
            {DURATION_PRESETS.map((preset) => (
              <button
                key={preset.sec}
                type="button"
                onClick={() => onUpdateProject((p) => ({ ...p, duration: preset.sec }))}
                className={`px-1.5 py-0.5 rounded text-[11px] font-mono-tabular border transition-colors whitespace-nowrap shrink-0 ${
                  Math.abs(project.duration - preset.sec) < 0.1
                    ? 'bg-[#00a2ff]/20 border-[#00a2ff] text-[#38bdf8]'
                    : 'bg-[#14161a] border-[#393d47] text-slate-400 hover:text-slate-200'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1.5">
            <label htmlFor="scene-duration" className="text-slate-400 shrink-0">
              Length
            </label>
            <input
              id="scene-duration"
              type="number"
              min={MIN_SCENE_DURATION}
              max={MAX_SCENE_DURATION}
              step={1}
              value={Math.round(project.duration)}
              onChange={(e) => {
                const raw = Number(e.target.value);
                const val = Number.isFinite(raw)
                  ? Math.max(MIN_SCENE_DURATION, Math.min(MAX_SCENE_DURATION, raw))
                  : 8;
                onUpdateProject((p) => ({ ...p, duration: val }));
              }}
              className="w-16 px-2 py-0.5 rounded bg-[#14161a] border border-[#393d47] text-xs font-mono-tabular text-slate-100"
            />
            <span className="text-[11px] font-mono-tabular text-slate-500 whitespace-nowrap">
              {formatTimecode(project.duration)}
            </span>
          </div>
        </div>
      </div>

      {/* Sub-view Content */}
      {subTab === 'maps' && (
        <MapLibraryView
          project={project}
          builtInMaps={builtInMaps}
          customMaps={customMaps}
          applyAtmosphere={applyAtmosphere}
          onToggleApplyAtmosphere={() => setApplyAtmosphere((v) => !v)}
          onApplyMap={(map) => onApplyMap(map, applyAtmosphere)}
          onCloneToBuilder={(map) => {
            onCloneMapToBuilder(map);
            setSubTab('builder');
          }}
          onCreateBlankMap={() => {
            onCreateBlankMap();
            setSubTab('builder');
          }}
          onDeleteCustomMap={onDeleteCustomMap}
          onExportMaps={onExportMaps}
          onExportSingleMap={onExportSingleMap}
          onImportMapsJson={onImportMapsJson}
        />
      )}

      {subTab === 'builder' && (
        <MapBuilderView
          activeCustomMap={
            project.environment === 'custom' ? project.customMap : undefined
          }
          selectedModuleId={selectedMapModuleId}
          onSelectModule={onSelectMapModule}
          onCloneCurrentToBuilder={() => onCloneMapToBuilder(activeBuiltInOrCustomMap)}
          onCreateBlankMap={onCreateBlankMap}
          onUpdateCustomMap={onUpdateCustomMap}
          onSaveCustomMap={onSaveCustomMap}
          onExportSingleMap={onExportSingleMap}
          onImportMapsJson={onImportMapsJson}
        />
      )}

      {subTab === 'scenes' && (
        <SceneLibraryView
          project={project}
          builtInScenes={builtInScenes}
          customScenes={customScenes}
          onLoadScene={onLoadPreset}
          onSaveCurrentScene={onSaveCurrentScene}
          onDeleteCustomScene={onDeleteCustomScene}
          onExportScenes={onExportScenes}
          onExportSingleScene={onExportSingleScene}
          onImportScenesJson={onImportScenesJson}
        />
      )}

      {subTab === 'lighting' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-slate-400">
                Skybox & Sun Lighting
              </span>
              <button
                type="button"
                onClick={onKeyLightingAtCurrentTime}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#2b2e35] border border-[#393d47] text-[11px] font-medium text-slate-100 hover:bg-[#363a43] whitespace-nowrap shrink-0"
              >
                <Plus className="w-3 h-3 text-violet-400" aria-hidden="true" />
                <span>Key Light ({formatTimecode(currentTime)})</span>
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {MOODS.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() =>
                    onUpdateProject((p) => ({ ...p, lightingMood: m.id }))
                  }
                  className={`px-2 py-1 rounded-md text-xs font-medium border transition-colors whitespace-nowrap ${
                    project.lightingMood === m.id
                      ? 'bg-slate-100 border-slate-100 text-slate-950 font-semibold'
                      : 'bg-[#2b2e35] border-[#393d47] text-slate-300 hover:bg-[#363a43]'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            <div className="space-y-1 pt-0.5">
              <div className="flex items-center gap-2">
                <label
                  htmlFor="sun-azimuth-slider"
                  className="text-[11px] text-slate-400 w-16 shrink-0"
                >
                  Azimuth
                </label>
                <input
                  id="sun-azimuth-slider"
                  type="range"
                  min={0}
                  max={360}
                  step={2}
                  value={Math.round(evalLight.sunAzimuth)}
                  onChange={(e) =>
                    updateLiveLighting({ sunAzimuth: Number(e.target.value) })
                  }
                  className="studio-slider flex-1"
                />
                <span className="text-[11px] font-mono-tabular text-slate-300 w-9 text-right">
                  {Math.round(evalLight.sunAzimuth)}°
                </span>
              </div>

              <div className="flex items-center gap-2">
                <label
                  htmlFor="sun-elevation-slider"
                  className="text-[11px] text-slate-400 w-16 shrink-0"
                >
                  Elevation
                </label>
                <input
                  id="sun-elevation-slider"
                  type="range"
                  min={10}
                  max={88}
                  step={1}
                  value={Math.round(evalLight.sunElevation)}
                  onChange={(e) =>
                    updateLiveLighting({ sunElevation: Number(e.target.value) })
                  }
                  className="studio-slider flex-1"
                />
                <span className="text-[11px] font-mono-tabular text-slate-300 w-9 text-right">
                  {Math.round(evalLight.sunElevation)}°
                </span>
              </div>

              <div className="flex items-center gap-2">
                <label
                  htmlFor="key-light-slider"
                  className="text-[11px] text-slate-400 w-16 shrink-0"
                >
                  Sun Key
                </label>
                <input
                  id="key-light-slider"
                  type="range"
                  min={0.2}
                  max={5}
                  step={0.1}
                  value={Number(evalLight.keyIntensity.toFixed(1))}
                  onChange={(e) =>
                    updateLiveLighting({ keyIntensity: Number(e.target.value) })
                  }
                  className="studio-slider flex-1"
                />
                <span className="text-[11px] font-mono-tabular text-slate-300 w-9 text-right">
                  {evalLight.keyIntensity.toFixed(1)}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <label
                  htmlFor="exposure-slider"
                  className="text-[11px] text-slate-400 w-16 shrink-0"
                >
                  Exposure
                </label>
                <input
                  id="exposure-slider"
                  type="range"
                  min={0.6}
                  max={1.6}
                  step={0.02}
                  value={Number(evalLight.exposure.toFixed(2))}
                  onChange={(e) =>
                    updateLiveLighting({ exposure: Number(e.target.value) })
                  }
                  className="studio-slider flex-1"
                />
                <span className="text-[11px] font-mono-tabular text-slate-300 w-9 text-right">
                  {evalLight.exposure.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-slate-400">
                Stage Lights ({stageLights.length})
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleAddStageLight('point')}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#2b2e35] border border-[#393d47] text-[11px] font-medium text-slate-200 hover:bg-[#363a43] whitespace-nowrap"
                >
                  <Plus className="w-3 h-3 text-amber-400" aria-hidden="true" />
                  <span>Point</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleAddStageLight('spot')}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#2b2e35] border border-[#393d47] text-[11px] font-medium text-slate-200 hover:bg-[#363a43] whitespace-nowrap"
                >
                  <Plus className="w-3 h-3 text-[#00a2ff]" aria-hidden="true" />
                  <span>Spot</span>
                </button>
                <button
                  type="button"
                  onClick={onToggleLightHelpers}
                  aria-label={showLightHelpers ? 'Hide Light Gizmos' : 'Show Light Gizmos'}
                  className="p-1 rounded bg-[#2b2e35] border border-[#393d47] text-slate-300 hover:bg-[#363a43]"
                >
                  {showLightHelpers ? (
                    <Eye className="w-3 h-3" aria-hidden="true" />
                  ) : (
                    <EyeOff className="w-3 h-3" aria-hidden="true" />
                  )}
                </button>
              </div>
            </div>

            <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
              {stageLights.length === 0 ? (
                <p className="text-xs text-slate-500 py-4 text-center border border-dashed border-[#393d47] rounded">
                  Add Point or Spot fixtures to light characters on stage.
                </p>
              ) : (
                stageLights.map((light) => (
                  <div
                    key={light.id}
                    className="p-2 rounded bg-[#14161a] border border-[#393d47] space-y-1.5 text-xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <button
                          type="button"
                          onClick={() =>
                            onUpsertStageLight({ ...light, enabled: !light.enabled })
                          }
                          aria-pressed={light.enabled}
                          aria-label={`Toggle ${light.name}`}
                          className={`p-1 rounded border shrink-0 ${
                            light.enabled
                              ? 'bg-amber-400/15 border-amber-400/50 text-amber-300'
                              : 'bg-[#2b2e35] border-[#393d47] text-slate-500'
                          }`}
                        >
                          <Lightbulb className="w-3 h-3" aria-hidden="true" />
                        </button>
                        <span className="truncate font-medium text-slate-200">
                          {light.name}
                        </span>
                        <span className="text-[10px] uppercase tracking-wide px-1 py-0.25 rounded bg-[#2b2e35] text-slate-400 shrink-0">
                          {light.type}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <input
                          type="color"
                          aria-label={`${light.name} Color`}
                          value={light.color}
                          onChange={(e) =>
                            onUpsertStageLight({ ...light, color: e.target.value })
                          }
                          className="w-5 h-5 rounded border border-[#393d47] bg-transparent cursor-pointer"
                        />
                        <button
                          type="button"
                          onClick={() => onDeleteStageLight(light.id)}
                          aria-label={`Delete ${light.name}`}
                          className="p-0.5 text-slate-500 hover:text-red-400"
                        >
                          <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <label className="flex items-center gap-1 text-[11px] text-slate-400">
                        <span>Int</span>
                        <input
                          type="range"
                          min={0}
                          max={30}
                          step={0.5}
                          aria-label={`${light.name} Intensity`}
                          value={light.intensity}
                          onChange={(e) =>
                            onUpsertStageLight({
                              ...light,
                              intensity: Number(e.target.value),
                            })
                          }
                          className="studio-slider flex-1 min-w-0"
                        />
                      </label>
                      {light.type === 'spot' ? (
                        <label className="flex items-center gap-1 text-[11px] text-slate-400">
                          <span>Cone</span>
                          <input
                            type="range"
                            min={12}
                            max={75}
                            step={1}
                            aria-label={`${light.name} Cone Angle`}
                            value={light.angleDeg}
                            onChange={(e) =>
                              onUpsertStageLight({
                                ...light,
                                angleDeg: Number(e.target.value),
                              })
                            }
                            className="studio-slider flex-1 min-w-0"
                          />
                        </label>
                      ) : (
                        <label className="flex items-center gap-1 text-[11px] text-slate-400">
                          <span>Pos Y</span>
                          <input
                            type="range"
                            min={0.4}
                            max={8}
                            step={0.2}
                            aria-label={`${light.name} Height`}
                            value={light.position[1]}
                            onChange={(e) =>
                              onUpsertStageLight({
                                ...light,
                                position: [
                                  light.position[0],
                                  Number(e.target.value),
                                  light.position[2],
                                ],
                              })
                            }
                            className="studio-slider flex-1 min-w-0"
                          />
                        </label>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
