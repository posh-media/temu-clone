/**
 * Smoke test: exercises the same Firestore reads the app performs, using the
 * Firebase Web SDK (not REST), to confirm the security rules allow them.
 * Run with:  node --env-file=.env.local scripts/smoke-firestore.mjs
 */
import { initializeApp } from "firebase/app";
import { collection, doc, getDoc, getDocs, limit, query } from "firebase/firestore";
import { getFirestore } from "firebase/firestore";

const app = initializeApp({
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
});
const db = getFirestore(app);

const products = await getDocs(collection(db, "products"));
const visible = products.docs.filter((d) => d.get("display") !== false);
console.log(`products: ${products.size} docs, ${visible.length} visible`);

const first = visible[0];
console.log(`first visible: ${first.id} -> ${first.get("productName")}`);

const single = await getDoc(doc(db, "products", first.id));
console.log(`getDoc by id works: ${single.exists()}`);

const categories = await getDocs(query(collection(db, "categories"), limit(50)));
console.log(`categories: ${categories.size} docs`);

const orders = await getDocs(query(collection(db, "orders"), limit(5)));
console.log(`orders readable: ${orders.size} docs`);

// Fields that the UI must treat as optional.
const optional = ["description", "descriptionImgs", "productReviewsList", "sellerRef", "subCategory", "material"];
for (const field of optional) {
  const missing = visible.filter((d) => d.get(field) === undefined).length;
  console.log(`  optional "${field}": missing on ${missing} docs`);
}

console.log("SMOKE OK");
process.exit(0);
