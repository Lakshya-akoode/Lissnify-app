import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  ImageBackground,
  Image,
  Platform,
} from 'react-native';
import { BlurView } from '@react-native-community/blur';
import LinearGradient from 'react-native-linear-gradient';
import CheckBox from '@react-native-community/checkbox';
import { 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  ArrowRight 
} from 'lucide-react-native';
import { loginUser, getDashboardUrl } from '../utils/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Images from '../Assets';

export default function LoginScreen({ navigation }) {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleInputChange = (key, value) => {
    setFormData(prev => ({
      ...prev,
      [key]: value,
    }));
    if (error) setError('');
  };

  const handleSubmit = async () => {
    setError('');

    if (!formData.email || !formData.password) {
      setError('Please fill in all required fields');
      return;
    }

    setIsLoading(true);

    try {
      const response = await loginUser({
        username_or_email: formData.email,
        password: formData.password,
      });

      if (response.success) {
        // Store token
        if (response.data?.access) {
          await AsyncStorage.setItem('adminToken', response.data.access);
          if (formData.rememberMe) {
            await AsyncStorage.setItem('rememberMe', 'true');
          }
        }

        // Get complete user data including ID
        const userData = {
          id: response.data?.user?.id || response.data?.user?.pk || response.data?.user?.user_id,
          full_name: response.data?.user?.name || response.data?.user?.full_name || formData.email.split('@')[0],
          email: response.data?.user?.email || formData.email,
          user_type: response.data?.user?.user_type || 'seeker',
          username: response.data?.user?.username || formData.email.split('@')[0],
        };

        // Store complete user data in AsyncStorage (matching web version)
        await AsyncStorage.setItem('elysian_user', JSON.stringify(userData));
        await AsyncStorage.setItem('full_name', userData.full_name);
        if (userData.id) {
          await AsyncStorage.setItem('user_id', userData.id.toString());
        }

        // Navigate to appropriate dashboard
        const userType = response.data?.user?.user_type || 'seeker';
        const dashboardRoute = getDashboardUrl(userType);

        if (navigation) {
          try {
            navigation.replace(dashboardRoute);
          } catch (navError) {
            console.log('Dashboard route not found, you may need to add it to your navigation stack');
            // You can navigate to a home screen or login screen here
            // navigation.replace('Home');
          }
        }
      } else {
        const nonFieldError = Array.isArray(response.data?.non_field_errors)
          ? response.data.non_field_errors.join(', ')
          : response.data?.non_field_errors;

        setError(
          response.data?.detail ||
          nonFieldError ||
          response.error || 
          'Login failed. Please check your credentials.'
        );
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Background Image */}
      <ImageBackground
        source={Images.loginBackground}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        {/* Gradient Overlay */}
        <LinearGradient
          colors={['rgba(255, 247, 237, 0.6)', 'rgba(255, 237, 213, 0.5)', 'rgba(255, 255, 255, 0.4)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradientOverlay}
        />

        {/* Content */}
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.contentContainer}>
            {/* Login Card */}
            <View style={styles.card}>
              {/* Glass-morphism effect for iOS */}
              {Platform.OS === 'ios' && (
                <BlurView
                  style={styles.blurView}
                  blurType="light"
                  blurAmount={10}
                />
              )}

              {/* Card Content */}
              <View style={styles.cardContent}>
                {/* Header */}
                <View style={styles.header}>
                  {/* Logo */}
                  <View style={styles.logoContainer}>
                    <Image
                      source={Images.logo}
                      style={styles.logo}
                      resizeMode="contain"
                    />
                  </View>
                  
                  <Text style={styles.title}>Welcome Back</Text>
                  <Text style={styles.subtitle}>
                    Login to continue your soulful journey
                  </Text>
                </View>

                {/* Form */}
                <View style={styles.form}>
                  {/* Email/Username Field */}
                  <View style={styles.inputWrapper}>
                    <Text style={styles.label}>Email Address or Username</Text>
                    <View style={styles.inputContainer}>
                      <Mail size={20} color="#9CA3AF" style={styles.icon} />
                      <TextInput
                        placeholder="Enter your email or Username"
                        value={formData.email}
                        onChangeText={(text) => handleInputChange('email', text)}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        style={styles.input}
                        placeholderTextColor="#9CA3AF"
                      />
                    </View>
                  </View>

                  {/* Password Field */}
                  <View style={styles.inputWrapper}>
                    <Text style={styles.label}>Password</Text>
                    <View style={styles.inputContainer}>
                      <Lock size={20} color="#9CA3AF" style={styles.icon} />
                      <TextInput
                        placeholder="Enter your password"
                        value={formData.password}
                        onChangeText={(text) => handleInputChange('password', text)}
                        secureTextEntry={!showPassword}
                        style={styles.input}
                        placeholderTextColor="#9CA3AF"
                      />
                      <TouchableOpacity
                        onPress={() => setShowPassword(!showPassword)}
                        style={styles.eyeButton}
                      >
                        {showPassword ? (
                          <EyeOff size={20} color="#9CA3AF" />
                        ) : (
                          <Eye size={20} color="#9CA3AF" />
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Remember Me & Forgot Password */}
                  <View style={styles.optionsRow}>
                    <View style={styles.checkboxContainer}>
                      <CheckBox
                        value={formData.rememberMe}
                        onValueChange={(value) => handleInputChange('rememberMe', value)}
                        tintColors={{ true: '#F97316', false: '#9CA3AF' }}
                      />
                      <Text style={styles.checkboxLabel}>Remember me</Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => {
                        // Navigate to forgot password screen if exists
                        if (navigation) {
                          navigation.navigate('ForgotPassword');
                        }
                      }}
                    >
                      <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Error Message */}
                  {error && (
                    <View style={styles.errorContainer}>
                      <Text style={styles.errorText}>{error}</Text>
                    </View>
                  )}

                  {/* Login Button */}
                  <TouchableOpacity
                    onPress={handleSubmit}
                    disabled={isLoading}
                    style={styles.buttonWrapper}
                  >
                    <LinearGradient
                      colors={['#F97316', '#FBBF24']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={[
                        styles.button,
                        isLoading && styles.buttonDisabled
                      ]}
                    >
                      {isLoading ? (
                        <>
                          <ActivityIndicator size="small" color="#FFF" />
                          <Text style={styles.buttonText}>Signing In...</Text>
                        </>
                      ) : (
                        <>
                          <Text style={styles.buttonText}>Login</Text>
                          <ArrowRight size={20} color="#FFF" />
                        </>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </View>

                {/* Footer Links */}
                <View style={styles.footer}>
                  <Text style={styles.footerText}>
                    Don't have an account?{' '}
                    <Text
                      style={styles.link}
                      onPress={() => {
                        if (navigation) {
                          navigation.navigate('Signup');
                        }
                      }}
                    >
                      Sign up here
                    </Text>
                  </Text>
                </View>
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
    resizeMode:"cover"
  },
  gradientOverlay: {
    position: 'relative',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: Platform.OS === 'android' ? 'rgba(255, 255, 255, 0.21)' : 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    
  },
  blurView: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
  },
  cardContent: {
    padding: 24,
    backgroundColor: Platform.OS === 'android' ? 'rgba(255, 255, 255, 0.85)' : 'rgba(255, 255, 255, 0.3)',
  },
  header: {
    marginBottom: 24,
    alignItems: 'center',
    justifyContent:"center",
    width: '100%',
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 0,
    marginTop: 0,
    paddingRight:20
  },
  logo: {
    width: 200,
    height: 100,
    maxWidth: '100%',
    
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
    marginTop: 0,
  },
  subtitle: {
    fontSize: 16,
    color: '#4B5563',
    textAlign: 'center',
  },
  form: {
    marginTop: 8,
  },
  inputWrapper: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
  icon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
    padding: 0,
  },
  eyeButton: {
    padding: 4,
    marginLeft: 8,
  },
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkboxLabel: {
    marginLeft: 8,
    fontSize: 14,
    color: '#374151',
  },
  forgotPasswordText: {
    fontSize: 14,
    color: '#F97316',
    fontWeight: '600',
  },
  errorContainer: {
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorText: {
    fontSize: 14,
    color: '#991B1B',
  },
  buttonWrapper: {
    marginTop: 8,
    marginBottom: 20,
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
    gap: 8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  footer: {
    alignItems: 'center',
    marginTop: 8,
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

