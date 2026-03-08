import { View, Text, ScrollView, TextInput, TouchableOpacity, SafeAreaView, Modal, ActivityIndicator, KeyboardAvoidingView, Platform, StatusBar } from 'react-native';
import { Shield, CreditCard, ChevronLeft, Info, CheckCircle, Zap, ArrowRight, DollarSign } from 'lucide-react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { useAuth } from '../../services/AuthService';
import { mockPaymentEngine, PaymentFlowProgress } from '../../services/PaymentEngine';
import { useRouter } from 'expo-router';
import { Card, Button, Badge } from '../../components/ui/shadcn';
import OpenPaymentsLiveDemo from '../../components/OpenPaymentsLiveDemo';
import * as WebBrowser from 'expo-web-browser';

export default function ContributeScreen() {
  const { isAdmin } = useAuth();
  const router = useRouter();
  const [amount, setAmount] = useState('10');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentProgress, setPaymentProgress] = useState<PaymentFlowProgress | null>(null);
  const [paymentPointer, setPaymentPointer] = useState('$ilp.interledger-test.dev/6f8390fa');

  const handleStandardPayment = async () => {
    setIsProcessing(true);
    const flow = mockPaymentEngine.startPaymentFlow(amount, paymentPointer);
    
    for await (const progress of flow) {
      setPaymentProgress(progress);

      // --- REAL REDIRECT CONNECTION (Demo Mode) ---
      if (progress.state === 'WAITING_CONSENT' && progress.redirectUrl) {
          console.log(`[Demo] Opening Consent Redirect: ${progress.redirectUrl}`);
          const result = await WebBrowser.openBrowserAsync(progress.redirectUrl);
          console.log(`[Demo] Browser session: ${result.type}`);
      }

      if (progress.state === 'ERROR' || progress.state === 'COMPLETED') {
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
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-[#020617]">
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        className="flex-1"
      >
        <View className="flex-1">
          {/* PREMIUM HEADER */}
          <View className="flex-row items-center px-6 pt-4 pb-4 bg-white dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800">
            <TouchableOpacity 
              onPress={() => router.back()}
              className="h-10 w-10 items-center justify-center rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
            >
              <ChevronLeft size={20} color="#64748b" />
            </TouchableOpacity>
            <Text className="flex-1 text-center text-lg font-black text-slate-900 dark:text-white tracking-tight mr-10">
              Community Contribution
            </Text>
          </View>

          <ScrollView className="flex-1 px-6 pt-6" contentContainerStyle={{ paddingBottom: 150 }}>
            {/* CONTEXT CARD */}
            <Card className="p-6 mb-8 bg-indigo-600 border-none relative overflow-hidden">
               <View className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16" />
               <View className="flex-row items-center gap-3 mb-4">
                  <View className="p-2 bg-white/20 rounded-lg">
                    <Shield size={20} color="white" />
                  </View>
                  <Text className="text-white/80 text-[10px] font-black uppercase tracking-widest">Programmable Trust</Text>
               </View>
               <Text className="text-white text-2xl font-black mb-2">Sustainable Support</Text>
               <Text className="text-white/70 text-sm leading-5">Your contribution is automatically routed via Interledger to the Brooklyn Heights Community Trust.</Text>
            </Card>

            {/* LIVE DEMO SECTION */}
            <OpenPaymentsLiveDemo amount={amount} />

            {/* WALLET CONNECTION SECTION */}
            <View className="mt-10 mb-6">
                <View className="flex-row items-center justify-between mb-4">
                  <Text className="text-slate-900 dark:text-white font-black text-lg">Connect Wallet Pointer</Text>
                  <Badge variant="outline" className="border-indigo-600">
                    <Text className="text-indigo-600 text-[10px] uppercase font-bold">Interledger Test Wallet</Text>
                  </Badge>
                </View>
                <View className="flex-row items-center bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-5 h-16 shadow-sm">
                  <MaterialIcons name="link" size={20} color="#6366f1" />
                  <TextInput 
                      className="flex-1 ml-3 font-bold text-sm text-slate-900 dark:text-white"
                      value={paymentPointer}
                      onChangeText={setPaymentPointer}
                      placeholder="$wallet.example/user"
                      autoCapitalize="none"
                  />
                  <MaterialIcons name="check-circle" size={18} color="#10b981" />
                </View>
            </View>

            {/* AMOUNT SELECTION */}
            <View className="mt-10 mb-6">
               <View className="flex-row items-center justify-between mb-4">
                  <Text className="text-slate-900 dark:text-white font-black text-lg">Select Amount</Text>
                  <Badge variant="outline">SGD / Interledger</Badge>
               </View>
               
               <View className="flex-row gap-3">
                  {['10', '50', '100', '500'].map((val) => (
                    <TouchableOpacity 
                      key={val}
                      onPress={() => setAmount(val)}
                      className={`flex-1 h-14 rounded-2xl items-center justify-center border-2 ${amount === val ? 'bg-indigo-600 border-indigo-600' : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800'}`}
                    >
                      <Text className={`font-black text-sm ${amount === val ? 'text-white' : 'text-slate-600 dark:text-slate-400'}`}>${val}</Text>
                    </TouchableOpacity>
                  ))}
               </View>
            </View>

            {/* CUSTOM INPUT */}
            <View className="mb-10">
               <View className="flex-row items-center bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-5 h-16 shadow-sm">
                  <DollarSign size={20} color="#6366f1" />
                  <TextInput 
                     className="flex-1 ml-3 font-black text-xl text-slate-900 dark:text-white"
                     placeholder="0.00"
                     placeholderTextColor="#94a3b8"
                     keyboardType="numeric"
                     value={amount}
                     onChangeText={setAmount}
                  />
                  <Text className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">SGD</Text>
               </View>
            </View>

            {/* SETTLEMENT PREVIEW */}
            <Card className="p-6 border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950">
               <View className="flex-row items-center gap-2 mb-6">
                  <CreditCard size={16} color="#6366f1" />
                  <Text className="text-slate-900 dark:text-white font-bold text-sm">Settlement Breakdown</Text>
               </View>

               <View className="gap-5">
                  <View className="flex-row justify-between items-center">
                     <Text className="text-slate-500 text-xs font-medium">Recipient Pointer</Text>
                     <Text className="text-indigo-600 dark:text-indigo-400 text-xs font-mono font-bold">{paymentPointer}</Text>
                  </View>
                  <View className="flex-row justify-between items-center">
                     <Text className="text-slate-500 text-xs font-medium">Protocol</Text>
                     <Text className="text-slate-900 dark:text-white text-xs font-black uppercase">Open Payments v1.0</Text>
                  </View>
                  <View className="h-[1px] bg-slate-100 dark:bg-slate-800" />
                  <View className="flex-row justify-between items-center">
                     <Text className="text-slate-900 dark:text-white font-black text-sm">Total Settlement</Text>
                     <Text className="text-indigo-600 dark:text-indigo-400 text-xl font-black">S${parseFloat(amount || '0').toFixed(2)}</Text>
                  </View>
               </View>
            </Card>

            <View className="py-20" />
          </ScrollView>

          {/* FLOAT PAY BUTTON */}
          <View className="absolute bottom-8 left-6 right-6">
             <Button 
                onPress={handleStandardPayment}
                disabled={isProcessing}
                variant="admin"
                className="h-16 shadow-2xl shadow-indigo-600/30"
             >
                {isProcessing ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Zap size={20} color="white" fill="white" className="mr-2" />
                )}
                <Text className="text-white font-black uppercase tracking-widest text-sm">
                   {isProcessing ? 'Settling Protocol...' : 'Authorize Open Payment'}
                </Text>
             </Button>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* PAYMENT SUCCESS MODAL */}
      <Modal visible={!!paymentProgress} transparent animationType="slide">
         <View className="flex-1 bg-black/40 items-center justify-end p-6">
            <View className="bg-white dark:bg-slate-950 w-full rounded-[40px] p-10 items-center border border-slate-200 dark:border-slate-800">
               <View className={`h-24 w-24 rounded-full items-center justify-center mb-8 ${paymentProgress?.state === 'ERROR' ? 'bg-red-500/10' : 'bg-emerald-500/10'}`}>
                  {paymentProgress?.state === 'COMPLETED' ? (
                     <CheckCircle size={48} color="#10b981" />
                  ) : paymentProgress?.state === 'ERROR' ? (
                     <Shield size={48} color="#ef4444" />
                  ) : (
                     <ActivityIndicator size="large" color="#6366f1" />
                  )}
               </View>

               <Text className="text-2xl font-black text-slate-900 dark:text-white mb-4 text-center">
                  {paymentProgress?.message}
               </Text>

               {paymentProgress?.transactionId && (
                  <View className="bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl w-full mb-8 border border-slate-100 dark:border-slate-800">
                     <Text className="text-[10px] uppercase font-black text-slate-400 mb-2 tracking-widest text-center">Protocol Transaction Hash</Text>
                     <Text className="text-xs font-mono text-slate-600 dark:text-slate-300 text-center">{paymentProgress.transactionId}</Text>
                  </View>
               )}

               {(paymentProgress?.state === 'COMPLETED' || paymentProgress?.state === 'ERROR') && (
                  <Button 
                     onPress={() => setPaymentProgress(null)}
                     className="w-full bg-slate-900 dark:bg-slate-800"
                  >
                     <Text className="text-white font-black uppercase tracking-widest text-xs">Dismiss</Text>
                  </Button>
               )}
            </View>
         </View>
      </Modal>
    </SafeAreaView>
  );
}
