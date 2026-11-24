import React, { useState } from 'react';
import {
  UserPlus,
  Box,
  Trash2,
  Move,
  RotateCw,
  Maximize2,
  KeyRound,
  Smile,
  Focus,
  RotateCcw,
  Layers,
  Shirt,
  PersonStanding,
  Swords,
} from 'lucide-react';
import { ItemHandlingPanel } from './ItemHandlingPanel';
import { PoseLibraryPanel } from './PoseLibraryPanel';
import { WardrobePanel } from './WardrobePanel';
import {
  FACE_BROW_STYLES,
  FACE_CHEEK_STYLES,
  FACE_EYE_STYLES,
  FACE_MOUTH_STYLES,
  resolveActorFaceConfig,
} from '../../engine/faceExpressions';
import {
  BUILT_IN_ITEMS,
  BUILT_IN_PROPS,
  createEmptyCharacterHeldItems,
  PROP_CATEGORIES,
  PROP_CATEGORY_LABELS,
} from '../../engine/itemCatalog';
import {
  AccessoryComboPreset,
  cloneBundle,
  OutfitPreset,
  resolveActorClothing,
  resolveActorHair,
  resolveActorOrnaments,
  ROBLOX_AVATAR_BUNDLES,
} from '../../engine/robloxCatalog';
import {
  AccessoryFit,
  AnimationProject,
  CharacterHeldItems,
  ClothingConfig,
  EASING_OPTIONS,
  EasingType,
  EvaluatedActorState,
  EXPRESSION_PRESET_IDS,
  EXPRESSION_PRESET_LABELS,
  ExpressionParams,
  ExpressionPresetId,
  FaceRigConfig,
  GizmoMode,
  HairConfig,
  ItemEasingMode,
  ItemId,
  OrnamentSlot,
  POSE_CLIP_LABELS,
  PoseCategory,
  PoseClipId,
  PosePreset,
  PropKind,
  R6_BODY_PART_LABELS,
  R6_BODY_PARTS,
  R6BodyPartId,
  SceneActorConfig,
  UPPER_BODY_CLIP_LABELS,
  UPPER_BODY_CLIPS,
  UpperBodyClipId,
  Vec3Tuple,
} from '../../engine/types';

type CharacterSubTab = 'face' | 'poses' | 'items' | 'animation' | 'appearance';

interface CharacterPanelProps {
  project: AnimationProject;
  currentTime: number;
  selectedActorId: string | null;
  evaluatedActor: EvaluatedActorState | null;
  gizmoMode: GizmoMode;
  jointDraft: Partial<Record<R6BodyPartId, Vec3Tuple>>;
  hipTiltDraft: Vec3Tuple | null;
  faceDraft: {
    preset: ExpressionPresetId;
    overrides: Partial<ExpressionParams>;
  } | null;
  itemDraft: CharacterHeldItems | null;
  onSelectActor: (actorId: string) => void;
  onAddCharacter: (bundleId: string) => void;
  onAddProp: (propKind: PropKind, propItemId?: ItemId) => void;
  onDeleteActor: (actorId: string) => void;
  onSetGizmoMode: (mode: GizmoMode) => void;
  onApplyBundle: (actorId: string, bundleId: string) => void;
  onApplyOutfitPreset: (actorId: string, preset: OutfitPreset) => void;
  onUpdateBodyPartColor: (actorId: string, part: R6BodyPartId, hex: string) => void;
  onUpdateOrnament: (
    actorId: string,
    slot: OrnamentSlot,
    id: string,
    color: string,
    accentColor?: string,
  ) => void;
  onUpdateOrnamentFit: (
    actorId: string,
    slot: OrnamentSlot,
    fitPatch: Partial<AccessoryFit> | null,
  ) => void;
  onApplyAccessoryCombo: (actorId: string, combo: AccessoryComboPreset) => void;
  onUpdateHair: (actorId: string, patch: Partial<HairConfig>) => void;
  onUpdateClothing: (actorId: string, patch: Partial<ClothingConfig>) => void;
  onUpdatePropColors: (actorId: string, primary: string, accent: string) => void;
  onUpdatePropConfig: (
    actorId: string,
    propKind: PropKind,
    propItemId?: ItemId,
  ) => void;
  onUpdateFaceConfig: (actorId: string, patch: Partial<FaceRigConfig>) => void;
  onPreviewFacePreset: (preset: ExpressionPresetId) => void;
  onPreviewFaceParam: (param: keyof ExpressionParams, value: number) => void;
  onResetFaceDraft: () => void;
  onCommitFaceKeyframe: () => void;
  onFocusActorFace: (actorId: string) => void;
  onPreviewHeldItems: (next: CharacterHeldItems) => void;
  onResetItemDraft: () => void;
  onCommitItemKeyframe: (easing?: ItemEasingMode) => void;
  onSpawnItemAsProp: (
    itemId: ItemId,
    primaryColor: string,
    accentColor: string,
  ) => void;
  onChangeClip: (actorId: string, clip: PoseClipId) => void;
  onUpdateActorAnimSettings: (
    actorId: string,
    patch: {
      upperBodyClip?: UpperBodyClipId;
      upperBodyWeight?: number;
      clipSpeed?: number;
      easing?: EasingType;
    },
  ) => void;
  onUpdateActorRigBehavior: (
    actorId: string,
    patch: {
      lookAtTarget?: string;
      lookAtWeight?: number;
      secondaryMotion?: boolean;
    },
  ) => void;
  onPreviewJoint: (part: R6BodyPartId, rot: Vec3Tuple) => void;
  onPreviewHipTilt: (tilt: Vec3Tuple) => void;
  onResetPoseDraft: () => void;
  onCommitPoseKeyframe: () => void;
  // Pose Library props
  builtInPoses: PosePreset[];
  customPoses: PosePreset[];
  activePosePreviewId: string | null;
  poseMirrored: boolean;
  includePoseExpression: boolean;
  onSelectLibraryPose: (pose: PosePreset) => void;
  onTogglePoseMirror: () => void;
  onToggleIncludePoseExpression: () => void;
  onCommitLibraryPose: () => void;
  onResetLibraryPose: () => void;
  onSaveCurrentPose: (
    name: string,
    category: PoseCategory,
    includeFace: boolean,
  ) => void;
  onDeleteCustomPose: (poseId: string) => void;
  onExportPoses: () => void;
  onImportPosesJson: (raw: string) => { ok: boolean; message: string };
}

