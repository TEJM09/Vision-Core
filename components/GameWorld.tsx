
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GameState, GameObject, ObjectType, InputMode, GameTheme, PlayerAvatar, GameDifficulty } from '../types';
import VisionTracker from './VisionTracker';
import HUD from './HUD';

interface GameWorldProps {
  onGameOver: (score: number) => void;
  highScore: number;
  inputMode: InputMode;
  theme: GameTheme;
  gameDifficulty: GameDifficulty;
  avatar: PlayerAvatar;
}

interface ThemeConfig {
  good: string[];
  bad: string[];
  accent: string;
  gravityMult: number;
  background: string;
  drift?: boolean;
  zigzag?: boolean;
  wind?: boolean;
  fast?: boolean;
  spawnMult?: number;
}

const THEME_DATA: Record<GameTheme, ThemeConfig> = {
  [GameTheme.COSMIC]: { 
    good: ['💎', '✨', '☄️'], bad: ['🪨', '🌑', '💥'], accent: '#60a5fa', 
    gravityMult: 0.9, drift: true, background: 'radial-gradient(circle at center, #1e1b4b, #020617)'
  },
  [GameTheme.NEON_CITY]: { 
    good: ['💾', '⚡', '🔋'], bad: ['👾', '💀', '🔥'], accent: '#f472b6', 
    zigzag: true, gravityMult: 1.1, background: 'linear-gradient(to bottom, #2e1065, #000000)'
  },
  [GameTheme.NATURE]: { 
    good: ['🍎', '🍒', '🌻'], bad: ['🕸️', '🍂', '🥀'], accent: '#4ade80', 
    wind: true, gravityMult: 0.7, background: 'linear-gradient(to bottom, #ecfdf5, #064e3b)'
  },
  [GameTheme.URBAN_RAIN]: { 
    good: ['☂️', '☕', '💎'], bad: ['⚡', '🚧', '💥'], accent: '#94a3b8', 
    fast: true, gravityMult: 1.3, background: 'linear-gradient(to bottom, #334155, #0f172a)'
  },
  [GameTheme.MIND_LAB]: { 
    good: ['🧠', '🧩', '🧪'], bad: ['🛑', '⚠️', '📉'], accent: '#c084fc', 
    gravityMult: 1.0, background: 'radial-gradient(circle, #2d064e, #000000)'
  },
  [GameTheme.RETRO]: { 
    good: ['⭐', '🍄', '🍒'], bad: ['👻', '💣', '👾'], accent: '#fbbf24', 
    gravityMult: 1.2, spawnMult: 1.5, background: '#000000'
  }
};

const DIFFICULTY_SETTINGS = {
  [GameDifficulty.EASY]: { initialLives: 5, growth: 0.03, missPenalty: 0.03, hazardPenalty: 1, spawnRateBase: 1400 },
  [GameDifficulty.MEDIUM]: { initialLives: 3, growth: 0.1, missPenalty: 0.1, hazardPenalty: 1, spawnRateBase: 1000 },
  [GameDifficulty.HARD]: { initialLives: 1, growth: 0.25, missPenalty: 1.0, hazardPenalty: 1, spawnRateBase: 700 }
};

