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
    KeyboardAvoidingView,
    Keyboard,
    Image,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {
    MessageCircle,
    Send,
    ArrowLeft,
    Phone,
    Video,
} from 'lucide-react-native';
import {
    startDirectChat,
    getMessages,
    sendMessage,
    markMessagesAsRead,
    getApiUrl,
} from '../utils/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import CustomAlert from '../components/CustomAlert';
import useAlert from '../hooks/useAlert';

export default function ChatScreen({ navigation, route }) {
    const insets = useSafeAreaInsets();
    const {
        listenerId,
        connectionId,
        listenerName,
        listenerAvatar,
        listenerProfileImage,
        listenerOnline,
        roomId: initialRoomId
    } = route.params || {};

    const [roomId, setRoomId] = useState(initialRoomId);
    const [messagesData, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [isConnected, setIsConnected] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);
    const [currentUserId, setCurrentUserId] = useState(null);
    const [chatSocket, setChatSocket] = useState(null);
    const { alertState, showAlert, hideAlert } = useAlert();

    const scrollViewRef = useRef(null);
    const headerHeightRef = useRef(0);

    // Scroll to bottom whenever keyboard appears
    useEffect(() => {
        const showSub = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
            () => {
                // small delay lets the KAV finish resizing before we scroll
                setTimeout(() => {
                    if (scrollViewRef.current) {
                        scrollViewRef.current.scrollToEnd({ animated: true });
                    }
                }, 120);
            }
        );
        return () => showSub.remove();
    }, []);

    // Get current user data
    useEffect(() => {
        const getCurrentUser = async () => {
            try {
                const storedUserData = await AsyncStorage.getItem('elysian_user');
                if (storedUserData) {
                    const userData = JSON.parse(storedUserData);
                    const userName = userData.full_name || userData.name || 'user';
                    const userId = userData.u_id || userData.id || userData.pk || userData.user_id;
                    setCurrentUserId(userId ? userId.toString() : null);
                    setCurrentUser(userName);
                } else {
                    const storedUser = await AsyncStorage.getItem('full_name');
                    const storedUserId = await AsyncStorage.getItem('user_id');
                    if (storedUserId) setCurrentUserId(storedUserId);
                    if (storedUser) setCurrentUser(storedUser);
                }
            } catch (error) {
                console.error('Error getting current user:', error);
            }
        };
        getCurrentUser();
    }, []);

    // Initialize Chat
    useEffect(() => {
        const initChat = async () => {
            setLoading(true);
            try {
                let activeRoomId = roomId;

                if (!activeRoomId && listenerId) {
                    const rooms = await startDirectChat(listenerId);
                    if (rooms.success && rooms.data) {
                        activeRoomId = rooms.data.id;
                        setRoomId(activeRoomId);
                    } else {
                        showAlert({ title: 'Error', message: 'Failed to start chat session', type: 'error' });
                        setLoading(false);
                        return;
                    }
                }

                if (activeRoomId) {
                    await fetchMessages(activeRoomId);
                    connectToChat(activeRoomId);
                }
            } catch (err) {
                console.error('Error initializing chat:', err);
                showAlert({ title: 'Error', message: 'Something went wrong', type: 'error' });
            } finally {
                setLoading(false);
            }
        };

        if (listenerId || roomId) {
            initChat();
        }

        return () => {
            if (chatSocket) {
                if (typeof chatSocket.close === 'function') chatSocket.close();
                else clearInterval(chatSocket);
            }
        };
    }, [listenerId, roomId]);

    const fetchMessages = async (id) => {
        try {
            const response = await getMessages(id);
            if (response.success && response.data) {
                // Replace entire message list with server data (deduplication source of truth)
                setMessages(response.data);
                await markMessagesAsRead(id);
                scrollToBottom();
            }
        } catch (error) {
            console.error('Error fetching messages:', error);
        }
    };

    // Helper: add messages without duplicates (keyed by id)
    const addMessageDeduped = (prev, newMsg) => {
        const exists = prev.some(
            (m) => m.id != null && newMsg.id != null && String(m.id) === String(newMsg.id)
        );
        if (exists) return prev;
        return [...prev, newMsg];
    };

    const scrollToBottom = () => {
        setTimeout(() => {
            if (scrollViewRef.current) {
                scrollViewRef.current.scrollToEnd({ animated: true });
            }
        }, 100);
    };

    const connectToChat = (id) => {
        AsyncStorage.getItem('adminToken').then((accessToken) => {
            if (!accessToken) return;

            const wsUrl = `wss://api.lissnify.com/ws/chat/${id}/?token=${accessToken}`;
            console.log(`Connecting to chat room ${id}`);

            try {
                const socket = new WebSocket(wsUrl);

                socket.onopen = () => {
                    console.log('✅ WebSocket connected');
                    setIsConnected(true);
                    setChatSocket(socket);
                };

                socket.onmessage = (event) => {
                    try {
                        const data = JSON.parse(event.data);
                        handleWebSocketMessage(data);
                    } catch (error) {
                        console.error('Error parsing WS message:', error);
                    }
                };

                socket.onerror = (error) => {
                    console.error('❌ WebSocket error:', error);
                    const pollInterval = setInterval(() => fetchMessages(id), 2000);
                    setChatSocket(pollInterval);
                };

                socket.onclose = () => {
                    console.log('🔌 WebSocket closed');
                    setIsConnected(false);
                };

            } catch (error) {
                console.error('Error creating WebSocket:', error);
            }
        });
    };

    const handleWebSocketMessage = (data) => {
        const messageAuthorId = data.author_id || data.author?.id || data.author?.pk || data.user_id;
        const messageAuthor = data.author?.full_name || data.author_full_name || data.author;

        let isFromCurrentUser = false;
        if (currentUserId && messageAuthorId) {
            isFromCurrentUser = currentUserId.toString() === messageAuthorId.toString();
        } else {
            isFromCurrentUser = messageAuthor?.trim().toLowerCase() === currentUser?.trim().toLowerCase();
        }

        if (data.type === 'message_delivered') {
            // Update only the first temp message: assign server ID and mark as delivered
            setMessages((prev) => {
                const idx = prev.findIndex((msg) => msg._temp);
                if (idx === -1) return prev;
                const updated = [...prev];
                updated[idx] = {
                    ...updated[idx],
                    id: data.message_id || updated[idx].id,
                    is_delivered: true,
                    _temp: false,
                };
                return updated;
            });
        } else if (data.type === 'message_read') {
            setMessages((prev) => prev.map((msg) => msg.id === data.message_id ? { ...msg, is_read: true } : msg));
        } else if (data.type === 'new_message' || !data.type) {
            // Only add message if it's from another user
            // Our own messages are already in the list via optimistic add in handleSendMessage
            if (!isFromCurrentUser) {
                const serverId = data.message_id || data.id;
                const newMsg = {
                    id: serverId || Date.now(),
                    content: data.message || data.content,
                    author_full_name: messageAuthor,
                    timestamp: data.timestamp || new Date().toISOString(),
                    is_read: false,
                    is_delivered: true,
                    _confirmed: true,
                };
                setMessages((prev) => addMessageDeduped(prev, newMsg));
                scrollToBottom();
            }
        }
    };

    const handleSendMessage = async () => {
        if (!newMessage.trim() || !roomId) return;

        const messageText = newMessage.trim();
        const messageId = Date.now() + Math.random();

        const tempMessage = {
            id: messageId,
            content: messageText,
            author_full_name: currentUser || 'You',
            author_id: currentUserId,
            timestamp: new Date().toISOString(),
            is_read: false,
            is_delivered: false,
            _temp: true,
        };
        setMessages(prev => [...prev, tempMessage]);
        setNewMessage('');
        scrollToBottom();

        try {
            if (chatSocket && typeof chatSocket.send === 'function' && isConnected) {
                chatSocket.send(JSON.stringify({
                    message: messageText,
                    author_full_name: currentUser,
                    message_id: messageId,
                    type: 'send_message',
                }));
            } else {
                // No WebSocket — send via REST then refresh
                await sendMessage(roomId, messageText);
                // fetchMessages will replace state from server (deduped)
                await fetchMessages(roomId);
                // Remove the temp message since fetchMessages replaced state
            }
        } catch (error) {
            console.error('Send error:', error);
            showAlert({ title: 'Error', message: 'Failed to send message', type: 'error' });
        }
    };

    const groupMessagesByDate = (messages) => {
        const grouped = {};
        messages.forEach((message) => {
            const date = new Date(message.timestamp);
            const dateKey = date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
            if (!grouped[dateKey]) grouped[dateKey] = [];
            grouped[dateKey].push(message);
        });
        return grouped;
    };

    const renderMessage = (message, index) => {
        const messageAuthor = message.author_full_name || message.author?.full_name || message.author;
        const messageAuthorId = message.author_id || message.author?.id || message.author?.pk || message.user_id;

        let isFromCurrentUser = false;
        if (currentUserId && messageAuthorId) {
            isFromCurrentUser = currentUserId.toString() === messageAuthorId.toString();
        } else {
            const messageAuthorLower = messageAuthor?.trim().toLowerCase();
            const currentUserName = currentUser?.trim().toLowerCase();
            isFromCurrentUser = messageAuthorLower === currentUserName;
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
                        profileImageUrl ? (
                            <Image
                                source={{ uri: profileImageUrl }}
                                style={styles.messageAvatarImage}
                            />
                        ) : (
                            <LinearGradient
                                colors={['#CD853F', '#D2691E']}
                                style={styles.messageAvatar}
                            >
                                <Text style={styles.messageAvatarText}>
                                    {message.author_full_name?.charAt(0)?.toUpperCase() || 'U'}
                                </Text>
                            </LinearGradient>
                        )
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
                        <Text style={[styles.messageText, isFromCurrentUser && styles.messageTextRight]}>
                            {message.content}
                        </Text>
                        <Text style={[styles.messageTime, isFromCurrentUser && styles.messageTimeRight]}>
                            {new Date(message.timestamp).toLocaleTimeString('en-US', {
                                hour: '2-digit',
                                minute: '2-digit',
                            })}
                        </Text>
                    </View>
                </View>
            </View>
        );
    };

    const avatarInitial = listenerAvatar || listenerName?.charAt(0)?.toUpperCase() || 'U';
    const profileImageUrl = listenerProfileImage
        ? (listenerProfileImage.startsWith('http') ? listenerProfileImage : getApiUrl(`/${listenerProfileImage}`))
        : null;

    return (
        <View style={styles.container}>
            {/* Header */}
            <LinearGradient
                colors={['#CD853F', '#D2691E']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.chatHeader, { paddingTop: insets.top + 8 }]}
            >
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                    activeOpacity={0.7}
                >
                    <ArrowLeft size={22} color="#FFF" />
                </TouchableOpacity>

                <TouchableOpacity style={styles.chatHeaderInfo} activeOpacity={0.8}>
                    {profileImageUrl ? (
                        <Image
                            source={{ uri: profileImageUrl }}
                            style={styles.chatHeaderAvatarImage}
                        />
                    ) : (
                        <View style={styles.chatHeaderAvatar}>
                            <Text style={styles.chatHeaderAvatarText}>{avatarInitial}</Text>
                        </View>
                    )}
                    <View style={styles.chatHeaderText}>
                        <Text style={styles.chatHeaderName} numberOfLines={1}>
                            {listenerName || 'Listener'}
                        </Text>
                        <View style={styles.statusRow}>
                            <View
                                style={[
                                    styles.headerStatusDot,
                                    listenerOnline ? styles.headerStatusDotOnline : styles.headerStatusDotOffline,
                                ]}
                            />
                            <Text style={styles.chatHeaderStatus}>
                                {listenerOnline ? 'Online' : 'Offline'}
                            </Text>
                        </View>
                    </View>
                </TouchableOpacity>

                <View style={styles.chatHeaderActions}>
                    <TouchableOpacity
                        style={styles.chatHeaderAction}
                        onPress={() => showAlert({ title: 'Coming Soon', message: 'This feature is coming soon!', type: 'info' })}
                        activeOpacity={0.7}
                    >
                        <Phone size={18} color="#FFF" />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.chatHeaderAction}
                        onPress={() => showAlert({ title: 'Coming Soon', message: 'This feature is coming soon!', type: 'info' })}
                        activeOpacity={0.7}
                    >
                        <Video size={18} color="#FFF" />
                    </TouchableOpacity>
                </View>
            </LinearGradient>

            {/* Messages + Input */}
            <KeyboardAvoidingView
                style={styles.keyboardView}
                behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
                keyboardVerticalOffset={
                    Platform.OS === 'ios'
                        ? insets.top + 60  // header height on iOS
                        : 0               // Android uses adjustResize via padding
                }
            >
                <ScrollView
                    ref={scrollViewRef}
                    style={styles.messagesContainer}
                    contentContainerStyle={styles.messagesContent}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode="interactive"
                >
                    {loading ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color="#CD853F" />
                            <Text style={styles.loadingText}>Loading messages...</Text>
                        </View>
                    ) : messagesData.length === 0 ? (
                        <View style={styles.emptyMessages}>
                            <LinearGradient
                                colors={['#FFF8B5', '#FFB88C']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={styles.emptyIconContainer}
                            >
                                <MessageCircle size={32} color="#8B4513" />
                            </LinearGradient>
                            <Text style={styles.emptyMessagesTitle}>No messages yet</Text>
                            <Text style={styles.emptyMessagesText}>
                                Say hello to start the conversation!
                            </Text>
                        </View>
                    ) : (
                        Object.entries(groupMessagesByDate(messagesData)).map(([date, msgs]) => (
                            <View key={date}>
                                <View style={styles.dateSeparator}>
                                    <View style={styles.dateSeparatorLine} />
                                    <View style={styles.dateSeparatorPill}>
                                        <Text style={styles.dateSeparatorText}>{date}</Text>
                                    </View>
                                    <View style={styles.dateSeparatorLine} />
                                </View>
                                {msgs.map((msg, i) => renderMessage(msg, i))}
                            </View>
                        ))
                    )}
                </ScrollView>

                {/* Input */}
                <View style={[styles.inputContainer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
                    <View style={styles.inputWrapper}>
                        <TextInput
                            style={styles.input}
                            placeholder="Type a message..."
                            placeholderTextColor="#9CA3AF"
                            value={newMessage}
                            onChangeText={setNewMessage}
                            multiline
                            maxLength={1000}
                            onFocus={scrollToBottom}
                        />
                    </View>
                    <TouchableOpacity
                        onPress={handleSendMessage}
                        disabled={!newMessage.trim()}
                        activeOpacity={0.7}
                    >
                        <LinearGradient
                            colors={newMessage.trim() ? ['#CD853F', '#D2691E'] : ['#D1D5DB', '#D1D5DB']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.sendButton}
                        >
                            <Send size={18} color="#FFF" />
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
            <CustomAlert {...alertState} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFF8E7',
    },

    // Header
    chatHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingBottom: 14,
        shadowColor: '#CD853F',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
    },
    backButton: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    chatHeaderInfo: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
    },
    chatHeaderAvatar: {
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    chatHeaderAvatarImage: {
        width: 42,
        height: 42,
        borderRadius: 21,
        marginRight: 12,
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.5)',
    },
    chatHeaderAvatarText: {
        fontSize: 17,
        fontWeight: '700',
        color: '#CD853F',
    },
    chatHeaderText: {
        flex: 1,
        justifyContent: 'center',
    },
    chatHeaderName: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFF',
        marginBottom: 2,
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    headerStatusDot: {
        width: 7,
        height: 7,
        borderRadius: 4,
    },
    headerStatusDotOnline: {
        backgroundColor: '#6EE7B7',
    },
    headerStatusDotOffline: {
        backgroundColor: 'rgba(255, 255, 255, 0.4)',
    },
    chatHeaderStatus: {
        fontSize: 12,
        color: 'rgba(255, 255, 255, 0.85)',
        fontWeight: '500',
    },
    chatHeaderActions: {
        flexDirection: 'row',
        gap: 8,
    },
    chatHeaderAction: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(255, 255, 255, 0.18)',
        justifyContent: 'center',
        alignItems: 'center',
    },

    // Messages Area
    keyboardView: {
        flex: 1,
    },
    messagesContainer: {
        flex: 1,
    },
    messagesContent: {
        paddingHorizontal: 14,
        paddingTop: 12,
        paddingBottom: 8,
    },

    // Loading
    loadingContainer: {
        alignItems: 'center',
        paddingVertical: 60,
    },
    loadingText: {
        marginTop: 12,
        fontSize: 14,
        color: '#9CA3AF',
        fontWeight: '500',
    },

    // Empty State
    emptyMessages: {
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 400,
        paddingHorizontal: 32,
    },
    emptyIconContainer: {
        width: 72,
        height: 72,
        borderRadius: 36,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 18,
    },
    emptyMessagesTitle: {
        fontSize: 17,
        fontWeight: '700',
        color: '#374151',
        marginBottom: 6,
    },
    emptyMessagesText: {
        fontSize: 13,
        color: '#9CA3AF',
        textAlign: 'center',
        lineHeight: 20,
    },

    // Date Separator
    dateSeparator: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 20,
    },
    dateSeparatorLine: {
        flex: 1,
        height: 1,
        backgroundColor: 'rgba(205, 133, 63, 0.15)',
    },
    dateSeparatorPill: {
        backgroundColor: 'rgba(205, 133, 63, 0.1)',
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 4,
        marginHorizontal: 10,
    },
    dateSeparatorText: {
        fontSize: 11,
        color: '#8B4513',
        fontWeight: '600',
    },

    // Messages
    messageWrapper: {
        marginBottom: 6,
        width: '100%',
    },
    messageWrapperLeft: {
        alignItems: 'flex-start',
    },
    messageWrapperRight: {
        alignItems: 'flex-end',
    },
    messageContainer: {
        flexDirection: 'row',
        maxWidth: '80%',
    },
    messageContainerLeft: {
        justifyContent: 'flex-start',
    },
    messageContainerRight: {
        justifyContent: 'flex-end',
    },
    messageAvatar: {
        width: 30,
        height: 30,
        borderRadius: 15,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 8,
        marginTop: 4,
    },
    messageAvatarImage: {
        width: 30,
        height: 30,
        borderRadius: 15,
        marginRight: 8,
        marginTop: 4,
    },
    messageAvatarText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#FFF',
    },
    messageBubble: {
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 18,
    },
    messageBubbleLeft: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
    },
    messageBubbleRight: {
        backgroundColor: '#CD853F',
        borderTopRightRadius: 4,
        shadowColor: '#CD853F',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
    },
    messageAuthor: {
        fontSize: 11,
        fontWeight: '700',
        color: '#8B4513',
        marginBottom: 3,
    },
    messageText: {
        fontSize: 15,
        color: '#1F2937',
        lineHeight: 21,
    },
    messageTextRight: {
        color: '#FFF',
    },
    messageTime: {
        fontSize: 10,
        color: '#9CA3AF',
        alignSelf: 'flex-end',
        marginTop: 4,
    },
    messageTimeRight: {
        color: 'rgba(255, 255, 255, 0.7)',
    },

    // Input Area
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        paddingHorizontal: 12,
        paddingTop: 10,
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
        gap: 10,
    },
    inputWrapper: {
        flex: 1,
        backgroundColor: '#F9FAFB',
        borderRadius: 22,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        overflow: 'hidden',
    },
    input: {
        paddingHorizontal: 16,
        paddingTop: 11,
        paddingBottom: 11,
        fontSize: 15,
        maxHeight: 100,
        color: '#1F2937',
        lineHeight: 20,
    },
    sendButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
});
