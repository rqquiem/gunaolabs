import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { resolveActorFaceConfig } from './faceExpressions';
import { buildRobloxR6CharacterRig, RobloxR6CharacterRig } from './robloxCharacter';
import {
  cloneBundle,
  resolveActorClothing,
  resolveActorHair,
  resolveActorOrnaments,
} from './robloxCatalog';
import {
  buildRobloxEnvironmentGroup,
  buildRobloxPropGroup,
} from './robloxEnvironments';
import { animateIdiomProp } from './idiomAssets';
import { animateHeldItemGroup } from './robloxItems';
import {
  createClassicSkyboxCubeTexture,
  createContactShadowTexture,
  createStudTextures,
  getRobloxLightingSpec,
  StudTexturePair,
} from './robloxTextures';
import { getActiveMapSignature } from './mapLibrary';
import { createDefaultCharacterState } from './characterStates';
import {
  createDefaultCharacterAction,
  getActionFaceSyncOverlay,
  sanitizeCharacterModelBuildId,
} from './characterActions';
import { clamp, degToRad, evaluateProjectAt } from './timeline';
import {
  AnimationProject,
  CameraFramingPreset,
  CameraMode,
  CharacterActionId,
  CharacterActionSource,
  CharacterStateId,
  CharacterStateLimb,
  CustomVoiceoverTrack,
  EnvironmentId,
  EvaluatedCharacterAction,
  EvaluatedCharacterState,
  EvaluatedFaceState,
  EvaluatedFrame,
  EvaluatedHeldItems,
  EvaluatedPose,
  GizmoMode,
  LightingMood,
  MapDefinition,
  SceneActorConfig,
  StageLightConfig,
  SubtitleRole,
  Vec3Tuple,
  VideoAspectRatio,
  VideoEncoderBackend,
  VideoExportFormat,
  VideoExportOptions,
} from './types';
import {
  computeVerticalFovForAspect,
  Mp4CutsceneRecorder,
  resolveExportDimensions,
  VideoRecordedResult,
} from './mp4Recorder';
import {
  getCachedCueDuration,
  pregenerateProjectVoices,
  renderProjectAudioOffline,
} from './episodeAudio';
import { resolveNarratorSettings } from './captionEngine';

export interface StageEngineCallbacks {
  onSelectActor: (actorId: string | null) => void;
  onActorTransformCommit: (
    actorId: string,
    position: Vec3Tuple,
    rotation: Vec3Tuple,
    scale: Vec3Tuple,
  ) => void;
  onTimeUpdate: (
    time: number,
    subtitleText: string | null,
    subtitleSpeaker: string | null,
    subtitleRole?: SubtitleRole,
    screenBlackout?: number,
  ) => void;
  onPlaybackEnded: () => void;
  onContextLost: (lost: boolean) => void;
}

interface ManagedActor {
  config: SceneActorConfig;
  group: THREE.Group;
  rig?: RobloxR6CharacterRig;
  selectionRing?: THREE.Mesh;
}

interface ManagedStageLight {
  config: StageLightConfig;
  light: THREE.PointLight | THREE.SpotLight;
  targetObj?: THREE.Object3D;
  fixtureGroup: THREE.Group;
  helper: THREE.PointLightHelper | THREE.SpotLightHelper;
}

const _vec3A = new THREE.Vector3();
const _vec3B = new THREE.Vector3();
const _vec3C = new THREE.Vector3();
const _quatA = new THREE.Quaternion();
const _raycaster = new THREE.Raycaster();
const _pointer = new THREE.Vector2();

function computeResponsiveFov(baseFov: number, aspect: number): number {
  const safeAspect = Math.max(0.55, aspect);
  // Keep horizontal framing generous in narrower/square viewports while matching authored 16:9 FOV 1:1
  const comp = clamp(Math.pow(1.6 / safeAspect, 0.62), 1.0, 1.52);
  return clamp(baseFov * comp, 20, 82);
}

export function detectSoftwareWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

export class StageEngine {
  private container: HTMLElement;
  private callbacks: StageEngineCallbacks;
  private isSoftwareGl: boolean;

  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private orbitCamera: THREE.PerspectiveCamera;
  private directorCamera: THREE.PerspectiveCamera;
  private cameraHelper: THREE.CameraHelper;
  private cameraPathLine: THREE.Line | null = null;
  private orbitControls: OrbitControls;
  private transformControls: TransformControls;

  private keyLight: THREE.DirectionalLight;
  private rimLight: THREE.DirectionalLight;
  private hemiLight: THREE.HemisphereLight;
  private shadowTex: THREE.CanvasTexture;
  private studTextures: StudTexturePair;
  private skyboxTex: THREE.CubeTexture | null = null;
  private currentSkyKey = '';
  private envGroup: THREE.Group | null = null;
  private envCache = new Map<string, THREE.Group>();
  private currentEnvSignature = '';
  private selectedMapModuleId: string | null = null;

  private actors = new Map<string, ManagedActor>();
  private stageLightsMap = new Map<string, ManagedStageLight>();
  private project: AnimationProject;
  private currentTime = 0;
  private isPlaying = false;
  private playbackSpeed = 1;
  private cameraMode: CameraMode = 'orbit';
  private orbitBaseFov = 52;
  private showCameraRig = true;
  private showLightHelpers = true;
  private selectedActorId: string | null = null;
  private poseOverride: { actorId: string; pose: EvaluatedPose } | null = null;
  private faceOverride: { actorId: string; face: EvaluatedFaceState } | null = null;
  private itemOverride: { actorId: string; heldItems: EvaluatedHeldItems } | null = null;
  private stateOverride: {
    actorId: string;
    stateId: CharacterStateId;
    intensity: number;
    targetLimb: CharacterStateLimb;
    seed: number;
    previewStartMs: number;
  } | null = null;
  private actionOverride: {
    actorId: string;
    actionId: CharacterActionId;
    intensity: number;
    source: CharacterActionSource;
    seed: number;
    previewStartMs: number;
  } | null = null;
  private lastEvaluatedFrame: EvaluatedFrame | null = null;

  private frameId = 0;
  private statePreviewTimerId = 0;
  private isLoopActive = false;
  private lastTickMs = 0;
  private renderBusy = false;
  private renderDirty = false;
  private disposed = false;

  private pointerDownPos = { x: 0, y: 0 };
  private isDraggingGizmo = false;
  private mp4Recorder: Mp4CutsceneRecorder | null = null;
  private isRecordingExport = false;
  private exportStopRequested = false;
  private exportCancelRequested = false;

  private resizeObserver: ResizeObserver;

  constructor(
    container: HTMLElement,
    initialProject: AnimationProject,
    callbacks: StageEngineCallbacks,
  ) {
    this.container = container;
    this.project = initialProject;
    this.callbacks = callbacks;
    this.isSoftwareGl = detectSoftwareWebGL();

    const width = Math.max(container.clientWidth, 320);
    const height = Math.max(container.clientHeight, 240);

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      preserveDrawingBuffer: true,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.06;
    this.renderer.setPixelRatio(
      this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2),
    );
    this.renderer.setSize(width, height);
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmremGenerator.fromScene(
      new RoomEnvironment(),
      0.04,
    ).texture;
    pmremGenerator.dispose();

    this.shadowTex = createContactShadowTexture();
    this.studTextures = createStudTextures(
      this.renderer.capabilities.getMaxAnisotropy(),
    );

    // Cameras
    const initialAspect = width / height;
    this.orbitCamera = new THREE.PerspectiveCamera(
      computeResponsiveFov(this.orbitBaseFov, initialAspect),
      initialAspect,
      0.1,
      360,
    );
    this.orbitCamera.position.set(6.4, 3.8, 8.2);

    this.directorCamera = new THREE.PerspectiveCamera(
      computeResponsiveFov(52, initialAspect),
      initialAspect,
      0.25,
      260,
    );
    this.scene.add(this.directorCamera);

    this.cameraHelper = new THREE.CameraHelper(this.directorCamera);
    this.scene.add(this.cameraHelper);

    // Classic Roblox sunlit key + cool sky bounce lighting rig
    this.hemiLight = new THREE.HemisphereLight(0xbae6fd, 0x4d6b3c, 0.95);
    this.scene.add(this.hemiLight);

