import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { TopBar } from './components/TopBar';
import { StudioDock } from './components/StudioDock';
import { TimelinePanel } from './components/dock/TimelinePanel';
import { ScenePanel } from './components/dock/ScenePanel';
import { CharacterPanel } from './components/dock/CharacterPanel';
import { CutscenePanel } from './components/dock/CutscenePanel';
import { ExportPanel } from './components/dock/ExportPanel';
import { CROSSROADS_SHOWDOWN_PROJECT } from './engine/presets';
import { cloneBundle, ROBLOX_AVATAR_BUNDLES } from './engine/robloxCatalog';
import { StageEngine } from './engine/StageEngine';
import { resolveActorFaceConfig, resolveExpressionParams } from './engine/faceExpressions';
import {
  BUILT_IN_POSES,
  loadCustomPoses,
  mirrorHipTilt,
  mirrorPoseJoints,
  mirrorPosePreset,
  parsePoseLibraryJson,
  saveCustomPoses,
  serializePoseLibrary,
} from './engine/poseLibrary';
import {
  deleteActorKeyframe,
  deleteCameraKeyframe,
  deleteFaceKeyframe,
  deleteLightingKeyframe,
  deleteStageLight,
  deleteSubtitleCue,
  evaluateActorAt,
  evaluateLightingAt,
  evaluateProceduralClipPose,
  moveActorKeyframeTime,
  moveCameraKeyframeTime,
  moveFaceKeyframeTime,
  moveLightingKeyframeTime,
  parseProjectJson,
  serializeProject,
  upsertActorKeyframe,
  upsertCameraKeyframe,
  upsertFaceKeyframe,
  upsertLightingKeyframe,
  upsertStageLight,
  upsertSubtitleCue,
} from './engine/timeline';
import {
  AnimationProject,
  ActorKeyframe,
  CameraFramingPreset,
  CameraKeyframe,
  CameraMode,
  DockTab,
  EasingType,
  ExpressionParams,
  ExpressionPresetId,
  FaceRigConfig,
  GizmoMode,
  OrnamentSlot,
  PoseCategory,
  PoseClipId,
  PosePreset,
  PropKind,
  R6BodyPartId,
  SceneActorConfig,
  StageLightConfig,
  SubtitleCue,
  UpperBodyClipId,
  Vec3Tuple,
  WebmExportOptions,
  WebmRecordingState,
} from './engine/types';

function getActiveActorKeyframe(
  actor: SceneActorConfig,
  time: number,
): ActorKeyframe | null {
  if (actor.keyframes.length === 0) return null;
  const sorted = [...actor.keyframes].sort((a, b) => a.time - b.time);
  let active = sorted[0];
  for (const kf of sorted) {
    if (kf.time <= time + 0.04) {
      active = kf;
    } else {
      break;
    }
  }
  return active;
}

