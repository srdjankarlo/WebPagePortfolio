import React, { useState } from 'react';
import axios from 'axios'; // We installed this earlier!
import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const [showLogin, setShowLogin] = useState(false);
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [showRegister, setShowRegister] = useState(false);
  const [regData, setRegData] = useState({ username: '', password: '', confirmPassword: '' });

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
          <span>HOME</span>
          <span>GAMES</span>
          <span>PROJECTS</span>
          <span>TOOLS & APPS</span>
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
                <label>Password:</label>
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

      <main className="hero-section">
        {user ? (
          <h2 className="welcome-msg">
            Welcome {user}. Now you can play games and your score will be on the scoreboard. 
          </h2>
        ) : (
          <div className="intro-text">
            <h1>Hi, I am Srdjan and this is my portfolio site.</h1>
            <p>I am a software engineer and I like to make stuff.</p>
            <p>If you are not here to hire me and just bored, you have some games to play.</p>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;