
import React from 'react';

interface GameOverProps {
  score: number;
  highScore: number;
  onRestart: () => void;
  onExit: () => void;
}

const GameOver: React.FC<GameOverProps> = ({ score, highScore, onRestart, onExit }) => {
  const isNewHigh = score >= highScore && score > 0;

  return (
    <div className="flex flex-col items-center justify-center gap-12 text-center animate-in fade-in zoom-in duration-500">
      <div className="space-y-4">
        <h2 className="text-7xl font-black italic tracking-tighter text-red-500 drop-shadow-2xl">
          MISSION FAILED
        </h2>
        <p className="text-zinc-500 text-xl font-medium tracking-widest uppercase">
          Gravity has prevailed
        </p>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 p-10 rounded-3xl shadow-2xl w-96 space-y-6">
        <div className="space-y-1">
          <p className="text-zinc-500 text-sm font-black uppercase tracking-widest">Final Score</p>
          <p className={`text-6xl font-black italic ${isNewHigh ? 'text-green-400 animate-pulse' : 'text-white'}`}>
            {Math.floor(score)}
          </p>
          {isNewHigh && <p className="text-green-500 font-bold text-sm tracking-widest">NEW RECORD!</p>}
        </div>

        <div className="pt-6 border-t border-zinc-800">
          <p className="text-zinc-500 text-sm font-black uppercase tracking-widest mb-1">Personal Best</p>
          <p className="text-2xl font-bold text-zinc-400">{highScore}</p>
        </div>
      </div>

      <div className="flex flex-col gap-4 w-72">
        <button 
          onClick={onRestart}
          className="px-8 py-5 bg-green-500 hover:bg-green-400 text-zinc-950 font-black text-2xl rounded-xl transition-all shadow-lg shadow-green-500/20 active:scale-95"
        >
          TRY AGAIN
        </button>

        <button 
          onClick={onExit}
          className="px-8 py-4 bg-zinc-900 border border-zinc-800 text-zinc-400 font-bold rounded-xl hover:bg-zinc-800 transition-all"
        >
          RETURN TO MENU
        </button>
      </div>
    </div>
  );
};

export default GameOver;
