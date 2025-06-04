const players = new Map();

function getKey(phone, name) {
  return `${phone}-${name}`;
}

export function addPlayer(phone, name, mode) {
  players.set(getKey(phone, name), {
    name,
    mode,
    startTime: Date.now(),
    answered: false,
  });
}

export function getPlayer(phone, name) {
  return players.get(getKey(phone, name));
}

export function markAnswered(phone, name) {
  const key = getKey(phone, name);
  const player = players.get(key);
  if (player) {
    player.answered = true;
    players.set(key, player);
  }
}

export function resetPlayer(phone) {
  // Hapus semua entri yang memiliki awalan key phone
  for (const key of players.keys()) {
    if (key.startsWith(`${phone}-`)) {
      players.delete(key);
    }
  }
}
