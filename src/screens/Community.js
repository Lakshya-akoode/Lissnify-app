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

import { useSafeAreaInsets } from 'react-native-safe-area-context';
import CustomAlert from '../components/CustomAlert';
import useAlert from '../hooks/useAlert';

export default function CommunityScreen({ navigation }) {
  const insets = useSafeAreaInsets();

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
  const { alertState, showAlert, hideAlert } = useAlert();

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
      showAlert({ title: 'Incomplete', message: 'Please fill in both the title and content before posting.', type: 'warning' });
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
        showAlert({ title: 'Error', message: response.error, type: 'error' });
      }
    } catch (err) {
      console.error('Error creating post:', err);
      showAlert({ title: 'Error', message: 'Failed to create post. Please try again.', type: 'error' });
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
      showAlert({ title: 'Error', message: 'Unable to update like at the moment.', type: 'error' });
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
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.content, { paddingBottom: 100 + insets.bottom }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#CD853F" />
          }
        >
          {/* Header */}
          <View style={[styles.headerSection, { marginTop: insets.top + 10 }]}>
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
                  <Users size={28} color="#8B4513" />
                </LinearGradient>
              </View>
              <Text style={styles.headerTitle}>Community</Text>
              <Text style={styles.headerSubtitle}>
                Connect, share, and lift each other up in our safe space
              </Text>
            </LinearGradient>
          </View>

          {error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Create Post */}
          <View style={styles.createPostCard}>
            <Text style={styles.createPostLabel}>Create a Post</Text>
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
              </View>
            </View>
            <TextInput
              value={newPostContent}
              onChangeText={setNewPostContent}
              placeholder="Share your thoughts with the community..."
              placeholderTextColor="#9CA3AF"
              style={styles.bodyInput}
              multiline
              textAlignVertical="top"
            />

            <View style={styles.createPostFooter}>
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

            <View style={styles.createPostBottom}>
              <View style={styles.postingAsRow}>
                <Text style={styles.postingAsLabel}>Posting as</Text>
                <View style={styles.postingAsTag}>
                  <Text style={styles.postingAsTagText}>{capitalize(userType)}</Text>
                </View>
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
                  end={{ x: 1, y: 0 }}
                  style={styles.postButtonGradient}
                >
                  {posting ? (
                    <>
                      <Loader2 size={16} color="#FFF" />
                      <Text style={styles.postButtonText}>Posting...</Text>
                    </>
                  ) : (
                    <>
                      <Plus size={16} color="#FFF" />
                      <Text style={styles.postButtonText}>Post</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>

          {/* Category Filters */}
          <View style={styles.categoriesCard}>
            <View style={styles.categoriesHeader}>
              <LinearGradient
                colors={['#FFF8B5', '#FFB88C']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.categoriesIconContainer}
              >
                <MessageCircle size={18} color="#8B4513" />
              </LinearGradient>
              <Text style={styles.categoriesTitle}>Browse Topics</Text>
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

          {/* Posts Section Header */}
          <View style={styles.postsHeaderRow}>
            <Text style={styles.postsHeaderTitle}>Discussions</Text>
            <View style={styles.postsCountPill}>
              <Text style={styles.postsCountText}>
                {communityPosts.length} {communityPosts.length === 1 ? 'post' : 'posts'}
              </Text>
            </View>
          </View>

          {loading ? (
            <View style={styles.loaderContainer}>
              <ActivityIndicator size="large" color="#CD853F" />
              <Text style={styles.loaderText}>Loading community...</Text>
            </View>
          ) : communityPosts.length === 0 ? (
            <View style={styles.emptyState}>
              <LinearGradient
                colors={['#FFF8B5', '#FFB88C']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.emptyIconContainer}
              >
                <MessageCircle size={36} color="#8B4513" />
              </LinearGradient>
              <Text style={styles.emptyStateTitle}>No posts yet</Text>
              <Text style={styles.emptyStateSubtitle}>
                Be the first to share! Start a conversation with the community above.
              </Text>
            </View>
          ) : (
            communityPosts.map((post) => (
              <View key={post.id} style={styles.postCard}>
                {/* Post Author Row */}
                <View style={styles.postAuthorRow}>
                  <LinearGradient colors={['#CD853F', '#D2691E']} style={styles.postAvatar}>
                    <Text style={styles.postAvatarText}>{getInitials(post.author?.full_name || '')}</Text>
                  </LinearGradient>
                  <View style={styles.postAuthorInfo}>
                    <View style={styles.postAuthorNameRow}>
                      <Text style={styles.postAuthor} numberOfLines={1}>{post.author?.full_name}</Text>
                      {post.is_verified ? (
                        <View style={styles.verifiedBadge}>
                          <Star size={10} color="#2563EB" />
                        </View>
                      ) : null}
                    </View>
                    <View style={styles.postMetaRow}>
                      <Text style={styles.postDate}>{formatTimeAgo(post.created_at)}</Text>
                      {post.category_name ? (
                        <>
                          <Text style={styles.postDot}>•</Text>
                          <View style={styles.postCategoryPill}>
                            <Text style={styles.postCategoryText}>{post.category_name}</Text>
                          </View>
                        </>
                      ) : null}
                    </View>
                  </View>
                </View>

                {/* Post Content */}
                <View style={styles.postBody}>
                  <Text style={styles.postTitle}>{post.title}</Text>
                  <Text style={styles.postContent} numberOfLines={4}>{post.content}</Text>
                </View>

                {/* Post Actions */}
                <View style={styles.postActionsRow}>
                  <TouchableOpacity
                    style={[styles.postActionButton, post.is_liked && styles.postActionButtonActive]}
                    onPress={() => handleToggleLike(post)}
                    activeOpacity={0.7}
                  >
                    <Heart
                      size={16}
                      color={post.is_liked ? '#DC2626' : '#9CA3AF'}
                      fill={post.is_liked ? '#DC2626' : 'none'}
                    />
                    <Text
                      style={[styles.postActionText, post.is_liked && styles.postActionTextActive]}
                    >
                      {post.likes_count}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.postActionButton} activeOpacity={0.7}>
                    <MessageCircle size={16} color="#9CA3AF" />
                    <Text style={styles.postActionText}>{post.comments_count}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.postActionButton, styles.postActionButtonLast]}
                    activeOpacity={0.7}
                  >
                    <Share2 size={16} color="#9CA3AF" />
                    <Text style={styles.postActionText}>Share</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}

          {communityPosts.length > 0 && !loading ? (
            <TouchableOpacity style={styles.loadMoreButton} activeOpacity={0.8}>
              <LinearGradient
                colors={['#CD853F', '#D2691E']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.loadMoreGradient}
              >
                <Text style={styles.loadMoreText}>Load More Posts</Text>
              </LinearGradient>
            </TouchableOpacity>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
      <CustomAlert {...alertState} />
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
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
  },

  // Header
  headerSection: {
    marginBottom: 20,
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
    maxWidth: 300,
  },

  // Error
  errorContainer: {
    backgroundColor: '#FEF2F2',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#FECACA',
    marginBottom: 16,
  },
  errorText: {
    color: '#B91C1C',
    fontSize: 13,
    textAlign: 'center',
    fontWeight: '500',
  },

  // Create Post
  createPostCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    shadowColor: '#CD853F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(205, 133, 63, 0.12)',
  },
  createPostLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 14,
  },
  createPostHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarGradient: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarInitials: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  createPostInputs: {
    flex: 1,
    minWidth: 0,
  },
  titleInput: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  bodyInput: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 88,
    fontSize: 14,
    color: '#111827',
    lineHeight: 20,
    marginBottom: 12,
  },
  createPostFooter: {
    marginBottom: 14,
  },
  categoryChipsScrollContent: {
    paddingRight: 4,
    gap: 8,
  },
  categoryChip: {
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  categoryChipActive: {
    backgroundColor: '#CD853F',
    borderColor: '#CD853F',
  },
  categoryChipText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
  },
  categoryChipTextActive: {
    color: '#FFFFFF',
  },
  createPostBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  postButton: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  postButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 14,
    gap: 6,
  },
  postButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  postingAsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  postingAsLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  postingAsTag: {
    backgroundColor: 'rgba(205, 133, 63, 0.12)',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  postingAsTagText: {
    color: '#8B4513',
    fontSize: 11,
    fontWeight: '600',
  },

  // Categories
  categoriesCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(205, 133, 63, 0.12)',
    shadowColor: '#CD853F',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  categoriesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoriesIconContainer: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  categoriesTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#374151',
  },
  categoriesChips: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterChip: {
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 9,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    minWidth: 56,
    alignItems: 'center',
  },
  filterChipActive: {
    backgroundColor: '#CD853F',
    borderColor: '#CD853F',
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },

  // Posts Header
  postsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  postsHeaderTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#374151',
  },
  postsCountPill: {
    backgroundColor: 'rgba(205, 133, 63, 0.12)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  postsCountText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8B4513',
  },

  // Loader
  loaderContainer: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  loaderText: {
    marginTop: 12,
    color: '#9CA3AF',
    fontSize: 14,
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
  emptyStateSubtitle: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 260,
  },

  // Post Card
  postCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(205, 133, 63, 0.1)',
    shadowColor: '#CD853F',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
  },
  postAuthorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  postAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  postAvatarText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  postAuthorInfo: {
    flex: 1,
    minWidth: 0,
  },
  postAuthorNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  postAuthor: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    flexShrink: 1,
  },
  verifiedBadge: {
    backgroundColor: '#DBEAFE',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  postMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  postDot: {
    color: '#D1D5DB',
    fontSize: 10,
  },
  postDate: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '500',
  },
  postCategoryPill: {
    backgroundColor: 'rgba(205, 133, 63, 0.12)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  postCategoryText: {
    color: '#8B4513',
    fontSize: 11,
    fontWeight: '600',
  },
  postBody: {
    marginBottom: 12,
  },
  postTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 6,
    lineHeight: 22,
  },
  postContent: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 21,
  },
  postActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  postActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F9FAFB',
    gap: 5,
  },
  postActionButtonLast: {
    marginLeft: 'auto',
  },
  postActionButtonActive: {
    backgroundColor: '#FEF2F2',
  },
  postActionText: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '600',
  },
  postActionTextActive: {
    color: '#DC2626',
  },

  // Load More
  loadMoreButton: {
    marginTop: 8,
    marginBottom: 8,
    alignSelf: 'center',
    borderRadius: 16,
    overflow: 'hidden',
  },
  loadMoreGradient: {
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 16,
  },
  loadMoreText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
});

