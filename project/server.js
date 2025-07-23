const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;

// Servir arquivos estáticos
app.use(express.static(path.join(__dirname, 'public')));

// Estado do jogo
let players = new Map(); // socketId -> playerData
let queue = []; // fila de jogadores aguardando
let currentMatch = null; // partida atual
let rankings = new Map(); // playerId -> { name, color, wins }
let inactivityTimers = new Map(); // socketId -> timer

// Função para limpar timer de inatividade
function clearInactivityTimer(socketId) {
  if (inactivityTimers.has(socketId)) {
    clearTimeout(inactivityTimers.get(socketId));
    inactivityTimers.delete(socketId);
  }
}

// Função para iniciar timer de inatividade
function startInactivityTimer(socketId) {
  clearInactivityTimer(socketId);
  
  const timer = setTimeout(() => {
    const socket = io.sockets.sockets.get(socketId);
    if (socket) {
      io.emit('player-timeout', { playerId: socketId });
      removePlayer(socketId);
    }
  }, 30000); // 30 segundos
  
  inactivityTimers.set(socketId, timer);
}

// Função para remover jogador
function removePlayer(socketId) {
  clearInactivityTimer(socketId);
  
  const player = players.get(socketId);
  if (!player) return;
  
  // Remove da fila
  const queueIndex = queue.findIndex(p => p.id === socketId);
  if (queueIndex !== -1) {
    queue.splice(queueIndex, 1);
  }
  
  // Se está em uma partida, finaliza a partida
  if (currentMatch && (currentMatch.player1.id === socketId || currentMatch.player2.id === socketId)) {
    const winner = currentMatch.player1.id === socketId ? currentMatch.player2 : currentMatch.player1;
    
    // Adiciona vitória ao oponente
    if (!rankings.has(winner.id)) {
      rankings.set(winner.id, { name: winner.name, color: winner.color, wins: 0 });
    }
    rankings.get(winner.id).wins++;
    
    // Adiciona o vencedor de volta ao início da fila
    queue.unshift(winner);
    
    currentMatch = null;
    io.emit('match-ended', { 
      reason: 'opponent-disconnected',
      winner: winner.name
    });
    
    // Inicia próxima partida se possível
    setTimeout(startNextMatch, 2000);
  }
  
  players.delete(socketId);
  updateGameState();
}

// Função para iniciar próxima partida
function startNextMatch() {
  if (queue.length >= 2 && !currentMatch) {
    const player1 = queue.shift();
    const player2 = queue.shift();
    
    currentMatch = {
      player1,
      player2,
      board: Array(9).fill(null),
      currentPlayer: player1.id,
      gameStarted: true
    };
    
    // Inicia timers de inatividade para ambos jogadores
    startInactivityTimer(player1.id);
    startInactivityTimer(player2.id);
    
    io.emit('match-started', {
      player1: { name: player1.name, color: player1.color },
      player2: { name: player2.name, color: player2.color },
      currentPlayer: player1.id
    });
    
    updateGameState();
  }
}

// Função para atualizar estado do jogo
function updateGameState() {
  const gameState = {
    players: Array.from(players.values()).map(p => ({
      id: p.id,
      name: p.name,
      color: p.color
    })),
    queue: queue.map(p => ({ name: p.name, color: p.color })),
    currentMatch: currentMatch ? {
      player1: { name: currentMatch.player1.name, color: currentMatch.player1.color },
      player2: { name: currentMatch.player2.name, color: currentMatch.player2.color },
      board: currentMatch.board,
      currentPlayer: currentMatch.currentPlayer
    } : null,
    rankings: Array.from(rankings.values()).sort((a, b) => b.wins - a.wins)
  };
  
  io.emit('game-state', gameState);
}

// Função para verificar vitória
function checkWin(board) {
  const winPatterns = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // linhas
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // colunas
    [0, 4, 8], [2, 4, 6] // diagonais
  ];
  
  for (let pattern of winPatterns) {
    const [a, b, c] = pattern;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a], pattern };
    }
  }
  
  return null;
}

// Função para verificar empate
function checkDraw(board) {
  return board.every(cell => cell !== null);
}

// Eventos do socket
io.on('connection', (socket) => {
  console.log('Jogador conectado:', socket.id);
  
  socket.on('join-game', (data) => {
    const { name, color } = data;
    
    const player = {
      id: socket.id,
      name: name.trim(),
      color: color
    };
    
    players.set(socket.id, player);
    
    // Inicializa ranking se não existir
    if (!rankings.has(socket.id)) {
      rankings.set(socket.id, { name: player.name, color: player.color, wins: 0 });
    }
    
    // Adiciona à fila se não há partida ou se a partida já está cheia
    if (!currentMatch) {
      queue.push(player);
      startNextMatch();
    } else {
      queue.push(player);
    }
    
    socket.emit('joined-successfully', { playerId: socket.id });
    updateGameState();
  });
  
  socket.on('make-move', (data) => {
    const { position } = data;
    
    if (!currentMatch || !currentMatch.gameStarted) return;
    
    const player = players.get(socket.id);
    if (!player) return;
    
    // Verifica se é a vez do jogador
    if (currentMatch.currentPlayer !== socket.id) return;
    
    // Verifica se a posição está vazia
    if (currentMatch.board[position]) return;
    
    // Reinicia timer de inatividade
    startInactivityTimer(socket.id);
    
    // Determina o símbolo do jogador
    const symbol = currentMatch.player1.id === socket.id ? 'X' : 'O';
    
    // Faz a jogada
    currentMatch.board[position] = symbol;
    
    // Verifica vitória
    const winResult = checkWin(currentMatch.board);
    if (winResult) {
      const winner = currentMatch.player1.id === socket.id ? currentMatch.player1 : currentMatch.player2;
      const loser = currentMatch.player1.id === socket.id ? currentMatch.player2 : currentMatch.player1;
      
      // Atualiza ranking
      if (!rankings.has(winner.id)) {
        rankings.set(winner.id, { name: winner.name, color: winner.color, wins: 0 });
      }
      rankings.get(winner.id).wins++;
      
      // Limpa timers
      clearInactivityTimer(currentMatch.player1.id);
      clearInactivityTimer(currentMatch.player2.id);
      
      io.emit('match-ended', { 
        winner: winner.name,
        winPattern: winResult.pattern,
        board: currentMatch.board
      });
      
      // Reorganiza fila: vencedor vai para frente, perdedor para trás
      queue.unshift(winner);
      queue.push(loser);
      
      currentMatch = null;
      
      // Inicia próxima partida após 3 segundos
      setTimeout(startNextMatch, 3000);
    } else if (checkDraw(currentMatch.board)) {
      // Empate - ambos vão para o final da fila
      const player1 = currentMatch.player1;
      const player2 = currentMatch.player2;
      
      // Limpa timers
      clearInactivityTimer(player1.id);
      clearInactivityTimer(player2.id);
      
      queue.push(player1);
      queue.push(player2);
      
      io.emit('match-ended', { 
        draw: true,
        board: currentMatch.board
      });
      
      currentMatch = null;
      
      // Inicia próxima partida após 3 segundos
      setTimeout(startNextMatch, 3000);
    } else {
      // Troca turno
      currentMatch.currentPlayer = currentMatch.player1.id === socket.id ? 
        currentMatch.player2.id : currentMatch.player1.id;
      
      // Inicia timer para o próximo jogador
      startInactivityTimer(currentMatch.currentPlayer);
    }
    
    updateGameState();
  });
  
  socket.on('disconnect', () => {
    console.log('Jogador desconectado:', socket.id);
    removePlayer(socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});