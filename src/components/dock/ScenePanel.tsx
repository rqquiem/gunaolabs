import React from 'react';
import { Eye, EyeOff, Lightbulb, Plus, Trash2 } from 'lucide-react';
import { PROJECT_PRESETS } from '../../engine/presets';
import { evaluateLightingAt, formatTimecode } from '../../engine/timeline';
import {
  AnimationProject,
  EnvironmentId,
  LightingMood,
  StageLightConfig,
  StageLightType,
} from '../../engine/types';

interface ScenePanelProps {
  project: AnimationProject;
  currentTime: number;
  showLightHelpers: boolean;
  onUpdateProject: (updater: (prev: AnimationProject) => AnimationProject) => void;
  onLoadPreset: (preset: AnimationProject) => void;
  onKeyLightingAtCurrentTime: () => void;
  onToggleLightHelpers: () => void;
  onUpsertStageLight: (light: StageLightConfig) => void;
  onDeleteStageLight: (lightId: string) => void;
}

const ENVIRONMENTS: { id: EnvironmentId; label: string }[] = [
  { id: 'crossroads', label: 'Crossroads Baseplate' },
  { id: 'town', label: 'Blocky Town Plaza' },
];

const MOODS: { id: LightingMood; label: string }[] = [
  { id: 'noon', label: 'Classic Noon' },
  { id: 'sunset', label: 'Golden Sunset' },
  { id: 'midnight', label: 'Midnight Sky' },
  { id: 'overcast', label: 'Cloudy Day' },
];

export const ScenePanel: React.FC<ScenePanelProps> = ({
  project,
  currentTime,
  showLightHelpers,
  onUpdateProject,
  onLoadPreset,
  onKeyLightingAtCurrentTime,
  onToggleLightHelpers,
  onUpsertStageLight,
  onDeleteStageLight,
}) => {
  const evalLight = evaluateLightingAt(project, currentTime);
  const stageLights = project.stageLights ?? [];

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

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="space-y-2.5">
        <div>
          <span className="block text-xs font-medium text-slate-400 mb-1">
            Roblox Stage Environment
          </span>
          <div className="grid grid-cols-2 gap-1.5">
            {ENVIRONMENTS.map((env) => (
              <button
                key={env.id}
                type="button"
                onClick={() =>
                  onUpdateProject((p) => ({ ...p, environment: env.id }))
                }
                className={`px-2 py-1.5 rounded-md text-xs font-medium border transition-colors whitespace-nowrap truncate ${
                  project.environment === env.id
                    ? 'bg-[#00a2ff] border-[#00a2ff] text-slate-950 font-semibold'
                    : 'bg-[#2b2e35] border-[#393d47] text-slate-200 hover:bg-[#363a43]'
                }`}
              >
                {env.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <label htmlFor="scene-duration" className="text-xs text-slate-400 shrink-0">
            Duration (sec)
          </label>
          <input
            id="scene-duration"
            type="number"
            min={2}
            max={60}
            step={1}
            value={project.duration}
            onChange={(e) => {
              const val = Math.max(2, Math.min(60, Number(e.target.value) || 8));
              onUpdateProject((p) => ({ ...p, duration: val }));
            }}
            className="w-20 px-2 py-1 rounded bg-[#14161a] border border-[#393d47] text-xs font-mono-tabular text-slate-100"
          />
        </div>

        <div>
          <span className="block text-xs font-medium text-slate-400 mb-1">
            Starter Projects
          </span>
          <div className="grid grid-cols-1 gap-1 max-h-20 overflow-y-auto pr-1">
            {PROJECT_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => onLoadPreset(preset)}
                className={`flex items-center justify-between px-2.5 py-1 rounded text-xs text-left border transition-colors ${
                  project.id === preset.id
                    ? 'bg-[#2b2e35] border-[#00a2ff] text-[#38bdf8] font-semibold'
                    : 'bg-[#14161a] border-[#393d47] text-slate-300 hover:border-slate-500'
                }`}
              >
                <span className="truncate">{preset.name}</span>
                <span className="text-[11px] font-mono-tabular text-slate-500 ml-2 shrink-0">
                  {preset.duration}s
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

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

        <div className="grid grid-cols-2 gap-1.5">
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
            <label htmlFor="sun-azimuth-slider" className="text-[11px] text-slate-400 w-16 shrink-0">
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
            <label htmlFor="sun-elevation-slider" className="text-[11px] text-slate-400 w-16 shrink-0">
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
            <label htmlFor="key-light-slider" className="text-[11px] text-slate-400 w-16 shrink-0">
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
            <label htmlFor="exposure-slider" className="text-[11px] text-slate-400 w-16 shrink-0">
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
  );
};
