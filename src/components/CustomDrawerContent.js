import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
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
  LogOut,
} from 'lucide-react-native';
import Images from '../Assets';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function CustomDrawerContent(props) {
  const { navigation, state, closeDrawer, userType = 'listener' } = props;
  const isSeeker = userType === 'seeker';
  const defaultRoute = isSeeker ? 'SeekerDashboard' : 'ListenerDashboard';
  const currentRoute = state?.routes[state?.index]?.name || defaultRoute;

  const menuItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      screen: isSeeker ? 'SeekerDashboard' : 'ListenerDashboard',
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
    if (navigation && screen !== currentRoute) {
      navigation.navigate(screen);
    }
    if (closeDrawer) {
      closeDrawer();
    }
  };

  const handleLogout = async () => {
    if (closeDrawer) {
      closeDrawer();
    }
    await AsyncStorage.removeItem('adminToken');
    if (navigation) {
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#FFF8B5', '#FFB88C']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <Image source={Images.logo} style={styles.logo} resizeMode="center" />
        </View>
      </LinearGradient>

      <ScrollView style={styles.menu} showsVerticalScrollIndicator={false}>
        {menuItems.map((item) => {
          const IconComponent = item.icon;
          const isActive = currentRoute === item.screen;

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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingBottom: 24,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  headerContent: {
    paddingLeft:10,
    justifyContent:'center',
    marginTop: 8,
    width:100,
    height:100,
  },
  logo: {
    width: 200,
    height: 200,
    marginBottom: 0,
    
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

