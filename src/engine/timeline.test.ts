import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyEasing,
  applyUpperBodyLayer,
  catmullRomScalar,
  deleteActorKeyframe,
  deleteChapterMarker,
  deleteCharacterActionKeyframe,
  deleteCharacterStateKeyframe,
  deleteFaceKeyframe,
  deleteItemKeyframe,
  deleteLightingKeyframe,
  deleteMapKeyframe,
  deleteStageLight,
  evaluateActorAt,
  evaluateActorItemsAt,
  evaluateCameraAt,
  evaluateLightingAt,
  evaluateProceduralClipPose,
  evaluateProjectAt,
  evaluateStageAt,
  evaluateSubtitleAt,
  formatTimecode,
  getChapterAtTime,
  getChapterBounds,
  lerpAngleRad,
  moveActorKeyframeTime,
  moveChapterMarkerTime,
  moveCharacterActionKeyframeTime,
  moveCharacterStateKeyframeTime,
  moveFaceKeyframeTime,
  moveItemKeyframeTime,
  moveMapKeyframeTime,
  parseProjectJson,
  rippleShiftProjectFrom,
  serializeProject,
  upsertActorKeyframe,
  upsertCameraKeyframe,
  upsertChapterMarker,
  upsertCharacterActionKeyframe,
  upsertCharacterStateKeyframe,
  upsertFaceKeyframe,
  upsertItemKeyframe,
  upsertLightingKeyframe,
  upsertMapKeyframe,
  upsertStageLight,
} from './timeline';
import {
  CHARACTER_STATE_CATALOG,
  evaluateCharacterStateAt,
} from './characterStates';
import {
  CHARACTER_ACTION_CATALOG,
  CHARACTER_MODEL_BUILD_CATALOG,
  computeBuildRigLayout,
  evaluateCharacterActionAt,
  getActionFaceSyncOverlay,
} from './characterActions';
import {
  buildTimedCaptionWords,
  evaluateWordPopCaption,
  parseCaptionWords,
  resolveCaptionSettings,
  resolveNarratorSettings,
  stripCaptionMarkup,
} from './captionEngine';
import {
  countVoiceCuesInRange,
  resolveCueVoice,
} from './episodeAudio';
import {
  applyCinematicPreset,
  captureCinematicSnapshot,
  CINEMATIC_PRESETS,
  restoreCinematicSnapshot,
} from './cinematicPresets';
import {
  buildNarrationTranscript,
  detectVocalActivityIntervals,
  formatTranscriptDocument,
} from './narrationTranscript';
import {
  appendVoiceoverAssetToTrack,
  computeTrackDuckIntervals,
  deleteVoiceoverClip,
  evaluateClipFadeGain,
  getClipDuration,
  getClipEndTime,
  moveVoiceoverClip,
  sliceClipWaveformPeaks,
  splitVoiceoverClipAtTime,
  splitVoiceoverTrackAtPlayhead,
  trimVoiceoverClip,
  updateVoiceoverClipSettings,
} from './voiceoverCutter';
import {
  applyGripPresetToHandState,
  BUILT_IN_ITEMS,
  BUILT_IN_PROPS,
  createDefaultHandStateForItem,
  createEmptyHandState,
  DUAL_WIELD_COMBOS,
  formatHeldItemsSummary,
  ITEM_CATEGORIES,
} from './itemCatalog';
import {
  evaluateActorFaceAt,
  evaluateAutoBlink,
  evaluateSubtitleLipSync,
  resolveActorFaceConfig,
} from './faceExpressions';
import {
  BUILT_IN_POSES,
  mirrorPosePreset,
  parsePoseLibraryJson,
  serializePoseLibrary,
} from './poseLibrary';
import {
  BEDROOM_SKIT_PROJECT,
  BRICKIA_CHRONICLES_LONG_PROJECT,
  CROSSROADS_SHOWDOWN_PROJECT,
  ROBLOX_CITY_SHOWCASE_PROJECT,
  ROBLOXIAN_TOWN_PROJECT,
} from './presets';
import { THE_IDIOM_TOWN_PROJECT } from './idiomEpisode';
import {
  ACCESSORY_COMBOS,
  BELT_STYLE_OPTIONS,
  cloneBundle,
  CLOTHING_PATTERN_OPTIONS,
  FABRIC_MATERIAL_OPTIONS,
  FOOTWEAR_CATALOG,
  getHatTuckProfile,
  HAIR_HIGHLIGHT_PATTERNS,
  HAIR_STYLE_CATALOG,
  normalizeAccessoryFit,
  ORNAMENT_CATALOG,
  OUTERWEAR_CATALOG,
  OUTFIT_PRESETS,
  PANT_CATALOG,
  resolveActorClothing,
  resolveActorHair,
  resolveActorOrnaments,
  ROBLOX_AVATAR_BUNDLES,
  SHIRT_CATALOG,
} from './robloxCatalog';
import { MAX_SCENE_DURATION, ORNAMENT_SLOTS, R6_BODY_PARTS } from './types';
import {
  computeVerticalFovForAspect,
  getH264CodecCandidates,
  pickMediaRecorderMimeType,
  pickMediaRecorderMp4MimeType,
  resolveExportDimensions,
  VIDEO_FORMAT_CATALOG,
} from './mp4Recorder';
import { countSfxCuesInRange } from './episodeAudio';
import {
  BUILT_IN_MAPS,
  MAP_MODULE_CATALOG,
  applyMapToProject,
  cloneMapForBuilder,
  createBlankCustomMap,
  getActiveMapSignature,
  parseMapLibraryJson,
  serializeMapLibrary,
  serializeSingleMap,
} from './mapLibrary';
import {
  BUILT_IN_SCENES,
  createSceneEntryFromProject,
  parseSceneLibraryJson,
  serializeSceneLibrary,
} from './sceneLibrary';

test('easing functions return exact boundary values and step behavior', () => {
  assert.equal(applyEasing(0, 'linear'), 0);
  assert.equal(applyEasing(1, 'linear'), 1);
  assert.equal(applyEasing(0.5, 'linear'), 0.5);
  assert.equal(applyEasing(0.5, 'easeInOut'), 0.5);
  assert.equal(applyEasing(0.99, 'step'), 0);
  assert.equal(applyEasing(1, 'step'), 1);
});

test('lerpAngleRad takes shortest angular path across PI boundary', () => {
  const from = Math.PI - 0.1;
  const to = -Math.PI + 0.1;
  const mid = lerpAngleRad(from, to, 0.5);
  assert.ok(Math.abs(Math.abs(mid) - Math.PI) < 0.05);
});

test('R6 body parts and 6 ornament slots are complete in catalog and bundles', () => {
  assert.deepEqual(R6_BODY_PARTS, [
    'head',
    'torso',
    'leftArm',
    'rightArm',
    'leftLeg',
    'rightLeg',
  ]);
  assert.deepEqual(ORNAMENT_SLOTS, [
    'head',
    'hat',
    'face',
    'neck',
    'shoulder',
    'back',
    'waist',
    'arm',
    'legs',
  ]);
  for (const slot of ORNAMENT_SLOTS) {
    assert.ok(ORNAMENT_CATALOG[slot].length >= 4, `Slot ${slot} has items`);
  }
  const bundle = cloneBundle('knight');
  for (const part of R6_BODY_PARTS) {
    assert.ok(bundle.bodyColors[part].startsWith('#'));
  }
  for (const slot of ORNAMENT_SLOTS) {
    assert.ok(typeof bundle.ornaments[slot].id === 'string');
  }
});

test('evaluateProceduralClipPose generates distinct R6 poses and applies custom joint overrides', () => {
  const walkA = evaluateProceduralClipPose('walk', 0.25, 1);
  const slash = evaluateProceduralClipPose('swordSwing', 0.25, 1);
  assert.notDeepEqual(walkA.joints.rightArm, slash.joints.rightArm);

  const custom = evaluateProceduralClipPose('custom', 0, 1, {
    head: [0.4, -0.5, 0],
    leftArm: [0.2, 0, 0.8],
  });
  assert.deepEqual(custom.joints.head, [0.4, -0.5, 0]);
  assert.deepEqual(custom.joints.leftArm, [0.2, 0, 0.8]);
  assert.deepEqual(custom.joints.torso, [0, 0, 0]);
});

test('evaluateActorAt interpolates position and handles boundaries', () => {
  const knight = CROSSROADS_SHOWDOWN_PROJECT.actors[0];
  const atStart = evaluateActorAt(knight, 0);
  assert.deepEqual(atStart.position, [-3.0, 0, 1.2]);

  const atMid = evaluateActorAt(knight, 1.4);
  assert.ok(atMid.position[0] > -3.0 && atMid.position[0] < -1.05);

  const pastEnd = evaluateActorAt(knight, 99);
  assert.deepEqual(pastEnd.position, [-0.75, 0, 0.35]);
});

test('evaluateCameraAt respects hard step cuts, Catmull-Rom splines, roll, and deterministic shake', () => {
  assert.equal(catmullRomScalar(0, 1, 2, 3, 0), 1);
  assert.equal(catmullRomScalar(0, 1, 2, 3, 1), 2);

  const track = CROSSROADS_SHOWDOWN_PROJECT.cameraTrack;
  const beforeCut = evaluateCameraAt(track, 3.01);
  const afterCut = evaluateCameraAt(track, 3.05);
  assert.deepEqual(beforeCut.position, [-4.4, 2.55, 6.4]);
  assert.deepEqual(afterCut.position, [5.4, 2.45, 5.2]);

  // Shake at shot 2 (time 3.0) produces deterministic non-zero shake offset & roll
  const atShake = evaluateCameraAt(track, 3.0);
  const atShakeRepeat = evaluateCameraAt(track, 3.0);
  assert.deepEqual(atShake.shakeOffset, atShakeRepeat.shakeOffset);
  assert.ok(Math.abs(atShake.rollRad) > 0.01);
});

test('evaluateProjectAt tracks target actor position when trackActorId is set', () => {
  const frameAtStart = evaluateProjectAt(CROSSROADS_SHOWDOWN_PROJECT, 0);
  const knightPos = frameAtStart.actors['actor-knight'].position;
  assert.deepEqual(frameAtStart.camera.target, [
    knightPos[0],
    knightPos[1] + 1.35,
    knightPos[2],
  ]);
});

test('evaluateLightingAt interpolates sun angles and intensities across keyframes', () => {
  const lightStart = evaluateLightingAt(CROSSROADS_SHOWDOWN_PROJECT, 0);
  const lightMid = evaluateLightingAt(CROSSROADS_SHOWDOWN_PROJECT, 2.0);
  const lightEnd = evaluateLightingAt(CROSSROADS_SHOWDOWN_PROJECT, 8.5);
  assert.equal(lightStart.sunAzimuth, 44);
  assert.ok(lightMid.sunAzimuth > 44 && lightMid.sunAzimuth < 68);
  assert.equal(lightEnd.sunAzimuth, 92);

  let proj = upsertLightingKeyframe(CROSSROADS_SHOWDOWN_PROJECT, {
    id: 'lkf-custom',
    time: 6.0,
    sunAzimuth: 120,
    sunElevation: 25,
    keyIntensity: 1.8,
    rimIntensity: 1.6,
    ambientIntensity: 0.7,
    exposure: 1.0,
    easing: 'linear',
  });
  assert.ok(proj.lightingTrack?.some((k) => k.id === 'lkf-custom'));
  proj = deleteLightingKeyframe(proj, 'lkf-custom');
  assert.ok(!proj.lightingTrack?.some((k) => k.id === 'lkf-custom'));
});

test('stage light CRUD helpers manage point and spot lights cleanly', () => {
  let proj = upsertStageLight(CROSSROADS_SHOWDOWN_PROJECT, {
    id: 'test-spot',
    name: 'Test Spot',
    type: 'spot',
    color: '#00a2ff',
    intensity: 12,
    distance: 15,
    angleDeg: 35,
    penumbra: 0.5,
    position: [1, 4, 1],
    target: [0, 0, 0],
    enabled: true,
    castShadow: false,
  });
  assert.ok(proj.stageLights?.some((l) => l.id === 'test-spot'));
  proj = deleteStageLight(proj, 'test-spot');
  assert.ok(!proj.stageLights?.some((l) => l.id === 'test-spot'));
});

test('evaluateSubtitleAt matches active subtitle cue window', () => {
  const subs = CROSSROADS_SHOWDOWN_PROJECT.subtitles;
  assert.equal(evaluateSubtitleAt(subs, 0.1), null);
  const active = evaluateSubtitleAt(subs, 1.2);
  assert.ok(active);
  assert.equal(active.speaker, 'Crossroads Knight');
});

test('evaluateProjectAt returns full frame state', () => {
  const frame = evaluateProjectAt(CROSSROADS_SHOWDOWN_PROJECT, 4.0);
  assert.equal(frame.time, 4.0);
  assert.ok(frame.actors['actor-knight']);
  assert.ok(frame.actors['actor-noob']);
  assert.ok(frame.lighting);
  assert.ok(frame.subtitle);
  assert.equal(frame.subtitle?.speaker, 'Classic Noob');
});

test('keyframe upsert and delete maintain sorted order and protect base keyframe', () => {
  const actorId = 'actor-knight';
  let proj = upsertActorKeyframe(CROSSROADS_SHOWDOWN_PROJECT, actorId, {
    id: 'test-kf',
    time: 5.0,
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    scale: [1, 1, 1],
    clip: 'sit',
    clipSpeed: 1,
    easing: 'linear',
  });
  const actorAfterAdd = proj.actors.find((a) => a.id === actorId)!;
  assert.ok(actorAfterAdd.keyframes.some((k) => k.id === 'test-kf'));
  for (let i = 1; i < actorAfterAdd.keyframes.length; i++) {
    assert.ok(actorAfterAdd.keyframes[i].time >= actorAfterAdd.keyframes[i - 1].time);
  }

  proj = deleteActorKeyframe(proj, actorId, 'test-kf');
  const actorAfterDel = proj.actors.find((a) => a.id === actorId)!;
  assert.ok(!actorAfterDel.keyframes.some((k) => k.id === 'test-kf'));

  const camProj = upsertCameraKeyframe(proj, {
    id: 'cam-test',
    time: 7.5,
    position: [1, 2, 3],
    target: [0, 1, 0],
    fov: 35,
    easing: 'easeInOut',
  });
  assert.ok(camProj.cameraTrack.some((c) => c.id === 'cam-test'));
});

test('formatTimecode formats seconds cleanly', () => {
  assert.equal(formatTimecode(0), '00:00.0');
  assert.equal(formatTimecode(4.26), '00:04.2');
  assert.equal(formatTimecode(65.5), '01:05.5');
});

