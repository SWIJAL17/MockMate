/**
 * PDF Parser — Extracts positioned text objects from PDF using PDF.js
 * 
 * Converts every text item into an object with exact coordinates, font info,
 * and styling — forming the editable document model.
 */

let pdfjsLib = null

/** Lazy-load PDF.js (client-side only) with robust worker fallback */
async function getPdfjs() {
  if (pdfjsLib) return pdfjsLib
  pdfjsLib = await import('pdfjs-dist')
  if (typeof window !== 'undefined') {
    const version = pdfjsLib.version || '4.9.155'
    // unpkg and jsdelivr provide reliable mirrors of npm packages
    const workerUrl = `https://unpkg.com/pdfjs-dist@${version}/build/pdf.worker.min.mjs`
    try {
      // Use a Blob URL to avoid CORS/Same-Origin restrictions on Web Workers
      const blob = new Blob([`import '${workerUrl}';`], { type: 'application/javascript' })
      pdfjsLib.GlobalWorkerOptions.workerSrc = URL.createObjectURL(blob)
    } catch (e) {
      // Direct CDN fallback
      pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl
    }
  }
  return pdfjsLib
}

/** Convert flexible input (ArrayBuffer, Uint8Array, base64 data URI, string) to Uint8Array with fresh copy */
function toUint8Array(input) {
  if (!input) throw new Error('No PDF file data provided')
  if (input instanceof Uint8Array) {
    // ALWAYS slice to create a copy so worker transfer never detaches original buffer
    return input.slice()
  }
  if (input instanceof ArrayBuffer) {
    // Slice ArrayBuffer to prevent detachment of original state
    return new Uint8Array(input.slice(0))
  }
  if (typeof input === 'string') {
    const base64 = input.includes(',') ? input.split(',')[1] : input
    const binary = window.atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i)
    }
    return bytes
  }
  return new Uint8Array(input).slice()
}

/** Generate a unique ID */
let idCounter = 0
function genId() {
  return `obj_${Date.now()}_${++idCounter}`
}

/**
 * Normalize PDF font name to a CSS-friendly font family
 */
function normalizeFontName(pdfFontName) {
  if (!pdfFontName) return 'sans-serif'
  const name = pdfFontName.toLowerCase()
  if (name.includes('times')) return 'Times New Roman, serif'
  if (name.includes('courier') || name.includes('mono')) return 'Courier New, monospace'
  if (name.includes('helvetica') || name.includes('arial') || name.includes('sans')) return 'Helvetica, Arial, sans-serif'
  if (name.includes('calibri')) return 'Calibri, sans-serif'
  if (name.includes('garamond')) return 'Garamond, serif'
  if (name.includes('georgia')) return 'Georgia, serif'
  if (name.includes('cambria')) return 'Cambria, serif'
  if (name.includes('palatino')) return 'Palatino, serif'
  // Return the raw name as fallback, stripping common PDF prefixes
  const cleaned = pdfFontName.replace(/^[A-Z]{6}\+/, '') // Remove ABCDEF+ prefix
  return `${cleaned}, sans-serif`
}

/**
 * Detect font weight from PDF font name
 */
function detectFontWeight(pdfFontName) {
  if (!pdfFontName) return 'normal'
  const name = pdfFontName.toLowerCase()
  if (name.includes('bold') || name.includes('heavy') || name.includes('black')) return 'bold'
  if (name.includes('light') || name.includes('thin')) return '300'
  if (name.includes('medium')) return '500'
  if (name.includes('semibold') || name.includes('demi')) return '600'
  return 'normal'
}

/**
 * Detect font style from PDF font name
 */
function detectFontStyle(pdfFontName) {
  if (!pdfFontName) return 'normal'
  const name = pdfFontName.toLowerCase()
  if (name.includes('italic') || name.includes('oblique')) return 'italic'
  return 'normal'
}

/**
 * Parse a single page's text content into positioned objects
 */
async function parsePage(page, pageIndex) {
  const viewport = page.getViewport({ scale: 1.0 })
  const textContent = await page.getTextContent()
  const objects = []
  if (!textContent || !textContent.items) return objects

  for (const item of textContent.items) {
    if (!item.str || item.str.trim() === '') continue

    // item.transform is [scaleX, skewX, skewY, scaleY, translateX, translateY]
    const tx = item.transform || [1, 0, 0, 1, 0, 0]
    const fontSize = Math.abs(tx[3]) || Math.abs(tx[0]) || 12
    const x = tx[4] || 0
    // Convert from PDF coords (bottom-left origin) to screen coords (top-left origin)
    const y = viewport.height - (tx[5] || 0) - fontSize
    const width = item.width || (item.str.length * fontSize * 0.5)
    const height = item.height || fontSize * 1.2

    const fontName = item.fontName || ''
    const fontFamily = normalizeFontName(fontName)
    const fontWeight = detectFontWeight(fontName)
    const fontStyle = detectFontStyle(fontName)

    // Detect color from styles if available
    let color = '#000000'
    if (item.color) {
      // Some PDF.js versions expose color
      color = `rgb(${Math.round(item.color[0] * 255)}, ${Math.round(item.color[1] * 255)}, ${Math.round(item.color[2] * 255)})`
    }

    objects.push({
      id: genId(),
      page: pageIndex,
      type: 'text',
      x: Math.round(x * 100) / 100,
      y: Math.round(y * 100) / 100,
      width: Math.round(width * 100) / 100,
      height: Math.round(height * 100) / 100,
      text: item.str,
      originalText: item.str,
      fontFamily,
      fontSize: Math.round(fontSize * 100) / 100,
      fontWeight,
      fontStyle,
      color,
      rotation: 0,
      letterSpacing: 0,
      lineHeight: 1.2,
      alignment: 'left',
      originalFontName: fontName,
      originalTransform: [...tx],
    })
  }

  return objects
}

