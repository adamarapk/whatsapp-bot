import express from "express";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import { sendMessage } from "./sendMessage.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
app.use(bodyParser.json());

// Verifikasi webhook (GET)
app.get("/webhook", (req, res) => {
  const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// Menangani pesan masuk (POST)
app.post("/webhook", async (req, res) => {
  const entry = req.body.entry?.[0];
  const changes = entry?.changes?.[0]?.value;
  const message = changes?.messages?.[0];

  const from = message?.from;
  const text = message?.text?.body;

  if (text && from) {
    let reply = `Kamu mengirim: "${text}"`;

    // Contoh logika sederhana
    if (text.toLowerCase().includes("halo")) {
      reply = "Hai juga! 👋";
    }

    await sendMessage(from, reply);
  }

  res.sendStatus(200);
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
