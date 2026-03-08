import { View, Text, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useState } from 'react';

interface AuditLogItemProps {
  log: {
    alertId: string;
    disbursementId: string;
    amount: number;
    status: string;
    timestamp: string;
    aiReasoning: string;
    aiConfidence: number;
    zone: string;
  };
}

export default function AuditLogItem({ log }: AuditLogItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);

    const isContribution = log.status === 'CONTRIBUTED';
    const isPending = log.status === 'PENDING_APPROVAL';
    
    const iconName = isContribution ? 'add-card' : (isPending ? 'pending' : 'security');
    const iconColor = isContribution ? '#3b82f6' : (isPending ? '#f59e0b' : '#4338ca');
    const bgColor = isContribution ? 'bg-blue-500/10' : (isPending ? 'bg-amber-500/10' : 'bg-admin/10');
    const textColor = isContribution ? 'text-blue-500' : (isPending ? 'text-amber-500' : 'text-admin');

  return (
    <View className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 mb-3 overflow-hidden">
      <TouchableOpacity 
        onPress={() => setIsExpanded(!isExpanded)}
        className="p-4 flex-row justify-between items-center"
      >
        <View className="flex-row items-center gap-3">
          <View className={`h-10 w-10 ${bgColor} rounded-full items-center justify-center`}>
            <MaterialIcons name={iconName} size={20} color={iconColor} />
          </View>
          <View>
            <Text className="text-sm font-bold text-slate-800 dark:text-slate-100">
               {isContribution ? 'Member Contribution' : `Settlement ${log.disbursementId}`}
            </Text>
            <Text className="text-[10px] text-slate-400 uppercase tracking-tighter">
              {new Date(log.timestamp).toLocaleTimeString()} • {log.zone} • {log.status.replace('_', ' ')}
            </Text>
          </View>
        </View>
        <View className="items-end">
          <Text className={`text-sm font-bold ${textColor}`}>
             {isContribution ? '+' : ''}S${log.amount.toFixed(2)}
          </Text>
          <MaterialIcons 
            name={isExpanded ? "expand-less" : "expand-more"} 
            size={20} 
            color="#94a3b8" 
          />
        </View>
      </TouchableOpacity>

      {isExpanded && (
        <View className="px-4 pb-4 pt-2 border-t border-slate-50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
          <View className="flex-row items-center justify-between mb-3">
            <View className="flex-row items-center gap-1">
              <MaterialIcons name={isContribution ? "account-balance-wallet" : "psychology"} size={14} color={iconColor} />
              <Text className={`text-[10px] font-bold ${textColor} uppercase`}>
                 {isContribution ? 'Verified Ledger Credit' : 'AI Verification Case'}
              </Text>
            </View>
            {!isContribution && (
               <View className={`${isPending ? 'bg-amber-500' : 'bg-admin'} px-2 py-0.5 rounded-full`}>
                  <Text className="text-white text-[9px] font-black">{log.aiConfidence}% Conf.</Text>
               </View>
            )}
          </View>
          
          <Text className="text-xs text-slate-600 dark:text-slate-400 leading-5 italic">
            "{log.aiReasoning}"
          </Text>

          <View className="mt-4 pt-3 border-t border-slate-200/30 flex-row justify-between">
             <Text className="text-[9px] font-bold text-slate-400 uppercase">Alert ID: {log.alertId}</Text>
             <TouchableOpacity>
                <Text className="text-[9px] font-bold text-admin underline uppercase">View on Ledger</Text>
             </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}
