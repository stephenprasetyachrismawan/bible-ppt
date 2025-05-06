import firebase_app from "../config";
import { getFirestore, collection, getDocs, query, limit } from "firebase/firestore";

const db = getFirestore(firebase_app);

/**
 * Tests the connection to Firestore and returns diagnostic information
 * @returns {Promise<{success: boolean, collections: Array<string>, error: Error|null, config: object}>}
 */
export default async function testFirestoreConnection() {
    let success = false;
    let collections = [];
    let error = null;
    let config = {
        projectId: firebase_app.options.projectId,
        appId: firebase_app.options.appId,
        apiKey: "******" // Masked for security
    };

    try {
        // Attempt to list collections (requires proper security rules)
        const collectionsSnapshot = await getDocs(query(collection(db, "bible"), limit(1)));
        success = true;
        
        // Get some diagnostic info
        collections.push({
            name: "bible",
            count: collectionsSnapshot.size,
            isEmpty: collectionsSnapshot.empty,
            exists: !collectionsSnapshot.empty
        });
        
    } catch (e) {
        error = e;
        console.error("Firebase connection test error:", e);
    }

    return { success, collections, error, config };
} 