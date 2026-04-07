import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  RefreshControl,
  Platform,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {
  Clock,
  Users,
  Star,
  Heart,
  MessageCircle,
  Check,
  X,
  Calendar,
  User,
  Settings,
  ArrowRight,
  Bell,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  connectionList,
  acceptConnection,
  getListenerProfile,
  getListenerSessionStats,
  startDirectChat,
  getApiUrl,
} from '../utils/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CustomAlert from '../components/CustomAlert';
import useAlert from '../hooks/useAlert';
import { useNotification } from '../contexts/NotificationContext';

export default function ListenerDashboard({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const [connectedSeekers, setConnectedSeekers] = useState([]);
  const [pendingConnections, setPendingConnections] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [sessionStats, setSessionStats] = useState({ total_sessions: 0, time_display: '0m' });
  const [rating, setRating] = useState('0.0');
  const [activeSeekers, setActiveSeekers] = useState(0);
  const { alertState, showAlert, hideAlert } = useAlert();
  const { unreadCount, latestNotification, dismissLatest } = useNotification();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch connections
      const connectedUsers = await connectionList();
      const seekerCount = connectedUsers.data?.length || 0;
      setActiveSeekers(seekerCount);

      // Fetch listener profile to get rating
      const listenerProfileResponse = await getListenerProfile();
      if (listenerProfileResponse.success && listenerProfileResponse.data) {
        const listenerRating = listenerProfileResponse.data.rating || 0.0;
        const formattedRating = parseFloat(listenerRating).toFixed(1);
        setRating(formattedRating);
      }

      // Fetch session stats
      const sessionStatsResponse = await getListenerSessionStats();
      if (sessionStatsResponse.success && sessionStatsResponse.data) {
        setSessionStats({
          total_sessions: sessionStatsResponse.data.total_sessions || 0,
          time_display: sessionStatsResponse.data.time_display || '0m',
        });
      }

      if (connectedUsers.success && connectedUsers.data) {
        const transformedConnections = connectedUsers.data.map((conn) => ({
          connection_id: conn.id,
          user_id: conn.user_id,
          full_name: conn.full_name || 'Unknown',
          role: 'Seeker',
          status: conn.status,
          profile_image: conn.profile_image || null,
          seeker_profile: {
            s_id: conn.id,
            specialty: 'General Support',
            avatar: (conn.full_name || 'U').charAt(0).toUpperCase(),
          },
        }));

        const acceptedConnections = transformedConnections.filter(
          (connection) => connection.status === 'Accepted'
        );
        setConnectedSeekers(acceptedConnections);

        const pendingConnectionsData = transformedConnections.filter(
          (connection) => connection.status === 'Pending'
        );
        setPendingConnections(pendingConnectionsData);
      } else {
        setError('Failed to fetch connections');
      }
    } catch (err) {
      setError('Error fetching data');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    fetchData().finally(() => setRefreshing(false));
  }, []);

  const handleAcceptRequest = async (connectionId) => {
    try {
      setPendingLoading(true);
      const response = await acceptConnection(connectionId, 'accept');

      if (response.success) {
        setPendingConnections((prev) =>
          prev.filter((conn) => conn.connection_id !== connectionId)
        );

        const acceptedConnection = pendingConnections.find(
          (conn) => conn.connection_id === connectionId
        );
        if (acceptedConnection) {
          const updatedConnection = { ...acceptedConnection, status: 'Accepted' };
          setConnectedSeekers((prev) => [...prev, updatedConnection]);
          setActiveSeekers((prev) => prev + 1);
        }

        showAlert({ title: 'Success', message: 'Connection request accepted successfully!', type: 'success' });
      } else {
        showAlert({ title: 'Error', message: response.error || 'Failed to accept connection request', type: 'error' });
      }
    } catch (error) {
      showAlert({ title: 'Error', message: 'Error accepting connection request', type: 'error' });
    } finally {
      setPendingLoading(false);
    }
  };

  const handleRejectRequest = async (connectionId) => {
    showAlert({
      title: 'Reject Request',
      message: 'Are you sure you want to reject this connection request?',
      type: 'warning',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            try {
              setPendingLoading(true);
              const response = await acceptConnection(connectionId, 'reject');

              if (response.success) {
                setPendingConnections((prev) =>
                  prev.filter((conn) => conn.connection_id !== connectionId)
                );
                showAlert({ title: 'Success', message: 'Connection request rejected', type: 'success' });
              } else {
                showAlert({ title: 'Error', message: response.error || 'Failed to reject connection request', type: 'error' });
              }
            } catch (error) {
              showAlert({ title: 'Error', message: 'Error rejecting connection request', type: 'error' });
            } finally {
              setPendingLoading(false);
            }
          },
        },
      ],
    });
  };

  const handleStartChat = async (seeker) => {
    try {
      if (seeker.status !== 'Accepted') {
        showAlert({ title: 'Error', message: 'Connection not accepted yet.', type: 'error' });
        return;
      }

      setLoading(true);
      const rooms = await startDirectChat(seeker.user_id);

      if (rooms.success) {
        if (navigation) {
          navigation.navigate('Chats', {
            roomId: rooms.data.id,
            listenerName: seeker.full_name,
            seekerName: seeker.full_name,
            connectionId: seeker.connection_id,
            listenerUserId: seeker.user_id,
          });
        }
      } else {
        showAlert({ title: 'Error', message: 'Failed to start chat', type: 'error' });
      }
    } catch (error) {
      showAlert({ title: 'Error', message: 'Error starting chat', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    showAlert({
      title: 'Logout',
      message: 'Are you sure you want to logout?',
      type: 'warning',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.removeItem('adminToken');
            if (navigation) {
              navigation.replace('Login');
            }
          },
        },
      ],
    });
  };

  const stats = [
    {
      label: 'Total Sessions',
      value: sessionStats.time_display,
      icon: Clock,
      color: ['#60A5FA', '#3B82F6'],
    },
    {
      label: 'Active Seekers',
      value: `${activeSeekers}`,
      icon: Users,
      color: ['#34D399', '#10B981'],
    },
    {
      label: 'Rating',
      value: rating,
      icon: Star,
      color: ['#FBBF24', '#F59E0B'],
    },
  ];

  const renderStatCard = (stat, index) => {
    const IconComponent = stat.icon;
    const isLast = index === stats.length - 1;
    return (
      <View key={index} style={[styles.statCard, !isLast && styles.statCardMargin]}>
        <LinearGradient
          colors={stat.color}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.statIconContainer}
        >
          <IconComponent size={24} color="#FFF" />
        </LinearGradient>
        <Text style={styles.statValue}>{stat.value}</Text>
        <Text style={styles.statLabel}>{stat.label}</Text>
      </View>
    );
  };

  const renderSeekerCard = (seeker, index) => {
    const avatarInitial = seeker.seeker_profile?.avatar || seeker.full_name?.charAt(0) || 'U';
    const profileImageUrl = seeker.profile_image
      ? (seeker.profile_image.startsWith('http') ? seeker.profile_image : getApiUrl(`/${seeker.profile_image}`))
      : null;
    return (
      <View key={index} style={styles.seekerCard}>
        <LinearGradient
          colors={['#FFFFFF', 'rgba(255, 248, 181, 0.15)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.seekerCardGradient}
        >
          <View style={styles.seekerHeader}>
            <View style={styles.avatarWrapper}>
              {profileImageUrl ? (
                <Image
                  source={{ uri: profileImageUrl }}
                  style={styles.avatarImage}
                />
              ) : (
                <LinearGradient
                  colors={['#CD853F', '#D2691E']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.avatarContainer}
                >
                  <Text style={styles.avatarText}>{avatarInitial}</Text>
                </LinearGradient>
              )}
              <View style={[styles.statusIndicator, seeker.status === 'Accepted' && styles.statusIndicatorActive]} />
            </View>
            <View style={styles.seekerInfo}>
              <Text style={styles.seekerName} numberOfLines={1}>{seeker.full_name}</Text>
              <View style={styles.seekerMetaRow}>
                <View style={[styles.statusBadge, seeker.status === 'Accepted' && styles.statusBadgeActive]}>
                  <View style={[styles.statusDot, seeker.status === 'Accepted' && styles.statusDotActive]} />
                  <Text style={[styles.statusBadgeText, seeker.status === 'Accepted' && styles.statusBadgeTextActive]}>
                    {seeker.status === 'Accepted' ? 'Connected' : seeker.status}
                  </Text>
                </View>
              </View>
              <Text style={styles.seekerSpecialty}>{seeker.seeker_profile?.specialty || 'General Support'}</Text>
            </View>
          </View>
          {seeker.status === 'Accepted' ? (
            <TouchableOpacity
              style={styles.messageButton}
              onPress={() => handleStartChat(seeker)}
              disabled={loading}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#CD853F', '#D2691E']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.messageButtonGradient}
              >
                <MessageCircle size={16} color="#FFF" style={{ marginRight: 8 }} />
                <Text style={styles.messageButtonText}>Start Conversation</Text>
                <ArrowRight size={14} color="#FFF" style={{ marginLeft: 8 }} />
              </LinearGradient>
            </TouchableOpacity>
          ) : (
            <View style={styles.disabledButton}>
              <Text style={styles.disabledButtonText}>
                {seeker.status === 'Pending' ? 'Pending Approval' : 'Connection Required'}
              </Text>
            </View>
          )}
        </LinearGradient>
      </View>
    );
  };

  const renderPendingRequest = (request, index) => {
    const avatarInitial = request.full_name?.charAt(0) || 'U';
    const profileImageUrl = request.profile_image
      ? (request.profile_image.startsWith('http') ? request.profile_image : getApiUrl(`/${request.profile_image}`))
      : null;
    return (
      <View key={index} style={styles.requestCard}>
        <LinearGradient
          colors={['#FFF8B5', '#FFB88C']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.requestCardGradient}
        >
          <View style={styles.requestHeader}>
            {profileImageUrl ? (
              <Image
                source={{ uri: profileImageUrl }}
                style={styles.requestAvatarImage}
              />
            ) : (
              <LinearGradient
                colors={['#CD853F', '#D2691E']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.requestAvatarContainer}
              >
                <Text style={styles.requestAvatarText}>{avatarInitial}</Text>
              </LinearGradient>
            )}
            <View style={styles.requestInfo}>
              <View style={styles.requestNameRow}>
                <Text style={styles.requestName}>{request.full_name}</Text>
                <Text style={styles.requestSpecialty}>{request.seeker_profile?.specialty || 'General Support'}</Text>
              </View>
              <Text style={styles.requestDescription}>Wants to connect with you for support</Text>
              <Text style={styles.requestStatusText}>Status: {request.status}</Text>
            </View>
          </View>
          <View style={styles.requestActions}>
            <TouchableOpacity
              style={styles.acceptButton}
              onPress={() => handleAcceptRequest(request.connection_id)}
              disabled={pendingLoading}
            >
              <Check size={18} color="#FFF" style={{ marginRight: 8 }} />
              <Text style={styles.actionButtonText}>Accept</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.rejectButton}
              onPress={() => handleRejectRequest(request.connection_id)}
              disabled={pendingLoading}
            >
              <X size={18} color="#FFF" style={{ marginRight: 8 }} />
              <Text style={styles.actionButtonText}>Reject</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#F97316" />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Notification Bell */}
      <TouchableOpacity
        style={[styles.notificationBell, { top: Platform.OS === 'ios' ? 80 : 30 }]}
        onPress={() => navigation.navigate('Chats')}
        activeOpacity={0.7}
      >
        <Bell size={22} color="#8B4513" />
        {unreadCount > 0 && (
          <View style={styles.notifBadge}>
            <Text style={styles.notifBadgeText}>
              {unreadCount > 99 ? '99+' : unreadCount}
            </Text>
          </View>
        )}
      </TouchableOpacity>

      {/* In-app Notification Toast */}
      {latestNotification && (
        <TouchableOpacity
          style={[styles.notifToast, { top: insets.top + 10 }]}
          onPress={() => {
            dismissLatest();
            if (latestNotification.chat_room_id) {
              navigation.navigate('Chats', {
                roomId: latestNotification.chat_room_id,
                seekerName: latestNotification.sender_name,
              });
            }
          }}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={['#CD853F', '#D2691E']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.notifToastGradient}
          >
            <Bell size={18} color="#FFF" />
            <View style={styles.notifToastContent}>
              <Text style={styles.notifToastTitle} numberOfLines={1}>
                {latestNotification.title || 'New Notification'}
              </Text>
              <Text style={styles.notifToastMessage} numberOfLines={1}>
                {latestNotification.message}
              </Text>
            </View>
          </LinearGradient>
        </TouchableOpacity>
      )}

      {/* Menu Button */}


      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.contentContainer, { paddingBottom: 100 + insets.bottom }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Header */}
        <View style={[styles.header, { marginTop: insets.top + 10 }]}>
          <LinearGradient
            colors={['#FFF8E1', '#FFE0B2']} // Softer gold/orange gradient
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.headerGradient}
          >
            <View style={styles.headerContent}>
              <Text style={styles.headerTitle}>Listener Dashboard</Text>
              <Text style={styles.headerSubtitle}>
                Support seekers, track your impact, and grow your listening practice
              </Text>
            </View>
          </LinearGradient>
        </View>

        {/* Stats Section */}
        <View style={styles.statsContainer}>
          {stats.map((stat, index) => renderStatCard(stat, index))}
        </View>

        {/* Pending Connection Requests */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <LinearGradient
              colors={['#FFF8B5', '#FFB88C']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.sectionIconContainer}
            >
              <Heart size={24} color="#8B4513" />
            </LinearGradient>
            <Text style={styles.sectionTitle}>Pending Connection Requests</Text>
          </View>
          {pendingConnections.length > 0 ? (
            pendingConnections.map((request, index) => renderPendingRequest(request, index))
          ) : (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconContainer}>
                <Heart size={48} color="#8B4513" />
              </View>
              <Text style={styles.emptyStateText}>No Pending Requests</Text>
              <Text style={styles.emptyStateSubtext}>You're all caught up!</Text>
            </View>
          )}
        </View>

        {/* Connected Seekers */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <LinearGradient
              colors={['#FFF8B5', '#FFB88C']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.sectionIconContainer}
            >
              <Users size={24} color="#8B4513" />
            </LinearGradient>
            <Text style={styles.sectionTitle}>Connected Seekers</Text>
          </View>
          {connectedSeekers.length > 0 ? (
            <View style={styles.seekersGrid}>
              {connectedSeekers.map((seeker, index) => renderSeekerCard(seeker, index))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <LinearGradient
                colors={['#FFF8B5', '#FFB88C']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.emptyIconContainer}
              >
                <Users size={40} color="#8B4513" />
              </LinearGradient>
              <Text style={styles.emptyStateText}>No connected seekers yet</Text>
              <Text style={styles.emptyStateSubtext}>
                When seekers connect with you, they will appear here. Accept pending requests above to get started!
              </Text>
            </View>
          )}
        </View>

        {/* Error Message */}
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
      </ScrollView>
      <CustomAlert {...alertState} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF8E7',
  },
  notificationBell: {
    position: 'absolute',
    right: 16,
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
  notifBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#FFF',
  },
  notifBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '700',
  },
  notifToast: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 2000,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 10,
  },
  notifToastGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  notifToastContent: {
    flex: 1,
  },
  notifToastTitle: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  notifToastMessage: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
  },
  menuButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 80 : 30,
    left: 16,
    zIndex: 1000,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    // elevation: 6,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    // paddingBottom handled inline
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF8E7',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
  header: {
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  headerGradient: {
    paddingVertical: 24,
    paddingHorizontal: 20,
    borderRadius: 24,
    shadowColor: '#CD853F',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#FFF',
  },
  headerContent: {
    alignItems: 'center',
    width: '100%',
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#374151',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    fontWeight: '500',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 24,
    gap: 12,
  },
  statCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  statCardMargin: {
    marginRight: 12,
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    color: '#6B7280',
    textAlign: 'center',
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 16,

  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    flex: 1,
  },
  countBadge: {
    backgroundColor: '#CD853F',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
    marginLeft: 8,
  },
  countBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  seekersGrid: {
    gap: 12,
  },
  seekerCard: {
    borderRadius: 16,
    marginBottom: 0,
    width: '100%',
    overflow: 'hidden',
    shadowColor: '#CD853F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(205, 133, 63, 0.15)',
  },
  seekerCardGradient: {
    padding: 16,
  },
  seekerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  avatarWrapper: {
    position: 'relative',
    marginRight: 14,
    width: 52,
    height: 52,
  },
  avatarContainer: {
    width: '100%',
    height: '100%',
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 26,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    includeFontPadding: false,
  },
  statusIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#D1D5DB',
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
    zIndex: 1,
  },
  statusIndicatorActive: {
    backgroundColor: '#10B981',
  },
  seekerInfo: {
    flex: 1,
    minWidth: 0,
  },
  seekerMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  seekerName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  statusBadgeActive: {
    backgroundColor: '#D1FAE5',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#9CA3AF',
    marginRight: 5,
  },
  statusDotActive: {
    backgroundColor: '#10B981',
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
  },
  statusBadgeTextActive: {
    color: '#059669',
  },
  seekerSpecialty: {
    fontSize: 12,
    color: '#8B4513',
    fontWeight: '500',
    marginTop: 2,
  },
  messageButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  messageButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  messageButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  disabledButton: {
    backgroundColor: '#D1D5DB',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginTop: 4,
    alignItems: 'center',
  },
  disabledButtonText: {
    color: '#6B7280',
    fontSize: 13,
    fontWeight: '600',
  },
  requestCard: {
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    // elevation: 6,
  },
  requestCardGradient: {
    padding: 12,
  },
  requestHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  requestAvatarContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  requestAvatarImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
  },
  requestAvatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  requestInfo: {
    flex: 1,
  },
  requestNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    flexWrap: 'wrap',
  },
  requestName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginRight: 6,
  },
  requestSpecialty: {
    fontSize: 11,
    color: 'rgba(0, 0, 0, 0.7)',
  },
  requestDescription: {
    fontSize: 12,
    color: 'rgba(0, 0, 0, 0.8)',
    marginBottom: 4,
    lineHeight: 16,
  },
  requestStatusText: {
    fontSize: 11,
    color: 'rgba(0, 0, 0, 0.6)',
  },
  requestActions: {
    flexDirection: 'row',
  },
  acceptButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginRight: 6,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    // elevation: 4,
  },
  rejectButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EF4444',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginLeft: 6,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    // elevation: 4,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#CD853F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(205, 133, 63, 0.12)',
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateSubtext: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 8,
  },
  errorContainer: {
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorText: {
    fontSize: 14,
    color: '#991B1B',
    textAlign: 'center',
  },
  logoutButton: {
    backgroundColor: '#EF4444',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    marginHorizontal: 16,
    marginTop: 16,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