test('project JSON serialization roundtrip and validation', () => {
  const json = serializeProject(CROSSROADS_SHOWDOWN_PROJECT);
  const parsed = parseProjectJson(json);
  assert.equal(parsed.name, CROSSROADS_SHOWDOWN_PROJECT.name);
  assert.equal(parsed.actors.length, CROSSROADS_SHOWDOWN_PROJECT.actors.length);
  assert.equal(
    parsed.lightingTrack?.length,
    CROSSROADS_SHOWDOWN_PROJECT.lightingTrack?.length,
  );
  assert.equal(
    parsed.stageLights?.length,
    CROSSROADS_SHOWDOWN_PROJECT.stageLights?.length,
  );

  assert.throws(() => parseProjectJson('{not valid json'), /Invalid JSON/);
  assert.throws(() => parseProjectJson('{"foo":"bar"}'), /missing required fields/);
});

test('extended spring and back easing curves respect boundaries and show overshoot/anticipation', () => {
  for (const curve of ['easeInBack', 'easeOutBack', 'spring'] as const) {
    assert.equal(applyEasing(0, curve), 0);
    assert.equal(applyEasing(1, curve), 1);
  }
  assert.ok(applyEasing(0.25, 'easeInBack') < 0, 'easeInBack anticipates below 0');
  assert.ok(applyEasing(0.75, 'easeOutBack') > 1, 'easeOutBack overshoots above 1');
  assert.ok(applyEasing(0.35, 'spring') > 1, 'spring overshoots above 1');
});

test('layered upper-body clip blending modifies arms/head while keeping lower-body legs intact', () => {
  const walkBase = evaluateProceduralClipPose('walk', 0.35, 1);
  const layered = applyUpperBodyLayer(walkBase, 'wave', 0.35, 1, 1);
  assert.deepEqual(layered.joints.leftLeg, walkBase.joints.leftLeg);
  assert.deepEqual(layered.joints.rightLeg, walkBase.joints.rightLeg);
  assert.notDeepEqual(layered.joints.rightArm, walkBase.joints.rightArm);
});

test('auto-blink, subtitle lip-sync, and 3D face keyframe evaluation are deterministic', () => {
  const knight = CROSSROADS_SHOWDOWN_PROJECT.actors[0];
  const cfg = resolveActorFaceConfig(knight);
  assert.ok(cfg.eyeStyle && cfg.mouthStyle);

  // Auto-blink determinism & range
  const b1 = evaluateAutoBlink(3.15, 7);
  const b2 = evaluateAutoBlink(3.15, 7);
  assert.equal(b1, b2);
  assert.ok(b1 >= 0 && b1 <= 1);

  // Subtitle lip-sync activates during knight's spoken line and opens jaw on vowels
  const lipSpeaking = evaluateSubtitleLipSync(
    knight,
    CROSSROADS_SHOWDOWN_PROJECT.subtitles,
    1.2,
  );
  const peakJaw = [0.9, 1.1, 1.3, 1.5, 1.7, 1.9, 2.1].reduce((max, t) => {
    const v = evaluateSubtitleLipSync(
      knight,
      CROSSROADS_SHOWDOWN_PROJECT.subtitles,
      t,
    );
    return Math.max(max, v.jawOpen);
  }, 0);
  const lipSilent = evaluateSubtitleLipSync(
    knight,
    CROSSROADS_SHOWDOWN_PROJECT.subtitles,
    0.1,
  );
  assert.equal(lipSpeaking.active, true);
  assert.ok(peakJaw > 0.35, `Expected dynamic vowel peak jawOpen > 0.35, got ${peakJaw}`);
  assert.equal(lipSilent.active, false);
  assert.equal(lipSilent.jawOpen, 0);

  // Face state evaluation blends presets & carries speaking flag
  const faceAt15 = evaluateActorFaceAt(
    knight,
    1.5,
    CROSSROADS_SHOWDOWN_PROJECT.subtitles,
    applyEasing,
  );
  assert.equal(faceAt15.isSpeaking, true);
  assert.ok(faceAt15.params.jawOpen > 0);
});

test('face keyframe CRUD and timeline drag-move helpers preserve ordering', () => {
  const actorId = 'actor-knight';
  let proj = upsertFaceKeyframe(CROSSROADS_SHOWDOWN_PROJECT, actorId, {
    id: 'fkf-test',
    time: 4.5,
    preset: 'surprised',
    overrides: { jawOpen: 0.9 },
    easing: 'easeOutBack',
  });
  let actor = proj.actors.find((a) => a.id === actorId)!;
  assert.ok(actor.faceKeyframes?.some((k) => k.id === 'fkf-test'));

  proj = moveFaceKeyframeTime(proj, actorId, 'fkf-test', 2.25);
  actor = proj.actors.find((a) => a.id === actorId)!;
  const movedFace = actor.faceKeyframes?.find((k) => k.id === 'fkf-test');
  assert.equal(movedFace?.time, 2.25);

  proj = deleteFaceKeyframe(proj, actorId, 'fkf-test');
  actor = proj.actors.find((a) => a.id === actorId)!;
  assert.ok(!actor.faceKeyframes?.some((k) => k.id === 'fkf-test'));

  const firstMovable = actor.keyframes[1];
  proj = moveActorKeyframeTime(proj, actorId, firstMovable.id, 3.35);
  const movedActorKf = proj.actors
    .find((a) => a.id === actorId)!
    .keyframes.find((k) => k.id === firstMovable.id);
  assert.equal(movedActorKf?.time, 3.35);
});

test('deterministic secondary motion computes non-zero cape pitch during movement', () => {
  const knight = CROSSROADS_SHOWDOWN_PROJECT.actors[0];
  const stateA = evaluateActorAt(knight, 1.4, CROSSROADS_SHOWDOWN_PROJECT.subtitles);
  const stateB = evaluateActorAt(knight, 1.4, CROSSROADS_SHOWDOWN_PROJECT.subtitles);
  assert.deepEqual(stateA.secondaryMotion, stateB.secondaryMotion);
  assert.ok(stateA.secondaryMotion.capePitch > 0.05);
});

test('pose library built-in catalog is complete and mirrors L/R joints, hip tilt, and wink expression symmetrically', () => {
  assert.ok(BUILT_IN_POSES.length >= 16);
  for (const pose of BUILT_IN_POSES) {
    for (const part of R6_BODY_PARTS) {
      assert.equal(pose.joints[part].length, 3);
    }
    assert.equal(pose.hipTilt.length, 3);
  }

  const wave = BUILT_IN_POSES.find((p) => p.id === 'pose_friendly_wave')!;
  const mirrored = mirrorPosePreset(wave);
  // Right arm raising becomes left arm raising with negated Y/Z
  assert.equal(mirrored.joints.leftArm[0], wave.joints.rightArm[0]);
  assert.equal(mirrored.joints.leftArm[1], -wave.joints.rightArm[1]);
  assert.equal(mirrored.joints.leftArm[2], -wave.joints.rightArm[2]);
  assert.equal(mirrored.joints.rightArm[0], wave.joints.leftArm[0]);
  assert.equal(mirrored.hipTilt[2], -wave.hipTilt[2]);

  // Mirroring a wink pose swaps blinkL and blinkR
  const glance = BUILT_IN_POSES.find((p) => p.id === 'pose_over_shoulder')!;
  const mirroredGlance = mirrorPosePreset(glance);
  assert.ok(mirroredGlance.expression?.overrides);
  assert.notEqual(
    mirroredGlance.expression?.overrides?.blinkL,
    mirroredGlance.expression?.overrides?.blinkR,
  );
});

test('pose library JSON serialization roundtrip and validation', () => {
  const sample = BUILT_IN_POSES.slice(0, 3);
  const json = serializePoseLibrary(sample);
  const parsed = parsePoseLibraryJson(json);
  assert.equal(parsed.length, 3);
  assert.equal(parsed[0].name, sample[0].name);
  assert.equal(parsed[0].builtIn, false);
  assert.deepEqual(parsed[0].joints.rightArm, sample[0].joints.rightArm);

  assert.throws(() => parsePoseLibraryJson('{broken'), /Invalid JSON/);
  assert.throws(() => parsePoseLibraryJson('{"foo":1}'), /missing a valid "poses" array/);
  assert.throws(() => parsePoseLibraryJson('{"poses":[]}'), /No valid R6 pose/);
});

test('MP4 recorder dimension alignment, Constrained Baseline H.264 priority, and MP4-only MIME check', () => {
  const fakeCanvas = { clientWidth: 1003, clientHeight: 571, width: 1003, height: 571 } as HTMLCanvasElement;
  assert.deepEqual(resolveExportDimensions(fakeCanvas, '720p'), { width: 1280, height: 720 });
  assert.deepEqual(resolveExportDimensions(fakeCanvas, '1080p'), { width: 1920, height: 1080 });
  const nativeDims = resolveExportDimensions(fakeCanvas, 'native');
  assert.equal(nativeDims.width % 16, 0);
  assert.equal(nativeDims.height % 16, 0);

  const hdCandidates = getH264CodecCandidates(1280, 720, 30, 8_000_000);
  assert.ok(hdCandidates[0].startsWith('avc1.42e0'), `Expected Constrained Baseline first, got ${hdCandidates[0]}`);
  const fhdCandidates = getH264CodecCandidates(1920, 1080, 60, 14_000_000);
  assert.ok(fhdCandidates[0].startsWith('avc1.42e0'), `Expected Constrained Baseline first for 1080p60, got ${fhdCandidates[0]}`);

  // In Node environment without MediaRecorder, returns null; with mock MediaRecorder, never selects WebM
  assert.equal(pickMediaRecorderMp4MimeType(), null);
  const prevMR = (globalThis as Record<string, unknown>).MediaRecorder;
  try {
    (globalThis as Record<string, unknown>).MediaRecorder = {
      isTypeSupported: (mime: string) => mime.includes('webm'),
    };
    assert.equal(pickMediaRecorderMp4MimeType(), null);

    (globalThis as Record<string, unknown>).MediaRecorder = {
      isTypeSupported: (mime: string) => mime === 'video/mp4;codecs=avc1.42e01f',
    };
    assert.equal(pickMediaRecorderMp4MimeType(), 'video/mp4;codecs=avc1.42e01f');
  } finally {
    if (prevMR === undefined) {
      delete (globalThis as Record<string, unknown>).MediaRecorder;
    } else {
      (globalThis as Record<string, unknown>).MediaRecorder = prevMR;
    }
  }
});

test('Map Library catalog, hot-swap preservation, and custom map builder helpers', () => {
  assert.equal(BUILT_IN_MAPS.length, 8);
  assert.equal(MAP_MODULE_CATALOG.length, 32);

  const lunar = BUILT_IN_MAPS.find((m) => m.builtInSourceId === 'lunarOutpost')!;
  const swappedKeepMood = applyMapToProject(CROSSROADS_SHOWDOWN_PROJECT, lunar, false);
  assert.equal(swappedKeepMood.environment, 'lunarOutpost');
  assert.equal(swappedKeepMood.lightingMood, CROSSROADS_SHOWDOWN_PROJECT.lightingMood);
  assert.equal(swappedKeepMood.actors.length, CROSSROADS_SHOWDOWN_PROJECT.actors.length);
  assert.equal(
    swappedKeepMood.cameraTrack.length,
    CROSSROADS_SHOWDOWN_PROJECT.cameraTrack.length,
  );
  assert.equal(
    swappedKeepMood.subtitles.length,
    CROSSROADS_SHOWDOWN_PROJECT.subtitles.length,
  );

  const swappedWithMood = applyMapToProject(CROSSROADS_SHOWDOWN_PROJECT, lunar, true);
  assert.equal(swappedWithMood.environment, 'lunarOutpost');
  assert.equal(swappedWithMood.lightingMood, 'midnight');
  assert.equal(swappedWithMood.sunAzimuth, lunar.recommendedLighting.sunAzimuth);

  const remixed = cloneMapForBuilder(lunar);
  assert.equal(remixed.builtIn, false);
  assert.equal(remixed.modules.length, lunar.modules.length);
  const sigBefore = getActiveMapSignature('custom', remixed);
  remixed.modules[0].position[0] += 2;
  const sigAfter = getActiveMapSignature('custom', remixed);
  assert.notEqual(sigBefore, sigAfter);
});

test('Map & Scene Library JSON roundtrip and embedded customMap preservation in AnimationProject', () => {
  const customMap = createBlankCustomMap('Neon Arena Test');
  customMap.baseplate.groundColor = '#1e293b';

  const bundleJson = serializeMapLibrary([customMap]);
  const parsedMaps = parseMapLibraryJson(bundleJson);
  assert.equal(parsedMaps.length, 1);
  assert.equal(parsedMaps[0].name, 'Neon Arena Test');
  assert.equal(parsedMaps[0].baseplate.groundColor, '#1e293b');

  const singleJson = serializeSingleMap(customMap);
  const parsedSingle = parseMapLibraryJson(singleJson);
  assert.equal(parsedSingle.length, 1);
  assert.equal(parsedSingle[0].name, 'Neon Arena Test');

  const projWithCustomMap = applyMapToProject(CROSSROADS_SHOWDOWN_PROJECT, customMap, true);
  assert.equal(projWithCustomMap.environment, 'custom');
  const projJson = serializeProject(projWithCustomMap);
  const parsedProj = parseProjectJson(projJson);
  assert.equal(parsedProj.environment, 'custom');
  assert.equal(parsedProj.customMap?.name, 'Neon Arena Test');
  assert.equal(parsedProj.customMap?.modules.length, customMap.modules.length);

  assert.equal(BUILT_IN_SCENES.length, 11);
  const snapshot = createSceneEntryFromProject(
    projWithCustomMap,
    'Custom Arena Snapshot',
    'showcase',
  );
  const scenesJson = serializeSceneLibrary([snapshot]);
  const parsedScenes = parseSceneLibraryJson(scenesJson);
  assert.equal(parsedScenes.length, 1);
  assert.equal(parsedScenes[0].name, 'Custom Arena Snapshot');
  assert.equal(parsedScenes[0].project.environment, 'custom');
  assert.equal(parsedScenes[0].project.customMap?.name, 'Neon Arena Test');
});

