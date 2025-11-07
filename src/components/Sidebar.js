import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  Image,
  Platform,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {
  LayoutDashboard,
  MessageCircle,
  Users,
  User,
  Menu,
  X,
  LogOut,
} from 'lucide-react-native';
import Images from '../Assets';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function Sidebar({ visible, onClose, navigation, currentScreen }) {
  const menuItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      screen: 'ListenerDashboard',
    },
    {
      id: 'chats',
      label: 'Chats',
      icon: MessageCircle,
      screen: 'Chats',
    },
    {
      id: 'community',
      label: 'Community',
      icon: Users,
      screen: 'Community',
    },
    {
      id: 'profile',
      label: 'Profile',
      icon: User,
      screen: 'Profile',
    },
  ];

  const handleNavigation = (screen) => {
    if (navigation && screen !== currentScreen) {
      navigation.navigate(screen);
    }
    onClose();
  };

  const handleLogout = async () => {
    onClose();
    await AsyncStorage.removeItem('adminToken');
    if (navigation) {
      navigation.replace('Login');
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={styles.sidebar}>
          <LinearGradient
            colors={['#FFF8B5', '#FFB88C']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.header}
          >
            <View style={styles.headerContent}>
              <Image source={Images.logo} style={styles.logo} resizeMode="contain" />
              <Text style={styles.headerTitle}>Lissnify</Text>
              <Text style={styles.headerSubtitle}>Mental Wellness</Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <X size={24} color="#111827" />
            </TouchableOpacity>
          </LinearGradient>

          <ScrollView style={styles.menu} showsVerticalScrollIndicator={false}>
            {menuItems.map((item) => {
              const IconComponent = item.icon;
              const isActive = currentScreen === item.screen;
              
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.menuItem, isActive && styles.menuItemActive]}
                  onPress={() => handleNavigation(item.screen)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.menuIconContainer, isActive && styles.menuIconContainerActive]}>
                    <IconComponent
                      size={22}
                      color={isActive ? '#FFFFFF' : '#6B7280'}
                    />
                  </View>
                  <Text style={[styles.menuLabel, isActive && styles.menuLabelActive]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.logoutButton}
              onPress={handleLogout}
              activeOpacity={0.7}
            >
              <LogOut size={20} color="#EF4444" />
              <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    flexDirection: 'row',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  sidebar: {
    width: 280,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingBottom: 24,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  headerContent: {
    alignItems: 'center',
    marginTop: 8,
  },
  logo: {
    width: 60,
    height: 60,
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#4B5563',
  },
  closeButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 30,
    right: 20,
    padding: 4,
  },
  menu: {
    flex: 1,
    paddingTop: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginHorizontal: 12,
    marginVertical: 4,
    borderRadius: 12,
  },
  menuItemActive: {
    backgroundColor: '#FFF8E7',
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuIconContainerActive: {
    backgroundColor: '#F97316',
  },
  menuLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6B7280',
  },
  menuLabelActive: {
    color: '#111827',
    fontWeight: '600',
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: '#FEF2F2',
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#EF4444',
    marginLeft: 12,
  },
});

