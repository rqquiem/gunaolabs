import * as THREE from 'three';
import { buildRoblox3DFaceRig, Roblox3DFaceRig } from './robloxFaceRig';
import {
  createPlasticBrickMaterial,
  createStudBrickMaterial,
  StudTexturePair,
} from './robloxTextures';
import { buildItemModelGroup } from './robloxItems';
import {
  EvaluatedFaceState,
  EvaluatedHeldItems,
  EvaluatedPose,
  FaceRigConfig,
  HandSlot,
  OrnamentSlot,
  R6_BODY_PARTS,
  R6BodyColors,
  R6BodyPartId,
  R6Ornaments,
  SecondaryMotionState,
} from './types';

// Authentic Roblox R6 stud proportion: 1 stud = 0.55 world units (5 studs tall = 2.75 units)
export const R6_STUD = 0.55;
const TORSO_BASE_Y = 3.0 * R6_STUD;

export interface RobloxR6CharacterRig {
  root: THREE.Group;
  hipPivot: THREE.Group;
  torsoPivot: THREE.Group;
  pivots: Record<R6BodyPartId, THREE.Group>;
  sockets: Record<OrnamentSlot, THREE.Group>;
  handSockets: Record<HandSlot, THREE.Group>;
  faceRig: Roblox3DFaceRig;
  selectionRing: THREE.Mesh;
  applyPose: (pose: EvaluatedPose) => void;
  applyHeadLookAt: (yawRad: number, pitchRad: number, weight: number) => void;
  applyFaceState: (
    face: EvaluatedFaceState,
    gazeOverride?: { x: number; y: number } | null,
  ) => void;
  applySecondaryMotion: (sec: SecondaryMotionState) => void;
  setBodyColors: (colors: R6BodyColors) => void;
  setOrnaments: (ornaments: R6Ornaments) => void;
  setHeldItems: (heldItems: EvaluatedHeldItems) => void;
  setFaceConfig: (config: FaceRigConfig) => void;
}

function disposeGroupContents(group: THREE.Group) {
  while (group.children.length > 0) {
    const child = group.children[0];
    group.remove(child);
    child.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        mesh.geometry?.dispose();
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        mats.forEach((m) => {
          if (!m) return;
          const std = m as THREE.MeshStandardMaterial;
          std.map?.dispose();
          std.bumpMap?.dispose();
          m.dispose();
        });
      }
    });
  }
}

function buildRoundedHeadGeometry(): THREE.LatheGeometry {
  // Classic Roblox beveled cylinder head profile (~1.25 studs wide, 1.25 studs tall)
  const r = 0.58 * R6_STUD;
  const h = 0.56 * R6_STUD;
  const bevel = 0.14 * R6_STUD;
  const pts = [
    new THREE.Vector2(0, -h),
    new THREE.Vector2(r - bevel, -h),
    new THREE.Vector2(r, -h + bevel),
    new THREE.Vector2(r, h - bevel),
    new THREE.Vector2(r - bevel, h),
    new THREE.Vector2(0, h),
  ];
  const geo = new THREE.LatheGeometry(pts, 24);
  geo.rotateY(Math.PI);
  return geo;
}

