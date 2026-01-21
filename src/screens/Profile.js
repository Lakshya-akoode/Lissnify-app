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
  Image,
  Switch,
} from 'react-native';
import { Menu, User, Mail, Camera, Save, Eye, EyeOff, Loader2, AlertCircle, CheckCircle } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getUserProfile, updateUserProfile, getApiUrl } from '../utils/api';
// Date picker - using text input for simplicity

export default function ProfileScreen({ navigation, route }) {
  const [userType, setUserType] = useState('listener');
  const [formData, setFormData] = useState({
    full_name: '',
    description: '',
    email: '',
    DOB: '',
    dob_display: false,
  });
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [profileImageUrl, setProfileImageUrl] = useState(null);
  const [profileImageFile, setProfileImageFile] = useState(null);
  const [initialData, setInitialData] = useState({});

  // Detect user type from AsyncStorage
  useEffect(() => {
    const detectUserType = async () => {
      try {
        const storedUserData = await AsyncStorage.getItem('elysian_user');
        if (storedUserData) {
          const userData = JSON.parse(storedUserData);
          setUserType(userData.user_type || 'listener');
        }
      } catch (error) {
        console.error('Error detecting user type:', error);
      }
    };
    detectUserType();
  }, []);

  // Fetch profile data
  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await getUserProfile();

      if (response.success && response.data) {
        const profile = response.data;
        const userData = profile?.user || {};
        const listenerData = profile?.listener || {};

        setFormData({
          full_name: userData.full_name || '',
          description: listenerData?.description || '',
          email: userData.email || '',
          DOB: userData.DOB || '',
          dob_display: userData.dob_display || false,
        });

        setInitialData({
          ...userData,
          description: listenerData?.description || '',
        });

        if (userData.profile_image) {
          const imageUrl = userData.profile_image.startsWith('http')
            ? userData.profile_image
            : `${getApiUrl('')}/${userData.profile_image}`;
          setProfileImageUrl(imageUrl);
        }

      } else {
        setError(response.error || 'Failed to load profile. Please try again.');
      }
    } catch (err) {
      setError('Failed to load profile. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = async () => {
    // For React Native, you'd typically use react-native-image-picker
    // For now, we'll show an alert
    Alert.alert(
      'Image Upload',
      'Image upload functionality requires react-native-image-picker. Please install it to enable image uploads.',
      [{ text: 'OK' }]
    );
  };

  const handleDateInput = (value) => {
    // Validate date format YYYY-MM-DD
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (value === '' || dateRegex.test(value)) {
      handleInputChange('DOB', value);
    }
  };

  const handleCancel = () => {
    setFormData({
      full_name: initialData.full_name || '',
      description: initialData.description || '',
      email: initialData.email || '',
      DOB: initialData.DOB || '',
      dob_display: initialData.dob_display || false,
    });
    if (initialData.profile_image) {
      const imageUrl = initialData.profile_image.startsWith('http')
        ? initialData.profile_image
        : `${getApiUrl('')}/${initialData.profile_image}`;
      setProfileImageUrl(imageUrl);
    }
    setProfileImageFile(null);
    setIsEditing(false);
    setError(null);
    setSuccess(null);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const formDataToSend = new FormData();

      formDataToSend.append('full_name', formData.full_name);
      formDataToSend.append('DOB', formData.DOB);
      formDataToSend.append('dob_display', formData.dob_display ? 'true' : 'false');

      if (userType === 'listener' && formData.description) {
        formDataToSend.append('description', formData.description);
      }

      // Note: Image upload would require react-native-image-picker
      // For now, we skip image upload if not available
      if (profileImageFile) {
        formDataToSend.append('image', {
          uri: profileImageFile.uri,
          type: profileImageFile.type || 'image/jpeg',
          name: profileImageFile.fileName || 'profile.jpg',
        });
      }

      const response = await updateUserProfile(formDataToSend);

      if (response.success && response.data) {
        setInitialData({
          ...response.data.user,
          description: response.data.listener?.description || formData.description,
        });
        setSuccess('Profile updated successfully!');
        setIsEditing(false);
        setProfileImageFile(null);

        Alert.alert('Success', 'Profile updated successfully!', [
          {
            text: 'OK',
            onPress: () => {
              // Optionally navigate back
              // navigation.goBack();
            },
          },
        ]);
      } else {
        setError(response.error || 'Failed to update profile. Please try again.');
      }
    } catch (err) {
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Loader2 size={48} color="#CD853F" />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </View>
    );
  }

  const isListener = userType === 'listener';

  return (
    <View style={styles.container}>
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
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Profile Settings</Text>
          <Text style={styles.headerSubtitle}>
            {isListener
              ? 'Manage your professional profile and account information'
              : 'Manage your account information and preferences'}
          </Text>
        </View>

        {/* Alert Messages */}
        {error && (
          <View style={styles.alertContainer}>
            <AlertCircle size={20} color="#EF4444" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {success && (
          <View style={[styles.alertContainer, styles.successContainer]}>
            <CheckCircle size={20} color="#10B981" />
            <Text style={styles.successText}>{success}</Text>
          </View>
        )}

        {/* Profile Card */}
        <View style={styles.profileCard}>
          {/* Profile Picture Section */}
          <View style={styles.profilePictureSection}>
            <View style={styles.profileImageContainer}>
              {profileImageUrl ? (
                <Image source={{ uri: profileImageUrl }} style={styles.profileImage} />
              ) : (
                <View style={styles.profileImagePlaceholder}>
                  <Text style={styles.profileImageText}>
                    {formData.full_name?.charAt(0)?.toUpperCase() || 'U'}
                  </Text>
                </View>
              )}
              <TouchableOpacity
                style={styles.cameraButton}
                onPress={handleFileChange}
                disabled={!isEditing}
              >
                <Camera size={16} color="#FFF" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Form Fields */}
          <View style={styles.formSection}>
            {/* Personal Information */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <User size={20} color="#CD853F" />
                <Text style={styles.sectionTitle}>Personal Information</Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Full Name</Text>
                <TextInput
                  style={[styles.input, !isEditing && styles.inputDisabled]}
                  value={formData.full_name}
                  onChangeText={(value) => handleInputChange('full_name', value)}
                  editable={isEditing}
                  placeholder="Enter your full name"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Date of Birth</Text>
                {isEditing ? (
                  <TextInput
                    style={styles.input}
                    value={formData.DOB}
                    onChangeText={handleDateInput}
                    placeholder="YYYY-MM-DD (e.g., 1990-01-15)"
                    keyboardType="numeric"
                    maxLength={10}
                  />
                ) : (
                  <TextInput
                    style={[styles.input, styles.inputDisabled]}
                    value={formData.DOB || 'Not set'}
                    editable={false}
                  />
                )}
              </View>

              {isEditing && (
                <View style={styles.switchGroup}>
                  <View style={styles.switchContainer}>
                    {formData.dob_display ? (
                      <Eye size={20} color="#6B7280" />
                    ) : (
                      <EyeOff size={20} color="#9CA3AF" />
                    )}
                    <Text style={styles.switchLabel}>
                      Display Date of Birth on Profile
                    </Text>
                    <Switch
                      value={formData.dob_display}
                      onValueChange={(value) => handleInputChange('dob_display', value)}
                      disabled={!isEditing}
                      trackColor={{ false: '#D1D5DB', true: '#CD853F' }}
                      thumbColor="#FFF"
                    />
                  </View>
                  <Text style={styles.switchHint}>
                    {formData.dob_display
                      ? 'Your age will be visible to other users'
                      : 'Your age will be hidden from other users'}
                  </Text>
                </View>
              )}

              {/* Description field for listeners only */}
              {isListener && (
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Description</Text>
                  <TextInput
                    style={[
                      styles.textArea,
                      !isEditing && styles.inputDisabled,
                    ]}
                    value={formData.description}
                    onChangeText={(value) => handleInputChange('description', value)}
                    editable={isEditing}
                    placeholder="Tell others about yourself..."
                    multiline
                    numberOfLines={5}
                    textAlignVertical="top"
                  />
                </View>
              )}
            </View>

            {/* Contact Information */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Mail size={20} color="#CD853F" />
                <Text style={styles.sectionTitle}>Contact Information</Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  style={[styles.input, styles.inputDisabled]}
                  value={formData.email}
                  editable={false}
                />
                <Text style={styles.hintText}>Email cannot be changed</Text>
              </View>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            {isEditing ? (
              <>
                <TouchableOpacity
                  style={[styles.button, styles.saveButton]}
                  onPress={handleSave}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <>
                      <Save size={18} color="#FFF" />
                      <Text style={styles.buttonText}>Save Changes</Text>
                    </>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, styles.cancelButton]}
                  onPress={handleCancel}
                  disabled={isSaving}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity
                style={[styles.button, styles.editButton]}
                onPress={() => setIsEditing(true)}
              >
                <Text style={styles.buttonText}>Edit Profile</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
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
    elevation: 6,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingTop: Platform.OS === 'ios' ? 100 : 80,
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
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  alertContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  successContainer: {
    backgroundColor: '#F0FDF4',
    borderLeftColor: '#10B981',
  },
  errorText: {
    marginLeft: 8,
    color: '#EF4444',
    fontSize: 14,
    flex: 1,
  },
  successText: {
    marginLeft: 8,
    color: '#10B981',
    fontSize: 14,
    flex: 1,
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  profilePictureSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  profileImageContainer: {
    position: 'relative',
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#F3F4F6',
  },
  profileImagePlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#CD853F',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileImageText: {
    fontSize: 48,
    fontWeight: '700',
    color: '#FFF',
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#CD853F',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFF',
  },
  formSection: {
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginLeft: 8,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    width: '100%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#FFF',
  },
  inputDisabled: {
    backgroundColor: '#F3F4F6',
    color: '#6B7280',
  },
  textArea: {
    width: '100%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#FFF',
    minHeight: 100,
  },
  dateInput: {
    width: '100%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    backgroundColor: '#FFF',
    justifyContent: 'center',
  },
  dateInputText: {
    fontSize: 16,
    color: '#111827',
  },
  switchGroup: {
    marginTop: 8,
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  switchLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginLeft: 8,
  },
  switchHint: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 28,
    marginTop: 4,
  },
  hintText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  editButton: {
    backgroundColor: '#CD853F',
  },
  saveButton: {
    backgroundColor: '#CD853F',
  },
  cancelButton: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  buttonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButtonText: {
    color: '#8B4513',
    fontSize: 16,
    fontWeight: '600',
  },
});
