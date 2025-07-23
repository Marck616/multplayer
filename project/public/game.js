// Conexão Socket.IO
const socket = io();

// Estado global do jogo
let gameState = {
    mode: null, // 'single' ou 'multi'
    isHost: false,
    roomCode: null,
    selectedTheme: null,
    currentQuestionIndex: 0,
    questions: [],
    gameTimer: 600, // 10 minutos em segundos
    questionTimer: 30,
    currentPlayer: 0,
    gamePhase: 'question', // 'question', 'attack', 'repair'
    myPlayerId: null,
    
    players: [
        {
            id: null,
            name: 'Jogador 1',
            castle: Array(9).fill(true), // true = intacto, false = destruído
            bombs: 0,
            streak: 0,
            correctAnswers: 0
        },
        {
            id: null,
            name: 'Jogador 2',
            castle: Array(9).fill(true),
            bombs: 0,
            streak: 0,
            correctAnswers: 0
        }
    ],
    
    timers: {
        game: null,
        question: null
    }
};

// Status de conexão
socket.on('connect', () => {
    console.log('Conectado ao servidor');
    updateConnectionStatus(true);
});

socket.on('disconnect', () => {
    console.log('Desconectado do servidor');
    updateConnectionStatus(false);
});

function updateConnectionStatus(connected) {
    const status = document.getElementById('connection-status');
    if (connected) {
        status.textContent = '🟢 Online';
        status.className = 'connection-status connected';
    } else {
        status.textContent = '🔴 Offline';
        status.className = 'connection-status disconnected';
    }
}

// Controle de telas
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    document.getElementById(screenId).classList.add('active');
}

function backToMenu() {
    resetGame();
    showScreen('menu-screen');
}

function showGameModeSelection() {
    showScreen('game-mode-screen');
}

function showMultiplayerOptions() {
    showScreen('multiplayer-screen');
}

function backToGameMode() {
    showScreen('game-mode-screen');
}

function showRules() {
    showScreen('rules-screen');
}

// Funcionalidades do jogo
function startSinglePlayer() {
    gameState.mode = 'single';
    gameState.players[1].name = 'Máquina';
    showThemeSelection();
}

function createRoom() {
    gameState.mode = 'multi';
    gameState.isHost = true;
    
    socket.emit('create-room', (response) => {
        if (response.success) {
            gameState.roomCode = response.roomCode;
            document.getElementById('room-code-display').textContent = response.roomCode;
            showScreen('waiting-room-screen');
        } else {
            alert('Erro ao criar sala: ' + response.error);
        }
    });
}

function copyRoomCode() {
    navigator.clipboard.writeText(gameState.roomCode).then(() => {
        alert('Código copiado para a área de transferência!');
    });
}

function joinRoom() {
    const code = document.getElementById('room-code-input').value.toUpperCase();
    if (!code || code.length !== 6) {
        alert('Por favor, insira um código válido de 6 caracteres.');
        return;
    }
    
    gameState.mode = 'multi';
    gameState.isHost = false;
    
    socket.emit('join-room', code, (response) => {
        if (response.success) {
            gameState.roomCode = code;
            // Aguardar evento room-ready
        } else {
            alert('Erro: ' + response.error);
        }
    });
}

// Eventos Socket.IO
socket.on('room-ready', (data) => {
    gameState.myPlayerId = socket.id;
    gameState.players[0].id = data.players[0];
    gameState.players[1].id = data.players[1];
    
    if (data.isHost) {
        gameState.isHost = true;
        gameState.players[0].name = 'Você';
        gameState.players[1].name = 'Oponente';
    } else {
        gameState.isHost = false;
        gameState.players[0].name = 'Oponente';
        gameState.players[1].name = 'Você';
    }
    
    showThemeSelection();
});

socket.on('game-started', (serverGameState) => {
    // Sincronizar com estado do servidor
    gameState.questions = serverGameState.questions;
    gameState.currentQuestionIndex = serverGameState.currentQuestionIndex;
    gameState.currentPlayer = serverGameState.currentPlayer;
    
    initializeGame();
    showScreen('game-screen');
    startGameTimers();
    loadCurrentQuestion();
});

