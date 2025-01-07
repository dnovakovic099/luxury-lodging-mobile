import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../theme';

const ChatMessage = ({ message, isUser }) => {
  return (
    <View style={[
      styles.container,
      isUser ? styles.userContainer : styles.botContainer
    ]}>
      <View style={[
        styles.bubble,
        isUser ? styles.userBubble : styles.botBubble
      ]}>
        <Text style={[
          styles.text,
          isUser ? styles.userText : styles.botText
        ]}>
          {message.text}
        </Text>
        <Text style={styles.timestamp}>
          {new Date(message.timestamp).toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
          })}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: theme.spacing.xs,
    marginHorizontal: theme.spacing.lg,
    flexDirection: 'row',
  },
  userContainer: {
    justifyContent: 'flex-end',
  },
  botContainer: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '80%',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    ...theme.shadows.small,
  },
  userBubble: {
    backgroundColor: theme.colors.primary,
    borderBottomRightRadius: theme.spacing.xs,
  },
  botBubble: {
    backgroundColor: theme.colors.surface,
    borderBottomLeftRadius: theme.spacing.xs,
  },
  text: {
    ...theme.typography.body,
  },
  userText: {
    color: theme.colors.background,
  },
  botText: {
    color: theme.colors.text.primary,
  },
  timestamp: {
    ...theme.typography.small,
    color: theme.colors.text.secondary,
    marginTop: theme.spacing.xs,
    alignSelf: 'flex-end',
  },
});

export default ChatMessage;
