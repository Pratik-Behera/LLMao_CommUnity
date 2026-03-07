import React, { useState, useEffect } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { dataIngestionService } from '../../backend/services/DataIngestionService';

export default function EnvironmentalStatus() {
  const [snapshot, setSnapshot] = useState<any>(null);
  const [score, setScore] = useState(100);
  const [mode, setMode] = useState('NOMINAL');

  useEffect(() => {
    const update = () => {
      setSnapshot(dataIngestionService.getLatestSnapshot());
      setScore(dataIngestionService.getDataIntegrityScore());
      setMode(dataIngestionService.getSystemMode());
    };

    update();
    const interval = setInterval(update, 5000); // UI updates every 5s
    return () => clearInterval(interval);
  }, []);

  if (!snapshot) return null;

  // Extract central PSI or fallback to any region
  const psiCentral = snapshot.psi?.data?.items?.[0]?.readings?.psi_twenty_four_hourly?.central || 
                     Object.values(snapshot.psi?.data?.items?.[0]?.readings?.psi_twenty_four_hourly || {})[0] as number || 0;
  
  const pm25Central = snapshot.pm25?.data?.items?.[0]?.readings?.pm25_one_hourly?.central || 0;
  const temp = snapshot.temperature?.data?.readings?.[0]?.data?.[0]?.value || 0;
  
  const getSeverityColor = (val: number) => {
    if (val <= 50) return 'text-green-500';
    if (val <= 100) return 'text-yellow-500';
    if (val <= 200) return 'text-orange-500';
    return 'text-red-500';
  };

  return (
    <View className="bg-slate-900 rounded-2xl p-4 mb-6 border border-slate-800">
      <View className="flex-row justify-between items-center mb-4">
        <View className="flex-row items-center gap-2">
          <View className={`h-2 w-2 rounded-full ${mode === 'NOMINAL' ? 'bg-green-500' : 'bg-yellow-500'} animate-pulse`} />
          <Text className="text-white font-bold text-sm tracking-tight">NEA Real-time Monitoring</Text>
        </View>
        <View className="bg-slate-800 px-2 py-1 rounded-md">
          <Text className="text-[10px] text-slate-400 font-bold uppercase">Data Integrity: {score}%</Text>
        </View>
      </View>

      <View className="flex-row justify-between">
        <View className="items-center flex-1">
          <Text className="text-slate-500 text-[10px] font-bold uppercase mb-1">PSI (24H)</Text>
          <Text className={`text-2xl font-black ${getSeverityColor(psiCentral)}`}>{psiCentral || '--'}</Text>
        </View>
        
        <View className="w-[1px] h-full bg-slate-800 mx-2" />

        <View className="items-center flex-1">
          <Text className="text-slate-500 text-[10px] font-bold uppercase mb-1">PM2.5 (1H)</Text>
          <Text className="text-white text-2xl font-black">{pm25Central || '--'}</Text>
        </View>

        <View className="w-[1px] h-full bg-slate-800 mx-2" />

        <View className="items-center flex-1">
          <Text className="text-slate-500 text-[10px] font-bold uppercase mb-1">Temp</Text>
          <Text className="text-white text-2xl font-black">{temp ? `${temp}°C` : '--'}</Text>
        </View>
      </View>

      <View className="mt-4 pt-3 border-t border-slate-800 flex-row items-center justify-between">
         <Text className="text-slate-500 text-[10px] italic">Source: data.gov.sg</Text>
         <View className="flex-row items-center gap-1">
            <MaterialIcons name="security" size={12} color="#94a3b8" />
            <Text className="text-slate-400 text-[10px] font-medium uppercase">AI Monitoring Active</Text>
         </View>
      </View>
    </View>
  );
}
