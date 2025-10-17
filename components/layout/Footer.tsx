import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import { usePathname, useRouter } from 'expo-router';
import { StyleSheet, TouchableOpacity, View } from "react-native";

export default function Footer() {
  const router = useRouter();
  const pathname = usePathname();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const menuItems = [
    {
      id: 'main',
      label: '메인화면',
      icon: 'home-outline' as keyof typeof Ionicons.glyphMap,
      activeIcon: 'home' as keyof typeof Ionicons.glyphMap,
      route: '/main',
    },
    {
      id: 'chat',
      label: '채팅',
      icon: 'chatbubble-outline' as keyof typeof Ionicons.glyphMap,
      activeIcon: 'chatbubble' as keyof typeof Ionicons.glyphMap,
      route: '/chat/chat-list',
    },
    {
      id: 'schedule',
      label: '일정',
      icon: 'calendar-outline' as keyof typeof Ionicons.glyphMap,
      activeIcon: 'calendar' as keyof typeof Ionicons.glyphMap,
      route: '/schedule',
    },
    {
      id: 'more',
      label: '더보기',
      icon: 'ellipsis-horizontal-outline' as keyof typeof Ionicons.glyphMap,
      activeIcon: 'ellipsis-horizontal' as keyof typeof Ionicons.glyphMap,
      route: '/more',
    },
  ];

  const handleMenuPress = (route: string) => {
    router.push(route);
  };

  const isActiveRoute = (route: string) => {
    if (route === '/main') {
      return pathname === '/' || pathname === '/main';
    }
    return pathname.startsWith(route);
  };

  const dynamicStyles = createStyles(colors, colorScheme);

  return (
    <ThemedView style={dynamicStyles.footerContainer}>
      <View style={dynamicStyles.menuContainer}>
        {menuItems.map((item) => {
          const isActive = isActiveRoute(item.route);
          return (
            <TouchableOpacity
              key={item.id}
              style={[dynamicStyles.menuItem, isActive && dynamicStyles.activeMenuItem]}
              onPress={() => handleMenuPress(item.route)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={isActive ? item.activeIcon : item.icon}
                size={30}
                color={isActive ? colors.tabIconSelected : colors.tabIconDefault}
                style={dynamicStyles.menuIcon}
              />
              {/* <ThemedText style={[dynamicStyles.menuLabel, isActive && dynamicStyles.activeMenuLabel]}>{item.label}</ThemedText> */}
            </TouchableOpacity>
          );
        })}
      </View>
    </ThemedView>
  );
}

const createStyles = (colors: typeof Colors.light, colorScheme: 'light' | 'dark' | null) => StyleSheet.create({
  footerContainer: {
    width: '100%',
    height: 70,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colorScheme === 'dark' ? '#333' : '#e0e0e0',
  },
  menuContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    flex: 1,
    paddingHorizontal: 16,
  },
  menuItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
  },
  activeMenuItem: {
    backgroundColor: colorScheme === 'dark' ? '#1a1a1a' : '#F0F8FF',
  },
  menuIcon: {
    marginBottom: 0,
  },
  menuLabel: {
    fontSize: 12,
    color: colors.tabIconDefault,
    textAlign: 'center',
  },
  activeMenuLabel: {
    color: colors.tabIconSelected,
    fontWeight: '600',
  },
});