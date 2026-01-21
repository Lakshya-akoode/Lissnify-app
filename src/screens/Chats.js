import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Image,
  ImageBackground,
} from 'react-native';
import { BlurView } from '@react-native-community/blur';
import LinearGradient from 'react-native-linear-gradient';
import Images from '../Assets';
import {
  Menu,
  MessageCircle,
  Send,
  Search,
  X,
  ArrowLeft,
  Phone,
  Video,
  MoreVertical,
} from 'lucide-react-native';
import {
  connectedListeners,
  startDirectChat,
  getMessages,
  sendMessage,
  markMessagesAsRead,
  getUnreadCounts,
  getApiUrl,
} from '../utils/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function ChatsScreen({ navigation, route }) {
  const [selectedChat, setSelectedChat] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [connectedListenersData, setConnectedListeners] = useState([]);
  const [messagesData, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [unreadCounts, setUnreadCounts] = useState({});
  const [roomIdMap, setRoomIdMap] = useState({});
  const [chatSocket, setChatSocket] = useState(null);
  const messagesEndRef = useRef(null);
  const scrollViewRef = useRef(null);

  // Get current user data (name and ID) from AsyncStorage
  const getCurrentUser = async () => {
    try {
      // Try to get from stored user data (preferred method)
      const storedUserData = await AsyncStorage.getItem('elysian_user');
      if (storedUserData) {
        try {
          const userData = JSON.parse(storedUserData);
          const userName = userData.full_name || userData.name || 'user';
          const userId = userData.id || userData.pk || userData.user_id || null;
          
          console.log('Current user from elysian_user:', { userName, userId, userData });
          
          // Set both name and ID
          if (userId) {
            setCurrentUserId(userId.toString());
          }
          
          return userName;
        } catch (error) {
          console.error('Error parsing stored user data:', error);
        }
      }
      
      // Fallback: Try to get full_name and user_id separately
      const storedUser = await AsyncStorage.getItem('full_name');
      const storedUserId = await AsyncStorage.getItem('user_id');
      
      if (storedUserId) {
        setCurrentUserId(storedUserId);
      }
      
      if (storedUser) {
        console.log('Current user from full_name:', storedUser);
        return storedUser;
      }
      
      // Fallback to 'user' if nothing is found
      console.log('No user found, using default');
      return 'user';
    } catch (error) {
      console.error('Error getting current user:', error);
      return 'user';
    }
  };

  // Fetch unread counts
  const fetchUnreadCounts = async () => {
    try {
      const response = await getUnreadCounts();
      if (response.success && response.data) {
        setUnreadCounts(response.data);
      }
    } catch (error) {
      console.error('Error fetching unread counts:', error);
    }
  };

  // Fetch connected listeners
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const user = await getCurrentUser();
        setCurrentUser(user);

        const connectedUsers = await connectedListeners();
        if (connectedUsers.success && connectedUsers.data) {
          const transformedConnections = connectedUsers.data
            .filter((conn) => conn.status === 'Accepted')
            .map((conn) => ({
              connection_id: conn.connection_id,
              user_id: conn.user_id,
              full_name: conn.full_name,
              role: 'Listener',
              status: conn.status,
              listener_profile: {
                l_id: conn.id,
                specialty: conn.listener_profile?.specialty || 'General Support',
                avatar: conn.listener_profile?.avatar || conn.full_name?.charAt(0)?.toUpperCase(),
              },
            }));

          setConnectedListeners(transformedConnections);
          await fetchUnreadCounts();
        } else {
          setError('Failed to fetch connected listeners');
        }
      } catch (err) {
        console.error('Error fetching connected listeners:', err);
        setError('Error fetching connected listeners');
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Refresh unread counts periodically
    const interval = setInterval(fetchUnreadCounts, 30000); // Every 30 seconds
    return () => clearInterval(interval);
  }, []);

  // Handle route params for pre-selected chat
  useEffect(() => {
    if (!route?.params?.roomId) {
      return;
    }

    const { listenerName, seekerName, connectionId, listenerUserId, seekerUserId, roomId } = route.params;

    // Try to find the user by various identifiers
    const user = connectedListenersData.find((l) => {
      if (connectionId && l.connection_id === connectionId) return true;
      if (listenerUserId && l.user_id?.toString() === listenerUserId?.toString()) return true;
      if (seekerUserId && l.user_id?.toString() === seekerUserId?.toString()) return true;
      if (listenerName && l.full_name === listenerName) return true;
      if (seekerName && l.full_name === seekerName) return true;
      return false;
    });

    if (user) {
      setRoomIdMap((prev) => ({ ...prev, [user.connection_id]: roomId }));
      onStartChat(user, roomId);
    }
  }, [route?.params, connectedListenersData]);

  // WebSocket connection
  const connectToChat = (roomId) => {
    AsyncStorage.getItem('adminToken').then((accessToken) => {
      if (!accessToken) {
        setError('No access token found. Please login again.');
        return;
      }

      // Close existing socket
      if (chatSocket && typeof chatSocket.close === 'function') {
        chatSocket.close();
      } else if (chatSocket && typeof chatSocket === 'number') {
        // It's a polling interval
        clearInterval(chatSocket);
      }

      // Use WebSocket for real-time messaging
      const wsUrl = `wss://api.lissnify.com/ws/chat/${roomId}/?token=${accessToken}`;
      console.log(`Connecting to chat room ${roomId} via WebSocket`);

      try {
        const socket = new WebSocket(wsUrl);

        socket.onopen = () => {
          console.log('✅ WebSocket connected');
          setIsConnected(true);
          setError(null);
          setChatSocket(socket);
        };

        socket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log('📨 Received message:', data);

            // Determine if this message is from the current user using ID (preferred) or name (fallback)
            const messageAuthor = data.author?.full_name || data.author_full_name || data.author;
            const messageAuthorId = data.author_id || data.author?.id || data.author?.pk || data.user_id;
            
            // Use ID comparison if available (more reliable), otherwise fall back to name
            let isFromCurrentUser = false;
            if (currentUserId && messageAuthorId) {
              isFromCurrentUser = currentUserId.toString() === messageAuthorId.toString();
            } else {
              // Fallback to name comparison
              isFromCurrentUser = messageAuthor?.trim().toLowerCase() === currentUser?.trim().toLowerCase();
            }
            
            console.log('WebSocket message alignment check:', {
              messageAuthor: messageAuthor,
              messageAuthorId: messageAuthorId,
              currentUser: currentUser,
              currentUserId: currentUserId,
              isFromCurrentUser,
              message: data.message
            });

            // Handle different message types
            if (data.type === 'message_delivered') {
              // Update existing message to delivered status
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === data.message_id ? { ...msg, is_delivered: true } : msg
                )
              );
            } else if (data.type === 'message_read') {
              // Update existing message to read status
              const messageId = data.message_id;
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === messageId ? { ...msg, is_read: true } : msg
                )
              );
            } else if (data.type === 'new_message') {
              // Only add new message if it's from another user
              // If it's from current user, it's already added optimistically
              if (!isFromCurrentUser) {
                const newMessage = {
                  id: data.message_id || Date.now(),
                  content: data.message,
                  author_full_name: messageAuthor,
                  timestamp: data.timestamp || new Date().toISOString(),
                  is_read: false,
                  is_delivered: true,
                };
                setMessages((prev) => [...prev, newMessage]);
                // Scroll to bottom
                setTimeout(() => {
                  if (scrollViewRef.current) {
                    scrollViewRef.current.scrollToEnd({ animated: true });
                  }
                }, 100);
              }
            } else {
              // Fallback for old message format - only add if not from current user
              if (!isFromCurrentUser) {
                const newMessage = {
                  id: data.message_id || Date.now(),
                  content: data.message,
                  author_full_name: messageAuthor,
                  timestamp: data.timestamp || new Date().toISOString(),
                  is_read: false,
                  is_delivered: true,
                };
                setMessages((prev) => [...prev, newMessage]);
              }
            }
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };

        socket.onerror = (error) => {
          console.error('❌ WebSocket error:', error);
          setError('Connection error. Using polling fallback.');
          // Fallback to polling
          const pollInterval = setInterval(() => {
            fetchMessages(roomId);
          }, 2000);
          setChatSocket(pollInterval);
        };

        socket.onclose = (event) => {
          console.log('🔌 WebSocket closed:', event.code);
          setIsConnected(false);
          // Attempt to reconnect after 3 seconds
          setTimeout(() => {
            if (selectedChat) {
              connectToChat(roomId);
            }
          }, 3000);
        };
      } catch (error) {
        console.error('Error creating WebSocket:', error);
        setError('Failed to connect. Using polling fallback.');
        // Fallback to polling
        const pollInterval = setInterval(() => {
          fetchMessages(roomId);
        }, 2000);
        setChatSocket(pollInterval);
      }
    });
  };

  // Fetch messages
  const fetchMessages = async (roomId) => {
    try {
      const response = await getMessages(roomId);
      if (response.success && response.data) {
        setMessages(response.data);
        // Mark messages as read
        await markMessagesAsRead(roomId);
        // Scroll to bottom
        setTimeout(() => {
          if (scrollViewRef.current) {
            scrollViewRef.current.scrollToEnd({ animated: true });
          }
        }, 100);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  // Start chat with a listener
  const onStartChat = async (listener, existingRoomId = null) => {
    try {
      setLoading(true);
      setError(null);

      let roomId = existingRoomId;
      if (!roomId) {
        const rooms = await startDirectChat(listener.user_id);
        if (rooms.success && rooms.data) {
          roomId = rooms.data.id;
          setRoomIdMap((prev) => ({ ...prev, [listener.connection_id]: roomId }));
        } else {
          setError('Failed to start chat');
          return;
        }
      } else {
        setRoomIdMap((prev) => ({ ...prev, [listener.connection_id]: roomId }));
      }

      setSelectedChat(listener.connection_id);
      await fetchMessages(roomId);
      connectToChat(roomId);
    } catch (error) {
      console.error('Error starting chat:', error);
      setError('Error starting chat');
    } finally {
      setLoading(false);
    }
  };

  // Send message
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedChat) return;

    const listener = connectedListenersData.find(
      (l) => l.connection_id === selectedChat
    );
    if (!listener) return;

    const roomId = roomIdMap[listener.connection_id];
    if (!roomId) {
      Alert.alert('Error', 'Chat room not found');
      return;
    }

    const messageText = newMessage.trim();
    const messageId = Date.now() + Math.random();
    
    // Add message to UI immediately with "Sent" status
    const tempMessage = {
      id: messageId,
      content: messageText,
      author_full_name: currentUser || 'You',
      author_id: currentUserId || null, // Include user ID for proper identification
      timestamp: new Date().toISOString(),
      is_read: false,
      is_delivered: false, // Initially not delivered
    };
    setMessages((prev) => [...prev, tempMessage]);
    
    // Clear the input field immediately for better UX
    setNewMessage('');

    try {
      // Send via WebSocket if connected
      if (chatSocket && typeof chatSocket.send === 'function' && isConnected) {
        chatSocket.send(
          JSON.stringify({
            message: messageText,
            author_full_name: currentUser,
            message_id: messageId,
            type: 'send_message',
          })
        );
        // Scroll to bottom
        setTimeout(() => {
          if (scrollViewRef.current) {
            scrollViewRef.current.scrollToEnd({ animated: true });
          }
        }, 100);
      } else {
        // Fallback: try HTTP POST (though it may not work)
        const response = await sendMessage(roomId, messageText);
        if (response.success) {
          // Refresh messages
          await fetchMessages(roomId);
        } else {
          // Remove optimistic message on error
          setMessages((prev) => prev.filter((msg) => msg.id !== messageId));
          Alert.alert('Error', response.error || 'Failed to send message');
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages((prev) => prev.filter((msg) => msg.id !== messageId));
      Alert.alert('Error', 'Error sending message');
    }
  };

  // Close chat
  const handleCloseChat = () => {
    if (chatSocket) {
      if (typeof chatSocket.close === 'function') {
        chatSocket.close();
      } else if (typeof chatSocket === 'number') {
        // It's a polling interval
        clearInterval(chatSocket);
      }
      setChatSocket(null);
    }
    setSelectedChat(null);
    setMessages([]);
    setIsConnected(false);
  };

  // Filter listeners by search term
  const filteredListeners = connectedListenersData.filter((listener) =>
    listener.full_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Group messages by date
  const groupMessagesByDate = (messages) => {
    const grouped = {};
    messages.forEach((message) => {
      const date = new Date(message.timestamp);
      const dateKey = date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(message);
    });
    return grouped;
  };

  // Get selected listener
  const getSelectedListener = () => {
    return connectedListenersData.find((l) => l.connection_id === selectedChat);
  };

  // Build image URL
  const buildImageUrl = (img) => {
    if (!img) return null;
    if (img.startsWith('http') || img.startsWith('data:')) return img;
    return getApiUrl(`/${img}`);
  };

  // Render message bubble
  const renderMessage = (message, index) => {
    // Determine if this message is from the current user using ID (preferred) or name (fallback)
    const messageAuthor = message.author_full_name || message.author?.full_name || message.author;
    const messageAuthorId = message.author_id || message.author?.id || message.author?.pk || message.user_id;
    
    // Use ID comparison if available (more reliable), otherwise fall back to name
    let isFromCurrentUser = false;
    if (currentUserId && messageAuthorId) {
      isFromCurrentUser = currentUserId.toString() === messageAuthorId.toString();
    } else {
      // Fallback to name comparison
      const messageAuthorLower = messageAuthor?.trim().toLowerCase();
      const currentUserName = currentUser?.trim().toLowerCase();
      isFromCurrentUser = messageAuthorLower === currentUserName;
    }
    
    // Debug logging for first few messages
    if (index < 3) {
      console.log(`Message ${index} alignment:`, {
        messageAuthor: messageAuthor,
        messageAuthorId: messageAuthorId,
        currentUser: currentUser,
        currentUserId: currentUserId,
        isFromCurrentUser: isFromCurrentUser,
        willRenderRight: isFromCurrentUser
      });
    }

    return (
      <View
        key={message.id || index}
        style={[
          styles.messageWrapper,
          isFromCurrentUser ? styles.messageWrapperRight : styles.messageWrapperLeft,
        ]}
      >
        <View
          style={[
            styles.messageContainer,
            isFromCurrentUser ? styles.messageContainerRight : styles.messageContainerLeft,
          ]}
        >
          {!isFromCurrentUser && (
            <View style={styles.messageAvatar}>
              <Text style={styles.messageAvatarText}>
                {message.author_full_name?.charAt(0)?.toUpperCase() || 'U'}
              </Text>
            </View>
          )}
          <View
            style={[
              styles.messageBubble,
              isFromCurrentUser ? styles.messageBubbleRight : styles.messageBubbleLeft,
            ]}
          >
            {!isFromCurrentUser && (
              <Text style={styles.messageAuthor}>{message.author_full_name}</Text>
            )}
            <Text style={[
              styles.messageText,
              isFromCurrentUser && styles.messageTextRight
            ]}>
              {message.content}
            </Text>
            <Text style={[
              styles.messageTime,
              isFromCurrentUser && styles.messageTimeRight
            ]}>
              {new Date(message.timestamp).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </View>
          {isFromCurrentUser && (
            <View style={[styles.messageAvatar, styles.messageAvatarRight]}>
              <Text style={styles.messageAvatarText}>
                {currentUser?.charAt(0)?.toUpperCase() || 'U'}
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  // If chat is selected, show chat interface
  if (selectedChat) {
    const listener = getSelectedListener();
    const groupedMessages = groupMessagesByDate(messagesData);

      return (
        <View style={styles.chatContainer}>
          {/* Background Image */}
          <ImageBackground
            source={Images.loginBackground}
            style={styles.backgroundImage}
            resizeMode="cover"
            imageStyle={styles.backgroundImageStyle}
          >
            {/* Blur Effect for iOS */}
            {Platform.OS === 'ios' && (
              <BlurView
                style={styles.blurView}
                blurType="light"
                blurAmount={10}
              />
            )}
            {/* Gradient Overlay */}
            <LinearGradient
              colors={['rgba(255, 247, 237, 0.3)', 'rgba(255, 237, 213, 0.2)', 'rgba(255, 255, 255, 0.1)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.gradientOverlay}
            >
              {/* Chat Header */}
              <View style={styles.chatHeader}>
                <TouchableOpacity
                  style={styles.backButton}
                  onPress={handleCloseChat}
                  activeOpacity={0.7}
                >
                  <ArrowLeft size={24} color="#FFF" />
                </TouchableOpacity>
                <View style={styles.chatHeaderInfo}>
                  <View style={styles.chatHeaderAvatar}>
                    <Text style={styles.chatHeaderAvatarText}>
                      {listener?.listener_profile?.avatar || listener?.full_name?.charAt(0)?.toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.chatHeaderText}>
                    <Text style={styles.chatHeaderName}>{listener?.full_name}</Text>
                    <Text style={styles.chatHeaderStatus}>
                      {isConnected ? 'Online' : 'Offline'}
                    </Text>
                  </View>
                </View>
                <View style={styles.chatHeaderActions}>
                  <TouchableOpacity
                    style={styles.chatHeaderAction}
                    onPress={() => Alert.alert('Feature coming soon')}
                  >
                    <Phone size={20} color="#FFF" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.chatHeaderAction}
                    onPress={() => Alert.alert('Feature coming soon')}
                  >
                    <Video size={20} color="#FFF" />
                  </TouchableOpacity>
                </View>
              </View>

              <KeyboardAvoidingView
                style={styles.keyboardView}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
                enabled={true}
              >
                {/* Messages */}
                <ScrollView
                  ref={scrollViewRef}
                  style={styles.messagesContainer}
                  contentContainerStyle={styles.messagesContent}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                >
                  {messagesData.length === 0 ? (
                    <View style={styles.emptyMessages}>
                      <MessageCircle size={48} color="#CD853F" />
                      <Text style={styles.emptyMessagesText}>No messages yet. Start the conversation!</Text>
                    </View>
                  ) : (
                    Object.entries(groupedMessages).map(([dateKey, messages]) => (
                      <View key={dateKey}>
                        <View style={styles.dateSeparator}>
                          <View style={styles.dateSeparatorLine} />
                          <Text style={styles.dateSeparatorText}>{dateKey}</Text>
                          <View style={styles.dateSeparatorLine} />
                        </View>
                        {messages.map((message, index) => renderMessage(message, index))}
                      </View>
                    ))
                  )}
                </ScrollView>

                {/* Message Input */}
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.input}
                    placeholder="Type a message..."
                    value={newMessage}
                    onChangeText={setNewMessage}
                    multiline
                    maxLength={1000}
                  />
                  <TouchableOpacity
                    style={[styles.sendButton, !newMessage.trim() && styles.sendButtonDisabled]}
                    onPress={handleSendMessage}
                    disabled={!newMessage.trim()}
                  >
                    <Send size={20} color="#FFF" />
                  </TouchableOpacity>
                </View>
              </KeyboardAvoidingView>
            </LinearGradient>
          </ImageBackground>
        </View>
      );
    }

  // Show conversation list
  return (
    <View style={styles.container}>
      {/* Menu Button */}
      <TouchableOpacity
        style={styles.menuButton}
        onPress={() => navigation.openDrawer()}
        activeOpacity={0.7}
      >
        <Menu size={24} color="#111827" />
      </TouchableOpacity>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
      >
        {/* Header */}
        <View style={styles.header}>
          <LinearGradient
            colors={['#FFF8B5', '#FFB88C']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.headerGradient}
          >
            <View style={styles.headerContent}>
              <Text style={styles.headerTitle}>Active Conversations</Text>
              <Text style={styles.headerSubtitle}>Connect with your listeners</Text>
            </View>
          </LinearGradient>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Search size={20} color="#CD853F" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search conversations..."
            value={searchTerm}
            onChangeText={setSearchTerm}
            placeholderTextColor="#9CA3AF"
          />
        </View>

        {/* Conversations List */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#F97316" />
            <Text style={styles.loadingText}>Loading conversations...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : filteredListeners.length === 0 ? (
          <View style={styles.emptyState}>
            <MessageCircle size={48} color="#8B4513" />
            <Text style={styles.emptyStateTitle}>No Active Conversations</Text>
            <Text style={styles.emptyStateSubtext}>
              Start connecting with listeners to begin chatting
            </Text>
          </View>
        ) : (
          <View style={styles.conversationsList}>
            {filteredListeners.map((listener) => {
              const roomId = roomIdMap[listener.connection_id];
              const unreadCount = roomId ? unreadCounts[roomId] || 0 : 0;

              return (
                <TouchableOpacity
                  key={listener.connection_id}
                  style={styles.conversationItem}
                  onPress={() => onStartChat(listener)}
                  activeOpacity={0.7}
                >
                  <View style={styles.conversationAvatar}>
                    <Text style={styles.conversationAvatarText}>
                      {listener.listener_profile?.avatar || listener.full_name?.charAt(0)?.toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.conversationInfo}>
                    <View style={styles.conversationHeader}>
                      <Text style={styles.conversationName}>{listener.full_name}</Text>
                      {unreadCount > 0 && (
                        <View style={styles.unreadBadge}>
                          <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.conversationSpecialty}>
                      {listener.listener_profile?.specialty || 'General Support'}
                    </Text>
                    <Text style={styles.conversationStatus}>{listener.status}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF8E7',
  },
  chatContainer: {
    flex: 1,
    backgroundColor: '#ffdfc0ff'
  },
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  backgroundImageStyle: {
    resizeMode: "center",
  },
  blurView: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
    width: '100%',
    height: '100%',
  },
  gradientOverlay: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  keyboardView: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  menuButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 30,
    left: 16,
    zIndex: 1000,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 5,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 40,
  },
  header: {
    marginBottom: 24,
    marginTop: Platform.OS === 'ios' ? 70 : 60,
    paddingHorizontal: 16,
  },
  headerGradient: {
    paddingTop: 20,
    paddingBottom: 28,
    paddingHorizontal: 20,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  headerContent: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 10,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#4B5563',
    textAlign: 'center',
    lineHeight: 18,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
  },
  conversationsList: {
    paddingHorizontal: 16,
  },
  conversationItem: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  conversationAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#CD853F',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  conversationAvatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFF',
  },
  conversationInfo: {
    flex: 1,
  },
  conversationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  conversationName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    flex: 1,
  },
  unreadBadge: {
    backgroundColor: '#F97316',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  unreadBadgeText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  conversationSpecialty: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  conversationStatus: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '600',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  errorContainer: {
    backgroundColor: '#FEF2F2',
    padding: 16,
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 14,
    textAlign: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 32,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  // Chat Interface Styles
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#CD853F',
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingBottom: 16,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 6,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  chatHeaderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  chatHeaderAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  chatHeaderAvatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#CD853F',
  },
  chatHeaderText: {
    flex: 1,
  },
  chatHeaderName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 2,
  },
  chatHeaderStatus: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  chatHeaderActions: {
    flexDirection: 'row',
    gap: 8,
  },
  chatHeaderAction: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  messagesContainer: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 20,
    flexGrow: 1,
  },
  emptyMessages: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyMessagesText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  dateSeparator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  dateSeparatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  dateSeparatorText: {
    fontSize: 12,
    color: '#6B7280',
    paddingHorizontal: 12,
  },
  messageWrapper: {
    width: '100%',
    marginBottom: 16,
  },
  messageWrapperLeft: {
    alignItems: 'flex-start',
  },
  messageWrapperRight: {
    alignItems: 'flex-end',
  },
  messageContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    maxWidth: '85%',
  },
  messageContainerLeft: {
    justifyContent: 'flex-start',
  },
  messageContainerRight: {
    justifyContent: 'flex-end',
    flexDirection: 'row-reverse',
  },
  messageAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#CD853F',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  messageAvatarRight: {
    marginRight: 0,
    marginLeft: 8,
  },
  messageAvatarText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFF',
  },
  messageBubble: {
    maxWidth: '75%',
    padding: 12,
    borderRadius: 16,
  },
  messageBubbleLeft: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
  },
  messageBubbleRight: {
    backgroundColor: '#CD853F',
    borderBottomRightRadius: 4,
  },
  messageAuthor: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 4,
  },
  messageText: {
    fontSize: 15,
    color: '#111827',
    lineHeight: 20,
  },
  messageTextRight: {
    color: '#FFFFFF',
  },
  messageTime: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  messageTimeRight: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#CD853F',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(229, 231, 235, 0.5)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  input: {
    flex: 1,
    maxHeight: 100,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#F9FAFB',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#CD853F',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
});
