import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  Modal, 
  StyleSheet,
  Platform,
  Pressable
} from 'react-native';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import Icon from 'react-native-vector-icons/Ionicons';
import { theme } from '../theme';

// Define gold colors for consistency
const GOLD = {
  primary: '#B6944C',
  secondary: '#DCBF78',
  light: 'rgba(182, 148, 76, 0.15)'
};

// Configure locale for the calendar
LocaleConfig.locales['en'] = {
  monthNames: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  monthNamesShort: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  dayNames: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  dayNamesShort: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
};
LocaleConfig.defaultLocale = 'en';

// Helper to format dates for the Calendar component
const formatDateForCalendar = (date) => {
  if (!date) return undefined;
  
  try {
    return date.toISOString().split('T')[0]; // Format as YYYY-MM-DD
  } catch (error) {
    console.error("Error formatting date for calendar:", error);
    return undefined;
  }
};

const DateRangePicker = ({ 
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  theme: customTheme = theme
}) => {
  const [isModalVisible, setModalVisible] = useState(false);
  const [tempStartDate, setTempStartDate] = useState(startDate);
  const [tempEndDate, setTempEndDate] = useState(endDate);
  const [selectionMode, setSelectionMode] = useState('start'); // 'start' or 'end'

  // Update temp dates when props change
  useEffect(() => {
    setTempStartDate(startDate);
    setTempEndDate(endDate);
  }, [startDate, endDate]);

  // Format date for display
  const formatDateForDisplay = (date) => {
    if (!date) return "Select";
    
    try {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: 'numeric'
      });
    } catch (error) {
      console.error("Error formatting date for display:", error);
      return "Select";
    }
  };

  // Handle date selection
  const handleDateSelect = (day) => {
    try {
      const selectedDate = new Date(day.timestamp);
      
      if (selectionMode === 'start') {
        setTempStartDate(selectedDate);
        // If selecting a start date that's after the current end date, clear the end date
        if (tempEndDate && selectedDate > tempEndDate) {
          setTempEndDate(null);
          if (onEndDateChange) onEndDateChange(null);
        }
        // Call the callback
        if (onStartDateChange) onStartDateChange(selectedDate);
      } else {
        // Ensure end date is not before start date
        if (tempStartDate && selectedDate < tempStartDate) {
          alert('End date cannot be before start date');
          return;
        }
        setTempEndDate(selectedDate);
        // Call the callback
        if (onEndDateChange) onEndDateChange(selectedDate);
      }
      
      // Close the modal
      closeModal();
    } catch (error) {
      console.error("Error selecting date:", error);
      closeModal();
    }
  };

  // Create marked dates object for the calendar
  const getMarkedDates = () => {
    const markedDates = {};
    
    try {
      // Mark the start date
      if (tempStartDate) {
        const startDateStr = formatDateForCalendar(tempStartDate);
        if (startDateStr) {
          markedDates[startDateStr] = {
            selected: true,
            startingDay: true,
            color: GOLD.primary,
            textColor: 'white'
          };
        }
      }
      
      // Mark the end date
      if (tempEndDate) {
        const endDateStr = formatDateForCalendar(tempEndDate);
        if (endDateStr) {
          markedDates[endDateStr] = {
            selected: true,
            endingDay: true,
            color: GOLD.primary,
            textColor: 'white'
          };
          
          // If we have both start and end dates, mark the days in between
          if (tempStartDate) {
            const start = new Date(tempStartDate);
            const end = new Date(tempEndDate);
            
            // Loop through the days between start and end
            const currentDate = new Date(start);
            currentDate.setDate(currentDate.getDate() + 1);
            
            while (currentDate < end) {
              const dateStr = formatDateForCalendar(currentDate);
              if (dateStr) {
                markedDates[dateStr] = {
                  selected: true,
                  color: GOLD.light,
                  textColor: GOLD.primary
                };
              }
              currentDate.setDate(currentDate.getDate() + 1);
            }
          }
        }
      }
    } catch (error) {
      console.error("Error creating marked dates:", error);
    }
    
    return markedDates;
  };

  // Close the modal
  const closeModal = () => {
    setModalVisible(false);
  };

  // Open modal with appropriate selection mode
  const openModal = (mode) => {
    setSelectionMode(mode);
    setModalVisible(true);
  };

  // Get current date as a string for the Calendar
  const getCurrentDateString = (mode) => {
    if (mode === 'start' && tempStartDate) {
      return formatDateForCalendar(tempStartDate);
    } else if (mode === 'end' && tempEndDate) {
      return formatDateForCalendar(tempEndDate);
    }
    return formatDateForCalendar(new Date());
  };

  // Get min date as a string for the Calendar
  const getMinDateString = () => {
    if (selectionMode === 'end' && tempStartDate) {
      return formatDateForCalendar(tempStartDate);
    }
    return undefined;
  };

  return (
    <View style={styles.container}>
      <View style={styles.datePickersContainer}>
        {/* Start Date Picker */}
        <TouchableOpacity 
          style={[styles.dateButton, startDate && styles.dateButtonActive]} 
          onPress={() => openModal('start')}
        >
          <Text style={[styles.dateLabel, startDate && styles.dateLabelActive]}>From</Text>
          <View style={styles.dateContent}>
            <Icon 
              name="calendar-outline" 
              size={16} 
              color={startDate ? GOLD.primary : '#666'} 
            />
            <Text style={[styles.dateText, startDate && styles.dateTextActive]}>
              {formatDateForDisplay(startDate)}
            </Text>
          </View>
        </TouchableOpacity>
        
        {/* End Date Picker */}
        <TouchableOpacity 
          style={[styles.dateButton, endDate && styles.dateButtonActive]} 
          onPress={() => openModal('end')}
        >
          <Text style={[styles.dateLabel, endDate && styles.dateLabelActive]}>To</Text>
          <View style={styles.dateContent}>
            <Icon 
              name="calendar-outline" 
              size={16} 
              color={endDate ? GOLD.primary : '#666'} 
            />
            <Text style={[styles.dateText, endDate && styles.dateTextActive]}>
              {formatDateForDisplay(endDate)}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Date Selection Modal */}
      <Modal
        visible={isModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={closeModal}
      >
        <Pressable 
          style={styles.modalOverlay} 
          onPress={closeModal}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={closeModal}>
                <Text style={styles.cancelButton}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>
                {selectionMode === 'start' ? 'Select Start Date' : 'Select End Date'}
              </Text>
              <TouchableOpacity onPress={closeModal}>
                <Text style={styles.doneButton}>Done</Text>
              </TouchableOpacity>
            </View>

            <Calendar
              current={getCurrentDateString(selectionMode)}
              minDate={getMinDateString()}
              onDayPress={handleDateSelect}
              markingType="period"
              markedDates={getMarkedDates()}
              theme={{
                backgroundColor: '#FFFFFF',
                calendarBackground: '#FFFFFF',
                textSectionTitleColor: '#666',
                selectedDayBackgroundColor: GOLD.primary,
                selectedDayTextColor: '#ffffff',
                todayTextColor: GOLD.primary,
                dayTextColor: '#333',
                textDisabledColor: '#d9e1e8',
                dotColor: GOLD.primary,
                selectedDotColor: '#ffffff',
                arrowColor: GOLD.primary,
                disabledArrowColor: '#d9e1e8',
                monthTextColor: '#333',
                indicatorColor: GOLD.primary,
                textDayFontWeight: '400',
                textMonthFontWeight: 'bold',
                textDayHeaderFontWeight: '500',
                textDayFontSize: 14,
                textMonthFontSize: 14,
                textDayHeaderFontSize: 12
              }}
            />
          </View>
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  datePickersContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: 8,
  },
  dateButton: {
    flex: 1,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    overflow: 'hidden',
    padding: 10,
  },
  dateButtonActive: {
    borderColor: GOLD.primary,
    backgroundColor: GOLD.light,
  },
  dateLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
    marginBottom: 2,
  },
  dateLabelActive: {
    color: GOLD.primary,
  },
  dateContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  dateTextActive: {
    color: GOLD.primary,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
    maxHeight: '90%',
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
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  cancelButton: {
    fontSize: 16,
    color: '#666',
  },
  doneButton: {
    fontSize: 16,
    color: GOLD.primary,
    fontWeight: '600',
  },
});

export default DateRangePicker;