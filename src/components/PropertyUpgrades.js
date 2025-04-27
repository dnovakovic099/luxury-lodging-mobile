import React, { useState, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  Modal, 
  SafeAreaView,
  Dimensions
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { theme as defaultTheme } from '../theme';
import { useTheme } from '../context/ThemeContext';

// Define gold color matching the app theme
const GOLD = {
  primary: '#B6944C',
  light: 'rgba(182, 148, 76, 0.9)',
  lighter: 'rgba(182, 148, 76, 0.15)',
};

const { width, height } = Dimensions.get('window');

// Calculate annual revenue based on cost and ROI percentage
const calculateAnnualRevenue = (cost, roiPercentage) => {
  return (cost * roiPercentage) / 100;
};

// Format currency for display
const formatCurrency = (amount) => {
  return amount.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  });
};

// Simple card for dashboard view
const UpgradeCard = ({ upgrade, onMoreInfo }) => {
  const { theme } = useTheme();
  const { title, description, icon, cost, roiPercentage } = upgrade;
  const annualRevenue = calculateAnnualRevenue(cost, roiPercentage);
  
  return (
    <View style={[styles.upgradeCard, { backgroundColor: '#FFFFFF', borderColor: '#E5E0D5' }]}>
      <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <View style={styles.iconContainer}>
            <Ionicons name={icon} size={18} color={theme.primary} />
          </View>
          <Text style={[styles.cardTitle, { color: '#333333' }]}>{title}</Text>
        </View>
        
        <View style={styles.descriptionContainer}>
          <Text style={[styles.cardDescription, { color: '#666666' }]} numberOfLines={2}>
            {description}
          </Text>
          <View style={[styles.roiContainer]}>
            <Text style={[styles.roiText, { color: '#4CAF50' }]}>+{roiPercentage}%</Text>
            <Text style={[styles.roiLabel, { color: '#4CAF50' }]}>ROI</Text>
          </View>
        </View>
      </View>
      
      <TouchableOpacity 
        style={[styles.moreInfoButton, { borderTopColor: '#E5E0D5' }]}
        activeOpacity={0.8}
        onPress={onMoreInfo}
      >
        <Text style={[styles.moreInfoText, { color: theme.primary }]}>More Info</Text>
      </TouchableOpacity>
    </View>
  );
};

// Detailed card for modal view
const DetailedUpgradeCard = ({ upgrade }) => {
  const { theme } = useTheme();
  const { title, description, icon, cost, roiPercentage } = upgrade;
  const annualRevenue = calculateAnnualRevenue(cost, roiPercentage);
  
  return (
    <View style={[styles.detailedCard, { backgroundColor: theme.surface, borderColor: theme.borderColor }]}>
      <View style={styles.detailedCardHeader}>
        <View style={styles.detailedIconContainer}>
          <Ionicons name={icon} size={28} color={theme.primary} />
        </View>
        <View style={styles.detailedTitleContainer}>
          <Text style={[styles.detailedTitle, { color: theme.text.primary }]}>{title}</Text>
        </View>
      </View>
      
      <Text style={[styles.detailedDescription, { color: theme.text.secondary }]}>{description}</Text>
      
      <View style={[styles.cardDivider, { backgroundColor: theme.borderColor }]} />
      
      <View style={styles.financialDetails}>
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: theme.text.secondary }]}>Cost</Text>
          <Text style={[styles.detailValue, { color: theme.text.primary }]}>{formatCurrency(cost)}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: theme.text.secondary }]}>Annual Revenue</Text>
          <Text style={[styles.detailValue, styles.positiveValue]}>{formatCurrency(annualRevenue)}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: theme.text.secondary }]}>ROI</Text>
          <Text style={[styles.detailValue, styles.positiveValue]}>{roiPercentage}%</Text>
        </View>
      </View>
      
      <TouchableOpacity style={[styles.learnMoreButton, { backgroundColor: GOLD.primary }]}>
        <Text style={styles.learnMoreText}>Learn More</Text>
      </TouchableOpacity>
    </View>
  );
};

