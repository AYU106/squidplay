import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { subscribeToGame, playCard, drawCard, endTurn } from '../firebaseUNO';
import '../styles/GameScreen.css';

const GameScreen = () => {
    const { roomCode } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const [gameData, setGameData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const playerName = location.state?.playerName;

    useEffect(() => {
        if (!playerName) {
            navigate('/uno');
            return;
        }

        const unsubscribe = subscribeToGame(roomCode, (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.val();
                setGameData(data);

                if (data.status === 'finished') {
                    navigate(`/uno/result/${roomCode}`, {
                        state: { 
                            playerName, 
                            winner: data.winner,
                            finalScores: data.scores
                        }
                    });
                }
            } else {
                setError('Game not found');
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [roomCode, playerName, navigate]);

    const handlePlayCard = async (cardIndex) => {
        try {
            await playCard(roomCode, playerName, cardIndex);
        } catch (err) {
            setError(err.message);
        }
    };

    const handleDrawCard = async () => {
        try {
            await drawCard(roomCode, playerName);
        } catch (err) {
            setError(err.message);
        }
    };

    const handleEndTurn = async () => {
        try {
            await endTurn(roomCode, playerName);
        } catch (err) {
            setError(err.message);
        }
    };

    const leaveGame = () => {
        navigate('/uno');
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
                <button onClick={leaveGame}>Back to UNO</button>
            </div>
        );
    }

    const players = gameData?.players ? Object.values(gameData.players) : [];
    const currentPlayer = players.find(p => p.name === playerName);
    const currentTurnPlayer = gameData?.currentTurn;
    const topCard = gameData?.topCard;
    const isMyTurn = currentTurnPlayer === playerName;

    return (
        <div className="game-container">
            <div className="game-screen">
                <div className="game-header">
                    <h1>🃏 UNO Game</h1>
                    <div className="game-info">
                        <div className="current-turn">
                            Current Turn: <span className={isMyTurn ? 'my-turn' : ''}>{currentTurnPlayer}</span>
                        </div>
                        <button className="btn btn-small" onClick={leaveGame}>Leave Game</button>
                    </div>
                </div>

                <div className="game-board">
                    <div className="other-players">
                        {players.filter(p => p.name !== playerName).map((player, index) => (
                            <div key={index} className="other-player">
                                <div className="player-name">{player.name}</div>
                                <div className="card-count">{player.hand?.length || 0} cards</div>
                            </div>
                        ))}
                    </div>

                    <div className="center-area">
                        <div className="deck-area">
                            <div className="draw-pile" onClick={isMyTurn ? handleDrawCard : undefined}>
                                <div className="card back">🃏</div>
                                <div className="pile-label">Draw Pile</div>
                            </div>

                            <div className="discard-pile">
                                {topCard && (
                                    <div className={`card ${topCard.color}`}>
                                        {topCard.value}
                                    </div>
                                )}
                                <div className="pile-label">Top Card</div>
                            </div>
                        </div>

                        {gameData?.direction && (
                            <div className="game-direction">
                                Direction: {gameData.direction === 'clockwise' ? '→' : '←'}
                            </div>
                        )}
                    </div>
                </div>

                <div className="my-hand">
                    <h3>Your Hand ({currentPlayer?.hand?.length || 0} cards)</h3>
                    <div className="hand-cards">
                        {currentPlayer?.hand?.map((card, index) => (
                            <div 
                                key={index}
                                className={`card ${card.color} ${isMyTurn ? 'playable' : 'disabled'}`}
                                onClick={isMyTurn ? () => handlePlayCard(index) : undefined}
                            >
                                {card.value}
                            </div>
                        )) || <div className="no-cards">No cards</div>}
                    </div>

                    {isMyTurn && (
                        <div className="turn-actions">
                            <button className="btn btn-secondary" onClick={handleEndTurn}>
                                End Turn
                            </button>
                        </div>
                    )}
                </div>

                {error && (
                    <div className="error-message">
                        {error}
                    </div>
                )}
            </div>
        </div>
    );
};

export default GameScreen;
