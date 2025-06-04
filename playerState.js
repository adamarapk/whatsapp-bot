const players = new Map();

export function addPlayer(phone, name, mode) {
  players.set(phone, {
    name,
    mode,
    startTime: Date.now(),
    answered: false,
  });
}

export function getPlayer(phone) {
  return players.get(phone);
}

export function markAnswered(phone) {
  const player = players.get(phone);
  if (player) {
    player.answered = true;
    players.set(phone, player);
  }
}
