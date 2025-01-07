import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { Camera, Paintbrush, Package, Users, Star, Sparkles, TrendingUp, DollarSign, Zap } from 'lucide-react-native';
import { theme } from '../theme';
import { fetchListings } from '../services/api';

import PropertyPicker from '../components/PropertyPicker';
import RevenueCard from '../components/RevenueCard';
import GradeIndicator from '../components/GradeIndicator';
import ReferralSection from '../components/ReferralSection';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const EarnMoreScreen = () => {
  const [selectedProperty, setSelectedProperty] = useState('');
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchPropertyData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchListings();
      if (response?.result?.length > 0) {
        setProperties(response.result);
        if (!selectedProperty) {
          setSelectedProperty(response.result[0].id);
        }
      } else {
        setError('No properties found');
      }
    } catch (err) {
      console.error('Error fetching properties:', err);
      setError('Failed to load properties');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPropertyData();
  }, []);

  const handlePropertyChange = (propertyId) => {
    setSelectedProperty(propertyId);
  };

  const grades = [
    { 
      label: 'Photography', 
      grade: 35,
      icon: Camera,
      details: 'Only 8 photos available. Professional photography could increase bookings by 35%',
      stats: 'Coverage: 8/30 recommended shots',
      improvement: '+65% potential improvement',
      aiRecommendation: 'AI analysis suggests focusing on exterior twilight shots'
    },
    { 
      label: 'Design', 
      grade: 72,
      icon: Paintbrush,
      details: 'Modern updates needed in kitchen and bathrooms',
      stats: 'Modern design score: 72/100',
      improvement: '+28% potential improvement',
      aiRecommendation: 'Similar properties see 15% higher bookings with updated kitchens'
    },
    { 
      label: 'Amenities', 
      grade: 90,
      icon: Package,
      details: 'Adding a hot tub could increase annual revenue by $20,000',
      stats: '18/20 premium amenities',
      improvement: '+10% potential improvement',
      aiRecommendation: 'Market analysis shows high demand for outdoor features'
    },
    { 
      label: 'Sleeping Count', 
      grade: 45,
      icon: Users,
      details: 'Current: 8 guests | Potential: 15 guests',
      stats: 'Utilizing 45% of space capacity',
      improvement: '+55% potential improvement',
      aiRecommendation: 'Space optimization could add 2 more sleeping areas'
    },
    { 
      label: 'Reviews', 
      grade: 95,
      icon: Star,
      details: '4.92 average from 128 reviews. Top 2% in your market',
      stats: '128 reviews, 95% positive',
      improvement: 'Maintaining excellence',
      aiRecommendation: 'Sentiment analysis shows strong praise for location'
    },
  ];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.pickerWrapper}>
        <PropertyPicker 
          selectedProperty={selectedProperty}
          onValueChange={handlePropertyChange}
          properties={properties}
          loading={loading}
          error={error}
        />
      </View>

      <View style={styles.content}>
        <View style={styles.metricsContainer}>
          <RevenueCard 
            title="Monthly Revenue"
            current="4,500"
            potential="6,200"
            market="5,800"
            marketColor="#4B5563"
          />
          <View style={styles.metricSpacing} />
          <RevenueCard 
            title="Cleaning Fee"
            current="150"
            potential="125"
            market="175"
            marketColor="#4B5563"
          />
        </View>

        <View style={styles.recommendationsSection}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <Icon name="flash" size={16} color={theme.colors.primary} />
              <Text style={styles.sectionTitle}>AI Recommendations</Text>
              <View style={styles.sectionBadge}>
                <Text style={styles.sectionBadgeText}>5 insights</Text>
              </View>
            </View>
          </View>

          <View style={styles.gradesContainer}>
            {grades.map((item, index) => (
              <GradeIndicator key={index} {...item} />
            ))}
          </View>
        </View>

        <View style={styles.actionSection}>
          <TouchableOpacity 
            style={styles.consultButton}
            activeOpacity={0.8}
          >
            <View style={styles.consultButtonContent}>
              <Icon name="trending-up" size={18} color="white" />
              <Text style={styles.consultButtonText}>
                Request Revenue Consultation
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {Platform.OS === 'ios' && <View style={styles.bottomPadding} />}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  pickerWrapper: {
    paddingTop: Platform.OS === 'ios' ? 48 : 24,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  content: {
    paddingHorizontal: 16,
  },
  metricsContainer: {
    marginBottom: 24,
  },
  metricSpacing: {
    height: 12,
  },
  recommendationsSection: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text.primary,
    letterSpacing: -0.2,
  },
  sectionBadge: {
    backgroundColor: `${theme.colors.primary}12`,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    justifyContent: 'center',
  },
  sectionBadgeText: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.colors.primary,
    lineHeight: 14,
  },
  gradesContainer: {
    gap: 8,
  },
  actionSection: {
    marginTop: 16,
    marginBottom: 24,
    alignItems: 'center',
  },
  consultButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    width: '100%',
    ...Platform.select({
      ios: {
        shadowColor: theme.colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  consultButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  consultButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  bottomPadding: {
    height: 34,
  },
});

export default EarnMoreScreen;