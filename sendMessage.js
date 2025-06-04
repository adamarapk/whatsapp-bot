import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

export async function sendMessage(recipient, message) {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.PHONE_NUMBER_ID;

  try {
    await axios.post(
      `https://graph.facebook.com/v19.0/${phoneId}/messages`,
      {
        messaging_product: "whatsapp",
        to: recipient,
        text: { body: message },
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );
  } catch (err) {
    console.error("Gagal mengirim pesan:", err.response?.data || err.message);
  }
}
