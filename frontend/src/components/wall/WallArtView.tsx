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
  Bug,
  Image as ImageIcon,
  ChevronDown,
  Plus,
  Minus,
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
import {
  GameButton,
  GameTabBar,
  GameTab,
} from "@/components/game";
import {
  ASSETS_CONFIG,
  getSceneryConfig,
  SceneryAssetConfig,
  mapGridToScenery,
  mapSceneryToGrid,
} from "@/lib/assetsConfig";

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
  convertTurkish = true,
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
        className="rounded border border-[#3A2317]"
      />
    </div>
  );
}

const SCENE_ASPECT = 19.5 / 9;

function useHoldAction(action: () => void, disabled?: boolean, initialDelay = 300, repeatInterval = 75) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const actionRef = useRef(action);
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

  useEffect(() => {
    return stop;
  }, [stop]);

  return {
    onPointerDown: start,
    onPointerUp: stop,
    onPointerLeave: stop,
    onPointerCancel: stop,
  };
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
  const [rotation, setRotation] = useState<number>(-45); // Default -45° (in-game horizontal on screen)
  const [maxWalls, setMaxWalls] = useState<number>(DEFAULT_MAX_WALLS);
  const [wallInputText, setWallInputText] = useState<string>(String(DEFAULT_MAX_WALLS));
  const [convertTurkish, setConvertTurkish] = useState<boolean>(true);
  const [preserveThinLines, setPreserveThinLines] = useState<boolean>(false);
  const [autoFit, setAutoFit] = useState<boolean>(true);
  const [offsetX, setOffsetX] = useState<number>(0);
  const [offsetY, setOffsetY] = useState<number>(0);
  const [viewMode, setViewMode] = useState<"2d" | "3d">("3d");
  const [showDebugGrid, setShowDebugGrid] = useState<boolean>(false);
  const [show2dSceneryBg, setShow2dSceneryBg] = useState<boolean>(false);
  const [fontPickerOpen, setFontPickerOpen] = useState<boolean>(false);
  const [isSceneryOpen, setIsSceneryOpen] = useState<boolean>(false);
  const [isOtherSettingsOpen, setIsOtherSettingsOpen] = useState<boolean>(false);
  const [isGuideOpen, setIsGuideOpen] = useState<boolean>(false);

  // Viewport Zoom & Pan Engine State
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const [viewportSize, setViewportSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const [zoom, setZoom] = useState<number>(1.0);
  const [panX, setPanX] = useState<number>(0);
  const [panY, setPanY] = useState<number>(0);
  const [cursorMode, setCursorMode] = useState<"grab" | "move">("grab");
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

  // Restore selected scenery from localStorage or URL query on mount
  useEffect(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const queryScenery = urlParams.get("scenery");
      if (queryScenery && availableSceneries.some((s) => s.id === queryScenery)) {
        setSelectedSceneryId(queryScenery);
      }
      if (urlParams.get("open") === "all") {
        setFontPickerOpen(true);
        setIsSceneryOpen(true);
        setIsOtherSettingsOpen(true);
      }
      const saved = localStorage.getItem("wallart.scenery");
      if (saved && availableSceneries.some((s) => s.id === saved)) {
        setSelectedSceneryId(saved);
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

  const currentScenery: SceneryAssetConfig = useMemo(() => {
    return getSceneryConfig(selectedSceneryId);
  }, [selectedSceneryId]);

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

  // Preload wall texture once
  useEffect(() => {
    const w = new Image();
    w.src = ASSETS_CONFIG.wall.src;
    w.onload = () => setWallImg(w);
  }, []);

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
    startGridCol: number;
    startGridRow: number;
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
    if (show2dSceneryBg && sceneryImg && sceneryImg.complete) {
      // Draw subtle scenery background
      ctx.drawImage(sceneryImg, 0, 0, size, size);
      ctx.fillStyle = "rgba(15, 23, 42, 0.75)";
      ctx.fillRect(0, 0, size, size);
    } else {
      ctx.fillStyle = "#0F172A"; // Slate 900
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
          // Grass tile checkerboard
          ctx.fillStyle = (r + c) % 2 === 0 ? "rgba(20, 30, 51, 0.9)" : "rgba(16, 24, 40, 0.9)";
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
  }, [result, show2dSceneryBg, sceneryImg]);

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
      ctx.fillStyle = "#0B111E";
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

    // 3. Draw Real Wall 19 Textures in Depth Order (row + col ascending)
    const filledCells: { r: number; c: number }[] = [];
    for (let r = 0; r < COC_GRID_SIZE; r++) {
      for (let c = 0; c < COC_GRID_SIZE; c++) {
        if (result.grid[r][c] === 1) {
          filledCells.push({ r, c });
        }
      }
    }

    // Isometric painter's depth sorting (back to front)
    filledCells.sort((a, b) => a.r + a.c - (b.r + b.c) || a.r - b.r);

    // Compute cell width to scale wall sprite accurately
    const pL = mapGridToScenery(0, 1, buildArea);
    const pR = mapGridToScenery(1, 0, buildArea);
    const cellW = Math.hypot(pR.x - pL.x, pR.y - pL.y);

    if (wallImg && wallImg.complete) {
      const naturalW = wallImg.naturalWidth || ASSETS_CONFIG.wall.naturalWidth;
      const naturalH = wallImg.naturalHeight || ASSETS_CONFIG.wall.naturalHeight;
      const wallScale = (cellW * 1.02) / 54.0;
      const wallW = naturalW * wallScale;
      const wallH = naturalH * wallScale;

      const anchorX = wallW / 2.0;
      const anchorY = wallH * (60.0 / 73.0);

      for (const { r, c } of filledCells) {
        const center = mapGridToScenery(c + 0.5, r + 0.5, buildArea);
        ctx.drawImage(
          wallImg,
          center.x - anchorX,
          center.y - anchorY,
          wallW,
          wallH
        );
      }
    } else {
      // Fallback cube renderer while image is loading
      for (const { r, c } of filledCells) {
        const center = mapGridToScenery(c + 0.5, r + 0.5, buildArea);
        ctx.fillStyle = "#F59E0B";
        ctx.fillRect(center.x - 12, center.y - 12, 24, 24);
      }
    }
  }, [viewMode, result, sceneryImg, wallImg, showDebugGrid, currentScenery]);

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

  // 4 Corner Nudge Actions
  // NW: Sütun - 1 (offsetX - 1)
  const canNudgeNW = offsetX > -20 && (result.wallCount === 0 || result.minCol > 0);
  const nudgeNW = useCallback(() => {
    setOffsetX((prev) => Math.max(-20, prev - 1));
  }, []);
  const nwHold = useHoldAction(nudgeNW, !canNudgeNW);

  // SE: Sütun + 1 (offsetX + 1)
  const canNudgeSE = offsetX < 20 && (result.wallCount === 0 || result.maxCol < COC_GRID_SIZE - 1);
  const nudgeSE = useCallback(() => {
    setOffsetX((prev) => Math.min(20, prev + 1));
  }, []);
  const seHold = useHoldAction(nudgeSE, !canNudgeSE);

  // NE: Satır - 1 (offsetY - 1)
  const canNudgeNE = offsetY > -20 && (result.wallCount === 0 || result.minRow > 0);
  const nudgeNE = useCallback(() => {
    setOffsetY((prev) => Math.max(-20, prev - 1));
  }, []);
  const neHold = useHoldAction(nudgeNE, !canNudgeNE);

  // SW: Satır + 1 (offsetY + 1)
  const canNudgeSW = offsetY < 20 && (result.wallCount === 0 || result.maxRow < COC_GRID_SIZE - 1);
  const nudgeSW = useCallback(() => {
    setOffsetY((prev) => Math.min(20, prev + 1));
  }, []);
  const swHold = useHoldAction(nudgeSW, !canNudgeSW);

  // Top Center Rotation Actions
  const rotateCCW = useCallback(() => {
    setRotation((prev) => {
      let next = prev - 15;
      if (next < -180) next += 360;
      return next;
    });
  }, []);
  const ccwHold = useHoldAction(rotateCCW);

  const rotateCW = useCallback(() => {
    setRotation((prev) => {
      let next = prev + 15;
      if (next > 180) next -= 360;
      return next;
    });
  }, []);
  const cwHold = useHoldAction(rotateCW);

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

  // Download Viewport PNG at 2x resolution
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
        ctx.fillStyle = "#0B111E";
        ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
        const pad = Math.round(exportCanvas.height * 0.05);
        const size = exportCanvas.height - pad * 2;
        const startX = Math.round((exportCanvas.width - size) / 2);
        ctx.drawImage(canvas, 0, 0, canvas.width, canvas.height, startX, pad, size, size);
      }

      const dataUrl = exportCanvas.toDataURL("image/png");
      const link = document.createElement("a");
      const safeText = text.trim() ? text.toLowerCase().replace(/[^a-z0-9]/g, "-") : "koy";
      link.download = `coc-duvar-yazisi-${safeText}.png`;
      link.href = dataUrl;
      link.click();
    } finally {
      setIsExportingViewport(false);
    }
  }, [viewMode, zoom, panX, panY, currentScenery, text]);

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
    <div className="game-theme w-full max-w-7xl mx-auto px-0 sm:px-2 py-1 sm:py-4 flex flex-col animate-fadeIn pb-12">
      {/* Main Wooden Window Frame */}
      <div className="game-window-frame flex flex-col">
        {/* Window Top Edge: Tab Bar Strip */}
        <div className="game-tab-strip shrink-0 justify-between items-end gap-2 px-3 sm:px-6">
          <GameTabBar>
            <GameTab active={true} icon={<PenTool size={18} />}>
              Duvar Yazısı
            </GameTab>
          </GameTabBar>

          <div className="mb-1.5 sm:mb-2 shrink-0">
            <GameButton
              variant="green"
              size="sm"
              onClick={handleDownloadPng}
              disabled={isExporting || result.wallCount === 0}
              icon={<Download size={14} />}
              className="text-xs px-2.5 py-1.5 sm:px-3 sm:py-2 whitespace-nowrap"
              title="Koordinatlı ızgara ve inşa planını PNG olarak indir"
            >
              PNG Planı İndir
            </GameButton>
          </div>
        </div>

        {/* Window Content Body */}
        <div className="px-2.5 sm:px-6 py-2.5 sm:py-4 space-y-3 sm:space-y-4">
          {/* a) 1. Kutu / Satır: Metin Kutusu + Duvar Limiti Kutusu */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Metin Kutusu (tam genişlik/flex-1, placeholder, sağda karakter sayacı 4/35) */}
            <div className="relative flex-1 min-w-0 h-11 sm:h-12">
              <input
                type="text"
                value={text}
                maxLength={35}
                onChange={(e) => setText(e.target.value)}
                placeholder="Metin girin (örn. HARUN, COC, KLAN)..."
                className="w-full h-full px-3.5 pr-14 rounded-xl bg-[#150B05] border-2 border-[#4E3120] text-sm sm:text-base font-black text-white placeholder-[#8C6D58] focus:outline-none focus:border-amber-400 shadow-inner tracking-wide"
              />
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[11px] sm:text-xs font-bold text-[#D8AF86] pointer-events-none select-none">
                {text.length}/35
              </div>
            </div>

            {/* Duvar Limiti Kutusu ("Duvar:" etiketi, min 1 max 2000 debounced input, w-20 sm:w-24, aynı yükseklik) */}
            <div className="flex items-center justify-between gap-1 px-2 sm:px-2.5 h-11 sm:h-12 w-20 sm:w-24 rounded-xl bg-[#150B05] border-2 border-[#4E3120] shrink-0">
              <span className="text-[11px] sm:text-xs font-bold text-[#FFEB75] whitespace-nowrap">Duvar:</span>
              <input
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
                className="w-9 sm:w-11 bg-transparent text-xs sm:text-sm font-mono font-black text-white text-right focus:outline-none"
              />
            </div>
          </div>

          {/* b) Türkçe Uyarı Şeridi (Varsa) */}
          {result.convertedChars && result.convertedChars.length > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300/95 font-medium">
              <Info size={14} className="shrink-0 text-amber-400" />
              <span>Türkçe karakterler otomatik uyarlandı: <strong className="text-amber-200">{result.convertedChars.join(", ")}</strong></span>
            </div>
          )}

          {/* c) 2. Kutu / Satır: Font Seçici */}
          <div className="border-2 border-[#4E3120] rounded-xl overflow-hidden bg-[#150B05]">
            <button
              type="button"
              onClick={() => setFontPickerOpen((prev) => !prev)}
              className="w-full h-11 sm:h-12 flex items-center justify-between px-3 sm:px-4 hover:bg-[#25150C] transition-colors cursor-pointer select-none text-left"
            >
              <div className="flex items-center gap-2 sm:gap-3 overflow-hidden flex-1 min-w-0 mr-2">
                <span className="text-xs sm:text-sm font-bold text-[#FFEB75] shrink-0 whitespace-nowrap">
                  Font: <strong className="text-white font-black">{currentFont?.name}</strong>
                </span>
                {currentFont && (
                  <div className="flex-1 max-w-[180px] sm:max-w-[280px] shrink overflow-hidden">
                    <BitmapFontPreview font={currentFont} text={text} convertTurkish={convertTurkish} />
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1.5 text-xs text-[#D8AF86] font-bold shrink-0">
                <span>{fontPickerOpen ? "Kapat" : "Değiştir"}</span>
                <ChevronDown
                  size={16}
                  className={cn("transition-transform duration-200 text-amber-400", fontPickerOpen && "rotate-180")}
                />
              </div>
            </button>

            {fontPickerOpen && (
              <div className="p-3 border-t-2 border-[#4E3120] bg-[#120803] space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-56 overflow-y-auto scrollbar-thin scrollbar-thumb-amber-700 pr-1">
                  {allFonts.map((font) => {
                    const isSelected = selectedFontId === font.id;
                    return (
                      <button
                        key={font.id}
                        type="button"
                        onClick={() => {
                          setSelectedFontId(font.id);
                          setFontPickerOpen(false);
                        }}
                        className={cn(
                          "p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2",
                          isSelected
                            ? "bg-amber-500/15 border-amber-500/60 shadow-sm"
                            : "bg-[#1E1008] border-[#3D2517] hover:border-amber-500/40"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white truncate">{font.name}</span>
                          {isSelected && <CheckCircle2 size={13} className="text-amber-400 shrink-0" />}
                        </div>
                        <div className="w-full flex items-center justify-center my-0.5">
                          <BitmapFontPreview font={font} text={text} convertTurkish={convertTurkish} />
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-[#A68870] font-semibold pt-1 border-t border-[#3D2517]">
                          <span>{font.height} Hücre Yükseklik</span>
                          <span>{font.supportedChars.length} Glif</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* d) 3. Kutu / Satır: Ayar Şeridi */}
          <div className="bg-black/30 border border-amber-950/50 rounded-xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-y-2 gap-x-4 min-h-[44px] sm:min-h-[48px] text-xs font-bold text-[#EAD5BA]">
            {/* Yazı Boyutu */}
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-[#FFEB75] shrink-0">Yazı boyutu:</span>
              <input
                type="range"
                min={MIN_BITMAP_SCALE}
                max={MAX_BITMAP_SCALE}
                step={SCALE_STEP}
                value={scale}
                onChange={(e) => setScale(Number(e.target.value))}
                className="w-20 sm:w-28 accent-amber-500 cursor-pointer"
              />
              <span className="text-white font-mono text-xs shrink-0">
                {scale}x
                {result.wasScaledDown && (
                  <span className="text-amber-400 text-[10px] ml-1 font-bold">
                    ({result.effectiveScale}x)
                  </span>
                )}
              </span>
            </div>

            {/* Harf Aralığı */}
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-[#FFEB75] shrink-0">Harf aralığı:</span>
              <input
                type="range"
                min={0}
                max={4}
                step={1}
                value={letterSpacing}
                onChange={(e) => setLetterSpacing(Number(e.target.value))}
                className="w-16 sm:w-20 accent-amber-500 cursor-pointer"
              />
              <span className="text-white font-mono text-xs shrink-0">{letterSpacing}</span>
            </div>

            {/* Otomatik Sığdır Onay Kutusu */}
            <label className="flex items-center gap-2 cursor-pointer select-none shrink-0 hover:text-white">
              <input
                type="checkbox"
                checked={autoFit}
                onChange={(e) => setAutoFit(e.target.checked)}
                className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400 bg-[#150B05] border-[#4E3120] cursor-pointer"
              />
              <span className="text-xs">Otomatik sığdır</span>
            </label>
          </div>

          {/* (b) SAHNE PANELİ (Sabit 19.5/9 oran, Zoom/Pan, Oyun Tarzı Kontroller) */}
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
              "relative w-full max-w-[1100px] mx-auto overflow-hidden select-none touch-none rounded-xl border-3 border-[#28160C] shadow-2xl bg-[#0B111E] focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-shadow",
              isDragging
                ? dragInfoRef.current?.type === "pan"
                  ? "cursor-grabbing"
                  : "cursor-move"
                : cursorMode === "move"
                ? "cursor-move"
                : "cursor-grab"
            )}
            style={{
              aspectRatio: `${SCENE_ASPECT}`,
              maxHeight: "80vh",
            }}
          >
            {/* Canvas Rendering (3D Scenery + Walls) */}
            {viewMode === "3d" ? (
              <div
                className="absolute top-0 left-0 will-change-transform"
                style={{
                  width: `${currentScenery.naturalWidth}px`,
                  height: `${currentScenery.naturalHeight}px`,
                  transform: `translate3d(${panX}px, ${panY}px, 0px) scale(${
                    viewportSize.width > 0
                      ? Math.max(viewportSize.width / currentScenery.naturalWidth, viewportSize.height / currentScenery.naturalHeight) * zoom
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
              <div className="absolute inset-0 flex items-center justify-center p-4">
                <canvas
                  ref={canvas2dRef}
                  className="max-h-full max-w-full rounded-xl shadow-xl border border-amber-500/30"
                  style={{ aspectRatio: "1 / 1" }}
                />
              </div>
            )}

            {/* Scenery Loading Spinner Overlay */}
            {sceneryLoading && (
              <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-xs flex flex-col items-center justify-center gap-2 z-40 rounded-xl pointer-events-none">
                <div className="w-8 h-8 border-3 border-amber-400 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs text-amber-300 font-bold">Sahne Yükleniyor...</span>
              </div>
            )}

            {/* Floating Drag Indicator */}
            {isDragging && (
              <div className="absolute top-16 left-1/2 -translate-x-1/2 bg-[#1A1009]/95 text-amber-400 text-xs font-bold px-3 py-1.5 rounded-full border border-amber-500/60 shadow-xl backdrop-blur pointer-events-none flex items-center gap-2 z-30 animate-pulse">
                <Move size={14} className="text-amber-400" />
                <span>
                  {dragInfoRef.current?.type === "text"
                    ? `Yazı Taşınıyor: X: ${offsetX > 0 ? `+${offsetX}` : offsetX}, Y: ${offsetY > 0 ? `+${offsetY}` : offsetY}`
                    : `Sahne Kaydırılıyor (Zoom: ${zoom.toFixed(1)}x)`}
                </span>
              </div>
            )}

            {/* ── OYUN İÇİ KONTROLLER ── */}

            {/* TOP CENTER: Green Rotate Buttons & Degree Display */}
            <div className="absolute top-2 sm:top-3.5 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1.5 sm:gap-3 pointer-events-auto">
              <button
                type="button"
                {...ccwHold}
                className="game-btn-panel-green rounded-full w-8 h-8 sm:w-11 sm:h-11"
                title="Saat Yönünün Tersi Döndür (-15°)"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                  <path d="M3 3v5h5" />
                </svg>
              </button>

              <button
                type="button"
                onClick={resetRotation}
                onDoubleClick={resetRotation}
                className="flex items-center gap-1 sm:gap-1.5 px-2 py-0.5 sm:px-4 sm:py-1.5 rounded-full bg-[#180E08]/90 border border-[#3D2517] sm:border-2 backdrop-blur-sm cursor-pointer hover:border-amber-400 transition-colors shadow-lg active:scale-95"
                title="Açıyı Varsayılana (-45°) Sıfırla"
              >
                <span className="font-['Lilita_One'] text-sm sm:text-lg text-white tracking-wider game-text-stroke">
                  {rotation}°
                </span>
                {rotation % 45 !== 0 && (
                  <span title="Piksel harfleri bozabilir; 45° katları önerilir">
                    <AlertTriangle size={12} className="text-amber-400 animate-pulse" />
                  </span>
                )}
              </button>

              <button
                type="button"
                {...cwHold}
                className="game-btn-panel-green rounded-full w-8 h-8 sm:w-11 sm:h-11"
                title="Saat Yönünde Döndür (+15°)"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12a9 9 0 1 1-9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                  <path d="M21 3v5h-5" />
                </svg>
              </button>
            </div>

            {/* TOP LEFT: Corner NW (↖) Button */}
            <div className="absolute top-2 sm:top-3.5 left-2 sm:left-4 z-30 pointer-events-auto">
              <button
                type="button"
                {...nwHold}
                disabled={!canNudgeNW}
                className="game-btn-panel-green rounded-lg sm:rounded-xl w-8 h-8 sm:w-11 sm:h-11"
                title="Yazıyı Sütun Boyunca Yukarı-Sola Kaydır (Sütun -1)"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4 sm:w-6 sm:h-6" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 18L18 6M6 6h10M6 6v10" />
                </svg>
              </button>
            </div>

            {/* TOP RIGHT: 2D/3D Toggle Switch + Corner NE (↗) Button (8px gap, NE never obscured) */}
            <div className="absolute top-2 sm:top-3.5 right-2 sm:right-4 z-30 flex items-center gap-1.5 sm:gap-2 pointer-events-auto">
              {/* 2D / 3D Switch */}
              <div className="flex items-center p-0.5 rounded-lg sm:rounded-xl bg-[#22130A]/90 border border-[#3D2517] backdrop-blur-sm shadow-md">
                <button
                  type="button"
                  onClick={() => setViewMode("2d")}
                  className={cn(
                    "px-1.5 py-0.5 sm:px-2.5 sm:py-1 rounded text-[9px] sm:text-xs font-black transition-all cursor-pointer font-['Lilita_One']",
                    viewMode === "2d" ? "bg-amber-500 text-slate-950 shadow" : "text-amber-200/70 hover:text-white"
                  )}
                >
                  2D
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("3d")}
                  className={cn(
                    "px-1.5 py-0.5 sm:px-2.5 sm:py-1 rounded text-[9px] sm:text-xs font-black transition-all cursor-pointer font-['Lilita_One']",
                    viewMode === "3d" ? "bg-amber-500 text-slate-950 shadow" : "text-amber-200/70 hover:text-white"
                  )}
                >
                  3D
                </button>
              </div>

              {/* NE Arrow Button */}
              <button
                type="button"
                {...neHold}
                disabled={!canNudgeNE}
                className="game-btn-panel-green rounded-lg sm:rounded-xl w-8 h-8 sm:w-11 sm:h-11"
                title="Yazıyı Satır Boyunca Yukarı-Sağa Kaydır (Satır -1)"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4 sm:w-6 sm:h-6" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 18L18 6M8 6h10M18 6v10" />
                </svg>
              </button>
            </div>

            {/* RIGHT EDGE: Zoom + / − & Center Reset View */}
            <div className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-30 flex flex-col gap-1 sm:gap-1.5 pointer-events-auto">
              <button
                type="button"
                onClick={() => handleZoomStep(1.25)}
                disabled={zoom >= 4.0}
                className="game-btn-panel-green rounded-lg sm:rounded-xl w-7 h-7 sm:w-9 sm:h-9"
                title="Yakınlaştır (+)"
              >
                <Plus size={14} strokeWidth={3} className="sm:w-4 sm:h-4" />
              </button>
              <button
                type="button"
                onClick={() => handleZoomStep(1 / 1.25)}
                disabled={zoom <= 1.0}
                className="game-btn-panel-green rounded-lg sm:rounded-xl w-7 h-7 sm:w-9 sm:h-9"
                title="Uzaklaştır (−)"
              >
                <Minus size={14} strokeWidth={3} className="sm:w-4 sm:h-4" />
              </button>
              <button
                type="button"
                onClick={() => centerViewOnDiamond(1.0)}
                className="game-btn-panel-green rounded-lg sm:rounded-xl w-7 h-7 sm:w-9 sm:h-9 text-cyan-200"
                title="Görünümü Sıfırla (Ortala)"
              >
                <Crosshair size={14} strokeWidth={2.5} className="sm:w-4 sm:h-4" />
              </button>
            </div>

            {/* BOTTOM LEFT: Corner SW (↙) Button + Status Bar */}
            <div className="absolute bottom-2 sm:bottom-3.5 left-2 sm:left-4 z-30 flex items-center gap-2 pointer-events-auto">
              <button
                type="button"
                {...swHold}
                disabled={!canNudgeSW}
                className="game-btn-panel-green rounded-lg sm:rounded-xl w-8 h-8 sm:w-11 sm:h-11"
                title="Yazıyı Satır Boyunca Aşağı-Sola Kaydır (Satır +1)"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4 sm:w-6 sm:h-6" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6L6 18M6 18h10M6 18V8" />
                </svg>
              </button>

              {/* Status Pill */}
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#180E08]/90 border border-[#3A2317] backdrop-blur-sm shadow-md">
                <div className={cn("w-2 h-2 rounded-full", result.isOverBudget ? "bg-red-500 animate-pulse" : "bg-emerald-400")} />
                <span className={cn("text-xs font-black font-['Lilita_One'] tracking-wide", result.isOverBudget ? "text-red-400" : "text-[#FFEB75]")}>
                  {result.wallCount} / {maxWalls} duvar
                </span>
              </div>
            </div>

            {/* BOTTOM CENTER: Large Green Confirmation Checkmark Button */}
            <div className="absolute bottom-2 sm:bottom-3.5 left-1/2 -translate-x-1/2 z-30 pointer-events-auto">
              <button
                type="button"
                onClick={handleExportViewport2x}
                disabled={isExportingViewport}
                className="game-btn-panel-green rounded-xl sm:rounded-2xl w-11 h-11 sm:w-14 sm:h-14"
                title="Mevcut Görünümü 2 Kat Çözünürlükte PNG Olarak İndir"
              >
                {isExportingViewport ? (
                  <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg viewBox="0 0 24 24" className="w-5 h-5 sm:w-7 sm:h-7" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </button>
            </div>

            {/* BOTTOM RIGHT: Corner SE (↘) Button */}
            <div className="absolute bottom-2 sm:bottom-3.5 right-2 sm:right-4 z-30 pointer-events-auto">
              <button
                type="button"
                {...seHold}
                disabled={!canNudgeSE}
                className="game-btn-panel-green rounded-lg sm:rounded-xl w-8 h-8 sm:w-11 sm:h-11"
                title="Yazıyı Sütun Boyunca Aşağı-Sağa Kaydır (Sütun +1)"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4 sm:w-6 sm:h-6" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 6L18 18M8 18h10M18 8v10" />
                </svg>
              </button>
            </div>
          </div>

          {/* (c) AÇILIR KAPANIR "ARKA PLAN / SAHNE" PANELİ (Kapalıyken hafif öne çıkan ahşap panel) */}
          <div className="rounded-xl overflow-hidden border-2 border-[#673E26] shadow-[0_4px_10px_rgba(0,0,0,0.5),inset_0_1.5px_0_rgba(255,255,255,0.22)] bg-gradient-to-b from-[#563421] via-[#462A1B] to-[#361F12] transition-all">
            <button
              type="button"
              onClick={() => setIsSceneryOpen((prev) => !prev)}
              className="w-full h-11 sm:h-12 flex items-center justify-between px-3.5 sm:px-4 hover:brightness-110 active:brightness-95 transition-all cursor-pointer select-none text-left group"
            >
              <div className="flex items-center gap-2.5 text-xs sm:text-sm font-bold text-[#FFEB75] min-w-0 truncate">
                <div className="p-1 rounded-lg bg-[#24130A] border border-[#673E26] text-amber-400 shrink-0 shadow-inner">
                  <ImageIcon size={15} />
                </div>
                <span className="shrink-0 text-[#FFEB75]">Tema / Sahne:</span>
                <span className="text-white font-black truncate">{currentScenery.name}</span>
                <span className="hidden sm:inline text-[11px] text-[#C4A48A] font-mono shrink-0">
                  ({availableSceneries.length} Sahne)
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-[#EAD5BA] font-bold shrink-0 ml-2 group-hover:text-white transition-colors">
                <span>{isSceneryOpen ? "Kapat" : "Değiştir"}</span>
                <ChevronDown
                  size={16}
                  className={cn("transition-transform duration-200 text-amber-400", isSceneryOpen && "rotate-180")}
                />
              </div>
            </button>

            {isSceneryOpen && (
              <div className="p-3.5 border-t-2 border-[#24130A] bg-[#120803] space-y-2">
                <div className="grid grid-cols-3 sm:grid-cols-6 md:grid-cols-8 gap-2.5 max-h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-amber-700 p-1">
                  {availableSceneries.map((sc) => {
                    const isSelected = sc.id === selectedSceneryId;
                    return (
                      <button
                        key={sc.id}
                        type="button"
                        onClick={() => {
                          handleSelectScenery(sc.id);
                          centerViewOnDiamond(1.0);
                        }}
                        className={cn(
                          "relative rounded-xl overflow-hidden border-2 transition-all cursor-pointer aspect-square group",
                          isSelected
                            ? "border-amber-400 ring-2 ring-amber-400/50 scale-105 shadow-md shadow-amber-500/30 z-10"
                            : "border-[#3D2517] hover:border-amber-400/60 opacity-80 hover:opacity-100 hover:scale-102"
                        )}
                        title={`${sc.name} (${sc.naturalWidth}×${sc.naturalHeight})`}
                      >
                        <img
                          src={sc.thumb}
                          alt={sc.name}
                          loading="lazy"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-1 text-center">
                          <span className="text-[9px] font-bold text-white truncate block leading-tight">
                            {sc.name}
                          </span>
                        </div>
                        {isSelected && (
                          <div className="absolute top-1 right-1 bg-amber-400 text-slate-950 p-0.5 rounded-full shadow">
                            <Check size={10} strokeWidth={3} />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* (d) TEK SATIRLIK ÖZET */}
          <div className="bg-black/40 border border-amber-950/50 rounded-lg px-3 sm:px-4 py-2.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs sm:text-sm text-amber-100/90 font-medium">
            <div className="flex flex-wrap items-center gap-2 sm:gap-4">
              <span>
                Toplam: <strong className="text-amber-300 font-bold">{result.wallCount} / {maxWalls}</strong>
              </span>
              <span className="text-[#5A3824]">•</span>
              <span>
                Kalan: <strong className="text-amber-300 font-bold">{Math.max(0, maxWalls - result.wallCount)}</strong>
              </span>
              <span className="text-[#5A3824]">•</span>
              <span>
                Kapsama:{" "}
                <strong className="text-amber-300 font-bold">
                  {result.maxCol > 0 ? `${result.maxCol - result.minCol + 1}×${result.maxRow - result.minRow + 1}` : "0×0"}
                </strong>
              </span>
              <span className="text-[#5A3824]">•</span>
              <span>
                Harf yüksekliği:{" "}
                <strong className={cn("font-bold", result.isReadabilityLow ? "text-amber-400" : "text-emerald-400")}>
                  {result.capHeight} hücre
                </strong>
              </span>
            </div>

            <div className="text-[11px] text-[#A68870] font-mono shrink-0">
              {result.buildGuide.length} dolu satır / 44
            </div>
          </div>

          {/* Uyarılar (Yalnızca bütçe aşımı veya hata varsa) */}
          {(result.isOverBudget || !result.fitsInGrid || result.missingChars.length > 0 || (result.warnings && result.warnings.length > 0)) && (
            <div className="game-panel-wood p-2.5 rounded-xl border border-red-800/80 text-xs text-red-200 flex items-center gap-2">
              <AlertTriangle size={15} className="text-red-400 shrink-0" />
              <div className="flex flex-wrap items-center gap-2">
                {result.isOverBudget && (
                  <span className="font-bold">
                    Duvar sayısı bütçesi aşıldı ({result.wallCount} / {maxWalls})!
                  </span>
                )}
                {!result.fitsInGrid && (
                  <span className="font-bold">
                    Metin 44x44 ızgaraya sığmıyor!
                  </span>
                )}
                {result.missingChars.length > 0 && (
                  <span>
                    Desteklenmeyen karakterler: {result.missingChars.join(", ")}
                  </span>
                )}
                {result.warnings?.map((w, idx) => (
                  <span key={idx}>{w}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer Supercell Disclaimer */}
      <div className="text-center text-xs text-app-muted pt-3 border-t border-app-border/40">
        Supercell ile bağlantılı değildir, Fan Content Policy kapsamındadır.
      </div>
    </div>
  );
}
