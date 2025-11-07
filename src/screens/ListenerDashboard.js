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
  Alert,
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
  Menu,
} from 'lucide-react-native';
import {
  connectionList,
  acceptConnection,
  getListenerProfile,
  getListenerSessionStats,
  startDirectChat,
} from '../utils/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function ListenerDashboard({ navigation, route }) {
  const [connectedSeekers, setConnectedSeekers] = useState([]);
  const [pendingConnections, setPendingConnections] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [sessionStats, setSessionStats] = useState({ total_sessions: 0, time_display: '0m' });
  const [rating, setRating] = useState('0.0');
  const [activeSeekers, setActiveSeekers] = useState(0);

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

        Alert.alert('Success', 'Connection request accepted successfully!');
      } else {
        Alert.alert('Error', response.error || 'Failed to accept connection request');
      }
    } catch (error) {
      Alert.alert('Error', 'Error accepting connection request');
    } finally {
      setPendingLoading(false);
    }
  };

  const handleRejectRequest = async (connectionId) => {
    Alert.alert(
      'Reject Request',
      'Are you sure you want to reject this connection request?',
      [
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
                Alert.alert('Success', 'Connection request rejected');
              } else {
                Alert.alert('Error', response.error || 'Failed to reject connection request');
              }
            } catch (error) {
              Alert.alert('Error', 'Error rejecting connection request');
            } finally {
              setPendingLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleStartChat = async (seeker) => {
    try {
      if (seeker.status !== 'Accepted') {
        Alert.alert('Error', 'Connection not accepted yet.');
        return;
      }

      setLoading(true);
      const rooms = await startDirectChat(seeker.user_id);

      if (rooms.success) {
        // Navigate to chat screen
        if (navigation) {
          navigation.navigate('Chat', {
            roomId: rooms.data.id,
            seekerName: seeker.full_name,
            connectionId: seeker.connection_id,
          });
        }
      } else {
        Alert.alert('Error', 'Failed to start chat');
      }
    } catch (error) {
      Alert.alert('Error', 'Error starting chat');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
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
    ]);
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
    return (
      <View key={index} style={styles.seekerCard}>
        <LinearGradient
          colors={['rgba(255, 248, 181, 0.3)', 'rgba(255, 184, 140, 0.3)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.seekerCardGradient}
        >
          <View style={styles.seekerHeader}>
            <View style={styles.avatarWrapper}>
              <LinearGradient
                colors={['#CD853F', '#D2691E']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.avatarContainer}
              >
                <Text style={styles.avatarText}>{avatarInitial}</Text>
              </LinearGradient>
              <View style={[styles.statusIndicator, seeker.status === 'Accepted' && styles.statusIndicatorActive]} />
            </View>
            <View style={styles.seekerInfo}>
              <View style={styles.seekerNameRow}>
                <Text style={styles.seekerName}>{seeker.full_name}</Text>
                <View style={[styles.statusBadge, seeker.status === 'Accepted' && styles.statusBadgeActive]}>
                  <Text style={[styles.statusBadgeText, seeker.status === 'Accepted' && styles.statusBadgeTextActive]}>
                    {seeker.status}
                  </Text>
                </View>
              </View>
              <Text style={styles.seekerSpecialty}>{seeker.seeker_profile?.specialty || 'General Support'}</Text>
              <Text style={styles.seekerDescription}>
                {seeker.status === 'Accepted' ? 'Ready to chat' : 
                 seeker.status === 'Pending' ? 'Waiting for approval' : 
                 'Connection required'}
              </Text>
            </View>
          </View>
          {seeker.status === 'Accepted' ? (
            <TouchableOpacity
              style={styles.messageButton}
              onPress={() => handleStartChat(seeker)}
              disabled={loading}
            >
              <LinearGradient
                colors={['#CD853F', '#D2691E']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.messageButtonGradient}
              >
                <MessageCircle size={18} color="#FFF" style={{ marginRight: 8 }} />
                <Text style={styles.messageButtonText}>Message</Text>
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
    return (
      <View key={index} style={styles.requestCard}>
        <LinearGradient
          colors={['#FFF8B5', '#FFB88C']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.requestCardGradient}
        >
          <View style={styles.requestHeader}>
            <LinearGradient
              colors={['#CD853F', '#D2691E']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.requestAvatarContainer}
            >
              <Text style={styles.requestAvatarText}>{avatarInitial}</Text>
            </LinearGradient>
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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
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
              <View style={styles.emptyIconContainer}>
                <Users size={48} color="#8B4513" />
              </View>
              <Text style={styles.emptyStateText}>No connected seekers yet</Text>
              <Text style={styles.emptyStateSubtext}>
                Accepted connection requests will appear here
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF8E7',
  },
  menuButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 30,
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
    paddingBottom: 40,
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
    marginBottom: 16,
    marginTop: Platform.OS === 'ios' ? 70 : 60,
    paddingHorizontal: 16,
  },
  headerGradient: {
    paddingTop: 16,
    paddingBottom: 20,
    paddingHorizontal: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
   
  },
  headerContent: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 6,
    paddingHorizontal: 8,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#4B5563',
    textAlign: 'center',
    lineHeight: 16,
    paddingHorizontal: 12,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  statCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 16,
    padding: 12,
    flex: 1,
    minWidth: 100,
    maxWidth: '31%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    // elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
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
    fontSize: 18,
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
  seekersGrid: {
    // gap handled by marginBottom in seekerCard
  },
  seekerCard: {
    borderRadius: 16,
    marginBottom: 12,
    width: '100%',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    // elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 184, 140, 0.2)',
  },
  seekerCardGradient: {
    padding: 12,
  },
  seekerHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  avatarWrapper: {
    position: 'relative',
    marginRight: 12,
  },
  avatarContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  statusIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#9CA3AF',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  statusIndicatorActive: {
    backgroundColor: '#10B981',
  },
  seekerInfo: {
    flex: 1,
    minWidth: 0,
  },
  seekerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    flexWrap: 'wrap',
  },
  seekerName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginRight: 6,
  },
  statusBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  statusBadgeActive: {
    backgroundColor: '#D1FAE5',
  },
  statusBadgeText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#6B7280',
  },
  statusBadgeTextActive: {
    color: '#10B981',
  },
  seekerSpecialty: {
    fontSize: 13,
    color: '#8B4513',
    fontWeight: '600',
    marginBottom: 4,
  },
  seekerDescription: {
    fontSize: 11,
    color: '#6B7280',
    marginBottom: 4,
    lineHeight: 14,
  },
  messageButton: {
    borderRadius: 10,
    overflow: 'hidden',
    marginTop: 4,
  },
  messageButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  messageButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
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
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    // elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 184, 140, 0.2)',
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 248, 181, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyStateText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
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

