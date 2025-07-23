class TicTacToeGame {
    constructor() {
        this.socket = io();
        this.currentPlayer = null;
        this.gameState = null;
        this.isMyTurn = false;
        
        this.initializeElements();
        this.bindEvents();
        this.setupSocketListeners();
    }
    
    initializeElements() {
        // Elementos da tela de login
        this.loginScreen = document.getElementById('login-screen');
        this.gameScreen = document.getElementById('game-screen');
        this.loginForm = document.getElementById('login-form');
        this.playerNameInput = document.getElementById('player-name');
        
        // Elementos do jogo
        this.gameBoard = document.getElementById('game-board');
        this.currentMatchDiv = document.getElementById('current-match');
        this.gameResult = document.getElementById('game-result');
        this.resultText = document.getElementById('result-text');
        this.resultSubtitle = document.getElementById('result-subtitle');
        this.queuePosition = document.getElementById('queue-position');
        
        // Elementos das listas
        this.rankingsList = document.getElementById('rankings');
        this.playersList = document.getElementById('players-list');
        this.queueList = document.getElementById('queue-list');
        
        // Container de notificações
        this.notifications = document.getElementById('notifications');
    }
    
    bindEvents() {
        // Submit do formulário de login
        this.loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.joinGame();
        });
        
        // Cliques no tabuleiro
        this.gameBoard.addEventListener('click', (e) => {
            if (e.target.classList.contains('cell')) {
                const position = parseInt(e.target.dataset.index);
                this.makeMove(position);
            }
        });
    }
    
    setupSocketListeners() {
        this.socket.on('joined-successfully', (data) => {
            this.currentPlayer = data.playerId;
            this.switchToGameScreen();
            this.showNotification('Conectado com sucesso!', 'success');
        });
        
        this.socket.on('game-state', (gameState) => {
            this.gameState = gameState;
            this.updateUI();
        });
        
        this.socket.on('match-started', (matchData) => {
            this.hideGameResult();
            this.showNotification(`Nova partida iniciada!`, 'info');
            this.updateMatchDisplay(matchData);
        });
        
        this.socket.on('match-ended', (result) => {
            this.showMatchResult(result);
            
            if (result.winner && !result.draw) {
                this.showNotification(`${result.winner} venceu a partida!`, 'success');
            } else if (result.draw) {
                this.showNotification('Partida terminou em empate!', 'warning');
            } else if (result.reason === 'opponent-disconnected') {
                this.showNotification(`${result.winner} venceu por desistência do oponente!`, 'info');
            }
            
            // Limpa o tabuleiro após 3 segundos
            setTimeout(() => {
                this.clearBoard();
                this.hideGameResult();
            }, 3000);
        });
        
        this.socket.on('player-timeout', (data) => {
            this.showNotification('Um jogador foi removido por inatividade', 'warning');
        });
        
        this.socket.on('disconnect', () => {
            this.showNotification('Conexão perdida. Tentando reconectar...', 'error');
        });
        
        this.socket.on('connect', () => {
            if (this.currentPlayer) {
                this.showNotification('Reconectado!', 'success');
            }
        });
    }
    
    joinGame() {
        const name = this.playerNameInput.value.trim();
        const colorInputs = document.querySelectorAll('input[name="color"]');
        const selectedColor = Array.from(colorInputs).find(input => input.checked).value;
        
        if (!name) {
            this.showNotification('Por favor, digite seu nome!', 'error');
            return;
        }
        
        if (name.length > 15) {
            this.showNotification('Nome deve ter no máximo 15 caracteres!', 'error');
            return;
        }
        
        this.socket.emit('join-game', {
            name: name,
            color: selectedColor
        });
    }
    
    switchToGameScreen() {
        this.loginScreen.classList.remove('active');
        this.gameScreen.classList.add('active');
    }
    
    makeMove(position) {
        if (!this.isMyTurn) {
            this.showNotification('Não é sua vez!', 'warning');
            return;
        }
        
        if (!this.gameState?.currentMatch) {
            this.showNotification('Não há partida em andamento!', 'warning');
            return;
        }
        
        const cell = this.gameBoard.children[position];
        if (cell.textContent) {
            this.showNotification('Posição já ocupada!', 'warning');
            return;
        }
        
        this.socket.emit('make-move', { position: position });
    }
    
    updateUI() {
        this.updateMatchDisplay();
        this.updateRankings();
        this.updatePlayersList();
        this.updateQueue();
        this.updateBoard();
        this.updateTurnStatus();
    }
    
    updateMatchDisplay(matchData = null) {
        const match = matchData || this.gameState?.currentMatch;
        
        if (!match) {
            // Exibe mensagem de espera
            const queuePos = this.getMyQueuePosition();
            this.currentMatchDiv.innerHTML = `
                <div class="waiting-message">
                    <h3>Aguardando jogadores...</h3>
                    <p>Você está na posição <span style="color: #667eea; font-weight: bold;">${queuePos}</span> da fila</p>
                </div>
            `;
            return;
        }
        
        // Exibe informações da partida atual
        const isPlayer1 = this.currentPlayer === match.currentPlayer || 
                         (this.gameState?.currentMatch?.player1 && this.isPlayerInMatch());
        const isPlayer2 = !isPlayer1 && this.isPlayerInMatch();
        
        this.currentMatchDiv.innerHTML = `
            <div class="current-players">
                <div class="player-info ${isPlayer1 && match.currentPlayer === this.currentPlayer ? 'active' : ''}">
                    <div class="player-avatar" style="background-color: ${match.player1.color};"></div>
                    <span class="player-name">${match.player1.name}</span>
                    <span class="player-symbol">X</span>
                </div>
                <div class="vs-divider">VS</div>
                <div class="player-info ${isPlayer2 && match.currentPlayer === this.currentPlayer ? 'active' : ''}">
                    <div class="player-avatar" style="background-color: ${match.player2.color};"></div>
                    <span class="player-name">${match.player2.name}</span>
                    <span class="player-symbol">O</span>
                </div>
            </div>
        `;
    }
    
    updateBoard() {
        if (!this.gameState?.currentMatch?.board) {
            this.clearBoard();
            return;
        }
        
        const board = this.gameState.currentMatch.board;
        
        Array.from(this.gameBoard.children).forEach((cell, index) => {
            cell.textContent = board[index] || '';
            cell.classList.remove('disabled', 'winning');
            
            if (this.isMyTurn && !board[index]) {
                cell.classList.remove('disabled');
            } else {
                cell.classList.add('disabled');
            }
        });
    }
    
    updateTurnStatus() {
        if (!this.gameState?.currentMatch) {
            this.isMyTurn = false;
            return;
        }
        
        this.isMyTurn = this.gameState.currentMatch.currentPlayer === this.currentPlayer;
    }
    
    updateRankings() {
        if (!this.gameState?.rankings || this.gameState.rankings.length === 0) {
            this.rankingsList.innerHTML = '<p class="empty-message">Nenhuma vitória ainda</p>';
            return;
        }
        
        this.rankingsList.innerHTML = this.gameState.rankings
            .map((player, index) => `
                <div class="ranking-item">
                    <span class="queue-position">${index + 1}</span>
                    <div class="player-avatar-small" style="background-color: ${player.color};"></div>
                    <span class="player-name">${player.name}</span>
                    <span class="player-wins">${player.wins}</span>
                </div>
            `).join('');
    }
    
    updatePlayersList() {
        if (!this.gameState?.players || this.gameState.players.length === 0) {
            this.playersList.innerHTML = '<p class="empty-message">Nenhum jogador</p>';
            return;
        }
        
        this.playersList.innerHTML = this.gameState.players
            .map(player => `
                <div class="player-item">
                    <div class="player-avatar-small" style="background-color: ${player.color};"></div>
                    <span class="player-name">${player.name}${player.id === this.currentPlayer ? ' (Você)' : ''}</span>
                </div>
            `).join('');
    }
    
    updateQueue() {
        if (!this.gameState?.queue || this.gameState.queue.length === 0) {
            this.queueList.innerHTML = '<p class="empty-message">Fila vazia</p>';
            return;
        }
        
        this.queueList.innerHTML = this.gameState.queue
            .map((player, index) => `
                <div class="queue-item">
                    <span class="queue-position">${index + 1}</span>
                    <div class="player-avatar-small" style="background-color: ${player.color};"></div>
                    <span class="player-name">${player.name}</span>
                </div>
            `).join('');
    }
    
    showMatchResult(result) {
        this.gameResult.classList.remove('hidden');
        
        if (result.draw) {
            this.resultText.textContent = 'Empate!';
            this.resultSubtitle.textContent = 'Ambos os jogadores vão para o final da fila';
        } else if (result.winner) {
            this.resultText.textContent = `${result.winner} Venceu! 🎉`;
            if (result.reason === 'opponent-disconnected') {
                this.resultSubtitle.textContent = 'Vitória por desistência do oponente';
            } else {
                this.resultSubtitle.textContent = 'Próxima partida em breve...';
            }
        }
        
        // Destaca células vencedoras
        if (result.winPattern) {
            result.winPattern.forEach(index => {
                this.gameBoard.children[index].classList.add('winning');
            });
        }
    }
    
    hideGameResult() {
        this.gameResult.classList.add('hidden');
    }
    
    clearBoard() {
        Array.from(this.gameBoard.children).forEach(cell => {
            cell.textContent = '';
            cell.classList.remove('disabled', 'winning');
        });
    }
    
    getMyQueuePosition() {
        if (!this.gameState?.queue) return '-';
        
        const myIndex = this.gameState.queue.findIndex(player => 
            this.gameState.players.some(p => p.id === this.currentPlayer && p.name === player.name)
        );
        
        return myIndex !== -1 ? myIndex + 1 : '-';
    }
    
    isPlayerInMatch() {
        if (!this.gameState?.currentMatch) return false;
        
        const myPlayer = this.gameState.players.find(p => p.id === this.currentPlayer);
        if (!myPlayer) return false;
        
        return (this.gameState.currentMatch.player1.name === myPlayer.name) ||
               (this.gameState.currentMatch.player2.name === myPlayer.name);
    }
    
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        this.notifications.appendChild(notification);
        
        // Remove a notificação após 4 segundos
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 4000);
    }
}

// Inicializa o jogo quando a página carrega
document.addEventListener('DOMContentLoaded', () => {
    new TicTacToeGame();
});