const CLIP_OPTIONS: PoseClipId[] = [
  'idle',
  'walk',
  'run',
  'jump',
  'crouch',
  'sit',
  'hero',
  'wave',
  'swordSwing',
  'cheer',
  'victory',
  'custom',
];

const EXPRESSION_SLIDER_SPECS: {
  key: keyof ExpressionParams;
  label: string;
  min: number;
  max: number;
}[] = [
  { key: 'smile', label: 'Smile', min: -1, max: 1 },
  { key: 'jawOpen', label: 'Jaw Open', min: 0, max: 1 },
  { key: 'browRaise', label: 'Brow Height', min: -1, max: 1 },
  { key: 'browFurrow', label: 'Brow Furrow', min: -1, max: 1 },
  { key: 'eyeWide', label: 'Eye Open', min: -1, max: 1 },
  { key: 'mouthWidth', label: 'Mouth Width', min: -1, max: 1 },
  { key: 'mouthSkew', label: 'Mouth Skew', min: -1, max: 1 },
  { key: 'gazeX', label: 'Gaze X', min: -1, max: 1 },
  { key: 'gazeY', label: 'Gaze Y', min: -1, max: 1 },
  { key: 'blush', label: 'Blush', min: 0, max: 1 },
];

export const CharacterPanel: React.FC<CharacterPanelProps> = ({
  project,
  currentTime,
  selectedActorId,
  evaluatedActor,
  gizmoMode,
  jointDraft,
  hipTiltDraft,
  faceDraft,
  itemDraft,
  onSelectActor,
  onAddCharacter,
  onAddProp,
  onDeleteActor,
  onSetGizmoMode,
  onApplyBundle,
  onApplyOutfitPreset,
  onUpdateBodyPartColor,
  onUpdateOrnament,
  onUpdateOrnamentFit,
  onApplyAccessoryCombo,
  onUpdateHair,
  onUpdateClothing,
  onUpdatePropColors,
  onUpdatePropConfig,
  onUpdateFaceConfig,
  onPreviewFacePreset,
  onPreviewFaceParam,
  onResetFaceDraft,
  onCommitFaceKeyframe,
  onFocusActorFace,
  onPreviewHeldItems,
  onResetItemDraft,
  onCommitItemKeyframe,
  onSpawnItemAsProp,
  onChangeClip,
  onUpdateActorAnimSettings,
  onUpdateActorRigBehavior,
  onPreviewJoint,
  onPreviewHipTilt,
  onResetPoseDraft,
  onCommitPoseKeyframe,
  builtInPoses,
  customPoses,
  activePosePreviewId,
  poseMirrored,
  includePoseExpression,
  onSelectLibraryPose,
  onTogglePoseMirror,
  onToggleIncludePoseExpression,
  onCommitLibraryPose,
  onResetLibraryPose,
  onSaveCurrentPose,
  onDeleteCustomPose,
  onExportPoses,
  onImportPosesJson,
}) => {
  const [subTab, setSubTab] = useState<CharacterSubTab>('face');
  const [selectedJoint, setSelectedJoint] = useState<R6BodyPartId | 'hipTilt'>('rightArm');
  const [spawnMenuOpen, setSpawnMenuOpen] = useState(false);

  const selectedActor: SceneActorConfig | undefined = project.actors.find(
    (a) => a.id === selectedActorId,
  );

  const fallbackBundle = cloneBundle('noob');
  const activeBodyColors = selectedActor?.bodyColors ?? fallbackBundle.bodyColors;
  const activeOrnaments = resolveActorOrnaments(selectedActor);
  const activeHair = resolveActorHair(selectedActor);
  const activeClothing = resolveActorClothing(selectedActor);
  const activeFaceConfig: FaceRigConfig = selectedActor
    ? resolveActorFaceConfig(selectedActor)
    : fallbackBundle.faceConfig;

  const activeKeyframe = selectedActor
    ? selectedActor.keyframes.reduce((best, kf) => {
        if (kf.time <= currentTime + 0.04) return kf;
        return best;
      }, selectedActor.keyframes[0])
    : undefined;

  const currentJointRot: Vec3Tuple =
    selectedJoint === 'hipTilt'
      ? hipTiltDraft ?? evaluatedActor?.pose.hipTilt ?? [0, 0, 0]
      : jointDraft[selectedJoint] ??
        evaluatedActor?.pose.joints[selectedJoint] ?? [0, 0, 0];

  const activeFaceParams: ExpressionParams | null = evaluatedActor
    ? {
        ...evaluatedActor.face.params,
        ...(faceDraft?.overrides ?? {}),
      }
    : null;

  const activeFacePreset: ExpressionPresetId =
    faceDraft?.preset ?? evaluatedActor?.face.preset ?? 'neutral';

  const activeHeldItems: CharacterHeldItems =
    itemDraft ??
    evaluatedActor?.heldItems ??
    selectedActor?.heldItems ??
    createEmptyCharacterHeldItems();

  const activeItemKeyframe = selectedActor?.heldItemKeyframes
    ? selectedActor.heldItemKeyframes.reduce(
        (best, kf) => (kf.time <= currentTime + 0.04 ? kf : best),
        selectedActor.heldItemKeyframes[0],
      )
    : undefined;

  const otherActors = project.actors.filter((a) => a.id !== selectedActorId);

  return (
    <div className="space-y-2.5">
      {/* Actor Roster, Sub-Mode Tabs, Gizmo Switcher & Spawner */}
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

          {selectedActor?.kind === 'character' && (
            <div className="flex items-center p-0.5 ml-1 rounded-md bg-[#14161a] border border-[#393d47] shrink-0">
              {(
                [
                  { id: 'face', label: 'Face & Expressions', icon: Smile },
                  { id: 'poses', label: 'Pose Library', icon: PersonStanding },
                  { id: 'items', label: 'Items & Hands', icon: Swords },
                  { id: 'animation', label: 'Animation & Rig', icon: Layers },
                  { id: 'appearance', label: 'Wardrobe', icon: Shirt },
                ] as const
              ).map((tab) => {
                const Icon = tab.icon;
                const active = subTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setSubTab(tab.id)}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                      active
                        ? 'bg-[#2b2e35] text-white'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Icon className="w-3 h-3" aria-hidden="true" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          )}
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
            <div className="absolute right-0 bottom-10 z-30 w-72 max-h-72 overflow-y-auto p-2 rounded-lg bg-[#1e2024] border border-[#393d47] shadow-2xl space-y-1.5">
              <div className="text-[11px] font-medium text-slate-400 px-2 py-0.5">
                R6 Avatar Bundles
              </div>
              <div className="grid grid-cols-2 gap-1">
                {ROBLOX_AVATAR_BUNDLES.map((bundle) => (
                  <button
                    key={bundle.id}
                    type="button"
                    onClick={() => {
                      onAddCharacter(bundle.id);
                      setSpawnMenuOpen(false);
                    }}
                    className="text-left px-2 py-1 rounded text-[11px] text-slate-200 hover:bg-[#2b2e35] truncate"
                  >
                    + {bundle.name}
                  </button>
                ))}
              </div>

              {PROP_CATEGORIES.map((cat) => {
                const catProps = BUILT_IN_PROPS.filter((p) => p.category === cat);
                return (
                  <div key={cat} className="border-t border-[#393d47] pt-1.5 space-y-1">
                    <div className="text-[11px] font-medium text-slate-400 px-2">
                      {PROP_CATEGORY_LABELS[cat]}
                    </div>
                    <div className="grid grid-cols-2 gap-1">
                      {catProps.map((prop) => (
                        <button
                          key={prop.kind}
                          type="button"
                          onClick={() => {
                            onAddProp(prop.kind);
                            setSpawnMenuOpen(false);
                          }}
                          className="flex items-center gap-1.5 text-left px-2 py-1 rounded text-[11px] text-slate-200 hover:bg-[#2b2e35] truncate"
                        >
                          <Box className="w-3 h-3 text-[#00a2ff] shrink-0" aria-hidden="true" />
                          <span className="truncate">{prop.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}

              <div className="border-t border-[#393d47] pt-1.5 space-y-1">
                <div className="text-[11px] font-medium text-slate-400 px-2">
                  Stage Gear & Handheld Items
                </div>
                <div className="grid grid-cols-2 gap-1">
                  {BUILT_IN_ITEMS.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        onAddProp('heldItem', item.id);
                        setSpawnMenuOpen(false);
                      }}
                      className="flex items-center gap-1.5 text-left px-2 py-1 rounded text-[11px] text-slate-200 hover:bg-[#2b2e35] truncate"
                    >
                      <Swords className="w-3 h-3 text-cyan-400 shrink-0" aria-hidden="true" />
                      <span className="truncate">{item.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Selected Actor Inspector */}
      {selectedActor && evaluatedActor ? (
        selectedActor.kind === 'character' ? (
          <>
            {/* SUB-TAB 1: 3D FACE & EXPRESSIONS */}
            {subTab === 'face' && activeFaceParams && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-[#393d47]">
                {/* Column 1: Modular 3D Face Builder */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-slate-400">
                      3D Sculpted Face Builder
                    </span>
                    <button
                      type="button"
                      onClick={() => onFocusActorFace(selectedActor.id)}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#2b2e35] border border-[#393d47] text-[11px] font-medium text-[#38bdf8] hover:bg-[#363a43] whitespace-nowrap"
                    >
                      <Focus className="w-3 h-3" aria-hidden="true" />
                      <span>Focus Face</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5">
                    <div className="flex items-center gap-1 min-w-0">
                      <label htmlFor="face-eye-style" className="text-[11px] text-slate-400 w-10 shrink-0">
                        Eyes
                      </label>
                      <select
                        id="face-eye-style"
                        value={activeFaceConfig.eyeStyle}
                        onChange={(e) =>
                          onUpdateFaceConfig(selectedActor.id, {
                            eyeStyle: e.target.value as FaceRigConfig['eyeStyle'],
                          })
                        }
                        className="flex-1 min-w-0 px-1 py-1 rounded bg-[#14161a] border border-[#393d47] text-[11px] text-slate-200"
                      >
                        {FACE_EYE_STYLES.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                      <input
                        type="color"
                        aria-label="Eye color"
                        value={activeFaceConfig.eyeColor}
                        onChange={(e) =>
                          onUpdateFaceConfig(selectedActor.id, { eyeColor: e.target.value })
                        }
                        className="w-4 h-5 rounded bg-transparent border border-[#393d47] cursor-pointer shrink-0"
                      />
                    </div>

                    <div className="flex items-center gap-1 min-w-0">
                      <label htmlFor="face-brow-style" className="text-[11px] text-slate-400 w-10 shrink-0">
                        Brows
                      </label>
                      <select
                        id="face-brow-style"
                        value={activeFaceConfig.browStyle}
                        onChange={(e) =>
                          onUpdateFaceConfig(selectedActor.id, {
                            browStyle: e.target.value as FaceRigConfig['browStyle'],
                          })
                        }
                        className="flex-1 min-w-0 px-1 py-1 rounded bg-[#14161a] border border-[#393d47] text-[11px] text-slate-200"
                      >
                        {FACE_BROW_STYLES.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                      <input
                        type="color"
                        aria-label="Brow color"
                        value={activeFaceConfig.browColor}
                        onChange={(e) =>
                          onUpdateFaceConfig(selectedActor.id, { browColor: e.target.value })
                        }
                        className="w-4 h-5 rounded bg-transparent border border-[#393d47] cursor-pointer shrink-0"
                      />
                    </div>

                    <div className="flex items-center gap-1 min-w-0">
                      <label htmlFor="face-mouth-style" className="text-[11px] text-slate-400 w-10 shrink-0">
                        Mouth
                      </label>
                      <select
                        id="face-mouth-style"
                        value={activeFaceConfig.mouthStyle}
                        onChange={(e) =>
                          onUpdateFaceConfig(selectedActor.id, {
                            mouthStyle: e.target.value as FaceRigConfig['mouthStyle'],
                          })
                        }
                        className="flex-1 min-w-0 px-1 py-1 rounded bg-[#14161a] border border-[#393d47] text-[11px] text-slate-200"
                      >
                        {FACE_MOUTH_STYLES.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                      <input
                        type="color"
                        aria-label="Mouth color"
                        value={activeFaceConfig.mouthColor}
                        onChange={(e) =>
                          onUpdateFaceConfig(selectedActor.id, { mouthColor: e.target.value })
                        }
                        className="w-4 h-5 rounded bg-transparent border border-[#393d47] cursor-pointer shrink-0"
                      />
                    </div>

                    <div className="flex items-center gap-1 min-w-0">
                      <label htmlFor="face-cheek-style" className="text-[11px] text-slate-400 w-10 shrink-0">
                        Detail
                      </label>
                      <select
                        id="face-cheek-style"
                        value={activeFaceConfig.cheekStyle}
                        onChange={(e) =>
                          onUpdateFaceConfig(selectedActor.id, {
                            cheekStyle: e.target.value as FaceRigConfig['cheekStyle'],
                          })
                        }
                        className="flex-1 min-w-0 px-1 py-1 rounded bg-[#14161a] border border-[#393d47] text-[11px] text-slate-200"
                      >
                        {FACE_CHEEK_STYLES.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                      <input
                        type="color"
                        aria-label="Cheek accent color"
                        value={activeFaceConfig.accentColor}
                        onChange={(e) =>
                          onUpdateFaceConfig(selectedActor.id, { accentColor: e.target.value })
                        }
                        className="w-4 h-5 rounded bg-transparent border border-[#393d47] cursor-pointer shrink-0"
                      />
                    </div>
                  </div>

                  {/* Auto-Blink, Auto Lip-Sync & Eye Gaze Target */}
                  <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px]">
                    <label className="inline-flex items-center gap-1.5 text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={activeFaceConfig.autoBlink}
                        onChange={(e) =>
                          onUpdateFaceConfig(selectedActor.id, { autoBlink: e.target.checked })
                        }
                        className="accent-[#00a2ff]"
                      />
                      <span>Auto-Blink</span>
                    </label>

                    <label className="inline-flex items-center gap-1.5 text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={activeFaceConfig.autoLipSync}
                        onChange={(e) =>
                          onUpdateFaceConfig(selectedActor.id, {
                            autoLipSync: e.target.checked,
                          })
                        }
                        className="accent-emerald-400"
                      />
                      <span>Lip-Sync</span>
                    </label>

                    {evaluatedActor.face.isSpeaking && (
                      <span className="text-[11px] text-emerald-400 font-medium">
                        Speaking
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 pt-0.5">
                    <label htmlFor="face-gaze-select" className="text-[11px] text-slate-400 shrink-0">
                      Eye Gaze
                    </label>
                    <select
                      id="face-gaze-select"
                      value={activeFaceConfig.gazeTarget}
                      onChange={(e) =>
                        onUpdateFaceConfig(selectedActor.id, { gazeTarget: e.target.value })
                      }
                      className="flex-1 min-w-0 px-2 py-0.5 rounded bg-[#14161a] border border-[#393d47] text-xs text-slate-200"
                    >
                      <option value="camera">Look at Camera</option>
                      <option value="forward">Look Forward</option>
                      <option value="manual">Manual Sliders</option>
                      {otherActors.map((a) => (
                        <option key={a.id} value={a.id}>
                          Track {a.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Column 2: Emotion Presets & Key Face */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-slate-400">
                      Expression Presets
                    </span>
                    <div className="flex items-center gap-1">
                      {faceDraft && (
                        <button
                          type="button"
                          onClick={onResetFaceDraft}
                          aria-label="Reset face preview"
                          className="p-1 rounded bg-[#2b2e35] border border-[#393d47] text-slate-300 hover:text-white"
                        >
                          <RotateCcw className="w-3 h-3" aria-hidden="true" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={onCommitFaceKeyframe}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-500 text-slate-950 text-xs font-semibold hover:bg-emerald-400 transition-colors whitespace-nowrap"
                      >
                        <KeyRound className="w-3 h-3" aria-hidden="true" />
                        <span>Key Face</span>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-5 gap-1">
                    {EXPRESSION_PRESET_IDS.map((presetId) => {
                      const active = activeFacePreset === presetId;
                      return (
                        <button
                          key={presetId}
                          type="button"
                          onClick={() => onPreviewFacePreset(presetId)}
                          className={`px-1 py-1.5 rounded text-[11px] font-medium border transition-colors whitespace-nowrap truncate ${
                            active
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400'
                              : 'bg-[#2b2e35] border-[#393d47] text-slate-300 hover:bg-[#363a43]'
                          }`}
                        >
                          {EXPRESSION_PRESET_LABELS[presetId]}
                        </button>
                      );
                    })}
                  </div>

                  <p className="text-[11px] text-slate-500 pt-0.5">
                    Pick a preset or sculpt sliders, then click Key Face to animate expressions on the timeline.
                  </p>
                </div>

                {/* Column 3: Parametric Expression Sliders */}
                <div className="space-y-1">
                  <span className="block text-xs font-medium text-slate-400">
                    Expression Mixer
                  </span>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                    {EXPRESSION_SLIDER_SPECS.map((spec) => {
                      const val = activeFaceParams[spec.key];
                      return (
                        <div key={spec.key} className="flex items-center gap-1.5 min-w-0">
                          <span className="text-[10px] text-slate-400 w-14 truncate shrink-0">
                            {spec.label}
                          </span>
                          <input
                            type="range"
                            min={spec.min}
                            max={spec.max}
                            step={0.05}
                            aria-label={`${spec.label} expression slider`}
                            value={val}
                            onChange={(e) =>
                              onPreviewFaceParam(spec.key, Number(e.target.value))
                            }
                            className="studio-slider flex-1 min-w-0"
                          />
                          <span className="text-[10px] font-mono-tabular text-slate-300 w-7 text-right shrink-0">
                            {val.toFixed(1)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* SUB-TAB 2: ENHANCED ANIMATION & RIG */}
            {subTab === 'animation' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-[#393d47]">
                {/* Column 1: Base / Lower-Body Clip & Timing */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-slate-400">
                      Base Motion Clip
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

                  <div className="grid grid-cols-2 gap-2 pt-0.5">
                    <label className="flex items-center gap-1.5 text-[11px] text-slate-400">
                      <span className="shrink-0">Curve</span>
                      <select
                        aria-label="Keyframe Easing Curve"
                        value={activeKeyframe?.easing ?? 'easeInOut'}
                        onChange={(e) =>
                          onUpdateActorAnimSettings(selectedActor.id, {
                            easing: e.target.value as EasingType,
                          })
                        }
                        className="flex-1 min-w-0 px-1.5 py-0.5 rounded bg-[#14161a] border border-[#393d47] text-[11px] text-slate-200"
                      >
                        {EASING_OPTIONS.map((opt) => (
                          <option key={opt.id} value={opt.id}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="flex items-center gap-1.5 text-[11px] text-slate-400">
                      <span className="shrink-0">Speed</span>
                      <input
                        type="range"
                        min={0.4}
                        max={2.0}
                        step={0.1}
                        aria-label="Clip Speed"
                        value={activeKeyframe?.clipSpeed ?? 1}
                        onChange={(e) =>
                          onUpdateActorAnimSettings(selectedActor.id, {
                            clipSpeed: Number(e.target.value),
                          })
                        }
                        className="studio-slider flex-1 min-w-0"
                      />
                      <span className="font-mono-tabular text-slate-300 w-7 text-right shrink-0">
                        {(activeKeyframe?.clipSpeed ?? 1).toFixed(1)}x
                      </span>
                    </label>
                  </div>
                </div>

                {/* Column 2: Layered Upper-Body Clip, Look-At & Secondary Physics */}
                <div className="space-y-2">
                  <span className="block text-xs font-medium text-slate-400">
                    Upper-Body Layer & Rig Behavior
                  </span>

                  <div className="flex items-center gap-2">
                    <label htmlFor="upper-layer-select" className="text-[11px] text-slate-400 w-16 shrink-0">
                      Upper Clip
                    </label>
                    <select
                      id="upper-layer-select"
                      value={activeKeyframe?.upperBodyClip ?? 'none'}
                      onChange={(e) =>
                        onUpdateActorAnimSettings(selectedActor.id, {
                          upperBodyClip: e.target.value as UpperBodyClipId,
                          upperBodyWeight:
                            e.target.value === 'none'
                              ? 0
                              : activeKeyframe?.upperBodyWeight || 0.85,
                        })
                      }
                      className="flex-1 min-w-0 px-2 py-1 rounded bg-[#14161a] border border-[#393d47] text-xs text-slate-200"
                    >
                      {UPPER_BODY_CLIPS.map((uId) => (
                        <option key={uId} value={uId}>
                          {UPPER_BODY_CLIP_LABELS[uId]}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-400 w-16 shrink-0">Layer Mix</span>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      aria-label="Upper Body Blend Weight"
                      disabled={(activeKeyframe?.upperBodyClip ?? 'none') === 'none'}
                      value={activeKeyframe?.upperBodyWeight ?? 0.85}
                      onChange={(e) =>
                        onUpdateActorAnimSettings(selectedActor.id, {
                          upperBodyWeight: Number(e.target.value),
                        })
                      }
                      className="studio-slider flex-1 disabled:opacity-40"
                    />
                    <span className="text-[11px] font-mono-tabular text-slate-300 w-8 text-right">
                      {Math.round((activeKeyframe?.upperBodyWeight ?? 0.85) * 100)}%
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <label htmlFor="head-lookat-select" className="text-[11px] text-slate-400 w-16 shrink-0">
                      Look-At
                    </label>
                    <select
                      id="head-lookat-select"
                      value={selectedActor.lookAtTarget ?? 'none'}
                      onChange={(e) =>
                        onUpdateActorRigBehavior(selectedActor.id, {
                          lookAtTarget: e.target.value,
                        })
                      }
                      className="flex-1 min-w-0 px-2 py-1 rounded bg-[#14161a] border border-[#393d47] text-xs text-slate-200"
                    >
                      <option value="none">None (Follow Clip)</option>
                      <option value="camera">Active Camera</option>
                      {otherActors.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-0.5">
                    <label className="inline-flex items-center gap-1.5 text-[11px] text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedActor.secondaryMotion !== false}
                        onChange={(e) =>
                          onUpdateActorRigBehavior(selectedActor.id, {
                            secondaryMotion: e.target.checked,
                          })
                        }
                        className="accent-[#00a2ff]"
                      />
                      <span>Secondary Cape / Prop Physics</span>
                    </label>
                  </div>
                </div>

                {/* Column 3: R6 Joint & Hip Tilt Sliders */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <label htmlFor="r6-joint-select" className="text-xs font-medium text-slate-400 shrink-0">
                      Joint / Hip Rig
                    </label>
                    <div className="flex items-center gap-1">
                      <select
                        id="r6-joint-select"
                        value={selectedJoint}
                        onChange={(e) =>
                          setSelectedJoint(e.target.value as R6BodyPartId | 'hipTilt')
                        }
                        className="px-2 py-0.5 rounded bg-[#14161a] border border-[#393d47] text-xs text-slate-200"
                      >
                        <option value="hipTilt">Hip Tilt (Root)</option>
                        {R6_BODY_PARTS.map((part) => (
                          <option key={part} value={part}>
                            {R6_BODY_PART_LABELS[part]}
                          </option>
                        ))}
                      </select>
                      {(Object.keys(jointDraft).length > 0 || hipTiltDraft) && (
                        <button
                          type="button"
                          onClick={onResetPoseDraft}
                          aria-label="Reset joint draft"
                          className="p-1 rounded bg-[#2b2e35] border border-[#393d47] text-slate-300 hover:text-white"
                        >
                          <RotateCcw className="w-3 h-3" aria-hidden="true" />
                        </button>
                      )}
                    </div>
                  </div>

                  {(['X', 'Y', 'Z'] as const).map((axisLabel, idx) => (
                    <div key={axisLabel} className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-400 w-4 shrink-0">
                        {axisLabel}
                      </span>
                      <input
                        type="range"
                        min={selectedJoint === 'hipTilt' ? -0.8 : -2.6}
                        max={selectedJoint === 'hipTilt' ? 0.8 : 2.6}
                        step={0.05}
                        aria-label={`${selectedJoint} ${axisLabel} rotation`}
                        value={currentJointRot[idx]}
                        onChange={(e) => {
                          const next: Vec3Tuple = [
                            currentJointRot[0],
                            currentJointRot[1],
                            currentJointRot[2],
                          ];
                          next[idx] = Number(e.target.value);
                          if (selectedJoint === 'hipTilt') {
                            onPreviewHipTilt(next);
                          } else {
                            onPreviewJoint(selectedJoint, next);
                          }
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
            )}

            {/* SUB-TAB 3: WARDROBE (Bundles, Hair Framework, Clothing, Hats, Dual-Color Gear) */}
            {subTab === 'appearance' && (
              <WardrobePanel
                actor={selectedActor}
                bodyColors={activeBodyColors}
                ornaments={activeOrnaments}
                hair={activeHair}
                clothing={activeClothing}
                onApplyBundle={onApplyBundle}
                onApplyOutfitPreset={onApplyOutfitPreset}
                onUpdateBodyPartColor={onUpdateBodyPartColor}
                onUpdateOrnament={onUpdateOrnament}
                onUpdateOrnamentFit={onUpdateOrnamentFit}
                onApplyAccessoryCombo={onApplyAccessoryCombo}
                onUpdateHair={onUpdateHair}
                onUpdateClothing={onUpdateClothing}
              />
            )}

            {subTab === 'poses' && (
              <div className="pt-2 border-t border-[#393d47]">
                <PoseLibraryPanel
                  builtInPoses={builtInPoses}
                  customPoses={customPoses}
                  activePoseId={activePosePreviewId}
                  isMirrored={poseMirrored}
                  includeExpression={includePoseExpression}
                  hasActiveDraft={
                    activePosePreviewId !== null ||
                    Object.keys(jointDraft).length > 0 ||
                    hipTiltDraft !== null ||
                    faceDraft !== null
                  }
                  onSelectPose={onSelectLibraryPose}
                  onToggleMirror={onTogglePoseMirror}
                  onToggleIncludeExpression={onToggleIncludePoseExpression}
                  onCommitPose={onCommitLibraryPose}
                  onResetPose={onResetLibraryPose}
                  onSaveCurrentPose={onSaveCurrentPose}
                  onDeleteCustomPose={onDeleteCustomPose}
                  onExportPoses={onExportPoses}
                  onImportPosesJson={onImportPosesJson}
                />
              </div>
            )}
            {subTab === 'items' && (
              <ItemHandlingPanel
                currentHeldItems={activeHeldItems}
                hasDraft={itemDraft !== null}
                activeEasing={activeItemKeyframe?.easing ?? 'equipPop'}
                onPreviewHeldItems={onPreviewHeldItems}
                onResetDraft={onResetItemDraft}
                onCommitItemKeyframe={onCommitItemKeyframe}
                onSpawnItemAsProp={onSpawnItemAsProp}
              />
            )}
          </>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-[#393d47]">
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300">
              <label className="inline-flex items-center gap-1.5">
                <span className="text-slate-400">Prop</span>
                <select
                  aria-label="Prop Model Type"
                  value={selectedActor.propKind ?? 'crate'}
                  onChange={(e) => {
                    const nextKind = e.target.value as PropKind;
                    onUpdatePropConfig(
                      selectedActor.id,
                      nextKind,
                      nextKind === 'heldItem'
                        ? selectedActor.propItemId ?? 'linkedSword'
                        : undefined,
                    );
                  }}
                  className="px-2 py-1 rounded bg-[#14161a] border border-[#393d47] text-xs text-slate-200"
                >
                  {BUILT_IN_PROPS.map((p) => (
                    <option key={p.kind} value={p.kind}>
                      {p.name}
                    </option>
                  ))}
                  <option value="heldItem">Dropped Gear / Item</option>
                </select>
              </label>

              {selectedActor.propKind === 'heldItem' && (
                <label className="inline-flex items-center gap-1.5">
                  <span className="text-slate-400">Item</span>
                  <select
                    aria-label="Dropped Item Model"
                    value={selectedActor.propItemId ?? 'linkedSword'}
                    onChange={(e) =>
                      onUpdatePropConfig(
                        selectedActor.id,
                        'heldItem',
                        e.target.value as ItemId,
                      )
                    }
                    className="px-2 py-1 rounded bg-[#14161a] border border-[#393d47] text-xs text-slate-200"
                  >
                    {BUILT_IN_ITEMS.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}

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
