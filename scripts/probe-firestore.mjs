// One-off inspection script: discovers Firestore collections/fields for planning.
const KEY = process.env.FB_KEY;
const PROJECT = process.env.FB_PROJECT || "temu-r-b-b-t-tn1fc3";
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;

const CANDIDATES = [
  "products", "product", "Products", "items", "collections", "categories", "category",
  "users", "carts", "cart", "cartItems", "orders", "order", "addresses", "address",
  "reviews", "banners", "favorites", "wishlist", "notifications", "brands", "shops",
  "ff_user_pushNotifications", "coupons", "deals", "payments",
];

async function tryListCollectionIds() {
  const res = await fetch(`${BASE}:listCollectionIds?key=${KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pageSize: 300 }),
  });
  console.log("listCollectionIds ->", res.status, (await res.text()).slice(0, 800));
}

function describe(fields, depth = 0) {
  const out = {};
  for (const [k, v] of Object.entries(fields || {})) {
    const t = Object.keys(v)[0];
    if (t === "mapValue" && depth < 2) out[k] = describe(v.mapValue.fields, depth + 1);
    else if (t === "arrayValue") {
      const first = v.arrayValue.values?.[0];
      out[k] = `array<${first ? Object.keys(first)[0] : "empty"}>[${v.arrayValue.values?.length ?? 0}]`;
    } else out[k] = `${t}: ${JSON.stringify(v[t]).slice(0, 80)}`;
  }
  return out;
}

async function probe(name) {
  const res = await fetch(`${BASE}/${name}?pageSize=2&key=${KEY}`);
  if (!res.ok) return { name, status: res.status };
  const data = await res.json();
  if (!data.documents) return { name, status: 200, empty: true };
  return {
    name,
    status: 200,
    count: data.documents.length,
    ids: data.documents.map((d) => d.name.split("/").pop()),
    sample: describe(data.documents[0].fields),
  };
}

await tryListCollectionIds();
for (const c of CANDIDATES) {
  const r = await probe(c);
  if (r.status === 200) console.log("\n=== FOUND:", c, "===\n", JSON.stringify(r, null, 2));
  else if (r.status !== 403 && r.status !== 404) console.log("?", c, r.status);
}
console.log("\ndone");
