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

// Servir arquivos estáticos
app.use(express.static(path.join(__dirname, 'public')));

// Estado do jogo
let gameState = {
  players: [], // Lista de todos os jogadores
  currentGame: {
    player1: null,
    player2: null,
    board: Array(9).fill(''),
    currentPlayer: 'X',
    gameActive: false
  },
  queue: [], // Fila de espera
  rankings: {} // Ranking de vitórias
};

// Função para resetar o tabuleiro
function resetBoard() {
  gameState.currentGame.board = Array(9).fill('');
  gameState.currentGame.currentPlayer = 'X';
  gameState.currentGame.gameActive = true;
}

// Função para verificar vitória
function checkWinner(board) {
  const winPatterns = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // Linhas
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // Colunas
    [0, 4, 8], [2, 4, 6] // Diagonais
  ];

  for (let pattern of winPatterns) {
    const [a, b, c] = pattern;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a];
    }
  }

  if (board.every(cell => cell !== '')) {
    return 'draw';
  }

  return null;
}

// Função para organizar próximo jogo
function organizeNextGame() {
  if (gameState.queue.length >= 2) {
    gameState.currentGame.player1 = gameState.queue.shift();
    gameState.currentGame.player2 = gameState.queue.shift();
    resetBoard();
    
    io.emit('gameStart', {
      player1: gameState.currentGame.player1,
      player2: gameState.currentGame.player2,
      board: gameState.currentGame.board
    });
  } else {
    gameState.currentGame.player1 = null;
    gameState.currentGame.player2 = null;
    gameState.currentGame.gameActive = false;
  }
}

// Função para atualizar rankings
function updateRankings() {
  const sortedPlayers = gameState.players
    .map(player => ({
      ...player,
      wins: gameState.rankings[player.id] || 0
    }))
    .sort((a, b) => b.wins - a.wins);
  
  io.emit('rankingsUpdate', sortedPlayers);
}

io.on('connection', (socket) => {
  console.log('Usuário conectado:', socket.id);

  // Jogador entra no jogo
  socket.on('joinGame', (playerData) => {
    const player = {
      id: socket.id,
      name: playerData.name,
      color: playerData.color
    };

    gameState.players.push(player);
    
    // Inicializar ranking se não existir
    if (!gameState.rankings[socket.id]) {
      gameState.rankings[socket.id] = 0;
    }

    // Adicionar à fila
    gameState.queue.push(player);

    // Emitir estado atual para todos
    io.emit('playersUpdate', {
      players: gameState.players,
      queue: gameState.queue,
      currentGame: gameState.currentGame
    });

    updateRankings();

    // Se não há jogo ativo e temos pelo menos 2 jogadores, iniciar jogo
    if (!gameState.currentGame.gameActive && gameState.queue.length >= 2) {
      organizeNextGame();
    }
  });

  // Jogada realizada
  socket.on('makeMove', (data) => {
    if (!gameState.currentGame.gameActive) return;
    
    const { cellIndex } = data;
    const isPlayer1 = socket.id === gameState.currentGame.player1?.id;
    const isPlayer2 = socket.id === gameState.currentGame.player2?.id;
    
    // Verificar se é a vez do jogador e se a célula está vazia
    if ((isPlayer1 && gameState.currentGame.currentPlayer === 'X') ||
        (isPlayer2 && gameState.currentGame.currentPlayer === 'O')) {
      
      if (gameState.currentGame.board[cellIndex] === '') {
        // Fazer a jogada
        gameState.currentGame.board[cellIndex] = gameState.currentGame.currentPlayer;
        
        // Verificar vitória
        const winner = checkWinner(gameState.currentGame.board);
        
        if (winner) {
          gameState.currentGame.gameActive = false;
          
          let winnerPlayer = null;
          let loserPlayer = null;
          
          if (winner === 'X') {
            winnerPlayer = gameState.currentGame.player1;
            loserPlayer = gameState.currentGame.player2;
          } else if (winner === 'O') {
            winnerPlayer = gameState.currentGame.player2;
            loserPlayer = gameState.currentGame.player1;
          }
          
          // Atualizar rankings
          if (winnerPlayer) {
            gameState.rankings[winnerPlayer.id]++;
            
            // Winner vai para o início da fila, loser vai para o fim
            gameState.queue.unshift(winnerPlayer);
            gameState.queue.push(loserPlayer);
          } else {
            // Empate - ambos vão para o fim da fila
            gameState.queue.push(gameState.currentGame.player1);
            gameState.queue.push(gameState.currentGame.player2);
          }
          
          // Emitir resultado do jogo
          io.emit('gameEnd', {
            winner: winner,
            winnerPlayer: winnerPlayer,
            board: gameState.currentGame.board
          });
          
          updateRankings();
          
          // Organizar próximo jogo após 3 segundos
          setTimeout(() => {
            organizeNextGame();
            io.emit('playersUpdate', {
              players: gameState.players,
              queue: gameState.queue,
              currentGame: gameState.currentGame
            });
          }, 3000);
          
        } else {
          // Alternar jogador
          gameState.currentGame.currentPlayer = gameState.currentGame.currentPlayer === 'X' ? 'O' : 'X';
        }
        
        // Emitir atualização do tabuleiro
        io.emit('boardUpdate', {
          board: gameState.currentGame.board,
          currentPlayer: gameState.currentGame.currentPlayer
        });
      }
    }
  });

  // Jogador desconecta
  socket.on('disconnect', () => {
    console.log('Usuário desconectou:', socket.id);
    
    // Remover das listas
    gameState.players = gameState.players.filter(p => p.id !== socket.id);
    gameState.queue = gameState.queue.filter(p => p.id !== socket.id);
    
    // Se um dos jogadores atuais desconectou, encerrar jogo
    if (gameState.currentGame.player1?.id === socket.id || 
        gameState.currentGame.player2?.id === socket.id) {
      
      gameState.currentGame.gameActive = false;
      io.emit('playerDisconnected', 'Um jogador desconectou. Reorganizando...');
      
      setTimeout(() => {
        organizeNextGame();
        io.emit('playersUpdate', {
          players: gameState.players,
          queue: gameState.queue,
          currentGame: gameState.currentGame
        });
      }, 2000);
    }
    
    // Atualizar todos os clientes
    io.emit('playersUpdate', {
      players: gameState.players,
      queue: gameState.queue,
      currentGame: gameState.currentGame
    });
    
    updateRankings();
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});