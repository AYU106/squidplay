import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { subscribeToRoom, leaveRoom, startGame } from '../firebaseUNO';
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
            navigate('/uno');
            return;
        }

        const unsubscribe = subscribeToRoom(roomCode, (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.val();
                setRoomData(data);

                if (data.status === 'playing') {
                    navigate(`/uno/game/${roomCode}`, {
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
            navigate('/uno');
        } catch (err) {
            console.error('Error leaving room:', err);
            navigate('/uno');
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
                <button onClick={() => navigate('/uno')}>Back to UNO</button>
            </div>
        );
    }

    const players = roomData?.players ? Object.values(roomData.players) : [];

    return (
        <div className="game-container">
            <div className="lobby-card">
                <div className="lobby-header">
                    <h1>🃏 UNO Lobby</h1>
                    <div className="room-code">Room Code: <span>{roomCode}</span></div>
                </div>

                <div className="players-section">
                    <h3>Players ({players.length}/13)</h3>
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
                            disabled={players.length < 2}
                        >
                            Start Game {players.length < 2 && '(Need 2+ players)'}
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
                </div>
            </div>
        </div>
    );
};

export default Lobby;
