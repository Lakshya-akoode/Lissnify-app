import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Platform,
  Alert,
  ImageBackground,
  Modal,
} from 'react-native';
import CheckBox from '@react-native-community/checkbox';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import LinearGradient from 'react-native-linear-gradient';
import { 
  User, 
  Mail, 
  Lock, 
  Calendar, 
  Users, 
  ArrowRight,
  Check,
  Smartphone,
  ChevronDown,
  X
} from 'lucide-react-native';
import { registerUser, verifyOTP, getCategories, isValidUserType, getDashboardUrl } from '../utils/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Images from '../Assets';
export default function SignupScreen({ navigation, route }) {
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    password: '',
    confirmPassword: '',
    DOB: '',
    user_type: '',
    preferences: [],
    otp: '',
    status: 'pending',
  });

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [date, setDate] = useState(new Date());
  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showOTP, setShowOTP] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);

  // Check for role from route params
  useEffect(() => {
    const role = route?.params?.role;
    if (role === 'seeker' || role === 'listener') {
      setForm(prev => ({ ...prev, user_type: role }));
    }
  }, [route?.params?.role]);

  // Fetch categories on component mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setCategoriesLoading(true);
        const response = await getCategories();
        if (response.success && response.data) {
          const mappedCategories = response.data.map((category) => ({
            id: category.id,
            name: category.Category_name || category.name,
            description: category.description || 'No description',
            icon: category.icon || '/CategoryIcon/default.png',
            supportText: category.supportText || 'No support text',
            slug: category.slug || ''
          }));
          setCategories(mappedCategories);
        } else {
          setCategories([]);
        }
      } catch (error) {
        setCategories([]);
      } finally {
        setCategoriesLoading(false);
      }
    };

    fetchCategories();
  }, []);

  const handleChange = (key, value) => {
    setForm({ ...form, [key]: value });
    if (error) setError('');
  };

  const handleDateChange = (event, selectedDate) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (selectedDate && event.type !== 'dismissed') {
      setDate(selectedDate);
      const formattedDate = selectedDate.toISOString().split('T')[0];
      handleChange('DOB', formattedDate);
    }
  };

  const handlePreferenceToggle = (categoryId) => {
    setForm(prev => {
      const isSelected = prev.preferences.includes(categoryId);
      return {
        ...prev,
        preferences: isSelected
          ? prev.preferences.filter(id => id !== categoryId)
          : [...prev.preferences, categoryId]
      };
    });
  };

  const validateForm = () => {
    if (!form.full_name || !form.email || !form.password || !form.DOB || !form.user_type) {
      setError('Please fill in all required fields');
      return false;
    }

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }

    if (!isValidUserType(form.user_type)) {
      setError('Please select a valid role (Support Seeker or Listener with Empathy)');
      return false;
    }

    return true;
  };

  const handleSendOTP = async () => {
    if (!validateForm()) return;

    setOtpLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await registerUser({
        full_name: form.full_name,
        email: form.email,
        password: form.password,
        otp: '',
        status: form.status,
        user_type: form.user_type,
        preferences: form.preferences,
        DOB: form.DOB
      });

      if (response.success) {
        setShowOTP(true);
        setOtpSent(true);
        setSuccess('OTP sent to your email! Please check and enter the code.');
      } else {
        setError(response.error || response.data?.non_field_errors?.[0] || 'Failed to send OTP. Please try again.');
      }
    } catch (err) {
      setError('Failed to send OTP. Please try again.');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyOTPAndRegister = async () => {
    if (!form.otp) {
      setError('Please enter the OTP');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const otpResponse = await verifyOTP(form.email, form.otp);

      if (!otpResponse.success) {
        setError('Invalid OTP. Please try again.');
        return;
      }

      if (otpResponse.success) {
        // Store token
        if (otpResponse.data?.access) {
          await AsyncStorage.setItem('adminToken', otpResponse.data.access);
        }

        // Get user data from response or form
        const userData = {
          id: otpResponse.data?.user?.id || otpResponse.data?.user?.pk || otpResponse.data?.user?.user_id,
          full_name: otpResponse.data?.user?.full_name || form.full_name,
          email: otpResponse.data?.user?.email || form.email,
          user_type: otpResponse.data?.user?.user_type || form.user_type,
          username: otpResponse.data?.user?.username || form.email.split('@')[0],
        };

        // Store complete user data in AsyncStorage (matching web version and Login.js)
        await AsyncStorage.setItem('elysian_user', JSON.stringify(userData));
        await AsyncStorage.setItem('full_name', userData.full_name);
        await AsyncStorage.setItem('userType', userData.user_type); // Store userType for profile screen
        if (userData.id) {
          await AsyncStorage.setItem('user_id', userData.id.toString());
        }

        setSuccess(`Registration successful! Redirecting...`);
        
        // Navigate to appropriate dashboard using getDashboardUrl (same as Login.js)
        const userType = userData.user_type || form.user_type;
        const dashboardRoute = getDashboardUrl(userType);

        setTimeout(() => {
          if (navigation) {
            try {
              navigation.replace(dashboardRoute);
            } catch (navError) {
              console.log('Navigation error:', navError);
              setError('Failed to navigate to dashboard. Please try logging in.');
            }
          }
        }, 2000);
      } else {
        setError(otpResponse.error || 'Registration failed. Please try again.');
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = () => {
    if (!showOTP) {
      handleSendOTP();
    } else {
      handleVerifyOTPAndRegister();
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const dateObj = new Date(dateString);
    return dateObj.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  return (
    <View style={styles.container}>
      {/* Background Image */}
      <ImageBackground
        source={Images.signupBackground}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        {/* Gradient Overlay */}
        <LinearGradient
          colors={['rgba(255, 248, 231, 0.7)', 'rgba(255, 247, 237, 0.6)', 'rgba(255, 255, 255, 0.5)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradientOverlay}
        />

        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Header Section */}
          <View style={styles.header}>
        <Text style={styles.title}>
          {form.user_type 
            ? `Create Your ${form.user_type === 'seeker' ? 'Support Seeker' : 'Listener'} Account`
            : 'Create Your Account'
          }
        </Text>
      <Text style={styles.subtitle}>
          {form.user_type 
            ? `Join our soulful emotional well-being community as a ${form.user_type === 'seeker' ? 'Support Seeker' : 'Listener with Empathy'} and start your journey towards healing and growth`
            : 'Join our soulful emotional well-being community and start your journey towards healing and growth'
          }
        </Text>
      </View>

      {/* Main Card Container */}
      <View style={styles.card}>
        {/* Role Pre-selection Message */}
        {route?.params?.role && form.user_type && (
          <View style={styles.roleMessage}>
            <Check size={20} color="#000" />
            <View style={styles.roleMessageText}>
              <Text style={styles.roleMessageTitle}>
                Role Pre-selected: {form.user_type === 'seeker' ? 'Support Seeker' : 'Listener with Empathy'}
              </Text>
              <Text style={styles.roleMessageSubtitle}>
                You can change this selection below if needed
      </Text>
            </View>
          </View>
        )}

        {/* Role Info Badge */}


        {/* Form Fields */}
      <View style={styles.form}>
          {/* Full Name and Email Row */}
        <View style={styles.row}>
            <View style={[styles.inputWrapper, { marginRight: 6 }]}>
              <Text style={styles.label}>Full Name</Text>
          <View style={styles.inputContainer}>
                <User size={20} color="#9CA3AF" style={styles.icon} />
            <TextInput
              placeholder="Enter your full name"
                  value={form.full_name}
                  onChangeText={(text) => handleChange('full_name', text)}
              style={styles.input}
                  placeholderTextColor="#9CA3AF"
            />
          </View>
            </View>
            <View style={[styles.inputWrapper, { marginRight: 0 }]}>
              <Text style={styles.label}>Email Address</Text>
          <View style={styles.inputContainer}>
                <Mail size={20} color="#9CA3AF" style={styles.icon} />
            <TextInput
              placeholder="Enter your email"
              value={form.email}
                  onChangeText={(text) => handleChange('email', text)}
              keyboardType="email-address"
                  autoCapitalize="none"
              style={styles.input}
                  placeholderTextColor="#9CA3AF"
            />
              </View>
          </View>
        </View>

          {/* Password and Confirm Password Row */}
        <View style={styles.row}>
            <View style={[styles.inputWrapper, { marginRight: 6 }]}>
              <Text style={styles.label}>Password</Text>
          <View style={styles.inputContainer}>
                <Lock size={20} color="#9CA3AF" style={styles.icon} />
            <TextInput
              placeholder="Create password"
              value={form.password}
              secureTextEntry
                  onChangeText={(text) => handleChange('password', text)}
              style={styles.input}
                  placeholderTextColor="#9CA3AF"
            />
          </View>
            </View>
            <View style={[styles.inputWrapper, { marginRight: 0 }]}>
              <Text style={styles.label}>Confirm Password</Text>
          <View style={styles.inputContainer}>
                <Lock size={20} color="#9CA3AF" style={styles.icon} />
            <TextInput
              placeholder="Confirm password"
              value={form.confirmPassword}
              secureTextEntry
                  onChangeText={(text) => handleChange('confirmPassword', text)}
              style={styles.input}
                  placeholderTextColor="#9CA3AF"
            />
          </View>
        </View>
          </View>

          {/* Date of Birth and Role Selection Row */}
          <View style={styles.row}>
            <View style={[styles.inputWrapper, { marginRight: 6 }]}>
              <Text style={styles.label}>Date of Birth</Text>
              <TouchableOpacity
                style={[styles.inputContainer, styles.dateInputContainer]}
                onPress={() => setShowDatePicker(true)}
                activeOpacity={0.7}
              >
                <Calendar size={20} color="#9CA3AF" style={styles.icon} />
                <Text style={[styles.dateText, !form.DOB && styles.placeholderText]}>
                  {form.DOB ? formatDate(form.DOB) : 'Select DOB'}
                </Text>
              </TouchableOpacity>
              {Platform.OS === 'android' && showDatePicker && (
                <DateTimePicker
                  value={date}
                  mode="date"
                  display="default"
                  onChange={handleDateChange}
                  maximumDate={new Date()}
                />
              )}
              {Platform.OS === 'ios' && showDatePicker && (
                <DateTimePicker
                  value={date}
                  mode="date"
                  display="spinner"
                  onChange={handleDateChange}
                  maximumDate={new Date()}
                />
              )}
            </View>

            <View style={[styles.inputWrapper, { marginRight: 0 }]}>
              <Text style={styles.label}>
                I want to be a
                {route?.params?.role && form.user_type && (
                  <Text style={styles.preSelectedLabel}> (Pre-selected)</Text>
                )}
              </Text>
              <TouchableOpacity
                style={[
                  styles.inputContainer,
                  form.user_type && styles.inputContainerSelected
                ]}
                onPress={() => setShowRoleDropdown(true)}
                activeOpacity={0.7}
              >
                <Users size={20} color="#9CA3AF" style={styles.icon} />
                <Text style={[
                  styles.roleDropdownText,
                  !form.user_type && styles.placeholderText
                ]}>
                  {form.user_type === 'seeker'
                    ? 'Support Seeker'
                    : form.user_type === 'listener'
                    ? 'Listener with Empathy'
                    : 'Select role'}
                </Text>
                <ChevronDown size={20} color="#9CA3AF" />
              </TouchableOpacity>

              {/* Role Dropdown Modal */}
              <Modal
                visible={showRoleDropdown}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowRoleDropdown(false)}
              >
                <View style={styles.modalOverlay}>
                  <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                      <Text style={styles.modalTitle}>Select Your Role</Text>
                      <TouchableOpacity
                        onPress={() => setShowRoleDropdown(false)}
                        style={styles.modalCloseButton}
                      >
                        <X size={24} color="#111827" />
                      </TouchableOpacity>
                    </View>
                    
                    <View style={styles.roleOptionsContainer}>
                      <TouchableOpacity
                        style={[
                          styles.roleOptionItem,
                          form.user_type === 'seeker' && styles.roleOptionItemSelected
                        ]}
                        onPress={() => {
                          handleChange('user_type', 'seeker');
                          setShowRoleDropdown(false);
                        }}
                        activeOpacity={0.7}
                      >
                        {form.user_type === 'seeker' ? (
                          <View style={styles.radioButtonSelected}>
                            <View style={styles.radioButtonDot} />
                          </View>
                        ) : (
                          <View style={styles.radioButtonUnselected} />
                        )}
                        <View style={styles.roleOptionContent}>
                          <Text style={styles.roleOptionTitle}>Support Seeker</Text>
                          <Text style={styles.roleOptionDescription}>
                            I'm looking for emotional support and guidance
                          </Text>
                        </View>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.roleOptionItem,
                          form.user_type === 'listener' && styles.roleOptionItemSelected
                        ]}
                        onPress={() => {
                          handleChange('user_type', 'listener');
                          setShowRoleDropdown(false);
                        }}
                        activeOpacity={0.7}
                      >
                        {form.user_type === 'listener' ? (
                          <View style={styles.radioButtonSelected}>
                            <View style={styles.radioButtonDot} />
                          </View>
                        ) : (
                          <View style={styles.radioButtonUnselected} />
                        )}
                        <View style={styles.roleOptionContent}>
                          <Text style={styles.roleOptionTitle}>Listener with Empathy</Text>
                          <Text style={styles.roleOptionDescription}>
                            I want to provide emotional support to others
                          </Text>
                        </View>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </Modal>
          </View>
        </View>

          {/* Preferences - Optional */}
          <View style={styles.preferencesSection}>
            <Text style={styles.preferencesTitle}>
              What areas would you like support with?{' '}
              <Text style={styles.optionalText}>(Optional)</Text>
            </Text>
            {categoriesLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#F97316" />
                <Text style={styles.loadingText}>Loading categories...</Text>
              </View>
            ) : categories.length > 0 ? (
              <View style={styles.inputWrapper}>
                <TouchableOpacity
                  style={styles.categoryDropdown}
                  onPress={() => setShowCategoryDropdown(true)}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.categoryDropdownText,
                    form.preferences.length === 0 && styles.placeholderText
                  ]}>
                    {form.preferences.length === 0
                      ? 'Select categories (optional)'
                      : form.preferences.length === 1
                      ? categories.find(c => c.id === form.preferences[0])?.name || '1 category selected'
                      : `${form.preferences.length} categories selected`
                    }
        </Text>
                  <ChevronDown size={20} color="#9CA3AF" />
                </TouchableOpacity>
                
                {/* Selected Categories Tags */}
                {form.preferences.length > 0 && (
                  <View style={styles.selectedTagsContainer}>
                    {form.preferences.map((categoryId) => {
                      const category = categories.find(c => c.id === categoryId);
                      if (!category) return null;
                      return (
                        <View key={categoryId} style={styles.selectedTag}>
                          <Text style={styles.selectedTagText}>{category.name}</Text>
                          <TouchableOpacity
                            onPress={() => handlePreferenceToggle(categoryId)}
                            style={styles.tagRemoveButton}
                          >
                            <X size={14} color="#F97316" />
                          </TouchableOpacity>
                        </View>
                      );
                    })}
                  </View>
                )}

                {/* Category Dropdown Modal */}
                <Modal
                  visible={showCategoryDropdown}
                  transparent={true}
                  animationType="slide"
                  onRequestClose={() => setShowCategoryDropdown(false)}
                >
                  <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                      <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Select Categories</Text>
                        <TouchableOpacity
                          onPress={() => setShowCategoryDropdown(false)}
                          style={styles.modalCloseButton}
                        >
                          <X size={24} color="#111827" />
                        </TouchableOpacity>
                      </View>
                      
                      <ScrollView style={styles.modalScrollView}>
                        {categories.map((category) => (
                          <TouchableOpacity
                            key={category.id}
                            style={styles.modalCategoryItem}
                            onPress={() => handlePreferenceToggle(category.id)}
                            activeOpacity={0.7}
                          >
              <CheckBox
                              value={form.preferences.includes(category.id)}
                              onValueChange={() => handlePreferenceToggle(category.id)}
                              tintColors={{ true: '#F97316', false: '#9CA3AF' }}
                            />
                            <Text style={styles.modalCategoryLabel}>{category.name}</Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                      
                      <TouchableOpacity
                        style={styles.modalDoneButton}
                        onPress={() => setShowCategoryDropdown(false)}
                      >
                        <Text style={styles.modalDoneButtonText}>Done</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </Modal>
              </View>
            ) : (
              <Text style={styles.noCategoriesText}>
                No categories available at the moment. You can skip this step and add preferences later.
              </Text>
            )}
          </View>

          {/* OTP Section */}
          {showOTP && (
            <View style={styles.otpSection}>
              <View style={styles.otpMessage}>
                <Text style={styles.otpMessageText}>
                  📧 OTP has been sent to <Text style={styles.otpEmail}>{form.email}</Text>
                </Text>
              </View>
              
              <View style={styles.inputWrapper}>
                <Text style={styles.label}>Enter OTP</Text>
                <View style={styles.inputContainer}>
                  <Smartphone size={20} color="#9CA3AF" style={styles.icon} />
                  <TextInput
                    placeholder="Enter 6-digit OTP"
                    value={form.otp}
                    onChangeText={(text) => handleChange('otp', text)}
                    keyboardType="number-pad"
                    maxLength={6}
                    style={styles.input}
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
              </View>

              <View style={styles.otpActions}>
                <TouchableOpacity
                  onPress={handleSendOTP}
                  disabled={otpLoading}
                  style={styles.resendButton}
                >
                  <Text style={styles.resendButtonText}>
                    {otpLoading ? 'Sending...' : 'Resend OTP'}
                  </Text>
                </TouchableOpacity>
                <Text style={styles.otpHint}>Didn't receive? Check spam folder</Text>
              </View>
            </View>
          )}

          {/* Error Message */}
          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Success Message */}
          {success && (
            <View style={styles.successContainer}>
              <Text style={styles.successText}>{success}</Text>
        </View>
          )}

          {/* Submit Button */}
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={isLoading || otpLoading}
            style={styles.buttonWrapper}
          >
            <LinearGradient
              colors={['#F97316', '#FBBF24']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[
                styles.button,
                (isLoading || otpLoading) && styles.buttonDisabled
              ]}
            >
              {isLoading || otpLoading ? (
                <>
                  <ActivityIndicator size="small" color="#FFF" />
                  <Text style={styles.buttonText}>
                    {isLoading ? 'Creating Account...' : 'Sending OTP...'}
                  </Text>
                </>
              ) : !showOTP ? (
                <>
                  <Text style={styles.buttonText}>Send OTP & Continue</Text>
                  <View style={styles.buttonIconSpacer} />
                  <ArrowRight size={20} color="#FFF" />
                </>
              ) : (
                <>
                  <Text style={styles.buttonText}>Verify OTP & Sign Up</Text>
                  <View style={styles.buttonIconSpacer} />
                  <ArrowRight size={20} color="#FFF" />
                </>
              )}
            </LinearGradient>
        </TouchableOpacity>

          {/* Footer Links */}
          <View style={styles.footer}>
        <Text style={styles.footerText}>
              Already have an account?{' '}
              <Text 
                style={styles.link}
                onPress={() => {
                  if (navigation) {
                    navigation.navigate('Login');
                  }
                }}
              >
                Login here
              </Text>
        </Text>
          </View>
        </View>
      </View>
    </ScrollView>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  gradientOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
    paddingTop: 20,
    position: 'relative',
    zIndex: 1,
  },
  header: {
    marginTop: 20,
    marginBottom: 16,
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    textAlign: 'center',
    color: '#111827',
    marginBottom: 8,
    paddingHorizontal: 8,
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
    color: '#4B5563',
    paddingHorizontal: 12,
    lineHeight: 22,
    marginTop: 4,
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.81)',
    borderColor: 'rgba(255, 255, 255, 0.4)',
    borderRadius: 20,
    padding: 16,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    // elevation: 8,
    width: '100%',  
  },
  roleMessage: {
    flexDirection: 'row',
    backgroundColor: '#FFF8E7',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F97316',
    alignItems: 'flex-start',
    width: '100%',
  },
  roleMessageText: {
    flex: 1,
    marginLeft: 12,
  },
  roleMessageTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  roleMessageSubtitle: {
    fontSize: 14,
    color: '#000',
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF8E7',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F97316',
    alignSelf: 'center',
    flexWrap: 'wrap',
  },
  roleBadgePending: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#93C5FD',
    alignSelf: 'center',
    flexWrap: 'wrap',
  },
  roleBadgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginLeft: 8,
  },
  roleBadgeTextPending: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E40AF',
    marginLeft: 8,
  },
  form: {
    marginTop: 8,
    width: '100%',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  inputWrapper: {
    flex: 1,
    minWidth: 0,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    marginTop: 0,
  },
  preSelectedLabel: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '500',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    minHeight: 48,
    height: 48,
    
  },
  dateInputContainer: {
    justifyContent: 'center',
  },
  dateText: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
    padding: 0,
    margin: 0,
  },
  inputContainerSelected: {
    borderColor: '#86EFAC',
    backgroundColor: '#F0FDF4',
  },
  icon: {
    marginRight: 8,
    flexShrink: 0,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
    padding: 0,
    margin: 0,
    minHeight: 20,
  },
  placeholderText: {
    color: '#9CA3AF',
  },
  roleDropdownText: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
    padding: 0,
    margin: 0,
  },
  preferencesSection: {
    marginTop: 12,
    marginBottom: 16,
    width: '100%',
  },
  preferencesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  optionalText: {
    fontSize: 14,
    fontWeight: '400',
    color: '#6B7280',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#6B7280',
  },
  categoryDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    minHeight: 48,
    height: 48,
  },
  categoryDropdownText: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
  },
  selectedTagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    marginRight: -8,
    marginBottom: -8,
  },
  selectedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8E7',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#F97316',
    marginRight: 8,
    marginBottom: 8,
  },
  selectedTagText: {
    fontSize: 12,
    color: '#F97316',
    fontWeight: '600',
    marginRight: 6,
  },
  tagRemoveButton: {
    padding: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalScrollView: {
    maxHeight: 400,
    paddingHorizontal: 20,
  },
  modalCategoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalCategoryLabel: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: '#374151',
  },
  modalDoneButton: {
    backgroundColor: '#F97316',
    borderRadius: 12,
    paddingVertical: 14,
    marginHorizontal: 20,
    marginTop: 20,
    alignItems: 'center',
  },
  modalDoneButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  roleOptionsContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  roleOptionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  radioButtonSelected: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F97316',
    borderWidth: 2,
    borderColor: '#F97316',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  radioButtonDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  radioButtonUnselected: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#9CA3AF',
    backgroundColor: '#FFFFFF',
    marginRight: 12,
    marginTop: 2,
  },
  roleOptionContent: {
    flex: 1,
  },
  roleOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  roleOptionDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  roleOptionItemSelected: {
    backgroundColor: '#FFF8E7',
    borderColor: '#F97316',
  },
  noCategoriesText: {
    textAlign: 'center',
    paddingVertical: 16,
    fontSize: 14,
    color: '#6B7280',
  },
  otpSection: {
    marginTop: 12,
    marginBottom: 16,
    width: '100%',
  },
  otpMessage: {
    backgroundColor: '#DBEAFE',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#93C5FD',
  },
  otpMessageText: {
    fontSize: 14,
    color: '#1E40AF',
  },
  otpEmail: {
    fontWeight: '700',
  },
  otpActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  resendButton: {
    paddingVertical: 8,
  },
  resendButtonText: {
    fontSize: 14,
    color: '#F97316',
    fontWeight: '600',
  },
  otpHint: {
    fontSize: 12,
    color: '#6B7280',
  },
  errorContainer: {
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorText: {
    fontSize: 14,
    color: '#991B1B',
  },
  successContainer: {
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  successText: {
    fontSize: 14,
    color: '#166534',
  },
  buttonWrapper: {
    marginTop: 16,
    marginBottom: 16,
    width: '100%',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  buttonIconSpacer: {
    width: 8,
  },
  footer: {
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 8,
  },
  footerText: {
    fontSize: 14,
    color: '#4B5563',
    textAlign: 'center',
  },
  link: {
    color: '#F97316',
    fontWeight: '600',
  },
});
