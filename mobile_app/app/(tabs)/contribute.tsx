import { View, Text, ScrollView, TextInput, TouchableOpacity, SafeAreaView, Modal, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { useAuth } from '../../services/AuthService';
import { mockPaymentEngine, PaymentFlowProgress } from '../../services/PaymentEngine';
import { useRouter } from 'expo-router';

export default function ContributeScreen() {
  const { isAdmin } = useAuth();
  const router = useRouter();
  const primaryColor = isAdmin ? '#4338ca' : '#3994ef';
  const primaryClass = isAdmin ? 'bg-admin' : 'bg-primary';
  const primaryTextClass = isAdmin ? 'text-admin' : 'text-primary';
  const primaryBorderClass = isAdmin ? 'border-admin/20' : 'border-primary/10';
  const primaryBgClass = isAdmin ? 'bg-admin/5' : 'bg-primary/5';

  const [amount, setAmount] = useState('10');
  const [paymentProgress, setPaymentProgress] = useState<PaymentFlowProgress | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handlePayment = async () => {
    setIsProcessing(true);
    const flow = mockPaymentEngine.startPaymentFlow(amount, '$ilp.rafiki.money/brooklyn-heights');
    
    for await (const progress of flow) {
      setPaymentProgress(progress);
      if (progress.state === 'ERROR' || progress.state === 'COMPLETED') {
        // Keep the final state visible for a bit
        setTimeout(() => {
          if (progress.state === 'COMPLETED') {
            setIsProcessing(false);
            setPaymentProgress(null);
          }
        }, 3000);
      }
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background-light dark:bg-background-dark">
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        className="flex-1"
      >
        <View className="flex-1 relative">
          {/* Header */}
          <View className="flex-row items-center p-4 justify-between bg-white dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800">
            <TouchableOpacity 
              onPress={() => router.back()}
              className="h-10 w-10 items-center justify-center rounded-full bg-slate-50 dark:bg-slate-800"
            >
              <MaterialIcons name="arrow-back" size={24} className="text-slate-900 dark:text-slate-100" />
            </TouchableOpacity>
            <Text className="flex-1 text-center text-lg font-bold text-slate-900 dark:text-slate-100 mr-10">
              Monthly Contribution
            </Text>
          </View>

          <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 180 }}>
            {/* Achievement Card */}
            <View className="p-4">
              <View className="rounded-xl overflow-hidden shadow-sm bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                <View className={`${isAdmin ? 'bg-admin/20' : 'bg-primary/20'} h-32 relative items-center justify-center`}>
                  <View className={`absolute inset-0 ${primaryClass} opacity-20`} />
                  <View className="absolute bottom-3 left-4 flex-row items-center gap-2">
                    <View className={primaryClass + " p-1 rounded-full"}>
                      <MaterialIcons name="workspace-premium" size={20} color="white" />
                    </View>
                    <Text className={`${isAdmin ? 'text-admin-dark' : 'text-primary-dark'} font-bold text-xs uppercase tracking-wider`}>Achievement Locked</Text>
                  </View>
                </View>
                <View className="p-4 gap-1">
                  <Text className={`${primaryTextClass} text-xs font-bold uppercase tracking-wider`}>6 Month Streak</Text>
                  <Text className="text-slate-900 dark:text-slate-100 text-lg font-bold tracking-tight">Consistent Impact Maker</Text>
                </View>
              </View>
            </View>

            {/* Amount Picking */}
            <View className="px-4 py-2">
              <Text className="text-slate-900 dark:text-slate-100 text-base font-bold mb-3">Select Contribution Amount</Text>
              <View className="flex-row gap-3 mb-4">
                {['1', '2', '5', '10'].map((val) => (
                  <TouchableOpacity 
                    key={val}
                    className={`flex-1 h-14 rounded-xl items-center justify-center ${amount === val ? primaryClass : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800'}`}
                    onPress={() => setAmount(val)}
                  >
                    <Text className={`text-sm font-bold ${amount === val ? 'text-white' : 'text-slate-700 dark:text-slate-300'}`}>S${val}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View className="relative mb-6">
                <View className="flex-row items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 h-14">
                  <Text className="text-slate-400 font-bold text-lg mr-2">S$</Text>
                  <TextInput 
                      className="flex-1 font-semibold text-lg text-slate-900 dark:text-white"
                      placeholder="Enter custom amount"
                      keyboardType="numeric"
                      value={amount}
                      onChangeText={setAmount}
                  />
                </View>
              </View>

              {/* Split Preview */}
              <View className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-4 border border-slate-100 dark:border-slate-800">
                <Text className="text-slate-900 dark:text-slate-100 text-sm font-bold mb-4">How your S${amount || '0'} is split</Text>
                <View className="flex-row h-3 w-full rounded-full overflow-hidden mb-6 bg-slate-200 dark:bg-slate-800">
                    <View className={`h-full ${primaryClass}`} style={{ width: '70%' }} />
                    <View className="h-full bg-blue-400" style={{ width: '20%' }} />
                    <View className="h-full bg-blue-200" style={{ width: '10%' }} />
                </View>
                <View className="gap-3">
                    {[
                      { label: 'Community Support (70%)', val: 0.7, color: primaryClass },
                      { label: 'Reserve Fund (20%)', val: 0.2, color: 'bg-blue-400' },
                      { label: 'Admin & Fees (10%)', val: 0.1, color: 'bg-blue-200' }
                    ].map((item, idx) => (
                      <View key={idx} className="flex-row items-center justify-between">
                        <View className="flex-row items-center gap-2">
                          <View className={`h-2 w-2 rounded-full ${item.color}`} />
                          <Text className="text-slate-600 dark:text-slate-400 text-sm">{item.label}</Text>
                        </View>
                        <Text className="text-slate-900 dark:text-slate-100 text-sm font-bold">S${((parseFloat(amount || '0') * item.val)).toFixed(2)}</Text>
                      </View>
                    ))}
                </View>
              </View>
            </View>
          </ScrollView>

          {/* Fixed Pay Button at Bottom */}
          <View className="absolute bottom-6 left-4 right-4 z-50">
            <TouchableOpacity 
              onPress={handlePayment}
              disabled={isProcessing}
              activeOpacity={0.8}
              className={`w-full ${primaryClass} h-15 rounded-2xl flex-row items-center justify-center gap-3 shadow-xl shadow-primary/40 ${isProcessing ? 'opacity-70' : ''}`}
              style={{ height: 60 }}
            >
              {isProcessing ? (
                <ActivityIndicator color="white" />
              ) : (
                <MaterialIcons name="account-balance-wallet" size={24} color="white" />
              )}
              <Text className="text-white font-bold text-lg">
                {isProcessing ? 'Processing Payment...' : 'Pay Now with Open Payments'}
              </Text>
            </TouchableOpacity>
          </View>


        </View>
      </KeyboardAvoidingView>

      {/* Payment Progress Overlay */}
      <Modal visible={isProcessing && !!paymentProgress} transparent animationType="fade">
        <View className="flex-1 bg-black/60 items-center justify-center p-6">
          <View className="bg-white dark:bg-slate-900 w-full rounded-3xl p-8 items-center border border-slate-200 dark:border-slate-800 shadow-2xl">
            {paymentProgress?.state === 'COMPLETED' ? (
              <View className="bg-green-100 dark:bg-green-900/30 p-4 rounded-full mb-6">
                <MaterialIcons name="check-circle" size={60} color="#22c55e" />
              </View>
            ) : paymentProgress?.state === 'ERROR' ? (
              <View className="bg-red-100 dark:bg-red-900/30 p-4 rounded-full mb-6">
                <MaterialIcons name="error" size={60} color="#ef4444" />
              </View>
            ) : (
              <ActivityIndicator size="large" color={primaryColor} className="mb-6" />
            )}
            
            <Text className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2 text-center">
              {paymentProgress?.message}
            </Text>
            
            {paymentProgress?.transactionId && (
              <View className="bg-slate-100 dark:bg-slate-800 px-4 py-2 rounded-lg mt-4 w-full">
                <Text className="text-[10px] uppercase font-bold text-slate-500 mb-1 text-center">Transaction Hash</Text>
                <Text className="text-xs font-mono text-slate-800 dark:text-slate-200 text-center">
                  {paymentProgress.transactionId}
                </Text>
              </View>
            )}

            {paymentProgress?.state === 'WAITING_CONSENT' && (
              <Text className="text-xs text-slate-500 mt-4 text-center italic">
                Simulating Rafiki Wallet redirect... User is approving payment.
              </Text>
            )}

            {(paymentProgress?.state === 'COMPLETED' || paymentProgress?.state === 'ERROR') && (
              <TouchableOpacity 
                 onPress={() => { setIsProcessing(false); setPaymentProgress(null); }}
                 className="mt-8 bg-slate-900 dark:bg-slate-700 px-8 py-3 rounded-xl"
              >
                <Text className="text-white font-bold">Close</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
