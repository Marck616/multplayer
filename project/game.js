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
    currentPlayer: 1,
    gamePhase: 'question', // 'question', 'attack', 'repair'
    
    players: {
        1: {
            name: 'Jogador 1',
            castle: Array(9).fill(true), // true = intacto, false = destruído
            bombs: 0,
            streak: 0,
            correctAnswers: 0
        },
        2: {
            name: 'Máquina',
            castle: Array(9).fill(true),
            bombs: 0,
            streak: 0,
            correctAnswers: 0
        }
    },
    
    timers: {
        game: null,
        question: null
    }
};

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
    gameState.players[2].name = 'Máquina';
    showThemeSelection();
}











// Modifique a função createRoom para usar Socket.IO
function createRoom() {
    socket.emit('create-room', (response) => {
        if (response.success) {
            gameState.mode = 'multi';
            gameState.isHost = true;
            gameState.roomCode = response.roomCode;
            document.getElementById('room-code-display').textContent = response.roomCode;
            showScreen('waiting-room-screen');
        }
    });
}












function generateRoomCode() {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return code;
}

function copyRoomCode() {
    navigator.clipboard.writeText(gameState.roomCode).then(() => {
        alert('Código copiado para a área de transferência!');
    });
}







// Modifique a função joinRoom para usar Socket.IO
function joinRoom() {
    const code = document.getElementById('room-code-input').value.toUpperCase();
    socket.emit('join-room', code, (response) => {
        if (response.success) {
            gameState.mode = 'multi';
            gameState.isHost = false;
            gameState.roomCode = code;
            showThemeSelection();
        } else {
            alert(response.error || 'Erro ao entrar na sala');
        }
    });
}

// Adicione listeners para eventos do Socket.IO
socket.on('room-ready', (data) => {
    if (gameState.isHost) {
        // Host recebe notificação que o segundo jogador entrou
        document.querySelector('#waiting-room-screen p').textContent = 'Jogador 2 conectado!';
        document.getElementById('start-game-btn').disabled = false;
    }
});

socket.on('game-started', (state) => {
    gameState = { ...gameState, ...state };
    initializeGame();
    showScreen('game-screen');
    startGameTimers();
    loadCurrentQuestion();
});

















function checkForPlayer2() {
    const interval = setInterval(() => {
        const roomData = localStorage.getItem(`room_${gameState.roomCode}`);
        if (roomData) {
            const room = JSON.parse(roomData);
            if (room.players === 2) {
                clearInterval(interval);
                showThemeSelection();
            }
        }
    }, 1000);
}

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
    
    // Inicializa o jogo
    initializeGame();
    showScreen('game-screen');
    startGameTimers();
    loadCurrentQuestion();
}

function initializeGame() {
    // Reseta estado dos jogadores
    gameState.currentQuestionIndex = 0;
    gameState.currentPlayer = 1;
    gameState.gamePhase = 'question';
    
    Object.keys(gameState.players).forEach(key => {
        gameState.players[key].castle = Array(9).fill(true);
        gameState.players[key].bombs = 0;
        gameState.players[key].streak = 0;
        gameState.players[key].correctAnswers = 0;
    });
    
    // Atualiza nomes na interface
    document.getElementById('player1-name').textContent = gameState.players[1].name;
    document.getElementById('player2-name').textContent = gameState.players[2].name;
    
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
    
    const question = gameState.questions[gameState.currentQuestionIndex];
    const isCorrect = selectedIndex === question.correctAnswer;
    const currentPlayerData = gameState.players[gameState.currentPlayer];
    
    // Destaca resposta correta/incorreta
    const options = document.querySelectorAll('.option-btn');
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
}

function handleTimeOut() {
    clearInterval(gameState.timers.question);
    
    // Trata como resposta incorreta
    const currentPlayerData = gameState.players[gameState.currentPlayer];
    currentPlayerData.streak = 0;
    
    // Mostra que o tempo acabou
    document.getElementById('explanation').innerHTML = '<strong>⏰ Tempo esgotado!</strong>';
    document.getElementById('explanation').style.display = 'block';
    
    // Se for vs máquina e for a vez da máquina, ela responde
    if (gameState.mode === 'single' && gameState.currentPlayer === 2) {
        handleMachineAnswer();
        return;
    }
    
    setTimeout(() => {
        nextTurn();
    }, 1500);
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
    
    // Torna blocos do oponente clicáveis
    const opponentPlayer = gameState.currentPlayer === 1 ? 2 : 1;
    const opponentCastle = document.getElementById(`player${opponentPlayer}-castle`);
    
    opponentCastle.querySelectorAll('.castle-block').forEach((block, index) => {
        if (gameState.players[opponentPlayer].castle[index]) {
            block.classList.add('selectable');
            block.onclick = () => attackCastleBlock(opponentPlayer, index);
        }
    });
}

function attackCastleBlock(playerIndex, blockIndex) {
    // Remove seleção
    document.querySelectorAll('.castle-block').forEach(block => {
        block.classList.remove('selectable');
        block.onclick = null;
    });
    
    // Destrói o bloco
    gameState.players[playerIndex].castle[blockIndex] = false;
    gameState.players[gameState.currentPlayer].bombs--;
    
    // Atualiza visual
    const block = document.querySelector(`#player${playerIndex}-castle .castle-block[data-index="${blockIndex}"]`);
    block.classList.add('destroyed');
    
    updateUI();
    
    // Verifica se o castelo foi destruído completamente
    if (gameState.players[playerIndex].castle.every(block => !block)) {
        endGame('castle_destroyed');
        return;
    }
    
    document.getElementById('attack-phase').style.display = 'none';
    
    setTimeout(() => {
        nextTurn();
    }, 1000);
}

