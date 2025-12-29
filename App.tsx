
import React, { useState, useEffect } from 'react';
import { GameScene, InputMode, GameTheme, PlayerAvatar, GameDifficulty } from './types';
import StartMenu from './components/StartMenu';
import HowToPlay from './components/HowToPlay';
import GameWorld from './components/GameWorld';
import GameOver from './components/GameOver';

const AVATARS: PlayerAvatar[] = [
  { id: 'aero', name: 'Aero', emoji: '🧑‍🚀', color: '#60a5fa' },
  { id: 'nova', name: 'Nova', emoji: '👩‍🎤', color: '#f472b6' },
  { id: 'gears', name: 'Gears', emoji: '🤖', color: '#fbbf24' },
  { id: 'leaf', name: 'Leaf', emoji: '🧚', color: '#4ade80' }
];

const App: React.FC = () => {
  const [currentScene, setCurrentScene] = useState<GameScene>(GameScene.START_MENU);
  const [inputMode, setInputMode] = useState<InputMode>(InputMode.CURSOR);
  const [theme, setTheme] = useState<GameTheme>(GameTheme.COSMIC);
  const [difficulty, setDifficulty] = useState<GameDifficulty>(GameDifficulty.MEDIUM);
  const [selectedAvatar, setSelectedAvatar] = useState<PlayerAvatar>(AVATARS[0]);
  const [lastScore, setLastScore] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    const saved = localStorage.getItem('visionGravity_highScore');
    return saved ? parseInt(saved, 10) : 0;
  });

  useEffect(() => {
    localStorage.setItem('visionGravity_highScore', highScore.toString());
  }, [highScore]);

  const updateHighScore = (score: number) => {
    setLastScore(score);
    if (score > highScore) {
      setHighScore(score);
    }
  };

  const handleStartGame = () => setCurrentScene(GameScene.GAMEPLAY);
  const handleShowHowToPlay = () => setCurrentScene(GameScene.HOW_TO_PLAY);
  const handleExit = () => setCurrentScene(GameScene.START_MENU);

  return (
    <div className={`w-full h-screen flex flex-col items-center justify-center overflow-hidden transition-colors duration-1000 bg-zinc-950`}>
      {currentScene === GameScene.START_MENU && (
        <StartMenu 
          inputMode={inputMode}
          setInputMode={setInputMode}
          theme={theme}
          setTheme={setTheme}
          difficulty={difficulty}
          setDifficulty={setDifficulty}
          avatars={AVATARS}
          selectedAvatar={selectedAvatar}
          setSelectedAvatar={setSelectedAvatar}
          onStart={handleShowHowToPlay} 
        />
      )}

      {currentScene === GameScene.HOW_TO_PLAY && (
        <HowToPlay 
          inputMode={inputMode}
          onStart={handleStartGame} 
        />
      )}

      {currentScene === GameScene.GAMEPLAY && (
        <GameWorld 
          inputMode={inputMode}
          theme={theme}
          gameDifficulty={difficulty}
          avatar={selectedAvatar}
          onGameOver={(score) => {
            updateHighScore(score);
            setCurrentScene(GameScene.GAME_OVER);
          }} 
          highScore={highScore}
        />
      )}

      {currentScene === GameScene.GAME_OVER && (
        <GameOver 
          score={lastScore} 
          highScore={highScore} 
          onRestart={handleStartGame} 
          onExit={handleExit} 
        />
      )}
    </div>
  );
};

export default App;
