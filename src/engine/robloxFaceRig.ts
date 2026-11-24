import * as THREE from 'three';
import { createPlasticBrickMaterial } from './robloxTextures';
import { EvaluatedFaceState, FaceRigConfig } from './types';

const R6_STUD = 0.55;
const HEAD_R = 0.58 * R6_STUD;
const EYE_ANGLE = 0.35; // radians left/right along front cylinder curvature

export interface Roblox3DFaceRig {
  root: THREE.Group;
  setConfig: (config: FaceRigConfig) => void;
  setSkinColor: (hex: string) => void;
  applyFaceState: (
    state: EvaluatedFaceState,
    gazeOverride?: { x: number; y: number } | null,
  ) => void;
  dispose: () => void;
}

interface EyeNodes {
  socket: THREE.Group;
  eyeScaleGroup: THREE.Group;
  pupilGroup: THREE.Group;
  upperLid: THREE.Mesh;
  lowerLid: THREE.Mesh;
  cyberBar?: THREE.Mesh;
  starMesh?: THREE.Mesh;
}

interface BrowNodes {
  leftPivot: THREE.Group;
  rightPivot: THREE.Group;
}

interface MouthNodes {
  root: THREE.Group;
  cavityGroup: THREE.Group;
  cavityMesh: THREE.Mesh;
  upperTeeth: THREE.Mesh;
  tongue: THREE.Mesh;
  lipSegments: THREE.Mesh[];
  cyberBars: THREE.Mesh[];
}

interface CheekNodes {
  root: THREE.Group;
  blushLeft?: THREE.Mesh;
  blushRight?: THREE.Mesh;
}

function disposeChildren(group: THREE.Group) {
  while (group.children.length > 0) {
    const child = group.children[0];
    group.remove(child);
    child.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        mesh.geometry?.dispose();
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        mats.forEach((m) => m?.dispose());
      }
    });
  }
}

function placeOnCylinder(
  obj: THREE.Object3D,
  angleRad: number,
  yOffset: number,
  radiusOffset: number,
) {
  const r = HEAD_R + radiusOffset;
  obj.position.set(Math.sin(angleRad) * r, yOffset, Math.cos(angleRad) * r);
  obj.rotation.set(0, angleRad, 0);
}