test('Item & Prop catalog completeness, dual-wield grip presets, and summary formatting', () => {
  assert.equal(BUILT_IN_ITEMS.length, 30);
  assert.equal(BUILT_IN_PROPS.length, 33);
  assert.equal(DUAL_WIELD_COMBOS.length, 9);

  const shieldR = createDefaultHandStateForItem('heaterShield', 'right');
  const shieldL = createDefaultHandStateForItem('heaterShield', 'left');
  assert.equal(shieldR.gripPreset, 'forearm');
  assert.equal(shieldR.positionOffset[0], -0.24);
  assert.equal(shieldL.positionOffset[0], 0.24);
  assert.equal(shieldR.rotationDeg[1], -90);
  assert.equal(shieldL.rotationDeg[1], 90);

  const reversed = applyGripPresetToHandState(
    createDefaultHandStateForItem('linkedSword', 'right'),
    'reverse',
    'right',
  );
  assert.equal(reversed.gripPreset, 'reverse');
  assert.equal(reversed.rotationDeg[0], 180);

  assert.equal(
    formatHeldItemsSummary({
      right: createDefaultHandStateForItem('laserBlaster', 'right'),
      left: createDefaultHandStateForItem('laserBlaster', 'left'),
    }),
    'Dual Laser Blaster',
  );
  assert.equal(
    formatHeldItemsSummary({
      right: createEmptyHandState(),
      left: createEmptyHandState(),
    }),
    'Empty Hands',
  );
});

test('Held item timeline evaluation (equipPop, swap, hide) and keyframe CRUD + JSON roundtrip', () => {
  const noob = CROSSROADS_SHOWDOWN_PROJECT.actors.find((a) => a.id === 'actor-noob')!;
  const atStart = evaluateActorItemsAt(noob, 0);
  assert.equal(atStart.right.itemId, 'bloxyCola');
  assert.equal(atStart.left.itemId, 'none');

  // At 5.5s Noob equips pizzaSlice in left hand via equipPop
  const atPopStart = evaluateActorItemsAt(noob, 5.52);
  assert.equal(atPopStart.left.itemId, 'pizzaSlice');
  assert.ok(atPopStart.left.visibilityScale < 1);
  const atSettled = evaluateActorItemsAt(noob, 6.0);
  assert.equal(atSettled.left.itemId, 'pizzaSlice');
  assert.equal(atSettled.left.visibilityScale, 1);

  // Upsert, move, and delete item keyframes
  let proj = upsertItemKeyframe(CROSSROADS_SHOWDOWN_PROJECT, 'actor-noob', {
    id: 'test-ikf-hide',
    time: 7.5,
    easing: 'step',
    right: createEmptyHandState(),
    left: createEmptyHandState(),
  });
  const afterHide = evaluateActorItemsAt(
    proj.actors.find((a) => a.id === 'actor-noob')!,
    7.6,
  );
  assert.equal(afterHide.right.itemId, 'none');
  assert.equal(afterHide.left.itemId, 'none');

  proj = moveItemKeyframeTime(proj, 'actor-noob', 'test-ikf-hide', 8.0);
  const movedKf = proj.actors
    .find((a) => a.id === 'actor-noob')!
    .heldItemKeyframes!.find((k) => k.id === 'test-ikf-hide')!;
  assert.equal(movedKf.time, 8.0);

  proj = deleteItemKeyframe(proj, 'actor-noob', 'test-ikf-hide');
  assert.equal(
    proj.actors
      .find((a) => a.id === 'actor-noob')!
      .heldItemKeyframes!.some((k) => k.id === 'test-ikf-hide'),
    false,
  );

  // Extended propKind + heldItem prop serialization & sanitization
  const withProps = {
    ...proj,
    actors: [
      ...proj.actors,
      {
        id: 'prop-chest-test',
        name: 'Treasure Chest 1',
        kind: 'prop' as const,
        propKind: 'chest' as const,
        primaryColor: '#8a5a36',
        accentColor: '#f5cd30',
        keyframes: [
          {
            id: 'pk-1',
            time: 0,
            position: [1, 0, 1] as [number, number, number],
            rotation: [0, 0, 0] as [number, number, number],
            scale: [1, 1, 1] as [number, number, number],
            clip: 'idle' as const,
            clipSpeed: 1,
            easing: 'linear' as const,
          },
        ],
      },
      {
        id: 'prop-item-test',
        name: 'Energy Blade Drop',
        kind: 'prop' as const,
        propKind: 'heldItem' as const,
        propItemId: 'energyBlade' as const,
        primaryColor: '#1b2a35',
        accentColor: '#22d3ee',
        keyframes: [
          {
            id: 'pk-2',
            time: 0,
            position: [-1, 0, 1] as [number, number, number],
            rotation: [0, 0, 0] as [number, number, number],
            scale: [1, 1, 1] as [number, number, number],
            clip: 'idle' as const,
            clipSpeed: 1,
            easing: 'linear' as const,
          },
        ],
      },
    ],
  };

  const parsed = parseProjectJson(serializeProject(withProps));
  const parsedChest = parsed.actors.find((a) => a.id === 'prop-chest-test')!;
  const parsedDrop = parsed.actors.find((a) => a.id === 'prop-item-test')!;
  assert.equal(parsedChest.propKind, 'chest');
  assert.equal(parsedDrop.propKind, 'heldItem');
  assert.equal(parsedDrop.propItemId, 'energyBlade');
  assert.equal(
    parsed.actors.find((a) => a.id === 'actor-knight')!.heldItemKeyframes!.length,
    2,
  );
});

test('Robloxian Town neighborhood map, Cozy Gamer Bedroom scene, and bedroom/town prop serialization', () => {
  const townMap = BUILT_IN_MAPS.find((m) => m.builtInSourceId === 'robloxianTown')!;
  const bedroomMap = BUILT_IN_MAPS.find((m) => m.builtInSourceId === 'cozyBedroom')!;
  assert.equal(townMap.category, 'town');
  assert.equal(townMap.baseplate.pathStyle, 'street');
  assert.equal(townMap.baseplate.perimeter, 'picketFence');
  assert.equal(bedroomMap.category, 'interior');
  assert.equal(bedroomMap.baseplate.pathStyle, 'hardwood');
  assert.equal(bedroomMap.baseplate.perimeter, 'bedroomCorner');

  // Verify Bedroom Skit scene evaluates cleanly and preserves item swaps + subtitles
  const parsedBedroom = parseProjectJson(serializeProject(BEDROOM_SKIT_PROJECT));
  assert.equal(parsedBedroom.environment, 'cozyBedroom');
  assert.equal(parsedBedroom.actors.length, 2);
  assert.equal(parsedBedroom.subtitles.length, 3);
  const evalBedFrame = evaluateProjectAt(parsedBedroom, 4.5);
  const gamerState = evalBedFrame.actors['actor-bedroom-gamer'];
  assert.ok(gamerState);
  assert.equal(gamerState.heldItems?.right.itemId, 'pizzaSlice');
  assert.equal(gamerState.heldItems?.left.itemId, 'bloxyCola');

  // Verify Robloxian Town scene preserves environment and actors
  const parsedTown = parseProjectJson(serializeProject(ROBLOXIAN_TOWN_PROJECT));
  assert.equal(parsedTown.environment, 'robloxianTown');
  assert.equal(parsedTown.actors.length, 3);

  // Verify new bedroom & town standalone PropKinds survive sanitization
  const withNewProps = {
    ...parsedBedroom,
    actors: [
      ...parsedBedroom.actors,
      {
        id: 'prop-bed-extra',
        name: 'Gamer Bed 1',
        kind: 'prop' as const,
        propKind: 'gamerBed' as const,
        primaryColor: '#1d4ed8',
        accentColor: '#38bdf8',
        keyframes: [
          {
            id: 'pb-0',
            time: 0,
            position: [0, 0, 0] as [number, number, number],
            rotation: [0, 0, 0] as [number, number, number],
            scale: [1, 1, 1] as [number, number, number],
            clip: 'idle' as const,
            clipSpeed: 1,
            easing: 'linear' as const,
          },
        ],
      },
      {
        id: 'prop-house-extra',
        name: 'Town House 1',
        kind: 'prop' as const,
        propKind: 'suburbanHouse' as const,
        primaryColor: '#e2e8f0',
        accentColor: '#b91c1c',
        keyframes: [
          {
            id: 'ph-0',
            time: 0,
            position: [4, 0, 0] as [number, number, number],
            rotation: [0, 0, 0] as [number, number, number],
            scale: [1, 1, 1] as [number, number, number],
            clip: 'idle' as const,
            clipSpeed: 1,
            easing: 'linear' as const,
          },
        ],
      },
    ],
  };
  const parsedWithProps = parseProjectJson(serializeProject(withNewProps));
  assert.equal(
    parsedWithProps.actors.find((a) => a.id === 'prop-bed-extra')?.propKind,
    'gamerBed',
  );
  assert.equal(
    parsedWithProps.actors.find((a) => a.id === 'prop-house-extra')?.propKind,
    'suburbanHouse',
  );
});

test('All preset cutscene camera shots frame characters with generous vertical breathing room', () => {
  for (const scene of BUILT_IN_SCENES) {
    for (const kf of scene.project.cameraTrack) {
      const frame = evaluateProjectAt(scene.project, kf.time);
      const dx = frame.camera.position[0] - frame.camera.target[0];
      const dy = frame.camera.position[1] - frame.camera.target[1];
      const dz = frame.camera.position[2] - frame.camera.target[2];
      const dist = Math.hypot(dx, dy, dz);
      const visibleHeight = 2 * dist * Math.tan(((frame.camera.fov / 2) * Math.PI) / 180);
      assert.ok(
        visibleHeight >= 5.5,
        `Shot ${kf.id} in ${scene.id} visibleHeight=${visibleHeight.toFixed(2)} is too zoomed in`,
      );
      assert.ok(
        frame.camera.fov >= 48,
        `Shot ${kf.id} in ${scene.id} fov=${frame.camera.fov} should be >= 48`,
      );
    }
  }
});

test('Long-scene duration bounds (up to 600s), chapters, mid-scene map switches, and JSON roundtrip', () => {
  assert.equal(MAX_SCENE_DURATION, 600);
  assert.equal(BRICKIA_CHRONICLES_LONG_PROJECT.duration, 240);
  assert.equal(BRICKIA_CHRONICLES_LONG_PROJECT.chapters?.length, 4);
  assert.equal(BRICKIA_CHRONICLES_LONG_PROJECT.mapTrack?.length, 4);

  // Evaluate all 4 acts across the 4-minute saga
  const act1 = evaluateProjectAt(BRICKIA_CHRONICLES_LONG_PROJECT, 10);
  const act2 = evaluateProjectAt(BRICKIA_CHRONICLES_LONG_PROJECT, 70);
  const act3 = evaluateProjectAt(BRICKIA_CHRONICLES_LONG_PROJECT, 140);
  const act4 = evaluateProjectAt(BRICKIA_CHRONICLES_LONG_PROJECT, 200);
  assert.equal(act1.stage.environment, 'cozyBedroom');
  assert.equal(act2.stage.environment, 'robloxianTown');
  assert.equal(act3.stage.environment, 'crossroads');
  assert.equal(act4.stage.environment, 'dojoCourtyard');

  // When lightingTrack is cleared, mid-scene map switch applies recommended atmosphere
  const noLightTrack = { ...BRICKIA_CHRONICLES_LONG_PROJECT, lightingTrack: [] };
  const stageAct4 = evaluateStageAt(noLightTrack, 200);
  const lightAct4 = evaluateLightingAt(noLightTrack, 200, stageAct4);
  assert.equal(stageAct4.lightingMood, 'sunset');
  assert.ok(lightAct4.sunAzimuth > 0);

  // Roundtrip preserves chapters, mapTrack, and clamps >600s safely to 600s
  const parsed = parseProjectJson(serializeProject(BRICKIA_CHRONICLES_LONG_PROJECT));
  assert.equal(parsed.duration, 240);
  assert.equal(parsed.chapters?.length, 4);
  assert.equal(parsed.mapTrack?.length, 4);

  const overMax = parseProjectJson(
    serializeProject({ ...BRICKIA_CHRONICLES_LONG_PROJECT, duration: 999 }),
  );
  assert.equal(overMax.duration, 600);
});

test('Chapter markers, map cue CRUD, and multi-track ripple shift work cleanly', () => {
  let proj = { ...BRICKIA_CHRONICLES_LONG_PROJECT };

  // Chapter CRUD + bounds + active lookup
  proj = upsertChapterMarker(proj, {
    id: 'ch-epilogue',
    time: 225,
    title: 'Epilogue',
    color: '#06b6d4',
  });
  assert.equal(proj.chapters?.length, 5);
  assert.equal(getChapterAtTime(proj.chapters, 230)?.id, 'ch-epilogue');
  const act2Bounds = getChapterBounds(proj.chapters, 'ch-act2', proj.duration)!;
  assert.equal(act2Bounds.startSec, 58);
  assert.equal(act2Bounds.endSec, 124);

  proj = moveChapterMarkerTime(proj, 'ch-epilogue', 228);
  assert.equal(proj.chapters?.find((c) => c.id === 'ch-epilogue')?.time, 228);
  proj = deleteChapterMarker(proj, 'ch-epilogue');
  assert.equal(proj.chapters?.length, 4);

  // Map keyframe CRUD
  proj = upsertMapKeyframe(proj, {
    id: 'mk-bonus',
    time: 230,
    environment: 'lunarOutpost',
    applyAtmosphere: true,
    label: 'Lunar Outpost',
  });
  assert.equal(evaluateStageAt(proj, 232).environment, 'lunarOutpost');
  proj = moveMapKeyframeTime(proj, 'mk-bonus', 235);
  assert.equal(proj.mapTrack?.find((m) => m.id === 'mk-bonus')?.time, 235);
  proj = deleteMapKeyframe(proj, 'mk-bonus');
  assert.equal(proj.mapTrack?.some((m) => m.id === 'mk-bonus'), false);

  // Ripple shift from t=58 by +10s shifts >=58s tracks and extends duration
  const rippled = rippleShiftProjectFrom(proj, 58, 10);
  assert.equal(rippled.duration, 250);
  assert.equal(rippled.chapters?.find((c) => c.id === 'ch-act1')?.time, 0);
  assert.equal(rippled.chapters?.find((c) => c.id === 'ch-act2')?.time, 68);
  assert.equal(rippled.mapTrack?.find((m) => m.id === 'mkf-act2')?.time, 68);
  assert.equal(rippled.mapTrack?.find((m) => m.id === 'mkf-act3')?.time, 134);
  assert.equal(
    rippled.cameraTrack.find((k) => k.id === 'lcam-0')?.time,
    0,
  );
  assert.equal(
    rippled.cameraTrack.find((k) => k.id === 'lcam-2')?.time,
    68,
  );
  // Base t=0 actor keyframe stays anchored even when rippling from t=0
  const rippledFromStart = rippleShiftProjectFrom(proj, 0, 5);
  assert.equal(rippledFromStart.actors[0].keyframes[0].time, 0);
});

