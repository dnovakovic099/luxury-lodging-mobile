import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, Image } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { theme as defaultTheme } from '../theme';
import { useTheme } from '../context/ThemeContext';

const PropertyPicker = ({ 
  selectedProperty,
  onValueChange,
  properties = [],
  loading,
  error,
  showSelectedImage = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const { theme, isDarkMode } = useTheme();
  
  const selectedPropertyData = properties.find(p => p.id === selectedProperty);
  
  const handleSelect = (propertyId) => {
    onValueChange(propertyId);
    setIsOpen(false);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={[styles.button, {
          backgroundColor: isDarkMode ? theme.surface : '#FFFFFF',
          borderColor: theme.borderColor
        }]}
        onPress={() => setIsOpen(true)}
        disabled={loading || properties.length === 0}
      >
        {showSelectedImage && selectedPropertyData?.image ? (
          <Image 
            source={{ uri: selectedPropertyData.image }} 
            style={styles.selectedPropertyImage}
            defaultSource={require('../assets/logo.png')}
          />
        ) : (
          showSelectedImage && (
            <View style={[styles.propertyImagePlaceholder, { backgroundColor: isDarkMode ? '#333333' : '#F5F5F5' }]}>
              <Icon name="home-outline" size={16} color={theme.text.secondary} />
            </View>
          )
        )}
        <Text style={[styles.buttonText, { color: theme.text.primary }]} numberOfLines={1} ellipsizeMode="tail">
          {loading 
            ? "Loading properties..." 
            : selectedPropertyData?.name 
            || "Select a property"}
        </Text>
        <Icon name="chevron-down" size={18} color={theme.text.primary} />
      </TouchableOpacity>

      <Modal
        visible={isOpen}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsOpen(false)}
      >
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, { backgroundColor: isDarkMode ? theme.surface : '#FFFFFF' }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.borderColor }]}>
              <Text style={[styles.modalTitle, { color: theme.text.primary }]}>Select Property</Text>
              <TouchableOpacity 
                onPress={() => setIsOpen(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Icon name="close" size={22} color={theme.text.primary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.optionsList}>
              {properties.map((property) => (
                <TouchableOpacity
                  key={property.id}
                  style={[
                    styles.option,
                    selectedProperty === property.id && [styles.selectedOption, { backgroundColor: `${theme.primary}15` }]
                  ]}
                  onPress={() => handleSelect(property.id)}
                >
                  {property.image ? (
                    <Image 
                      source={{ uri: property.image }} 
                      style={styles.propertyImage}
                      defaultSource={require('../assets/logo.png')}
                    />
                  ) : (
                    <View style={[styles.propertyImagePlaceholder, { backgroundColor: isDarkMode ? '#333333' : '#F5F5F5' }]}>
                      <Icon name="home-outline" size={16} color={theme.text.secondary} />
                    </View>
                  )}
                  <Text style={[
                    styles.optionText,
                    { color: theme.text.primary },
                    selectedProperty === property.id && [styles.selectedOptionText, { color: theme.primary }]
                  ]}>
                    {property.name}
                  </Text>
                  {selectedProperty === property.id && (
                    <Icon name="checkmark-circle" size={18} color={theme.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 20,
    padding: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
    marginRight: 8,
    marginLeft: 8,
  },
  selectedPropertyImage: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  optionsList: {
    padding: 12,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    borderRadius: 8,
  },
  selectedOption: {
  },
  optionText: {
    fontSize: 14,
    flex: 1,
    marginLeft: 8,
  },
  selectedOptionText: {
    fontWeight: '500',
  },
  propertyImage: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
  },
  propertyImagePlaceholder: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default PropertyPicker;