import React, { useRef, useState, useEffect } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import CustomDrawer from '../components/CustomDrawer';
import ListenerDashboard from '../screens/ListenerDashboard';
import Chats from '../screens/Chats';
import Community from '../screens/Community';
import Profile from '../screens/Profile';

const Stack = createNativeStackNavigator();

// Global drawer ref
let globalDrawerRef = null;

// Wrapper component to provide drawer functionality
function DrawerWrapper({ navigation, route }) {
  const drawerRef = useRef(null);
  const [currentRoute, setCurrentRoute] = useState(route?.name || 'ListenerDashboard');
  
  useEffect(() => {
    setCurrentRoute(route?.name || 'ListenerDashboard');
    globalDrawerRef = drawerRef.current;
  }, [route?.name]);
  
  // Get the current screen component
  const getScreenComponent = () => {
    switch (currentRoute) {
      case 'ListenerDashboard':
        return <ListenerDashboard navigation={navigation} route={route} />;
      case 'Chats':
        return <Chats navigation={navigation} route={route} />;
      case 'Community':
        return <Community navigation={navigation} route={route} />;
      case 'Profile':
        return <Profile navigation={navigation} route={route} />;
      default:
        return <ListenerDashboard navigation={navigation} route={route} />;
    }
  };

  // Create a state object for drawer content
  const drawerState = {
    routes: [
      { name: 'ListenerDashboard' },
      { name: 'Chats' },
      { name: 'Community' },
      { name: 'Profile' },
    ],
    index: ['ListenerDashboard', 'Chats', 'Community', 'Profile'].indexOf(currentRoute),
  };

  return (
    <CustomDrawer
      ref={drawerRef}
      navigation={navigation}
      state={drawerState}
      userType="listener"
    >
      {getScreenComponent()}
    </CustomDrawer>
  );
}

export default function DrawerNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        gestureEnabled: false,
      }}
      initialRouteName="ListenerDashboard"
    >
      <Stack.Screen 
        name="ListenerDashboard" 
        component={DrawerWrapper}
      />
      <Stack.Screen 
        name="Chats" 
        component={DrawerWrapper}
      />
      <Stack.Screen 
        name="Community" 
        component={DrawerWrapper}
      />
      <Stack.Screen 
        name="Profile" 
        component={DrawerWrapper}
      />
    </Stack.Navigator>
  );
}
