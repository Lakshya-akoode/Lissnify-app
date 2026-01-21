import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Animated,
  Dimensions,
  Platform,
  StatusBar,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { Heart, MessageCircle, Users } from 'lucide-react-native';
import Images from '../Assets';

const { width, height } = Dimensions.get('window');

export default function SplashScreen({ onFinish }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const logoRotate = useRef(new Animated.Value(0)).current;
  const iconAnim1 = useRef(new Animated.Value(0)).current;
  const iconAnim2 = useRef(new Animated.Value(0)).current;
  const iconAnim3 = useRef(new Animated.Value(0)).current;
  const dot1Anim = useRef(new Animated.Value(0)).current;
  const dot2Anim = useRef(new Animated.Value(0)).current;
  const dot3Anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Start animations
    Animated.parallel([
      // Logo fade in and scale
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      // Logo rotation animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(logoRotate, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(logoRotate, {
            toValue: 0,
            duration: 2000,
            useNativeDriver: true,
          }),
        ])
      ),
      // Icons animation sequence
      Animated.sequence([
        Animated.delay(500),
        Animated.timing(iconAnim1, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(iconAnim2, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(iconAnim3, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    // Animate loading dots
    const animateDots = () => {
      const createDotAnimation = (dotAnim, delay) => {
        return Animated.loop(
          Animated.sequence([
            Animated.delay(delay),
            Animated.timing(dotAnim, {
              toValue: 1,
              duration: 600,
              useNativeDriver: true,
            }),
            Animated.timing(dotAnim, {
              toValue: 0,
              duration: 600,
              useNativeDriver: true,
            }),
          ])
        );
      };

      Animated.parallel([
        createDotAnimation(dot1Anim, 0),
        createDotAnimation(dot2Anim, 200),
        createDotAnimation(dot3Anim, 400),
      ]).start();
    };

    animateDots();

    // Navigate after splash duration
    const timer = setTimeout(() => {
      if (onFinish && typeof onFinish === 'function') {
        onFinish();
      }
    }, 3500); // Show splash for 3.5 seconds

    return () => clearTimeout(timer);
  }, [onFinish]);

  const logoRotation = logoRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '5deg'],
  });

  const icon1TranslateY = iconAnim1.interpolate({
    inputRange: [0, 1],
    outputRange: [50, 0],
  });

  const icon2TranslateY = iconAnim2.interpolate({
    inputRange: [0, 1],
    outputRange: [50, 0],
  });

  const icon3TranslateY = iconAnim3.interpolate({
    inputRange: [0, 1],
    outputRange: [50, 0],
  });

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="transparent"
        translucent={true}
      />
      <LinearGradient
        colors={['#FFF8B5', '#FFB88C', '#FFA07A']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        {/* Animated Background Circles */}
        <View style={styles.backgroundCircles}>
          <View style={[styles.circle, styles.circle1]} />
          <View style={[styles.circle, styles.circle2]} />
          <View style={[styles.circle, styles.circle3]} />
        </View>

        {/* Main Content */}
        <View style={styles.content}>
          {/* Logo with Animation */}
          <Animated.View
            style={[
              styles.logoContainer,
              {
                opacity: fadeAnim,
                transform: [
                  { scale: scaleAnim },
                  { rotate: logoRotation },
                ],
              },
            ]}
          >
            <Image
              source={Images.logo}
              style={styles.logo}
              resizeMode="contain"
              onError={(error) => {
                console.log('Logo image error:', error);
              }}
            />
          </Animated.View>

          {/* App Name */}
          <Animated.View
            style={[
              styles.titleContainer,
              {
                opacity: fadeAnim,
              },
            ]}
          >
            <Text style={styles.appName}>Lissnify</Text>
            <Text style={styles.tagline}>Your Soulful Emotional Well-being Companion</Text>
          </Animated.View>

          {/* Feature Icons */}
          <View style={styles.iconsContainer}>
            <Animated.View
              style={[
                styles.iconWrapper,
                {
                  opacity: iconAnim1,
                  transform: [{ translateY: icon1TranslateY }],
                },
              ]}
            >
              <View style={[styles.iconCircle, styles.iconCircle1]}>
                <Heart size={28} color="#FFF" fill="#FFF" />
              </View>
              <Text style={styles.iconLabel}>Empathy</Text>
            </Animated.View>

            <Animated.View
              style={[
                styles.iconWrapper,
                {
                  opacity: iconAnim2,
                  transform: [{ translateY: icon2TranslateY }],
                },
              ]}
            >
              <View style={[styles.iconCircle, styles.iconCircle2]}>
                <MessageCircle size={28} color="#FFF" fill="#FFF" />
              </View>
              <Text style={styles.iconLabel}>Support</Text>
            </Animated.View>

            <Animated.View
              style={[
                styles.iconWrapper,
                {
                  opacity: iconAnim3,
                  transform: [{ translateY: icon3TranslateY }],
                },
              ]}
            >
              <View style={[styles.iconCircle, styles.iconCircle3]}>
                <Users size={28} color="#FFF" fill="#FFF" />
              </View>
              <Text style={styles.iconLabel}>Community</Text>
            </Animated.View>
          </View>

          {/* Loading Indicator */}
          <Animated.View
            style={[
              styles.loadingContainer,
              {
                opacity: fadeAnim,
              },
            ]}
          >
            <View style={styles.loadingDots}>
              <Animated.View
                style={[
                  styles.dot,
                  {
                    opacity: dot1Anim,
                    transform: [
                      {
                        scale: dot1Anim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [1, 1.3],
                        }),
                      },
                    ],
                  },
                ]}
              />
              <Animated.View
                style={[
                  styles.dot,
                  {
                    opacity: dot2Anim,
                    transform: [
                      {
                        scale: dot2Anim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [1, 1.3],
                        }),
                      },
                    ],
                  },
                ]}
              />
              <Animated.View
                style={[
                  styles.dot,
                  {
                    opacity: dot3Anim,
                    transform: [
                      {
                        scale: dot3Anim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [1, 1.3],
                        }),
                      },
                    ],
                  },
                ]}
              />
            </View>
          </Animated.View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Connecting Hearts, Healing Souls</Text>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  backgroundCircles: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  circle: {
    position: 'absolute',
    borderRadius: 1000,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  circle1: {
    width: 300,
    height: 300,
    top: -100,
    right: -100,
  },
  circle2: {
    width: 200,
    height: 200,
    bottom: -50,
    left: -50,
  },
  circle3: {
    width: 150,
    height: 150,
    top: '40%',
    left: -75,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  logoContainer: {
    marginBottom: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 220,
    height: 120,
    maxWidth: '80%',
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: 60,
  },
  appName: {
    fontSize: 42,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 12,
    letterSpacing: 1,
    textShadowColor: 'rgba(255, 255, 255, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  tagline: {
    fontSize: 16,
    color: '#4B5563',
    textAlign: 'center',
    fontWeight: '500',
    paddingHorizontal: 20,
    lineHeight: 22,
  },
  iconsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    maxWidth: 320,
    marginBottom: 50,
  },
  iconWrapper: {
    alignItems: 'center',
    flex: 1,
  },
  iconCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  iconCircle1: {
    backgroundColor: '#EF4444',
  },
  iconCircle2: {
    backgroundColor: '#3B82F6',
  },
  iconCircle3: {
    backgroundColor: '#10B981',
  },
  iconLabel: {
    fontSize: 12,
    color: '#4B5563',
    fontWeight: '600',
    textAlign: 'center',
  },
  loadingContainer: {
    marginTop: 20,
  },
  loadingDots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#CD853F',
    marginHorizontal: 4,
  },
  footer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 50 : 30,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
    fontStyle: 'italic',
  },
});

