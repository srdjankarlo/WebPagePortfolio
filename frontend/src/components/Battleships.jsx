import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios'; // 1. Added Axios

const BOARD_SIZE = 10;
const SHIPS_DATA = [
    { id: 'carrier', name: 'Carrier', size: 5, color: '#8b5cf6' },
    { id: 'battleship', name: 'Battleship', size: 4, color: '#3b82f6' },
    { id: 'cruiser', name: 'Cruiser', size: 3, color: '#10b981' },
    { id: 'submarine', name: 'Submarine', size: 3, color: '#f59e0b' },
    { id: 'destroyer', name: 'Destroyer', size: 2, color: '#ef4444' }
];

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

const createEmptyBoard = () => 
    Array(BOARD_SIZE).fill(null).map(() => 
        Array(BOARD_SIZE).fill({ type: 'water', status: 'hidden', shipId: null })
    );

export default function Battleship() {
    const [phase, setPhase] = useState('setup'); 
    const [turn, setTurn] = useState('player');
    const [aiPulse, setAiPulse] = useState(0); 
    const [message, setMessage] = useState('Place your ships! Press W to rotate.');
    const [playerBoard, setPlayerBoard] = useState(createEmptyBoard());
    const [computerBoard, setComputerBoard] = useState(createEmptyBoard());
    const [selectedShip, setSelectedShip] = useState(null);
    const [orientation, setOrientation] = useState('H');
    const [placedShipIds, setPlacedShipIds] = useState([]);
    const [hoverPos, setHoverPos] = useState(null);
    const [streak, setStreak] = useState(0);

    const lastHits = useRef([]); 

    // --- 2. SCOREBOARD SUBMISSION LOGIC ---
    const submitWinToDB = async (currentStreak) => {
        const token = localStorage.getItem('token');
        if (!token) return;

        try {
            await axios.post(`${API_BASE_URL}/submit-score`, 
                { game_name: 'Battleship', score: currentStreak },
                { headers: { Authorization: `Bearer ${token}` }}
            );
            console.log("Battleship streak uploaded!");
        } catch (err) {
            console.error("Score submission error:", err);
        }
    };

    const resetGame = () => {
        setPlayerBoard(createEmptyBoard());
        setComputerBoard(generateCompBoard());
        setPhase('setup');
        setTurn('player');
        setPlacedShipIds([]);
        setSelectedShip(null);
        lastHits.current = [];
        setMessage('New War started! Place your ships.');
    };

    const generateCompBoard = () => {
        let b = createEmptyBoard();
        SHIPS_DATA.forEach(s => {
            let placed = false;
            while(!placed) {
                let rx = Math.floor(Math.random()*BOARD_SIZE), ry = Math.floor(Math.random()*BOARD_SIZE), ro = Math.random()>0.5?'H':'V';
                if (checkValidPlacement(b, rx, ry, s.size, ro)) {
                    for(let i=0; i<s.size; i++) { 
                        let cx = ro==='H'?rx+i:rx, cy = ro==='V'?ry+i:ry;
                        b[cy][cx] = { type:'ship', status:'hidden', shipId:s.id }; 
                    }
                    placed = true;
                }
            }
        });
        return b;
    };

    const checkValidPlacement = (board, x, y, size, orient) => {
        if (orient === 'H' && x + size > BOARD_SIZE) return false;
        if (orient === 'V' && y + size > BOARD_SIZE) return false;
        for (let i = 0; i < size; i++) {
            const cx = orient === 'H' ? x + i : x;
            const cy = orient === 'V' ? y + i : y;
            for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                    const ny = cy + dy, nx = cx + dx;
                    if (ny >= 0 && ny < BOARD_SIZE && nx >= 0 && nx < BOARD_SIZE) {
                        if (board[ny][nx].type === 'ship') return false;
                    }
                }
            }
        }
        return true;
    };

    const handleCellClick = (x, y) => {
        if (phase !== 'setup') return;
        if (playerBoard[y][x].type === 'ship') {
            const sId = playerBoard[y][x].shipId;
            setPlacedShipIds(prev => prev.filter(id => id !== sId));
            setSelectedShip(SHIPS_DATA.find(s => s.id === sId));
            setPlayerBoard(prev => prev.map(row => row.map(c => c.shipId === sId ? { type: 'water', status: 'hidden' } : c)));
            return;
        }
        if (!selectedShip) return;
        if (checkValidPlacement(playerBoard, x, y, selectedShip.size, orientation)) {
            const newBoard = playerBoard.map(row => [...row]);
            for (let i = 0; i < selectedShip.size; i++) {
                const cx = orientation === 'H' ? x + i : x;
                const cy = orientation === 'V' ? y + i : y;
                newBoard[cy][cx] = { type: 'ship', status: 'hidden', color: selectedShip.color, shipId: selectedShip.id };
            }
            setPlayerBoard(newBoard);
            setPlacedShipIds(prev => [...prev, selectedShip.id]);
            setSelectedShip(null);
            if (placedShipIds.length + 1 === SHIPS_DATA.length) {
                setPhase('playing');
                setMessage("Ready for battle! Fire at the enemy.");
            }
        }
    };

    const checkSunk = (board, shipId) => board.flat().filter(c => c.shipId === shipId).every(c => c.status === 'hit');
    const checkWin = (board) => !board.flat().some(c => c.type === 'ship' && c.status === 'hidden');

    const handleAttack = (x, y) => {
        if (phase !== 'playing' || turn !== 'player' || computerBoard[y][x].status !== 'hidden') return;
        const newBoard = computerBoard.map(row => [...row]);
        const isHit = newBoard[y][x].type === 'ship';
        newBoard[y][x] = { ...newBoard[y][x], status: isHit ? 'hit' : 'miss' };
        setComputerBoard(newBoard);

        if (isHit) {
            if (checkSunk(newBoard, newBoard[y][x].shipId)) setMessage(`SUNK! You destroyed their ${newBoard[y][x].shipId}!`);
            else setMessage("HIT! Fire again.");
            
            if (checkWin(newBoard)) { 
                setPhase('gameover');
                const newStreak = streak + 1; // 3. Calculate new streak
                setStreak(newStreak);
                submitWinToDB(newStreak); // 4. Upload to scoreboard
                setMessage("VICTORY! Streak uploaded."); 
            }
        } else { setTurn('computer'); setMessage("Miss. Computer turn."); }
    };

    useEffect(() => {
        if (phase === 'playing' && turn === 'computer') {
            const timer = setTimeout(() => {
                const newBoard = playerBoard.map(row => [...row]);
                let tx, ty, found = false;

                if (lastHits.current.length >= 2) {
                    const h1 = lastHits.current[0];
                    const h2 = lastHits.current[1];
                    const isVertical = h1.x === h2.x;
                    const sorted = [...lastHits.current].sort((a, b) => isVertical ? a.y - b.y : a.x - b.x);
                    const first = sorted[0];
                    const last = sorted[sorted.length - 1];
                    const ends = isVertical 
                        ? [{x: first.x, y: first.y - 1}, {x: last.x, y: last.y + 1}]
                        : [{x: first.x - 1, y: first.y}, {x: last.x + 1, y: last.y}];
                    const validEnds = ends.filter(n => n.x >= 0 && n.x < BOARD_SIZE && n.y >= 0 && n.y < BOARD_SIZE && newBoard[n.y][n.x].status === 'hidden');
                    if (validEnds.length > 0) {
                        const pick = validEnds[Math.floor(Math.random() * validEnds.length)];
                        tx = pick.x; ty = pick.y; found = true;
                    }
                }
                if (!found && lastHits.current.length === 1) {
                    const hit = lastHits.current[0];
                    const adj = [{x:hit.x, y:hit.y-1}, {x:hit.x, y:hit.y+1}, {x:hit.x-1, y:hit.y}, {x:hit.x+1, y:hit.y}]
                        .filter(n => n.x>=0 && n.x<BOARD_SIZE && n.y>=0 && n.y<BOARD_SIZE && newBoard[n.y][n.x].status === 'hidden');
                    if (adj.length > 0) {
                        const pick = adj[Math.floor(Math.random() * adj.length)];
                        tx = pick.x; ty = pick.y; found = true;
                    }
                }
                if (!found) {
                    do {
                        tx = Math.floor(Math.random() * BOARD_SIZE);
                        ty = Math.floor(Math.random() * BOARD_SIZE);
                    } while (newBoard[ty][tx].status !== 'hidden');
                }

                const hit = newBoard[ty][tx].type === 'ship';
                const sId = newBoard[ty][tx].shipId;
                newBoard[ty][tx] = { ...newBoard[ty][tx], status: hit ? 'hit' : 'miss' };
                setPlayerBoard(newBoard);

                if (hit) {
                    lastHits.current.push({x: tx, y: ty});
                    if (checkSunk(newBoard, sId)) {
                        setMessage(`Computer SUNK your ${sId.toUpperCase()}!`);
                        lastHits.current = lastHits.current.filter(h => newBoard[h.y][h.x].shipId !== sId);
                    }
                    if (checkWin(newBoard)) { 
                        setPhase('gameover'); 
                        setStreak(0); // 5. Reset streak on loss
                        setMessage("DEFEAT. Streak reset to 0."); 
                    }
                    else setAiPulse(p => p + 1); 
                } else { setTurn('player'); }
            }, 700);
            return () => clearTimeout(timer);
        }
    }, [turn, phase, aiPulse]);

    useEffect(() => {
        const handleW = (e) => e.key.toLowerCase() === 'w' && setOrientation(o => o === 'H' ? 'V' : 'H');
        window.addEventListener('keydown', handleW);
        setComputerBoard(generateCompBoard());
        return () => window.removeEventListener('keydown', handleW);
    }, []);

    return (
        <div style={{ display: 'flex', gap: '30px', justifyContent: 'center', color: 'white', padding: '20px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ background: '#111', padding: '15px', border: '1px solid #333' }}>
                    <h2 style={{ margin: 0 }}>STREAK: {streak}</h2>
                    <p style={{ color: '#4ade80', margin: '5px 0 0 0' }}>{message}</p>
                </div>
                {/* Boards (Grids) remain the same... */}
                <div style={{ display: 'grid', gridTemplateColumns: `repeat(${BOARD_SIZE}, 32px)`, gap: '2px', background: '#444' }}>
                    {computerBoard.map((row, y) => row.map((cell, x) => (
                        <div key={`e-${y}-${x}`} onClick={() => handleAttack(x, y)} style={{
                            width: '32px', height: '32px', background: cell.status === 'hit' ? '#ef4444' : cell.status === 'miss' ? '#2d3748' : '#1e3a8a',
                            cursor: turn === 'player' ? 'crosshair' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                            {cell.status === 'hit' && '💥'}{cell.status === 'miss' && '•'}
                        </div>
                    )))}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: `repeat(${BOARD_SIZE}, 32px)`, gap: '2px', background: '#444' }}>
                    {playerBoard.map((row, y) => row.map((cell, x) => {
                        const isH = hoverPos && selectedShip && (orientation === 'H' ? (y===hoverPos.y && x>=hoverPos.x && x<hoverPos.x+selectedShip.size) : (x===hoverPos.x && y>=hoverPos.y && y<hoverPos.y+selectedShip.size));
                        return (
                            <div key={`p-${y}-${x}`} onClick={() => handleCellClick(x, y)} onMouseEnter={() => setHoverPos({x, y})} style={{
                                width: '32px', height: '32px', background: cell.status === 'hit' ? '#7f1d1d' : cell.status === 'miss' ? '#4a5568' : cell.type === 'ship' ? cell.color : isH ? '#4ade8044' : '#112244',
                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                                {cell.status === 'hit' && '🔥'}
                            </div>
                        );
                    }))}
                </div>
            </div>

            <div style={{ width: '180px', background: '#000', padding: '20px', border: '1px solid #333' }}>
                <h4 style={{ margin: '0 0 10px 0' }}>DOCK</h4>
                {SHIPS_DATA.map(s => (
                    <div key={s.id} onClick={() => !placedShipIds.includes(s.id) && setSelectedShip(s)} style={{
                        padding: '10px', marginBottom: '8px', cursor: 'pointer',
                        background: placedShipIds.includes(s.id) ? '#111' : selectedShip?.id === s.id ? '#444' : '#222',
                        opacity: placedShipIds.includes(s.id) ? 0.2 : 1, border: selectedShip?.id === s.id ? '1px solid #4ade80' : '1px solid transparent'
                    }}>
                        <div style={{ fontSize: '10px' }}>{s.name}</div>
                        <div style={{ display: 'flex', gap: '2px', marginTop: '4px' }}>
                            {Array(s.size).fill(0).map((_, i) => <div key={i} style={{ width: '10px', height: '10px', background: s.color }} />)}
                        </div>
                    </div>
                ))}
                <button onClick={resetGame} style={{ width: '100%', padding: '10px', cursor: 'pointer', background: '#333', color: 'white', border: 'none', marginTop: '10px' }}>
                    REDEPLOY
                </button>
            </div>
        </div>
    );
}