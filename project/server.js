const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Estado do jogo
const gameState = {
  players: [],
  queue: [],
  currentGame: null,
  scores: {}
};

// Cores disponíveis
const availableColors = [
  '#FF5733', '#33FF57', '#3357FF', '#F333FF', 
  '#FF33F3', '#33FFF5', '#FFC733', '#7C33FF'
];

io.on('connection', (socket) => {
  console.log('Novo cliente conectado:', socket.id);

  // Enviar estado atual para o novo jogador
  socket.emit('update', gameState);

  // Lidar com novo jogador
  socket.on('register', (playerName) => {
    if (gameState.players.some(p => p.id === socket.id)) {
      return;
    }

    const color = availableColors[gameState.players.length % availableColors.length];
    const player = {
      id: socket.id,
      name: playerName,
      color,
      wins: 0
    };

    gameState.players.push(player);
    gameState.queue.push(player.id);
    gameState.scores[player.id] = 0;

    console.log(`Jogador registrado: ${playerName} (${socket.id})`);

    // Se houver pelo menos 2 jogadores e nenhum jogo em andamento, iniciar jogo
    if (gameState.queue.length >= 2 && !gameState.currentGame) {
      startNewGame();
    }

    io.emit('update', gameState);
  });

  // Lidar com movimento do jogador
  socket.on('move', (index) => {
    if (!gameState.currentGame || 
        gameState.currentGame.currentPlayer !== socket.id || 
        gameState.currentGame.board[index] !== null) {
      return;
    }

    const player = gameState.players.find(p => p.id === socket.id);
    gameState.currentGame.board[index] = player;
    gameState.currentGame.currentPlayer = 
      gameState.currentGame.player1 === socket.id ? 
      gameState.currentGame.player2 : gameState.currentGame.player1;

    // Verificar vitória
    const winner = checkWinner(gameState.currentGame.board);
    if (winner) {
      endGame(winner);
    } else if (gameState.currentGame.board.every(cell => cell !== null)) {
      endGame(null); // Empate
    }

    io.emit('update', gameState);
  });

  // Lidar com desconexão
  socket.on('disconnect', () => {
    console.log('Cliente desconectado:', socket.id);
    
    // Remover jogador da fila
    gameState.queue = gameState.queue.filter(id => id !== socket.id);
    
    // Se o jogador estava em um jogo em andamento, finalizar
    if (gameState.currentGame && 
        (gameState.currentGame.player1 === socket.id || 
         gameState.currentGame.player2 === socket.id)) {
      endGame(gameState.currentGame.player1 === socket.id ? 
              gameState.currentGame.player2 : gameState.currentGame.player1);
    }
    
    // Remover jogador da lista
    gameState.players = gameState.players.filter(p => p.id !== socket.id);
    delete gameState.scores[socket.id];
    
    io.emit('update', gameState);
  });

  // Função para iniciar novo jogo
  function startNewGame() {
    if (gameState.queue.length < 2) return;
    
    const player1Id = gameState.queue[0];
    const player2Id = gameState.queue[1];
    
    gameState.currentGame = {
      player1: player1Id,
      player2: player2Id,
      currentPlayer: player1Id,
      board: Array(9).fill(null)
    };
    
    // Remover jogadores da fila (eles serão readicionados no final do jogo)
    gameState.queue = gameState.queue.slice(2);
    
    console.log(`Novo jogo iniciado: ${player1Id} vs ${player2Id}`);
    io.emit('update', gameState);
  }

  // Função para verificar vencedor
  function checkWinner(board) {
    const winPatterns = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8], // linhas
      [0, 3, 6], [1, 4, 7], [2, 5, 8], // colunas
      [0, 4, 8], [2, 4, 6]             // diagonais
    ];

    for (const pattern of winPatterns) {
      const [a, b, c] = pattern;
      if (board[a] && board[a] === board[b] && board[a] === board[c]) {
        return board[a].id;
      }
    }
    return null;
  }

  // Função para finalizar jogo
  function endGame(winnerId) {
    if (!gameState.currentGame) return;
    
    const { player1, player2 } = gameState.currentGame;
    
    if (winnerId) {
      const winner = gameState.players.find(p => p.id === winnerId);
      winner.wins++;
      gameState.scores[winnerId]++;
      
      // Adicionar o vencedor de volta à fila na frente
      gameState.queue.unshift(winnerId);
      
      // Adicionar o perdedor no final da fila
      const loserId = winnerId === player1 ? player2 : player1;
      gameState.queue.push(loserId);
      
      console.log(`Jogo finalizado. Vencedor: ${winner.name}`);
    } else {
      // Em caso de empate, ambos voltam para a fila
      gameState.queue.push(player1, player2);
      console.log('Jogo finalizado em empate');
    }
    
    gameState.currentGame = null;
    
    // Iniciar novo jogo se houver jogadores suficientes
    if (gameState.queue.length >= 2) {
      startNewGame();
    }
    
    io.emit('update', gameState);
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
