// This approach is taken from https://github.com/vercel/next.js/tree/canary/examples/with-mongodb
import { MongoClient, ServerApiVersion } from "mongodb"

const options = {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
}

// Lazy singleton — resolved on first use so that `next build` (which runs
// without runtime env vars) can import this module without throwing.
// MONGODB_URI is validated at request time, not at module import/build time.
function getClient(): MongoClient {
  const uri = process.env.MONGODB_URI
  if (!uri) {
    throw new Error('Invalid/Missing environment variable: "MONGODB_URI"')
  }

  if (process.env.NODE_ENV === "development") {
    // In development mode, use a global variable so that the value
    // is preserved across module reloads caused by HMR (Hot Module Replacement).
    const globalWithMongo = global as typeof globalThis & {
      _mongoClient?: MongoClient
    }
    if (!globalWithMongo._mongoClient) {
      globalWithMongo._mongoClient = new MongoClient(uri, options)
    }
    return globalWithMongo._mongoClient
  }

  // In production mode, it's best to not use a global variable.
  return new MongoClient(uri, options)
}

// Export a module-scoped MongoClient promise. By doing this in a
// separate module, the client can be shared across functions.
// Callers must use getMongoClient() instead of the default export directly.
const clientPromise: Promise<MongoClient> = new Promise((resolve, reject) => {
  try {
    resolve(getClient())
  } catch (e) {
    reject(e)
  }
})

export default clientPromise