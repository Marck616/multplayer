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

// Armazenar salas ativas
const rooms = new Map();

// Gerar código de sala
function generateRoomCode() {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return code;
}

io.on('connection', (socket) => {
    console.log('Usuário conectado:', socket.id);

    // Criar sala
    socket.on('create-room', (callback) => {
        const roomCode = generateRoomCode();
        const room = {
            code: roomCode,
            host: socket.id,
            players: [socket.id],
            status: 'waiting',
            gameState: null
        };
        
        rooms.set(roomCode, room);
        socket.join(roomCode);
        
        callback({ success: true, roomCode });
        console.log(`Sala ${roomCode} criada por ${socket.id}`);
    });









    
    // Entrar na sala
// Modifique o evento 'join-room' no servidor:
socket.on('join-room', (roomCode, callback) => {
    const room = rooms.get(roomCode);
    
    if (!room) {
        callback({ success: false, error: 'Sala não encontrada' });
        return;
    }
    
    if (room.players.length >= 2) {
        callback({ success: false, error: 'Sala cheia' });
        return;
    }
    
    room.players.push(socket.id);
    socket.join(roomCode);










        
    // Notificar host que jogador entrou
    if (room.players.length === 2) {
        room.status = 'ready';
        io.to(room.host).emit('room-ready', {
            players: room.players,
            isHost: true
        });
        
        // Enviar confirmação para o jogador que entrou
        callback({ 
            success: true,
            isHost: false
        });
    }
});

// Modifique o evento 'start-game':
socket.on('start-game', (data) => {
    const { roomCode, theme } = data;
    const room = rooms.get(roomCode);
    
    if (room && room.host === socket.id) {
        // Carregar perguntas para o tema selecionado
        const questions = window.gameDatabase.getQuestionsByTheme(theme, 20);
        
        room.gameState = {
            theme,
            questions,
            currentQuestionIndex: 0,
            currentPlayer: 0, // Índice do array de jogadores
            gameTimer: 600,
            questionTimer: 30,
            players: [
                {
                    id: room.players[0],
                    name: 'Jogador 1',
                    castle: Array(9).fill(true),
                    bombs: 0,
                    streak: 0,
                    correctAnswers: 0
                },
                {
                    id: room.players[1],
                    name: 'Jogador 2',
                    castle: Array(9).fill(true),
                    bombs: 0,
                    streak: 0,
                    correctAnswers: 0
                }
            ]
        };
        
        // Enviar estado do jogo para todos na sala
        io.to(roomCode).emit('game-started', room.gameState);
    }
});















    

    // Atacar castelo
    socket.on('attack-castle', (data) => {
        const { roomCode, targetPlayerId, blockIndex, attackerId } = data;
        const room = rooms.get(roomCode);
        
        if (room && room.gameState) {
            const gameState = room.gameState;
            const targetPlayerIndex = gameState.players.findIndex(p => p.id === targetPlayerId);
            const attackerIndex = gameState.players.findIndex(p => p.id === attackerId);
            
            if (targetPlayerIndex !== -1 && attackerIndex !== -1) {
                // Destruir bloco
                gameState.players[targetPlayerIndex].castle[blockIndex] = false;
                gameState.players[attackerIndex].bombs--;
                
                // Verificar se o castelo foi completamente destruído
                const castleDestroyed = gameState.players[targetPlayerIndex].castle.every(block => !block);
                
                io.to(roomCode).emit('castle-attacked', {
                    targetPlayerId,
                    blockIndex,
                    gameState,
                    castleDestroyed
                });
                
                if (castleDestroyed) {
                    io.to(roomCode).emit('game-ended', {
                        winner: attackerId,
                        reason: 'castle_destroyed'
                    });
                }
            }
        }
    });

    // Reparar castelo
    socket.on('repair-castle', (data) => {
        const { roomCode, playerId, blockIndex } = data;
        const room = rooms.get(roomCode);
        
        if (room && room.gameState) {
            const gameState = room.gameState;
            const playerIndex = gameState.players.findIndex(p => p.id === playerId);
            
            if (playerIndex !== -1) {
                gameState.players[playerIndex].castle[blockIndex] = true;
                gameState.players[playerIndex].streak = 0;
                
                io.to(roomCode).emit('castle-repaired', {
                    playerId,
                    blockIndex,
                    gameState
                });
            }
        }
    });

    // Próxima pergunta
    socket.on('next-question', (roomCode) => {
        const room = rooms.get(roomCode);
        
        if (room && room.gameState) {
            const gameState = room.gameState;
            gameState.currentQuestionIndex++;
            gameState.currentPlayer = gameState.currentPlayer === 0 ? 1 : 0;
            
            if (gameState.currentQuestionIndex >= gameState.questions.length) {
                // Fim do jogo por falta de perguntas
                const player1Blocks = gameState.players[0].castle.filter(block => block).length;
                const player2Blocks = gameState.players[1].castle.filter(block => block).length;
                
                let winner = null;
                if (player1Blocks > player2Blocks) {
                    winner = gameState.players[0].id;
                } else if (player2Blocks > player1Blocks) {
                    winner = gameState.players[1].id;
                }
                
                io.to(roomCode).emit('game-ended', {
                    winner,
                    reason: 'questions_finished',
                    finalScores: { player1Blocks, player2Blocks }
                });
            } else {
                io.to(roomCode).emit('next-question', gameState);
            }
        }
    });

    // Desconexão
    socket.on('disconnect', () => {
        console.log('Usuário desconectado:', socket.id);
        
        // Remover jogador das salas
        for (const [roomCode, room] of rooms.entries()) {
            const playerIndex = room.players.indexOf(socket.id);
            if (playerIndex !== -1) {
                room.players.splice(playerIndex, 1);
                
                if (room.players.length === 0) {
                    rooms.delete(roomCode);
                    console.log(`Sala ${roomCode} removida`);
                } else {
                    // Notificar jogador restante
                    io.to(roomCode).emit('player-disconnected');
                }
                break;
            }
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
