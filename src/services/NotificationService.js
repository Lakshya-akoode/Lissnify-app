// src/services/NotificationService.js
import AsyncStorage from '@react-native-async-storage/async-storage';

const WS_BASE_URL = 'wss://api.lissnify.com';
const MAX_RECONNECT_DELAY = 30000; // 30 seconds max
const INITIAL_RECONNECT_DELAY = 1000; // 1 second initial

class NotificationService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.reconnectTimer = null;
    this.listeners = new Map();
    this._shouldReconnect = true;
  }

  /**
   * Connect to the notification WebSocket
   */
  async connect() {
    try {
      const token = await AsyncStorage.getItem('adminToken');
      if (!token) {
        console.log('🔔 No token available for notification WebSocket');
        return;
      }

      // Close existing connection if any
      this.disconnect(false);

      this._shouldReconnect = true;
      const wsUrl = `${WS_BASE_URL}/ws/notifications/?token=${token}`;
      console.log('🔔 Connecting to notification WebSocket...');

      this.socket = new WebSocket(wsUrl);

      this.socket.onopen = () => {
        console.log('✅ Notification WebSocket connected');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this._emit('connectionChange', true);

        // Request current unread count on connect
        this.requestUnreadCount();
      };

      this.socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this._handleMessage(data);
        } catch (error) {
          console.error('Error parsing notification WS message:', error);
        }
      };

      this.socket.onerror = (error) => {
        console.error('❌ Notification WebSocket error:', error);
      };

      this.socket.onclose = (event) => {
        console.log('🔌 Notification WebSocket closed', event.code);
        this.isConnected = false;
        this._emit('connectionChange', false);

        // Auto-reconnect with exponential backoff
        if (this._shouldReconnect) {
          this._scheduleReconnect();
        }
      };
    } catch (error) {
      console.error('Error connecting notification WebSocket:', error);
    }
  }

  /**
   * Disconnect from the notification WebSocket
   * @param {boolean} permanent - If true, won't auto-reconnect
   */
  disconnect(permanent = true) {
    if (permanent) {
      this._shouldReconnect = false;
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.socket) {
      try {
        this.socket.close();
      } catch (e) {
        // ignore
      }
      this.socket = null;
    }

    this.isConnected = false;
    this.reconnectAttempts = 0;
  }

  /**
   * Request the current unread notification count from the server
   */
  requestUnreadCount() {
    this._send({ type: 'get_unread_count' });
  }

  /**
   * Mark a notification as read via WebSocket
   * @param {number} notificationId
   */
  markAsRead(notificationId) {
    this._send({ type: 'mark_read', notification_id: notificationId });
  }

  /**
   * Subscribe to notification events
   * @param {string} event - Event name: 'notification', 'unreadCount', 'connectionChange'
   * @param {Function} callback
   * @returns {Function} Unsubscribe function
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);

    // Return unsubscribe function
    return () => {
      const eventListeners = this.listeners.get(event);
      if (eventListeners) {
        eventListeners.delete(callback);
      }
    };
  }

  // --- Private Methods ---

  _send(data) {
    if (this.socket && this.isConnected) {
      try {
        this.socket.send(JSON.stringify(data));
      } catch (error) {
        console.error('Error sending to notification WS:', error);
      }
    }
  }

  _handleMessage(data) {
    if (data.type === 'unread_count') {
      this._emit('unreadCount', data.count);
    } else if (data.type === 'notification') {
      // New notification received
      this._emit('notification', data.notification);
      // Also request updated unread count
      this.requestUnreadCount();
    } else if (data.type === 'message_read') {
      this._emit('messageRead', data);
    }
  }

  _emit(event, data) {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach((callback) => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in notification listener for "${event}":`, error);
        }
      });
    }
  }

  _scheduleReconnect() {
    if (this.reconnectTimer) return;

    const delay = Math.min(
      INITIAL_RECONNECT_DELAY * Math.pow(2, this.reconnectAttempts),
      MAX_RECONNECT_DELAY
    );
    this.reconnectAttempts++;

    console.log(`🔄 Notification WS reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }
}

// Singleton instance
const notificationService = new NotificationService();
export default notificationService;
