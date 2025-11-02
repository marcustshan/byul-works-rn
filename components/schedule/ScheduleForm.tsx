import dayjs from 'dayjs';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Calendar } from 'react-native-calendars';

import { Member } from '@/api/member/memberService';
import { Schedule } from '@/api/schedule/scheduleService';
import { useThemeColor } from '@/hooks/useThemeColor';

/**********************
 * Types
 **********************/
export type ScheduleFormMode = 'create' | 'edit';

interface ScheduleFormProps {
  mode: ScheduleFormMode;
  initialData?: Partial<Schedule>;
  members: Member[];
  scheduleCodes?: any[]; // optional: 심플 버전에서는 생략 가능
  currentUser?: any;
  onSave: (data: any) => Promise<void>;
  onCancel: () => void;
  onDelete?: (scheduleSeq: number, isPersonal: boolean) => Promise<void>;
}

/**********************
 * Component
 **********************/
export default function ScheduleForm({
  mode,
  initialData,
  members,
  scheduleCodes = [],
  currentUser,
  onSave,
  onCancel,
  onDelete,
}: ScheduleFormProps) {
  // theme
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const borderColor = useThemeColor({}, 'border');
  const cardBg = useThemeColor({}, 'surface');
  const tint = useThemeColor({}, 'tint');
  const inputBg = useThemeColor({}, 'surface');
  const disabledBg = useThemeColor({}, 'surfaceSecondary');

  /**********************
   * Form State (minimal yet compatible with screen)
   **********************/
  const [formData, setFormData] = useState({
    scheduleType: '일반일정' as '일반일정' | '개인일정',
    scheduleCodeSeq: null as number | null,
    startDate: dayjs().format('YYYY-MM-DD'),
    startTime: '09:00',
    endDate: dayjs().format('YYYY-MM-DD'),
    endTime: '18:00',
    isAllDay: false,
    place: '',
    memo: '',
    title: '',
    // 개인일정 전용
    targetMemberSeq: (currentUser?.memberSeq as number | undefined) ?? null,
    personalScheduleType: '',
    notificationEnabled: true,
    // 일반일정 전용
    selectedNotifications: [] as string[],
    status: false,
    sendAlarm: false,
  });

  const [isScheduleCodeOpen, setIsScheduleCodeOpen] = useState(false);
  const [isMemberOpen, setIsMemberOpen] = useState(false);
  const [isPersonalTypeOpen, setIsPersonalTypeOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [memberQuery, setMemberQuery] = useState('');

  // date/time picker
  const [isDatePickerVisible, setIsDatePickerVisible] = useState(false);
  const [isTimePickerVisible, setIsTimePickerVisible] = useState(false);
  const [pickerType, setPickerType] = useState<
    'startDate' | 'endDate' | 'startTime' | 'endTime' | null
  >(null);

  // temp time selection (scroll pickers)
  const [tempHour, setTempHour] = useState(9);
  const [tempMinute, setTempMinute] = useState(0);
  const hourListRef = useRef<FlatList<number>>(null);
  const minuteListRef = useRef<FlatList<number>>(null);

  /**********************
   * Derived
   **********************/
  const personalScheduleTypes = useMemo(
    () => [
      { value: 'DAY', label: '연차' },
      { value: 'MORNING', label: '오전반차' },
      { value: 'AFTERNOON', label: '오후반차' },
    ],
    []
  );

  const notificationOptions = useMemo(
    () => [
      { value: '1시간 전', label: '1시간 전', isAllDay: false },
      { value: '1일 전', label: '1일 전', isAllDay: false },
      { value: '당일 아침 8시', label: '당일 아침 8시', isAllDay: true },
      { value: '전날 저녁 8시', label: '전날 저녁 8시', isAllDay: true },
    ],
    []
  );

  const filteredNotifications = useMemo(
    () => notificationOptions.filter((n) => n.isAllDay === formData.isAllDay),
    [notificationOptions, formData.isAllDay]
  );

  const filteredMembers = useMemo(
    () =>
      members.filter(
        (m) =>
          m.name.toLowerCase().includes(memberQuery.toLowerCase()) ||
          (m.department?.toLowerCase().includes(memberQuery.toLowerCase()) ?? false)
      ),
    [members, memberQuery]
  );

  /**********************
   * Init for edit mode
   **********************/
  useEffect(() => {
    if (mode !== 'edit' || !initialData) return;
    const isPersonal = (initialData as any).isPersonal || (initialData as any).personal;
    const start = initialData.startDate ? dayjs(initialData.startDate) : dayjs();
    const end = initialData.endDate ? dayjs(initialData.endDate) : start;

    setFormData((prev) => ({
      ...prev,
      scheduleType: isPersonal ? '개인일정' : '일반일정',
      scheduleCodeSeq: (initialData as any).scheduleCodeSeq ?? null,
      startDate: start.format('YYYY-MM-DD'),
      startTime: start.format('HH:mm'),
      endDate: end.format('YYYY-MM-DD'),
      endTime: end.format('HH:mm'),
      isAllDay: !!initialData.isAllDay,
      place: initialData.place ?? '',
      memo: initialData.memo ?? '',
      title: initialData.title ?? '',
      targetMemberSeq: isPersonal
        ? (currentUser?.memberSeq as number | undefined) ?? null
        : null,
      personalScheduleType: isPersonal ? ((initialData as any).personalScheduleType || '') : '',
      notificationEnabled: isPersonal ? true : true,
      selectedNotifications: !isPersonal ? ((initialData as any).alarmList || []) : [],
      status: !isPersonal ? ((initialData as any).status || false) : false,
      sendAlarm: !isPersonal ? ((initialData as any).alarm || false) : false,
    }));
  }, [mode, initialData, currentUser]);

  /**********************
   * Handlers
   **********************/
  const handleScheduleTypeChange = (t: '일반일정' | '개인일정') => {
    if (formData.scheduleType === t) return;
    if (mode === 'edit') {
      Alert.alert('알림', '수정 모드에서는 일정 구분을 변경할 수 없습니다.');
      return;
    }
    setFormData((prev) => ({
      ...prev,
      scheduleType: t,
      scheduleCodeSeq: null,
      title: '',
      place: '',
      memo: '',
      isAllDay: false,
      selectedNotifications: [],
      status: false,
      sendAlarm: false,
      targetMemberSeq: t === '개인일정' ? (currentUser?.memberSeq ?? null) : null,
      personalScheduleType: '',
      // 개인일정 기본: 단일일
      endDate: prev.startDate,
      startTime: '09:00',
      endTime: '18:00',
    }));
  };

  const openDatePicker = (which: 'startDate' | 'endDate') => {
    setPickerType(which);
    setIsDatePickerVisible(true);
  };

  const openTimePicker = (which: 'startTime' | 'endTime') => {
    setPickerType(which);
    const cur = which === 'startTime' ? formData.startTime : formData.endTime;
    const [h, m] = (cur || '09:00').split(':').map((v) => parseInt(v, 10));
    setTempHour(h);
    setTempMinute(Math.round(m / 15) * 15);
    setIsTimePickerVisible(true);
    setTimeout(() => {
      try {
        hourListRef.current?.scrollToIndex({ index: h, animated: true, viewPosition: 0.5 });
      } catch {}
      try {
        minuteListRef.current?.scrollToIndex({ index: (m / 15) | 0, animated: true, viewPosition: 0.5 });
      } catch {}
    }, 180);
  };

  const onPickDate = (d: string) => {
    if (pickerType === 'startDate') {
      setFormData((p) => ({ ...p, startDate: d, endDate: p.scheduleType === '개인일정' ? d : p.endDate }));
    } else if (pickerType === 'endDate') {
      setFormData((p) => ({ ...p, endDate: d }));
    }
    setIsDatePickerVisible(false);
  };

  const onConfirmTime = () => {
    const str = `${String(tempHour).padStart(2, '0')}:${String(tempMinute).padStart(2, '0')}`;
    if (pickerType === 'startTime') {
      // 시작 → 자동으로 종료 +1h
      const base = dayjs().hour(tempHour).minute(tempMinute);
      const end = base.add(1, 'hour');
      setFormData((p) => ({ ...p, startTime: str, endTime: end.format('HH:mm') }));
    } else if (pickerType === 'endTime') {
      setFormData((p) => ({ ...p, endTime: str }));
    }
    setIsTimePickerVisible(false);
  };

  const toggleNotification = (value: string) => {
    setFormData((p) => {
      const cur = p.selectedNotifications;
      if (cur.includes(value)) return { ...p, selectedNotifications: cur.filter((v) => v !== value) };
      if (cur.length >= 2) return p; // 최대 2개
      return { ...p, selectedNotifications: [...cur, value] };
    });
  };

  const handleSave = async () => {
    try {
      if (!formData.startDate) return Alert.alert('오류', '시작일을 선택해주세요.');

      if (formData.scheduleType === '일반일정') {
        if (!formData.title.trim()) return Alert.alert('오류', '일정 제목을 입력해주세요.');
        if (!formData.scheduleCodeSeq) return Alert.alert('오류', '일정 구분을 선택해주세요.');
        if (!formData.isAllDay && (!formData.startTime || !formData.endTime))
          return Alert.alert('오류', '시작·종료 시간을 선택해주세요.');
      } else {
        if (!formData.targetMemberSeq) return Alert.alert('오류', '대상 사용자를 선택해주세요.');
        if (!formData.personalScheduleType) return Alert.alert('오류', '일정 종류를 선택해주세요.');
      }

      await onSave(formData);
    } catch (e) {
      console.error(e);
      Alert.alert('오류', '일정 저장에 실패했습니다.');
    }
  };

  const handleDelete = async () => {
    if (mode !== 'edit' || !initialData || !onDelete) return;
    Alert.alert('일정 삭제', '이 일정을 삭제할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제', style: 'destructive', onPress: async () => {
          try {
            const isPersonal = (initialData as any).isPersonal || (initialData as any).personal;
            const seq = isPersonal ? (initialData as any).personalScheduleSeq : (initialData as any).scheduleSeq;
            if (!seq) return Alert.alert('오류', '일정 정보를 찾을 수 없습니다.');
            await onDelete(seq, !!isPersonal);
            Alert.alert('삭제됨', '일정을 삭제했습니다.');
            onCancel();
          } catch (e) {
            console.error(e);
            Alert.alert('오류', '일정 삭제에 실패했습니다.');
          }
        }
      }
    ]);
  };

  /**********************
   * Render
   **********************/
  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <View style={[styles.modalContainer, { backgroundColor }]}>        
        {/* Header */}
        <View style={[styles.modalHeader, { borderBottomColor: borderColor }]}>
          <Text style={[styles.modalTitle, { color: textColor }]}>{mode === 'create' ? '일정 추가' : '일정 수정'}</Text>
          <View style={styles.headerButtons}>
            {mode === 'edit' && (
              <TouchableOpacity style={[styles.deleteIconButton, { backgroundColor: '#ff4444' }]} onPress={handleDelete}>
                <Text style={styles.deleteIconText}>삭제</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={onCancel}><Text style={[styles.modalCloseButton, { color: textColor }]}>✕</Text></TouchableOpacity>
          </View>
        </View>

        {/* Body */}
        <ScrollView style={[styles.modalContent]} showsVerticalScrollIndicator={false}>
          {/* Type */}
          <View style={styles.inputSection}>
            <Text style={[styles.inputLabel, { color: textColor }]}>일정 구분 {mode === 'edit' ? '(수정 불가)' : '*'}</Text>
            <View style={styles.radioGroup}>
              <TouchableOpacity
                style={[styles.radioButton, { borderColor, backgroundColor: formData.scheduleType === '일반일정' ? tint : (mode === 'edit' ? disabledBg : inputBg) }, mode === 'edit' && { opacity: 0.6 }]}
                onPress={() => handleScheduleTypeChange('일반일정')}
                disabled={mode === 'edit'}
              >
                <Text style={[styles.radioButtonText, { color: formData.scheduleType === '일반일정' ? '#fff' : textColor }]}>일반일정</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.radioButton, { borderColor, backgroundColor: formData.scheduleType === '개인일정' ? tint : (mode === 'edit' ? disabledBg : inputBg) }, mode === 'edit' && { opacity: 0.6 }]}
                onPress={() => handleScheduleTypeChange('개인일정')}
                disabled={mode === 'edit'}
              >
                <Text style={[styles.radioButtonText, { color: formData.scheduleType === '개인일정' ? '#fff' : textColor }]}>개인일정</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Title (일반일정) */}
          {formData.scheduleType === '일반일정' && (
            <View style={styles.inputSection}>
              <Text style={[styles.inputLabel, { color: textColor }]}>일정 제목 *</Text>
              <TextInput
                style={[styles.textInput, { borderColor, color: textColor, backgroundColor: inputBg }]}
                value={formData.title}
                onChangeText={(t) => t.length <= 30 && setFormData((p) => ({ ...p, title: t }))}
                placeholder="일정 제목을 입력하세요 (30자)"
                placeholderTextColor="#999"
                maxLength={30}
              />
              <Text style={[styles.characterCount, { color: textColor }]}>{formData.title.length}/30</Text>
            </View>
          )}

          {/* Schedule Code (일반일정) */}
          {formData.scheduleType === '일반일정' && (
            <View style={styles.inputSection}>
              <Text style={[styles.inputLabel, { color: textColor }]}>구분</Text>
              <TouchableOpacity style={[styles.dropdownButton, { borderColor, backgroundColor: inputBg }]} onPress={() => setIsScheduleCodeOpen((v) => !v)}>
                <View style={styles.dropdownButtonTextContainer}>
                  {formData.scheduleCodeSeq ? (
                    (() => {
                      const sel = scheduleCodes.find((c) => c.scheduleCodeSeq === formData.scheduleCodeSeq);
                      if (!sel) return <Text style={[styles.dropdownButtonText, { color: textColor }]}>선택하세요</Text>;
                      return sel.scheduleCodeSubName ? (
                        <>
                          <Text style={[styles.dropdownButtonSubText, { color: textColor }]}>{sel.scheduleCodeSubName}</Text>
                          <Text style={[styles.dropdownButtonText, { color: textColor }]}>{sel.scheduleCodeName}</Text>
                        </>
                      ) : (
                        <Text style={[styles.dropdownButtonText, { color: textColor }]}>{sel.scheduleCodeName}</Text>
                      );
                    })()
                  ) : (
                    <Text style={[styles.dropdownButtonText, { color: textColor }]}>선택하세요</Text>
                  )}
                </View>
                <Text style={[styles.dropdownArrow, { color: textColor }]}>{isScheduleCodeOpen ? '▲' : '▼'}</Text>
              </TouchableOpacity>
              {isScheduleCodeOpen && (
                <View style={[styles.dropdownList, { borderColor, backgroundColor: cardBg }]}>
                  <ScrollView style={styles.dropdownScrollView} nestedScrollEnabled>
                    {scheduleCodes
                      .filter((i) => i.scheduleCodeSubName)
                      .sort((a, b) => (a.scheduleCodeSubName || '').localeCompare(b.scheduleCodeSubName || ''))
                      .map((item: any) => (
                        <TouchableOpacity
                          key={String(item.scheduleCodeSeq)}
                          style={[styles.dropdownItem, { borderColor }, formData.scheduleCodeSeq === item.scheduleCodeSeq && styles.dropdownItemSelected]}
                          onPress={() => {
                            setFormData((p) => ({ ...p, scheduleCodeSeq: item.scheduleCodeSeq }));
                            setIsScheduleCodeOpen(false);
                          }}
                        >
                          <View style={[styles.colorIndicator, { backgroundColor: item.scheduleCodeColor }]} />
                          <View style={styles.dropdownItemTextContainer}>
                            <Text style={[styles.dropdownItemSubText, { color: textColor }]}>{item.scheduleCodeSubName}</Text>
                            <Text style={[styles.dropdownItemText, { color: textColor }]}>{item.scheduleCodeName}</Text>
                          </View>
                        </TouchableOpacity>
                      ))}
                  </ScrollView>
                </View>
              )}
            </View>
          )}

          {/* Personal-only fields */}
          {formData.scheduleType === '개인일정' && (
            <>
              {/* 대상 */}
              <View style={styles.inputSection}>
                <Text style={[styles.inputLabel, { color: textColor }]}>대상 *</Text>
                <TouchableOpacity style={[styles.dropdownButton, { borderColor, backgroundColor: inputBg }]} onPress={() => setIsMemberOpen((v) => !v)}>
                  <Text style={[styles.dropdownButtonText, { color: textColor }]}>
                    {formData.targetMemberSeq ? members.find((m) => m.memberSeq === formData.targetMemberSeq)?.name || '선택하세요' : '대상을 선택하세요'}
                  </Text>
                  <Text style={[styles.dropdownArrow, { color: textColor }]}>{isMemberOpen ? '▲' : '▼'}</Text>
                </TouchableOpacity>
                {isMemberOpen && (
                  <View style={[styles.dropdownList, { borderColor, backgroundColor: cardBg }]}>
                    <TextInput
                      style={[styles.searchInput, { borderColor, color: textColor, backgroundColor: inputBg }]}
                      placeholder="사용자 검색..."
                      placeholderTextColor="#999"
                      value={memberQuery}
                      onChangeText={setMemberQuery}
                    />
                    <ScrollView style={styles.dropdownScrollView} nestedScrollEnabled>
                      {filteredMembers.map((m) => (
                        <TouchableOpacity
                          key={String(m.memberSeq)}
                          style={[styles.dropdownItem, { borderColor }, formData.targetMemberSeq === m.memberSeq && styles.dropdownItemSelected]}
                          onPress={() => {
                            setFormData((p) => ({ ...p, targetMemberSeq: m.memberSeq }));
                            setIsMemberOpen(false);
                          }}
                        >
                          <View style={[styles.memberAvatar, { backgroundColor: m.profileColor || '#999' }]}>
                            <Text style={styles.memberAvatarText}>{m.name.charAt(0)}</Text>
                          </View>
                          <View style={styles.memberInfo}>
                            <Text style={[styles.memberName, { color: textColor }]}>{m.name}</Text>
                            {!!m.department && <Text style={[styles.memberDepartment, { color: textColor }]}>{m.department}</Text>}
                          </View>
                          {formData.targetMemberSeq === m.memberSeq && <Text style={styles.checkmark}>✓</Text>}
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>

              {/* 종류 */}
              <View style={styles.inputSection}>
                <Text style={[styles.inputLabel, { color: textColor }]}>일정 종류 *</Text>
                <TouchableOpacity style={[styles.dropdownButton, { borderColor, backgroundColor: inputBg }]} onPress={() => setIsPersonalTypeOpen((v) => !v)}>
                  <Text style={[styles.dropdownButtonText, { color: textColor }]}>{formData.personalScheduleType || '일정 종류를 선택하세요'}</Text>
                  <Text style={[styles.dropdownArrow, { color: textColor }]}>{isPersonalTypeOpen ? '▲' : '▼'}</Text>
                </TouchableOpacity>
                {isPersonalTypeOpen && (
                  <View style={[styles.dropdownList, { borderColor, backgroundColor: cardBg }]}>
                    {personalScheduleTypes.map((opt) => (
                      <TouchableOpacity
                        key={opt.value}
                        style={[styles.dropdownItem, { borderColor }, formData.personalScheduleType === opt.value && styles.dropdownItemSelected]}
                        onPress={() => {
                          setFormData((p) => ({ ...p, personalScheduleType: opt.value }));
                          setIsPersonalTypeOpen(false);
                        }}
                      >
                        <Text style={[styles.dropdownItemText, { color: textColor }]}>{opt.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              {/* 알림전송 */}
              <View style={styles.inputSection}>
                <Text style={[styles.inputLabel, { color: textColor }]}>알림전송 여부</Text>
                <View style={styles.switchRow}>
                  <Text style={[styles.switchLabel, { color: textColor }]}>알림 전송</Text>
                  <Switch value={formData.notificationEnabled} onValueChange={(v) => setFormData((p) => ({ ...p, notificationEnabled: v }))} />
                </View>
              </View>
            </>
          )}

          {/* 날짜/시간 */}
          <View style={styles.inputSection}>
            <Text style={[styles.inputLabel, { color: textColor }]}>시작 일자 *</Text>
            <TouchableOpacity style={[styles.pickerButton, { borderColor }]} onPress={() => openDatePicker('startDate')}>
              <Text style={[styles.pickerButtonText, { color: textColor }]}>{formData.startDate}</Text>
              <Text style={[styles.pickerButtonIcon, { color: textColor }]}>📅</Text>
            </TouchableOpacity>
            {formData.scheduleType === '일반일정' && !formData.isAllDay && (
              <TouchableOpacity style={[styles.pickerButton, { borderColor, marginTop: 8 }]} onPress={() => openTimePicker('startTime')}>
                <Text style={[styles.pickerButtonText, { color: textColor }]}>{formData.startTime}</Text>
                <Text style={[styles.pickerButtonIcon, { color: textColor }]}>🕐</Text>
              </TouchableOpacity>
            )}
          </View>

          {formData.scheduleType === '일반일정' && (
            <View style={styles.inputSection}>
              <Text style={[styles.inputLabel, { color: textColor }]}>종료 일자 *</Text>
              <TouchableOpacity style={[styles.pickerButton, { borderColor }]} onPress={() => openDatePicker('endDate')}>
                <Text style={[styles.pickerButtonText, { color: textColor }]}>{formData.endDate}</Text>
                <Text style={[styles.pickerButtonIcon, { color: textColor }]}>📅</Text>
              </TouchableOpacity>
              {!formData.isAllDay && (
                <TouchableOpacity style={[styles.pickerButton, { borderColor, marginTop: 8 }]} onPress={() => openTimePicker('endTime')}>
                  <Text style={[styles.pickerButtonText, { color: textColor }]}>{formData.endTime}</Text>
                  <Text style={[styles.pickerButtonIcon, { color: textColor }]}>🕐</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {formData.scheduleType === '일반일정' && (
            <View style={styles.inputSection}>
              <Text style={[styles.inputLabel, { color: textColor }]}>종일 여부</Text>
              <View style={styles.switchRow}>
                <Text style={[styles.switchLabel, { color: textColor }]}>종일</Text>
                <Switch
                  value={formData.isAllDay}
                  onValueChange={(v) => setFormData((p) => ({ ...p, isAllDay: v, selectedNotifications: [] }))}
                />
              </View>
            </View>
          )}

          {formData.scheduleType === '일반일정' && (
            <>
              {/* 장소 */}
              <View style={styles.inputSection}>
                <Text style={[styles.inputLabel, { color: textColor }]}>장소</Text>
                <TextInput
                  style={[styles.textInput, { borderColor, color: textColor, backgroundColor: inputBg }]}
                  value={formData.place}
                  onChangeText={(t) => t.length <= 50 && setFormData((p) => ({ ...p, place: t }))}
                  placeholder="장소를 입력하세요 (50자)"
                  placeholderTextColor="#999"
                  maxLength={50}
                />
                <Text style={[styles.characterCount, { color: textColor }]}>{formData.place.length}/50</Text>
              </View>

              {/* 메모 */}
              <View style={styles.inputSection}>
                <Text style={[styles.inputLabel, { color: textColor }]}>메모</Text>
                <TextInput
                  style={[styles.textArea, { borderColor, color: textColor, backgroundColor: inputBg }]}
                  value={formData.memo}
                  onChangeText={(t) => t.length <= 400 && setFormData((p) => ({ ...p, memo: t }))}
                  placeholder="메모를 입력하세요 (400자)"
                  placeholderTextColor="#999"
                  multiline
                  numberOfLines={4}
                  maxLength={400}
                />
                <Text style={[styles.characterCount, { color: textColor }]}>{formData.memo.length}/400</Text>
              </View>

              {/* 알림 (최대 2개) */}
              <View style={styles.inputSection}>
                <Text style={[styles.inputLabel, { color: textColor }]}>알림</Text>
                <TouchableOpacity style={[styles.dropdownButton, { borderColor, backgroundColor: inputBg }]} onPress={() => setIsNotificationOpen((v) => !v)}>
                  <Text style={[styles.dropdownButtonText, { color: textColor }]}>
                    {formData.selectedNotifications.length > 0 ? `${formData.selectedNotifications.length}개 선택됨` : '알림 시간을 선택하세요'}
                  </Text>
                  <Text style={[styles.dropdownArrow, { color: textColor }]}>{isNotificationOpen ? '▲' : '▼'}</Text>
                </TouchableOpacity>
                {formData.selectedNotifications.length > 0 && (
                  <View style={styles.badgesRow}>
                    {formData.selectedNotifications.map((n) => (
                      <View key={n} style={[styles.badge, { borderColor }]}> 
                        <Text style={styles.badgeText}>{n}</Text>
                        <TouchableOpacity onPress={() => toggleNotification(n)}><Text style={styles.badgeDel}>×</Text></TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}
                {isNotificationOpen && (
                  <View style={[styles.dropdownList, { borderColor, backgroundColor: cardBg }]}>
                    {filteredNotifications.map((opt) => (
                      <TouchableOpacity
                        key={opt.value}
                        style={[styles.dropdownItem, { borderColor }, formData.selectedNotifications.includes(opt.value) && styles.dropdownItemSelected]}
                        onPress={() => toggleNotification(opt.value)}
                      >
                        <Text style={[styles.dropdownItemText, { color: textColor }]}>{opt.label}</Text>
                        {formData.selectedNotifications.includes(opt.value) && <Text style={styles.checkmark}>✓</Text>}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              {/* 상태 / 알림 전송 */}
              <View style={styles.inputSection}>
                <Text style={[styles.inputLabel, { color: textColor }]}>상태 & 알림</Text>
                <View style={styles.switchRowBetween}>
                  <View style={styles.switchRowLeft}>
                    <TouchableOpacity
                      style={[styles.radioMini, { borderColor, backgroundColor: !formData.status ? tint : 'transparent' }]}
                      onPress={() => setFormData((p) => ({ ...p, status: false }))}
                    >
                      <Text style={[styles.radioMiniText, { color: !formData.status ? '#fff' : textColor }]}>한가함</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.radioMini, { borderColor, backgroundColor: formData.status ? tint : 'transparent' }]}
                      onPress={() => setFormData((p) => ({ ...p, status: true }))}
                    >
                      <Text style={[styles.radioMiniText, { color: formData.status ? '#fff' : textColor }]}>바쁨</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.switchRowRight}>
                    <Text style={[styles.switchLabel, { color: textColor }]}>알림 전송</Text>
                    <Switch value={formData.sendAlarm} onValueChange={(v) => setFormData((p) => ({ ...p, sendAlarm: v }))} />
                  </View>
                </View>
              </View>
            </>
          )}
        </ScrollView>

        {/* Footer */}
        <View style={[styles.modalFooter, { borderTopColor: borderColor }]}>
          <View style={styles.modalButtonsContainer}>
            <TouchableOpacity style={[styles.modalButton, styles.cancelButton, { borderColor }]} onPress={onCancel}>
              <Text style={[styles.cancelButtonText, { color: textColor }]}>취소</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.modalButton, styles.saveButton, { backgroundColor: tint }]} onPress={handleSave}>
              <Text style={styles.saveButtonText}>{mode === 'create' ? '등록' : '수정'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Date Picker */}
        <Modal visible={isDatePickerVisible} transparent animationType="fade" onRequestClose={() => setIsDatePickerVisible(false)}>
          <View style={styles.pickerModalOverlay}>
            <View style={[styles.pickerModal, { backgroundColor: cardBg }]}>
              <Text style={[styles.pickerModalTitle, { color: textColor }]}>{pickerType === 'startDate' ? '시작 날짜 선택' : '종료 날짜 선택'}</Text>
              <Calendar
                current={(pickerType === 'startDate' ? formData.startDate : formData.endDate) || dayjs().format('YYYY-MM-DD')}
                onDayPress={(d) => onPickDate(d.dateString)}
                hideExtraDays
                enableSwipeMonths
                theme={{
                  backgroundColor: cardBg,
                  calendarBackground: cardBg,
                  textSectionTitleColor: textColor,
                  selectedDayBackgroundColor: tint,
                  selectedDayTextColor: '#fff',
                  todayTextColor: tint,
                  dayTextColor: textColor,
                  textDisabledColor: '#999',
                  arrowColor: tint,
                  monthTextColor: textColor,
                }}
                style={styles.datePickerCalendar}
              />
              <View style={styles.pickerModalButtons}>
                <TouchableOpacity style={[styles.pickerModalCancelButton, { borderColor }]} onPress={() => setIsDatePickerVisible(false)}>
                  <Text style={styles.pickerModalCancelText}>닫기</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Time Picker */}
        <Modal visible={isTimePickerVisible} transparent animationType="fade" onRequestClose={() => setIsTimePickerVisible(false)}>
          <View style={styles.pickerModalOverlay}>
            <View style={[styles.pickerModal, styles.timePickerModal, { backgroundColor: cardBg }]}>
              <Text style={[styles.pickerModalTitle, { color: textColor }]}>{pickerType === 'startTime' ? '시작 시간 선택' : '종료 시간 선택'}</Text>
              <View style={styles.timePickerRow}>
                <View style={styles.timePickerColumn}>
                  <Text style={[styles.timePickerLabel, { color: textColor }]}>시간</Text>
                  <FlatList
                    ref={hourListRef}
                    data={Array.from({ length: 24 }, (_, h) => h)}
                    style={styles.timePickerScroll}
                    keyExtractor={(i) => String(i)}
                    getItemLayout={(_, index) => ({ length: 56, offset: 56 * index, index })}
                    renderItem={({ item }) => {
                      const selected = tempHour === item;
                      return (
                        <TouchableOpacity
                          style={[styles.timePickerItem, { borderColor }, selected && { backgroundColor: tint, borderColor: tint }]} 
                          onPress={() => setTempHour(item)}
                        >
                          <Text style={[styles.timePickerItemText, selected && styles.timePickerItemTextSelected]}>{String(item).padStart(2, '0')}</Text>
                        </TouchableOpacity>
                      );
                    }}
                  />
                </View>
                <View style={styles.timePickerColumn}>
                  <Text style={[styles.timePickerLabel, { color: textColor }]}>분</Text>
                  <FlatList
                    ref={minuteListRef}
                    data={[0, 15, 30, 45]}
                    style={styles.timePickerScroll}
                    keyExtractor={(i) => String(i)}
                    getItemLayout={(_, index) => ({ length: 56, offset: 56 * index, index })}
                    renderItem={({ item }) => {
                      const selected = tempMinute === item;
                      return (
                        <TouchableOpacity
                          style={[styles.timePickerItem, { borderColor }, selected && { backgroundColor: tint, borderColor: tint }]} 
                          onPress={() => setTempMinute(item)}
                        >
                          <Text style={[styles.timePickerItemText, selected && styles.timePickerItemTextSelected]}>{String(item).padStart(2, '0')}</Text>
                        </TouchableOpacity>
                      );
                    }}
                  />
                </View>
              </View>
              <View style={styles.pickerModalButtons}>
                <TouchableOpacity style={[styles.pickerModalCancelButton, { borderColor }]} onPress={() => setIsTimePickerVisible(false)}>
                  <Text style={styles.pickerModalCancelText}>취소</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.pickerModalConfirmButton, { backgroundColor: tint }]} onPress={onConfirmTime}>
                  <Text style={styles.pickerModalConfirmText}>확인</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </KeyboardAvoidingView>
  );
}

/**********************
 * Styles
 **********************/
const styles = StyleSheet.create({
  modalContainer: { flex: 1, justifyContent: 'space-between' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  modalTitle: { fontSize: 18, fontWeight: '600' },
  modalCloseButton: { fontSize: 20, fontWeight: 'bold' },
  headerButtons: { flexDirection: 'row', alignItems: 'center' },
  deleteIconButton: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, marginRight: 12 },
  deleteIconText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  modalContent: { flex: 1, paddingHorizontal: 16, paddingVertical: 16 },
  modalFooter: { borderTopWidth: 1, paddingHorizontal: 16, paddingVertical: 12 },
  modalButtonsContainer: { flexDirection: 'row', gap: 12 },
  modalButton: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  cancelButton: { borderWidth: 1 },
  saveButton: {},
  cancelButtonText: { fontSize: 16, fontWeight: '600' },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },

  inputSection: { marginBottom: 16 },
  inputLabel: { fontSize: 16, fontWeight: '500', marginBottom: 8 },
  textInput: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16 },
  textArea: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16, height: 100, textAlignVertical: 'top' },
  characterCount: { fontSize: 12, textAlign: 'right', marginTop: 4, opacity: 0.6 },

  radioGroup: { flexDirection: 'row', gap: 12 },
  radioButton: { flex: 1, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 8, borderWidth: 1, alignItems: 'center' },
  radioButtonText: { fontSize: 16, fontWeight: '500' },

  dropdownButton: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10 },
  dropdownButtonTextContainer: { flex: 1 },
  dropdownButtonText: { fontSize: 16 },
  dropdownButtonSubText: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  dropdownArrow: { fontSize: 12, marginLeft: 8 },
  dropdownList: { borderWidth: 1, borderRadius: 8, marginTop: 4, maxHeight: 220 },
  dropdownScrollView: { maxHeight: 220 },
  dropdownItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1 },
  dropdownItemSelected: { backgroundColor: '#e3f2fd' },
  dropdownItemTextContainer: { flex: 1 },
  dropdownItemText: { fontSize: 16 },
  dropdownItemSubText: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  colorIndicator: { width: 12, height: 12, borderRadius: 6, marginRight: 12 },

  searchInput: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, margin: 8, fontSize: 16 },
  memberAvatar: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  memberAvatarText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  memberInfo: { flex: 1 },
  memberName: { fontSize: 16, fontWeight: '500' },
  memberDepartment: { fontSize: 14, opacity: 0.7 },
  checkmark: { fontSize: 20, color: '#2196F3', fontWeight: 'bold' },

  pickerButton: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#f8f9fa' },
  pickerButtonText: { fontSize: 16, flex: 1 },
  pickerButtonIcon: { fontSize: 16, marginLeft: 8 },

  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  switchRowBetween: { gap: 12 },
  switchRowLeft: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  switchRowRight: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 8 },
  switchLabel: { fontSize: 16 },
  radioMini: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1 },
  radioMiniText: { fontSize: 12, fontWeight: '600' },

  badgesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  badge: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 16, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { fontSize: 12, marginRight: 6 },
  badgeDel: { fontSize: 16, fontWeight: '700' },

  // picker modal
  pickerModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  pickerModal: { width: '90%', maxWidth: 420, borderRadius: 12, padding: 20 },
  timePickerModal: { maxHeight: '80%' },
  pickerModalTitle: { fontSize: 18, fontWeight: '600', textAlign: 'center', marginBottom: 16 },
  datePickerCalendar: { borderRadius: 8 },

  timePickerRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 16 },
  timePickerColumn: { flex: 1, alignItems: 'center' },
  timePickerLabel: { fontSize: 16, fontWeight: '600', marginBottom: 8 },
  timePickerScroll: { height: 220, alignSelf: 'stretch' },
  timePickerItem: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 8, borderWidth: 1, marginBottom: 8, alignItems: 'center', minHeight: 44 },
  timePickerItemText: { fontSize: 16, fontWeight: '500' },
  timePickerItemTextSelected: { color: '#fff' },

  pickerModalButtons: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginTop: 8 },
  pickerModalCancelButton: { flex: 1, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8, borderWidth: 1, alignItems: 'center' },
  pickerModalCancelText: { fontSize: 16, fontWeight: '600' },
  pickerModalConfirmButton: { flex: 1, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8, alignItems: 'center' },
  pickerModalConfirmText: { fontSize: 16, fontWeight: '600', color: '#fff' },
});
