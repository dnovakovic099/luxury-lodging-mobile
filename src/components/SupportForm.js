import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { theme } from '../theme';

const FormInput = ({ label, icon, multiline, ...props }) => (
  <View style={styles.inputContainer}>
    <Text style={styles.label}>{label}</Text>
    <View style={[styles.inputWrapper, multiline && styles.inputWrapperMultiline]}>
      <Icon name={icon} size={20} color={theme.colors.text.secondary} style={styles.inputIcon} />
      <TextInput
        style={[styles.input, multiline && styles.inputMultiline]}
        placeholderTextColor={theme.colors.text.secondary}
        multiline={multiline}
        {...props}
      />
    </View>
  </View>
);

const SupportForm = ({ onSubmit }) => {
  const [category, setCategory] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const buttonScale = new Animated.Value(1);

  const handleSubmit = async () => {
    if (!category || !subject || !message) return;

    setIsSubmitting(true);
    Animated.sequence([
      Animated.timing(buttonScale, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(buttonScale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    try {
      await onSubmit({ category, subject, message });
      setCategory('');
      setSubject('');
      setMessage('');
    } catch (error) {
      console.error('Error submitting form:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const categories = ['General Inquiry', 'Technical Support', 'Billing', 'Feature Request'];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Submit a Request</Text>
      
      <View style={styles.categoryContainer}>
        {categories.map((cat) => (
          <TouchableOpacity
            key={cat}
            style={[
              styles.categoryButton,
              category === cat && styles.categoryButtonActive
            ]}
            onPress={() => setCategory(cat)}
          >
            <Text
              style={[
                styles.categoryText,
                category === cat && styles.categoryTextActive
              ]}
            >
              {cat}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FormInput
        label="Subject"
        icon="document-text-outline"
        placeholder="Enter subject"
        value={subject}
        onChangeText={setSubject}
      />

      <FormInput
        label="Message"
        icon="chatbubble-outline"
        placeholder="Describe your issue or request"
        value={message}
        onChangeText={setMessage}
        multiline
        numberOfLines={4}
      />

      <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
        <TouchableOpacity
          style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <Text style={styles.submitButtonText}>Submitting...</Text>
          ) : (
            <Text style={styles.submitButtonText}>Submit Request</Text>
          )}
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    margin: theme.spacing.lg,
    ...theme.shadows.small,
  },
  title: {
    ...theme.typography.h2,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.lg,
  },
  categoryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
  },
  categoryButton: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.card.background,
    borderWidth: 1,
    borderColor: theme.colors.card.border,
  },
  categoryButtonActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  categoryText: {
    ...theme.typography.caption,
    color: theme.colors.text.secondary,
  },
  categoryTextActive: {
    color: theme.colors.background,
    fontWeight: '600',
  },
  inputContainer: {
    marginBottom: theme.spacing.lg,
  },
  label: {
    ...theme.typography.caption,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.sm,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.card.background,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.card.border,
    paddingHorizontal: theme.spacing.md,
  },
  inputWrapperMultiline: {
    alignItems: 'flex-start',
    paddingVertical: theme.spacing.sm,
  },
  inputIcon: {
    marginRight: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  input: {
    flex: 1,
    color: theme.colors.text.primary,
    ...theme.typography.body,
    paddingVertical: theme.spacing.md,
  },
  inputMultiline: {
    height: 100,
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    alignItems: 'center',
    marginTop: theme.spacing.md,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    ...theme.typography.h3,
    color: theme.colors.background,
  },
});

export default SupportForm;
