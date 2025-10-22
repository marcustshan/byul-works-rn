import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { RootState } from '@/store';
import { clearUserInfo } from '@/store/authSlice';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { clearAutoLoginInfo } from '@/utils/auth';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Animated, Dimensions, Image, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

export default function MoreScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const router = useRouter();
  const dispatch = useAppDispatch();
  
  // Redux에서 사용자 정보와 메뉴 리스트 가져오기
  const userInfo = useAppSelector((state: RootState) => state.auth.userInfo);
  const menuList = useAppSelector((state: RootState) => state.menu.menuList);
  
  // 메뉴 확장/축소 상태 관리
  const [expandedMenus, setExpandedMenus] = useState<Set<number>>(new Set());

  const dynamicStyles = createStyles(colors, colorScheme ?? 'light');

  // 로그아웃 함수
  const handleLogout = () => {
    Alert.alert(
      '로그아웃',
      '로그아웃 하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        { text: '로그아웃', onPress: async () => {
          await dispatch(clearUserInfo());
          await clearAutoLoginInfo();
          router.replace('/login');
        } }
      ]
    );
  };

  // 입사일로부터 경과 기간 계산 함수
  const calculateWorkPeriod = (entryDate: string): string => {
    try {
      const entry = new Date(entryDate);
      const now = new Date();
      
      // 날짜 차이 계산 (밀리초 단위)
      const diffTime = now.getTime() - entry.getTime();
      
      // 년, 월, 일 계산
      const diffYears = Math.floor(diffTime / (365.25 * 24 * 60 * 60 * 1000));
      const diffMonths = Math.floor((diffTime % (365.25 * 24 * 60 * 60 * 1000)) / (30.44 * 24 * 60 * 60 * 1000));
      const diffDays = Math.floor((diffTime % (30.44 * 24 * 60 * 60 * 1000)) / (24 * 60 * 60 * 1000));
      
      // 결과 문자열 생성
      if (diffYears > 0) {
        if (diffMonths > 0) {
          return `${diffYears}년 ${diffMonths}개월`;
        } else {
          return `${diffYears}년`;
        }
      } else if (diffMonths > 0) {
        if (diffDays > 0) {
          return `${diffMonths}개월 ${diffDays}일`;
        } else {
          return `${diffMonths}개월`;
        }
      } else {
        return `${diffDays}일`;
      }
    } catch (error) {
      return '계산 불가';
    }
  };

  // 사용자 프로필 렌더링
  const renderUserProfile = () => {
    if (!userInfo?.member) return null;

    const { member } = userInfo;

    
    
    return (
      <ThemedView style={dynamicStyles.profileContainer}>
        <View style={dynamicStyles.profileHeader}>
          <View style={dynamicStyles.profileImageContainer}>
            {member.profileImgId ? (
              <Image 
                source={{ uri: member.profileImgId }} 
                style={dynamicStyles.profileImage}
              />
            ) : (
              <View style={[dynamicStyles.profileImagePlaceholder, { backgroundColor: member.profileColor || colors.tint }]}>
                <ThemedText style={dynamicStyles.profileImageText}>
                  {member.name.charAt(0)}
                </ThemedText>
              </View>
            )}
          </View>
          <View style={dynamicStyles.profileInfo}>
            <ThemedText style={dynamicStyles.profileName}>{member.name}</ThemedText>
            <ThemedText style={dynamicStyles.profilePosition}>
              {member.position || '직책 정보 없음'}
            </ThemedText>
          </View>
          <TouchableOpacity 
            style={dynamicStyles.logoutButton}
            onPress={handleLogout}
            activeOpacity={0.7}
          >
            <Ionicons name="log-out-outline" size={24} color={colorScheme === 'dark' ? '#ff6b6b' : '#ff4757'} />
          </TouchableOpacity>
        </View>
        
        <View style={dynamicStyles.profileDetails}>
          <View style={dynamicStyles.detailRow}>
            <Ionicons name="mail-outline" size={18} color={colorScheme === 'dark' ? '#4a9eff' : '#007AFF'} />
            <ThemedText style={dynamicStyles.detailText}>{member.email || '이메일 정보 없음'}</ThemedText>
          </View>
          <View style={dynamicStyles.detailRow}>
            <Ionicons name="call-outline" size={18} color={colorScheme === 'dark' ? '#4a9eff' : '#007AFF'} />
            <ThemedText style={dynamicStyles.detailText}>{member.phone || '전화번호 정보 없음'}</ThemedText>
          </View>
          <View style={dynamicStyles.detailRow}>
            <Ionicons name="calendar-outline" size={18} color={colorScheme === 'dark' ? '#4a9eff' : '#007AFF'} />
            <ThemedText style={dynamicStyles.detailText}>
              입사일: {member.entryDate ? member.entryDate : '정보 없음'}
              {member.entryDate && (
                <ThemedText style={dynamicStyles.workPeriodText}>
                  {' '}({calculateWorkPeriod(member.entryDate)})
                </ThemedText>
              )}
            </ThemedText>
          </View>
        </View>
      </ThemedView>
    );
  };

  // 메뉴 토글 함수
  const toggleMenu = (menuSeq: number) => {
    setExpandedMenus(prev => {
      const newSet = new Set(prev);
      if (newSet.has(menuSeq)) {
        newSet.delete(menuSeq);
      } else {
        newSet.add(menuSeq);
      }
      return newSet;
    });
  };

  // 메뉴 아이템 렌더링
  const renderMenuItem = (item: any, level: number = 0) => {
    if (!item.isUse) return null;

    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedMenus.has(item.menuSeq);

    const handleMenuPress = () => {
      if (hasChildren) {
        toggleMenu(item.menuSeq);
      } else if (item.path) {
        router.push(item.path);
      }
    };

    return (
      <View key={item.menuSeq}>
        <TouchableOpacity
          style={[dynamicStyles.menuItem, { paddingLeft: 24 + (level * 20) }]}
          onPress={handleMenuPress}
          activeOpacity={0.6}
        >
          <View style={dynamicStyles.menuItemContent}>
            <ThemedText style={dynamicStyles.menuItemText}>{item.name}</ThemedText>
            {hasChildren ? (
              <Animated.View
                style={{
                  transform: [{ rotate: isExpanded ? '90deg' : '0deg' }],
                }}
              >
                <Ionicons 
                  name="chevron-forward" 
                  size={18} 
                  color={colorScheme === 'dark' ? '#4a9eff' : '#007AFF'}
                  style={dynamicStyles.menuArrow}
                />
              </Animated.View>
            ) : item.path ? (
              <Ionicons 
                name="chevron-forward" 
                size={18} 
                color={colorScheme === 'dark' ? '#666' : '#999'}
                style={dynamicStyles.menuArrow}
              />
            ) : null}
          </View>
        </TouchableOpacity>
        
        {/* 하위 메뉴 렌더링 */}
        {hasChildren && isExpanded && (
          <View style={dynamicStyles.subMenuContainer}>
            {[...item.children]
              .sort((a: any, b: any) => a.sortOrder - b.sortOrder)
              .map((child: any) => renderMenuItem(child, level + 1))}
          </View>
        )}
      </View>
    );
  };

  // 메뉴 리스트 렌더링
  const renderMenuList = () => {
    if (!menuList || menuList.length === 0) {
      return (
        <ThemedView style={dynamicStyles.emptyContainer}>
          <ThemedText style={dynamicStyles.emptyText}>메뉴 정보가 없습니다.</ThemedText>
        </ThemedView>
      );
    }

    return (
      <ThemedView style={dynamicStyles.menuContainer}>
        <ThemedText style={dynamicStyles.menuSectionTitle}>메뉴</ThemedText>
        {[...menuList]
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((item) => renderMenuItem(item))}
      </ThemedView>
    );
  };

  return (
    <ScrollView style={dynamicStyles.container} showsVerticalScrollIndicator={false}>
      {renderUserProfile()}
      {renderMenuList()}
    </ScrollView>
  );
}

