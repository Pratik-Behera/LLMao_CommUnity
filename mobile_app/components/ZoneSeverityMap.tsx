import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

interface ZoneProps {
  name: string;
  severity: number; // 0-100
  label: string;
}

const ZoneBox = ({ name, severity, label }: ZoneProps) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (severity > 70) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [severity]);

  const getBgColor = (sev: number) => {
    if (sev > 80) return 'rgba(239, 68, 68, 0.15)'; // Red-500
    if (sev > 60) return 'rgba(249, 115, 22, 0.15)'; // Orange-500
    if (sev > 40) return 'rgba(234, 179, 8, 0.15)'; // Yellow-500
    return 'rgba(34, 197, 94, 0.15)'; // Green-500
  };

  const getBorderColor = (sev: number) => {
    if (sev > 80) return '#ef4444'; 
    if (sev > 60) return '#f97316';
    if (sev > 40) return '#eab308';
    return '#22c55e';
  };

  return (
    <Animated.View 
      style={[
        styles.zoneBox, 
        { 
          backgroundColor: getBgColor(severity),
          borderColor: getBorderColor(severity),
          transform: [{ scale: pulseAnim }]
        }
      ]}
    >
      <Text style={styles.zoneLabel}>{label}</Text>
      <Text style={[styles.severityValue, { color: getBorderColor(severity) }]}>
        {severity.toFixed(0)}
      </Text>
      {severity > 70 && (
        <View style={styles.alertIcon}>
          <MaterialIcons name="report-problem" size={12} color="#ef4444" />
        </View>
      )}
    </Animated.View>
  );
};

export default function ZoneSeverityMap({ severities }: { severities: Record<string, number> }) {
  const zones = [
    { id: 'north', label: 'North', grid: { row: 1, col: 2 } },
    { id: 'west', label: 'West', grid: { row: 2, col: 1 } },
    { id: 'central', label: 'Central', grid: { row: 2, col: 2 } },
    { id: 'east', label: 'East', grid: { row: 2, col: 3 } },
    { id: 'south', label: 'South', grid: { row: 3, col: 2 } },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <MaterialIcons name="security" size={16} color="#6366f1" />
          <Text style={styles.title}>AI SEC-GRID MONITOR</Text>
        </View>
        <Text style={styles.subtitle}>Singapore Regional Severity Distribution</Text>
      </View>

      <View style={styles.grid}>
        {/* Row 1 */}
        <View style={styles.row}>
          <View style={styles.spacer} />
          <ZoneBox 
            name="north" 
            label="NORTH" 
            severity={severities['north'] || 0} 
          />
          <View style={styles.spacer} />
        </View>

        {/* Row 2 */}
        <View style={styles.row}>
          <ZoneBox 
            name="west" 
            label="WEST" 
            severity={severities['west'] || 0} 
          />
          <ZoneBox 
            name="central" 
            label="CENTRAL" 
            severity={severities['central'] || 0} 
          />
          <ZoneBox 
            name="east" 
            label="EAST" 
            severity={severities['east'] || 0} 
          />
        </View>

        {/* Row 3 */}
        <View style={styles.row}>
          <View style={styles.spacer} />
          <ZoneBox 
            name="south" 
            label="SOUTH" 
            severity={severities['south'] || 0} 
          />
          <View style={styles.spacer} />
        </View>
      </View>

      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: '#22c55e' }]} />
          <Text style={styles.legendText}>Nominal</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: '#f97316' }]} />
          <Text style={styles.legendText}>Elevated</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: '#ef4444' }]} />
          <Text style={styles.legendText}>Critical</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0f172a',
    borderRadius: 24,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  header: {
    marginBottom: 20,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  title: {
    color: '#6366f1',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2,
  },
  subtitle: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
  },
  grid: {
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  zoneBox: {
    width: 80,
    height: 80,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  zoneLabel: {
    color: '#94a3b8',
    fontSize: 8,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  severityValue: {
    fontSize: 22,
    fontWeight: '900',
  },
  spacer: {
    width: 80,
  },
  alertIcon: {
    position: 'absolute',
    top: 4,
    right: 4,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  legendText: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: '600',
  },
});