export function buildRobloxR6CharacterRig(
  initialColors: R6BodyColors,
  initialOrnaments: R6Ornaments,
  initialFaceConfig: FaceRigConfig,
  studTextures: StudTexturePair,
  shadowTex: THREE.CanvasTexture,
): RobloxR6CharacterRig {
  const root = new THREE.Group();

  // Contact shadow disc grounded at y = 0.015
  const shadowPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(1.7, 1.7),
    new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      depthWrite: false,
      opacity: 0.72,
    }),
  );
  shadowPlane.rotation.x = -Math.PI / 2;
  shadowPlane.position.y = 0.015;
  root.add(shadowPlane);

  // Selection ring (Roblox Studio selection blue #00a2ff)
  const selectionRing = new THREE.Mesh(
    new THREE.RingGeometry(0.75, 0.87, 36),
    new THREE.MeshBasicMaterial({
      color: 0x00a2ff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.92,
      depthWrite: false,
    }),
  );
  selectionRing.rotation.x = -Math.PI / 2;
  selectionRing.position.y = 0.025;
  selectionRing.visible = false;
  root.add(selectionRing);

  // Per-part plastic materials
  const partMaterials: Record<R6BodyPartId, THREE.MeshStandardMaterial> = {
    head: createPlasticBrickMaterial(initialColors.head, { roughness: 0.32 }),
    torso: createStudBrickMaterial(initialColors.torso, studTextures, 2, 2, {
      roughness: 0.36,
      bumpScale: 0.028,
    }),
    leftArm: createStudBrickMaterial(initialColors.leftArm, studTextures, 1, 2, {
      roughness: 0.36,
      bumpScale: 0.026,
    }),
    rightArm: createStudBrickMaterial(initialColors.rightArm, studTextures, 1, 2, {
      roughness: 0.36,
      bumpScale: 0.026,
    }),
    leftLeg: createStudBrickMaterial(initialColors.leftLeg, studTextures, 1, 2, {
      roughness: 0.38,
      bumpScale: 0.026,
    }),
    rightLeg: createStudBrickMaterial(initialColors.rightLeg, studTextures, 1, 2, {
      roughness: 0.38,
      bumpScale: 0.026,
    }),
  };

  // --- ENHANCED R6 HIP / ROOT MOTION PIVOT (supports hip tilt, lateral sway, squash & stretch) ---
  const hipPivot = new THREE.Group();
  hipPivot.position.set(0, TORSO_BASE_Y, 0);
  root.add(hipPivot);

  // --- TORSO (2 x 2 x 1 studs) ---
  const torsoPivot = new THREE.Group();
  torsoPivot.position.set(0, 0, 0);
  hipPivot.add(torsoPivot);

  const torsoMesh = new THREE.Mesh(
    new THREE.BoxGeometry(2 * R6_STUD, 2 * R6_STUD, 1 * R6_STUD),
    partMaterials.torso,
  );
  torsoMesh.castShadow = true;
  torsoMesh.receiveShadow = true;
  torsoPivot.add(torsoMesh);

  // --- HEAD (rounded classic cylinder + neck + 3D Sculpted Face Rig) ---
  const headPivot = new THREE.Group();
  headPivot.position.set(0, 1.0 * R6_STUD, 0);
  torsoPivot.add(headPivot);

  const headMesh = new THREE.Mesh(buildRoundedHeadGeometry(), partMaterials.head);
  headMesh.position.set(0, 0.56 * R6_STUD, 0);
  headMesh.castShadow = true;
  headMesh.receiveShadow = true;
  headPivot.add(headMesh);

  const faceRig = buildRoblox3DFaceRig(initialFaceConfig, initialColors.head);
  headPivot.add(faceRig.root);

  // --- LEFT ARM (+X side when facing +Z) ---
  const leftArmPivot = new THREE.Group();
  leftArmPivot.position.set(1.52 * R6_STUD, 0.85 * R6_STUD, 0);
  torsoPivot.add(leftArmPivot);

  const leftArmMesh = new THREE.Mesh(
    new THREE.BoxGeometry(1 * R6_STUD, 2 * R6_STUD, 1 * R6_STUD),
    partMaterials.leftArm,
  );
  leftArmMesh.position.set(0, -0.85 * R6_STUD, 0);
  leftArmMesh.castShadow = true;
  leftArmMesh.receiveShadow = true;
  leftArmPivot.add(leftArmMesh);

  // --- RIGHT ARM (-X side when facing +Z) ---
  const rightArmPivot = new THREE.Group();
  rightArmPivot.position.set(-1.52 * R6_STUD, 0.85 * R6_STUD, 0);
  torsoPivot.add(rightArmPivot);

  const rightArmMesh = new THREE.Mesh(
    new THREE.BoxGeometry(1 * R6_STUD, 2 * R6_STUD, 1 * R6_STUD),
    partMaterials.rightArm,
  );
  rightArmMesh.position.set(0, -0.85 * R6_STUD, 0);
  rightArmMesh.castShadow = true;
  rightArmMesh.receiveShadow = true;
  rightArmPivot.add(rightArmMesh);

  // --- LEFT LEG (+X side, parented under hipPivot so torso lean doesn't lift legs unnaturally) ---
  const leftLegPivot = new THREE.Group();
  leftLegPivot.position.set(0.51 * R6_STUD, -1.0 * R6_STUD, 0);
  hipPivot.add(leftLegPivot);

  const leftLegMesh = new THREE.Mesh(
    new THREE.BoxGeometry(1 * R6_STUD, 2 * R6_STUD, 1 * R6_STUD),
    partMaterials.leftLeg,
  );
  leftLegMesh.position.set(0, -1.0 * R6_STUD, 0);
  leftLegMesh.castShadow = true;
  leftLegMesh.receiveShadow = true;
  leftLegPivot.add(leftLegMesh);

  // --- RIGHT LEG (-X side) ---
  const rightLegPivot = new THREE.Group();
  rightLegPivot.position.set(-0.51 * R6_STUD, -1.0 * R6_STUD, 0);
  hipPivot.add(rightLegPivot);

  const rightLegMesh = new THREE.Mesh(
    new THREE.BoxGeometry(1 * R6_STUD, 2 * R6_STUD, 1 * R6_STUD),
    partMaterials.rightLeg,
  );
  rightLegMesh.position.set(0, -1.0 * R6_STUD, 0);
  rightLegMesh.castShadow = true;
  rightLegMesh.receiveShadow = true;
  rightLegPivot.add(rightLegMesh);

  const pivots: Record<R6BodyPartId, THREE.Group> = {
    head: headPivot,
    torso: torsoPivot,
    leftArm: leftArmPivot,
    rightArm: rightArmPivot,
    leftLeg: leftLegPivot,
    rightLeg: rightLegPivot,
  };

  // --- 6 ORNAMENT ATTACHMENT SOCKETS (Head, Hat, Face, Arm, Back, Legs) ---
  const headSocket = new THREE.Group();
  headSocket.position.set(0, 0.56 * R6_STUD, 0);
  headPivot.add(headSocket);

  const hatSocket = new THREE.Group();
  hatSocket.position.set(0, 1.06 * R6_STUD, 0);
  headPivot.add(hatSocket);

  // Kept in sockets map for compatibility; 3D sculpted face lives in faceRig
  const faceSocket = new THREE.Group();
  faceSocket.position.set(0, 0.56 * R6_STUD, 0.59 * R6_STUD);
  headPivot.add(faceSocket);

  const armSocket = new THREE.Group();
  armSocket.position.set(0, -1.78 * R6_STUD, 0.35 * R6_STUD);
  rightArmPivot.add(armSocket);

  // Dual-hand held item sockets (separate from wearable armor/ornaments)
  const rightHandSocket = new THREE.Group();
  rightHandSocket.position.set(0, -1.76 * R6_STUD, 0.36 * R6_STUD);
  rightArmPivot.add(rightHandSocket);
  const rightGripPivot = new THREE.Group();
  rightHandSocket.add(rightGripPivot);

  const leftHandSocket = new THREE.Group();
  leftHandSocket.position.set(0, -1.76 * R6_STUD, 0.36 * R6_STUD);
  leftArmPivot.add(leftHandSocket);
  const leftGripPivot = new THREE.Group();
  leftHandSocket.add(leftGripPivot);

  const handSockets: Record<HandSlot, THREE.Group> = {
    right: rightHandSocket,
    left: leftHandSocket,
  };
  const handGripPivots: Record<HandSlot, THREE.Group> = {
    right: rightGripPivot,
    left: leftGripPivot,
  };

  const backSocket = new THREE.Group();
  backSocket.position.set(0, 0.1 * R6_STUD, -0.52 * R6_STUD);
  torsoPivot.add(backSocket);

  const legsSocket = new THREE.Group();
  hipPivot.add(legsSocket);
  const legLeftGuardSocket = new THREE.Group();
  legLeftGuardSocket.position.set(0, -1.0 * R6_STUD, 0);
  leftLegPivot.add(legLeftGuardSocket);
  const legRightGuardSocket = new THREE.Group();
  legRightGuardSocket.position.set(0, -1.0 * R6_STUD, 0);
  rightLegPivot.add(legRightGuardSocket);

  const sockets: Record<OrnamentSlot, THREE.Group> = {
    head: headSocket,
    hat: hatSocket,
    face: faceSocket,
    arm: armSocket,
    back: backSocket,
    legs: legsSocket,
  };

  let currentOrnamentsJson = '';
  let currentHandSignatures: Record<HandSlot, string> = { right: '', left: '' };
  let rightHandHasActiveItem = false;
  let capeDrapePivot: THREE.Group | null = null;
  let leftWingPivot: THREE.Group | null = null;
  let rightWingPivot: THREE.Group | null = null;

  const rebuildOrnaments = (ornaments: R6Ornaments) => {
    // Only compare structural 3D ornaments (face is now handled by faceRig)
    const nextJson = JSON.stringify({
      head: ornaments.head,
      hat: ornaments.hat,
      arm: ornaments.arm,
      back: ornaments.back,
      legs: ornaments.legs,
    });
    if (nextJson === currentOrnamentsJson) return;
    currentOrnamentsJson = nextJson;

    buildHeadOrnament(headSocket, ornaments.head.id, ornaments.head.color);
    buildHatOrnament(hatSocket, ornaments.hat.id, ornaments.hat.color);
    buildArmOrnament(armSocket, ornaments.arm.id, ornaments.arm.color);
    // Avoid overlapping legacy held arm ornaments when rightHandSocket has a held item
    const isLegacyHeldOrnament =
      ornaments.arm.id === 'sword' ||
      ornaments.arm.id === 'bloxyCola' ||
      ornaments.arm.id === 'shield';
    armSocket.visible = !(rightHandHasActiveItem && isLegacyHeldOrnament);
    const backHandles = buildBackOrnament(
      backSocket,
      ornaments.back.id,
      ornaments.back.color,
    );
    capeDrapePivot = backHandles.capePivot;
    leftWingPivot = backHandles.leftWing;
    rightWingPivot = backHandles.rightWing;
    buildLegsOrnaments(
      legsSocket,
      legLeftGuardSocket,
      legRightGuardSocket,
      ornaments.legs.id,
      ornaments.legs.color,
    );
  };

  rebuildOrnaments(initialOrnaments);

  const applyHeldHand = (
    hand: HandSlot,
    state: EvaluatedHeldItems['right'],
  ) => {
    const gripPivot = handGripPivots[hand];
    const sig =
      state.itemId === 'none'
        ? 'none'
        : `${state.itemId}|${state.primaryColor}|${state.accentColor}`;

    if (sig !== currentHandSignatures[hand]) {
      currentHandSignatures[hand] = sig;
      disposeGroupContents(gripPivot);
      if (state.itemId !== 'none') {
        const itemMesh = buildItemModelGroup(
          state.itemId,
          state.primaryColor,
          state.accentColor,
          studTextures,
        );
        gripPivot.add(itemMesh);
      }
    }

    const visible = state.itemId !== 'none' && state.visibilityScale > 0.005;
    gripPivot.visible = visible;
    if (visible) {
      gripPivot.position.set(
        state.positionOffset[0],
        state.positionOffset[1],
        state.positionOffset[2],
      );
      gripPivot.rotation.set(
        (state.rotationDeg[0] * Math.PI) / 180,
        (state.rotationDeg[1] * Math.PI) / 180,
        (state.rotationDeg[2] * Math.PI) / 180,
      );
      const effScale = Math.max(0.01, state.scale * state.visibilityScale);
      gripPivot.scale.setScalar(effScale);
    }
  };

  const setHeldItems = (heldItems: EvaluatedHeldItems) => {
    applyHeldHand('right', heldItems.right);
    applyHeldHand('left', heldItems.left);
    rightHandHasActiveItem = heldItems.right.itemId !== 'none';
    const isLegacyHeldOrnament =
      initialOrnaments.arm.id === 'sword' ||
      initialOrnaments.arm.id === 'bloxyCola' ||
      initialOrnaments.arm.id === 'shield';
    if (currentOrnamentsJson) {
      const parsed = JSON.parse(currentOrnamentsJson) as { arm?: { id: string } };
      const armId = parsed.arm?.id;
      const legacy =
        armId === 'sword' || armId === 'bloxyCola' || armId === 'shield';
      armSocket.visible = !(rightHandHasActiveItem && legacy);
    } else {
      armSocket.visible = !(rightHandHasActiveItem && isLegacyHeldOrnament);
    }
  };

  let baseHeadRot: [number, number, number] = [0, 0, 0];

  const applyPose = (pose: EvaluatedPose) => {
    const hipOff = pose.hipOffset ?? [0, pose.torsoOffsetY, 0];
    const hipTilt = pose.hipTilt ?? [0, 0, 0];
    const squash = pose.squashY ?? 1;
    const invXZ = 1 / Math.sqrt(Math.max(0.75, squash));

    hipPivot.position.set(hipOff[0], TORSO_BASE_Y + hipOff[1], hipOff[2]);
    hipPivot.rotation.set(hipTilt[0], hipTilt[1], hipTilt[2]);
    hipPivot.scale.set(invXZ, squash, invXZ);

    // Subtle contact shadow scale pulse when jumping
    const lift = Math.max(0, hipOff[1]);
    const shadowScale = Math.max(0.55, 1 - lift * 0.25);
    shadowPlane.scale.set(shadowScale, shadowScale, 1);

    for (const part of R6_BODY_PARTS) {
      const r = pose.joints[part];
      pivots[part].rotation.set(r[0], r[1], r[2]);
    }
    baseHeadRot = [pose.joints.head[0], pose.joints.head[1], pose.joints.head[2]];
  };

  const applyHeadLookAt = (yawRad: number, pitchRad: number, weight: number) => {
    if (weight <= 0.001) return;
    headPivot.rotation.set(
      baseHeadRot[0] + pitchRad * weight,
      baseHeadRot[1] + yawRad * weight,
      baseHeadRot[2],
    );
  };

  const applySecondaryMotion = (sec: SecondaryMotionState) => {
    // Cape trailing billow
    if (capeDrapePivot) {
      capeDrapePivot.rotation.set(0.12 + sec.capePitch, 0, sec.capeRoll);
    }
    // Wings responsive flap / spread
    if (leftWingPivot && rightWingPivot) {
      leftWingPivot.rotation.y = -0.45 - sec.wingSpread;
      rightWingPivot.rotation.y = 0.45 + sec.wingSpread;
    }
    // Hat / hair subtle inertia lag
    hatSocket.rotation.set(sec.hatLagX, 0, sec.hatLagZ);
    // Held prop follow-through (both hands + legacy arm socket)
    armSocket.rotation.x = sec.propSwing;
    rightHandSocket.rotation.x = sec.propSwing;
    leftHandSocket.rotation.x = -sec.propSwing * 0.7;
  };

  const setBodyColors = (colors: R6BodyColors) => {
    for (const part of R6_BODY_PARTS) {
      partMaterials[part].color.set(colors[part]);
    }
    faceRig.setSkinColor(colors.head);
  };

  return {
    root,
    hipPivot,
    torsoPivot,
    pivots,
    sockets,
    handSockets,
    faceRig,
    selectionRing,
    applyPose,
    applyHeadLookAt,
    applyFaceState: (face, gazeOverride) => faceRig.applyFaceState(face, gazeOverride),
    applySecondaryMotion,
    setBodyColors,
    setOrnaments: rebuildOrnaments,
    setHeldItems,
    setFaceConfig: (config) => faceRig.setConfig(config),
  };
}

