import { database } from '../../firebase';
import { ref, set, get, onValue, remove, update, serverTimestamp, push } from 'firebase/database';

// Sample word lists
const WORD_LIST = [
    'Coffee', 'Beach', 'Doctor', 'Movie', 'Pizza', 'School', 'Music', 'Book',
    'Garden', 'Phone', 'Computer', 'Car', 'Rain', 'Birthday', 'Sport',
    'Kitchen', 'Shopping', 'Travel', 'Restaurant', 'Hospital', 'Airport',
    'Library', 'Park', 'Office', 'Home', 'Hotel', 'Museum', 'Theater',
    'Bank', 'Market', 'Gym', 'Cafe', 'Police', 'Fire', 'Ocean', 'Mountain'
];

const DOPPELGANGER_WORDS = {
    'Coffee': 'Tea',
    'Beach': 'Lake',
    'Doctor': 'Nurse',
    'Movie': 'TV Show',
    'Pizza': 'Burger',
    'School': 'University',
    'Music': 'Song',
    'Book': 'Magazine',
    'Garden': 'Farm',
    'Phone': 'Tablet',
    'Computer': 'Laptop',
    'Car': 'Motorcycle',
    'Rain': 'Snow',
    'Birthday': 'Wedding',
    'Sport': 'Game',
    'Kitchen': 'Bathroom',
    'Shopping': 'Market',
    'Travel': 'Vacation',
    'Restaurant': 'Cafe',
    'Hospital': 'Clinic',
    'Airport': 'Train Station',
    'Library': 'Bookstore',
    'Park': 'Zoo',
    'Office': 'Workplace',
    'Home': 'House',
    'Hotel': 'Motel',
    'Museum': 'Gallery',
    'Theater': 'Cinema',
    'Bank': 'ATM',
    'Market': 'Store',
    'Gym': 'Fitness Center',
    'Cafe': 'Coffee Shop',
    'Police': 'Security',
    'Fire': 'Smoke',
    'Ocean': 'Sea',
    'Mountain': 'Hill'
};

// Generate room code
const generateRoomCode = () => {
    return Math.random().toString(36).substr(2, 6).toUpperCase();
};

// Get random word
const getRandomWord = () => {
    return WORD_LIST[Math.floor(Math.random() * WORD_LIST.length)];
};

// Create room
export const createRoom = async(playerName, gameMode = 'normal') => {
    const roomCode = generateRoomCode();
    const roomRef = ref(database, `spyRooms/${roomCode}`);

    // Check if room already exists
    const snapshot = await get(roomRef);
    if (snapshot.exists()) {
        return createRoom(playerName, gameMode); // Try again with new code
    }

    const roomData = {
        roomCode,
        gameMode,
        status: 'waiting', // waiting, playing, voting, finished
        players: {
            [playerName]: {
                name: playerName,
                isHost: true,
                isSpy: false,
                isDoppelganger: false,
                gameWord: null,
                isAlive: true,
                votedFor: null,
                joinedAt: serverTimestamp()
            }
        },
        gameWord: null,
        doppelgangerWord: null,
        spyPlayer: null,
        doppelgangerPlayer: null,
        currentRound: 0,
        phase: 'waiting', // waiting, discussion, voting, results
        phaseStartTime: null,
        votes: {},
        gameResults: null,
        gameStarted: false,
        createdAt: serverTimestamp()
    };

    await set(roomRef, roomData);
    return roomCode;
};

// Join room
export const joinRoom = async(roomCode, playerName) => {
    const roomRef = ref(database, `spyRooms/${roomCode}`);
    const snapshot = await get(roomRef);

    if (!snapshot.exists()) {
        throw new Error('Room not found');
    }

    const roomData = snapshot.val();

    if (roomData.status === 'playing') {
        throw new Error('Game already in progress');
    }

    if (roomData.players && Object.keys(roomData.players).length >= 10) {
        throw new Error('Room is full');
    }

    if (roomData.players && roomData.players[playerName]) {
        throw new Error('Player name already taken');
    }

    // Add player to room
    const playerRef = ref(database, `spyRooms/${roomCode}/players/${playerName}`);
    await set(playerRef, {
        name: playerName,
        isHost: false,
        isSpy: false,
        isDoppelganger: false,
        gameWord: null,
        isAlive: true,
        votedFor: null,
        joinedAt: serverTimestamp()
    });
};