function showRepairNotification() {
    const notification = document.getElementById('repair-notification');
    notification.style.display = 'block';
}

function showRepairOptions() {
    const currentPlayerData = gameState.players[gameState.currentPlayer];
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
    const ownCastle = document.getElementById(`player${gameState.currentPlayer}-castle`);
    destroyedBlocks.forEach(index => {
        const block = ownCastle.querySelector(`[data-index="${index}"]`);
        block.classList.add('selectable');
        block.onclick = () => repairCastleBlock(index);
    });
}

function repairCastleBlock(blockIndex) {
    // Remove seleção
    document.querySelectorAll('.castle-block').forEach(block => {
        block.classList.remove('selectable');
        block.onclick = null;
    });
    
    // Repara o bloco
    gameState.players[gameState.currentPlayer].castle[blockIndex] = true;
    
    // Atualiza visual
    const block = document.querySelector(`#player${gameState.currentPlayer}-castle .castle-block[data-index="${blockIndex}"]`);
    block.classList.remove('destroyed');
    
    updateUI();
    
    document.getElementById('repair-notification').style.display = 'none';
    
    setTimeout(() => {
        startAttackPhase();
    }, 1000);
}

function nextTurn() {
    gameState.currentQuestionIndex++;
    gameState.currentPlayer = gameState.currentPlayer === 1 ? 2 : 1;
    gameState.gamePhase = 'question';
    
    // Se for vs máquina e for a vez da máquina
    if (gameState.mode === 'single' && gameState.currentPlayer === 2) {
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
    document.getElementById('player1-bombs').textContent = gameState.players[1].bombs;
    document.getElementById('player2-bombs').textContent = gameState.players[2].bombs;
    
    // Atualiza sequências
    [1, 2].forEach(player => {
        const streakElement = document.getElementById(`player${player}-streak`);
        const streak = gameState.players[player].streak;
        
        if (streak > 0) {
            streakElement.style.display = 'inline-block';
            streakElement.querySelector('span').textContent = streak;
        } else {
            streakElement.style.display = 'none';
        }
    });
    
    // Atualiza visual dos castelos
    [1, 2].forEach(player => {
        const castle = document.getElementById(`player${player}-castle`);
        const blocks = castle.querySelectorAll('.castle-block');
        
        blocks.forEach((block, index) => {
            if (gameState.players[player].castle[index]) {
                block.classList.remove('destroyed');
            } else {
                block.classList.add('destroyed');
            }
        });
    });
}

function endGame(reason) {
    clearInterval(gameState.timers.game);
    clearInterval(gameState.timers.question);
    
    const player1Blocks = gameState.players[1].castle.filter(block => block).length;
    const player2Blocks = gameState.players[2].castle.filter(block => block).length;
    
    let winner;
    let message;
    
    switch (reason) {
        case 'castle_destroyed':
            if (player1Blocks === 0) {
                winner = 2;
                message = `🏆 ${gameState.players[2].name} venceu! Castelo inimigo destruído!`;
            } else {
                winner = 1;
                message = `🏆 ${gameState.players[1].name} venceu! Castelo inimigo destruído!`;
            }
            break;
            
        case 'time':
            if (player1Blocks > player2Blocks) {
                winner = 1;
                message = `🏆 ${gameState.players[1].name} venceu por tempo! Castelo mais preservado!`;
            } else if (player2Blocks > player1Blocks) {
                winner = 2;
                message = `🏆 ${gameState.players[2].name} venceu por tempo! Castelo mais preservado!`;
            } else {
                winner = null;
                message = '🤝 Empate! Ambos os castelos têm o mesmo número de blocos!';
            }
            break;
            
        case 'questions':
            if (player1Blocks > player2Blocks) {
                winner = 1;
                message = `🏆 ${gameState.players[1].name} venceu! Castelo mais preservado!`;
            } else if (player2Blocks > player1Blocks) {
                winner = 2;
                message = `🏆 ${gameState.players[2].name} venceu! Castelo mais preservado!`;
            } else {
                winner = null;
                message = '🤝 Empate! Ambos os castelos têm o mesmo número de blocos!';
            }
            break;
    }
    
    // Atualiza tela de game over
    document.getElementById('winner-text').textContent = message;
    document.getElementById('final-player1-score').textContent = 
        `${gameState.players[1].name}: ${player1Blocks} blocos restantes`;
    document.getElementById('final-player2-score').textContent = 
        `${gameState.players[2].name}: ${player2Blocks} blocos restantes`;
    
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
        currentPlayer: 1,
        gamePhase: 'question',
        
        players: {
            1: {
                name: 'Jogador 1',
                castle: Array(9).fill(true),
                bombs: 0,
                streak: 0,
                correctAnswers: 0
            },
            2: {
                name: 'Máquina',
                castle: Array(9).fill(true),
                bombs: 0,
                streak: 0,
                correctAnswers: 0
            }
        },
        
        timers: {
            game: null,
            question: null
        }
    };
    
    // Limpa localStorage se necessário
    if (gameState.roomCode) {
        localStorage.removeItem(`room_${gameState.roomCode}`);
    }
}

// Inicialização
document.addEventListener('DOMContentLoaded', function() {
    showScreen('menu-screen');
});
