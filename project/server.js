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
app.use(express.static('public'));

// Rota principal
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Estado do jogo
let players = new Map(); // Map de socket.id para dados do jogador
let gameQueue = []; // Fila de jogadores esperando
let currentGame = null; // Jogo atual
let rankings = new Map(); // Rankings dos jogadores
let turnTimeout = null; // Timer para timeout do turno

class Game {
  constructor(player1, player2) {
    this.player1 = player1;
    this.player2 = player2;
    this.board = Array(9).fill(null);
    this.currentPlayer = player1.id;
    this.gameOver = false;
    this.winner = null;
  }

  makeMove(playerId, position) {
    if (this.gameOver || this.board[position] !== null || this.currentPlayer !== playerId) {
      return false;
    }

    const symbol = playerId === this.player1.id ? 'X' : 'O';
    this.board[position] = symbol;

    if (this.checkWinner()) {
      this.gameOver = true;
      this.winner = playerId;
    } else if (this.board.every(cell => cell !== null)) {
      this.gameOver = true;
      this.winner = 'draw';
    } else {
      this.currentPlayer = this.currentPlayer === this.player1.id ? this.player2.id : this.player1.id;
    }

    return true;
  }

  checkWinner() {
    const winPatterns = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8], // Linhas
      [0, 3, 6], [1, 4, 7], [2, 5, 8], // Colunas
      [0, 4, 8], [2, 4, 6] // Diagonais
    ];

    return winPatterns.some(pattern => {
      const [a, b, c] = pattern;
      return this.board[a] && this.board[a] === this.board[b] && this.board[a] === this.board[c];
    });
  }
}

function updateRankings(winnerId, loserId) {
  if (winnerId && winnerId !== 'draw') {
    const winner = players.get(winnerId);
    if (winner) {
      if (!rankings.has(winner.name)) {
        rankings.set(winner.name, { name: winner.name, color: winner.color, wins: 0 });
      }
      rankings.get(winner.name).wins++;
    }
  }

  // Garantir que todos os jogadores estejam no ranking
  players.forEach(player => {
    if (!rankings.has(player.name)) {
      rankings.set(player.name, { name: player.name, color: player.color, wins: 0 });
    }
  });
}

function clearTurnTimeout() {
  if (turnTimeout) {
    clearTimeout(turnTimeout);
    turnTimeout = null;
  }
}

function startTurnTimeout() {
  clearTurnTimeout();
  
  if (!currentGame || currentGame.gameOver) {
    return;
  }
  
  turnTimeout = setTimeout(() => {
    if (currentGame && !currentGame.gameOver) {
      const currentPlayerId = currentGame.currentPlayer;
      const currentPlayerData = players.get(currentPlayerId);
      
      if (currentPlayerData) {
        // Notificar que o jogador perdeu por timeout
        io.emit('playerTimeout', {
          timeoutPlayer: currentPlayerData.name,
          message: `${currentPlayerData.name} perdeu por inatividade (30s)`
        });
        
        // Determinar vencedor por timeout
        const winnerId = currentPlayerId === currentGame.player1.id ? 
          currentGame.player2.id : currentGame.player1.id;
        
        // Finalizar jogo
        currentGame.gameOver = true;
        currentGame.winner = winnerId;
        
        // Atualizar rankings
        updateRankings(winnerId, currentPlayerId);
        
        // Gerenciar fila: vencedor fica, perdedor vai para o final
        const winner = winnerId === currentGame.player1.id ? currentGame.player1 : currentGame.player2;
        const loser = currentPlayerId === currentGame.player1.id ? currentGame.player1 : currentGame.player2;
        
        gameQueue.unshift(winner);
        gameQueue.push(loser);
        
        // Enviar resultado
        setTimeout(() => {
          io.emit('gameEnded', {
            winner: winnerId,
            winnerName: players.get(winnerId)?.name,
            reason: 'timeout'
          });
          
          io.emit('rankingUpdated', getRankingArray());
          
          // Iniciar próximo jogo
          setTimeout(() => {
            startNextGame();
          }, 3000);
        }, 1000);
      }
    }
    turnTimeout = null;
  }, 30000); // 30 segundos
}

function startNextGame() {
  if (gameQueue.length >= 2) {
    const player1 = gameQueue.shift();
    const player2 = gameQueue.shift();
    
    currentGame = new Game(player1, player2);
    
    // Notificar todos sobre o novo jogo
    io.emit('gameStarted', {
      player1: player1,
      player2: player2,
      board: currentGame.board,
      currentPlayer: currentGame.currentPlayer
    });
    
    // Notificar sobre a fila atualizada
    io.emit('queueUpdated', gameQueue);
    
    // Iniciar timeout para o primeiro turno
    startTurnTimeout();
  }
}

function getRankingArray() {
  return Array.from(rankings.values()).sort((a, b) => b.wins - a.wins);
}

