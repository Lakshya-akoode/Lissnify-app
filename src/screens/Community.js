import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  TextInput,
  RefreshControl,
  KeyboardAvoidingView,
  Alert,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {
  Menu,
  Users,
  Heart,
  MessageCircle,
  Share2,
  Plus,
  Loader2,
  Star,
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getCategories,
  getCommunityPosts,
  createCommunityPost,
  likeCommunityPost,
  unlikeCommunityPost,
} from '../utils/api';

const gradientColors = ['#FFF8B5', '#FFB88C'];

export default function CommunityScreen({ navigation }) {
  const [userName, setUserName] = useState('User');
  const [userInitials, setUserInitials] = useState('U');
  const [userType, setUserType] = useState('listener');

  const [categoriesData, setCategoriesData] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [communityPosts, setCommunityPosts] = useState([]);

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostCategory, setNewPostCategory] = useState(null);
  const [posting, setPosting] = useState(false);

  const fetchUserDetails = useCallback(async () => {
    try {
      const storedData = await AsyncStorage.getItem('elysian_user');
      if (storedData) {
        const parsed = JSON.parse(storedData);
        const fullName = parsed.full_name || parsed.name || 'User';
        setUserName(fullName);
        setUserType(parsed.user_type || 'listener');
        setUserInitials(getInitials(fullName));
      } else {
        const fallbackName = (await AsyncStorage.getItem('full_name')) || 'User';
        const fallbackType = (await AsyncStorage.getItem('user_type')) || 'listener';
        setUserName(fallbackName);
        setUserType(fallbackType);
        setUserInitials(getInitials(fallbackName));
      }
    } catch (err) {
      console.error('Error fetching user details:', err);
    }
  }, []);

  const loadCommunityData = useCallback(async (isRefreshing = false) => {
    try {
      if (isRefreshing) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const [categoriesRes, postsRes] = await Promise.all([
        getCategories(),
        // Don't filter by postType - show all posts (listener and seeker)
        getCommunityPosts({ categoryId: selectedCategory }),
      ]);

      if (categoriesRes.success && categoriesRes.data) {
        setCategoriesData(categoriesRes.data);
      } else if (categoriesRes.error) {
        setError(categoriesRes.error);
      }

      if (postsRes.success && postsRes.data) {
        setCommunityPosts(postsRes.data);
      } else if (postsRes.error) {
        setError(postsRes.error);
      }
    } catch (err) {
      console.error('Error loading community data:', err);
      setError('Failed to load community content. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedCategory, userType]);

  useEffect(() => {
    fetchUserDetails();
  }, [fetchUserDetails]);

  useEffect(() => {
    loadCommunityData();
  }, [loadCommunityData]);

  const onRefresh = useCallback(() => {
    loadCommunityData(true);
  }, [loadCommunityData]);

  const handleCreatePost = useCallback(async () => {
    if (!newPostTitle.trim() || !newPostContent.trim()) {
      Alert.alert('Incomplete', 'Please fill in both the title and content before posting.');
      return;
    }

    try {
      setPosting(true);
      const response = await createCommunityPost({
        title: newPostTitle.trim(),
        content: newPostContent.trim(),
        category: newPostCategory,
        post_type: userType,
      });

      if (response.success && response.data) {
        setCommunityPosts((prev) => [response.data, ...prev]);
        setNewPostTitle('');
        setNewPostContent('');
        setNewPostCategory(null);
      } else if (response.error) {
        Alert.alert('Error', response.error);
      }
    } catch (err) {
      console.error('Error creating post:', err);
      Alert.alert('Error', 'Failed to create post. Please try again.');
    } finally {
      setPosting(false);
    }
  }, [newPostTitle, newPostContent, newPostCategory, userType]);

  const handleToggleLike = useCallback(async (post) => {
    try {
      setCommunityPosts((prev) =>
        prev.map((item) =>
          item.id === post.id
            ? {
                ...item,
                is_liked: !item.is_liked,
                likes_count: item.is_liked ? Math.max(0, item.likes_count - 1) : item.likes_count + 1,
              }
            : item
        )
      );

      const apiCall = post.is_liked ? unlikeCommunityPost : likeCommunityPost;
      const response = await apiCall(post.id);

      if (!response.success) {
        throw new Error(response.error || 'Failed to update like');
      }
    } catch (err) {
      console.error('Error toggling like:', err);
      setCommunityPosts((prev) =>
        prev.map((item) =>
          item.id === post.id
            ? {
                ...item,
                is_liked: post.is_liked,
                likes_count: post.likes_count,
              }
            : item
        )
      );
      Alert.alert('Error', 'Unable to update like at the moment.');
    }
  }, []);

  const formatTimeAgo = useCallback((dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    return `${Math.floor(diffInSeconds / 86400)} days ago`;
  }, []);

  const activeCategoryLabel = useMemo(() => {
    if (selectedCategory === null) return 'All';
    const match = categoriesData.find((category) => category.id === selectedCategory);
    return match?.name || 'Category';
  }, [selectedCategory, categoriesData]);

  return (
    <View style={styles.container}>
      <LinearGradient colors={gradientColors} style={styles.backgroundGradient} />

      <TouchableOpacity
        style={styles.menuButton}
        onPress={() => navigation.openDrawer()}
        activeOpacity={0.7}
      >
        <Menu size={24} color="#111827" />
      </TouchableOpacity>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#F97316" />
          }
        >
          <View style={styles.headerSection}>
            <Users size={48} color="#111827" />
            <Text style={styles.headerTitle}>Community</Text>
            <Text style={styles.headerSubtitle}>
              Connect, share, and lift each other up in our safe community space
            </Text>
          </View>

          {error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.createPostCard}>
            <View style={styles.createPostHeader}>
              <LinearGradient colors={['#CD853F', '#D2691E']} style={styles.avatarGradient}>
                <Text style={styles.avatarInitials}>{userInitials}</Text>
              </LinearGradient>
              <View style={styles.createPostInputs}>
                <TextInput
                  value={newPostTitle}
                  onChangeText={setNewPostTitle}
                  placeholder="Post title..."
                  placeholderTextColor="#9CA3AF"
                  style={styles.titleInput}
                />
                <TextInput
                  value={newPostContent}
                  onChangeText={setNewPostContent}
                  placeholder="Share your thoughts with the community..."
                  placeholderTextColor="#9CA3AF"
                  style={styles.bodyInput}
                  multiline
                  textAlignVertical="top"
                />
              </View>
            </View>

            <View style={styles.createPostFooter}>
              <View style={styles.categoryChipsContainer}>
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.categoryChipsScrollContent}
                >
                  <TouchableOpacity
                    style={[
                      styles.categoryChip,
                      newPostCategory === null && styles.categoryChipActive,
                    ]}
                    activeOpacity={0.8}
                    onPress={() => setNewPostCategory(null)}
                  >
                    <Text
                      style={[
                        styles.categoryChipText,
                        newPostCategory === null && styles.categoryChipTextActive,
                      ]}
                    >
                      No Category
                    </Text>
                  </TouchableOpacity>
                  {categoriesData.map((category) => (
                    <TouchableOpacity
                      key={category.id}
                      style={[
                        styles.categoryChip,
                        newPostCategory === category.id && styles.categoryChipActive,
                      ]}
                      activeOpacity={0.8}
                      onPress={() => setNewPostCategory(category.id)}
                    >
                      <Text
                        style={[
                          styles.categoryChipText,
                          newPostCategory === category.id && styles.categoryChipTextActive,
                        ]}
                      >
                        {category.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <TouchableOpacity
                style={styles.postButton}
                onPress={handleCreatePost}
                activeOpacity={0.8}
                disabled={posting}
              >
                <LinearGradient
                  colors={['#CD853F', '#D2691E']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.postButtonGradient}
                >
                  {posting ? (
                    <>
                      <Loader2 size={18} color="#FFF" />
                      <Text style={styles.postButtonText}>Posting...</Text>
                    </>
                  ) : (
                    <>
                      <Plus size={18} color="#FFF" />
                      <Text style={styles.postButtonText}>Post</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>

            <View style={styles.postingAsRow}>
              <Text style={styles.postingAsLabel}>Posting as:</Text>
              <View style={styles.postingAsTag}>
                <Text style={styles.postingAsTagText}>{capitalize(userType)}</Text>
              </View>
              <Text style={styles.postingAsCategory}>Category: {activeCategoryLabel}</Text>
            </View>
          </View>

          <View style={styles.categoriesCard}>
            <View style={styles.categoriesHeader}>
              <Users size={20} color="#8B4513" />
              <Text style={styles.categoriesTitle}>Discussion Categories</Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoriesChips}
            >
              <TouchableOpacity
                style={[
                  styles.filterChip,
                  selectedCategory === null && styles.filterChipActive,
                ]}
                onPress={() => setSelectedCategory(null)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    selectedCategory === null && styles.filterChipTextActive,
                  ]}
                >
                  All
                </Text>
              </TouchableOpacity>
              {categoriesData.map((category) => (
                <TouchableOpacity
                  key={category.id}
                  style={[
                    styles.filterChip,
                    selectedCategory === category.id && styles.filterChipActive,
                  ]}
                  onPress={() => setSelectedCategory(category.id)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      selectedCategory === category.id && styles.filterChipTextActive,
                    ]}
                  >
                    {category.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View style={styles.postsHeaderRow}>
            <Text style={styles.postsHeaderTitle}>All Discussions</Text>
            <View style={styles.postsCountPill}>
              <Text style={styles.postsCountText}>
                {communityPosts.length} {communityPosts.length === 1 ? 'post' : 'posts'}
              </Text>
            </View>
          </View>

          {loading ? (
            <View style={styles.loaderContainer}>
              <ActivityIndicator size="large" color="#F97316" />
              <Text style={styles.loaderText}>Loading community...</Text>
            </View>
          ) : communityPosts.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateTitle}>No posts yet</Text>
              <Text style={styles.emptyStateSubtitle}>
                Start the conversation by sharing your thoughts with the community.
              </Text>
            </View>
          ) : (
            communityPosts.map((post) => (
              <LinearGradient
                key={post.id}
                colors={["rgba(255, 255, 255, 0.9)", 'rgba(255, 248, 181, 0.6)']}
                style={styles.postCard}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.postHeaderRow}>
                  <LinearGradient colors={['#CD853F', '#D2691E']} style={styles.postAvatar}>
                    <Text style={styles.postAvatarText}>{getInitials(post.author?.full_name || '')}</Text>
                  </LinearGradient>
                  <View style={styles.postMeta}>
                    <View style={styles.postMetaTop}>
                      <Text style={styles.postAuthor}>{post.author?.full_name}</Text>
                      {post.is_verified ? (
                        <View style={styles.verifiedBadge}>
                          <Star size={12} color="#2563EB" />
                          <Text style={styles.verifiedBadgeText}>Verified</Text>
                        </View>
                      ) : null}
                      <Text style={styles.postDot}>•</Text>
                      <Text style={styles.postDate}>{formatTimeAgo(post.created_at)}</Text>
                      {post.category_name ? (
                        <View style={styles.postCategoryPill}>
                          <Text style={styles.postCategoryText}>{post.category_name}</Text>
                        </View>
                      ) : null}
                    </View>
                    <Text style={styles.postTitle}>{post.title}</Text>
                    <Text style={styles.postContent}>{post.content}</Text>
                  </View>
                </View>

                <View style={styles.postActionsRow}>
                  <TouchableOpacity
                    style={[styles.postActionButton, post.is_liked && styles.postActionButtonActive]}
                    onPress={() => handleToggleLike(post)}
                    activeOpacity={0.8}
                  >
                    <Heart
                      size={18}
                      color={post.is_liked ? '#DC2626' : '#6B7280'}
                      fill={post.is_liked ? '#DC2626' : 'none'}
                    />
                    <Text
                      style={[styles.postActionText, post.is_liked && styles.postActionTextActive]}
                    >
                      {post.likes_count}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.postActionButton} activeOpacity={0.8}>
                    <MessageCircle size={18} color="#6B7280" />
                    <Text style={styles.postActionText}>{post.comments_count}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.postActionButton, styles.postActionButtonLast]}
                    activeOpacity={0.8}
                  >
                    <Share2 size={18} color="#6B7280" />
                    <Text style={styles.postActionText}>Share</Text>
                  </TouchableOpacity>
                </View>
              </LinearGradient>
            ))
          )}

          {communityPosts.length > 0 && !loading ? (
            <TouchableOpacity style={styles.loadMoreButton} activeOpacity={0.8}>
              <Text style={styles.loadMoreText}>Load More Posts</Text>
            </TouchableOpacity>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function getInitials(name = '') {
  const cleaned = name.trim();
  if (!cleaned) return 'U';
  const parts = cleaned.split(' ').filter(Boolean);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function capitalize(value = '') {
  if (!value) return '';
  return value.charAt(0).toUpperCase() + value.slice(1);
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF8E7',
  },
  flex: {
    flex: 1,
  },
  backgroundGradient: {
    ...StyleSheet.absoluteFillObject,
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
    elevation: 6,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingTop: Platform.OS === 'ios' ? 100 : 80,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginTop: 12,
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#4B5563',
    textAlign: 'center',
    maxWidth: 320,
  },
  errorContainer: {
    backgroundColor: '#FEF2F2',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FECACA',
    marginBottom: 16,
  },
  errorText: {
    color: '#B91C1C',
    fontSize: 14,
    textAlign: 'center',
  },
  createPostCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
  },
  createPostHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  avatarGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarInitials: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
  createPostInputs: {
    flex: 1,
    minWidth: 0, // Ensures proper flex behavior
  },
  titleInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 10,
    color: '#111827',
  },
  bodyInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 100,
    fontSize: 14,
    color: '#111827',
  },
  createPostFooter: {
    flexDirection: 'column',
    marginBottom: 16,
    gap: 12,
  },
  categoryChipsContainer: {
    width: '100%',
  },
  categoryChipsScrollContent: {
    paddingRight: 4,
  },
  categoryChip: {
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginRight: 10,
    backgroundColor: '#FFFFFF',
  },
  categoryChipActive: {
    backgroundColor: '#CD853F',
    borderColor: '#CD853F',
  },
  categoryChipText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '600',
  },
  categoryChipTextActive: {
    color: '#FFFFFF',
  },
  postButton: {
    alignSelf: 'flex-end',
  },
  postButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 16,
  },
  postButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 8,
  },
  postingAsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  postingAsLabel: {
    fontSize: 13,
    color: '#6B7280',
  },
  postingAsTag: {
    backgroundColor: '#FFF1DC',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  postingAsTagText: {
    color: '#8B4513',
    fontSize: 12,
    fontWeight: '600',
  },
  postingAsCategory: {
    fontSize: 13,
    color: '#6B7280',
  },
  categoriesCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderRadius: 24,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  categoriesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  categoriesTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginLeft: 8,
  },
  categoriesChips: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 4,
  },
  filterChip: {
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    minWidth: 60,
    alignItems: 'center',
  },
  filterChipActive: {
    backgroundColor: '#CD853F',
    borderColor: '#CD853F',
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  postsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  postsHeaderTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
  },
  postsCountPill: {
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  postsCountText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  loaderContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loaderText: {
    marginTop: 12,
    color: '#6B7280',
    fontSize: 15,
  },
  emptyState: {
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  emptyStateSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  postCard: {
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  postHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  postAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  postAvatarText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  postMeta: {
    flex: 1,
    minWidth: 0, // Ensures proper text wrapping
  },
  postMetaTop: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 8,
    gap: 4,
  },
  postAuthor: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DBEAFE',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  verifiedBadgeText: {
    color: '#2563EB',
    fontSize: 11,
    fontWeight: '600',
  },
  postDot: {
    color: '#9CA3AF',
    fontSize: 14,
  },
  postDate: {
    color: '#6B7280',
    fontSize: 13,
  },
  postCategoryPill: {
    backgroundColor: 'rgba(255, 184, 140, 0.35)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  postCategoryText: {
    color: '#8B4513',
    fontSize: 12,
    fontWeight: '600',
  },
  postTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
    lineHeight: 24,
  },
  postContent: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 22,
    marginBottom: 4,
  },
  postActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 10,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: 'rgba(229, 231, 235, 0.5)',
    marginTop: 4,
  },
  postActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    gap: 6,
  },
  postActionButtonLast: {
    marginLeft: 'auto',
  },
  postActionButtonActive: {
    backgroundColor: 'rgba(254, 226, 226, 0.9)',
    borderColor: 'rgba(252, 165, 165, 0.8)',
  },
  postActionText: {
    color: '#6B7280',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 0,
  },
  postActionTextActive: {
    color: '#DC2626',
  },
  loadMoreButton: {
    marginTop: 16,
    alignSelf: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 184, 140, 0.6)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  loadMoreText: {
    color: '#8B4513',
    fontSize: 15,
    fontWeight: '600',
  },
});

