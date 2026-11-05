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
  Copy,
  Check,
  Type,
  Space,
  Move,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Crosshair,
  RotateCcw,
} from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import {
  COC_GRID_SIZE,
  DEFAULT_MAX_WALLS,
  MIN_BITMAP_SCALE,
  MAX_BITMAP_SCALE,
  SCALE_STEP,
  CLEAN_SCALES,
  computeWallArt,
  exportPlanPng,
  resolveChar,
  snapAngleTo45,
  is45DegreeLatticeAngle,
  isHorizontalOnScreen,
} from "@/lib/wallArtEngine";
import { getAllBitmapFonts, getBitmapFont, BitmapFont } from "@/lib/bitmapFonts";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Renders a crisp miniature bitmap canvas preview of the text for font cards.
 */
function BitmapFontPreview({
  font,
  text,
  convertTurkish,
}: {
  font: BitmapFont;
  text: string;
  convertTurkish: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const sample = text.trim() || "COC";

    // Layout characters in a single line for card preview
    const glyphsToDraw: { glyph: number[][]; width: number }[] = [];
    for (const ch of sample) {
      const res = resolveChar(ch, font, convertTurkish);
      if (res.glyph) {
        glyphsToDraw.push({ glyph: res.glyph, width: res.width });
      } else if (res.isSpace) {
        glyphsToDraw.push({ glyph: [], width: Math.max(2, Math.round(font.height * 0.25)) });
      }
    }

    if (glyphsToDraw.length === 0) return;

    const totalW = glyphsToDraw.reduce(
      (acc, g, idx) => acc + g.width + (idx > 0 ? 1 : 0),
      0
    );

    // Compute integer or fit scale
    const scale = Math.max(
      1,
      Math.min(2, Math.floor((canvas.width - 8) / (totalW || 1)))
    );

    const startX = Math.max(4, Math.floor((canvas.width - totalW * scale) / 2));
    const startY = Math.max(2, Math.floor((canvas.height - font.height * scale) / 2));

    ctx.fillStyle = "#F59E0B"; // Amber 500
    let curX = startX;

    for (let i = 0; i < glyphsToDraw.length; i++) {
      if (i > 0) curX += 1 * scale;
      const item = glyphsToDraw[i];

      if (item.glyph && item.glyph.length > 0) {
        for (let r = 0; r < item.glyph.length; r++) {
          for (let c = 0; c < item.glyph[r].length; c++) {
            if (item.glyph[r][c] === 1) {
              ctx.fillRect(curX + c * scale, startY + r * scale, scale, scale);
            }
          }
        }
      }
      curX += item.width * scale;
    }
  }, [font, text, convertTurkish]);

  return (
    <canvas
      ref={canvasRef}
      width={180}
      height={36}
      className="w-full h-9 rounded bg-slate-950/70 border border-app-border/40"
    />
  );
}