socket.on('answer-result', (data) => {
    const { playerId, isCorrect, correctAnswer, explanation, gameState: serverGameState } = data;
    
    // Atualizar estado local
    gameState.players = serverGameState.players;
    
    // Mostrar resultado
    const options = document.querySelectorAll('.option-btn');
    options.forEach((btn, index) => {
        btn.disabled = true;
        if (index === correctAnswer) {
            btn.classList.add('correct');
        } else if (btn.classList.contains('selected') && !isCorrect) {
            btn.classList.add('incorrect');
        }
    });
    
    // Mostrar explicação
    const explanationDiv = document.getElementById('explanation');
    explanationDiv.innerHTML = `<strong>${isCorrect ? '✅ Correto!' : '❌ Incorreto!'}</strong><br>${explanation}`;
    explanationDiv.style.display = 'block';
    
    updateUI();
    
    // Verificar próxima ação
    const playerIndex = gameState.players.findIndex(p => p.id === playerId);
    if (isCorrect && gameState.players[playerIndex].streak === 5) {
        // Pode reparar
        if (playerId === gameState.myPlayerId) {
            setTimeout(() => showRepairNotification(), 2000);
        }
    } else if (isCorrect && gameState.players[playerIndex].bombs > 0) {
        // Pode atacar
        if (playerId === gameState.myPlayerId) {
            setTimeout(() => startAttackPhase(), 2000);
        }
    } else {
        // Próxima pergunta
        setTimeout(() => {
            socket.emit('next-question', gameState.roomCode);
        }, 2000);
    }
});

socket.on('castle-attacked', (data) => {
    const { targetPlayerId, blockIndex, gameState: serverGameState, castleDestroyed } = data;
    
    // Atualizar estado
    gameState.players = serverGameState.players;
    updateUI();
    
    // Atualizar visual do castelo
    const targetPlayerIndex = gameState.players.findIndex(p => p.id === targetPlayerId);
    const castleId = targetPlayerIndex === 0 ? 'player1-castle' : 'player2-castle';
    const block = document.querySelector(`#${castleId} .castle-block[data-index="${blockIndex}"]`);
    block.classList.add('destroyed');
    
    if (castleDestroyed) {
        // Fim de jogo será tratado pelo evento game-ended
    } else {
        setTimeout(() => {
            socket.emit('next-question', gameState.roomCode);
        }, 1000);
    }
});

socket.on('castle-repaired', (data) => {
    const { playerId, blockIndex, gameState: serverGameState } = data;
    
    // Atualizar estado
    gameState.players = serverGameState.players;
    updateUI();
    
    // Atualizar visual do castelo
    const playerIndex = gameState.players.findIndex(p => p.id === playerId);
    const castleId = playerIndex === 0 ? 'player1-castle' : 'player2-castle';
    const block = document.querySelector(`#${castleId} .castle-block[data-index="${blockIndex}"]`);
    block.classList.remove('destroyed');
    
    document.getElementById('repair-notification').style.display = 'none';
    
    setTimeout(() => startAttackPhase(), 1000);
});

socket.on('next-question', (serverGameState) => {
    gameState.currentQuestionIndex = serverGameState.currentQuestionIndex;
    gameState.currentPlayer = serverGameState.currentPlayer;
    loadCurrentQuestion();
});

socket.on('game-ended', (data) => {
    const { winner, reason, finalScores } = data;
    endGame(reason, winner, finalScores);
});

socket.on('player-disconnected', () => {
    alert('O outro jogador se desconectou. Voltando ao menu principal.');
    backToMenu();
});

function showThemeSelection() {
    const themesGrid = document.getElementById('themes-grid');
    themesGrid.innerHTML = '';
    
    gameDatabase.themes.forEach(theme => {
        const themeCard = document.createElement('div');
        themeCard.className = 'theme-card';
        themeCard.onclick = () => selectTheme(theme.id);
        
        themeCard.innerHTML = `
            <img src="${theme.image}" alt="${theme.name}" class="theme-image">
            <h3>${theme.name}</h3>
            <p>${theme.description}</p>
        `;
        
        themesGrid.appendChild(themeCard);
    });
    
    showScreen('theme-selection-screen');
}

function selectTheme(themeId) {
    gameState.selectedTheme = themeId;
    
    // Remove seleção anterior
    document.querySelectorAll('.theme-card').forEach(card => {
        card.classList.remove('selected');
    });
    
    // Adiciona seleção atual
    event.target.closest('.theme-card').classList.add('selected');
    
    // Habilita botão de iniciar
    document.getElementById('start-game-btn').disabled = false;
}