// =========================================================================
// Procedural 3D Ornament Builders (Head, Hat, Arm, Back, Legs)
// =========================================================================

function buildHeadOrnament(socket: THREE.Group, id: string, color: string) {
  disposeGroupContents(socket);
  if (id === 'none') return;

  const mat = createPlasticBrickMaterial(color, { roughness: 0.25, metalness: 0.15 });

  if (id === 'shades') {
    const lensMat = createPlasticBrickMaterial(color, { roughness: 0.12, metalness: 0.4 });
    const leftLens = new THREE.Mesh(
      new THREE.BoxGeometry(0.28 * R6_STUD, 0.18 * R6_STUD, 0.08 * R6_STUD),
      lensMat,
    );
    leftLens.position.set(-0.22 * R6_STUD, 0.08 * R6_STUD, 0.65 * R6_STUD);
    const rightLens = leftLens.clone();
    rightLens.position.x = 0.22 * R6_STUD;
    const bridge = new THREE.Mesh(
      new THREE.BoxGeometry(0.2 * R6_STUD, 0.06 * R6_STUD, 0.07 * R6_STUD),
      lensMat,
    );
    bridge.position.set(0, 0.1 * R6_STUD, 0.65 * R6_STUD);
    const armL = new THREE.Mesh(
      new THREE.BoxGeometry(0.06 * R6_STUD, 0.06 * R6_STUD, 0.88 * R6_STUD),
      lensMat,
    );
    armL.position.set(0.58 * R6_STUD, 0.1 * R6_STUD, 0.2 * R6_STUD);
    const armR = armL.clone();
    armR.position.x = -0.58 * R6_STUD;
    socket.add(leftLens, rightLens, bridge, armL, armR);
  } else if (id === 'headphones') {
    const padMat = createPlasticBrickMaterial('#1b2a35', { roughness: 0.55 });
    const band = new THREE.Mesh(
      new THREE.TorusGeometry(0.64 * R6_STUD, 0.07 * R6_STUD, 8, 20, Math.PI),
      mat,
    );
    band.position.set(0, 0.08 * R6_STUD, 0);
    const cupL = new THREE.Mesh(
      new THREE.CylinderGeometry(0.24 * R6_STUD, 0.24 * R6_STUD, 0.16 * R6_STUD, 14),
      mat,
    );
    cupL.rotation.z = Math.PI / 2;
    cupL.position.set(0.62 * R6_STUD, 0.02 * R6_STUD, 0);
    const padL = new THREE.Mesh(
      new THREE.CylinderGeometry(0.2 * R6_STUD, 0.2 * R6_STUD, 0.06 * R6_STUD, 14),
      padMat,
    );
    padL.rotation.z = Math.PI / 2;
    padL.position.set(0.55 * R6_STUD, 0.02 * R6_STUD, 0);
    const cupR = cupL.clone();
    cupR.position.x = -0.62 * R6_STUD;
    const padR = padL.clone();
    padR.position.x = -0.55 * R6_STUD;
    socket.add(band, cupL, padL, cupR, padR);
  } else if (id === 'visor') {
    const glassMat = new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.42,
      roughness: 0.12,
      metalness: 0.35,
      transparent: true,
      opacity: 0.52,
    });
    const shield = new THREE.Mesh(
      new THREE.CylinderGeometry(
        0.67 * R6_STUD,
        0.67 * R6_STUD,
        0.24 * R6_STUD,
        16,
        1,
        true,
        -0.95,
        1.9,
      ),
      glassMat,
    );
    shield.position.set(0, 0.08 * R6_STUD, 0);
    socket.add(shield);
  } else if (id === 'domino') {
    const mask = new THREE.Mesh(
      new THREE.BoxGeometry(0.84 * R6_STUD, 0.2 * R6_STUD, 0.06 * R6_STUD),
      mat,
    );
    mask.position.set(0, 0.09 * R6_STUD, 0.64 * R6_STUD);
    socket.add(mask);
  }
}

