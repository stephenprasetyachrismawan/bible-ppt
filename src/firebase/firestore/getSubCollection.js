import firebase_app from "../config";
import { getFirestore, collection, getDocs } from "firebase/firestore";

const db = getFirestore(firebase_app);

export default async function getSubCollection(...args) {
    let result = [];
    let error = null;
    let collectionRef;

    try {
        // Handle different levels of nesting
        if (args.length === 3) {
            // Original case: parentCollection, parentId, subCollection
            collectionRef = collection(db, args[0], args[1], args[2]);
        } else if (args.length === 5) {
            // Nested case: collection, id, subcollection, subId, subSubCollection
            collectionRef = collection(db, args[0], args[1], args[2], args[3], args[4]);
        } else if (args.length === 7) {
            // Deeply nested case for verses: bible, id, books, bookId, chapters, chapterId, verses
            collectionRef = collection(db, args[0], args[1], args[2], args[3], args[4], args[5], args[6]);
        } else {
            throw new Error("Invalid number of arguments for getSubCollection");
        }
        
        // Get all documents from the subcollection
        const querySnapshot = await getDocs(collectionRef);
        
        // Process the documents
        querySnapshot.forEach((doc) => {
            result.push({
                id: doc.id,
                ...doc.data()
            });
        });
    } catch (e) {
        error = e;
    }

    return { result, error };
} 