function startGame() {
    if (!gameState.selectedTheme) {
        alert('Selecione um tema primeiro!');
        return;
    }
    
    // Carrega perguntas do tema selecionado
    gameState.questions = gameDatabase.getQuestionsByTheme(gameState.selectedTheme, 20);
    
    if (gameState.questions.length === 0) {
        alert('Não há perguntas disponíveis para este tema.');
        return;
    }
    
    if (gameState.mode === 'single') {
        // Modo single player
        initializeGame();
        showScreen('game-screen');
        startGameTimers();
        loadCurrentQuestion();
    } else {
        // Modo multiplayer - apenas o host inicia
        if (gameState.isHost) {
            socket.emit('start-game', {
                roomCode: gameState.roomCode,
                theme: gameState.selectedTheme,
                questions: gameState.questions
            });
        }
    }
}

function initializeGame() {
    // Reseta estado dos jogadores
    gameState.currentQuestionIndex = 0;
    gameState.currentPlayer = 0;
    gameState.gamePhase = 'question';
    
    gameState.players.forEach(player => {
        player.castle = Array(9).fill(true);
        player.bombs = 0;
        player.streak = 0;
        player.correctAnswers = 0;
    });
    
    // Atualiza nomes na interface
    document.getElementById('player1-name').textContent = gameState.players[0].name;
    document.getElementById('player2-name').textContent = gameState.players[1].name;
    
    // Gera castelos
    generateCastle('player1-castle');
    generateCastle('player2-castle');
    
    // Atualiza contadores
    updateUI();
}

function generateCastle(containerId) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    
    for (let i = 0; i < 9; i++) {
        const block = document.createElement('div');
        block.className = 'castle-block';
        block.dataset.index = i;
        container.appendChild(block);
    }
}

function startGameTimers() {
    // Timer do jogo (10 minutos)
    gameState.timers.game = setInterval(() => {
        gameState.gameTimer--;
        updateGameTimer();
        
        if (gameState.gameTimer <= 0) {
            endGame('time');
        }
    }, 1000);
    
    startQuestionTimer();
}

function startQuestionTimer() {
    gameState.questionTimer = 30;
    
    gameState.timers.question = setInterval(() => {
        gameState.questionTimer--;
        updateQuestionTimer();
        
        if (gameState.questionTimer <= 0) {
            handleTimeOut();
        }
    }, 1000);
}