test('Wardrobe catalogs, hat-tuck profiles, dual-color ornaments, and outfit presets are complete', () => {
  assert.ok(HAIR_STYLE_CATALOG.length >= 12);
  assert.ok(HAIR_STYLE_CATALOG.some((h) => h.id === 'longWavyPart'));
  assert.equal(HAIR_HIGHLIGHT_PATTERNS.length, 4);
  assert.ok(SHIRT_CATALOG.length >= 16);
  assert.ok(OUTERWEAR_CATALOG.length >= 10);
  assert.ok(PANT_CATALOG.length >= 13);
  assert.ok(FOOTWEAR_CATALOG.length >= 9);
  assert.equal(FABRIC_MATERIAL_OPTIONS.length, 8);
  assert.equal(CLOTHING_PATTERN_OPTIONS.length, 7);
  assert.equal(BELT_STYLE_OPTIONS.length, 5);
  assert.equal(OUTFIT_PRESETS.length, ROBLOX_AVATAR_BUNDLES.length);

  assert.equal(getHatTuckProfile('none'), 'none');
  assert.equal(getHatTuckProfile('cap'), 'brim');
  assert.equal(getHatTuckProfile('beanie'), 'crown');
  assert.equal(getHatTuckProfile('knightHelm'), 'fullCover');
  assert.equal(getHatTuckProfile('halo'), 'none');

  for (const slot of ORNAMENT_SLOTS) {
    for (const entry of ORNAMENT_CATALOG[slot]) {
      assert.ok(entry.defaultColor.startsWith('#'));
      assert.ok(entry.defaultAccentColor.startsWith('#'));
    }
  }
});

test('Hair framework, layered clothing, legacy spiky-hat migration, and hair secondary physics roundtrip cleanly', () => {
  // Legacy project where ornaments.hat.id === 'spiky' should migrate automatically to hair.styleId = 'spiky'
  const legacyProj = {
    ...CROSSROADS_SHOWDOWN_PROJECT,
    actors: [
      {
        ...CROSSROADS_SHOWDOWN_PROJECT.actors[0],
        hair: undefined,
        clothing: undefined,
        ornaments: {
          ...CROSSROADS_SHOWDOWN_PROJECT.actors[0].ornaments!,
          hat: { id: 'spiky', color: '#8f3622', accentColor: '#f59e0b' },
        },
      },
    ],
  };

  const resolvedLegacyHair = resolveActorHair(legacyProj.actors[0]);
  assert.equal(resolvedLegacyHair.styleId, 'spiky');
  assert.equal(resolvedLegacyHair.primaryColor, '#8f3622');

  const parsedLegacy = parseProjectJson(serializeProject(legacyProj));
  const migratedActor = parsedLegacy.actors[0];
  assert.equal(migratedActor.hair?.styleId, 'spiky');
  assert.equal(migratedActor.ornaments?.hat.id, 'none');

  // Custom hair (including longWavyPart + flowerAccessory), clothing, and dual-color ornaments survive JSON roundtrip
  const styledActor = {
    ...CROSSROADS_SHOWDOWN_PROJECT.actors[0],
    hair: {
      styleId: 'longWavyPart' as const,
      primaryColor: '#dfc099',
      highlightColor: '#f7e5cc',
      highlightPattern: 'ombre' as const,
      volume: 1.8, // should clamp to <= 1.25
      flowerAccessory: true,
    },
    clothing: {
      shirtId: 'turtleneck' as const,
      shirtColor: '#312e81',
      shirtAccent: '#38bdf8',
      sleeveMode: 'long' as const,
      topFabric: 'knit' as const,
      topPattern: 'argyle' as const,
      outerwearId: 'trenchCoat' as const,
      outerwearColor: '#c28b59',
      outerwearAccent: '#57371d',
      outerwearFabric: 'cotton' as const,
      outerwearOpen: true,
      pantsId: 'pleatedSkirt' as const,
      pantsColor: '#334155',
      pantsAccent: '#f59e0b',
      bottomFabric: 'satin' as const,
      bottomPattern: 'plaid' as const,
      beltStyle: 'chain' as const,
      footwearId: 'platformShoes' as const,
      shoeColor: '#0f172a',
      shoeAccent: '#e2e8f0',
    },
    ornaments: {
      ...CROSSROADS_SHOWDOWN_PROJECT.actors[0].ornaments!,
      hat: { id: 'beanie', color: '#c4281c', accentColor: '#f2f3f3' },
      back: { id: 'wings', color: '#f2f3f3', accentColor: '#38bdf8' },
    },
  };

  const parsedStyled = parseProjectJson(
    serializeProject({
      ...CROSSROADS_SHOWDOWN_PROJECT,
      actors: [styledActor],
    }),
  );
  const roundtrip = parsedStyled.actors[0];
  assert.equal(roundtrip.hair?.styleId, 'longWavyPart');
  assert.equal(roundtrip.hair?.flowerAccessory, true);
  assert.equal(roundtrip.hair?.highlightPattern, 'ombre');
  assert.equal(roundtrip.hair?.volume, 1.25);
  assert.equal(roundtrip.clothing?.shirtId, 'turtleneck');
  assert.equal(roundtrip.clothing?.topFabric, 'knit');
  assert.equal(roundtrip.clothing?.topPattern, 'argyle');
  assert.equal(roundtrip.clothing?.outerwearId, 'trenchCoat');
  assert.equal(roundtrip.clothing?.outerwearColor, '#c28b59');
  assert.equal(roundtrip.clothing?.outerwearOpen, true);
  assert.equal(roundtrip.clothing?.pantsId, 'pleatedSkirt');
  assert.equal(roundtrip.clothing?.bottomFabric, 'satin');
  assert.equal(roundtrip.clothing?.bottomPattern, 'plaid');
  assert.equal(roundtrip.clothing?.beltStyle, 'chain');
  assert.equal(roundtrip.clothing?.footwearId, 'platformShoes');
  assert.equal(roundtrip.clothing?.shoeColor, '#0f172a');
  assert.equal(roundtrip.clothing?.shoeAccent, '#e2e8f0');
  assert.equal(roundtrip.ornaments?.back.accentColor, '#38bdf8');
  assert.equal(resolveActorClothing(roundtrip).outerwearId, 'trenchCoat');
  assert.equal(resolveActorClothing(roundtrip).pantsId, 'pleatedSkirt');

  // Secondary motion includes deterministic hairPitch and hairRoll during motion and zeroes when disabled
  const knight = CROSSROADS_SHOWDOWN_PROJECT.actors[0];
  const movingMotion = evaluateActorAt(knight, 1.4, CROSSROADS_SHOWDOWN_PROJECT.subtitles);
  assert.ok(Math.abs(movingMotion.secondaryMotion.hairPitch) > 0.01);

  const staticMotion = evaluateActorAt(
    { ...knight, secondaryMotion: false },
    1.4,
    CROSSROADS_SHOWDOWN_PROJECT.subtitles,
  );
  assert.equal(staticMotion.secondaryMotion.hairPitch, 0);
  assert.equal(staticMotion.secondaryMotion.hairRoll, 0);
});

test('Cozy Gamer Bedroom uses 18x18 R6 proportions and BEDROOM_SKIT_PROJECT opens seated at the PC desk', () => {
  const bedroomMap = BUILT_IN_MAPS.find((m) => m.builtInSourceId === 'cozyBedroom')!;
  assert.equal(bedroomMap.baseplate.size, 18);

  const deskMod = bedroomMap.modules.find((m) => m.id === 'br_desk')!;
  const bedMod = bedroomMap.modules.find((m) => m.id === 'br_bed')!;
  assert.ok(deskMod && bedMod);
  assert.deepEqual(deskMod.position, [3.6, 0, -7.8]);
  assert.deepEqual(bedMod.position, [-6.9, 0, -5.6]);

  const t0 = evaluateProjectAt(BEDROOM_SKIT_PROJECT, 0);
  const alexT0 = t0.actors['actor-bedroom-gamer'];
  assert.ok(alexT0);
  assert.equal(alexT0.clip, 'sit');
  assert.ok(Math.abs(alexT0.position[0] - 3.38) < 0.01);
  assert.ok(Math.abs(alexT0.position[2] - -6.42) < 0.01);
});

test('The Idiom Town 90s episode features 7 scenes, distinct lighting moods, gaze tracking, voiceover/dialogue roles, SFX track, smash-cut blackout, and serialization roundtrip', () => {
  assert.equal(BUILT_IN_SCENES[0].id, 'scene_idiom_town');
  assert.equal(THE_IDIOM_TOWN_PROJECT.duration, 90);
  assert.equal(THE_IDIOM_TOWN_PROJECT.chapters?.length, 7);
  assert.equal(THE_IDIOM_TOWN_PROJECT.mapTrack?.length, 7);
  assert.ok((THE_IDIOM_TOWN_PROJECT.stageLights?.length ?? 0) >= 2);
  assert.ok((THE_IDIOM_TOWN_PROJECT.sfxTrack?.length ?? 0) >= 16);
  assert.ok(
    THE_IDIOM_TOWN_PROJECT.subtitles.some((s) => s.role === 'voiceover') &&
      THE_IDIOM_TOWN_PROJECT.subtitles.some((s) => s.role === 'dialogue'),
  );

  // Verify character gaze tracking & lookAtTarget wiring across cast
  const characterActors = THE_IDIOM_TOWN_PROJECT.actors.filter((a) => a.kind === 'character');
  assert.equal(characterActors.length, 18);
  for (const char of characterActors) {
    assert.ok(char.lookAtTarget && char.lookAtTarget !== 'none');
    assert.ok(char.faceConfig?.gazeTarget && char.faceConfig.gazeTarget !== 'manual');
  }

  // Spot-check Scene 1 stormy mood + grounded umbrellas -> crouch pickup -> equipped held steel umbrellas
  const s1Pre = evaluateProjectAt(THE_IDIOM_TOWN_PROJECT, 2.0);
  assert.equal(s1Pre.stage.lightingMood, 'overcast');
  assert.equal(s1Pre.actors['prop-umb-1'].scale[0], 1);
  assert.equal(s1Pre.actors['prop-umb-1'].position[1], 0);
  assert.equal(s1Pre.actors['prop-umb-2'].scale[0], 1);
  assert.equal(s1Pre.actors['idiom-man-umbrella'].heldItems?.right.itemId, 'none');

  const s1Bend = evaluateProjectAt(THE_IDIOM_TOWN_PROJECT, 4.7);
  assert.equal(s1Bend.stage.customMap?.id, 'idiom_map_s1_verbatim');
  assert.equal(s1Bend.actors['idiom-man-umbrella'].clip, 'crouch');
  assert.equal(s1Bend.actors['idiom-bystander'].clip, 'crouch');
  assert.equal(s1Bend.actors['prop-cats-dogs'].scale[0], 1);
  assert.equal(s1Bend.actors['prop-elephant'].scale[0], 0);
  assert.equal(s1Bend.screenBlackout, 0);

  const s1Raised = evaluateProjectAt(THE_IDIOM_TOWN_PROJECT, 6.0);
  assert.equal(s1Raised.actors['prop-umb-1'].scale[0], 0);
  assert.equal(s1Raised.actors['prop-umb-2'].scale[0], 0);
  assert.equal(s1Raised.actors['idiom-man-umbrella'].heldItems?.right.itemId, 'steelUmbrella');
  assert.equal(s1Raised.actors['idiom-man-umbrella'].heldItems?.right.visibilityScale, 1);
  assert.equal(s1Raised.actors['idiom-bystander'].heldItems?.right.itemId, 'steelUmbrella');

  // Spot-check Scene 2 cozy sunset cafe & bean spill spacing
  const s2 = evaluateProjectAt(THE_IDIOM_TOWN_PROJECT, 20.5);
  assert.equal(s2.stage.customMap?.id, 'idiom_map_s2_cafe');
  assert.equal(s2.stage.lightingMood, 'sunset');
  assert.ok(s2.actors['prop-beans'].scale[0] > 1);
  assert.equal(s2.actors['idiom-barista'].face.preset, 'angry');

  // Spot-check Scene 3 boardroom noon skylight & elephant trumpet reaction
  const s3 = evaluateProjectAt(THE_IDIOM_TOWN_PROJECT, 31);
  assert.equal(s3.stage.customMap?.id, 'idiom_map_s3_boardroom');
  assert.equal(s3.stage.lightingMood, 'noon');
  assert.equal(s3.actors['prop-elephant'].scale[0], 1.05);
  assert.equal(s3.actors['prop-cats-dogs'].scale[0], 0);
  assert.equal(s3.subtitle?.role, 'voiceover');

  // Spot-check Scene 4 wedding icy freeze lighting shift
  const s4 = evaluateProjectAt(THE_IDIOM_TOWN_PROJECT, 42.0);
  assert.equal(s4.stage.customMap?.id, 'idiom_map_s4_wedding');
  assert.equal(s4.lighting.keyColor, '#38bdf8');
  assert.ok(s4.actors['prop-ice-feet'].scale[0] > 1);

  // Spot-check Scene 5 midnight theater spotlight & zero overlap between stagehand, actor, and stretcher
  const s5 = evaluateProjectAt(THE_IDIOM_TOWN_PROJECT, 60.5);
  assert.equal(s5.stage.customMap?.id, 'idiom_map_s5_theater');
  assert.equal(s5.stage.lightingMood, 'midnight');
  assert.ok(
    Math.hypot(
      s5.actors['idiom-stagehand'].position[0] - s5.actors['prop-stretcher'].position[0],
      s5.actors['idiom-stagehand'].position[2] - s5.actors['prop-stretcher'].position[2],
    ) > 2.5,
  );

  // Spot-check Scene 6 retro diner sunset mood & zero overlap between waitress and horse platter
  const s6 = evaluateProjectAt(THE_IDIOM_TOWN_PROJECT, 74);
  assert.equal(s6.stage.customMap?.id, 'idiom_map_s6_diner');
  assert.equal(s6.stage.lightingMood, 'sunset');
  assert.equal(s6.actors['prop-horse-platter'].scale[0], 1);
  assert.ok(
    Math.hypot(
      s6.actors['idiom-waitress'].position[0] - s6.actors['prop-horse-platter'].position[0],
      s6.actors['idiom-waitress'].position[2] - s6.actors['prop-horse-platter'].position[2],
    ) > 1.8,
  );

  const smashPre = evaluateProjectAt(THE_IDIOM_TOWN_PROJECT, 86.2);
  assert.equal(smashPre.screenBlackout, 0);
  const smashBlack = evaluateProjectAt(THE_IDIOM_TOWN_PROJECT, 88.0);
  assert.equal(smashBlack.screenBlackout, 1);
  assert.equal(smashBlack.subtitle?.role, 'voiceover');

  // Roundtrip JSON & ripple shift preserve sfxTrack, screenEffects, and subtitle roles
  const parsed = parseProjectJson(serializeProject(THE_IDIOM_TOWN_PROJECT));
  assert.equal(parsed.duration, 90);
  assert.equal(parsed.sfxTrack?.length, THE_IDIOM_TOWN_PROJECT.sfxTrack?.length);
  assert.equal(parsed.screenEffects?.length, THE_IDIOM_TOWN_PROJECT.screenEffects?.length);
  assert.equal(parsed.subtitles.find((s) => s.id === 'sub-1b')?.role, 'voiceover');

  const shifted = rippleShiftProjectFrom(parsed, 50, 5);
  assert.equal(shifted.duration, 95);
  assert.equal(
    shifted.sfxTrack?.find((s) => s.id === 'sfx-7-smash')?.time,
    91.5,
  );
  assert.equal(
    shifted.screenEffects?.find((e) => e.id === 'se-cut')?.time,
    91.5,
  );
});

