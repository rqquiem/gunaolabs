import React, { useMemo, useState } from 'react';
import {
  Box,
  Eraser,
  KeyRound,
  RotateCcw,
  Search,
  Sparkles,
  Swords,
} from 'lucide-react';
import {
  applyGripPresetToHandState,
  BUILT_IN_ITEMS,
  cloneCharacterHeldItems,
  createDefaultHandStateForItem,
  createEmptyCharacterHeldItems,
  createEmptyHandState,
  DUAL_WIELD_COMBOS,
  getItemMeta,
  ITEM_CATEGORIES,
  ITEM_CATEGORY_LABELS,
  GRIP_PRESET_LABELS,
} from '../../engine/itemCatalog';
import { CLASSIC_BRICK_COLORS } from '../../engine/robloxCatalog';
import {
  CharacterHeldItems,
  GripPreset,
  HandSlot,
  HandTargetMode,
  HeldHandItemState,
  ItemCategory,
  ItemEasingMode,
  ItemId,
  Vec3Tuple,
} from '../../engine/types';

interface ItemHandlingPanelProps {
  currentHeldItems: CharacterHeldItems;
  hasDraft: boolean;
  activeEasing: ItemEasingMode;
  onPreviewHeldItems: (next: CharacterHeldItems) => void;
  onResetDraft: () => void;
  onCommitItemKeyframe: (easing: ItemEasingMode) => void;
  onSpawnItemAsProp: (
    itemId: ItemId,
    primaryColor: string,
    accentColor: string,
  ) => void;
}

const GRIP_PRESETS: GripPreset[] = ['standard', 'reverse', 'forearm', 'carry'];

