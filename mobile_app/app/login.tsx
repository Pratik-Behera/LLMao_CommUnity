import React from 'react';
import { View, Text, TouchableOpacity, SafeAreaView, Dimensions, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../services/AuthService';

export default function LoginScreen() {
  const router = useRouter();
  const { setRole } = useAuth();
  const { height } = Dimensions.get('window');

  const handleMember = () => {
    setRole('Member');
    router.replace('/(tabs)');
  };

  const handleOwner = () => {
    setRole('Admin');
    router.replace('/(tabs)');
  };

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['#0f172a', '#1e3a5f', '#0f172a']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Decorative radial glow */}
      <View style={styles.glowCircle} />

      <SafeAreaView style={styles.container}>
        {/* Logo & Branding */}
        <View style={styles.brandArea}>
          <View style={styles.logoOuter}>
            <LinearGradient
              colors={['#3b82f6', '#6366f1']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.logoGradient}
            >
              <MaterialIcons name="volunteer-activism" size={44} color="white" />
            </LinearGradient>
          </View>

          <Text style={styles.appName}>CommUnity</Text>
          <Text style={styles.tagline}>Programmable Trust · Real-time Impact</Text>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>SELECT YOUR ROLE</Text>
            <View style={styles.dividerLine} />
          </View>
        </View>

        {/* Two Role Buttons */}
        <View style={styles.buttonArea}>
          {/* Member Button */}
          <TouchableOpacity onPress={handleMember} activeOpacity={0.85} style={styles.buttonWrapper}>
            <LinearGradient
              colors={['#3b82f6', '#2563eb']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.button}
            >
              <View style={styles.iconCircle}>
                <MaterialIcons name="people" size={28} color="#3b82f6" />
              </View>
              <View style={styles.buttonTextArea}>
                <Text style={styles.buttonTitle}>I'm a Member</Text>
                <Text style={styles.buttonSub}>View dashboard, request aid & contribute</Text>
              </View>
              <MaterialIcons name="arrow-forward-ios" size={16} color="rgba(255,255,255,0.7)" />
            </LinearGradient>
          </TouchableOpacity>

          {/* Owner / Admin Button */}
          <TouchableOpacity onPress={handleOwner} activeOpacity={0.85} style={styles.buttonWrapper}>
            <LinearGradient
              colors={['#6366f1', '#4338ca']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.button}
            >
              <View style={[styles.iconCircle, { backgroundColor: 'rgba(99,102,241,0.15)' }]}>
                <MaterialIcons name="admin-panel-settings" size={28} color="#6366f1" />
              </View>
              <View style={styles.buttonTextArea}>
                <Text style={styles.buttonTitle}>I'm an Owner</Text>
                <Text style={styles.buttonSub}>Manage circles, run AI diagnostics & approve</Text>
              </View>
              <MaterialIcons name="arrow-forward-ios" size={16} color="rgba(255,255,255,0.7)" />
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <MaterialIcons name="lock" size={12} color="#475569" />
          <Text style={styles.footerText}>Secured by Interledger Protocol</Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  glowCircle: {
    position: 'absolute',
    width: 400,
    height: 400,
    borderRadius: 200,
    backgroundColor: 'rgba(59, 130, 246, 0.08)',
    top: -100,
    alignSelf: 'center',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  brandArea: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logoOuter: {
    marginBottom: 24,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 20,
  },
  logoGradient: {
    height: 80,
    width: 80,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '12deg' }],
  },
  appName: {
    fontSize: 42,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: -2,
    marginBottom: 6,
  },
  tagline: {
    fontSize: 14,
    color: '#94a3b8',
    fontWeight: '500',
    letterSpacing: 0.5,
    marginBottom: 32,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#1e293b',
  },
  dividerText: {
    color: '#475569',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 2,
  },
  buttonArea: {
    gap: 16,
    paddingHorizontal: 4,
  },
  buttonWrapper: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 10,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 20,
    gap: 14,
  },
  iconCircle: {
    height: 52,
    width: 52,
    borderRadius: 16,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonTextArea: {
    flex: 1,
  },
  buttonTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 3,
  },
  buttonSub: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 11,
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 48,
  },
  footerText: {
    color: '#475569',
    fontSize: 11,
    fontWeight: '600',
  },
});
