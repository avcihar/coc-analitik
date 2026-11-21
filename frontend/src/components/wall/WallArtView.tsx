"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  PenTool,
  Download,
  Camera,
  AlertTriangle,
  CheckCircle2,
  Sliders,
  Info,
  Copy,
  Check,
  Move,
  Crosshair,
  RotateCcw,
  Image as ImageIcon,
  ChevronDown,
  Plus,
  Minus,
  ListOrdered,
  Layers,
} from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import {
  COC_GRID_SIZE,
  DEFAULT_MAX_WALLS,
  MIN_BITMAP_SCALE,
  MAX_BITMAP_SCALE,
  SCALE_STEP,
  computeWallArt,
  exportPlanPng,
  resolveChar,
} from "@/lib/wallArtEngine";
import { getAllBitmapFonts, getBitmapFont, BitmapFont } from "@/lib/bitmapFonts";
import { GameButton } from "@/components/game";
import {
  ASSETS_CONFIG,
  WALL_LEVELS,
  getWallConfig,
  getSceneryConfig,
  getSceneryDisplayName,
  SceneryAssetConfig,
  WallAssetConfig,
  mapGridToScenery,
  mapSceneryToGrid,
} from "@/lib/assetsConfig";
import { useLanguage } from "@/lib/i18n";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Renders a crisp miniature bitmap canvas preview of the text for font cards.
 * - Dynamic height to match glyph height + padding (NEVER vertically cropped).
 * - Only renders the first line of multi-line text.
 * - Sharp pixelated rendering with devicePixelRatio.
 * - Largest integer scale that fits height & width, with smooth right fade if overflowing width.
 */
function BitmapFontPreview({
  font,
  text,
  convertTurkish = false,
  className,
}: {
  font: BitmapFont;
  text: string;
  convertTurkish?: boolean;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Use only the first line of text
    const sample = (text.split("\n")[0] || "").trim() || "COC";

    // Layout characters in a single line for card preview
    const glyphsToDraw: { glyph: number[][]; width: number }[] = [];
    for (const ch of sample) {
      const res = resolveChar(ch, font, convertTurkish);
      if (res.glyph && res.glyph.length > 0) {
        glyphsToDraw.push({ glyph: res.glyph, width: res.width });
      } else if (res.isSpace) {
        glyphsToDraw.push({ glyph: [], width: Math.max(2, Math.round(font.height * 0.25)) });
      }
    }

    if (glyphsToDraw.length === 0) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }

    const totalW = glyphsToDraw.reduce(
      (acc, g, idx) => acc + g.width + (idx > 0 ? 1 : 0),
      0
    );

    // Available width from container
    const contW = Math.max(80, container.clientWidth || 160);

    // Scale calculation: Largest integer scale that comfortably fits height and width
    let s = Math.max(1, Math.floor(34 / font.height));
    while (s > 1 && totalW * s > contW - 16) {
      s--;
    }

    // Exact height determined by font.height and scale, guaranteeing ZERO vertical clipping
    const displayH = font.height * s + 8;
    const displayW = contW;

    // DPR setup
    const dpr = typeof window !== "undefined" ? Math.min(3, window.devicePixelRatio || 1) : 1;
    canvas.width = Math.round(displayW * dpr);
    canvas.height = Math.round(displayH * dpr);
    canvas.style.width = `${displayW}px`;
    canvas.style.height = `${displayH}px`;

    ctx.scale(dpr, dpr);
    ctx.imageSmoothingEnabled = false;

    // Dark well background matching Meta's slot well
    ctx.fillStyle = "#1E110A";
    ctx.fillRect(0, 0, displayW, displayH);

    const scaledW = totalW * s;
    const startX = scaledW <= displayW - 16 ? Math.floor((displayW - scaledW) / 2) : 6;
    const startY = 4; // exact 4px top padding

    ctx.fillStyle = "#FFEB75"; // Gold font color
    let curX = startX;

    for (let i = 0; i < glyphsToDraw.length; i++) {
      if (i > 0) curX += 1 * s;
      const item = glyphsToDraw[i];

      if (item.glyph && item.glyph.length > 0) {
        for (let r = 0; r < item.glyph.length; r++) {
          for (let c = 0; c < item.glyph[r].length; c++) {
            if (item.glyph[r][c] === 1) {
              ctx.fillRect(curX + c * s, startY + r * s, s, s);
            }
          }
        }
      }
      curX += item.width * s;
    }

    // Right fade if text overflows width
    if (scaledW > displayW - 16) {
      const fadeW = 28;
      const fadeGrad = ctx.createLinearGradient(displayW - fadeW, 0, displayW, 0);
      fadeGrad.addColorStop(0, "rgba(30, 17, 10, 0)");
      fadeGrad.addColorStop(1, "rgba(30, 17, 10, 1)");
      ctx.fillStyle = fadeGrad;
      ctx.fillRect(displayW - fadeW, 0, fadeW, displayH);
    }
  }, [font, text, convertTurkish]);

  return (
    <div ref={containerRef} className={cn("w-full overflow-hidden flex items-center justify-center", className)}>
      <canvas
        ref={canvasRef}
        style={{ imageRendering: "pixelated" }}
        className="rounded border border-[var(--ui-pill-border)]"
      />
    </div>
  );
}

function useHoldAction(action: () => void, disabled?: boolean, initialDelay = 300, repeatInterval = 75) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const actionRef = useRef(action);
  const pointerHandledRef = useRef(false);
  actionRef.current = action;

  const stop = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);
    timeoutRef.current = null;
    intervalRef.current = null;
  }, []);

  const start = useCallback(
    (e: React.PointerEvent) => {
      if (disabled || (e.button !== 0 && e.pointerType === "mouse")) return;
      pointerHandledRef.current = true;
      actionRef.current();
      stop();
      timeoutRef.current = setTimeout(() => {
        intervalRef.current = setInterval(() => {
          actionRef.current();
        }, repeatInterval);
      }, initialDelay);
    },
    [disabled, initialDelay, repeatInterval, stop]
  );

  const handleClick = useCallback(() => {
    if (pointerHandledRef.current) {
      pointerHandledRef.current = false;
      return;
    }
    if (!disabled) {
      actionRef.current();
    }
  }, [disabled]);

  useEffect(() => {
    return stop;
  }, [stop]);

  return {
    onPointerDown: start,
    onPointerUp: stop,
    onPointerLeave: stop,
    onPointerCancel: stop,
    onClick: handleClick,
  };
}

