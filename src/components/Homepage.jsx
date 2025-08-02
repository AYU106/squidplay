import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/homepage.css';

const games = [
  {
    id: 'uno',
    name: 'UNO',
    thumbnail: '/images/uno-thumbnail.png',
    path: '/uno',
    number: 1,
  },
  {
    id: 'spy',
    name: 'Who is the Spy',
    thumbnail: '/images/spy-thumbnail.png',
    path: '/spy',
    number: 2,
  },
];

const Homepage = () => {
  const navigate = useNavigate();

  return (
    <div className="homepage">
      <header className="homepage-header">
        <div className="header-nav">
          <div className="hamburger-menu">
            <span></span><span></span><span></span>
          </div>
          <div className="logo">
            <span className="logo-squid">Squid</span>
            <span className="logo-play">Play</span>
          </div>
          <div className="search-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
              xmlns="http://www.w3.org/2000/svg">
              <path d="M21 21L16.514 16.506L21 21ZM19 10.5C19 15.194 15.194 19 10.5 19C5.806 19 2 15.194 2 10.5C2 5.806 5.806 2 10.5 2C15.194 2 19 5.806 19 10.5Z"
                stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
      </header>

      <div className="games-scroll-wrapper">
        <div className="games-wrapper">
          {games.map((game) => (
            <div
              key={game.id}
              className="game-box"
              onClick={() => navigate(game.path)}
            >
              <span className="background-number">{game.number}</span>
              <img src={game.thumbnail} alt={game.name} className="game-thumbnail" />
              <div className="game-name-overlay">{game.name}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Homepage;