function updateGameTimer() {
    const minutes = Math.floor(gameState.gameTimer / 60);
    const seconds = gameState.gameTimer % 60;
    document.getElementById('game-timer').textContent = 
        `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function updateQuestionTimer() {
    document.getElementById('question-timer').textContent = gameState.questionTimer;
}

function loadCurrentQuestion() {
    if (gameState.currentQuestionIndex >= gameState.questions.length) {
        endGame('questions');
        return;
    }
    
    const question = gameState.questions[gameState.currentQuestionIndex];
    
    // Atualiza interface
    document.getElementById('question-text').textContent = question.question;
    document.getElementById('current-player').textContent = gameState.players[gameState.currentPlayer].name;
    document.getElementById('question-counter').textContent = gameState.currentQuestionIndex + 1;
    document.getElementById('total-questions').textContent = gameState.questions.length;
    
    // Remove explicação anterior
    document.getElementById('explanation').style.display = 'none';
    
    // Gera opções
    const optionsGrid = document.getElementById('options-grid');
    optionsGrid.innerHTML = '';
    
    question.options.forEach((option, index) => {
        const button = document.createElement('button');
        button.className = 'option-btn';
        button.textContent = option;
        button.onclick = () => handleAnswer(index);
        optionsGrid.appendChild(button);
    });
    
    // Reset timers
    startQuestionTimer();
    
    // Esconde elementos de ataque/reparo
    document.getElementById('attack-phase').style.display = 'none';
    document.getElementById('repair-notification').style.display = 'none';
}

function handleAnswer(selectedIndex) {
    clearInterval(gameState.timers.question);
    
    // Marca opção selecionada
    const options = document.querySelectorAll('.option-btn');
    options[selectedIndex].classList.add('selected');
    
    if (gameState.mode === 'single') {
        // Modo single player
        const question = gameState.questions[gameState.currentQuestionIndex];
        const isCorrect = selectedIndex === question.correctAnswer;
        const currentPlayerData = gameState.players[gameState.currentPlayer];
        
        // Destaca resposta correta/incorreta
        options.forEach((btn, index) => {
            btn.disabled = true;
            if (index === question.correctAnswer) {
                btn.classList.add('correct');
            } else if (index === selectedIndex && !isCorrect) {
                btn.classList.add('incorrect');
            }
        });
        
        // Mostra explicação
        const explanationDiv = document.getElementById('explanation');
        explanationDiv.innerHTML = `<strong>${isCorrect ? '✅ Correto!' : '❌ Incorreto!'}</strong><br>${question.explanation}`;
        explanationDiv.style.display = 'block';
        
        // Atualiza estatísticas do jogador
        if (isCorrect) {
            currentPlayerData.bombs++;
            currentPlayerData.streak++;
            currentPlayerData.correctAnswers++;
            
            // Verifica se pode reparar (5 acertos seguidos)
            if (currentPlayerData.streak === 5) {
                currentPlayerData.streak = 0;
                showRepairNotification();
            } else {
                // Vai para fase de ataque
                setTimeout(() => {
                    startAttackPhase();
                }, 2000);
            }
        } else {
            currentPlayerData.streak = 0;
            
            // Próxima pergunta
            setTimeout(() => {
                nextTurn();
            }, 2000);
        }
        
        updateUI();
    } else {
        // Modo multiplayer
        const currentPlayerId = gameState.players[gameState.currentPlayer].id;
        if (currentPlayerId === gameState.myPlayerId) {
            socket.emit('answer-question', {
                roomCode: gameState.roomCode,
                answerIndex: selectedIndex,
                playerId: gameState.myPlayerId
            });
        }
    }
}

function handleTimeOut() {
    clearInterval(gameState.timers.question);
    
    if (gameState.mode === 'single') {
        // Trata como resposta incorreta
        const currentPlayerData = gameState.players[gameState.currentPlayer];
        currentPlayerData.streak = 0;
        
        // Mostra que o tempo acabou
        document.getElementById('explanation').innerHTML = '<strong>⏰ Tempo esgotado!</strong>';
        document.getElementById('explanation').style.display = 'block';
        
        // Se for vs máquina e for a vez da máquina, ela responde
        if (gameState.currentPlayer === 1) {
            handleMachineAnswer();
            return;
        }
        
        setTimeout(() => {
            nextTurn();
        }, 1500);
    } else {
        // Multiplayer - enviar timeout para servidor
        const currentPlayerId = gameState.players[gameState.currentPlayer].id;
        if (currentPlayerId === gameState.myPlayerId) {
            socket.emit('answer-question', {
                roomCode: gameState.roomCode,
                answerIndex: -1, // Indica timeout
                playerId: gameState.myPlayerId
            });
        }
    }
}

function handleMachineAnswer() {
    // Máquina tem 70% de chance de acertar
    const question = gameState.questions[gameState.currentQuestionIndex];
    const machineAnswers = Math.random() < 0.7;
    
    if (machineAnswers) {
        handleAnswer(question.correctAnswer);
    } else {
        // Escolhe uma resposta errada aleatória
        let wrongAnswer;
        do {
            wrongAnswer = Math.floor(Math.random() * question.options.length);
        } while (wrongAnswer === question.correctAnswer);
        
        handleAnswer(wrongAnswer);
    }
}

function startAttackPhase() {
    gameState.gamePhase = 'attack';
    document.getElementById('attack-phase').style.display = 'block';
    
    // Determina qual castelo pode ser atacado
    let targetPlayerIndex;
    if (gameState.mode === 'single') {
        targetPlayerIndex = gameState.currentPlayer === 0 ? 1 : 0;
    } else {
        // Multiplayer - atacar o oponente
        const myPlayerIndex = gameState.players.findIndex(p => p.id === gameState.myPlayerId);
        targetPlayerIndex = myPlayerIndex === 0 ? 1 : 0;
    }
    
    const targetCastle = document.getElementById(`player${targetPlayerIndex + 1}-castle`);
    
    targetCastle.querySelectorAll('.castle-block').forEach((block, index) => {
        if (gameState.players[targetPlayerIndex].castle[index]) {
            block.classList.add('selectable');
            block.onclick = () => attackCastleBlock(targetPlayerIndex, index);
        }
    });
}

function attackCastleBlock(targetPlayerIndex, blockIndex) {
    // Remove seleção
    document.querySelectorAll('.castle-block').forEach(block => {
        block.classList.remove('selectable');
        block.onclick = null;
    });
    
    if (gameState.mode === 'single') {
        // Modo single player
        gameState.players[targetPlayerIndex].castle[blockIndex] = false;
        gameState.players[gameState.currentPlayer].bombs--;
        
        // Atualiza visual
        const block = document.querySelector(`#player${targetPlayerIndex + 1}-castle .castle-block[data-index="${blockIndex}"]`);
        block.classList.add('destroyed');
        
        updateUI();
        
        // Verifica se o castelo foi destruído completamente
        if (gameState.players[targetPlayerIndex].castle.every(block => !block)) {
            endGame('castle_destroyed');
            return;
        }
        
        document.getElementById('attack-phase').style.display = 'none';
        
        setTimeout(() => {
            nextTurn();
        }, 1000);
    } else {
        // Modo multiplayer
        const targetPlayerId = gameState.players[targetPlayerIndex].id;
        socket.emit('attack-castle', {
            roomCode: gameState.roomCode,
            targetPlayerId,
            blockIndex,
            attackerId: gameState.myPlayerId
        });
        
        document.getElementById('attack-phase').style.display = 'none';
    }
}

