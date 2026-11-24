import * as THREE from 'three';

export { buildHairRig } from './robloxHair';
export type { RobloxHairRig } from './robloxHair';

export {
  buildClothingRig,
  createArmClothingMaterial,
  createLegClothingMaterials,
  createTorsoClothingMaterials,
} from './robloxClothing';
export type { RobloxClothingRig } from './robloxClothing';

export {
  applyAccessoryFit,
  buildArmAccessory,
  buildBackAccessory,
  buildHeadAccessory,
  buildHatAccessory,
  buildLegsAccessories,
  buildNeckAccessory,
  buildShoulderAccessory,
  buildWaistAccessory,
} from './robloxAccessories';
export type { AccessoryAnimHandle } from './robloxAccessories';

export const WARDROBE_STUD = 0.55;

export function disposeGroupChildren(group: THREE.Group) {
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
          if (std.map && !std.map.userData?.shared) std.map.dispose();
          if (std.bumpMap && !std.bumpMap.userData?.shared) std.bumpMap.dispose();
          if (std.roughnessMap && !std.roughnessMap.userData?.shared) std.roughnessMap.dispose();
          m.dispose();
        });
      }
    });
  }
}

export function disposeMaterialSet(mats: THREE.Material | THREE.Material[]) {
  const list = Array.isArray(mats) ? mats : [mats];
  list.forEach((m) => {
    const std = m as THREE.MeshStandardMaterial;
    if (std.map && !std.map.userData?.shared) std.map.dispose();
    if (std.bumpMap && !std.bumpMap.userData?.shared) std.bumpMap.dispose();
    if (std.roughnessMap && !std.roughnessMap.userData?.shared) std.roughnessMap.dispose();
    m.dispose();
  });
}
