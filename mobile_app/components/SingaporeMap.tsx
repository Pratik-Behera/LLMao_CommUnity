import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import Svg, { Path, G, Circle } from 'react-native-svg';
import { Shield, MapPin, AlertTriangle, Database } from 'lucide-react-native';

const REGION_PATHS = {
  north: "M150 20 L250 20 L280 80 L180 120 L120 80 Z",
  west: "M20 70 L120 80 L140 160 L100 220 L20 180 Z",
  central: "M140 80 L230 100 L250 160 L160 180 L140 130 Z",
  east: "M250 80 L350 100 L380 180 L300 180 L230 140 Z",
  south: "M140 180 L250 180 L260 250 L140 250 Z"
};

const REGION_CENTERS = {
  north: { x: 190, y: 60 },
  west: { x: 75, y: 140 },
  central: { x: 195, y: 135 },
  east: { x: 300, y: 140 },
  south: { x: 200, y: 220 }
};

interface MapProps {
  severities: Record<string, number>;
}

const RegionLayer = ({ name, path, severity }: { name: string, path: string, severity: number }) => {
  const getFill = (sev: number) => {
    if (sev > 80) return "rgba(239, 68, 68, 0.4)"; // Red
    if (sev > 60) return "rgba(249, 115, 22, 0.35)"; // Orange
    if (sev > 40) return "rgba(234, 179, 8, 0.25)"; // Yellow
    return "rgba(34, 197, 94, 0.15)"; // Green
  };

  const getStroke = (sev: number) => {
    if (sev > 80) return "#ef4444";
    if (sev > 60) return "#f97316";
    if (sev > 40) return "#eab308";
    return "#22c55e";
  };

  return (
    <G>
      <Path 
        d={path} 
        fill={getFill(severity)} 
        stroke={getStroke(severity)} 
        strokeWidth="1.5"
        strokeDasharray={severity > 70 ? "4 2" : "none"}
      />
    </G>
  );
};

export default function SingaporeMap({ severities }: MapProps) {
  return (
    <View style={styles.outerContainer}>
      {/* GLOWING HEADER */}
      <View style={styles.header}>
        <View style={styles.statusBadge}>
          <View style={styles.pulseDot} />
          <Text style={styles.statusText}>AI SEC-GRID [LIVE]</Text>
        </View>
        <Text style={styles.mainTitle}>Regional Command Center</Text>
      </View>

      <View style={styles.mapFrame}>
        <Svg width="400" height="300" viewBox="0 0 400 300" style={styles.svg}>
          {/* BACKGROUND DECOR */}
          <Circle cx="200" cy="150" r="140" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
          <Circle cx="200" cy="150" r="100" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
          
          {/* REGION LAYERS */}
          {Object.entries(REGION_PATHS).map(([key, path]) => (
            <RegionLayer 
              key={key} 
              name={key} 
              path={path} 
              severity={severities[key] || 0} 
            />
          ))}

          {/* INTERACTIVE MARKERS */}
          {Object.entries(REGION_CENTERS).map(([key, center]) => {
            const sev = severities[key] || 0;
            const color = sev > 80 ? "#ef4444" : sev > 60 ? "#f97316" : sev > 40 ? "#eab308" : "#22c55e";
            
            return (
              <G key={`marker-${key}`}>
                <Circle 
                  cx={center.x} 
                  cy={center.y} 
                  r="6" 
                  fill={color} 
                  stroke="white" 
                  strokeWidth="1" 
                />
                {sev > 70 && (
                   <Circle 
                    cx={center.x} 
                    cy={center.y} 
                    r="12" 
                    fill="none" 
                    stroke={color} 
                    strokeWidth="1" 
                  />
                )}
                <G transform={`translate(${center.x}, ${center.y + 15})`}>
                   <Path d="M-20 -8 L20 -8 L20 8 L-20 8 Z" fill="rgba(15, 23, 42, 0.8)" stroke={color} strokeWidth="0.5" />
                   <Text style={{ position: 'absolute', top: center.y + 12, left: center.x - 18, fontSize: 8, color: 'white', fontWeight: 'bold' }}>
                      {key.toUpperCase()}
                   </Text>
                </G>
              </G>
            );
          })}
        </Svg>
      </View>

      {/* FOOTER DATA GRID */}
      <View style={styles.footerGrid}>
         <View style={styles.dataItem}>
            <Text style={styles.dataLabel}>THREAT LVL</Text>
            <Text style={[styles.dataValue, { color: Math.max(...Object.values(severities)) > 70 ? '#ef4444' : '#6366f1' }]}>
               {Math.max(...Object.values(severities)).toFixed(0)}%
            </Text>
         </View>
         <View style={styles.divider} />
         <View style={styles.dataItem}>
            <Text style={styles.dataLabel}>ACTIVE ZONES</Text>
            <Text style={styles.dataValue}>
               {Object.values(severities).filter(v => v > 50).length} / 5
            </Text>
         </View>
         <View style={styles.divider} />
         <View style={styles.dataItem}>
            <Text style={styles.dataLabel}>TRUST-SCORE</Text>
            <Text style={styles.dataValue}>99.4</Text>
         </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    backgroundColor: '#0a0f1d',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingTop: 24,
    paddingBottom: 24,
    marginBottom: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 20,
  },
  header: {
    paddingHorizontal: 24,
    marginBottom: 10,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 8,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#6366f1',
    marginRight: 6,
  },
  statusText: {
    color: '#6366f1',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
  },
  mainTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  mapFrame: {
    height: 320,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  svg: {
    marginTop: -20,
  },
  footerGrid: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.03)',
    marginHorizontal: 16,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  dataItem: {
    flex: 1,
    alignItems: 'center',
  },
  dataLabel: {
    color: '#64748b',
    fontSize: 7,
    fontWeight: 'BOLD',
    letterSpacing: 1,
    marginBottom: 4,
  },
  dataValue: {
    color: 'white',
    fontSize: 16,
    fontWeight: '900',
  },
  divider: {
    width: 1,
    height: '70%',
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignSelf: 'center',
  }
});