const { width } = Dimensions.get('window');

const createStyles = (colors: typeof Colors.light, colorScheme: 'light' | 'dark' | null) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colorScheme === 'dark' ? '#0a0a0a' : '#f5f7fa',
  },
  profileContainer: {
    margin: 20,
    marginBottom: 16,
    padding: 24,
    borderRadius: 20,
    backgroundColor: colorScheme === 'dark' ? '#1a1a1a' : '#ffffff',
    shadowColor: colorScheme === 'dark' ? '#000' : '#000',
    shadowOffset: {
      width: 0,
      height: colorScheme === 'dark' ? 4 : 8,
    },
    shadowOpacity: colorScheme === 'dark' ? 0.3 : 0.1,
    shadowRadius: colorScheme === 'dark' ? 8 : 16,
    elevation: colorScheme === 'dark' ? 8 : 12,
    borderWidth: colorScheme === 'dark' ? 1 : 0,
    borderColor: colorScheme === 'dark' ? '#2a2a2a' : 'transparent',
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  profileImageContainer: {
    marginRight: 20,
    shadowColor: colorScheme === 'dark' ? '#000' : '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: colorScheme === 'dark' ? 0.3 : 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  profileImage: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 3,
    borderColor: colorScheme === 'dark' ? '#333' : '#e8e8e8',
  },
  profileImagePlaceholder: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: colorScheme === 'dark' ? '#333' : '#e8e8e8',
  },
  profileImageText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  profileInfo: {
    flex: 1,
  },
  logoutButton: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: colorScheme === 'dark' ? '#2a2a2a' : '#f8f9fa',
    shadowColor: colorScheme === 'dark' ? '#000' : '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: colorScheme === 'dark' ? 0.2 : 0.1,
    shadowRadius: 4,
    elevation: 4,
    borderWidth: colorScheme === 'dark' ? 1 : 0,
    borderColor: colorScheme === 'dark' ? '#3a3a3a' : 'transparent',
  },
  profileName: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 6,
    color: colors.text,
    letterSpacing: 0.5,
  },
  profilePosition: {
    fontSize: 15,
    color: colorScheme === 'dark' ? '#a0a0a0' : '#666',
    marginBottom: 4,
    fontWeight: '500',
  },
  profileDetails: {
    borderTopWidth: 1,
    borderTopColor: colorScheme === 'dark' ? '#2a2a2a' : '#f0f0f0',
    paddingTop: 20,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingVertical: 4,
  },
  detailText: {
    marginLeft: 12,
    fontSize: 15,
    color: colorScheme === 'dark' ? '#b0b0b0' : '#555',
    fontWeight: '400',
    flex: 1,
  },
  workPeriodText: {
    fontSize: 13,
    color: colorScheme === 'dark' ? '#4a9eff' : '#007AFF',
    fontWeight: '600',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: 'hidden',
  },
  menuContainer: {
    margin: 20,
    marginTop: 0,
    borderRadius: 20,
    backgroundColor: colorScheme === 'dark' ? '#1a1a1a' : '#ffffff',
    shadowColor: colorScheme === 'dark' ? '#000' : '#000',
    shadowOffset: {
      width: 0,
      height: colorScheme === 'dark' ? 4 : 8,
    },
    shadowOpacity: colorScheme === 'dark' ? 0.3 : 0.1,
    shadowRadius: colorScheme === 'dark' ? 8 : 16,
    elevation: colorScheme === 'dark' ? 8 : 12,
    borderWidth: colorScheme === 'dark' ? 1 : 0,
    borderColor: colorScheme === 'dark' ? '#2a2a2a' : 'transparent',
    overflow: 'hidden',
  },
  menuSectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    padding: 24,
    paddingBottom: 16,
    color: colors.text,
    letterSpacing: 0.5,
    backgroundColor: colorScheme === 'dark' ? '#222' : '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: colorScheme === 'dark' ? '#2a2a2a' : '#f0f0f0',
  },
  menuItem: {
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: colorScheme === 'dark' ? '#2a2a2a' : '#f5f5f5',
    backgroundColor: 'transparent',
  },
  menuItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  menuIcon: {
    marginRight: 16,
  },
  menuItemText: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  menuArrow: {
    marginLeft: 12,
    opacity: 0.7,
  },
  subMenuContainer: {
    backgroundColor: colorScheme === 'dark' ? '#111' : '#f8f9fa',
    borderLeftWidth: 3,
    borderLeftColor: colorScheme === 'dark' ? '#4a9eff' : '#007AFF',
    marginLeft: 12,
    borderRadius: 0,
    shadowColor: colorScheme === 'dark' ? '#000' : '#000',
    shadowOffset: {
      width: 2,
      height: 0,
    },
    shadowOpacity: colorScheme === 'dark' ? 0.2 : 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  emptyContainer: {
    margin: 20,
    padding: 32,
    borderRadius: 20,
    backgroundColor: colorScheme === 'dark' ? '#1a1a1a' : '#ffffff',
    alignItems: 'center',
    shadowColor: colorScheme === 'dark' ? '#000' : '#000',
    shadowOffset: {
      width: 0,
      height: colorScheme === 'dark' ? 4 : 8,
    },
    shadowOpacity: colorScheme === 'dark' ? 0.3 : 0.1,
    shadowRadius: colorScheme === 'dark' ? 8 : 16,
    elevation: colorScheme === 'dark' ? 8 : 12,
    borderWidth: colorScheme === 'dark' ? 1 : 0,
    borderColor: colorScheme === 'dark' ? '#2a2a2a' : 'transparent',
  },
  emptyText: {
    fontSize: 16,
    color: colorScheme === 'dark' ? '#a0a0a0' : '#666',
    fontWeight: '500',
    textAlign: 'center',
  },
});

