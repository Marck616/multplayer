// Conectar ao servidor Socket.IO
const socket = io();

// Elementos DOM
const loginScreen = document.getElementById('loginScreen');
const gameScreen = document.getElementById('gameScreen');
const loginForm = document.getElementById('loginForm');
const playerNameInput = document.getElementById('playerName');
const nameError = document.getElementById('nameError');
const gameBoard = document.getElementById('gameBoard');
const gameMessage = document.getElementById('gameMessage');
const currentPlayersDiv = document.getElementById('currentPlayers');
const rankingDiv = document.getElementById('ranking');
const queueDiv = document.getElementById('queue');

// Estado do jogo local
let currentPlayer = null;
let gameState = {
    board: Array(9).fill(null),
    currentTurn: null,
    isMyTurn: false,
    gameOver: false
};
let turnTimer = null;
let timeLeft = 30;

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
});

function setupEventListeners() {
    // Formulário de login
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        joinGame();
    });

    // Cliques no tabuleiro
    gameBoard.addEventListener('click', (e) => {
        if (e.target.classList.contains('cell')) {
            const position = parseInt(e.target.dataset.index);
            makeMove(position);
        }
    });
}

function joinGame() {
    const name = playerNameInput.value.trim();
    const color = document.querySelector('input[name="playerColor"]:checked').value;
    
    if (!name) {
        showError('Por favor, digite seu nome.');
        return;
    }
    
    if (name.length > 15) {
        showError('Nome deve ter no máximo 15 caracteres.');
        return;
    }

    hideError();
    
    const playerData = {
        name: name,
        color: color
    };
    
    socket.emit('joinGame', playerData);
}

function makeMove(position) {
    if (gameState.gameOver || gameState.board[position] !== null || !gameState.isMyTurn) {
        return;
    }
    
    socket.emit('makeMove', position);
}

function showError(message) {
    nameError.textContent = message;
    nameError.classList.add('show');
}

function hideError() {
    nameError.classList.remove('show');
}

function switchToGameScreen() {
    loginScreen.classList.remove('active');
    gameScreen.classList.add('active');
}

function updateBoard(board) {
    gameState.board = board;
    
    const cells = document.querySelectorAll('.cell');
    cells.forEach((cell, index) => {
        cell.textContent = board[index] || '';
        cell.className = 'cell';
        
        if (board[index] === 'X') {
            cell.classList.add('x');
        } else if (board[index] === 'O') {
            cell.classList.add('o');
        }
        
        if (gameState.gameOver || board[index] !== null) {
            cell.classList.add('disabled');
        }
    });
}

function updateCurrentPlayers(player1, player2, currentTurn) {
    currentPlayersDiv.innerHTML = '';
    
    if (player1 && player2) {
        const player1Div = createPlayerDisplay(player1, currentTurn === player1.id);
        const player2Div = createPlayerDisplay(player2, currentTurn === player2.id);
        
        currentPlayersDiv.appendChild(player1Div);
        currentPlayersDiv.appendChild(createVersusElement());
        currentPlayersDiv.appendChild(player2Div);
    }
}

function createPlayerDisplay(player, isActive) {
    const playerDiv = document.createElement('div');
    playerDiv.className = `current-player ${isActive ? 'active' : ''}`;
    
    const colorDiv = document.createElement('div');
    colorDiv.className = 'player-color';
    colorDiv.style.backgroundColor = player.color;
    
    const nameDiv = document.createElement('div');
    nameDiv.className = 'player-name';
    nameDiv.textContent = player.name;
    
    const symbolDiv = document.createElement('div');
    symbolDiv.textContent = player.id === socket.id ? 'X' : 'O';
    symbolDiv.style.fontSize = '1.5em';
    symbolDiv.style.fontWeight = 'bold';
    symbolDiv.style.color = player.id === socket.id ? '#e74c3c' : '#3498db';
    
    playerDiv.appendChild(colorDiv);
    playerDiv.appendChild(nameDiv);
    playerDiv.appendChild(symbolDiv);
    
    return playerDiv;
}

