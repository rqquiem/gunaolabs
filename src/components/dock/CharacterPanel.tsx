import React, { useState } from 'react';
import {
  UserPlus,
  Box,
  Trash2,
  Move,
  RotateCw,
  Maximize2,
  KeyRound,
} from 'lucide-react';
import {
  CLASSIC_BRICK_COLORS,
  cloneBundle,
  ORNAMENT_CATALOG,
  ROBLOX_AVATAR_BUNDLES,
} from '../../engine/robloxCatalog';
import {
  AnimationProject,
  EvaluatedActorState,
  GizmoMode,
  ORNAMENT_SLOT_LABELS,
  ORNAMENT_SLOTS,
  OrnamentSlot,
  POSE_CLIP_LABELS,
  PoseClipId,
  PropKind,
  R6_BODY_PART_LABELS,
  R6_BODY_PARTS,
  R6BodyPartId,
  SceneActorConfig,
  Vec3Tuple,
} from '../../engine/types';

interface CharacterPanelProps {
  project: AnimationProject;
  selectedActorId: string | null;
  evaluatedActor: EvaluatedActorState | null;
  gizmoMode: GizmoMode;
  jointDraft: Partial<Record<R6BodyPartId, Vec3Tuple>>;
  onSelectActor: (actorId: string) => void;
  onAddCharacter: (bundleId: string) => void;
  onAddProp: (propKind: PropKind) => void;
  onDeleteActor: (actorId: string) => void;
  onSetGizmoMode: (mode: GizmoMode) => void;
  onApplyBundle: (actorId: string, bundleId: string) => void;
  onUpdateBodyPartColor: (actorId: string, part: R6BodyPartId, hex: string) => void;
  onUpdateOrnament: (
    actorId: string,
    slot: OrnamentSlot,
    id: string,
    color: string,
  ) => void;
  onUpdatePropColors: (actorId: string, primary: string, accent: string) => void;
  onChangeClip: (actorId: string, clip: PoseClipId) => void;
  onPreviewJoint: (part: R6BodyPartId, rot: Vec3Tuple) => void;
  onCommitPoseKeyframe: () => void;
}

const CLIP_OPTIONS: PoseClipId[] = [
  'idle',
  'walk',
  'run',
  'wave',
  'hero',
  'sit',
  'swordSwing',
  'custom',
];

const SHORT_PART_LABELS: Record<R6BodyPartId, string> = {
  head: 'Head',
  torso: 'Torso',
  leftArm: 'L Arm',
  rightArm: 'R Arm',
  leftLeg: 'L Leg',
  rightLeg: 'R Leg',
};

