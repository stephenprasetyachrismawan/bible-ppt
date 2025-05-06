import firebase_app from "../config";
import { getFirestore, doc, getDoc } from "firebase/firestore";

const db = getFirestore(firebase_app);

/**
 * Check if a document exists in Firestore
 * @param {...string} args - Path segments to the document
 * @returns {Promise<{exists: boolean, error: Error|null}>}
 */
export default async function documentExists(...args) {
    let docRef;
    let exists = false;
    let error = null;
    
    try {
        // Handle path segments for nested documents
        if (args.length === 2) {
            // collection, id
            docRef = doc(db, args[0], args[1]);
        } else if (args.length === 4) {
            // collection, id, subcollection, subId
            docRef = doc(db, args[0], args[1], args[2], args[3]);
        } else if (args.length === 6) {
            // collection, id, subcollection, subId, subSubCollection, subSubId
            docRef = doc(db, args[0], args[1], args[2], args[3], args[4], args[5]);
        } else if (args.length === 8) {
            // Very nested case
            docRef = doc(db, args[0], args[1], args[2], args[3], args[4], args[5], args[6], args[7]);
        } else {
            throw new Error("Invalid number of arguments for documentExists");
        }

        const docSnap = await getDoc(docRef);
        exists = docSnap.exists();
    } catch (e) {
        error = e;
        console.error("Error checking document existence:", e);
    }

    return { exists, error };
} 