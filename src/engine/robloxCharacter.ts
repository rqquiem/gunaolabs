import * as THREE from 'three';
import { buildRoblox3DFaceRig, Roblox3DFaceRig } from './robloxFaceRig';
import {
  createDefaultClothingConfig,
  createDefaultHairConfig,
  getHatTuckProfile,
  normalizeOrnaments,
} from './robloxCatalog';
import {
  createPlasticBrickMaterial,
  createStudBrickMaterial,
  StudTexturePair,
} from './robloxTextures';
import {
  AccessoryAnimHandle,
  applyAccessoryFit,
  buildArmAccessory,
  buildBackAccessory,
  buildClothingRig,
  buildHairRig,
  buildHatAccessory,
  buildHeadAccessory,
  buildLegsAccessories,
  buildNeckAccessory,
  buildShoulderAccessory,
  buildWaistAccessory,
  createArmClothingMaterial,
  createLegClothingMaterials,
  createTorsoClothingMaterials,
  disposeGroupChildren,
  disposeMaterialSet,
  RobloxClothingRig,
  RobloxHairRig,
} from './robloxWardrobe';
import { animateHeldItemGroup, buildItemModelGroup } from './robloxItems';
import {
  ClothingConfig,
  EvaluatedFaceState,
  EvaluatedHeldItems,
  EvaluatedPose,
  FaceRigConfig,
  HairConfig,
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
  hairSocket: THREE.Group;
  handSockets: Record<HandSlot, THREE.Group>;
  faceRig: Roblox3DFaceRig;
  selectionRing: THREE.Mesh;
  applyPose: (pose: EvaluatedPose) => void;
  applyHeadLookAt: (yawRad: number, pitchRad: number, weight: number) => void;
  applyFaceState: (
    face: EvaluatedFaceState,
    gazeOverride?: { x: number; y: number } | null,
  ) => void;
  applySecondaryMotion: (sec: SecondaryMotionState, time?: number) => void;
  setBodyColors: (colors: R6BodyColors) => void;
  setOrnaments: (ornaments: R6Ornaments) => void;
  setHair: (hair: HairConfig) => void;
  setClothing: (clothing: ClothingConfig) => void;
  setHeldItems: (heldItems: EvaluatedHeldItems) => void;
  setFaceConfig: (config: FaceRigConfig) => void;
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
  initialHair: HairConfig = createDefaultHairConfig(),
  initialClothing: ClothingConfig = createDefaultClothingConfig(),
  maxAnisotropy = 4,
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

  let currentBodyColors: R6BodyColors = { ...initialColors };
  let currentClothing: ClothingConfig = { ...initialClothing };
  let currentHair: HairConfig = { ...initialHair };
  let currentHatId = initialOrnaments.hat.id;

  // Per-part base plastic/stud materials (used when naked / no clothing in that slot)
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

  // --- ENHANCED R6 HIP / ROOT MOTION PIVOT ---
  const hipPivot = new THREE.Group();
  hipPivot.position.set(0, TORSO_BASE_Y, 0);
  root.add(hipPivot);

  const hipClothingGroup = new THREE.Group();
  hipPivot.add(hipClothingGroup);

  // --- TORSO (2 x 2 x 1 studs) ---
  const torsoPivot = new THREE.Group();
  torsoPivot.position.set(0, 0, 0);
  hipPivot.add(torsoPivot);

  const torsoMesh = new THREE.Mesh<
    THREE.BoxGeometry,
    THREE.Material | THREE.Material[]
  >(
    new THREE.BoxGeometry(2 * R6_STUD, 2 * R6_STUD, 1 * R6_STUD),
    partMaterials.torso,
  );
  torsoMesh.castShadow = true;
  torsoMesh.receiveShadow = true;
  torsoPivot.add(torsoMesh);

  const torsoTrimGroup = new THREE.Group();
  torsoPivot.add(torsoTrimGroup);

  // --- HEAD (rounded classic cylinder + 3D Sculpted Face Rig) ---
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

  const leftArmMesh = new THREE.Mesh<
    THREE.BoxGeometry,
    THREE.Material | THREE.Material[]
  >(
    new THREE.BoxGeometry(1 * R6_STUD, 2 * R6_STUD, 1 * R6_STUD),
    partMaterials.leftArm,
  );
  leftArmMesh.position.set(0, -0.85 * R6_STUD, 0);
  leftArmMesh.castShadow = true;
  leftArmMesh.receiveShadow = true;
  leftArmPivot.add(leftArmMesh);

  const leftArmTrimGroup = new THREE.Group();
  leftArmTrimGroup.position.set(0, -0.85 * R6_STUD, 0);
  leftArmPivot.add(leftArmTrimGroup);

  // --- RIGHT ARM (-X side when facing +Z) ---
  const rightArmPivot = new THREE.Group();
  rightArmPivot.position.set(-1.52 * R6_STUD, 0.85 * R6_STUD, 0);
  torsoPivot.add(rightArmPivot);

  const rightArmMesh = new THREE.Mesh<
    THREE.BoxGeometry,
    THREE.Material | THREE.Material[]
  >(
    new THREE.BoxGeometry(1 * R6_STUD, 2 * R6_STUD, 1 * R6_STUD),
    partMaterials.rightArm,
  );
  rightArmMesh.position.set(0, -0.85 * R6_STUD, 0);
  rightArmMesh.castShadow = true;
  rightArmMesh.receiveShadow = true;
  rightArmPivot.add(rightArmMesh);

  const rightArmTrimGroup = new THREE.Group();
  rightArmTrimGroup.position.set(0, -0.85 * R6_STUD, 0);
  rightArmPivot.add(rightArmTrimGroup);

  // --- LEFT LEG (+X side) ---
  const leftLegPivot = new THREE.Group();
  leftLegPivot.position.set(0.51 * R6_STUD, -1.0 * R6_STUD, 0);
  hipPivot.add(leftLegPivot);

  const leftLegMesh = new THREE.Mesh<
    THREE.BoxGeometry,
    THREE.Material | THREE.Material[]
  >(
    new THREE.BoxGeometry(1 * R6_STUD, 2 * R6_STUD, 1 * R6_STUD),
    partMaterials.leftLeg,
  );
  leftLegMesh.position.set(0, -1.0 * R6_STUD, 0);
  leftLegMesh.castShadow = true;
  leftLegMesh.receiveShadow = true;
  leftLegPivot.add(leftLegMesh);

  const leftLegTrimGroup = new THREE.Group();
  leftLegTrimGroup.position.set(0, -1.0 * R6_STUD, 0);
  leftLegPivot.add(leftLegTrimGroup);

  // --- RIGHT LEG (-X side) ---
  const rightLegPivot = new THREE.Group();
  rightLegPivot.position.set(-0.51 * R6_STUD, -1.0 * R6_STUD, 0);
  hipPivot.add(rightLegPivot);

  const rightLegMesh = new THREE.Mesh<
    THREE.BoxGeometry,
    THREE.Material | THREE.Material[]
  >(
    new THREE.BoxGeometry(1 * R6_STUD, 2 * R6_STUD, 1 * R6_STUD),
    partMaterials.rightLeg,
  );
  rightLegMesh.position.set(0, -1.0 * R6_STUD, 0);
  rightLegMesh.castShadow = true;
  rightLegMesh.receiveShadow = true;
  rightLegPivot.add(rightLegMesh);

  const rightLegTrimGroup = new THREE.Group();
  rightLegTrimGroup.position.set(0, -1.0 * R6_STUD, 0);
  rightLegPivot.add(rightLegTrimGroup);

  const pivots: Record<R6BodyPartId, THREE.Group> = {
    head: headPivot,
    torso: torsoPivot,
    leftArm: leftArmPivot,
    rightArm: rightArmPivot,
    leftLeg: leftLegPivot,
    rightLeg: rightLegPivot,
  };

  // --- SOCKETS (Head, Hat, Hair, Face, Neck, Shoulder, Arm, Back, Waist, Legs) ---
  const headSocket = new THREE.Group();
  headSocket.position.set(0, 0.56 * R6_STUD, 0);
  headPivot.add(headSocket);
  const headFitPivot = new THREE.Group();
  headSocket.add(headFitPivot);

  const hairSocket = new THREE.Group();
  hairSocket.position.set(0, 0.56 * R6_STUD, 0);
  headPivot.add(hairSocket);

  const hatSocket = new THREE.Group();
  hatSocket.position.set(0, 1.06 * R6_STUD, 0);
  headPivot.add(hatSocket);
  const hatFitPivot = new THREE.Group();
  hatSocket.add(hatFitPivot);

  const faceSocket = new THREE.Group();
  faceSocket.position.set(0, 0.56 * R6_STUD, 0.59 * R6_STUD);
  headPivot.add(faceSocket);

  const neckSocket = new THREE.Group();
  neckSocket.position.set(0, 0.98 * R6_STUD, 0);
  torsoPivot.add(neckSocket);
  const neckFitPivot = new THREE.Group();
  neckSocket.add(neckFitPivot);

  const shoulderSocket = new THREE.Group();
  shoulderSocket.position.set(0, 1.02 * R6_STUD, 0);
  torsoPivot.add(shoulderSocket);
  const shoulderFitPivot = new THREE.Group();
  shoulderSocket.add(shoulderFitPivot);

  const armSocket = new THREE.Group();
  armSocket.position.set(0, -1.78 * R6_STUD, 0.35 * R6_STUD);
  rightArmPivot.add(armSocket);
  const armFitPivot = new THREE.Group();
  armSocket.add(armFitPivot);

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
  const backFitPivot = new THREE.Group();
  backSocket.add(backFitPivot);

  const waistSocket = new THREE.Group();
  waistSocket.position.set(0, -0.82 * R6_STUD, 0);
  hipPivot.add(waistSocket);
  const waistFitPivot = new THREE.Group();
  waistSocket.add(waistFitPivot);

  const legsSocket = new THREE.Group();
  hipPivot.add(legsSocket);
  const legsFitPivot = new THREE.Group();
  legsSocket.add(legsFitPivot);

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
    neck: neckSocket,
    shoulder: shoulderSocket,
    arm: armSocket,
    back: backSocket,
    waist: waistSocket,
    legs: legsSocket,
  };

  // --- DYNAMIC CLOTHING MATERIAL & RIG MANAGEMENT ---
  let dynamicTorsoMats: THREE.Material[] | null = null;
  let dynamicLeftArmMat: THREE.Material | null = null;
  let dynamicRightArmMat: THREE.Material | null = null;
  let dynamicLeftLegMats: THREE.Material[] | null = null;
  let dynamicRightLegMats: THREE.Material[] | null = null;
  let currentClothingSignature = '';
  let clothingRig: RobloxClothingRig = {
    applySecondaryMotion: () => {},
  };

  const applyClothingAndSkinMaterials = (forceRebuild = false) => {
    const sig = JSON.stringify({ clothing: currentClothing, colors: currentBodyColors });
    if (!forceRebuild && sig === currentClothingSignature) return;
    currentClothingSignature = sig;

    // Dispose old dynamic clothing materials
    if (dynamicTorsoMats) {
      disposeMaterialSet(dynamicTorsoMats);
      dynamicTorsoMats = null;
    }
    if (dynamicLeftArmMat) {
      disposeMaterialSet(dynamicLeftArmMat);
      dynamicLeftArmMat = null;
    }
    if (dynamicRightArmMat) {
      disposeMaterialSet(dynamicRightArmMat);
      dynamicRightArmMat = null;
    }
    if (dynamicLeftLegMats) {
      disposeMaterialSet(dynamicLeftLegMats);
      dynamicLeftLegMats = null;
    }
    if (dynamicRightLegMats) {
      disposeMaterialSet(dynamicRightLegMats);
      dynamicRightLegMats = null;
    }

    // Torso & Arms
    if (currentClothing.shirtId === 'none') {
      torsoMesh.material = partMaterials.torso;
      leftArmMesh.material = partMaterials.leftArm;
      rightArmMesh.material = partMaterials.rightArm;
    } else {
      dynamicTorsoMats = createTorsoClothingMaterials(
        currentClothing,
        currentBodyColors,
        maxAnisotropy,
      );
      torsoMesh.material = dynamicTorsoMats;
      dynamicLeftArmMat = createArmClothingMaterial(
        currentClothing,
        currentBodyColors.leftArm,
        maxAnisotropy,
      );
      leftArmMesh.material = dynamicLeftArmMat;
      dynamicRightArmMat = createArmClothingMaterial(
        currentClothing,
        currentBodyColors.rightArm,
        maxAnisotropy,
      );
      rightArmMesh.material = dynamicRightArmMat;
    }

    // Legs & Footwear
    if (currentClothing.pantsId === 'none' && currentClothing.footwearId === 'none') {
      leftLegMesh.material = partMaterials.leftLeg;
      rightLegMesh.material = partMaterials.rightLeg;
    } else {
      dynamicLeftLegMats = createLegClothingMaterials(
        currentClothing,
        currentBodyColors.leftLeg,
        maxAnisotropy,
      );
      leftLegMesh.material = dynamicLeftLegMats;
      dynamicRightLegMats = createLegClothingMaterials(
        currentClothing,
        currentBodyColors.rightLeg,
        maxAnisotropy,
      );
      rightLegMesh.material = dynamicRightLegMats;
    }

    clothingRig = buildClothingRig(
      currentClothing,
      torsoTrimGroup,
      hipClothingGroup,
      leftArmTrimGroup,
      rightArmTrimGroup,
      leftLegTrimGroup,
      rightLegTrimGroup,
      maxAnisotropy,
    );
  };

  applyClothingAndSkinMaterials(true);

  // --- HAIR RIG ---
  let currentHairJson = '';
  let hairRig: RobloxHairRig = buildHairRig(hairSocket, currentHair, currentHatId);
  currentHairJson = JSON.stringify(currentHair);

  const rebuildHair = (hair: HairConfig) => {
    const nextJson = JSON.stringify(hair);
    if (nextJson === currentHairJson) return;
    currentHairJson = nextJson;
    currentHair = { ...hair };
    hairRig = buildHairRig(hairSocket, currentHair, currentHatId);
  };

  // --- ORNAMENTS & SCULPTED ACCESSORIES ---
  const slotModelSignatures: Record<string, string> = {};
  const slotAnimHandles: Record<string, AccessoryAnimHandle> = {};
  let currentArmId = initialOrnaments.arm.id;
  let currentHandSignatures: Record<HandSlot, string> = { right: '', left: '' };
  let rightHandHasActiveItem = false;

  const modelSig = (sel: { id: string; color: string; accentColor?: string }) =>
    `${sel.id}|${sel.color}|${sel.accentColor ?? ''}`;

  const rebuildOrnaments = (ornaments: R6Ornaments) => {
    const norm = normalizeOrnaments(ornaments);
    currentHatId = norm.hat.id;
    currentArmId = norm.arm.id;

    // 1. Head eyewear / masks
    const headSig = modelSig(norm.head);
    if (headSig !== slotModelSignatures.head) {
      slotModelSignatures.head = headSig;
      slotAnimHandles.head = buildHeadAccessory(
        headFitPivot,
        norm.head.id,
        norm.head.color,
        norm.head.accentColor,
      );
    }
    applyAccessoryFit(headFitPivot, norm.head.fit);

    // 2. Hats & headwear
    const hatSig = modelSig(norm.hat);
    if (hatSig !== slotModelSignatures.hat) {
      slotModelSignatures.hat = hatSig;
      slotAnimHandles.hat = buildHatAccessory(
        hatFitPivot,
        norm.hat.id,
        norm.hat.color,
        norm.hat.accentColor,
      );
      hairRig.applyHatTuck(getHatTuckProfile(currentHatId));
    }
    applyAccessoryFit(hatFitPivot, norm.hat.fit);

    // 3. Neck accessories
    const neckSig = modelSig(norm.neck);
    if (neckSig !== slotModelSignatures.neck) {
      slotModelSignatures.neck = neckSig;
      slotAnimHandles.neck = buildNeckAccessory(
        neckFitPivot,
        norm.neck.id,
        norm.neck.color,
        norm.neck.accentColor,
      );
    }
    applyAccessoryFit(neckFitPivot, norm.neck.fit);

    // 4. Shoulder pals & pauldrons
    const shoulderSig = modelSig(norm.shoulder);
    if (shoulderSig !== slotModelSignatures.shoulder) {
      slotModelSignatures.shoulder = shoulderSig;
      slotAnimHandles.shoulder = buildShoulderAccessory(
        shoulderFitPivot,
        norm.shoulder.id,
        norm.shoulder.color,
        norm.shoulder.accentColor,
      );
    }
    applyAccessoryFit(shoulderFitPivot, norm.shoulder.fit);

    // 5. Arm accessories
    const armSig = modelSig(norm.arm);
    if (armSig !== slotModelSignatures.arm) {
      slotModelSignatures.arm = armSig;
      slotAnimHandles.arm = buildArmAccessory(
        armFitPivot,
        norm.arm.id,
        norm.arm.color,
        norm.arm.accentColor,
      );
    }
    applyAccessoryFit(armFitPivot, norm.arm.fit);

    const isLegacyHeldOrnament =
      norm.arm.id === 'sword' ||
      norm.arm.id === 'bloxyCola' ||
      norm.arm.id === 'shield';
    armSocket.visible = !(rightHandHasActiveItem && isLegacyHeldOrnament);

    // 6. Back accessories
    const backSig = modelSig(norm.back);
    if (backSig !== slotModelSignatures.back) {
      slotModelSignatures.back = backSig;
      slotAnimHandles.back = buildBackAccessory(
        backFitPivot,
        norm.back.id,
        norm.back.color,
        norm.back.accentColor,
      );
    }
    applyAccessoryFit(backFitPivot, norm.back.fit);

    // 7. Waist & bags
    const waistSig = modelSig(norm.waist);
    if (waistSig !== slotModelSignatures.waist) {
      slotModelSignatures.waist = waistSig;
      slotAnimHandles.waist = buildWaistAccessory(
        waistFitPivot,
        norm.waist.id,
        norm.waist.color,
        norm.waist.accentColor,
      );
    }
    applyAccessoryFit(waistFitPivot, norm.waist.fit);

    // 8. Legs & belts
    const legsSig = modelSig(norm.legs);
    if (legsSig !== slotModelSignatures.legs) {
      slotModelSignatures.legs = legsSig;
      slotAnimHandles.legs = buildLegsAccessories(
        legsFitPivot,
        legLeftGuardSocket,
        legRightGuardSocket,
        norm.legs.id,
        norm.legs.color,
        norm.legs.accentColor,
      );
    }
    applyAccessoryFit(legsFitPivot, norm.legs.fit);
    const legScale = norm.legs.fit?.scale ?? 1;
    const legOffY = (norm.legs.fit?.offsetY ?? 0) * R6_STUD;
    legLeftGuardSocket.position.set(0, -1.0 * R6_STUD + legOffY, 0);
    legRightGuardSocket.position.set(0, -1.0 * R6_STUD + legOffY, 0);
    legLeftGuardSocket.scale.setScalar(legScale);
    legRightGuardSocket.scale.setScalar(legScale);
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
      disposeGroupChildren(gripPivot);
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
    const legacy =
      currentArmId === 'sword' ||
      currentArmId === 'bloxyCola' ||
      currentArmId === 'shield';
    armSocket.visible = !(rightHandHasActiveItem && legacy);
  };

  let baseHeadRot: [number, number, number] = [0, 0, 0];
  let lastLeftLegPitch = 0;
  let lastRightLegPitch = 0;

  const applyPose = (pose: EvaluatedPose) => {
    const hipOff = pose.hipOffset ?? [0, pose.torsoOffsetY, 0];
    const hipTilt = pose.hipTilt ?? [0, 0, 0];
    const squash = pose.squashY ?? 1;
    const invXZ = 1 / Math.sqrt(Math.max(0.75, squash));

    hipPivot.position.set(hipOff[0], TORSO_BASE_Y + hipOff[1], hipOff[2]);
    hipPivot.rotation.set(hipTilt[0], hipTilt[1], hipTilt[2]);
    hipPivot.scale.set(invXZ, squash, invXZ);

    const lift = Math.max(0, hipOff[1]);
    const shadowScale = Math.max(0.55, 1 - lift * 0.25);
    shadowPlane.scale.set(shadowScale, shadowScale, 1);

    for (const part of R6_BODY_PARTS) {
      const r = pose.joints[part];
      pivots[part].rotation.set(r[0], r[1], r[2]);
    }
    baseHeadRot = [pose.joints.head[0], pose.joints.head[1], pose.joints.head[2]];
    lastLeftLegPitch = pose.joints.leftLeg[0];
    lastRightLegPitch = pose.joints.rightLeg[0];
  };

  const applyHeadLookAt = (yawRad: number, pitchRad: number, weight: number) => {
    if (weight <= 0.001) return;
    headPivot.rotation.set(
      baseHeadRot[0] + pitchRad * weight,
      baseHeadRot[1] + yawRad * weight,
      baseHeadRot[2],
    );
  };

  const applySecondaryMotion = (sec: SecondaryMotionState, time = 0) => {
    hatSocket.rotation.set(sec.hatLagX, 0, sec.hatLagZ);
    hairRig.applyPhysics(sec.hairPitch, sec.hairRoll);
    clothingRig.applySecondaryMotion(sec, lastLeftLegPitch, lastRightLegPitch);

    for (const handle of Object.values(slotAnimHandles)) {
      handle.update?.(sec, time);
    }

    armSocket.rotation.x = sec.propSwing;
    rightHandSocket.rotation.x = sec.propSwing;
    leftHandSocket.rotation.x = -sec.propSwing * 0.7;

    if (rightGripPivot.visible) {
      animateHeldItemGroup(rightGripPivot, time);
    }
    if (leftGripPivot.visible) {
      animateHeldItemGroup(leftGripPivot, time);
    }
  };

  const setBodyColors = (colors: R6BodyColors) => {
    currentBodyColors = { ...colors };
    for (const part of R6_BODY_PARTS) {
      partMaterials[part].color.set(colors[part]);
    }
    faceRig.setSkinColor(colors.head);
    applyClothingAndSkinMaterials(false);
  };

  const setClothing = (clothing: ClothingConfig) => {
    currentClothing = { ...clothing };
    applyClothingAndSkinMaterials(false);
  };

  return {
    root,
    hipPivot,
    torsoPivot,
    pivots,
    sockets,
    hairSocket,
    handSockets,
    faceRig,
    selectionRing,
    applyPose,
    applyHeadLookAt,
    applyFaceState: (face, gazeOverride) => faceRig.applyFaceState(face, gazeOverride),
    applySecondaryMotion,
    setBodyColors,
    setOrnaments: rebuildOrnaments,
    setHair: rebuildHair,
    setClothing,
    setHeldItems,
    setFaceConfig: (config) => faceRig.setConfig(config),
  };
}
