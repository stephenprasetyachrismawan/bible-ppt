import firebase_app from "../config";
import { getFirestore, collection, getDocs } from "firebase/firestore";

const db = getFirestore(firebase_app);

export default async function getAllDocuments(collectionName) {
    let result = [];
    let error = null;

    try {
        const querySnapshot = await getDocs(collection(db, collectionName));
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