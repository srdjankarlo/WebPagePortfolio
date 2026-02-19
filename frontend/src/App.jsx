import React, { useState } from 'react';
import './App.css';

function App() {
  const [user, setUser] = useState(null); // To handle the "Welcome <username>" logic

  return (
    <div className="dashboard-container">
      {/* Top Navigation from PPTX */}
      <nav className="navbar">
        <div className="nav-links">
          <span>HOME</span>
          <span>GAMES</span>
          <span>PROJECTS</span>
          <span>TOOLS & APPS</span>
        </div>
        <div className="auth-links">
          {user ? (
            <button onClick={() => setUser(null)}>Log Out</button>
          ) : (
            <>
              <span>Register</span>
              <span>Login</span>
            </>
          )}
        </div>
      </nav>

      <main className="hero-section">
        {user ? (
          <h2 className="welcome-msg">Welcome {user}. Now you can play games and your score will be on the scoreboard.</h2>
        ) : (
          <div className="intro-text">
            <h1>Hi, I am Srdjan and this is my portfolio site.</h1>
            <p>I am a software engineer and I like to make stuff.</p>
            <p>If you are not here to hire me and just bored, you have some games to play, but you have to register so I can track your in game scores :3.</p>
          </div>
        )}
      </main>

      {/* Analytics Placeholder for later */}
      <footer className="analytics-footer">
        <div className="stat">Live Visits: 124</div>
        <div className="stat">Uptime: 99.9%</div>
      </footer>
    </div>
  );
}

export default App;