function buildHatOrnament(socket: THREE.Group, id: string, color: string) {
  disposeGroupContents(socket);
  if (id === 'none') return;

  const mat = createPlasticBrickMaterial(color, { roughness: 0.32 });

  if (id === 'cap') {
    const crown = new THREE.Mesh(
      new THREE.CylinderGeometry(0.56 * R6_STUD, 0.62 * R6_STUD, 0.42 * R6_STUD, 16),
      mat,
    );
    crown.position.y = 0.14 * R6_STUD;
    crown.castShadow = true;
    const brim = new THREE.Mesh(
      new THREE.BoxGeometry(1.12 * R6_STUD, 0.09 * R6_STUD, 0.72 * R6_STUD),
      mat,
    );
    brim.position.set(0, -0.02 * R6_STUD, 0.56 * R6_STUD);
    brim.castShadow = true;
    socket.add(crown, brim);
  } else if (id === 'tophat') {
    const bandMat = createPlasticBrickMaterial('#c4281c', { roughness: 0.35 });
    const brim = new THREE.Mesh(
      new THREE.CylinderGeometry(0.85 * R6_STUD, 0.85 * R6_STUD, 0.08 * R6_STUD, 20),
      mat,
    );
    brim.castShadow = true;
    const band = new THREE.Mesh(
      new THREE.CylinderGeometry(0.58 * R6_STUD, 0.58 * R6_STUD, 0.16 * R6_STUD, 20),
      bandMat,
    );
    band.position.y = 0.11 * R6_STUD;
    const crown = new THREE.Mesh(
      new THREE.CylinderGeometry(0.56 * R6_STUD, 0.55 * R6_STUD, 0.82 * R6_STUD, 20),
      mat,
    );
    crown.position.y = 0.46 * R6_STUD;
    crown.castShadow = true;
    socket.add(brim, band, crown);
  } else if (id === 'valkyrie') {
    const wingMat = createPlasticBrickMaterial('#f2f3f3', { roughness: 0.28 });
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(0.64 * R6_STUD, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.58),
      mat,
    );
    dome.position.y = -0.1 * R6_STUD;
    dome.castShadow = true;
    const crest = new THREE.Mesh(
      new THREE.BoxGeometry(0.14 * R6_STUD, 0.45 * R6_STUD, 0.85 * R6_STUD),
      mat,
    );
    crest.position.set(0, 0.42 * R6_STUD, 0);
    const wingL = new THREE.Mesh(
      new THREE.BoxGeometry(0.12 * R6_STUD, 0.68 * R6_STUD, 0.42 * R6_STUD),
      wingMat,
    );
    wingL.position.set(0.68 * R6_STUD, 0.2 * R6_STUD, -0.05 * R6_STUD);
    wingL.rotation.set(-0.25, 0, -0.32);
    wingL.castShadow = true;
    const wingR = wingL.clone();
    wingR.position.x = -0.68 * R6_STUD;
    wingR.rotation.z = 0.32;
    socket.add(dome, crest, wingL, wingR);
  } else if (id === 'spiky') {
    const base = new THREE.Mesh(
      new THREE.BoxGeometry(1.16 * R6_STUD, 0.32 * R6_STUD, 1.16 * R6_STUD),
      mat,
    );
    base.position.y = 0.08 * R6_STUD;
    base.castShadow = true;
    socket.add(base);
    const spikeGeo = new THREE.ConeGeometry(0.24 * R6_STUD, 0.58 * R6_STUD, 5);
    const offsets: [number, number, number, number, number][] = [
      [0, 0.38, 0.25, 0.35, 0],
      [-0.35, 0.32, 0.1, 0.2, 0.45],
      [0.35, 0.32, 0.1, 0.2, -0.45],
      [-0.25, 0.32, -0.3, -0.35, 0.3],
      [0.25, 0.32, -0.3, -0.35, -0.3],
      [0, 0.42, -0.1, -0.15, 0],
    ];
    for (const [ox, oy, oz, rx, rz] of offsets) {
      const spike = new THREE.Mesh(spikeGeo, mat);
      spike.position.set(ox * R6_STUD, oy * R6_STUD, oz * R6_STUD);
      spike.rotation.set(rx, 0, rz);
      spike.castShadow = true;
      socket.add(spike);
    }
  } else if (id === 'wizard') {
    const starMat = createPlasticBrickMaterial('#f5cd30', { roughness: 0.25 });
    const brim = new THREE.Mesh(
      new THREE.CylinderGeometry(1.0 * R6_STUD, 1.04 * R6_STUD, 0.08 * R6_STUD, 20),
      mat,
    );
    const cone = new THREE.Mesh(
      new THREE.ConeGeometry(0.62 * R6_STUD, 1.25 * R6_STUD, 16),
      mat,
    );
    cone.position.y = 0.62 * R6_STUD;
    cone.rotation.x = -0.12;
    cone.castShadow = true;
    const band = new THREE.Mesh(
      new THREE.CylinderGeometry(0.6 * R6_STUD, 0.62 * R6_STUD, 0.14 * R6_STUD, 16),
      starMat,
    );
    band.position.y = 0.12 * R6_STUD;
    socket.add(brim, cone, band);
  }
}

