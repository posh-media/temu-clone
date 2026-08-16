import axios from "axios";

const payload = {
  amount: 1000,
  currency: "NGN",
  reference: `test-ref-${Date.now()}`,
  customer: { name: "Test User", email: "test@example.com" },
  channels: ["card"],
  notification_url: "https://us-central1-temu-r-b-b-t-tn1fc3.cloudfunctions.net/korapayWebhook",
  redirect_url: "https://www.temupromo.shop/payment",
  narration: "Test order",
  metadata: { orderId: "ORD-TEMU-123" },
};

console.log("Payload:", JSON.stringify(payload, null, 2));

try {
  const res = await axios.post("https://api.korapay.com/merchant/api/v1/charges/initialize", payload, {
    headers: {
      Authorization: "Bearer sk_test_rLpJzAL7Kn388yTe1nBmLj6sEyyhDpcMWH3y9Dnp",
      "Content-Type": "application/json",
    },
    timeout: 20000,
  });
  console.log("Success:", res.status, res.data);
} catch (err) {
  console.log("Error status:", err.response?.status);
  console.log("Error data:", err.response?.data);
}
