import { useState, useEffect, useCallback, useRef } from 'react'; // Added useRef here
import axios from 'axios'; // Import axios to match your App.jsx style

// const GRID_SIZE = 20;
const GRID_SIZE = 7;
// const GRID_SIZE = 4;
const GAME_SPEED = 150;
// const GAME_SPEED = 500;

// const INITIAL_SNAKE = [{ x: 10, y: 10 }];
const INITIAL_SNAKE = [{ x: 3, y: 3 }];
// const INITIAL_SNAKE = [{ x: 1, y: 2 }];
const INITIAL_DIRECTION = { x: 0, y: -1 };
// const INITIAL_FOOD = { x: 5, y: 5 };
const INITIAL_FOOD = { x: 1, y: 1 };

export default function Snake() {
    const [snake, setSnake] = useState(INITIAL_SNAKE);
    const [direction, setDirection] = useState(INITIAL_DIRECTION);
    const [food, setFood] = useState(INITIAL_FOOD);
    const [isGameOver, setIsGameOver] = useState(false);
    const [score, setScore] = useState(0);
    const [isPaused, setIsPaused] = useState(true);

    // Refs to keep the game loop perfectly in sync
    const snakeRef = useRef(snake);
    const directionRef = useRef(direction);
    const foodRef = useRef(food);
    const scoreRef = useRef(score); // Added a ref for score
    const isGameOverRef = useRef(isGameOver);

    useEffect(() => { isGameOverRef.current = isGameOver; }, [isGameOver]);
    useEffect(() => { snakeRef.current = snake; }, [snake]);
    useEffect(() => { directionRef.current = direction; }, [direction]);
    useEffect(() => { foodRef.current = food; }, [food]);
    useEffect(() => { scoreRef.current = score; }, [score]); // Keep scoreRef updated

    const generateFood = useCallback((currentSnake) => {
        // Safety check: if the snake is somehow filling the whole grid, stop
        if (currentSnake.length >= GRID_SIZE * GRID_SIZE) return { x: -1, y: -1 };

        let newFood;
        let attempts = 0;
        while (attempts < 1000) { // Safety cap to prevent infinite loops
            newFood = {
                x: Math.floor(Math.random() * GRID_SIZE),
                y: Math.floor(Math.random() * GRID_SIZE),
            };
            const onSnake = currentSnake.some(s => s.x === newFood.x && s.y === newFood.y);
            if (!onSnake) return newFood;
            attempts++;
        }
        return newFood;
    }, []);

    useEffect(() => {
        const handleKeyDown = (e) => {
            const currentDir = directionRef.current; // Use ref to check current movement
            switch (e.key) {
                case 'ArrowUp':
                case 'w':
                    // Only allow Up if not currently moving Down
                    if (currentDir.y !== 1) setDirection({ x: 0, y: -1 });
                    break;
                case 'ArrowDown':
                case 's':
                    // Only allow Down if not currently moving Up
                    if (currentDir.y !== -1) setDirection({ x: 0, y: 1 });
                    break;
                case 'ArrowLeft':
                case 'a':
                    // Only allow Left if not currently moving Right
                    if (currentDir.x !== 1) setDirection({ x: -1, y: 0 });
                    break;
                case 'ArrowRight':
                case 'd':
                    // Only allow Right if not currently moving Left
                    if (currentDir.x !== -1) setDirection({ x: 1, y: 0 });
                    break;
                case ' ':
                    e.preventDefault();
                    if (isGameOverRef.current) {
                        resetGame();
                    } else {
                        setIsPaused(p => !p);
                    }
                    break;
                default:
                    break;
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    useEffect(() => {
        if (isGameOver || isPaused) return;

        const moveSnake = setInterval(() => {
            const currentSnake = snakeRef.current;
            const head = currentSnake[0];
            const newHead = { 
                x: head.x + directionRef.current.x, 
                y: head.y + directionRef.current.y 
            };

            if (newHead.x < 0 || newHead.x >= GRID_SIZE || newHead.y < 0 || newHead.y >= GRID_SIZE) {
                setIsGameOver(true);
                clearInterval(moveSnake); // Force kill the timer immediately
                return;
            }

            if (currentSnake.some((segment) => segment.x === newHead.x && segment.y === newHead.y)) {
                setIsGameOver(true);
                clearInterval(moveSnake); // Force kill the timer immediately
                return;
            }

            const newSnake = [newHead, ...currentSnake];

            if (newHead.x === foodRef.current.x && newHead.y === foodRef.current.y) {
                setScore((s) => s + 1); 
                setFood(generateFood(newSnake));
            } else {
                newSnake.pop(); 
            }

            setSnake(newSnake);
        }, GAME_SPEED);

        return () => clearInterval(moveSnake);
    }, [isGameOver, isPaused, generateFood]);

    const saveHighScore = async (finalScore) => {
        if (finalScore === 0) return;
        const token = localStorage.getItem('token');
        if (!token) return;

        try {
            // Using axios and the same endpoint structure as your TicTacToe
            await axios.post(`${import.meta.env.VITE_API_URL}/submit-score`, 
                { game_name: 'Snake', score: finalScore },
                { headers: { Authorization: `Bearer ${token}` }}
            );
            console.log("Snake score saved!");
        } catch (error) {
            console.error("Error saving snake score:", error);
        }
    };

    useEffect(() => {
        if (isGameOver) {
            // Use scoreRef.current to ensure we have the absolute final score
            saveHighScore(scoreRef.current);
        }
    }, [isGameOver]);

    const resetGame = () => {
        setSnake(INITIAL_SNAKE);
        setDirection(INITIAL_DIRECTION);
        setFood(INITIAL_FOOD);
        setIsGameOver(false);
        setScore(0);
        setIsPaused(false);
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: 'white' }}>
            <h2>Snake 🐍</h2>
            <div style={{ marginBottom: '10px' }}>
                Score: <span className="score-badge">{score}</span>
            </div>
            
            <div style={{
                width: '400px', height: '400px',
                backgroundColor: '#1a1a1a', border: '2px solid #333',
                position: 'relative', overflow: 'hidden'
            }}>
                <div style={{
                    position: 'absolute',
                    left: `${(food.x / GRID_SIZE) * 100}%`,
                    top: `${(food.y / GRID_SIZE) * 100}%`,
                    width: `${100 / GRID_SIZE}%`, height: `${100 / GRID_SIZE}%`,
                    backgroundColor: '#ff4d4d', borderRadius: '50%', boxShadow: '0 0 10px #ff4d4d'
                }}>
                </div>

                {snake.map((segment, index) => (
                    <div key={index} style={{
                        position: 'absolute',
                        left: `${(segment.x / GRID_SIZE) * 100}%`,
                        top: `${(segment.y / GRID_SIZE) * 100}%`,
                        width: `${100 / GRID_SIZE}%`, height: `${100 / GRID_SIZE}%`,
                        backgroundColor: index === 0 ? '#4ade80' : '#22c55e',
                        border: '1px solid #1a1a1a',
                        borderRadius: index === 0 ? '4px' : '2px',
                        zIndex: index === 0 ? 2 : 1
                    }}>
                    </div>
                ))}

                {(isGameOver || isPaused) && (
                    <div style={{
                        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                        backgroundColor: 'rgba(0,0,0,0.8)',
                        display: 'flex', flexDirection: 'column',
                        justifyContent: 'center', alignItems: 'center', zIndex: 10
                    }}>
                        <h3 style={{ color: isGameOver ? '#ef4444' : '#4ade80' }}>
                            {isGameOver ? 'GAME OVER' : 'PAUSED'}
                        </h3>
                        {isGameOver ? (
                            <button className="reset-btn" onClick={resetGame}>Try Again</button>
                        ) : (
                            <button className="reset-btn" onClick={() => setIsPaused(false)}>Resume</button>
                        )}
                    </div>
                )}
            </div>
            <p>Use W, A, S, D or KEY ARROWS to move. SAPCE to PAUSE.</p>
        </div>
    );
}