function buildArmOrnament(socket: THREE.Group, id: string, color: string) {
  disposeGroupContents(socket);
  if (id === 'none') return;

  if (id === 'sword') {
    const bladeMat = createPlasticBrickMaterial(color, { roughness: 0.18, metalness: 0.55 });
    const hiltMat = createPlasticBrickMaterial('#635f62', { roughness: 0.4, metalness: 0.3 });
    const grip = new THREE.Mesh(
      new THREE.CylinderGeometry(0.11 * R6_STUD, 0.11 * R6_STUD, 0.72 * R6_STUD, 10),
      hiltMat,
    );
    grip.rotation.x = Math.PI / 2;
    const guard = new THREE.Mesh(
      new THREE.BoxGeometry(0.62 * R6_STUD, 0.16 * R6_STUD, 0.14 * R6_STUD),
      hiltMat,
    );
    guard.position.z = 0.36 * R6_STUD;
    const blade = new THREE.Mesh(
      new THREE.BoxGeometry(0.16 * R6_STUD, 0.24 * R6_STUD, 2.25 * R6_STUD),
      bladeMat,
    );
    blade.position.z = 1.52 * R6_STUD;
    blade.castShadow = true;
    const tip = new THREE.Mesh(
      new THREE.ConeGeometry(0.17 * R6_STUD, 0.36 * R6_STUD, 4),
      bladeMat,
    );
    tip.rotation.x = Math.PI / 2;
    tip.rotation.z = Math.PI / 4;
    tip.position.z = 2.82 * R6_STUD;
    socket.add(grip, guard, blade, tip);
  } else if (id === 'bloxyCola') {
    const canMat = createPlasticBrickMaterial(color, { roughness: 0.25, metalness: 0.35 });
    const lidMat = createPlasticBrickMaterial('#d1d5db', { roughness: 0.2, metalness: 0.7 });
    const can = new THREE.Mesh(
      new THREE.CylinderGeometry(0.24 * R6_STUD, 0.24 * R6_STUD, 0.68 * R6_STUD, 14),
      canMat,
    );
    can.position.set(0, 0.05 * R6_STUD, 0.02 * R6_STUD);
    can.castShadow = true;
    const topRim = new THREE.Mesh(
      new THREE.CylinderGeometry(0.21 * R6_STUD, 0.24 * R6_STUD, 0.08 * R6_STUD, 14),
      lidMat,
    );
    topRim.position.set(0, 0.41 * R6_STUD, 0.02 * R6_STUD);
    const stripe = new THREE.Mesh(
      new THREE.CylinderGeometry(0.245 * R6_STUD, 0.245 * R6_STUD, 0.18 * R6_STUD, 14),
      createPlasticBrickMaterial('#f5cd30', { roughness: 0.3 }),
    );
    stripe.position.set(0, 0.08 * R6_STUD, 0.02 * R6_STUD);
    socket.add(can, topRim, stripe);
  } else if (id === 'shield') {
    const shieldMat = createPlasticBrickMaterial(color, { roughness: 0.3 });
    const rimMat = createPlasticBrickMaterial('#f5cd30', { roughness: 0.25, metalness: 0.35 });
    const board = new THREE.Mesh(
      new THREE.BoxGeometry(0.18 * R6_STUD, 1.45 * R6_STUD, 1.15 * R6_STUD),
      shieldMat,
    );
    board.position.set(-0.32 * R6_STUD, 0.45 * R6_STUD, 0.1 * R6_STUD);
    board.castShadow = true;
    const boss = new THREE.Mesh(
      new THREE.BoxGeometry(0.24 * R6_STUD, 0.42 * R6_STUD, 0.42 * R6_STUD),
      rimMat,
    );
    boss.position.set(-0.34 * R6_STUD, 0.45 * R6_STUD, 0.1 * R6_STUD);
    socket.add(board, boss);
  } else if (id === 'gauntlet') {
    const gauntMat = createPlasticBrickMaterial(color, { roughness: 0.25, metalness: 0.4 });
    const fist = new THREE.Mesh(
      new THREE.BoxGeometry(1.18 * R6_STUD, 0.85 * R6_STUD, 1.18 * R6_STUD),
      gauntMat,
    );
    fist.position.set(0, 0.22 * R6_STUD, -0.35 * R6_STUD);
    fist.castShadow = true;
    socket.add(fist);
  }
}

