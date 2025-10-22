// 간단한 소켓 서비스 구현 (실제 구현에 맞게 수정 필요)
class UniversalSocketService {
  private isConnected = false;

  getConnectionStatus(): boolean {
    return this.isConnected;
  }

  connect(): void {
    this.isConnected = true;
    console.log('🔌 소켓 연결됨');
  }

  disconnect(): void {
    this.isConnected = false;
    console.log('🔌 소켓 연결 해제됨');
  }
}

export const universalSocketService = new UniversalSocketService();
