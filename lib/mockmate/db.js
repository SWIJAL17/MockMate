import { MongoClient } from 'mongodb'

let client
let dbPromise

/**
 * Get shared MongoDB database instance
 * @returns {Promise<import('mongodb').Db>}
 */
export async function getDb() {
  if (!global._mockmateDbPromise) {
    const url = process.env.MONGO_URL || 'mongodb://localhost:27017'
    const dbName = process.env.DB_NAME || 'mockmate'
    client = new MongoClient(url, { maxPoolSize: 20, minPoolSize: 2, maxIdleTimeMS: 60000 })
    global._mockmateDbPromise = client.connect().then(() => client.db(dbName))
  }
  return global._mockmateDbPromise
}
