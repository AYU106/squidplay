import { database } from '../../firebase';
import { ref, set, get, onValue, remove, update, serverTimestamp } from 'firebase/database';

// UNO Card definitions
const COLORS = ['red', 'blue', 'green', 'yellow'];
const NUMBERS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
const SPECIAL_CARDS = ['skip', 'reverse', 'draw2'];
const WILD_CARDS = ['wild', 'wild4'];

// Generate UNO deck
export const generateDeck = () => {
    const deck = [];

    // Number cards (0 has 1 copy, 1-9 have 2 copies each)
    COLORS.forEach(color => {
        deck.push({ color, type: 'number', value: 0 });
        for (let i = 1; i <= 9; i++) {
            deck.push({ color, type: 'number', value: i });
            deck.push({ color, type: 'number', value: i });
        }
    });

    // Special cards (2 copies each per color)
    COLORS.forEach(color => {
        SPECIAL_CARDS.forEach(special => {
            deck.push({ color, type: 'special', value: special });
            deck.push({ color, type: 'special', value: special });
        });
    });

    // Wild cards (4 copies each)
    WILD_CARDS.forEach(wild => {
        for (let i = 0; i < 4; i++) {
            deck.push({ color: 'black', type: 'wild', value: wild });
        }
    });

    return shuffleDeck(deck);
};

// Shuffle deck
export const shuffleDeck = (deck) => {
    const shuffled = [...deck];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
};

// Generate room code
const generateRoomCode = () => {
    return Math.random().toString(36).substr(2, 6).toUpperCase();
};

// Create room
export const createRoom = async(playerName) => {
    const roomCode = generateRoomCode();
    const roomRef = ref(database, `unoRooms/${roomCode}`);

    // Check if room already exists
    const snapshot = await get(roomRef);
    if (snapshot.exists()) {
        return createRoom(playerName); // Try again with new code
    }

    const deck = generateDeck();
    const initialCards = 7;

    // Deal initial hand
    const playerHand = deck.splice(0, initialCards);
    const discardPile = [deck.splice(0, 1)[0]];

    const roomData = {
        roomCode,
        status: 'waiting',
        players: {
            [playerName]: {
                name: playerName,
                hand: playerHand,
                isHost: true,
                joinedAt: serverTimestamp()
            }
        },
        deck: deck,
        discardPile: discardPile,
        currentPlayer: playerName,
        direction: 1,
        gameStarted: false,
        createdAt: serverTimestamp()
    };

    await set(roomRef, roomData);
    return roomCode;
};

// Join room
export const joinRoom = async(roomCode, playerName) => {
    const roomRef = ref(database, `unoRooms/${roomCode}`);
    const snapshot = await get(roomRef);

    if (!snapshot.exists()) {
        throw new Error('Room not found');
    }

    const roomData = snapshot.val();

    if (roomData.status === 'playing') {
        throw new Error('Game already in progress');
    }

    if (roomData.players && Object.keys(roomData.players).length >= 13) {
        throw new Error('Room is full');
    }

    if (roomData.players && roomData.players[playerName]) {
        throw new Error('Player name already taken');
    }

    // Add player to room
    const playerRef = ref(database, `unoRooms/${roomCode}/players/${playerName}`);
    await set(playerRef, {
        name: playerName,
        hand: [],
        isHost: false,
        joinedAt: serverTimestamp()
    });
};

// Start game
export const startGame = async(roomCode) => {
    const roomRef = ref(database, `unoRooms/${roomCode}`);
    const snapshot = await get(roomRef);

    if (!snapshot.exists()) {
        throw new Error('Room not found');
    }

    const roomData = snapshot.val();
    const players = Object.keys(roomData.players || {});

    if (players.length < 2) {
        throw new Error('Need at least 2 players to start');
    }

    // Deal cards to all players
    const deck = generateDeck();
    const initialCards = 7;
    const updatedPlayers = {};

    players.forEach(playerName => {
        const playerHand = deck.splice(0, initialCards);
        updatedPlayers[playerName] = {
            ...roomData.players[playerName],
            hand: playerHand
        };
    });

    const discardPile = [deck.splice(0, 1)[0]];

    await update(roomRef, {
        status: 'playing',
        gameStarted: true,
        players: updatedPlayers,
        deck: deck,
        discardPile: discardPile,
        currentPlayer: players[0]
    });
};