test('Reworked accessory framework supports 9 slots, per-slot Fit Tuning clamping/roundtrip, quick combos, and 30 handheld items', () => {
  assert.equal(ORNAMENT_SLOTS.length, 9);
  assert.ok(ORNAMENT_CATALOG.head.length >= 15);
  assert.ok(ORNAMENT_CATALOG.hat.length >= 19);
  assert.ok(ORNAMENT_CATALOG.neck.length >= 9);
  assert.ok(ORNAMENT_CATALOG.shoulder.length >= 8);
  assert.ok(ORNAMENT_CATALOG.waist.length >= 8);
  assert.ok(ORNAMENT_CATALOG.back.length >= 13);
  assert.ok(ORNAMENT_CATALOG.arm.length >= 8);
  assert.ok(ORNAMENT_CATALOG.legs.length >= 8);
  assert.ok(ACCESSORY_COMBOS.length >= 6);

  // Everyday & modern handheld items and expanded dual-wield combos
  assert.ok(ITEM_CATEGORIES.includes('everyday'));
  assert.ok(BUILT_IN_ITEMS.length >= 30);
  assert.ok(BUILT_IN_ITEMS.some((i) => i.id === 'smartphone' && i.category === 'everyday'));
  assert.ok(BUILT_IN_ITEMS.some((i) => i.id === 'icedCoffee' && i.category === 'everyday'));
  assert.ok(BUILT_IN_ITEMS.some((i) => i.id === 'dragonKatana' && i.category === 'scifiFantasy'));
  assert.ok(BUILT_IN_ITEMS.some((i) => i.id === 'crystalWand' && i.category === 'scifiFantasy'));
  assert.ok(DUAL_WIELD_COMBOS.length >= 9);

  // Backward compatibility: legacy 6-slot actor resolves with empty neck/shoulder/waist defaults
  const legacyActor = CROSSROADS_SHOWDOWN_PROJECT.actors[0];
  const resolved = resolveActorOrnaments(legacyActor);
  assert.equal(resolved.neck.id, 'none');
  assert.equal(resolved.shoulder.id, 'none');
  assert.equal(resolved.waist.id, 'none');

  // Fit clamping bounds check
  const clamped = normalizeAccessoryFit({
    offsetY: 2.5,
    offsetZ: -3.0,
    tiltX: 90,
    tiltZ: -90,
    scale: 4.0,
  });
  assert.equal(clamped.offsetY, 0.35);
  assert.equal(clamped.offsetZ, -0.3);
  assert.equal(clamped.tiltX, 30);
  assert.equal(clamped.tiltZ, -30);
  assert.equal(clamped.scale, 1.35);

  // Full JSON roundtrip for new Neck, Shoulder, Waist slots + custom Fit Tuning
  const gearedActor = {
    ...legacyActor,
    ornaments: {
      ...resolved,
      head: {
        id: 'roundGlasses',
        color: '#f5cd30',
        accentColor: '#38bdf8',
        fit: { offsetY: 0.08, offsetZ: 0.04, tiltX: -6, tiltZ: 4, scale: 1.1 },
      },
      neck: { id: 'knitScarf', color: '#dc2626', accentColor: '#f8fafc' },
      shoulder: {
        id: 'shoulderCat',
        color: '#fb923c',
        accentColor: '#f472b6',
        fit: { offsetY: 0.5, scale: 0.2 }, // clamps to 0.35 and 0.75
      },
      waist: { id: 'crossbodySling', color: '#1e293b', accentColor: '#38bdf8' },
    },
  };

  const parsed = parseProjectJson(
    serializeProject({
      ...CROSSROADS_SHOWDOWN_PROJECT,
      actors: [gearedActor],
    }),
  );
  const rt = parsed.actors[0].ornaments!;
  assert.equal(rt.head.id, 'roundGlasses');
  assert.equal(rt.head.fit?.offsetY, 0.08);
  assert.equal(rt.head.fit?.tiltX, -6);
  assert.equal(rt.head.fit?.scale, 1.1);
  assert.equal(rt.neck?.id, 'knitScarf');
  assert.equal(rt.shoulder?.id, 'shoulderCat');
  assert.equal(rt.shoulder?.fit?.offsetY, 0.35);
  assert.equal(rt.shoulder?.fit?.scale, 0.75);
  assert.equal(rt.waist?.id, 'crossbodySling');
});

test('Roblox City big map, Roblox City Showcase scene, and Idiom Town city-skyline/camera/cast overhaul', () => {
  const cityMap = BUILT_IN_MAPS.find((m) => m.id === 'map_roblox_city');
  assert.ok(cityMap, 'Expected map_roblox_city in BUILT_IN_MAPS');
  assert.equal(cityMap.builtInSourceId, 'robloxCity');
  assert.equal(cityMap.baseplate.size, 88);
  assert.equal(cityMap.baseplate.pathStyle, 'cityGrid');
  assert.equal(cityMap.baseplate.perimeter, 'citySkyline');
  assert.ok(cityMap.modules.length >= 24);
  assert.ok(cityMap.modules.some((m) => m.kind === 'glassSkyscraper'));
  assert.ok(cityMap.modules.some((m) => m.kind === 'brickTower'));
  assert.ok(cityMap.modules.some((m) => m.kind === 'trafficSignal'));
  assert.ok(cityMap.modules.some((m) => m.kind === 'subwayEntrance'));
  assert.ok(cityMap.modules.some((m) => m.kind === 'billboardGantry'));
  assert.ok(cityMap.modules.some((m) => m.kind === 'cityBusStop'));

  // Roundtrip serialization preserves cityGrid, citySkyline, and large 88-stud footprint
  const cityRoundtrip = parseMapLibraryJson(serializeSingleMap(cityMap))[0];
  assert.equal(cityRoundtrip.baseplate.size, 88);
  assert.equal(cityRoundtrip.baseplate.pathStyle, 'cityGrid');
  assert.equal(cityRoundtrip.baseplate.perimeter, 'citySkyline');
  assert.equal(cityRoundtrip.modules.length, cityMap.modules.length);

  // Roblox City Showcase scene registered in BUILT_IN_SCENES and evaluates cleanly
  const showcaseEntry = BUILT_IN_SCENES.find((s) => s.id === 'scene_roblox_city_showcase');
  assert.ok(showcaseEntry, 'Expected scene_roblox_city_showcase in BUILT_IN_SCENES');
  assert.equal(ROBLOX_CITY_SHOWCASE_PROJECT.environment, 'robloxCity');
  assert.ok(ROBLOX_CITY_SHOWCASE_PROJECT.cameraTrack.length >= 6);
  const rcMid = evaluateProjectAt(ROBLOX_CITY_SHOWCASE_PROJECT, 9.0);
  assert.ok(rcMid.actors['actor-city-maya']);
  assert.ok(rcMid.actors['prop-city-taxi']);
  assert.ok(rcMid.actors['prop-city-bus']);
  assert.ok(Math.abs(rcMid.actors['prop-city-bus'].position[2] - 10.6) < 0.05);

  const rcParsed = parseProjectJson(serializeProject(ROBLOX_CITY_SHOWCASE_PROJECT));
  assert.equal(rcParsed.environment, 'robloxCity');
  assert.equal(rcParsed.actors.length, ROBLOX_CITY_SHOWCASE_PROJECT.actors.length);

  // Upgraded Idiom Town episode: expanded city-skyline outdoor maps, upgraded cameras, & modern cast wardrobe
  assert.ok(THE_IDIOM_TOWN_PROJECT.cameraTrack.length >= 25);
  const s1Map = THE_IDIOM_TOWN_PROJECT.mapTrack?.[0]?.customMap;
  const s7Map = THE_IDIOM_TOWN_PROJECT.mapTrack?.[6]?.customMap;
  assert.equal(s1Map?.baseplate.perimeter, 'citySkyline');
  assert.equal(s7Map?.baseplate.perimeter, 'citySkyline');
  assert.ok((s1Map?.baseplate.size ?? 0) >= 44);
  assert.ok((s7Map?.baseplate.size ?? 0) >= 44);
  const characterActors = THE_IDIOM_TOWN_PROJECT.actors.filter((a) => a.kind === 'character');
  assert.ok(characterActors.some((a) => a.clothing?.outerwearId && a.clothing.outerwearId !== 'none'));
  assert.ok(characterActors.some((a) => a.ornaments?.neck && a.ornaments.neck.id !== 'none'));

  // Hybrid 3P <-> 1P cinematic switching: Scene 1 stays pure 3P; Scenes 2-7 open in 3P, punch into 1P POV on gag beats, then cut back to 3P wide aftermath
  assert.equal(evaluateProjectAt(THE_IDIOM_TOWN_PROJECT, 0.5).camera.povActorId, null);
  assert.equal(evaluateProjectAt(THE_IDIOM_TOWN_PROJECT, 5.5).camera.povActorId, null);
  // 3P establishing shots
  assert.equal(evaluateProjectAt(THE_IDIOM_TOWN_PROJECT, 12.5).camera.povActorId, null);
  assert.equal(evaluateProjectAt(THE_IDIOM_TOWN_PROJECT, 26.0).camera.povActorId, null);
  assert.equal(evaluateProjectAt(THE_IDIOM_TOWN_PROJECT, 39.0).camera.povActorId, null);
  assert.equal(evaluateProjectAt(THE_IDIOM_TOWN_PROJECT, 52.0).camera.povActorId, null);
  assert.equal(evaluateProjectAt(THE_IDIOM_TOWN_PROJECT, 65.5).camera.povActorId, null);
  assert.equal(evaluateProjectAt(THE_IDIOM_TOWN_PROJECT, 78.0).camera.povActorId, null);
  // 1P POV gag/reaction beats
  assert.equal(evaluateProjectAt(THE_IDIOM_TOWN_PROJECT, 14.0).camera.povActorId, 'idiom-listener');
  assert.equal(evaluateProjectAt(THE_IDIOM_TOWN_PROJECT, 30.6).camera.povActorId, 'idiom-exec-3');
  assert.equal(evaluateProjectAt(THE_IDIOM_TOWN_PROJECT, 42.2).camera.povActorId, 'idiom-groom');
  assert.equal(evaluateProjectAt(THE_IDIOM_TOWN_PROJECT, 56.0).camera.povActorId, 'idiom-shakespeare');
  assert.equal(evaluateProjectAt(THE_IDIOM_TOWN_PROJECT, 70.0).camera.povActorId, 'idiom-tourist');
  assert.equal(evaluateProjectAt(THE_IDIOM_TOWN_PROJECT, 80.0).camera.povActorId, 'idiom-tourist');
  // 3P wide aftermath returns
  assert.equal(evaluateProjectAt(THE_IDIOM_TOWN_PROJECT, 19.5).camera.povActorId, null);
  assert.equal(evaluateProjectAt(THE_IDIOM_TOWN_PROJECT, 34.5).camera.povActorId, null);
  assert.equal(evaluateProjectAt(THE_IDIOM_TOWN_PROJECT, 45.5).camera.povActorId, null);
  assert.equal(evaluateProjectAt(THE_IDIOM_TOWN_PROJECT, 59.0).camera.povActorId, null);
  assert.equal(evaluateProjectAt(THE_IDIOM_TOWN_PROJECT, 74.5).camera.povActorId, null);
  assert.equal(evaluateProjectAt(THE_IDIOM_TOWN_PROJECT, 83.8).camera.povActorId, null);

  // Late-entering characters & ambulance MUST stay completely hidden (scale === 0) until their entrance cues
  assert.equal(evaluateProjectAt(THE_IDIOM_TOWN_PROJECT, 14.5).actors['idiom-barista'].scale[0], 0);
  assert.equal(evaluateProjectAt(THE_IDIOM_TOWN_PROJECT, 41.0).actors['idiom-groomsman'].scale[0], 0);
  assert.equal(evaluateProjectAt(THE_IDIOM_TOWN_PROJECT, 54.0).actors['prop-ambulance'].scale[0], 0);
  assert.equal(evaluateProjectAt(THE_IDIOM_TOWN_PROJECT, 54.0).actors['idiom-paramedic'].scale[0], 0);
  assert.equal(evaluateProjectAt(THE_IDIOM_TOWN_PROJECT, 56.8).actors['idiom-paramedic'].scale[0], 0);
  assert.equal(evaluateProjectAt(THE_IDIOM_TOWN_PROJECT, 67.5).actors['idiom-chef'].scale[0], 0);
  assert.equal(evaluateProjectAt(THE_IDIOM_TOWN_PROJECT, 67.5).actors['prop-horse-platter'].scale[0], 0);

  // Scene 5 (Break a Leg): 1P leg-down cast snap + 3P wide backstage hero shot with docked 3D Ambulance
  assert.ok(BUILT_IN_PROPS.some((p) => p.kind === 'ambulance'));
  const s5CastPov = evaluateProjectAt(THE_IDIOM_TOWN_PROJECT, 56.0);
  assert.equal(s5CastPov.camera.povActorId, 'idiom-shakespeare');
  assert.ok(s5CastPov.camera.target[1] < 0, 'Expected Scene 5 leg POV at 56.0s to pitch down toward the actor legs and cast');
  assert.ok(s5CastPov.actors['prop-plaster-cast'].scale[0] > 1);
  const s5WideShot = evaluateProjectAt(THE_IDIOM_TOWN_PROJECT, 58.5);
  assert.equal(s5WideShot.camera.povActorId, null);
  assert.ok(s5WideShot.actors['prop-ambulance'].scale[0] > 0.9);
  assert.ok(s5WideShot.actors['prop-ambulance'].position[2] > -6.5, 'Expected ambulance to pull up at open backstage loading dock');

  // Scene 7 (Blow My Mind): Pedestrians start strictly on the raised North Sidewalk (z in [-2.1, -0.25]), clear of asphalt lanes
  const s7Start = evaluateProjectAt(THE_IDIOM_TOWN_PROJECT, 79.8);
  assert.equal(s7Start.camera.povActorId, 'idiom-tourist');
  for (const id of ['idiom-tourist', 'idiom-bystander', 'idiom-man-umbrella']) {
    const pos = s7Start.actors[id].position;
    assert.ok(pos[2] <= -0.25 && pos[2] >= -2.1, `Expected ${id} on raised north sidewalk in Scene 7, got z=${pos[2]}`);
  }
  const s7Panic = evaluateProjectAt(THE_IDIOM_TOWN_PROJECT, 83.2);
  assert.equal(s7Panic.camera.povActorId, null);
  assert.ok(s7Panic.actors['prop-flying-pigs'].position[0] > 1.5);
  assert.ok(s7Panic.actors['prop-tour-bus'].position[0] > 4.0);
  assert.ok(s7Panic.actors['prop-sedan'].position[0] > 2.5);
  assert.ok(s7Panic.actors['prop-groceries'].scale[0] > 1.0);

  // Full-episode 0.25s sweep: zero exit-shrink glitches, strict furniture clearance, and unobstructed 3P camera sightlines
  const charIds = new Set(characterActors.map((a) => a.id));
  for (let t = 0; t <= 89.5; t += 0.25) {
    const f = evaluateProjectAt(THE_IDIOM_TOWN_PROJECT, Number(t.toFixed(2)));
    for (const id of charIds) {
      const a = f.actors[id];
      const s = a.scale[0];
      assert.ok(s === 0 || s >= 0.9, `Unexpected mid-scene shrink on ${id} at t=${t}s (scale=${s})`);
      if (s === 0) continue;
      // Scene 2: Barista never clips espresso counter (x=[0.1..5.1], z=[-2.3..-0.9])
      if (id === 'idiom-barista' && t >= 12 && t < 25) {
        const inCounter = a.position[0] >= 0.1 && a.position[0] <= 5.1 && a.position[2] >= -2.3 && a.position[2] <= -0.9;
        assert.equal(inCounter, false, `Barista clipped espresso counter at t=${t}s: ${JSON.stringify(a.position)}`);
      }
      // Scene 6: Waitress never clips diner booth table (x=[-3.12..-1.78], z=[-0.25..1.85])
      if (id === 'idiom-waitress' && t >= 64 && t < 77) {
        const inTable = a.position[0] >= -3.12 && a.position[0] <= -1.78 && a.position[2] >= -0.25 && a.position[2] <= 1.85;
        assert.equal(inTable, false, `Waitress clipped diner table at t=${t}s: ${JSON.stringify(a.position)}`);
      }
    }
    // Verify no visible character directly blocks the camera lens on 3P shots (closer than 2.0 units to the camera ray in front of target)
    if (f.camera.povActorId === null) {
      const cx = f.camera.position[0];
      const cy = f.camera.position[1];
      const cz = f.camera.position[2];
      const dx = f.camera.target[0] - cx;
      const dy = f.camera.target[1] - cy;
      const dz = f.camera.target[2] - cz;
      const rayLen = Math.hypot(dx, dy, dz);
      if (rayLen > 1) {
        for (const id of charIds) {
          const a = f.actors[id];
          if (a.scale[0] < 0.5) continue;
          const ax = a.position[0] - cx;
          const ay = a.position[1] + 1.3 - cy;
          const az = a.position[2] - cz;
          const proj = (ax * dx + ay * dy + az * dz) / rayLen;
          if (proj > 0.2 && proj < rayLen * 0.65) {
            const perp = Math.hypot(ax - (dx / rayLen) * proj, ay - (dy / rayLen) * proj, az - (dz / rayLen) * proj);
            assert.ok(perp > 0.55, `Character ${id} blocks 3P camera sightline at t=${t}s (proj=${proj.toFixed(2)}, perp=${perp.toFixed(2)})`);
          }
        }
      }
    }
  }
});

