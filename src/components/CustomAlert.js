import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Animated,
  Platform,
  Dimensions,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { CheckCircle, AlertTriangle, XCircle, Info } from 'lucide-react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/**
 * CustomAlert - Premium styled modal replacement for Alert.alert
 *
 * Props:
 *   visible: boolean
 *   title: string
 *   message: string
 *   type: 'success' | 'error' | 'warning' | 'info' | 'confirm' (default: 'info')
 *   buttons: [{ text: string, onPress: () => void, style?: 'cancel' | 'destructive' | 'default' }]
 *   onDismiss: () => void  (called when backdrop is tapped)
 */
export default function CustomAlert({
  visible = false,
  title = '',
  message = '',
  type = 'info',
  buttons = [{ text: 'OK', onPress: () => {} }],
  onDismiss,
}) {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 65,
          friction: 9,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const getTypeConfig = () => {
    switch (type) {
      case 'success':
        return {
          icon: <CheckCircle size={32} color="#10B981" />,
          gradientColors: ['#ECFDF5', '#D1FAE5'],
          accentColor: '#10B981',
          iconBgColors: ['#D1FAE5', '#A7F3D0'],
        };
      case 'error':
        return {
          icon: <XCircle size={32} color="#EF4444" />,
          gradientColors: ['#FEF2F2', '#FECACA'],
          accentColor: '#EF4444',
          iconBgColors: ['#FECACA', '#FCA5A5'],
        };
      case 'warning':
      case 'confirm':
        return {
          icon: <AlertTriangle size={32} color="#F59E0B" />,
          gradientColors: ['#FFFBEB', '#FEF3C7'],
          accentColor: '#F59E0B',
          iconBgColors: ['#FEF3C7', '#FDE68A'],
        };
      default:
        return {
          icon: <Info size={32} color="#CD853F" />,
          gradientColors: ['#FFF8E7', '#FFECD2'],
          accentColor: '#CD853F',
          iconBgColors: ['#FFECD2', '#FFD8A8'],
        };
    }
  };

  const config = getTypeConfig();

  const handleBackdropPress = () => {
    if (onDismiss) {
      onDismiss();
    } else if (buttons.length === 1 && buttons[0].onPress) {
      buttons[0].onPress();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={handleBackdropPress}
    >
      <Animated.View style={[styles.overlay, { opacity: opacityAnim }]}>
        <TouchableOpacity
          style={styles.backdropTouch}
          activeOpacity={1}
          onPress={handleBackdropPress}
        />

        <Animated.View
          style={[
            styles.alertContainer,
            {
              transform: [{ scale: scaleAnim }],
              opacity: opacityAnim,
            },
          ]}
        >
          {/* Top accent line */}
          <LinearGradient
            colors={[config.accentColor, config.accentColor + '80']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.accentLine}
          />

          {/* Icon */}
          <View style={styles.iconSection}>
            <LinearGradient
              colors={config.iconBgColors}
              style={styles.iconContainer}
            >
              {config.icon}
            </LinearGradient>
          </View>

          {/* Content */}
          <View style={styles.content}>
            {title ? <Text style={styles.title}>{title}</Text> : null}
            {message ? <Text style={styles.message}>{message}</Text> : null}
          </View>

          {/* Buttons */}
          <View style={[
            styles.buttonRow,
            buttons.length === 1 && styles.buttonRowSingle,
          ]}>
            {buttons.map((button, index) => {
              const isCancel = button.style === 'cancel';
              const isDestructive = button.style === 'destructive';
              const isPrimary = !isCancel && (buttons.length === 1 || index === buttons.length - 1);

              if (isPrimary || isDestructive) {
                return (
                  <TouchableOpacity
                    key={index}
                    style={[styles.buttonWrapper, { flex: 1 }]}
                    onPress={button.onPress}
                    activeOpacity={0.7}
                  >
                    <LinearGradient
                      colors={
                        isDestructive
                          ? ['#EF4444', '#DC2626']
                          : [config.accentColor, config.accentColor + 'DD']
                      }
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.primaryButton}
                    >
                      <Text style={styles.primaryButtonText}>
                        {button.text}
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                );
              }

              return (
                <TouchableOpacity
                  key={index}
                  style={[styles.cancelButton, { flex: 1 }]}
                  onPress={button.onPress}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.cancelButtonText, { color: config.accentColor }]}>
                    {button.text}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  backdropTouch: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  alertContainer: {
    width: Math.min(SCREEN_WIDTH - 48, 360),
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 12,
  },
  accentLine: {
    height: 4,
    width: '100%',
  },
  iconSection: {
    alignItems: 'center',
    paddingTop: 24,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 21,
  },
  buttonRow: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
  },
  buttonRowSingle: {
    justifyContent: 'center',
  },
  buttonWrapper: {
    // flex set dynamically
  },
  primaryButton: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  cancelButton: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