/**
 * Group nearby text items on the same line into logical text blocks.
 * Items with the same Y position (within tolerance) and sequential X positions
 * are merged into a single block.
 */
function groupTextItems(objects, pageIndex) {
  const pageObjects = objects.filter(o => o.page === pageIndex)
  if (pageObjects.length === 0) return []

  // Sort by Y (top to bottom), then X (left to right)
  const sorted = [...pageObjects].sort((a, b) => {
    const yDiff = a.y - b.y
    if (Math.abs(yDiff) < 2) return a.x - b.x  // Same line
    return yDiff
  })

  const groups = []
  let currentGroup = [sorted[0]]

  for (let i = 1; i < sorted.length; i++) {
    const prev = currentGroup[currentGroup.length - 1]
    const curr = sorted[i]

    // Same line: similar Y position, similar font, and close X proximity
    const sameLine = Math.abs(curr.y - prev.y) < 3
    const sameFont = curr.fontFamily === prev.fontFamily &&
                     curr.fontSize === prev.fontSize &&
                     curr.fontWeight === prev.fontWeight
    const closeX = curr.x - (prev.x + prev.width) < curr.fontSize * 1.5

    if (sameLine && sameFont && closeX) {
      currentGroup.push(curr)
    } else {
      groups.push(currentGroup)
      currentGroup = [curr]
    }
  }
  groups.push(currentGroup)

  // Merge groups into single objects
  return groups.map(group => {
    if (group.length === 1) return group[0]

    const first = group[0]
    const last = group[group.length - 1]
    const mergedText = group.map(g => g.str || g.text).join('')
    const totalWidth = (last.x + last.width) - first.x

    return {
      ...first,
      id: genId(),
      text: mergedText,
      originalText: mergedText,
      width: totalWidth,
    }
  })
}

/**
 * Main parser: Load PDF and extract all text objects
 * @param {ArrayBuffer|Uint8Array|string} pdfBytes - The raw PDF file bytes or base64 string
 * @returns {{ pages: Array, objects: Array }}
 */
export async function parsePdf(pdfBytes) {
  const pdfjs = await getPdfjs()
  const data = toUint8Array(pdfBytes)
  const loadingTask = pdfjs.getDocument({ data })
  const pdf = await loadingTask.promise

  const pages = []
  let allObjects = []

  for (let i = 0; i < pdf.numPages; i++) {
    try {
      const page = await pdf.getPage(i + 1) // PDF.js pages are 1-indexed
      const viewport = page.getViewport({ scale: 1.0 })

      pages.push({
        pageIndex: i,
        width: viewport.width,
        height: viewport.height,
      })

      const rawObjects = await parsePage(page, i)
      const grouped = groupTextItems(rawObjects, i)
      allObjects = allObjects.concat(grouped)
    } catch (err) {
      console.warn(`Warning: Could not parse text on page ${i + 1}:`, err)
    }
  }

  return { pages, objects: allObjects }
}

const activeRenderTasks = new WeakMap()

/**
 * Render a single PDF page to a canvas element
 * @param {ArrayBuffer|Uint8Array|string} pdfBytes
 * @param {number} pageIndex - 0-based
 * @param {HTMLCanvasElement} canvas
 * @param {number} scale
 */
export async function renderPageToCanvas(pdfBytes, pageIndex, canvas, scale = 1.0) {
  if (!canvas) return
  const pdfjs = await getPdfjs()
  const data = toUint8Array(pdfBytes)
  const loadingTask = pdfjs.getDocument({ data })
  const pdf = await loadingTask.promise
  const page = await pdf.getPage(pageIndex + 1)
  const viewport = page.getViewport({ scale, rotation: page.rotate })

  // Cancel any previous render task on this canvas
  if (activeRenderTasks.has(canvas)) {
    try {
      const prevTask = activeRenderTasks.get(canvas)
      prevTask.cancel()
    } catch (e) {
      // Ignore cancellation error
    }
    activeRenderTasks.delete(canvas)
  }

  canvas.width = viewport.width
  canvas.height = viewport.height

  const ctx = canvas.getContext('2d')
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  const renderTask = page.render({
    canvasContext: ctx,
    viewport,
    intent: 'display',
  })

  activeRenderTasks.set(canvas, renderTask)

  try {
    await renderTask.promise
  } catch (err) {
    if (err?.name === 'RenderingCancelledException' || err?.message?.includes('cancelled')) {
      // Expected when zoom changes rapidly
      return { width: viewport.width, height: viewport.height }
    }
    throw err
  } finally {
    if (activeRenderTasks.get(canvas) === renderTask) {
      activeRenderTasks.delete(canvas)
    }
  }

  return { width: viewport.width, height: viewport.height }
}

