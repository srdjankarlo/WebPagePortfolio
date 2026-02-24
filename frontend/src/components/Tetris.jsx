import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';

const COLS = 10;
const ROWS = 20;
const BLOCK_SIZE = 20;
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

const SHAPES = {
    I: [[1, 1, 1, 1]],
    L: [[1, 0], [1, 0], [1, 1]],
    J: [[0, 1], [0, 1], [1, 1]],
    O: [[1, 1], [1, 1]],
    Z: [[1, 1, 0], [0, 1, 1]],
    S: [[0, 1, 1], [1, 1, 0]],
    T: [[1, 1, 1], [0, 1, 0]]
};

const COLORS = {
    I: '#00f0f0', L: '#f0a000', J: '#0000f0',
    O: '#f0f000', Z: '#f00000', S: '#00f000', T: '#a000f0'
};

export default function Tetris() {
    const [grid, setGrid] = useState(Array.from({ length: ROWS }, () => Array(COLS).fill(0)));
    const [activePiece, setActivePiece] = useState(null);
    const [nextPiece, setNextPiece] = useState(null); 
    const [score, setScore] = useState(0);
    const [gameOver, setGameOver] = useState(false);
    const [isPaused, setIsPaused] = useState(true);

    // Refs for instant math (Bypasses React's async state delay)
    const gridRef = useRef(grid);
    const pieceRef = useRef(activePiece);
    const nextPieceRef = useRef(nextPiece); // NEW REF
    const scoreRef = useRef(score);
    const gameOverRef = useRef(gameOver);
    const isPausedRef = useRef(isPaused);

    useEffect(() => { isPausedRef.current = isPaused; }, [isPaused]);
    // Sync it whenever gameOver state changes
    useEffect(() => { gameOverRef.current = gameOver; }, [gameOver]);
    useEffect(() => { gridRef.current = grid; }, [grid]);
    useEffect(() => { pieceRef.current = activePiece; }, [activePiece]);
    useEffect(() => { nextPieceRef.current = nextPiece; }, [nextPiece]);
    useEffect(() => { scoreRef.current = score; }, [score]);

    const getRandomPiece = useCallback(() => {
        const keys = Object.keys(SHAPES);
        const type = keys[Math.floor(Math.random() * keys.length)];
        return {
            pos: { x: Math.floor(COLS / 2) - 1, y: 0 },
            shape: SHAPES[type],
            color: COLORS[type],
            type: type
        };
    }, []);

    useEffect(() => {
        if (!activePiece && !gameOver) {
            const first = getRandomPiece();
            const second = getRandomPiece();
            setActivePiece(first);
            setNextPiece(second);
            // Manually set refs on init just to be safe
            pieceRef.current = first;
            nextPieceRef.current = second;
        }
    }, []);

    const checkCollision = (piece, moveX = 0, moveY = 0, newShape = null) => {
        if (!piece) return false;
        const shape = newShape || piece.shape;
        for (let y = 0; y < shape.length; y++) {
            for (let x = 0; x < shape[y].length; x++) {
                if (shape[y][x] !== 0) {
                    const newX = piece.pos.x + x + moveX;
                    const newY = piece.pos.y + y + moveY;
                    if (newX < 0 || newX >= COLS || newY >= ROWS || (newY >= 0 && gridRef.current[newY][newX] !== 0)) {
                        return true;
                    }
                }
            }
        }
        return false;
    };

    const rotate = (matrix) => matrix[0].map((_, i) => matrix.map(row => row[i]).reverse());

    const handleMove = (dirX, dirY) => {
        if (!pieceRef.current || gameOverRef.current || isPausedRef.current) return;
        
        if (!checkCollision(pieceRef.current, dirX, dirY)) {
            const nextPos = { 
                x: pieceRef.current.pos.x + dirX, 
                y: pieceRef.current.pos.y + dirY 
            };
            
            // Update both State (for eyes) and Ref (for physics)
            setActivePiece(prev => ({ ...prev, pos: nextPos }));
            pieceRef.current = { ...pieceRef.current, pos: nextPos };
        } else if (dirY > 0) {
            lockPiece();
        }
    };

    const lockPiece = () => {
        const p = pieceRef.current;
        if (!p) return; // Safety catch

        const newGrid = gridRef.current.map(row => [...row]);
        
        p.shape.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value !== 0) {
                    const boardY = p.pos.y + y;
                    const boardX = p.pos.x + x;
                    if (boardY >= 0) newGrid[boardY][boardX] = p.color;
                }
            });
        });

        let linesCleared = 0;
        const filteredGrid = newGrid.filter(row => {
            const isFull = row.every(cell => cell !== 0);
            if (isFull) linesCleared++;
            return !isFull;
        });
        
        while (filteredGrid.length < ROWS) {
            filteredGrid.unshift(Array(COLS).fill(0));
        }

        if (linesCleared > 0) setScore(s => s + linesCleared);
        
        setGrid(filteredGrid);
        gridRef.current = filteredGrid; // INSTANT GRID UPDATE

        const upcoming = nextPieceRef.current; // Grab from REF, not state!
        
        if (checkCollision(upcoming)) {
            setGameOver(true);
        } else {
            const newPrediction = getRandomPiece();
            
            // 1. Update React State (for the screen)
            setActivePiece(upcoming);
            setNextPiece(newPrediction);
            
            // 2. Update Refs instantly (so the next millisecond knows what's going on)
            pieceRef.current = upcoming;
            nextPieceRef.current = newPrediction;
        }
    };

    useEffect(() => {
        const handleKey = (e) => {
            // PREVENT PAGE SCROLLING
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
                e.preventDefault();
            }

            if (gameOverRef.current) {
                // If the game is over, Space resets it
                if (e.key === ' ') resetGame();
                return; 
            }

            if (['ArrowLeft', 'a'].includes(e.key)) handleMove(-1, 0);
            if (['ArrowRight', 'd'].includes(e.key)) handleMove(1, 0);
            if (['ArrowDown', 's'].includes(e.key)) handleMove(0, 1);
            if (['ArrowUp', 'w'].includes(e.key)) {
                const currentPiece = pieceRef.current;
                if (!currentPiece) return;

                const rotatedShape = rotate(currentPiece.shape);
                
                // Try 5 different positions: Original, Left 1, Right 1, Left 2, Right 2
                const kickOffsets = [0, -1, 1, -2, 2];
                
                for (let offset of kickOffsets) {
                    if (!checkCollision(currentPiece, offset, 0, rotatedShape)) {
                        const nextPos = { 
                            x: currentPiece.pos.x + offset, 
                            y: currentPiece.pos.y 
                        };
                        
                        // 1. Update the Ref (Physics)
                        pieceRef.current = { ...currentPiece, shape: rotatedShape, pos: nextPos };
                        
                        // 2. Update the State (Visuals)
                        setActivePiece({ ...currentPiece, shape: rotatedShape, pos: nextPos });
                        
                        break; // Exit loop once it fits!
                    }
                }
            }

            if (e.key === ' ') {
                e.preventDefault();
                setIsPaused(p => !p);
            }
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [gameOver, isPaused]);

    useEffect(() => {
        if (gameOver || isPaused) return;
        const dropTimer = setInterval(() => handleMove(0, 1), 800);
        return () => clearInterval(dropTimer);
    }, [activePiece, gameOver, isPaused]);

    useEffect(() => {
        if (gameOver && scoreRef.current > 0) {
            const token = localStorage.getItem('token');
            if (token) {
                axios.post(`${API_BASE_URL}/submit-score`, 
                { game_name: 'Tetris', score: scoreRef.current },
                { headers: { Authorization: `Bearer ${token}` }}
                );
            }
        }
    }, [gameOver]);

    const resetGame = () => {
        setGrid(Array.from({ length: ROWS }, () => Array(COLS).fill(0)));
        setScore(0);
        setGameOver(false);
        setIsPaused(false);
        
        const first = getRandomPiece();
        const second = getRandomPiece();
        setActivePiece(first);
        setNextPiece(second);
        pieceRef.current = first;
        nextPieceRef.current = second;
    };

    useEffect(() => {
        // This timer runs independently of piece rotations
        const dropTimer = setInterval(() => {
            if (!gameOverRef.current && !isPausedRef.current) {
                handleMove(0, 1);
            }
        }, 800);

        return () => clearInterval(dropTimer);
    }, []);

    return (
        <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start', justifyContent: 'center', color: 'white' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <h2>Tetris 🧱</h2>
                <p>Use W, A, S, D or KEY ARROWS to move.<br></br>SAPCE to PAUSE.</p>
                <div style={{
                width: COLS * BLOCK_SIZE, height: ROWS * BLOCK_SIZE,
                backgroundColor: '#111', border: '2px solid #444', position: 'relative'
                }}>
                {grid.map((row, y) => row.map((cell, x) => (
                    cell !== 0 && <div key={`${y}-${x}`} style={{
                    position: 'absolute', top: y * BLOCK_SIZE, left: x * BLOCK_SIZE,
                    width: BLOCK_SIZE, height: BLOCK_SIZE, backgroundColor: cell, border: '1px solid #000'
                    }} />
                )))}
                {activePiece && activePiece.shape.map((row, y) => row.map((cell, x) => (
                    cell !== 0 && <div key={`p-${y}-${x}`} style={{
                    position: 'absolute', top: (activePiece.pos.y + y) * BLOCK_SIZE,
                    left: (activePiece.pos.x + x) * BLOCK_SIZE,
                    width: BLOCK_SIZE, height: BLOCK_SIZE, backgroundColor: activePiece.color, border: '1px solid #000'
                    }} />
                )))}
                {(gameOver || isPaused) && (
                    <div style={{
                    position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)',
                    display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', zIndex: 10
                    }}>
                        <h3 style={{ color: gameOver ? '#ff4d4d' : '#4ade80' }}>{gameOver ? 'GAME OVER' : 'PAUSED'}</h3>
                        <button className="reset-btn" onClick={resetGame}>{gameOver ? 'Restart' : 'Resume'}</button>
                    </div>
                )}
                </div>
            </div>

            <div style={{ marginTop: '60px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ padding: '15px', backgroundColor: '#222', border: '1px solid #444', borderRadius: '8px', textAlign: 'center' }}>
                    <p style={{ margin: 0, fontSize: '0.9rem', color: '#888' }}>SCORE</p>
                    <h2 style={{ margin: 0 }}>{score}</h2>
                </div>

                <div style={{ padding: '15px', backgroundColor: '#222', border: '1px solid #444', borderRadius: '8px' }}>
                    <p style={{ margin: 0, fontSize: '0.9rem', color: '#888', marginBottom: '10px', textAlign: 'center' }}>NEXT</p>
                    <div style={{ width: '80px', height: '80px', position: 'relative', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ position: 'relative', width: '60px', height: '30px' }}> 
                        {nextPiece && nextPiece.shape.map((row, y) => row.map((cell, x) => (
                            cell !== 0 && <div key={`next-${y}-${x}`} style={{
                            position: 'absolute', top: y * 15, left: x * 15,
                            width: 15, height: 15, backgroundColor: nextPiece.color, border: '1px solid #000'
                            }} />
                        )))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}