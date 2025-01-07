import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Share2, Copy } from 'lucide-react-native';
import { theme } from '../theme';

const ReferralSection = () => {
  return (
    <View style={styles.referralSection}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Referral Program</Text>
        <Share2 size={16} color={theme.colors.primary} />
      </View>
      <View style={styles.referralCard}>
        <Text style={styles.referralText}>Share your unique code</Text>
        <View style={styles.codeContainer}>
          <Text style={styles.referralCode}>LUXURY2024</Text>
          <TouchableOpacity 
            style={styles.copyButton}
            activeOpacity={0.6}
          >
            <Copy size={18} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>
        <Text style={styles.referralSubtext}>
          Earn 10% commission for each referral
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  referralSection: {
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text.primary,
    marginRight: theme.spacing.sm,
  },
  referralCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.card.border,
  },
  referralText: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.md,
  },
  codeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${theme.colors.primary}10`,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.md,
  },
  referralCode: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.primary,
    marginRight: theme.spacing.md,
    letterSpacing: 1,
  },
  copyButton: {
    padding: theme.spacing.sm,
  },
  referralSubtext: {
    fontSize: 12,
    color: theme.colors.text.secondary,
  },
});

export default ReferralSection;