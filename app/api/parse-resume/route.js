import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Parses an uploaded PDF resume and returns its plain text.
// Used by the AI interviewer / live interview setup forms.
export async function POST(request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file')
    if (!file || typeof file.arrayBuffer !== 'function') {
      return NextResponse.json({ error: 'No PDF file provided' }, { status: 400 })
    }
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'PDF too large (max 5MB)' }, { status: 413 })
    }
    const buffer = Buffer.from(await file.arrayBuffer())
    // Import the lib entry directly — pdf-parse's index.js runs debug code under ESM
    const pdfParse = (await import('pdf-parse/lib/pdf-parse.js')).default
    const data = await pdfParse(buffer)
    const text = (data.text || '').trim()
    if (!text) {
      return NextResponse.json({ error: 'Could not extract text — is this a scanned/image PDF?' }, { status: 422 })
    }
    return NextResponse.json({ text: text.slice(0, 20000), pages: data.numpages })
  } catch (err) {
    console.error('parse-resume error:', err.message)
    return NextResponse.json({ error: 'Failed to parse PDF' }, { status: 500 })
  }
}