function buildBackOrnament(
  socket: THREE.Group,
  id: string,
  color: string,
): {
  capePivot: THREE.Group | null;
  leftWing: THREE.Group | null;
  rightWing: THREE.Group | null;
} {
  disposeGroupContents(socket);
  if (id === 'none') {
    return { capePivot: null, leftWing: null, rightWing: null };
  }

  const mat = createPlasticBrickMaterial(color, { roughness: 0.32 });

  if (id === 'jetpack') {
    const metalMat = createPlasticBrickMaterial('#a3a2a5', { roughness: 0.25, metalness: 0.45 });
    const flameMat = new THREE.MeshStandardMaterial({
      color: '#ff9500',
      emissive: '#ff5500',
      emissiveIntensity: 0.9,
      roughness: 0.3,
    });
    for (const side of [-0.42, 0.42]) {
      const tank = new THREE.Mesh(
        new THREE.CylinderGeometry(0.28 * R6_STUD, 0.28 * R6_STUD, 1.35 * R6_STUD, 12),
        mat,
      );
      tank.position.set(side * R6_STUD, 0, -0.32 * R6_STUD);
      tank.castShadow = true;
      const cap = new THREE.Mesh(
        new THREE.SphereGeometry(0.28 * R6_STUD, 12, 8),
        metalMat,
      );
      cap.position.set(side * R6_STUD, 0.68 * R6_STUD, -0.32 * R6_STUD);
      const nozzle = new THREE.Mesh(
        new THREE.CylinderGeometry(0.16 * R6_STUD, 0.26 * R6_STUD, 0.26 * R6_STUD, 12),
        metalMat,
      );
      nozzle.position.set(side * R6_STUD, -0.78 * R6_STUD, -0.32 * R6_STUD);
      const glow = new THREE.Mesh(
        new THREE.ConeGeometry(0.15 * R6_STUD, 0.35 * R6_STUD, 10),
        flameMat,
      );
      glow.rotation.x = Math.PI;
      glow.position.set(side * R6_STUD, -1.04 * R6_STUD, -0.32 * R6_STUD);
      socket.add(tank, cap, nozzle, glow);
    }
    const bridge = new THREE.Mesh(
      new THREE.BoxGeometry(1.1 * R6_STUD, 0.45 * R6_STUD, 0.25 * R6_STUD),
      metalMat,
    );
    bridge.position.set(0, 0.1 * R6_STUD, -0.14 * R6_STUD);
    socket.add(bridge);
  } else if (id === 'wings') {
    let leftWing: THREE.Group | null = null;
    let rightWing: THREE.Group | null = null;
    for (const side of [-1, 1] as const) {
      const wing = new THREE.Group();
      wing.position.set(side * 0.2 * R6_STUD, 0.25 * R6_STUD, -0.15 * R6_STUD);
      wing.rotation.y = side * -0.45;
      const upper = new THREE.Mesh(
        new THREE.BoxGeometry(1.45 * R6_STUD, 0.65 * R6_STUD, 0.14 * R6_STUD),
        mat,
      );
      upper.position.set(side * 0.72 * R6_STUD, 0.22 * R6_STUD, 0);
      upper.rotation.z = side * 0.25;
      upper.castShadow = true;
      const lower = new THREE.Mesh(
        new THREE.BoxGeometry(1.05 * R6_STUD, 0.45 * R6_STUD, 0.12 * R6_STUD),
        mat,
      );
      lower.position.set(side * 0.55 * R6_STUD, -0.3 * R6_STUD, 0);
      lower.rotation.z = side * 0.12;
      lower.castShadow = true;
      wing.add(upper, lower);
      socket.add(wing);
      if (side === 1) leftWing = wing;
      else rightWing = wing;
    }
    return { capePivot: null, leftWing, rightWing };
  } else if (id === 'backpack') {
    const flapMat = createPlasticBrickMaterial('#635f62', { roughness: 0.4 });
    const pack = new THREE.Mesh(
      new THREE.BoxGeometry(1.45 * R6_STUD, 1.48 * R6_STUD, 0.65 * R6_STUD),
      mat,
    );
    pack.position.set(0, -0.04 * R6_STUD, -0.34 * R6_STUD);
    pack.castShadow = true;
    const pocket = new THREE.Mesh(
      new THREE.BoxGeometry(1.1 * R6_STUD, 0.62 * R6_STUD, 0.24 * R6_STUD),
      flapMat,
    );
    pocket.position.set(0, -0.32 * R6_STUD, -0.72 * R6_STUD);
    socket.add(pack, pocket);
  } else if (id === 'cape') {
    const capeMat = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.55,
      side: THREE.DoubleSide,
    });
    // Pivot at the shoulder clasps so secondary motion swings the cape realistically
    const capePivot = new THREE.Group();
    capePivot.position.set(0, 0.78 * R6_STUD, -0.06 * R6_STUD);
    capePivot.rotation.x = 0.12;
    socket.add(capePivot);

    const drape = new THREE.Mesh(
      new THREE.BoxGeometry(1.85 * R6_STUD, 2.7 * R6_STUD, 0.08 * R6_STUD),
      capeMat,
    );
    drape.position.set(0, -1.3 * R6_STUD, -0.1 * R6_STUD);
    drape.castShadow = true;
    capePivot.add(drape);

    const claspL = new THREE.Mesh(
      new THREE.BoxGeometry(0.28 * R6_STUD, 0.22 * R6_STUD, 0.18 * R6_STUD),
      createPlasticBrickMaterial('#f5cd30', { roughness: 0.25 }),
    );
    claspL.position.set(-0.72 * R6_STUD, 0.78 * R6_STUD, -0.05 * R6_STUD);
    const claspR = claspL.clone();
    claspR.position.x = 0.72 * R6_STUD;
    socket.add(claspL, claspR);
    return { capePivot, leftWing: null, rightWing: null };
  } else if (id === 'katana') {
    const bladeMat = createPlasticBrickMaterial('#d1d5db', { roughness: 0.2, metalness: 0.55 });
    for (const side of [-1, 1]) {
      const scabbard = new THREE.Mesh(
        new THREE.BoxGeometry(0.16 * R6_STUD, 2.55 * R6_STUD, 0.16 * R6_STUD),
        mat,
      );
      scabbard.position.set(0, 0.05 * R6_STUD, -0.18 * R6_STUD);
      scabbard.rotation.z = side * 0.58;
      scabbard.castShadow = true;
      const hilt = new THREE.Mesh(
        new THREE.BoxGeometry(0.2 * R6_STUD, 0.55 * R6_STUD, 0.2 * R6_STUD),
        bladeMat,
      );
      hilt.position.set(side * -0.82 * R6_STUD, 1.24 * R6_STUD, -0.18 * R6_STUD);
      hilt.rotation.z = side * 0.58;
      socket.add(scabbard, hilt);
    }
  }
  return { capePivot: null, leftWing: null, rightWing: null };
}

