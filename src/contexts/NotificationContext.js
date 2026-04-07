// src/contexts/NotificationContext.js
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import notificationService from '../services/NotificationService';

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [latestNotification, setLatestNotification] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const appStateRef = useRef(AppState.currentState);
  const isLoggedInRef = useRef(false);

  // Connect when the provider mounts (user is logged in)
  useEffect(() => {
    const initConnection = async () => {
      const token = await AsyncStorage.getItem('adminToken');
      if (token) {
        isLoggedInRef.current = true;
        notificationService.connect();
      }
    };

    initConnection();

    // Subscribe to notification events
    const unsubNotification = notificationService.on('notification', (notification) => {
      setLatestNotification(notification);
      setNotifications(prev => [notification, ...prev].slice(0, 50)); // Keep last 50

      // Clear latest notification after 5 seconds (for toast display)
      setTimeout(() => {
        setLatestNotification(prev => {
          // Only clear if it's the same notification
          if (prev && prev.id === notification.id) {
            return null;
          }
          return prev;
        });
      }, 5000);
    });

    const unsubCount = notificationService.on('unreadCount', (count) => {
      setUnreadCount(count);
    });

    const unsubConnection = notificationService.on('connectionChange', (connected) => {
      setIsConnected(connected);
    });

    // Handle app state changes (background/foreground)
    const appStateSubscription = AppState.addEventListener('change', (nextAppState) => {
      if (
        appStateRef.current.match(/inactive|background/) &&
        nextAppState === 'active' &&
        isLoggedInRef.current
      ) {
        // App came to foreground — reconnect if needed
        if (!notificationService.isConnected) {
          notificationService.connect();
        } else {
          // Refresh unread count
          notificationService.requestUnreadCount();
        }
      }
      appStateRef.current = nextAppState;
    });

    return () => {
      unsubNotification();
      unsubCount();
      unsubConnection();
      appStateSubscription.remove();
      notificationService.disconnect(true);
    };
  }, []);

  const connect = useCallback(async () => {
    isLoggedInRef.current = true;
    await notificationService.connect();
  }, []);

  const disconnect = useCallback(() => {
    isLoggedInRef.current = false;
    notificationService.disconnect(true);
    setUnreadCount(0);
    setNotifications([]);
    setLatestNotification(null);
  }, []);

  const markAsRead = useCallback((notificationId) => {
    notificationService.markAsRead(notificationId);
    setNotifications(prev =>
      prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  }, []);

  const dismissLatest = useCallback(() => {
    setLatestNotification(null);
  }, []);

  const value = {
    unreadCount,
    latestNotification,
    notifications,
    isConnected,
    connect,
    disconnect,
    markAsRead,
    dismissLatest,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
}

export default NotificationContext;
