
import React from 'react';
import { InputMode, GameTheme, PlayerAvatar, GameDifficulty } from '../types';

interface StartMenuProps {
  inputMode: InputMode;
  setInputMode: (m: InputMode) => void;
  theme: GameTheme;
  setTheme: (t: GameTheme) => void;
  difficulty: GameDifficulty;
  setDifficulty: (d: GameDifficulty) => void;
  avatars: PlayerAvatar[];
  selectedAvatar: PlayerAvatar;
  setSelectedAvatar: (a: PlayerAvatar) => void;
  onStart: () => void;
}

const StartMenu: React.FC<StartMenuProps> = ({ 
  inputMode, setInputMode, theme, setTheme, difficulty, setDifficulty, avatars, selectedAvatar, setSelectedAvatar, onStart 
}) => {
  const themes = [
    { id: GameTheme.COSMIC, label: 'Cosmic Orbit', icon: '🌌' },
    { id: GameTheme.NEON_CITY, label: 'Cyber City', icon: '🌃' },
    { id: GameTheme.NATURE, label: 'Nature Flow', icon: '🍃' },
    { id: GameTheme.URBAN_RAIN, label: 'Urban Rain', icon: '🏙️' },
    { id: GameTheme.MIND_LAB, label: 'Mind Lab', icon: '🧠' },
    { id: GameTheme.RETRO, label: 'Retro Arcade', icon: '🎮' },
  ];

  return (
    <div className="flex flex-col items-center justify-center gap-6 text-center p-6 animate-in fade-in slide-in-from-bottom-8 duration-700 w-full max-w-6xl">
      <div className="space-y-1">
        <h1 className="text-6xl md:text-8xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-white via-green-400 to-emerald-600 drop-shadow-[0_0_20px_rgba(34,197,94,0.3)]">
          VISION CORE
        </h1>
        <p className="text-zinc-500 text-[10px] font-black tracking-[0.5em] uppercase opacity-80">
          Advanced Physics Engine V4.1
        </p>
      </div>

      {/* Main Configuration Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full">
        
        {/* Pilot Selection */}
        <div className="bg-zinc-900/40 backdrop-blur-xl border border-white/5 rounded-3xl p-6 flex flex-col gap-4">
          <h3 className="text-zinc-500 text-[10px] font-black uppercase tracking-widest text-left px-2">Pilot</h3>
          <div className="grid grid-cols-2 gap-2">
            {avatars.map(avatar => (
              <button
                key={avatar.id}
                onClick={() => setSelectedAvatar(avatar)}
                className={`relative p-4 rounded-2xl border-2 transition-all group overflow-hidden ${
                  selectedAvatar.id === avatar.id ? 'bg-white/10 border-white' : 'bg-white/5 border-transparent hover:bg-white/10'
                }`}
              >
                <div className="text-3xl mb-1">{avatar.emoji}</div>
                <div className={`text-[10px] font-black uppercase tracking-widest ${selectedAvatar.id === avatar.id ? 'text-white' : 'text-zinc-500'}`}>
                  {avatar.name}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Challenge Level Selection */}
        <div className="bg-zinc-900/40 backdrop-blur-xl border border-white/5 rounded-3xl p-6 flex flex-col gap-4">
          <h3 className="text-zinc-500 text-[10px] font-black uppercase tracking-widest text-left px-2">Challenge</h3>
          <div className="flex flex-col gap-2 h-full justify-center">
            {[
              { id: GameDifficulty.EASY, label: 'Easy', desc: '5 Lives • Slow Gravity', color: 'text-green-400' },
              { id: GameDifficulty.MEDIUM, label: 'Medium', desc: '3 Lives • Balanced', color: 'text-yellow-400' },
              { id: GameDifficulty.HARD, label: 'Hard', desc: '1 Life • Accelerated', color: 'text-red-500' }
            ].map(d => (
              <button 
                key={d.id}
                onClick={() => setDifficulty(d.id)}
                className={`w-full p-4 rounded-2xl border transition-all text-left ${difficulty === d.id ? 'bg-white border-white' : 'bg-white/5 border-white/10'}`}
              >
                <div className={`text-xs font-black uppercase tracking-widest ${difficulty === d.id ? 'text-zinc-950' : d.color}`}>
                  {d.label}
                </div>
                <div className={`text-[9px] font-medium ${difficulty === d.id ? 'text-zinc-600' : 'text-zinc-500'}`}>
                  {d.desc}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Atmosphere Selection */}
        <div className="bg-zinc-900/40 backdrop-blur-xl border border-white/5 rounded-3xl p-6 flex flex-col gap-4">
          <h3 className="text-zinc-500 text-[10px] font-black uppercase tracking-widest text-left px-2">Phase</h3>
          <div className="grid grid-cols-2 gap-2">
            {themes.map(t => (
              <button 
                key={t.id}
                onClick={() => setTheme(t.id)}
                className={`py-3 rounded-xl border transition-all flex flex-col items-center gap-1 ${theme === t.id ? 'bg-white text-zinc-900 border-white' : 'bg-white/5 border-white/10 text-zinc-400 hover:bg-white/10'}`}
              >
                <span className="text-lg">{t.icon}</span>
                <span className="text-[8px] font-black uppercase tracking-tighter">{t.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4 w-full max-w-xl">
        <div className="flex-1 bg-zinc-900/40 backdrop-blur-xl border border-white/5 rounded-3xl p-4 flex gap-2">
          {[InputMode.CURSOR, InputMode.VISION].map(mode => (
            <button 
              key={mode}
              onClick={() => setInputMode(mode)}
              className={`flex-1 py-4 rounded-2xl border transition-all text-xs font-black uppercase tracking-widest ${inputMode === mode ? 'bg-white text-zinc-900 border-white' : 'bg-white/5 border-white/10 text-zinc-500'}`}
            >
              {mode === InputMode.CURSOR ? '🖱️ Cursor' : '✋ Hand'}
            </button>
          ))}
        </div>
        
        <button 
          onClick={onStart}
          className="group relative flex-[1.5] py-7 bg-white text-zinc-950 font-black text-2xl rounded-[2rem] transition-all transform hover:scale-105 active:scale-95 shadow-2xl overflow-hidden"
        >
          INITIATE
          <div className="absolute inset-0 bg-green-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>
      </div>
    </div>
  );
};

export default StartMenu;