function buildLegsOrnaments(
  hipsSocket: THREE.Group,
  leftLegSocket: THREE.Group,
  rightLegSocket: THREE.Group,
  id: string,
  color: string,
) {
  disposeGroupContents(hipsSocket);
  disposeGroupContents(leftLegSocket);
  disposeGroupContents(rightLegSocket);
  if (id === 'none') return;

  const mat = createPlasticBrickMaterial(color, { roughness: 0.34 });
  const buckleMat = createPlasticBrickMaterial('#f5cd30', { roughness: 0.25, metalness: 0.4 });

  if (id === 'belt') {
    const belt = new THREE.Mesh(
      new THREE.BoxGeometry(2.14 * R6_STUD, 0.32 * R6_STUD, 1.14 * R6_STUD),
      mat,
    );
    belt.position.set(0, -0.86 * R6_STUD, 0);
    belt.castShadow = true;
    const buckle = new THREE.Mesh(
      new THREE.BoxGeometry(0.45 * R6_STUD, 0.36 * R6_STUD, 0.16 * R6_STUD),
      buckleMat,
    );
    buckle.position.set(0, -0.86 * R6_STUD, 0.56 * R6_STUD);
    hipsSocket.add(belt, buckle);
  } else if (id === 'kneepads') {
    for (const sock of [leftLegSocket, rightLegSocket]) {
      const pad = new THREE.Mesh(
        new THREE.BoxGeometry(1.08 * R6_STUD, 0.42 * R6_STUD, 0.24 * R6_STUD),
        mat,
      );
      pad.position.set(0, 0.05 * R6_STUD, 0.48 * R6_STUD);
      pad.castShadow = true;
      sock.add(pad);
    }
  } else if (id === 'thrusters') {
    const glowMat = new THREE.MeshStandardMaterial({
      color: '#38bdf8',
      emissive: '#0284c7',
      emissiveIntensity: 0.7,
      roughness: 0.2,
    });
    for (const sock of [leftLegSocket, rightLegSocket]) {
      const cuff = new THREE.Mesh(
        new THREE.BoxGeometry(1.16 * R6_STUD, 0.48 * R6_STUD, 1.16 * R6_STUD),
        mat,
      );
      cuff.position.set(0, -0.72 * R6_STUD, 0);
      cuff.castShadow = true;
      const vent = new THREE.Mesh(
        new THREE.BoxGeometry(0.42 * R6_STUD, 0.26 * R6_STUD, 0.24 * R6_STUD),
        glowMat,
      );
      vent.position.set(0, -0.72 * R6_STUD, -0.56 * R6_STUD);
      sock.add(cuff, vent);
    }
  } else if (id === 'pouches') {
    const belt = new THREE.Mesh(
      new THREE.BoxGeometry(2.12 * R6_STUD, 0.24 * R6_STUD, 1.12 * R6_STUD),
      mat,
    );
    belt.position.set(0, -0.88 * R6_STUD, 0);
    hipsSocket.add(belt);
    const pouchL = new THREE.Mesh(
      new THREE.BoxGeometry(0.28 * R6_STUD, 0.48 * R6_STUD, 0.62 * R6_STUD),
      mat,
    );
    pouchL.position.set(0.58 * R6_STUD, 0.48 * R6_STUD, 0);
    const pouchR = pouchL.clone();
    pouchR.position.x = -0.58 * R6_STUD;
    leftLegSocket.add(pouchL);
    rightLegSocket.add(pouchR);
  }
}
