import api from '@/api/api';
import { FILE_URL_SALT, getCurrentApiConfig } from '@/constants/environment';
import { encodeBase64 } from '@/utils/commonUtil';
import { Alert, Platform } from 'react-native';
import { ChatMessage } from './chat/chatService';

// ⬇️ 추가된 import
import { store } from '@/store';
import * as FileSystem from 'expo-file-system/legacy';
import * as IntentLauncher from 'expo-intent-launcher';
import * as Sharing from 'expo-sharing';

export interface FileUpload {
  fileSeq?: number;
  path?: string;
  fileType?: string;
  tableName: string;
  tableSeq?: number;
  file?: File;
  originName?: string;
  fileSize?: string;
  fileName?: string;
}

function parseFilenameFromContentDisposition(v?: string | null): string | null {
  if (!v) return null;
  // RFC 5987: filename*
  const star = /filename\*\s*=\s*([^']*)'[^']*'([^;]+)/i.exec(v);
  if (star?.[2]) return decodeURIComponent(star[2].trim());
  // 일반 filename=
  const normal = /filename\s*=\s*"?([^"]+)"?/i.exec(v);
  return normal?.[1] ?? null;
}

function sanitizeFilename(name: string): string {
  // 파일명에 사용할 수 없는 문자 제거/치환
  return name.replace(/[\\/:*?"<>|\x00-\x1F]/g, '_').slice(0, 150);
}

export class FileService {
  static async uploadFile(file: FileUpload): Promise<FileUpload> {
    const formData = new FormData();
    formData.append('file', file.file);
    formData.append('tableName', file.tableName);
    formData.append('fileType', file.fileType ?? '');
    const { data } = await api.post<FileUpload>('/file/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return data;
  }

  static async downloadFile(message: ChatMessage): Promise<void> {
    try {
      if (!message.fileSeq) throw new Error('파일 시퀀스가 없습니다.');

      const documentDirectory = FileSystem.documentDirectory || FileSystem.cacheDirectory;

      // 다운로드 URL 구성 (서버에서 byte[] 반환)
      const salt = FILE_URL_SALT;
      const encodedFileSeq = encodeBase64(salt + message.fileSeq.toString());
      const API_BASE_URL = getCurrentApiConfig().BASE_URL;
      const downloadUrl = `${API_BASE_URL}/file/download/${encodedFileSeq}`;

      const token = store.getState().auth.token;
      const headers = {
        Authorization: token ? `Bearer ${token}` : '',
        'X-Client': 'byulworksrn',
        'X-Device-Platform': Platform.OS === 'ios' ? 'iOS' : 'AOS',
      }

      // 우선 저장 파일명 후보 정하기 (서버가 헤더로 주면 그걸 우선 사용)
      let filename = message.fileName ?? '';
      filename = sanitizeFilename(filename);

      // 다운로드 실행 (진행률 필요 시 4번째 인자 콜백 사용 가능)
      const targetUri = documentDirectory! + filename;

      const resumable = FileSystem.createDownloadResumable(
        downloadUrl,
        targetUri,
        { headers }
      );

      const result = await resumable.downloadAsync();

      if (!result) throw new Error('다운로드 결과가 비어 있습니다.');
      if (result.status !== 200 && result.status !== 201) {
        throw new Error(`다운로드 실패 (status=${result.status})`);
      }

      // 서버 응답 헤더에서 실제 파일명 추출 (있으면 교체)
      const cd = result.headers?.['Content-Disposition'] ?? result.headers?.['content-disposition'];
      const serverFilename = parseFilenameFromContentDisposition(cd);
      if (serverFilename && sanitizeFilename(serverFilename) !== filename) {
        // 파일명 변경 필요 시, 같은 폴더 내에서 rename
        const newName = sanitizeFilename(serverFilename);
        const newUri = documentDirectory! + newName;
        try {
          await FileSystem.moveAsync({ from: result.uri, to: newUri });
          filename = newName;
        } catch {
          // rename 실패해도 기존 파일로 유지
        }
      }

      const finalUri = documentDirectory! + filename;

      // 열기/공유 처리 (사용자 확인 후 열기)
      Alert.alert(
        '다운로드 완료',
        `파일을 열까요?\n파일: ${filename}`,
        [
          { text: '아니오', style: 'cancel' },
          {
            text: '열기',
            onPress: async () => {
              if (Platform.OS === 'ios') {
                // iOS: 공유 시트로 열기/저장
                if (await Sharing.isAvailableAsync()) {
                  await Sharing.shareAsync(finalUri);
                } else {
                  Alert.alert('완료', `파일이 저장되었습니다.\n파일: ${filename}`);
                }
              } else {
                // Android: 해당 앱으로 열기 (읽기 권한 부여)
                const contentUri = await FileSystem.getContentUriAsync(finalUri);
                await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
                  data: contentUri,
                  flags: 1, // FLAG_GRANT_READ_URI_PERMISSION
                }).catch(() => {
                  // 열기 실패 시 다운로드 완료만 알림
                  Alert.alert('완료', `파일이 저장되었습니다.\n다운로드 폴더: 앱 문서 디렉토리\n파일: ${filename}`);
                });
              }
            },
          },
        ]
      );
    } catch (error) {
      console.error('파일 다운로드 실패:', error);
      Alert.alert('오류', '파일 다운로드에 실패했습니다.');
    }
  }
}
