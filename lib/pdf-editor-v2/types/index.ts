/**
 * Commercial-Grade PDF Resume Editor — Core Type Definitions
 * 
 * Enforces strict domain schemas for the Document Model, Rendering Engine,
 * Coordinate Engine, History Command Pattern, and Editor Store.
 */

export type ObjectType = 'text' | 'image' | 'icon' | 'shape' | 'line' | 'hyperlink' | 'table';
export type TextAlignment = 'left' | 'center' | 'right' | 'justify';
export type ModificationState = 'unmodified' | 'modified' | 'deleted' | 'inserted';
export type FitMode = 'width' | 'page' | 'custom';
export type ZoomLevel = 0.25 | 0.5 | 0.75 | 1.0 | 1.25 | 1.5 | 2.0 | 4.0 | 8.0 | number;

/**
 * Bounding box in PDF user space: [minX, minY, maxX, maxY]
 */
export type BoundingBox = [number, number, number, number];

/**
 * 2D Transformation Matrix: [a, b, c, d, tx, ty]
 * Specifically: [scaleX, skewY, skewX, scaleY, translateX, translateY]
 */
export type TransformMatrix = [number, number, number, number, number, number];

/**
 * Precise metrics for individual glyphs within a text block
 */
export interface GlyphMetric {
  char: string;
  x: number;
  width: number;
  advance: number;
}

/**
 * Editable Document Model Object
 * Represents any selectable/editable element on a PDF page.
 */
export interface DocumentObject {
  /** Stable UUID for modification tracking across edits */
  id: string;
  /** 0-indexed page number */
  page: number;
  /** Element type */
  type: ObjectType;
  /** Exact bounding box in PDF user space [minX, minY, maxX, maxY] */
  boundingBox: BoundingBox;
  /** Original PDF coordinates in user space [minX, minY, maxX, maxY] */
  originalPdfCoordinates?: BoundingBox;
  /** Viewport coordinates in top-left space [left, top, right, bottom] */
  viewportCoordinates?: BoundingBox;
  /** Transformation matrix in PDF user space */
  transformMatrix: TransformMatrix;
  /** Normalized CSS font family name */
  font: string;
  /** Canonical CSS font family name */
  fontFamily?: string;
  /** Original PDF internal font name (for export embedding) */
  originalFontName?: string;
  /** Embedded PDF font name */
  embeddedFontName?: string;
  /** Font size in PDF user space points */
  fontSize: number;
  /** Font weight ('normal', 'bold', '300', '600', etc.) */
  fontWeight: string;
  /** Font style ('normal', 'italic') */
  fontStyle: string;
  /** Fill color in Hex (#RRGGBB) or rgb() */
  fillColor: string;
  /** Stroke color in Hex (#RRGGBB) or rgb() */
  strokeColor: string;
  /** Opacity (0 to 1) */
  opacity?: number;
  /** Rotation angle in degrees */
  rotation?: number;
  /** Y-baseline offset from bottom of bounding box */
  baseline?: number;
  /** Font ascent metric in PDF points */
  ascent?: number;
  /** Font descent metric in PDF points (usually negative or 0) */
  descent?: number;
  /** Font cap height metric in PDF points */
  capHeight?: number;
  /** Array of individual character advance widths */
  glyphWidths?: number[];
  /** Detailed character-level width metrics */
  glyphMetrics?: GlyphMetric[];
  /** Letter spacing in points */
  letterSpacing?: number;
  /** Word spacing in points */
  wordSpacing?: number;
  /** Horizontal scaling ratio (default 1.0 or 100) */
  horizontalScaling?: number;
  /** Line height ratio (default 1.2) */
  lineHeight?: number;
  /** Paragraph text alignment */
  alignment?: TextAlignment;
  /** Current editable string content */
  text: string;
  /** Pristine original string content from upload */
  originalText?: string;
  /** Current edited text string */
  editedText?: string;
  /** Tracking state for diff-based surgical export */
  modificationState: ModificationState;
  /** Screen coordinate X (top-left origin, calculated by Coordinate Engine) */
  screenX: number;
  /** Screen coordinate Y (top-left origin, calculated by Coordinate Engine) */
  screenY: number;
  /** Screen width */
  screenWidth: number;
  /** Screen height */
  screenHeight: number;
}

/**
 * PDF Page Viewport Metadata
 */
export interface PageViewportInfo {
  pageIndex: number;
  /** Physical page width in PDF points */
  pdfWidth: number;
  /** Physical page height in PDF points */
  pdfHeight: number;
  /** Native page rotation from PDF metadata (0, 90, 180, 270) */
  rotation: number;
  /** Current rendered viewport width in CSS pixels */
  viewportWidth: number;
  /** Current rendered viewport height in CSS pixels */
  viewportHeight: number;
}

/**
 * Command Pattern Interface for History Engine
 */
export interface HistoryCommand {
  id: string;
  type: 'InsertText' | 'DeleteText' | 'ReplaceText' | 'MoveObject' | 'ResizeObject' | 'FormatObject' | 'AIRewrite';
  timestamp: number;
  execute: () => void;
  undo: () => void;
}

/**
 * Selection Geometry & Resize Handles
 */
export type ResizeHandleType = 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'w' | 'e';

export interface SelectionState {
  selectedIds: Set<string>;
  hoveredId: string | null;
  isDragging: boolean;
  activeHandle: ResizeHandleType | null;
  dragStartX: number;
  dragStartY: number;
}

/**
 * Central Editor Store State Schema
 */
export interface EditorState {
  originalPdfBytes: Uint8Array | null;
  fileName: string;
  pages: PageViewportInfo[];
  currentPage: number;
  zoom: ZoomLevel;
  fitMode: FitMode;
  devicePixelRatio: number;
  objects: Record<string, DocumentObject>; // Map id -> DocumentObject for O(1) access
  pageObjectIds: Record<number, string[]>; // Map pageIndex -> array of object IDs
  selection: SelectionState;
  editingId: string | null;
  isLoading: boolean;
  isParsing: boolean;
  isExporting: boolean;
  isDirty: boolean;
  error: string | null;
}
