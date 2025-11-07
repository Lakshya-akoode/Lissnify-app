import React, { useRef, useEffect, useImperativeHandle, forwardRef, useState } from 'react';
import {
  View,
  Animated,
  PanResponder,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Platform,
} from 'react-native';
import CustomDrawerContent from './CustomDrawerContent';

const DRAWER_WIDTH = 280;
const { width: SCREEN_WIDTH } = Dimensions.get('window');

const CustomDrawer = forwardRef(({ children, navigation, state, userType = 'listener' }, ref) => {
  const translateX = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const [isOpen, setIsOpen] = useState(false);

  const openDrawer = () => {
    if (isOpen) return;
    setIsOpen(true);
    Animated.spring(translateX, {
      toValue: 0,
      useNativeDriver: true,
      tension: 65,
      friction: 11,
    }).start();
  };

  const closeDrawer = () => {
    if (!isOpen) return;
    setIsOpen(false);
    Animated.spring(translateX, {
      toValue: -DRAWER_WIDTH,
      useNativeDriver: true,
      tension: 65,
      friction: 11,
    }).start();
  };

  const toggleDrawer = () => {
    if (isOpen) {
      closeDrawer();
    } else {
      openDrawer();
    }
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: (evt, gestureState) => {
        // Allow pan responder if drawer is open and touch is on the overlay
        return isOpen && evt.nativeEvent.pageX > DRAWER_WIDTH;
      },
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        // Allow pan responder if drawer is open and swiping right
        return isOpen && gestureState.dx > 0;
      },
      onPanResponderGrant: () => {
        translateX.setOffset(translateX._value);
      },
      onPanResponderMove: (evt, gestureState) => {
        const newValue = gestureState.dx;
        if (newValue > 0) {
          translateX.setValue(newValue);
        }
      },
      onPanResponderRelease: (evt, gestureState) => {
        translateX.flattenOffset();
        if (gestureState.dx > DRAWER_WIDTH / 3) {
          closeDrawer();
        } else {
          openDrawer();
        }
      },
    })
  ).current;

  // Expose drawer methods via ref and navigation
  useImperativeHandle(ref, () => ({
    openDrawer,
    closeDrawer,
    toggleDrawer,
  }));

  useEffect(() => {
    if (navigation) {
      navigation.openDrawer = openDrawer;
      navigation.closeDrawer = closeDrawer;
      navigation.toggleDrawer = toggleDrawer;
    }
  }, [navigation]);

  // Handle swipe from left edge to open drawer
  const edgePanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: (evt, gestureState) => {
        // Only respond to touches near the left edge when drawer is closed
        return !isOpen && evt.nativeEvent.pageX < 20;
      },
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        // Only respond to rightward swipes when drawer is closed
        return !isOpen && gestureState.dx > 10;
      },
      onPanResponderGrant: () => {
        translateX.setOffset(-DRAWER_WIDTH);
        translateX.setValue(0);
      },
      onPanResponderMove: (evt, gestureState) => {
        const newValue = gestureState.dx;
        if (newValue > 0 && newValue <= DRAWER_WIDTH) {
          translateX.setValue(newValue);
        }
      },
      onPanResponderRelease: (evt, gestureState) => {
        translateX.flattenOffset();
        if (gestureState.dx > DRAWER_WIDTH / 3) {
          openDrawer();
        } else {
          closeDrawer();
        }
      },
    })
  ).current;

  const overlayOpacity = translateX.interpolate({
    inputRange: [-DRAWER_WIDTH, 0],
    outputRange: [0, 0.5],
    extrapolate: 'clamp',
  });

  return (
    <View style={styles.container}>
      {/* Main Content */}
      <View style={styles.content} {...edgePanResponder.panHandlers}>
        {children}
      </View>

      {/* Overlay */}
      {isOpen && (
        <Animated.View
          style={[
            styles.overlay,
            {
              opacity: overlayOpacity,
            },
          ]}
          {...panResponder.panHandlers}
        >
          <TouchableOpacity
            style={styles.overlayTouchable}
            activeOpacity={1}
            onPress={closeDrawer}
          />
        </Animated.View>
      )}

      {/* Drawer */}
      <Animated.View
        style={[
          styles.drawer,
          {
            transform: [{ translateX }],
          },
        ]}
      >
        <CustomDrawerContent
          navigation={navigation}
          state={state}
          closeDrawer={closeDrawer}
          userType={userType}
        />
      </Animated.View>
    </View>
  );
});

CustomDrawer.displayName = 'CustomDrawer';

export default CustomDrawer;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
  },
  overlayTouchable: {
    flex: 1,
  },
  drawer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: DRAWER_WIDTH,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 1000,
  },
});