function showRepairNotification() {
    const notification = document.getElementById('repair-notification');
    notification.style.display = 'block';
}

function showRepairOptions() {
    let myPlayerIndex;
    if (gameState.mode === 'single') {
        myPlayerIndex = gameState.currentPlayer;
    } else {
        myPlayerIndex = gameState.players.findIndex(p => p.id === gameState.myPlayerId);
    }
    
    const currentPlayerData = gameState.players[myPlayerIndex];
    const destroyedBlocks = [];
    
    currentPlayerData.castle.forEach((block, index) => {
        if (!block) destroyedBlocks.push(index);
    });
    
    if (destroyedBlocks.length === 0) {
        alert('Seu castelo está intacto!');
        document.getElementById('repair-notification').style.display = 'none';
        setTimeout(() => startAttackPhase(), 500);
        return;
    }
    
    // Torna blocos destruídos clicáveis para reparo
    const ownCastle = document.getElementById(`player${myPlayerIndex + 1}-castle`);
    destroyedBlocks.forEach(index => {
        const block = ownCastle.querySelector(`[data-index="${index}"]`);
        block.classList.add('selectable');
        block.onclick = () => repairCastleBlock(myPlayerIndex, index);
    });
}

function repairCastleBlock(playerIndex, blockIndex) {
    // Remove seleção
    document.querySelectorAll('.castle-block').forEach(block => {
        block.classList.remove('selectable');
        block.onclick = null;
    });
    
    if (gameState.mode === 'single') {
        // Modo single player
        gameState.players[playerIndex].castle[blockIndex] = true;
        
        // Atualiza visual
        const block = document.querySelector(`#player${playerIndex + 1}-castle .castle-block[data-index="${blockIndex}"]`);
        block.classList.remove('destroyed');
        
        updateUI();
        
        document.getElementById('repair-notification').style.display = 'none';
        
        setTimeout(() => {
            startAttackPhase();
        }, 1000);
    } else {
        // Modo multiplayer
        socket.emit('repair-castle', {
            roomCode: gameState.roomCode,
            playerId: gameState.myPlayerId,
            blockIndex
        });
    }
}

function nextTurn() {
    gameState.currentQuestionIndex++;
    gameState.currentPlayer = gameState.currentPlayer === 0 ? 1 : 0;
    gameState.gamePhase = 'question';
    
    // Se for vs máquina e for a vez da máquina
    if (gameState.mode === 'single' && gameState.currentPlayer === 1) {
        loadCurrentQuestion();
        // Máquina responde automaticamente após um delay
        setTimeout(() => {
            handleMachineAnswer();
        }, 2000);
    } else {
        loadCurrentQuestion();
    }
}

