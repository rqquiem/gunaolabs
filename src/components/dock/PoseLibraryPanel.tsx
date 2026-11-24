import React, { useMemo, useRef, useState } from 'react';
import {
  FlipHorizontal2,
  KeyRound,
  RotateCcw,
  Save,
  Trash2,
  Download,
  Upload,
  Search,
  Smile,
} from 'lucide-react';
import {
  POSE_CATEGORIES,
  POSE_CATEGORY_LABELS,
  PoseCategory,
  PosePreset,
  R6BodyPartId,
  Vec3Tuple,
} from '../../engine/types';

interface PoseLibraryPanelProps {
  builtInPoses: PosePreset[];
  customPoses: PosePreset[];
  activePoseId: string | null;
  isMirrored: boolean;
  includeExpression: boolean;
  hasActiveDraft: boolean;
  onSelectPose: (pose: PosePreset) => void;
  onToggleMirror: () => void;
  onToggleIncludeExpression: () => void;
  onCommitPose: () => void;
  onResetPose: () => void;
  onSaveCurrentPose: (
    name: string,
    category: PoseCategory,
    includeFace: boolean,
  ) => void;
  onDeleteCustomPose: (poseId: string) => void;
  onExportPoses: () => void;
  onImportPosesJson: (raw: string) => { ok: boolean; message: string };
}

/**
 * Compact R6 stick/block silhouette preview derived directly from a pose's joint angles.
 */
const PoseMiniSilhouette: React.FC<{
  joints: Record<R6BodyPartId, Vec3Tuple>;
  hipTilt: Vec3Tuple;
  active: boolean;
}> = ({ joints, hipTilt, active }) => {
  const stroke = active ? '#00a2ff' : '#94a3b8';
  const headFill = active ? '#38bdf8' : '#cbd5e1';

  // Project simplified 2D angles from R6 Euler rotations (X pitch + Z roll)
  const torsoAngleDeg = ((joints.torso[2] + hipTilt[2]) * 180) / Math.PI * 0.45;
  const lArmDeg = ((-joints.leftArm[2] - joints.leftArm[0] * 0.35) * 180) / Math.PI;
  const rArmDeg = ((-joints.rightArm[2] + joints.rightArm[0] * 0.35) * 180) / Math.PI;
  const lLegDeg = ((-joints.leftLeg[2] - joints.leftLeg[0] * 0.35) * 180) / Math.PI;
  const rLegDeg = ((-joints.rightLeg[2] + joints.rightLeg[0] * 0.35) * 180) / Math.PI;

  return (
    <svg
      viewBox="0 0 40 44"
      className="w-8 h-9 shrink-0"
      aria-hidden="true"
    >
      <g transform={`translate(20 22) rotate(${torsoAngleDeg.toFixed(1)})`}>
        {/* Head */}
        <rect x="-4" y="-16" width="8" height="7" rx="2" fill={headFill} />
        {/* Torso */}
        <rect x="-5" y="-8" width="10" height="12" rx="1.5" fill={stroke} opacity="0.85" />
        {/* Left Arm (+X on viewer left when facing front) */}
        <g transform={`translate(6 -7) rotate(${lArmDeg.toFixed(1)})`}>
          <rect x="-1.6" y="0" width="3.2" height="10" rx="1.2" fill={stroke} />
        </g>
        {/* Right Arm */}
        <g transform={`translate(-6 -7) rotate(${rArmDeg.toFixed(1)})`}>
          <rect x="-1.6" y="0" width="3.2" height="10" rx="1.2" fill={stroke} />
        </g>
        {/* Left Leg */}
        <g transform={`translate(2.6 4) rotate(${lLegDeg.toFixed(1)})`}>
          <rect x="-1.8" y="0" width="3.6" height="11" rx="1.2" fill={stroke} opacity="0.9" />
        </g>
        {/* Right Leg */}
        <g transform={`translate(-2.6 4) rotate(${rLegDeg.toFixed(1)})`}>
          <rect x="-1.8" y="0" width="3.6" height="11" rx="1.2" fill={stroke} opacity="0.9" />
        </g>
      </g>
    </svg>
  );
};

