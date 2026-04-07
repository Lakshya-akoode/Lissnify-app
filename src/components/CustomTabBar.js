
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Animated, Dimensions } from 'react-native';
import { BlurView } from '@react-native-community/blur';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

const CustomTabBar = ({ state, descriptors, navigation }) => {
    const insets = useSafeAreaInsets();

    // Animation values for each tab
    // optimizing by creating refs dynamically might be complex, so we'll map simple animated values
    // A improved approach: simple state-based scale animation on press

    return (
        <View style={[styles.tabBarContainer, { paddingBottom: insets.bottom > 0 ? insets.bottom : 20 }]}>
            {/* Blur Background */}
            <View style={styles.blurContainer}>
                {Platform.OS === 'ios' ? (
                    <BlurView
                        style={styles.absolute}
                        blurType="light"
                        blurAmount={20}
                        reducedTransparencyFallbackColor="white"
                    />
                ) : (
                    <View style={[styles.absolute, { backgroundColor: 'rgba(255,255,255,0.9)' }]} />
                )}

                {/* Tab Items */}
                <View style={styles.tabItemsContainer}>
                    {state.routes.map((route, index) => {
                        const { options } = descriptors[route.key];
                        const label =
                            options.tabBarLabel !== undefined
                                ? options.tabBarLabel
                                : options.title !== undefined
                                    ? options.title
                                    : route.name;

                        const isFocused = state.index === index;

                        const onPress = () => {
                            const event = navigation.emit({
                                type: 'tabPress',
                                target: route.key,
                                canPreventDefault: true,
                            });

                            if (!isFocused && !event.defaultPrevented) {
                                navigation.navigate(route.name);
                            }
                        };

                        const onLongPress = () => {
                            navigation.emit({
                                type: 'tabLongPress',
                                target: route.key,
                            });
                        };

                        const Icon = options.tabBarIcon;

                        return (
                            <TouchableOpacity
                                key={index}
                                accessibilityRole="button"
                                accessibilityState={isFocused ? { selected: true } : {}}
                                accessibilityLabel={options.tabBarAccessibilityLabel}
                                testID={options.tabBarTestID}
                                onPress={onPress}
                                onLongPress={onLongPress}
                                style={styles.tabItem}
                                activeOpacity={0.7}
                            >
                                <Animated.View style={[
                                    styles.iconContainer,
                                    isFocused && styles.activeIconContainer
                                ]}>
                                    {isFocused ? (
                                        <LinearGradient
                                            colors={['#CD853F', '#D2691E']}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 1, y: 1 }}
                                            style={StyleSheet.absoluteFillObject}
                                        />
                                    ) : null}

                                    <Icon
                                        color={isFocused ? '#FFFFFF' : '#9CA3AF'}
                                        size={24}
                                    />
                                </Animated.View>

                                {isFocused && (
                                    <Text style={styles.label}>
                                        {label}
                                    </Text>
                                )}
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    tabBarContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        alignItems: 'center',
        justifyContent: 'flex-end',
        pointerEvents: 'box-none',
    },
    blurContainer: {
        width: width * 0.92,
        height: 70,
        borderRadius: 35,
        overflow: 'hidden', // Ensures BlurView respects border radius
        backgroundColor: Platform.OS === 'android' ? 'transparent' : 'rgba(255,255,255,0.1)', // Subtle white tint for glass effect
        marginBottom: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
        elevation: 8,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.5)',
    },
    absolute: {
        ...StyleSheet.absoluteFillObject,
    },
    tabItemsContainer: {
        flexDirection: 'row',
        height: '100%',
        width: '100%',
        alignItems: 'center',
        justifyContent: 'space-around',
    },
    tabItem: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
    },
    iconContainer: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden', // for LinearGradient
    },
    activeIconContainer: {
        transform: [{ translateY: -4 }],
        shadowColor: '#CD853F',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    label: {
        fontSize: 10,
        fontWeight: '700',
        color: '#CD853F',
        marginTop: 2,
    }
});

export default CustomTabBar;
