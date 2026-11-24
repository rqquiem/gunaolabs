import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyEasing,
  applyUpperBodyLayer,
  catmullRomScalar,
  deleteActorKeyframe,
  deleteChapterMarker,
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
  moveFaceKeyframeTime,
  moveItemKeyframeTime,
  moveMapKeyframeTime,
  parseProjectJson,
  rippleShiftProjectFrom,
  serializeProject,
  upsertActorKeyframe,
  upsertCameraKeyframe,
  upsertChapterMarker,
  upsertFaceKeyframe,
  upsertItemKeyframe,
  upsertLightingKeyframe,
  upsertMapKeyframe,
  upsertStageLight,
} from './timeline';
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
  getH264CodecCandidates,
  pickMediaRecorderMp4MimeType,
  resolveExportDimensions,
} from './mp4Recorder';
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
  assert.equal(BUILT_IN_PROPS.length, 32);
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

test('The Idiom Town 90s episode features 7 scenes, voiceover/dialogue roles, SFX track, smash-cut blackout, and serialization roundtrip', () => {
  assert.equal(BUILT_IN_SCENES[0].id, 'scene_idiom_town');
  assert.equal(THE_IDIOM_TOWN_PROJECT.duration, 90);
  assert.equal(THE_IDIOM_TOWN_PROJECT.chapters?.length, 7);
  assert.equal(THE_IDIOM_TOWN_PROJECT.mapTrack?.length, 7);
  assert.ok((THE_IDIOM_TOWN_PROJECT.sfxTrack?.length ?? 0) >= 16);
  assert.ok(
    THE_IDIOM_TOWN_PROJECT.subtitles.some((s) => s.role === 'voiceover') &&
      THE_IDIOM_TOWN_PROJECT.subtitles.some((s) => s.role === 'dialogue'),
  );

  // Spot-check Scene 1 grounded umbrellas -> crouch pickup -> equipped held steel umbrellas
  const s1Pre = evaluateProjectAt(THE_IDIOM_TOWN_PROJECT, 2.0);
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

  const s3 = evaluateProjectAt(THE_IDIOM_TOWN_PROJECT, 31);
  assert.equal(s3.stage.customMap?.id, 'idiom_map_s3_boardroom');
  assert.equal(s3.actors['prop-elephant'].scale[0], 1.05);
  assert.equal(s3.actors['prop-cats-dogs'].scale[0], 0);
  assert.equal(s3.subtitle?.role, 'voiceover');

  const s6 = evaluateProjectAt(THE_IDIOM_TOWN_PROJECT, 74);
  assert.equal(s6.stage.customMap?.id, 'idiom_map_s6_diner');
  assert.equal(s6.actors['prop-horse-platter'].scale[0], 1);

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
});



