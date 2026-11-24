import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyEasing,
  applyUpperBodyLayer,
  catmullRomScalar,
  deleteActorKeyframe,
  deleteFaceKeyframe,
  deleteItemKeyframe,
  deleteLightingKeyframe,
  deleteStageLight,
  evaluateActorAt,
  evaluateActorItemsAt,
  evaluateCameraAt,
  evaluateLightingAt,
  evaluateProceduralClipPose,
  evaluateProjectAt,
  evaluateSubtitleAt,
  formatTimecode,
  lerpAngleRad,
  moveActorKeyframeTime,
  moveFaceKeyframeTime,
  moveItemKeyframeTime,
  parseProjectJson,
  serializeProject,
  upsertActorKeyframe,
  upsertCameraKeyframe,
  upsertFaceKeyframe,
  upsertItemKeyframe,
  upsertLightingKeyframe,
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
  CROSSROADS_SHOWDOWN_PROJECT,
  ROBLOXIAN_TOWN_PROJECT,
} from './presets';
import { cloneBundle, ORNAMENT_CATALOG } from './robloxCatalog';
import { ORNAMENT_SLOTS, R6_BODY_PARTS } from './types';
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
    'arm',
    'back',
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
  assert.deepEqual(beforeCut.position, [-2.4, 2.0, 4.2]);
  assert.deepEqual(afterCut.position, [3.4, 1.85, 2.5]);

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
    knightPos[1] + 1.4,
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
  assert.equal(BUILT_IN_MAPS.length, 7);
  assert.equal(MAP_MODULE_CATALOG.length, 19);

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

  assert.equal(BUILT_IN_SCENES.length, 8);
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
  assert.equal(BUILT_IN_ITEMS.length, 12);
  assert.equal(BUILT_IN_PROPS.length, 20);
  assert.equal(DUAL_WIELD_COMBOS.length, 6);

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





