import AsyncStorage from '@react-native-async-storage/async-storage';

// API Configuration - Update this with your backend URL
const API_CONFIG = {
  BASE_URL: 'https://api.lissnify.com', // Update this to your backend URL
};

// Helper function to get full API URL
export const getApiUrl = (endpoint) => {
  return `${API_CONFIG.BASE_URL}${endpoint}`;
};

// Get stored token
export const getToken = async () => { 
  try {
    return await AsyncStorage.getItem('adminToken');
  } catch (error) {
    return null;
  }
};

// Generic API call function
export const apiCall = async (endpoint, options = {}) => {
  try {
    const url = getApiUrl(endpoint);
    const { skipAuth, ...fetchOptions } = options;
    const token = skipAuth ? null : await getToken();
    
    const response = await fetch(url, {
      ...fetchOptions,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...(fetchOptions.headers || {}),
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.message || data.error || `HTTP ${response.status}`,
        data: data
      };
    }

    return {
      success: true,
      data: data,
      message: data.message
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error occurred'
    };
  }
};

// Register user (sends OTP)
export const registerUser = async (userData) => {
  return apiCall('/api/register/', {
    method: 'POST',
    body: JSON.stringify(userData),
  });
};

// Verify OTP
export const verifyOTP = async (email, otp) => {
  return apiCall('/api/verify-otp/', {
    method: 'POST',
    body: JSON.stringify({ email, otp }),
  });
};

// Get categories
export const getCategories = async () => {
  return apiCall('/api/categories/', {
    method: 'GET',
  });
};

// Community
export const getCommunityPosts = async ({ postType, categoryId } = {}) => {
  const params = [];
  if (postType) {
    params.push(`post_type=${encodeURIComponent(postType)}`);
  }
  if (categoryId) {
    params.push(`category_id=${encodeURIComponent(categoryId)}`);
  }
  const queryString = params.length ? `?${params.join('&')}` : '';

  return apiCall(`/api/community-posts/${queryString}`, {
    method: 'GET',
  });
};

export const createCommunityPost = async (postData) => {
  return apiCall('/api/community-posts/', {
    method: 'POST',
    body: JSON.stringify(postData),
  });
};

export const likeCommunityPost = async (postId) => {
  return apiCall(`/api/community-posts/${postId}/like/`, {
    method: 'POST',
  });
};

export const unlikeCommunityPost = async (postId) => {
  return apiCall(`/api/community-posts/${postId}/like/`, {
    method: 'DELETE',
  });
};

// Login user
export const loginUser = async (credentials) => {
  return apiCall('/api/login/', {
    method: 'POST',
    body: JSON.stringify(credentials),
    skipAuth: true,
  });
};

// Get dashboard URL based on user type
export const getDashboardUrl = (userType) => {
  const normalizedType = userType?.toLowerCase()?.trim();
  switch (normalizedType) {
    case 'seeker':
      return 'SeekerDrawerNavigator';
    case 'listener':
      return 'DrawerNavigator';
    default:
      return 'SeekerDrawerNavigator';
  }
};

// Validation function for user types
export const isValidUserType = (userType) => {
  const validTypes = ['seeker', 'listener'];
  return validTypes.includes(userType?.toLowerCase()?.trim());
};

// Get connection list
export const connectionList = async () => {
  return apiCall('/api/get-connection-list/', {
    method: 'GET',
  });
};

// Accept/Reject connection
export const acceptConnection = async (connectionId, action) => {
  return apiCall('/api/accept-connection/', {
    method: 'POST',
    body: JSON.stringify({
      connection_id: connectionId,
      action: action
    }),
  });
};

// Get listener profile
export const getListenerProfile = async () => {
  return apiCall('/api/listener-profile/', {
    method: 'GET',
  });
};

// Get listener session stats
export const getListenerSessionStats = async () => {
  return apiCall('/chat/listener-session-stats/', {
    method: 'GET',
  });
};

// Start direct chat
export const startDirectChat = async (recipientId) => {
  return apiCall('/chat/start-direct/', {
    method: 'POST',
    body: JSON.stringify({ recipient_id: recipientId }),
  });
};

// Get messages
export const getMessages = async (roomId) => {
  return apiCall(`/chat/${roomId}/messages/`, {
    method: 'GET',
  });
};

// Get connected listeners (for seekers)
export const connectedListeners = async () => {
  return apiCall('/api/connections/', {
    method: 'GET',
  });
};

// Get listeners by category
export const listenerCategoryWise = async (categorySlug) => {
  return apiCall('/api/listenerList/', {
    method: 'POST',
    body: JSON.stringify({ category_id: categorySlug }),
  });
};

// Send connection request
export const sendConnectionRequest = async (listenerId) => {
  return apiCall('/api/send-connection-request/', {
    method: 'POST',
    body: JSON.stringify({ listener_id: listenerId }),
  });
};

// Send message
export const sendMessage = async (roomId, message) => {
  return apiCall(`/chat/${roomId}/messages/`, {
    method: 'POST',
    body: JSON.stringify({ message }),
  });
};

// Mark messages as read
export const markMessagesAsRead = async (roomId) => {
  return apiCall(`/chat/${roomId}/mark-read/`, {
    method: 'POST',
  });
};

// Get unread counts
export const getUnreadCounts = async () => {
  return apiCall('/chat/unread-counts/', {
    method: 'GET',
  });
};



