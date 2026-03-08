import React, { useState, useEffect } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { dataIngestionService } from '../services/DataIngestionService';

export default function EnvironmentalStatus() {
  const [summary, setSummary] = useState<any>(null);

  useEffect(() => {
    // Start data ingestion if not running
    dataIngestionService.start();

    const update = () => {
      // Pull latest snapshot locally from DataIngestionService (no OpenAI costs)
      const latest = dataIngestionService.getLatestSnapshot();
      if (latest && !latest.status.psi.isStale) {
        setSummary({ snapshot: latest });
      }
    };

    update();
    const interval = setInterval(update, 10000); // UI updates every 10s
    return () => clearInterval(interval);
  }, []);

  if (!summary) return (
    <View className="bg-slate-900 rounded-3xl p-6 mb-6 h-32 items-center justify-center border border-slate-800">
      <ActivityIndicator color="#4338ca" />
      <Text className="text-slate-500 text-[10px] mt-2 font-black uppercase tracking-widest">Polling Live SEC-Grid...</Text>
    </View>
  );

  const rawSnapshot = summary.snapshot;

  // Parse RAW api format for dashboard viewing
  const getRawMaxPsi = () => {
    try {
      const psiReadings = rawSnapshot.psi?.items?.[0]?.readings?.psi_twenty_four_hourly;
      if (!psiReadings) return 0;
      return Math.max(...(Object.values(psiReadings) as number[]), 0);
    } catch { return 0; }
  };

  const getRawMaxPm25 = () => {
    try {
      const pmReadings = rawSnapshot.pm25?.items?.[0]?.readings?.pm25_one_hourly;
      if (!pmReadings) return 0;
      return Math.max(...(Object.values(pmReadings) as number[]), 0);
    } catch { return 0; }
  };

  const getRawAvgTemp = () => {
    try {
      const temps = rawSnapshot.temperature?.items?.[0]?.readings;
      if (!temps || temps.length === 0) return 0;
      const sum = temps.reduce((acc: number, r: any) => acc + (r.value || 0), 0);
      return (sum / temps.length).toFixed(1);
    } catch { return 0; }
  };

  const getSourceTimestamp = () => {
    try {
      return rawSnapshot.psi?.items?.[0]?.update_timestamp || new Date().toISOString();
    } catch { return null; }
  }

  const maxPsi = getRawMaxPsi();

  const getSeverityColor = (val: number) => {
    if (val <= 50) return 'text-emerald-400';
    if (val <= 100) return 'text-amber-400';
    if (val <= 150) return 'text-orange-400';
    return 'text-rose-500';
  };


  return (
    <View className="bg-slate-900 rounded-[32px] p-6 mb-8 border border-slate-800 shadow-2xl relative overflow-hidden">
      {/* Background Micro-Gradient */}
      <View className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl -mr-10 -mt-10" />

      <View className="flex-row justify-between items-center mb-6">
        <View className="flex-row items-center gap-2.5">
          <View className={`h-2.5 w-2.5 rounded-full ${maxPsi > 100 ? 'bg-rose-500' : 'bg-emerald-500'} shadow-lg`} />
          <View>
            <Text className="text-white font-black text-xs uppercase tracking-widest">Global SEC-Grid Feed</Text>
            <Text className="text-[10px] text-slate-500 font-medium">Real-time Environmental Telemetry</Text>
          </View>
        </View>
        <View className="bg-slate-800/80 px-2.5 py-1.5 rounded-xl border border-slate-700">
          <Text className="text-[9px] text-slate-300 font-black uppercase tracking-widest">Health: {dataIngestionService.getDataIntegrityScore()}%</Text>
        </View>
      </View>

      <View className="flex-row justify-between items-center px-2">
        <View className="items-center">
          <Text className="text-slate-500 text-[10px] font-black uppercase mb-2 tracking-tighter">PSI (24HR)</Text>
          <Text className={`text-4xl font-black ${getSeverityColor(maxPsi)}`}>
            {maxPsi || '--'}
          </Text>
          <View className="bg-slate-800 px-2 py-0.5 rounded-md mt-2">
            <Text className="text-[8px] text-slate-400 font-black">MAX REG</Text>
          </View>
        </View>

        <View className="w-[1px] h-12 bg-slate-800" />

        <View className="items-center">
          <Text className="text-slate-500 text-[10px] font-black uppercase mb-2 tracking-tighter">PM2.5 (1H)</Text>
          <Text className="text-white text-4xl font-black">
            {getRawMaxPm25() || '--'}
          </Text>
          <View className="bg-slate-800 px-2 py-0.5 rounded-md mt-2">
            <Text className="text-[8px] text-slate-400 font-black">AIRBORNE</Text>
          </View>
        </View>

        <View className="w-[1px] h-12 bg-slate-800" />

        <View className="items-center">
          <Text className="text-slate-500 text-[10px] font-black uppercase mb-2 tracking-tighter">Temp</Text>
          <Text className="text-white text-4xl font-black">{getRawAvgTemp() ? `${getRawAvgTemp()}°` : '--'}</Text>
          <View className="bg-slate-800 px-2 py-0.5 rounded-md mt-2">
            <Text className="text-[8px] text-slate-400 font-black">THERMAL</Text>
          </View>
        </View>
      </View>

      {/* Advisory Feed - Removed RSS as it's not in the RAW gov API feed */}

      <View className="mt-6 pt-4 border-t border-slate-800/30 flex-row items-center justify-between">
        <View className="flex-row items-center gap-1.5">
          <View className="h-1.5 w-1.5 bg-indigo-500 rounded-full" />
          <Text className="text-slate-500 text-[9px] font-black uppercase tracking-widest">Model: GPT</Text>
        </View>
        <View className="flex-row items-center gap-1">
          <MaterialIcons name="verified-user" size={12} color="#4ade80" />
          <Text className="text-emerald-500/80 text-[7px] font-black uppercase tracking-widest">{getSourceTimestamp() ? `data.gov.sg • ${new Date(getSourceTimestamp()!).toLocaleTimeString()}` : 'LIVE FEED'}</Text>
        </View>
      </View>
    </View>
  );
}
