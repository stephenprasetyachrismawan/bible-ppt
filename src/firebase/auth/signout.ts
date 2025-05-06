import firebase_app from "../config";
import { signOut, getAuth } from "firebase/auth";

const auth = getAuth(firebase_app);

export default async function signOutUser(): Promise<{ success: boolean; error: Error | null }> {
    let success = false;
    let error = null;
    try {
        await signOut(auth);
        success = true;
    } catch (e) {
        error = e as Error;
    }

    return { success, error };
}