function updateUI() {
    // Atualiza bombas
    document.getElementById('player1-bombs').textContent = gameState.players[0].bombs;
    document.getElementById('player2-bombs').textContent = gameState.players[1].bombs;
    
    // Atualiza sequências
    [0, 1].forEach(playerIndex => {
        const streakElement = document.getElementById(`player${playerIndex + 1}-streak`);
        const streak = gameState.players[playerIndex].streak;
        
        if (streak > 0) {
            streakElement.style.display = 'inline-block';
            streakElement.querySelector('span').textContent = streak;
        } else {
            streakElement.style.display = 'none';
        }
    });
    
    // Atualiza visual dos castelos
    [0, 1].forEach(playerIndex => {
        const castle = document.getElementById(`player${playerIndex + 1}-castle`);
        const blocks = castle.querySelectorAll('.castle-block');
        
        blocks.forEach((block, index) => {
            if (gameState.players[playerIndex].castle[index]) {
                block.classList.remove('destroyed');
            } else {
                block.classList.add('destroyed');
            }
        });
    });
}

function endGame(reason, winner = null, finalScores = null) {
    clearInterval(gameState.timers.game);
    clearInterval(gameState.timers.question);
    
    let player1Blocks, player2Blocks;
    
    if (finalScores) {
        player1Blocks = finalScores.player1Blocks;
        player2Blocks = finalScores.player2Blocks;
    } else {
        player1Blocks = gameState.players[0].castle.filter(block => block).length;
        player2Blocks = gameState.players[1].castle.filter(block => block).length;
    }
    
    let message;
    
    switch (reason) {
        case 'castle_destroyed':
            if (winner) {
                const winnerIndex = gameState.players.findIndex(p => p.id === winner);
                message = `🏆 ${gameState.players[winnerIndex].name} venceu! Castelo inimigo destruído!`;
            } else {
                if (player1Blocks === 0) {
                    message = `🏆 ${gameState.players[1].name} venceu! Castelo inimigo destruído!`;
                } else {
                    message = `🏆 ${gameState.players[0].name} venceu! Castelo inimigo destruído!`;
                }
            }
            break;
            
        case 'time':
        case 'questions_finished':
            if (winner) {
                const winnerIndex = gameState.players.findIndex(p => p.id === winner);
                message = `🏆 ${gameState.players[winnerIndex].name} venceu! Castelo mais preservado!`;
            } else {
                if (player1Blocks > player2Blocks) {
                    message = `🏆 ${gameState.players[0].name} venceu! Castelo mais preservado!`;
                } else if (player2Blocks > player1Blocks) {
                    message = `🏆 ${gameState.players[1].name} venceu! Castelo mais preservado!`;
                } else {
                    message = '🤝 Empate! Ambos os castelos têm o mesmo número de blocos!';
                }
            }
            break;
    }
    
    // Atualiza tela de game over
    document.getElementById('winner-text').textContent = message;
    document.getElementById('final-player1-score').textContent = 
        `${gameState.players[0].name}: ${player1Blocks} blocos restantes`;
    document.getElementById('final-player2-score').textContent = 
        `${gameState.players[1].name}: ${player2Blocks} blocos restantes`;
    
    showScreen('game-over-screen');
}

function playAgain() {
    resetGame();
    showThemeSelection();
}

function resetGame() {
    // Limpa timers
    if (gameState.timers.game) clearInterval(gameState.timers.game);
    if (gameState.timers.question) clearInterval(gameState.timers.question);
    
    // Reseta estado
    gameState = {
        mode: null,
        isHost: false,
        roomCode: null,
        selectedTheme: null,
        currentQuestionIndex: 0,
        questions: [],
        gameTimer: 600,
        questionTimer: 30,
        currentPlayer: 0,
        gamePhase: 'question',
        myPlayerId: null,
        
        players: [
            {
                id: null,
                name: 'Jogador 1',
                castle: Array(9).fill(true),
                bombs: 0,
                streak: 0,
                correctAnswers: 0
            },
            {
                id: null,
                name: 'Jogador 2',
                castle: Array(9).fill(true),
                bombs: 0,
                streak: 0,
                correctAnswers: 0
            }
        ],
        
        timers: {
            game: null,
            question: null
        }
    };
}

// Inicialização
document.addEventListener('DOMContentLoaded', function() {
    showScreen('menu-screen');
});