export default function WallArtView() {
  const allFonts = useMemo(() => getAllBitmapFonts(), []);

  // Controls State
  const [text, setText] = useState<string>("COC");
  const [selectedFontId, setSelectedFontId] = useState<string>(
    allFonts[0]?.id || "cross_stitch"
  );
  const [scale, setScale] = useState<number>(1);
  const [letterSpacing, setLetterSpacing] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [maxWalls, setMaxWalls] = useState<number>(DEFAULT_MAX_WALLS);
  const [convertTurkish, setConvertTurkish] = useState<boolean>(false);
  const [preserveThinLines, setPreserveThinLines] = useState<boolean>(false);
  const [autoFit, setAutoFit] = useState<boolean>(true);
  const [offsetX, setOffsetX] = useState<number>(0);
  const [offsetY, setOffsetY] = useState<number>(0);
  const [viewMode, setViewMode] = useState<"2d" | "3d">("2d");

  // Interaction State
  const [hoveredCell, setHoveredCell] = useState<{ r: number; c: number } | null>(null);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [copiedGuide, setCopiedGuide] = useState<boolean>(false);
  const dragRef = useRef<{
    active: boolean;
    startX: number;
    startY: number;
    initOffsetX: number;
    initOffsetY: number;
    mode: "2d" | "3d";
  } | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // Canvas Refs
  const canvas2dRef = useRef<HTMLCanvasElement | null>(null);
  const canvas3dRef = useRef<HTMLCanvasElement | null>(null);

  // Selected Font Object
  const currentFont = useMemo(() => {
    return getBitmapFont(selectedFontId) || allFonts[0];
  }, [selectedFontId, allFonts]);

  // Compute Wall Art Result
  const result = useMemo(() => {
    if (!currentFont) {
      return {
        grid: Array.from({ length: COC_GRID_SIZE }, () => new Array(COC_GRID_SIZE).fill(0)),
        wallCount: 0,
        maxWalls,
        isOverBudget: false,
        maxFittingChars: 0,
        effectiveScale: 1,
        originalScale: scale,
        wasScaledDown: false,
        lineCount: 0,
        linesInfo: "Font bulunamadı",
        warnings: ["Hiç geçerli bitmap font bulunamadı."],
        convertedChars: [],
        missingChars: [],
        buildGuide: [],
        minRow: 0,
        maxRow: 0,
        minCol: 0,
        maxCol: 0,
        capHeight: 0,
        isCleanScale: true,
        isReadabilityLow: false,
        preserveThinLines,
        spanReq: 0,
        fitsInGrid: true,
        isLattice45: false,
        isHorizontalOnScreen: false,
        thickenedChars: [],
        autoFit,
        offsetX,
        offsetY,
      };
    }

    return computeWallArt(
      text,
      currentFont,
      scale,
      rotation,
      maxWalls,
      letterSpacing,
      convertTurkish,
      autoFit,
      preserveThinLines,
      offsetX,
      offsetY
    );
  }, [text, currentFont, scale, rotation, maxWalls, letterSpacing, convertTurkish, autoFit, preserveThinLines, offsetX, offsetY]);

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

    // Draw Floor Grid
    for (let r = 0; r < COC_GRID_SIZE; r++) {
      for (let c = 0; c < COC_GRID_SIZE; c++) {
        const x = c * cellSize;
        const y = r * cellSize;
        const isWall = result.grid[r][c] === 1;

        if (isWall) {
          // Wall Cell
          ctx.fillStyle = "#F59E0B"; // Amber 500
          ctx.fillRect(x, y, cellSize, cellSize);

          // Wall bevel
          ctx.strokeStyle = "#FDE68A"; // Amber 200
          ctx.lineWidth = 1;
          ctx.strokeRect(x + 0.5, y + 0.5, cellSize - 1, cellSize - 1);
        } else {
          // Grass tile checkerboard
          ctx.fillStyle = (r + c) % 2 === 0 ? "#141E33" : "#101828";
          ctx.fillRect(x, y, cellSize, cellSize);

          ctx.strokeStyle = "rgba(255, 255, 255, 0.04)";
          ctx.lineWidth = 0.5;
          ctx.strokeRect(x, y, cellSize, cellSize);
        }
      }
    }

    // Center Crosslines (between cell 22 and 23)
    const mid = 22 * cellSize;
    ctx.strokeStyle = "rgba(239, 68, 68, 0.4)";
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
  }, [result]);

  // ── Render 3D Isometric Canvas ──────────────────────────────────────────────
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

    ctx.fillStyle = "#0B111E";
    ctx.fillRect(0, 0, width, height);

    const tileW = 14;
    const tileH = 7;
    const wallHeight = 9;
    const originX = width / 2;
    const originY = 60;

    const toIso = (r: number, c: number) => {
      return {
        x: originX + (c - r) * (tileW / 2),
        y: originY + (c + r) * (tileH / 2),
      };
    };

    // Draw Floor Grid (back to front)
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

    // Draw Walls in depth order
    for (let r = 0; r < COC_GRID_SIZE; r++) {
      for (let c = 0; c < COC_GRID_SIZE; c++) {
        if (result.grid[r][c] !== 1) continue;

        const { x, y } = toIso(r, c);
        const topY = y - wallHeight;

        // Left Face
        ctx.fillStyle = "#B45309";
        ctx.beginPath();
        ctx.moveTo(x - tileW / 2, y + tileH / 2);
        ctx.lineTo(x, y + tileH);
        ctx.lineTo(x, topY + tileH);
        ctx.lineTo(x - tileW / 2, topY + tileH / 2);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = "#92400E";
        ctx.stroke();

        // Right Face
        ctx.fillStyle = "#D97706";
        ctx.beginPath();
        ctx.moveTo(x, y + tileH);
        ctx.lineTo(x + tileW / 2, y + tileH / 2);
        ctx.lineTo(x + tileW / 2, topY + tileH / 2);
        ctx.lineTo(x, topY + tileH);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = "#B45309";
        ctx.stroke();

        // Top Face
        ctx.fillStyle = "#FBBF24";
        ctx.beginPath();
        ctx.moveTo(x, topY);
        ctx.lineTo(x + tileW / 2, topY + tileH / 2);
        ctx.lineTo(x, topY + tileH);
        ctx.lineTo(x - tileW / 2, topY + tileH / 2);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = "#FDE68A";
        ctx.stroke();

        // Highlight crest
        ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
        ctx.beginPath();
        ctx.arc(x, topY + tileH / 2, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }, [viewMode, result]);

  // ── Canvas Drag-to-Position Handlers (2D and 3D) ───────────────────────────
  const handlePointerDown = (
    e: React.PointerEvent<HTMLCanvasElement>,
    mode: "2d" | "3d"
  ) => {
    // Only drag with left click or touch
    if (e.button !== 0 && e.pointerType === "mouse") return;
    const canvas = e.currentTarget;
    try {
      canvas.setPointerCapture(e.pointerId);
    } catch {
      // Fallback if browser ignores capture
    }

    dragRef.current = {
      active: true,
      startX: e.clientX,
      startY: e.clientY,
      initOffsetX: offsetX,
      initOffsetY: offsetY,
      mode,
    };
    setIsDragging(true);
  };

  const handlePointerMove = (
    e: React.PointerEvent<HTMLCanvasElement>,
    mode: "2d" | "3d"
  ) => {
    if (dragRef.current && dragRef.current.active) {
      const canvas = e.currentTarget;
      const rect = canvas.getBoundingClientRect();
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;

      let deltaC = 0;
      let deltaR = 0;

      if (mode === "2d") {
        const cellPixelSize = rect.width / COC_GRID_SIZE;
        deltaC = Math.round(dx / cellPixelSize);
        deltaR = Math.round(dy / cellPixelSize);
      } else {
        // 3D Isometric View
        // Inverse isometric projection:
        // x = originX + (c - r) * (tileW / 2)
        // y = originY + (c + r) * (tileH / 2)
        const scaleFactor = rect.width / 640;
        const tileW = 14 * scaleFactor;
        const tileH = 7 * scaleFactor;
        deltaC = Math.round(dx / tileW + dy / tileH);
        deltaR = Math.round(dy / tileH - dx / tileW);
      }

      const newX = Math.max(-20, Math.min(20, dragRef.current.initOffsetX + deltaC));
      const newY = Math.max(-20, Math.min(20, dragRef.current.initOffsetY + deltaR));

      if (newX !== offsetX) setOffsetX(newX);
      if (newY !== offsetY) setOffsetY(newY);
      return;
    }

    // 2D hover inspector when not dragging
    if (mode === "2d") {
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
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (dragRef.current?.active) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // Ignore
      }
      dragRef.current = null;
      setIsDragging(false);
    }
  };

  // Download Blueprint PNG
  const handleDownloadPng = useCallback(() => {
    if (!currentFont) return;
    setIsExporting(true);
    try {
      const dataUrl = exportPlanPng(result.grid, {
        text,
        fontName: currentFont.name,
        wallCount: result.wallCount,
        maxWalls: result.maxWalls,
        scale: result.effectiveScale,
        rotation,
        offsetX,
        offsetY,
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
          .map((s) => (s.fromCol === s.toCol ? `Sütun ${s.fromCol}` : `Sütun ${s.fromCol}–${s.toCol} (${s.count} adet)`))
          .join(", ")}]`
    );
    const fullText = [
      `=== CoC Duvar Yazısı İnşa Rehberi ===`,
      `Metin: "${text}"`,
      `Font: ${currentFont?.name || "Bilinmiyor"} (Ölçek: ${result.effectiveScale}x, Açı: ${rotation}°)`,
      `Toplam Duvar: ${result.wallCount} / ${result.maxWalls}`,
      `Izgara: 44x44 Ana Köy`,
      `------------------------------------`,
      ...lines,
    ].join("\n");

    navigator.clipboard.writeText(fullText);
    setCopiedGuide(true);
    setTimeout(() => setCopiedGuide(false), 2000);
  };

  const usagePct = Math.min(100, (result.wallCount / maxWalls) * 100);

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
                  Köyündeki duvarlarla bitmap font kullanarak metin yaz; 2D ve 3D izometrik önizle, satır satır inşa rehberi ve koordinatlı planı indir.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleDownloadPng}
              disabled={isExporting || result.wallCount === 0}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 text-xs font-black transition-all shadow-sm cursor-pointer"
            >
              <Download size={15} />
              <span>{isExporting ? "Hazırlanıyor..." : "PNG Planı İndir"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Main Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: Controls & Settings (5 Cols) */}
        <div className="lg:col-span-5 space-y-5">
          {/* Text Input Card */}
          <div className="bg-app-card border border-app-border rounded-2xl p-5 shadow-sm space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-black uppercase tracking-wider text-app-muted flex items-center justify-between">
                <span>Yazılacak Metin</span>
                <span className="text-[10px] font-bold text-app-muted">Maks. 35 Karakter</span>
              </label>
              <input
                type="text"
                value={text}
                maxLength={35}
                onChange={(e) => setText(e.target.value)}
                placeholder="Örn: KALE, HARUN, COC..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-app-cardSubtle border border-app-border text-sm font-bold text-app-text focus:outline-none focus:border-amber-500 transition-colors"
              />
            </div>

            {/* Turkish ASCII Conversion Switch */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-app-cardSubtle border border-app-border">
              <div className="space-y-0.5 pr-2">
                <div className="text-xs font-bold text-app-text">
                  Türkçe harfleri ASCII karşılığıyla yaz
                </div>
                <div className="text-[10px] text-app-muted">
                  Ç→C, Ğ→G, İ→I, Ö→O, Ş→S, Ü→U
                </div>
              </div>
              <input
                type="checkbox"
                checked={convertTurkish}
                onChange={(e) => setConvertTurkish(e.target.checked)}
                className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400 bg-app-card border-app-border cursor-pointer"
              />
            </div>

            {/* Converted Characters Badge */}
            {result.convertedChars.length > 0 && (
              <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-[11px] font-bold text-blue-300 flex items-center gap-2">
                <Info size={14} className="shrink-0 text-blue-400" />
                <span>Dönüştürülen harfler: {result.convertedChars.join(", ")}</span>
              </div>
            )}

            {/* Missing Character Warning Banner */}
            {result.missingChars.length > 0 && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 space-y-1 text-xs text-amber-300">
                <div className="flex items-center gap-2 font-black">
                  <AlertTriangle size={15} className="text-amber-400 shrink-0" />
                  <span>Karakter Uyarısı:</span>
                </div>
                <p className="text-[11px] text-amber-200/80">
                  Şu karakterler seçili fontta olmadığı için atlandı:{" "}
                  <strong>{result.missingChars.join(", ")}</strong>.
                </p>
                {!convertTurkish &&
                  result.missingChars.some((c) => "çğıöşüÇĞİÖŞÜ".includes(c)) && (
                    <p className="text-[10px] text-amber-300 underline font-semibold mt-1">
                      İpucu: Yukarıdaki &quot;Türkçe harfleri ASCII karşılığıyla yaz&quot; seçeneğini açabilirsiniz.
                    </p>
                  )}
              </div>
            )}

            {/* Bitmap Font Picker Cards */}
            <div className="space-y-2 pt-2 border-t border-app-border">
              <label className="text-xs font-black uppercase tracking-wider text-app-muted flex items-center justify-between">
                <span>Bitmap Font Seçici</span>
                <span className="text-[10px] text-app-muted font-bold">
                  {allFonts.length} Modüler Font
                </span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {allFonts.map((font) => {
                  const isSelected = selectedFontId === font.id;
                  const hasLower = font.missingSummary.hasLowercase;
                  const hasDigits = font.missingSummary.hasDigits;

                  return (
                    <button
                      key={font.id}
                      onClick={() => setSelectedFontId(font.id)}
                      className={cn(
                        "p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2",
                        isSelected
                          ? "bg-amber-500/10 border-amber-500/50 shadow-sm"
                          : "bg-app-cardSubtle border-app-border hover:border-app-borderStrong"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-app-text truncate">
                          {font.name}
                        </span>
                        {isSelected && <CheckCircle2 size={14} className="text-amber-400 shrink-0" />}
                      </div>

                      {/* Miniature bitmap preview */}
                      <BitmapFontPreview
                        font={font}
                        text={text}
                        convertTurkish={convertTurkish}
                      />

                      <div className="flex items-center justify-between text-[10px] text-app-muted font-semibold pt-1 border-t border-app-border/30">
                        <span>{font.height} Satır Yükseklik</span>
                        <span>
                          {font.supportedChars.length} Glif {hasLower && hasDigits ? "(A-Z, a-z, 0-9)" : "(A-Z)"}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Sliders & Wall Budget Card */}
          <div className="bg-app-card border border-app-border rounded-2xl p-5 shadow-sm space-y-4">
            {/* 1. Scale Slider (0.5x - 4x, step 0.25) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-app-muted flex items-center gap-1.5">
                  <Maximize2 size={14} className="text-blue-400" /> Glif Ölçeği (Hücre Çarpanı)
                </span>
                <span className="text-app-text font-black">
                  {scale}x {result.wasScaledDown && (
                    <span className="text-amber-400 text-[10px] font-bold">
                      (Uygulanan: {result.effectiveScale}x)
                    </span>
                  )}
                </span>
              </div>
              <input
                type="range"
                min={MIN_BITMAP_SCALE}
                max={MAX_BITMAP_SCALE}
                step={SCALE_STEP}
                value={scale}
                onChange={(e) => setScale(Number(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-app-muted font-mono px-0.5">
                <span className={cn(scale === 0.5 && "text-amber-400 font-bold")}>0.5x</span>
                <span className={cn(scale === 1 && "text-amber-400 font-bold")}>1x (Doğal)</span>
                <span className={cn(scale === 2 && "text-amber-400 font-bold")}>2x</span>
                <span className={cn(scale === 3 && "text-amber-400 font-bold")}>3x</span>
                <span className={cn(scale === 4 && "text-amber-400 font-bold")}>4x</span>
              </div>

              {/* Fractional / Non-clean scale informational notice */}
              {!result.isCleanScale && (
                <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-[11px] font-semibold text-blue-300 flex items-center gap-2 mt-1">
                  <Info size={14} className="shrink-0 text-blue-400" />
                  <span>Bu ölçekte harf kalınlıkları eşit olmayabilir</span>
                </div>
              )}

              {/* Preserve Thin Lines Toggle (visible only when scale < 1) */}
              {scale < 1 && (
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-app-cardSubtle border border-app-border mt-2">
                  <div className="space-y-0.5">
                    <div className="text-xs font-bold text-app-text">İnce çizgileri koru</div>
                    <div className="text-[10px] text-app-muted">Eşik 0.25 (Tek piksellik hat kaybını önler)</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={preserveThinLines}
                    onChange={(e) => setPreserveThinLines(e.target.checked)}
                    className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400 bg-app-card border-app-border cursor-pointer"
                  />
                </div>
              )}

              {/* Otomatik Sığdırma (Glif Ölçeklendirme) Toggle */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-app-cardSubtle border border-app-border mt-2">
                <div className="space-y-0.5 pr-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-app-text">Otomatik Sığdırma</span>
                    <span
                      className={cn(
                        "text-[9px] font-bold px-1.5 py-0.5 rounded border",
                        autoFit
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                          : "bg-amber-500/10 text-amber-400 border-amber-500/30"
                      )}
                    >
                      {autoFit ? "Açık (Otomatik)" : "Kapalı (Zorla)"}
                    </span>
                  </div>
                  <div className="text-[10px] text-app-muted leading-tight">
                    {autoFit
                      ? "Taşma veya bütçe aşımında ölçek otomatik küçültülür."
                      : "Seçilen ölçek (örn. " + scale + "x) kesin olarak zorlanır, otomatik küçültülmez."}
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={autoFit}
                  onChange={(e) => setAutoFit(e.target.checked)}
                  className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400 bg-app-card border-app-border cursor-pointer shrink-0"
                />
              </div>
            </div>

            {/* 2. Letter Spacing Slider */}
            <div className="space-y-1.5 pt-2 border-t border-app-border">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-app-muted flex items-center gap-1.5">
                  <Space size={14} className="text-cyan-400" /> Harf Aralığı
                </span>
                <span className="text-app-text font-black">{letterSpacing} hücre</span>
              </div>
              <input
                type="range"
                min={0}
                max={4}
                step={1}
                value={letterSpacing}
                onChange={(e) => setLetterSpacing(Number(e.target.value))}
                className="w-full accent-cyan-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-app-muted font-mono px-0.5">
                <span>0</span>
                <span>1</span>
                <span>2</span>
                <span>3</span>
                <span>4 hücre</span>
              </div>
            </div>

            {/* 3. Rotation Slider (with 45° magnetic snapping) */}
            <div className="space-y-1.5 pt-2 border-t border-app-border">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-app-muted flex items-center gap-1.5">
                  <RotateCw size={14} className="text-purple-400" /> Döndürme Açısı
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-app-text font-black flex items-center gap-1.5">
                    {rotation}°
                    {result.isHorizontalOnScreen && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        Ekranda Yatay
                      </span>
                    )}
                  </span>
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
                onChange={(e) => setRotation(snapAngleTo45(Number(e.target.value), 7))}
                className="w-full accent-purple-500 cursor-pointer"
              />
              <div className="flex flex-wrap gap-1.5 pt-1">
                {[
                  { deg: -45, label: "-45° (Ekranda Yatay)", highlight: true },
                  { deg: 0, label: "0°" },
                  { deg: 45, label: "45°" },
                  { deg: 90, label: "90°" },
                  { deg: -90, label: "-90°" },
                  { deg: 135, label: "135°" },
                  { deg: -135, label: "-135°" },
                  { deg: 180, label: "180°" },
                ].map((preset) => (
                  <button
                    key={preset.deg}
                    onClick={() => setRotation(preset.deg)}
                    className={cn(
                      "px-2 py-1 rounded text-[10px] font-bold border transition-colors cursor-pointer",
                      rotation === preset.deg
                        ? preset.highlight
                          ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                          : "bg-purple-500/20 text-purple-400 border-purple-500/40"
                        : "bg-app-cardSubtle text-app-muted border-app-border hover:text-app-text"
                    )}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              {/* Angle Information and Warnings */}
              {result.isLattice45 ? (
                <div className="text-[10px] text-cyan-300 font-medium pt-1 flex items-center gap-1.5 bg-cyan-950/40 border border-cyan-800/40 p-2 rounded-lg">
                  <Info size={13} className="shrink-0 text-cyan-400" />
                  <span>
                    Basamaklı (4-bağlantılı) çapraz çizim
                    {result.isHorizontalOnScreen &&
                      " • İzometrik köy haritasında metin ekranda düz yatay okunur."}
                  </span>
                </div>
              ) : rotation % 90 !== 0 && result.warnings.some((w) => w.includes("Piksel harfleri bozabilir")) ? (
                <div className="text-[10px] text-amber-400/90 font-medium pt-1 flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 p-2 rounded-lg">
                  <AlertTriangle size={13} className="shrink-0 text-amber-400" />
                  <span>Piksel harfleri bozabilir; 45° katlarını kullanın.</span>
                </div>
              ) : null}

              {/* Dilation Notice if any glyph was thickened to preserve connectivity */}
              {result.thickenedChars && result.thickenedChars.length > 0 && (
                <div className="text-[10px] text-emerald-300 font-medium pt-1 flex items-center gap-1.5 bg-emerald-950/40 border border-emerald-800/40 p-2 rounded-lg">
                  <Sparkles size={13} className="shrink-0 text-emerald-400" />
                  <span>
                    Bazı harflerde ince çizgiler korundu ({result.thickenedChars.join(", ")})
                  </span>
                </div>
              )}
            </div>

            {/* 4. Grid Position / Offset (Sağa-Sola, Yukarı-Aşağı Kaydırma) */}
            <div className="space-y-3 pt-2 border-t border-app-border">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-app-muted flex items-center gap-1.5">
                  <Move size={14} className="text-indigo-400" /> Izgara Konumu (Kaydırma)
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono text-app-text font-bold bg-app-cardSubtle px-2 py-0.5 rounded border border-app-border">
                    X: {offsetX > 0 ? `+${offsetX}` : offsetX} | Y: {offsetY > 0 ? `+${offsetY}` : offsetY}
                  </span>
                  {(offsetX !== 0 || offsetY !== 0) && (
                    <button
                      onClick={() => {
                        setOffsetX(0);
                        setOffsetY(0);
                      }}
                      className="text-[10px] text-app-muted hover:text-amber-400 flex items-center gap-1 underline cursor-pointer"
                      title="Merkeze Sıfırla"
                    >
                      <RotateCcw size={10} /> Ortala
                    </button>
                  )}
                </div>
              </div>

              {/* D-Pad + Sliders Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center bg-app-cardSubtle/60 p-3 rounded-xl border border-app-border">
                {/* D-Pad Directional Controller */}
                <div className="flex flex-col items-center justify-center">
                  <div className="grid grid-cols-3 gap-1 w-28 h-28 p-1 bg-slate-950/60 rounded-xl border border-app-border/70">
                    <div></div>
                    <button
                      onClick={() => setOffsetY((prev) => Math.max(-20, prev - 1))}
                      className="flex items-center justify-center rounded-lg bg-app-card hover:bg-indigo-600/30 text-app-muted hover:text-indigo-300 border border-app-border active:scale-95 transition-transform cursor-pointer"
                      title="Yukarı Kaydır (-Y)"
                    >
                      <ArrowUp size={16} />
                    </button>
                    <div></div>

                    <button
                      onClick={() => setOffsetX((prev) => Math.max(-20, prev - 1))}
                      className="flex items-center justify-center rounded-lg bg-app-card hover:bg-indigo-600/30 text-app-muted hover:text-indigo-300 border border-app-border active:scale-95 transition-transform cursor-pointer"
                      title="Sola Kaydır (-X)"
                    >
                      <ArrowLeft size={16} />
                    </button>
                    <button
                      onClick={() => {
                        setOffsetX(0);
                        setOffsetY(0);
                      }}
                      className="flex items-center justify-center rounded-lg bg-indigo-500/10 hover:bg-indigo-500/30 text-indigo-400 border border-indigo-500/30 active:scale-95 transition-transform cursor-pointer"
                      title="Ortala (0,0)"
                    >
                      <Crosshair size={15} />
                    </button>
                    <button
                      onClick={() => setOffsetX((prev) => Math.min(20, prev + 1))}
                      className="flex items-center justify-center rounded-lg bg-app-card hover:bg-indigo-600/30 text-app-muted hover:text-indigo-300 border border-app-border active:scale-95 transition-transform cursor-pointer"
                      title="Sağa Kaydır (+X)"
                    >
                      <ArrowRight size={16} />
                    </button>

                    <div></div>
                    <button
                      onClick={() => setOffsetY((prev) => Math.min(20, prev + 1))}
                      className="flex items-center justify-center rounded-lg bg-app-card hover:bg-indigo-600/30 text-app-muted hover:text-indigo-300 border border-app-border active:scale-95 transition-transform cursor-pointer"
                      title="Aşağı Kaydır (+Y)"
                    >
                      <ArrowDown size={16} />
                    </button>
                    <div></div>
                  </div>
                  <span className="text-[10px] text-app-muted mt-1.5 font-medium">Hassas Yön Tuşları</span>
                </div>

                {/* Sliders for Direct Range Tuning */}
                <div className="space-y-2.5">
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] font-medium text-app-muted">
                      <span>Yatay (X / Sağa-Sola):</span>
                      <span className="font-mono text-app-text font-bold">
                        {offsetX > 0 ? `+${offsetX} Sağ` : offsetX < 0 ? `${offsetX} Sol` : "0 (Merkez)"}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={-20}
                      max={20}
                      step={1}
                      value={offsetX}
                      onChange={(e) => setOffsetX(Number(e.target.value))}
                      className="w-full accent-indigo-500 cursor-pointer h-1.5"
                    />
                    <div className="flex justify-between text-[9px] text-app-muted font-mono">
                      <span>-20 (Sol)</span>
                      <span>0</span>
                      <span>+20 (Sağ)</span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] font-medium text-app-muted">
                      <span>Dikey (Y / Yukarı-Aşağı):</span>
                      <span className="font-mono text-app-text font-bold">
                        {offsetY > 0 ? `+${offsetY} Aşağı` : offsetY < 0 ? `${offsetY} Yukarı` : "0 (Merkez)"}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={-20}
                      max={20}
                      step={1}
                      value={offsetY}
                      onChange={(e) => setOffsetY(Number(e.target.value))}
                      className="w-full accent-indigo-500 cursor-pointer h-1.5"
                    />
                    <div className="flex justify-between text-[9px] text-app-muted font-mono">
                      <span>-20 (Yukarı)</span>
                      <span>0</span>
                      <span>+20 (Aşağı)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 5. Wall Count Budget */}
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
                    result.isOverBudget
                      ? "text-rose-400"
                      : result.wasScaledDown
                      ? "text-amber-400"
                      : "text-emerald-400"
                  )}
                >
                  {result.wallCount} / {maxWalls} duvar (%{usagePct.toFixed(1)})
                </span>
              </div>
              <div className="h-2 w-full bg-app-cardSubtle rounded-full overflow-hidden border border-app-border/40">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-300",
                    result.isOverBudget
                      ? "bg-rose-500"
                      : result.wasScaledDown
                      ? "bg-amber-500"
                      : "bg-gradient-to-r from-blue-500 to-emerald-400"
                  )}
                  style={{ width: `${usagePct}%` }}
                />
              </div>

              {/* Over Budget Alert */}
              {result.isOverBudget && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 space-y-1">
                  <div className="font-black flex items-center gap-1.5">
                    <AlertTriangle size={15} className="text-rose-400 shrink-0" />
                    <span>Duvar Bütçesi Aşıldı!</span>
                  </div>
                  <p className="text-[11px] text-rose-200/90">
                    {result.effectiveScale <= MIN_BITMAP_SCALE ? (
                      <span>Bu metin 0.5x ölçekte bile bütçeyi aşıyor, metni kısaltın veya bütçeyi artırın.</span>
                    ) : (
                      <span>
                        Bütçeye <strong>en fazla {result.maxFittingChars} harf</strong> sığıyor. Ölçeği düşürmeyi veya metni kısaltmayı deneyin.
                      </span>
                    )}
                  </p>
                </div>
              )}

              {/* 45 Degree Lattice Overflow Alert */}
              {result.isLattice45 && !result.fitsInGrid && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 space-y-1">
                  <div className="font-black flex items-center gap-1.5">
                    <AlertTriangle size={15} className="text-amber-400 shrink-0" />
                    <span>45° Modunda Sınır Kutusu Taşması!</span>
                  </div>
                  <p className="text-[11px] text-amber-200/90">
                    Bu metin 45° modunda ızgaraya sığmıyor (gereken: <strong>{result.spanReq} hücre</strong>, mevcut: 44). Ölçeği küçültün veya metni kısaltın.
                  </p>
                </div>
              )}

              {result.wasScaledDown && (
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[11px] font-semibold text-amber-300 flex items-center gap-2">
                  <Info size={14} className="shrink-0 text-amber-400" />
                  <span>
                    Bütçeye veya ızgaraya sığdırmak için ölçek otomatik küçültüldü: {result.originalScale}x → {result.effectiveScale}x.
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
            {/* View Mode Segmented Control & Status Badges */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-app-border pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-app-muted flex items-center gap-1.5">
                  <Grid size={15} className="text-amber-400" /> Önizleme Tahtası
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  {result.linesInfo}
                </span>
                {hoveredCell && viewMode === "2d" && (
                  <span className="text-[11px] font-mono text-cyan-400 px-2 py-0.5 rounded bg-cyan-950/40 border border-cyan-800">
                    Satır: {hoveredCell.r + 1}, Sütun: {hoveredCell.c + 1}
                  </span>
                )}
                {(offsetX !== 0 || offsetY !== 0) && (
                  <button
                    onClick={() => {
                      setOffsetX(0);
                      setOffsetY(0);
                    }}
                    className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-950/60 text-indigo-300 border border-indigo-700/60 flex items-center gap-1 hover:border-indigo-400 cursor-pointer transition-colors"
                    title="Konumu merkeze sıfırla (0,0)"
                  >
                    <Move size={10} className="text-indigo-400" />
                    <span>X:{offsetX > 0 ? `+${offsetX}` : offsetX}, Y:{offsetY > 0 ? `+${offsetY}` : offsetY}</span>
                    <RotateCcw size={9} className="text-indigo-400 ml-0.5" />
                  </button>
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

            {/* Canvas Viewport */}
            <div className="overflow-x-auto flex flex-col items-center py-2 bg-app-bg/50 rounded-xl border border-app-border/60">
              {viewMode === "2d" ? (
                <div className="relative select-none">
                  {/* Floating Drag Indicator */}
                  {isDragging && (
                    <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-slate-900/95 text-amber-400 text-xs font-bold px-3 py-1.5 rounded-full border border-amber-500/60 shadow-xl backdrop-blur pointer-events-none flex items-center gap-2 z-20 animate-pulse">
                      <Move size={14} className="text-amber-400" />
                      <span>Konumlandırılıyor: X: {offsetX > 0 ? `+${offsetX}` : offsetX}, Y: {offsetY > 0 ? `+${offsetY}` : offsetY}</span>
                    </div>
                  )}

                  <div className="absolute -top-5 left-0 right-0 flex justify-between text-[9px] font-mono text-app-muted px-1">
                    <span>Sütun 1</span>
                    <span>22</span>
                    <span>44</span>
                  </div>
                  <canvas
                    ref={canvas2dRef}
                    onPointerDown={(e) => handlePointerDown(e, "2d")}
                    onPointerMove={(e) => handlePointerMove(e, "2d")}
                    onPointerUp={handlePointerUp}
                    onPointerCancel={handlePointerUp}
                    onMouseLeave={() => {
                      if (!isDragging) setHoveredCell(null);
                    }}
                    className={cn(
                      "rounded-lg shadow-md border max-w-full h-auto select-none touch-none transition-all",
                      isDragging
                        ? "cursor-grabbing border-amber-400 shadow-amber-500/20 ring-1 ring-amber-400/50"
                        : "cursor-grab border-app-border hover:border-amber-500/50"
                    )}
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
                  {/* Floating Drag Indicator */}
                  {isDragging && (
                    <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-slate-900/95 text-amber-400 text-xs font-bold px-3 py-1.5 rounded-full border border-amber-500/60 shadow-xl backdrop-blur pointer-events-none flex items-center gap-2 z-20 animate-pulse">
                      <Move size={14} className="text-amber-400" />
                      <span>Konumlandırılıyor: X: {offsetX > 0 ? `+${offsetX}` : offsetX}, Y: {offsetY > 0 ? `+${offsetY}` : offsetY}</span>
                    </div>
                  )}

                  <canvas
                    ref={canvas3dRef}
                    onPointerDown={(e) => handlePointerDown(e, "3d")}
                    onPointerMove={(e) => handlePointerMove(e, "3d")}
                    onPointerUp={handlePointerUp}
                    onPointerCancel={handlePointerUp}
                    className={cn(
                      "rounded-lg shadow-md border max-w-full h-auto select-none touch-none transition-all",
                      isDragging
                        ? "cursor-grabbing border-amber-400 shadow-amber-500/20 ring-1 ring-amber-400/50"
                        : "cursor-grab border-app-border hover:border-amber-500/50"
                    )}
                    style={{ width: "min(100%, 640px)", height: "auto", aspectRatio: "4/3" }}
                  />
                  <div className="text-center text-[10px] text-app-muted mt-2 font-semibold">
                    45° İzometrik Perspektif • Clash of Clans Köy Haritası Görünümü
                  </div>
                </div>
              )}

              {/* Drag Hint Footer */}
              <div className="text-center text-[10px] text-app-muted mt-3 font-medium flex items-center justify-center gap-1.5 px-3">
                <Move size={12} className="text-indigo-400 shrink-0" />
                <span>
                  Yazıyı <strong>fare ile tutup sürükleyerek</strong> ızgara üzerinde dilediğiniz yere serbestçe konumlandırabilirsiniz.
                </span>
              </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-2 border-t border-app-border text-center">
              <div className="p-2.5 rounded-xl bg-app-cardSubtle border border-app-border">
                <div className="text-[10px] font-bold text-app-muted uppercase">Toplam Duvar</div>
                <div className="text-base font-black text-amber-400">{result.wallCount}</div>
              </div>
              <div className="p-2.5 rounded-xl bg-app-cardSubtle border border-app-border">
                <div className="text-[10px] font-bold text-app-muted uppercase">Kalan Duvar</div>
                <div className="text-base font-black text-blue-400">
                  {Math.max(0, maxWalls - result.wallCount)}
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-app-cardSubtle border border-app-border">
                <div className="text-[10px] font-bold text-app-muted uppercase">Harf Yüksekliği</div>
                <div
                  className={cn(
                    "text-base font-black",
                    result.isReadabilityLow ? "text-amber-400" : "text-emerald-400"
                  )}
                >
                  {result.capHeight} hücre
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
                <div className="text-base font-black text-cyan-400">{result.buildGuide.length} / 44</div>
              </div>
            </div>

            {/* Readability Low Warning Banner */}
            {result.isReadabilityLow && (
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs font-semibold text-amber-300 flex items-center gap-2">
                <AlertTriangle size={15} className="shrink-0 text-amber-400" />
                <span>
                  Bu boyutta harfler zor okunabilir (Harf yüksekliği {result.capHeight} hücre &lt; 7 eşiği).
                </span>
              </div>
            )}
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

      {/* Footer Supercell Disclaimer */}
      <div className="text-center text-xs text-app-muted pt-4 border-t border-app-border/40">
        Supercell ile bağlantılı değildir, Fan Content Policy kapsamındadır.
      </div>
    </div>
  );
}