export default function WallArtView() {
  const { locale, isTr, t, fmtNum, fmtTemplate } = useLanguage();
  const allFonts = useMemo(() => getAllBitmapFonts(), []);

  // Controls State
  const [text, setText] = useState<string>("COC");
  const [selectedFontId, setSelectedFontId] = useState<string>(
    allFonts.find((f) => f.id === "clash_bold")?.id || allFonts[0]?.id || "cross_stitch"
  );
  const [scale, setScale] = useState<number>(1);
  const [letterSpacing, setLetterSpacing] = useState<number>(2);
  const [rotation, setRotation] = useState<number>(-45); // Default -45° (in-game horizontal on screen)
  const [maxWalls, setMaxWalls] = useState<number>(DEFAULT_MAX_WALLS);
  const [wallInputText, setWallInputText] = useState<string>(String(DEFAULT_MAX_WALLS));
  const [convertTurkish, setConvertTurkish] = useState<boolean>(false);
  const [preserveThinLines, setPreserveThinLines] = useState<boolean>(false);
  const [autoFit, setAutoFit] = useState<boolean>(true);
  const [offsetX, setOffsetX] = useState<number>(0);
  const [offsetY, setOffsetY] = useState<number>(0);
  const [viewMode, setViewMode] = useState<"2d" | "3d">("3d");
  const [showDebugGrid, setShowDebugGrid] = useState<boolean>(false);
  const [show2dSceneryBg, setShow2dSceneryBg] = useState<boolean>(false);
  const [fontPickerOpen, setFontPickerOpen] = useState<boolean>(false);
  const [isWallPickerOpen, setIsWallPickerOpen] = useState<boolean>(false);
  const [isSceneryOpen, setIsSceneryOpen] = useState<boolean>(false);
  const [isOtherSettingsOpen, setIsOtherSettingsOpen] = useState<boolean>(false);
  const [isGuideOpen, setIsGuideOpen] = useState<boolean>(false);
  const [selectedWallLevel, setSelectedWallLevel] = useState<number>(20);

  // Viewport Zoom & Pan Engine State
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const [viewportSize, setViewportSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const [zoom, setZoom] = useState<number>(1.0);
  const [panX, setPanX] = useState<number>(0);
  const [panY, setPanY] = useState<number>(0);
  const [cursorMode, setCursorMode] = useState<"grab" | "move">("grab");
  const [isWallsSelected, setIsWallsSelected] = useState<boolean>(false);
  const [isExportingViewport, setIsExportingViewport] = useState<boolean>(false);

  const dragInfoRef = useRef<{
    type: "text" | "pan";
    startX: number;
    startY: number;
    initOffsetX: number;
    initOffsetY: number;
    initPanX: number;
    initPanY: number;
    startGridCol: number;
    startGridRow: number;
  } | null>(null);
  const activeTouchesRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchStartDistRef = useRef<number | null>(null);
  const pinchStartZoomRef = useRef<number>(1.0);

  // Scenery Selector State
  const availableSceneries = useMemo(() => {
    return ASSETS_CONFIG.sceneries.filter((s) => s.verified !== false);
  }, []);

  const [selectedSceneryId, setSelectedSceneryId] = useState<string>("winter");
  const [sceneryLoading, setSceneryLoading] = useState<boolean>(false);
  const [sceneryImg, setSceneryImg] = useState<HTMLImageElement | null>(null);
  const [wallImg, setWallImg] = useState<HTMLImageElement | null>(null);
  const [wallMiddleImg, setWallMiddleImg] = useState<HTMLImageElement | null>(null);

  // Restore selected scenery & wall level from localStorage or URL query on mount
  useEffect(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const queryScenery = urlParams.get("scenery");
      if (queryScenery && availableSceneries.some((s) => s.id === queryScenery)) {
        setSelectedSceneryId(queryScenery);
      }
      if (urlParams.get("open") === "all") {
        setFontPickerOpen(true);
        setIsWallPickerOpen(true);
        setIsSceneryOpen(true);
        setIsOtherSettingsOpen(true);
      }
      const saved = localStorage.getItem("wallart.scenery");
      if (saved && availableSceneries.some((s) => s.id === saved)) {
        setSelectedSceneryId(saved);
      }
      const savedWall = localStorage.getItem("wallart.wallLevel");
      if (savedWall) {
        const parsedLvl = parseInt(savedWall, 10);
        if (!isNaN(parsedLvl) && parsedLvl >= 1 && parsedLvl <= 20) {
          setSelectedWallLevel(parsedLvl);
        }
      }
    } catch {
      // LocalStorage access fallback
    }
  }, [availableSceneries]);

  // Debounce wall input text to maxWalls (1 - 2000, default 325)
  useEffect(() => {
    const handler = setTimeout(() => {
      const val = parseInt(wallInputText, 10);
      if (!isNaN(val)) {
        const clamped = Math.max(1, Math.min(2000, val));
        setMaxWalls(clamped);
      }
    }, 300);
    return () => clearTimeout(handler);
  }, [wallInputText]);

  const handleSelectScenery = useCallback((id: string) => {
    if (!availableSceneries.some((s) => s.id === id)) return;
    setSelectedSceneryId(id);
    try {
      localStorage.setItem("wallart.scenery", id);
    } catch {
      // LocalStorage access fallback
    }
  }, [availableSceneries]);

  const handleSelectWallLevel = useCallback((lvl: number) => {
    const clamped = Math.max(1, Math.min(20, Math.round(lvl)));
    setSelectedWallLevel(clamped);
    try {
      localStorage.setItem("wallart.wallLevel", String(clamped));
    } catch {
      // LocalStorage access fallback
    }
  }, []);

  const currentWallConfig: WallAssetConfig = useMemo(() => {
    return getWallConfig(selectedWallLevel);
  }, [selectedWallLevel]);

  const currentScenery: SceneryAssetConfig = useMemo(() => {
    return getSceneryConfig(selectedSceneryId);
  }, [selectedSceneryId]);

  const localizedSceneryName = useMemo(() => {
    return getSceneryDisplayName(currentScenery.id, currentScenery.name, locale);
  }, [currentScenery, locale]);

  // Load real scenery background dynamically when selected scenery changes
  useEffect(() => {
    setSceneryLoading(true);
    const s = new Image();
    s.src = currentScenery.src;
    s.onload = () => {
      setSceneryImg(s);
      setSceneryLoading(false);
    };
    s.onerror = () => {
      setSceneryLoading(false);
    };
  }, [currentScenery.src]);

  // Preload selected wall level pillar & middle textures dynamically
  useEffect(() => {
    let cancelled = false;
    const w = new Image();
    w.src = currentWallConfig.src;
    w.onload = () => {
      if (!cancelled) setWallImg(w);
    };

    if (currentWallConfig.middleSrc) {
      const m = new Image();
      m.src = currentWallConfig.middleSrc;
      m.onload = () => {
        if (!cancelled) setWallMiddleImg(m);
      };
      m.onerror = () => {
        if (!cancelled) setWallMiddleImg(null);
      };
    } else {
      setWallMiddleImg(null);
    }

    return () => {
      cancelled = true;
    };
  }, [currentWallConfig.src, currentWallConfig.middleSrc]);

  // Interaction State
  const [hoveredCell, setHoveredCell] = useState<{ r: number; c: number } | null>(null);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [copiedGuide, setCopiedGuide] = useState<boolean>(false);
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
        linesInfo: t.wall.noFontTitle,
        warnings: [t.wall.noFontDesc],
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
  }, [text, currentFont, scale, rotation, maxWalls, letterSpacing, convertTurkish, autoFit, preserveThinLines, offsetX, offsetY, t.wall.noFontTitle, t.wall.noFontDesc]);

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

    // Background (Warm Clash dark wood / espresso)
    if (show2dSceneryBg && sceneryImg && sceneryImg.complete) {
      ctx.drawImage(sceneryImg, 0, 0, size, size);
      ctx.fillStyle = "rgba(26, 18, 12, 0.78)";
      ctx.fillRect(0, 0, size, size);
    } else {
      ctx.fillStyle = "#1A120C";
      ctx.fillRect(0, 0, size, size);
    }

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
          // Warm hearth tile checkerboard
          ctx.fillStyle = (r + c) % 2 === 0 ? "rgba(38, 26, 18, 0.94)" : "rgba(29, 20, 14, 0.94)";
          ctx.fillRect(x, y, cellSize, cellSize);

          ctx.strokeStyle = "rgba(255, 224, 178, 0.06)";
          ctx.lineWidth = 0.5;
          ctx.strokeRect(x, y, cellSize, cellSize);
        }
      }
    }

    // Center Crosslines (between cell 22 and 23)
    const mid = 22 * cellSize;
    ctx.strokeStyle = "rgba(239, 68, 68, 0.45)";
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

    if (isWallsSelected) {
      ctx.save();
      ctx.strokeStyle = "#9CE04A";
      ctx.lineWidth = 2.5;
      ctx.lineCap = "round";
      ctx.beginPath();
      for (let r = 0; r < COC_GRID_SIZE; r++) {
        for (let c = 0; c < COC_GRID_SIZE; c++) {
          if (result.grid[r][c] !== 1) continue;
          const x = c * cellSize;
          const y = r * cellSize;
          if (r === 0 || result.grid[r - 1][c] !== 1) {
            ctx.moveTo(x, y);
            ctx.lineTo(x + cellSize, y);
          }
          if (r === COC_GRID_SIZE - 1 || result.grid[r + 1][c] !== 1) {
            ctx.moveTo(x, y + cellSize);
            ctx.lineTo(x + cellSize, y + cellSize);
          }
          if (c === 0 || result.grid[r][c - 1] !== 1) {
            ctx.moveTo(x, y);
            ctx.lineTo(x, y + cellSize);
          }
          if (c === COC_GRID_SIZE - 1 || result.grid[r][c + 1] !== 1) {
            ctx.moveTo(x + cellSize, y);
            ctx.lineTo(x + cellSize, y + cellSize);
          }
        }
      }
      ctx.stroke();
      ctx.restore();
    }
  }, [result, show2dSceneryBg, sceneryImg, isWallsSelected]);

  // ── Render 3D Isometric Canvas (Real Village Scenery + Wall 19 Textures) ─────
  useEffect(() => {
    if (viewMode !== "3d") return;
    const canvas = canvas3dRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Use natural image dimensions for 1:1 pixel precision
    const width = currentScenery.naturalWidth;
    const height = currentScenery.naturalHeight;
    canvas.width = width;
    canvas.height = height;

    const buildArea = currentScenery.buildArea;

    // 1. Draw Real In-Game Village Scenery
    if (sceneryImg && sceneryImg.complete) {
      ctx.drawImage(sceneryImg, 0, 0, width, height);
    } else {
      ctx.fillStyle = "#1A120C";
      ctx.fillRect(0, 0, width, height);
    }

    // 2. Debug Alignment Overlay (when toggled on)
    if (showDebugGrid) {
      // 44x44 grid lines
      ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
      ctx.lineWidth = 2;
      for (let c = 0; c <= COC_GRID_SIZE; c++) {
        const p0 = mapGridToScenery(c, 0, buildArea);
        const p1 = mapGridToScenery(c, COC_GRID_SIZE, buildArea);
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(p1.x, p1.y);
        ctx.stroke();
      }
      for (let r = 0; r <= COC_GRID_SIZE; r++) {
        const p0 = mapGridToScenery(0, r, buildArea);
        const p1 = mapGridToScenery(COC_GRID_SIZE, r, buildArea);
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(p1.x, p1.y);
        ctx.stroke();
      }

      // Red outer boundary frame
      ctx.strokeStyle = "#EF4444"; // Red 500
      ctx.lineWidth = 6;
      ctx.beginPath();
      const ptTop = mapGridToScenery(0, 0, buildArea);
      const ptRight = mapGridToScenery(COC_GRID_SIZE, 0, buildArea);
      const ptBottom = mapGridToScenery(COC_GRID_SIZE, COC_GRID_SIZE, buildArea);
      const ptLeft = mapGridToScenery(0, COC_GRID_SIZE, buildArea);
      ctx.moveTo(ptTop.x, ptTop.y);
      ctx.lineTo(ptRight.x, ptRight.y);
      ctx.lineTo(ptBottom.x, ptBottom.y);
      ctx.lineTo(ptLeft.x, ptLeft.y);
      ctx.closePath();
      ctx.stroke();

      // Highlight the 4 corner cells in amber: (0,0), (43,0), (43,43), (0,43)
      const drawCorner = (c: number, r: number, label: string) => {
        const p0 = mapGridToScenery(c, r, buildArea);
        const p1 = mapGridToScenery(c + 1, r, buildArea);
        const p2 = mapGridToScenery(c + 1, r + 1, buildArea);
        const p3 = mapGridToScenery(c, r + 1, buildArea);

        ctx.fillStyle = "rgba(245, 158, 11, 0.45)"; // amber fill
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.lineTo(p3.x, p3.y);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = "#F59E0B";
        ctx.lineWidth = 3;
        ctx.stroke();

        const center = mapGridToScenery(c + 0.5, r + 0.5, buildArea);
        ctx.fillStyle = "#FFFFFF";
        ctx.font = "bold 26px monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(label, center.x, center.y);
      };

      drawCorner(0, 0, "(0,0)");
      drawCorner(43, 0, "(43,0)");
      drawCorner(43, 43, "(43,43)");
      drawCorner(0, 43, "(0,43)");
    }

    // 3. Draw Connected Isometric Walls (Strictly 1 wall unit per 1 grid square + clean masonry joints)
    const filledCells: { r: number; c: number }[] = [];
    for (let r = 0; r < COC_GRID_SIZE; r++) {
      for (let c = 0; c < COC_GRID_SIZE; c++) {
        if (result.grid[r][c] === 1) {
          filledCells.push({ r, c });
        }
      }
    }

    // Compute cell width to scale wall sprite accurately to 1x1 tile across all 20 levels
    const pL = mapGridToScenery(0, 1, buildArea);
    const pR = mapGridToScenery(1, 0, buildArea);
    const cellW = Math.hypot(pR.x - pL.x, pR.y - pL.y);

    // Pass 1: Soft 1x1 isometric diamond ground shadow strictly per occupied tile
    if (filledCells.length > 0) {
      ctx.save();
      ctx.fillStyle = "rgba(15, 10, 6, 0.22)";
      for (const { r, c } of filledCells) {
        const sTop = mapGridToScenery(c + 0.08, r + 0.08, buildArea);
        const sRight = mapGridToScenery(c + 0.92, r + 0.08, buildArea);
        const sBot = mapGridToScenery(c + 0.92, r + 0.92, buildArea);
        const sLeft = mapGridToScenery(c + 0.08, r + 0.92, buildArea);
        ctx.beginPath();
        ctx.moveTo(sTop.x, sTop.y);
        ctx.lineTo(sRight.x, sRight.y);
        ctx.lineTo(sBot.x, sBot.y);
        ctx.lineTo(sLeft.x, sLeft.y);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }

    // Active green selection glow & exterior boundary around wall formation
    type PerimeterEdge = {
      p0: { x: number; y: number };
      p1: { x: number; y: number };
      frontP0?: { x: number; y: number };
      frontP1?: { x: number; y: number };
      isFront: boolean;
      edgeDir: "NE" | "SE" | "SW" | "NW";
    };
    const perimeterEdges: PerimeterEdge[] = [];
    if (isWallsSelected && filledCells.length > 0) {
      for (const { r, c } of filledCells) {
        const ptTL = mapGridToScenery(c, r, buildArea);
        const ptTR = mapGridToScenery(c + 1, r, buildArea);
        const ptBR = mapGridToScenery(c + 1, r + 1, buildArea);
        const ptBL = mapGridToScenery(c, r + 1, buildArea);
        if (r === 0 || result.grid[r - 1][c] !== 1) {
          perimeterEdges.push({ p0: ptTL, p1: ptTR, isFront: false, edgeDir: "NE" });
        }
        if (c === COC_GRID_SIZE - 1 || result.grid[r][c + 1] !== 1) {
          perimeterEdges.push({
            p0: ptTR,
            p1: ptBR,
            frontP0: mapGridToScenery(c + 1.06, r, buildArea),
            frontP1: mapGridToScenery(c + 1.06, r + 1, buildArea),
            isFront: true,
            edgeDir: "SE",
          });
        }
        if (r === COC_GRID_SIZE - 1 || result.grid[r + 1][c] !== 1) {
          perimeterEdges.push({
            p0: ptBR,
            p1: ptBL,
            frontP0: mapGridToScenery(c + 1, r + 1.06, buildArea),
            frontP1: mapGridToScenery(c, r + 1.06, buildArea),
            isFront: true,
            edgeDir: "SW",
          });
        }
        if (c === 0 || result.grid[r][c - 1] !== 1) {
          perimeterEdges.push({ p0: ptBL, p1: ptTL, isFront: false, edgeDir: "NW" });
        }
      }

      ctx.save();
      // Step 1: Slightly expanded dark-forest diamonds form seamless outer casing around corners
      ctx.fillStyle = "#0E3B16";
      for (const { r, c } of filledCells) {
        const gTop = mapGridToScenery(c - 0.18, r - 0.18, buildArea);
        const gRight = mapGridToScenery(c + 1.18, r - 0.18, buildArea);
        const gBot = mapGridToScenery(c + 1.18, r + 1.18, buildArea);
        const gLeft = mapGridToScenery(c - 0.18, r + 1.18, buildArea);
        ctx.beginPath();
        ctx.moveTo(gTop.x, gTop.y);
        ctx.lineTo(gRight.x, gRight.y);
        ctx.lineTo(gBot.x, gBot.y);
        ctx.lineTo(gLeft.x, gLeft.y);
        ctx.closePath();
        ctx.fill();
      }

      // Step 2: Expanded vivid-emerald diamonds create bright continuous green border
      ctx.fillStyle = "#38F260";
      for (const { r, c } of filledCells) {
        const gTop = mapGridToScenery(c - 0.10, r - 0.10, buildArea);
        const gRight = mapGridToScenery(c + 1.10, r - 0.10, buildArea);
        const gBot = mapGridToScenery(c + 1.10, r + 1.10, buildArea);
        const gLeft = mapGridToScenery(c - 0.10, r + 1.10, buildArea);
        ctx.beginPath();
        ctx.moveTo(gTop.x, gTop.y);
        ctx.lineTo(gRight.x, gRight.y);
        ctx.lineTo(gBot.x, gBot.y);
        ctx.lineTo(gLeft.x, gLeft.y);
        ctx.closePath();
        ctx.fill();
      }

      // Step 3: Multi-pass perimeter strokes scaled for 3705px canvas visibility
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      for (const edge of perimeterEdges) {
        ctx.moveTo(edge.p0.x, edge.p0.y);
        ctx.lineTo(edge.p1.x, edge.p1.y);
      }
      ctx.strokeStyle = "rgba(56, 242, 96, 0.45)";
      ctx.lineWidth = Math.max(20, cellW * 0.44);
      ctx.stroke();
      ctx.strokeStyle = "#0E3B16";
      ctx.lineWidth = Math.max(15, cellW * 0.30);
      ctx.stroke();
      ctx.strokeStyle = "#38F260";
      ctx.lineWidth = Math.max(9.5, cellW * 0.18);
      ctx.stroke();
      ctx.strokeStyle = "#D9FFE1";
      ctx.lineWidth = Math.max(3, cellW * 0.06);
      ctx.stroke();
      ctx.restore();
    }

    const canUseMiddleSprite = Boolean(
      wallMiddleImg && wallMiddleImg.complete && wallMiddleImg.naturalWidth > 0
    );

    const getCellWallKind = (r: number, c: number): "pillar" | "midNESW" | "midNWSE" => {
      if (!canUseMiddleSprite) return "pillar";
      const hasNW = c > 0 && result.grid[r][c - 1] === 1;
      const hasSE = c < COC_GRID_SIZE - 1 && result.grid[r][c + 1] === 1;
      const hasNE = r > 0 && result.grid[r - 1][c] === 1;
      const hasSW = r < COC_GRID_SIZE - 1 && result.grid[r + 1][c] === 1;
      if (hasNE && hasSW && !hasNW && !hasSE) return "midNESW";
      if (hasNW && hasSE && !hasNE && !hasSW) return "midNWSE";
      return "pillar";
    };

    // Pass 2: Build strict back-to-front render queue:
    //   - Exactly ONE wall sprite per occupied tile (r, c)
    //   - One thin masonry beam strictly bridging the tile edge (never an extra wall post)
    type RenderItem =
      | { kind: "wall"; r: number; c: number; wallKind: "pillar" | "midNESW" | "midNWSE"; depth: number }
      | { kind: "bridgeSE"; r: number; c: number; depth: number }
      | { kind: "bridgeSW"; r: number; c: number; depth: number };

    const items: RenderItem[] = [];
    for (const { r, c } of filledCells) {
      const wallKind = getCellWallKind(r, c);
      const d0 = c + 0.5 + (r + 0.5);
      items.push({ kind: "wall", r, c, wallKind, depth: d0 });

      const hasSE = c < COC_GRID_SIZE - 1 && result.grid[r][c + 1] === 1;
      if (hasSE) {
        const rightKind = getCellWallKind(r, c + 1);
        if (!(wallKind === "midNWSE" && rightKind === "midNWSE")) {
          items.push({ kind: "bridgeSE", r, c, depth: d0 + 0.5 });
        }
      }

      const hasSW = r < COC_GRID_SIZE - 1 && result.grid[r + 1][c] === 1;
      if (hasSW) {
        const downKind = getCellWallKind(r + 1, c);
        if (!(wallKind === "midNESW" && downKind === "midNESW")) {
          items.push({ kind: "bridgeSW", r, c, depth: d0 + 0.5 });
        }
      }
    }

    items.sort((a, b) => a.depth - b.depth || a.r - b.r);

    const connColors = currentWallConfig.connectorColors || {
      top: "#615F5B",
      left: "#333227",
      right: "#5C5344",
      stroke: "#151510",
    };

    if (wallImg && wallImg.complete && wallImg.naturalWidth > 0) {
      const naturalW = wallImg.naturalWidth;
      const naturalH = wallImg.naturalHeight;
      // Fit strictly inside 1x1 isometric tile width
      const apronComp = selectedWallLevel === 12 || selectedWallLevel === 13 ? 1.06 : 0.92;
      const pillarW = cellW * apronComp;
      const pillarH = Math.min(cellW * 1.38, pillarW * (naturalH / naturalW));

      const midNaturalW = wallMiddleImg?.naturalWidth || naturalW;
      const midNaturalH = wallMiddleImg?.naturalHeight || naturalH;
      const midApronComp = selectedWallLevel === 12 || selectedWallLevel === 13 ? 1.12 : 1.02;
      const midW = cellW * midApronComp;
      const midH = Math.min(cellW * 1.40, midW * (midNaturalH / midNaturalW));

      const beamHeight = Math.max(8, pillarH * 0.44);
      const halfThick = 0.18;

      const drawBridgeQuad = (
        g1: { x: number; y: number },
        g2: { x: number; y: number },
        g3: { x: number; y: number },
        g4: { x: number; y: number },
        dir: "SE" | "SW"
      ) => {
        const t1 = { x: g1.x, y: g1.y - beamHeight };
        const t2 = { x: g2.x, y: g2.y - beamHeight };
        const t3 = { x: g3.x, y: g3.y - beamHeight };
        const t4 = { x: g4.x, y: g4.y - beamHeight };

        ctx.save();
        ctx.lineWidth = Math.max(1.2, cellW * 0.025);
        ctx.lineJoin = "round";
        ctx.strokeStyle = connColors.stroke;

        // Visible isometric front wall face
        ctx.beginPath();
        if (dir === "SE") {
          ctx.moveTo(g4.x, g4.y);
          ctx.lineTo(g3.x, g3.y);
          ctx.lineTo(t3.x, t3.y);
          ctx.lineTo(t4.x, t4.y);
        } else {
          ctx.moveTo(g2.x, g2.y);
          ctx.lineTo(g3.x, g3.y);
          ctx.lineTo(t3.x, t3.y);
          ctx.lineTo(t2.x, t2.y);
        }
        ctx.closePath();
        ctx.fillStyle = dir === "SE" ? connColors.left : connColors.right;
        ctx.fill();
        ctx.stroke();

        // Top crest of connector beam
        ctx.beginPath();
        ctx.moveTo(t1.x, t1.y);
        ctx.lineTo(t2.x, t2.y);
        ctx.lineTo(t3.x, t3.y);
        ctx.lineTo(t4.x, t4.y);
        ctx.closePath();
        ctx.fillStyle = connColors.top;
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      };

      for (const item of items) {
        if (item.kind === "wall") {
          const pt = mapGridToScenery(item.c + 0.5, item.r + 0.5, buildArea);
          if (item.wallKind === "midNESW" && wallMiddleImg) {
            ctx.drawImage(
              wallMiddleImg,
              pt.x - midW / 2.0,
              pt.y - midH * 0.78,
              midW,
              midH
            );
          } else if (item.wallKind === "midNWSE" && wallMiddleImg) {
            ctx.save();
            ctx.translate(pt.x, pt.y);
            ctx.scale(-1, 1);
            ctx.drawImage(
              wallMiddleImg,
              -midW / 2.0,
              -midH * 0.78,
              midW,
              midH
            );
            ctx.restore();
          } else {
            ctx.drawImage(
              wallImg,
              pt.x - pillarW / 2.0,
              pt.y - pillarH * 0.80,
              pillarW,
              pillarH
            );
          }
        } else if (item.kind === "bridgeSE") {
          const g1 = mapGridToScenery(item.c + 0.64, item.r + 0.5 - halfThick, buildArea);
          const g2 = mapGridToScenery(item.c + 1.36, item.r + 0.5 - halfThick, buildArea);
          const g3 = mapGridToScenery(item.c + 1.36, item.r + 0.5 + halfThick, buildArea);
          const g4 = mapGridToScenery(item.c + 0.64, item.r + 0.5 + halfThick, buildArea);
          drawBridgeQuad(g1, g2, g3, g4, "SE");
        } else if (item.kind === "bridgeSW") {
          const g1 = mapGridToScenery(item.c + 0.5 - halfThick, item.r + 0.64, buildArea);
          const g2 = mapGridToScenery(item.c + 0.5 + halfThick, item.r + 0.64, buildArea);
          const g3 = mapGridToScenery(item.c + 0.5 + halfThick, item.r + 1.36, buildArea);
          const g4 = mapGridToScenery(item.c + 0.5 - halfThick, item.r + 1.36, buildArea);
          drawBridgeQuad(g1, g2, g3, g4, "SW");
        }
      }
    } else {
      // Fallback isometric diamond wall renderer while sprite is loading
      for (const { r, c } of filledCells) {
        const center = mapGridToScenery(c + 0.5, r + 0.5, buildArea);
        ctx.fillStyle = "#F59E0B";
        ctx.fillRect(center.x - 12, center.y - 12, 24, 24);
      }
    }

    if (isWallsSelected && perimeterEdges.length > 0) {
      const frontEdges = perimeterEdges.filter((edge) => edge.isFront);
      if (frontEdges.length > 0) {
        ctx.save();
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.beginPath();
        for (const edge of frontEdges) {
          const p0 = edge.frontP0 || edge.p0;
          const p1 = edge.frontP1 || edge.p1;
          ctx.moveTo(p0.x, p0.y);
          ctx.lineTo(p1.x, p1.y);
        }
        ctx.strokeStyle = "#0E3B16";
        ctx.lineWidth = Math.max(13, cellW * 0.26);
        ctx.stroke();
        ctx.strokeStyle = "#38F260";
        ctx.lineWidth = Math.max(8, cellW * 0.16);
        ctx.stroke();
        ctx.strokeStyle = "#DCFFE3";
        ctx.lineWidth = Math.max(2.5, cellW * 0.05);
        ctx.stroke();
        ctx.restore();
      }
    }
  }, [viewMode, result, sceneryImg, wallImg, wallMiddleImg, selectedWallLevel, currentWallConfig, showDebugGrid, currentScenery, isWallsSelected]);

  // ── Viewport Geometry & Pan/Zoom Handlers ────────────────────────────────
  const clampPan = useCallback(
    (rawX: number, rawY: number, z: number, vw?: number, vh?: number) => {
      const width = vw ?? viewportSize.width;
      const height = vh ?? viewportSize.height;
      if (width <= 0 || height <= 0) return { panX: 0, panY: 0, scale: 1 };

      const natW = currentScenery.naturalWidth;
      const natH = currentScenery.naturalHeight;
      const baseScale = Math.max(width / natW, height / natH);
      const s = baseScale * z;
      const scaledW = natW * s;
      const scaledH = natH * s;

      const minX = width - scaledW;
      const minY = height - scaledH;
      const clampedX = Math.min(0, Math.max(minX, rawX));
      const clampedY = Math.min(0, Math.max(minY, rawY));

      return { panX: clampedX, panY: clampedY, scale: s };
    },
    [viewportSize, currentScenery]
  );

  const centerViewOnDiamond = useCallback(
    (z: number = 1.0, vw?: number, vh?: number) => {
      const width = vw ?? viewportSize.width;
      const height = vh ?? viewportSize.height;
      if (width <= 0 || height <= 0) return;

      const natW = currentScenery.naturalWidth;
      const natH = currentScenery.naturalHeight;
      const baseScale = Math.max(width / natW, height / natH);
      const s = baseScale * z;

      const b = currentScenery.buildArea;
      const centerX = (b.left.x + b.right.x) / 2;
      const centerY = (b.top.y + b.bottom.y) / 2;

      const targetX = width / 2 - centerX * s;
      const targetY = height / 2 - centerY * s;

      const { panX: cx, panY: cy } = clampPan(targetX, targetY, z, width, height);
      setZoom(z);
      setPanX(cx);
      setPanY(cy);
    },
    [viewportSize, currentScenery, clampPan]
  );

  // ResizeObserver for Viewport Container
  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          setViewportSize({ width, height });
        }
      }
    });
    ro.observe(vp);
    return () => ro.disconnect();
  }, []);

  // Prevent page scroll when mouse wheel scrolls over scene viewport
  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    const preventPageScroll = (e: WheelEvent) => {
      e.preventDefault();
    };
    vp.addEventListener("wheel", preventPageScroll, { passive: false });
    return () => vp.removeEventListener("wheel", preventPageScroll);
  }, []);

  // When scenery changes, smoothly center on village diamond
  useEffect(() => {
    if (viewportSize.width > 0 && viewportSize.height > 0) {
      centerViewOnDiamond(1.0);
    }
  }, [selectedSceneryId, viewportSize.width, viewportSize.height, centerViewOnDiamond]);

  // Clear green wall selection outline when clicking anywhere outside the viewport
  useEffect(() => {
    if (!isWallsSelected) return;
    const handleOutsidePointerDown = (e: PointerEvent) => {
      if (viewportRef.current && !viewportRef.current.contains(e.target as Node)) {
        setIsWallsSelected(false);
      }
    };
    document.addEventListener("pointerdown", handleOutsidePointerDown);
    return () => document.removeEventListener("pointerdown", handleOutsidePointerDown);
  }, [isWallsSelected]);

  // 4 Corner Nudge Actions
  // NW: Col - 1 (offsetX - 1)
  const canNudgeNW = result.wallCount > 0 && offsetX > -20 && result.minCol > 0;
  const nudgeNW = useCallback(() => {
    setIsWallsSelected(true);
    setOffsetX((prev) => Math.max(-20, prev - 1));
  }, []);
  const nwHold = useHoldAction(nudgeNW, !canNudgeNW);

  // SE: Col + 1 (offsetX + 1)
  const canNudgeSE = result.wallCount > 0 && offsetX < 20 && result.maxCol < COC_GRID_SIZE - 1;
  const nudgeSE = useCallback(() => {
    setIsWallsSelected(true);
    setOffsetX((prev) => Math.min(20, prev + 1));
  }, []);
  const seHold = useHoldAction(nudgeSE, !canNudgeSE);

  // NE: Row - 1 (offsetY - 1)
  const canNudgeNE = result.wallCount > 0 && offsetY > -20 && result.minRow > 0;
  const nudgeNE = useCallback(() => {
    setIsWallsSelected(true);
    setOffsetY((prev) => Math.max(-20, prev - 1));
  }, []);
  const neHold = useHoldAction(nudgeNE, !canNudgeNE);

  // SW: Row + 1 (offsetY + 1)
  const canNudgeSW = result.wallCount > 0 && offsetY < 20 && result.maxRow < COC_GRID_SIZE - 1;
  const nudgeSW = useCallback(() => {
    setIsWallsSelected(true);
    setOffsetY((prev) => Math.min(20, prev + 1));
  }, []);
  const swHold = useHoldAction(nudgeSW, !canNudgeSW);

  // Check whether rotating by ±15° keeps text cleanly inside the 44x44 grid
  const alreadyOffsetClipped = useMemo(
    () => (offsetX !== 0 || offsetY !== 0) && result.warnings.some((w) => w.includes("kaydırma")),
    [offsetX, offsetY, result.warnings]
  );

  const checkCanRotate = useCallback(
    (delta: number): boolean => {
      if (!currentFont || result.wallCount === 0) return false;
      let next = rotation + delta;
      if (next < -180) next += 360;
      if (next > 180) next -= 360;
      const preview = computeWallArt(
        text,
        currentFont,
        scale,
        next,
        maxWalls,
        letterSpacing,
        convertTurkish,
        autoFit,
        preserveThinLines,
        offsetX,
        offsetY
      );
      if (!preview.fitsInGrid || preview.wallCount === 0) return false;
      const wouldClipNewWalls =
        !alreadyOffsetClipped &&
        (offsetX !== 0 || offsetY !== 0) &&
        preview.warnings.some((w) => w.includes("kaydırma"));
      return !wouldClipNewWalls;
    },
    [
      currentFont,
      result.wallCount,
      rotation,
      text,
      scale,
      maxWalls,
      letterSpacing,
      convertTurkish,
      autoFit,
      preserveThinLines,
      offsetX,
      offsetY,
      alreadyOffsetClipped,
    ]
  );

  const canRotateCCW = useMemo(() => checkCanRotate(-15), [checkCanRotate]);
  const canRotateCW = useMemo(() => checkCanRotate(15), [checkCanRotate]);

  // Rotation Actions
  const rotateCCW = useCallback(() => {
    if (!canRotateCCW) return;
    setIsWallsSelected(true);
    setRotation((prev) => {
      let next = prev - 15;
      if (next < -180) next += 360;
      return next;
    });
  }, [canRotateCCW]);
  const ccwHold = useHoldAction(rotateCCW, !canRotateCCW);

  const rotateCW = useCallback(() => {
    if (!canRotateCW) return;
    setIsWallsSelected(true);
    setRotation((prev) => {
      let next = prev + 15;
      if (next > 180) next -= 360;
      return next;
    });
  }, [canRotateCW]);
  const cwHold = useHoldAction(rotateCW, !canRotateCW);

  const resetRotation = useCallback(() => {
    setRotation(-45);
  }, []);

  // Zoom by Wheel (Centered on cursor)
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const vp = viewportRef.current;
    if (!vp) return;
    const rect = vp.getBoundingClientRect();
    const cursorX = e.clientX - rect.left;
    const cursorY = e.clientY - rect.top;

    const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
    const newZoom = Math.min(4.0, Math.max(1.0, zoom * factor));
    if (Math.abs(newZoom - zoom) < 0.001) return;

    const natW = currentScenery.naturalWidth;
    const natH = currentScenery.naturalHeight;
    const baseScale = Math.max(rect.width / natW, rect.height / natH);
    const oldScale = baseScale * zoom;
    const newScale = baseScale * newZoom;
    const ratio = newScale / oldScale;

    const rawX = cursorX - (cursorX - panX) * ratio;
    const rawY = cursorY - (cursorY - panY) * ratio;

    const { panX: cx, panY: cy } = clampPan(rawX, rawY, newZoom, rect.width, rect.height);
    setZoom(newZoom);
    setPanX(cx);
    setPanY(cy);
  };

  const handleZoomStep = (multiplier: number) => {
    const vp = viewportRef.current;
    if (!vp) return;
    const rect = vp.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const newZoom = Math.min(4.0, Math.max(1.0, zoom * multiplier));
    if (Math.abs(newZoom - zoom) < 0.001) return;

    const natW = currentScenery.naturalWidth;
    const natH = currentScenery.naturalHeight;
    const baseScale = Math.max(rect.width / natW, rect.height / natH);
    const oldScale = baseScale * zoom;
    const newScale = baseScale * newZoom;
    const ratio = newScale / oldScale;

    const rawX = centerX - (centerX - panX) * ratio;
    const rawY = centerY - (centerY - panY) * ratio;

    const { panX: cx, panY: cy } = clampPan(rawX, rawY, newZoom, rect.width, rect.height);
    setZoom(newZoom);
    setPanX(cx);
    setPanY(cy);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const panStep = 35;
    if (e.key === "ArrowLeft") {
      setPanX((prev) => clampPan(prev + panStep, panY, zoom).panX);
    } else if (e.key === "ArrowRight") {
      setPanX((prev) => clampPan(prev - panStep, panY, zoom).panX);
    } else if (e.key === "ArrowUp") {
      setPanY((prev) => clampPan(panX, prev + panStep, zoom).panY);
    } else if (e.key === "ArrowDown") {
      setPanY((prev) => clampPan(panX, prev - panStep, zoom).panY);
    }
  };

  // Viewport Pointer Handlers (Distinguishes dragging text vs panning scenery)
  const handleViewportPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    if (viewMode !== "3d") {
      setIsWallsSelected(false);
      return;
    }
    const vp = viewportRef.current;
    if (!vp) return;

    try {
      vp.setPointerCapture(e.pointerId);
    } catch {
      // Ignore
    }

    activeTouchesRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (activeTouchesRef.current.size === 2) {
      const touches = Array.from(activeTouchesRef.current.values());
      pinchStartDistRef.current = Math.hypot(touches[0].x - touches[1].x, touches[0].y - touches[1].y);
      pinchStartZoomRef.current = zoom;
      dragInfoRef.current = null;
      return;
    }

    const rect = vp.getBoundingClientRect();
    const natW = currentScenery.naturalWidth;
    const natH = currentScenery.naturalHeight;
    const baseScale = Math.max(rect.width / natW, rect.height / natH);
    const s = baseScale * zoom;

    const vx = e.clientX - rect.left;
    const vy = e.clientY - rect.top;
    const scX = (vx - panX) / s;
    const scY = (vy - panY) / s;

    const gridPt = mapSceneryToGrid(scX, scY, currentScenery.buildArea);
    const r = Math.floor(gridPt.row);
    const c = Math.floor(gridPt.col);

    let clickedOnWall = false;
    if (r >= 0 && r < COC_GRID_SIZE && c >= 0 && c < COC_GRID_SIZE) {
      if (result.grid[r][c] === 1) {
        clickedOnWall = true;
      } else {
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            const nr = r + dr;
            const nc = c + dc;
            if (nr >= 0 && nr < COC_GRID_SIZE && nc >= 0 && nc < COC_GRID_SIZE && result.grid[nr][nc] === 1) {
              clickedOnWall = true;
              break;
            }
          }
          if (clickedOnWall) break;
        }
      }
    }

    setIsWallsSelected(clickedOnWall);

    dragInfoRef.current = {
      type: clickedOnWall ? "text" : "pan",
      startX: e.clientX,
      startY: e.clientY,
      initOffsetX: offsetX,
      initOffsetY: offsetY,
      initPanX: panX,
      initPanY: panY,
      startGridCol: gridPt.col,
      startGridRow: gridPt.row,
    };
    setIsDragging(true);
  };

  const handleViewportPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activeTouchesRef.current.has(e.pointerId)) {
      activeTouchesRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    }

    // Pinch zoom handling for multi-touch
    if (activeTouchesRef.current.size === 2 && pinchStartDistRef.current && viewportRef.current) {
      const touches = Array.from(activeTouchesRef.current.values());
      const curDist = Math.hypot(touches[0].x - touches[1].x, touches[0].y - touches[1].y);
      const scaleFactor = curDist / (pinchStartDistRef.current || 1);
      const targetZoom = Math.min(4.0, Math.max(1.0, pinchStartZoomRef.current * scaleFactor));
      const rect = viewportRef.current.getBoundingClientRect();
      const midX = (touches[0].x + touches[1].x) / 2 - rect.left;
      const midY = (touches[0].y + touches[1].y) / 2 - rect.top;

      const natW = currentScenery.naturalWidth;
      const natH = currentScenery.naturalHeight;
      const baseScale = Math.max(rect.width / natW, rect.height / natH);
      const oldScale = baseScale * zoom;
      const newScale = baseScale * targetZoom;
      const ratio = newScale / oldScale;

      const rawX = midX - (midX - panX) * ratio;
      const rawY = midY - (midY - panY) * ratio;

      const { panX: cx, panY: cy } = clampPan(rawX, rawY, targetZoom, rect.width, rect.height);
      setZoom(targetZoom);
      setPanX(cx);
      setPanY(cy);
      return;
    }

    const drag = dragInfoRef.current;
    const vp = viewportRef.current;
    if (!vp) return;
    const rect = vp.getBoundingClientRect();
    const natW = currentScenery.naturalWidth;
    const natH = currentScenery.naturalHeight;
    const baseScale = Math.max(rect.width / natW, rect.height / natH);
    const s = baseScale * zoom;

    if (drag) {
      if (drag.type === "pan") {
        const dx = e.clientX - drag.startX;
        const dy = e.clientY - drag.startY;
        const { panX: cx, panY: cy } = clampPan(drag.initPanX + dx, drag.initPanY + dy, zoom, rect.width, rect.height);
        setPanX(cx);
        setPanY(cy);
      } else if (drag.type === "text") {
        const vx = e.clientX - rect.left;
        const vy = e.clientY - rect.top;
        const scX = (vx - panX) / s;
        const scY = (vy - panY) / s;
        const currentGrid = mapSceneryToGrid(scX, scY, currentScenery.buildArea);
        const deltaC = Math.round(currentGrid.col - drag.startGridCol);
        const deltaR = Math.round(currentGrid.row - drag.startGridRow);

        const newX = Math.max(-20, Math.min(20, drag.initOffsetX + deltaC));
        const newY = Math.max(-20, Math.min(20, drag.initOffsetY + deltaR));
        if (newX !== offsetX) setOffsetX(newX);
        if (newY !== offsetY) setOffsetY(newY);
      }
      return;
    }

    // Hover inspector when not dragging
    const vx = e.clientX - rect.left;
    const vy = e.clientY - rect.top;
    const scX = (vx - panX) / s;
    const scY = (vy - panY) / s;
    const gridPt = mapSceneryToGrid(scX, scY, currentScenery.buildArea);
    const r = Math.floor(gridPt.row);
    const c = Math.floor(gridPt.col);

    if (r >= 0 && r < COC_GRID_SIZE && c >= 0 && c < COC_GRID_SIZE) {
      setHoveredCell({ r, c });
      if (result.grid[r][c] === 1) {
        setCursorMode("move");
      } else {
        setCursorMode("grab");
      }
    } else {
      setHoveredCell(null);
      setCursorMode("grab");
    }
  };

  const handleViewportPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    activeTouchesRef.current.delete(e.pointerId);
    if (activeTouchesRef.current.size < 2) {
      pinchStartDistRef.current = null;
    }
    if (dragInfoRef.current) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // Ignore
      }
      dragInfoRef.current = null;
      setIsDragging(false);
    }
  };

  // Download Viewport Preview PNG at 2x resolution
  const handleExportViewport2x = useCallback(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    const rect = vp.getBoundingClientRect();
    const vw = rect.width;
    const vh = rect.height;
    if (vw <= 0 || vh <= 0) return;

    setIsExportingViewport(true);
    try {
      const exportCanvas = document.createElement("canvas");
      exportCanvas.width = Math.round(vw * 2);
      exportCanvas.height = Math.round(vh * 2);
      const ctx = exportCanvas.getContext("2d");
      if (!ctx) return;

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

      if (viewMode === "3d" && canvas3dRef.current) {
        const canvas = canvas3dRef.current;
        const natW = currentScenery.naturalWidth;
        const natH = currentScenery.naturalHeight;
        const baseScale = Math.max(vw / natW, vh / natH);
        const s = baseScale * zoom;

        const srcX = -panX / s;
        const srcY = -panY / s;
        const srcW = vw / s;
        const srcH = vh / s;

        ctx.drawImage(
          canvas,
          srcX, srcY, srcW, srcH,
          0, 0, exportCanvas.width, exportCanvas.height
        );
      } else if (canvas2dRef.current) {
        const canvas = canvas2dRef.current;
        ctx.fillStyle = "#1A120C";
        ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
        const pad = Math.round(exportCanvas.height * 0.05);
        const size = exportCanvas.height - pad * 2;
        const startX = Math.round((exportCanvas.width - size) / 2);
        ctx.drawImage(canvas, 0, 0, canvas.width, canvas.height, startX, pad, size, size);
      }

      // Localized preview caption pill at bottom-left
      const caption = isTr
        ? `CoC Analitik • "${text || "-"}" • ${result.wallCount}/${maxWalls} Duvar (Sv.${selectedWallLevel}) • ${localizedSceneryName}`
        : `CoC Analytics • "${text || "-"}" • ${result.wallCount}/${maxWalls} Walls (Lv.${selectedWallLevel}) • ${localizedSceneryName}`;
      ctx.font = "bold 20px -apple-system, sans-serif";
      const metrics = ctx.measureText(caption);
      const pillPadX = 16;
      const pillH = 34;
      const pillW = Math.min(exportCanvas.width - 32, metrics.width + pillPadX * 2);
      const pillX = 16;
      const pillY = exportCanvas.height - pillH - 16;

      ctx.fillStyle = "rgba(26, 18, 12, 0.85)";
      ctx.fillRect(pillX, pillY, pillW, pillH);
      ctx.strokeStyle = "rgba(245, 158, 11, 0.55)";
      ctx.lineWidth = 2;
      ctx.strokeRect(pillX, pillY, pillW, pillH);
      ctx.fillStyle = "#FFEB75";
      ctx.textBaseline = "middle";
      ctx.textAlign = "left";
      ctx.fillText(caption, pillX + pillPadX, pillY + pillH / 2, pillW - pillPadX * 2);

      const dataUrl = exportCanvas.toDataURL("image/png");
      const link = document.createElement("a");
      const safeText = text.trim() ? text.toLowerCase().replace(/[^a-z0-9]/g, "-") : isTr ? "koy" : "village";
      link.download = isTr ? `coc-duvar-onizleme-${safeText}.png` : `coc-wall-preview-${safeText}.png`;
      link.href = dataUrl;
      link.click();
    } finally {
      setIsExportingViewport(false);
    }
  }, [viewMode, zoom, panX, panY, currentScenery, text, result.wallCount, maxWalls, selectedWallLevel, localizedSceneryName, isTr]);

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
        locale,
      });

      if (!dataUrl) return;

      const link = document.createElement("a");
      const safeText = text.trim() ? text.toLowerCase().replace(/[^a-z0-9]/g, "-") : isTr ? "plan" : "blueprint";
      link.download = isTr ? `coc-duvar-yazisi-${safeText}.png` : `coc-wall-art-${safeText}.png`;
      link.href = dataUrl;
      link.click();
    } finally {
      setIsExporting(false);
    }
  }, [result, text, currentFont, rotation, offsetX, offsetY, locale, isTr]);

  // Copy Build Guide text
  const handleCopyGuide = async () => {
    const lines = result.buildGuide.map((g) => {
      if (isTr) {
        return `Satır ${g.row}: ${g.wallCount} duvar [${g.segments
          .map((s) => (s.fromCol === s.toCol ? `Sütun ${s.fromCol}` : `Sütun ${s.fromCol}–${s.toCol} (${s.count} adet)`))
          .join(", ")}]`;
      }
      return `Row ${g.row}: ${g.wallCount} walls [${g.segments
        .map((s) => (s.fromCol === s.toCol ? `Col ${s.fromCol}` : `Col ${s.fromCol}–${s.toCol} (${s.count})`))
        .join(", ")}]`;
    });

    const fullText = isTr
      ? [
          `=== CoC Duvar Yazısı İnşa Rehberi ===`,
          `Metin: "${text}"`,
          `Font: ${currentFont?.name || "Bilinmiyor"} (Ölçek: ${result.effectiveScale}x, Açı: ${rotation}°)`,
          `Toplam Duvar: ${result.wallCount} / ${result.maxWalls}`,
          `Izgara: 44x44 Ana Köy`,
          `------------------------------------`,
          ...lines,
        ].join("\n")
      : [
          `=== CoC Wall Art Build Guide ===`,
          `Text: "${text}"`,
          `Font: ${currentFont?.name || "Unknown"} (Scale: ${result.effectiveScale}x, Angle: ${rotation}°)`,
          `Total Walls: ${result.wallCount} / ${result.maxWalls}`,
          `Grid: 44x44 Home Village`,
          `------------------------------------`,
          ...lines,
        ].join("\n");

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(fullText);
      } else {
        const ta = document.createElement("textarea");
        ta.value = fullText;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setCopiedGuide(true);
      setTimeout(() => setCopiedGuide(false), 2000);
    } catch {
      // Clipboard fallback failed silently
    }
  };

  const usagePct = Math.min(100, Math.round((result.wallCount / Math.max(1, maxWalls)) * 100));

  // Localized non-duplicate supplementary notices
  const localizedNotices = useMemo(() => {
    const items: string[] = [];
    if (result.isReadabilityLow) {
      items.push(
        isTr
          ? `Bu boyutta harfler zor okunabilir (Harf yüksekliği: ${result.capHeight} hücre)`
          : `Letters may be hard to read at this scale (Cap height: ${result.capHeight} cells)`
      );
    }
    if (result.thickenedChars.length > 0) {
      items.push(
        isTr
          ? `Bazı harflerde ince çizgiler korundu (${result.thickenedChars.join(", ")})`
          : `Thin strokes reinforced on: ${result.thickenedChars.join(", ")}`
      );
    }
    if ((offsetX !== 0 || offsetY !== 0) && result.warnings.some((w) => w.includes("kaydırma"))) {
      items.push(
        isTr
          ? "Yazı kaydırma nedeniyle ızgara dışına taşıyor ve kırpılıyor."
          : "Text extends outside the 44×44 grid due to offset and is clipped."
      );
    }
    if (rotation % 45 !== 0 && result.warnings.some((w) => w.includes("Piksel harfleri"))) {
      items.push(
        isTr
          ? "Ara açılar piksel harfleri bozabilir; 45° katlarını kullanın."
          : "Intermediate angles may distort pixel glyphs; multiples of 45° are recommended."
      );
    }
    if (!result.isCleanScale) {
      items.push(
        isTr
          ? "Bu ölçekte harf kalınlıkları eşit olmayabilir."
          : "Stroke thickness may be uneven at this fractional scale."
      );
    }
    return items;
  }, [result, isTr, offsetX, offsetY, rotation]);

  return (
    <div className="w-full space-y-4 text-[var(--ui-text-main)] animate-fadeIn">
      {/* Top Header Strip */}
      <div className="ui-panel p-3.5 sm:p-4 flex flex-col xl:flex-row xl:items-center justify-between gap-3">
        <div className="flex items-start sm:items-center gap-3 min-w-0">
          <div className="ui-well w-11 h-11 flex items-center justify-center shrink-0">
            <PenTool size={20} className="text-[var(--ui-text-gold)]" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h1 className="font-game text-base sm:text-xl text-[var(--ui-text-main)] game-text-stroke leading-tight truncate">
              {t.wall.title}
            </h1>
            <p className="text-xs sm:text-sm text-[var(--ui-text-muted)] mt-0.5 leading-snug">
              {t.wall.subtitle}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <div className="ui-info px-2.5 py-1.5 flex items-center gap-1.5 text-xs tabular-nums">
            <span className="text-[var(--ui-text-muted)] font-semibold">{t.wall.totalWalls}</span>
            <strong
              className={cn(
                "font-extrabold",
                result.isOverBudget ? "text-[var(--ui-text-red)]" : "text-[var(--ui-text-gold)]"
              )}
            >
              {fmtNum(result.wallCount)} / {fmtNum(maxWalls)}
            </strong>
          </div>

          <div className="ui-info px-2.5 py-1.5 flex items-center gap-1.5 text-xs tabular-nums">
            <span className="text-[var(--ui-text-muted)] font-semibold">{t.wall.remainingWalls}</span>
            <strong className="font-extrabold text-[var(--ui-text-gold)]">
              {fmtNum(Math.max(0, maxWalls - result.wallCount))}
            </strong>
          </div>

          <div className="ui-info px-2.5 py-1.5 flex items-center gap-1.5 text-xs tabular-nums">
            <span className="text-[var(--ui-text-muted)] font-semibold">{t.wall.boundsLabel}</span>
            <strong className="font-extrabold text-[var(--ui-text-main)]">
              {result.maxCol > 0
                ? `${result.maxCol - result.minCol + 1}×${result.maxRow - result.minRow + 1}`
                : "0×0"}
            </strong>
          </div>

          <div className="ui-info px-2.5 py-1.5 flex items-center gap-1.5 text-xs tabular-nums">
            <span className="text-[var(--ui-text-muted)] font-semibold">
              {t.wall.letterHeightLabel}
            </span>
            <strong
              className={cn(
                "font-extrabold",
                result.isReadabilityLow ? "text-[var(--ui-text-gold)]" : "text-[var(--ui-text-green)]"
              )}
            >
              {fmtNum(result.capHeight)} {t.wall.cellsUnit}
            </strong>
          </div>

          <GameButton
            variant="green"
            size="sm"
            onClick={handleDownloadPng}
            disabled={isExporting || result.wallCount === 0}
            icon={<Download size={15} />}
            className="min-h-[44px] text-xs sm:text-sm px-3.5 py-2 whitespace-nowrap font-game"
            title={
              isTr
                ? "Koordinatlı 44×44 ızgara ve inşa planını PNG olarak indir"
                : "Download coordinate 44×44 grid blueprint as PNG"
            }
          >
            {t.wall.downloadPlan}
          </GameButton>
        </div>
      </div>

      {/* Main 2-Column Workspace (Left 4 cols: Controls | Right 8 cols: Canvas & Guide) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* LEFT COLUMN (lg:col-span-4): Text, Budget, Font & Layout, Scenery */}
        <div className="lg:col-span-4 space-y-4 min-w-0">
          {/* 1. Text & Wall Budget Panel */}
          <section className="ui-panel overflow-hidden">
            <div className="ui-panel-header px-3.5 sm:px-4 py-2.5 flex items-center justify-between gap-2">
              <span className="font-game text-xs sm:text-sm font-extrabold text-[var(--ui-text-main)]">
                {isTr ? "Metin & Duvar Bütçesi" : "Text & Wall Budget"}
              </span>
              <span
                className={cn(
                  "ui-pill px-2 py-0.5 text-xs font-extrabold tabular-nums",
                  result.isOverBudget
                    ? "text-[var(--ui-text-red)] border-[var(--ui-text-red)]/50"
                    : usagePct >= 85
                    ? "text-[var(--ui-text-gold)] border-[var(--ui-text-gold)]/50"
                    : "text-[var(--ui-text-green)] border-[var(--ui-text-green)]/40"
                )}
              >
                {usagePct}%
              </span>
            </div>

            <div className="p-3.5 sm:p-4 space-y-3">
              {/* Wall Text Input */}
              <div className="relative w-full">
                <input
                  type="text"
                  value={text}
                  maxLength={35}
                  onChange={(e) => setText(e.target.value)}
                  placeholder={t.wall.textPlaceholder}
                  aria-label={t.wall.title}
                  className="ui-input w-full h-12 px-3.5 pr-16 text-base font-bold text-[var(--ui-text-main)] placeholder-[var(--ui-text-muted)]/60 focus:outline-none focus:border-[var(--ui-text-gold)] shadow-inner tracking-wide"
                />
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-[var(--ui-text-muted)] pointer-events-none select-none tabular-nums">
                  {fmtNum(text.length)}/35
                </div>
              </div>

              {/* Wall Budget Numeric Input + Meter */}
              <div className="ui-well p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <label
                    htmlFor="wall-budget-input"
                    className="text-xs sm:text-sm font-bold text-[var(--ui-text-gold)] whitespace-nowrap"
                  >
                    {t.wall.wallsLabel}
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      id="wall-budget-input"
                      type="number"
                      min={1}
                      max={2000}
                      value={wallInputText}
                      onChange={(e) => setWallInputText(e.target.value)}
                      onBlur={() => {
                        const val = parseInt(wallInputText, 10);
                        if (isNaN(val) || val < 1) setWallInputText("1");
                        else if (val > 2000) setWallInputText("2000");
                        else setWallInputText(String(val));
                      }}
                      className="ui-input w-20 min-h-[44px] px-2.5 text-base font-mono font-black text-[var(--ui-text-main)] text-right tabular-nums focus:outline-none focus:border-[var(--ui-text-gold)]"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs tabular-nums">
                  <span className="text-[var(--ui-text-muted)] font-semibold">
                    {isTr ? "Kullanılan / Bütçe" : "Used / Budget"}
                  </span>
                  <span
                    className={cn(
                      "font-mono font-black",
                      result.isOverBudget ? "text-[var(--ui-text-red)]" : "text-[var(--ui-text-main)]"
                    )}
                  >
                    {fmtNum(result.wallCount)} / {fmtNum(maxWalls)}
                  </span>
                </div>

                <div className="h-2.5 w-full rounded-full bg-[var(--game-dark-box-dark)] border border-[var(--ui-well-border)] overflow-hidden">
                  <div
                    className={cn(
                      "h-full transition-all duration-300 rounded-full",
                      result.isOverBudget
                        ? "bg-[var(--game-btn-red-mid)]"
                        : usagePct >= 85
                        ? "bg-[var(--game-btn-gold-mid)]"
                        : "bg-[var(--game-btn-green-mid)]"
                    )}
                    style={{ width: `${usagePct}%` }}
                  />
                </div>
              </div>

              {/* Turkish Character Normalization Notice */}
              {result.convertedChars && result.convertedChars.length > 0 && (
                <div className="ui-info px-3 py-2 flex items-center gap-2 text-xs text-[var(--ui-text-muted)] font-medium border-[var(--ui-text-gold)]/35">
                  <Info size={15} className="shrink-0 text-[var(--ui-text-gold)]" />
                  <span>
                    {t.wall.turkishAdapted}{" "}
                    <strong className="text-[var(--ui-text-main)]">
                      {result.convertedChars.join(", ")}
                    </strong>
                  </span>
                </div>
              )}

              {/* Alerts inside Budget panel */}
              {(result.isOverBudget ||
                !result.fitsInGrid ||
                result.missingChars.length > 0 ||
                localizedNotices.length > 0) && (
                <div className="ui-info p-3 border-[var(--ui-text-red)]/55 text-xs text-[var(--ui-text-main)] flex items-start gap-2">
                  <AlertTriangle size={16} className="text-[var(--ui-text-red)] shrink-0 mt-0.5" />
                  <div className="flex flex-col gap-1 min-w-0">
                    {result.isOverBudget && (
                      <span className="font-bold text-[var(--ui-text-red)]">
                        {fmtTemplate(t.wall.budgetExceeded, {
                          excess: fmtNum(result.wallCount - maxWalls),
                        })}
                      </span>
                    )}
                    {!result.fitsInGrid && (
                      <span className="font-bold text-[var(--ui-text-red)]">{t.wall.gridOverflow}</span>
                    )}
                    {result.missingChars.length > 0 && (
                      <span className="text-[var(--ui-text-muted)]">
                        {isTr ? "Desteklenmeyen karakterler:" : "Unsupported characters:"}{" "}
                        <strong className="text-[var(--ui-text-gold)]">
                          {result.missingChars.join(", ")}
                        </strong>
                      </span>
                    )}
                    {localizedNotices.map((msg, idx) => (
                      <span key={idx} className="text-[var(--ui-text-gold)]">
                        {msg}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* 2. Bitmap Font & Layout Settings Panel */}
          <section className="ui-panel overflow-hidden">
            <div className="ui-panel-header px-3.5 sm:px-4 py-2.5 flex items-center justify-between gap-2">
              <span className="font-game text-xs sm:text-sm font-extrabold text-[var(--ui-text-main)]">
                {isTr ? "Yazı Tipi & Ayarlar" : "Font & Settings"}
              </span>
              {currentFont && (
                <span className="ui-pill px-2 py-0.5 text-[11px] font-bold text-[var(--ui-text-gold)] truncate max-w-[140px]">
                  {currentFont.name}
                </span>
              )}
            </div>

            <div className="p-3.5 sm:p-4 space-y-3">
              {/* Missing Fonts State */}
              {!currentFont && (
                <div className="ui-info p-3 border-[var(--ui-text-red)]/60 flex items-center gap-2.5 text-xs sm:text-sm">
                  <AlertTriangle size={18} className="text-[var(--ui-text-red)] shrink-0" />
                  <div>
                    <div className="font-game text-[var(--ui-text-main)]">{t.wall.noFontTitle}</div>
                    <div className="text-xs text-[var(--ui-text-muted)]">{t.wall.noFontDesc}</div>
                  </div>
                </div>
              )}

              {/* Font Selector Toggle & Drawer */}
              {currentFont && (
                <div className="ui-well overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setFontPickerOpen((prev) => !prev)}
                    aria-expanded={fontPickerOpen}
                    className="w-full min-h-[48px] flex items-center justify-between px-3 py-2 hover:bg-[var(--game-dark-box-mid)]/60 transition-colors cursor-pointer select-none text-left gap-2"
                  >
                    <div className="flex flex-col gap-1 overflow-hidden flex-1 min-w-0">
                      <span className="text-xs font-bold text-[var(--ui-text-gold)] truncate">
                        {t.wall.fontLabel}{" "}
                        <strong className="font-game text-[var(--ui-text-main)]">
                          {currentFont.name}
                        </strong>
                      </span>
                      <BitmapFontPreview
                        font={currentFont}
                        text={text}
                        convertTurkish={convertTurkish}
                      />
                    </div>
                    <div className="flex items-center gap-1 text-xs text-[var(--ui-text-muted)] font-bold shrink-0">
                      <span>{fontPickerOpen ? t.wall.closeBtn : t.wall.changeBtn}</span>
                      <ChevronDown
                        size={16}
                        className={cn(
                          "transition-transform duration-200 text-[var(--ui-text-gold)]",
                          fontPickerOpen && "rotate-180"
                        )}
                      />
                    </div>
                  </button>

                  {fontPickerOpen && (
                    <div className="p-2.5 border-t border-[var(--ui-well-border)] bg-[var(--game-dark-box-dark)]">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2 max-h-64 overflow-y-auto pr-1">
                        {allFonts.map((font) => {
                          const isSelected = selectedFontId === font.id;
                          const ms = font.missingSummary;
                          const missingCount = ms
                            ? ms.missingTurkishUpper.length +
                              ms.missingTurkishLower.length +
                              ms.missingAsciiUpper.length +
                              ms.missingAsciiLower.length +
                              ms.missingDigits.length +
                              ms.missingPunctuation.length
                            : 0;
                          return (
                            <button
                              key={font.id}
                              type="button"
                              onClick={() => {
                                setSelectedFontId(font.id);
                                setFontPickerOpen(false);
                              }}
                              className={cn(
                                "min-h-[44px] p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2",
                                isSelected
                                  ? "ui-info border-[var(--ui-text-gold)]/75 shadow-sm"
                                  : "bg-[var(--game-dark-box-mid)] border-[var(--ui-panel-border)] hover:border-[var(--ui-text-gold)]/50"
                              )}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-game text-xs text-[var(--ui-text-main)] truncate">
                                  {font.name}
                                </span>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <span
                                    className={cn(
                                      "ui-pill px-1.5 py-0.5 text-[10px] font-bold tabular-nums",
                                      missingCount === 0
                                        ? "text-[var(--ui-text-green)] border-[var(--ui-text-green)]/40"
                                        : "text-[var(--ui-text-gold)] border-[var(--ui-text-gold)]/40"
                                    )}
                                  >
                                    {missingCount === 0
                                      ? isTr
                                        ? "Tam Set"
                                        : "Full Set"
                                      : `${fmtNum(missingCount)} ${isTr ? "Eksik" : "Missing"}`}
                                  </span>
                                  {isSelected && (
                                    <CheckCircle2
                                      size={15}
                                      className="text-[var(--ui-text-gold)] shrink-0"
                                    />
                                  )}
                                </div>
                              </div>
                              <div className="w-full flex items-center justify-center">
                                <BitmapFontPreview
                                  font={font}
                                  text={text}
                                  convertTurkish={convertTurkish}
                                />
                              </div>
                              <div className="flex items-center justify-between text-[11px] text-[var(--ui-text-muted)] font-semibold pt-1 border-t border-[var(--ui-panel-border)] tabular-nums">
                                <span>
                                  {fmtTemplate(t.wall.glyphHeight, {
                                    height: fmtNum(font.height),
                                  })}
                                </span>
                                <span>
                                  {fmtNum(font.supportedChars.length)} {isTr ? "Glif" : "Glyphs"}
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Sliders & Auto-fit */}
              <div className="ui-well p-3 space-y-2.5 text-xs sm:text-sm font-bold text-[var(--ui-text-main)]">
                {/* Text Scale Slider */}
                <div className="flex items-center justify-between gap-3 min-h-[44px]">
                  <label
                    htmlFor="wall-scale-slider"
                    className="text-xs text-[var(--ui-text-gold)] shrink-0"
                  >
                    {t.wall.fontSizeLabel}
                  </label>
                  <div className="flex items-center gap-2 flex-1 justify-end min-w-0">
                    <input
                      id="wall-scale-slider"
                      type="range"
                      min={MIN_BITMAP_SCALE}
                      max={MAX_BITMAP_SCALE}
                      step={SCALE_STEP}
                      value={scale}
                      onChange={(e) => setScale(Number(e.target.value))}
                      className="game-slider !w-28 sm:!w-32"
                    />
                    <span className="text-[var(--ui-text-main)] font-mono text-xs shrink-0 tabular-nums w-12 text-right">
                      {scale}x
                      {result.wasScaledDown && (
                        <span className="text-[var(--ui-text-gold)] text-[11px] ml-0.5 font-bold">
                          ({result.effectiveScale}x)
                        </span>
                      )}
                    </span>
                  </div>
                </div>

                {/* Letter Spacing Slider */}
                <div className="flex items-center justify-between gap-3 min-h-[44px] border-t border-[var(--ui-well-border)] pt-2">
                  <label
                    htmlFor="wall-spacing-slider"
                    className="text-xs text-[var(--ui-text-gold)] shrink-0"
                  >
                    {t.wall.letterSpacingLabel}
                  </label>
                  <div className="flex items-center gap-2 flex-1 justify-end min-w-0">
                    <input
                      id="wall-spacing-slider"
                      type="range"
                      min={0}
                      max={4}
                      step={1}
                      value={letterSpacing}
                      onChange={(e) => setLetterSpacing(Number(e.target.value))}
                      className="game-slider !w-28 sm:!w-32"
                    />
                    <span className="text-[var(--ui-text-main)] font-mono text-xs shrink-0 tabular-nums w-12 text-right">
                      {letterSpacing}
                    </span>
                  </div>
                </div>

                {/* Auto-fit & Advanced Toggle Row */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[var(--ui-well-border)]">
                  <label className="flex items-center gap-2 min-h-[44px] cursor-pointer select-none text-[var(--ui-text-muted)] hover:text-[var(--ui-text-main)]">
                    <input
                      type="checkbox"
                      checked={autoFit}
                      onChange={(e) => setAutoFit(e.target.checked)}
                      className="game-checkbox"
                    />
                    <span className="text-xs">{t.wall.autoFitLabel}</span>
                  </label>

                  <button
                    type="button"
                    onClick={() => setIsOtherSettingsOpen((prev) => !prev)}
                    aria-expanded={isOtherSettingsOpen}
                    className="min-h-[44px] px-3 rounded-xl ui-info hover:border-[var(--ui-text-gold)]/60 flex items-center gap-1.5 text-xs font-bold text-[var(--ui-text-gold)] cursor-pointer transition-colors"
                  >
                    <Sliders size={14} className="text-[var(--ui-text-gold)] shrink-0" />
                    <span>{isTr ? "Gelişmiş" : "Advanced"}</span>
                    <ChevronDown
                      size={14}
                      className={cn(
                        "transition-transform duration-200 text-[var(--ui-text-gold)]",
                        isOtherSettingsOpen && "rotate-180"
                      )}
                    />
                  </button>
                </div>

                {isOtherSettingsOpen && (
                  <div className="pt-2 border-t border-[var(--ui-well-border)] space-y-1.5 text-xs text-[var(--ui-text-muted)]">
                    <label className="flex items-center gap-2 min-h-[44px] cursor-pointer select-none hover:text-[var(--ui-text-main)]">
                      <input
                        type="checkbox"
                        checked={convertTurkish}
                        onChange={(e) => setConvertTurkish(e.target.checked)}
                        className="game-checkbox"
                      />
                      <span>
                        {isTr
                          ? "Türkçe harfleri ASCII'ye uyarla (Ç→C, Ş→S)"
                          : "Normalize Turkish chars (Ç→C, Ş→S)"}
                      </span>
                    </label>

                    <label className="flex items-center gap-2 min-h-[44px] cursor-pointer select-none hover:text-[var(--ui-text-main)]">
                      <input
                        type="checkbox"
                        checked={preserveThinLines}
                        onChange={(e) => setPreserveThinLines(e.target.checked)}
                        className="game-checkbox"
                      />
                      <span>
                        {isTr
                          ? "0.5x ölçekte ince çizgileri koru"
                          : "Preserve thin strokes at 0.5x"}
                      </span>
                    </label>

                    <label className="flex items-center gap-2 min-h-[44px] cursor-pointer select-none hover:text-[var(--ui-text-main)]">
                      <input
                        type="checkbox"
                        checked={showDebugGrid}
                        onChange={(e) => {
                          const next = e.target.checked;
                          setShowDebugGrid(next);
                          if (next && viewMode !== "3d") setViewMode("3d");
                        }}
                        className="game-checkbox"
                      />
                      <span>
                        {isTr
                          ? "3D Sahne 44×44 Hizalama Izgarası"
                          : "3D Scenery 44×44 Alignment Grid"}
                      </span>
                    </label>

                    <label className="flex items-center gap-2 min-h-[44px] cursor-pointer select-none hover:text-[var(--ui-text-main)]">
                      <input
                        type="checkbox"
                        checked={show2dSceneryBg}
                        onChange={(e) => {
                          const next = e.target.checked;
                          setShow2dSceneryBg(next);
                          if (next && viewMode !== "2d") setViewMode("2d");
                        }}
                        className="game-checkbox"
                      />
                      <span>
                        {isTr ? "2D Izgarada Sahne Arka Planı" : "2D Grid Scenery Backdrop"}
                      </span>
                    </label>

                    <button
                      type="button"
                      onClick={() => {
                        setOffsetX(0);
                        setOffsetY(0);
                      }}
                      disabled={offsetX === 0 && offsetY === 0}
                      className="w-full min-h-[44px] px-3 rounded-xl ui-info hover:border-[var(--ui-text-gold)]/60 disabled:opacity-45 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 text-xs font-bold text-[var(--ui-text-gold)] cursor-pointer tabular-nums transition-colors"
                    >
                      <RotateCcw size={14} className="text-[var(--ui-text-gold)]" />
                      <span>
                        {isTr ? "Konumu Sıfırla" : "Reset Offset"} (
                        {offsetX >= 0 ? `+${offsetX}` : offsetX},{" "}
                        {offsetY >= 0 ? `+${offsetY}` : offsetY})
                      </span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* 3. Wall Level Selector Panel (Lv. 1-20) */}
          <section className="ui-panel overflow-hidden">
            <button
              type="button"
              onClick={() => setIsWallPickerOpen((prev) => !prev)}
              aria-expanded={isWallPickerOpen}
              className="ui-panel-header w-full min-h-[48px] flex items-center justify-between px-3.5 sm:px-4 py-2 hover:brightness-110 transition-all cursor-pointer select-none text-left group"
            >
              <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-[var(--ui-text-gold)] min-w-0 truncate">
                <div className="w-8 h-8 rounded-lg bg-[var(--game-dark-box-mid)] border border-[var(--ui-panel-border)] flex items-center justify-center shrink-0 shadow-inner p-1">
                  <img
                    src={currentWallConfig.src}
                    alt={currentWallConfig.name}
                    className="w-full h-full object-contain select-none"
                  />
                </div>
                <span className="shrink-0 flex items-center gap-1">
                  <Layers size={14} className="shrink-0" />
                  <span>{isTr ? "Duvar:" : "Wall:"}</span>
                </span>
                <span className="font-game text-[var(--ui-text-main)] truncate tabular-nums">
                  {isTr
                    ? `Sv. ${selectedWallLevel} (BB${currentWallConfig.thLevel ?? 19})`
                    : `Lv. ${selectedWallLevel} (TH${currentWallConfig.thLevel ?? 19})`}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-[var(--ui-text-muted)] font-bold shrink-0 ml-2 group-hover:text-[var(--ui-text-main)] transition-colors">
                <span>{isWallPickerOpen ? t.wall.closeBtn : t.wall.changeBtn}</span>
                <ChevronDown
                  size={16}
                  className={cn(
                    "transition-transform duration-200 text-[var(--ui-text-gold)]",
                    isWallPickerOpen && "rotate-180"
                  )}
                />
              </div>
            </button>

            {isWallPickerOpen && (
              <div className="p-3 bg-[var(--game-dark-box-dark)]">
                <div className="grid grid-cols-5 sm:grid-cols-5 gap-2 max-h-72 overflow-y-auto p-0.5">
                  {WALL_LEVELS.map((wl) => {
                    const lvl = wl.level ?? 1;
                    const isSelected = lvl === selectedWallLevel;
                    return (
                      <button
                        key={wl.id}
                        type="button"
                        onClick={() => handleSelectWallLevel(lvl)}
                        title={
                          isTr
                            ? `Seviye ${lvl} Duvar (Belediye Binası ${wl.thLevel ?? 19})`
                            : `Level ${lvl} Wall (Town Hall ${wl.thLevel ?? 19})`
                        }
                        className={cn(
                          "relative min-h-[58px] rounded-xl p-1.5 border-2 transition-all cursor-pointer flex flex-col items-center justify-between gap-1",
                          isSelected
                            ? "ui-info border-[var(--ui-text-gold)] ring-2 ring-[var(--ui-text-gold)]/45 shadow-md z-10"
                            : "bg-[var(--game-dark-box-mid)] border-[var(--ui-panel-border)] hover:border-[var(--ui-text-gold)]/60 opacity-90 hover:opacity-100"
                        )}
                      >
                        <img
                          src={wl.src}
                          alt={`Sv. ${lvl}`}
                          loading="lazy"
                          className="w-8 h-9 object-contain select-none pointer-events-none"
                        />
                        <span className="text-[11px] font-extrabold text-[var(--ui-text-main)] leading-none tabular-nums">
                          {isTr ? `Sv.${lvl}` : `Lv.${lvl}`}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </section>

          {/* 4. Scenery Selector Panel */}
          <section className="ui-panel overflow-hidden">
            <button
              type="button"
              onClick={() => setIsSceneryOpen((prev) => !prev)}
              aria-expanded={isSceneryOpen}
              className="ui-panel-header w-full min-h-[48px] flex items-center justify-between px-3.5 sm:px-4 py-2 hover:brightness-110 transition-all cursor-pointer select-none text-left group"
            >
              <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-[var(--ui-text-gold)] min-w-0 truncate">
                <div className="p-1.5 rounded-lg bg-[var(--game-dark-box-mid)] border border-[var(--ui-panel-border)] text-[var(--ui-text-gold)] shrink-0 shadow-inner">
                  <ImageIcon size={15} />
                </div>
                <span className="shrink-0">{t.wall.sceneryLabel}</span>
                <span className="font-game text-[var(--ui-text-main)] truncate">
                  {localizedSceneryName}
                </span>
                <span className="text-xs text-[var(--ui-text-muted)] font-mono shrink-0 tabular-nums">
                  ({fmtNum(availableSceneries.length)})
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-[var(--ui-text-muted)] font-bold shrink-0 ml-2 group-hover:text-[var(--ui-text-main)] transition-colors">
                <span>{isSceneryOpen ? t.wall.closeBtn : t.wall.changeBtn}</span>
                <ChevronDown
                  size={16}
                  className={cn(
                    "transition-transform duration-200 text-[var(--ui-text-gold)]",
                    isSceneryOpen && "rotate-180"
                  )}
                />
              </div>
            </button>

            {isSceneryOpen && (
              <div className="p-3 bg-[var(--game-dark-box-dark)]">
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-3 gap-2 max-h-72 overflow-y-auto p-0.5">
                  {availableSceneries.map((sc) => {
                    const isSelected = sc.id === selectedSceneryId;
                    const displayName = getSceneryDisplayName(sc.id, sc.name, locale);
                    return (
                      <button
                        key={sc.id}
                        type="button"
                        onClick={() => {
                          handleSelectScenery(sc.id);
                          centerViewOnDiamond(1.0);
                        }}
                        className={cn(
                          "relative min-h-[44px] rounded-xl overflow-hidden border-2 transition-all cursor-pointer aspect-square group",
                          isSelected
                            ? "border-[var(--ui-text-gold)] ring-2 ring-[var(--ui-text-gold)]/45 shadow-md z-10"
                            : "border-[var(--ui-panel-border)] hover:border-[var(--ui-text-gold)]/60 opacity-85 hover:opacity-100"
                        )}
                        title={`${displayName} (${sc.naturalWidth}×${sc.naturalHeight})`}
                      >
                        <img
                          src={sc.thumb}
                          alt={displayName}
                          loading="lazy"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/70 to-transparent px-1.5 py-1 text-center">
                          <span className="text-[11px] font-bold text-white truncate block leading-tight">
                            {displayName}
                          </span>
                        </div>
                        {isSelected && (
                          <div className="absolute top-1.5 right-1.5 bg-[var(--game-btn-gold-top)] text-[var(--game-dark-box-border)] p-0.5 rounded-full shadow">
                            <Check size={12} strokeWidth={3} />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </section>
        </div>

        {/* RIGHT COLUMN (lg:col-span-8): Interactive Canvas Preview + Docked Bar + Build Guide */}
        <div className="lg:col-span-8 space-y-4 min-w-0">
          <section className="ui-panel overflow-hidden">
            {/* Panel Header: Mode Switch + Coordinates */}
            <div className="ui-panel-header px-3.5 sm:px-4 py-2.5 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-game text-xs sm:text-sm font-extrabold text-[var(--ui-text-main)]">
                  {isTr ? "44×44 Köy Önizleme" : "44×44 Village Preview"}
                </span>
                <span className="ui-pill px-2 py-0.5 text-[11px] font-bold text-[var(--ui-text-muted)] tabular-nums">
                  {fmtTemplate(t.wall.filledRows, { filled: fmtNum(result.buildGuide.length) })}
                </span>
                {hoveredCell && viewMode === "3d" && !isDragging && (
                  <span className="ui-pill px-2 py-0.5 text-[11px] font-mono font-bold text-[var(--ui-text-gold)] tabular-nums">
                    {isTr ? "Sat" : "R"}
                    {hoveredCell.r + 1} · {isTr ? "Süt" : "C"}
                    {hoveredCell.c + 1}
                  </span>
                )}
              </div>

              {/* 2D / 3D Switch */}
              <div
                className="flex items-center p-0.5 rounded-xl bg-[var(--game-dark-box-dark)] border border-[var(--ui-well-border)]"
                role="group"
                aria-label={isTr ? "Görünüm modu" : "View mode"}
              >
                <button
                  type="button"
                  onClick={() => setViewMode("2d")}
                  className={cn(
                    "min-w-[54px] min-h-[38px] px-2.5 rounded-lg text-xs font-game transition-all cursor-pointer",
                    viewMode === "2d"
                      ? "bg-[var(--game-btn-gold-mid)] text-[var(--game-dark-box-border)] shadow font-extrabold"
                      : "text-[var(--ui-text-muted)] hover:text-[var(--ui-text-main)]"
                  )}
                >
                  2D
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("3d")}
                  className={cn(
                    "min-w-[54px] min-h-[38px] px-2.5 rounded-lg text-xs font-game transition-all cursor-pointer",
                    viewMode === "3d"
                      ? "bg-[var(--game-btn-gold-mid)] text-[var(--game-dark-box-border)] shadow font-extrabold"
                      : "text-[var(--ui-text-muted)] hover:text-[var(--ui-text-main)]"
                  )}
                >
                  3D
                </button>
              </div>
            </div>

            {/* Viewport Container */}
            <div className="p-2.5 sm:p-3.5 space-y-2.5">
              <div
                ref={viewportRef}
                tabIndex={0}
                onKeyDown={handleKeyDown}
                onWheel={handleWheel}
                onPointerDown={handleViewportPointerDown}
                onPointerMove={handleViewportPointerMove}
                onPointerUp={handleViewportPointerUp}
                onPointerCancel={handleViewportPointerUp}
                className={cn(
                  "ui-well relative w-full overflow-hidden select-none touch-none aspect-[4/3] sm:aspect-[16/10] focus:outline-none focus:ring-2 focus:ring-[var(--ui-text-gold)]/50 transition-shadow",
                  isDragging
                    ? dragInfoRef.current?.type === "pan"
                      ? "cursor-grabbing"
                      : "cursor-move"
                    : cursorMode === "move"
                    ? "cursor-move"
                    : "cursor-grab"
                )}
                style={{
                  maxHeight: "74vh",
                }}
              >
                {/* Canvas Rendering (3D Scenery + Walls OR 2D Grid) */}
                {viewMode === "3d" ? (
                  <div
                    className="absolute top-0 left-0 will-change-transform"
                    style={{
                      width: `${currentScenery.naturalWidth}px`,
                      height: `${currentScenery.naturalHeight}px`,
                      transform: `translate3d(${panX}px, ${panY}px, 0px) scale(${
                        viewportSize.width > 0
                          ? Math.max(
                              viewportSize.width / currentScenery.naturalWidth,
                              viewportSize.height / currentScenery.naturalHeight
                            ) * zoom
                          : 1
                      })`,
                      transformOrigin: "0 0",
                    }}
                  >
                    <canvas
                      ref={canvas3dRef}
                      style={{
                        width: `${currentScenery.naturalWidth}px`,
                        height: `${currentScenery.naturalHeight}px`,
                      }}
                    />
                  </div>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center p-3 sm:p-4 bg-[var(--game-dark-box-dark)]">
                    <canvas
                      ref={canvas2dRef}
                      className="max-h-full max-w-full rounded-xl shadow-xl border border-[var(--ui-text-gold)]/35"
                      style={{ aspectRatio: "1 / 1" }}
                    />
                  </div>
                )}

                {/* Scenery Loading Overlay */}
                {sceneryLoading && (
                  <div className="absolute inset-0 bg-[var(--game-dark-box-dark)]/80 backdrop-blur-sm flex flex-col items-center justify-center gap-2 z-40 rounded-xl pointer-events-none">
                    <div className="w-8 h-8 border-2 border-[var(--ui-text-gold)] border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs sm:text-sm text-[var(--ui-text-gold)] font-bold">
                      {t.wall.loadingScene}
                    </span>
                  </div>
                )}

                {/* Floating Drag Indicator */}
                {isDragging && (
                  <div className="ui-pill absolute top-14 sm:top-16 left-1/2 -translate-x-1/2 text-[var(--ui-text-gold)] text-xs font-bold px-3 py-1.5 border-[var(--ui-text-gold)]/60 shadow-xl pointer-events-none flex items-center gap-2 z-30 whitespace-nowrap tabular-nums">
                    <Move size={14} className="text-[var(--ui-text-gold)] shrink-0" />
                    <span>
                      {dragInfoRef.current?.type === "text"
                        ? fmtTemplate(t.wall.draggingText, {
                            x: offsetX > 0 ? `+${offsetX}` : offsetX,
                            y: offsetY > 0 ? `+${offsetY}` : offsetY,
                          })
                        : fmtTemplate(t.wall.panningScene, { zoom: zoom.toFixed(1) })}
                    </span>
                  </div>
                )}

                {/* TOP-CENTER PAIR: Rotate CCW & Rotate CW matching CoC Village Editor HUD */}
                <div
                  className="absolute top-2.5 sm:top-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2"
                  role="group"
                  aria-label={isTr ? "Döndürme kontrolleri" : "Rotation controls"}
                  onPointerDownCapture={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    {...ccwHold}
                    disabled={!canRotateCCW}
                    className={cn(
                      "rounded-xl w-12 h-11 sm:w-14 sm:h-12",
                      canRotateCCW ? "game-btn-wall-green" : "game-btn-wall-gray"
                    )}
                    aria-label={
                      isTr ? "Saat yönünün tersi döndür (-15°)" : "Rotate counter-clockwise (-15°)"
                    }
                    title={
                      isTr ? "Saat Yönünün Tersi Döndür (-15°)" : "Rotate Counter-Clockwise (-15°)"
                    }
                  >
                    <svg viewBox="0 0 36 36" className="w-8 h-8 sm:w-9 sm:h-9" aria-hidden="true">
                      <path
                        d="M14.2 6.2 L4.4 13.8 L14.2 21.4 V16.8 C19.8 16.6 24.0 18.0 24.0 20.8 C24.0 23.0 21.2 24.0 16.5 24.0 V30.0 C25.6 30.0 31.2 26.2 31.2 20.2 C31.2 13.6 24.2 10.2 14.2 10.4 Z"
                        fill="#FFFFFF"
                        stroke="#18120B"
                        strokeWidth="3.2"
                        strokeLinejoin="round"
                        paintOrder="stroke fill"
                      />
                    </svg>
                  </button>

                  <button
                    type="button"
                    {...cwHold}
                    disabled={!canRotateCW}
                    className={cn(
                      "rounded-xl w-12 h-11 sm:w-14 sm:h-12",
                      canRotateCW ? "game-btn-wall-green" : "game-btn-wall-gray"
                    )}
                    aria-label={isTr ? "Saat yönünde döndür (+15°)" : "Rotate clockwise (+15°)"}
                    title={isTr ? "Saat Yönünde Döndür (+15°)" : "Rotate Clockwise (+15°)"}
                  >
                    <svg viewBox="0 0 36 36" className="w-8 h-8 sm:w-9 sm:h-9" aria-hidden="true">
                      <g transform="translate(36,0) scale(-1,1)">
                        <path
                          d="M14.2 6.2 L4.4 13.8 L14.2 21.4 V16.8 C19.8 16.6 24.0 18.0 24.0 20.8 C24.0 23.0 21.2 24.0 16.5 24.0 V30.0 C25.6 30.0 31.2 26.2 31.2 20.2 C31.2 13.6 24.2 10.2 14.2 10.4 Z"
                          fill="#FFFFFF"
                          stroke="#18120B"
                          strokeWidth="3.2"
                          strokeLinejoin="round"
                          paintOrder="stroke fill"
                        />
                      </g>
                    </svg>
                  </button>
                </div>

                {/* 4 CORNER DIRECTIONAL NUDGE ARROWS matching CoC Village Editor HUD */}
                <div onPointerDownCapture={(e) => e.stopPropagation()}>
                  {/* NW (Top-Left) */}
                  <button
                    type="button"
                    {...nwHold}
                    disabled={!canNudgeNW}
                    className={cn(
                      "absolute top-2.5 left-2.5 sm:top-3 sm:left-3 z-20 rounded-xl w-12 h-11 sm:w-14 sm:h-12",
                      canNudgeNW ? "game-btn-wall-green" : "game-btn-wall-gray"
                    )}
                    aria-label={isTr ? "Yukarı-Sola Kaydır (Sütun -1)" : "Nudge North-West (Col -1)"}
                    title={
                      isTr
                        ? "Yazıyı Sütun Boyunca Yukarı-Sola Kaydır (Sütun -1)"
                        : "Nudge North-West (Col -1)"
                    }
                  >
                    <svg viewBox="0 0 36 36" className="w-8 h-8 sm:w-9 sm:h-9" aria-hidden="true">
                      <g transform="rotate(-143 18 18)">
                        <path
                          d="M4 12.2 H17.5 V6.2 L32.2 18 L17.5 29.8 V23.8 H4 Z"
                          fill="#FFFFFF"
                          stroke="#18120B"
                          strokeWidth="3.2"
                          strokeLinejoin="round"
                          paintOrder="stroke fill"
                        />
                      </g>
                    </svg>
                  </button>

                  {/* NE (Top-Right) */}
                  <button
                    type="button"
                    {...neHold}
                    disabled={!canNudgeNE}
                    className={cn(
                      "absolute top-2.5 right-2.5 sm:top-3 sm:right-3 z-20 rounded-xl w-12 h-11 sm:w-14 sm:h-12",
                      canNudgeNE ? "game-btn-wall-green" : "game-btn-wall-gray"
                    )}
                    aria-label={isTr ? "Yukarı-Sağa Kaydır (Satır -1)" : "Nudge North-East (Row -1)"}
                    title={
                      isTr
                        ? "Yazıyı Satır Boyunca Yukarı-Sağa Kaydır (Satır -1)"
                        : "Nudge North-East (Row -1)"
                    }
                  >
                    <svg viewBox="0 0 36 36" className="w-8 h-8 sm:w-9 sm:h-9" aria-hidden="true">
                      <g transform="rotate(-37 18 18)">
                        <path
                          d="M4 12.2 H17.5 V6.2 L32.2 18 L17.5 29.8 V23.8 H4 Z"
                          fill="#FFFFFF"
                          stroke="#18120B"
                          strokeWidth="3.2"
                          strokeLinejoin="round"
                          paintOrder="stroke fill"
                        />
                      </g>
                    </svg>
                  </button>

                  {/* SW (Bottom-Left) */}
                  <button
                    type="button"
                    {...swHold}
                    disabled={!canNudgeSW}
                    className={cn(
                      "absolute bottom-2.5 left-2.5 sm:bottom-3 sm:left-3 z-20 rounded-xl w-12 h-11 sm:w-14 sm:h-12",
                      canNudgeSW ? "game-btn-wall-green" : "game-btn-wall-gray"
                    )}
                    aria-label={isTr ? "Aşağı-Sola Kaydır (Satır +1)" : "Nudge South-West (Row +1)"}
                    title={
                      isTr
                        ? "Yazıyı Satır Boyunca Aşağı-Sola Kaydır (Satır +1)"
                        : "Nudge South-West (Row +1)"
                    }
                  >
                    <svg viewBox="0 0 36 36" className="w-8 h-8 sm:w-9 sm:h-9" aria-hidden="true">
                      <g transform="rotate(143 18 18)">
                        <path
                          d="M4 12.2 H17.5 V6.2 L32.2 18 L17.5 29.8 V23.8 H4 Z"
                          fill="#FFFFFF"
                          stroke="#18120B"
                          strokeWidth="3.2"
                          strokeLinejoin="round"
                          paintOrder="stroke fill"
                        />
                      </g>
                    </svg>
                  </button>

                  {/* SE (Bottom-Right) */}
                  <button
                    type="button"
                    {...seHold}
                    disabled={!canNudgeSE}
                    className={cn(
                      "absolute bottom-2.5 right-2.5 sm:bottom-3 sm:right-3 z-20 rounded-xl w-12 h-11 sm:w-14 sm:h-12",
                      canNudgeSE ? "game-btn-wall-green" : "game-btn-wall-gray"
                    )}
                    aria-label={isTr ? "Aşağı-Sağa Kaydır (Sütun +1)" : "Nudge South-East (Col +1)"}
                    title={
                      isTr
                        ? "Yazıyı Sütun Boyunca Aşağı-Sağa Kaydır (Sütun +1)"
                        : "Nudge South-East (Col +1)"
                    }
                  >
                    <svg viewBox="0 0 36 36" className="w-8 h-8 sm:w-9 sm:h-9" aria-hidden="true">
                      <g transform="rotate(37 18 18)">
                        <path
                          d="M4 12.2 H17.5 V6.2 L32.2 18 L17.5 29.8 V23.8 H4 Z"
                          fill="#FFFFFF"
                          stroke="#18120B"
                          strokeWidth="3.2"
                          strokeLinejoin="round"
                          paintOrder="stroke fill"
                        />
                      </g>
                    </svg>
                  </button>
                </div>
              </div>

              {/* Docked Canvas Control Bar */}
              <div className="ui-info p-2.5 sm:p-3 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-2.5 shadow-inner">
                {/* Angle Indicator / Reset + Zoom Controls */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={resetRotation}
                    className="ui-well min-h-[44px] min-w-[74px] px-3 hover:border-[var(--ui-text-gold)] transition-colors cursor-pointer flex items-center justify-center gap-1.5 active:scale-95"
                    title={isTr ? "Açıyı varsayılana (-45°) sıfırla" : "Reset angle to default (-45°)"}
                  >
                    <RotateCcw size={13} className="text-[var(--ui-text-gold)] shrink-0" />
                    <span className="font-game text-xs sm:text-sm text-[var(--ui-text-main)] tabular-nums">
                      {rotation}°
                    </span>
                    {rotation % 45 !== 0 && (
                      <AlertTriangle
                        size={14}
                        className="text-[var(--ui-text-gold)] shrink-0"
                        aria-label={isTr ? "45° katları önerilir" : "Multiples of 45° recommended"}
                      />
                    )}
                  </button>

                  {/* Zoom Group */}
                  <div
                    className="flex items-center gap-1"
                    role="group"
                    aria-label={isTr ? "Yakınlaştırma kontrolleri" : "Zoom controls"}
                  >
                    <button
                      type="button"
                      onClick={() => handleZoomStep(1 / 1.25)}
                      disabled={zoom <= 1.0}
                      className="game-btn-panel-green rounded-xl min-w-[44px] min-h-[44px]"
                      aria-label={isTr ? "Uzaklaştır (-)" : "Zoom out (-)"}
                      title={isTr ? "Uzaklaştır (−)" : "Zoom Out (−)"}
                    >
                      <Minus size={18} strokeWidth={3} />
                    </button>

                    <button
                      type="button"
                      onClick={() => centerViewOnDiamond(1.0)}
                      className="ui-well min-h-[44px] min-w-[66px] px-2.5 hover:border-[var(--ui-text-gold)] transition-colors cursor-pointer flex items-center justify-center gap-1 text-xs sm:text-sm font-game text-[var(--ui-text-gold)] tabular-nums active:scale-95"
                      title={isTr ? "Görünümü %100 sıfırla ve ortala" : "Reset zoom to 100% and center view"}
                    >
                      <Crosshair size={13} className="text-[var(--ui-text-gold)] shrink-0" />
                      <span>{Math.round(zoom * 100)}%</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleZoomStep(1.25)}
                      disabled={zoom >= 4.0}
                      className="game-btn-panel-green rounded-xl min-w-[44px] min-h-[44px]"
                      aria-label={isTr ? "Yakınlaştır (+)" : "Zoom in (+)"}
                      title={isTr ? "Yakınlaştır (+)" : "Zoom In (+)"}
                    >
                      <Plus size={18} strokeWidth={3} />
                    </button>
                  </div>
                </div>

                {/* Export & Build Guide Action Buttons */}
                <div className="flex flex-wrap items-center gap-2">
                  <GameButton
                    variant="gold"
                    size="sm"
                    onClick={handleExportViewport2x}
                    disabled={isExportingViewport || (viewMode === "3d" && sceneryLoading)}
                    icon={
                      isExportingViewport ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Camera size={16} />
                      )
                    }
                    className="min-h-[44px] px-3 py-2 text-xs sm:text-sm whitespace-nowrap font-game"
                    title={
                      isTr
                        ? "Mevcut köy görünümünü 2 kat çözünürlükte önizleme PNG olarak indir"
                        : "Save current village preview as 2x PNG image"
                    }
                  >
                    {t.wall.downloadPreview}
                  </GameButton>

                  <GameButton
                    variant="blue"
                    size="sm"
                    onClick={handleCopyGuide}
                    disabled={result.wallCount === 0}
                    icon={copiedGuide ? <Check size={16} /> : <Copy size={16} />}
                    className="min-h-[44px] px-3 py-2 text-xs sm:text-sm whitespace-nowrap font-game"
                    title={
                      isTr
                        ? "Satır satır koordinatlı inşa rehberini panoya kopyala"
                        : "Copy row-by-row coordinate build guide to clipboard"
                    }
                  >
                    {copiedGuide ? t.wall.copiedGuide : t.wall.copyGuide}
                  </GameButton>

                  <button
                    type="button"
                    onClick={() => setIsGuideOpen((prev) => !prev)}
                    disabled={result.buildGuide.length === 0}
                    aria-expanded={isGuideOpen}
                    className="ui-well min-h-[44px] min-w-[44px] px-3 hover:border-[var(--ui-text-gold)]/60 disabled:opacity-45 disabled:cursor-not-allowed flex items-center gap-1.5 text-xs sm:text-sm font-bold text-[var(--ui-text-gold)] cursor-pointer transition-colors"
                    title={
                      isTr
                        ? "Satır bazlı koordinat listesini göster/gizle"
                        : "Toggle row-by-row coordinate list"
                    }
                  >
                    <ListOrdered size={16} className="text-[var(--ui-text-gold)] shrink-0" />
                    <span className="tabular-nums">{fmtNum(result.buildGuide.length)}</span>
                    <ChevronDown
                      size={15}
                      className={cn(
                        "transition-transform duration-200 text-[var(--ui-text-gold)]",
                        isGuideOpen && "rotate-180"
                      )}
                    />
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* Collapsible Row-by-Row Build Guide Drawer */}
          {isGuideOpen && result.buildGuide.length > 0 && (
            <section className="ui-panel overflow-hidden">
              <div className="ui-panel-header px-3.5 sm:px-4 py-2.5 flex items-center justify-between gap-2">
                <span className="font-game text-xs sm:text-sm text-[var(--ui-text-gold)]">
                  {isTr ? "Satır Bazlı Koordinat Rehberi (1–44)" : "Row-by-Row Build Guide (1–44)"}
                </span>
                <span className="text-xs text-[var(--ui-text-muted)] tabular-nums">
                  {fmtTemplate(t.wall.filledRows, { filled: fmtNum(result.buildGuide.length) })}
                </span>
              </div>
              <div className="p-3 sm:p-4 max-h-60 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {result.buildGuide.map((g) => (
                  <div
                    key={g.row}
                    className="ui-info px-2.5 py-2 text-xs text-[var(--ui-text-main)] flex flex-col gap-1 tabular-nums"
                  >
                    <div className="flex items-center justify-between font-bold">
                      <span className="text-[var(--ui-text-gold)]">
                        {isTr ? `Satır ${g.row}` : `Row ${g.row}`}
                      </span>
                      <span className="text-[var(--ui-text-green)]">
                        {fmtNum(g.wallCount)} {isTr ? "duvar" : "walls"}
                      </span>
                    </div>
                    <div className="text-xs text-[var(--ui-text-muted)] font-mono">
                      {g.segments
                        .map((s) =>
                          s.fromCol === s.toCol
                            ? `${isTr ? "Süt" : "C"}${s.fromCol}`
                            : `${isTr ? "Süt" : "C"}${s.fromCol}–${s.toCol}(${s.count})`
                        )
                        .join(", ")}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