const GameWorld: React.FC<GameWorldProps> = ({ onGameOver, highScore, inputMode, theme, gameDifficulty, avatar }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const starsRef = useRef<{x: number, y: number, r: number, s: number}[]>([]);
  const rainRef = useRef<{x: number, y: number, l: number, s: number}[]>([]);
  const lastRecoveryRef = useRef(0);
  
  // CRITICAL: Hand position Ref for zero-lag access in render loop
  const handXRef = useRef(0.5);
  const isHandDetectedRef = useRef(true);

  const initialSettings = DIFFICULTY_SETTINGS[gameDifficulty];

  const [gameState, setGameState] = useState<GameState>({
    score: 0, highScore, lives: initialSettings.initialLives, maxLives: initialSettings.initialLives,
    isPaused: false, combo: 0, difficulty: 1, gameDifficulty,
    objects: [], handX: 0.5, isHandDetected: true, inputMode, theme,
    avatar, levelStartTime: Date.now(), currentTime: 0
  });

  const stateRef = useRef(gameState);
  useEffect(() => { stateRef.current = gameState; }, [gameState]);

  useEffect(() => {
    starsRef.current = Array.from({length: 120}, () => ({
      x: Math.random() * 800, y: Math.random() * 600, r: Math.random() * 1.5, s: Math.random() * 0.4
    }));
    rainRef.current = Array.from({length: 100}, () => ({
      x: Math.random() * 800, y: Math.random() * 600, l: 20 + Math.random() * 30, s: 15 + Math.random() * 12
    }));
  }, [theme]);

  // High performance input handling
  useEffect(() => {
    if (inputMode !== InputMode.CURSOR) return;
    const handleMouseMove = (e: MouseEvent) => {
      const container = containerRef.current;
      if (!container || stateRef.current.isPaused) return;
      const rect = container.getBoundingClientRect();
      const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      handXRef.current = x;
      isHandDetectedRef.current = true;
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [inputMode]);

  const handleHandUpdate = useCallback((x: number, detected: boolean) => {
    if (inputMode === InputMode.VISION) {
      handXRef.current = x;
      isHandDetectedRef.current = detected;
    }
  }, [inputMode]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let lastTime = performance.now();
    let spawnTimer = 0;

    const gameLoop = (timestamp: number) => {
      if (stateRef.current.isPaused) {
        lastTime = timestamp;
        animationFrameId = requestAnimationFrame(gameLoop);
        return;
      }
      const dt = timestamp - lastTime;
      lastTime = timestamp;

      update(dt);
      render(ctx, canvas);
      animationFrameId = requestAnimationFrame(gameLoop);
    };

    const update = (dt: number) => {
      const state = stateRef.current;
      const tData = THEME_DATA[theme];
      const settings = DIFFICULTY_SETTINGS[gameDifficulty];
      const baseGravity = tData.gravityMult * state.difficulty;

      const updatedObjects = state.objects
        .map(obj => {
          let nextX = obj.x;
          let nextY = obj.y + obj.speed * (dt / 16.67) * baseGravity;
          
          if (tData.drift) {
            nextX += (obj.horizontalVel || 0) * (dt / 16.67);
          } else if (tData.zigzag) {
            const phase = (obj.phase || 0) + (dt / 120);
            nextX += Math.sin(phase) * 8;
            obj.phase = phase;
          } else if (tData.wind) {
            nextX += Math.sin((Date.now() / 700) + obj.x) * 4;
          }

          return { ...obj, x: nextX, y: nextY };
        })
        .filter(obj => obj.y < canvas.height + 60 && obj.x > -60 && obj.x < canvas.width + 60);

      spawnTimer += dt;
      let spawnRate = Math.max(160, settings.spawnRateBase - (state.score * 4));
      if (tData.spawnMult) spawnRate /= tData.spawnMult;

      if (spawnTimer > spawnRate) {
        spawnTimer = 0;
        const isBad = Math.random() < 0.22;
        const variants = isBad ? tData.bad : tData.good;
        updatedObjects.push({
          id: Math.random().toString(),
          x: Math.random() * (canvas.width - 120) + 60,
          y: -50,
          radius: 20 + Math.random() * 5,
          speed: (tData.fast ? 7 : 4) + Math.random() * 2,
          type: isBad ? ObjectType.BAD : ObjectType.GOOD,
          variant: variants[Math.floor(Math.random() * variants.length)],
          horizontalVel: tData.drift ? (Math.random() - 0.5) * 4 : 0,
          phase: Math.random() * Math.PI * 2
        });
      }

      const cw = 140, ch = 24;
      const currentHandX = handXRef.current;
      const cx = currentHandX * canvas.width - cw / 2, cy = canvas.height - 110;

      let scoreGain = 0, livesDelta = 0, newCombo = state.combo;
      const filtered = updatedObjects.filter(obj => {
        const hit = obj.x > cx && obj.x < cx + cw && obj.y + obj.radius > cy && obj.y - obj.radius < cy + ch;
        if (hit) {
          if (obj.type === ObjectType.GOOD) {
            scoreGain += 5 + Math.floor(newCombo / 4);
            newCombo++;
          } else {
            livesDelta -= settings.hazardPenalty; 
            newCombo = 0;
          }
          return false;
        }
        if (obj.y > canvas.height && obj.type === ObjectType.GOOD) {
          livesDelta -= settings.missPenalty; 
          newCombo = 0;
        }
        return true;
      });

      // Background animations
      if (theme === GameTheme.COSMIC || theme === GameTheme.RETRO) {
        starsRef.current.forEach(s => {
          s.y += s.s * (dt / 16) * state.difficulty * 2;
          if (s.y > 600) s.y = -10;
        });
      } else if (theme === GameTheme.URBAN_RAIN) {
        rainRef.current.forEach(r => {
          r.y += r.s * (dt / 16);
          if (r.y > 600) { r.y = -40; r.x = Math.random() * 800; }
        });
      }

      setGameState(prev => {
        const nextScore = prev.score + scoreGain;
        if (gameDifficulty === GameDifficulty.EASY && Math.floor(nextScore / 100) > lastRecoveryRef.current) {
          lastRecoveryRef.current = Math.floor(nextScore / 100);
          livesDelta += 0.5;
        }

        const nextLives = Math.min(prev.maxLives, prev.lives + livesDelta);
        const elapsed = (Date.now() - prev.levelStartTime) / 1000;
        
        if (nextLives <= 0) {
          onGameOver(Math.floor(nextScore));
          cancelAnimationFrame(animationFrameId);
        }

        return {
          ...prev, score: nextScore, lives: nextLives,
          combo: newCombo, difficulty: 1 + (nextScore / 400) + (elapsed / 180),
          objects: filtered, currentTime: elapsed, 
          handX: currentHandX, isHandDetected: isHandDetectedRef.current
        };
      });
    };

    const render = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
      const state = stateRef.current;
      const currentTheme = THEME_DATA[theme];

      ctx.fillStyle = currentTheme.background.includes('gradient') ? 'black' : currentTheme.background;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      if (currentTheme.background.includes('gradient')) {
        const gradParts = currentTheme.background.split('(')[1].split(')')[0].split(',').map(s => s.trim());
        let grad;
        if (currentTheme.background.startsWith('radial')) {
          grad = ctx.createRadialGradient(canvas.width/2, canvas.height/2, 50, canvas.width/2, canvas.height/2, 600);
        } else {
          grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
        }
        grad.addColorStop(0, gradParts[gradParts.length - 2]);
        grad.addColorStop(1, gradParts[gradParts.length - 1]);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      if (theme === GameTheme.COSMIC || theme === GameTheme.RETRO) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        starsRef.current.forEach(s => {
          ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
        });
      }

      if (theme === GameTheme.URBAN_RAIN) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 1;
        rainRef.current.forEach(r => {
          ctx.beginPath(); ctx.moveTo(r.x, r.y); ctx.lineTo(r.x, r.y + r.l); ctx.stroke();
        });
      }

      if (theme === GameTheme.NEON_CITY || theme === GameTheme.MIND_LAB) {
        ctx.strokeStyle = theme === GameTheme.NEON_CITY ? 'rgba(244,114,182,0.1)' : 'rgba(192,132,252,0.1)';
        for (let x = 0; x < canvas.width; x += 50) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke(); }
        for (let y = 0; y < canvas.height; y += 50) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke(); }
      }

      const cw = 140, ch = 24;
      const cx = handXRef.current * canvas.width - cw / 2;
      const cy = canvas.height - 110;
      
      ctx.save();
      ctx.shadowBlur = isHandDetectedRef.current ? 40 : 0;
      ctx.shadowColor = currentTheme.accent;
      ctx.fillStyle = isHandDetectedRef.current ? 'white' : '#3f3f46';
      ctx.beginPath(); ctx.roundRect(cx, cy, cw, ch, 12); ctx.fill();
      
      ctx.textAlign = 'center';
      ctx.font = '44px Inter';
      ctx.fillText(state.avatar.emoji, cx + cw/2, cy - 12);
      ctx.restore();

      state.objects.forEach(obj => {
        ctx.save();
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = `${obj.radius * 2.2}px Inter`;
        if (theme === GameTheme.RETRO) {
          ctx.shadowOffsetX = 4; ctx.shadowOffsetY = 4; ctx.shadowColor = 'black';
        } else {
          ctx.shadowBlur = 15; ctx.shadowColor = 'rgba(0,0,0,0.4)';
        }
        ctx.fillText(obj.variant, obj.x, obj.y);
        ctx.restore();
      });
    };

    animationFrameId = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [onGameOver, inputMode, theme, gameDifficulty]);

  return (
    <div className="relative w-full h-full flex flex-col md:flex-row gap-6 p-6 max-w-7xl mx-auto">
      <div className="flex flex-col gap-6 w-full md:w-80">
        <div className={`p-1 rounded-3xl overflow-hidden border-2 shadow-2xl transition-all duration-300 ${gameState.isHandDetected ? 'border-green-500 scale-105' : 'border-zinc-800'}`}>
          {inputMode === InputMode.VISION ? (
            <VisionTracker onHandUpdate={handleHandUpdate} config={{sensitivity: 2.5, threshold: 0.05}} />
          ) : (
            <div className="w-full h-40 bg-zinc-900 flex flex-col items-center justify-center text-center p-6 border border-white/5 rounded-2xl">
              <div className="text-4xl mb-2">🖱️</div>
              <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest leading-relaxed">System Manual Control</p>
            </div>
          )}
        </div>
        
        <div className="flex-1 bg-zinc-900/60 backdrop-blur-3xl rounded-[2.5rem] border border-white/5 p-8 flex flex-col gap-8">
          <div className="flex items-center gap-4">
            <div className="text-4xl">{avatar.emoji}</div>
            <div>
              <p className="text-zinc-500 text-[9px] font-black uppercase tracking-widest">Active Pilot</p>
              <h4 className="text-white font-bold tracking-tight">{avatar.name}</h4>
            </div>
          </div>
          
          <div className="pt-6 border-t border-white/5 space-y-3">
             <div className="flex justify-between items-center px-4 py-2 bg-white/5 rounded-xl border border-white/5">
                <span className="text-[9px] font-black text-zinc-500 uppercase">Input</span>
                <span className="text-[10px] font-bold text-white uppercase">{inputMode}</span>
             </div>
             <div className="flex justify-between items-center px-4 py-2 bg-white/5 rounded-xl border border-white/5">
                <span className="text-[9px] font-black text-zinc-500 uppercase">Phase</span>
                <span className="text-[10px] font-bold text-white uppercase">{theme.replace('_', ' ')}</span>
             </div>
             <div className="flex justify-between items-center px-4 py-2 bg-white/5 rounded-xl border border-white/5">
                <span className="text-[9px] font-black text-zinc-500 uppercase">Risk</span>
                <span className={`text-[10px] font-bold uppercase ${gameDifficulty === GameDifficulty.HARD ? 'text-red-500' : gameDifficulty === GameDifficulty.MEDIUM ? 'text-yellow-500' : 'text-green-500'}`}>
                  {gameDifficulty}
                </span>
             </div>
          </div>

          <button 
            onClick={() => setGameState(s => ({ ...s, isPaused: !s.isPaused }))}
            className="mt-auto w-full py-5 bg-white text-black font-black text-xs rounded-2xl transition-all active:scale-95 hover:bg-green-400"
          >
            {gameState.isPaused ? 'RE-ESTABLISH' : 'DISCONNECT'}
          </button>
        </div>
      </div>

      <div ref={containerRef} className={`flex-1 relative bg-black rounded-[3.5rem] border border-white/5 overflow-hidden shadow-2xl backdrop-blur-sm ${inputMode === InputMode.CURSOR ? 'cursor-none' : ''}`}>
        <canvas ref={canvasRef} width={800} height={600} className="w-full h-full object-contain" />
        <HUD state={gameState} />
        {gameState.isPaused && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center">
             <div className="text-white font-black text-6xl italic tracking-tighter animate-pulse">PAUSED</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GameWorld;