    this.keyLight = new THREE.DirectionalLight(0xfff3d6, 2.4);
    this.keyLight.position.set(8, 13, 9);
    this.keyLight.castShadow = !this.isSoftwareGl;
    this.keyLight.shadow.mapSize.set(1024, 1024);
    this.keyLight.shadow.camera.near = 0.5;
    this.keyLight.shadow.camera.far = 42;
    const d = 14;
    this.keyLight.shadow.camera.left = -d;
    this.keyLight.shadow.camera.right = d;
    this.keyLight.shadow.camera.top = d;
    this.keyLight.shadow.camera.bottom = -d;
    this.keyLight.shadow.bias = -0.0005;
    this.keyLight.shadow.normalBias = 0.02;
    this.scene.add(this.keyLight);

    this.rimLight = new THREE.DirectionalLight(0x7dd3fc, 1.1);
    this.rimLight.position.set(-7, 6, -8);
    this.scene.add(this.rimLight);

    // Controls
    this.orbitControls = new OrbitControls(this.orbitCamera, this.renderer.domElement);
    this.orbitControls.target.set(0, 1.2, 0);
    this.orbitControls.enableDamping = !this.isSoftwareGl;
    this.orbitControls.dampingFactor = 0.07;
    this.orbitControls.maxPolarAngle = Math.PI * 0.49;
    this.orbitControls.minDistance = 1.1;
    this.orbitControls.maxDistance = 32;
    this.orbitControls.addEventListener('change', () => {
      if (!this.isPlaying && this.cameraMode === 'orbit') {
        this.requestRender();
      }
    });

    this.transformControls = new TransformControls(
      this.orbitCamera,
      this.renderer.domElement,
    );
    this.transformControls.setSize(0.8);
    this.scene.add(this.transformControls.getHelper());
    this.transformControls.addEventListener('dragging-changed', (event) => {
      this.isDraggingGizmo = Boolean(event.value);
      this.orbitControls.enabled = !this.isDraggingGizmo && this.cameraMode === 'orbit';
      if (!this.isDraggingGizmo && this.selectedActorId) {
        const managed = this.actors.get(this.selectedActorId);
        if (managed) {
          const p = managed.group.position;
          const r = managed.group.rotation;
          const s = managed.group.scale;
          this.callbacks.onActorTransformCommit(
            this.selectedActorId,
            [round2(p.x), round2(p.y), round2(p.z)],
            [round2(r.x), round2(r.y), round2(r.z)],
            [round2(s.x), round2(s.y), round2(s.z)],
          );
        }
      }
      this.requestRender();
    });
    this.transformControls.addEventListener('change', () => {
      if (!this.isPlaying) {
        this.requestRender();
      }
    });

