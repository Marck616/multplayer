class TicTacToeGame {
    constructor() {
        this.socket = io();
        this.currentPlayer = null;
        this.gameState = null;
        this.rankings = [];
        
        this.initializeEventListeners();
        this.setupSocketEvents();
    }

    initializeEventListeners() {
        // Form de login
        const loginForm = document.getElementById('loginForm');
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.joinGame();
        });

        // Cliques no tabuleiro
        const cells = document.querySelectorAll('.cell');
        cells.forEach((cell, index) => {
            cell.addEventListener('click', () => {
                this.makeMove(index);
            });
        });
    }

    setupSocketEvents() {
        // Atualização dos jogadores
        this.socket.on('playersUpdate', (data) => {
            this.updateGameState(data);
        });

        // Início de jogo
        this.socket.on('gameStart', (data) => {
            this.handleGameStart(data);
        });

        // Atualização do tabuleiro
        this.socket.on('boardUpdate', (data) => {
            this.updateBoard(data);
        });

        // Fim de jogo
        this.socket.on('gameEnd', (data) => {
            this.handleGameEnd(data);
        });

        // Atualização do ranking
        this.socket.on('rankingsUpdate', (rankings) => {
            this.updateRankings(rankings);
        });

        // Jogador desconectou
        this.socket.on('playerDisconnected', (message) => {
            this.showNotification(message, 'warning');
        });
    }

    joinGame() {
        const name = document.getElementById('playerName').value.trim();
        const color = document.querySelector('input[name="playerColor"]:checked').value;

        if (!name) {
            this.showNotification('Por favor, digite seu nome!', 'error');
            return;
        }

        this.currentPlayer = { name, color };
        
        this.socket.emit('joinGame', { name, color });
        
        // Trocar para tela do jogo
        document.getElementById('loginScreen').classList.remove('active');
        document.getElementById('gameScreen').classList.add('active');
        
        this.showNotification(`Bem-vindo, ${name}!`, 'success');
    }

    updateGameState(data) {
        this.gameState = data;
        this.updateQueue();
        this.updateGameStatus();
    }

    updateQueue() {
        const queueContainer = document.getElementById('queue');
        queueContainer.innerHTML = '';

        if (this.gameState.queue.length === 0) {
            queueContainer.innerHTML = '<p>Fila vazia</p>';
            return;
        }

        this.gameState.queue.forEach((player, index) => {
            const queueItem = document.createElement('div');
            queueItem.className = 'queue-item';
            
            queueItem.innerHTML = `
                <span class="queue-position">${index + 1}.</span>
                <div class="player-color" style="background-color: ${player.color};"></div>
                <span class="player-name">${player.name}</span>
            `;
            
            queueContainer.appendChild(queueItem);
        });
    }

    updateGameStatus() {
        const statusElement = document.getElementById('gameStatus');
        const playersContainer = document.getElementById('currentPlayers');
        
        if (!this.gameState.currentGame.gameActive) {
            if (this.gameState.queue.length < 2) {
                statusElement.textContent = 'Aguardando mais jogadores...';
                playersContainer.innerHTML = '';
            } else {
                statusElement.textContent = 'Preparando próximo jogo...';
            }
            return;
        }

        const { player1, player2, currentPlayer } = this.gameState.currentGame;
        
        // Atualizar jogadores atuais
        playersContainer.innerHTML = `
            <div class="player-card ${currentPlayer === 'X' ? 'active' : ''}" 
                 style="background-color: ${player1.color};">
                ${player1.name} (X)
            </div>
            <div class="player-card ${currentPlayer === 'O' ? 'active' : ''}" 
                 style="background-color: ${player2.color};">
                ${player2.name} (O)
            </div>
        `;

        // Atualizar status
        const currentPlayerName = currentPlayer === 'X' ? player1.name : player2.name;
        statusElement.textContent = `Vez de ${currentPlayerName}`;
    }

    handleGameStart(data) {
        this.showNotification('Novo jogo iniciado!', 'success');
        this.updateBoard({ board: data.board, currentPlayer: 'X' });
    }

    updateBoard(data) {
        const cells = document.querySelectorAll('.cell');
        
        cells.forEach((cell, index) => {
            const value = data.board[index];
            cell.textContent = value;
            cell.className = 'cell';
            
            if (value) {
                cell.classList.add(value.toLowerCase());
                cell.classList.add('taken');
            }
        });
    }

    makeMove(cellIndex) {
        if (!this.gameState.currentGame.gameActive) {
            this.showNotification('Nenhum jogo ativo!', 'warning');
            return;
        }

        const { player1, player2 } = this.gameState.currentGame;
        const isMyTurn = (this.socket.id === player1?.id && this.gameState.currentGame.currentPlayer === 'X') ||
                        (this.socket.id === player2?.id && this.gameState.currentGame.currentPlayer === 'O');

        if (!isMyTurn) {
            this.showNotification('Não é sua vez!', 'warning');
            return;
        }

        if (this.gameState.currentGame.board[cellIndex] !== '') {
            this.showNotification('Posição já ocupada!', 'warning');
            return;
        }

        this.socket.emit('makeMove', { cellIndex });
    }

    handleGameEnd(data) {
        const { winner, winnerPlayer } = data;
        
        setTimeout(() => {
            if (winner === 'draw') {
                this.showNotification('Empate!', 'warning');
            } else {
                this.showNotification(`${winnerPlayer.name} venceu!`, 'success');
            }
        }, 500);
    }

    updateRankings(rankings) {
        const rankingsContainer = document.getElementById('rankings');
        rankingsContainer.innerHTML = '';

        if (rankings.length === 0) {
            rankingsContainer.innerHTML = '<p>Nenhum jogador ainda</p>';
            return;
        }

        rankings.forEach((player, index) => {
            const rankingItem = document.createElement('div');
            rankingItem.className = 'ranking-item';
            
            if (index === 0) rankingItem.classList.add('first');
            else if (index === 1) rankingItem.classList.add('second');
            else if (index === 2) rankingItem.classList.add('third');
            
            rankingItem.innerHTML = `
                <div class="player-info">
                    <div class="player-color" style="background-color: ${player.color};"></div>
                    <span class="player-name">${player.name}</span>
                </div>
                <span class="player-wins">${player.wins} vitórias</span>
            `;
            
            rankingsContainer.appendChild(rankingItem);
        });
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        const container = document.getElementById('notifications');
        container.appendChild(notification);
        
        // Remove após 4 segundos
        setTimeout(() => {
            notification.remove();
        }, 4000);
    }
}

// Inicializar o jogo quando a página carregar
document.addEventListener('DOMContentLoaded', () => {
    new TicTacToeGame();
});