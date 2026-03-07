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

  return (
    <View className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 mb-3 overflow-hidden">
      <TouchableOpacity 
        onPress={() => setIsExpanded(!isExpanded)}
        className="p-4 flex-row justify-between items-center"
      >
        <View className="flex-row items-center gap-3">
          <View className="h-10 w-10 bg-admin/10 rounded-full items-center justify-center">
            <MaterialIcons name="security" size={20} color="#4338ca" />
          </View>
          <View>
            <Text className="text-sm font-bold text-slate-800 dark:text-slate-100">Disbursement {log.disbursementId}</Text>
            <Text className="text-[10px] text-slate-400 uppercase tracking-tighter">
              {new Date(log.timestamp).toLocaleTimeString()} • {log.zone} • {log.status}
            </Text>
          </View>
        </View>
        <View className="items-end">
          <Text className="text-sm font-bold text-admin">S${log.amount.toFixed(2)}</Text>
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
              <MaterialIcons name="psychology" size={14} color="#4338ca" />
              <Text className="text-[10px] font-bold text-admin uppercase">AI Verification Case</Text>
            </View>
            <View className="bg-admin px-2 py-0.5 rounded-full">
               <Text className="text-white text-[9px] font-black">{log.aiConfidence}% Conf.</Text>
            </View>
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
