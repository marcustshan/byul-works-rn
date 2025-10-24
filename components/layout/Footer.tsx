import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAppSelector } from '@/store/hooks';
import { Ionicons } from '@expo/vector-icons';
import { usePathname, useRouter } from 'expo-router';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { ThemedText } from '../themed-text';

export default function Footer() {
  const router = useRouter();
  const pathname = usePathname();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const menuItems = [
    { id: 'main', label: '메인화면', icon: 'home-outline' as keyof typeof Ionicons.glyphMap, activeIcon: 'home' as keyof typeof Ionicons.glyphMap, route: '/main' },
    { id: 'chat', label: '채팅', icon: 'chatbubble-outline' as keyof typeof Ionicons.glyphMap, activeIcon: 'chatbubble' as keyof typeof Ionicons.glyphMap, route: '/chat/chat-room-list' },
    { id: 'schedule', label: '일정', icon: 'calendar-outline' as keyof typeof Ionicons.glyphMap, activeIcon: 'calendar' as keyof typeof Ionicons.glyphMap, route: '/schedule' },
    { id: 'more', label: '더보기', icon: 'ellipsis-horizontal-outline' as keyof typeof Ionicons.glyphMap, activeIcon: 'ellipsis-horizontal' as keyof typeof Ionicons.glyphMap, route: '/more' },
  ];

  const handleMenuPress = (route: string) => router.push(route);

  const isActiveRoute = (route: string) => {
    if (route === '/main') {
      return pathname === '/' || pathname === '/main';
    }
    return pathname.startsWith(route);
  };

  const newMessageCount = useAppSelector((s) => s.chatRoom.newMessageCount ?? 0);

  const dynamicStyles = createStyles(colors, colorScheme);

  const formatCount = (n: number) => (n > 99 ? '99+' : String(n));

  return (
    <ThemedView style={dynamicStyles.footerContainer}>
      <View style={dynamicStyles.menuContainer}>
        {menuItems.map((item) => {
          const isActive = isActiveRoute(item.route);
          const showBadge = item.id === 'chat' && newMessageCount > 0;

          return (
            <TouchableOpacity
              key={item.id}
              style={[dynamicStyles.menuItem, isActive && dynamicStyles.activeMenuItem]}
              onPress={() => handleMenuPress(item.route)}
              activeOpacity={0.7}
              hitSlop={{ top: 6, bottom: 6, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel={`${item.label}${showBadge ? `, 새 메시지 ${newMessageCount}개` : ''}`}
            >
              <View style={dynamicStyles.iconWrapper}>
                <Ionicons
                  name={isActive ? item.activeIcon : item.icon}
                  size={30}
                  color={isActive ? colors.tabIconSelected : colors.tabIconDefault}
                  style={dynamicStyles.menuIcon}
                />
                {showBadge && (
                  <View style={dynamicStyles.badgeOuter}>
                    <View style={dynamicStyles.badgeInner}>
                      <ThemedText style={dynamicStyles.badgeText}>
                        {formatCount(newMessageCount)}
                      </ThemedText>
                    </View>
                  </View>
                )}
              </View>
              {/* 라벨이 필요하면 아래 주석 해제
              <ThemedText style={[dynamicStyles.menuLabel, isActive && dynamicStyles.activeMenuLabel]}>
                {item.label}
              </ThemedText>
              */}
            </TouchableOpacity>
          );
        })}
      </View>
    </ThemedView>
  );
}

const createStyles = (colors: typeof Colors.light, colorScheme: 'light' | 'dark' | null) =>
  StyleSheet.create({
    footerContainer: {
      width: '100%',
      height: 70,
      backgroundColor: colors.background,
      borderTopWidth: 1,
      borderTopColor: colorScheme === 'dark' ? '#2a2a2a' : colors.border ?? '#e0e0e0',
    },
    menuContainer: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      alignItems: 'center',
      flex: 1,
      paddingHorizontal: 12,
    },
    menuItem: {
      alignItems: 'center',
      justifyContent: 'center',
      flex: 1,
      paddingVertical: 8,
      borderRadius: 8,
    },
    activeMenuItem: {
      backgroundColor: colorScheme === 'dark' ? '#121212' : colors.surfaceMuted ?? '#F0F8FF',
    },
    iconWrapper: {
      position: 'relative',
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: 40,
      minHeight: 34,
    },
    menuIcon: {
      marginBottom: 0,
    },
    menuLabel: {
      fontSize: 12,
      color: colors.tabIconDefault,
      textAlign: 'center',
      marginTop: 4,
    },
    activeMenuLabel: {
      color: colors.tabIconSelected,
      fontWeight: '600',
    },
    // ---- Badge styles (light/dark 대응) ----
    badgeOuter: {
      position: 'absolute',
      top: -4,
      right: -2,
      // 바탕색과 동일한 아웃라인을 넣어 배지를 또렷하게 (다크/라이트 공통)
      backgroundColor: colors.background,
      borderRadius: 10,
      padding: 1.5,
    },
    badgeInner: {
      minWidth: 18,
      paddingHorizontal: 4,
      height: 18,
      borderRadius: 9,
      // 다크에서 조금 더 선명한 레드, 라이트에선 살짝 낮춘 레드톤
      backgroundColor: colorScheme === 'dark' ? '#ff4d4f' : '#e02424',
      alignItems: 'center',
      justifyContent: 'center',
    },
    badgeText: {
      color: '#fff',
      fontSize: 11,
      fontWeight: '700',
      lineHeight: 14,
    },
  });
