import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

// --- GOMOKU COMPONENT ---
function TicTacToe() {
  const GRID_SIZE = 15;
  const WIN_SEQUENCE = 5;
  const [board, setBoard] = useState(Array(GRID_SIZE * GRID_SIZE).fill(null));
  const [playerSymbol, setPlayerSymbol] = useState(Math.random() > 0.5 ? 'X' : 'O');
  const [isXNext, setIsXNext] = useState(true);
  const [sessionScore, setSessionScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);

  useEffect(() => {
    const isComputerTurn = (isXNext && playerSymbol === 'O') || (!isXNext && playerSymbol === 'X');
    if (isComputerTurn && !gameOver) {
      const timer = setTimeout(() => makeComputerMove(), 500);
      return () => clearTimeout(timer);
    }
  }, [isXNext, gameOver]);

  const checkWin = (squares, index, symbol) => {
    const directions = [[1, 0], [0, 1], [1, 1], [1, -1]];
    const r = Math.floor(index / GRID_SIZE);
    const c = index % GRID_SIZE;
    for (let [dr, dc] of directions) {
      let count = 1;
      for (let i = 1; i < WIN_SEQUENCE; i++) {
        let nr = r + dr * i, nc = c + dc * i;
        if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE && squares[nr * GRID_SIZE + nc] === symbol) count++;
        else break;
      }
      for (let i = 1; i < WIN_SEQUENCE; i++) {
        let nr = r - dr * i, nc = c - dc * i;
        if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE && squares[nr * GRID_SIZE + nc] === symbol) count++;
        else break;
      }
      if (count >= WIN_SEQUENCE) return true;
    }
    return false;
  };

  const submitWinToDB = async (scoreToSave) => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      await axios.post(`${API_BASE_URL}/submit-score`, 
        { game_name: 'XO', score: scoreToSave },
        { headers: { Authorization: `Bearer ${token}` }}
      );
    } catch (err) {
      if (err.response?.status === 401) {
        // handleLogout();
        // We will pass handleLogout down if needed, but for now we catch it
        console.error("Session expired");
      }
    }
  };

  const executeMove = (i, symbol) => {
    if (board[i] || gameOver) return;
    const newBoard = [...board];
    newBoard[i] = symbol;
    setBoard(newBoard);
    
    if (checkWin(newBoard, i, symbol)) {
      setGameOver(true);
      if (symbol === playerSymbol) {
        const newScore = sessionScore + 1;
        setSessionScore(newScore);
        submitWinToDB(newScore); 
        alert(`You Win! Current Streak: ${newScore}`);
      } else {
        setSessionScore(0); 
        alert("Computer Wins! Your streak has been reset to 0, but your High Score is safe.");
      }
    } else {
      setIsXNext(!isXNext);
    }
  };

  const makeComputerMove = () => {
    const computerSymbol = playerSymbol === 'X' ? 'O' : 'X';
    let bestScore = -1;
    let bestMove = -1;
    board.forEach((cell, i) => {
      if (cell) return;
      let score = evaluateSpot(i, computerSymbol) + (evaluateSpot(i, playerSymbol) * 1.1);
      if (score > bestScore) {
        bestScore = score;
        bestMove = i;
      }
    });
    if (bestMove !== -1) executeMove(bestMove, computerSymbol);
  };

  const evaluateSpot = (index, symbol) => {
    const directions = [[1, 0], [0, 1], [1, 1], [1, -1]];
    const r = Math.floor(index / GRID_SIZE);
    const c = index % GRID_SIZE;
    let totalValue = 0;
    for (let [dr, dc] of directions) {
      let count = 0;
      for (let i = 1; i < 5; i++) {
        let nr = r + dr * i, nc = c + dc * i;
        if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE && board[nr * GRID_SIZE + nc] === symbol) count++;
        else break;
      }
      for (let i = 1; i < 5; i++) {
        let nr = r - dr * i, nc = c - dc * i;
        if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE && board[nr * GRID_SIZE + nc] === symbol) count++;
        else break;
      }
      totalValue += Math.pow(10, count); 
    }
    return totalValue;
  };

  return (
    <div className="gomoku-container">
      <div className="game-info">
        <h3>Current Streak: <span className="score-badge">{sessionScore}</span></h3>
        <p>You: <strong>{playerSymbol}</strong> | Turn: <strong>{isXNext ? 'X' : 'O'}</strong></p>
        <p style={{fontSize: '0.8rem', color: '#888'}}>
          Your high score is saved automatically when you win!
        </p>
      </div>
      <div className="gomoku-grid">
        {board.map((val, i) => (
          <div key={i} className={`gomoku-square ${val || ''}`} onClick={() => !gameOver && executeMove(i, playerSymbol)}>
            {val}
          </div>
        ))}
      </div>
      <button className="reset-btn" onClick={() => {
        setBoard(Array(GRID_SIZE * GRID_SIZE).fill(null));
        setGameOver(false);
        setIsXNext(true);
        setPlayerSymbol(Math.random() > 0.5 ? 'X' : 'O');
      }}>Restart Board</button>
    </div>
  );
}

