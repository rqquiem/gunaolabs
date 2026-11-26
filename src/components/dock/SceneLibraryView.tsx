import React, { useMemo, useRef, useState } from 'react';
import {
  Clapperboard,
  Download,
  Play,
  Save,
  Search,
  Trash2,
  Upload,
} from 'lucide-react';
import { getActiveMapLabel } from '../../engine/mapLibrary';
import { formatTimecode } from '../../engine/timeline';
import {
  AnimationProject,
  SCENE_CATEGORIES,
  SCENE_CATEGORY_LABELS,
  SceneCategory,
  SceneLibraryEntry,
} from '../../engine/types';

interface SceneLibraryViewProps {
  project: AnimationProject;
  currentTime?: number;
  builtInScenes: SceneLibraryEntry[];
  customScenes: SceneLibraryEntry[];
  onLoadScene: (sceneProject: AnimationProject) => void;
  onWatchEpisode?: (sceneProject: AnimationProject) => void;
  onSeek?: (time: number) => void;
  onSaveCurrentScene: (name: string, category: SceneCategory) => void;
  onDeleteCustomScene: (sceneId: string) => void;
  onExportScenes: () => void;
  onExportSingleScene: (scene: SceneLibraryEntry) => void;
  onImportScenesJson: (raw: string) => { ok: boolean; message: string };
}

