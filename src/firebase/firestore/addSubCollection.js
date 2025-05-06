import firebase_app from "../config";
import { getFirestore, collection, doc, setDoc } from "firebase/firestore";

const db = getFirestore(firebase_app);

export default async function addSubCollectionDoc(...args) {
    let result = null;
    let error = null;
    let docRef;
    let data;

    try {
        // Handle different levels of nesting
        if (args.length === 5) {
            // Original case: parentCollection, parentId, subCollection, docId, data
            docRef = doc(db, args[0], args[1], args[2], args[3]);
            data = args[4];
        } else if (args.length === 7) {
            // Nested case: collection, id, subcollection, subId, subSubCollection, docId, data
            docRef = doc(db, args[0], args[1], args[2], args[3], args[4], args[5]);
            data = args[6];
        } else if (args.length === 9) {
            // Deeply nested case for verses: bible, id, books, bookId, chapters, chapterId, verses, verseId, data
            docRef = doc(db, args[0], args[1], args[2], args[3], args[4], args[5], args[6], args[7]);
            data = args[8];
        } else {
            throw new Error("Invalid number of arguments for addSubCollectionDoc");
        }
        
        // Add the document with merge option
        result = await setDoc(docRef, data, {
            merge: true,
        });
    } catch (e) {
        error = e;
    }

    return { result, error };
} 