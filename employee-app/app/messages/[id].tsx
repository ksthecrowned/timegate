import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import { MinTouchTarget, Radius, Spacing } from '@/constants/theme';
import { STRINGS } from '@/constants/strings';
import { ScreenLayout } from '@/components/ScreenLayout';
import { ErrorState } from '@/components/ui/EmptyState';
import { useTheme } from '@/hooks/use-theme';
import { employeeApi } from '@/lib/api';
import type { ConversationDetail, ConversationMessage } from '@/lib/types';

const S = Spacing;

function senderLabel(msg: ConversationMessage, viewerUserId: string): string {
  if (msg.senderUserId === viewerUserId) return STRINGS.messages.you;
  const name = `${msg.sender.firstName ?? ''} ${msg.sender.lastName ?? ''}`.trim();
  return name || STRINGS.messages.manager;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function ConversationScreen() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const listRef = useRef<FlatList<ConversationMessage>>(null);
  const [detail, setDetail] = useState<ConversationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const data = await employeeApi.getConversation(id);
      setDetail(data);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : STRINGS.messages.loadError);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const sendReply = async () => {
    if (!id || !detail) return;
    const body = reply.trim();
    if (!body) return;
    setSending(true);
    try {
      const message = await employeeApi.replyToConversation(id, body);
      setDetail({
        ...detail,
        messages: [...detail.messages, message],
        lastMessageAt: message.createdAt,
        lastMessagePreview: body.slice(0, 240),
      });
      setReply('');
      requestAnimationFrame(() => {
        listRef.current?.scrollToEnd({ animated: true });
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : STRINGS.messages.sendError);
    } finally {
      setSending(false);
    }
  };

  const viewerUserId = detail?.viewerUserId ?? '';

  return (
    <ScreenLayout
      title={detail?.subject ?? STRINGS.messages.title}
      showBack
      showScroll={false}
      showNotifications={false}
    >
      {error && !detail ? (
        <ErrorState
          message={error}
          onRetry={() => void load()}
          retryLabel={STRINGS.app.retry}
        />
      ) : null}

      {loading && !detail ? (
        <ActivityIndicator color={theme.primary} style={{ marginTop: S.xl }} />
      ) : null}

      {detail ? (
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={88}
        >
          <FlatList
            ref={listRef}
            data={detail.messages}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
            renderItem={({ item }) => {
              const mine = item.senderUserId === viewerUserId;
              return (
                <View
                  style={[
                    styles.bubbleWrap,
                    mine ? styles.bubbleMine : styles.bubbleTheirs,
                  ]}
                >
                  <Text
                    style={[
                      styles.sender,
                      { color: mine ? theme.primary : theme.textSecondary },
                    ]}
                  >
                    {senderLabel(item, viewerUserId)}
                  </Text>
                  <View
                    style={[
                      styles.bubble,
                      {
                        backgroundColor: mine ? theme.primary : theme.surface,
                        borderColor: theme.border,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        color: mine ? '#fff' : theme.text,
                        fontSize: 15,
                        lineHeight: 22,
                      }}
                    >
                      {item.body}
                    </Text>
                  </View>
                  <Text style={[styles.time, { color: theme.textSecondary }]}>
                    {formatTime(item.createdAt)}
                  </Text>
                </View>
              );
            }}
          />

          {error ? (
            <Text style={[styles.error, { color: theme.danger }]}>{error}</Text>
          ) : null}

          <View
            style={[
              styles.composer,
              { borderTopColor: theme.border, backgroundColor: theme.background },
            ]}
          >
            <TextInput
              value={reply}
              onChangeText={setReply}
              placeholder={STRINGS.messages.replyPlaceholder}
              placeholderTextColor={theme.textSecondary}
              multiline
              maxLength={4000}
              accessibilityLabel={STRINGS.messages.reply}
              style={[
                styles.replyInput,
                {
                  color: theme.text,
                  backgroundColor: theme.surface,
                  borderColor: theme.border,
                },
              ]}
            />
            <Pressable
              onPress={() => void sendReply()}
              disabled={sending || !reply.trim()}
              accessibilityRole="button"
              accessibilityLabel={STRINGS.messages.reply}
              style={({ pressed }) => [
                styles.sendBtn,
                {
                  backgroundColor: theme.primary,
                  opacity: sending || !reply.trim() || pressed ? 0.7 : 1,
                },
              ]}
            >
              {sending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.sendText}>{STRINGS.messages.reply}</Text>
              )}
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      ) : null}
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  list: {
    paddingHorizontal: S.md,
    paddingVertical: S.sm,
    gap: S.sm,
  },
  bubbleWrap: {
    maxWidth: '88%',
    marginBottom: S.sm,
  },
  bubbleMine: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  bubbleTheirs: { alignSelf: 'flex-start', alignItems: 'flex-start' },
  sender: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  bubble: {
    borderRadius: Radius.md,
    paddingHorizontal: S.md,
    paddingVertical: S.sm,
    borderWidth: StyleSheet.hairlineWidth,
  },
  time: {
    fontSize: 11,
    marginTop: 4,
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: S.sm,
    paddingHorizontal: S.md,
    paddingVertical: S.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  replyInput: {
    flex: 1,
    minHeight: MinTouchTarget,
    maxHeight: 120,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.md,
    paddingHorizontal: S.md,
    paddingVertical: S.sm,
    fontSize: 15,
  },
  sendBtn: {
    minHeight: MinTouchTarget,
    minWidth: 88,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: S.md,
  },
  sendText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  error: {
    paddingHorizontal: S.md,
    paddingBottom: S.xs,
    fontSize: 13,
  },
});