export const SceneLibraryView: React.FC<SceneLibraryViewProps> = ({
  project,
  currentTime = 0,
  builtInScenes,
  customScenes,
  onLoadScene,
  onWatchEpisode,
  onSeek,
  onSaveCurrentScene,
  onDeleteCustomScene,
  onExportScenes,
  onExportSingleScene,
  onImportScenesJson,
}) => {
  const [categoryFilter, setCategoryFilter] = useState<'all' | SceneCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [saveName, setSaveName] = useState('');
  const [saveCategory, setSaveCategory] = useState<SceneCategory>('custom');
  const [feedback, setFeedback] = useState<{
    type: 'ok' | 'err';
    text: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const allScenes = useMemo(
    () => [...customScenes, ...builtInScenes],
    [customScenes, builtInScenes],
  );

  const filteredScenes = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return allScenes.filter((scene) => {
      if (categoryFilter === 'custom') {
        if (scene.builtIn) return false;
      } else if (categoryFilter !== 'all') {
        if (scene.category !== categoryFilter) return false;
      }
      if (q.length > 0) {
        const mapLabel = getActiveMapLabel(scene.project);
        const hay = `${scene.name} ${SCENE_CATEGORY_LABELS[scene.category]} ${scene.description} ${mapLabel}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [allScenes, categoryFilter, searchQuery]);

  const handleSaveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = saveName.trim();
    if (!trimmed) {
      setFeedback({ type: 'err', text: 'Enter a scene name before saving.' });
      return;
    }
    onSaveCurrentScene(trimmed, saveCategory);
    setSaveName('');
    setFeedback({
      type: 'ok',
      text: `Saved "${trimmed}" snapshot to Scene Library.`,
    });
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const content = typeof reader.result === 'string' ? reader.result : '';
      const res = onImportScenesJson(content);
      setFeedback({ type: res.ok ? 'ok' : 'err', text: res.message });
    };
    reader.onerror = () => {
      setFeedback({ type: 'err', text: 'Failed to read the scene JSON file.' });
    };
    reader.readAsText(file);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
      {/* Left/Main: Category Filter, Search & Scene Cards */}
      <div className="lg:col-span-8 space-y-2 min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
            {(
              [
                { id: 'all', label: `All (${allScenes.length})` },
                { id: 'action', label: 'Action' },
                { id: 'comedy', label: 'Comedy' },
                { id: 'showcase', label: 'Showcase' },
                { id: 'template', label: 'Template' },
                { id: 'custom', label: `Saved (${customScenes.length})` },
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
              aria-label="Search scenes"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search scenes..."
              className="w-36 pl-7 pr-2 py-1 rounded bg-[#14161a] border border-[#393d47] text-[11px] text-slate-200 placeholder:text-slate-500"
            />
          </div>
        </div>

        {(() => {
          const featured = filteredScenes.find((s) => s.id === 'scene_idiom_town');
          if (!featured || !onWatchEpisode) return null;
          const isCurrentFeatured = project.id === featured.project.id;
          const featuredChapters = featured.project.chapters ?? [];
          return (
            <div
              className={`space-y-2 p-2.5 rounded border ${
                isCurrentFeatured
                  ? 'bg-[#2b2e35] border-[#00a2ff]'
                  : 'bg-[#14161a] border-[#393d47]'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-400 whitespace-nowrap shrink-0">
                      Featured Episode
                    </span>
                    <span className="text-xs font-semibold text-white truncate">
                      {featured.name}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 truncate">
                    Comedy · 01:30 · 7 Scenes · Distinct lighting moods, gaze tracking & SFX
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      onWatchEpisode(featured.project);
                      setFeedback({
                        type: 'ok',
                        text: `Playing "${featured.name}" in Director Camera.`,
                      });
                    }}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#00a2ff] border border-[#00a2ff] text-slate-950 text-[11px] font-semibold hover:bg-[#33b5ff] transition-colors whitespace-nowrap shrink-0"
                  >
                    <Play className="w-3 h-3" aria-hidden="true" />
                    <span>Watch Episode</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onLoadScene(featured.project);
                      setFeedback({
                        type: 'ok',
                        text: `Loaded "${featured.name}" into Studio.`,
                      });
                    }}
                    className="px-2 py-1 rounded bg-[#2b2e35] border border-[#393d47] text-[11px] font-medium text-slate-100 hover:bg-[#363a43] transition-colors whitespace-nowrap shrink-0"
                  >
                    Load in Studio
                  </button>
                </div>
              </div>

              {featuredChapters.length > 0 && (
                <div className="flex items-center gap-1 overflow-x-auto pt-1 border-t border-[#393d47]/70">
                  <span className="text-[10px] font-medium text-slate-400 shrink-0 mr-1">
                    Scenes:
                  </span>
                  {featuredChapters.map((ch, idx) => {
                    const nextTime =
                      featuredChapters[idx + 1]?.time ?? featured.project.duration;
                    const isChActive =
                      isCurrentFeatured &&
                      currentTime >= ch.time - 0.05 &&
                      currentTime < nextTime;
                    return (
                      <button
                        key={ch.id}
                        type="button"
                        onClick={() => {
                          if (!isCurrentFeatured) {
                            onLoadScene(featured.project);
                          }
                          onSeek?.(ch.time);
                          setFeedback({
                            type: 'ok',
                            text: `Jumped to "${ch.title}" (${formatTimecode(ch.time)}).`,
                          });
                        }}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium border transition-colors whitespace-nowrap shrink-0 ${
                          isChActive
                            ? 'bg-[#00a2ff]/20 border-[#00a2ff] text-white'
                            : 'bg-[#1b1e24] border-[#393d47] text-slate-300 hover:text-white hover:border-slate-500'
                        }`}
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full shrink-0"
                          style={{ backgroundColor: ch.color || '#00a2ff' }}
                        />
                        <span>{ch.title}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })()}

        {filteredScenes.length === 0 ? (
          <div className="py-6 px-4 rounded bg-[#14161a] border border-[#393d47] text-center">
            <p className="text-xs text-slate-400">
              {categoryFilter === 'custom'
                ? 'No saved scenes yet. Use "Save Current Scene" on the right to snapshot your stage, actors, and timeline.'
                : 'No scenes match the current filter.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-36 overflow-y-auto pr-1">
            {filteredScenes.map((scene) => {
              const isCurrent = project.id === scene.project.id;
              const mapLabel = getActiveMapLabel(scene.project);
              const actorsCount = scene.project.actors.length;
              const shotsCount = scene.project.cameraTrack.length;

              return (
                <div
                  key={scene.id}
                  className={`flex items-center justify-between gap-2 p-2 rounded border transition-colors ${
                    isCurrent
                      ? 'bg-[#2b2e35] border-[#00a2ff]'
                      : 'bg-[#14161a] border-[#393d47] hover:border-slate-500'
                  }`}
                >
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Clapperboard
                        className={`w-3.5 h-3.5 shrink-0 ${
                          isCurrent ? 'text-[#00a2ff]' : 'text-slate-400'
                        }`}
                        aria-hidden="true"
                      />
                      <span
                        className={`text-xs font-medium truncate ${
                          isCurrent ? 'text-white' : 'text-slate-200'
                        }`}
                      >
                        {scene.name}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 truncate">
                      {SCENE_CATEGORY_LABELS[scene.category]} ·{' '}
                      {scene.project.duration >= 60
                        ? formatTimecode(scene.project.duration).slice(0, 5)
                        : `${scene.project.duration}s`}{' '}
                      · {actorsCount} actors · {shotsCount} shots
                      {scene.project.chapters && scene.project.chapters.length > 0
                        ? ` · ${scene.project.chapters.length} ch`
                        : ''}
                    </div>
                    <div className="text-[10px] text-slate-500 truncate">
                      Map: {mapLabel}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        onLoadScene(scene.project);
                        setFeedback({
                          type: 'ok',
                          text: `Loaded full scene "${scene.name}".`,
                        });
                      }}
                      className={`px-2 py-1 rounded text-[11px] font-medium border transition-colors whitespace-nowrap shrink-0 ${
                        isCurrent
                          ? 'bg-[#00a2ff] border-[#00a2ff] text-slate-950 font-semibold'
                          : 'bg-[#2b2e35] border-[#393d47] text-slate-100 hover:bg-[#363a43]'
                      }`}
                    >
                      Load Scene
                    </button>

                    {!scene.builtIn && (
                      <>
                        <button
                          type="button"
                          onClick={() => onExportSingleScene(scene)}
                          title="Export scene JSON"
                          aria-label={`Export ${scene.name}`}
                          className="p-1.5 rounded bg-[#2b2e35] border border-[#393d47] text-slate-300 hover:text-white hover:bg-[#363a43]"
                        >
                          <Download className="w-3 h-3" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            onDeleteCustomScene(scene.id);
                            setFeedback({
                              type: 'ok',
                              text: `Deleted saved scene "${scene.name}".`,
                            });
                          }}
                          title="Delete saved scene"
                          aria-label={`Delete ${scene.name}`}
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

      {/* Right: Save Current Scene Snapshot & JSON Bundle Import/Export */}
      <div className="lg:col-span-4 space-y-2 border-t lg:border-t-0 lg:border-l border-[#393d47] pt-2 lg:pt-0 lg:pl-3">
        <form onSubmit={handleSaveSubmit} className="space-y-1.5">
          <span className="block text-xs font-medium text-slate-400">
            Save Current Scene Snapshot
          </span>
          <p className="text-[11px] text-slate-500 leading-snug">
            Captures the active map (including custom builds), lighting, actors, keyframes, cameras, and subtitles.
          </p>
          <div className="flex items-center gap-1.5">
            <input
              type="text"
              aria-label="New Scene Name"
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              placeholder={`${project.name}...`}
              className="flex-1 min-w-0 px-2 py-1 rounded bg-[#14161a] border border-[#393d47] text-xs text-slate-100 placeholder:text-slate-500"
            />
            <select
              aria-label="New Scene Category"
              value={saveCategory}
              onChange={(e) => setSaveCategory(e.target.value as SceneCategory)}
              className="w-24 px-1.5 py-1 rounded bg-[#14161a] border border-[#393d47] text-[11px] text-slate-200"
            >
              {SCENE_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {SCENE_CATEGORY_LABELS[c]}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded bg-[#00a2ff] text-slate-950 text-xs font-semibold hover:bg-[#33b5ff] whitespace-nowrap"
          >
            <Save className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Save to Scene Library</span>
          </button>
        </form>

        <div className="pt-2 border-t border-[#393d47]/70 flex flex-wrap items-center justify-between gap-1.5">
          <span className="text-[11px] text-slate-500">Scene Pack JSON</span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onExportScenes}
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
