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
  Image,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {
  ArrowLeft,
  Users,
  Star,
  MessageCircle,
  UserCheck,
  Menu,
  Phone,
  Globe,
} from 'lucide-react-native';
import {
  listenerCategoryWise,
  getCategories,
  connectedListeners,
  sendConnectionRequest,
  getApiUrl,
} from '../utils/api';

export default function CategoryListeners({ navigation, route }) {
  const categorySlug = route?.params?.categorySlug || route?.params?.categoryId;
  const categoryId = route?.params?.categoryId;
  const categoryName = route?.params?.categoryName;

  const [listeners, setListeners] = useState([]);
  const [category, setCategory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [connectedListenersList, setConnectedListenersList] = useState([]);
  const [connecting, setConnecting] = useState({});

  useEffect(() => {
    if (categorySlug || categoryId) {
      fetchData();
    }
  }, [categorySlug, categoryId]);

  const fetchData = async () => {
    await Promise.all([fetchListeners(), fetchCategoryDetails(), fetchConnectedListeners()]);
  };

  const fetchListeners = async () => { 
    try {
      setLoading(true);
      setError(null);
      const slug = categorySlug || categoryId;
      const response = await listenerCategoryWise(slug);
      if (response.success && response.data) {
        setListeners(response.data);
      } else {
        setError(response.error || 'Failed to fetch listeners');
        setListeners([]);
      }
    } catch (err) {
      setError('Error fetching listeners');
      setListeners([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategoryDetails = async () => {
    try {
      const response = await getCategories();
      if (response.success && response.data) {
        const foundCategory = response.data.find(
          (cat) => cat.slug === categorySlug || cat.id.toString() === categoryId?.toString()
        );
        if (foundCategory) {
          setCategory(foundCategory);
        }
      }
    } catch (err) {
      console.log('Error fetching category details:', err);
    }
  };

  const fetchConnectedListeners = async () => {
    try {
      const response = await connectedListeners();
      if (response.success && response.data) {
        setConnectedListenersList(response.data);
      }
    } catch (err) {
      console.log('Error fetching connected listeners:', err);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const isListenerConnected = (listenerId) => {
    return connectedListenersList.some(
      (conn) => conn.user_id === listenerId || conn.listener_profile?.l_id === listenerId
    );
  };

  const handleConnect = async (listener) => {
    try {
      const listenerId = listener.l_id || listener.user_id;
      if (isListenerConnected(listenerId)) {
        Alert.alert('Already Connected', 'You are already connected with this listener.');
        return;
      }

      setConnecting({ ...connecting, [listenerId]: true });
      const response = await sendConnectionRequest(listenerId);

      if (response.success) {
        Alert.alert('Success', 'Connection request sent successfully!');
        // Refresh connected listeners
        await fetchConnectedListeners();
      } else {
        Alert.alert('Error', response.error || 'Failed to send connection request');
      }
    } catch (error) {
      Alert.alert('Error', 'Error sending connection request');
    } finally {
      setConnecting({ ...connecting, [listener.l_id || listener.user_id]: false });
    }
  };

  const buildImageUrl = (img) => {
    if (!img) return null;
    if (img.startsWith('http') || img.startsWith('data:')) return img;
    return getApiUrl(`/${img}`);
  };

  const renderListenerCard = (listener, index) => {
    const displayName = listener.name || listener.user?.full_name || listener.username || 'Listener';
    const ratingValue = typeof listener.rating === 'number' ? listener.rating : 
                       listener.rating ? parseFloat(listener.rating) : 4.0;
    const description = listener.description || 'Compassionate listener ready to support you';
    const tags = listener.preferences || listener.tags || [];
    const languages = listener.languages || ['English'];
    const imageUrl = buildImageUrl(listener?.user?.profile_image || listener.image);
    const listenerId = listener.l_id || listener.user_id;
    const isConnected = isListenerConnected(listenerId);
    const isConnecting = connecting[listenerId];

    return (
      <View key={listenerId || index} style={styles.listenerCard}>
        <View style={styles.listenerHeader}>
          <View style={styles.avatarContainer}>
            {imageUrl ? (
              <Image source={{ uri: imageUrl }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarText}>{displayName.charAt(0).toUpperCase()}</Text>
            )}
          </View>
          <View style={styles.listenerInfo}>
            <View style={styles.listenerNameRow}>
              <Text style={styles.listenerName}>{displayName}</Text>
              {isConnected && (
                <View style={styles.connectedBadge}>
                  <UserCheck size={14} color="#10B981" />
                  <Text style={styles.connectedText}>Connected</Text>
                </View>
              )}
            </View>
            <View style={styles.ratingRow}>
              <Star size={16} color="#F59E0B" fill="#F59E0B" />
              <Text style={styles.ratingText}>
                {typeof ratingValue === 'number' && !isNaN(ratingValue) 
                  ? ratingValue.toFixed(1) 
                  : '4.0'}
              </Text>
            </View>
            {description && (
              <Text style={styles.listenerDescription} numberOfLines={2}>
                {description}
              </Text>
            )}
          </View>
        </View>

        {tags.length > 0 && (
          <View style={styles.tagsContainer}>
            {tags.slice(0, 3).map((tag, tagIndex) => (
              <View key={tagIndex} style={styles.tag}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
            {tags.length > 3 && (
              <Text style={styles.moreTagsText}>+{tags.length - 3} more</Text>
            )}
          </View>
        )}

        {languages.length > 0 && (
          <View style={styles.languagesContainer}>
            <Globe size={14} color="#6B7280" />
            <Text style={styles.languagesText}>{languages.join(', ')}</Text>
          </View>
        )}

        <View style={styles.listenerActions}>
          {isConnected ? (
            <TouchableOpacity
              style={styles.connectedButton}
              onPress={() => {
                // Navigate to chat if connected
                navigation.navigate('Chats', {
                  listenerId: listenerId,
                  listenerName: displayName,
                });
              }}
            >
              <MessageCircle size={18} color="#10B981" />
              <Text style={styles.connectedButtonText}>Message</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.connectButton}
              onPress={() => handleConnect(listener)}
              disabled={isConnecting}
            >
              {isConnecting ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <>
                  <UserCheck size={18} color="#FFF" />
                  <Text style={styles.connectButtonText}>Connect</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#F97316" />
        <Text style={styles.loadingText}>Loading listeners...</Text>
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
              <Text style={styles.headerTitle}>
                Listeners for {category?.name || categoryName || 'Category'}
              </Text>
              <Text style={styles.headerSubtitle}>Compassionate peers ready to listen.</Text>
            </View>
          </LinearGradient>
        </View>

        {/* Listeners Grid */}
        {error ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconContainer}>
              <Users size={48} color="#EF4444" />
            </View>
            <Text style={styles.emptyStateTitle}>Error Loading Listeners</Text>
            <Text style={styles.emptyStateSubtext}>{error}</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={fetchData}
              activeOpacity={0.7}
            >
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        ) : listeners.length > 0 ? (
          <View style={styles.listenersGrid}>
            {listeners.map((listener, index) => renderListenerCard(listener, index))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconContainer}>
              <Users size={48} color="#8B4513" />
            </View>
            <Text style={styles.emptyStateTitle}>No Listeners Available</Text>
            <Text style={styles.emptyStateSubtext}>
              There are currently no listeners available in this category. Please check back later.
            </Text>
            <TouchableOpacity
              style={styles.backButtonLarge}
              onPress={() => navigation.goBack()}
              activeOpacity={0.7}
            >
              <ArrowLeft size={18} color="#FFF" />
              <Text style={styles.backButtonText}>Go Back</Text>
            </TouchableOpacity>
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
  listenersGrid: {
    paddingHorizontal: 16,
    gap: 16,
  },
  listenerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  listenerHeader: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  avatarContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#CD853F',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: '#FFE0D5',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
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
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  listenerName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginRight: 8,
  },
  connectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  connectedText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#10B981',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 4,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F59E0B',
  },
  listenerDescription: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
    gap: 8,
    alignItems: 'center',
  },
  tag: {
    backgroundColor: '#FFF8E7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFB88C',
  },
  tagText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#8B4513',
  },
  moreTagsText: {
    fontSize: 11,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  languagesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 6,
  },
  languagesText: {
    fontSize: 12,
    color: '#6B7280',
  },
  listenerActions: {
    marginTop: 8,
  },
  connectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#CD853F',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  connectButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  connectedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#D1FAE5',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  connectedButtonText: {
    color: '#10B981',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 32,
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
    textAlign: 'center',
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#CD853F',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  retryButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  backButtonLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#CD853F',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  backButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

