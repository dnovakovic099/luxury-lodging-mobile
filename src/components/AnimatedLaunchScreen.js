import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Dimensions, Text, Image, ActivityIndicator } from 'react-native';
import LottieView from 'lottie-react-native';

const { width, height } = Dimensions.get('window');

const AnimatedLaunchScreen = ({ onAnimationFinish }) => {
  const animationRef = useRef(null);
  const [lottieError, setLottieError] = useState(false);
  
  // Set a timer to ensure we eventually move on even if animation fails
  useEffect(() => {
    const timer = setTimeout(() => {
      if (onAnimationFinish) {
        onAnimationFinish();
      }
    }, 3000); // Fallback timeout of 3 seconds
    
    return () => clearTimeout(timer);
  }, [onAnimationFinish]);

  const handleAnimationFinish = () => {
    if (onAnimationFinish) {
      onAnimationFinish();
    }
  };
  
  const handleError = () => {
    console.warn('Error loading Lottie animation');
    setLottieError(true);
  };

  // If Lottie fails, show a fallback with logo
  if (lottieError) {
    return (
      <View style={styles.container}>
        <Image 
          source={require('../assets/logo.png')} 
          style={styles.logo}
          resizeMode="contain"
        />
        <ActivityIndicator size="large" color="#B6944C" style={styles.loader} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.animationContainer}>
        {/* Wrap in try-catch via error boundaries in production */}
        <LottieView
          ref={animationRef}
          source={require('../assets/launch_animation.json')}
          autoPlay
          loop={false}
          style={styles.animation}
          onAnimationFinish={handleAnimationFinish}
          onError={handleError}
          resizeMode="cover"
          speed={1.0}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  animationContainer: {
    width: width,
    height: height,
    justifyContent: 'center',
    alignItems: 'center',
  },
  animation: {
    width: width * 0.8,
    height: height * 0.6,
  },
  logo: {
    width: 200,
    height: 200,
  },
  loader: {
    marginTop: 20,
  }
});

export default AnimatedLaunchScreen; 