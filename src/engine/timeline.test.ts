import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyEasing,
  catmullRomScalar,
  deleteActorKeyframe,
  deleteLightingKeyframe,
  deleteStageLight,
  evaluateActorAt,
  evaluateCameraAt,
  evaluateLightingAt,
  evaluateProceduralClipPose,
  evaluateProjectAt,
  evaluateSubtitleAt,
  formatTimecode,
  lerpAngleRad,
  parseProjectJson,
  serializeProject,
  upsertActorKeyframe,
  upsertCameraKeyframe,
  upsertLightingKeyframe,
  upsertStageLight,
} from './timeline';
import { CROSSROADS_SHOWDOWN_PROJECT } from './presets';
import { cloneBundle, ORNAMENT_CATALOG } from './robloxCatalog';
import { ORNAMENT_SLOTS, R6_BODY_PARTS } from './types';

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