// Start game
export const startGame = async(roomCode) => {
    const roomRef = ref(database, `spyRooms/${roomCode}`);
    const snapshot = await get(roomRef);

    if (!snapshot.exists()) {
        throw new Error('Room not found');
    }

    const roomData = snapshot.val();
    const players = Object.keys(roomData.players || {});

    if (players.length < 3) {
        throw new Error('Need at least 3 players to start');
    }

    // Select random spy
    const spyIndex = Math.floor(Math.random() * players.length);
    const spyPlayer = players[spyIndex];

    // Get random words
    const gameWord = getRandomWord();
    const doppelgangerWord = DOPPELGANGER_WORDS[gameWord] || gameWord;

    // Select doppelganger (only in doppelganger mode)
    let doppelgangerPlayer = null;
    if (roomData.gameMode === 'doppelganger' && players.length >= 4) {
        let doppelgangerIndex;
        do {
            doppelgangerIndex = Math.floor(Math.random() * players.length);
        } while (doppelgangerIndex === spyIndex);
        doppelgangerPlayer = players[doppelgangerIndex];
    }

    // Update all players with roles and words
    const updatedPlayers = {};
    players.forEach(playerName => {
        const isSpy = playerName === spyPlayer;
        const isDoppelganger = playerName === doppelgangerPlayer;
        
        updatedPlayers[playerName] = {
            ...roomData.players[playerName],
            isSpy,
            isDoppelganger,
            gameWord: isSpy ? null : (isDoppelganger ? doppelgangerWord : gameWord),
            isAlive: true,
            votedFor: null
        };
    });

    const discussionTime = roomData.gameMode === 'speedrun' ? 2 * 60 * 1000 : 5 * 60 * 1000;

    await update(roomRef, {
        status: 'playing',
        phase: 'discussion',
        phaseStartTime: Date.now(),
        gameStarted: true,
        players: updatedPlayers,
        gameWord: gameWord,
        doppelgangerWord: doppelgangerWord,
        spyPlayer: spyPlayer,
        doppelgangerPlayer: doppelgangerPlayer,
        currentRound: 1,
        votes: {},
        gameResults: null
    });

    // Auto-start voting after discussion time
    setTimeout(async () => {
        try {
            await startVoting(roomCode);
        } catch (err) {
            console.error('Auto-voting failed:', err);
        }
    }, discussionTime);
};

// Send message
export const sendMessage = async(roomCode, senderName, message) => {
    const messagesRef = ref(database, `spyRooms/${roomCode}/messages`);
    const newMessageRef = push(messagesRef);
    
    await set(newMessageRef, {
        sender: senderName,
        content: message,
        timestamp: Date.now()
    });
};

// Subscribe to messages
export const subscribeToMessages = (roomCode, callback) => {
    const messagesRef = ref(database, `spyRooms/${roomCode}/messages`);
    return onValue(messagesRef, callback);
};

// Subscribe to room updates
export const subscribeToRoom = (roomCode, callback) => {
    const roomRef = ref(database, `spyRooms/${roomCode}`);
    return onValue(roomRef, callback);
};

// Leave room
export const leaveRoom = async(roomCode, playerName) => {
    const playerRef = ref(database, `spyRooms/${roomCode}/players/${playerName}`);
    await remove(playerRef);

    // Check if room is empty and delete if so
    const roomRef = ref(database, `spyRooms/${roomCode}`);
    const snapshot = await get(roomRef);

    if (snapshot.exists()) {
        const roomData = snapshot.val();
        if (!roomData.players || Object.keys(roomData.players).length === 0) {
            await remove(roomRef);
        } else {
            // If host left, assign new host
            const remainingPlayers = Object.values(roomData.players);
            const currentHost = remainingPlayers.find(p => p.isHost);
            
            if (!currentHost) {
                const newHost = remainingPlayers[0];
                const newHostRef = ref(database, `spyRooms/${roomCode}/players/${newHost.name}/isHost`);
                await set(newHostRef, true);
            }
        }
    }
};

