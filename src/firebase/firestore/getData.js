import firebase_app from "../config";
import { getFirestore, doc, getDoc } from "firebase/firestore";

const db = getFirestore(firebase_app);

export default async function getDocument(...args) {
    let docRef;
    
    // Handle path segments for nested documents
    if (args.length === 2) {
        // Original case: collection, id
        docRef = doc(db, args[0], args[1]);
    } else if (args.length === 4) {
        // Nested case: collection, id, subcollection, subId
        docRef = doc(db, args[0], args[1], args[2], args[3]);
    } else if (args.length === 6) {
        // Deeply nested case for chapters: bible, id, books, bookId, chapters, chapterId
        docRef = doc(db, args[0], args[1], args[2], args[3], args[4], args[5]);
    } else if (args.length === 8) {
        // Extremely nested case for verses: bible, id, books, bookId, chapters, chapterId, verses, verseId
        docRef = doc(db, args[0], args[1], args[2], args[3], args[4], args[5], args[6], args[7]);
    } else {
        throw new Error("Invalid number of arguments for getDocument");
    }

    let result = null;
    let error = null;

    try {
        result = await getDoc(docRef);
    } catch (e) {
        error = e;
    }

    return { result, error };
}