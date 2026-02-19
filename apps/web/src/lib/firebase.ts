import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: 'AIzaSyBwOIQ9sOufJAA0Mf98la0KMNYhy41uI2Q',
  authDomain: 'orion-ai-487801.firebaseapp.com',
  projectId: 'orion-ai-487801',
  storageBucket: 'orion-ai-487801.firebasestorage.app',
  messagingSenderId: '489484698044',
  appId: '1:489484698044:web:ca0f6c1288021d8e3e6bb9',
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)