function createVersusElement() {
    const vsDiv = document.createElement('div');
    vsDiv.textContent = 'VS';
    vsDiv.style.fontSize = '1.5em';
    vsDiv.style.fontWeight = 'bold';
    vsDiv.style.color = '#666';
    return vsDiv;
}

function updateRanking(rankings) {
    rankingDiv.innerHTML = '';
    
    if (rankings.length === 0) {
        rankingDiv.innerHTML = '<div style="text-align: center; color: #666;">Nenhum jogador ainda</div>';
        return;
    }
    
    rankings.forEach((player, index) => {
        const rankingItem = document.createElement('div');
        rankingItem.className = 'ranking-item';
        
        const playerInfo = document.createElement('div');
        playerInfo.className = 'player-info';
        
        const position = document.createElement('div');
        position.textContent = `${index + 1}º`;
        position.style.fontWeight = 'bold';
        position.style.marginRight = '10px';
        position.style.color = index === 0 ? '#f39c12' : '#666';
        
        const colorDiv = document.createElement('div');
        colorDiv.className = 'player-color';
        colorDiv.style.backgroundColor = player.color;
        
        const nameDiv = document.createElement('div');
        nameDiv.className = 'player-name';
        nameDiv.textContent = player.name;
        
        const winsDiv = document.createElement('div');
        winsDiv.className = 'player-wins';
        winsDiv.textContent = `${player.wins} vitória${player.wins !== 1 ? 's' : ''}`;
        
        playerInfo.appendChild(position);
        playerInfo.appendChild(colorDiv);
        playerInfo.appendChild(nameDiv);
        
        rankingItem.appendChild(playerInfo);
        rankingItem.appendChild(winsDiv);
        
        rankingDiv.appendChild(rankingItem);
    });
}

function updateQueue(queue) {
    queueDiv.innerHTML = '';
    
    if (queue.length === 0) {
        queueDiv.innerHTML = '<div style="text-align: center; color: #666;">Fila vazia</div>';
        return;
    }
    
    queue.forEach((player, index) => {
        const queueItem = document.createElement('div');
        queueItem.className = 'queue-item';
        
        const playerInfo = document.createElement('div');
        playerInfo.className = 'player-info';
        
        const colorDiv = document.createElement('div');
        colorDiv.className = 'player-color';
        colorDiv.style.backgroundColor = player.color;
        
        const nameDiv = document.createElement('div');
        nameDiv.className = 'player-name';
        nameDiv.textContent = player.name;
        
        const positionDiv = document.createElement('div');
        positionDiv.className = 'queue-position';
        positionDiv.textContent = index + 1;
        
        playerInfo.appendChild(colorDiv);
        playerInfo.appendChild(nameDiv);
        
        queueItem.appendChild(playerInfo);
        queueItem.appendChild(positionDiv);
        
        queueDiv.appendChild(queueItem);
    });
}

function updateGameMessage(message) {
    gameMessage.textContent = message;
}

function startTurnTimer() {
    clearTurnTimer();
    timeLeft = 30;
    
    if (!gameState.isMyTurn) {
        return;
    }
    
    turnTimer = setInterval(() => {
        timeLeft--;
        
        if (timeLeft <= 0) {
            clearTurnTimer();
            updateGameMessage('Tempo esgotado! Você perdeu por inatividade.');
        } else {
            updateGameMessage(`Sua vez! Tempo restante: ${timeLeft}s`);
        }
    }, 1000);
}

