import React, { useState } from 'react';
import {
  Shirt,
  Scissors,
  Crown,
  Shield,
  Palette,
  Sparkles,
} from 'lucide-react';
import {
  CLASSIC_BRICK_COLORS,
  FOOTWEAR_CATALOG,
  getHatTuckProfile,
  HAIR_COLOR_SWATCHES,
  HAIR_HIGHLIGHT_PATTERNS,
  HAIR_STYLE_CATALOG,
  ORNAMENT_CATALOG,
  OUTFIT_PRESETS,
  OutfitPreset,
  PANT_CATALOG,
  ROBLOX_AVATAR_BUNDLES,
  SHIRT_CATALOG,
  SLEEVE_MODE_OPTIONS,
} from '../../engine/robloxCatalog';
import {
  ClothingConfig,
  FootwearId,
  HairConfig,
  HairHighlightPattern,
  HairStyleId,
  ORNAMENT_SLOT_LABELS,
  OrnamentSlot,
  PantsStyleId,
  R6_BODY_PART_LABELS,
  R6_BODY_PARTS,
  R6BodyColors,
  R6BodyPartId,
  R6Ornaments,
  SceneActorConfig,
  ShirtStyleId,
  SleeveMode,
} from '../../engine/types';

type WardrobeCategory = 'outfits' | 'hair' | 'clothing' | 'hats' | 'gear';

