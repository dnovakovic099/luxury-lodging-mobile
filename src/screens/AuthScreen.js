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
import { theme } from '../theme';
import { useAuth } from '../context/AuthContext';

const AuthScreen = () => {
  const { signIn, signInWithGoogle, getToken, checkToken, removeToken, errorMessage, isLoading: authLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const tokenCheckPerformed = useRef(false);

  const handleAuth = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setIsLoading(true);

    try {
      console.log('Signing in with:', email);
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
      style={styles.container}>
      <View style={styles.content}>
        <Image source={require('../assets/logo.png')} style={styles.logo} />

        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={theme.colors.text.secondary}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            editable={!isLoading}
          />

          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor={theme.colors.text.secondary}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            editable={!isLoading}
          />

          {/*<TouchableOpacity style={styles.forgotPassword}>*/}
          {/*  <Text style={styles.forgotPasswordText}>Forgot Password?</Text>*/}
          {/*</TouchableOpacity>*/}

          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handleAuth}
            disabled={isLoading}>
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
    </KeyboardAvoidingView>
  );
};


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.xl,
  },
  logo: {
    alignSelf: 'center',
    marginBottom: theme.spacing.xl * 2,
    width: 200,
    height: 200,
    resizeMode: 'contain',
  },
  form: {
    gap: theme.spacing.lg,
  },
  input: {
    backgroundColor: '#333333',
    borderRadius: theme.borderRadius.lg,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    color: '#FFFFFF',
    ...theme.typography.body,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: theme.spacing.lg,
  },
  forgotPasswordText: {
    ...theme.typography.caption,
    color: theme.colors.primary,
  },
  button: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.lg,
    paddingVertical: theme.spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    ...theme.typography.button,
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
    marginRight: theme.spacing.md,
  },
  buttonGoogleText: {
    ...theme.typography.button,
    color: '#000000',
  },
  errorText: {
    color: 'red',
    marginTop: 10,
  }
});

export default AuthScreen;