io.on('connection', (socket) => {
  console.log(`Usuário conectado: ${socket.id}`);

  socket.on('joinGame', (playerData) => {
    // Verificar se o nome já está em uso
    const nameExists = Array.from(players.values()).some(p => p.name === playerData.name);
    if (nameExists) {
      socket.emit('nameError', 'Este nome já está sendo usado. Escolha outro nome.');
      return;
    }

    const player = {
      id: socket.id,
      name: playerData.name,
      color: playerData.color
    };

    players.set(socket.id, player);
    
    // Adicionar ao ranking se não existir
    if (!rankings.has(player.name)) {
      rankings.set(player.name, { name: player.name, color: player.color, wins: 0 });
    }

    // Verificar se já há um jogo em andamento
    if (currentGame && !currentGame.gameOver) {
      // Adicionar à fila
      gameQueue.push(player);
      socket.emit('addedToQueue', gameQueue.length);
    } else {
      // Adicionar à fila para próximo jogo
      gameQueue.push(player);
      
      // Se há pelo menos 2 jogadores na fila, iniciar jogo
      if (gameQueue.length >= 2) {
        startNextGame();
      } else {
        socket.emit('waitingForPlayers');
      }
    }

    // Enviar estado atual para todos
    io.emit('playersUpdated', Array.from(players.values()));
    io.emit('queueUpdated', gameQueue);
    io.emit('rankingUpdated', getRankingArray());
  });

  socket.on('makeMove', (position) => {
    if (!currentGame || currentGame.gameOver || !players.has(socket.id)) {
      return;
    }

    if (currentGame.makeMove(socket.id, position)) {
      // Limpar timeout atual
      clearTurnTimeout();
      
      // Enviar estado do jogo atualizado
      io.emit('gameUpdated', {
        board: currentGame.board,
        currentPlayer: currentGame.currentPlayer,
        gameOver: currentGame.gameOver,
        winner: currentGame.winner
      });

      // Se o jogo terminou
      if (currentGame.gameOver) {
        let winnerId = currentGame.winner;
        let loserId = null;

        if (winnerId !== 'draw') {
          loserId = winnerId === currentGame.player1.id ? currentGame.player2.id : currentGame.player1.id;
          
          // Atualizar rankings
          updateRankings(winnerId, loserId);
          
          // Gerenciar fila: vencedor fica, perdedor vai para o final
          const winner = winnerId === currentGame.player1.id ? currentGame.player1 : currentGame.player2;
          const loser = loserId === currentGame.player1.id ? currentGame.player1 : currentGame.player2;
          
          // Colocar vencedor no início da fila e perdedor no final
          gameQueue.unshift(winner);
          gameQueue.push(loser);
        } else {
          // Empate: ambos vão para o final da fila
          gameQueue.push(currentGame.player1);
          gameQueue.push(currentGame.player2);
        }

        // Enviar resultado final
        setTimeout(() => {
          io.emit('gameEnded', {
            winner: winnerId,
            winnerName: winnerId !== 'draw' ? players.get(winnerId)?.name : 'Empate'
          });
          
          io.emit('rankingUpdated', getRankingArray());
          
          // Iniciar próximo jogo após 3 segundos
          setTimeout(() => {
            startNextGame();
          }, 3000);
        }, 1000);
      } else {
        // Iniciar timeout para o próximo turno
        startTurnTimeout();
      }
    }
  });

  socket.on('disconnect', () => {
    console.log(`Usuário desconectado: ${socket.id}`);
    
    // Limpar timeout se o jogador que desconectou estava jogando
    if (currentGame && !currentGame.gameOver && 
        (currentGame.player1.id === socket.id || currentGame.player2.id === socket.id)) {
      clearTurnTimeout();
    }
    
    const player = players.get(socket.id);
    if (player) {
      // Remover da fila
      const queueIndex = gameQueue.findIndex(p => p.id === socket.id);
      if (queueIndex !== -1) {
        gameQueue.splice(queueIndex, 1);
      }

      // Se o jogador estava no jogo atual, terminar o jogo
      if (currentGame && !currentGame.gameOver && 
          (currentGame.player1.id === socket.id || currentGame.player2.id === socket.id)) {
        
        const remainingPlayer = currentGame.player1.id === socket.id ? 
          currentGame.player2 : currentGame.player1;
        
        // Vencedor por abandono
        updateRankings(remainingPlayer.id, socket.id);
        
        io.emit('playerDisconnected', {
          disconnectedPlayer: player.name,
          winner: remainingPlayer
        });
        
        // Colocar o jogador restante de volta na fila
        gameQueue.unshift(remainingPlayer);
        
        // Iniciar próximo jogo
        setTimeout(() => {
          startNextGame();
        }, 2000);
      }

      players.delete(socket.id);
      
      // Atualizar todos os clientes
      io.emit('playersUpdated', Array.from(players.values()));
      io.emit('queueUpdated', gameQueue);
      io.emit('rankingUpdated', getRankingArray());
    }
  });
});

server.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
