import React, { useState } from 'react';
import {
  Shirt,
  Scissors,
  Crown,
  Shield,
  Palette,
  Sparkles,
  RotateCcw,
  SlidersHorizontal,
} from 'lucide-react';
import {
  ACCESSORY_COLOR_SWATCHES,
  ACCESSORY_COMBOS,
  AccessoryComboPreset,
  BELT_STYLE_OPTIONS,
  CLASSIC_BRICK_COLORS,
  CLOTHING_COLOR_SWATCHES,
  CLOTHING_PATTERN_OPTIONS,
  DEFAULT_ACCESSORY_FIT,
  FABRIC_MATERIAL_OPTIONS,
  FOOTWEAR_CATALOG,
  getHatTuckProfile,
  HAIR_ACCESSORY_CATALOG,
  HAIR_BANGS_CATALOG,
  HAIR_COLOR_SWATCHES,
  HAIR_FINISH_OPTIONS,
  HAIR_HIGHLIGHT_PATTERNS,
  HAIR_STYLE_CATALOG,
  normalizeAccessoryFit,
  ORNAMENT_CATALOG,
  OUTERWEAR_CATALOG,
  OUTFIT_PRESETS,
  OutfitPreset,
  PANT_CATALOG,
  ROBLOX_AVATAR_BUNDLES,
  SHIRT_CATALOG,
  SLEEVE_MODE_OPTIONS,
} from '../../engine/robloxCatalog';
import {
  AccessoryFit,
  BeltStyleId,
  ClothingConfig,
  ClothingPatternId,
  FabricMaterialId,
  FootwearId,
  HairAccessoryId,
  HairBangsStyleId,
  HairConfig,
  HairFinishId,
  HairHighlightPattern,
  HairStyleId,
  NormalizedR6Ornaments,
  ORNAMENT_SLOT_LABELS,
  OrnamentSlot,
  OuterwearStyleId,
  PantsStyleId,
  R6_BODY_PART_LABELS,
  R6_BODY_PARTS,
  R6BodyColors,
  R6BodyPartId,
  SceneActorConfig,
  ShirtStyleId,
  SleeveMode,
} from '../../engine/types';

type WardrobeCategory = 'outfits' | 'hair' | 'clothing' | 'hats' | 'gear';
type ClothingSection = 'top' | 'outerwear' | 'bottoms' | 'shoes';
type HeadwearSection = 'hat' | 'head';
type BodyGearSection = 'neck' | 'shoulder' | 'back' | 'waist' | 'armLegs' | 'skin';

interface WardrobePanelProps {
  actor: SceneActorConfig;
  bodyColors: R6BodyColors;
  ornaments: NormalizedR6Ornaments;
  hair: HairConfig;
  clothing: ClothingConfig;
  onApplyBundle: (actorId: string, bundleId: string) => void;
  onApplyOutfitPreset: (actorId: string, preset: OutfitPreset) => void;
  onUpdateBodyPartColor: (actorId: string, part: R6BodyPartId, hex: string) => void;
  onUpdateOrnament: (
    actorId: string,
    slot: OrnamentSlot,
    id: string,
    color: string,
    accentColor?: string,
  ) => void;
  onUpdateOrnamentFit: (
    actorId: string,
    slot: OrnamentSlot,
    fitPatch: Partial<AccessoryFit> | null,
  ) => void;
  onApplyAccessoryCombo: (actorId: string, combo: AccessoryComboPreset) => void;
  onUpdateHair: (actorId: string, patch: Partial<HairConfig>) => void;
  onUpdateClothing: (actorId: string, patch: Partial<ClothingConfig>) => void;
}

const SHORT_PART_LABELS: Record<R6BodyPartId, string> = {
  head: 'Head',
  torso: 'Torso',
  leftArm: 'L Arm',
  rightArm: 'R Arm',
  leftLeg: 'L Leg',
  rightLeg: 'R Leg',
};

const TUCK_DESCRIPTIONS: Record<string, string> = {
  none: 'Full crown volume',
  brim: 'Crown tucked under brim · bangs & tails free',
  crown: 'Crown compressed · fringe & tails visible',
  fullCover: 'Full helmet tuck · fringe peeks out',
};

