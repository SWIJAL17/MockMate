/**
 * PDF Exporter — Surgical modification of original PDF using pdf-lib
 * 
 * Only modified text objects are patched onto the original PDF.
 * Everything else remains pixel-identical.
 */

import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'

/**
 * Map CSS font family back to pdf-lib standard font
 */
function getStandardFont(fontFamily, fontWeight, fontStyle) {
  const family = (fontFamily || '').toLowerCase()
  const isBold = fontWeight === 'bold' || fontWeight === '700' || fontWeight === '600'
  const isItalic = fontStyle === 'italic'

  if (family.includes('times') || family.includes('serif')) {
    if (isBold && isItalic) return StandardFonts.TimesRomanBoldItalic
    if (isBold) return StandardFonts.TimesRomanBold
    if (isItalic) return StandardFonts.TimesRomanItalic
    return StandardFonts.TimesRoman
  }

  if (family.includes('courier') || family.includes('mono')) {
    if (isBold && isItalic) return StandardFonts.CourierBoldOblique
    if (isBold) return StandardFonts.CourierBold
    if (isItalic) return StandardFonts.CourierOblique
    return StandardFonts.Courier
  }

  // Default: Helvetica
  if (isBold && isItalic) return StandardFonts.HelveticaBoldOblique
  if (isBold) return StandardFonts.HelveticaBold
  if (isItalic) return StandardFonts.HelveticaOblique
  return StandardFonts.Helvetica
}

/**
 * Parse CSS color string to pdf-lib rgb
 */
function parseColor(colorStr) {
  if (!colorStr) return rgb(0, 0, 0)

  // Hex
  const hexMatch = colorStr.match(/^#([0-9a-f]{6})$/i)
  if (hexMatch) {
    const hex = hexMatch[1]
    return rgb(
      parseInt(hex.slice(0, 2), 16) / 255,
      parseInt(hex.slice(2, 4), 16) / 255,
      parseInt(hex.slice(4, 6), 16) / 255
    )
  }

  // rgb()
  const rgbMatch = colorStr.match(/rgb\(\s*(\d+),\s*(\d+),\s*(\d+)\s*\)/)
  if (rgbMatch) {
    return rgb(
      parseInt(rgbMatch[1]) / 255,
      parseInt(rgbMatch[2]) / 255,
      parseInt(rgbMatch[3]) / 255
    )
  }

  return rgb(0, 0, 0)
}

/** Convert flexible input (ArrayBuffer, Uint8Array, base64 data URI, string) to Uint8Array with fresh copy */
function toUint8Array(input) {
  if (!input) throw new Error('No PDF file data provided')
  if (input instanceof Uint8Array) {
    return input.slice()
  }
  if (input instanceof ArrayBuffer) {
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

/**
 * Export modified PDF
 * 
 * @param {ArrayBuffer|Uint8Array|string} originalBytes - Original uploaded PDF bytes or base64
 * @param {Array} allObjects - Complete objects array from the store
 * @param {Set} modifiedIds - Set of object IDs that have been modified
 * @param {Array} pages - Page info array [{ pageIndex, width, height }]
 * @returns {Uint8Array} - Modified PDF bytes
 */
export async function exportModifiedPdf(originalBytes, allObjects, modifiedIds, pages) {
  const data = toUint8Array(originalBytes)
  const pdfDoc = await PDFDocument.load(data, { ignoreEncryption: true })

  // Get only the modified objects
  const modifiedObjects = allObjects.filter(obj => modifiedIds.has(obj.id))

  if (modifiedObjects.length === 0) {
    // No modifications — return original
    return data
  }

  for (const obj of modifiedObjects) {
    if (obj.type !== 'text') continue

    const page = pdfDoc.getPage(obj.page)
    const pageHeight = page.getHeight()

    // Embed the appropriate standard font
    const stdFont = getStandardFont(obj.fontFamily, obj.fontWeight, obj.fontStyle)
    const font = await pdfDoc.embedFont(stdFont)

    const fontSize = obj.fontSize || 12
    const textColor = parseColor(obj.color)

    // Convert screen coordinates back to PDF coordinates (bottom-left origin)
    const pdfX = obj.x
    const pdfY = pageHeight - obj.y - fontSize

    // Draw white rectangle to cover original text
    const textWidth = font.widthOfTextAtSize(obj.text, fontSize)
    const padding = 2
    page.drawRectangle({
      x: pdfX - padding,
      y: pdfY - padding,
      width: Math.max(textWidth, obj.width) + padding * 2,
      height: fontSize + padding * 2,
      color: rgb(1, 1, 1), // White cover
    })

    // Draw new text at the exact position
    page.drawText(obj.text, {
      x: pdfX,
      y: pdfY,
      size: fontSize,
      font,
      color: textColor,
    })
  }

  const modifiedBytes = await pdfDoc.save()
  return modifiedBytes
}

/**
 * Trigger browser download of PDF bytes
 */
export function downloadPdf(bytes, fileName) {
  const blob = new Blob([bytes], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName || 'resume-edited.pdf'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
