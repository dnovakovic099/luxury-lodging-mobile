import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  Modal, 
  StyleSheet,
  Platform,
  Pressable
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import Icon from 'react-native-vector-icons/Ionicons';
import { theme } from '../theme';

const DateRangePicker = ({ 
  selectedDate,
  onDateSelect,
  label = "Select Date",
  placeholder = "Choose a date",
  minimumDate,
}) => {
  const [isModalVisible, setModalVisible] = useState(false);

  const formatDate = (date) => {
    if (!date) return placeholder;
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Check if date is today or tomorrow
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    }
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
    });
  };

  return (
    <View>
      {/* <Text style={styles.label}>{label}</Text> */}
      <TouchableOpacity 
        style={[
          styles.dateButton,
          selectedDate && styles.dateButtonActive
        ]} 
        onPress={() => setModalVisible(true)}
      >
        <View style={styles.dateContent}>
          <Icon 
            name="calendar-outline" 
            size={20} 
            color={selectedDate ? theme.colors.primary : theme.colors.text.secondary} 
          />
          <Text style={[
            styles.dateText,
            !selectedDate && styles.placeholder,
            selectedDate && styles.dateTextActive
          ]}>
            {formatDate(selectedDate)}
          </Text>
        </View>
      </TouchableOpacity>

      <Modal
        visible={isModalVisible}
        transparent={true}
        animationType="slide"
      >
        <Pressable 
          style={styles.modalOverlay} 
          onPress={() => setModalVisible(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelButton}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>{label}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={styles.doneButton}>Done</Text>
              </TouchableOpacity>
            </View>

            <Calendar
              current={selectedDate || new Date()}
              minDate={minimumDate}
              onDayPress={(day) => {
                onDateSelect(new Date(day.timestamp));
                setModalVisible(false);
              }}
              markedDates={{
                [selectedDate?.toISOString().split('T')[0]]: {
                  selected: true,
                  selectedColor: theme.colors.primary,
                }
              }}
              theme={{
                backgroundColor: theme.colors.surface,
                calendarBackground: theme.colors.surface,
                textSectionTitleColor: theme.colors.text.secondary,
                selectedDayBackgroundColor: theme.colors.primary,
                selectedDayTextColor: '#ffffff',
                todayTextColor: theme.colors.primary,
                dayTextColor: theme.colors.text.primary,
                textDisabledColor: theme.colors.text.disabled,
                dotColor: theme.colors.primary,
                monthTextColor: theme.colors.text.primary,
                textMonthFontWeight: 'bold',
                textDayFontSize: 16,
                textMonthFontSize: 16,
                textDayHeaderFontSize: 14,
                arrowColor: theme.colors.primary,
              }}
            />
          </View>
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  label: {
    fontSize: 13,
    color: theme.colors.text.secondary,
    marginBottom: 6,
    fontWeight: '500',
  },
  dateButton: {
    borderRadius: 12,
    backgroundColor: theme.colors.background,
    overflow: 'hidden',
  },
  dateButtonActive: {
    backgroundColor: `${theme.colors.primary}08`,
  },
  dateContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.sm,
    gap: 8,
  },
  dateText: {
    flex: 1,
    fontSize: 15,
    textAlign: 'center',
    color: theme.colors.text.primary,
  },
  dateTextActive: {
    color: theme.colors.primary,
    fontWeight: '500',
  },
  placeholder: {
    color: theme.colors.text.secondary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.card.border,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  cancelButton: {
    fontSize: 17,
    color: theme.colors.text.secondary,
  },
  doneButton: {
    fontSize: 17,
    color: theme.colors.primary,
    fontWeight: '600',
  },
});

export default DateRangePicker;