test('Character State Framework evaluates all 5 FX states deterministically, supports timeline CRUD/ripple/JSON roundtrip, and triggers across The Idiom Town', () => {
  // Catalog completeness: normal + 5 distinct visual states
  assert.deepEqual(
    CHARACTER_STATE_CATALOG.map((s) => s.id),
    ['normal', 'brokenLeg', 'mindBlown', 'frozenFeet', 'dizzy', 'steamingMad'],
  );

  // Pure deterministic evaluation + elapsedSec tracking
  const knight = CROSSROADS_SHOWDOWN_PROJECT.actors[0];
  let proj = upsertCharacterStateKeyframe(CROSSROADS_SHOWDOWN_PROJECT, knight.id, {
    id: 'skf-broken',
    time: 2.0,
    stateId: 'brokenLeg',
    intensity: 1.2,
    targetLimb: 'leftLeg',
    seed: 17,
  });
  proj = upsertCharacterStateKeyframe(proj, knight.id, {
    id: 'skf-mind',
    time: 5.0,
    stateId: 'mindBlown',
    intensity: 1.35,
    seed: 99,
  });
  proj = upsertCharacterStateKeyframe(proj, knight.id, {
    id: 'skf-reset',
    time: 7.5,
    stateId: 'normal',
    intensity: 1,
  });

  const actor = proj.actors.find((a) => a.id === knight.id)!;
  const beforeCue = evaluateCharacterStateAt(actor.stateKeyframes, 1.2);
  assert.equal(beforeCue.stateId, 'normal');
  assert.equal(beforeCue.elapsedSec, 0);

  const duringBreak = evaluateCharacterStateAt(actor.stateKeyframes, 3.25);
  assert.equal(duringBreak.stateId, 'brokenLeg');
  assert.equal(duringBreak.targetLimb, 'leftLeg');
  assert.equal(duringBreak.intensity, 1.2);
  assert.equal(duringBreak.seed, 17);
  assert.ok(Math.abs(duringBreak.elapsedSec - 1.25) < 1e-6);

  const duringMind = evaluateCharacterStateAt(actor.stateKeyframes, 5.4);
  assert.equal(duringMind.stateId, 'mindBlown');
  assert.equal(duringMind.seed, 99);
  assert.ok(Math.abs(duringMind.elapsedSec - 0.4) < 1e-6);

  const afterReset = evaluateCharacterStateAt(actor.stateKeyframes, 8.0);
  assert.equal(afterReset.stateId, 'normal');

  // Move, ripple shift, JSON roundtrip (with intensity clamping), and delete
  proj = moveCharacterStateKeyframeTime(proj, knight.id, 'skf-mind', 5.5);
  assert.equal(
    proj.actors.find((a) => a.id === knight.id)?.stateKeyframes?.find((k) => k.id === 'skf-mind')?.time,
    5.5,
  );

  const rippled = rippleShiftProjectFrom(proj, 5.0, 2.0);
  const rippledActor = rippled.actors.find((a) => a.id === knight.id)!;
  assert.equal(rippledActor.stateKeyframes?.find((k) => k.id === 'skf-broken')?.time, 2.0);
  assert.equal(rippledActor.stateKeyframes?.find((k) => k.id === 'skf-mind')?.time, 7.5);
  assert.equal(rippledActor.stateKeyframes?.find((k) => k.id === 'skf-reset')?.time, 9.5);

  const clampedProj = upsertCharacterStateKeyframe(proj, knight.id, {
    id: 'skf-mind',
    time: 5.5,
    stateId: 'mindBlown',
    intensity: 9.9, // should clamp to 1.5
    seed: 99,
  });
  const parsed = parseProjectJson(serializeProject(clampedProj));
  const parsedStateKfs = parsed.actors.find((a) => a.id === knight.id)?.stateKeyframes ?? [];
  assert.equal(parsedStateKfs.length, 3);
  assert.equal(parsedStateKfs.find((k) => k.id === 'skf-broken')?.targetLimb, 'leftLeg');
  assert.equal(parsedStateKfs.find((k) => k.id === 'skf-mind')?.intensity, 1.5);

  const afterDel = deleteCharacterStateKeyframe(proj, knight.id, 'skf-mind');
  assert.equal(
    afterDel.actors.find((a) => a.id === knight.id)?.stateKeyframes?.some((k) => k.id === 'skf-mind'),
    false,
  );

  // Verify live Idiom Town choreography triggers all 5 states cleanly on their story beats
  const s2Frame = evaluateProjectAt(THE_IDIOM_TOWN_PROJECT, 20.0);
  assert.equal(s2Frame.actors['idiom-barista'].characterState?.stateId, 'steamingMad');

  const s3Frame = evaluateProjectAt(THE_IDIOM_TOWN_PROJECT, 34.5);
  assert.equal(s3Frame.actors['idiom-exec-1'].characterState?.stateId, 'dizzy');

  const s4Frozen = evaluateProjectAt(THE_IDIOM_TOWN_PROJECT, 42.2);
  assert.equal(s4Frozen.actors['idiom-groom'].characterState?.stateId, 'frozenFeet');
  const s4Thawed = evaluateProjectAt(THE_IDIOM_TOWN_PROJECT, 49.5);
  assert.equal(s4Thawed.actors['idiom-groom'].characterState?.stateId, 'normal');

  const s5BreakPov = evaluateProjectAt(THE_IDIOM_TOWN_PROJECT, 56.0);
  assert.equal(s5BreakPov.actors['idiom-shakespeare'].characterState?.stateId, 'brokenLeg');
  assert.equal(s5BreakPov.actors['idiom-shakespeare'].characterState?.targetLimb, 'rightLeg');
  const s5BreakWide = evaluateProjectAt(THE_IDIOM_TOWN_PROJECT, 58.5);
  assert.equal(s5BreakWide.actors['idiom-shakespeare'].characterState?.stateId, 'brokenLeg');

  const s7Blow = evaluateProjectAt(THE_IDIOM_TOWN_PROJECT, 85.8);
  assert.equal(s7Blow.actors['idiom-tourist'].characterState?.stateId, 'mindBlown');
  assert.ok(
    (s7Blow.actors['idiom-tourist'].characterState?.elapsedSec ?? 0) > 0.2,
    'Expected Tourist mindBlown explosion to be mid-burst at 85.8s before the 86.5s smash cut',
  );
  assert.equal(s7Blow.screenBlackout, 0);
});

test('Multi-format video exporter supports MP4/WebM/MOV/MKV, 16:9/9:16/1:1 aspect ratios, cross-format MediaRecorder rescue, and SFX cue counting', () => {
  // Format catalog covers all 4 containers
  assert.deepEqual(Object.keys(VIDEO_FORMAT_CATALOG), ['mp4', 'webm', 'mov', 'mkv']);
  assert.equal(VIDEO_FORMAT_CATALOG.mp4.mimeType, 'video/mp4');
  assert.equal(VIDEO_FORMAT_CATALOG.webm.mimeType, 'video/webm');
  assert.equal(VIDEO_FORMAT_CATALOG.mov.mimeType, 'video/quicktime');
  assert.equal(VIDEO_FORMAT_CATALOG.mkv.mimeType, 'video/x-matroska');

  // Aspect ratio dimension math + 16px macroblock alignment
  const fakeCanvas = { clientWidth: 1003, clientHeight: 571, width: 1003, height: 571 } as HTMLCanvasElement;
  assert.deepEqual(resolveExportDimensions(fakeCanvas, '720p', '16:9'), { width: 1280, height: 720 });
  assert.deepEqual(resolveExportDimensions(fakeCanvas, '720p', '9:16'), { width: 720, height: 1280 });
  assert.deepEqual(resolveExportDimensions(fakeCanvas, '720p', '1:1'), { width: 720, height: 720 });
  assert.deepEqual(resolveExportDimensions(fakeCanvas, '1080p', '9:16'), { width: 1080, height: 1920 });
  assert.deepEqual(resolveExportDimensions(fakeCanvas, '1080p', '1:1'), { width: 1080, height: 1080 });

  const nativeVertical = resolveExportDimensions(fakeCanvas, 'native', '9:16');
  assert.equal(nativeVertical.width % 16, 0);
  assert.equal(nativeVertical.height % 16, 0);
  assert.ok(nativeVertical.height > nativeVertical.width);

  // Portrait & square vertical FOV safety keeps horizontal scene framing intact
  assert.equal(computeVerticalFovForAspect(50, '16:9'), 50);
  assert.ok(computeVerticalFovForAspect(50, '1:1') > 50);
  assert.ok(computeVerticalFovForAspect(50, '9:16') > computeVerticalFovForAspect(50, '1:1'));

  // Multi-format MediaRecorder picker + automatic cross-format WebM rescue
  const prevMR = (globalThis as Record<string, unknown>).MediaRecorder;
  try {
    // Browser supporting ONLY WebM VP9+Opus
    (globalThis as Record<string, unknown>).MediaRecorder = {
      isTypeSupported: (mime: string) => mime === 'video/webm;codecs=vp9,opus' || mime === 'video/webm;codecs=vp9',
    };
    const directWebm = pickMediaRecorderMimeType('webm', true, false);
    assert.ok(directWebm);
    assert.equal(directWebm.actualFormat, 'webm');
    assert.equal(directWebm.fallbackUsed, false);
    assert.equal(directWebm.videoCodec, 'VP9');
    assert.equal(directWebm.audioCodec, 'Opus');

    // Requesting MP4 or MOV without rescue returns null; with rescue automatically falls back to WebM
    assert.equal(pickMediaRecorderMimeType('mp4', true, false), null);
    const rescuedMp4 = pickMediaRecorderMimeType('mp4', true, true);
    assert.ok(rescuedMp4);
    assert.equal(rescuedMp4.actualFormat, 'webm');
    assert.equal(rescuedMp4.fallbackUsed, true);

    const rescuedMov = pickMediaRecorderMimeType('mov', false, true);
    assert.ok(rescuedMov);
    assert.equal(rescuedMov.actualFormat, 'webm');
    assert.equal(rescuedMov.fallbackUsed, true);
  } finally {
    if (prevMR === undefined) {
      delete (globalThis as Record<string, unknown>).MediaRecorder;
    } else {
      (globalThis as Record<string, unknown>).MediaRecorder = prevMR;
    }
  }

  // Offline SFX cue counting matches Idiom Town full episode & single-scene chapter ranges
  const fullSfx = countSfxCuesInRange(THE_IDIOM_TOWN_PROJECT, 0, THE_IDIOM_TOWN_PROJECT.duration);
  const scene5Sfx = countSfxCuesInRange(THE_IDIOM_TOWN_PROJECT, 51, 64);
  assert.ok(fullSfx >= 16, `Expected >= 16 SFX cues across Idiom Town, got ${fullSfx}`);
  assert.ok(scene5Sfx >= 2, `Expected >= 2 SFX cues in Scene 5, got ${scene5Sfx}`);
  assert.equal(countSfxCuesInRange(CROSSROADS_SHOWDOWN_PROJECT, 0, 10), 0);
});