export default function App() {
  const [project, setProject] = useState<AnimationProject>(
    () => CROSSROADS_SHOWDOWN_PROJECT,
  );
  const [activeTab, setActiveTab] = useState<DockTab>('timeline');
  const [isDockCollapsed, setIsDockCollapsed] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [cameraMode, setCameraMode] = useState<CameraMode>('orbit');
  const [showCameraRig, setShowCameraRig] = useState(true);
  const [showLightHelpers, setShowLightHelpers] = useState(true);
  const [gizmoMode, setGizmoMode] = useState<GizmoMode>('translate');
  const [selectedActorId, setSelectedActorId] = useState<string | null>(
    () => CROSSROADS_SHOWDOWN_PROJECT.actors[0]?.id ?? null,
  );
  const [jointDraft, setJointDraft] = useState<Partial<Record<R6BodyPartId, Vec3Tuple>>>({});
  const [hipTiltDraft, setHipTiltDraft] = useState<Vec3Tuple | null>(null);
  const [faceDraft, setFaceDraft] = useState<{
    preset: ExpressionPresetId;
    overrides: Partial<ExpressionParams>;
  } | null>(null);
  const [customPoses, setCustomPoses] = useState<PosePreset[]>(() => loadCustomPoses());
  const [activePosePreviewId, setActivePosePreviewId] = useState<string | null>(null);
  const [poseMirrored, setPoseMirrored] = useState(false);
  const [includePoseExpression, setIncludePoseExpression] = useState(true);
  const [activeSubtitle, setActiveSubtitle] = useState<{
    speaker: string | null;
    text: string;
  } | null>(null);
  const [exportOptions, setExportOptions] = useState<WebmExportOptions>({
    resolution: '720p',
    fps: 30,
    bitrateMbps: 8,
    burnSubtitles: true,
    burnLetterbox: true,
  });
  const [recordingState, setRecordingState] = useState<WebmRecordingState>({
    status: 'idle',
    progress: 0,
    elapsedSec: 0,
    durationSec: CROSSROADS_SHOWDOWN_PROJECT.duration,
    blobUrl: null,
    mimeType: null,
    fileSizeBytes: null,
    error: null,
  });
  const [contextLost, setContextLost] = useState(false);

  const canvasMountRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<StageEngine | null>(null);
  const projectRef = useRef(project);
  const currentTimeRef = useRef(currentTime);
  projectRef.current = project;
  currentTimeRef.current = currentTime;

  useEffect(() => {
    const mount = canvasMountRef.current;
    if (!mount) return;

    const engine = new StageEngine(mount, projectRef.current, {
      onSelectActor: (actorId) => {
        setSelectedActorId(actorId);
        setJointDraft({});
        setHipTiltDraft(null);
        setFaceDraft(null);
        setActivePosePreviewId(null);
        setPoseMirrored(false);
        engineRef.current?.setPoseOverride(null, null);
        engineRef.current?.setFaceOverride(null, null);
      },
      onActorTransformCommit: (actorId, position, rotation, scale) => {
        const proj = projectRef.current;
        const t = currentTimeRef.current;
        const actor = proj.actors.find((a) => a.id === actorId);
        if (!actor) return;
        const evalActor = evaluateActorAt(actor, t, proj.subtitles);
        const activeKf = getActiveActorKeyframe(actor, t);
        setProject((prev) =>
          upsertActorKeyframe(prev, actorId, {
            id: `kf_${Date.now()}`,
            time: t,
            position,
            rotation,
            scale,
            clip: evalActor.clip,
            clipSpeed: activeKf?.clipSpeed ?? 1,
            upperBodyClip: evalActor.upperBodyClip,
            upperBodyWeight: evalActor.upperBodyWeight,
            easing: activeKf?.easing ?? 'easeInOut',
          }),
        );
      },
      onTimeUpdate: (time, subtitleText, subtitleSpeaker) => {
        setCurrentTime(time);
        if (subtitleText) {
          setActiveSubtitle({ speaker: subtitleSpeaker, text: subtitleText });
        } else {
          setActiveSubtitle(null);
        }
      },
      onPlaybackEnded: () => {
        setIsPlaying(false);
      },
      onContextLost: (lost) => {
        setContextLost(lost);
      },
    });

    engineRef.current = engine;
    if (projectRef.current.actors[0]?.id) {
      engine.selectActor(projectRef.current.actors[0].id);
    }

    const params = new URLSearchParams(window.location.search);
    if (params.get('autostart') === '1') {
      engine.setCameraMode('director');
      setCameraMode('director');
      engine.setPlaying(true);
      setIsPlaying(true);
    }

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  useEffect(() => {
    engineRef.current?.syncProject(project);
  }, [project]);

  useEffect(() => {
    saveCustomPoses(customPoses);
  }, [customPoses]);

  const handleTogglePlay = useCallback(() => {
    setIsPlaying((prev) => {
      const next = !prev;
      if (next) {
        setJointDraft({});
        setHipTiltDraft(null);
        setFaceDraft(null);
        setActivePosePreviewId(null);
        setPoseMirrored(false);
      }
      engineRef.current?.setPlaying(next);
      return next;
    });
  }, []);

  const handleSeek = useCallback((time: number) => {
    setJointDraft({});
    setHipTiltDraft(null);
    setFaceDraft(null);
    setActivePosePreviewId(null);
    setPoseMirrored(false);
    engineRef.current?.setPoseOverride(null, null);
    engineRef.current?.setFaceOverride(null, null);
    engineRef.current?.setTime(time);
    setCurrentTime(time);
  }, []);

  const handleSelectActor = useCallback((actorId: string) => {
    setSelectedActorId(actorId);
    setJointDraft({});
    setHipTiltDraft(null);
    setFaceDraft(null);
    setActivePosePreviewId(null);
    setPoseMirrored(false);
    engineRef.current?.setPoseOverride(null, null);
    engineRef.current?.setFaceOverride(null, null);
    engineRef.current?.selectActor(actorId);
  }, []);

  const handleSetCameraMode = useCallback((mode: CameraMode) => {
    setCameraMode(mode);
    engineRef.current?.setCameraMode(mode);
  }, []);

  const handleSetGizmoMode = useCallback((mode: GizmoMode) => {
    setGizmoMode(mode);
    engineRef.current?.setGizmoMode(mode);
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT')
      ) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        handleTogglePlay();
      } else if (e.key === 'h' || e.key === 'H') {
        setIsDockCollapsed((v) => !v);
      } else if (e.key === 'g' || e.key === 'G') {
        handleSetGizmoMode('translate');
      } else if (e.key === 'r' || e.key === 'R') {
        handleSetGizmoMode('rotate');
      } else if (e.key === 's' || e.key === 'S') {
        handleSetGizmoMode('scale');
      } else if (e.key === 'c' || e.key === 'C') {
        handleSetCameraMode(cameraMode === 'orbit' ? 'director' : 'orbit');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [cameraMode, handleSetCameraMode, handleSetGizmoMode, handleTogglePlay]);

  const evaluatedSelectedActor = useMemo(() => {
    if (!selectedActorId) return null;
    const actor = project.actors.find((a) => a.id === selectedActorId);
    if (!actor) return null;
    return evaluateActorAt(actor, currentTime, project.subtitles);
  }, [project, selectedActorId, currentTime]);

  const handleKeyActorAtCurrentTime = useCallback(() => {
    if (!selectedActorId) return;
    const actor = project.actors.find((a) => a.id === selectedActorId);
    if (!actor) return;
    const evalState = evaluateActorAt(actor, currentTime, project.subtitles);
    const activeKf = getActiveActorKeyframe(actor, currentTime);
    const hasCustomJoints = Object.keys(jointDraft).length > 0;

    setProject((prev) =>
      upsertActorKeyframe(prev, selectedActorId, {
        id: `kf_${Date.now()}`,
        time: currentTime,
        position: evalState.position,
        rotation: evalState.rotation,
        scale: evalState.scale,
        clip: hasCustomJoints ? 'custom' : evalState.clip,
        clipSpeed: activeKf?.clipSpeed ?? 1,
        upperBodyClip: evalState.upperBodyClip,
        upperBodyWeight: evalState.upperBodyWeight,
        customJoints: hasCustomJoints ? { ...jointDraft } : undefined,
        hipTilt: hipTiltDraft ?? undefined,
        easing: activeKf?.easing ?? 'easeInOut',
      }),
    );
    setJointDraft({});
    setHipTiltDraft(null);
    engineRef.current?.setPoseOverride(null, null);
  }, [jointDraft, hipTiltDraft, currentTime, project.actors, project.subtitles, selectedActorId]);

  const handleCommitFaceKeyframe = useCallback(() => {
    if (!selectedActorId) return;
    const actor = project.actors.find((a) => a.id === selectedActorId);
    if (!actor || actor.kind !== 'character') return;
    const evalState = evaluateActorAt(actor, currentTime, project.subtitles);
    const preset: ExpressionPresetId = faceDraft?.preset ?? evalState.face.preset;
    const overrides =
      faceDraft && Object.keys(faceDraft.overrides).length > 0
        ? { ...faceDraft.overrides }
        : undefined;

    setProject((prev) =>
      upsertFaceKeyframe(prev, selectedActorId, {
        id: `fkf_${Date.now()}`,
        time: currentTime,
        preset,
        overrides,
        easing: 'easeInOut',
      }),
    );
    setFaceDraft(null);
    engineRef.current?.setFaceOverride(null, null);
  }, [selectedActorId, project.actors, project.subtitles, currentTime, faceDraft]);

  const handleKeyCameraAtCurrentTime = useCallback(() => {
    const pose = engineRef.current?.getOrbitCameraPose() ?? {
      position: [5, 3, 6] as Vec3Tuple,
      target: [0, 1.3, 0] as Vec3Tuple,
      fov: 45,
    };
    setProject((prev) =>
      upsertCameraKeyframe(prev, {
        id: `cam_${Date.now()}`,
        time: currentTime,
        position: pose.position,
        target: pose.target,
        fov: pose.fov,
        easing: 'easeInOut',
        pathMode: 'spline',
        trackActorId: null,
        rollDeg: 0,
        shakeIntensity: 0,
        shakeFrequency: 8,
      }),
    );
  }, [currentTime]);

  const handleKeyLightingAtCurrentTime = useCallback(() => {
    const evalLight = evaluateLightingAt(projectRef.current, currentTime);
    setProject((prev) =>
      upsertLightingKeyframe(prev, {
        id: `lkf_${Date.now()}`,
        time: currentTime,
        sunAzimuth: Math.round(evalLight.sunAzimuth),
        sunElevation: Math.round(evalLight.sunElevation),
        keyIntensity: Number(evalLight.keyIntensity.toFixed(2)),
        rimIntensity: Number(evalLight.rimIntensity.toFixed(2)),
        ambientIntensity: Number(evalLight.ambientIntensity.toFixed(2)),
        exposure: Number(evalLight.exposure.toFixed(2)),
        easing: 'easeInOut',
      }),
    );
  }, [currentTime]);

  const handleApplyFramingPreset = useCallback(
    (preset: CameraFramingPreset) => {
      if (cameraMode !== 'orbit') {
        setCameraMode('orbit');
        engineRef.current?.setCameraMode('orbit');
      }
      engineRef.current?.applyShotFramingPreset(preset, selectedActorId);
    },
    [cameraMode, selectedActorId],
  );

  const handleAddCharacter = useCallback(
    (bundleId: string) => {
      const idx = project.actors.filter((a) => a.kind === 'character').length + 1;
      const offset = (idx % 4) * 1.2 - 1.5;
      const bundlePreset =
        ROBLOX_AVATAR_BUNDLES.find((b) => b.id === bundleId) ??
        ROBLOX_AVATAR_BUNDLES[0];
      const cloned = cloneBundle(bundlePreset.id);

      const newActor: SceneActorConfig = {
        id: `r6_${Date.now()}`,
        name: `${bundlePreset.name.split(' ').pop() ?? 'Avatar'} ${idx}`,
        kind: 'character',
        bundleId: bundlePreset.id,
        bodyColors: cloned.bodyColors,
        ornaments: cloned.ornaments,
        faceConfig: cloned.faceConfig,
        lookAtTarget: 'camera',
        lookAtWeight: 0.55,
        secondaryMotion: true,
        primaryColor: cloned.bodyColors.torso,
        accentColor: cloned.ornaments.hat.color,
        keyframes: [
          {
            id: `kf_${Date.now()}`,
            time: 0,
            position: [offset, 0, 1.2],
            rotation: [0, 0, 0],
            scale: [1, 1, 1],
            clip: 'idle',
            clipSpeed: 1,
            upperBodyClip: 'none',
            upperBodyWeight: 0,
            easing: 'easeInOut',
          },
        ],
        faceKeyframes: [
          {
            id: `fkf_${Date.now()}`,
            time: 0,
            preset: 'happy',
            easing: 'easeInOut',
          },
        ],
      };
      setProject((prev) => ({
        ...prev,
        actors: [...prev.actors, newActor],
      }));
      setSelectedActorId(newActor.id);
      setTimeout(() => engineRef.current?.selectActor(newActor.id), 0);
    },
    [project.actors],
  );

  const handleAddProp = useCallback(
    (propKind: PropKind) => {
      const idx = project.actors.filter((a) => a.kind === 'prop').length + 1;
      const newProp: SceneActorConfig = {
        id: `prop_${Date.now()}`,
        name: `${propKind[0].toUpperCase()}${propKind.slice(1)} ${idx}`,
        kind: 'prop',
        propKind,
        primaryColor: propKind === 'speeder' ? '#0d69ac' : '#635f62',
        accentColor: propKind === 'spawnpad' ? '#f2f3f3' : '#f5cd30',
        keyframes: [
          {
            id: `pkf_${Date.now()}`,
            time: 0,
            position: [idx * 1.1 - 1.5, 0, -1.2],
            rotation: [0, 0, 0],
            scale: [1, 1, 1],
            clip: 'idle',
            clipSpeed: 1,
            easing: 'easeInOut',
          },
        ],
      };
      setProject((prev) => ({
        ...prev,
        actors: [...prev.actors, newProp],
      }));
      setSelectedActorId(newProp.id);
      setTimeout(() => engineRef.current?.selectActor(newProp.id), 0);
    },
    [project.actors],
  );

  const handleDeleteActor = useCallback((actorId: string) => {
    setProject((prev) => {
      if (prev.actors.length <= 1) return prev;
      const remaining = prev.actors.filter((a) => a.id !== actorId);
      setSelectedActorId(remaining[0]?.id ?? null);
      return { ...prev, actors: remaining };
    });
  }, []);

  const handleApplyBundle = useCallback((actorId: string, bundleId: string) => {
    const cloned = cloneBundle(bundleId);
    setProject((prev) => ({
      ...prev,
      actors: prev.actors.map((a) =>
        a.id === actorId
          ? {
              ...a,
              bundleId,
              bodyColors: cloned.bodyColors,
              ornaments: cloned.ornaments,
              faceConfig: cloned.faceConfig,
              primaryColor: cloned.bodyColors.torso,
              accentColor: cloned.ornaments.hat.color,
            }
          : a,
      ),
    }));
  }, []);

  const handleUpdateBodyPartColor = useCallback(
    (actorId: string, part: R6BodyPartId, hex: string) => {
      setProject((prev) => ({
        ...prev,
        actors: prev.actors.map((a) => {
          if (a.id !== actorId) return a;
          const baseColors = a.bodyColors ?? cloneBundle('noob').bodyColors;
          const nextColors = { ...baseColors, [part]: hex };
          return {
            ...a,
            bodyColors: nextColors,
            primaryColor: nextColors.torso,
          };
        }),
      }));
    },
    [],
  );

  const handleUpdateOrnament = useCallback(
    (actorId: string, slot: OrnamentSlot, id: string, color: string) => {
      setProject((prev) => ({
        ...prev,
        actors: prev.actors.map((a) => {
          if (a.id !== actorId) return a;
          const baseOrnaments = a.ornaments ?? cloneBundle('noob').ornaments;
          return {
            ...a,
            ornaments: {
              ...baseOrnaments,
              [slot]: { id, color },
            },
          };
        }),
      }));
    },
    [],
  );

  const handleUpdateFaceConfig = useCallback(
    (actorId: string, patch: Partial<FaceRigConfig>) => {
      setProject((prev) => ({
        ...prev,
        actors: prev.actors.map((a) => {
          if (a.id !== actorId) return a;
          const currentCfg = resolveActorFaceConfig(a);
          return {
            ...a,
            faceConfig: { ...currentCfg, ...patch },
          };
        }),
      }));
    },
    [],
  );

  const handlePreviewFacePreset = useCallback(
    (preset: ExpressionPresetId) => {
      if (!selectedActorId || !evaluatedSelectedActor) return;
      const nextDraft = { preset, overrides: {} };
      setFaceDraft(nextDraft);
      const params = resolveExpressionParams(preset);
      engineRef.current?.setFaceOverride(selectedActorId, {
        ...evaluatedSelectedActor.face,
        preset,
        params,
      });
    },
    [selectedActorId, evaluatedSelectedActor],
  );

  const handlePreviewFaceParam = useCallback(
    (param: keyof ExpressionParams, value: number) => {
      if (!selectedActorId || !evaluatedSelectedActor) return;
      const basePreset = faceDraft?.preset ?? evaluatedSelectedActor.face.preset;
      const nextOverrides: Partial<ExpressionParams> = {
        ...(faceDraft?.overrides ?? {}),
        [param]: value,
      };
      setFaceDraft({ preset: basePreset, overrides: nextOverrides });
      const params = resolveExpressionParams(basePreset, nextOverrides);
      engineRef.current?.setFaceOverride(selectedActorId, {
        ...evaluatedSelectedActor.face,
        preset: basePreset,
        params,
      });
    },
    [selectedActorId, evaluatedSelectedActor, faceDraft],
  );

  const handleResetFaceDraft = useCallback(() => {
    setFaceDraft(null);
    engineRef.current?.setFaceOverride(null, null);
  }, []);

  const handleFocusActorFace = useCallback((actorId: string) => {
    setCameraMode('orbit');
    engineRef.current?.focusActorFace(actorId);
  }, []);

  const handleChangeClip = useCallback(
    (actorId: string, clip: PoseClipId) => {
      const actor = project.actors.find((a) => a.id === actorId);
      if (!actor) return;
      const evalState = evaluateActorAt(actor, currentTime, project.subtitles);
      const activeKf = getActiveActorKeyframe(actor, currentTime);
      setJointDraft({});
      setHipTiltDraft(null);
      engineRef.current?.setPoseOverride(null, null);
      setProject((prev) =>
        upsertActorKeyframe(prev, actorId, {
          id: `kf_${Date.now()}`,
          time: currentTime,
          position: evalState.position,
          rotation: evalState.rotation,
          scale: evalState.scale,
          clip,
          clipSpeed: activeKf?.clipSpeed ?? 1,
          upperBodyClip: evalState.upperBodyClip,
          upperBodyWeight: evalState.upperBodyWeight,
          easing: activeKf?.easing ?? 'easeInOut',
        }),
      );
    },
    [currentTime, project.actors, project.subtitles],
  );

  const handleUpdateActorAnimSettings = useCallback(
    (
      actorId: string,
      patch: {
        upperBodyClip?: UpperBodyClipId;
        upperBodyWeight?: number;
        clipSpeed?: number;
        easing?: EasingType;
      },
    ) => {
      const actor = project.actors.find((a) => a.id === actorId);
      if (!actor) return;
      const evalState = evaluateActorAt(actor, currentTime, project.subtitles);
      const activeKf = getActiveActorKeyframe(actor, currentTime);
      const nextUpperClip = patch.upperBodyClip ?? evalState.upperBodyClip;
      let nextUpperWeight = patch.upperBodyWeight ?? evalState.upperBodyWeight;
      if (patch.upperBodyClip !== undefined && patch.upperBodyWeight === undefined) {
        nextUpperWeight =
          patch.upperBodyClip === 'none'
            ? 0
            : evalState.upperBodyWeight > 0.05
              ? evalState.upperBodyWeight
              : 0.85;
      }

      setProject((prev) =>
        upsertActorKeyframe(prev, actorId, {
          id: `kf_${Date.now()}`,
          time: currentTime,
          position: evalState.position,
          rotation: evalState.rotation,
          scale: evalState.scale,
          clip: evalState.clip,
          clipSpeed: patch.clipSpeed ?? activeKf?.clipSpeed ?? 1,
          upperBodyClip: nextUpperClip,
          upperBodyWeight: nextUpperWeight,
          easing: patch.easing ?? activeKf?.easing ?? 'easeInOut',
        }),
      );
    },
    [currentTime, project.actors, project.subtitles],
  );

  const handleUpdateActorRigBehavior = useCallback(
    (
      actorId: string,
      patch: {
        lookAtTarget?: string;
        lookAtWeight?: number;
        secondaryMotion?: boolean;
      },
    ) => {
      setProject((prev) => ({
        ...prev,
        actors: prev.actors.map((a) =>
          a.id === actorId ? { ...a, ...patch } : a,
        ),
      }));
    },
    [],
  );

  const handlePreviewJoint = useCallback(
    (part: R6BodyPartId, rot: Vec3Tuple) => {
      if (!selectedActorId || !evaluatedSelectedActor) return;
      const nextDraft = { ...jointDraft, [part]: rot };
      setJointDraft(nextDraft);
      const mergedPose = evaluateProceduralClipPose(
        'custom',
        currentTime,
        1,
        { ...evaluatedSelectedActor.pose.joints, ...nextDraft },
      );
      if (hipTiltDraft) {
        mergedPose.hipTilt = [...hipTiltDraft];
      }
      engineRef.current?.setPoseOverride(selectedActorId, mergedPose);
    },
    [jointDraft, hipTiltDraft, currentTime, evaluatedSelectedActor, selectedActorId],
  );

  const handlePreviewHipTilt = useCallback(
    (tilt: Vec3Tuple) => {
      if (!selectedActorId || !evaluatedSelectedActor) return;
      setHipTiltDraft(tilt);
      const hasCustomJoints = Object.keys(jointDraft).length > 0;
      const basePose = hasCustomJoints
        ? evaluateProceduralClipPose('custom', currentTime, 1, {
            ...evaluatedSelectedActor.pose.joints,
            ...jointDraft,
          })
        : {
            ...evaluatedSelectedActor.pose,
            joints: { ...evaluatedSelectedActor.pose.joints },
          };
      basePose.hipTilt = [...tilt];
      engineRef.current?.setPoseOverride(selectedActorId, basePose);
    },
    [jointDraft, currentTime, evaluatedSelectedActor, selectedActorId],
  );

  const handleResetPoseDraft = useCallback(() => {
    setJointDraft({});
    setHipTiltDraft(null);
    setActivePosePreviewId(null);
    setPoseMirrored(false);
    engineRef.current?.setPoseOverride(null, null);
  }, []);

  const applyLibraryPosePreview = useCallback(
    (pose: PosePreset, mirrored: boolean, applyFace: boolean) => {
      if (!selectedActorId || !evaluatedSelectedActor) return;
      const effective = mirrored ? mirrorPosePreset(pose) : pose;
      setActivePosePreviewId(pose.id);
      setJointDraft({ ...effective.joints });
      setHipTiltDraft([...effective.hipTilt]);

      const mergedPose = evaluateProceduralClipPose(
        'custom',
        currentTime,
        1,
        effective.joints,
        effective.hipTilt,
      );
      engineRef.current?.setPoseOverride(selectedActorId, mergedPose);

      if (applyFace && effective.expression) {
        const overrides = effective.expression.overrides ?? {};
        setFaceDraft({
          preset: effective.expression.preset,
          overrides,
        });
        const params = resolveExpressionParams(
          effective.expression.preset,
          overrides,
        );
        engineRef.current?.setFaceOverride(selectedActorId, {
          ...evaluatedSelectedActor.face,
          preset: effective.expression.preset,
          params,
        });
      } else {
        setFaceDraft(null);
        engineRef.current?.setFaceOverride(null, null);
      }
    },
    [selectedActorId, evaluatedSelectedActor, currentTime],
  );

  const handleSelectLibraryPose = useCallback(
    (pose: PosePreset) => {
      applyLibraryPosePreview(pose, poseMirrored, includePoseExpression);
    },
    [applyLibraryPosePreview, poseMirrored, includePoseExpression],
  );

  const handleTogglePoseMirror = useCallback(() => {
    const nextMirrored = !poseMirrored;
    setPoseMirrored(nextMirrored);

    if (!selectedActorId || !evaluatedSelectedActor) return;
    if (activePosePreviewId) {
      const found =
        customPoses.find((p) => p.id === activePosePreviewId) ??
        BUILT_IN_POSES.find((p) => p.id === activePosePreviewId);
      if (found) {
        applyLibraryPosePreview(found, nextMirrored, includePoseExpression);
        return;
      }
    }

    // Mirror current live character joints even if no preset card is selected
    const baseJoints = {
      ...evaluatedSelectedActor.pose.joints,
      ...jointDraft,
    };
    const mirroredJoints = mirrorPoseJoints(baseJoints);
    const baseTilt = hipTiltDraft ?? evaluatedSelectedActor.pose.hipTilt;
    const mirroredTilt = mirrorHipTilt(baseTilt);
    setJointDraft(mirroredJoints);
    setHipTiltDraft(mirroredTilt);
    const mergedPose = evaluateProceduralClipPose(
      'custom',
      currentTime,
      1,
      mirroredJoints,
      mirroredTilt,
    );
    engineRef.current?.setPoseOverride(selectedActorId, mergedPose);
  }, [
    poseMirrored,
    selectedActorId,
    evaluatedSelectedActor,
    activePosePreviewId,
    customPoses,
    applyLibraryPosePreview,
    includePoseExpression,
    jointDraft,
    hipTiltDraft,
    currentTime,
  ]);

  const handleToggleIncludePoseExpression = useCallback(() => {
    const nextInclude = !includePoseExpression;
    setIncludePoseExpression(nextInclude);
    if (activePosePreviewId) {
      const found =
        customPoses.find((p) => p.id === activePosePreviewId) ??
        BUILT_IN_POSES.find((p) => p.id === activePosePreviewId);
      if (found) {
        applyLibraryPosePreview(found, poseMirrored, nextInclude);
      }
    }
  }, [
    includePoseExpression,
    activePosePreviewId,
    customPoses,
    applyLibraryPosePreview,
    poseMirrored,
  ]);

  const handleCommitLibraryPose = useCallback(() => {
    if (!selectedActorId) return;
    const actor = project.actors.find((a) => a.id === selectedActorId);
    if (!actor) return;
    const evalState = evaluateActorAt(actor, currentTime, project.subtitles);
    const activeKf = getActiveActorKeyframe(actor, currentTime);
    const hasCustomJoints = Object.keys(jointDraft).length > 0;

    setProject((prev) => {
      let next = upsertActorKeyframe(prev, selectedActorId, {
        id: `kf_${Date.now()}`,
        time: currentTime,
        position: evalState.position,
        rotation: evalState.rotation,
        scale: evalState.scale,
        clip: hasCustomJoints ? 'custom' : evalState.clip,
        clipSpeed: activeKf?.clipSpeed ?? 1,
        upperBodyClip: hasCustomJoints ? 'none' : evalState.upperBodyClip,
        upperBodyWeight: hasCustomJoints ? 0 : evalState.upperBodyWeight,
        customJoints: hasCustomJoints ? { ...jointDraft } : undefined,
        hipTilt: hipTiltDraft ?? undefined,
        easing: activeKf?.easing ?? 'easeInOut',
      });

      if (includePoseExpression && faceDraft && actor.kind === 'character') {
        const overrides =
          Object.keys(faceDraft.overrides).length > 0
            ? { ...faceDraft.overrides }
            : undefined;
        next = upsertFaceKeyframe(next, selectedActorId, {
          id: `fkf_${Date.now() + 1}`,
          time: currentTime,
          preset: faceDraft.preset,
          overrides,
          easing: 'easeInOut',
        });
      }
      return next;
    });

    setJointDraft({});
    setHipTiltDraft(null);
    setFaceDraft(null);
    setActivePosePreviewId(null);
    setPoseMirrored(false);
    engineRef.current?.setPoseOverride(null, null);
    engineRef.current?.setFaceOverride(null, null);
  }, [
    selectedActorId,
    project.actors,
    project.subtitles,
    currentTime,
    jointDraft,
    hipTiltDraft,
    includePoseExpression,
    faceDraft,
  ]);

  const handleResetLibraryPose = useCallback(() => {
    setJointDraft({});
    setHipTiltDraft(null);
    setFaceDraft(null);
    setActivePosePreviewId(null);
    setPoseMirrored(false);
    engineRef.current?.setPoseOverride(null, null);
    engineRef.current?.setFaceOverride(null, null);
  }, []);

  const handleSaveCurrentPose = useCallback(
    (name: string, category: PoseCategory, includeFace: boolean) => {
      if (!evaluatedSelectedActor) return;
      const joints = {
        ...evaluatedSelectedActor.pose.joints,
        ...jointDraft,
      };
      const hipTilt: Vec3Tuple = hipTiltDraft
        ? [...hipTiltDraft]
        : [...evaluatedSelectedActor.pose.hipTilt];

      const expression = includeFace
        ? {
            preset: faceDraft?.preset ?? evaluatedSelectedActor.face.preset,
            overrides:
              faceDraft && Object.keys(faceDraft.overrides).length > 0
                ? { ...faceDraft.overrides }
                : undefined,
          }
        : undefined;

      const newPose: PosePreset = {
        id: `custom_pose_${Date.now()}`,
        name,
        category,
        builtIn: false,
        joints,
        hipTilt,
        expression,
      };

      setCustomPoses((prev) => [newPose, ...prev]);
      setActivePosePreviewId(newPose.id);
      setPoseMirrored(false);
    },
    [evaluatedSelectedActor, jointDraft, hipTiltDraft, faceDraft],
  );

  const handleDeleteCustomPose = useCallback((poseId: string) => {
    setCustomPoses((prev) => prev.filter((p) => p.id !== poseId));
    setActivePosePreviewId((curr) => (curr === poseId ? null : curr));
  }, []);

  const handleExportPoses = useCallback(() => {
    const toExport = customPoses.length > 0 ? customPoses : BUILT_IN_POSES;
    const json = serializePoseLibrary(toExport);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download =
      customPoses.length > 0
        ? 'stagecraft-custom-poses.json'
        : 'stagecraft-builtin-poses.json';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }, [customPoses]);

  const handleImportPosesJson = useCallback(
    (raw: string): { ok: boolean; message: string } => {
      try {
        const imported = parsePoseLibraryJson(raw);
        setCustomPoses((prev) => {
          const existingIds = new Set(prev.map((p) => p.id));
          const deduped = imported.map((p, idx) =>
            existingIds.has(p.id)
              ? { ...p, id: `${p.id}_${Date.now()}_${idx}` }
              : p,
          );
          return [...deduped, ...prev];
        });
        return {
          ok: true,
          message: `Imported ${imported.length} pose${imported.length === 1 ? '' : 's'}.`,
        };
      } catch (err) {
        return {
          ok: false,
          message:
            err instanceof Error ? err.message : 'Unable to parse pose pack JSON.',
        };
      }
    },
    [],
  );

  const handleUpdateKeyframeEasing = useCallback(
    (
      ref:
        | { kind: 'camera'; keyframeId: string }
        | { kind: 'lighting'; keyframeId: string }
        | { kind: 'actor'; actorId: string; keyframeId: string }
        | { kind: 'face'; actorId: string; keyframeId: string },
      easing: EasingType,
    ) => {
      setProject((prev) => {
        if (ref.kind === 'camera') {
          return {
            ...prev,
            cameraTrack: prev.cameraTrack.map((k) =>
              k.id === ref.keyframeId ? { ...k, easing } : k,
            ),
          };
        }
        if (ref.kind === 'lighting') {
          return {
            ...prev,
            lightingTrack: (prev.lightingTrack ?? []).map((k) =>
              k.id === ref.keyframeId ? { ...k, easing } : k,
            ),
          };
        }
        if (ref.kind === 'actor') {
          return {
            ...prev,
            actors: prev.actors.map((a) =>
              a.id === ref.actorId
                ? {
                    ...a,
                    keyframes: a.keyframes.map((k) =>
                      k.id === ref.keyframeId ? { ...k, easing } : k,
                    ),
                  }
                : a,
            ),
          };
        }
        return {
          ...prev,
          actors: prev.actors.map((a) =>
            a.id === ref.actorId
              ? {
                  ...a,
                  faceKeyframes: (a.faceKeyframes ?? []).map((k) =>
                    k.id === ref.keyframeId ? { ...k, easing } : k,
                  ),
                }
              : a,
          ),
        };
      });
    },
    [],
  );

  const handleLoadPreset = useCallback((preset: AnimationProject) => {
    setIsPlaying(false);
    engineRef.current?.setPlaying(false);
    setProject(preset);
    setCurrentTime(0);
    engineRef.current?.setTime(0);
    setSelectedActorId(preset.actors[0]?.id ?? null);
    setJointDraft({});
    setHipTiltDraft(null);
    setFaceDraft(null);
    setActivePosePreviewId(null);
    setPoseMirrored(false);
    engineRef.current?.setPoseOverride(null, null);
    engineRef.current?.setFaceOverride(null, null);
  }, []);

  const handleCapturePng = useCallback(() => {
    const url = engineRef.current?.capturePngDataUrl();
    if (!url) return;
    const link = document.createElement('a');
    link.href = url;
    link.download = `${project.id}-frame.png`;
    link.click();
  }, [project.id]);

  const handleStartWebm = useCallback(() => {
    setRecordingState((prev) => {
      if (prev.blobUrl) URL.revokeObjectURL(prev.blobUrl);
      return {
        status: 'recording',
        progress: 0,
        elapsedSec: 0,
        durationSec: project.duration,
        blobUrl: null,
        mimeType: null,
        fileSizeBytes: null,
        error: null,
      };
    });

    const started = engineRef.current?.startWebmExport(exportOptions, {
      onProgress: (elapsed, duration) => {
        setRecordingState((prev) => ({
          ...prev,
          status: 'recording',
          elapsedSec: elapsed,
          durationSec: duration,
          progress: duration > 0 ? Math.min(1, elapsed / duration) : 0,
        }));
      },
      onComplete: (result) => {
        setIsPlaying(false);
        setRecordingState({
          status: 'ready',
          progress: 1,
          elapsedSec: projectRef.current.duration,
          durationSec: projectRef.current.duration,
          blobUrl: result.blobUrl,
          mimeType: result.mimeType,
          fileSizeBytes: result.fileSizeBytes,
          error: null,
        });
      },
      onError: (msg) => {
        setIsPlaying(false);
        setRecordingState((prev) => ({
          ...prev,
          status: 'error',
          error: msg,
        }));
      },
    });
    if (started) {
      setIsPlaying(true);
    }
  }, [exportOptions, project.duration]);

  const handleStopWebm = useCallback(() => {
    engineRef.current?.stopWebmExport();
    setIsPlaying(false);
  }, []);

  const handleCancelWebm = useCallback(() => {
    engineRef.current?.cancelWebmExport();
    setIsPlaying(false);
    setRecordingState((prev) => ({
      ...prev,
      status: 'idle',
      progress: 0,
      elapsedSec: 0,
      error: null,
    }));
  }, []);

  const handleDiscardWebm = useCallback(() => {
    setRecordingState((prev) => {
      if (prev.blobUrl) URL.revokeObjectURL(prev.blobUrl);
      return {
        status: 'idle',
        progress: 0,
        elapsedSec: 0,
        durationSec: projectRef.current.duration,
        blobUrl: null,
        mimeType: null,
        fileSizeBytes: null,
        error: null,
      };
    });
  }, []);

  const handleExportJson = useCallback(() => {
    const json = serializeProject(project);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${project.id}.stagecraft.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }, [project]);

  const handleImportJson = useCallback((raw: string): string | null => {
    try {
      const parsed = parseProjectJson(raw);
      setIsPlaying(false);
      engineRef.current?.setPlaying(false);
      setProject(parsed);
      setCurrentTime(0);
      engineRef.current?.setTime(0);
      setSelectedActorId(parsed.actors[0]?.id ?? null);
      return null;
    } catch (err) {
      return err instanceof Error ? err.message : 'Unable to parse project file.';
    }
  }, []);

  return (
    <div
      data-state={isPlaying ? 'playing' : 'paused'}
      data-time={currentTime.toFixed(2)}
      data-env={project.environment}
      data-camera-mode={cameraMode}
      className="relative w-screen h-screen flex flex-col bg-[#14161a] overflow-hidden"
    >
      <TopBar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        isPlaying={isPlaying}
        onTogglePlay={handleTogglePlay}
        isDockCollapsed={isDockCollapsed}
        onExpandDock={() => setIsDockCollapsed(false)}
      />

      <main className="relative flex-1 min-h-0 w-full">
        <div
          ref={canvasMountRef}
          data-testid="stage-canvas"
          className="w-full h-full"
        />

        {cameraMode === 'director' && (
          <>
            <div className="pointer-events-none absolute top-0 left-0 right-0 h-6 bg-black/95 z-10" />
            <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-6 bg-black/95 z-10" />
          </>
        )}

        {activeSubtitle && (
          <div
            data-testid="cutscene-subtitle"
            className={`pointer-events-none fixed left-1/2 -translate-x-1/2 z-15 max-w-2xl w-[min(640px,92vw)] px-5 py-2.5 rounded-lg bg-[#14161a]/92 border border-[#393d47] text-center transition-all ${
              isDockCollapsed
                ? 'bottom-14'
                : 'top-20 md:top-auto md:bottom-[296px]'
            }`}
          >
            {activeSubtitle.speaker && (
              <span className="text-xs font-semibold text-[#00a2ff] mr-2">
                {activeSubtitle.speaker}:
              </span>
            )}
            <span className="text-sm font-medium text-slate-100">
              {activeSubtitle.text}
            </span>
          </div>
        )}

        {contextLost && (
          <div
            role="alert"
            className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-[#14161a]/95 text-center p-6"
          >
            <h2 className="text-lg font-semibold text-slate-100 mb-2">
              3D Viewport Paused
            </h2>
            <p className="text-sm text-slate-400 max-w-md">
              The graphics context was interrupted by the browser. Reload the page to restore the 3D stage.
            </p>
          </div>
        )}
      </main>

      <StudioDock
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        isCollapsed={isDockCollapsed}
        onToggleCollapse={() => setIsDockCollapsed((v) => !v)}
      >
        {activeTab === 'timeline' && (
          <TimelinePanel
            project={project}
            currentTime={currentTime}
            isPlaying={isPlaying}
            playbackSpeed={playbackSpeed}
            cameraMode={cameraMode}
            selectedActorId={selectedActorId}
            onTogglePlay={handleTogglePlay}
            onSeek={handleSeek}
            onChangeSpeed={(spd) => {
              setPlaybackSpeed(spd);
              engineRef.current?.setPlaybackSpeed(spd);
            }}
            onToggleLoop={() =>
              setProject((p) => ({ ...p, loop: !p.loop }))
            }
            onSetCameraMode={handleSetCameraMode}
            onSelectActor={handleSelectActor}
            onKeyActorAtCurrentTime={handleKeyActorAtCurrentTime}
            onKeyFaceAtCurrentTime={handleCommitFaceKeyframe}
            onKeyCameraAtCurrentTime={handleKeyCameraAtCurrentTime}
            onKeyLightingAtCurrentTime={handleKeyLightingAtCurrentTime}
            onMoveActorKeyframe={(actorId, kfId, newTime) =>
              setProject((p) => moveActorKeyframeTime(p, actorId, kfId, newTime))
            }
            onMoveFaceKeyframe={(actorId, kfId, newTime) =>
              setProject((p) => moveFaceKeyframeTime(p, actorId, kfId, newTime))
            }
            onMoveCameraKeyframe={(kfId, newTime) =>
              setProject((p) => moveCameraKeyframeTime(p, kfId, newTime))
            }
            onMoveLightingKeyframe={(kfId, newTime) =>
              setProject((p) => moveLightingKeyframeTime(p, kfId, newTime))
            }
            onUpdateKeyframeEasing={handleUpdateKeyframeEasing}
            onDeleteActorKeyframe={(actorId, kfId) =>
              setProject((p) => deleteActorKeyframe(p, actorId, kfId))
            }
            onDeleteFaceKeyframe={(actorId, kfId) =>
              setProject((p) => deleteFaceKeyframe(p, actorId, kfId))
            }
            onDeleteCameraKeyframe={(kfId) =>
              setProject((p) => deleteCameraKeyframe(p, kfId))
            }
            onDeleteLightingKeyframe={(kfId) =>
              setProject((p) => deleteLightingKeyframe(p, kfId))
            }
          />
        )}

        {activeTab === 'scene' && (
          <ScenePanel
            project={project}
            currentTime={currentTime}
            showLightHelpers={showLightHelpers}
            onUpdateProject={(updater) => setProject(updater)}
            onLoadPreset={handleLoadPreset}
            onKeyLightingAtCurrentTime={handleKeyLightingAtCurrentTime}
            onToggleLightHelpers={() => {
              const next = !showLightHelpers;
              setShowLightHelpers(next);
              engineRef.current?.setShowLightHelpers(next);
            }}
            onUpsertStageLight={(light: StageLightConfig) =>
              setProject((p) => upsertStageLight(p, light))
            }
            onDeleteStageLight={(lightId) =>
              setProject((p) => deleteStageLight(p, lightId))
            }
          />
        )}

        {activeTab === 'character' && (
          <CharacterPanel
            project={project}
            currentTime={currentTime}
            selectedActorId={selectedActorId}
            evaluatedActor={evaluatedSelectedActor}
            gizmoMode={gizmoMode}
            jointDraft={jointDraft}
            hipTiltDraft={hipTiltDraft}
            faceDraft={faceDraft}
            onSelectActor={handleSelectActor}
            onAddCharacter={handleAddCharacter}
            onAddProp={handleAddProp}
            onDeleteActor={handleDeleteActor}
            onSetGizmoMode={handleSetGizmoMode}
            onApplyBundle={handleApplyBundle}
            onUpdateBodyPartColor={handleUpdateBodyPartColor}
            onUpdateOrnament={handleUpdateOrnament}
            onUpdatePropColors={(actorId, primaryColor, accentColor) =>
              setProject((prev) => ({
                ...prev,
                actors: prev.actors.map((a) =>
                  a.id === actorId ? { ...a, primaryColor, accentColor } : a,
                ),
              }))
            }
            onUpdateFaceConfig={handleUpdateFaceConfig}
            onPreviewFacePreset={handlePreviewFacePreset}
            onPreviewFaceParam={handlePreviewFaceParam}
            onResetFaceDraft={handleResetFaceDraft}
            onCommitFaceKeyframe={handleCommitFaceKeyframe}
            onFocusActorFace={handleFocusActorFace}
            onChangeClip={handleChangeClip}
            onUpdateActorAnimSettings={handleUpdateActorAnimSettings}
            onUpdateActorRigBehavior={handleUpdateActorRigBehavior}
            onPreviewJoint={handlePreviewJoint}
            onPreviewHipTilt={handlePreviewHipTilt}
            onResetPoseDraft={handleResetPoseDraft}
            onCommitPoseKeyframe={handleKeyActorAtCurrentTime}
            builtInPoses={BUILT_IN_POSES}
            customPoses={customPoses}
            activePosePreviewId={activePosePreviewId}
            poseMirrored={poseMirrored}
            includePoseExpression={includePoseExpression}
            onSelectLibraryPose={handleSelectLibraryPose}
            onTogglePoseMirror={handleTogglePoseMirror}
            onToggleIncludePoseExpression={handleToggleIncludePoseExpression}
            onCommitLibraryPose={handleCommitLibraryPose}
            onResetLibraryPose={handleResetLibraryPose}
            onSaveCurrentPose={handleSaveCurrentPose}
            onDeleteCustomPose={handleDeleteCustomPose}
            onExportPoses={handleExportPoses}
            onImportPosesJson={handleImportPosesJson}
          />
        )}

        {activeTab === 'cutscene' && (
          <CutscenePanel
            project={project}
            currentTime={currentTime}
            cameraMode={cameraMode}
            showCameraRig={showCameraRig}
            onSetCameraMode={handleSetCameraMode}
            onToggleCameraRig={() => {
              const next = !showCameraRig;
              setShowCameraRig(next);
              engineRef.current?.setShowCameraRig(next);
            }}
            onSnapOrbitToDirector={() =>
              engineRef.current?.snapOrbitToDirectorCamera()
            }
            onApplyFramingPreset={handleApplyFramingPreset}
            onCaptureOrbitAsCameraKeyframe={handleKeyCameraAtCurrentTime}
            onUpdateCameraKeyframe={(kf: CameraKeyframe) =>
              setProject((prev) => upsertCameraKeyframe(prev, kf))
            }
            onDeleteCameraKeyframe={(kfId) =>
              setProject((prev) => deleteCameraKeyframe(prev, kfId))
            }
            onSeek={handleSeek}
            onAddSubtitle={(cue: SubtitleCue) =>
              setProject((prev) => upsertSubtitleCue(prev, cue))
            }
            onDeleteSubtitle={(cueId) =>
              setProject((prev) => deleteSubtitleCue(prev, cueId))
            }
          />
        )}

        {activeTab === 'export' && (
          <ExportPanel
            project={project}
            exportOptions={exportOptions}
            recordingState={recordingState}
            onChangeExportOptions={setExportOptions}
            onCapturePng={handleCapturePng}
            onStartWebm={handleStartWebm}
            onStopWebm={handleStopWebm}
            onCancelWebm={handleCancelWebm}
            onDiscardWebm={handleDiscardWebm}
            onExportJson={handleExportJson}
            onImportJson={handleImportJson}
          />
        )}
      </StudioDock>
    </div>
  );
}
