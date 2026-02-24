import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

export default function XO() {
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
      console.error("Score submission error:", err);
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
        alert("Computer Wins! Your streak has been reset to 0.");
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