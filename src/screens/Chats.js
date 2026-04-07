import React, { useState, useEffect } from 'react';
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
  Image,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {
  Search,
  MessageCircle,
  ArrowRight,
} from 'lucide-react-native';
import {
  connectedListeners,
  getUnreadCounts,
  getApiUrl,
} from '../utils/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ChatsScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();

  const [searchTerm, setSearchTerm] = useState('');
  const [connectedListenersData, setConnectedListeners] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [unreadCounts, setUnreadCounts] = useState({});
  const [roomIdMap, setRoomIdMap] = useState({});

  const fetchUnreadCounts = async () => {
    try {
      const response = await getUnreadCounts();
      if (response.success && response.data) {
        setUnreadCounts(response.data);
      }
    } catch (err) {
      console.error('Error fetching unread counts:', err);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

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
              is_online: conn.is_online || false,
              profile_image: conn.profile_image || null,
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

    const interval = setInterval(fetchUnreadCounts, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!route?.params?.roomId) return;

    const { listenerName, seekerName, connectionId, listenerUserId, seekerUserId, roomId } = route.params;

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
      onStartChat(user);
    }
  }, [route?.params, connectedListenersData]);

  const onStartChat = (listener) => {
    const roomId = roomIdMap[listener.connection_id];
    navigation.navigate('ChatScreen', {
      listenerId: listener.user_id,
      connectionId: listener.connection_id,
      listenerName: listener.full_name,
      listenerAvatar: listener.listener_profile?.avatar,
      listenerProfileImage: listener.profile_image || null,
      listenerOnline: listener.is_online || false,
      roomId: roomId,
    });
  };

  const filteredListeners = connectedListenersData.filter((listener) =>
    listener.full_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.contentContainer, { paddingBottom: 100 + insets.bottom }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          {/* Header */}
          <View style={[styles.header, { marginTop: insets.top + 10 }]}>
            <LinearGradient
              colors={['#FFF8E1', '#FFE0B2']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.headerGradient}
            >
              <View style={styles.headerIconRow}>
                <LinearGradient
                  colors={['#FFF8B5', '#FFB88C']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.headerIconContainer}
                >
                  <MessageCircle size={26} color="#8B4513" />
                </LinearGradient>
              </View>
              <Text style={styles.headerTitle}>Conversations</Text>
              <Text style={styles.headerSubtitle}>
                Connect and chat with your listeners
              </Text>
            </LinearGradient>
          </View>

          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <Search size={18} color="#9CA3AF" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search conversations..."
              value={searchTerm}
              onChangeText={setSearchTerm}
              placeholderTextColor="#9CA3AF"
              returnKeyType="search"
            />
          </View>

          {/* Conversations List */}
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#CD853F" />
              <Text style={styles.loadingText}>Loading conversations...</Text>
            </View>
          ) : error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : filteredListeners.length === 0 ? (
            <View style={styles.emptyState}>
              <LinearGradient
                colors={['#FFF8B5', '#FFB88C']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.emptyIconContainer}
              >
                <MessageCircle size={36} color="#8B4513" />
              </LinearGradient>
              <Text style={styles.emptyStateTitle}>No Conversations Yet</Text>
              <Text style={styles.emptyStateSubtext}>
                Start connecting with listeners to begin chatting
              </Text>
            </View>
          ) : (
            <View style={styles.conversationsList}>
              {filteredListeners.map((listener) => {
                const roomId = roomIdMap[listener.connection_id];
                const unreadCount = roomId ? unreadCounts[roomId] || 0 : 0;
                const initial = listener.listener_profile?.avatar || listener.full_name?.charAt(0)?.toUpperCase();
                const profileImageUrl = listener.profile_image
                  ? (listener.profile_image.startsWith('http') ? listener.profile_image : getApiUrl(`/${listener.profile_image}`))
                  : null;

                return (
                  <TouchableOpacity
                    key={listener.connection_id}
                    style={styles.conversationItem}
                    onPress={() => onStartChat(listener)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.avatarWrapper}>
                      {profileImageUrl ? (
                        <Image
                          source={{ uri: profileImageUrl }}
                          style={styles.conversationAvatarImage}
                        />
                      ) : (
                        <LinearGradient
                          colors={['#CD853F', '#D2691E']}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={styles.conversationAvatar}
                        >
                          <Text style={styles.conversationAvatarText}>{initial}</Text>
                        </LinearGradient>
                      )}
                      <View style={[styles.onlineIndicator, !listener.is_online && styles.offlineIndicator]} />
                    </View>
                    <View style={styles.conversationInfo}>
                      <View style={styles.conversationHeader}>
                        <Text style={styles.conversationName} numberOfLines={1}>
                          {listener.full_name}
                        </Text>
                        {unreadCount > 0 && (
                          <View style={styles.unreadBadge}>
                            <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.conversationSpecialty} numberOfLines={1}>
                        {listener.listener_profile?.specialty || 'General Support'}
                      </Text>
                      <View style={styles.conversationStatusRow}>
                        <View style={[styles.statusDot, { backgroundColor: listener.is_online ? '#10B981' : '#9CA3AF' }]} />
                        <Text style={[styles.conversationStatus, { color: listener.is_online ? '#10B981' : '#9CA3AF' }]}>
                          {listener.is_online ? 'Online' : 'Offline'}
                        </Text>
                      </View>
                    </View>
                    <ArrowRight size={16} color="#D1D5DB" style={styles.chevron} />
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF8E7',
  },
  flex: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
  },

  // Header
  header: {
    marginBottom: 16,
  },
  headerGradient: {
    paddingVertical: 24,
    paddingHorizontal: 20,
    borderRadius: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFF',
    shadowColor: '#CD853F',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
  },
  headerIconRow: {
    marginBottom: 12,
  },
  headerIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#374151',
    textAlign: 'center',
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    fontWeight: '500',
  },

  // Search
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginBottom: 20,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(205, 133, 63, 0.12)',
    shadowColor: '#CD853F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#111827',
    padding: 0,
  },

  // Conversations
  conversationsList: {
    gap: 10,
  },
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(205, 133, 63, 0.1)',
    shadowColor: '#CD853F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  avatarWrapper: {
    position: 'relative',
    marginRight: 14,
  },
  conversationAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  conversationAvatarImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  conversationAvatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 1,
    right: 1,
    width: 13,
    height: 13,
    borderRadius: 7,
    backgroundColor: '#10B981',
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
  },
  offlineIndicator: {
    backgroundColor: '#9CA3AF',
  },
  conversationInfo: {
    flex: 1,
    minWidth: 0,
  },
  conversationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  conversationName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    flex: 1,
    marginRight: 8,
  },
  unreadBadge: {
    backgroundColor: '#CD853F',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  unreadBadgeText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700',
  },
  conversationSpecialty: {
    fontSize: 13,
    color: '#8B4513',
    fontWeight: '500',
    marginBottom: 3,
  },
  conversationStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  conversationStatus: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '600',
  },
  chevron: {
    marginLeft: 8,
  },

  // Loading
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#9CA3AF',
    fontWeight: '500',
  },

  // Error
  errorContainer: {
    backgroundColor: '#FEF2F2',
    padding: 14,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorText: {
    color: '#B91C1C',
    fontSize: 13,
    textAlign: 'center',
    fontWeight: '500',
  },

  // Empty State
  emptyState: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(205, 133, 63, 0.12)',
    shadowColor: '#CD853F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
  },
  emptyIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
  },
  emptyStateTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 6,
  },
  emptyStateSubtext: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 260,
  },
});