const PropertyUpgrades = () => {
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedUpgrade, setSelectedUpgrade] = useState(null);
  const { theme } = useTheme();
  
  // Sample upgrades data
  const upgrades = [
    {
      id: 1,
      title: 'Game Room Addition',
      description: 'Entertainment space with gaming table, console, and recreational activities.',
      icon: 'game-controller-outline',
      cost: 8000,
      roiPercentage: 250,
      longDescription: "Create an exciting entertainment space with a pool table, gaming console, board games, and other recreational activities. This amenity is highly attractive to families and groups, significantly increasing booking rates and allowing for premium pricing."
    },
    {
      id: 2,
      title: 'Outdoor Hot Tub',
      description: 'Luxurious outdoor hot tub with premium jets and LED lighting.',
      icon: 'water-outline',
      cost: 4000,
      roiPercentage: 150,
      longDescription: "Install a premium outdoor hot tub with therapeutic jets and ambient LED lighting. Hot tubs are consistently among the most sought-after amenities for vacation rentals, allowing you to charge higher rates year-round."
    },
    {
      id: 3,
      title: 'Premium Kitchen Upgrade',
      description: 'Full kitchen renovation with high-end appliances and premium fixtures.',
      icon: 'restaurant-outline',
      cost: 15000,
      roiPercentage: 15,
      longDescription: "Transform your kitchen into a chef's dream with top-of-the-line appliances, custom cabinetry, and premium countertops. This upgrade significantly enhances your property's appeal to luxury travelers who expect nothing but the best."
    },
    {
      id: 4,
      title: 'Smart Home Feature',
      description: 'Adding smart thermostat and other connected devices',
      icon: 'home-outline',
      cost: 300,
      roiPercentage: 15
    },
    {
      id: 5,
      title: 'Professional Photography',
      description: 'High-quality photography can increase bookings by 25%. Update your listing with professional shots.',
      icon: 'camera-outline',
      cost: 350,
      roiPercentage: 15
    },
    {
      id: 6,
      title: 'Premium Bedding',
      description: 'Upgrade to hotel-quality linens and premium mattress toppers',
      icon: 'bed-outline',
      cost: 1250,
      roiPercentage: 20
    },
    {
      id: 7,
      title: 'Virtual Check-in',
      description: 'Implement digital check-in system with smart locks for contactless arrivals',
      icon: 'key-outline',
      cost: 550,
      roiPercentage: 18
    }
  ];

  // Calculate total potential revenue from all upgrades
  const calculateTotalUpgradeValue = () => {
    return upgrades.reduce((total, upgrade) => {
      return total + calculateAnnualRevenue(upgrade.cost, upgrade.roiPercentage);
    }, 0);
  };
  
  // Calculate annual revenue for an upgrade
  const calculateAnnualRevenue = (upgrade) => {
    return upgrade.cost * upgrade.roi;
  };

  // Sort upgrades by annual revenue (highest first)
  const sortedUpgrades = [...upgrades].sort((a, b) => {
    const revenueA = calculateAnnualRevenue(a.cost, a.roiPercentage);
    const revenueB = calculateAnnualRevenue(b.cost, b.roiPercentage);
    return revenueB - revenueA;
  });

  const openAllUpgradesModal = () => {
    setSelectedUpgrade(null);
    setModalVisible(true);
  };
  
  const openUpgradeModal = (upgrade) => {
    setSelectedUpgrade(upgrade);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setSelectedUpgrade(null);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Ionicons name="flash-outline" size={18} color={theme.primary} />
          <Text style={[styles.title, { color: theme.text.primary }]}>Property Upgrades</Text>
        </View>
        <TouchableOpacity onPress={openAllUpgradesModal} style={styles.viewAllButton}>
          <Text style={[styles.viewAllText, { color: theme.primary }]}>View All</Text>
        </TouchableOpacity>
      </View>
      
      <ScrollView 
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {sortedUpgrades.map(upgrade => (
          <UpgradeCard
            key={upgrade.id}
            upgrade={upgrade}
            onMoreInfo={() => openUpgradeModal(upgrade)}
          />
        ))}
      </ScrollView>
      
      {/* Modal for upgrade details */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={closeModal}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
            <View style={[styles.modalHeader, { backgroundColor: theme.primary }]}>
              <Text style={styles.modalTitle}>
                {selectedUpgrade ? selectedUpgrade.title : 'Property Upgrades'}
              </Text>
              <TouchableOpacity onPress={closeModal} style={styles.closeButton}>
                <Ionicons name="close" size={24} color="#FFF" />
              </TouchableOpacity>
            </View>
            
            <ScrollView 
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.modalScrollContent}
            >
              {selectedUpgrade ? (
                <DetailedUpgradeCard upgrade={selectedUpgrade} />
              ) : (
                sortedUpgrades.map(upgrade => (
                  <DetailedUpgradeCard key={upgrade.id} upgrade={upgrade} />
                ))
              )}
            </ScrollView>
            
            <TouchableOpacity 
              style={[styles.cancelButton, { borderTopColor: theme.borderColor }]} 
              onPress={closeModal}
            >
              <Text style={[styles.cancelButtonText, { color: theme.text.secondary }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 12,
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingVertical: 2,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  viewAllButton: {
    backgroundColor: 'rgba(182, 148, 76, 0.15)',
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 14,
  },
  viewAllText: {
    fontSize: 13,
    color: GOLD.primary,
    fontWeight: '500',
  },
  scrollContent: {
    paddingRight: 16,
    paddingBottom: 8,
  },
  
  // Dashboard card styles
  upgradeCard: {
    width: 275,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginRight: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E0D5',
    flexDirection: 'column',
    justifyContent: 'space-between',
    height: 140,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  cardContent: {
    flex: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 6,
  },
  iconContainer: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(182, 148, 76, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333333',
  },
  descriptionContainer: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
  cardDescription: {
    flex: 1,
    fontSize: 13,
    color: '#666666',
    lineHeight: 18,
    paddingRight: 10,
  },
  roiContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 45,
    marginTop: 2,
  },
  roiText: {
    color: '#4CAF50',
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
  roiLabel: {
    color: '#4CAF50',
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 2,
  },
  moreInfoButton: {
    backgroundColor: '#FCFAF5',
    paddingVertical: 11,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#E5E0D5',
    width: '100%',
  },
  moreInfoText: {
    color: GOLD.primary,
    fontWeight: '600',
    fontSize: 13,
  },
  
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    height: '60%',
    backgroundColor: '#121212',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalScrollContent: {
    padding: 16,
  },
  cancelButton: {
    marginHorizontal: 16,
    marginTop: 0,
    marginBottom: 16,
    padding: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  
  // Detailed card styles
  detailedCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  detailedCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 12,
  },
  detailedIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(182, 148, 76, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  detailedTitleContainer: {
    flex: 1,
  },
  detailedTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  detailedDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    lineHeight: 20,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  cardDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginHorizontal: 16,
  },
  financialDetails: {
    padding: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  detailLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  positiveValue: {
    color: '#4ADE80',
  },
  learnMoreButton: {
    backgroundColor: GOLD.primary,
    paddingVertical: 14,
    alignItems: 'center',
  },
  learnMoreText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
});

export default PropertyUpgrades; 