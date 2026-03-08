import { View, Text, ScrollView, TouchableOpacity, SafeAreaView, ActivityIndicator, TextInput, Modal, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { useAuth } from '../../services/AuthService';
import { mockTriggerEngine } from '../../services/TriggerEngine';
import { mockDistributionEngine } from '../../services/DistributionEngine';
import { useRouter } from 'expo-router';

export default function ProfileScreen() {
  const { user, setRole, isAdmin } = useAuth();
  const router = useRouter();

  // AI Trigger States
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [aiDecision, setAiDecision] = useState<any>(null);
  const [showAiModal, setShowAiModal] = useState(false);

  // Mock Sensor Inputs
  const [psi, setPsi] = useState('185');
  const [rainfall, setRainfall] = useState('0');

  const toggleRole = () => {
    setRole(isAdmin ? 'Member' : 'Admin');
  };

  const handleAiEvaluation = async () => {
    setIsEvaluating(true);
    setShowAiModal(true);

    const result = await mockTriggerEngine.evaluateTrigger();
    setAiDecision(result.decision);
    setIsEvaluating(false);
  };

  const executeDisbursement = async () => {
    if (!aiDecision) return;
    setIsEvaluating(true);

    // 1. Calculate
    const calc = await mockDistributionEngine.calculateDisbursement('AI-DISASTER', 50);

    // 2. Execute Payouts
    await mockDistributionEngine.executePayouts('AI-DISASTER', calc.totalDisbursement);

    setIsEvaluating(false);
    setShowAiModal(false);
    alert(`Successfully disbursed S$${calc.totalDisbursement} to ${calc.userCount} members based on AI reasoning.`);
  };

  return (
    <SafeAreaView className="flex-1 bg-background-light dark:bg-background-dark">
      <View className="flex-1">
        {/* Header */}
        <View className="flex-row items-center bg-white dark:bg-slate-900 p-4 border-b border-slate-100 dark:border-slate-800">
          <View className={`h-10 w-10 items-center justify-center ${isAdmin ? 'bg-admin/10' : 'bg-primary/10'} rounded-full`}>
            <MaterialIcons name="settings" size={24} color={isAdmin ? '#4338ca' : '#3994ef'} />
          </View>
          <Text className="flex-1 text-center text-lg font-bold text-slate-900 dark:text-slate-100">
            {isAdmin ? 'Admin Portal' : 'Profile'}
          </Text>
        </View>

        <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 100 }}>
          {/* User Hero */}
          <View className="p-6 items-center">
            <View className="h-24 w-24 bg-slate-200 dark:bg-slate-800 rounded-full items-center justify-center overflow-hidden border-4 border-white dark:border-slate-900 shadow-sm">
              <MaterialIcons name="person" size={60} color={isAdmin ? '#4338ca' : '#3994ef'} />
            </View>
            <Text className="text-xl font-bold mt-4 text-slate-900 dark:text-slate-100">{user.name}</Text>
            <Text className="text-slate-500 text-xs uppercase font-bold tracking-widest mt-1">{user.role}</Text>
          </View>

          {/* Role Switcher */}
          <View className="px-4 mb-6">
            <TouchableOpacity
              onPress={toggleRole}
              className={`flex-row items-center justify-between p-4 rounded-2xl ${isAdmin ? 'bg-admin shadow-admin/20' : 'bg-primary shadow-primary/20'} shadow-lg`}
            >
              <View className="flex-row items-center gap-3">
                <MaterialIcons name="swap-horiz" size={24} color="white" />
                <View>
                  <Text className="text-white font-bold text-sm">Switch Dashboard</Text>
                  <Text className="text-white/70 text-[10px] font-medium uppercase">Current: {user.role}</Text>
                </View>
              </View>
              <MaterialIcons name="chevron-right" size={24} color="white" />
            </TouchableOpacity>
          </View>

          {/* Admin Tools Section */}
          {isAdmin ? (
            <View className="px-4">
              <Text className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-4 ml-1">Intelligent Trigger Engine</Text>

              <View className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-100 dark:border-slate-800 shadow-sm">
                <View className="flex-row gap-4 mb-6">
                  <View className="flex-1">
                    <Text className="text-[10px] font-bold text-slate-500 uppercase mb-2">PSI (Current Haze)</Text>
                    <TextInput
                      className="bg-slate-50 dark:bg-slate-800 h-12 rounded-xl px-4 font-bold text-slate-900 dark:text-white"
                      value={psi}
                      onChangeText={setPsi}
                      keyboardType="numeric"
                    />
                  </View>
                  <View className="flex-1">
                    <Text className="text-[10px] font-bold text-slate-500 uppercase mb-2">Rainfall (mm/h)</Text>
                    <TextInput
                      className="bg-slate-50 dark:bg-slate-800 h-12 rounded-xl px-4 font-bold text-slate-900 dark:text-white"
                      value={rainfall}
                      onChangeText={setRainfall}
                      keyboardType="numeric"
                    />
                  </View>
                </View>

                <TouchableOpacity
                  onPress={handleAiEvaluation}
                  className="bg-admin h-14 rounded-2xl flex-row items-center justify-center gap-2"
                >
                  <MaterialIcons name="psychology" size={24} color="white" />
                  <Text className="text-white font-bold">Evaluate via GPT</Text>
                </TouchableOpacity>

                <Text className="text-[10px] text-slate-400 mt-4 text-center italic">
                  AI will analyze 3h trends, historical data, and environmental signals.
                </Text>
              </View>

              {/* Audit Logs Quick View */}
              <TouchableOpacity onPress={() => router.push('/audit')} className="mt-6 flex-row items-center justify-between p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800">
                <View className="flex-row items-center gap-3">
                  <View className="bg-green-100 dark:bg-green-900/30 p-2 rounded-full">
                    <MaterialIcons name="history-edu" size={20} color="#10b981" />
                  </View>
                  <Text className="font-bold text-slate-700 dark:text-slate-200">Public Audit Logs</Text>
                </View>
                <MaterialIcons name="chevron-right" size={24} color="#cbd5e1" />
              </TouchableOpacity>
            </View>
          ) : (
            <View className="px-4">
              {/* User Info Cards */}
              <View className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 gap-4">
                <View className="flex-row justify-between items-center">
                  <Text className="text-slate-500 text-sm">Wallet Address</Text>
                  <Text className="text-primary font-bold text-right text-xs shrink ml-4">{user.walletId}</Text>
                </View>
                <View className="h-[1px] bg-slate-100 dark:bg-slate-800" />
                <TouchableOpacity onPress={() => Alert.alert('Settings', 'Notification settings not yet available in demo.')} className="flex-row justify-between items-center">
                  <Text className="text-slate-900 dark:text-slate-100 font-medium">Notification Settings</Text>
                  <MaterialIcons name="chevron-right" size={20} color="#94a3b8" />
                </TouchableOpacity>
              </View>
            </View>
          )}

          <TouchableOpacity onPress={() => router.replace('/login')} className="mx-4 mt-8 bg-slate-100 dark:bg-slate-800 py-4 rounded-xl items-center flex-row justify-center gap-2">
            <MaterialIcons name="logout" size={20} color="#ef4444" />
            <Text className="text-red-500 font-bold">Log out</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* AI Decision Modal */}
        <Modal visible={showAiModal} transparent animationType="slide">
          <View className="flex-1 bg-black/60 justify-end">
            <View className="bg-white dark:bg-slate-900 rounded-t-[40px] p-8 shadow-2xl">
              <View className="h-1 w-12 bg-slate-200 dark:bg-slate-700 self-center rounded-full mb-8" />

              <Text className="text-2xl font-black text-slate-900 dark:text-slate-100 mb-6 flex-row items-center">
                AI Judgment <MaterialIcons name="verified" size={24} color="#4338ca" />
              </Text>

              {isEvaluating ? (
                <View className="py-12 items-center">
                  <ActivityIndicator size="large" color="#4338ca" />
                  <Text className="text-slate-500 font-medium mt-4">Consulting GPT-4o Decision Engine...</Text>
                </View>
              ) : (
                <View>
                  {/* Confidence Gauge */}
                  <View className="flex-row items-center justify-between mb-6">
                    <View>
                      <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Decision</Text>
                      <Text className={`text-xl font-bold ${aiDecision?.trigger ? 'text-red-500' : 'text-green-500'}`}>
                        {aiDecision?.trigger ? 'TRIGGER DISASTER' : 'STANDBY (SAFE)'}
                      </Text>
                    </View>
                    <View className="items-end">
                      <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Confidence</Text>
                      <Text className="text-xl font-black text-admin">{aiDecision?.confidence}%</Text>
                    </View>
                  </View>

                  <View className="bg-slate-50 dark:bg-slate-800 p-5 rounded-2xl mb-8 border-l-4 border-admin/50">
                    <Text className="text-[10px] font-black text-admin uppercase mb-2">System Reasoning:</Text>
                    <Text className="text-slate-700 dark:text-slate-300 leading-6 text-sm italic font-medium">
                      "{aiDecision?.reasoning}"
                    </Text>
                  </View>

                  <View className="flex-row gap-4">
                    <TouchableOpacity
                      onPress={() => setShowAiModal(false)}
                      className="flex-1 bg-slate-100 dark:bg-slate-800 h-14 rounded-2xl items-center justify-center"
                    >
                      <Text className="text-slate-600 dark:text-slate-300 font-bold">Dismiss</Text>
                    </TouchableOpacity>

                    {aiDecision?.trigger && (
                      <TouchableOpacity
                        onPress={executeDisbursement}
                        className="flex-[2] bg-admin h-14 rounded-2xl items-center justify-center shadow-lg shadow-admin/30"
                      >
                        <Text className="text-white font-black">Execute AI Payouts</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              )}
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}