test('Character Model Build & Action Function framework enforces exact foot grounding, evaluates all 5 actions + face sync, supports timeline CRUD/ripple/JSON roundtrip, and triggers in Idiom Town Scene 2', () => {
  // 4 body build presets with exact foot grounding (foot bottom Y === 0.000)
  assert.deepEqual(
    CHARACTER_MODEL_BUILD_CATALOG.map((b) => b.id),
    ['classic', 'tall', 'chibi', 'chunky'],
  );
  const stud = 0.56;
  for (const build of CHARACTER_MODEL_BUILD_CATALOG) {
    const layout = computeBuildRigLayout(build.id, stud);
    const footBottomY = layout.torsoBaseY + layout.legOffsetY - 2 * stud * layout.spec.legScale[1];
    assert.ok(
      Math.abs(footBottomY) < 1e-9,
      `Expected exact foot grounding (0.0) for build ${build.id}, got ${footBottomY}`,
    );
    assert.ok(layout.headPivotY > 0);
    assert.ok(layout.armOffsetX > 0);
    assert.ok(layout.legOffsetX > 0);
  }
  const classicLayout = computeBuildRigLayout('classic', stud);
  const tallLayout = computeBuildRigLayout('tall', stud);
  const chibiLayout = computeBuildRigLayout('chibi', stud);
  assert.ok(tallLayout.torsoBaseY > classicLayout.torsoBaseY);
  assert.ok(chibiLayout.torsoBaseY < classicLayout.torsoBaseY);
  assert.ok(chibiLayout.spec.headScale[0] > classicLayout.spec.headScale[0]);

  // All 6 action catalog entries (none + 5 animated actions)
  assert.deepEqual(
    CHARACTER_ACTION_CATALOG.map((a) => a.id),
    ['none', 'spewBeans', 'cryTears', 'breatheFire', 'confettiBurst', 'sweatColdBreath'],
  );

  // Face sync overlays drive mouth/jaw and crying squint deterministically
  assert.equal(
    getActionFaceSyncOverlay(
      { actionId: 'none', intensity: 1, source: 'mouth', triggerTime: 0, elapsedSec: 0.5, seed: 1 },
      0.5,
    ),
    null,
  );
  const beansFace = getActionFaceSyncOverlay(
    { actionId: 'spewBeans', intensity: 1.2, source: 'mouth', triggerTime: 0, elapsedSec: 0.4, seed: 1 },
    0.4,
  );
  assert.ok(beansFace && (beansFace.jawOpen ?? 0) >= 0.75);
  const fireFace = getActionFaceSyncOverlay(
    { actionId: 'breatheFire', intensity: 1.1, source: 'mouth', triggerTime: 0, elapsedSec: 0.5, seed: 1 },
    0.5,
  );
  assert.ok(fireFace && (fireFace.jawOpen ?? 0) >= 0.75);
  const cryFace = getActionFaceSyncOverlay(
    { actionId: 'cryTears', intensity: 1.0, source: 'mouth', triggerTime: 0, elapsedSec: 0.6, seed: 1 },
    0.6,
  );
  assert.ok(cryFace && (cryFace.eyeWide ?? 0) < 0);

  // Pure deterministic evaluation + timeline CRUD, ripple shift, and JSON roundtrip
  const knight = CROSSROADS_SHOWDOWN_PROJECT.actors[0];
  let proj = {
    ...CROSSROADS_SHOWDOWN_PROJECT,
    actors: CROSSROADS_SHOWDOWN_PROJECT.actors.map((a) =>
      a.id === knight.id ? { ...a, modelBuild: 'chunky' as const } : a,
    ),
  };
  proj = upsertCharacterActionKeyframe(proj, knight.id, {
    id: 'akf-beans',
    time: 1.5,
    actionId: 'spewBeans',
    intensity: 1.25,
    source: 'mouth',
    seed: 24,
  });
  proj = upsertCharacterActionKeyframe(proj, knight.id, {
    id: 'akf-confetti',
    time: 4.5,
    actionId: 'confettiBurst',
    intensity: 1.1,
    source: 'hands',
    seed: 77,
  });
  proj = upsertCharacterActionKeyframe(proj, knight.id, {
    id: 'akf-stop',
    time: 7.0,
    actionId: 'none',
    intensity: 1,
    source: 'mouth',
  });

  const actor = proj.actors.find((a) => a.id === knight.id)!;
  const beforeCue = evaluateCharacterActionAt(actor.actionKeyframes, 0.8);
  assert.equal(beforeCue.actionId, 'none');
  assert.equal(beforeCue.elapsedSec, 0);

  const duringBeans = evaluateCharacterActionAt(actor.actionKeyframes, 2.15);
  assert.equal(duringBeans.actionId, 'spewBeans');
  assert.equal(duringBeans.source, 'mouth');
  assert.equal(duringBeans.intensity, 1.25);
  assert.equal(duringBeans.seed, 24);
  assert.ok(Math.abs(duringBeans.elapsedSec - 0.65) < 1e-6);

  const duringConfetti = evaluateCharacterActionAt(actor.actionKeyframes, 5.0);
  assert.equal(duringConfetti.actionId, 'confettiBurst');
  assert.equal(duringConfetti.source, 'hands');
  assert.equal(duringConfetti.seed, 77);
  assert.ok(Math.abs(duringConfetti.elapsedSec - 0.5) < 1e-6);

  const afterStop = evaluateCharacterActionAt(actor.actionKeyframes, 7.6);
  assert.equal(afterStop.actionId, 'none');

  // Move, ripple shift, JSON roundtrip with intensity clamping, and delete
  proj = moveCharacterActionKeyframeTime(proj, knight.id, 'akf-confetti', 5.0);
  assert.equal(
    proj.actors.find((a) => a.id === knight.id)?.actionKeyframes?.find((k) => k.id === 'akf-confetti')?.time,
    5.0,
  );

  const rippled = rippleShiftProjectFrom(proj, 4.0, 2.5);
  const rippledActor = rippled.actors.find((a) => a.id === knight.id)!;
  assert.equal(rippledActor.actionKeyframes?.find((k) => k.id === 'akf-beans')?.time, 1.5);
  assert.equal(rippledActor.actionKeyframes?.find((k) => k.id === 'akf-confetti')?.time, 7.5);
  assert.equal(rippledActor.actionKeyframes?.find((k) => k.id === 'akf-stop')?.time, 9.5);

  const clampedProj = upsertCharacterActionKeyframe(proj, knight.id, {
    id: 'akf-confetti',
    time: 5.0,
    actionId: 'confettiBurst',
    intensity: 9.9, // should clamp to 1.5
    source: 'hands',
    seed: 77,
  });
  const parsed = parseProjectJson(serializeProject(clampedProj));
  const parsedActor = parsed.actors.find((a) => a.id === knight.id)!;
  assert.equal(parsedActor.modelBuild, 'chunky');
  const parsedActionKfs = parsedActor.actionKeyframes ?? [];
  assert.equal(parsedActionKfs.length, 3);
  assert.equal(parsedActionKfs.find((k) => k.id === 'akf-beans')?.actionId, 'spewBeans');
  assert.equal(parsedActionKfs.find((k) => k.id === 'akf-confetti')?.intensity, 1.5);
  assert.equal(parsedActionKfs.find((k) => k.id === 'akf-confetti')?.source, 'hands');

  const afterDel = deleteCharacterActionKeyframe(proj, knight.id, 'akf-confetti');
  assert.equal(
    afterDel.actors.find((a) => a.id === knight.id)?.actionKeyframes?.some((k) => k.id === 'akf-confetti'),
    false,
  );

  // Idiom Town Scene 2 integration: Gossiper spews beans accurately from mouth + Tall/Chunky builds on cast
  const s2Beans = evaluateProjectAt(THE_IDIOM_TOWN_PROJECT, 16.5);
  assert.equal(s2Beans.actors['idiom-gossiper'].characterAction?.actionId, 'spewBeans');
  assert.equal(s2Beans.actors['idiom-gossiper'].characterAction?.source, 'mouth');
  assert.ok(
    Math.abs((s2Beans.actors['idiom-gossiper'].characterAction?.elapsedSec ?? 0) - 0.65) < 1e-6,
  );
  const s2AfterBeans = evaluateProjectAt(THE_IDIOM_TOWN_PROJECT, 21.0);
  assert.equal(s2AfterBeans.actors['idiom-gossiper'].characterAction?.actionId, 'none');

  const execActor = THE_IDIOM_TOWN_PROJECT.actors.find((a) => a.id === 'idiom-exec-1');
  const chefActor = THE_IDIOM_TOWN_PROJECT.actors.find((a) => a.id === 'idiom-chef');
  assert.equal(execActor?.modelBuild, 'tall');
  assert.equal(chefActor?.modelBuild, 'chunky');
});

test('Sudden-appearing word-pop captions, emphasis pop, narrator routing, and JSON roundtrip', () => {
  // 1. Markup stripping and emphasis / punctuation detection
  const raw = "Okay, fine. I'll *spill the beans!*";
  assert.equal(stripCaptionMarkup(raw), "Okay, fine. I'll spill the beans!");
  const parsedWords = parseCaptionWords(raw);
  assert.equal(parsedWords.length, 6);
  assert.equal(parsedWords[0].isEmphasis, false);
  assert.equal(parsedWords[3].text, 'spill');
  assert.equal(parsedWords[3].isEmphasis, true);
  assert.equal(parsedWords[5].text, 'beans!');
  assert.equal(parsedWords[5].isEmphasis, true);
  assert.equal(parsedWords[5].isPunctuationPop, true);

  // 2. Sudden-appear state progression & chunking
  const cue = {
    id: 'test-sub-pop',
    startTime: 2.0,
    endTime: 5.0,
    speaker: 'Gossiper',
    role: 'dialogue' as const,
    text: "Okay, fine. I'll *spill the beans!*",
  };
  const timed = buildTimedCaptionWords(cue, 3);
  assert.equal(timed.length, 6);
  // Sentence break after "fine." creates chunk 0 = ["Okay,", "fine."], chunk 1 = ["I'll", "spill", "the"], chunk 2 = ["beans!"]
  assert.equal(timed[0].chunkIndex, 0);
  assert.equal(timed[1].chunkIndex, 0);
  assert.equal(timed[2].chunkIndex, 1);

  // At cue start, word 0 is active and word 1 is STILL HIDDEN (sudden appear)
  const atStart = evaluateWordPopCaption(cue, 2.02, { wordsPerChunk: 3, emphasisPop: true })!;
  assert.ok(atStart);
  assert.equal(atStart.chunkIndex, 0);
  assert.equal(atStart.words[0].state, 'active');
  assert.equal(atStart.words[1].state, 'hidden');
  assert.equal(atStart.words[1].opacity, 0);
  assert.ok(atStart.words[0].scale > 0.74);

  // At final emphasized exclamation word, active word is "beans!" with boosted emphasis pop & non-zero tilt
  const lastWord = timed[timed.length - 1];
  const atPunchline = evaluateWordPopCaption(
    cue,
    lastWord.startTime + 0.06,
    { wordsPerChunk: 3, emphasisPop: true },
  )!;
  assert.equal(atPunchline.activeWordIndex, 5);
  const punchWord = atPunchline.words.find((w) => w.index === 5)!;
  assert.equal(punchWord.state, 'active');
  assert.equal(punchWord.isEmphasis, true);
  assert.equal(punchWord.isPunctuationPop, true);
  assert.ok(punchWord.scale > 1.15);
  assert.ok(Math.abs(punchWord.tiltDeg) > 0.5);

  // Outside cue range returns null
  assert.equal(evaluateWordPopCaption(cue, 1.5), null);
  assert.equal(evaluateWordPopCaption(cue, 5.5), null);

  // 3. Settings clamping & voice routing differentiation
  const clampedCap = resolveCaptionSettings({
    wordsPerChunk: 99,
    highlightColor: 'not-a-color',
    position: 'center',
  });
  assert.equal(clampedCap.wordsPerChunk, 5);
  assert.equal(clampedCap.highlightColor, '#fbbf24');
  assert.equal(clampedCap.position, 'center');

  const clampedNar = resolveNarratorSettings({
    speed: 3.0,
    pitchSemitones: -20,
    volume: 0.05,
    duckAmount: 0.99,
    voice: 'Fenrir',
  });
  assert.equal(clampedNar.speed, 1.4);
  assert.equal(clampedNar.pitchSemitones, -4);
  assert.equal(clampedNar.volume, 0.2);
  assert.equal(clampedNar.duckAmount, 0.75);
  assert.equal(clampedNar.voice, 'Fenrir');

  const voCue = THE_IDIOM_TOWN_PROJECT.subtitles.find((s) => s.id === 'sub-1b')!;
  const gossiperCue = THE_IDIOM_TOWN_PROJECT.subtitles.find((s) => s.id === 'sub-2a')!;
  assert.equal(resolveCueVoice(voCue, clampedNar), 'Fenrir');
  assert.equal(resolveCueVoice(gossiperCue, clampedNar), 'Kore');
  assert.equal(
    resolveCueVoice({ ...gossiperCue, voiceOverride: 'Puck' }, clampedNar),
    'Puck',
  );
  assert.ok(countVoiceCuesInRange(THE_IDIOM_TOWN_PROJECT, 0, 90) >= 12);

  // 4. Project JSON roundtrip preserves captionSettings, narratorSettings, and voiceOverride
  const customized = {
    ...THE_IDIOM_TOWN_PROJECT,
    captionSettings: {
      ...resolveCaptionSettings(THE_IDIOM_TOWN_PROJECT.captionSettings),
      position: 'center' as const,
      highlightColor: '#38bdf8',
      wordsPerChunk: 4,
    },
    narratorSettings: {
      ...resolveNarratorSettings(THE_IDIOM_TOWN_PROJECT.narratorSettings),
      voice: 'Puck' as const,
      style: 'energeticHost' as const,
      speed: 1.15,
      pitchSemitones: 1.5,
    },
    subtitles: THE_IDIOM_TOWN_PROJECT.subtitles.map((s) =>
      s.id === 'sub-2a' ? { ...s, voiceOverride: 'Zephyr' as const } : s,
    ),
  };
  const roundtrip = parseProjectJson(serializeProject(customized));
  assert.equal(roundtrip.captionSettings?.position, 'center');
  assert.equal(roundtrip.captionSettings?.highlightColor, '#38bdf8');
  assert.equal(roundtrip.captionSettings?.wordsPerChunk, 4);
  assert.equal(roundtrip.narratorSettings?.voice, 'Puck');
  assert.equal(roundtrip.narratorSettings?.style, 'energeticHost');
  assert.equal(roundtrip.narratorSettings?.speed, 1.15);
  assert.equal(roundtrip.narratorSettings?.pitchSemitones, 1.5);
  assert.equal(
    roundtrip.subtitles.find((s) => s.id === 'sub-2a')?.voiceOverride,
    'Zephyr',
  );
});

