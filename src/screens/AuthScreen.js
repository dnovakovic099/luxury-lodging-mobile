import React, {useEffect, useState, useRef} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { theme as defaultTheme } from '../theme';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const AuthScreen = () => {
  const { signIn, signInWithGoogle, getToken, checkToken, removeToken, errorMessage, isLoading: authLoading } = useAuth();
  const { theme, isDarkMode } = useTheme();
  const [email, setEmail] = useState('dirose9336@gmail.com');
  const [password, setPassword] = useState('Abc123!!');
  const [isLoading, setIsLoading] = useState(false);
  const tokenCheckPerformed = useRef(false);

  const handleAuth = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setIsLoading(true);

    try {
      await signIn({ email, password });
    } catch (error) {
      Alert.alert('Error', error.message || 'Sign in failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.container, { zIndex: 1 }]} pointerEvents="auto">
        <View style={styles.content}>
          <Image source={require('../assets/logo.png')} style={styles.logo} />

          <View style={styles.form} pointerEvents="auto">
            <TextInput
              style={[styles.input, { 
                backgroundColor: isDarkMode ? '#333333' : '#F0F0F0',
                color: theme.text.primary 
              }]}
              placeholder="Email"
              placeholderTextColor={theme.text.secondary}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!isLoading}
              importantForAutofill="yes"
              textContentType="username"
            />

            <TextInput
              style={[styles.input, { 
                backgroundColor: isDarkMode ? '#333333' : '#F0F0F0',
                color: theme.text.primary 
              }]}
              placeholder="Password"
              placeholderTextColor={theme.text.secondary}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              editable={!isLoading}
              importantForAutofill="yes"
              textContentType="password"
            />

            {/*<TouchableOpacity style={styles.forgotPassword}>*/}
            {/*  <Text style={styles.forgotPasswordText}>Forgot Password?</Text>*/}
            {/*</TouchableOpacity>*/}

            <TouchableOpacity
              style={[styles.button, isLoading && styles.buttonDisabled]}
              onPress={handleAuth}
              disabled={isLoading}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.buttonText}>Sign In</Text>
              )}
            </TouchableOpacity>

            <Text style={styles.errorText}>{errorMessage}</Text>

            {/*<TouchableOpacity*/}
            {/*  style={[styles.button, styles.buttonGoogle]}*/}
            {/*  onPress={handleGoogleSignIn}*/}
            {/*>*/}
            {/*  <Image*/}
            {/*    source={require('../assets/google.webp')}*/}
            {/*    style={styles.googleLogo}*/}
            {/*  />*/}
            {/*  <Text style={styles.buttonGoogleText}>Sign in with Google</Text>*/}
            {/*</TouchableOpacity>*/}
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};


const styles = StyleSheet.create({
  container: {
    flex: 1,
    zIndex: 999,
    elevation: 999,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: defaultTheme.spacing.xl,
  },
  logo: {
    alignSelf: 'center',
    marginBottom: defaultTheme.spacing.xl * 2,
    width: 200,
    height: 200,
    resizeMode: 'contain',
  },
  form: {
    gap: defaultTheme.spacing.lg,
  },
  input: {
    borderRadius: defaultTheme.borderRadius.lg,
    paddingHorizontal: defaultTheme.spacing.lg,
    paddingVertical: defaultTheme.spacing.md,
    ...defaultTheme.typography.body,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: defaultTheme.spacing.lg,
  },
  forgotPasswordText: {
    ...defaultTheme.typography.caption,
    color: defaultTheme.colors.primary,
  },
  button: {
    backgroundColor: defaultTheme.colors.primary,
    borderRadius: defaultTheme.borderRadius.lg,
    paddingVertical: defaultTheme.spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    ...defaultTheme.typography.button,
    color: '#FFFFFF',
  },
  buttonGoogle: {
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  googleLogo: {
    width: 24,
    height: 24,
    marginRight: defaultTheme.spacing.md,
  },
  buttonGoogleText: {
    ...defaultTheme.typography.button,
    color: '#000000',
  },
  errorText: {
    color: 'red',
    marginTop: 10,
  }
});

export default AuthScreen;
