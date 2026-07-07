import { initializeApp, getApps, FirebaseApp } from "firebase/app"
import { getDatabase, Database } from "firebase/database"

const firebaseConfig = {
    databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
}

let app: FirebaseApp | undefined
let database: Database | undefined

export function getFirebaseApp(): FirebaseApp {
    if (!app) {
        const existing = getApps()
        app = existing.length > 0 ? existing[0] : initializeApp(firebaseConfig)
    }
    return app
}

export function getFirebaseDatabase(): Database {
    if (!database) {
        database = getDatabase(getFirebaseApp())
    }
    return database
}
