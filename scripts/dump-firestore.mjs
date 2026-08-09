const KEY = process.env.FB_KEY;
const PROJECT = "temu-r-b-b-t-tn1fc3";
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;

function conv(v) {
  const t = Object.keys(v)[0];
  switch (t) {
    case "integerValue": return Number(v[t]);
    case "doubleValue": return v[t];
    case "booleanValue": return v[t];
    case "nullValue": return null;
    case "arrayValue": return (v[t].values || []).map(conv);
    case "mapValue": return unwrap(v[t].fields);
    case "referenceValue": return "REF:" + v[t].split("/documents/")[1];
    default: return v[t];
  }
}
const unwrap = (f) => Object.fromEntries(Object.entries(f || {}).map(([k, v]) => [k, conv(v)]));

async function all(name) {
  let token, docs = [];
  do {
    const url = `${BASE}/${name}?pageSize=300&key=${KEY}` + (token ? `&pageToken=${token}` : "");
    const r = await fetch(url);
    if (!r.ok) return { error: r.status };
    const d = await r.json();
    docs.push(...(d.documents || []).map((x) => ({ _id: x.name.split("/").pop(), ...unwrap(x.fields) })));
    token = d.nextPageToken;
  } while (token);
  return docs;
}

import fs from "node:fs";
fs.mkdirSync(".firestore-dump", { recursive: true });
for (const c of ["products", "categories", "sellers", "orders"]) {
  const d = await all(c);
  fs.writeFileSync(`.firestore-dump/${c}.json`, JSON.stringify(d, null, 1), "utf8");
  console.log(c, Array.isArray(d) ? d.length : d);
}