// Cast vote
export const castVote = async(roomCode, voterName, targetName) => {
    const voteRef = ref(database, `spyRooms/${roomCode}/votes/${voterName}`);
    await set(voteRef, targetName);

    const playerRef = ref(database, `spyRooms/${roomCode}/players/${voterName}/votedFor`);
    await set(playerRef, targetName);

    // Check if all players have voted
    const roomRef = ref(database, `spyRooms/${roomCode}`);
    const snapshot = await get(roomRef);
    
    if (snapshot.exists()) {
        const roomData = snapshot.val();
        const players = Object.keys(roomData.players || {});
        const votes = Object.keys(roomData.votes || {});
        
        if (votes.length === players.length) {
            // All players voted, end game
            await endGame(roomCode);
        }
    }
};

// Start voting phase
export const startVoting = async(roomCode) => {
    const roomRef = ref(database, `spyRooms/${roomCode}`);
    const snapshot = await get(roomRef);
    
    if (!snapshot.exists()) return;
    
    const roomData = snapshot.val();
    if (roomData.phase !== 'discussion') return; // Prevent multiple calls
    
    await update(roomRef, {
        phase: 'voting',
        phaseStartTime: Date.now(),
        votes: {}
    });

    // Reset all player votes
    const playersRef = ref(database, `spyRooms/${roomCode}/players`);
    const playersSnapshot = await get(playersRef);

    if (playersSnapshot.exists()) {
        const players = playersSnapshot.val();
        const updates = {};

        Object.keys(players).forEach(playerName => {
            updates[`${playerName}/votedFor`] = null;
        });

        await update(playersRef, updates);
    }

    // Auto-end voting after 1 minute
    setTimeout(async () => {
        try {
            await endGame(roomCode);
        } catch (err) {
            console.error('Auto-end game failed:', err);
        }
    }, 60 * 1000);
};

// End game and calculate results
export const endGame = async(roomCode) => {
    const roomRef = ref(database, `spyRooms/${roomCode}`);
    const snapshot = await get(roomRef);
    
    if (!snapshot.exists()) return;
    
    const roomData = snapshot.val();
    if (roomData.status === 'finished') return; // Already finished
    
    const players = Object.values(roomData.players || {});
    const votes = roomData.votes || {};
    const spyPlayer = players.find(p => p.isSpy);
    
    // Calculate vote counts
    const voteCount = {};
    Object.values(votes).forEach(target => {
        voteCount[target] = (voteCount[target] || 0) + 1;
    });
    
    // Find most voted player
    const mostVoted = Object.entries(voteCount).reduce((a, b) => 
        voteCount[a[0]] > voteCount[b[0]] ? a : b, ['', 0]
    );
    
    const eliminatedPlayer = mostVoted[0];
    const spyWon = eliminatedPlayer !== spyPlayer?.name;
    
    const gameResults = {
        winner: spyWon ? 'spy' : 'civilian',
        eliminatedPlayer,
        spyPlayer: spyPlayer?.name,
        spyWon,
        voteCount,
        finalVotes: votes
    };
    
    await update(roomRef, {
        status: 'finished',
        phase: 'results',
        gameResults
    });
};

// Reset game for play again
export const resetGame = async(roomCode) => {
    const roomRef = ref(database, `spyRooms/${roomCode}`);
    const snapshot = await get(roomRef);
    
    if (!snapshot.exists()) {
        throw new Error('Room not found');
    }
    
    const roomData = snapshot.val();
    const players = roomData.players || {};
    
    // Reset all player data
    const resetPlayers = {};
    Object.entries(players).forEach(([name, player]) => {
        resetPlayers[name] = {
            ...player,
            isSpy: false,
            isDoppelganger: false,
            gameWord: null,
            isAlive: true,
            votedFor: null
        };
    });
    
    await update(roomRef, {
        status: 'waiting',
        phase: 'waiting',
        phaseStartTime: null,
        players: resetPlayers,
        gameWord: null,
        doppelgangerWord: null,
        spyPlayer: null,
        doppelgangerPlayer: null,
        votes: {},
        gameResults: null,
        gameStarted: false
    });
    
    // Clear messages
    const messagesRef = ref(database, `spyRooms/${roomCode}/messages`);
    await remove(messagesRef);
};