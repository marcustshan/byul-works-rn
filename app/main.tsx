import { ThemedText } from "@/components/themed-text";
import { ThemedView } from '@/components/themed-view';
import { Link } from "expo-router";

export default function Main() {

    return (
      <ThemedView>
        <ThemedText>메인화면</ThemedText>
        <Link href="/chat/chat-list">채팅 목록</Link>
      </ThemedView>
    );
  }