export const ItemHandlingPanel: React.FC<ItemHandlingPanelProps> = ({
  currentHeldItems,
  hasDraft,
  activeEasing,
  onPreviewHeldItems,
  onResetDraft,
  onCommitItemKeyframe,
  onSpawnItemAsProp,
}) => {
  const [handMode, setHandMode] = useState<HandTargetMode>('right');
  const [categoryFilter, setCategoryFilter] = useState<ItemCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [easing, setEasing] = useState<ItemEasingMode>(activeEasing);

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return BUILT_IN_ITEMS.filter((item) => {
      if (categoryFilter !== 'all' && item.category !== categoryFilter) return false;
      if (!q) return true;
      return (
        item.name.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        ITEM_CATEGORY_LABELS[item.category].toLowerCase().includes(q)
      );
    });
  }, [categoryFilter, searchQuery]);

  const inspectedHand: HandSlot = handMode === 'left' ? 'left' : 'right';
  const inspectedState: HeldHandItemState = currentHeldItems[inspectedHand];
  const inspectedMeta = getItemMeta(inspectedState.itemId);
  const rightMeta = getItemMeta(currentHeldItems.right.itemId);
  const leftMeta = getItemMeta(currentHeldItems.left.itemId);

  const updateTargetHands = (
    updater: (prevHand: HeldHandItemState, hand: HandSlot) => HeldHandItemState,
  ) => {
    const next = cloneCharacterHeldItems(currentHeldItems);
    if (handMode === 'right' || handMode === 'dual') {
      next.right = updater(next.right, 'right');
    }
    if (handMode === 'left' || handMode === 'dual') {
      next.left = updater(next.left, 'left');
    }
    onPreviewHeldItems(next);
  };

  const handleEquipItem = (itemId: ItemId) => {
    const next = cloneCharacterHeldItems(currentHeldItems);
    if (handMode === 'right' || handMode === 'dual') {
      next.right = createDefaultHandStateForItem(itemId, 'right');
    }
    if (handMode === 'left' || handMode === 'dual') {
      next.left = createDefaultHandStateForItem(itemId, 'left');
    }
    onPreviewHeldItems(next);
  };

  const handleApplyDualCombo = (
    rightItem: ItemId | 'none',
    leftItem: ItemId | 'none',
  ) => {
    onPreviewHeldItems({
      right: createDefaultHandStateForItem(rightItem, 'right'),
      left: createDefaultHandStateForItem(leftItem, 'left'),
    });
  };

  const handleUnequipTarget = () => {
    updateTargetHands(() => createEmptyHandState());
  };

  const handleClearBothHands = () => {
    onPreviewHeldItems(createEmptyCharacterHeldItems());
  };

  const handleApplyGripPreset = (preset: GripPreset) => {
    updateTargetHands((prev, hand) => applyGripPresetToHandState(prev, preset, hand));
  };

  const handleResetGrip = () => {
    updateTargetHands((prev, hand) => {
      if (prev.itemId === 'none') return prev;
      return createDefaultHandStateForItem(prev.itemId, hand, {
        primaryColor: prev.primaryColor,
        accentColor: prev.accentColor,
        scale: prev.scale,
      });
    });
  };

  const handleAxisOffset = (axisIdx: 0 | 1 | 2, val: number) => {
    updateTargetHands((prev) => {
      const nextOffset: Vec3Tuple = [...prev.positionOffset] as Vec3Tuple;
      nextOffset[axisIdx] = val;
      return { ...prev, positionOffset: nextOffset };
    });
  };

  const handleAxisRot = (axisIdx: 0 | 1 | 2, val: number) => {
    updateTargetHands((prev) => {
      const nextRot: Vec3Tuple = [...prev.rotationDeg] as Vec3Tuple;
      nextRot[axisIdx] = val;
      return { ...prev, rotationDeg: nextRot };
    });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-[#393d47]">
      {/* Column 1: Hand Target, Quick Loadouts & 3D Item Catalog */}
      <div className="space-y-1.5 min-w-0">
        <div className="flex items-center justify-between gap-1.5">
          <div className="flex items-center p-0.5 rounded bg-[#14161a] border border-[#393d47]">
            {(
              [
                { id: 'right', label: 'Right' },
                { id: 'left', label: 'Left' },
                { id: 'dual', label: 'Dual-Wield' },
              ] as { id: HandTargetMode; label: string }[]
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setHandMode(opt.id)}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors whitespace-nowrap shrink-0 ${
                  handMode === opt.id
                    ? 'bg-[#00a2ff] text-slate-950 font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleClearBothHands}
            disabled={!rightMeta && !leftMeta}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#2b2e35] border border-[#393d47] text-[11px] text-slate-300 hover:text-white disabled:opacity-40 whitespace-nowrap shrink-0"
          >
            <Eraser className="w-3 h-3" aria-hidden="true" />
            <span>Clear All</span>
          </button>
        </div>

        {/* Search & Category Filter */}
        <div className="flex items-center gap-1.5">
          <div className="relative flex-1 min-w-0">
            <Search
              className="w-3 h-3 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search swords, gear, props..."
              aria-label="Search holdable items"
              className="w-full pl-6 pr-2 py-1 rounded bg-[#14161a] border border-[#393d47] text-[11px] text-slate-200 placeholder:text-slate-500"
            />
          </div>

          <select
            aria-label="Filter items by category"
            value={categoryFilter}
            onChange={(e) =>
              setCategoryFilter(e.target.value as ItemCategory | 'all')
            }
            className="px-1.5 py-1 rounded bg-[#14161a] border border-[#393d47] text-[11px] text-slate-200 shrink-0"
          >
            <option value="all">All ({BUILT_IN_ITEMS.length})</option>
            {ITEM_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {ITEM_CATEGORY_LABELS[cat]}
              </option>
            ))}
          </select>
        </div>

        {/* Item Grid */}
        <div className="max-h-32 overflow-y-auto grid grid-cols-2 gap-1 pr-0.5">
          {filteredItems.map((item) => {
            const isActiveRight = currentHeldItems.right.itemId === item.id;
            const isActiveLeft = currentHeldItems.left.itemId === item.id;
            const isEquippedOnTarget =
              handMode === 'dual'
                ? isActiveRight && isActiveLeft
                : handMode === 'right'
                  ? isActiveRight
                  : isActiveLeft;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleEquipItem(item.id)}
                title={item.description}
                className={`flex items-center gap-1.5 px-2 py-1 rounded text-left border transition-colors min-w-0 ${
                  isEquippedOnTarget
                    ? 'bg-cyan-500/15 border-cyan-400 text-cyan-200'
                    : 'bg-[#2b2e35] border-[#393d47] text-slate-200 hover:bg-[#363a43]'
                }`}
              >
                <span
                  className="w-2.5 h-2.5 rounded-sm border border-black/40 shrink-0"
                  style={{ backgroundColor: item.defaultAccentColor }}
                  aria-hidden="true"
                />
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] font-medium truncate">
                    {item.name}
                  </div>
                  <div className="text-[9px] text-slate-400 truncate">
                    {ITEM_CATEGORY_LABELS[item.category]}
                    {isActiveRight || isActiveLeft
                      ? ` · ${isActiveRight && isActiveLeft ? 'R+L' : isActiveRight ? 'R' : 'L'}`
                      : ''}
                  </div>
                </div>
              </button>
            );
          })}
          {filteredItems.length === 0 && (
            <div className="col-span-2 text-[11px] text-slate-500 py-3 text-center">
              No matching items.
            </div>
          )}
        </div>
      </div>

      {/* Column 2: Active Hand Loadout, Dual Combos & Brick Colors */}
      <div className="space-y-2 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-medium text-slate-400">
            Active Hand Loadout
          </span>
          <div className="flex items-center gap-1">
            {inspectedMeta && (
              <button
                type="button"
                onClick={() =>
                  onSpawnItemAsProp(
                    inspectedMeta.id,
                    inspectedState.primaryColor,
                    inspectedState.accentColor,
                  )
                }
                title="Drop a grounded copy of this item onto the stage as a prop"
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#2b2e35] border border-[#393d47] text-[11px] text-[#38bdf8] hover:bg-[#363a43] whitespace-nowrap"
              >
                <Box className="w-3 h-3" aria-hidden="true" />
                <span>Drop on Stage</span>
              </button>
            )}
            <button
              type="button"
              onClick={handleUnequipTarget}
              disabled={inspectedState.itemId === 'none'}
              className="px-2 py-0.5 rounded bg-[#2b2e35] border border-[#393d47] text-[11px] text-slate-300 hover:text-white disabled:opacity-40 whitespace-nowrap"
            >
              Unequip
            </button>
          </div>
        </div>

        {/* Right / Left Hand Status Strip */}
        <div className="grid grid-cols-2 gap-1.5 text-[11px]">
          <button
            type="button"
            onClick={() => setHandMode('right')}
            className={`px-2 py-1 rounded border text-left truncate transition-colors ${
              handMode === 'right' || handMode === 'dual'
                ? 'bg-[#14161a] border-cyan-500/60 text-slate-100'
                : 'bg-[#14161a]/70 border-[#393d47] text-slate-400'
            }`}
          >
            <span className="text-slate-400 mr-1">R:</span>
            <span>{rightMeta ? rightMeta.name : 'Empty'}</span>
          </button>

          <button
            type="button"
            onClick={() => setHandMode('left')}
            className={`px-2 py-1 rounded border text-left truncate transition-colors ${
              handMode === 'left' || handMode === 'dual'
                ? 'bg-[#14161a] border-cyan-500/60 text-slate-100'
                : 'bg-[#14161a]/70 border-[#393d47] text-slate-400'
            }`}
          >
            <span className="text-slate-400 mr-1">L:</span>
            <span>{leftMeta ? leftMeta.name : 'Empty'}</span>
          </button>
        </div>

        {/* Quick Dual-Wield Loadouts */}
        <div className="space-y-1">
          <span className="flex items-center gap-1 text-[10px] font-medium text-slate-400">
            <Swords className="w-3 h-3 text-cyan-400" aria-hidden="true" />
            <span>Quick Dual-Wield Loadouts</span>
          </span>
          <div className="grid grid-cols-3 gap-1">
            {DUAL_WIELD_COMBOS.map((combo) => (
              <button
                key={combo.id}
                type="button"
                onClick={() => handleApplyDualCombo(combo.rightItem, combo.leftItem)}
                className="px-1.5 py-1 rounded bg-[#2b2e35] border border-[#393d47] text-[10px] text-slate-200 hover:bg-[#363a43] truncate whitespace-nowrap"
              >
                {combo.label}
              </button>
            ))}
          </div>
        </div>

        {/* Item Colors */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
          <div className="flex items-center gap-2 text-[11px]">
            <label className="inline-flex items-center gap-1 text-slate-400">
              <span>Main</span>
              <input
                type="color"
                disabled={inspectedState.itemId === 'none'}
                aria-label="Held item primary color"
                value={inspectedState.primaryColor}
                onChange={(e) =>
                  updateTargetHands((prev) => ({
                    ...prev,
                    primaryColor: e.target.value,
                  }))
                }
                className="w-5 h-5 rounded bg-transparent border border-[#393d47] cursor-pointer disabled:opacity-40"
              />
            </label>
            <label className="inline-flex items-center gap-1 text-slate-400">
              <span>Accent</span>
              <input
                type="color"
                disabled={inspectedState.itemId === 'none'}
                aria-label="Held item accent color"
                value={inspectedState.accentColor}
                onChange={(e) =>
                  updateTargetHands((prev) => ({
                    ...prev,
                    accentColor: e.target.value,
                  }))
                }
                className="w-5 h-5 rounded bg-transparent border border-[#393d47] cursor-pointer disabled:opacity-40"
              />
            </label>
          </div>

          <div className="flex items-center gap-1">
            {CLASSIC_BRICK_COLORS.slice(0, 6).map((swatch) => (
              <button
                key={swatch.name}
                type="button"
                disabled={inspectedState.itemId === 'none'}
                title={`Set accent to ${swatch.name}`}
                aria-label={`Set item accent color to ${swatch.name}`}
                onClick={() =>
                  updateTargetHands((prev) => ({
                    ...prev,
                    accentColor: swatch.hex,
                  }))
                }
                style={{ backgroundColor: swatch.hex }}
                className="w-4 h-4 rounded-sm border border-[#393d47] disabled:opacity-40"
              />
            ))}
          </div>
        </div>
      </div>

      {/* Column 3: Grip Adjustment & Timeline Keying */}
      <div className="space-y-1.5 min-w-0">
        <div className="flex items-center justify-between gap-1.5">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-cyan-400 shrink-0" aria-hidden="true" />
            <select
              aria-label="Item keyframe transition"
              value={easing}
              onChange={(e) => setEasing(e.target.value as ItemEasingMode)}
              className="px-1.5 py-0.5 rounded bg-[#14161a] border border-[#393d47] text-[11px] text-slate-200"
            >
              <option value="equipPop">Equip Pop</option>
              <option value="step">Instant Cut</option>
            </select>
          </div>

          <div className="flex items-center gap-1">
            {hasDraft && (
              <button
                type="button"
                onClick={onResetDraft}
                aria-label="Reset item preview"
                className="p-1 rounded bg-[#2b2e35] border border-[#393d47] text-slate-300 hover:text-white"
              >
                <RotateCcw className="w-3 h-3" aria-hidden="true" />
              </button>
            )}
            <button
              type="button"
              onClick={() => onCommitItemKeyframe(easing)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-cyan-500 text-slate-950 text-xs font-semibold hover:bg-cyan-400 transition-colors whitespace-nowrap shrink-0"
            >
              <KeyRound className="w-3 h-3" aria-hidden="true" />
              <span>Key Item</span>
            </button>
          </div>
        </div>

        {/* Grip Presets */}
        <div className="flex items-center gap-1">
          {GRIP_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              disabled={inspectedState.itemId === 'none'}
              onClick={() => handleApplyGripPreset(preset)}
              className={`flex-1 px-1 py-0.5 rounded text-[10px] font-medium border transition-colors whitespace-nowrap disabled:opacity-40 ${
                inspectedState.gripPreset === preset
                  ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200'
                  : 'bg-[#2b2e35] border-[#393d47] text-slate-300 hover:bg-[#363a43]'
              }`}
            >
              {GRIP_PRESET_LABELS[preset]}
            </button>
          ))}
          <button
            type="button"
            disabled={inspectedState.itemId === 'none'}
            onClick={handleResetGrip}
            title="Reset grip offset & rotation"
            className="px-1.5 py-0.5 rounded bg-[#2b2e35] border border-[#393d47] text-[10px] text-slate-300 hover:text-white disabled:opacity-40 whitespace-nowrap"
          >
            Reset
          </button>
        </div>

        {/* Fine Offset, Rotation & Scale Sliders */}
        <div className="grid grid-cols-2 gap-x-2.5 gap-y-1">
          {(['X', 'Y', 'Z'] as const).map((axis, idx) => (
            <div key={`off-${axis}`} className="flex items-center gap-1 min-w-0">
              <span className="text-[10px] text-slate-400 w-6 shrink-0">
                Off{axis}
              </span>
              <input
                type="range"
                min={-0.6}
                max={0.6}
                step={0.02}
                disabled={inspectedState.itemId === 'none'}
                aria-label={`Grip offset ${axis}`}
                value={inspectedState.positionOffset[idx as 0 | 1 | 2]}
                onChange={(e) =>
                  handleAxisOffset(idx as 0 | 1 | 2, Number(e.target.value))
                }
                className="studio-slider flex-1 min-w-0 disabled:opacity-40"
              />
              <span className="text-[10px] font-mono-tabular text-slate-300 w-7 text-right shrink-0">
                {inspectedState.positionOffset[idx as 0 | 1 | 2].toFixed(2)}
              </span>
            </div>
          ))}

          {(['X', 'Y', 'Z'] as const).map((axis, idx) => (
            <div key={`rot-${axis}`} className="flex items-center gap-1 min-w-0">
              <span className="text-[10px] text-slate-400 w-6 shrink-0">
                Rot{axis}
              </span>
              <input
                type="range"
                min={-180}
                max={180}
                step={5}
                disabled={inspectedState.itemId === 'none'}
                aria-label={`Grip rotation ${axis}`}
                value={inspectedState.rotationDeg[idx as 0 | 1 | 2]}
                onChange={(e) =>
                  handleAxisRot(idx as 0 | 1 | 2, Number(e.target.value))
                }
                className="studio-slider flex-1 min-w-0 disabled:opacity-40"
              />
              <span className="text-[10px] font-mono-tabular text-slate-300 w-7 text-right shrink-0">
                {Math.round(inspectedState.rotationDeg[idx as 0 | 1 | 2])}°
              </span>
            </div>
          ))}

          <div className="col-span-2 flex items-center gap-1.5 min-w-0">
            <span className="text-[10px] text-slate-400 w-9 shrink-0">Scale</span>
            <input
              type="range"
              min={0.4}
              max={2.2}
              step={0.05}
              disabled={inspectedState.itemId === 'none'}
              aria-label="Held item scale"
              value={inspectedState.scale}
              onChange={(e) =>
                updateTargetHands((prev) => ({
                  ...prev,
                  scale: Number(e.target.value),
                }))
              }
              className="studio-slider flex-1 min-w-0 disabled:opacity-40"
            />
            <span className="text-[10px] font-mono-tabular text-slate-300 w-8 text-right shrink-0">
              {inspectedState.scale.toFixed(2)}x
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