test('Cinematic presets, expression-tagged narration transcript ([shock] / actions), vocal-activity ducking, and JSON roundtrip work deterministically', () => {
  // 1. All 6 full-look cinematic presets apply & snapshot/undo restores cleanly
  assert.equal(CINEMATIC_PRESETS.length, 6);
  const baseSnapshot = captureCinematicSnapshot(CROSSROADS_SHOWDOWN_PROJECT, false);

  for (const preset of CINEMATIC_PRESETS) {
    const { project: styled, enableLetterbox } = applyCinematicPreset(
      CROSSROADS_SHOWDOWN_PROJECT,
      preset.id,
    );
    assert.equal(styled.activeCinematicPreset, preset.id);
    assert.equal(styled.lightingMood, preset.lightingMood);
    assert.equal(enableLetterbox, preset.enableLetterbox);
    assert.equal(styled.actors.length, CROSSROADS_SHOWDOWN_PROJECT.actors.length);
    assert.equal(styled.subtitles.length, CROSSROADS_SHOWDOWN_PROJECT.subtitles.length);
    assert.equal(styled.captionSettings?.highlightColor, preset.captionPatch.highlightColor);
    assert.equal(styled.narratorSettings?.voice, preset.narratorPatch.voice);
    assert.equal(styled.cameraTrack[0]?.rollDeg, preset.camera.rollDeg);

    const restored = restoreCinematicSnapshot(styled, baseSnapshot);
    assert.equal(restored.project.lightingMood, CROSSROADS_SHOWDOWN_PROJECT.lightingMood);
    assert.equal(restored.project.activeCinematicPreset, null);
    assert.equal(restored.forceLetterbox, false);
    assert.equal(
      restored.project.cameraTrack[0]?.fov,
      CROSSROADS_SHOWDOWN_PROJECT.cameraTrack[0]?.fov,
    );
  }

  // 2. Expression-tagged narration transcript emits [shock] for surprised & custom wide-eye/jaw-drop
  const knight = CROSSROADS_SHOWDOWN_PROJECT.actors[0];
  let shockProject = upsertFaceKeyframe(CROSSROADS_SHOWDOWN_PROJECT, knight.id, {
    id: 'fkf-shock',
    time: 1.0,
    preset: 'surprised',
    easing: 'easeInOut',
  });
  shockProject = upsertFaceKeyframe(shockProject, knight.id, {
    id: 'fkf-custom-shock',
    time: 4.0,
    preset: 'neutral',
    overrides: { eyeWide: 0.72, jawOpen: 0.65 },
    easing: 'easeInOut',
  });
  shockProject = {
    ...shockProject,
    subtitles: [
      {
        id: 'cue-shock-1',
        startTime: 1.0,
        endTime: 3.0,
        speaker: knight.name,
        actorId: knight.id,
        role: 'dialogue',
        text: 'Wait, what just happened?!',
      },
      {
        id: 'cue-shock-2',
        startTime: 4.0,
        endTime: 6.0,
        speaker: knight.name,
        actorId: knight.id,
        role: 'dialogue',
        text: 'No way that actually worked!',
      },
    ],
  };

  const shockEntries = buildNarrationTranscript(shockProject);
  assert.equal(shockEntries.length, 2);
  assert.ok(
    shockEntries[0].expressionTags.includes('shock'),
    `Expected [shock] tag for surprised face keyframe, got ${JSON.stringify(shockEntries[0].expressionTags)}`,
  );
  assert.ok(shockEntries[0].formattedLine.includes('[shock]'));
  assert.ok(
    shockEntries[1].expressionTags.includes('shock'),
    `Expected [shock] tag for wide-eye+jaw-open custom override, got ${JSON.stringify(shockEntries[1].expressionTags)}`,
  );

  const transcriptDoc = formatTranscriptDocument(shockProject, shockEntries);
  assert.ok(transcriptDoc.includes('[shock]'));
  assert.ok(transcriptDoc.includes('Wait, what just happened?!'));

  // 3. The Idiom Town transcript surfaces action & FX state tags ([spew beans], [frozen feet], [mind blown])
  const idiomTranscript = buildNarrationTranscript(THE_IDIOM_TOWN_PROJECT);
  const allActionTags = new Set(idiomTranscript.flatMap((e) => e.actionTags));
  assert.ok(
    allActionTags.has('spew beans'),
    `Expected [spew beans] in Idiom Town transcript, got ${JSON.stringify(Array.from(allActionTags))}`,
  );
  assert.ok(
    allActionTags.has('frozen feet'),
    `Expected [frozen feet] in Idiom Town transcript, got ${JSON.stringify(Array.from(allActionTags))}`,
  );
  assert.ok(
    allActionTags.has('mind blown'),
    `Expected [mind blown] in Idiom Town transcript, got ${JSON.stringify(Array.from(allActionTags))}`,
  );

  // 4. Pure RMS vocal-activity interval detection with start offset
  const sr = 1000;
  const pcm = new Float32Array(sr * 5); // 5 seconds
  // Speech burst 1: 0.5s .. 1.5s
  for (let i = 500; i < 1500; i++) pcm[i] = 0.25 * Math.sin(i * 0.15);
  // Silence gap 1.5s .. 3.0s (> 0.35s merge gap)
  // Speech burst 2: 3.0s .. 4.0s
  for (let i = 3000; i < 4000; i++) pcm[i] = 0.3 * Math.sin(i * 0.12);

  const intervals = detectVocalActivityIntervals(pcm, sr, 2.0);
  assert.equal(intervals.length, 2);
  assert.ok(Math.abs(intervals[0].start - 2.5) < 0.15);
  assert.ok(Math.abs(intervals[0].end - 3.5) < 0.15);
  assert.ok(Math.abs(intervals[1].start - 5.0) < 0.15);
  assert.ok(Math.abs(intervals[1].end - 6.0) < 0.15);

  // 5. Project JSON roundtrip preserves activeCinematicPreset and customTranscriptText
  const withPresetAndScript = {
    ...applyCinematicPreset(CROSSROADS_SHOWDOWN_PROJECT, 'noir').project,
    customTranscriptText: '[00:01.0] Knight [shock]: Custom edited cue line!',
  };
  const parsed = parseProjectJson(serializeProject(withPresetAndScript));
  assert.equal(parsed.activeCinematicPreset, 'noir');
  assert.equal(
    parsed.customTranscriptText,
    '[00:01.0] Knight [shock]: Custom edited cue line!',
  );
});

test('Multi-clip Voiceover Cutter engine supports appending multiple uploads, razor split, trim handles, fades, ripple delete/move, and SFX ducking projection', () => {
  const fakeBuffer = { duration: 4.0 } as unknown as AudioBuffer;
  const asset1 = {
    id: 'asset_1',
    fileName: 'take-one.wav',
    mimeType: 'audio/wav',
    durationSec: 4.0,
    audioBuffer: fakeBuffer,
    waveformPeaks: Array.from({ length: 80 }, (_, i) => (i < 40 ? 0.3 : 0.85)),
    duckIntervals: [
      { start: 0.4, end: 1.8 },
      { start: 2.2, end: 3.6 },
    ],
  };
  const asset2 = {
    id: 'asset_2',
    fileName: 'take-two.wav',
    mimeType: 'audio/wav',
    durationSec: 3.0,
    audioBuffer: fakeBuffer,
    waveformPeaks: Array.from({ length: 60 }, () => 0.65),
    duckIntervals: [{ start: 0.5, end: 2.5 }],
  };

  // 1. Append multiple uploaded assets sequentially onto one VO track
  let track = appendVoiceoverAssetToTrack(null, asset1, 0);
  track = appendVoiceoverAssetToTrack(track, asset2, 0);
  assert.equal(track.clips?.length, 2);
  assert.equal(track.clips![0].startSec, 0);
  assert.equal(getClipDuration(track.clips![0]), 4.0);
  assert.equal(track.clips![1].startSec, 4.1); // 4.0s + 0.1s gap
  assert.equal(getClipDuration(track.clips![1]), 3.0);
  assert.equal(track.durationSec, 7.0);

  // 2. Razor split / Split at Playhead splits first clip at 1.5s into two contiguous clips
  const firstClipId = track.clips![0].id;
  const splitRes = splitVoiceoverClipAtTime(track.clips!, firstClipId, 1.5, 'test');
  assert.ok(splitRes.leftClipId && splitRes.rightClipId);
  assert.equal(splitRes.clips.length, 3);
  const [c1, c2, c3] = splitRes.clips;
  assert.equal(c1.startSec, 0);
  assert.equal(c1.sourceStartSec, 0);
  assert.equal(c1.sourceEndSec, 1.5);
  assert.equal(c2.startSec, 1.5);
  assert.equal(c2.sourceStartSec, 1.5);
  assert.equal(c2.sourceEndSec, 4.0);
  assert.equal(c3.startSec, 4.1);

  // Split at playhead helper also finds the clip spanning playhead (2.5s inside c2)
  const playheadSplit = splitVoiceoverTrackAtPlayhead(splitRes.clips, 2.5);
  assert.ok(playheadSplit.splitClipIds);
  assert.equal(playheadSplit.clips.length, 4);

  // 3. Trim start & end edges with clamping and ripple shift
  let clips = splitRes.clips; // [0..1.5], [1.5..4.0], [4.1..7.1]
  // Trim start of c2 by +0.5s -> sourceStartSec becomes 2.0, startSec becomes 2.0
  clips = trimVoiceoverClip(clips, c2.id, 'start', 0.5, 4.0, false);
  const trimmedC2 = clips.find((c) => c.id === c2.id)!;
  assert.equal(trimmedC2.sourceStartSec, 2.0);
  assert.equal(trimmedC2.startSec, 2.0);
  assert.equal(getClipDuration(trimmedC2), 2.0);

  // Trim end of c2 by -0.5s with rippleMode=true -> sourceEndSec becomes 3.5, and downstream c3 shifts left by 0.5s (4.1 -> 3.6)
  clips = trimVoiceoverClip(clips, c2.id, 'end', -0.5, 4.0, true);
  const endTrimmedC2 = clips.find((c) => c.id === c2.id)!;
  const rippledC3 = clips.find((c) => c.id === c3.id)!;
  assert.equal(endTrimmedC2.sourceEndSec, 3.5);
  assert.equal(getClipDuration(endTrimmedC2), 1.5);
  assert.equal(rippledC3.startSec, 3.6);

  // 4. Ripple Move shifts target clip and all downstream clips together
  clips = moveVoiceoverClip(clips, c2.id, 2.5, true); // +0.5s delta
  assert.equal(clips.find((c) => c.id === c1.id)!.startSec, 0); // upstream unchanged
  assert.equal(clips.find((c) => c.id === c2.id)!.startSec, 2.5);
  assert.equal(clips.find((c) => c.id === c3.id)!.startSec, 4.1);

  // 5. Fade-in / Fade-out envelopes & gain evaluation
  clips = updateVoiceoverClipSettings(clips, c1.id, {
    fadeInSec: 0.5,
    fadeOutSec: 0.5,
    volume: 1.2,
  });
  const fadedC1 = clips.find((c) => c.id === c1.id)!;
  assert.equal(fadedC1.fadeInSec, 0.5);
  assert.equal(fadedC1.fadeOutSec, 0.5);
  assert.equal(evaluateClipFadeGain(fadedC1, 0), 0);
  assert.ok(Math.abs(evaluateClipFadeGain(fadedC1, 0.25) - 0.5) < 1e-6);
  assert.equal(evaluateClipFadeGain(fadedC1, 0.75), 1);
  assert.ok(Math.abs(evaluateClipFadeGain(fadedC1, 1.25) - 0.5) < 1e-6);

  // 6. Waveform peak slicing resamples the trimmed sub-range accurately
  const lowHalfPeaks = sliceClipWaveformPeaks(asset1.waveformPeaks, 4.0, 0, 1.5, 12);
  const highHalfPeaks = sliceClipWaveformPeaks(asset1.waveformPeaks, 4.0, 2.2, 3.8, 12);
  assert.equal(lowHalfPeaks.length, 12);
  assert.ok(highHalfPeaks[0] > lowHalfPeaks[0]);

  // 7. Projected SFX auto-ducking intervals exclude muted clips and trimmed-out regions
  const duckBeforeMute = computeTrackDuckIntervals(track.assets!, clips);
  assert.ok(duckBeforeMute.length >= 2);
  const mutedClips = updateVoiceoverClipSettings(clips, c3.id, { muted: true });
  const duckAfterMute = computeTrackDuckIntervals(track.assets!, mutedClips);
  // c3 started at 4.1s, so no duck interval should extend past getClipEndTime(c2) = 4.0s
  const maxDuckEnd = Math.max(...duckAfterMute.map((d) => d.end));
  assert.ok(maxDuckEnd <= getClipEndTime(clips.find((c) => c.id === c2.id)!) + 0.05);

  // 8. Delete vs Ripple Delete
  const nonRippleDeleted = deleteVoiceoverClip(clips, c1.id, false);
  assert.equal(nonRippleDeleted.length, 2);
  assert.equal(nonRippleDeleted.find((c) => c.id === c2.id)!.startSec, 2.5);

  const rippleDeleted = deleteVoiceoverClip(clips, c1.id, true);
  assert.equal(rippleDeleted.length, 2);
  // c1 duration was 1.5s, so c2 shifts from 2.5s -> 1.0s and c3 shifts from 4.1s -> 2.6s
  assert.equal(rippleDeleted.find((c) => c.id === c2.id)!.startSec, 1.0);
  assert.equal(rippleDeleted.find((c) => c.id === c3.id)!.startSec, 2.6);
});






