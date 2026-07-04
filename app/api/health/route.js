import { NextResponse } from 'next/server'
import { getDb } from '@/lib/mockmate/db'

// Lightweight liveness/readiness probe. Returns 200 when the app can talk to
// MongoDB, 503 otherwise. Safe to call frequently — does a cheap `ping` only.
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  try {
    const db = await getDb()
    await db.command({ ping: 1 })
    return NextResponse.json({ status: 'ok', db: 'ok' })
  } catch (err) {
    return NextResponse.json(
      { status: 'error', db: 'unreachable' },
      { status: 503 }
    )
  }
}
