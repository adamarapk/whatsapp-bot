// ======= index.js =======
import express from "express";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import { sendMessage } from "./sendMessage.js";
import { addPlayer, getPlayer, markAnswered, resetPlayer } from "./playerState.js";
import { validateAnswer } from "./validateAnswer.js";
import { logPlayerData } from "./logToSheets.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
app.use(bodyParser.json());

const playerStates = new Map();
const fallbackFeedbacks = [
  "Hmm... menarik, tapi coba pikirkan hubungan antar karakter.",
  "Motifnya belum kuat. Apakah ada bukti lain?",
  "Kamu hampir benar, tapi masih ada yang janggal."
];

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

app.post("/webhook", async (req, res) => {
  const entry = req.body.entry?.[0];
  const changes = entry?.changes?.[0]?.value;
  const message = changes?.messages?.[0];

  const from = message?.from;
  const text = message?.text?.body?.trim();

  if (!from || !text) return res.sendStatus(200);

  const state = playerStates.get(from);

  if (text.toLowerCase() === "reset") {
    playerStates.delete(from);
    await sendMessage(from, "🔄 Data Anda telah direset. Ketik NAMA: [nama Anda] untuk memulai ulang.");
    return res.sendStatus(200);
  }

  if (!state && text.toLowerCase().startsWith("nama:")) {
    const name = text.split(":")[1].trim();
    playerStates.set(from, { step: "mode", name });
    await sendMessage(from, `[Echo-8]\nTerima kasih, ${name}.\nPilih mode investigasi:\n1️⃣ EASY – hanya mencari pelaku\n2️⃣ HARD – pelaku + motif\nBalas dengan: MODE 1 atau MODE 2`);
    return res.sendStatus(200);
  }

  if (state?.step === "mode" && text.toLowerCase().startsWith("mode")) {
    const mode = text.includes("2") ? "hard" : "easy";
    const name = state.name;
    const startTime = Date.now();
    playerStates.set(from, { step: "main", name, mode, startTime, answered: false, clueUsed: false });

    await sendMessage(from, `[Echo-8]\nKasus #8802: Pria ditemukan tewas di dalam apartemen steril tanpa bukti kekerasan.\nKunci di dalam. CCTV rusak. Waktu kematian tidak konsisten.\n\nTiga tersangka. Satu kebohongan.\n\nWaktu investigasi: 30 menit.\nPetunjuk fisik telah Anda terima.\nKetik CLUE jika butuh bantuan tambahan.\n\nKetik JAWAB untuk mengirim jawaban akhir.`);
    return res.sendStatus(200);
  }

  if (text.toLowerCase() === "clue") {
    if (state?.step === "main" && !state.clueUsed) {
      state.clueUsed = true;
      await sendMessage(from, `[Echo-8]\n[Permintaan disetujui.]\n\n📎 Petunjuk tambahan:\nSalah satu tersangka *mengubah pernyataannya* antara wawancara pertama dan kedua.\nPeriksa kembali catatan waktu dan kata kuncinya.`);
    } else {
      await sendMessage(from, `⚠️ Petunjuk hanya dapat diminta satu kali.`);
    }
    return res.sendStatus(200);
  }

  if (text.toLowerCase() === "jawab") {
    if (state?.step === "main") {
      await sendMessage(from, `[Echo-8]\nMasukkan jawaban akhir Anda dalam format:\n\nNAMA PELAKU - MOTIF (jika mode HARD)\nContoh: ANDINI - Kecemburuan terhadap promosi kerja\n\nAtau cukup:\nNAMA PELAKU (jika mode EASY)`);
      state.step = "answering";
    } else {
      await sendMessage(from, `⚠️ Kamu belum bisa menjawab saat ini.`);
    }
    return res.sendStatus(200);
  }

  if (state?.step === "answering") {
    const elapsed = (Date.now() - state.startTime) / 60000;
    const correct = validateAnswer(text, state.mode);
    if (correct) {
      playerStates.set(from, { ...state, answered: true });
      await logPlayerData({
        name: state.name,
        phone: from,
        mode: state.mode,
        startTime: state.startTime,
        endTime: Date.now(),
      });
      await sendMessage(from, `[Echo-8]\n✅ Jawaban diterima dan valid.\n\nKasus #8802 ditutup dengan status: Tuntas.\nWaktu dan nama Anda telah tercatat di sistem.\n\nKebenaran tidak selalu bisa diungkap, tapi Anda sudah cukup dekat.`);

      // jeda lalu kirim pesan 'keceplosan'
      setTimeout(() => {
        sendMessage(from, `[Echo-8]\nApakah kamu menyelesaikan kasus, atau hanya bermain sesuai naskah?`);
      }, 3000);

      setTimeout(() => {
        sendMessage(from, `[SYSTEM]Terima kasih sudah bermain.`);
      }, 6000);

    } else {
      const feedback = fallbackFeedbacks[Math.floor(Math.random() * fallbackFeedbacks.length)];
      await sendMessage(from, `[Echo-8]\n⛔ Jawaban tidak sesuai dengan data investigasi kami.\n${feedback}\n\nKetik JAWAB untuk kirim ulang.`);
    }
    return res.sendStatus(200);
  }

  if (!state) {
    await sendMessage(from, `[Echo-8]\nSelamat datang, Detektif.\nSistem investigasi Infinity Case versi terbatas telah diaktifkan.\n\nSebutkan nama Anda untuk memulai.\nContoh: NAMA: Reza`);
  } else {
    await sendMessage(from, `⚠️ Input tidak dikenali. Ketik JAWAB atau CLUE sesuai tahap Anda.`);
  }

  res.sendStatus(200);
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
