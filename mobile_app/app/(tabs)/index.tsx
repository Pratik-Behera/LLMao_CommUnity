import { View, Text, ScrollView, TouchableOpacity, Pressable, SafeAreaView, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../services/AuthService';
import { mockDistributionEngine } from '../../services/DistributionEngine';
import { triggerEngine } from '../../services/TriggerEngine';
import AuditLogItem from '../../components/AuditLogItem';
import ZoneSeverityMap from '../../components/ZoneSeverityMap';
import EnvironmentalStatus from '../../components/EnvironmentalStatus';
import { useRouter, useFocusEffect } from 'expo-router';
import { Alert, Platform } from 'react-native';

// Alert.alert is a no-op on web. This helper works on both.
const showAlert = (title: string, message: string) => {
  if (Platform.OS === 'web') {
    window.alert(`${title}\n\n${message}`);
  } else {
    Alert.alert(title, message);
  }
};

export default function HomeScreen() {
  const { isAdmin } = useAuth();
  const router = useRouter();
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRunningDiagnostics, setIsRunningDiagnostics] = useState(false);
  const [diagnosticsResult, setDiagnosticsResult] = useState<any>(null);
  const [zoneSeverities, setZoneSeverities] = useState<Record<string, number>>({
    central: 45, north: 38, south: 42, east: 35, west: 52
  });

  const primaryColor = isAdmin ? '#4338ca' : '#3994ef';
  const primaryClass = isAdmin ? 'bg-admin' : 'bg-primary';
  const primaryTextClass = isAdmin ? 'text-admin' : 'text-primary';
  const primaryBorderClass = isAdmin ? 'border-admin/20' : 'border-primary/10';
  const primaryBgClass = isAdmin ? 'bg-admin/5' : 'bg-primary/5';

  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [fundHealth, setFundHealth] = useState({ totalPool: 45000, communityReserve: 35000, emergencyReserve: 10000 });

  const fetchPending = async () => {
    const pending = await mockDistributionEngine.getPendingDisbursements();
    setPendingRequests([...pending]);
  };

  const fetchDashboardData = async () => {
    setIsLoading(true);
    const logs = await mockDistributionEngine.getAuditLogs();
    setAuditLogs([...logs]);

    if (isAdmin) {
      await fetchPending();
    }

    const health = await mockDistributionEngine.getFundHealth();
    setFundHealth({ ...health });

    setIsLoading(false);
  };

  useFocusEffect(
    useCallback(() => {
      fetchDashboardData();
    }, [isAdmin])
  );

  const fetchLogs = async () => {
    // Kept for refresh button
    fetchDashboardData();
  };

  const runDiagnostics = async () => {
    if (isRunningDiagnostics) return;
    setIsRunningDiagnostics(true);
    setDiagnosticsResult(null);

    try {
      const result = await triggerEngine.evaluateTrigger();
      setZoneSeverities(result.decision.zone_severities);
      setDiagnosticsResult(result);

      if (result.decision.trigger) {
        await mockDistributionEngine.disburseBySeverity(result.decision.zone_severities, true);
        await fetchLogs();
        showAlert('🚨 Disaster Triggered', `AI Confidence: ${result.decision.confidence}%\n\n${result.decision.reasoning}`);
      } else {
        showAlert('✅ All Clear', `AI Confidence: ${result.decision.confidence}%\n\nSystem: ${result.system_mode}\n\n${result.decision.reasoning}`);
      }
    } catch (err: any) {
      showAlert('Diagnostics Error', err?.message || 'An unexpected error occurred.');
    }

    setIsRunningDiagnostics(false);
  };

  const handleApprovePayout = async (id: string) => {
    await mockDistributionEngine.approveDisbursement(id);
    fetchLogs();
    fetchPending();
    showAlert('Success', 'Payout approved and Interledger settlement executed.');
  };

  const handleRequestAid = async () => {
    setIsLoading(true);
    // Members request aid which goes to PENDING
    const result = await mockDistributionEngine.disburseBySeverity(zoneSeverities, false);

    if (result.isPending) {
      showAlert('Request Logged', 'Your aid request has been submitted to the AI SEC-Grid. An Admin will verify and authorize the settlement shortly.');
    } else {
      showAlert('Safe Thresholds', 'AI diagnostics indicate conditions are currently stable. No emergency trigger required.');
    }
    await fetchLogs();
    setIsLoading(false);
  };

  return (
    <SafeAreaView className="flex-1 bg-background-light dark:bg-background-dark">
      <View className="flex-1">
        {/* Header */}
        <View className="flex-row items-center justify-between px-4 pt-4 pb-2 bg-white dark:bg-background-dark border-b border-slate-100 dark:border-slate-800">
          <TouchableOpacity onPress={() => router.replace('/(tabs)')} className="flex-row items-center gap-2">
            <View className={`h-10 w-10 ${primaryClass} rounded-2xl items-center justify-center`}>
              <MaterialIcons name={isAdmin ? "shield" : "grid-view"} size={22} color="white" />
            </View>
            <View>
              <Text className="text-xl font-bold text-slate-900 dark:text-white">CommUnity</Text>
              <Text className={`text-[8px] font-black uppercase tracking-widest ${primaryTextClass}`}>
                {isAdmin ? 'Crisis Command Center' : 'Mutual Aid Portal'}
              </Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/profile')}>
            <MaterialIcons name="account-circle" size={28} color="#94a3b8" />
          </TouchableOpacity>
        </View>

        <ScrollView className="flex-1 px-4 py-4" contentContainerStyle={{ paddingBottom: 100 }}>
          {/* Admin Command: Diagnostics */}
          {isAdmin ? (
            <View className="mb-6">
              <Text className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Admin Controls</Text>
              <Pressable
                onPress={() => { console.log('[UI] Diagnostics button pressed'); runDiagnostics(); }}
                style={({ pressed }) => ({
                  height: 64,
                  borderRadius: 16,
                  borderWidth: 1,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 12,
                  backgroundColor: isRunningDiagnostics ? '#1e293b' : (pressed ? '#4338ca' : '#4f46e5'),
                  borderColor: isRunningDiagnostics ? '#334155' : '#4338ca',
                  opacity: pressed ? 0.85 : 1,
                  cursor: 'pointer' as any,
                })}
              >
                {isRunningDiagnostics ? <ActivityIndicator size="small" color="white" /> : <MaterialIcons name="analytics" size={20} color="white" />}
                <Text style={{ color: 'white', fontWeight: '900', textTransform: 'uppercase', letterSpacing: 2, fontSize: 11 }}>Run Global AI Diagnostics</Text>
              </Pressable>

              {/* Diagnostics Result Panel */}
              {diagnosticsResult && (
                <View style={{ marginTop: 16, padding: 20, backgroundColor: diagnosticsResult.decision.trigger ? '#450a0a' : '#052e16', borderRadius: 20, borderWidth: 1, borderColor: diagnosticsResult.decision.trigger ? '#7f1d1d' : '#14532d' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <MaterialIcons name={diagnosticsResult.decision.trigger ? 'warning' : 'check-circle'} size={20} color={diagnosticsResult.decision.trigger ? '#fca5a5' : '#86efac'} />
                    <Text style={{ color: diagnosticsResult.decision.trigger ? '#fca5a5' : '#86efac', fontWeight: '900', fontSize: 13, textTransform: 'uppercase', letterSpacing: 1 }}>
                      {diagnosticsResult.decision.trigger ? 'DISASTER TRIGGERED' : 'ALL CLEAR — SAFE'}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
                    <Text style={{ color: '#94a3b8', fontSize: 10, fontWeight: '700', textTransform: 'uppercase' }}>Confidence</Text>
                    <Text style={{ color: 'white', fontSize: 14, fontWeight: '900' }}>{diagnosticsResult.decision.confidence}%</Text>
                  </View>
                  <Text style={{ color: '#cbd5e1', fontSize: 12, lineHeight: 18, fontStyle: 'italic' }}>"{diagnosticsResult.decision.reasoning}"</Text>
                  <Text style={{ color: '#475569', fontSize: 9, fontWeight: '700', marginTop: 12, textTransform: 'uppercase', letterSpacing: 1 }}>Model: {diagnosticsResult.model_used} · Mode: {diagnosticsResult.system_mode}</Text>
                </View>
              )}

              {/* Pending Approval Queue */}
              {pendingRequests.length > 0 && (
                <View className="mt-6 p-5 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 rounded-3xl">
                  <View className="flex-row items-center gap-2 mb-4">
                    <MaterialIcons name="pending-actions" size={18} color="#d97706" />
                    <Text className="text-amber-700 dark:text-amber-500 font-black text-xs uppercase tracking-widest">Pending Aid Approvals ({pendingRequests.length})</Text>
                  </View>
                  {pendingRequests.map((req, i) => (
                    <View key={req.disbursementId} className="flex-row items-center justify-between bg-white dark:bg-slate-900 p-3 rounded-2xl mb-2">
                      <View className="flex-1">
                        <Text className="text-slate-900 dark:text-white font-bold text-xs">{req.zone} Region • S${req.amount}</Text>
                        <Text className="text-slate-400 text-[9px] mt-0.5" numberOfLines={1}>{req.aiReasoning}</Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => handleApprovePayout(req.disbursementId)}
                        className="bg-emerald-500 px-3 py-2 rounded-xl"
                      >
                        <Text className="text-white font-black text-[10px] uppercase">Authorize</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </View>
          ) : (
            <>
              <EnvironmentalStatus />
              <ZoneSeverityMap severities={zoneSeverities} />
            </>
          )}

          {/* Shared Fund Health */}
          <View className="mb-6">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Community Pool</Text>
              <MaterialIcons name="account-balance-wallet" size={20} color={primaryColor} />
            </View>

            <View className={`${primaryBgClass} rounded-2xl p-5 border ${primaryBorderClass}`}>
              <View className="flex-row justify-between items-end mb-3">
                <View>
                  <Text className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Total Available Resilience Capital</Text>
                  <Text className={`text-3xl font-black ${primaryTextClass}`}>
                    S${fundHealth.totalPool.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Text>
                </View>
              </View>

              <View className="h-2 flex-row bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                <View className={`h-full ${primaryClass}`} style={{ width: '85%' }} />
                <View className="h-full bg-amber-400" style={{ width: '15%' }} />
              </View>

              <View className="flex-row justify-between mt-3">
                <Text className="text-[9px] font-bold text-slate-400 uppercase">Automated Reserve (85%)</Text>
                <Text className="text-[9px] font-bold text-amber-500 uppercase">Emergency Buffered (15%)</Text>
              </View>
            </View>
          </View>

          {/* Member Actions */}
          {!isAdmin && (
            <View className="flex-row gap-3 mb-8">
              <TouchableOpacity
                onPress={() => router.push('/contribute')}
                className="flex-1 h-20 bg-white dark:bg-slate-900 rounded-[28px] border border-slate-100 dark:border-slate-800 items-center justify-center gap-2 shadow-sm"
              >
                <View className="h-8 w-8 rounded-full bg-blue-50 dark:bg-blue-900/30 items-center justify-center">
                  <MaterialIcons name="add-card" size={16} color="#3b82f6" />
                </View>
                <Text className="font-black text-slate-800 dark:text-slate-200 text-xs">Contribute</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleRequestAid}
                className="flex-1 h-20 bg-white dark:bg-slate-900 rounded-[28px] border border-slate-100 dark:border-slate-800 items-center justify-center gap-2 shadow-sm"
              >
                <View className="h-8 w-8 rounded-full bg-amber-50 dark:bg-amber-900/30 items-center justify-center">
                  <MaterialIcons name="request-quote" size={16} color="#f59e0b" />
                </View>
                <Text className="font-black text-slate-800 dark:text-slate-200 text-xs text-center leading-3">Request Aid</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Audit Logs Trail (Both) */}
          <View>
            <View className="flex-row justify-between items-center mb-6">
              <View>
                <Text className="text-2xl font-black text-slate-900 dark:text-slate-100">Live AI Audit Trail</Text>
                <Text className="text-[10px] text-slate-400 uppercase font-black tracking-widest mt-1">Full Interledger Transparency</Text>
              </View>
              <TouchableOpacity
                onPress={fetchLogs}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-full"
              >
                <Text className="text-[10px] font-black uppercase text-slate-600 dark:text-slate-300">Refresh</Text>
              </TouchableOpacity>
            </View>

            {isLoading ? (
              <ActivityIndicator size="small" color={primaryColor} className="py-10" />
            ) : auditLogs.length > 0 ? (
              auditLogs.map((log, index) => (
                <AuditLogItem key={index} log={log} />
              ))
            ) : (
              <View className="py-10 items-center justify-center bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                <MaterialIcons name="history" size={32} color="#94a3b8" />
                <Text className="text-slate-400 text-sm mt-2 font-medium">No payouts recorded in the last 24h</Text>
              </View>
            )}
          </View>

        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
