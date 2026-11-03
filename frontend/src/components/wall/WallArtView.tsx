"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  PenTool,
  RotateCw,
  Maximize2,
  Download,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  Layers,
  Grid,
  Box,
  Sliders,
  Info,
  HelpCircle,
  Copy,
  Check,
} from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import {
  COC_GRID_SIZE,
  DEFAULT_MAX_WALLS,
  WALL_FONTS,
  WallFont,
  WallArtMode,
  computeWallArt,
  exportPlanPng,
  RowBuildGuide,
} from "@/lib/wallArtEngine";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function WallArtView() {
  // Input Controls State
  const [text, setText] = useState<string>("COC");
  const [selectedFontId, setSelectedFontId] = useState<string>("montserrat");
  const [scale, setScale] = useState<number>(100);
  const [rotation, setRotation] = useState<number>(0);
  const [maxWalls, setMaxWalls] = useState<number>(DEFAULT_MAX_WALLS);
  const [mode, setMode] = useState<WallArtMode>("skeleton");
  const [viewMode, setViewMode] = useState<"2d" | "3d">("2d");

  // Interaction State
  const [hoveredCell, setHoveredCell] = useState<{ r: number; c: number } | null>(null);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [copiedGuide, setCopiedGuide] = useState<boolean>(false);

  // Canvas Refs
  const canvas2dRef = useRef<HTMLCanvasElement | null>(null);
  const canvas3dRef = useRef<HTMLCanvasElement | null>(null);

  // Selected Font Object
  const currentFont = useMemo(() => {
    return WALL_FONTS.find((f) => f.id === selectedFontId) || WALL_FONTS[0];
  }, [selectedFontId]);

  // Compute Wall Art Result (with binary search budget fallback)
  const result = useMemo(() => {
    return computeWallArt(text, currentFont, scale, rotation, maxWalls, mode);
  }, [text, currentFont, scale, rotation, maxWalls, mode]);

  // ── Render 2D Grid Canvas ───────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvas2dRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const size = 528; // 12px per cell for 44 cells
    canvas.width = size;
    canvas.height = size;
    const cellSize = size / COC_GRID_SIZE;

    // Background
    ctx.fillStyle = "#0F172A"; // Slate 900
    ctx.fillRect(0, 0, size, size);

    // Draw grid cells
    for (let r = 0; r < COC_GRID_SIZE; r++) {
      for (let c = 0; c < COC_GRID_SIZE; c++) {
        const x = c * cellSize;
        const y = r * cellSize;
        const isWall = result.grid[r][c] === 1;
        const isHovered = hoveredCell && hoveredCell.r === r && hoveredCell.c === c;

        if (isWall) {
          // Wall Cell (Amber / Gold block with 3D bevel)
          ctx.fillStyle = isHovered ? "#FBBF24" : "#F59E0B";
          ctx.fillRect(x + 0.5, y + 0.5, cellSize - 1, cellSize - 1);

          // Top/Left bevel highlight
          ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
          ctx.fillRect(x + 1, y + 1, cellSize - 2, 1.5);
          ctx.fillRect(x + 1, y + 1, 1.5, cellSize - 2);

          // Bottom/Right bevel shadow
          ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
          ctx.fillRect(x + 1, y + cellSize - 2.5, cellSize - 2, 1.5);
          ctx.fillRect(x + cellSize - 2.5, y + 1, 1.5, cellSize - 2);
        } else {
          // Empty tile
          ctx.fillStyle = isHovered ? "#1E293B" : (r + c) % 2 === 0 ? "#131C2E" : "#0F172A";
          ctx.fillRect(x, y, cellSize, cellSize);

          // Subtle grid line
          ctx.strokeStyle = "#1E293B";
          ctx.lineWidth = 0.5;
          ctx.strokeRect(x, y, cellSize, cellSize);
        }
      }
    }

    // Center Guide Lines (between 22 and 23)
    const mid = 22 * cellSize;
    ctx.strokeStyle = "rgba(239, 68, 68, 0.35)";
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);

    ctx.beginPath();
    ctx.moveTo(mid, 0);
    ctx.lineTo(mid, size);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, mid);
    ctx.lineTo(size, mid);
    ctx.stroke();

    ctx.setLineDash([]);
  }, [result, hoveredCell]);

  // ── Render 3D Isometric View Canvas ─────────────────────────────────────────
  useEffect(() => {
    if (viewMode !== "3d") return;
    const canvas = canvas3dRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = 640;
    const height = 480;
    canvas.width = width;
    canvas.height = height;

    // Dark isometric background
    ctx.fillStyle = "#0B111E";
    ctx.fillRect(0, 0, width, height);

    // Isometric projection math
    const tileW = 14;
    const tileH = 7;
    const wallHeight = 9;
    const originX = width / 2;
    const originY = 60;

    // Helper to get isometric coordinates
    const toIso = (r: number, c: number) => {
      return {
        x: originX + (c - r) * (tileW / 2),
        y: originY + (c + r) * (tileH / 2),
      };
    };

    // Draw Village Floor Grid (back to front)
    ctx.strokeStyle = "rgba(59, 130, 246, 0.12)";
    ctx.lineWidth = 0.5;

    for (let r = 0; r < COC_GRID_SIZE; r++) {
      for (let c = 0; c < COC_GRID_SIZE; c++) {
        const { x, y } = toIso(r, c);

        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + tileW / 2, y + tileH / 2);
        ctx.lineTo(x, y + tileH);
        ctx.lineTo(x - tileW / 2, y + tileH / 2);
        ctx.closePath();

        ctx.fillStyle = (r + c) % 2 === 0 ? "#111A2E" : "#0D1424";
        ctx.fill();
        ctx.stroke();
      }
    }

    // Draw Walls in depth order (r then c)
    for (let r = 0; r < COC_GRID_SIZE; r++) {
      for (let c = 0; c < COC_GRID_SIZE; c++) {
        if (result.grid[r][c] !== 1) continue;

        const { x, y } = toIso(r, c);

        // Wall Height coordinates
        const topY = y - wallHeight;

        // 1. Left Face (darker shade)
        ctx.fillStyle = "#B45309"; // Amber 700
        ctx.beginPath();
        ctx.moveTo(x - tileW / 2, y + tileH / 2);
        ctx.lineTo(x, y + tileH);
        ctx.lineTo(x, topY + tileH);
        ctx.lineTo(x - tileW / 2, topY + tileH / 2);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = "#92400E";
        ctx.stroke();

        // 2. Right Face (medium shade)
        ctx.fillStyle = "#D97706"; // Amber 600
        ctx.beginPath();
        ctx.moveTo(x, y + tileH);
        ctx.lineTo(x + tileW / 2, y + tileH / 2);
        ctx.lineTo(x + tileW / 2, topY + tileH / 2);
        ctx.lineTo(x, topY + tileH);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = "#B45309";
        ctx.stroke();

        // 3. Top Face (brightest gold shade)
        ctx.fillStyle = "#FBBF24"; // Amber 400
        ctx.beginPath();
        ctx.moveTo(x, topY);
        ctx.lineTo(x + tileW / 2, topY + tileH / 2);
        ctx.lineTo(x, topY + tileH);
        ctx.lineTo(x - tileW / 2, topY + tileH / 2);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = "#FDE68A";
        ctx.stroke();

        // Top highlight crest
        ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
        ctx.beginPath();
        ctx.arc(x, topY + tileH / 2, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }, [viewMode, result]);

  // Handle 2D Canvas Hover
  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvas2dRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const mouseX = (e.clientX - rect.left) * scaleX;
    const mouseY = (e.clientY - rect.top) * scaleY;
    const cellSize = canvas.width / COC_GRID_SIZE;
    const c = Math.floor(mouseX / cellSize);
    const r = Math.floor(mouseY / cellSize);

    if (r >= 0 && r < COC_GRID_SIZE && c >= 0 && c < COC_GRID_SIZE) {
      setHoveredCell({ r, c });
    } else {
      setHoveredCell(null);
    }
  };

  // Download High-Resolution Plan PNG
  const handleDownloadPng = useCallback(() => {
    setIsExporting(true);
    try {
      const dataUrl = exportPlanPng(result.grid, {
        text,
        fontName: currentFont.name,
        usedWalls: result.usedWalls,
        maxWalls: result.maxWalls,
        scale: result.effectiveScale,
        rotation,
      });

      if (!dataUrl) return;

      const link = document.createElement("a");
      link.download = `coc-duvar-yazisi-${text.toLowerCase().replace(/[^a-z0-9]/g, "-")}.png`;
      link.href = dataUrl;
      link.click();
    } finally {
      setIsExporting(false);
    }
  }, [result, text, currentFont, rotation]);

  // Copy Build Guide text
  const handleCopyGuide = () => {
    const lines = result.buildGuide.map(
      (g) =>
        `Satır ${g.row}: ${g.wallCount} duvar [${g.segments
          .map((s) => (s.fromCol === s.toCol ? `Sütun ${s.fromCol}` : `Sütun ${s.fromCol}-${s.toCol} (${s.count} adet)`))
          .join(", ")}]`
    );
    const fullText = [
      `=== CoC Duvar Yazısı İnşa Rehberi ===`,
      `Metin: "${text}"`,
      `Toplam Duvar: ${result.usedWalls} / ${result.maxWalls}`,
      `Izgara: 44x44 Ana Köy`,
      `------------------------------------`,
      ...lines,
    ].join("\n");

    navigator.clipboard.writeText(fullText);
    setCopiedGuide(true);
    setTimeout(() => setCopiedGuide(false), 2000);
  };

  const usagePct = Math.min(100, (result.usedWalls / maxWalls) * 100);

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* 1. Header Banner */}
      <div className="bg-app-card border border-app-border rounded-2xl p-5 md:p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-gradient-to-tr from-amber-500/20 to-yellow-500/20 border border-amber-500/30 text-amber-400">
                <PenTool size={20} />
              </span>
              <div>
                <h1 className="text-xl font-black text-app-text tracking-tight flex items-center gap-2">
                  Duvar Yazısı Şablon Oluşturucu
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    44x44 Ana Köy
                  </span>
                </h1>
                <p className="text-xs text-app-muted">
                  Köyündeki duvarlarla metin yaz; 2D ve 3D izometrik önizle, satır satır inşa rehberi ve koordinatlı planı indir.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleDownloadPng}
              disabled={isExporting || result.usedWalls === 0}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 text-xs font-black transition-all shadow-sm cursor-pointer"
            >
              <Download size={15} />
              <span>{isExporting ? "Hazırlanıyor..." : "PNG Planı İndir"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Main Workspace: Left Controls + Right Canvas & Visualizer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: Controls & Settings (5 Cols) */}
        <div className="lg:col-span-5 space-y-5">
          {/* Text Input Card */}
          <div className="bg-app-card border border-app-border rounded-2xl p-5 shadow-sm space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-black uppercase tracking-wider text-app-muted flex items-center justify-between">
                <span>Yazılacak Metin</span>
                <span className="text-[10px] font-bold text-app-muted">Maks. 25 Karakter</span>
              </label>
              <input
                type="text"
                value={text}
                maxLength={25}
                onChange={(e) => setText(e.target.value)}
                placeholder="Örn: KALE, CLAN, TH18..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-app-cardSubtle border border-app-border text-sm font-bold text-app-text focus:outline-none focus:border-amber-500 transition-colors"
              />
            </div>

            {/* Turkish Character Warning Banner (if font missing chars) */}
            {result.missingChars.length > 0 && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-2.5 text-xs text-amber-300">
                <AlertTriangle size={16} className="text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Türkçe Karakter Uyarısı:</span>
                  <p className="text-[11px] text-amber-200/80 mt-0.5">
                    Seçilen font şu karakterleri içermeyebilir:{" "}
                    <strong>{result.missingChars.join(", ")}</strong>.
                  </p>
                </div>
              </div>
            )}

            {/* Font Picker */}
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-wider text-app-muted flex items-center justify-between">
                <span>Font Seçici</span>
                <span className="text-[10px] text-app-muted font-bold">8 Yerel Font</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {WALL_FONTS.map((font) => {
                  const isSelected = selectedFontId === font.id;
                  return (
                    <button
                      key={font.id}
                      onClick={() => setSelectedFontId(font.id)}
                      className={cn(
                        "p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1",
                        isSelected
                          ? "bg-amber-500/10 border-amber-500/50 shadow-sm"
                          : "bg-app-cardSubtle border-app-border hover:border-app-borderStrong"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className="text-sm font-bold truncate text-app-text"
                          style={{ fontFamily: font.family }}
                        >
                          {font.name}
                        </span>
                        {isSelected && <CheckCircle2 size={13} className="text-amber-400 shrink-0" />}
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-app-muted">
                        <span>{font.style}</span>
                        <span className="text-[9px] font-mono opacity-70">{font.license}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Thickness / Algorithm Mode */}
            <div className="space-y-1.5 pt-2 border-t border-app-border">
              <label className="text-xs font-black uppercase tracking-wider text-app-muted">
                Çizim Algoritması
              </label>
              <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-app-cardSubtle border border-app-border text-xs font-bold">
                {[
                  { key: "skeleton" as WallArtMode, label: "İskelet", desc: "Tek Duvar" },
                  { key: "contour" as WallArtMode, label: "Kontur", desc: "Dış Çerçeve" },
                  { key: "filled" as WallArtMode, label: "Dolu", desc: "Blok Kalın" },
                ].map((item) => (
                  <button
                    key={item.key}
                    onClick={() => setMode(item.key)}
                    className={cn(
                      "py-2 px-2 rounded-lg text-center transition-all cursor-pointer",
                      mode === item.key
                        ? "bg-amber-500 text-slate-950 font-black shadow-sm"
                        : "text-app-muted hover:text-app-text"
                    )}
                  >
                    <div>{item.label}</div>
                    <div className="text-[9px] opacity-75">{item.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Sliders & Wall Budget Card */}
          <div className="bg-app-card border border-app-border rounded-2xl p-5 shadow-sm space-y-4">
            {/* 1. Scale Slider */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-app-muted flex items-center gap-1.5">
                  <Maximize2 size={14} className="text-blue-400" /> Metin Ölçeği
                </span>
                <span className="text-app-text font-black">
                  %{scale} {result.wasScaledDown && <span className="text-amber-400 text-[10px]">(Uygulanan: %{result.effectiveScale})</span>}
                </span>
              </div>
              <input
                type="range"
                min={30}
                max={200}
                step={5}
                value={scale}
                onChange={(e) => setScale(Number(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer"
              />
            </div>

            {/* 2. Rotation Slider */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-app-muted flex items-center gap-1.5">
                  <RotateCw size={14} className="text-purple-400" /> Döndürme Açısı
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-app-text font-black">{rotation}°</span>
                  {rotation !== 0 && (
                    <button
                      onClick={() => setRotation(0)}
                      className="text-[10px] text-app-muted hover:text-amber-400 underline cursor-pointer"
                    >
                      Sıfırla
                    </button>
                  )}
                </div>
              </div>
              <input
                type="range"
                min={-180}
                max={180}
                step={5}
                value={rotation}
                onChange={(e) => setRotation(Number(e.target.value))}
                className="w-full accent-purple-500 cursor-pointer"
              />
            </div>

            {/* 3. Wall Count Budget (Number input + Slider) */}
            <div className="space-y-2 pt-2 border-t border-app-border">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-app-muted flex items-center gap-1.5">
                  <Layers size={14} className="text-amber-400" /> Duvar Sayısı Bütçesi
                </span>
                <input
                  type="number"
                  min={50}
                  max={500}
                  value={maxWalls}
                  onChange={(e) => setMaxWalls(Math.max(10, Math.min(500, Number(e.target.value) || 0)))}
                  className="w-20 px-2 py-1 rounded bg-app-cardSubtle border border-app-border text-xs font-black text-right text-app-text"
                />
              </div>

              <input
                type="range"
                min={50}
                max={500}
                step={25}
                value={maxWalls}
                onChange={(e) => setMaxWalls(Number(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer"
              />

              {/* Quick Preset Buttons */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {[
                  { label: "TH17/18 (325)", count: 325 },
                  { label: "TH15/16 (300)", count: 300 },
                  { label: "TH13/14 (275)", count: 275 },
                  { label: "TH11/12 (250)", count: 250 },
                ].map((preset) => (
                  <button
                    key={preset.count}
                    onClick={() => setMaxWalls(preset.count)}
                    className={cn(
                      "px-2 py-1 rounded text-[10px] font-bold border transition-colors cursor-pointer",
                      maxWalls === preset.count
                        ? "bg-amber-500/20 text-amber-400 border-amber-500/40"
                        : "bg-app-cardSubtle text-app-muted border-app-border hover:text-app-text"
                    )}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Usage Progress Bar */}
            <div className="pt-2 border-t border-app-border space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-app-muted">Duvar Kullanımı:</span>
                <span
                  className={cn(
                    "font-black",
                    result.wasScaledDown ? "text-amber-400" : "text-emerald-400"
                  )}
                >
                  {result.usedWalls} / {maxWalls} duvar (%{usagePct.toFixed(1)})
                </span>
              </div>
              <div className="h-2 w-full bg-app-cardSubtle rounded-full overflow-hidden border border-app-border/40">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-300",
                    result.wasScaledDown
                      ? "bg-amber-500"
                      : "bg-gradient-to-r from-blue-500 to-emerald-400"
                  )}
                  style={{ width: `${usagePct}%` }}
                />
              </div>

              {result.wasScaledDown && (
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[11px] font-semibold text-amber-300 flex items-center gap-2">
                  <Info size={14} className="shrink-0 text-amber-400" />
                  <span>
                    Duvar bütçesine sığdırmak için ölçek otomatik küçültüldü: %{result.originalScale} → %{result.effectiveScale}.
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Visualizer & Build Guide (7 Cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* Visualizer Card */}
          <div className="bg-app-card border border-app-border rounded-2xl p-5 shadow-sm space-y-4">
            {/* View Mode Segmented Control */}
            <div className="flex items-center justify-between border-b border-app-border pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-app-muted flex items-center gap-1.5">
                  <Grid size={15} className="text-amber-400" /> Önizleme Tahtası
                </span>
                {hoveredCell && viewMode === "2d" && (
                  <span className="text-[11px] font-mono text-cyan-400 px-2 py-0.5 rounded bg-cyan-950/40 border border-cyan-800">
                    Satır: {hoveredCell.r + 1}, Sütun: {hoveredCell.c + 1}
                  </span>
                )}
              </div>

              {/* 2D vs 3D Isometric Toggle */}
              <div className="flex items-center p-1 rounded-xl bg-app-cardSubtle border border-app-border text-xs font-bold">
                <button
                  onClick={() => setViewMode("2d")}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer",
                    viewMode === "2d"
                      ? "bg-amber-500 text-slate-950 font-black shadow-sm"
                      : "text-app-muted hover:text-app-text"
                  )}
                >
                  <Grid size={14} />
                  <span>2D Izgara</span>
                </button>
                <button
                  onClick={() => setViewMode("3d")}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer",
                    viewMode === "3d"
                      ? "bg-amber-500 text-slate-950 font-black shadow-sm"
                      : "text-app-muted hover:text-app-text"
                  )}
                >
                  <Box size={14} />
                  <span>3D İzometrik</span>
                </button>
              </div>
            </div>

            {/* Canvas Viewport (Scrollable on mobile) */}
            <div className="overflow-x-auto flex justify-center py-2 bg-app-bg/50 rounded-xl border border-app-border/60">
              {viewMode === "2d" ? (
                <div className="relative select-none">
                  {/* Axis indicators */}
                  <div className="absolute -top-5 left-0 right-0 flex justify-between text-[9px] font-mono text-app-muted px-1">
                    <span>Sütun 1</span>
                    <span>22</span>
                    <span>44</span>
                  </div>
                  <canvas
                    ref={canvas2dRef}
                    onMouseMove={handleCanvasMouseMove}
                    onMouseLeave={() => setHoveredCell(null)}
                    className="rounded-lg shadow-md border border-app-border cursor-crosshair max-w-full h-auto"
                    style={{ width: "min(100%, 528px)", height: "auto", aspectRatio: "1/1" }}
                  />
                  <div className="absolute -bottom-5 left-0 right-0 flex justify-between text-[9px] font-mono text-app-muted px-1">
                    <span>Satır 1 (Üst)</span>
                    <span>Merkez</span>
                    <span>Satır 44 (Alt)</span>
                  </div>
                </div>
              ) : (
                <div className="relative select-none">
                  <canvas
                    ref={canvas3dRef}
                    className="rounded-lg shadow-md border border-app-border max-w-full h-auto"
                    style={{ width: "min(100%, 640px)", height: "auto", aspectRatio: "4/3" }}
                  />
                  <div className="text-center text-[10px] text-app-muted mt-2 font-semibold">
                    45° İzometrik Perspektif • Clash of Clans Köy Haritası Görünümü
                  </div>
                </div>
              )}
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-app-border text-center">
              <div className="p-2.5 rounded-xl bg-app-cardSubtle border border-app-border">
                <div className="text-[10px] font-bold text-app-muted uppercase">Toplam Duvar</div>
                <div className="text-base font-black text-amber-400">{result.usedWalls}</div>
              </div>
              <div className="p-2.5 rounded-xl bg-app-cardSubtle border border-app-border">
                <div className="text-[10px] font-bold text-app-muted uppercase">Kalan Duvar</div>
                <div className="text-base font-black text-blue-400">
                  {Math.max(0, maxWalls - result.usedWalls)}
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-app-cardSubtle border border-app-border">
                <div className="text-[10px] font-bold text-app-muted uppercase">Kapsama Alanı</div>
                <div className="text-base font-black text-purple-400">
                  {result.maxCol > 0 ? `${result.maxCol - result.minCol + 1}x${result.maxRow - result.minRow + 1}` : "0x0"}
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-app-cardSubtle border border-app-border">
                <div className="text-[10px] font-bold text-app-muted uppercase">Dolu Satır</div>
                <div className="text-base font-black text-emerald-400">{result.buildGuide.length} / 44</div>
              </div>
            </div>
          </div>

          {/* Build Guide Accordion / List Card */}
          <div className="bg-app-card border border-app-border rounded-2xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-app-border pb-2.5">
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-app-text flex items-center gap-2">
                  <Sparkles size={15} className="text-amber-400" />
                  İnşa Rehberi (Satır Satır Yerleşim)
                </h3>
                <p className="text-[11px] text-app-muted mt-0.5">
                  Oyunda köy düzenleme modunda duvarları yerleştirirken bakabileceğin koordinat listesi.
                </p>
              </div>

              <button
                onClick={handleCopyGuide}
                disabled={result.buildGuide.length === 0}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-app-cardSubtle hover:bg-app-card border border-app-border text-xs font-bold text-app-text transition-colors cursor-pointer"
              >
                {copiedGuide ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                <span>{copiedGuide ? "Kopyalandı" : "Rehberi Kopyala"}</span>
              </button>
            </div>

            {result.buildGuide.length === 0 ? (
              <div className="text-center py-6 text-xs text-app-muted font-semibold">
                Henüz metin girilmedi veya ızgara boş.
              </div>
            ) : (
              <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1">
                {result.buildGuide.map((item) => (
                  <div
                    key={item.row}
                    className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-app-cardSubtle border border-app-border text-xs font-bold"
                  >
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 text-[11px] font-mono font-black border border-amber-500/30">
                        Satır {item.row}
                      </span>
                      <span className="text-app-text font-black">{item.wallCount} adet duvar</span>
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {item.segments.map((seg, sIdx) => (
                        <span
                          key={sIdx}
                          className="px-2 py-0.5 rounded bg-slate-900/80 border border-slate-700 text-[10px] text-slate-300 font-mono"
                        >
                          {seg.fromCol === seg.toCol
                            ? `Sütun ${seg.fromCol}`
                            : `Sütun ${seg.fromCol}–${seg.toCol} (${seg.count})`}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

