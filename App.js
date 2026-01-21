import React, { useState } from 'react';
import 'react-native-gesture-handler';
import { Router } from './src/routes/Router';
import SplashScreen from './src/screens/SplashScreen';

const App = () => {
  const [showSplash, setShowSplash] = useState(true);

  const handleSplashFinish = () => {
    setShowSplash(false);
  };

  if (showSplash) {
    return <SplashScreen onFinish={handleSplashFinish} />;
  }

  return <Router />;
};

export default App;