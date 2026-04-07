import React, { useState } from 'react';
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
  Mail,
  ArrowRight,
  ArrowLeft,
  KeyRound,
} from 'lucide-react-native';
import { forgotPassword, verifyForgotPasswordOTP, resendForgotPasswordOTP } from '../utils/api';
import CustomAlert from '../components/CustomAlert';
import useAlert from '../hooks/useAlert';
import Images from '../Assets';

export default function ForgotPasswordScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [serverOtp, setServerOtp] = useState('');
  const { alertState, showAlert, hideAlert } = useAlert();
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState('email'); // 'email' or 'otp'
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleEmailChange = (text) => {
    setEmail(text);
    if (error) setError('');
  };

  const handleOtpChange = (text) => {
    const value = text.replace(/\D/g, '').slice(0, 6); // Only numbers, max 6 digits
    setOtp(value);
    if (error) setError('');
  };

  const handleEmailSubmit = async () => {
    setError('');

    if (!email) {
      setError('Please enter your email address');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setIsLoading(true);

    try {
      const response = await forgotPassword(email);

      if (response.success) {
        setStep('otp');
        showAlert({ title: 'Success', message: 'OTP sent to your email! Please check your inbox.', type: 'success' });
      } else {
        setError(response.error || 'Failed to send OTP. Please try again.');
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpSubmit = async () => {
    setError('');

    if (!otp || otp.length !== 6) {
      setError('Please enter a valid 6-digit OTP');
      return;
    }

    setIsLoading(true);

    try {
      const response = await verifyForgotPasswordOTP(email, otp);

      if (response.success) {
        showAlert({ title: 'Success', message: 'OTP verified successfully!', type: 'success' });
        navigation.navigate('ResetPassword', { email, otp });
      } else {
        setError(response.error || 'Invalid OTP. Please try again.');
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setError('');
    setIsLoading(true);

    try {
      const response = await forgotPassword(email);

      if (response.success) {
        setOtp('');
        showAlert({ title: 'Success', message: 'OTP resent! Please check your email.', type: 'success' });
      } else {
        setError(response.error || 'Failed to resend OTP. Please try again.');
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

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
                  <Text style={styles.title}>
                    {step === 'email' ? 'Forgot Password?' : 'Verify OTP'}
                  </Text>
                  <Text style={styles.subtitle}>
                    {step === 'email'
                      ? "Enter your email and we'll send you an OTP"
                      : `Enter the 6-digit OTP sent to ${email}`}
                  </Text>
                </View>

                {step === 'email' ? (
                  /* Email Step */
                  <View style={styles.form}>
                    <View style={styles.inputWrapper}>
                      <Text style={styles.label}>Email Address</Text>
                      <View style={styles.inputContainer}>
                        <Mail size={20} color="#9CA3AF" style={styles.icon} />
                        <TextInput
                          placeholder="Enter your email address"
                          value={email}
                          onChangeText={handleEmailChange}
                          keyboardType="email-address"
                          autoCapitalize="none"
                          style={styles.input}
                          placeholderTextColor="#9CA3AF"
                        />
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
                      onPress={handleEmailSubmit}
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
                            <Text style={styles.buttonText}>Sending OTP...</Text>
                          </>
                        ) : (
                          <>
                            <Text style={styles.buttonText}>Send OTP</Text>
                            <ArrowRight size={20} color="#FFF" />
                          </>
                        )}
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                ) : (
                  /* OTP Step */
                  <View style={styles.form}>
                    <View style={styles.inputWrapper}>
                      <Text style={styles.label}>Enter OTP</Text>
                      <View style={styles.inputContainer}>
                        <KeyRound size={20} color="#9CA3AF" style={styles.icon} />
                        <TextInput
                          placeholder="000000"
                          value={otp}
                          onChangeText={handleOtpChange}
                          keyboardType="number-pad"
                          maxLength={6}
                          style={[styles.input, styles.otpInput]}
                          placeholderTextColor="#9CA3AF"
                        />
                      </View>
                      <Text style={styles.helperText}>
                        Enter the 6-digit code sent to your email
                      </Text>
                    </View>

                    {/* Error */}
                    {error ? (
                      <View style={styles.errorContainer}>
                        <Text style={styles.errorText}>{error}</Text>
                      </View>
                    ) : null}

                    {/* Verify Button */}
                    <TouchableOpacity
                      onPress={handleOtpSubmit}
                      disabled={isLoading || otp.length !== 6}
                      style={styles.buttonWrapper}
                    >
                      <LinearGradient
                        colors={['#F97316', '#FBBF24']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={[
                          styles.button,
                          (isLoading || otp.length !== 6) && styles.buttonDisabled,
                        ]}
                      >
                        {isLoading ? (
                          <>
                            <ActivityIndicator size="small" color="#FFF" />
                            <Text style={styles.buttonText}>Verifying...</Text>
                          </>
                        ) : (
                          <>
                            <Text style={styles.buttonText}>Verify OTP</Text>
                            <ArrowRight size={20} color="#FFF" />
                          </>
                        )}
                      </LinearGradient>
                    </TouchableOpacity>

                    {/* Resend OTP */}
                    <TouchableOpacity
                      onPress={handleResendOtp}
                      disabled={isLoading}
                      style={styles.resendButton}
                    >
                      <Text
                        style={[
                          styles.resendText,
                          isLoading && { opacity: 0.5 },
                        ]}
                      >
                        Didn't receive OTP? Resend
                      </Text>
                    </TouchableOpacity>

                    {/* Change Email */}
                    <TouchableOpacity
                      onPress={() => {
                        setStep('email');
                        setOtp('');
                        setError('');
                      }}
                      style={styles.changeEmailButton}
                    >
                      <ArrowLeft size={16} color="#4B5563" />
                      <Text style={styles.changeEmailText}>Change Email</Text>
                    </TouchableOpacity>
                  </View>
                )}

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
    paddingHorizontal: 10,
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
  otpInput: {
    textAlign: 'center',
    fontSize: 22,
    letterSpacing: 8,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
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
  resendButton: {
    alignItems: 'center',
    marginBottom: 12,
  },
  resendText: {
    fontSize: 14,
    color: '#F97316',
    fontWeight: '600',
  },
  changeEmailButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 8,
  },
  changeEmailText: {
    fontSize: 14,
    color: '#4B5563',
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
