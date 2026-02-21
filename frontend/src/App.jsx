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
        handleLogout();
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
        // We only submit to DB when you WIN
        submitWinToDB(newScore); 
        alert(`You Win! Current Streak: ${newScore}`);
      } else {
        // Computer wins: Reset streak in UI, but DO NOT tell the DB.
        // Your High Score in the DB remains safe!
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
  // 1. ALL missing state variables restored
  const [view, setView] = useState('HOME');
  const [user, setUser] = useState(null);
  const [selectedGame, setSelectedGame] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [showLogin, setShowLogin] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  
  // States for forms
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [regData, setRegData] = useState({ username: '', email: '', password: '', confirmPassword: '' });

  // 2. Navigation & Modal Logic
  const closeAllModals = () => {
    setShowLogin(false);
    setShowRegister(false);
    setCredentials({ username: '', password: '' });
    setRegData({ username: '', email: '', password: '', confirmPassword: '' });
  };

  const navigateTo = (newView) => {
    setView(newView);
    setSelectedGame(null);
    closeAllModals(); 
  };

  const openLogin = () => {
    closeAllModals();
    setShowLogin(true);
  };

  const openRegister = () => {
    closeAllModals();
    setShowRegister(true);
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
      // Added email to the payload
      await axios.post(`${API_BASE_URL}/register`, { 
        username: regData.username, 
        email: regData.email, 
        password: regData.password 
      });
      alert("Registration successful!");
      closeAllModals();
    } catch (err) {
      alert(err.response?.data || "Registration failed");
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(`${API_BASE_URL}/login`, credentials);
      console.log("Full Server Response:", response.data); // DEBUG LOG

      // Ensure we are grabbing the 'token' field from the JSON object
      const token = response.data.token;
      
      if (token) {
        localStorage.setItem('token', token);
        localStorage.setItem('username', credentials.username);
        setUser(credentials.username);
        closeAllModals();
        console.log("Token saved! Value starts with:", token.substring(0, 10));
      } else {
        alert("Login successful, but server didn't send a token.");
      }
    } catch (err) {
      console.error("Login Error:", err.response?.data || err.message);
      alert("Invalid login.");
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.clear();
    setSelectedGame(null);
    setView('HOME');
    // Clear the inputs so the next person doesn't see your password
    setCredentials({ username: '', password: '' });
    setRegData({ username: '', password: '', confirmPassword: '' });
  };

  const closeModals = () => {
    setShowLogin(false);
    setShowRegister(false);
    // Clear fields when clicking 'Cancel'
    setCredentials({ username: '', password: '' });
    setRegData({ username: '', password: '', confirmPassword: '' });
  };

  return (
    <div className="dashboard-container">
      <nav className="navbar">
        <div className="nav-links">
          <span onClick={() => navigateTo('HOME')}>HOME</span>
          <span onClick={() => navigateTo('GAMES')}>GAMES</span>
        </div>
        <div className="auth-links">
          {user ? (
            <div className="user-area">
              <span>{user}</span>
              <button className="logout-btn" onClick={handleLogout}>Log Out</button>
            </div>
          ) : (
            <>
              <span onClick={openRegister}>Register</span>
              <span onClick={openLogin}>Login</span>
            </>
          )}
        </div>
      </nav>

      {showLogin && <LoginModal credentials={credentials} setCredentials={setCredentials} handleLogin={handleLogin} onClose={closeModals} />}
      {showRegister && <RegisterModal regData={regData} setRegData={setRegData} handleRegister={handleRegister} onClose={closeModals} />}

      <main className="content-area">
        {view === 'HOME' && <div className="hero-section"><h1>Hi, I am Srdjan :3</h1><p>Register and Login to play GAMES!</p></div>}
        {view === 'GAMES' && (
          <div className="games-layout">
            <aside className="games-sidebar">
              <h3>Arcade</h3>
              <button onClick={() => setSelectedGame('XO')}>X / O</button>
              <button onClick={() => setSelectedGame('SNAKE')}>Snake</button>
              <button onClick={fetchScores}>🏆 Scoreboard</button>
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
                <div className="auth-notice"><h2>Login required</h2><button onClick={() => setShowLogin(true)}>Login</button></div>
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

// MODALS RESTORED
function LoginModal({credentials, setCredentials, handleLogin, onClose}) {
  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Login</h2>
        <form onSubmit={handleLogin}>
          <input type="text" placeholder="Username" value={credentials.username} onChange={e => setCredentials({...credentials, username: e.target.value})} required />
          <input type="password" placeholder="Password" value={credentials.password} onChange={e => setCredentials({...credentials, password: e.target.value})} required />
          <div className="modal-actions"><button type="submit">Log In</button><button type="button" onClick={onClose}>Cancel</button></div>
        </form>
      </div>
    </div>
  );
}

function RegisterModal({regData, setRegData, handleRegister, onClose}) {
  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Register</h2>
        <form onSubmit={handleRegister}>
          <input type="text" placeholder="Username" value={regData.username} 
            onChange={e => setRegData({...regData, username: e.target.value})} required />
          
          {/* New Email Field */}
          <input type="email" placeholder="Email (Optional)" value={regData.email} 
            onChange={e => setRegData({...regData, email: e.target.value})} />

          <input type="password" placeholder="Password" value={regData.password} 
            onChange={e => setRegData({...regData, password: e.target.value})} required />
          <input type="password" placeholder="Confirm Password" value={regData.confirmPassword} 
            onChange={e => setRegData({...regData, confirmPassword: e.target.value})} required />
          
          <div className="modal-actions">
            <button type="submit">Register</button>
            <button type="button" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default App;