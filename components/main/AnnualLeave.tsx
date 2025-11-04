import WorkOnOffService, { AnnualLeave, PersonalScheduleList } from '@/api/workOnOff/workOnOffService';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAppSelector } from '@/store/hooks';
import { getWeekdayLabel } from '@/utils/commonUtil';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';

export default function AnnualLeaveComponent() {
  const { userInfo } = useAppSelector((state) => state.auth);
  const [annualLeaveHistory, setAnnualLeaveHistory] = useState<AnnualLeave | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const scheme = (useColorScheme() ?? 'light') as 'light' | 'dark';
  const C = Colors[scheme];
  const styles = useMemo(() => makeStyles(C), [scheme]);

  useEffect(() => {
    fetchAnnualLeave();
  }, []);

  const fetchAnnualLeave = async () => {
    setLoading(true);
    setError(null);

    try {
      const member = userInfo?.member;
      if (!member) {
        throw new Error('사용자 정보를 찾을 수 없습니다.');
      }
      const memberSeq = member.memberSeq;
      const year = Math.ceil(member.monthsPeriod / 12);
      const annualLeaveHistory = await WorkOnOffService.getAnnualLeave(memberSeq, year);
      if (annualLeaveHistory.personalScheduleList && annualLeaveHistory.personalScheduleList.length > 0) {
        annualLeaveHistory.personalScheduleList.reverse();
      }

      setAnnualLeaveHistory(annualLeaveHistory);
    } catch (err: any) {
      setError(err.message || '연차 기록을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <ThemedView style={[styles.loadingContainer, { backgroundColor: C.background }]}>
        <ActivityIndicator size="large" color={C.primary} />
        <ThemedText style={[styles.loadingText, { color: C.textDim, fontFamily: Fonts.sans }]}>연차 기록을 불러오는 중...</ThemedText>
      </ThemedView>
    );
  }

  if (error) {
    return (
      <ThemedView style={[styles.errorContainer, { backgroundColor: C.background }]}>
        <ThemedText style={[styles.errorText, { color: C.danger, fontFamily: Fonts.sans }]}>{error}</ThemedText>
      </ThemedView>
    );
  }

  if (!annualLeaveHistory) {
    return (
      <ThemedView style={[styles.noDataContainer, { backgroundColor: C.background }]}>
        <ThemedText style={[styles.noDataText, { color: C.textDim, fontFamily: Fonts.sans }]}>연차 기록이 없습니다.</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ThemedView style={[styles.header, { borderBottomColor: C.border }]}>
        <ThemedView style={styles.titleContainer}>
          <TouchableOpacity
            onPress={() => setShowDetailModal(true)}
          >
            <ThemedText style={[styles.title, { color: C.text, fontFamily: Fonts.sans }]}>🔍 상세 기록</ThemedText>
          </TouchableOpacity>
        </ThemedView>
        <ThemedText style={[styles.year, { color: C.primary, fontFamily: Fonts.sans }]}>{new Date().getFullYear()}년</ThemedText>
      </ThemedView>
      
      <ThemedView style={styles.dateContainer}>
        <ThemedView style={styles.dateItem}>
          <ThemedText style={[styles.dateLabel, { color: C.textDim, fontFamily: Fonts.sans }]}>연차 시작일</ThemedText>
          <ThemedText style={[styles.dateValue, { color: C.text, fontFamily: Fonts.sans }]}>{annualLeaveHistory.fromDate}</ThemedText>
        </ThemedView>
        <ThemedView style={styles.dateItem}>
          <ThemedText style={[styles.dateLabel, { color: C.textDim, fontFamily: Fonts.sans }]}>연차 종료일</ThemedText>
          <ThemedText style={[styles.dateValue, { color: C.text, fontFamily: Fonts.sans }]}>{annualLeaveHistory.toDate}</ThemedText>
        </ThemedView>
      </ThemedView>

      <ThemedView style={styles.summaryContainer}>
        <ThemedView style={styles.summaryItem}>
          <ThemedText style={[styles.summaryLabel, { color: C.textDim, fontFamily: Fonts.sans }]}>총 연차</ThemedText>
          <ThemedText style={[styles.summaryValue, { color: C.text, fontFamily: Fonts.sans }]}>{annualLeaveHistory.holidayCount}일</ThemedText>
        </ThemedView>
        <ThemedView style={styles.summaryItem}>
          <ThemedText style={[styles.summaryLabel, { color: C.textDim, fontFamily: Fonts.sans }]}>이전 초과 사용</ThemedText>
          <ThemedText style={[styles.summaryValue, { color: annualLeaveHistory.lastOverUsedCount > 0 ? C.danger : C.text, fontFamily: Fonts.sans }]}>
            {annualLeaveHistory.lastOverUsedCount || 0}일
          </ThemedText>
        </ThemedView>
        <ThemedView style={styles.summaryItem}>
          <ThemedText style={[styles.summaryLabel, { color: C.textDim, fontFamily: Fonts.sans }]}>사용 연차</ThemedText>
          <ThemedText style={[styles.summaryValue, { color: C.text, fontFamily: Fonts.sans }]}>{annualLeaveHistory.useCount}일</ThemedText>
        </ThemedView>
        <ThemedView style={styles.summaryItem}>
          <ThemedText style={[styles.summaryLabel, { color: C.textDim, fontFamily: Fonts.sans }]}>잔여 연차</ThemedText>
          <ThemedView style={styles.remainContainer}>
            <ThemedText style={[styles.summaryValue, { color: annualLeaveHistory.remainCount < 0 ? C.danger : C.text, fontFamily: Fonts.sans }]}>
              {annualLeaveHistory.remainCount}일
            </ThemedText>
          </ThemedView>
        </ThemedView>
      </ThemedView>

      {/* 상세 연차 기록 팝업 모달 */}
      <Modal
        visible={showDetailModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDetailModal(false)}
      >
        <ThemedView style={[styles.modalOverlay, { backgroundColor: C.overlay }]}>
          <ThemedView style={[styles.modalContent, { backgroundColor: C.surface, borderColor: C.border }]}>
            <ThemedView style={[styles.modalHeader, { borderBottomColor: C.border }]}>
              <ThemedText style={[styles.modalTitle, { color: C.text, fontFamily: Fonts.sans }]}>상세 연차 기록</ThemedText>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setShowDetailModal(false)}
              >
                <ThemedText style={[styles.closeButtonText, { color: C.textDim, fontFamily: Fonts.sans }]}>✕</ThemedText>
              </TouchableOpacity>
            </ThemedView>
            
            <ThemedView style={styles.modalBody}>
              <ThemedText style={[styles.modalInfo, { color: C.textDim, fontFamily: Fonts.sans }]}>
                연차 정보
              </ThemedText>
              
              <ThemedView style={styles.detailContainer}>
                <ThemedView style={[styles.detailRow, { borderBottomColor: C.border }]}>
                  <ThemedText style={[styles.detailLabel, { color: C.textDim, fontFamily: Fonts.sans }]}>기간</ThemedText>
                  <ThemedText style={[styles.detailValue, { color: C.text, fontFamily: Fonts.sans }]}>
                    {annualLeaveHistory.fromDate} ~ {annualLeaveHistory.toDate}
                  </ThemedText>
                </ThemedView>
                
                <ThemedView style={[styles.detailRow, { borderBottomColor: C.border }]}>
                  <ThemedText style={[styles.detailLabel, { color: C.textDim, fontFamily: Fonts.sans }]}>총 연차</ThemedText>
                  <ThemedText style={[styles.detailValue, { color: C.text, fontFamily: Fonts.sans }]}>{annualLeaveHistory.holidayCount}일</ThemedText>
                </ThemedView>
                
                <ThemedView style={[styles.detailRow, { borderBottomColor: C.border }]}>
                  <ThemedText style={[styles.detailLabel, { color: C.textDim, fontFamily: Fonts.sans }]}>사용 연차</ThemedText>
                  <ThemedText style={[styles.detailValue, { color: C.text, fontFamily: Fonts.sans }]}>{annualLeaveHistory.useCount}일</ThemedText>
                </ThemedView>
                
                <ThemedView style={[styles.detailRow, { borderBottomColor: C.border }]}>
                  <ThemedText style={[styles.detailLabel, { color: C.textDim, fontFamily: Fonts.sans }]}>잔여 연차</ThemedText>
                  <ThemedText style={[styles.detailValue, { color: annualLeaveHistory.remainCount && annualLeaveHistory.remainCount < 0 ? C.danger : C.text, fontFamily: Fonts.sans }]}>
                    {annualLeaveHistory.remainCount}일
                  </ThemedText>
                </ThemedView>
                
                <ThemedView style={[styles.detailRow, { borderBottomColor: C.border }]}>
                  <ThemedText style={[styles.detailLabel, { color: C.textDim, fontFamily: Fonts.sans }]}>추가 연차</ThemedText>
                  <ThemedText style={[styles.detailValue, { color: C.text, fontFamily: Fonts.sans }]}>{annualLeaveHistory.extraCount}일</ThemedText>
                </ThemedView>
                
                <ThemedView style={[styles.detailRow, { borderBottomColor: C.border }]}>
                  <ThemedText style={[styles.detailLabel, { color: C.textDim, fontFamily: Fonts.sans }]}>이전 초과 사용</ThemedText>
                  <ThemedText style={[styles.detailValue, { color: C.text, fontFamily: Fonts.sans }]}>{annualLeaveHistory.lastOverUsedCount}일</ThemedText>
                </ThemedView>
              </ThemedView>
               
               {/* 연차 기록 목록 */}
               <ThemedView style={styles.scheduleListContainer}>
                 <ThemedView style={styles.scheduleListHeader}>
                   <ThemedText style={[styles.scheduleListTitle, { color: C.text, fontFamily: Fonts.sans }]}>연차 사용 내역</ThemedText>
                   <ThemedView style={styles.scrollHintContainer}>
                     <ThemedText style={styles.scrollHintIcon}>📜</ThemedText>
                     <ThemedText style={[styles.scrollHintText, { color: C.textDim, fontFamily: Fonts.sans }]}>아래로 스크롤</ThemedText>
                   </ThemedView>
                 </ThemedView>
                 {annualLeaveHistory.personalScheduleList && annualLeaveHistory.personalScheduleList.length > 0 ? (
                   <ThemedView style={styles.scrollContainer}>
                     <ScrollView 
                       style={styles.scheduleListScroll} 
                       showsVerticalScrollIndicator={true}
                       contentContainerStyle={styles.scrollContentContainer}
                     >
                       {annualLeaveHistory.personalScheduleList.map((item: PersonalScheduleList, index: number) => (
                         <ThemedView key={index} style={[styles.scheduleItem, {borderLeftColor: C.primary }]}>
                           <ThemedView style={styles.scheduleItemHeader}>
                             <ThemedText style={[styles.scheduleDate, { color: C.text, fontFamily: Fonts.sans }]}>
                                 {item.startDate} ({getWeekdayLabel(item.startDate)})
                             </ThemedText>
                             <ThemedText style={[styles.scheduleType, { color: C.primary, backgroundColor: C.surfaceToday, fontFamily: Fonts.sans }]}>{item.personalScheduleType || '연차'}</ThemedText>
                           </ThemedView>
                         </ThemedView>
                       ))}
                     </ScrollView>
                     <ThemedView style={styles.scrollGradient} />
                   </ThemedView>
                 ) : (
                   <ThemedView style={styles.noScheduleContainer}>
                     <ThemedText style={[styles.noScheduleText, { color: C.textDim, fontFamily: Fonts.sans }]}>사용한 연차 기록이 없습니다.</ThemedText>
                   </ThemedView>
                 )}
               </ThemedView>
             </ThemedView>
           </ThemedView>
         </ThemedView>
       </Modal>
    </ThemedView>
  );
}

const makeStyles = (C: any) =>
  StyleSheet.create({
    container: {
      padding: 10,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 15,
      paddingBottom: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    title: {
      fontSize: 16,
      fontWeight: 'bold',
    },
    titleContainer: {
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
    },
    year: {
      fontSize: 16,
      fontWeight: '600',
    },
    dateContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 15,
    },
    dateItem: {
      flex: 1,
      alignItems: 'center',
    },
    dateLabel: {
      fontSize: 14,
      marginBottom: 5,
    },
    dateValue: {
      fontSize: 16,
      fontWeight: '600',
    },
    summaryContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
    },
    summaryItem: {
      flex: 1,
      alignItems: 'center',
    },
    summaryLabel: {
      fontSize: 12,
      marginBottom: 5,
    },
    summaryValue: {
      fontSize: 16,
      fontWeight: 'bold',
    },
    loadingContainer: {
      padding: 20,
      alignItems: 'center',
    },
    loadingText: {
      marginTop: 10,
      fontSize: 14,
    },
    errorContainer: {
      padding: 20,
      alignItems: 'center',
    },
    errorText: {
      fontSize: 14,
      textAlign: 'center',
    },
    noDataContainer: {
      padding: 20,
      alignItems: 'center',
    },
    noDataText: {
      fontSize: 14,
    },
    remainContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    // 모달 관련 스타일
    modalOverlay: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContent: {
      borderRadius: 12,
      padding: 20,
      margin: 10,
      width: '90%',
      maxWidth: 400,
      borderWidth: StyleSheet.hairlineWidth,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
      paddingBottom: 10,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: 'bold',
    },
    closeButton: {
      padding: 8,
    },
    closeButtonText: {
      fontSize: 20,
      fontWeight: 'bold',
    },
    modalBody: {
      alignItems: 'center',
    },
    modalInfo: {
      fontSize: 16,
      textAlign: 'center',
      marginBottom: 10,
      fontWeight: '500',
    },
    detailContainer: {
      width: '100%',
    },
    detailRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 6,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    detailLabel: {
      fontSize: 16,
      fontWeight: '500',
    },
    detailValue: {
      fontSize: 16,
      fontWeight: '600',
    },
    // 연차 기록 목록 관련 스타일
    scheduleListContainer: {
      marginTop: 20,
      width: '100%',
    },
    scheduleListTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      marginBottom: 0,
    },
    scheduleListScroll: {
      maxHeight: 200,
    },
    scrollContentContainer: {
      paddingBottom: 10,
    },
    scrollContainer: {
      position: 'relative',
    },
    scrollGradient: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      height: 20,
      backgroundColor: 'transparent',
    },
    scheduleListHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 15,
    },
    scrollHintContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    scrollHintIcon: {
      fontSize: 16,
      marginRight: 4,
    },
    scrollHintText: {
      fontSize: 12,
      fontStyle: 'italic',
    },
    scheduleItem: {
      borderRadius: 8,
      paddingVertical: 6,
      paddingHorizontal: 12,
      marginBottom: 10,
      borderLeftWidth: 3,
    },
    scheduleItemHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    scheduleDate: {
      fontSize: 16,
      fontWeight: '600',
    },
    scheduleType: {
      fontSize: 14,
      fontWeight: '500',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
    },
    scheduleTimeInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 4,
    },
    scheduleTimeLabel: {
      fontSize: 14,
      marginRight: 8,
      minWidth: 70,
      fontWeight: '500',
    },
    scheduleTimeValue: {
      fontSize: 14,
      fontWeight: '500',
    },
    noScheduleContainer: {
      padding: 20,
      alignItems: 'center',
    },
    noScheduleText: {
      fontSize: 14,
      fontStyle: 'italic',
    },
    // 연차 기록 상세 정보 스타일
    scheduleDetails: {
      marginTop: 8,
    },
    scheduleDetailRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 6,
    },
    scheduleDetailLabel: {
      fontSize: 13,
      marginRight: 8,
      minWidth: 50,
      fontWeight: '500',
    },
    scheduleDetailValue: {
      fontSize: 13,
      fontWeight: '400',
      flex: 1,
    },
  });
