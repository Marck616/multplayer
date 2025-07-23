document.addEventListener('DOMContentLoaded', () => {
  const registrationContainer = document.getElementById('registration-container');
  const gameContainer = document.getElementById('game-container');
  const playerNameInput = document.getElementById('player-name');
  const registerBtn = document.getElementById('register-btn');
  const playerNameDisplay = document.getElementById('player-name-display');
  const winsCount = document.getElementById('wins-count');
  const boardElement = document.getElementById('board');
  const currentGameInfo = document.getElementById('current-game-info');
  const scoreTable = document.querySelector('#score-table tbody');
  const queueList = document.getElementById('queue-list');

  // Conectar ao servidor Socket.io
  const socket = io();

  let playerId = null;
  let playerName = null;
  let playerColor = null;
  let playerWins = 0;

  // Registrar jogador
  registerBtn.addEventListener('click', () => {
    const name = playerNameInput.value.trim();
    if (name.length < 2 || name.length > 12) {
      alert('Por favor, digite um nome entre 2 e 12 caracteres.');
      return;
    }

    playerName = name;
    playerNameDisplay.textContent = name;
    socket.emit('register', name);
  });

  // Atualizar interface com o estado do jogo
  socket.on('update', (state) => {
    if (!playerId && state.players.some(p => p.name === playerName)) {
      const player = state.players.find(p => p.name === playerName);
      playerId = player.id;
      playerColor = player.color;
      playerWins = player.wins;
      winsCount.textContent = `Vitórias: ${playerWins}`;
      
      // Mostrar a área do jogo
      registrationContainer.style.display = 'none';
      gameContainer.style.display = 'block';
    }

    if (playerId) {
      // Atualizar contagem de vitórias
      const player = state.players.find(p => p.id === playerId);
      if (player) {
        playerWins = player.wins;
        winsCount.textContent = `Vitórias: ${playerWins}`;
      }
    }

    // Atualizar placar
    updateScoreboard(state);

    // Atualizar fila
    updateQueue(state);

    // Atualizar tabuleiro e informações do jogo atual
    updateCurrentGame(state);
  });

  // Atualizar placar
  function updateScoreboard(state) {
    scoreTable.innerHTML = '';
    
    // Criar array de jogadores ordenados por vitórias
    const sortedPlayers = [...state.players].sort((a, b) => b.wins - a.wins);
    
    sortedPlayers.forEach((player, index) => {
      const row = document.createElement('tr');
      
      if (player.id === playerId) {
        row.classList.add('current-player');
      }
      
      row.innerHTML = `
        <td>${index + 1}</td>
        <td style="color: ${player.color}">${player.name}</td>
        <td>${player.wins}</td>
      `;
      
      scoreTable.appendChild(row);
    });
  }

  // Atualizar fila de jogadores
  function updateQueue(state) {
    queueList.innerHTML = '';
    
    state.queue.forEach((playerIdInQueue, index) => {
      const player = state.players.find(p => p.id === playerIdInQueue);
      if (player) {
        const li = document.createElement('li');
        li.style.color = player.color;
        li.textContent = player.name;
        
        if (playerIdInQueue === playerId) {
          li.classList.add('current-player');
        }
        
        queueList.appendChild(li);
      }
    });
  }

  // Atualizar jogo atual
  function updateCurrentGame(state) {
    if (!state.currentGame) {
      currentGameInfo.innerHTML = `
        <h3>Jogo Atual</h3>
        <p class="waiting-message">Aguardando jogadores suficientes para começar...</p>
      `;
      boardElement.innerHTML = '';
      return;
    }

    const player1 = state.players.find(p => p.id === state.currentGame.player1);
    const player2 = state.players.find(p => p.id === state.currentGame.player2);
    
    if (!player1 || !player2) return;
    
    // Atualizar informações do jogo
    let gameStatus = '';
    
    if (state.currentGame.currentPlayer === playerId) {
      gameStatus = `<p class="your-turn">É sua vez de jogar!</p>`;
    } else if (player1.id === playerId || player2.id === playerId) {
      const currentPlayer = state.players.find(p => p.id === state.currentGame.currentPlayer);
      gameStatus = `<p>Aguardando jogada de <span style="color: ${currentPlayer.color}">${currentPlayer.name}</span></p>`;
    } else {
      gameStatus = `<p>Assistindo: <span style="color: ${player1.color}">${player1.name}</span> vs <span style="color: ${player2.color}">${player2.name}</span></p>`;
    }
    
    currentGameInfo.innerHTML = `
      <h3>Jogo Atual</h3>
      <p><span style="color: ${player1.color}">${player1.name}</span> (X) vs <span style="color: ${player2.color}">${player2.name}</span> (O)</p>
      ${gameStatus}
    `;
    
    // Atualizar tabuleiro
    boardElement.innerHTML = '';
    state.currentGame.board.forEach((cell, index) => {
      const cellElement = document.createElement('div');
      cellElement.classList.add('cell');
      
      if (cell) {
        cellElement.textContent = cell.id === state.currentGame.player1 ? 'X' : 'O';
        cellElement.style.color = cell.color;
      }
      
      // Adicionar evento de clique apenas se for a vez do jogador e a célula estiver vazia
      if ((state.currentGame.currentPlayer === playerId) && 
          (player1.id === playerId || player2.id === playerId) && 
          !cell) {
        cellElement.addEventListener('click', () => {
          socket.emit('move', index);
        });
      }
      
      boardElement.appendChild(cellElement);
    });
  }
});
