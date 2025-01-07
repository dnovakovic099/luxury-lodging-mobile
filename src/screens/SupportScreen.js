import React, { useState, useRef } from 'react';
import {
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  Animated,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import SupportForm from '../components/SupportForm';
import ChatMessage from '../components/ChatMessage';
import { theme } from '../theme';

const SupportScreen = () => {
  const [messages, setMessages] = useState([
    {
      id: '1',
      text: "Hello! I'm your virtual assistant. How can I help you today?",
      timestamp: new Date(),
      isUser: false,
    },
  ]);
  const [newMessage, setNewMessage] = useState('');
  const [showForm, setShowForm] = useState(false);
  const scrollViewRef = useRef();

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;

    // Add user message
    const userMessage = {
      id: Date.now().toString(),
      text: newMessage,
      timestamp: new Date(),
      isUser: true,
    };

    setMessages(prev => [...prev, userMessage]);
    setNewMessage('');

    // Simulate bot response
    setTimeout(() => {
      const botMessage = {
        id: (Date.now() + 1).toString(),
        text: "I'll help you with that. You can submit a formal request using the button below. Live chat assistance will soon be avaliable. Thank you and have a wonderful day!",
        timestamp: new Date(),
        isUser: false,
      };
      setMessages(prev => [...prev, botMessage]);
    }, 1000);
  };

  const handleFormSubmit = async (formData) => {
    // Handle form submission
    console.log('Form submitted:', formData);
    setShowForm(false); // Hide form after submission
    // Add success message to chat
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      text: "Your request has been submitted successfully. We'll get back to you soon!",
      timestamp: new Date(),
      isUser: false,
    }]);
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      {!showForm ? (
        <>
          <ScrollView
            ref={scrollViewRef}
            onContentSizeChange={() => scrollViewRef.current.scrollToEnd({ animated: true })}
            style={styles.chatContainer}
          >
            {messages.map(message => (
              <ChatMessage key={message.id} message={message} isUser={message.isUser} />
            ))}
          </ScrollView>

          <View style={styles.inputContainer}>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                value={newMessage}
                onChangeText={setNewMessage}
                placeholder="Type a message..."
                placeholderTextColor={theme.colors.text.secondary}
                multiline
              />
              <TouchableOpacity 
                style={styles.sendButton} 
                onPress={handleSendMessage}
                disabled={!newMessage.trim()}
              >
                <Icon 
                  name="send" 
                  size={24} 
                  color={newMessage.trim() ? theme.colors.primary : theme.colors.text.secondary} 
                />
              </TouchableOpacity>
            </View>
            <TouchableOpacity 
              style={styles.requestButton}
              onPress={() => setShowForm(true)}
            >
              <Icon name="create-outline" size={20} color={theme.colors.background} />
              <Text style={styles.requestButtonText}>Submit Request</Text>
            </TouchableOpacity>
          </View>
        </>
      ) : (
        <ScrollView style={styles.formContainer}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => setShowForm(false)}
          >
            <Icon name="arrow-back" size={24} color={theme.colors.primary} />
            <Text style={styles.backButtonText}>Back to Chat</Text>
          </TouchableOpacity>
          <SupportForm onSubmit={handleFormSubmit} />
        </ScrollView>
      )}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    paddingTop: 20
  },
  chatContainer: {
    flex: 1,
  },
  inputContainer: {
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.card.border,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  input: {
    flex: 1,
    backgroundColor: theme.colors.card.background,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginRight: theme.spacing.md,
    color: theme.colors.text.primary,
    maxHeight: 100,
  },
  sendButton: {
    padding: theme.spacing.sm,
  },
  requestButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  requestButtonText: {
    ...theme.typography.body,
    color: theme.colors.background,
    fontWeight: '600',
    marginLeft: theme.spacing.sm,
  },
  formContainer: {
    flex: 1,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
  },
  backButtonText: {
    ...theme.typography.body,
    color: theme.colors.primary,
    marginLeft: theme.spacing.sm,
  },
});

export default SupportScreen;