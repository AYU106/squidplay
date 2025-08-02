import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { subscribeToRoom, leaveRoom, startGame } from '../firebaseSpy';
import '../styles/Lobby.css';

const Lobby = () => {
    const { roomCode } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const [roomData, setRoomData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const playerName = location.state?.playerName;
    const isHost = location.state?.isHost || false;

    useEffect(() => {
        if (!playerName) {
            navigate('/spy');
            return;
        }

        const unsubscribe = subscribeToRoom(roomCode, (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.val();
                setRoomData(data);

                if (data.status === 'playing') {
                    navigate(`/spy/game/${roomCode}`, {
                        state: { playerName, isHost }
                    });
                }
            } else {
                setError('Room not found');
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [roomCode, playerName, navigate, isHost]);

    const handleStartGame = async () => {
        try {
            await startGame(roomCode);
        } catch (err) {
            setError(err.message);
        }
    };

    const handleLeaveRoom = async () => {
        try {
            await leaveRoom(roomCode, playerName);
            navigate('/spy');
        } catch (err) {
            console.error('Error leaving room:', err);
            navigate('/spy');
        }
    };

    if (loading) {
        return (
            <div className="game-container">
                <div className="loading">Loading...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="game-container">
                <div className="error">{error}</div>
                <button onClick={() => navigate('/spy')}>Back to Spy</button>
            </div>
        );
    }

    const players = roomData?.players ? Object.values(roomData.players) : [];
    const gameMode = roomData?.gameMode || 'normal';

    const gameModeInfo = {
        normal: { name: 'Normal Mode', icon: '🕵️', time: '5min + 1min' },
        speedrun: { name: 'Speed Run', icon: '⚡', time: '2min + 1min' },
        doppelganger: { name: 'Doppelganger', icon: '👥', time: '5min + 1min' }
    };

    return (
        <div className="game-container">
            <div className="lobby-card">
                <div className="lobby-header">
                    <h1>🕵️ Who is the Spy? Lobby</h1>
                    <div className="room-info">
                        <div className="room-code">Room Code: <span>{roomCode}</span></div>
                        <div className="game-mode-info">
                            <span className="mode-icon">{gameModeInfo[gameMode].icon}</span>
                            <span className="mode-name">{gameModeInfo[gameMode].name}</span>
                            <span className="mode-time">({gameModeInfo[gameMode].time})</span>
                        </div>
                    </div>
                </div>

                <div className="players-section">
                    <h3>Players ({players.length}/10)</h3>
                    <div className="players-list">
                        {players.map((player, index) => (
                            <div key={index} className="player-item">
                                <span className="player-name">{player.name}</span>
                                {player.isHost && <span className="host-badge">Host</span>}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="lobby-actions">
                    {isHost && (
                        <button 
                            className="btn btn-primary"
                            onClick={handleStartGame}
                            disabled={players.length < 3}
                        >
                            Start Game {players.length < 3 && '(Need 3+ players)'}
                        </button>
                    )}

                    <button
                        className="btn btn-secondary"
                        onClick={handleLeaveRoom}
                    >
                        Leave Room
                    </button>
                </div>

                <div className="game-info">
                    <p>Share the room code with friends to invite them!</p>
                    <p>Game will start when the host clicks "Start Game"</p>
                    {gameMode === 'doppelganger' && (
                        <div className="doppelganger-info">
                            <p><strong>Doppelganger Mode:</strong> One civilian will get a different word to create confusion!</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Lobby;