import { View, Text, ScrollView, TouchableOpacity, SafeAreaView, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import { useAuth } from '../../services/AuthService';
import { mockDistributionEngine } from '../../services/DistributionEngine';
import AuditLogItem from '../../components/AuditLogItem';

export default function HomeScreen() {
  const { isAdmin } = useAuth();
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const primaryColor = isAdmin ? '#4338ca' : '#3994ef';
  const primaryClass = isAdmin ? 'bg-admin' : 'bg-primary';
  const primaryTextClass = isAdmin ? 'text-admin' : 'text-primary';
  const primaryBorderClass = isAdmin ? 'border-admin/20' : 'border-primary/10';
  const primaryBgClass = isAdmin ? 'bg-admin/5' : 'bg-primary/5';

  useEffect(() => {
    const fetchLogs = async () => {
      setIsLoading(true);
      const logs = await mockDistributionEngine.getAuditLogs();
      setAuditLogs(logs);
      setIsLoading(false);
    };
    fetchLogs();
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-background-light dark:bg-background-dark">
      <View className="flex-1">
        {/* Header */}
        <View className="flex-row items-center bg-white dark:bg-slate-900 p-4 border-b border-slate-100 dark:border-slate-800">
          <View className={`h-10 w-10 items-center justify-center rounded-full ${isAdmin ? 'bg-admin/10' : 'bg-primary/10'}`}>
            <MaterialIcons name="group-work" size={24} color={primaryColor} />
          </View>
          <Text className="flex-1 text-center text-lg font-bold text-slate-900 dark:text-slate-100">
            CommUnity {isAdmin && <Text className="text-[10px] text-admin uppercase tracking-tighter align-top">Admin</Text>}
          </Text>
          <TouchableOpacity className="h-10 w-10 items-center justify-center">
            <MaterialIcons name="notifications" size={24} className="text-slate-900 dark:text-slate-100" />
          </TouchableOpacity>
        </View>

        <ScrollView className="flex-1 px-4 py-4" contentContainerStyle={{ paddingBottom: 100 }}>
          {/* Fund Health */}
          <View className="mb-6">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Brooklyn Heights</Text>
              <MaterialIcons name="info" size={24} color="#94a3b8" />
            </View>

            <View className={`${primaryBgClass} rounded-2xl p-4 border ${primaryBorderClass}`}>
              <View className="flex-row justify-between items-end mb-2">
                <Text className="text-sm font-medium uppercase tracking-wider text-slate-600 dark:text-slate-400">Total Fund</Text>
                <Text className={`text-xl font-bold ${primaryTextClass}`}>S$45,000</Text>
              </View>

              <View className="h-2.5 flex-row bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <View className={`h-full ${primaryClass}`} style={{ width: '70.7%' }} />
                <View className="h-full bg-blue-400" style={{ width: '22.2%' }} />
                <View className="h-full bg-slate-400" style={{ width: '7.1%' }} />
              </View>

              <View className="flex-row flex-wrap gap-x-4 mt-3">
                <View className="flex-row items-center gap-1.5">
                  <View className={`h-2 w-2 rounded-full ${primaryClass}`} />
                  <Text className="text-[10px] font-bold uppercase text-slate-600 dark:text-slate-400">Community Support</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Quick Actions */}
          <View className="flex-row gap-3 mb-6">
             <TouchableOpacity className="flex-1 h-14 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 items-center justify-center flex-row gap-2">
                <MaterialIcons name="add-card" size={20} color={primaryColor} />
                <Text className="font-bold text-slate-700 dark:text-slate-300">Contribute</Text>
             </TouchableOpacity>
             <TouchableOpacity className="flex-1 h-14 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 items-center justify-center flex-row gap-2">
                <MaterialIcons name="request-quote" size={20} color={primaryColor} />
                <Text className="font-bold text-slate-700 dark:text-slate-300">Request Aid</Text>
             </TouchableOpacity>
          </View>

          {/* Audit Logs Trail */}
          <View>
            <View className="flex-row justify-between items-center mb-4">
               <View>
                  <Text className="text-lg font-bold text-slate-900 dark:text-slate-100">Live AI Audit Trail</Text>
                  <Text className="text-[10px] text-slate-400 uppercase font-black tracking-widest mt-0.5">Automated Disbursements</Text>
               </View>
               <TouchableOpacity>
                  <Text className={`text-xs font-bold ${primaryTextClass}`}>Refresh</Text>
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
