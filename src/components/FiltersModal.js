import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  Modal, 
  StyleSheet, 
  Platform,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import DateRangePicker from './DateRangePicker';
import { theme } from '../theme';
import { fetchListings } from '../services/api';

const PLATFORMS = [
  { 
    id: 'all', 
    label: 'All Platforms', 
    icon: 'globe-outline',
    color: '#6366F1'
  },
  { 
    id: 'airbnb', 
    label: 'Airbnb', 
    icon: 'home-outline',
    color: '#F43F5E'
  },
  { 
    id: 'booking', 
    label: 'Booking.com', 
    icon: 'bed-outline',
    color: '#0096FF'
  },
  { 
    id: 'vrbo', 
    label: 'VRBO', 
    icon: 'business-outline',
    color: '#22C55E'
  },
  { 
    id: 'direct', 
    label: 'Direct', 
    icon: 'person-outline',
    color: '#EAB308'
  },
];

const PlatformSelect = ({ selectedPlatform, onSelectPlatform }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const currentPlatform = PLATFORMS.find(p => p.id === selectedPlatform) || PLATFORMS[0];

  return (
    <View style={styles.platformSelectContainer}>
      <TouchableOpacity
        style={[
          styles.platformSelectTrigger,
          isExpanded && styles.platformSelectTriggerExpanded
        ]}
        onPress={() => setIsExpanded(!isExpanded)}
      >
        <View style={styles.platformSelectHeader}>
          <View style={[styles.platformIcon, { backgroundColor: `${currentPlatform.color}15` }]}>
            <Icon name={currentPlatform.icon} size={18} color={currentPlatform.color} />
          </View>
          <Text style={styles.platformSelectText}>{currentPlatform.label}</Text>
          <Icon 
            name={isExpanded ? "chevron-up" : "chevron-down"} 
            size={18} 
            color={theme.colors.text.secondary} 
          />
        </View>
      </TouchableOpacity>

      {isExpanded && (
        <View style={styles.platformOptionsContainer}>
          {PLATFORMS.map((platform) => (
            <TouchableOpacity
              key={platform.id}
              style={[
                styles.platformOption,
                platform.id === selectedPlatform && styles.platformOptionSelected,
              ]}
              onPress={() => {
                onSelectPlatform(platform.id);
                setIsExpanded(false);
              }}
            >
              <View style={[styles.platformIcon, { backgroundColor: `${platform.color}15` }]}>
                <Icon name={platform.icon} size={18} color={platform.color} />
              </View>
              <Text style={[
                styles.platformOptionText,
                platform.id === selectedPlatform && { color: platform.color }
              ]}>
                {platform.label}
              </Text>
              {platform.id === selectedPlatform && (
                <Icon name="checkmark-circle" size={18} color={platform.color} />
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
};

const PropertySelect = ({ selectedProperties, onSelectProperty }) => {
  const [properties, setProperties] = useState([]);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const fetchProperties = async () => {
      const listings = await fetchListings();
      if (listings) {
        setProperties(listings);
      }
    };
    fetchProperties();
  }, []);

  if (!properties) { return }

  const listings = properties.result;

  return (
    <View style={styles.propertySelectContainer}>
      <TouchableOpacity
        style={[
          styles.propertySelectTrigger,
          isExpanded && styles.propertySelectTriggerExpanded,
        ]}
        onPress={() => setIsExpanded(!isExpanded)}
      >
        <View style={styles.propertySelectHeader}>
          <Text style={styles.propertySelectText}>
            {selectedProperties.length > 0
              ? `${selectedProperties.length} Properties Selected`
              : 'Select Properties'}
          </Text>
          <Icon
            name={isExpanded ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={theme.colors.text.secondary}
          />
        </View>
      </TouchableOpacity>

      {isExpanded && (
        <View style={styles.propertyOptionsContainer}>
          {listings.map((property) => (
            <TouchableOpacity
              key={property.id}
              style={[
                styles.propertyOption,
                selectedProperties.includes(property.id) && styles.propertyOptionSelected,
              ]}
              onPress={() => {
                onSelectProperty(property.id);
                setIsExpanded(false);
              }}
            >
              <Text style={[
                styles.propertyOptionText,
                selectedProperties.includes(property.id) && { color: theme.colors.primary },
              ]}>
                {property.name}
              </Text>
              {selectedProperties.includes(property.id) && (
                <Icon name="checkmark-circle" size={18} color={theme.colors.primary} />
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
};

const FiltersModal = ({ 
  visible, 
  onClose,
  selectedPlatform,
  onSelectPlatform,
  selectedProperties = [], // Set a default value for selectedProperties
  onSelectProperty,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
}) => {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={onClose}
            >
              <Icon name="close" size={24} color={theme.colors.text.secondary} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Filters</Text>
            <TouchableOpacity 
              style={styles.clearButton} 
              onPress={() => {
                onSelectPlatform('all');
                onSelectProperty([]);
                onStartDateChange(new Date());
                onEndDateChange(new Date(new Date().setDate(new Date().getDate() + 7)));
              }}
            >
              <Text style={styles.clearButtonText}>Reset</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Platform</Text>
              <PlatformSelect 
                selectedPlatform={selectedPlatform}
                onSelectPlatform={onSelectPlatform}
              />
            </View>
{/* 
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Properties</Text>
              <PropertySelect
                selectedProperties={selectedProperties}
                onSelectProperty={onSelectProperty}
              />
            </View> */}

            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Date Range</Text>
              <View style={styles.dateRangeContainer}>
                <View style={styles.dateInputContainer}>
                  <DateRangePicker
                    selectedDate={startDate}
                    onDateSelect={onStartDateChange}
                    label="Check-in"
                    placeholder="Start Date"
                  />
                </View>
                <View style={styles.dateArrow}>
                  <Icon name="arrow-forward" size={18} color={theme.colors.primary} />
                </View>
                <View style={styles.dateInputContainer}>
                  <DateRangePicker
                    selectedDate={endDate}
                    onDateSelect={onEndDateChange}
                    label="Check-out"
                    placeholder="End Date"
                    minimumDate={startDate}
                  />
                </View>
              </View>
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity 
              style={styles.applyButton} 
              onPress={onClose}
            >
              <Text style={styles.applyButtonText}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.card.border,
  },
  closeButton: {
    padding: 4,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  clearButton: {
    paddingVertical: 6,
    paddingHorizontal: theme.spacing.sm,
  },
  clearButtonText: {
    fontSize: 14,
    color: theme.colors.primary,
    fontWeight: '500',
  },
  modalBody: {
    paddingHorizontal: theme.spacing.lg,
  },
  filterSection: {
    marginBottom: theme.spacing.xl,
    marginTop: theme.spacing.lg,
  },
  filterSectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: theme.spacing.md,
  },
  platformSelectContainer: {
    borderRadius: 14,
    backgroundColor: theme.colors.background,
    overflow: 'hidden',
  },
  platformSelectTrigger: {
    padding: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.card.border,
    borderRadius: 14,
    height: 44,
  },
  platformSelectTriggerExpanded: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderBottomWidth: 0,
  },
  platformSelectHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  platformSelectText: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.text.primary,
    fontWeight: '500',
  },
  platformIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  platformOptionsContainer: {
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: theme.colors.card.border,
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
  },
  platformOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.sm,
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.background,
    height: 44,
  },
  platformOptionSelected: {
    backgroundColor: `${theme.colors.primary}08`,
  },
  platformOptionText: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.text.primary,
  },
  propertySelectContainer: {
    borderRadius: 14,
    backgroundColor: theme.colors.background,
    overflow: 'hidden',
  },
  propertySelectTrigger: {
    padding: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.card.border,
    borderRadius: 14,
    height: 44,
  },
  propertySelectTriggerExpanded: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderBottomWidth: 0,
  },
  propertySelectHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  propertySelectText: {
    fontSize: 14,
    color: theme.colors.text.primary,
    fontWeight: '500',
  },
  propertyOptionsContainer: {
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: theme.colors.card.border,
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
  },
  propertyOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.sm,
    backgroundColor: theme.colors.background,
    height: 44,
  },
  propertyOptionSelected: {
    backgroundColor: `${theme.colors.primary}08`,
  },
  propertyOptionText: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.text.primary,
  },
  dateRangeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  dateInputContainer: {
    flex: 1,
  },
  dateArrow: {
    width: 32,
    height: 32,
    backgroundColor: `${theme.colors.primary}10`,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalFooter: {
    padding: theme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: theme.colors.card.border,
  },
  applyButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.md,
    borderRadius: 14,
    alignItems: 'center',
  },
  applyButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default FiltersModal;