interface WardrobePanelProps {
  actor: SceneActorConfig;
  bodyColors: R6BodyColors;
  ornaments: R6Ornaments;
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
  onUpdateHair,
  onUpdateClothing,
}) => {
  const [category, setCategory] = useState<WardrobeCategory>('outfits');
  const [colorPart, setColorPart] = useState<R6BodyPartId>('torso');

  const activeHatTuck = getHatTuckProfile(ornaments.hat.id);
  const activeHatMeta = ORNAMENT_CATALOG.hat.find((h) => h.id === ornaments.hat.id);

  const renderDualSlotRow = (slot: OrnamentSlot) => {
    const sel = ornaments[slot];
    const items = ORNAMENT_CATALOG[slot];
    const meta = items.find((i) => i.id === sel.id);
    const accent = sel.accentColor ?? meta?.defaultAccentColor ?? '#f5cd30';

    return (
      <div key={slot} className="flex items-center gap-1.5 min-w-0">
        <label
          htmlFor={`wardrobe-${slot}`}
          className="text-[11px] text-slate-400 w-10 shrink-0"
        >
          {ORNAMENT_SLOT_LABELS[slot]}
        </label>
        <select
          id={`wardrobe-${slot}`}
          value={sel.id}
          onChange={(e) => {
            const found = items.find((i) => i.id === e.target.value);
            onUpdateOrnament(
              actor.id,
              slot,
              e.target.value,
              found?.defaultColor ?? sel.color,
              found?.defaultAccentColor ?? accent,
            );
          }}
          className="flex-1 min-w-0 px-1.5 py-1 rounded bg-[#14161a] border border-[#393d47] text-[11px] text-slate-200"
        >
          {items.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
        <input
          type="color"
          title="Primary color"
          aria-label={`${ORNAMENT_SLOT_LABELS[slot]} primary color`}
          value={sel.color}
          onChange={(e) =>
            onUpdateOrnament(actor.id, slot, sel.id, e.target.value, accent)
          }
          className="w-5 h-6 rounded bg-transparent border border-[#393d47] cursor-pointer shrink-0"
        />
        <input
          type="color"
          title="Accent color"
          aria-label={`${ORNAMENT_SLOT_LABELS[slot]} accent color`}
          value={accent}
          onChange={(e) =>
            onUpdateOrnament(actor.id, slot, sel.id, sel.color, e.target.value)
          }
          className="w-5 h-6 rounded bg-transparent border border-[#393d47] cursor-pointer shrink-0"
        />
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
              { id: 'hats', label: 'Hats & Head', icon: Crown },
              { id: 'gear', label: 'Gear & Body', icon: Shield },
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

      {/* Category 2: Dedicated Hair Framework */}
      {category === 'hair' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-slate-400">
                Hairstyle Catalog (Stacks with Hats)
              </span>
              <span className="text-[11px] text-[#38bdf8]">
                Hat Fit: {TUCK_DESCRIPTIONS[activeHatTuck]}
              </span>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-1">
              {HAIR_STYLE_CATALOG.map((entry) => {
                const active = hair.styleId === entry.id;
                return (
                  <button
                    key={entry.id}
                    type="button"
                    title={entry.description}
                    onClick={() => {
                      const shouldDefaultColors = hair.styleId === 'none';
                      const shouldEnableFlower =
                        entry.id === 'longWavyPart' && hair.styleId !== 'longWavyPart';
                      onUpdateHair(actor.id, {
                        styleId: entry.id as HairStyleId,
                        ...(shouldDefaultColors
                          ? {
                              primaryColor: entry.defaultColor,
                              highlightColor: entry.defaultHighlight,
                            }
                          : {}),
                        ...(shouldEnableFlower ? { flowerAccessory: true } : {}),
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
          </div>

          <div className="space-y-2">
            <span className="block text-xs font-medium text-slate-400">
              Hair Color, Highlights & Flower Pin
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

            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                aria-pressed={Boolean(hair.flowerAccessory)}
                onClick={() =>
                  onUpdateHair(actor.id, {
                    flowerAccessory: !hair.flowerAccessory,
                  })
                }
                className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-medium border transition-colors whitespace-nowrap shrink-0 ${
                  hair.flowerAccessory
                    ? 'bg-[#ec4899]/20 border-[#ec4899] text-[#fbcfe8]'
                    : 'bg-[#2b2e35] border-[#393d47] text-slate-300 hover:bg-[#363a43]'
                }`}
              >
                <span
                  aria-hidden="true"
                  className="w-2.5 h-2.5 rounded-sm border border-white/40"
                  style={{ backgroundColor: hair.flowerAccessory ? '#f472b6' : '#475569' }}
                />
                <span>Hibiscus Pin: {hair.flowerAccessory ? 'On' : 'Off'}</span>
              </button>

              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                <span className="text-[11px] text-slate-400 shrink-0">Vol</span>
                <input
                  type="range"
                  min={0.85}
                  max={1.2}
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
          </div>
        </div>
      )}

      {/* Category 3: Layered Clothing */}
      {category === 'clothing' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Shirt / Jacket */}
          <div className="space-y-2">
            <span className="block text-xs font-medium text-slate-400">
              Top / Jacket & 3D Collar Trim
            </span>
            <div className="flex items-center gap-1.5">
              <select
                aria-label="Shirt or jacket style"
                value={clothing.shirtId}
                onChange={(e) => {
                  const found = SHIRT_CATALOG.find((s) => s.id === e.target.value);
                  onUpdateClothing(actor.id, {
                    shirtId: e.target.value as ShirtStyleId,
                    ...(found && clothing.shirtId === 'none'
                      ? {
                          shirtColor: found.defaultColor,
                          shirtAccent: found.defaultAccent,
                        }
                      : {}),
                  });
                }}
                className="flex-1 min-w-0 px-2 py-1.5 rounded bg-[#14161a] border border-[#393d47] text-xs text-slate-100"
              >
                {SHIRT_CATALOG.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
              <input
                type="color"
                title="Shirt primary color"
                aria-label="Shirt primary color"
                value={clothing.shirtColor}
                onChange={(e) =>
                  onUpdateClothing(actor.id, { shirtColor: e.target.value })
                }
                className="w-6 h-7 rounded bg-transparent border border-[#393d47] cursor-pointer shrink-0"
              />
              <input
                type="color"
                title="Shirt accent color"
                aria-label="Shirt accent color"
                value={clothing.shirtAccent}
                onChange={(e) =>
                  onUpdateClothing(actor.id, { shirtAccent: e.target.value })
                }
                className="w-6 h-7 rounded bg-transparent border border-[#393d47] cursor-pointer shrink-0"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-400 w-14 shrink-0">Sleeves</span>
              <div className="grid grid-cols-4 gap-1 flex-1">
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

          {/* Pants & Footwear */}
          <div className="space-y-2">
            <span className="block text-xs font-medium text-slate-400">
              Pants & 3D Footwear
            </span>
            <div className="flex items-center gap-1.5">
              <select
                aria-label="Pants style"
                value={clothing.pantsId}
                onChange={(e) => {
                  const found = PANT_CATALOG.find((p) => p.id === e.target.value);
                  onUpdateClothing(actor.id, {
                    pantsId: e.target.value as PantsStyleId,
                    ...(found && clothing.pantsId === 'none'
                      ? {
                          pantsColor: found.defaultColor,
                          pantsAccent: found.defaultAccent,
                        }
                      : {}),
                  });
                }}
                className="flex-1 min-w-0 px-2 py-1.5 rounded bg-[#14161a] border border-[#393d47] text-xs text-slate-100"
              >
                {PANT_CATALOG.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
              <input
                type="color"
                title="Pants primary color"
                aria-label="Pants primary color"
                value={clothing.pantsColor}
                onChange={(e) =>
                  onUpdateClothing(actor.id, { pantsColor: e.target.value })
                }
                className="w-6 h-7 rounded bg-transparent border border-[#393d47] cursor-pointer shrink-0"
              />
              <input
                type="color"
                title="Pants & shoe accent color"
                aria-label="Pants accent color"
                value={clothing.pantsAccent}
                onChange={(e) =>
                  onUpdateClothing(actor.id, { pantsAccent: e.target.value })
                }
                className="w-6 h-7 rounded bg-transparent border border-[#393d47] cursor-pointer shrink-0"
              />
            </div>

            <div className="flex items-center gap-2">
              <label
                htmlFor="wardrobe-footwear"
                className="text-[11px] text-slate-400 w-14 shrink-0"
              >
                Shoes
              </label>
              <select
                id="wardrobe-footwear"
                value={clothing.footwearId}
                onChange={(e) =>
                  onUpdateClothing(actor.id, {
                    footwearId: e.target.value as FootwearId,
                  })
                }
                className="flex-1 min-w-0 px-2 py-1 rounded bg-[#14161a] border border-[#393d47] text-xs text-slate-200"
              >
                {FOOTWEAR_CATALOG.map((fw) => (
                  <option key={fw.id} value={fw.id}>
                    {fw.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Category 4: Hats & Headwear */}
      {category === 'hats' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <span className="block text-xs font-medium text-slate-400">
              Hats & Helmets (Dual-Tone PBR)
            </span>
            {renderDualSlotRow('hat')}
            <p className="text-[11px] text-slate-400">
              Hair compatibility: {TUCK_DESCRIPTIONS[activeHatTuck]}
            </p>
          </div>
          <div className="space-y-2">
            <span className="block text-xs font-medium text-slate-400">
              Eyewear, Masks & Audio Gear
            </span>
            {renderDualSlotRow('head')}
            <p className="text-[11px] text-slate-400">
              Combine eyewear with hats and hair for layered character silhouettes.
            </p>
          </div>
        </div>
      )}

      {/* Category 5: Body Gear & Skin/Brick Colors */}
      {category === 'gear' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <span className="block text-xs font-medium text-slate-400">
              Wearable Back, Arm & Leg Gear (Primary / Accent)
            </span>
            <div className="space-y-1.5">
              {renderDualSlotRow('back')}
              {renderDualSlotRow('arm')}
              {renderDualSlotRow('legs')}
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-400">
                <Palette className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Skin & Brick Colors ({R6_BODY_PART_LABELS[colorPart]})</span>
              </span>
            </div>
            <div className="grid grid-cols-6 gap-1">
              {R6_BODY_PARTS.map((part) => (
                <button
                  key={part}
                  type="button"
                  onClick={() => setColorPart(part)}
                  className={`px-1 py-1 rounded text-[11px] font-medium border transition-colors whitespace-nowrap truncate ${
                    colorPart === part
                      ? 'bg-[#00a2ff] border-[#00a2ff] text-slate-950 font-semibold'
                      : 'bg-[#2b2e35] border-[#393d47] text-slate-300 hover:bg-[#363a43]'
                  }`}
                >
                  {SHORT_PART_LABELS[part]}
                </button>
              ))}
            </div>
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
  );
};