export const PoseLibraryPanel: React.FC<PoseLibraryPanelProps> = ({
  builtInPoses,
  customPoses,
  activePoseId,
  isMirrored,
  includeExpression,
  hasActiveDraft,
  onSelectPose,
  onToggleMirror,
  onToggleIncludeExpression,
  onCommitPose,
  onResetPose,
  onSaveCurrentPose,
  onDeleteCustomPose,
  onExportPoses,
  onImportPosesJson,
}) => {
  const [categoryFilter, setCategoryFilter] = useState<'all' | PoseCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [saveName, setSaveName] = useState('');
  const [saveCategory, setSaveCategory] = useState<PoseCategory>('custom');
  const [saveIncludeFace, setSaveIncludeFace] = useState(true);
  const [feedback, setFeedback] = useState<{
    type: 'ok' | 'err';
    text: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const allPoses = useMemo(
    () => [...customPoses, ...builtInPoses],
    [customPoses, builtInPoses],
  );

  const filteredPoses = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return allPoses.filter((pose) => {
      if (categoryFilter === 'custom') {
        if (pose.builtIn) return false;
      } else if (categoryFilter !== 'all') {
        if (pose.category !== categoryFilter) return false;
      }
      if (q.length > 0) {
        const hay = `${pose.name} ${POSE_CATEGORY_LABELS[pose.category]}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [allPoses, categoryFilter, searchQuery]);

  const handleSaveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = saveName.trim();
    if (!trimmed) {
      setFeedback({ type: 'err', text: 'Enter a pose name first.' });
      return;
    }
    onSaveCurrentPose(trimmed, saveCategory, saveIncludeFace);
    setSaveName('');
    setFeedback({ type: 'ok', text: `Saved "${trimmed}" to Pose Library.` });
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const content = typeof reader.result === 'string' ? reader.result : '';
      const res = onImportPosesJson(content);
      setFeedback({ type: res.ok ? 'ok' : 'err', text: res.message });
    };
    reader.onerror = () => {
      setFeedback({ type: 'err', text: 'Could not read the selected JSON file.' });
    };
    reader.readAsText(file);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
      {/* Left/Main: Category Filter, Search & Pose Preset Grid */}
      <div className="lg:col-span-8 space-y-2 min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
            {(
              [
                { id: 'all', label: `All (${allPoses.length})` },
                { id: 'idle', label: 'Idle' },
                { id: 'action', label: 'Action' },
                { id: 'combat', label: 'Combat' },
                { id: 'social', label: 'Social' },
                { id: 'cinematic', label: 'Cinematic' },
                { id: 'custom', label: `Custom (${customPoses.length})` },
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
              aria-label="Search poses"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search poses..."
              className="w-36 pl-7 pr-2 py-1 rounded bg-[#14161a] border border-[#393d47] text-[11px] text-slate-200 placeholder:text-slate-500"
            />
          </div>
        </div>

        {filteredPoses.length === 0 ? (
          <div className="py-6 px-4 rounded bg-[#14161a] border border-[#393d47] text-center">
            <p className="text-xs text-slate-400">
              {categoryFilter === 'custom'
                ? 'No custom poses saved yet. Pose your character and use "Save Current Pose" on the right.'
                : 'No poses match the current filter.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1.5 max-h-40 overflow-y-auto pr-1">
            {filteredPoses.map((pose) => {
              const isSelected = activePoseId === pose.id;
              return (
                <div
                  key={pose.id}
                  className={`group relative flex items-center gap-2 px-2 py-1.5 rounded border transition-colors ${
                    isSelected
                      ? 'bg-[#2b2e35] border-[#00a2ff]'
                      : 'bg-[#14161a] border-[#393d47] hover:border-slate-500 hover:bg-[#20232a]'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => onSelectPose(pose)}
                    className="flex items-center gap-2 text-left min-w-0 flex-1"
                  >
                    <PoseMiniSilhouette
                      joints={pose.joints}
                      hipTilt={pose.hipTilt}
                      active={isSelected}
                    />
                    <div className="min-w-0 flex-1">
                      <div
                        className={`text-xs font-medium truncate ${
                          isSelected ? 'text-white' : 'text-slate-200'
                        }`}
                      >
                        {pose.name}
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-slate-400 truncate">
                        <span>{POSE_CATEGORY_LABELS[pose.category]}</span>
                        {pose.expression && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="text-emerald-400">Face</span>
                          </>
                        )}
                      </div>
                    </div>
                  </button>

                  {!pose.builtIn && (
                    <button
                      type="button"
                      onClick={() => {
                        onDeleteCustomPose(pose.id);
                        setFeedback({
                          type: 'ok',
                          text: `Removed "${pose.name}".`,
                        });
                      }}
                      aria-label={`Delete pose ${pose.name}`}
                      className="p-1 rounded text-slate-500 hover:text-red-400 hover:bg-[#14161a] shrink-0"
                    >
                      <Trash2 className="w-3 h-3" aria-hidden="true" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Right: Live Preview Actions, Save Custom Pose & JSON Import/Export */}
      <div className="lg:col-span-4 space-y-2 border-t lg:border-t-0 lg:border-l border-[#393d47] pt-2 lg:pt-0 lg:pl-3">
        {/* Preview Controls */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-slate-400">
              Preview & Commit
            </span>
            <label className="inline-flex items-center gap-1.5 text-[11px] text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={includeExpression}
                onChange={onToggleIncludeExpression}
                className="accent-[#00a2ff] rounded"
              />
              <Smile className="w-3 h-3 text-emerald-400" aria-hidden="true" />
              <span>Include Face</span>
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={onToggleMirror}
              aria-pressed={isMirrored}
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-medium border transition-colors whitespace-nowrap shrink-0 ${
                isMirrored
                  ? 'bg-[#00a2ff]/20 border-[#00a2ff] text-[#38bdf8]'
                  : 'bg-[#2b2e35] border-[#393d47] text-slate-200 hover:bg-[#363a43]'
              }`}
            >
              <FlipHorizontal2 className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Mirror L/R</span>
            </button>

            <button
              type="button"
              onClick={onCommitPose}
              disabled={!hasActiveDraft}
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                hasActiveDraft
                  ? 'bg-[#00a2ff] text-slate-950 hover:bg-[#33b5ff]'
                  : 'bg-[#2b2e35] text-slate-500 border border-[#393d47] cursor-not-allowed'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Key Pose</span>
            </button>

            <button
              type="button"
              onClick={onResetPose}
              disabled={!hasActiveDraft}
              className={`inline-flex items-center gap-1 px-2 py-1.5 rounded text-xs border transition-colors whitespace-nowrap shrink-0 ${
                hasActiveDraft
                  ? 'bg-[#2b2e35] border-[#393d47] text-slate-200 hover:bg-[#363a43]'
                  : 'bg-[#14161a] border-[#2b2e35] text-slate-600 cursor-not-allowed'
              }`}
            >
              <RotateCcw className="w-3 h-3" aria-hidden="true" />
              <span>Reset</span>
            </button>
          </div>
        </div>

        {/* Save Current Pose */}
        <form
          onSubmit={handleSaveSubmit}
          className="pt-2 border-t border-[#393d47]/70 space-y-1.5"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-medium text-slate-400">
              Save Current Character Pose
            </span>
            <label className="inline-flex items-center gap-1 text-[10px] text-slate-400 cursor-pointer">
              <input
                type="checkbox"
                checked={saveIncludeFace}
                onChange={(e) => setSaveIncludeFace(e.target.checked)}
                className="accent-[#00a2ff] rounded"
              />
              <span>Bundle face</span>
            </label>
          </div>
          <div className="flex items-center gap-1.5">
            <input
              type="text"
              aria-label="New Pose Name"
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              placeholder="Pose name..."
              className="flex-1 min-w-0 px-2 py-1 rounded bg-[#14161a] border border-[#393d47] text-xs text-slate-100 placeholder:text-slate-500"
            />
            <select
              aria-label="New Pose Category"
              value={saveCategory}
              onChange={(e) => setSaveCategory(e.target.value as PoseCategory)}
              className="w-22 px-1.5 py-1 rounded bg-[#14161a] border border-[#393d47] text-[11px] text-slate-200"
            >
              {POSE_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {POSE_CATEGORY_LABELS[cat]}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#2b2e35] border border-[#393d47] text-xs font-medium text-slate-100 hover:bg-[#363a43] whitespace-nowrap shrink-0"
            >
              <Save className="w-3 h-3 text-[#00a2ff]" aria-hidden="true" />
              <span>Save</span>
            </button>
          </div>
        </form>

        {/* Export / Import Pose Packs */}
        <div className="pt-1.5 border-t border-[#393d47]/70 flex flex-wrap items-center justify-between gap-1.5">
          <span className="text-[11px] text-slate-500">Pose Pack JSON</span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onExportPoses}
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
