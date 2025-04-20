import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, Image } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { theme } from '../theme';

const PropertyPicker = ({ 
  selectedProperty,
  onValueChange,
  properties = [],
  loading,
  error,
  showSelectedImage = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  
  const selectedPropertyData = properties.find(p => p.id === selectedProperty);
  
  const handleSelect = (propertyId) => {
    onValueChange(propertyId);
    setIsOpen(false);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={styles.button}
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
            <View style={styles.propertyImagePlaceholder}>
              <Icon name="home-outline" size={16} color="#666666" />
            </View>
          )
        )}
        <Text style={styles.buttonText} numberOfLines={1} ellipsizeMode="tail">
          {loading 
            ? "Loading properties..." 
            : selectedPropertyData?.name 
            || "Select a property"}
        </Text>
        <Icon name="chevron-down" size={18} color="#000000" />
      </TouchableOpacity>

      <Modal
        visible={isOpen}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsOpen(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Property</Text>
              <TouchableOpacity 
                onPress={() => setIsOpen(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Icon name="close" size={22} color="#000000" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.optionsList}>
              {properties.map((property) => (
                <TouchableOpacity
                  key={property.id}
                  style={[
                    styles.option,
                    selectedProperty === property.id && styles.selectedOption
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
                    <View style={styles.propertyImagePlaceholder}>
                      <Icon name="home-outline" size={16} color="#666666" />
                    </View>
                  )}
                  <Text style={[
                    styles.optionText,
                    selectedProperty === property.id && styles.selectedOptionText
                  ]}>
                    {property.name}
                  </Text>
                  {selectedProperty === property.id && (
                    <Icon name="checkmark-circle" size={18} color="#FF385C" />
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
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    paddingHorizontal: 12,
  },
  buttonText: {
    fontSize: 14,
    color: '#000000',
    fontWeight: '500',
    flex: 1,
    marginRight: 8,
    marginLeft: 8,
  },
  selectedPropertyImage: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
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
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
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
    backgroundColor: 'rgba(255, 56, 92, 0.1)',
  },
  optionText: {
    fontSize: 14,
    color: '#000000',
    flex: 1,
    marginLeft: 8,
  },
  selectedOptionText: {
    color: '#FF385C',
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
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default PropertyPicker;