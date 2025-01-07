import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { theme } from '../theme';

const PropertyPicker = ({ 
  selectedProperty,
  onValueChange,
  properties = [],
  loading,
  error 
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
        <Text style={styles.buttonText}>
          {loading 
            ? "Loading properties..." 
            : selectedPropertyData?.name 
            || "Select a property"}
        </Text>
        <Icon name="chevron-down" size={18} color={theme.colors.text.secondary} />
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
                <Icon name="close" size={22} color={theme.colors.text.secondary} />
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
                  <Text style={[
                    styles.optionText,
                    selectedProperty === property.id && styles.selectedOptionText
                  ]}>
                    {property.name}
                  </Text>
                  {selectedProperty === property.id && (
                    <Icon name="checkmark-circle" size={18} color={theme.colors.primary} />
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
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.colors.card.border,
  },
  buttonText: {
    fontSize: 14,
    color: theme.colors.text.primary,
  },
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
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.card.border,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  optionsList: {
    padding: 12,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 8,
  },
  selectedOption: {
    backgroundColor: `${theme.colors.primary}10`,
  },
  optionText: {
    fontSize: 15,
    color: theme.colors.text.primary,
  },
  selectedOptionText: {
    color: theme.colors.primary,
    fontWeight: '500',
  },
});

export default PropertyPicker;