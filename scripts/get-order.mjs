import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc } from "firebase/firestore";

const app = initializeApp({
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
});
const db = getFirestore(app);

const id = process.argv[2];
if (!id) {
  console.error("Usage: node scripts/get-order.mjs <orderId>");
  process.exit(1);
}

const snap = await getDoc(doc(db, "orders", id));
if (!snap.exists()) {
  console.log("Order not found");
  process.exit(1);
}
const data = snap.data();
console.log(JSON.stringify(data, (k, v) => (typeof v === "bigint" ? v.toString() : v), 2));