export function buildRoblox3DFaceRig(
  initialConfig: FaceRigConfig,
  initialSkinHex: string,
): Roblox3DFaceRig {
  const root = new THREE.Group();
  // Centered at the middle of the rounded R6 head cylinder
  root.position.set(0, 0.56 * R6_STUD, 0);

  let currentConfigJson = '';
  let currentSkinColor = initialSkinHex;
  let currentConfig: FaceRigConfig = { ...initialConfig };

  let leftEye: EyeNodes | null = null;
  let rightEye: EyeNodes | null = null;
  let brows: BrowNodes | null = null;
  let mouth: MouthNodes | null = null;
  let cheeks: CheekNodes | null = null;
  let skinEyelidMaterials: THREE.MeshStandardMaterial[] = [];

  const buildEyeSocket = (side: 1 | -1, cfg: FaceRigConfig): EyeNodes => {
    // side = +1 is character's left (+X), side = -1 is character's right (-X)
    const socket = new THREE.Group();
    placeOnCylinder(socket, side * EYE_ANGLE, 0.08 * R6_STUD, 0.008 * R6_STUD);
    root.add(socket);

    const eyeScaleGroup = new THREE.Group();
    socket.add(eyeScaleGroup);

    const pupilGroup = new THREE.Group();
    eyeScaleGroup.add(pupilGroup);

    const lidMat = createPlasticBrickMaterial(currentSkinColor, {
      roughness: 0.34,
      metalness: 0.04,
    });
    skinEyelidMaterials.push(lidMat);

    const eyeMat = new THREE.MeshStandardMaterial({
      color: cfg.eyeColor,
      roughness: 0.14,
      metalness: 0.12,
    });
    const scleraMat = new THREE.MeshStandardMaterial({
      color: '#f8fafc',
      roughness: 0.16,
      metalness: 0.04,
    });
    const pupilMat = new THREE.MeshStandardMaterial({
      color: '#0b0f19',
      roughness: 0.08,
      metalness: 0.2,
    });
    const catchlightMat = new THREE.MeshStandardMaterial({
      color: '#ffffff',
      emissive: '#ffffff',
      emissiveIntensity: 0.55,
      roughness: 0.05,
    });

    let cyberBar: THREE.Mesh | undefined;
    let starMesh: THREE.Mesh | undefined;

    if (cfg.eyeStyle === 'classic') {
      // Glossy sculpted classic 3D pill eye with catchlight bead
      const pill = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.068 * R6_STUD, 0.09 * R6_STUD, 6, 12),
        eyeMat,
      );
      pill.scale.set(1, 1, 0.45);
      pupilGroup.add(pill);

      const shine = new THREE.Mesh(
        new THREE.SphereGeometry(0.025 * R6_STUD, 8, 8),
        catchlightMat,
      );
      shine.position.set(-0.022 * R6_STUD, 0.045 * R6_STUD, 0.03 * R6_STUD);
      pupilGroup.add(shine);
    } else if (cfg.eyeStyle === 'cyber') {
      // Recessed dark visor housing + glowing optical bar
      const housingMat = createPlasticBrickMaterial('#0f172a', {
        roughness: 0.35,
        metalness: 0.5,
      });
      const housing = new THREE.Mesh(
        new THREE.BoxGeometry(0.24 * R6_STUD, 0.12 * R6_STUD, 0.035 * R6_STUD),
        housingMat,
      );
      eyeScaleGroup.add(housing);

      const glowMat = new THREE.MeshStandardMaterial({
        color: cfg.eyeColor,
        emissive: cfg.eyeColor,
        emissiveIntensity: 1.35,
        roughness: 0.12,
        metalness: 0.25,
      });
      cyberBar = new THREE.Mesh(
        new THREE.BoxGeometry(0.18 * R6_STUD, 0.065 * R6_STUD, 0.028 * R6_STUD),
        glowMat,
      );
      cyberBar.position.z = 0.018 * R6_STUD;
      pupilGroup.add(cyberBar);
    } else if (cfg.eyeStyle === 'hero') {
      // Sculpted heroic slanted sclera + colored iris + lash rim
      const sclera = new THREE.Mesh(
        new THREE.BoxGeometry(0.21 * R6_STUD, 0.16 * R6_STUD, 0.035 * R6_STUD),
        scleraMat,
      );
      sclera.rotation.z = side * 0.08;
      eyeScaleGroup.add(sclera);

      const lashMat = createPlasticBrickMaterial('#0f172a', { roughness: 0.3 });
      const lash = new THREE.Mesh(
        new THREE.BoxGeometry(0.23 * R6_STUD, 0.034 * R6_STUD, 0.045 * R6_STUD),
        lashMat,
      );
      lash.position.set(0, 0.082 * R6_STUD, 0.008 * R6_STUD);
      lash.rotation.z = side * 0.08;
      eyeScaleGroup.add(lash);

      const iris = new THREE.Mesh(
        new THREE.CylinderGeometry(0.062 * R6_STUD, 0.062 * R6_STUD, 0.022 * R6_STUD, 14),
        eyeMat,
      );
      iris.rotation.x = Math.PI / 2;
      iris.position.z = 0.016 * R6_STUD;
      pupilGroup.add(iris);

      const pupil = new THREE.Mesh(
        new THREE.CylinderGeometry(0.034 * R6_STUD, 0.034 * R6_STUD, 0.016 * R6_STUD, 12),
        pupilMat,
      );
      pupil.rotation.x = Math.PI / 2;
      pupil.position.z = 0.024 * R6_STUD;
      pupilGroup.add(pupil);

      const shine = new THREE.Mesh(
        new THREE.SphereGeometry(0.02 * R6_STUD, 8, 8),
        catchlightMat,
      );
      shine.position.set(-0.024 * R6_STUD, 0.026 * R6_STUD, 0.032 * R6_STUD);
      pupilGroup.add(shine);
    } else if (cfg.eyeStyle === 'starry') {
      // Expressive round sclera + vivid iris + 3D diamond star catchlight
      const sclera = new THREE.Mesh(
        new THREE.SphereGeometry(0.115 * R6_STUD, 14, 12),
        scleraMat,
      );
      sclera.scale.set(0.95, 1.15, 0.32);
      eyeScaleGroup.add(sclera);

      const iris = new THREE.Mesh(
        new THREE.SphereGeometry(0.075 * R6_STUD, 12, 10),
        eyeMat,
      );
      iris.scale.set(1, 1.12, 0.38);
      iris.position.z = 0.022 * R6_STUD;
      pupilGroup.add(iris);

      const starGeo = new THREE.OctahedronGeometry(0.036 * R6_STUD, 0);
      starMesh = new THREE.Mesh(starGeo, catchlightMat);
      starMesh.scale.set(0.9, 1.15, 0.45);
      starMesh.position.set(-0.016 * R6_STUD, 0.025 * R6_STUD, 0.044 * R6_STUD);
      pupilGroup.add(starMesh);

      const dot2 = new THREE.Mesh(
        new THREE.SphereGeometry(0.015 * R6_STUD, 8, 8),
        catchlightMat,
      );
      dot2.position.set(0.028 * R6_STUD, -0.025 * R6_STUD, 0.042 * R6_STUD);
      pupilGroup.add(dot2);
    } else {
      // 'expressive': Sculpted 3D white sclera dome + colored iris + glossy pupil + specular catchlight
      const sclera = new THREE.Mesh(
        new THREE.SphereGeometry(0.11 * R6_STUD, 14, 12),
        scleraMat,
      );
      sclera.scale.set(0.92, 1.16, 0.34);
      eyeScaleGroup.add(sclera);

      const iris = new THREE.Mesh(
        new THREE.SphereGeometry(0.068 * R6_STUD, 12, 10),
        eyeMat,
      );
      iris.scale.set(0.95, 1.1, 0.38);
      iris.position.z = 0.024 * R6_STUD;
      pupilGroup.add(iris);

      const pupil = new THREE.Mesh(
        new THREE.SphereGeometry(0.038 * R6_STUD, 10, 8),
        pupilMat,
      );
      pupil.scale.set(1, 1.08, 0.4);
      pupil.position.z = 0.036 * R6_STUD;
      pupilGroup.add(pupil);

      const shine = new THREE.Mesh(
        new THREE.SphereGeometry(0.02 * R6_STUD, 8, 8),
        catchlightMat,
      );
      shine.position.set(-0.024 * R6_STUD, 0.032 * R6_STUD, 0.046 * R6_STUD);
      pupilGroup.add(shine);
    }

    // Articulated 3D skin-matched eyelids for genuine blink & squint geometry
    const lidGeo = new THREE.BoxGeometry(
      0.245 * R6_STUD,
      0.145 * R6_STUD,
      0.062 * R6_STUD,
    );
    const upperLid = new THREE.Mesh(lidGeo, lidMat);
    upperLid.position.set(0, 0.14 * R6_STUD, 0.026 * R6_STUD);
    upperLid.scale.set(1, 0.01, 1);
    socket.add(upperLid);

    const lowerLid = new THREE.Mesh(lidGeo.clone(), lidMat);
    lowerLid.position.set(0, -0.14 * R6_STUD, 0.026 * R6_STUD);
    lowerLid.scale.set(1, 0.01, 1);
    socket.add(lowerLid);

    return {
      socket,
      eyeScaleGroup,
      pupilGroup,
      upperLid,
      lowerLid,
      cyberBar,
      starMesh,
    };
  };

  const buildBrows = (cfg: FaceRigConfig): BrowNodes => {
    const leftPivot = new THREE.Group();
    const rightPivot = new THREE.Group();
    placeOnCylinder(leftPivot, EYE_ANGLE, 0.255 * R6_STUD, 0.026 * R6_STUD);
    placeOnCylinder(rightPivot, -EYE_ANGLE, 0.255 * R6_STUD, 0.026 * R6_STUD);
    root.add(leftPivot, rightPivot);

    if (cfg.browStyle === 'none') {
      return { leftPivot, rightPivot };
    }

    const browMat = createPlasticBrickMaterial(cfg.browColor, {
      roughness: 0.44,
      metalness: 0.05,
    });

    const createOneBrow = (side: 1 | -1): THREE.Mesh => {
      if (cfg.browStyle === 'bold') {
        return new THREE.Mesh(
          new THREE.BoxGeometry(0.24 * R6_STUD, 0.068 * R6_STUD, 0.044 * R6_STUD),
          browMat,
        );
      }
      if (cfg.browStyle === 'sharp') {
        const shape = new THREE.Shape();
        const w = 0.13 * R6_STUD;
        const hInner = 0.036 * R6_STUD;
        const hOuter = 0.018 * R6_STUD;
        shape.moveTo(-w * side, -hInner);
        shape.lineTo(w * side, -hOuter);
        shape.lineTo(w * side, hOuter);
        shape.lineTo(-w * side, hInner);
        shape.closePath();
        const geo = new THREE.ExtrudeGeometry(shape, {
          depth: 0.032 * R6_STUD,
          bevelEnabled: true,
          bevelThickness: 0.006 * R6_STUD,
          bevelSize: 0.005 * R6_STUD,
          bevelSegments: 2,
        });
        geo.center();
        return new THREE.Mesh(geo, browMat);
      }
      if (cfg.browStyle === 'arched') {
        const geo = new THREE.TorusGeometry(
          0.13 * R6_STUD,
          0.024 * R6_STUD,
          8,
          14,
          Math.PI * 0.72,
        );
        const mesh = new THREE.Mesh(geo, browMat);
        mesh.rotation.z = Math.PI * 0.14;
        mesh.position.y = -0.075 * R6_STUD;
        return mesh;
      }
      // 'rounded': soft 3D capsule brow
      const geo = new THREE.CapsuleGeometry(0.026 * R6_STUD, 0.17 * R6_STUD, 5, 10);
      geo.rotateZ(Math.PI / 2);
      return new THREE.Mesh(geo, browMat);
    };

    leftPivot.add(createOneBrow(1));
    rightPivot.add(createOneBrow(-1));
    return { leftPivot, rightPivot };
  };

  const buildMouth = (cfg: FaceRigConfig): MouthNodes => {
    const mouthRoot = new THREE.Group();
    mouthRoot.position.set(0, -0.175 * R6_STUD, 0);
    root.add(mouthRoot);

    const cavityGroup = new THREE.Group();
    cavityGroup.position.set(0, 0, HEAD_R + 0.004 * R6_STUD);
    mouthRoot.add(cavityGroup);

    const cavityMat = new THREE.MeshStandardMaterial({
      color: '#2c1019',
      roughness: 0.85,
      metalness: 0.02,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    const teethMat = new THREE.MeshStandardMaterial({
      color: '#f8fafc',
      roughness: 0.18,
      metalness: 0.04,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });
    const tongueMat = new THREE.MeshStandardMaterial({
      color: '#ef4444',
      roughness: 0.42,
      metalness: 0.02,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });
    const lipMat = createPlasticBrickMaterial(cfg.mouthColor, {
      roughness: 0.3,
      metalness: 0.06,
    });

    // Sculpted open mouth cavity (neatly curved oval sitting flush against the head)
    const cavityGeo = new THREE.SphereGeometry(0.125 * R6_STUD, 16, 12);
    const cavityMesh = new THREE.Mesh(cavityGeo, cavityMat);
    cavityMesh.scale.set(1.22, 0.82, 0.22);
    cavityGroup.add(cavityMesh);

    // Upper teeth tucked cleanly inside the upper arch of the open cavity
    const upperTeeth = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.024 * R6_STUD, 0.145 * R6_STUD, 4, 10),
      teethMat,
    );
    upperTeeth.rotation.z = Math.PI / 2;
    upperTeeth.scale.set(1, 0.9, 0.42);
    upperTeeth.position.set(0, 0.046 * R6_STUD, 0.02 * R6_STUD);
    cavityGroup.add(upperTeeth);

    // Tongue tucked cleanly inside the lower half of the open cavity
    const tongue = new THREE.Mesh(
      new THREE.SphereGeometry(0.064 * R6_STUD, 10, 8),
      tongueMat,
    );
    tongue.scale.set(1.12, 0.5, 0.28);
    tongue.position.set(0, -0.048 * R6_STUD, 0.018 * R6_STUD);
    cavityGroup.add(tongue);

    const lipSegments: THREE.Mesh[] = [];
    const cyberBars: THREE.Mesh[] = [];

    if (cfg.mouthStyle === 'cyber') {
      // 5 glowing 3D vocoder bars curved along the head cylinder
      const barMat = new THREE.MeshStandardMaterial({
        color: cfg.mouthColor,
        emissive: cfg.mouthColor,
        emissiveIntensity: 1.25,
        roughness: 0.15,
        metalness: 0.2,
      });
      for (let i = 0; i < 5; i++) {
        const bar = new THREE.Mesh(
          new THREE.BoxGeometry(0.05 * R6_STUD, 0.046 * R6_STUD, 0.024 * R6_STUD),
          barMat,
        );
        const angle = (i - 2) * 0.125;
        placeOnCylinder(bar, angle, 0, 0.012 * R6_STUD);
        mouthRoot.add(bar);
        cyberBars.push(bar);
      }
      cavityGroup.visible = false;
    } else {
      // 7 tightly overlapping curved lip capsules wrapping cleanly along the front cylinder wall
      // (zero castShadow to prevent dark shadow-map lines below the mouth)
      const segRadius = cfg.mouthStyle === 'openCavity' ? 0.022 * R6_STUD : 0.025 * R6_STUD;
      const segLen = 0.058 * R6_STUD;
      const segGeo = new THREE.CapsuleGeometry(segRadius, segLen, 4, 8);
      segGeo.rotateZ(Math.PI / 2);

      for (let i = 0; i < 7; i++) {
        const seg = new THREE.Mesh(segGeo, lipMat);
        seg.castShadow = false;
        mouthRoot.add(seg);
        lipSegments.push(seg);
      }
    }

    return {
      root: mouthRoot,
      cavityGroup,
      cavityMesh,
      upperTeeth,
      tongue,
      lipSegments,
      cyberBars,
    };
  };

  const buildCheeks = (cfg: FaceRigConfig): CheekNodes => {
    const cheekRoot = new THREE.Group();
    root.add(cheekRoot);

    if (cfg.cheekStyle === 'none') {
      return { root: cheekRoot };
    }

    if (cfg.cheekStyle === 'blush') {
      const blushMat = new THREE.MeshStandardMaterial({
        color: cfg.accentColor || '#fb7185',
        roughness: 0.55,
        transparent: true,
        opacity: 0.55,
      });
      const geo = new THREE.SphereGeometry(0.078 * R6_STUD, 12, 8);
      const blushLeft = new THREE.Mesh(geo, blushMat);
      blushLeft.scale.set(1.25, 0.72, 0.2);
      placeOnCylinder(blushLeft, 0.56, -0.055 * R6_STUD, 0.008 * R6_STUD);

      const blushRight = new THREE.Mesh(geo.clone(), blushMat.clone());
      blushRight.scale.set(1.25, 0.72, 0.2);
      placeOnCylinder(blushRight, -0.56, -0.055 * R6_STUD, 0.008 * R6_STUD);

      cheekRoot.add(blushLeft, blushRight);
      return { root: cheekRoot, blushLeft, blushRight };
    }

    if (cfg.cheekStyle === 'freckles') {
      const dotMat = createPlasticBrickMaterial('#854d0e', { roughness: 0.5 });
      const dotGeo = new THREE.SphereGeometry(0.017 * R6_STUD, 6, 6);
      const offsets: [number, number][] = [
        [0.44, -0.05],
        [0.52, -0.02],
        [0.58, -0.07],
        [-0.44, -0.05],
        [-0.52, -0.02],
        [-0.58, -0.07],
      ];
      for (const [ang, y] of offsets) {
        const dot = new THREE.Mesh(dotGeo, dotMat);
        dot.scale.set(1, 1, 0.4);
        placeOnCylinder(dot, ang, y * R6_STUD, 0.01 * R6_STUD);
        cheekRoot.add(dot);
      }
      return { root: cheekRoot };
    }

    if (cfg.cheekStyle === 'bandage') {
      const stripMat = createPlasticBrickMaterial('#fef3c7', { roughness: 0.65 });
      const padMat = createPlasticBrickMaterial('#fde68a', { roughness: 0.7 });
      const grp = new THREE.Group();
      placeOnCylinder(grp, -0.52, -0.05 * R6_STUD, 0.018 * R6_STUD);
      grp.rotateZ(-0.22);
      const strip = new THREE.Mesh(
        new THREE.BoxGeometry(0.22 * R6_STUD, 0.08 * R6_STUD, 0.022 * R6_STUD),
        stripMat,
      );
      const pad = new THREE.Mesh(
        new THREE.BoxGeometry(0.08 * R6_STUD, 0.064 * R6_STUD, 0.028 * R6_STUD),
        padMat,
      );
      grp.add(strip, pad);
      cheekRoot.add(grp);
      return { root: cheekRoot };
    }

    if (cfg.cheekStyle === 'scar') {
      const scarMat = createPlasticBrickMaterial(cfg.accentColor || '#b45309', {
        roughness: 0.5,
      });
      const grp = new THREE.Group();
      placeOnCylinder(grp, 0.42, 0.03 * R6_STUD, 0.016 * R6_STUD);
      grp.rotateZ(-0.35);
      const slash = new THREE.Mesh(
        new THREE.BoxGeometry(0.036 * R6_STUD, 0.28 * R6_STUD, 0.024 * R6_STUD),
        scarMat,
      );
      const stitchA = new THREE.Mesh(
        new THREE.BoxGeometry(0.08 * R6_STUD, 0.022 * R6_STUD, 0.026 * R6_STUD),
        scarMat,
      );
      stitchA.position.y = 0.05 * R6_STUD;
      const stitchB = stitchA.clone();
      stitchB.position.y = -0.05 * R6_STUD;
      grp.add(slash, stitchA, stitchB);
      cheekRoot.add(grp);
      return { root: cheekRoot };
    }

    return { root: cheekRoot };
  };

  const rebuild = (cfg: FaceRigConfig) => {
    const json = JSON.stringify({
      eyeStyle: cfg.eyeStyle,
      browStyle: cfg.browStyle,
      mouthStyle: cfg.mouthStyle,
      cheekStyle: cfg.cheekStyle,
      eyeColor: cfg.eyeColor,
      browColor: cfg.browColor,
      mouthColor: cfg.mouthColor,
      accentColor: cfg.accentColor,
    });
    currentConfig = { ...cfg };
    if (json === currentConfigJson) return;
    currentConfigJson = json;

    disposeChildren(root);
    skinEyelidMaterials = [];

    leftEye = buildEyeSocket(1, cfg);
    rightEye = buildEyeSocket(-1, cfg);
    brows = buildBrows(cfg);
    mouth = buildMouth(cfg);
    cheeks = buildCheeks(cfg);
  };

  rebuild(initialConfig);

  const setSkinColor = (hex: string) => {
    currentSkinColor = hex;
    for (const mat of skinEyelidMaterials) {
      mat.color.set(hex);
    }
  };

  const applyEyeParams = (
    eye: EyeNodes,
    blink: number,
    eyeWide: number,
    gazeX: number,
    gazeY: number,
  ) => {
    // Eye scale reacts to eyeWide (-1..1) and blink (0..1)
    const wideScale = 1 + eyeWide * 0.22;
    const openFactor = Math.max(0.08, 1 - blink * 0.92);

    if (currentConfig.eyeStyle === 'cyber' && eye.cyberBar) {
      eye.eyeScaleGroup.scale.set(1, Math.max(0.12, openFactor * wideScale), 1);
      eye.pupilGroup.position.set(gazeX * 0.032 * R6_STUD, gazeY * 0.02 * R6_STUD, 0);
      eye.upperLid.visible = false;
      eye.lowerLid.visible = false;
      return;
    }

    eye.upperLid.visible = true;
    eye.lowerLid.visible = true;
    eye.eyeScaleGroup.scale.set(
      1 + eyeWide * 0.08,
      Math.max(0.18, wideScale * (1 - blink * 0.45)),
      1,
    );

    // Move iris/pupil along local eye surface within anatomical bounds
    const maxGX = currentConfig.eyeStyle === 'classic' ? 0.042 * R6_STUD : 0.038 * R6_STUD;
    const maxGY = currentConfig.eyeStyle === 'classic' ? 0.038 * R6_STUD : 0.036 * R6_STUD;
    eye.pupilGroup.position.set(gazeX * maxGX, gazeY * maxGY, 0);

    // Animate 3D upper & lower eyelids closing over the eye
    const squintAmt = Math.max(0, -eyeWide * 0.45);
    const upperClose = Math.min(1, blink * 0.96 + squintAmt * 0.45);
    const lowerClose = Math.min(0.65, blink * 0.35 + squintAmt * 0.55);

    eye.upperLid.scale.y = Math.max(0.01, upperClose * 1.15);
    eye.upperLid.position.y = (0.145 - upperClose * 0.082) * R6_STUD;
    eye.upperLid.visible = upperClose > 0.04;

    eye.lowerLid.scale.y = Math.max(0.01, lowerClose * 0.9);
    eye.lowerLid.position.y = (-0.145 + lowerClose * 0.065) * R6_STUD;
    eye.lowerLid.visible = lowerClose > 0.04;
  };

  const applyFaceState = (
    state: EvaluatedFaceState,
    gazeOverride?: { x: number; y: number } | null,
  ) => {
    const p = state.params;
    const gx = gazeOverride ? gazeOverride.x : p.gazeX;
    const gy = gazeOverride ? gazeOverride.y : p.gazeY;

    // 1. Eyes + Eyelids + Gaze
    if (leftEye) applyEyeParams(leftEye, p.blinkL, p.eyeWide, gx, gy);
    if (rightEye) applyEyeParams(rightEye, p.blinkR, p.eyeWide, gx, gy);

    // 2. Sculpted 3D Eyebrows
    if (brows) {
      const baseY = 0.255 * R6_STUD;
      const raiseY = p.browRaise * 0.068 * R6_STUD;
      const furrowTilt = p.browFurrow * 0.38; // positive = angry V, negative = sad /\
      const asym = p.mouthSkew * 0.03 * R6_STUD;

      brows.leftPivot.position.y = baseY + raiseY + asym - Math.max(0, p.browFurrow) * 0.018 * R6_STUD;
      brows.rightPivot.position.y = baseY + raiseY - asym - Math.max(0, p.browFurrow) * 0.018 * R6_STUD;

      brows.leftPivot.rotation.z = furrowTilt;
      brows.rightPivot.rotation.z = -furrowTilt;
    }

    // 3. Sculpted 3D Mouth & Articulated Cavity (strictly mutually exclusive to avoid stray lines)
    if (mouth) {
      const widthFactor = 1 + p.mouthWidth * 0.34;
      const openAmt = p.jawOpen;

      if (currentConfig.mouthStyle === 'cyber' && mouth.cyberBars.length === 5) {
        mouth.cavityGroup.visible = false;
        for (let i = 0; i < 5; i++) {
          const bar = mouth.cyberBars[i];
          const centerWeight = 1 - Math.abs(i - 2) * 0.24;
          const h = 0.45 + openAmt * 2.2 * centerWeight + Math.abs(p.smile) * 0.35;
          bar.scale.set(widthFactor, h, 1);
          const smileArc = p.smile * (Math.abs(i - 2) * 0.018 * R6_STUD);
          bar.position.y = smileArc;
        }
      } else {
        const showCavity =
          openAmt > 0.06 ||
          (currentConfig.mouthStyle === 'openCavity' && p.smile > 0.55);

        // Strictly mutually exclusive: hide ALL closed-mouth lip segments whenever cavity is active
        // so zero dark bars cross or flank the open mouth.
        if (showCavity) {
          for (let i = 0; i < mouth.lipSegments.length; i++) {
            mouth.lipSegments[i].visible = false;
          }
          mouth.cavityGroup.visible = true;
          const effOpen = Math.max(
            openAmt,
            currentConfig.mouthStyle === 'openCavity' ? p.smile * 0.46 : 0,
          );
          const cavX = Math.max(0.45, widthFactor * (1.02 - effOpen * 0.16));
          const cavY = Math.max(0.26, 0.22 + effOpen * 1.15);
          mouth.cavityGroup.scale.set(cavX, cavY, 1);
          mouth.cavityGroup.position.set(
            p.mouthSkew * 0.02 * R6_STUD,
            -effOpen * 0.022 * R6_STUD + p.smile * 0.012 * R6_STUD,
            HEAD_R + 0.005 * R6_STUD,
          );
          mouth.cavityGroup.rotation.z = p.mouthSkew * 0.14;
          mouth.upperTeeth.visible = effOpen > 0.22 && p.mouthWidth > -0.35;
          mouth.tongue.visible = effOpen > 0.34;
        } else {
          mouth.cavityGroup.visible = false;
          const count = mouth.lipSegments.length;
          const halfAngleSpan = 0.275 * widthFactor;
          const cornerLift = p.smile * 0.056 * R6_STUD;
          const skewTilt = p.mouthSkew * 0.036 * R6_STUD;
          const lipRadius = HEAD_R + 0.006 * R6_STUD;

          for (let i = 0; i < count; i++) {
            const seg = mouth.lipSegments[i];
            seg.visible = true;
            const u = count > 1 ? (i / (count - 1)) * 2 - 1 : 0; // -1 .. +1
            const theta = u * halfAngleSpan;
            const curveY = u * u * cornerLift + u * skewTilt;
            const dYdU = 2 * u * cornerLift + skewTilt;
            const arcHalfWidth = Math.max(0.06, halfAngleSpan * lipRadius);

            seg.position.set(
              Math.sin(theta) * lipRadius,
              curveY,
              Math.cos(theta) * lipRadius,
            );
            seg.rotation.set(0, theta, Math.atan(dYdU / arcHalfWidth) * 0.78);
            seg.scale.set(widthFactor * 0.9, 1, 0.55);
          }
        }
      }
    }

    // 4. Cheeks / Blush intensity
    if (cheeks && cheeks.blushLeft && cheeks.blushRight) {
      const intensity = Math.max(0.08, Math.min(0.88, p.blush + Math.max(0, p.smile) * 0.22));
      const matL = cheeks.blushLeft.material as THREE.MeshStandardMaterial;
      const matR = cheeks.blushRight.material as THREE.MeshStandardMaterial;
      matL.opacity = intensity;
      matR.opacity = intensity;
      const s = 0.85 + intensity * 0.35;
      cheeks.blushLeft.scale.set(1.25 * s, 0.72 * s, 0.2);
      cheeks.blushRight.scale.set(1.25 * s, 0.72 * s, 0.2);
    }
  };

  return {
    root,
    setConfig: rebuild,
    setSkinColor,
    applyFaceState,
    dispose: () => {
      disposeChildren(root);
      skinEyelidMaterials = [];
    },
  };
}
