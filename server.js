const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(__dirname));

let waitingPlayer = null;
const players = {};

io.on('connection', (socket) => {
  console.log('Player connected:', socket.id);
  socket.balance = 1000;

  if (waitingPlayer) {
    players[socket.id] = waitingPlayer;
    players[waitingPlayer.id] = socket;

    const hand1 = dealHand();
    const hand2 = dealHand();

    waitingPlayer.emit('deal', { hand: hand1 });
    socket.emit('deal', { hand: hand2 });

    waitingPlayer.hand = hand1;
    socket.hand = hand2;

    waitingPlayer = null;
  } else {
    waitingPlayer = socket;
  }

  socket.on('play', ({ action }) => {
    const opponent = players[socket.id];
    if (!opponent) return;

    let result = Math.random() > 0.5 ? socket : opponent;

    result.balance += 50;
    const loser = result === socket ? opponent : socket;
    loser.balance -= 50;

    socket.emit('result', {
      winner: result.id,
      newBalance: socket.balance,
    });

    opponent.emit('result', {
      winner: result.id,
      newBalance: opponent.balance,
    });
  });

  socket.on('disconnect', () => {
    console.log('Player disconnected:', socket.id);
    if (waitingPlayer === socket) waitingPlayer = null;
    delete players[socket.id];
  });
});

function dealHand() {
  const ranks = ['A', 'K', 'Q', 'J', '10'];
  const suits = ['♠', '♥', '♦', '♣'];
  return [1, 2].map(() => {
    const r = ranks[Math.floor(Math.random() * ranks.length)];
    const s = suits[Math.floor(Math.random() * suits.length)];
    return `${r}${s}`;
  });
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
