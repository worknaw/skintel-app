import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FormattedChatText } from './formatted-chat-text';
import { AppText } from '@/components/ui/app-text';
import { Fonts, Palette, Radius, Spacing } from '@/constants/theme';
import { sendSkinChatMessage } from '../application/gemini-skin-consultant';
import type { ChatMessage } from '../domain/chat-types';

const INITIAL_WELCOME_MESSAGE: ChatMessage = {
  id: 'welcome-1',
  role: 'model',
  text: `สวัสดีค่ะ! หมอ/ผู้เชี่ยวชาญประจำ **SkinCycle AI Consultant** ยินดีให้คำปรึกษาค่ะ ✨

คุณสามารถปรึกษาปัญหาผิว เช่น:
• ปัญหาสิวอักเสบ สิวอุดตัน รอยแดง
• แนวทางการจัดรูทีนสกินแคร์ เช้า-เย็น (Skin Cycling)
• การเลือกใช้ส่วนผสมและการจับคู่ Active ต่างๆ
• การฟื้นฟูเกราะป้องกันผิว (Skin Barrier)

*คำแนะนำนี้เพื่อการดูแลผิวทั่วไปเบื้องต้น ไม่ใช่การวินิจฉัยโรคทางการแพทย์นะคะ* มีเรื่องผิวเรื่องไหนกังวลอยู่ ถามได้เลยค่ะ!`,
  createdAt: Date.now(),
};

const SUGGESTED_QUESTIONS = [
  'สิวอักเสบขึ้นซ้ำๆ ควรดูแลและเริ่มสกินแคร์อย่างไร?',
  'ผิวมันแต่ขาดน้ำ แนะนำรูทีนเช้า-เย็นหน่อยค่ะ',
  'Niacinamide ใช้ร่วมกับ Salicylic Acid (BHA) ได้ไหม?',
  'ปัญหาเกราะป้องกันผิวพัง (Skin Barrier) กู้ผิวอย่างไร?',
] as const;

interface SkinChatModalProps {
  visible: boolean;
  onClose: () => void;
}

