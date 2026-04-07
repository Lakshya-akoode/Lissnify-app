
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Animated, Dimensions } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Home, MessageCircle, Globe, User } from 'lucide-react-native';
import CustomTabBar from '../components/CustomTabBar';

import ListenerDashboard from '../screens/ListenerDashboard';
import Chats from '../screens/Chats';
import Community from '../screens/Community';
import Profile from '../screens/Profile';

const Tab = createBottomTabNavigator();
const { width } = Dimensions.get('window');

export default function ListenerTabNavigator() {
    return (
        <Tab.Navigator
            tabBar={props => <CustomTabBar {...props} />}
            screenOptions={{
                headerShown: false,
                tabBarShowLabel: false,
            }}
            initialRouteName="ListenerDashboard"
        >
            <Tab.Screen
                name="ListenerDashboard"
                component={ListenerDashboard}
                options={{
                    tabBarLabel: 'Home',
                    tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
                }}
            />
            <Tab.Screen
                name="Chats"
                component={Chats}
                options={{
                    tabBarLabel: 'Chats',
                    tabBarIcon: ({ color, size }) => <MessageCircle color={color} size={size} />,
                }}
            />
            <Tab.Screen
                name="Community"
                component={Community}
                options={{
                    tabBarLabel: 'Community',
                    tabBarIcon: ({ color, size }) => <Globe color={color} size={size} />,
                }}
            />
            <Tab.Screen
                name="Profile"
                component={Profile}
                options={{
                    tabBarLabel: 'Profile',
                    tabBarIcon: ({ color, size }) => <User color={color} size={size} />,
                }}
            />
        </Tab.Navigator>
    );
}
