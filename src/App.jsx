import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Homepage from './components/Homepage';

// UNO Components
import UNOGameEntry from './games/uno/components/GameEntry';
import UNOLobby from './games/uno/components/Lobby';
import UNOGameScreen from './games/uno/components/GameScreen';

// Spy Components
import SpyGameEntry from './games/who-is-the-spy/components/GameEntry';
import SpyLobby from './games/who-is-the-spy/components/Lobby';
import SpyGameScreen from './games/who-is-the-spy/components/GameScreen';

function App() {
    return ( <
        Router >
        <
        div className = "App" >
        <
        Routes >
        <
        Route path = "/"
        element = { < Homepage / > }
        />

        { /* UNO Routes */ } <
        Route path = "/uno"
        element = { < UNOGameEntry / > }
        /> <
        Route path = "/uno/lobby/:roomCode"
        element = { < UNOLobby / > }
        /> <
        Route path = "/uno/game/:roomCode"
        element = { < UNOGameScreen / > }
        />

        { /* Who's the Spy Routes */ } <
        Route path = "/spy"
        element = { < SpyGameEntry / > }
        /> <
        Route path = "/spy/lobby/:roomCode"
        element = { < SpyLobby / > }
        /> <
        Route path = "/spy/game/:roomCode"
        element = { < SpyGameScreen / > }
        /> <
        /Routes> <
        /div> <
        /Router>
    );
}

export default App;