// Subscribe to room updates
export const subscribeToRoom = (roomCode, callback) => {
    const roomRef = ref(database, `unoRooms/${roomCode}`);
    return onValue(roomRef, callback);
};

// Leave room
export const leaveRoom = async(roomCode, playerName) => {
    const playerRef = ref(database, `unoRooms/${roomCode}/players/${playerName}`);
    await remove(playerRef);

    // Check if room is empty and delete if so
    const roomRef = ref(database, `unoRooms/${roomCode}`);
    const snapshot = await get(roomRef);

    if (snapshot.exists()) {
        const roomData = snapshot.val();
        if (!roomData.players || Object.keys(roomData.players).length === 0) {
            await remove(roomRef);
        }
    }
};

// Subscribe to game updates (alias for subscribeToRoom)
export const subscribeToGame = (roomCode, callback) => {
    return subscribeToRoom(roomCode, callback);
};

// Play a card
export const playCard = async(roomCode, playerName, cardIndex) => {
    const roomRef = ref(database, `unoRooms/${roomCode}`);
    const snapshot = await get(roomRef);

    if (!snapshot.exists()) {
        throw new Error('Room not found');
    }

    const roomData = snapshot.val();
    const player = roomData.players[playerName];

    if (!player || !player.hand || cardIndex >= player.hand.length) {
        throw new Error('Invalid card selection');
    }

    if (roomData.currentPlayer !== playerName) {
        throw new Error('Not your turn');
    }

    const playedCard = player.hand[cardIndex];
    const topCard = roomData.discardPile[roomData.discardPile.length - 1];

    // Check if card can be played (simplified logic)
    const canPlay = playedCard.color === topCard.color || 
                   playedCard.value === topCard.value || 
                   playedCard.type === 'wild';

    if (!canPlay) {
        throw new Error('Cannot play this card');
    }

    // Remove card from player's hand
    const newHand = [...player.hand];
    newHand.splice(cardIndex, 1);

    // Add card to discard pile
    const newDiscardPile = [...roomData.discardPile, playedCard];

    // Get next player (simplified)
    const players = Object.keys(roomData.players);
    const currentPlayerIndex = players.indexOf(playerName);
    const nextPlayerIndex = (currentPlayerIndex + 1) % players.length;
    const nextPlayer = players[nextPlayerIndex];

    await update(roomRef, {
        [`players/${playerName}/hand`]: newHand,
        discardPile: newDiscardPile,
        currentPlayer: nextPlayer,
        topCard: playedCard
    });
};

// Draw a card
export const drawCard = async(roomCode, playerName) => {
    const roomRef = ref(database, `unoRooms/${roomCode}`);
    const snapshot = await get(roomRef);

    if (!snapshot.exists()) {
        throw new Error('Room not found');
    }

    const roomData = snapshot.val();
    const player = roomData.players[playerName];

    if (!player) {
        throw new Error('Player not found');
    }

    if (roomData.currentPlayer !== playerName) {
        throw new Error('Not your turn');
    }

    if (!roomData.deck || roomData.deck.length === 0) {
        throw new Error('No cards left in deck');
    }

    // Draw a card from deck
    const newDeck = [...roomData.deck];
    const drawnCard = newDeck.splice(0, 1)[0];
    const newHand = [...player.hand, drawnCard];

    await update(roomRef, {
        [`players/${playerName}/hand`]: newHand,
        deck: newDeck
    });
};

// End turn
export const endTurn = async(roomCode, playerName) => {
    const roomRef = ref(database, `unoRooms/${roomCode}`);
    const snapshot = await get(roomRef);

    if (!snapshot.exists()) {
        throw new Error('Room not found');
    }

    const roomData = snapshot.val();

    if (roomData.currentPlayer !== playerName) {
        throw new Error('Not your turn');
    }

    // Get next player
    const players = Object.keys(roomData.players);
    const currentPlayerIndex = players.indexOf(playerName);
    const nextPlayerIndex = (currentPlayerIndex + 1) % players.length;
    const nextPlayer = players[nextPlayerIndex];

    await update(roomRef, {
        currentPlayer: nextPlayer
    });
};