import { NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { getDb } from '@/lib/mockmate/db'
import { hashPassword } from '@/lib/mockmate/password'

export async function POST(request) {
  try {
    const body = await request.json()
    const { name, email, password } = body

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Name, email, and password are required' },
        { status: 400 }
      )
    }

    const cleanEmail = email.toLowerCase().trim()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long' },
        { status: 400 }
      )
    }

    const db = await getDb()
    const usersCol = db.collection('users')

    const existingUser = await usersCol.findOne({ email: cleanEmail })
    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 409 }
      )
    }

    const passwordHash = await hashPassword(password)
    const now = new Date()
    const userDoc = {
      id: uuidv4(),
      name: name.trim(),
      email: cleanEmail,
      passwordHash,
      createdAt: now,
      updatedAt: now,
    }

    await usersCol.insertOne(userDoc)

    return NextResponse.json(
      {
        ok: true,
        user: { id: userDoc.id, name: userDoc.name, email: userDoc.email },
      },
      { status: 201 }
    )
  } catch (err) {
    console.error('Registration error:', err)
    return NextResponse.json(
      { error: 'Failed to create account. Please try again later.' },
      { status: 500 }
    )
  }
}