    // Build initial scene
    this.syncProject(initialProject);
    this.evaluateAndApply(0);

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.orbitCamera);
    }

    // Events
    this.renderer.domElement.addEventListener('pointerdown', this.handlePointerDown);
    this.renderer.domElement.addEventListener('pointerup', this.handlePointerUp);
    this.renderer.domElement.addEventListener('webglcontextlost', this.handleContextLost);
    this.renderer.domElement.addEventListener('webglcontextrestored', this.handleContextRestored);

    this.resizeObserver = new ResizeObserver(() => this.handleResize());
    this.resizeObserver.observe(container);

    this.requestRender();
  }

  private handleContextLost = (e: Event) => {
    e.preventDefault();
    this.setPlaying(false);
    this.callbacks.onContextLost(true);
  };

  private handleContextRestored = () => {
    this.callbacks.onContextLost(false);
    this.requestRender();
  };

  private handleResize() {
    if (this.disposed || this.isRecordingExport) return;
    const width = Math.max(this.container.clientWidth, 320);
    const height = Math.max(this.container.clientHeight, 240);
    const aspect = width / height;
    this.orbitCamera.aspect = aspect;
    this.orbitCamera.fov = computeResponsiveFov(this.orbitBaseFov, aspect);
    this.orbitCamera.updateProjectionMatrix();
    this.directorCamera.aspect = aspect;
    const baseDirectorFov = this.lastEvaluatedFrame?.camera.fov ?? 52;
    this.directorCamera.fov = computeResponsiveFov(baseDirectorFov, aspect);
    this.directorCamera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    this.requestRender();
  }

  private handlePointerDown = (e: PointerEvent) => {
    this.pointerDownPos = { x: e.clientX, y: e.clientY };
  };

  private handlePointerUp = (e: PointerEvent) => {
    if (this.isDraggingGizmo || this.cameraMode !== 'orbit') return;
    const dx = e.clientX - this.pointerDownPos.x;
    const dy = e.clientY - this.pointerDownPos.y;
    if (Math.hypot(dx, dy) > 5) return;

    const rect = this.renderer.domElement.getBoundingClientRect();
    _pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    _pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    _raycaster.setFromCamera(_pointer, this.orbitCamera);
    const actorRoots: THREE.Object3D[] = [];
    this.actors.forEach((m) => actorRoots.push(m.group));
    const hits = _raycaster.intersectObjects(actorRoots, true);

    if (hits.length > 0) {
      let node: THREE.Object3D | null = hits[0].object;
      while (node) {
        const actorId = node.userData?.actorId as string | undefined;
        if (actorId) {
          this.selectActor(actorId);
          this.callbacks.onSelectActor(actorId);
          return;
        }
        node = node.parent;
      }
    }
  };

  private applyStageAppearance(
    env: EnvironmentId,
    customMap: MapDefinition | undefined,
    mood: LightingMood,
    forceCustomRebuild = false,
  ) {
    // 1. Skybox, Fog, Orbit Range & Adaptive Shadow Frustum for compact vs. metropolitan stages
    const moodSpec = getRobloxLightingSpec(mood, env);
    const skyKey = `${mood}:${env}`;
    if (this.currentSkyKey !== skyKey) {
      this.skyboxTex?.dispose();
      this.skyboxTex = createClassicSkyboxCubeTexture(mood, env);
      this.scene.background = this.skyboxTex;
      this.currentSkyKey = skyKey;
    }

    const activeBaseplateSize =
      env === 'robloxCity'
        ? 88
        : env === 'custom' && customMap
          ? customMap.baseplate.size
          : 36;
    const hasCitySkyline =
      env === 'robloxCity' ||
      (env === 'custom' && customMap?.baseplate.perimeter === 'citySkyline');
    const isLargeCity = activeBaseplateSize >= 56;

    const fogDensityScale = isLargeCity ? 0.5 : hasCitySkyline ? 0.62 : 1.0;
    this.scene.fog = new THREE.FogExp2(
      moodSpec.fogColor,
      moodSpec.fogDensity * fogDensityScale,
    );

    this.orbitControls.maxDistance = isLargeCity ? 96 : hasCitySkyline ? 56 : 36;
    const shadowHalf = isLargeCity ? 40 : 14;
    const shadowFar = isLargeCity ? 120 : 42;
    if (this.keyLight.shadow.camera.right !== shadowHalf) {
      this.keyLight.shadow.camera.left = -shadowHalf;
      this.keyLight.shadow.camera.right = shadowHalf;
      this.keyLight.shadow.camera.top = shadowHalf;
      this.keyLight.shadow.camera.bottom = -shadowHalf;
      this.keyLight.shadow.camera.far = shadowFar;
      this.keyLight.shadow.camera.updateProjectionMatrix();
    }

    // 2. Environment & Custom Modular Maps with bounded LRU cache for instant mid-scene switching
    const nextEnvSignature = getActiveMapSignature(env, customMap);
    if (forceCustomRebuild && env === 'custom' && this.envCache.has(nextEnvSignature)) {
      const stale = this.envCache.get(nextEnvSignature)!;
      if (stale === this.envGroup) {
        this.scene.remove(stale);
        this.envGroup = null;
      }
      this.disposeObject3D(stale);
      this.envCache.delete(nextEnvSignature);
      this.currentEnvSignature = '';
    }

    if (this.currentEnvSignature !== nextEnvSignature) {
      if (this.envGroup) {
        this.envGroup.visible = false;
        this.scene.remove(this.envGroup);
      }

      let targetGroup = this.envCache.get(nextEnvSignature);
      if (targetGroup) {
        // Refresh insertion order for LRU cache
        this.envCache.delete(nextEnvSignature);
        this.envCache.set(nextEnvSignature, targetGroup);
      } else {
        targetGroup = buildRobloxEnvironmentGroup(
          env,
          this.renderer.capabilities.getMaxAnisotropy(),
          this.studTextures,
          customMap,
          this.getVisibleMapModuleId(),
        );
        this.envCache.set(nextEnvSignature, targetGroup);
        // Evict oldest cached environments if cache exceeds 10 stages
        while (this.envCache.size > 10) {
          const oldestKey = this.envCache.keys().next().value;
          if (!oldestKey || oldestKey === nextEnvSignature) break;
          const evicted = this.envCache.get(oldestKey);
          this.envCache.delete(oldestKey);
          if (evicted) {
            if (evicted === this.envGroup) {
              this.scene.remove(evicted);
              this.envGroup = null;
            }
            this.disposeObject3D(evicted);
          }
        }
      }

      targetGroup.visible = true;
      this.scene.add(targetGroup);
      this.envGroup = targetGroup;
      this.currentEnvSignature = nextEnvSignature;
      this.updateMapModuleSelectionRings();
    }
  }

  public syncProject(project: AnimationProject) {
    this.project = project;

    // 1. Evaluate active stage at currentTime for Skybox, Fog, and Map geometry
    const preFrame = evaluateProjectAt(project, this.currentTime);
    const activeStage = preFrame.stage;
    const moodSpec = getRobloxLightingSpec(
      activeStage.lightingMood,
      activeStage.environment,
    );
    this.applyStageAppearance(
      activeStage.environment,
      activeStage.customMap,
      activeStage.lightingMood,
      false,
    );
    this.renderer.toneMappingExposure = preFrame.lighting.exposure ?? moodSpec.exposure;

    this.keyLight.color.setHex(moodSpec.keyColor);
    this.keyLight.intensity = preFrame.lighting.keyIntensity;
    this.rimLight.color.setHex(moodSpec.rimColor);
    this.rimLight.intensity = preFrame.lighting.rimIntensity;
    this.hemiLight.color.setHex(moodSpec.hemiSky);
    this.hemiLight.groundColor.setHex(moodSpec.hemiGround);
    this.hemiLight.intensity = preFrame.lighting.ambientIntensity;

    // 3. Actors diff
    const nextIds = new Set(project.actors.map((a) => a.id));
    for (const [id, managed] of this.actors.entries()) {
      if (!nextIds.has(id)) {
        if (this.selectedActorId === id) {
          this.transformControls.detach();
          this.selectedActorId = null;
        }
        this.scene.remove(managed.group);
        managed.rig?.disposeStateController();
        this.disposeObject3D(managed.group);
        this.actors.delete(id);
      }
    }

    const fallbackBundle = cloneBundle('noob');

    for (const cfg of project.actors) {
      const existing = this.actors.get(cfg.id);
      const isPropColorChanged =
        existing &&
        cfg.kind === 'prop' &&
        (existing.config.primaryColor !== cfg.primaryColor ||
          existing.config.accentColor !== cfg.accentColor);
      const needsRebuild =
        !existing ||
        existing.config.kind !== cfg.kind ||
        existing.config.propKind !== cfg.propKind ||
        existing.config.propItemId !== cfg.propItemId ||
        Boolean(isPropColorChanged);

      if (needsRebuild) {
        if (existing) {
          if (this.selectedActorId === cfg.id) {
            this.transformControls.detach();
          }
          this.scene.remove(existing.group);
          existing.rig?.disposeStateController();
          this.disposeObject3D(existing.group);
        }

        if (cfg.kind === 'character') {
          const colors = cfg.bodyColors ?? fallbackBundle.bodyColors;
          const ornaments = resolveActorOrnaments(cfg);
          const hair = resolveActorHair(cfg);
          const clothing = resolveActorClothing(cfg);
          const faceConfig = resolveActorFaceConfig(cfg);
          const rig = buildRobloxR6CharacterRig(
            colors,
            ornaments,
            faceConfig,
            this.studTextures,
            this.shadowTex,
            hair,
            clothing,
            this.renderer.capabilities.getMaxAnisotropy(),
            sanitizeCharacterModelBuildId(cfg.modelBuild),
          );
          rig.root.userData.actorId = cfg.id;
          this.actors.set(cfg.id, {
            config: cfg,
            group: rig.root,
            rig,
            selectionRing: rig.selectionRing,
          });
          this.scene.add(rig.root);
        } else {
          const group = buildRobloxPropGroup(
            cfg.propKind ?? 'spawnpad',
            cfg.primaryColor,
            cfg.accentColor,
            this.studTextures,
            this.shadowTex,
            this.renderer.capabilities.getMaxAnisotropy(),
            cfg.propItemId,
          );
          group.userData.actorId = cfg.id;
          const ring = new THREE.Mesh(
            new THREE.RingGeometry(0.75, 0.87, 36),
            new THREE.MeshBasicMaterial({
              color: 0x00a2ff,
              side: THREE.DoubleSide,
              transparent: true,
              opacity: 0.92,
              depthWrite: false,
            }),
          );
          ring.rotation.x = -Math.PI / 2;
          ring.position.y = 0.025;
          ring.visible = false;
          group.add(ring);
          this.actors.set(cfg.id, {
            config: cfg,
            group,
            selectionRing: ring,
          });
          this.scene.add(group);
        }
      } else if (existing) {
        existing.config = cfg;
        if (existing.rig) {
          existing.rig.setModelBuild(sanitizeCharacterModelBuildId(cfg.modelBuild));
          existing.rig.setBodyColors(cfg.bodyColors ?? fallbackBundle.bodyColors);
          existing.rig.setOrnaments(resolveActorOrnaments(cfg));
          existing.rig.setHair(resolveActorHair(cfg));
          existing.rig.setClothing(resolveActorClothing(cfg));
          existing.rig.setFaceConfig(resolveActorFaceConfig(cfg));
        }
      }
    }

    // 4. Dynamic Stage Lights diff (Point / Spot)
    const nextLightIds = new Set((project.stageLights ?? []).map((l) => l.id));
    for (const [id, managed] of this.stageLightsMap.entries()) {
      if (!nextLightIds.has(id)) {
        this.scene.remove(managed.light);
        if (managed.targetObj) this.scene.remove(managed.targetObj);
        this.scene.remove(managed.fixtureGroup);
        this.scene.remove(managed.helper);
        managed.helper.dispose();
        this.disposeObject3D(managed.fixtureGroup);
        managed.light.dispose();
        this.stageLightsMap.delete(id);
      }
    }

    let shadowSpotCount = 0;
    for (const lCfg of project.stageLights ?? []) {
      const existing = this.stageLightsMap.get(lCfg.id);
      const needsRebuild = !existing || existing.config.type !== lCfg.type;

      if (needsRebuild) {
        if (existing) {
          this.scene.remove(existing.light);
          if (existing.targetObj) this.scene.remove(existing.targetObj);
          this.scene.remove(existing.fixtureGroup);
          this.scene.remove(existing.helper);
          existing.helper.dispose();
          this.disposeObject3D(existing.fixtureGroup);
          existing.light.dispose();
        }

        const allowShadow = !this.isSoftwareGl && lCfg.castShadow && shadowSpotCount < 1;
        if (allowShadow && lCfg.type === 'spot') {
          shadowSpotCount++;
        }

        if (lCfg.type === 'spot') {
          const spot = new THREE.SpotLight(
            lCfg.color,
            lCfg.enabled ? lCfg.intensity : 0,
            lCfg.distance,
            degToRad(lCfg.angleDeg),
            lCfg.penumbra,
            2,
          );
          spot.position.set(lCfg.position[0], lCfg.position[1], lCfg.position[2]);
          spot.castShadow = allowShadow;
          if (allowShadow) {
            spot.shadow.mapSize.set(512, 512);
            spot.shadow.bias = -0.0006;
          }
          const targetObj = new THREE.Object3D();
          targetObj.position.set(lCfg.target[0], lCfg.target[1], lCfg.target[2]);
          this.scene.add(targetObj);
          spot.target = targetObj;
          this.scene.add(spot);

          const fixtureGroup = buildStageLightFixture('spot', lCfg.color, lCfg.enabled);
          fixtureGroup.position.copy(spot.position);
          fixtureGroup.lookAt(targetObj.position);
          this.scene.add(fixtureGroup);

          const helper = new THREE.SpotLightHelper(spot);
          this.scene.add(helper);

          this.stageLightsMap.set(lCfg.id, {
            config: lCfg,
            light: spot,
            targetObj,
            fixtureGroup,
            helper,
          });
        } else {
          const point = new THREE.PointLight(
            lCfg.color,
            lCfg.enabled ? lCfg.intensity : 0,
            lCfg.distance,
            2,
          );
          point.position.set(lCfg.position[0], lCfg.position[1], lCfg.position[2]);
          this.scene.add(point);

          const fixtureGroup = buildStageLightFixture('point', lCfg.color, lCfg.enabled);
          fixtureGroup.position.copy(point.position);
          this.scene.add(fixtureGroup);

          const helper = new THREE.PointLightHelper(point, 0.35);
          this.scene.add(helper);

          this.stageLightsMap.set(lCfg.id, {
            config: lCfg,
            light: point,
            fixtureGroup,
            helper,
          });
        }
      } else if (existing) {
        existing.config = lCfg;
        existing.light.color.set(lCfg.color);
        existing.light.intensity = lCfg.enabled ? lCfg.intensity : 0;
        existing.light.distance = lCfg.distance;
        existing.light.position.set(
          lCfg.position[0],
          lCfg.position[1],
          lCfg.position[2],
        );

        if (existing.light instanceof THREE.SpotLight && existing.targetObj) {
          existing.light.angle = degToRad(lCfg.angleDeg);
          existing.light.penumbra = lCfg.penumbra;
          existing.targetObj.position.set(
            lCfg.target[0],
            lCfg.target[1],
            lCfg.target[2],
          );
          existing.targetObj.updateMatrixWorld();
          const allowShadow =
            !this.isSoftwareGl && lCfg.castShadow && shadowSpotCount < 1;
          if (allowShadow) shadowSpotCount++;
          existing.light.castShadow = allowShadow;
          existing.fixtureGroup.lookAt(existing.targetObj.position);
        }

        existing.fixtureGroup.position.copy(existing.light.position);
        updateStageLightFixtureColor(existing.fixtureGroup, lCfg.color, lCfg.enabled);
        existing.light.updateMatrixWorld();
        existing.helper.update();
      }
    }

    // 5. Cutscene camera trajectory curve
    this.rebuildCameraPathLine();

    // 6. Re-attach selection if still present
    if (this.selectedActorId && this.actors.has(this.selectedActorId)) {
      this.selectActor(this.selectedActorId);
    }

    this.updateCameraRigVisibility();
    this.evaluateAndApply(this.currentTime);
    this.requestRender();
  }

  private rebuildCameraPathLine() {
    if (this.cameraPathLine) {
      this.scene.remove(this.cameraPathLine);
      this.cameraPathLine.geometry.dispose();
      (this.cameraPathLine.material as THREE.Material).dispose();
      this.cameraPathLine = null;
    }

    const samples: THREE.Vector3[] = [];
    const steps = clamp(Math.round(this.project.duration * 1.5), 80, 180);
    for (let i = 0; i <= steps; i++) {
      const t = (i / steps) * this.project.duration;
      const frame = evaluateProjectAt(this.project, t);
      samples.push(
        new THREE.Vector3(
          frame.camera.position[0],
          frame.camera.position[1],
          frame.camera.position[2],
        ),
      );
    }
    const geo = new THREE.BufferGeometry().setFromPoints(samples);
    const mat = new THREE.LineDashedMaterial({
      color: 0xf59e0b,
      dashSize: 0.25,
      gapSize: 0.14,
      transparent: true,
      opacity: 0.78,
    });
    const line = new THREE.Line(geo, mat);
    line.computeLineDistances();
    line.visible =
      this.cameraMode === 'orbit' && this.showCameraRig && !this.isRecordingExport;
    this.scene.add(line);
    this.cameraPathLine = line;
  }

  public selectActor(actorId: string | null) {
    this.selectedActorId = actorId;
    this.actors.forEach((managed, id) => {
      const isSelected =
        id === actorId && this.cameraMode === 'orbit' && !this.isRecordingExport;
      if (managed.selectionRing) {
        managed.selectionRing.visible = isSelected;
      }
    });

    if (
      actorId &&
      this.cameraMode === 'orbit' &&
      !this.isPlaying &&
      !this.isRecordingExport
    ) {
      const target = this.actors.get(actorId);
      if (target) {
        this.transformControls.attach(target.group);
      } else {
        this.transformControls.detach();
      }
    } else {
      this.transformControls.detach();
    }
    this.requestRender();
  }

  public setGizmoMode(mode: GizmoMode) {
    this.transformControls.setMode(mode);
    this.requestRender();
  }

  public setCameraMode(mode: CameraMode) {
    if (this.isRecordingExport) return;
    this.cameraMode = mode;
    this.orbitControls.enabled = mode === 'orbit';
    this.updateCameraRigVisibility();
    this.evaluateAndApply(this.currentTime);
    this.selectActor(this.selectedActorId);
    this.requestRender();
  }

  public setShowCameraRig(visible: boolean) {
    this.showCameraRig = visible;
    this.updateCameraRigVisibility();
    this.requestRender();
  }

  public setShowLightHelpers(visible: boolean) {
    this.showLightHelpers = visible;
    this.updateCameraRigVisibility();
    this.requestRender();
  }

  public setSelectedMapModuleId(moduleId: string | null) {
    this.selectedMapModuleId = moduleId;
    this.updateMapModuleSelectionRings();
    this.requestRender();
  }

  private getVisibleMapModuleId(): string | null {
    if (
      this.cameraMode !== 'orbit' ||
      this.isPlaying ||
      this.isRecordingExport
    ) {
      return null;
    }
    return this.selectedMapModuleId;
  }

  private updateMapModuleSelectionRings() {
    if (!this.envGroup) return;
    const visibleId = this.getVisibleMapModuleId();
    this.envGroup.traverse((obj) => {
      const ringId = obj.userData?.mapModuleRingId as string | undefined;
      if (ringId !== undefined) {
        obj.visible = visibleId !== null && ringId === visibleId;
      }
    });
  }

  private updateCameraRigVisibility() {
    const showCam =
      this.cameraMode === 'orbit' && this.showCameraRig && !this.isRecordingExport;
    this.cameraHelper.visible = showCam;
    if (this.cameraPathLine) {
      this.cameraPathLine.visible = showCam;
    }

    const showLights =
      this.cameraMode === 'orbit' &&
      this.showLightHelpers &&
      !this.isRecordingExport;
    this.stageLightsMap.forEach((managed) => {
      managed.helper.visible = showLights && managed.config.enabled;
      managed.fixtureGroup.visible = showLights;
    });
    this.updateMapModuleSelectionRings();
  }

  public setPoseOverride(actorId: string | null, pose: EvaluatedPose | null) {
    if (actorId && pose) {
      this.poseOverride = { actorId, pose };
    } else {
      this.poseOverride = null;
    }
    this.evaluateAndApply(this.currentTime);
    this.requestRender();
  }

  public setFaceOverride(actorId: string | null, face: EvaluatedFaceState | null) {
    if (actorId && face) {
      this.faceOverride = { actorId, face };
    } else {
      this.faceOverride = null;
    }
    this.evaluateAndApply(this.currentTime);
    this.requestRender();
  }

  public setItemOverride(actorId: string | null, heldItems: EvaluatedHeldItems | null) {
    if (actorId && heldItems) {
      this.itemOverride = { actorId, heldItems };
    } else {
      this.itemOverride = null;
    }
    this.evaluateAndApply(this.currentTime);
    this.requestRender();
  }

  private stopStatePreviewTicker() {
    if (this.statePreviewTimerId) {
      cancelAnimationFrame(this.statePreviewTimerId);
      clearTimeout(this.statePreviewTimerId);
      this.statePreviewTimerId = 0;
    }
  }

  private hasActiveLivePreview(): boolean {
    const hasState = Boolean(this.stateOverride && this.stateOverride.stateId !== 'normal');
    const hasAction = Boolean(this.actionOverride && this.actionOverride.actionId !== 'none');
    return hasState || hasAction;
  }

  private startStatePreviewTicker() {
    this.stopStatePreviewTicker();
    if (this.disposed || this.isPlaying || !this.hasActiveLivePreview()) return;

    const step = () => {
      if (this.disposed || this.isPlaying || !this.hasActiveLivePreview()) {
        this.statePreviewTimerId = 0;
        return;
      }
      this.evaluateAndApply(this.currentTime);
      this.renderCurrentCamera();
      if (this.isSoftwareGl) {
        this.statePreviewTimerId = window.setTimeout(step, 240);
      } else {
        this.statePreviewTimerId = requestAnimationFrame(step);
      }
    };

    if (this.isSoftwareGl) {
      this.statePreviewTimerId = window.setTimeout(step, 240);
    } else {
      this.statePreviewTimerId = requestAnimationFrame(step);
    }
  }

  public setCharacterStateOverride(
    actorId: string | null,
    override: {
      stateId: CharacterStateId;
      intensity: number;
      targetLimb: CharacterStateLimb;
      seed: number;
    } | null,
  ) {
    this.stopStatePreviewTicker();
    if (actorId && override) {
      this.stateOverride = {
        actorId,
        stateId: override.stateId,
        intensity: override.intensity,
        targetLimb: override.targetLimb,
        seed: override.seed,
        previewStartMs: performance.now(),
      };
    } else {
      this.stateOverride = null;
    }
    this.evaluateAndApply(this.currentTime);
    this.requestRender();
    if (!this.isPlaying && this.hasActiveLivePreview()) {
      this.startStatePreviewTicker();
    }
  }

  public setCharacterActionOverride(
    actorId: string | null,
    override: {
      actionId: CharacterActionId;
      intensity: number;
      source: CharacterActionSource;
      seed: number;
    } | null,
  ) {
    this.stopStatePreviewTicker();
    if (actorId && override) {
      this.actionOverride = {
        actorId,
        actionId: override.actionId,
        intensity: override.intensity,
        source: override.source,
        seed: override.seed,
        previewStartMs: performance.now(),
      };
    } else {
      this.actionOverride = null;
    }
    this.evaluateAndApply(this.currentTime);
    this.requestRender();
    if (!this.isPlaying && this.hasActiveLivePreview()) {
      this.startStatePreviewTicker();
    }
  }

  public focusActorFace(actorId: string) {
    const managed = this.actors.get(actorId);
    if (!managed || !managed.rig) return;
    managed.group.updateMatrixWorld(true);
    // World position of the character's 3D sculpted face center
    managed.rig.faceRig.root.getWorldPosition(_vec3A);
    managed.rig.torsoPivot.getWorldQuaternion(_quatA);
    // Forward direction (+Z in character local space) with slight 3/4 portrait offset
    _vec3B.set(0.32, 0.08, 1.55).applyQuaternion(_quatA).add(_vec3A);

    this.cameraMode = 'orbit';
    this.orbitControls.enabled = true;
    this.orbitCamera.position.copy(_vec3B);
    this.orbitControls.target.copy(_vec3A);
    this.orbitControls.update();
    this.updateCameraRigVisibility();
    this.requestRender();
  }

  public setTime(time: number) {
    this.currentTime = Math.max(0, Math.min(this.project.duration, time));
    this.evaluateAndApply(this.currentTime);
    this.requestRender();
  }

  public getTime(): number {
    return this.currentTime;
  }

  public setPlaybackSpeed(speed: number) {
    this.playbackSpeed = speed;
  }

  public setPlaying(playing: boolean) {
    if (this.isRecordingExport) return;
    if (this.isPlaying === playing) return;
    this.isPlaying = playing;

    if (playing) {
      this.poseOverride = null;
      this.faceOverride = null;
      this.itemOverride = null;
      this.stateOverride = null;
      this.actionOverride = null;
      this.stopStatePreviewTicker();
      this.transformControls.detach();
      this.updateMapModuleSelectionRings();
      this.lastTickMs = performance.now();
      this.startLoop();
    } else {
      this.selectActor(this.selectedActorId);
      this.updateMapModuleSelectionRings();
      this.requestRender();
    }
  }

  public snapOrbitToDirectorCamera() {
    const frame = evaluateProjectAt(this.project, this.currentTime);
    this.orbitCamera.position.set(
      frame.camera.position[0] + frame.camera.shakeOffset[0],
      frame.camera.position[1] + frame.camera.shakeOffset[1],
      frame.camera.position[2] + frame.camera.shakeOffset[2],
    );
    this.orbitControls.target.set(
      frame.camera.target[0],
      frame.camera.target[1],
      frame.camera.target[2],
    );
    this.orbitBaseFov = frame.camera.fov;
    this.orbitCamera.fov = computeResponsiveFov(
      this.orbitBaseFov,
      this.orbitCamera.aspect,
    );
    this.orbitCamera.updateProjectionMatrix();
    this.orbitControls.update();
    this.requestRender();
  }

  public applyShotFramingPreset(
    preset: CameraFramingPreset,
    actorId: string | null,
  ): { position: Vec3Tuple; target: Vec3Tuple; fov: number } {
    const frame = evaluateProjectAt(this.project, this.currentTime);
    const chars = this.project.actors.filter((a) => a.kind === 'character');
    const primaryId = actorId ?? chars[0]?.id ?? this.project.actors[0]?.id ?? null;
    const primaryPos: Vec3Tuple =
      primaryId && frame.actors[primaryId]
        ? frame.actors[primaryId].position
        : [0, 0, 0];

    let position: Vec3Tuple;
    let target: Vec3Tuple;
    let fov = 52;

    switch (preset) {
      case 'closeUp': {
        position = [
          round2(primaryPos[0] + 0.95),
          round2(primaryPos[1] + 1.8),
          round2(primaryPos[2] + 3.2),
        ];
        target = [
          round2(primaryPos[0]),
          round2(primaryPos[1] + 1.55),
          round2(primaryPos[2]),
        ];
        fov = 46;
        break;
      }
      case 'lowAngle': {
        position = [
          round2(primaryPos[0] - 2.1),
          round2(primaryPos[1] + 0.7),
          round2(primaryPos[2] + 4.1),
        ];
        target = [
          round2(primaryPos[0]),
          round2(primaryPos[1] + 1.35),
          round2(primaryPos[2]),
        ];
        fov = 52;
        break;
      }
      case 'twoShot': {
        const secondPos: Vec3Tuple =
          chars[1] && frame.actors[chars[1].id]
            ? frame.actors[chars[1].id].position
            : primaryPos;
        const cx = (primaryPos[0] + secondPos[0]) * 0.5;
        const cy = (primaryPos[1] + secondPos[1]) * 0.5;
        const cz = (primaryPos[2] + secondPos[2]) * 0.5;
        const span = Math.hypot(
          secondPos[0] - primaryPos[0],
          secondPos[2] - primaryPos[2],
        );
        const dist = Math.max(6.4, round2(span * 1.35 + 3.8));
        position = [round2(cx + 0.65), round2(cy + 2.45), round2(cz + dist)];
        target = [round2(cx), round2(cy + 1.35), round2(cz)];
        fov = 52;
        break;
      }
      case 'wide':
      default: {
        position = [0, 4.2, 10.2];
        target = [0, 1.35, 0];
        fov = 54;
        break;
      }
    }

    this.orbitCamera.position.set(position[0], position[1], position[2]);
    this.orbitControls.target.set(target[0], target[1], target[2]);
    this.orbitBaseFov = fov;
    this.orbitCamera.fov = computeResponsiveFov(fov, this.orbitCamera.aspect);
    this.orbitCamera.updateProjectionMatrix();
    this.orbitControls.update();
    this.requestRender();
    return { position, target, fov };
  }

  public getOrbitCameraPose(): { position: Vec3Tuple; target: Vec3Tuple; fov: number } {
    const p = this.orbitCamera.position;
    const t = this.orbitControls.target;
    return {
      position: [round2(p.x), round2(p.y), round2(p.z)],
      target: [round2(t.x), round2(t.y), round2(t.z)],
      fov: Math.round(this.orbitBaseFov),
    };
  }

  private resolveLookTargetWorldPos(
    targetId: string | undefined,
    selfId: string,
    activeCamera: THREE.Camera,
    out: THREE.Vector3,
  ): boolean {
    if (!targetId || targetId === 'none' || targetId === 'forward' || targetId === 'manual') {
      return false;
    }
    if (targetId === 'camera') {
      out.copy(activeCamera.position);
      return true;
    }
    if (targetId === selfId) return false;
    const other = this.actors.get(targetId);
    if (!other || !other.group.visible) {
      out.copy(activeCamera.position);
      return true;
    }
    if (other.rig) {
      other.rig.faceRig.root.getWorldPosition(out);
    } else {
      other.group.getWorldPosition(out);
      switch (other.config.propKind) {
        case 'rainingCatsDogs':
        case 'flyingPigs':
          out.y += 4.35;
          break;
        case 'africanElephant':
          out.y += 1.95;
          out.z += 0.85;
          break;
        case 'clydesdalePlatter':
          out.y += 2.15;
          break;
        case 'beanWaterfall':
          out.y += 1.15;
          out.z += 0.55;
          break;
        case 'iceFeet':
        case 'grocerySpill':
        case 'steelUmbrella':
          out.y += 0.35;
          break;
        case 'plasterCast':
          out.y += 0.55;
          break;
        default:
          out.y += 1.1;
          break;
      }
    }
    return true;
  }

  private evaluateAndApply(time: number) {
    const frame = evaluateProjectAt(this.project, time);
    this.lastEvaluatedFrame = frame;

    // Pass 1: Apply root transforms, layered poses, and secondary motion for all actors
    for (const [id, actorState] of Object.entries(frame.actors)) {
      const managed = this.actors.get(id);
      if (!managed) continue;

      if (!this.isDraggingGizmo || this.selectedActorId !== id) {
        managed.group.position.set(
          actorState.position[0],
          actorState.position[1],
          actorState.position[2],
        );
        managed.group.rotation.set(
          actorState.rotation[0],
          actorState.rotation[1],
          actorState.rotation[2],
        );
        managed.group.scale.set(
          actorState.scale[0],
          actorState.scale[1],
          actorState.scale[2],
        );
      }

      const isScaledVisible =
        Math.max(
          Math.abs(managed.group.scale.x),
          Math.abs(managed.group.scale.y),
          Math.abs(managed.group.scale.z),
        ) > 0.001;
      const isFirstPersonPovActor =
        this.cameraMode === 'director' &&
        Boolean(frame.camera.povActorId && frame.camera.povActorId === id);

      if (managed.rig) {
        managed.group.visible = isScaledVisible;
        managed.rig.torsoPivot.visible = !isFirstPersonPovActor;
      } else {
        managed.group.visible = isScaledVisible && !isFirstPersonPovActor;
      }

      if (!isScaledVisible) {
        continue;
      }

      if (managed.rig) {
        if (this.poseOverride && this.poseOverride.actorId === id && !this.isPlaying) {
          managed.rig.applyPose(this.poseOverride.pose);
        } else {
          managed.rig.applyPose(actorState.pose);
        }
        const activeItems =
          this.itemOverride && this.itemOverride.actorId === id && !this.isPlaying
            ? this.itemOverride.heldItems
            : actorState.heldItems;
        if (activeItems) {
          managed.rig.setHeldItems(activeItems);
        }
        managed.rig.applySecondaryMotion(actorState.secondaryMotion, time);
      } else if (managed.config.propKind === 'speeder') {
        managed.group.position.y += Math.sin(time * 2.8) * 0.06;
      } else if (managed.config.propKind === 'heldItem') {
        animateHeldItemGroup(managed.group, time);
      } else if (managed.config.propKind === 'campfire') {
        managed.group.traverse((obj) => {
          if (obj.userData?.isCampfireFlame) {
            const phase = (obj.userData.phaseOffset as number) ?? 0;
            const sy = 0.88 + Math.sin(time * 9.5 + phase) * 0.16;
            const sxz = 0.94 + Math.cos(time * 7.2 + phase) * 0.08;
            obj.scale.set(sxz, sy, sxz);
          }
        });
      } else if (managed.config.propKind) {
        animateIdiomProp(managed.group, managed.config.propKind, time);
      }
      managed.group.updateMatrixWorld(true);
    }

    // Update director camera first so Look-At & Eye Gaze can track the exact active camera position
    this.directorCamera.position.set(
      frame.camera.position[0] + frame.camera.shakeOffset[0],
      frame.camera.position[1] + frame.camera.shakeOffset[1],
      frame.camera.position[2] + frame.camera.shakeOffset[2],
    );
    _vec3A.set(frame.camera.target[0], frame.camera.target[1], frame.camera.target[2]);
    this.directorCamera.lookAt(_vec3A);
    if (frame.camera.rollRad !== 0) {
      this.directorCamera.rotateZ(frame.camera.rollRad);
    }
    const targetFov = computeResponsiveFov(
      frame.camera.fov,
      this.directorCamera.aspect,
    );
    if (Math.abs(this.directorCamera.fov - targetFov) > 0.05) {
      this.directorCamera.fov = targetFov;
      this.directorCamera.updateProjectionMatrix();
    }
    this.directorCamera.updateMatrixWorld();
    this.cameraHelper.update();

    // Pass 2: World-space Head Look-At & 3D Sculpted Face Expression + Eye Gaze
    const activeCam =
      this.cameraMode === 'director' ? this.directorCamera : this.orbitCamera;

    for (const [id, actorState] of Object.entries(frame.actors)) {
      const managed = this.actors.get(id);
      if (!managed || !managed.rig || !managed.group.visible) continue;

      const cfg = managed.config;
      const faceCfg = resolveActorFaceConfig(cfg);

      // Head Look-At constraint
      const lookWeight = cfg.lookAtWeight ?? 0.65;
      if (
        cfg.lookAtTarget &&
        cfg.lookAtTarget !== 'none' &&
        lookWeight > 0.01 &&
        this.resolveLookTargetWorldPos(cfg.lookAtTarget, id, activeCam, _vec3B)
      ) {
        managed.rig.faceRig.root.getWorldPosition(_vec3C);
        _vec3B.sub(_vec3C);
        managed.rig.torsoPivot.getWorldQuaternion(_quatA).invert();
        _vec3B.applyQuaternion(_quatA);
        if (_vec3B.z > -0.6) {
          const horiz = Math.max(0.001, Math.hypot(_vec3B.x, Math.max(0.15, _vec3B.z)));
          const yaw = clamp(Math.atan2(_vec3B.x, Math.max(0.15, _vec3B.z)), -0.68, 0.68);
          const pitch = clamp(-Math.atan2(_vec3B.y, horiz), -0.38, 0.38);
          managed.rig.applyHeadLookAt(yaw, pitch, lookWeight);
          managed.rig.pivots.head.updateMatrixWorld(true);
        }
      }

      // 3D Face Expression + Eye Gaze tracking
      const activeFace =
        this.faceOverride && this.faceOverride.actorId === id && !this.isPlaying
          ? this.faceOverride.face
          : actorState.face;

      let gazeOverride: { x: number; y: number } | null = null;
      if (
        (!this.faceOverride || this.faceOverride.actorId !== id) &&
        faceCfg.gazeTarget &&
        faceCfg.gazeTarget !== 'manual' &&
        faceCfg.gazeTarget !== 'forward' &&
        this.resolveLookTargetWorldPos(faceCfg.gazeTarget, id, activeCam, _vec3B)
      ) {
        managed.rig.faceRig.root.getWorldPosition(_vec3C);
        _vec3B.sub(_vec3C);
        managed.rig.pivots.head.getWorldQuaternion(_quatA).invert();
        _vec3B.applyQuaternion(_quatA);
        if (_vec3B.z > 0.05) {
          const gx = clamp(Math.atan2(_vec3B.x, _vec3B.z) * 1.45, -1, 1);
          const gy = clamp(Math.atan2(_vec3B.y, _vec3B.z) * 1.55, -1, 1);
          gazeOverride = { x: gx, y: gy };
        }
      } else if (faceCfg.gazeTarget === 'forward' && (!this.faceOverride || this.faceOverride.actorId !== id)) {
        gazeOverride = { x: 0, y: 0 };
      }

      // Resolve Character Action Function early so mouth/eye sync blends cleanly into the 3D Face Rig
      let activeCharAction: EvaluatedCharacterAction =
        actorState.characterAction ?? createDefaultCharacterAction();
      let actionClock = time;
      if (
        this.actionOverride &&
        this.actionOverride.actorId === id &&
        !this.isPlaying
      ) {
        const previewElapsed = Math.max(
          0,
          (performance.now() - this.actionOverride.previewStartMs) / 1000,
        );
        activeCharAction = {
          actionId: this.actionOverride.actionId,
          intensity: this.actionOverride.intensity,
          source: this.actionOverride.source,
          triggerTime: time,
          elapsedSec: previewElapsed,
          seed: this.actionOverride.seed,
        };
        actionClock = time + previewElapsed;
      }

      const faceOverlay =
        !this.faceOverride || this.faceOverride.actorId !== id
          ? getActionFaceSyncOverlay(activeCharAction, actionClock)
          : null;
      const syncedFace = faceOverlay
        ? {
            ...activeFace,
            params: {
              ...activeFace.params,
              ...faceOverlay,
            },
          }
        : activeFace;

      managed.rig.applyFaceState(syncedFace, gazeOverride);

      // Character State Framework FX (Broken Leg, Mind Blown, Frozen Feet, Dizzy, Steaming Mad)
      let activeCharState: EvaluatedCharacterState =
        actorState.characterState ?? createDefaultCharacterState();
      let stateClock = time;
      if (
        this.stateOverride &&
        this.stateOverride.actorId === id &&
        !this.isPlaying
      ) {
        const previewElapsed = Math.max(
          0,
          (performance.now() - this.stateOverride.previewStartMs) / 1000,
        );
        activeCharState = {
          stateId: this.stateOverride.stateId,
          intensity: this.stateOverride.intensity,
          targetLimb: this.stateOverride.targetLimb,
          triggerTime: time,
          elapsedSec: previewElapsed,
          seed: this.stateOverride.seed,
        };
        stateClock = time + previewElapsed;
      }
      managed.rig.applyCharacterState(activeCharState, stateClock);

      // Refresh world matrices after head look-at & state transforms so mouth/eye/hand sockets are exact
      managed.group.updateMatrixWorld(true);
      managed.rig.applyCharacterAction(activeCharAction, actionClock);
    }

    // Hot-swap map/skybox cleanly if timeline crosses a Stage/Map cue
    this.applyStageAppearance(
      frame.stage.environment,
      frame.stage.customMap,
      frame.stage.lightingMood,
    );

    // Apply keyframeable global lighting & sun orbit
    const moodSpec = getRobloxLightingSpec(
      frame.stage.lightingMood,
      frame.stage.environment,
    );
    const az = degToRad(frame.lighting.sunAzimuth);
    const el = degToRad(Math.max(5, Math.min(89, frame.lighting.sunElevation)));
    const radius = 16;
    const cosEl = Math.cos(el);
    this.keyLight.position.set(
      radius * cosEl * Math.sin(az),
      radius * Math.sin(el),
      radius * cosEl * Math.cos(az),
    );
    if (frame.lighting.keyColor) {
      this.keyLight.color.set(frame.lighting.keyColor);
    } else {
      this.keyLight.color.setHex(moodSpec.keyColor);
    }
    this.keyLight.intensity = frame.lighting.keyIntensity;
    this.rimLight.color.setHex(moodSpec.rimColor);
    this.rimLight.intensity = frame.lighting.rimIntensity;
    this.hemiLight.color.setHex(moodSpec.hemiSky);
    this.hemiLight.groundColor.setHex(moodSpec.hemiGround);
    this.hemiLight.intensity = frame.lighting.ambientIntensity;
    this.renderer.toneMappingExposure = frame.lighting.exposure;

    this.callbacks.onTimeUpdate(
      frame.time,
      frame.subtitle ? frame.subtitle.text : null,
      frame.subtitle ? frame.subtitle.speaker : null,
      frame.subtitle?.role ?? 'dialogue',
      frame.screenBlackout,
    );
  }

  private afterDraw(cb: () => void) {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    if (typeof gl.fenceSync === 'function') {
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const start = performance.now();
      const poll = () => {
        if (this.disposed) return;
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED && performance.now() - start < 110) {
          this.frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          this.frameId = window.setTimeout(cb, 80);
        }
      };
      this.frameId = window.setTimeout(poll, 5);
    } else {
      this.frameId = window.setTimeout(cb, 80);
    }
  }

  private startLoop() {
    if (this.isLoopActive || this.disposed) return;
    this.isLoopActive = true;
    const tick = () => {
      if (this.disposed || !this.isPlaying) {
        this.isLoopActive = false;
        return;
      }
      const now = performance.now();
      const dt = Math.min(0.4, (now - this.lastTickMs) / 1000);
      this.lastTickMs = now;

      let nextTime = this.currentTime + dt * this.playbackSpeed;
      if (nextTime >= this.project.duration) {
        if (this.project.loop) {
          nextTime = nextTime % this.project.duration;
        } else {
          nextTime = this.project.duration;
          this.isPlaying = false;
          this.isLoopActive = false;
          this.currentTime = nextTime;
          this.evaluateAndApply(nextTime);
          this.renderCurrentCamera();
          this.callbacks.onPlaybackEnded();
          return;
        }
      }
      this.currentTime = nextTime;
      this.evaluateAndApply(nextTime);

      if (this.cameraMode === 'orbit') {
        this.orbitControls.update();
      }
      this.renderCurrentCamera();

      if (this.isSoftwareGl) {
        this.afterDraw(tick);
      } else {
        this.frameId = requestAnimationFrame(tick);
      }
    };

    if (this.isSoftwareGl) {
      this.afterDraw(tick);
    } else {
      this.frameId = requestAnimationFrame(tick);
    }
  }

  public requestRender() {
    if (this.disposed || this.isPlaying) return;
    if (this.renderBusy) {
      this.renderDirty = true;
      return;
    }
    this.renderBusy = true;
    this.frameId = requestAnimationFrame(() => {
      if (this.disposed) return;
      this.renderDirty = false;
      if (this.cameraMode === 'orbit') {
        this.orbitControls.update();
      }
      this.renderCurrentCamera();
      const done = () => {
        this.renderBusy = false;
        if (this.renderDirty && !this.disposed) {
          this.requestRender();
        }
      };
      if (this.isSoftwareGl) {
        this.afterDraw(done);
      } else {
        done();
      }
    });
  }

  private renderCurrentCamera() {
    const activeCam =
      this.cameraMode === 'director' ? this.directorCamera : this.orbitCamera;
    this.renderer.render(this.scene, activeCam);
  }

  public capturePngDataUrl(): string {
    this.renderCurrentCamera();
    return this.renderer.domElement.toDataURL('image/png');
  }

  public startMp4Export(
    options: VideoExportOptions,
    callbacks: {
      onProgress: (info: {
        elapsedSec: number;
        durationSec: number;
        currentFrame: number;
        totalFrames: number;
        estimatedRemainingSec: number | null;
        encoderBackend: VideoEncoderBackend;
        format: VideoExportFormat;
        videoCodec: string;
        audioCodec: string | null;
        hasAudio: boolean;
        width: number;
        height: number;
        aspectRatio: VideoAspectRatio;
        streamedBytes?: number;
      }) => void;
      onFinalizing: (encoderBackend: VideoEncoderBackend) => void;
      onComplete: (result: VideoRecordedResult) => void;
      onError: (message: string) => void;
    },
    customVoiceover?: CustomVoiceoverTrack | null,
  ): boolean {
    if (this.isRecordingExport || this.disposed) return false;
    this.isRecordingExport = true;
    this.exportStopRequested = false;
    this.exportCancelRequested = false;
    void this.runOfflineMp4Export(options, callbacks, customVoiceover);
    return true;
  }

  private async runOfflineMp4Export(
    options: VideoExportOptions,
    callbacks: {
      onProgress: (info: {
        elapsedSec: number;
        durationSec: number;
        currentFrame: number;
        totalFrames: number;
        estimatedRemainingSec: number | null;
        encoderBackend: VideoEncoderBackend;
        format: VideoExportFormat;
        videoCodec: string;
        audioCodec: string | null;
        hasAudio: boolean;
        width: number;
        height: number;
        aspectRatio: VideoAspectRatio;
        streamedBytes?: number;
      }) => void;
      onFinalizing: (encoderBackend: VideoEncoderBackend) => void;
      onComplete: (result: VideoRecordedResult) => void;
      onError: (message: string) => void;
    },
    customVoiceover?: CustomVoiceoverTrack | null,
  ) {
    const prevCameraMode = this.cameraMode;
    const prevSelectedActor = this.selectedActorId;
    const prevTime = this.currentTime;
    const prevPixelRatio = this.renderer.getPixelRatio();

    // Pause live playback cleanly and switch to Director camera with helpers hidden
    this.isPlaying = false;
    this.isLoopActive = false;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);
    this.stopStatePreviewTicker();
    this.poseOverride = null;
    this.faceOverride = null;
    this.itemOverride = null;
    this.stateOverride = null;
    this.actionOverride = null;
    this.cameraMode = 'director';
    this.orbitControls.enabled = false;
    this.transformControls.detach();
    this.actors.forEach((m) => {
      if (m.selectionRing) m.selectionRing.visible = false;
    });
    this.updateCameraRigVisibility();

    let recorder: Mp4CutsceneRecorder | null = null;

    try {
      const aspectRatio: VideoAspectRatio = options.aspectRatio ?? '16:9';
      const targetDims = resolveExportDimensions(
        this.renderer.domElement,
        options.resolution,
        aspectRatio,
      );

      // Render WebGL buffer directly at target resolution before initializing encoder
      this.renderer.setPixelRatio(1);
      this.renderer.setSize(targetDims.width, targetDims.height, false);
      this.directorCamera.aspect = targetDims.width / targetDims.height;
      this.directorCamera.updateProjectionMatrix();

      const projectDur = Math.max(0.1, this.project.duration);
      const startSec = options.range
        ? clamp(options.range.startSec, 0, Math.max(0, projectDur - 0.1))
        : 0;
      const endSec = options.range
        ? clamp(options.range.endSec, startSec + 0.1, projectDur)
        : projectDur;
      const clipDuration = Math.max(0.1, endSec - startSec);

      // Optionally pre-generate AI narrator clips (unless replaced by custom voiceover) and synthesize sample-accurate offline audio
      if (options.includeAudio && !customVoiceover) {
        const narratorSettings = resolveNarratorSettings(this.project.narratorSettings);
        if (narratorSettings.engine === 'ai' && this.project.subtitles.length > 0) {
          await pregenerateProjectVoices(this.project, {
            start: startSec,
            end: endSec,
          }).catch(() => undefined);
        }
      }

      const audioBuffer = options.includeAudio
        ? await renderProjectAudioOffline(
            this.project,
            startSec,
            endSec,
            48000,
            customVoiceover,
          )
        : null;

      if (this.disposed || this.exportCancelRequested) {
        return;
      }

      recorder = await Mp4CutsceneRecorder.create(
        this.renderer.domElement,
        options,
        clipDuration,
        audioBuffer,
      );
      this.mp4Recorder = recorder;

      if (this.disposed || this.exportCancelRequested) {
        await recorder.cancel();
        return;
      }

      const fps = options.fps;
      const totalFrames = Math.max(2, Math.round(clipDuration * fps));
      const frameDurationSec = 1 / fps;
      const keyIntervalFrames = fps * 2;
      const gl = this.renderer.getContext();
      const exportStartMs = performance.now();
      let renderedFrames = 0;

      for (let frameIdx = 0; frameIdx < totalFrames; frameIdx++) {
        if (this.disposed || this.exportCancelRequested) {
          break;
        }
        if (this.exportStopRequested && frameIdx >= 2) {
          break;
        }

        const outTimestampSec = frameIdx * frameDurationSec;
        const t = Math.min(endSec, startSec + outTimestampSec);
        this.currentTime = t;
        this.evaluateAndApply(t);

        // Apply portrait/square vertical FOV compensation so wide shots don't crop characters
        if (aspectRatio !== '16:9') {
          const baseFov = this.lastEvaluatedFrame?.camera.fov ?? this.directorCamera.fov;
          const adjustedFov = computeVerticalFovForAspect(baseFov, aspectRatio);
          if (Math.abs(this.directorCamera.fov - adjustedFov) > 0.01) {
            this.directorCamera.fov = adjustedFov;
            this.directorCamera.updateProjectionMatrix();
          }
        }

        this.renderer.render(this.scene, this.directorCamera);
        gl.flush();

        const sub = this.lastEvaluatedFrame?.subtitle ?? null;
        const overrideDur = sub
          ? getCachedCueDuration(sub, this.project.narratorSettings)
          : undefined;
        await recorder.addFrame(
          this.renderer.domElement,
          sub,
          outTimestampSec,
          frameDurationSec,
          frameIdx % keyIntervalFrames === 0,
          this.lastEvaluatedFrame?.screenBlackout ?? 0,
          t,
          this.project.captionSettings,
          overrideDur,
        );
        renderedFrames = frameIdx + 1;

        const wallElapsedSec = (performance.now() - exportStartMs) / 1000;
        const remainingFrames = Math.max(0, totalFrames - renderedFrames);
        const estimatedRemainingSec =
          renderedFrames >= 3 && wallElapsedSec > 0.1
            ? (wallElapsedSec / renderedFrames) * remainingFrames
            : null;

        callbacks.onProgress({
          elapsedSec: Math.min(clipDuration, renderedFrames * frameDurationSec),
          durationSec: clipDuration,
          currentFrame: renderedFrames,
          totalFrames,
          estimatedRemainingSec,
          encoderBackend: recorder.backend,
          format: recorder.format,
          videoCodec: recorder.videoCodecLabel,
          audioCodec: recorder.audioCodecLabel,
          hasAudio: recorder.hasAudio,
          width: recorder.width,
          height: recorder.height,
          aspectRatio: recorder.aspectRatio,
          streamedBytes: recorder.getStreamedBytes(),
        });

        // Yield to keep UI controls (Stop Early / Cancel) and progress bar responsive
        await new Promise<void>((resolve) => window.setTimeout(resolve, 0));
      }

      if (this.disposed || this.exportCancelRequested) {
        await recorder.cancel();
        return;
      }

      callbacks.onFinalizing(recorder.backend);
      const actualDurationSec = Math.max(
        frameDurationSec * 2,
        renderedFrames * frameDurationSec,
      );
      const result = await recorder.finalize(actualDurationSec);
      if (!this.disposed && !this.exportCancelRequested) {
        callbacks.onComplete(result);
      }
    } catch (err) {
      if (recorder) {
        await recorder.cancel().catch(() => undefined);
      }
      if (!this.disposed && !this.exportCancelRequested) {
        callbacks.onError(
          err instanceof Error ? err.message : 'Unable to export cutscene video.',
        );
      }
    } finally {
      this.mp4Recorder = null;
      this.isRecordingExport = false;
      this.exportStopRequested = false;
      this.exportCancelRequested = false;

      if (!this.disposed) {
        this.renderer.setPixelRatio(prevPixelRatio);
        this.cameraMode = prevCameraMode;
        this.orbitControls.enabled = prevCameraMode === 'orbit';
        this.handleResize();
        this.updateCameraRigVisibility();
        this.currentTime = prevTime;
        this.evaluateAndApply(prevTime);
        this.selectActor(prevSelectedActor);
        this.requestRender();
      }
    }
  }

  public stopMp4Export() {
    if (!this.isRecordingExport) return;
    this.exportStopRequested = true;
  }

  public cancelMp4Export() {
    if (!this.isRecordingExport) return;
    this.exportCancelRequested = true;
    if (this.mp4Recorder) {
      void this.mp4Recorder.cancel();
    }
  }

  private disposeObject3D(root: THREE.Object3D) {
    root.traverse((obj) => {
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

  public dispose() {
    this.disposed = true;
    this.exportCancelRequested = true;
    this.stopStatePreviewTicker();
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);
    if (this.mp4Recorder) {
      void this.mp4Recorder.cancel();
      this.mp4Recorder = null;
    }
    this.resizeObserver.disconnect();
    this.renderer.domElement.removeEventListener('pointerdown', this.handlePointerDown);
    this.renderer.domElement.removeEventListener('pointerup', this.handlePointerUp);
    this.renderer.domElement.removeEventListener('webglcontextlost', this.handleContextLost);
    this.renderer.domElement.removeEventListener('webglcontextrestored', this.handleContextRestored);
    this.orbitControls.dispose();
    this.transformControls.dispose();
    this.shadowTex.dispose();
    this.studTextures.albedo.dispose();
    this.studTextures.bump.dispose();
    this.skyboxTex?.dispose();
    this.actors.forEach((m) => {
      m.rig?.disposeStateController();
      this.disposeObject3D(m.group);
    });
    this.stageLightsMap.forEach((l) => {
      l.helper.dispose();
      this.disposeObject3D(l.fixtureGroup);
      l.light.dispose();
    });
    this.envCache.forEach((group) => {
      this.scene.remove(group);
      this.disposeObject3D(group);
    });
    this.envCache.clear();
    this.envGroup = null;
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}

function buildStageLightFixture(
  type: 'point' | 'spot',
  color: string,
  enabled: boolean,
): THREE.Group {
  const group = new THREE.Group();
  const housingMat = new THREE.MeshStandardMaterial({
    color: '#1e2024',
    roughness: 0.45,
    metalness: 0.35,
  });
  const bulbMat = new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: enabled ? 1.2 : 0.1,
    roughness: 0.25,
    metalness: 0.05,
  });

  if (type === 'spot') {
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(0.11, 0.16, 0.26, 8),
      housingMat,
    );
    body.rotation.x = Math.PI / 2;
    group.add(body);

    const lens = new THREE.Mesh(
      new THREE.CylinderGeometry(0.13, 0.13, 0.04, 8),
      bulbMat,
    );
    lens.rotation.x = Math.PI / 2;
    lens.position.z = 0.13;
    lens.userData.isBulb = true;
    group.add(lens);
  } else {
    const bulb = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 0.22), bulbMat);
    bulb.userData.isBulb = true;
    group.add(bulb);
  }
  return group;
}

function updateStageLightFixtureColor(
  group: THREE.Group,
  color: string,
  enabled: boolean,
) {
  group.traverse((obj) => {
    if ((obj as THREE.Mesh).isMesh && obj.userData.isBulb) {
      const mat = (obj as THREE.Mesh).material as THREE.MeshStandardMaterial;
      mat.color.set(color);
      mat.emissive.set(color);
      mat.emissiveIntensity = enabled ? 1.2 : 0.1;
    }
  });
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
