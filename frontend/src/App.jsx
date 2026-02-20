import React, { useState } from 'react';
import axios from 'axios'; // We installed this earlier!
import './App.css';

function TicTacToe() {
  const [board, setBoard] = useState(Array(9).fill(null));
  const [xIsNext, setXIsNext] = useState(true);

  const calculateWinner = (squares) => {
    const lines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
      [0, 3, 6], [1, 4, 7], [2, 5, 8], // Cols
      [0, 4, 8], [2, 4, 6],          // Diagonals
    ];
    for (let i = 0; i < lines.length; i++) {
      const [a, b, c] = lines[i];
      if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
        return squares[a];
      }
    }
    return null;
  };

  const handleClick = (i) => {
    const winner = calculateWinner(board);
    if (winner || board[i]) return;
    const newBoard = board.slice();
    newBoard[i] = xIsNext ? 'X' : 'O';
    setBoard(newBoard);
    setXIsNext(!xIsNext);
  };

  const winner = calculateWinner(board);
  const status = winner ? `Winner: ${winner}` : `Next player: ${xIsNext ? 'X' : 'O'}`;

  return (
    <div className="xo-game">
      <h3>{status}</h3>
      <div className="xo-grid">
        {board.map((val, i) => (
          <button key={i} className="xo-square" onClick={() => handleClick(i)}>
            {val}
          </button>
        ))}
      </div>
      <button className="reset-btn" onClick={() => setBoard(Array(9).fill(null))}>Restart Game</button>
    </div>
  );
}

function App() {
  const [view, setView] = useState('HOME');
  const [user, setUser] = useState(null);
  const [showLogin, setShowLogin] = useState(false);
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [showRegister, setShowRegister] = useState(false);
  const [regData, setRegData] = useState({ username: '', password: '', confirmPassword: '' });
  const [selectedGame, setSelectedGame] = useState(null);

  // Add the Register handler:
  const handleRegister = async (e) => {
    e.preventDefault();
    if (regData.password !== regData.confirmPassword) {
      alert("Passwords do not match!");
      return;
    }
    try {
      await axios.post('http://localhost:8080/register', {
        username: regData.username,
        password: regData.password
      });
      alert("Registration successful! Now you can login.");
      setShowRegister(false);
    } catch (err) {
      // This logs the full error to F12 so you can see the structure
      console.error("Registration Error:", err);

      // If the backend sent a response, use that message
      if (err.response && err.response.data) {
          // Go's http.Error sends plain text, so err.response.data is that string
          alert(err.response.data);
      } else {
          alert("Network error: Could not connect to the server.");
      }
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      // Connect to your Go backend!
      const response = await axios.post('http://localhost:8080/login', credentials);
      const token = response.data.token;
      
      // Save the VIP wristband (JWT) in the browser
      localStorage.setItem('token', token);
      setUser(credentials.username);
      setShowLogin(false);
      alert("Logged in successfully!");
    } catch (err) {
      alert("Login failed! Check your credentials.");
    }
  };

  return (
    <div className="dashboard-container">
      <nav className="navbar">
        <div className="nav-links">
          <span onClick={() => { setView('HOME'); setSelectedGame(null); }}>HOME</span>
          <span onClick={() => setView('GAMES')}>GAMES</span>
          <span onClick={() => setView('PROJECTS')}>PROJECTS</span>
          <span onClick={() => setView('TOOLS')}>TOOLS & APPS</span>
        </div>
        <div className="auth-links">
          {user ? (
            <div className="user-area">
               <span>Welcome, {user}</span>
               <button className="logout-btn" onClick={() => { setUser(null); localStorage.removeItem('token'); }}>Log Out</button>
            </div>
          ) : (
            <>
              <span onClick={() => setShowRegister(true)}>Register</span>
              <span onClick={() => setShowLogin(true)}>Login</span>
            </>
          )}
        </div>
      </nav>

      {/* The Login Modal as seen in your PPTX logic */}
      {showLogin && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Login</h2>
            <form onSubmit={handleLogin}>
              <div className="input-group">
                <label>Username:</label>
                <input 
                  type="text" 
                  onChange={(e) => setCredentials({...credentials, username: e.target.value})} 
                  required 
                />
              </div>
              <div className="input-group">
                <label>Password: </label>
                <input 
                  type="password" 
                  onChange={(e) => setCredentials({...credentials, password: e.target.value})} 
                  required 
                />
              </div>
              <div className="modal-actions">
                <button type="submit">Log In</button>
                <button type="button" onClick={() => setShowLogin(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Register Modal based on PPTX [cite: 7, 8, 9, 10] */}
      {showRegister && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Register</h2>
            <form onSubmit={handleRegister}>
              <div className="input-group">
                <label>Username:</label>
                <input 
                  type="text" 
                  onChange={(e) => setRegData({...regData, username: e.target.value})} 
                  required 
                />
              </div>
              <div className="input-group">
                <label>Password:</label>
                <input 
                  type="password" 
                  onChange={(e) => setRegData({...regData, password: e.target.value})} 
                  required 
                />
              </div>
              <div className="input-group">
                <label>Confirm Password:</label>
                <input 
                  type="password" 
                  onChange={(e) => setRegData({...regData, confirmPassword: e.target.value})} 
                  required 
                />
              </div>
              <div className="modal-actions">
                <button type="submit">Register</button>
                <button type="button" onClick={() => setShowRegister(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <main className="content-area">
        {view === 'HOME' && (
          <div className="hero-section">
            <h1>Hi, I am Srdjan and this is my portfolio site.</h1>
            <p>I am a software engineer and I like to make stuff.</p>
            <p>If you are bored, you have some games to play :3.</p>
          </div>
        )}

        {view === 'GAMES' && (
          <div className="games-layout">
            {/* Sidebar - Visible to everyone */}
            <aside className="games-sidebar">
              <h3>Arcade</h3>
              <button onClick={() => setSelectedGame('XO')}>X / O</button>
              <button onClick={() => setSelectedGame('TETRIS')}>Tetris</button>
              <button onClick={() => setSelectedGame('SNAKE')}>Snake</button>
              <button onClick={() => setSelectedGame('BATTLESHIP')}>Battleships</button>
              <hr />
              <button onClick={() => setSelectedGame('SCOREBOARD')}>🏆 Scoreboard</button>
            </aside>

            {/* Game Window */}
            <section className="game-window">
              {!selectedGame ? (
                <div className="placeholder-msg">Select a game to start!</div>
              ) : !user && selectedGame !== 'SCOREBOARD' ? (
                <div className="auth-notice">
                  <h2>Hold on! 🛑</h2>
                  <p>You need to be logged in to play and save your high scores.</p>
                  <button onClick={() => setShowLogin(true)}>Login Now</button>
                </div>
              ) : (
                <div className="game-container">
                  {selectedGame === 'XO' && <TicTacToe />}
                              
                  {/* {selectedGame === 'TETRIS' && <h2>Tetris Coming Soon...</h2>} */}
                  {/* Add other games here later */}
                  {selectedGame !== 'XO' && <h2>Game logic in work...</h2>}
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