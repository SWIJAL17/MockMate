import { v4 as uuidv4 } from 'uuid'
import { getDb } from '@/lib/mockmate/db'

/**
 * Find or create a user record for OAuth sign-ins so session.user.id
 * is always the app's stable UUID (not the provider's subject id).
 */
export async function upsertOAuthUser({ email, name, image, provider }) {
  const cleanEmail = email.toLowerCase().trim()
  const db = await getDb()
  const usersCol = db.collection('users')

  const existing = await usersCol.findOne({ email: cleanEmail })
  if (existing) {
    const updates = { updatedAt: new Date() }
    if (name && !existing.name) updates.name = name
    if (image && !existing.image) updates.image = image
    if (provider && !existing.provider) updates.provider = provider
    if (Object.keys(updates).length > 1) {
      await usersCol.updateOne({ email: cleanEmail }, { $set: updates })
    }
    return existing
  }

  const now = new Date()
  const userDoc = {
    id: uuidv4(),
    name: name?.trim() || cleanEmail.split('@')[0],
    email: cleanEmail,
    image: image || null,
    provider: provider || 'oauth',
    createdAt: now,
    updatedAt: now,
  }
  await usersCol.insertOne(userDoc)
  return userDoc
}