export const WardrobePanel: React.FC<WardrobePanelProps> = ({
  actor,
  bodyColors,
  ornaments,
  hair,
  clothing,
  onApplyBundle,
  onApplyOutfitPreset,
  onUpdateBodyPartColor,
  onUpdateOrnament,
  onUpdateOrnamentFit,
  onApplyAccessoryCombo,
  onUpdateHair,
  onUpdateClothing,
}) => {
  const [category, setCategory] = useState<WardrobeCategory>('outfits');
  const [clothingSection, setClothingSection] = useState<ClothingSection>('top');
  const [headwearSection, setHeadwearSection] = useState<HeadwearSection>('hat');
  const [gearSection, setGearSection] = useState<BodyGearSection>('neck');
  const [armLegSubSlot, setArmLegSubSlot] = useState<'arm' | 'legs'>('arm');
  const [showFitTuning, setShowFitTuning] = useState(false);
  const [colorPart, setColorPart] = useState<R6BodyPartId>('torso');

  const activeHatTuck = getHatTuckProfile(ornaments.hat.id);
  const activeHatMeta = ORNAMENT_CATALOG.hat.find((h) => h.id === ornaments.hat.id);

  const renderAccessorySlotEditor = (
    slot: Exclude<OrnamentSlot, 'face'>,
    heading: string,
    subtitle: string,
    gridColsClass = 'grid-cols-4',
  ) => {
    const sel = ornaments[slot];
    const items = ORNAMENT_CATALOG[slot];
    const meta = items.find((i) => i.id === sel.id);
    const accent = sel.accentColor ?? meta?.defaultAccentColor ?? '#f5cd30';
    const fit = normalizeAccessoryFit(sel.fit);
    const isFitModified =
      Math.abs(fit.offsetY - DEFAULT_ACCESSORY_FIT.offsetY) > 0.001 ||
      Math.abs(fit.offsetZ - DEFAULT_ACCESSORY_FIT.offsetZ) > 0.001 ||
      Math.abs(fit.tiltX - DEFAULT_ACCESSORY_FIT.tiltX) > 0.1 ||
      Math.abs(fit.tiltZ - DEFAULT_ACCESSORY_FIT.tiltZ) > 0.1 ||
      Math.abs(fit.scale - DEFAULT_ACCESSORY_FIT.scale) > 0.001;
    const isEquipped = sel.id !== 'none';

    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 space-y-2 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-slate-400">{heading}</span>
            <span className="text-[11px] text-slate-400 truncate">{subtitle}</span>
          </div>

          <div className={`grid ${gridColsClass} gap-1 max-h-36 overflow-y-auto pr-0.5`}>
            {items.map((item) => {
              const active = sel.id === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() =>
                    onUpdateOrnament(
                      actor.id,
                      slot,
                      item.id,
                      item.defaultColor,
                      item.defaultAccentColor,
                    )
                  }
                  className={`flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-medium border transition-colors whitespace-nowrap truncate text-left ${
                    active
                      ? 'bg-[#00a2ff]/20 border-[#00a2ff] text-[#38bdf8]'
                      : 'bg-[#2b2e35] border-[#393d47] text-slate-300 hover:bg-[#363a43]'
                  }`}
                >
                  {item.id !== 'none' && (
                    <span
                      className="w-2.5 h-2.5 rounded-sm border border-black/40 shrink-0"
                      style={{ backgroundColor: item.defaultColor }}
                      aria-hidden="true"
                    />
                  )}
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-2 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-slate-400">
              {ORNAMENT_SLOT_LABELS[slot]} Style & Fit
            </span>
            <button
              type="button"
              onClick={() => setShowFitTuning((v) => !v)}
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium border transition-colors whitespace-nowrap ${
                showFitTuning || isFitModified
                  ? 'bg-[#00a2ff]/20 border-[#00a2ff] text-[#38bdf8]'
                  : 'bg-[#2b2e35] border-[#393d47] text-slate-300 hover:bg-[#363a43]'
              }`}
            >
              <SlidersHorizontal className="w-3 h-3" aria-hidden="true" />
              <span>{showFitTuning ? 'Colors' : 'Fit Tuning'}</span>
            </button>
          </div>

          {!showFitTuning ? (
            <>
              <div className="flex flex-wrap items-center gap-1">
                {ACCESSORY_COLOR_SWATCHES.map((sw) => (
                  <button
                    key={sw.name}
                    type="button"
                    disabled={!isEquipped}
                    title={sw.name}
                    aria-label={`Set ${ORNAMENT_SLOT_LABELS[slot]} color ${sw.name}`}
                    onClick={() =>
                      onUpdateOrnament(actor.id, slot, sel.id, sw.hex, accent)
                    }
                    style={{ backgroundColor: sw.hex }}
                    className={`w-4 h-4 rounded-sm border disabled:opacity-40 ${
                      sel.color.toLowerCase() === sw.hex.toLowerCase()
                        ? 'border-white ring-1 ring-[#00a2ff]'
                        : 'border-[#393d47]'
                    }`}
                  />
                ))}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <label className="flex items-center justify-between gap-1.5 text-[11px] text-slate-300">
                  <span>Primary</span>
                  <input
                    type="color"
                    disabled={!isEquipped}
                    aria-label={`${ORNAMENT_SLOT_LABELS[slot]} primary color`}
                    value={sel.color}
                    onChange={(e) =>
                      onUpdateOrnament(actor.id, slot, sel.id, e.target.value, accent)
                    }
                    className="w-6 h-5 rounded bg-transparent border border-[#393d47] cursor-pointer disabled:opacity-40"
                  />
                </label>
                <label className="flex items-center justify-between gap-1.5 text-[11px] text-slate-300">
                  <span>Accent</span>
                  <input
                    type="color"
                    disabled={!isEquipped}
                    aria-label={`${ORNAMENT_SLOT_LABELS[slot]} accent color`}
                    value={accent}
                    onChange={(e) =>
                      onUpdateOrnament(actor.id, slot, sel.id, sel.color, e.target.value)
                    }
                    className="w-6 h-5 rounded bg-transparent border border-[#393d47] cursor-pointer disabled:opacity-40"
                  />
                </label>
              </div>

              <div className="flex items-center justify-between gap-2 pt-0.5 text-[10px] text-slate-400">
                <span className="truncate">
                  {isEquipped ? meta?.label ?? sel.id : 'Slot empty'}
                  {isFitModified ? ' · Custom fit' : ''}
                </span>
                {isEquipped && (
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateOrnament(actor.id, slot, 'none', sel.color, accent)
                    }
                    className="text-slate-300 hover:text-white underline whitespace-nowrap"
                  >
                    Clear
                  </button>
                )}
              </div>
            </>
          ) : (
            <div className="space-y-1.5">
              <div className="grid grid-cols-2 gap-x-2.5 gap-y-1">
                <div className="flex items-center gap-1 min-w-0">
                  <span className="text-[10px] text-slate-400 w-9 shrink-0">Height</span>
                  <input
                    type="range"
                    min={-0.35}
                    max={0.35}
                    step={0.02}
                    disabled={!isEquipped}
                    aria-label={`${ORNAMENT_SLOT_LABELS[slot]} height offset`}
                    value={fit.offsetY}
                    onChange={(e) =>
                      onUpdateOrnamentFit(actor.id, slot, {
                        offsetY: Number(e.target.value),
                      })
                    }
                    className="studio-slider flex-1 min-w-0 disabled:opacity-40"
                  />
                  <span className="text-[10px] font-mono-tabular text-slate-300 w-8 text-right shrink-0">
                    {fit.offsetY.toFixed(2)}
                  </span>
                </div>

                <div className="flex items-center gap-1 min-w-0">
                  <span className="text-[10px] text-slate-400 w-9 shrink-0">Depth</span>
                  <input
                    type="range"
                    min={-0.3}
                    max={0.3}
                    step={0.02}
                    disabled={!isEquipped}
                    aria-label={`${ORNAMENT_SLOT_LABELS[slot]} depth offset`}
                    value={fit.offsetZ}
                    onChange={(e) =>
                      onUpdateOrnamentFit(actor.id, slot, {
                        offsetZ: Number(e.target.value),
                      })
                    }
                    className="studio-slider flex-1 min-w-0 disabled:opacity-40"
                  />
                  <span className="text-[10px] font-mono-tabular text-slate-300 w-8 text-right shrink-0">
                    {fit.offsetZ.toFixed(2)}
                  </span>
                </div>

                <div className="flex items-center gap-1 min-w-0">
                  <span className="text-[10px] text-slate-400 w-9 shrink-0">Tilt</span>
                  <input
                    type="range"
                    min={-30}
                    max={30}
                    step={1}
                    disabled={!isEquipped}
                    aria-label={`${ORNAMENT_SLOT_LABELS[slot]} forward tilt`}
                    value={fit.tiltX}
                    onChange={(e) =>
                      onUpdateOrnamentFit(actor.id, slot, {
                        tiltX: Number(e.target.value),
                      })
                    }
                    className="studio-slider flex-1 min-w-0 disabled:opacity-40"
                  />
                  <span className="text-[10px] font-mono-tabular text-slate-300 w-8 text-right shrink-0">
                    {Math.round(fit.tiltX)}°
                  </span>
                </div>

                <div className="flex items-center gap-1 min-w-0">
                  <span className="text-[10px] text-slate-400 w-9 shrink-0">Roll</span>
                  <input
                    type="range"
                    min={-30}
                    max={30}
                    step={1}
                    disabled={!isEquipped}
                    aria-label={`${ORNAMENT_SLOT_LABELS[slot]} side roll`}
                    value={fit.tiltZ}
                    onChange={(e) =>
                      onUpdateOrnamentFit(actor.id, slot, {
                        tiltZ: Number(e.target.value),
                      })
                    }
                    className="studio-slider flex-1 min-w-0 disabled:opacity-40"
                  />
                  <span className="text-[10px] font-mono-tabular text-slate-300 w-8 text-right shrink-0">
                    {Math.round(fit.tiltZ)}°
                  </span>
                </div>

                <div className="col-span-2 flex items-center gap-1.5 min-w-0">
                  <span className="text-[10px] text-slate-400 w-9 shrink-0">Scale</span>
                  <input
                    type="range"
                    min={0.75}
                    max={1.35}
                    step={0.05}
                    disabled={!isEquipped}
                    aria-label={`${ORNAMENT_SLOT_LABELS[slot]} scale`}
                    value={fit.scale}
                    onChange={(e) =>
                      onUpdateOrnamentFit(actor.id, slot, {
                        scale: Number(e.target.value),
                      })
                    }
                    className="studio-slider flex-1 min-w-0 disabled:opacity-40"
                  />
                  <span className="text-[10px] font-mono-tabular text-slate-300 w-9 text-right shrink-0">
                    {fit.scale.toFixed(2)}x
                  </span>
                  <button
                    type="button"
                    disabled={!isFitModified}
                    onClick={() => onUpdateOrnamentFit(actor.id, slot, null)}
                    title="Reset fit to default"
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#2b2e35] border border-[#393d47] text-[10px] text-slate-300 hover:text-white disabled:opacity-40 whitespace-nowrap"
                  >
                    <RotateCcw className="w-2.5 h-2.5" aria-hidden="true" />
                    <span>Reset</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-2.5 pt-2 border-t border-[#393d47]">
      {/* Category Navigation Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1 p-0.5 rounded-md bg-[#14161a] border border-[#393d47] overflow-x-auto">
          {(
            [
              { id: 'outfits', label: 'Outfits & Bundles', icon: Sparkles },
              { id: 'hair', label: 'Hair Framework', icon: Scissors },
              { id: 'clothing', label: 'Clothing', icon: Shirt },
              { id: 'hats', label: 'Hats & Eyewear', icon: Crown },
              { id: 'gear', label: 'Accessories & Body', icon: Shield },
            ] as const
          ).map((tab) => {
            const Icon = tab.icon;
            const active = category === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setCategory(tab.id)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  active
                    ? 'bg-[#00a2ff] text-slate-950 font-semibold'
                    : 'text-slate-300 hover:bg-[#2b2e35]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <div className="text-[11px] text-slate-400 truncate">
          <span>{HAIR_STYLE_CATALOG.find((h) => h.id === hair.styleId)?.label ?? 'No Hair'}</span>
          <span className="mx-1.5" aria-hidden="true">·</span>
          <span>{SHIRT_CATALOG.find((s) => s.id === clothing.shirtId)?.label ?? 'No Shirt'}</span>
          {clothing.outerwearId && clothing.outerwearId !== 'none' && (
            <>
              <span className="mx-1.5" aria-hidden="true">·</span>
              <span>
                {OUTERWEAR_CATALOG.find((o) => o.id === clothing.outerwearId)?.label}
              </span>
            </>
          )}
          <span className="mx-1.5" aria-hidden="true">·</span>
          <span>{activeHatMeta?.label ?? 'No Hat'}</span>
        </div>
      </div>

      {/* Category 1: Outfits & Bundles */}
      {category === 'outfits' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <label
              htmlFor="wardrobe-bundle-select"
              className="block text-xs font-medium text-slate-400"
            >
              Full Avatar Bundle (Body + Face + Outfit)
            </label>
            <select
              id="wardrobe-bundle-select"
              value={actor.bundleId ?? 'noob'}
              onChange={(e) => onApplyBundle(actor.id, e.target.value)}
              className="w-full px-2.5 py-1.5 rounded bg-[#14161a] border border-[#393d47] text-xs text-slate-100"
            >
              {ROBLOX_AVATAR_BUNDLES.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              {ROBLOX_AVATAR_BUNDLES.find((b) => b.id === (actor.bundleId ?? 'noob'))
                ?.description ?? 'Classic R6 character preset.'}
            </p>
          </div>

          <div className="md:col-span-2 space-y-1.5">
            <span className="block text-xs font-medium text-slate-400">
              Quick Outfit Presets (Keeps Skin & Face)
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {OUTFIT_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => onApplyOutfitPreset(actor.id, preset)}
                  className="flex flex-col items-start gap-1 p-2 rounded-md bg-[#2b2e35] border border-[#393d47] hover:border-[#00a2ff] hover:bg-[#32363e] transition-colors text-left"
                >
                  <div className="flex items-center justify-between w-full gap-1.5">
                    <span className="text-xs font-medium text-slate-100 truncate">
                      {preset.name}
                    </span>
                    <span className="flex items-center gap-0.5 shrink-0">
                      <span
                        className="w-2.5 h-2.5 rounded-sm border border-black/30"
                        style={{ backgroundColor: preset.clothing.shirtColor }}
                      />
                      <span
                        className="w-2.5 h-2.5 rounded-sm border border-black/30"
                        style={{ backgroundColor: preset.hair.primaryColor }}
                      />
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 truncate w-full">
                    {HAIR_STYLE_CATALOG.find((h) => h.id === preset.hair.styleId)?.label} ·{' '}
                    {SHIRT_CATALOG.find((s) => s.id === preset.clothing.shirtId)?.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Category 2: Dedicated Sculpted UGC Hair Framework */}
      {category === 'hair' && (() => {
        const activeBangs: HairBangsStyleId = hair.bangsStyle ?? 'auto';
        const activeAccessory: HairAccessoryId =
          hair.accessoryId ?? (hair.flowerAccessory ? 'hibiscus' : 'none');
        const activeAccessoryColor =
          hair.accessoryColor ??
          HAIR_ACCESSORY_CATALOG.find((a) => a.id === activeAccessory)?.defaultColor ??
          '#f472b6';
        const activeFinish: HairFinishId = hair.finish ?? 'silky';

        return (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-slate-400">
                  Sculpted Hairstyles (Full Scalp Coverage)
                </span>
                <span className="text-[11px] text-[#38bdf8] truncate">
                  Hat Fit: {TUCK_DESCRIPTIONS[activeHatTuck]}
                </span>
              </div>

              <div className="grid grid-cols-4 gap-1">
                {HAIR_STYLE_CATALOG.map((entry) => {
                  const active = hair.styleId === entry.id;
                  return (
                    <button
                      key={entry.id}
                      type="button"
                      title={entry.description}
                      onClick={() => {
                        const shouldDefaultColors = hair.styleId === 'none';
                        onUpdateHair(actor.id, {
                          styleId: entry.id as HairStyleId,
                          ...(shouldDefaultColors
                            ? {
                                primaryColor: entry.defaultColor,
                                highlightColor: entry.defaultHighlight,
                              }
                            : {}),
                        });
                      }}
                      className={`px-2 py-1 rounded text-[11px] font-medium border transition-colors whitespace-nowrap truncate text-left ${
                        active
                          ? 'bg-[#00a2ff]/20 border-[#00a2ff] text-[#38bdf8]'
                          : 'bg-[#2b2e35] border-[#393d47] text-slate-300 hover:bg-[#363a43]'
                      }`}
                    >
                      {entry.label}
                    </button>
                  );
                })}
              </div>

              {/* Mix-and-Match Bangs Row */}
              <div className="flex items-center gap-2 pt-0.5">
                <span className="text-[11px] text-slate-400 w-11 shrink-0">Bangs</span>
                <div className="grid grid-cols-7 gap-1 flex-1 min-w-0">
                  {HAIR_BANGS_CATALOG.map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() =>
                        onUpdateHair(actor.id, { bangsStyle: b.id })
                      }
                      className={`px-1.5 py-1 rounded text-[11px] font-medium border transition-colors whitespace-nowrap truncate ${
                        activeBangs === b.id
                          ? 'bg-[#00a2ff]/20 border-[#00a2ff] text-[#38bdf8]'
                          : 'bg-[#2b2e35] border-[#393d47] text-slate-300 hover:bg-[#363a43]'
                      }`}
                    >
                      {b.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <span className="block text-xs font-medium text-slate-400">
                Color, Sheen & Accessories
              </span>
              <div className="flex flex-wrap items-center gap-1">
                {HAIR_COLOR_SWATCHES.map((sw) => (
                  <button
                    key={sw.name}
                    type="button"
                    title={sw.name}
                    aria-label={`Set hair color ${sw.name}`}
                    onClick={() => onUpdateHair(actor.id, { primaryColor: sw.hex })}
                    style={{ backgroundColor: sw.hex }}
                    className={`w-4 h-4 rounded-sm border ${
                      hair.primaryColor.toLowerCase() === sw.hex.toLowerCase()
                        ? 'border-white ring-1 ring-[#00a2ff]'
                        : 'border-[#393d47]'
                    }`}
                  />
                ))}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <label className="flex items-center justify-between gap-1.5 text-[11px] text-slate-300">
                  <span>Base</span>
                  <input
                    type="color"
                    aria-label="Hair base color"
                    value={hair.primaryColor}
                    onChange={(e) =>
                      onUpdateHair(actor.id, { primaryColor: e.target.value })
                    }
                    className="w-6 h-5 rounded bg-transparent border border-[#393d47] cursor-pointer"
                  />
                </label>
                <label className="flex items-center justify-between gap-1.5 text-[11px] text-slate-300">
                  <span>Highlight</span>
                  <input
                    type="color"
                    aria-label="Hair highlight color"
                    value={hair.highlightColor}
                    onChange={(e) =>
                      onUpdateHair(actor.id, { highlightColor: e.target.value })
                    }
                    className="w-6 h-5 rounded bg-transparent border border-[#393d47] cursor-pointer"
                  />
                </label>
              </div>

              <div className="grid grid-cols-4 gap-1">
                {HAIR_HIGHLIGHT_PATTERNS.map((pat) => (
                  <button
                    key={pat.id}
                    type="button"
                    onClick={() =>
                      onUpdateHair(actor.id, {
                        highlightPattern: pat.id as HairHighlightPattern,
                      })
                    }
                    className={`px-1.5 py-1 rounded text-[11px] font-medium border whitespace-nowrap ${
                      hair.highlightPattern === pat.id
                        ? 'bg-[#00a2ff]/20 border-[#00a2ff] text-[#38bdf8]'
                        : 'bg-[#2b2e35] border-[#393d47] text-slate-300 hover:bg-[#363a43]'
                    }`}
                  >
                    {pat.label}
                  </button>
                ))}
              </div>

              {/* Finish + Volume */}
              <div className="flex items-center gap-2">
                <div className="grid grid-cols-3 gap-1 shrink-0">
                  {HAIR_FINISH_OPTIONS.map((fin) => (
                    <button
                      key={fin.id}
                      type="button"
                      onClick={() => onUpdateHair(actor.id, { finish: fin.id })}
                      className={`px-1.5 py-1 rounded text-[10px] font-medium border whitespace-nowrap ${
                        activeFinish === fin.id
                          ? 'bg-[#00a2ff]/20 border-[#00a2ff] text-[#38bdf8]'
                          : 'bg-[#2b2e35] border-[#393d47] text-slate-300 hover:bg-[#363a43]'
                      }`}
                    >
                      {fin.label}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                  <span className="text-[11px] text-slate-400 shrink-0">Vol</span>
                  <input
                    type="range"
                    min={0.85}
                    max={1.25}
                    step={0.05}
                    aria-label="Hair volume"
                    value={hair.volume}
                    onChange={(e) =>
                      onUpdateHair(actor.id, { volume: Number(e.target.value) })
                    }
                    className="studio-slider flex-1 min-w-0"
                  />
                  <span className="text-[11px] font-mono-tabular text-slate-300 w-8 text-right shrink-0">
                    {Math.round(hair.volume * 100)}%
                  </span>
                </div>
              </div>

              {/* Hair Accessory Selector + Color Tint */}
              <div className="flex items-center gap-1.5 min-w-0">
                <label
                  htmlFor="wardrobe-hair-accessory"
                  className="text-[11px] text-slate-400 shrink-0"
                >
                  Accessory
                </label>
                <select
                  id="wardrobe-hair-accessory"
                  value={activeAccessory}
                  onChange={(e) => {
                    const nextId = e.target.value as HairAccessoryId;
                    const meta = HAIR_ACCESSORY_CATALOG.find((a) => a.id === nextId);
                    onUpdateHair(actor.id, {
                      accessoryId: nextId,
                      flowerAccessory: nextId === 'hibiscus',
                      ...(activeAccessory === 'none' && meta
                        ? { accessoryColor: meta.defaultColor }
                        : {}),
                    });
                  }}
                  className="flex-1 min-w-0 px-1.5 py-1 rounded bg-[#14161a] border border-[#393d47] text-[11px] text-slate-200"
                >
                  {HAIR_ACCESSORY_CATALOG.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.label}
                    </option>
                  ))}
                </select>
                <input
                  type="color"
                  title="Hair accessory color"
                  aria-label="Hair accessory color"
                  value={activeAccessoryColor}
                  onChange={(e) =>
                    onUpdateHair(actor.id, { accessoryColor: e.target.value })
                  }
                  className="w-6 h-6 rounded bg-transparent border border-[#393d47] cursor-pointer shrink-0"
                />
              </div>
            </div>
          </div>
        );
      })()}

      {/* Category 3: Sculpted Layered Clothing Framework */}
      {category === 'clothing' && (() => {
        const activeOuterwearId: OuterwearStyleId = clothing.outerwearId ?? 'none';
        const activeOuterwearMeta = OUTERWEAR_CATALOG.find((o) => o.id === activeOuterwearId);
        const activeOuterwearColor =
          clothing.outerwearColor ?? activeOuterwearMeta?.defaultColor ?? '#1e293b';
        const activeOuterwearAccent =
          clothing.outerwearAccent ?? activeOuterwearMeta?.defaultAccent ?? '#f8fafc';
        const activeOuterwearFabric: FabricMaterialId = clothing.outerwearFabric ?? 'auto';
        const activeOuterwearOpen = clothing.outerwearOpen ?? true;
        const activeTopFabric: FabricMaterialId = clothing.topFabric ?? 'auto';
        const activeTopPattern: ClothingPatternId = clothing.topPattern ?? 'solid';
        const activeBottomFabric: FabricMaterialId = clothing.bottomFabric ?? 'auto';
        const activeBottomPattern: ClothingPatternId = clothing.bottomPattern ?? 'solid';
        const activeBeltStyle: BeltStyleId = clothing.beltStyle ?? 'auto';
        const activeFootwearMeta = FOOTWEAR_CATALOG.find((f) => f.id === clothing.footwearId);
        const activeShoeColor =
          clothing.shoeColor ?? activeFootwearMeta?.defaultColor ?? '#1e293b';
        const activeShoeAccent =
          clothing.shoeAccent ?? activeFootwearMeta?.defaultAccent ?? '#f8fafc';

        const shirtLabel =
          SHIRT_CATALOG.find((s) => s.id === clothing.shirtId)?.label ?? 'None';
        const pantsLabel =
          PANT_CATALOG.find((p) => p.id === clothing.pantsId)?.label ?? 'None';
        const shoeLabel = activeFootwearMeta?.label ?? 'Bare';

        return (
          <div className="space-y-2.5">
            {/* Sub-navigation for Layered Clothing Slots */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1 p-0.5 rounded-md bg-[#14161a] border border-[#393d47]">
                {(
                  [
                    { id: 'top', label: 'Base Top' },
                    { id: 'outerwear', label: 'Outerwear' },
                    { id: 'bottoms', label: 'Bottoms' },
                    { id: 'shoes', label: 'Shoes' },
                  ] as const
                ).map((sub) => {
                  const active = clothingSection === sub.id;
                  return (
                    <button
                      key={sub.id}
                      type="button"
                      onClick={() => setClothingSection(sub.id)}
                      className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors whitespace-nowrap shrink-0 ${
                        active
                          ? 'bg-[#00a2ff] text-slate-950 font-semibold'
                          : 'text-slate-300 hover:bg-[#2b2e35]'
                      }`}
                    >
                      {sub.label}
                    </button>
                  );
                })}
              </div>

              <div className="text-[11px] text-slate-400 truncate">
                <span>{shirtLabel}</span>
                {activeOuterwearId !== 'none' && activeOuterwearMeta && (
                  <>
                    <span className="mx-1.5" aria-hidden="true">·</span>
                    <span className="text-[#38bdf8]">{activeOuterwearMeta.label}</span>
                  </>
                )}
                <span className="mx-1.5" aria-hidden="true">·</span>
                <span>{pantsLabel}</span>
                <span className="mx-1.5" aria-hidden="true">·</span>
                <span>{shoeLabel}</span>
              </div>
            </div>

            {/* Sub-tab 1: Base Top */}
            {clothingSection === 'top' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-slate-400">
                      Base Top & Sculpted Collar
                    </span>
                    <span className="text-[11px] text-slate-400 truncate">
                      Layers cleanly under Outerwear
                    </span>
                  </div>

                  <div className="grid grid-cols-4 gap-1">
                    {SHIRT_CATALOG.map((entry) => {
                      const active = clothing.shirtId === entry.id;
                      return (
                        <button
                          key={entry.id}
                          type="button"
                          onClick={() => {
                            const seedDefaults = clothing.shirtId === 'none';
                            onUpdateClothing(actor.id, {
                              shirtId: entry.id as ShirtStyleId,
                              ...(seedDefaults
                                ? {
                                    shirtColor: entry.defaultColor,
                                    shirtAccent: entry.defaultAccent,
                                  }
                                : {}),
                            });
                          }}
                          className={`px-2 py-1 rounded text-[11px] font-medium border transition-colors whitespace-nowrap truncate text-left ${
                            active
                              ? 'bg-[#00a2ff]/20 border-[#00a2ff] text-[#38bdf8]'
                              : 'bg-[#2b2e35] border-[#393d47] text-slate-300 hover:bg-[#363a43]'
                          }`}
                        >
                          {entry.label}
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex items-center gap-2 pt-0.5">
                    <span className="text-[11px] text-slate-400 w-12 shrink-0">Sleeves</span>
                    <div className="grid grid-cols-4 gap-1 flex-1 min-w-0">
                      {SLEEVE_MODE_OPTIONS.map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() =>
                            onUpdateClothing(actor.id, { sleeveMode: opt.id as SleeveMode })
                          }
                          className={`px-1.5 py-1 rounded text-[11px] font-medium border whitespace-nowrap ${
                            clothing.sleeveMode === opt.id
                              ? 'bg-[#00a2ff]/20 border-[#00a2ff] text-[#38bdf8]'
                              : 'bg-[#2b2e35] border-[#393d47] text-slate-300 hover:bg-[#363a43]'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="block text-xs font-medium text-slate-400">
                    Top Colors, Fabric & Pattern
                  </span>

                  <div className="flex flex-wrap items-center gap-1">
                    {CLOTHING_COLOR_SWATCHES.map((sw) => (
                      <button
                        key={sw.name}
                        type="button"
                        title={sw.name}
                        aria-label={`Set top color ${sw.name}`}
                        onClick={() => onUpdateClothing(actor.id, { shirtColor: sw.hex })}
                        style={{ backgroundColor: sw.hex }}
                        className={`w-4 h-4 rounded-sm border ${
                          clothing.shirtColor.toLowerCase() === sw.hex.toLowerCase()
                            ? 'border-white ring-1 ring-[#00a2ff]'
                            : 'border-[#393d47]'
                        }`}
                      />
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <label className="flex items-center justify-between gap-1.5 text-[11px] text-slate-300">
                      <span>Primary</span>
                      <input
                        type="color"
                        aria-label="Top primary color"
                        value={clothing.shirtColor}
                        onChange={(e) =>
                          onUpdateClothing(actor.id, { shirtColor: e.target.value })
                        }
                        className="w-6 h-5 rounded bg-transparent border border-[#393d47] cursor-pointer"
                      />
                    </label>
                    <label className="flex items-center justify-between gap-1.5 text-[11px] text-slate-300">
                      <span>Accent</span>
                      <input
                        type="color"
                        aria-label="Top accent color"
                        value={clothing.shirtAccent}
                        onChange={(e) =>
                          onUpdateClothing(actor.id, { shirtAccent: e.target.value })
                        }
                        className="w-6 h-5 rounded bg-transparent border border-[#393d47] cursor-pointer"
                      />
                    </label>
                  </div>

                  <div className="space-y-1">
                    <span className="block text-[10px] text-slate-400">Fabric</span>
                    <div className="grid grid-cols-4 gap-1">
                      {FABRIC_MATERIAL_OPTIONS.map((fab) => (
                        <button
                          key={fab.id}
                          type="button"
                          onClick={() =>
                            onUpdateClothing(actor.id, { topFabric: fab.id as FabricMaterialId })
                          }
                          className={`px-1 py-0.5 rounded text-[10px] font-medium border whitespace-nowrap truncate ${
                            activeTopFabric === fab.id
                              ? 'bg-[#00a2ff]/20 border-[#00a2ff] text-[#38bdf8]'
                              : 'bg-[#2b2e35] border-[#393d47] text-slate-300 hover:bg-[#363a43]'
                          }`}
                        >
                          {fab.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="block text-[10px] text-slate-400">Pattern</span>
                    <div className="grid grid-cols-7 gap-1">
                      {CLOTHING_PATTERN_OPTIONS.map((pat) => (
                        <button
                          key={pat.id}
                          type="button"
                          onClick={() =>
                            onUpdateClothing(actor.id, {
                              topPattern: pat.id as ClothingPatternId,
                            })
                          }
                          className={`px-1 py-0.5 rounded text-[10px] font-medium border whitespace-nowrap truncate ${
                            activeTopPattern === pat.id
                              ? 'bg-[#00a2ff]/20 border-[#00a2ff] text-[#38bdf8]'
                              : 'bg-[#2b2e35] border-[#393d47] text-slate-300 hover:bg-[#363a43]'
                          }`}
                        >
                          {pat.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Sub-tab 2: Layered Outerwear */}
            {clothingSection === 'outerwear' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-slate-400">
                      Sculpted 3D Outerwear Shell
                    </span>
                    <span className="text-[11px] text-slate-400 truncate">
                      {activeOuterwearMeta?.description ?? 'Select an outerwear layer'}
                    </span>
                  </div>

                  <div className="grid grid-cols-5 gap-1">
                    {OUTERWEAR_CATALOG.map((entry) => {
                      const active = activeOuterwearId === entry.id;
                      return (
                        <button
                          key={entry.id}
                          type="button"
                          title={entry.description}
                          onClick={() => {
                            const seedDefaults = activeOuterwearId === 'none';
                            onUpdateClothing(actor.id, {
                              outerwearId: entry.id as OuterwearStyleId,
                              ...(seedDefaults && entry.id !== 'none'
                                ? {
                                    outerwearColor: entry.defaultColor,
                                    outerwearAccent: entry.defaultAccent,
                                  }
                                : {}),
                            });
                          }}
                          className={`px-2 py-1.5 rounded text-[11px] font-medium border transition-colors whitespace-nowrap truncate text-left ${
                            active
                              ? 'bg-[#00a2ff]/20 border-[#00a2ff] text-[#38bdf8]'
                              : 'bg-[#2b2e35] border-[#393d47] text-slate-300 hover:bg-[#363a43]'
                          }`}
                        >
                          {entry.label}
                        </button>
                      );
                    })}
                  </div>

                  {activeOuterwearMeta?.supportsOpenToggle && (
                    <div className="flex items-center gap-2 pt-0.5">
                      <span className="text-[11px] text-slate-400 w-12 shrink-0">Front</span>
                      <div className="grid grid-cols-2 gap-1 w-56">
                        <button
                          type="button"
                          onClick={() => onUpdateClothing(actor.id, { outerwearOpen: true })}
                          className={`px-2 py-1 rounded text-[11px] font-medium border whitespace-nowrap ${
                            activeOuterwearOpen
                              ? 'bg-[#00a2ff]/20 border-[#00a2ff] text-[#38bdf8]'
                              : 'bg-[#2b2e35] border-[#393d47] text-slate-300 hover:bg-[#363a43]'
                          }`}
                        >
                          Open (Show Base Top)
                        </button>
                        <button
                          type="button"
                          onClick={() => onUpdateClothing(actor.id, { outerwearOpen: false })}
                          className={`px-2 py-1 rounded text-[11px] font-medium border whitespace-nowrap ${
                            !activeOuterwearOpen
                              ? 'bg-[#00a2ff]/20 border-[#00a2ff] text-[#38bdf8]'
                              : 'bg-[#2b2e35] border-[#393d47] text-slate-300 hover:bg-[#363a43]'
                          }`}
                        >
                          Closed Front
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <span className="block text-xs font-medium text-slate-400">
                    Outerwear Colors & Fabric
                  </span>

                  <div className="flex flex-wrap items-center gap-1">
                    {CLOTHING_COLOR_SWATCHES.map((sw) => (
                      <button
                        key={sw.name}
                        type="button"
                        title={sw.name}
                        aria-label={`Set outerwear color ${sw.name}`}
                        onClick={() => onUpdateClothing(actor.id, { outerwearColor: sw.hex })}
                        style={{ backgroundColor: sw.hex }}
                        className={`w-4 h-4 rounded-sm border ${
                          activeOuterwearColor.toLowerCase() === sw.hex.toLowerCase()
                            ? 'border-white ring-1 ring-[#00a2ff]'
                            : 'border-[#393d47]'
                        }`}
                      />
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <label className="flex items-center justify-between gap-1.5 text-[11px] text-slate-300">
                      <span>Shell</span>
                      <input
                        type="color"
                        aria-label="Outerwear primary color"
                        value={activeOuterwearColor}
                        onChange={(e) =>
                          onUpdateClothing(actor.id, { outerwearColor: e.target.value })
                        }
                        className="w-6 h-5 rounded bg-transparent border border-[#393d47] cursor-pointer"
                      />
                    </label>
                    <label className="flex items-center justify-between gap-1.5 text-[11px] text-slate-300">
                      <span>Trim</span>
                      <input
                        type="color"
                        aria-label="Outerwear accent color"
                        value={activeOuterwearAccent}
                        onChange={(e) =>
                          onUpdateClothing(actor.id, { outerwearAccent: e.target.value })
                        }
                        className="w-6 h-5 rounded bg-transparent border border-[#393d47] cursor-pointer"
                      />
                    </label>
                  </div>

                  <div className="space-y-1">
                    <span className="block text-[10px] text-slate-400">Fabric</span>
                    <div className="grid grid-cols-4 gap-1">
                      {FABRIC_MATERIAL_OPTIONS.map((fab) => (
                        <button
                          key={fab.id}
                          type="button"
                          onClick={() =>
                            onUpdateClothing(actor.id, {
                              outerwearFabric: fab.id as FabricMaterialId,
                            })
                          }
                          className={`px-1 py-0.5 rounded text-[10px] font-medium border whitespace-nowrap truncate ${
                            activeOuterwearFabric === fab.id
                              ? 'bg-[#00a2ff]/20 border-[#00a2ff] text-[#38bdf8]'
                              : 'bg-[#2b2e35] border-[#393d47] text-slate-300 hover:bg-[#363a43]'
                          }`}
                        >
                          {fab.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Sub-tab 3: Bottoms, Skirts & Belts */}
            {clothingSection === 'bottoms' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-slate-400">
                      Pants, Sculpted Skirts & Waist Belt
                    </span>
                    <span className="text-[11px] text-slate-400 truncate">
                      Skirts sway with movement & leg stride
                    </span>
                  </div>

                  <div className="grid grid-cols-4 gap-1">
                    {PANT_CATALOG.map((entry) => {
                      const active = clothing.pantsId === entry.id;
                      return (
                        <button
                          key={entry.id}
                          type="button"
                          onClick={() => {
                            const seedDefaults = clothing.pantsId === 'none';
                            onUpdateClothing(actor.id, {
                              pantsId: entry.id as PantsStyleId,
                              ...(seedDefaults
                                ? {
                                    pantsColor: entry.defaultColor,
                                    pantsAccent: entry.defaultAccent,
                                  }
                                : {}),
                            });
                          }}
                          className={`px-2 py-1 rounded text-[11px] font-medium border transition-colors whitespace-nowrap truncate text-left ${
                            active
                              ? 'bg-[#00a2ff]/20 border-[#00a2ff] text-[#38bdf8]'
                              : 'bg-[#2b2e35] border-[#393d47] text-slate-300 hover:bg-[#363a43]'
                          }`}
                        >
                          {entry.label}
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex items-center gap-2 pt-0.5">
                    <span className="text-[11px] text-slate-400 w-12 shrink-0">Belt</span>
                    <div className="grid grid-cols-5 gap-1 flex-1 min-w-0">
                      {BELT_STYLE_OPTIONS.map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() =>
                            onUpdateClothing(actor.id, { beltStyle: opt.id as BeltStyleId })
                          }
                          className={`px-1.5 py-1 rounded text-[11px] font-medium border whitespace-nowrap ${
                            activeBeltStyle === opt.id
                              ? 'bg-[#00a2ff]/20 border-[#00a2ff] text-[#38bdf8]'
                              : 'bg-[#2b2e35] border-[#393d47] text-slate-300 hover:bg-[#363a43]'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="block text-xs font-medium text-slate-400">
                    Bottoms Colors, Fabric & Pattern
                  </span>

                  <div className="flex flex-wrap items-center gap-1">
                    {CLOTHING_COLOR_SWATCHES.map((sw) => (
                      <button
                        key={sw.name}
                        type="button"
                        title={sw.name}
                        aria-label={`Set bottoms color ${sw.name}`}
                        onClick={() => onUpdateClothing(actor.id, { pantsColor: sw.hex })}
                        style={{ backgroundColor: sw.hex }}
                        className={`w-4 h-4 rounded-sm border ${
                          clothing.pantsColor.toLowerCase() === sw.hex.toLowerCase()
                            ? 'border-white ring-1 ring-[#00a2ff]'
                            : 'border-[#393d47]'
                        }`}
                      />
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <label className="flex items-center justify-between gap-1.5 text-[11px] text-slate-300">
                      <span>Primary</span>
                      <input
                        type="color"
                        aria-label="Bottoms primary color"
                        value={clothing.pantsColor}
                        onChange={(e) =>
                          onUpdateClothing(actor.id, { pantsColor: e.target.value })
                        }
                        className="w-6 h-5 rounded bg-transparent border border-[#393d47] cursor-pointer"
                      />
                    </label>
                    <label className="flex items-center justify-between gap-1.5 text-[11px] text-slate-300">
                      <span>Accent</span>
                      <input
                        type="color"
                        aria-label="Bottoms accent color"
                        value={clothing.pantsAccent}
                        onChange={(e) =>
                          onUpdateClothing(actor.id, { pantsAccent: e.target.value })
                        }
                        className="w-6 h-5 rounded bg-transparent border border-[#393d47] cursor-pointer"
                      />
                    </label>
                  </div>

                  <div className="space-y-1">
                    <span className="block text-[10px] text-slate-400">Fabric</span>
                    <div className="grid grid-cols-4 gap-1">
                      {FABRIC_MATERIAL_OPTIONS.map((fab) => (
                        <button
                          key={fab.id}
                          type="button"
                          onClick={() =>
                            onUpdateClothing(actor.id, {
                              bottomFabric: fab.id as FabricMaterialId,
                            })
                          }
                          className={`px-1 py-0.5 rounded text-[10px] font-medium border whitespace-nowrap truncate ${
                            activeBottomFabric === fab.id
                              ? 'bg-[#00a2ff]/20 border-[#00a2ff] text-[#38bdf8]'
                              : 'bg-[#2b2e35] border-[#393d47] text-slate-300 hover:bg-[#363a43]'
                          }`}
                        >
                          {fab.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="block text-[10px] text-slate-400">Pattern</span>
                    <div className="grid grid-cols-7 gap-1">
                      {CLOTHING_PATTERN_OPTIONS.map((pat) => (
                        <button
                          key={pat.id}
                          type="button"
                          onClick={() =>
                            onUpdateClothing(actor.id, {
                              bottomPattern: pat.id as ClothingPatternId,
                            })
                          }
                          className={`px-1 py-0.5 rounded text-[10px] font-medium border whitespace-nowrap truncate ${
                            activeBottomPattern === pat.id
                              ? 'bg-[#00a2ff]/20 border-[#00a2ff] text-[#38bdf8]'
                              : 'bg-[#2b2e35] border-[#393d47] text-slate-300 hover:bg-[#363a43]'
                          }`}
                        >
                          {pat.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Sub-tab 4: Sculpted 3D Shoes */}
            {clothingSection === 'shoes' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-slate-400">
                      Sculpted 3D Footwear
                    </span>
                    <span className="text-[11px] text-slate-400 truncate">
                      Ground-aligned soles · independent shoe colors
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5">
                    {FOOTWEAR_CATALOG.map((fw) => {
                      const active = clothing.footwearId === fw.id;
                      return (
                        <button
                          key={fw.id}
                          type="button"
                          onClick={() => {
                            const seedDefaults =
                              clothing.footwearId === 'none' || !clothing.shoeColor;
                            onUpdateClothing(actor.id, {
                              footwearId: fw.id as FootwearId,
                              ...(seedDefaults && fw.id !== 'none'
                                ? {
                                    shoeColor: fw.defaultColor,
                                    shoeAccent: fw.defaultAccent,
                                  }
                                : {}),
                            });
                          }}
                          className={`px-2.5 py-1.5 rounded text-[11px] font-medium border transition-colors whitespace-nowrap truncate text-left ${
                            active
                              ? 'bg-[#00a2ff]/20 border-[#00a2ff] text-[#38bdf8]'
                              : 'bg-[#2b2e35] border-[#393d47] text-slate-300 hover:bg-[#363a43]'
                          }`}
                        >
                          {fw.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="block text-xs font-medium text-slate-400">
                    Shoe Colors (Upper & Sole/Laces)
                  </span>

                  <div className="flex flex-wrap items-center gap-1">
                    {CLOTHING_COLOR_SWATCHES.map((sw) => (
                      <button
                        key={sw.name}
                        type="button"
                        title={sw.name}
                        aria-label={`Set shoe color ${sw.name}`}
                        onClick={() => onUpdateClothing(actor.id, { shoeColor: sw.hex })}
                        style={{ backgroundColor: sw.hex }}
                        className={`w-4 h-4 rounded-sm border ${
                          activeShoeColor.toLowerCase() === sw.hex.toLowerCase()
                            ? 'border-white ring-1 ring-[#00a2ff]'
                            : 'border-[#393d47]'
                        }`}
                      />
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <label className="flex items-center justify-between gap-1.5 text-[11px] text-slate-300">
                      <span>Upper</span>
                      <input
                        type="color"
                        aria-label="Shoe primary color"
                        value={activeShoeColor}
                        onChange={(e) =>
                          onUpdateClothing(actor.id, { shoeColor: e.target.value })
                        }
                        className="w-6 h-5 rounded bg-transparent border border-[#393d47] cursor-pointer"
                      />
                    </label>
                    <label className="flex items-center justify-between gap-1.5 text-[11px] text-slate-300">
                      <span>Sole / Trim</span>
                      <input
                        type="color"
                        aria-label="Shoe accent color"
                        value={activeShoeAccent}
                        onChange={(e) =>
                          onUpdateClothing(actor.id, { shoeAccent: e.target.value })
                        }
                        className="w-6 h-5 rounded bg-transparent border border-[#393d47] cursor-pointer"
                      />
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* Category 4: Sculpted Hats, Crowns, Eyewear & Masks */}
      {category === 'hats' && (
        <div className="space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1 p-0.5 rounded-md bg-[#14161a] border border-[#393d47]">
              {(
                [
                  { id: 'hat', label: 'Hats & Crowns' },
                  { id: 'head', label: 'Eyewear & Masks' },
                ] as const
              ).map((sub) => (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => setHeadwearSection(sub.id)}
                  className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors whitespace-nowrap shrink-0 ${
                    headwearSection === sub.id
                      ? 'bg-[#00a2ff] text-slate-950 font-semibold'
                      : 'text-slate-300 hover:bg-[#2b2e35]'
                  }`}
                >
                  {sub.label}
                </button>
              ))}
            </div>

            <div className="text-[11px] text-slate-400 truncate">
              <span className="text-[#38bdf8]">
                Hat Fit: {TUCK_DESCRIPTIONS[activeHatTuck]}
              </span>
              <span className="mx-1.5" aria-hidden="true">·</span>
              <span>
                {ORNAMENT_CATALOG.head.find((h) => h.id === ornaments.head.id)?.label ?? 'No Eyewear'}
              </span>
            </div>
          </div>

          {headwearSection === 'hat' &&
            renderAccessorySlotEditor(
              'hat',
              'Sculpted Hats, Caps & Helmets',
              'Auto-tucks hair crown · use Fit Tuning to nudge height or tilt',
              'grid-cols-4 sm:grid-cols-5',
            )}

          {headwearSection === 'head' &&
            renderAccessorySlotEditor(
              'head',
              'Optical Glass Eyewear, Masks & Headphones',
              'Real translucent PBR lenses & metallic frames',
              'grid-cols-4 sm:grid-cols-5',
            )}
        </div>
      )}

      {/* Category 5: Accessories (Neck, Shoulder, Back, Waist, Arm/Legs) & Skin Colors */}
      {category === 'gear' && (
        <div className="space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1 p-0.5 rounded-md bg-[#14161a] border border-[#393d47] overflow-x-auto">
              {(
                [
                  { id: 'neck', label: 'Neck' },
                  { id: 'shoulder', label: 'Shoulder' },
                  { id: 'back', label: 'Back' },
                  { id: 'waist', label: 'Waist & Bags' },
                  { id: 'armLegs', label: 'Arm & Legs' },
                  { id: 'skin', label: 'Skin Colors' },
                ] as const
              ).map((sub) => (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => setGearSection(sub.id)}
                  className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors whitespace-nowrap shrink-0 ${
                    gearSection === sub.id
                      ? 'bg-[#00a2ff] text-slate-950 font-semibold'
                      : 'text-slate-300 hover:bg-[#2b2e35]'
                  }`}
                >
                  {sub.label}
                </button>
              ))}
            </div>

            {gearSection !== 'skin' && (
              <div className="flex items-center gap-1 overflow-x-auto">
                <span className="text-[10px] text-slate-400 mr-0.5 whitespace-nowrap shrink-0">
                  Quick Sets:
                </span>
                {ACCESSORY_COMBOS.map((combo) => (
                  <button
                    key={combo.id}
                    type="button"
                    title={`Apply ${combo.label} accessory set`}
                    onClick={() => onApplyAccessoryCombo(actor.id, combo)}
                    className="px-2 py-0.5 rounded bg-[#2b2e35] border border-[#393d47] text-[10px] font-medium text-slate-200 hover:border-[#00a2ff] hover:text-white transition-colors whitespace-nowrap shrink-0"
                  >
                    {combo.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {gearSection === 'neck' &&
            renderAccessorySlotEditor(
              'neck',
              'Scarves, Chains, Ties & Pendants',
              'Scarves, lanyards & medallions sway with movement',
              'grid-cols-3 sm:grid-cols-5',
            )}

          {gearSection === 'shoulder' &&
            renderAccessorySlotEditor(
              'shoulder',
              'Shoulder Pals & Sculpted Pauldrons',
              'Animated mini bot, plush cat, dragon & floating crystal',
              'grid-cols-4',
            )}

          {gearSection === 'back' &&
            renderAccessorySlotEditor(
              'back',
              'Backpacks, Wings, Capes & Gear',
              'Dynamic cape drape, wing flutter & thruster pulse',
              'grid-cols-4 sm:grid-cols-5',
            )}

          {gearSection === 'waist' &&
            renderAccessorySlotEditor(
              'waist',
              'Crossbody Bags, Hip Blades & Belts',
              'Parented to hip root for clean stride alignment',
              'grid-cols-4',
            )}

          {gearSection === 'armLegs' && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setArmLegSubSlot('arm')}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium border whitespace-nowrap ${
                    armLegSubSlot === 'arm'
                      ? 'bg-[#00a2ff]/20 border-[#00a2ff] text-[#38bdf8]'
                      : 'bg-[#2b2e35] border-[#393d47] text-slate-300 hover:bg-[#363a43]'
                  }`}
                >
                  Arm & Wrist ({ORNAMENT_CATALOG.arm.find((i) => i.id === ornaments.arm.id)?.label ?? 'None'})
                </button>
                <button
                  type="button"
                  onClick={() => setArmLegSubSlot('legs')}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium border whitespace-nowrap ${
                    armLegSubSlot === 'legs'
                      ? 'bg-[#00a2ff]/20 border-[#00a2ff] text-[#38bdf8]'
                      : 'bg-[#2b2e35] border-[#393d47] text-slate-300 hover:bg-[#363a43]'
                  }`}
                >
                  Legs & Guards ({ORNAMENT_CATALOG.legs.find((i) => i.id === ornaments.legs.id)?.label ?? 'None'})
                </button>
              </div>

              {armLegSubSlot === 'arm'
                ? renderAccessorySlotEditor(
                    'arm',
                    'Wristbands, Smartwatches & Arm Gear',
                    'Mounted on right arm socket',
                    'grid-cols-4',
                  )
                : renderAccessorySlotEditor(
                    'legs',
                    'Leg Armor, Holsters & Utility Belts',
                    'Tracks hip & leg stride pivots',
                    'grid-cols-4',
                  )}
            </div>
          )}

          {gearSection === 'skin' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-400">
                  <Palette className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Select R6 Body Part ({R6_BODY_PART_LABELS[colorPart]})</span>
                </span>
                <div className="grid grid-cols-6 gap-1">
                  {R6_BODY_PARTS.map((part) => (
                    <button
                      key={part}
                      type="button"
                      onClick={() => setColorPart(part)}
                      className={`px-1 py-1.5 rounded text-[11px] font-medium border transition-colors whitespace-nowrap truncate ${
                        colorPart === part
                          ? 'bg-[#00a2ff] border-[#00a2ff] text-slate-950 font-semibold'
                          : 'bg-[#2b2e35] border-[#393d47] text-slate-300 hover:bg-[#363a43]'
                      }`}
                    >
                      {SHORT_PART_LABELS[part]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="block text-xs font-medium text-slate-400">
                  Classic Brick & Skin Swatches
                </span>
                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                  {CLASSIC_BRICK_COLORS.slice(0, 12).map((swatch) => (
                    <button
                      key={swatch.name}
                      type="button"
                      title={swatch.name}
                      aria-label={`Set ${R6_BODY_PART_LABELS[colorPart]} to ${swatch.name}`}
                      onClick={() =>
                        onUpdateBodyPartColor(actor.id, colorPart, swatch.hex)
                      }
                      style={{ backgroundColor: swatch.hex }}
                      className={`w-5 h-5 rounded border ${
                        bodyColors[colorPart].toLowerCase() ===
                        swatch.hex.toLowerCase()
                          ? 'border-white ring-1 ring-[#00a2ff]'
                          : 'border-[#393d47]'
                      }`}
                    />
                  ))}
                  <input
                    type="color"
                    aria-label={`${R6_BODY_PART_LABELS[colorPart]} custom color`}
                    value={bodyColors[colorPart]}
                    onChange={(e) =>
                      onUpdateBodyPartColor(actor.id, colorPart, e.target.value)
                    }
                    className="w-6 h-5 rounded bg-transparent border border-[#393d47] cursor-pointer ml-auto"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