// --- MAIN APP ---
function App() {
  const [view, setView] = useState('HOME');
  const [user, setUser] = useState(null);
  const [selectedGame, setSelectedGame] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  
  // State for HOME page auth section ('LOGIN' or 'REGISTER')
  const [authMode, setAuthMode] = useState('LOGIN'); 

  // States for forms
  const [credentials, setCredentials] = useState({ identifier: '', password: '' });
  const [regData, setRegData] = useState({ username: '', email: '', password: '', confirmPassword: '' });

  const navigateTo = (newView) => {
    setView(newView);
    setSelectedGame(null);
  };

  useEffect(() => {
    const savedUser = localStorage.getItem('username');
    const token = localStorage.getItem('token');
    if (savedUser && token) setUser(savedUser);
  }, []);

  const fetchScores = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/leaderboard`);
      setLeaderboard(response.data || []);
      setSelectedGame('SCOREBOARD');
    } catch (err) {
      console.error("Leaderboard error:", err);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (regData.password !== regData.confirmPassword) {
      alert("Passwords do not match!");
      return;
    }
    try {
      // 1. Register
      await axios.post(`${API_BASE_URL}/register`, { 
        username: regData.username, 
        email: regData.email, 
        password: regData.password 
      });
      
      // 2. Auto-Login immediately after successful registration
      const loginRes = await axios.post(`${API_BASE_URL}/login`, {
        username: regData.username,
        password: regData.password
      });

      const token = loginRes.data.token;
      const actualUsername = loginRes.data.username; // Get the real username

      if (token && actualUsername) {
        localStorage.setItem('token', token);
        localStorage.setItem('username', actualUsername);
        setUser(actualUsername);
        setRegData({ username: '', email: '', password: '', confirmPassword: '' });
      }
    } catch (err) {
      alert(err.response?.data || "Registration failed");
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(`${API_BASE_URL}/login`, {
        username: credentials.identifier,
        password: credentials.password
      });

      const { token, username } = response.data; // Get BOTH from response
      
      if (token && username) {
        localStorage.setItem('token', token);
        localStorage.setItem('username', username); // Save the REAL username
        setUser(username);
        setCredentials({ identifier: '', password: '' });
      }
    } catch (err) {
      alert("Invalid login.");
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.clear();
    setSelectedGame(null);
    setView('HOME');
    setCredentials({ identifier: '', password: '' });
    setRegData({ username: '', email: '', password: '', confirmPassword: '' });
  };

  const cancelAuth = () => {
    // Clears the inputs
    setCredentials({ identifier: '', password: '' });
    setRegData({ username: '', email: '', password: '', confirmPassword: '' });
  };

  return (
    <div className="dashboard-container">
      <nav className="navbar">
        <div className="nav-links">
          <span onClick={() => navigateTo('HOME')} className={view === 'HOME' ? 'active-nav' : ''}> HOME</span>
          <span onClick={() => navigateTo('GAMES')} className={view === 'GAMES' ? 'active-nav' : ''}> GAMES</span>
          <span onClick={() => navigateTo('PROJECTS')} className={view === 'PROJECTS' ? 'active-nav' : ''}> PROJECTS</span>
          <span onClick={() => navigateTo('TOOLS')} className={view === 'TOOLS' ? 'active-nav' : ''}> TOOLS & APP's</span>
        </div>
        
        <div className="auth-links">
          {user && (
            <div className="user-area">
              <span>{user}</span>
              <button className="logout-btn" onClick={handleLogout}>Log Out</button>
            </div>
          )}
        </div>
      </nav>

      <main className="content-area">
        {view === 'HOME' && (
          <div className="home-layout">
            <div className="hero-section">
              <h1>Hi, I am Srdjan :3</h1>
              {user ? (
                <p>Welcome back! Head over to the GAMES tab to play.</p>
              ) : (
                <p>Register or Login to start playing games and saving your high scores!</p>
              )}
            </div>

            {/* Embedded Auth Section on the HOME page */}
            {!user && (
              <div className="home-auth-section">
                <div className="auth-toggle">
                  <button className={authMode === 'LOGIN' ? 'active' : ''} onClick={() => setAuthMode('LOGIN')}>Login</button>
                  <button className={authMode === 'REGISTER' ? 'active' : ''} onClick={() => setAuthMode('REGISTER')}>Register</button>
                </div>

                {authMode === 'LOGIN' ? (
                  <form className="embedded-auth-form" onSubmit={handleLogin}>
                    <h2>Login</h2>
                    <input type="text" placeholder="Username or Email" value={credentials.identifier} onChange={e => setCredentials({...credentials, identifier: e.target.value})} required />
                    <input type="password" placeholder="Password" value={credentials.password} onChange={e => setCredentials({...credentials, password: e.target.value})} required />
                    <div className="form-actions">
                      <button type="submit" className="primary-btn">Log In</button>
                      <button type="button" className="secondary-btn" onClick={cancelAuth}>Cancel</button>
                    </div>
                  </form>
                ) : (
                  <form className="embedded-auth-form" onSubmit={handleRegister}>
                    <h2>Register</h2>
                    <input type="text" placeholder="Username" value={regData.username} onChange={e => setRegData({...regData, username: e.target.value})} required />
                    <input type="email" placeholder="Email (Optional)" value={regData.email} onChange={e => setRegData({...regData, email: e.target.value})} />
                    <input type="password" placeholder="Password" value={regData.password} onChange={e => setRegData({...regData, password: e.target.value})} required />
                    <input type="password" placeholder="Confirm Password" value={regData.confirmPassword} onChange={e => setRegData({...regData, confirmPassword: e.target.value})} required />
                    <div className="form-actions">
                      <button type="submit" className="primary-btn">Register</button>
                      <button type="button" className="secondary-btn" onClick={cancelAuth}>Cancel</button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </div>
        )}

        {view === 'GAMES' && (
          <div className="games-layout">
            <aside className="games-sidebar">
              <h3>Arcade</h3>
              <button className={selectedGame === 'XO' ? 'active-sidebar-btn': ''} onClick={() => setSelectedGame('XO')}>X / O</button>
              <button className={selectedGame === 'Snake' ? 'active-sidebar-btn': ''} onClick={() => setSelectedGame('Snake')}>Snake</button>
              <button className={selectedGame === 'Battleships' ? 'active-sidebar-btn': ''} onClick={() => setSelectedGame('Battleships')}>Battleships</button>
              <button className={selectedGame === 'Tetris' ? 'active-sidebar-btn': ''} onClick={() => setSelectedGame('Tetris')}>Tetris</button>
              <button className={selectedGame === '3D Car Drive' ? 'active-sidebar-btn': ''} onClick={() => setSelectedGame('3D Car Drive')}>3D Car Drive</button>
              <button className={selectedGame === 'SCOREBOARD' ? 'active-sidebar-btn': ''} onClick={fetchScores}>🏆 Scoreboard</button>
            </aside>
            <section className="game-window">
              {!selectedGame ? (
                <div className="placeholder-msg">Select a game</div>
              ) : selectedGame === 'SCOREBOARD' ? (
                <div className="scoreboard-view">
                  <h2>Global Hall of Fame</h2>
                  <table>
                    <thead><tr><th>Player</th><th>Game</th><th>Score</th></tr></thead>
                    <tbody>
                      {leaderboard.map((entry, i) => (
                        <tr key={i}><td>{entry.username}</td><td>{entry.game_name}</td><td>{entry.score}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : !user ? (
                <div className="auth-notice">
                  <h2>Login required</h2>
                  <button onClick={() => navigateTo('HOME')}>Go to Login</button>
                </div>
              ) : (
                <div className="game-container">
                  {selectedGame === 'XO' && <TicTacToe />}
                  {selectedGame !== 'XO' && <h2>Coming soon...</h2>}
                </div>
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;