export function SkinChatModal({ visible, onClose }: SkinChatModalProps) {
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_WELCOME_MESSAGE]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const abortControllerRef = useRef<AbortController | null>(null);


  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 80);
  }, []);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (e) => {
      setKeyboardHeight(e.endCoordinates.height);
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    });

    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const handleSend = useCallback(
    async (textToSend?: string) => {
      const text = (textToSend ?? inputText).trim();
      if (!text || isLoading) return;

      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        text,
        createdAt: Date.now(),
      };

      const updatedHistory = [...messages, userMessage];
      setMessages(updatedHistory);
      setInputText('');
      setIsLoading(true);
      scrollToBottom();

      const controller = new AbortController();
      abortControllerRef.current = controller;

      const result = await sendSkinChatMessage(updatedHistory, controller.signal);
      setIsLoading(false);
      abortControllerRef.current = null;

      if (result.ok) {
        const modelMessage: ChatMessage = {
          id: `model-${Date.now()}`,
          role: 'model',
          text: result.value,
          createdAt: Date.now(),
        };
        setMessages((prev) => [...prev, modelMessage]);
      } else {
        const errorMessage: ChatMessage = {
          id: `err-${Date.now()}`,
          role: 'model',
          text: `⚠️ ${result.error.message}`,
          createdAt: Date.now(),
          isError: true,
        };
        setMessages((prev) => [...prev, errorMessage]);
      }
      scrollToBottom();
    },
    [inputText, isLoading, messages, scrollToBottom],
  );

  const handleClearChat = useCallback(() => {
    Alert.alert(
      'ล้างบทสนทนา',
      'คุณต้องการล้างประวัติการคุยทั้งหมดและเริ่มใหม่หรือไม่?',
      [
        { text: 'ยกเลิก', style: 'cancel' },
        {
          text: 'ล้างบทสนทนา',
          style: 'destructive',
          onPress: () => {
            abortControllerRef.current?.abort();
            setIsLoading(false);
            setMessages([{ ...INITIAL_WELCOME_MESSAGE, createdAt: Date.now() }]);
          },
        },
      ],
    );
  }, []);

  const handleClose = useCallback(() => {
    abortControllerRef.current?.abort();
    setIsLoading(false);
    onClose();
  }, [onClose]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      statusBarTranslucent
      onRequestClose={handleClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{
          flex: 1,
          backgroundColor: Palette.background,
          paddingBottom: Platform.OS === 'android' ? keyboardHeight : 0,
        }}>
        {/* Header */}
        <View
          style={[
            styles.header,
            { paddingTop: Platform.OS === 'ios' ? insets.top + Spacing.two : Spacing.four },
          ]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="ปิดหน้าต่างแชท"
            onPress={handleClose}
            hitSlop={12}
            style={({ pressed }) => [styles.headerButton, pressed && { opacity: 0.6 }]}>
            <MaterialCommunityIcons name="chevron-down" size={26} color={Palette.textPrimary} />
          </Pressable>

          <View style={styles.headerTitleContainer}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.one }}>
              <MaterialCommunityIcons name="shimmer" size={17} color={Palette.primaryDark} />
              <AppText
                variant="h3"
                tone="brand"
                style={{ fontFamily: Fonts.serif, fontWeight: '700' }}>
                SkinCycle AI
              </AppText>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.one }}>
              <View style={styles.onlineDot} />
              <AppText tone="secondary" style={{ fontSize: 11, lineHeight: 15 }}>
                ที่ปรึกษาผิวพรรณ • พร้อมตอบคำถาม
              </AppText>
            </View>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="ล้างบทสนทนา"
            onPress={handleClearChat}
            hitSlop={12}
            style={({ pressed }) => [styles.headerButton, pressed && { opacity: 0.6 }]}>
            <MaterialCommunityIcons name="trash-can-outline" size={20} color={Palette.textSecondary} />
          </Pressable>
        </View>

        {/* Messages List */}
        <ScrollView
          ref={scrollViewRef}
          style={{ flex: 1 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + Spacing.four },
          ]}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={scrollToBottom}>
          {messages.map((message) => {
            const isUser = message.role === 'user';

            return (
              <View
                key={message.id}
                style={[styles.messageRow, isUser ? styles.userRow : styles.modelRow]}>
                {!isUser && (
                  <View style={styles.avatarContainer}>
                    <LinearGradient
                      colors={['#72BE94', '#28674A']}
                      style={styles.avatarGradient}>
                      <MaterialCommunityIcons name="leaf" size={14} color={Palette.white} />
                    </LinearGradient>
                  </View>
                )}

                <View
                  style={[
                    styles.bubble,
                    isUser ? styles.userBubble : styles.modelBubble,
                    message.isError && styles.errorBubble,
                  ]}>
                  <FormattedChatText
                    text={message.text}
                    textColor={isUser ? Palette.white : message.isError ? Palette.danger : Palette.textPrimary}
                  />

                  {!isUser && !message.isError && (
                    <View style={styles.disclaimerContainer}>
                      <AppText tone="secondary" style={styles.disclaimerText}>
                        SkinCycle AI แนะนำตามหลักสกินแคร์เบื้องต้น หากมีอาการผิดปกติรุนแรงควรพบแพทย์ผิวหนัง
                      </AppText>
                    </View>
                  )}
                </View>
              </View>
            );
          })}

          {/* Typing Indicator */}
          {isLoading && (
            <View style={[styles.messageRow, styles.modelRow]}>
              <View style={styles.avatarContainer}>
                <LinearGradient colors={['#72BE94', '#28674A']} style={styles.avatarGradient}>
                  <MaterialCommunityIcons name="leaf" size={14} color={Palette.white} />
                </LinearGradient>
              </View>
              <View style={[styles.bubble, styles.modelBubble, styles.loadingBubble]}>
                <ActivityIndicator size="small" color={Palette.primaryDark} />
                <AppText tone="brand" style={{ fontSize: 13, fontStyle: 'italic' }}>
                  SkinCycle AI กำลังคิดคำแนะนำเพื่อผิวคุณ...
                </AppText>
              </View>
            </View>
          )}

          {/* Suggested Quick Questions (Only show when history is short) */}
          {messages.length <= 2 && !isLoading && (
            <View style={styles.suggestionsContainer}>
              <AppText tone="secondary" style={styles.suggestionsTitle}>
                คำถามแนะนำที่พบบ่อย:
              </AppText>
              <View style={styles.chipsWrap}>
                {SUGGESTED_QUESTIONS.map((question) => (
                  <Pressable
                    key={question}
                    onPress={() => handleSend(question)}
                    style={({ pressed }) => [
                      styles.suggestionChip,
                      pressed && { opacity: 0.7, backgroundColor: Palette.softGreen },
                    ]}>
                    <MaterialCommunityIcons
                      name="chat-question-outline"
                      size={14}
                      color={Palette.primaryDark}
                    />
                    <AppText style={styles.suggestionChipText}>{question}</AppText>
                  </Pressable>
                ))}
              </View>
            </View>
          )}
        </ScrollView>

        {/* Input Bar */}
        <View
          style={[
            styles.inputContainer,
            { paddingBottom: Math.max(insets.bottom, Spacing.three) },
          ]}>
          <TextInput
            value={inputText}
            onChangeText={setInputText}
            onFocus={scrollToBottom}
            placeholder="พิมพ์ถามเรื่องผิว หรือสกินแคร์ที่นี่..."
            placeholderTextColor={Palette.textSecondary}
            multiline
            maxLength={1000}
            style={styles.textInput}
            editable={!isLoading}
          />

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="ส่งข้อความ"
            onPress={() => handleSend()}
            disabled={!inputText.trim() || isLoading}
            style={({ pressed }) => [
              styles.sendButton,
              (!inputText.trim() || isLoading) && styles.sendButtonDisabled,
              pressed && { opacity: 0.8 },
            ]}>
            <MaterialCommunityIcons
              name="arrow-up"
              size={22}
              color={!inputText.trim() || isLoading ? '#A4A8A4' : Palette.white}
            />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.three,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEF0ED',
  },
  headerButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F5F7F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleContainer: {
    alignItems: 'center',
    gap: 2,
  },
  onlineDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#4CAF50',
  },
  scrollContent: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    gap: Spacing.three,
  },
  messageRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    alignItems: 'flex-start',
  },
  userRow: {
    justifyContent: 'flex-end',
  },
  modelRow: {
    justifyContent: 'flex-start',
  },
  avatarContainer: {
    paddingTop: 2,
  },
  avatarGradient: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubble: {
    maxWidth: '82%',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderRadius: Radius.card,
    borderCurve: 'continuous',
  },
  userBubble: {
    backgroundColor: Palette.primaryDark,
    borderBottomRightRadius: Spacing.one,
  },
  modelBubble: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E3ECE6',
    borderBottomLeftRadius: Spacing.one,
    ...Platform.select({
      ios: {
        shadowColor: '#2C4137',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
      },
      android: {
        elevation: 1,
      },
      default: {
        boxShadow: '0 2px 6px rgba(44, 65, 55, 0.05)',
      },
    }),
  },
  errorBubble: {
    backgroundColor: '#FFF5F5',
    borderColor: '#FED7D7',
  },
  loadingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.three,
  },
  disclaimerContainer: {
    marginTop: Spacing.two,
    paddingTop: Spacing.one,
    borderTopWidth: 1,
    borderTopColor: '#F0F4F1',
  },
  disclaimerText: {
    fontSize: 10,
    lineHeight: 14,
    color: '#8A928D',
  },
  suggestionsContainer: {
    marginTop: Spacing.two,
    gap: Spacing.two,
  },
  suggestionsTitle: {
    fontSize: 12,
    fontWeight: '600',
    paddingLeft: Spacing.one,
  },
  chipsWrap: {
    gap: Spacing.two,
  },
  suggestionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.round,
    borderWidth: 1,
    borderColor: '#DCE7E0',
  },
  suggestionChipText: {
    fontSize: 12,
    lineHeight: 17,
    color: Palette.textPrimary,
    flex: 1,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#EEF0ED',
    gap: Spacing.two,
  },
  textInput: {
    flex: 1,
    minHeight: 44,
    maxHeight: 100,
    backgroundColor: '#F5F7F5',
    borderRadius: Radius.card,
    borderWidth: 1,
    borderColor: '#E2E6E2',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 14,
    lineHeight: 20,
    color: Palette.textPrimary,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Palette.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#E7ECE8',
  },
});
