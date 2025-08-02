import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { subscribeToRoom, leaveRoom, startVoting, castVote, sendMessage, subscribeToMessages } from '../firebaseSpy';
import '../styles/GameScreen.css';

const GameScreen = () => {
    const { roomCode } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const [roomData, setRoomData] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [timeLeft, setTimeLeft] = useState(0);
    const messagesEndRef = useRef(null);

    const playerName = location.state?.playerName;

    useEffect(() => {
        if (!playerName) {
            navigate('/spy');
            return;
        }

        const unsubscribeRoom = subscribeToRoom(roomCode, (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.val();
                setRoomData(data);

                if (data.status === 'waiting') {
                    navigate(`/spy/lobby/${roomCode}`, {
                        state: { playerName, isHost: data.players?.[playerName]?.isHost }
                    });
                } else if (data.status === 'finished') {
                    navigate(`/spy/results/${roomCode}`, {
                        state: { playerName }
                    });
                }

                // Set timer based on phase
                if (data.phaseStartTime) {
                    const now = Date.now();
                    const phaseStart = data.phaseStartTime;
                    const phaseDuration = data.phase === 'discussion' ? 
                        (data.gameMode === 'speedrun' ? 2 * 60 * 1000 : 5 * 60 * 1000) : 
                        60 * 1000; // 1 minute for voting
                    
                    const elapsed = now - phaseStart;
                    const remaining = Math.max(0, phaseDuration - elapsed);
                    setTimeLeft(Math.ceil(remaining / 1000));
                }
            } else {
                setError('Room not found');
            }
            setLoading(false);
        });

        const unsubscribeMessages = subscribeToMessages(roomCode, (snapshot) => {
            if (snapshot.exists()) {
                const messagesData = snapshot.val();
                const messagesList = Object.values(messagesData).sort((a, b) => a.timestamp - b.timestamp);
                setMessages(messagesList);
            } else {
                setMessages([]);
            }
        });

        return () => {
            unsubscribeRoom();
            unsubscribeMessages();
        };
    }, [roomCode, playerName, navigate]);

    // Timer countdown
    useEffect(() => {
        if (timeLeft > 0) {
            const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [timeLeft]);

    // Auto-scroll messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleLeaveGame = async () => {
        try {
            await leaveRoom(roomCode, playerName);
            navigate('/spy');
        } catch (err) {
            console.error('Error leaving room:', err);
            navigate('/spy');
        }
    };

    const handleStartVoting = async () => {
        try {
            await startVoting(roomCode);
        } catch (err) {
            setError(err.message);
        }
    };

    const handleVote = async (targetName) => {
        try {
            await castVote(roomCode, playerName, targetName);
        } catch (err) {
            setError(err.message);
        }
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim()) return;

        try {
            await sendMessage(roomCode, playerName, newMessage.trim());
            setNewMessage('');
        } catch (err) {
            setError(err.message);
        }
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    if (loading) {
        return (
            <div className="game-container">
                <div className="loading">Loading game...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="game-container">
                <div className="error">{error}</div>
                <button onClick={() => navigate('/spy')}>Back to Who's the Spy</button>
            </div>
        );
    }

    const players = roomData?.players ? Object.values(roomData.players) : [];
    const currentPlayer = roomData?.players?.[playerName];
    const isSpy = currentPlayer?.isSpy;
    const isDoppelganger = currentPlayer?.isDoppelganger;
    const gameWord = currentPlayer?.gameWord;
    const phase = roomData?.phase;
    const votes = roomData?.votes || {};
    const gameMode = roomData?.gameMode || 'normal';

    return (
        <div className="spy-game-screen">
            <div className="game-header">
                <div className="header-info">
                    <h2>🕵️ Who's the Spy - Room: {roomCode}</h2>
                    <div className="game-mode-badge">{gameMode.toUpperCase()}</div>
                </div>
                <div className="header-controls">
                    <div className="timer">
                        <span className="timer-label">{phase === 'discussion' ? 'Discussion' : 'Voting'}</span>
                        <span className={`timer-value ${timeLeft <= 30 ? 'urgent' : ''}`}>
                            {formatTime(timeLeft)}
                        </span>
                    </div>
                    <button className="leave-btn" onClick={handleLeaveGame}>Leave Game</button>
                </div>
            </div>

            <div className="game-layout">
                {/* Left Side - Role and Players */}
                <div className="left-panel">
                    <div className="role-card">
                        <h3>Your Role:</h3>
                        <div className={`role-info ${isSpy ? 'spy' : isDoppelganger ? 'doppelganger' : 'civilian'}`}>
                            {isSpy ? (
                                <div>
                                    <p><strong>You are the SPY! 🕵️</strong></p>
                                    <p>Try to figure out what word others are talking about!</p>
                                </div>
                            ) : isDoppelganger ? (
                                <div>
                                    <p><strong>You are the DOPPELGANGER! 👥</strong></p>
                                    <p>Your word is: <strong>{gameWord}</strong></p>
                                    <p>You have a different word from other civilians!</p>
                                </div>
                            ) : (
                                <div>
                                    <p><strong>You are a CIVILIAN 👤</strong></p>
                                    <p>Your word is: <strong>{gameWord}</strong></p>
                                    <p>Find the spy among you!</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="players-section">
                        <h3>Players ({players.length}):</h3>
                        <div className="players-list">
                            {players.map((player, index) => (
                                <div key={index} className="player-card">
                                    <div className="player-info">
                                        <span className="player-name">{player.name}</span>
                                        {player.isHost && <span className="host-badge">Host</span>}
                                        {player.votedFor && phase === 'voting' && (
                                            <span className="vote-status">Voted</span>
                                        )}
                                    </div>

                                    {phase === 'voting' && player.name !== playerName && (
                                        <button 
                                            className={`vote-btn ${currentPlayer?.votedFor === player.name ? 'voted' : ''}`}
                                            onClick={() => handleVote(player.name)}
                                            disabled={currentPlayer?.votedFor !== null}
                                        >
                                            {currentPlayer?.votedFor === player.name ? 'Voted' : 'Vote'}
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {phase === 'discussion' && currentPlayer?.isHost && (
                        <div className="host-controls">
                            <button className="btn btn-primary" onClick={handleStartVoting}>
                                Start Voting Phase
                            </button>
                        </div>
                    )}
                </div>

                {/* Right Side - Chat */}
                <div className="right-panel">
                    <div className="chat-section">
                        <div className="chat-header">
                            <h3>💬 Discussion Chat</h3>
                            {phase === 'discussion' ? (
                                <span className="chat-status">Chat Active</span>
                            ) : (
                                <span className="chat-status voting">Voting Phase - No Chat</span>
                            )}
                        </div>
                        
                        <div className="chat-messages">
                            {messages.map((message, index) => (
                                <div 
                                    key={index} 
                                    className={`message ${message.sender === playerName ? 'own-message' : ''}`}
                                >
                                    <div className="message-sender">{message.sender}</div>
                                    <div className="message-content">{message.content}</div>
                                    <div className="message-time">
                                        {new Date(message.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                    </div>
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>

                        {phase === 'discussion' && (
                            <form className="chat-input" onSubmit={handleSendMessage}>
                                <input
                                    type="text"
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    placeholder="Type your message..."
                                    maxLength={200}
                                />
                                <button type="submit" disabled={!newMessage.trim()}>
                                    Send
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            </div>

            {phase === 'voting' && (
                <div className="voting-info">
                    <h3>Voting Results:</h3>
                    <div className="votes-display">
                        {Object.entries(votes).map(([voter, target]) => (
                            <div key={voter} className="vote-item">
                                <span>{voter}</span> → <span>{target}</span>
                            </div>
                        ))}
                    </div>
                    <p>Votes cast: {Object.keys(votes).length}/{players.length}</p>
                </div>
            )}
        </div>
    );
};

export default GameScreen;