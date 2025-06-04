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
    // RESET player
    if (text.toLowerCase() === "reset") {
      resetPlayer(from);
      await sendMessage(from, "✅ Data kamu sudah dihapus. Silakan mulai lagi dengan format: Namamu - easy/hard");
      res.sendStatus(200);
      return;
    }

    // Join Game
    if (/ - ?(easy|hard)/i.test(text)) {
      const [name, modeRaw] = text.split(" - ");
      const mode = modeRaw.trim().toLowerCase();
      addPlayer(from, name.trim(), mode);
      const clue = getClue(mode);
      await sendMessage(from, `Hai ${name.trim()}! Selamat datang di Unsolved Case.\nMode: ${mode}\n🕒 Timer dimulai sekarang.\n\nClue pertama:\n${clue}`);
    } 
    // Kirim jawaban
    else if (text.toLowerCase().startsWith("jawab:")) {
      const jawaban = text.slice(6).trim();
      const player = getPlayer(from);
      if (!player) {
        await sendMessage(from, "Kamu belum memulai permainan. Kirim: Namamu - easy/hard");
      } else {
        const elapsed = (Date.now() - player.startTime) / 60000;
        if (elapsed > 30) {
          await sendMessage(from, "⏳ Waktu habis! Kamu tidak berhasil memecahkan kasus ini.");
        } else if (player.answered) {
          await sendMessage(from, `✅ Kamu sudah menyelesaikan kasus ini sebelumnya sebagai ${player.name}. Kirim RESET untuk mengulang.`);
        } else {
          const isCorrect = validateAnswer(jawaban);
          if (isCorrect) {
            markAnswered(from);
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
      }
    } else {
      await sendMessage(from, "Kirim Namamu - easy/hard untuk memulai permainan.");
    }
  }

  res.sendStatus(200);
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
