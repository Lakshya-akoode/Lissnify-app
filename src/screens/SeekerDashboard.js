import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Platform,
  Image
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {
  Heart,
  UserCheck,
  Users,
  MessageCircle,
  ArrowRight,
  Menu,
  Star,
  ChevronDown,
} from 'lucide-react-native';
import {
  connectedListeners,
  getCategories,
  startDirectChat,
  getMessages,
  getApiUrl,
} from '../utils/api';

export default function SeekerDashboard({ navigation, route }) {
  const [connectedListenersData, setConnectedListenersData] = useState([]);
  const [categoriesData, setCategoriesData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [error, setError] = useState(null);
  const [categoriesError, setCategoriesError] = useState(null);
  const [chatLoading, setChatLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [visibleCategories, setVisibleCategories] = useState(6);
  const [isCategoriesExpanded, setIsCategoriesExpanded] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    await Promise.all([fetchConnectedListeners(), fetchCategories()]);
  };

  const fetchConnectedListeners = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await connectedListeners();
      if (response.success && response.data) {
        setConnectedListenersData(response.data);
      } else {
        setError('Failed to fetch connected listeners');
        setConnectedListenersData([]);
      }
    } catch (err) {
      setError('Error fetching connected listeners');
      setConnectedListenersData([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      setCategoriesLoading(true);
      setCategoriesError(null);
      const response = await getCategories();
      if (response.success && response.data) {
        setCategoriesData(response.data);
      } else {
        setCategoriesError('Failed to fetch categories');
        setCategoriesData([]);
      }
    } catch (err) {
      setCategoriesError('Error fetching categories');
      setCategoriesData([]);
    } finally {
      setCategoriesLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const handleChatSelect = async (listener) => {
    try {
      if (listener.status !== 'Accepted') {
        Alert.alert('Error', 'Connection not accepted yet.');
        return;
      }

      setChatLoading(true);
      setError(null);

      const rooms = await startDirectChat(listener.user_id);

      if (rooms.success) {
        const roomId = rooms.data.id;
        // Fetch existing messages
        const messages = await getMessages(roomId);
        if (messages.success && messages.data) {
          // Navigate to chat screen
          if (navigation) {
            navigation.navigate('Chats', {
              roomId: roomId,
              listenerName: listener.full_name,
              connectionId: listener.connection_id,
              listenerUserId: listener.user_id,
            });
          }
        } else {
          setError('Failed to fetch messages');
        }
      } else {
        setError('Failed to start chat');
      }
    } catch (error) {
      Alert.alert('Error', 'Error starting chat');
    } finally {
      setChatLoading(false);
    }
  };

  const handleLoadMoreCategories = () => {
    if (isCategoriesExpanded) {
      setVisibleCategories(6);
      setIsCategoriesExpanded(false);
    } else {
      setVisibleCategories(categoriesData.length);
      setIsCategoriesExpanded(true);
    }
  };

  const handleCategoryPress = (category) => {
    if (navigation) {
      navigation.navigate('CategoryListeners', {
        categoryId: category.id,
        categorySlug: category.slug || category.id.toString(),
        categoryName: category.name,
      });
    }
  };

  const renderCategoryCard = (category, index) => {
    // Determine icon source - handle both URLs and relative paths
    let iconSource = null;
    if (category?.icon) {
      // Check if it's already a full URL
      if (category.icon.startsWith('http://') || category.icon.startsWith('https://')) {
        iconSource = { uri: category.icon };
      } else if (category.icon.startsWith('/')) {
        // Relative path - prepend API base URL
        iconSource = { uri: getApiUrl(category.icon) };
      } else {
        // Try as direct URL
        iconSource = { uri: getApiUrl(`/${category.icon}`) };
      }
    }

    return (
      <TouchableOpacity
        key={category.id || index}
        style={styles.categoryCard}
        onPress={() => handleCategoryPress(category)}
        activeOpacity={0.7}
      >
        <LinearGradient
          colors={['#FFF8B5', '#FFB88C']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.categoryGradient}
        >
          <View style={styles.categoryContent}>
            {iconSource ? (
              <Image
                source={iconSource}
                style={styles.categoryIcon}
                resizeMode="contain"
                onError={(error) => {
                  console.log('Image load error:', error);
                }}
              />
            ) : (
              <Text style={styles.categoryIconEmoji}>💙</Text>
            )}
            <Text style={styles.categoryName}>{category.name}</Text>
            <Text style={styles.categoryDescription} numberOfLines={2}>
              {category.description || category.supportText || 'Get support in this category'}
            </Text>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  const renderListenerCard = (listener, index) => {
    const avatarInitial = listener.listener_profile?.avatar || listener.full_name?.charAt(0) || 'L';
    const statusColor = listener.status === 'Accepted' ? '#10B981' : listener.status === 'Pending' ? '#F59E0B' : '#6B7280';

    return (
      <View key={listener.connection_id || index} style={styles.listenerCard}>
        <View style={styles.listenerHeader}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>{avatarInitial}</Text>
          </View>
          <View style={styles.listenerInfo}>
            <View style={styles.listenerNameRow}>
              <Text style={styles.listenerName}>{listener.full_name}</Text>
              <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
              <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
                <Text style={[styles.statusText, { color: statusColor }]}>
                  {listener.status}
                </Text>
              </View>
            </View>
            <Text style={styles.listenerSpecialty}>
              {listener.listener_profile?.specialty || 'General Support'}
            </Text>
            <View style={styles.listenerStats}>
              {listener.listener_profile?.rating && (
                <View style={styles.statItem}>
                  <Star size={14} color="#F59E0B" fill="#F59E0B" />
                  <Text style={styles.statText}>{listener.listener_profile.rating}</Text>
                </View>
              )}
              {listener.listener_profile?.experience && (
                <Text style={styles.statText}>📚 {listener.listener_profile.experience}</Text>
              )}
            </View>
            <Text style={styles.listenerStatusText}>
              {listener.status === 'Accepted' ? 'Ready to chat' :
                listener.status === 'Pending' ? 'Waiting for approval' :
                  'Connection required'}
            </Text>
          </View>
        </View>
        <View style={styles.listenerActions}>
          {listener.status === 'Accepted' ? (
            <TouchableOpacity
              style={styles.messageButton}
              onPress={() => handleChatSelect(listener)}
              disabled={chatLoading}
            >
              <MessageCircle size={18} color="#FFF" />
              <Text style={styles.messageButtonText}>
                {chatLoading ? 'Starting...' : 'Message'}
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.pendingButton}>
              <Text style={styles.pendingButtonText}>
                {listener.status === 'Pending' ? 'Pending Approval' : 'Connection Required'}
              </Text>
            </View>
          )}
        </View>
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
              <Text style={styles.headerTitle}>Welcome to Your Support Dashboard</Text>
              <Text style={styles.headerSubtitle}>
                Connect with your listeners, explore support categories, and engage with our community
              </Text>
            </View>
          </LinearGradient>
        </View>

        {/* Support Categories Section */}
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
            <Text style={styles.sectionTitle}>Support Categories</Text>
          </View>

          {categoriesLoading ? (
            <View style={styles.emptyState}>
              <ActivityIndicator size="large" color="#F97316" />
              <Text style={styles.emptyStateText}>Loading categories...</Text>
            </View>
          ) : categoriesError ? (
            <View style={styles.emptyState}>
              <Text style={styles.errorText}>{categoriesError}</Text>
            </View>
          ) : categoriesData.length > 0 ? (
            <>
              <View style={styles.categoriesGrid}>
                {categoriesData.slice(0, visibleCategories).map((category, index) =>
                  renderCategoryCard(category, index)
                )}
              </View>

              {categoriesData.length > 6 && (
                <TouchableOpacity
                  style={styles.loadMoreButton}
                  onPress={handleLoadMoreCategories}
                  activeOpacity={0.7}
                >
                  <Text style={styles.loadMoreButtonText}>
                    {isCategoriesExpanded ? 'Show Less' : 'Load More Categories'}
                  </Text>
                  <ChevronDown
                    size={20}
                    color="#FFF"
                    style={isCategoriesExpanded && { transform: [{ rotate: '180deg' }] }}
                  />
                </TouchableOpacity>
              )}
              <Text style={styles.categoriesCount}>
                Showing {visibleCategories} of {categoriesData.length} categories
              </Text>
            </>
          ) : (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconContainer}>
                <Heart size={48} color="#8B4513" />
              </View>
              <Text style={styles.emptyStateTitle}>No Categories Available</Text>
              <Text style={styles.emptyStateSubtext}>
                Categories are currently unavailable. Please try again later.
              </Text>
            </View>
          )}
        </View>

        {/* Connected Listeners Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <LinearGradient
              colors={['#FFF8B5', '#FFB88C']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.sectionIconContainer}
            >
              <UserCheck size={24} color="#8B4513" />
            </LinearGradient>
            <Text style={styles.sectionTitle}>Connected Listeners</Text>
          </View>

          {loading ? (
            <View style={styles.emptyState}>
              <ActivityIndicator size="large" color="#F97316" />
              <Text style={styles.emptyStateText}>Loading connected listeners...</Text>
            </View>
          ) : error ? (
            <View style={styles.emptyState}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : connectedListenersData.length > 0 ? (
            <View style={styles.listenersGrid}>
              {connectedListenersData.map((listener, index) => renderListenerCard(listener, index))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconContainer}>
                <Users size={48} color="#8B4513" />
              </View>
              <Text style={styles.emptyStateTitle}>No Connected Listeners Yet</Text>
              <Text style={styles.emptyStateSubtext}>
                Start connecting with listeners to get the support you need
              </Text>
              <TouchableOpacity
                style={styles.findListenersButton}
                onPress={() => navigation.navigate('Listeners')}
                activeOpacity={0.7}
              >
                <Text style={styles.findListenersButtonText}>Find Listeners</Text>
                <ArrowRight size={18} color="#FFF" />
              </TouchableOpacity>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF8E7',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
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
    paddingHorizontal: 8,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#4B5563',
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 12,
  },
  section: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 24,
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -8,
  },
  categoryCard: {
    width: '48%',
    marginHorizontal: '1%',
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  categoryGradient: {
    padding: 16,
    minHeight: 140,
  },
  categoryContent: {
    alignItems: 'center',
  },
  categoryIcon: {
    width: 48,
    height: 48,
    marginBottom: 8,
  },
  categoryIconEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 8,
  },
  categoryDescription: {
    fontSize: 12,
    color: '#4B5563',
    textAlign: 'center',
    lineHeight: 16,
  },
  loadMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#CD853F',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 16,
    alignSelf: 'center',
  },
  loadMoreButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  categoriesCount: {
    textAlign: 'center',
    fontSize: 12,
    color: '#6B7280',
    marginTop: 12,
  },
  listenersGrid: {
    gap: 16,
  },
  listenerCard: {
    backgroundColor: '#FFF8E7',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FFB88C40',
  },
  listenerHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  avatarContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#CD853F',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFF',
  },
  listenerInfo: {
    flex: 1,
  },
  listenerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    flexWrap: 'wrap',
  },
  listenerName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginRight: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  listenerSpecialty: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8B4513',
    marginBottom: 8,
  },
  listenerStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 12,
    color: '#6B7280',
  },
  listenerStatusText: {
    fontSize: 11,
    color: '#6B7280',
  },
  listenerActions: {
    marginTop: 12,
  },
  messageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#CD853F',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  messageButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  pendingButton: {
    backgroundColor: '#E5E7EB',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  pendingButtonText: {
    color: '#6B7280',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFF8B5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 12,
  },
  findListenersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#CD853F',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  findListenersButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
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
});

