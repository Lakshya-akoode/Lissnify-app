import React, { useRef, useState, useEffect } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import CustomDrawer from '../components/CustomDrawer';
import SeekerDashboard from '../screens/SeekerDashboard';
import CategoryListeners from '../screens/CategoryListeners';
import Chats from '../screens/Chats';
import Community from '../screens/Community';
import Profile from '../screens/Profile';
import { Plane } from 'lucide-react-native';

const Stack = createNativeStackNavigator();

// Wrapper component to provide drawer functionality
function DrawerWrapper({ navigation, route }) {
  const drawerRef = useRef(null);
  const [currentRoute, setCurrentRoute] = useState(route?.name || 'SeekerDashboard');

  useEffect(() => {
    setCurrentRoute(route?.name || 'SeekerDashboard');
  }, [route?.name]);

  // Enhanced navigation with drawer methods
  const modifiedNavigation = {
    ...navigation,
    openDrawer: () => drawerRef.current?.openDrawer(),
    closeDrawer: () => drawerRef.current?.closeDrawer(),
    toggleDrawer: () => drawerRef.current?.toggleDrawer(),
  };

  // Get the current screen component
  const getScreenComponent = () => {
    switch (currentRoute) {
      case 'SeekerDashboard':
        return <SeekerDashboard navigation={modifiedNavigation} route={route} />;
      case 'CategoryListeners':
        return <CategoryListeners navigation={modifiedNavigation} route={route} />;
      case 'Chats':
        return <Chats navigation={modifiedNavigation} route={route} />;
      case 'Community':
        return <Community navigation={modifiedNavigation} route={route} />;
      case 'Profile':
        return <Profile navigation={modifiedNavigation} route={route} />;
      default:
        return <SeekerDashboard navigation={modifiedNavigation} route={route} />;
    }
  };

  // Create a state object for drawer content
  const drawerState = {
    routes: [
      { name: 'SeekerDashboard' },
      { name: 'CategoryListeners' },
      { name: 'Chats' },
      { name: 'Community' },
      { name: 'Profile' },
    ],
    index: ['SeekerDashboard', 'CategoryListeners', 'Chats', 'Community', 'Profile'].indexOf(currentRoute),
  };

  return (
    <CustomDrawer
      ref={drawerRef}
      navigation={navigation}
      state={drawerState}
      userType="seeker"
    >
      {getScreenComponent()}
    </CustomDrawer>
  );
}

export default function SeekerDrawerNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        gestureEnabled: Platform.OS === 'ios' ? true : false,
      }}
      initialRouteName="SeekerDashboard"
    >
      <Stack.Screen
        name="SeekerDashboard"
        component={DrawerWrapper}
      />
      <Stack.Screen
        name="CategoryListeners"
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

