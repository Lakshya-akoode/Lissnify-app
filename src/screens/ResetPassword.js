import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  ActivityIndicator,
  ImageBackground,
  Image,
  Platform,
} from 'react-native';
import { BlurView } from '@react-native-community/blur';
import LinearGradient from 'react-native-linear-gradient';
import {
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react-native';
import { resetPassword } from '../utils/api';
import CustomAlert from '../components/CustomAlert';
import useAlert from '../hooks/useAlert';
import Images from '../Assets';

export default function ResetPasswordScreen({ navigation, route }) {
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { alertState, showAlert, hideAlert } = useAlert();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');

  useEffect(() => {
    const emailParam = route?.params?.email;
    const otpParam = route?.params?.otp;

    if (!emailParam || !otpParam) {
      showAlert({
        title: 'Invalid Link',
        message: 'Invalid reset link. Please start from forgot password page.',
        type: 'error',
        buttons: [
          {
            text: 'OK',
            onPress: () => navigation.navigate('ForgotPassword'),
          },
        ],
      });
      return;
    }

    setEmail(emailParam);
    setOtp(otpParam);
  }, [route?.params, navigation]);

  const handleInputChange = (key, value) => {
    setFormData(prev => ({
      ...prev,
      [key]: value,
    }));
    if (error) setError('');
  };

  const validatePassword = (password) => {
    if (password.length < 8) {
      return 'Password must be at least 8 characters long';
    }
    if (!/(?=.*[a-z])/.test(password)) {
      return 'Password must contain at least one lowercase letter';
    }
    if (!/(?=.*[A-Z])/.test(password)) {
      return 'Password must contain at least one uppercase letter';
    }
    if (!/(?=.*\d)/.test(password)) {
      return 'Password must contain at least one number';
    }
    return null;
  };

  const handleSubmit = async () => {
    setError('');

    if (!formData.password || !formData.confirmPassword) {
      setError('Please fill in all fields');
      return;
    }

    // Validate password strength
    const passwordError = validatePassword(formData.password);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);

    try {
      const response = await resetPassword(email, otp, formData.password);

      if (response.success) {
        showAlert({
          title: 'Success',
          message: 'Password reset successfully! Please login with your new password.',
          type: 'success',
          buttons: [
            {
              text: 'Go to Login',
              onPress: () => navigation.navigate('Login'),
            },
          ],
        });
      } else {
        setError(
          response.error || 'Failed to reset password. Please try again.',
        );
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!email || !otp) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#F97316" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ImageBackground
        source={Images.loginBackground}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        <LinearGradient
          colors={[
            'rgba(255, 247, 237, 0.6)',
            'rgba(255, 237, 213, 0.5)',
            'rgba(255, 255, 255, 0.4)',
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradientOverlay}
        />

        <KeyboardAvoidingView
          style={styles.keyboardAvoidingView}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.contentContainer}>
            <View style={styles.card}>
              {Platform.OS === 'ios' && (
                <BlurView
                  style={styles.blurView}
                  blurType="light"
                  blurAmount={10}
                />
              )}

              <View style={styles.cardContent}>
                {/* Header */}
                <View style={styles.header}>
                  <View style={styles.logoContainer}>
                    <Image
                      source={Images.logo}
                      style={styles.logo}
                      resizeMode="contain"
                    />
                  </View>
                  <Text style={styles.title}>Reset Password</Text>
                  <Text style={styles.subtitle}>
                    Enter your new password below
                  </Text>
                </View>

                {/* Form */}
                <View style={styles.form}>
                  {/* New Password */}
                  <View style={styles.inputWrapper}>
                    <Text style={styles.label}>New Password</Text>
                    <View style={styles.inputContainer}>
                      <Lock size={20} color="#9CA3AF" style={styles.icon} />
                      <TextInput
                        placeholder="Enter new password"
                        value={formData.password}
                        onChangeText={text =>
                          handleInputChange('password', text)
                        }
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
                    <Text style={styles.helperText}>
                      Password must be at least 8 characters with uppercase,
                      lowercase, and number
                    </Text>
                  </View>

                  {/* Confirm Password */}
                  <View style={styles.inputWrapper}>
                    <Text style={styles.label}>Confirm Password</Text>
                    <View style={styles.inputContainer}>
                      <Lock size={20} color="#9CA3AF" style={styles.icon} />
                      <TextInput
                        placeholder="Confirm new password"
                        value={formData.confirmPassword}
                        onChangeText={text =>
                          handleInputChange('confirmPassword', text)
                        }
                        secureTextEntry={!showConfirmPassword}
                        style={styles.input}
                        placeholderTextColor="#9CA3AF"
                      />
                      <TouchableOpacity
                        onPress={() =>
                          setShowConfirmPassword(!showConfirmPassword)
                        }
                        style={styles.eyeButton}
                      >
                        {showConfirmPassword ? (
                          <EyeOff size={20} color="#9CA3AF" />
                        ) : (
                          <Eye size={20} color="#9CA3AF" />
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Error */}
                  {error ? (
                    <View style={styles.errorContainer}>
                      <Text style={styles.errorText}>{error}</Text>
                    </View>
                  ) : null}

                  {/* Submit Button */}
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
                        isLoading && styles.buttonDisabled,
                      ]}
                    >
                      {isLoading ? (
                        <>
                          <ActivityIndicator size="small" color="#FFF" />
                          <Text style={styles.buttonText}>
                            Resetting Password...
                          </Text>
                        </>
                      ) : (
                        <>
                          <Text style={styles.buttonText}>Reset Password</Text>
                          <ArrowRight size={20} color="#FFF" />
                        </>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </View>

                {/* Footer */}
                <View style={styles.footer}>
                  <Text style={styles.footerText}>
                    Remember your password?{' '}
                    <Text
                      style={styles.link}
                      onPress={() => navigation.navigate('Login')}
                    >
                      Login here
                    </Text>
                  </Text>
                  <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    style={styles.backButton}
                  >
                    <ArrowLeft size={16} color="#F97316" />
                    <Text style={styles.backText}>Go Back</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>
        </KeyboardAvoidingView>
      </ImageBackground>
      <CustomAlert {...alertState} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF7ED',
  },
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  gradientOverlay: {
    position: 'absolute',
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
    paddingBottom: Platform.OS === 'ios' ? 100 : 40,
  },
  contentContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100%',
  },
  card: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor:
      Platform.OS === 'android' ? 'rgba(255, 255, 255, 0.21)' : 'transparent',
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
    backgroundColor:
      Platform.OS === 'android'
        ? 'rgba(255, 255, 255, 0.85)'
        : 'rgba(255, 255, 255, 0.3)',
  },
  header: {
    marginBottom: 24,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 0,
    marginTop: 0,
    paddingRight: 20,
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
    fontSize: 14,
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
  helperText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 8,
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
    height: Platform.OS === 'ios' ? 60 : 40,
    justifyContent: 'center',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    gap: 8,
    height: Platform.OS === 'ios' ? 50 : 40,
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
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
  },
  backText: {
    fontSize: 14,
    color: '#F97316',
    fontWeight: '600',
  },
});
