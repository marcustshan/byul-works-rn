import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { selectTotalUnread } from '@/selectors/chat/chatSelectors';
import { useAppSelector } from '@/store/hooks';
import { Ionicons } from '@expo/vector-icons';
import { usePathname, useRouter } from 'expo-router';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { ThemedText } from '../themed-text';

type RouteMatcher = string | RegExp;

type MenuItem = {
  id: 'main' | 'chat' | 'schedule' | 'more';
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  activeIcon: keyof typeof Ionicons.glyphMap;
  route: string;              // 기본 이동 경로 (push용)
  matchers?: RouteMatcher[];  // 활성 판단용 경로/패턴들
};

export default function Footer() {
  const router = useRouter();
  const pathname = usePathname();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const menuItems: MenuItem[] = [
    {
      id: 'main',
      label: '메인화면',
      icon: 'home-outline',
      activeIcon: 'home',
      route: '/main',
      // '/' 또는 '/main' 및 그 하위 경로 모두 활성
      matchers: ['/main', /^\/main(\/|$)/],
    },
    {
      id: 'chat',
      label: '채팅',
      icon: 'chatbubble-outline',
      activeIcon: 'chatbubble',
      route: '/chat/chat-room-list',
      // /chat 전체 섹션 활성 (예: /chat, /chat/room/123 등)
      matchers: ['/chat', /^\/chat(\/|$)/],
    },
    {
      id: 'schedule',
      label: '일정',
      icon: 'calendar-outline',
      activeIcon: 'calendar',
      route: '/schedule/schedule',
      matchers: ['/schedule', /^\/schedule(\/|$)/],
    },
    {
      id: 'more',
      label: '더보기',
      icon: 'ellipsis-horizontal-outline',
      activeIcon: 'ellipsis-horizontal',
      route: '/more',
      matchers: ['/more', /^\/more(\/|$)/],
    },
  ];

  const handleMenuPress = (route: string) => router.push(route);

  const matchPath = (path: string, matcher: RouteMatcher) => {
    if (typeof matcher === 'string') {
      // 완전일치 혹은 하위 경로(prefix + '/')
      return path === matcher || path.startsWith(matcher.endsWith('/') ? matcher : matcher + '/');
    }
    return matcher.test(path);
  };

  const isActiveRoute = (item: MenuItem) => {
    if (item.matchers?.length) {
      return item.matchers.some((m) => matchPath(pathname, m));
    }
    // matchers가 없으면 route prefix로 판단
    return matchPath(pathname, item.route);
  };

  const newMessageCount = useAppSelector(selectTotalUnread);

  const dynamicStyles = createStyles(colors, colorScheme);

  const formatCount = (n: number) => (n > 99 ? '99+' : String(n));

  return (
    <ThemedView style={dynamicStyles.footerContainer}>
      <View style={dynamicStyles.menuContainer}>
        {menuItems.map((item) => {
          const active = isActiveRoute(item);
          const showBadge = item.id === 'chat' && newMessageCount > 0;

          return (
            <TouchableOpacity
              key={item.id}
              style={[dynamicStyles.menuItem, active && dynamicStyles.activeMenuItem]}
              onPress={() => handleMenuPress(item.route)}
              activeOpacity={0.7}
              hitSlop={{ top: 6, bottom: 6, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel={`${item.label}${showBadge ? `, 새 메시지 ${formatCount(newMessageCount)}개` : ''}`}
            >
              <View style={dynamicStyles.iconWrapper}>
                <Ionicons
                  name={active ? item.activeIcon : item.icon}
                  size={30}
                  color={active ? colors.tabIconSelected : colors.tabIconDefault}
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
              {/* 라벨 필요 시 사용
              <ThemedText style={[dynamicStyles.menuLabel, active && dynamicStyles.activeMenuLabel]}>
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
    // ---- Badge styles ----
    badgeOuter: {
      position: 'absolute',
      top: -4,
      right: -2,
      backgroundColor: colors.background,
      borderRadius: 10,
      padding: 1.5,
    },
    badgeInner: {
      minWidth: 18,
      paddingHorizontal: 4,
      height: 18,
      borderRadius: 9,
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
