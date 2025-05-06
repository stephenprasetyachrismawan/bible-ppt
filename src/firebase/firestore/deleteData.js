import firebase_app from "../config";
import { getFirestore, doc, deleteDoc } from "firebase/firestore";

const db = getFirestore(firebase_app);

export default async function deleteDocument(collection, id) {
    let result = null;
    let error = null;

    try {
        // Create reference to the document
        const docRef = doc(db, collection, id);
        
        // Delete the document
        result = await deleteDoc(docRef);
    } catch (e) {
        error = e;
    }

    return { result, error };
} 