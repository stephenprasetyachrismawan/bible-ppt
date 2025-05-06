import { Firestore } from 'firebase/firestore';
import { Auth } from 'firebase/auth';

declare module '@/lib/firebase' {
  export const db: Firestore;
  export const auth: Auth;
} 