function clearTurnTimer() {
    if (turnTimer) {
        clearInterval(turnTimer);
        turnTimer = null;
    }
}
function showGameResult(winner, winnerName) {
    let message;
    let className;
    
    if (winner === 'draw') {
        message = '🤝 Empate!';
        className = 'game-draw';
    } else if (winner === socket.id) {
        message = '🎉 Você venceu!';
        className = 'game-winner';
    } else {
        message = `😔 ${winnerName} venceu!`;
        className = 'game-draw';
    }
    
    const resultDiv = document.createElement('div');
    resultDiv.className = className;
    resultDiv.textContent = message;
    
    const gameStatus = document.querySelector('.game-status');
    gameStatus.appendChild(resultDiv);
    
    // Remover mensagem após 5 segundos
    setTimeout(() => {
        if (resultDiv.parentNode) {
            resultDiv.parentNode.removeChild(resultDiv);
        }
    }, 5000);
}

// Event Listeners do Socket.IO
socket.on('nameError', (message) => {
    showError(message);
});

socket.on('addedToQueue', (position) => {
    switchToGameScreen();
    updateGameMessage(`Você está na posição ${position} da fila. Aguarde sua vez!`);
});

socket.on('waitingForPlayers', () => {
    switchToGameScreen();
    updateGameMessage('Aguardando mais jogadores...');
});

socket.on('gameStarted', (data) => {
    gameState.gameOver = false;
    gameState.currentTurn = data.currentPlayer;
    gameState.isMyTurn = data.currentPlayer === socket.id;
    
    updateBoard(data.board);
    updateCurrentPlayers(data.player1, data.player2, data.currentPlayer);
    
    if (data.player1.id === socket.id || data.player2.id === socket.id) {
        if (gameState.isMyTurn) {
            updateGameMessage('Sua vez! Tempo restante: 30s');
            startTurnTimer();
        } else {
            const opponent = data.player1.id === socket.id ? data.player2 : data.player1;
            updateGameMessage(`Vez de ${opponent.name}. Aguarde...`);
            clearTurnTimer();
        }
    } else {
        updateGameMessage(`${data.player1.name} vs ${data.player2.name} - Você está na fila.`);
        clearTurnTimer();
    }
});

socket.on('gameUpdated', (data) => {
    gameState.board = data.board;
    gameState.currentTurn = data.currentPlayer;
    gameState.isMyTurn = data.currentPlayer === socket.id;
    gameState.gameOver = data.gameOver;
    
    updateBoard(data.board);
    
    if (!gameState.gameOver) {
        if (gameState.isMyTurn) {
            updateGameMessage('Sua vez! Tempo restante: 30s');
            startTurnTimer();
        } else {
            updateGameMessage('Vez do oponente. Aguarde...');
            clearTurnTimer();
        }
    } else {
        clearTurnTimer();
    }
});

socket.on('gameEnded', (data) => {
    gameState.gameOver = true;
    clearTurnTimer();
    showGameResult(data.winner, data.winnerName);
    
    if (data.reason === 'timeout') {
        updateGameMessage(`Jogo finalizado por inatividade. Próximo jogo começará em breve...`);
    } else if (data.winner === 'draw') {
        updateGameMessage('Jogo empatado! Próximo jogo começará em breve...');
    } else {
        updateGameMessage(`${data.winnerName} venceu! Próximo jogo começará em breve...`);
    }
});

socket.on('playerTimeout', (data) => {
    clearTurnTimer();
    updateGameMessage(data.message);
});
socket.on('playerDisconnected', (data) => {
    clearTurnTimer();
    updateGameMessage(`${data.disconnectedPlayer} desconectou. ${data.winner.name} venceu por W.O.`);
    showGameResult(data.winner.id, data.winner.name);
});

socket.on('playersUpdated', (players) => {
    console.log('Jogadores online:', players.length);
});

socket.on('queueUpdated', (queue) => {
    updateQueue(queue);
});

socket.on('rankingUpdated', (rankings) => {
    updateRanking(rankings);
});

// Detectar desconexão
socket.on('disconnect', () => {
    clearTurnTimer();
    updateGameMessage('Conexão perdida. Tentando reconectar...');
});

socket.on('reconnect', () => {
    clearTurnTimer();
    updateGameMessage('Reconectado! Aguarde...');
    location.reload(); // Recarregar para sincronizar estado
});
