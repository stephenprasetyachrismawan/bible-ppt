import firebase_app from "../config";
import { getFirestore, doc, deleteDoc } from "firebase/firestore";

const db = getFirestore(firebase_app);

export default async function deleteSubCollectionDoc(...args) {
    let result = null;
    let error = null;
    let docRef;

    try {
        // Handle different levels of nesting
        if (args.length === 4) {
            // Original case: parentCollection, parentId, subCollection, docId
            docRef = doc(db, args[0], args[1], args[2], args[3]);
        } else if (args.length === 6) {
            // Nested case: collection, id, subcollection, subId, subSubCollection, docId
            docRef = doc(db, args[0], args[1], args[2], args[3], args[4], args[5]);
        } else if (args.length === 8) {
            // Deeply nested case for verses: bible, id, books, bookId, chapters, chapterId, verses, verseId
            docRef = doc(db, args[0], args[1], args[2], args[3], args[4], args[5], args[6], args[7]);
        } else {
            throw new Error("Invalid number of arguments for deleteSubCollectionDoc");
        }
        
        // Delete the document
        result = await deleteDoc(docRef);
    } catch (e) {
        error = e;
    }

    return { result, error };
} 