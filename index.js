// ======= index.js =======
import express from "express";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import { sendMessage } from "./sendMessage.js";
import { addPlayer, getPlayer, markAnswered, resetPlayer } from "./playerState.js";
import { getClue } from "./clues.js";
import { validateAnswer } from "./validateAnswer.js";
import { logPlayerData } from "./logToSheets.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
app.use(bodyParser.json());

const playerNames = new Map();

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
  const text = message?.text?.body;

  if (text && from) {
    const lowerText = text.toLowerCase().trim();

    // RESET player
    if (lowerText === "reset") {
      resetPlayer(from);
      playerNames.delete(from);
      await sendMessage(from, "✅ Data kamu sudah dihapus. Silakan ketik START untuk memulai kembali.");
      res.sendStatus(200);
      return;
    }

    // START
    if (lowerText === "start") {
      await sendMessage(from, "👋 Selamat datang di Unsolved Case!\nSilakan daftar dengan format: Namamu - easy/hard");
      res.sendStatus(200);
      return;
    }

    // Join Game
    if (/ - ?(easy|hard)/i.test(text)) {
      const [name, modeRaw] = text.split(" - ");
      const nameClean = name.trim();
      const mode = modeRaw.trim().toLowerCase();
      playerNames.set(from, nameClean);
      addPlayer(from, nameClean, mode);
      await sendMessage(from, `🕵️‍♂️ Permainan kamu telah dimulai, ${nameClean}!\nMode: ${mode}\n⏱️ Waktu dimulai sekarang.`);
      if (mode === "easy") {
        await sendMessage(from, "Ketik *hint* jika kamu ingin melihat clue.");
      }
      res.sendStatus(200);
      return;
    }

    // Hint (mode easy only)
    if (lowerText === "hint") {
      const name = playerNames.get(from);
      const player = getPlayer(from, name);
      if (player && player.mode === "easy") {
        const clue = getClue("easy");
        await sendMessage(from, `📄 Clue: ${clue}`);
      } else {
        await sendMessage(from, "❌ Hint hanya tersedia untuk mode easy.");
      }
      res.sendStatus(200);
      return;
    }

    // Kirim jawaban
    if (lowerText.startsWith("jawab:")) {
      const name = playerNames.get(from);
      if (!name) {
        await sendMessage(from, "Kamu belum memulai permainan. Ketik START dulu.");
        res.sendStatus(200);
        return;
      }
      const player = getPlayer(from, name);
      if (!player) {
        await sendMessage(from, "Data pemain tidak ditemukan. Coba ketik RESET lalu mulai ulang.");
        res.sendStatus(200);
        return;
      }
      const elapsed = (Date.now() - player.startTime) / 60000;
      if (elapsed > 30) {
        await sendMessage(from, "⏳ Waktu habis! Kamu tidak berhasil memecahkan kasus ini.");
      } else if (player.answered) {
        await sendMessage(from, `✅ Kamu sudah menyelesaikan kasus ini sebelumnya sebagai ${player.name}. Ketik RESET untuk mengulang.`);
      } else {
        const jawaban = text.slice(6).trim();
        const isCorrect = validateAnswer(jawaban);
        if (isCorrect) {
          markAnswered(from, name);
          await logPlayerData({
            name: player.name,
            phone: from,
            mode: player.mode,
            startTime: player.startTime,
            endTime: Date.now(),
          });
          await sendMessage(from, `🎉 Selamat ${player.name}, kamu berhasil memecahkan kasus ini dalam ${elapsed.toFixed(1)} menit!`);
        } else {
          if (player.mode === "easy") {
            await sendMessage(from, "❌ Jawaban belum tepat. Hint: Perhatikan hubungan keluarga korban.");
          } else {
            await sendMessage(from, "Jawaban tidak valid.");
          }
        }
      }
      res.sendStatus(200);
      return;
    }

    // Default
    await sendMessage(from, "Ketik START untuk memulai permainan atau RESET untuk mengulang.");
  }

  res.sendStatus(200);
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