export const CharacterPanel: React.FC<CharacterPanelProps> = ({
  project,
  selectedActorId,
  evaluatedActor,
  gizmoMode,
  jointDraft,
  onSelectActor,
  onAddCharacter,
  onAddProp,
  onDeleteActor,
  onSetGizmoMode,
  onApplyBundle,
  onUpdateBodyPartColor,
  onUpdateOrnament,
  onUpdatePropColors,
  onChangeClip,
  onPreviewJoint,
  onCommitPoseKeyframe,
}) => {
  const [selectedJoint, setSelectedJoint] = useState<R6BodyPartId>('rightArm');
  const [colorPart, setColorPart] = useState<R6BodyPartId>('torso');
  const [spawnMenuOpen, setSpawnMenuOpen] = useState(false);

  const selectedActor: SceneActorConfig | undefined = project.actors.find(
    (a) => a.id === selectedActorId,
  );

  const fallbackBundle = cloneBundle('noob');
  const activeBodyColors = selectedActor?.bodyColors ?? fallbackBundle.bodyColors;
  const activeOrnaments = selectedActor?.ornaments ?? fallbackBundle.ornaments;

  const currentJointRot: Vec3Tuple =
    jointDraft[selectedJoint] ??
    evaluatedActor?.pose.joints[selectedJoint] ?? [0, 0, 0];

  return (
    <div className="space-y-2.5">
      {/* Actor Roster, Gizmo Switcher & Spawner */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
          {project.actors.map((actor) => {
            const active = actor.id === selectedActorId;
            return (
              <button
                key={actor.id}
                type="button"
                onClick={() => onSelectActor(actor.id)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors whitespace-nowrap shrink-0 ${
                  active
                    ? 'bg-[#00a2ff] border-[#00a2ff] text-slate-950 font-semibold'
                    : 'bg-[#2b2e35] border-[#393d47] text-slate-300 hover:bg-[#363a43]'
                }`}
              >
                {actor.name}
              </button>
            );
          })}
        </div>

        <div className="relative flex flex-wrap items-center gap-1.5 shrink-0">
          {selectedActor && (
            <div className="flex items-center gap-1 mr-1">
              {(
                [
                  { id: 'translate', label: 'Move', icon: Move },
                  { id: 'rotate', label: 'Rotate', icon: RotateCw },
                  { id: 'scale', label: 'Scale', icon: Maximize2 },
                ] as const
              ).map((g) => {
                const Icon = g.icon;
                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => onSetGizmoMode(g.id)}
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium border transition-colors whitespace-nowrap ${
                      gizmoMode === g.id
                        ? 'bg-slate-100 border-slate-100 text-slate-950 font-semibold'
                        : 'bg-[#2b2e35] border-[#393d47] text-slate-300 hover:bg-[#363a43]'
                    }`}
                  >
                    <Icon className="w-3 h-3" aria-hidden="true" />
                    <span>{g.label}</span>
                  </button>
                );
              })}

              {project.actors.length > 1 && (
                <button
                  type="button"
                  onClick={() => onDeleteActor(selectedActor.id)}
                  aria-label={`Remove ${selectedActor.name}`}
                  className="p-1.5 rounded bg-[#2b2e35] border border-[#393d47] text-red-400 hover:text-red-300 hover:bg-[#363a43]"
                >
                  <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={() => setSpawnMenuOpen((v) => !v)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-[#2b2e35] border border-[#393d47] text-xs font-medium text-slate-100 hover:bg-[#363a43] whitespace-nowrap shrink-0"
          >
            <UserPlus className="w-3.5 h-3.5 text-[#00a2ff]" aria-hidden="true" />
            <span>Add R6 / Prop</span>
          </button>

          {spawnMenuOpen && (
            <div className="absolute right-0 bottom-10 z-30 w-56 p-2 rounded-lg bg-[#1e2024] border border-[#393d47] shadow-2xl space-y-1">
              <div className="text-[11px] font-medium text-slate-400 px-2 py-1">
                R6 Avatar Bundles
              </div>
              {ROBLOX_AVATAR_BUNDLES.map((bundle) => (
                <button
                  key={bundle.id}
                  type="button"
                  onClick={() => {
                    onAddCharacter(bundle.id);
                    setSpawnMenuOpen(false);
                  }}
                  className="w-full text-left px-2.5 py-1.5 rounded text-xs text-slate-200 hover:bg-[#2b2e35]"
                >
                  + {bundle.name}
                </button>
              ))}
              <div className="border-t border-[#393d47] my-1" />
              <div className="text-[11px] font-medium text-slate-400 px-2 py-1">
                Roblox Brick Props
              </div>
              {(
                [
                  { id: 'spawnpad', label: 'SpawnLocation Pad' },
                  { id: 'crate', label: 'Studded Crates' },
                  { id: 'tree', label: 'Classic Roblox Tree' },
                  { id: 'speeder', label: 'Brick Speeder' },
                ] as { id: PropKind; label: string }[]
              ).map((prop) => (
                <button
                  key={prop.id}
                  type="button"
                  onClick={() => {
                    onAddProp(prop.id);
                    setSpawnMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-1.5 text-left px-2.5 py-1.5 rounded text-xs text-slate-200 hover:bg-[#2b2e35]"
                >
                  <Box className="w-3 h-3 text-[#00a2ff]" aria-hidden="true" />
                  <span>+ {prop.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Selected Actor Inspector */}
      {selectedActor && evaluatedActor ? (
        selectedActor.kind === 'character' ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-[#393d47]">
            {/* Column 1: Avatar Bundle & 6-Part BrickColors */}
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <label
                  htmlFor="avatar-bundle-select"
                  className="text-xs font-medium text-slate-400 shrink-0"
                >
                  Avatar Bundle
                </label>
                <select
                  id="avatar-bundle-select"
                  value={selectedActor.bundleId ?? 'noob'}
                  onChange={(e) => onApplyBundle(selectedActor.id, e.target.value)}
                  className="flex-1 min-w-0 px-2 py-1 rounded bg-[#14161a] border border-[#393d47] text-xs text-slate-100"
                >
                  {ROBLOX_AVATAR_BUNDLES.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <span className="block text-[11px] font-medium text-slate-400 mb-1">
                  R6 Body Part Colors ({R6_BODY_PART_LABELS[colorPart]})
                </span>
                <div className="grid grid-cols-6 gap-1 mb-1.5">
                  {R6_BODY_PARTS.map((part) => (
                    <button
                      key={part}
                      type="button"
                      onClick={() => setColorPart(part)}
                      className={`px-1 py-1 rounded text-[11px] font-medium border transition-colors whitespace-nowrap truncate ${
                        colorPart === part
                          ? 'bg-[#00a2ff] border-[#00a2ff] text-slate-950 font-semibold'
                          : 'bg-[#2b2e35] border-[#393d47] text-slate-300 hover:bg-[#363a43]'
                      }`}
                    >
                      {SHORT_PART_LABELS[part]}
                    </button>
                  ))}
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  {CLASSIC_BRICK_COLORS.slice(0, 8).map((swatch) => (
                    <button
                      key={swatch.name}
                      type="button"
                      title={swatch.name}
                      aria-label={`Set ${R6_BODY_PART_LABELS[colorPart]} to ${swatch.name}`}
                      onClick={() =>
                        onUpdateBodyPartColor(selectedActor.id, colorPart, swatch.hex)
                      }
                      style={{ backgroundColor: swatch.hex }}
                      className={`w-5 h-5 rounded border ${
                        activeBodyColors[colorPart].toLowerCase() ===
                        swatch.hex.toLowerCase()
                          ? 'border-white ring-1 ring-[#00a2ff]'
                          : 'border-[#393d47]'
                      }`}
                    />
                  ))}
                  <input
                    type="color"
                    aria-label={`${R6_BODY_PART_LABELS[colorPart]} custom color`}
                    value={activeBodyColors[colorPart]}
                    onChange={(e) =>
                      onUpdateBodyPartColor(
                        selectedActor.id,
                        colorPart,
                        e.target.value,
                      )
                    }
                    className="w-6 h-5 rounded bg-transparent border border-[#393d47] cursor-pointer ml-auto"
                  />
                </div>
              </div>
            </div>

            {/* Column 2: 6-Slot Mix-and-Match Ornaments */}
            <div className="space-y-1.5">
              <span className="block text-xs font-medium text-slate-400">
                Ornaments (6 Sockets)
              </span>
              <div className="grid grid-cols-2 gap-x-1.5 gap-y-1.5">
                {ORNAMENT_SLOTS.map((slot) => {
                  const sel = activeOrnaments[slot];
                  const items = ORNAMENT_CATALOG[slot];
                  return (
                    <div key={slot} className="flex items-center gap-1 min-w-0">
                      <label
                        htmlFor={`ornament-${slot}`}
                        className="text-[11px] text-slate-400 w-7 shrink-0"
                      >
                        {ORNAMENT_SLOT_LABELS[slot]}
                      </label>
                      <select
                        id={`ornament-${slot}`}
                        value={sel.id}
                        onChange={(e) => {
                          const found = items.find((i) => i.id === e.target.value);
                          onUpdateOrnament(
                            selectedActor.id,
                            slot,
                            e.target.value,
                            found?.defaultColor ?? sel.color,
                          );
                        }}
                        className="flex-1 min-w-0 px-1 py-1 rounded bg-[#14161a] border border-[#393d47] text-[11px] text-slate-200"
                      >
                        {items.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.label}
                          </option>
                        ))}
                      </select>
                      <input
                        type="color"
                        aria-label={`${ORNAMENT_SLOT_LABELS[slot]} ornament color`}
                        value={sel.color}
                        onChange={(e) =>
                          onUpdateOrnament(
                            selectedActor.id,
                            slot,
                            sel.id,
                            e.target.value,
                          )
                        }
                        className="w-4 h-5 rounded bg-transparent border border-[#393d47] cursor-pointer shrink-0"
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Column 3: R6 Animation Clip & Joint Rig */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-slate-400">
                  R6 Clip & Joint Rig
                </span>
                <button
                  type="button"
                  onClick={onCommitPoseKeyframe}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-amber-500 text-slate-950 text-xs font-semibold hover:bg-amber-400 transition-colors whitespace-nowrap"
                >
                  <KeyRound className="w-3 h-3" aria-hidden="true" />
                  <span>Key Pose</span>
                </button>
              </div>

              <div className="grid grid-cols-4 gap-1">
                {CLIP_OPTIONS.map((clipId) => (
                  <button
                    key={clipId}
                    type="button"
                    onClick={() => onChangeClip(selectedActor.id, clipId)}
                    className={`px-1.5 py-1 rounded text-[11px] font-medium border transition-colors whitespace-nowrap truncate ${
                      evaluatedActor.clip === clipId
                        ? 'bg-[#00a2ff]/20 text-[#38bdf8] border-[#00a2ff]'
                        : 'bg-[#2b2e35] border-[#393d47] text-slate-300 hover:bg-[#363a43]'
                    }`}
                  >
                    {POSE_CLIP_LABELS[clipId]}
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-between gap-2 pt-0.5">
                <label
                  htmlFor="r6-joint-select"
                  className="text-[11px] text-slate-400 shrink-0"
                >
                  Joint
                </label>
                <select
                  id="r6-joint-select"
                  value={selectedJoint}
                  onChange={(e) => setSelectedJoint(e.target.value as R6BodyPartId)}
                  className="flex-1 min-w-0 px-2 py-0.5 rounded bg-[#14161a] border border-[#393d47] text-xs text-slate-200"
                >
                  {R6_BODY_PARTS.map((part) => (
                    <option key={part} value={part}>
                      {R6_BODY_PART_LABELS[part]}
                    </option>
                  ))}
                </select>
              </div>

              {(['X', 'Y', 'Z'] as const).map((axisLabel, idx) => (
                <div key={axisLabel} className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-400 w-4 shrink-0">
                    {axisLabel}
                  </span>
                  <input
                    type="range"
                    min={-2.6}
                    max={2.6}
                    step={0.05}
                    aria-label={`${R6_BODY_PART_LABELS[selectedJoint]} ${axisLabel} rotation`}
                    value={currentJointRot[idx]}
                    onChange={(e) => {
                      const next: Vec3Tuple = [
                        currentJointRot[0],
                        currentJointRot[1],
                        currentJointRot[2],
                      ];
                      next[idx] = Number(e.target.value);
                      onPreviewJoint(selectedJoint, next);
                    }}
                    className="studio-slider flex-1"
                  />
                  <span className="text-[11px] font-mono-tabular text-slate-300 w-9 text-right">
                    {currentJointRot[idx].toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-[#393d47]">
            <div className="flex items-center gap-4 text-xs text-slate-300">
              <label className="inline-flex items-center gap-2">
                <span className="text-slate-400">Primary Brick</span>
                <input
                  type="color"
                  aria-label={`${selectedActor.name} primary color`}
                  value={selectedActor.primaryColor}
                  onChange={(e) =>
                    onUpdatePropColors(
                      selectedActor.id,
                      e.target.value,
                      selectedActor.accentColor,
                    )
                  }
                  className="w-6 h-6 rounded bg-transparent border border-[#393d47] cursor-pointer"
                />
              </label>
              <label className="inline-flex items-center gap-2">
                <span className="text-slate-400">Accent Brick</span>
                <input
                  type="color"
                  aria-label={`${selectedActor.name} accent color`}
                  value={selectedActor.accentColor}
                  onChange={(e) =>
                    onUpdatePropColors(
                      selectedActor.id,
                      selectedActor.primaryColor,
                      e.target.value,
                    )
                  }
                  className="w-6 h-6 rounded bg-transparent border border-[#393d47] cursor-pointer"
                />
              </label>
              <span className="font-mono-tabular text-[11px] text-slate-400">
                Pos: {evaluatedActor.position.map((v) => v.toFixed(1)).join(', ')}
              </span>
            </div>

            <button
              type="button"
              onClick={onCommitPoseKeyframe}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded bg-amber-500 text-slate-950 text-xs font-semibold hover:bg-amber-400 transition-colors whitespace-nowrap"
            >
              <KeyRound className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Key Prop Transform</span>
            </button>
          </div>
        )
      ) : (
        <p className="text-xs text-slate-400 py-2">
          Click any R6 character or brick prop in the 3D viewport or select one above to customize and pose it.
        </p>
      )}
    </div>
  );
};
