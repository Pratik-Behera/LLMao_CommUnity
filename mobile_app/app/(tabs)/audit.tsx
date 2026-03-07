import { View, Text, ScrollView, TouchableOpacity, SafeAreaView, ActivityIndicator, RefreshControl } from 'react-native';
import { Shield, ChevronLeft, CreditCard, Filter, Download, Zap, PieChart } from 'lucide-react-native';
import { useState, useEffect } from 'react';
import { mockDistributionEngine } from '../../services/DistributionEngine';
import AuditLogItem from '../../components/AuditLogItem';
import { Card, Badge } from '../../components/ui/shadcn';
import { useRouter } from 'expo-router';

export default function PaymentAuditScreen() {
    const [auditLogs, setAuditLogs] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [fundHealth, setFundHealth] = useState<any>(null);
    const router = useRouter();

    const fetchAuditTrail = async () => {
        setIsLoading(true);
        const [logs, health] = await Promise.all([
            mockDistributionEngine.getAuditLogs(),
            mockDistributionEngine.getFundHealth()
        ]);
        setAuditLogs(logs);
        setFundHealth(health);
        setIsLoading(false);
    };

    const onRefresh = async () => {
        setIsRefreshing(true);
        await fetchAuditTrail();
        setIsRefreshing(false);
    };

    useEffect(() => {
        fetchAuditTrail();
    }, []);

    return (
        <SafeAreaView className="flex-1 bg-slate-50 dark:bg-[#020617]">
            <View className="flex-1">
                {/* ADMIN HEADER */}
                <View className="flex-row items-center px-6 pt-4 pb-6 bg-white dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800">
                    <TouchableOpacity 
                        onPress={() => router.back()}
                        className="h-10 w-10 items-center justify-center rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
                    >
                        <ChevronLeft size={20} color="#64748b" />
                    </TouchableOpacity>
                    <View className="flex-1 items-center mr-10">
                        <Text className="text-sm font-black text-indigo-600 uppercase tracking-[2px]">Admin Terminal</Text>
                        <Text className="text-lg font-black text-slate-900 dark:text-white tracking-tight">Payment Audit Trail</Text>
                    </View>
                </View>

                <ScrollView 
                    className="flex-1 px-6 pt-6" 
                    contentContainerStyle={{ paddingBottom: 100 }}
                    refreshControl={
                        <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor="#6366f1" />
                    }
                >
                    {/* STATS OVERVIEW */}
                    <View className="flex-row gap-4 mb-8">
                        <Card className="flex-1 p-4 bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800">
                            <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Disbursed</Text>
                            <Text className="text-xl font-black text-slate-900 dark:text-white">S$12,450</Text>
                            <View className="flex-row items-center gap-1 mt-2">
                                <Zap size={10} color="#10b981" fill="#10b981" />
                                <Text className="text-[10px] font-bold text-emerald-500">+12% vs last month</Text>
                            </View>
                        </Card>
                        <Card className="flex-1 p-4 bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800">
                            <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Circle Reserves</Text>
                            <Text className="text-xl font-black text-slate-900 dark:text-white">S$32,550</Text>
                            <View className="flex-row items-center gap-1 mt-2">
                                <PieChart size={10} color="#6366f1" />
                                <Text className="text-[10px] font-bold text-indigo-500">72.3% Healthy</Text>
                            </View>
                        </Card>
                    </View>

                    {/* FILTER & EXPORT BAR */}
                    <View className="flex-row justify-between items-center mb-6">
                        <View className="flex-row gap-2">
                            <TouchableOpacity className="h-10 px-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex-row items-center gap-2">
                                <Filter size={14} color="#64748b" />
                                <Text className="text-xs font-bold text-slate-600 dark:text-slate-400">Filter</Text>
                            </TouchableOpacity>
                            <TouchableOpacity className="h-10 w-10 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl items-center justify-center">
                                <Download size={14} color="#64748b" />
                            </TouchableOpacity>
                        </View>
                        <Badge variant="outline" className="h-10 px-4 rounded-xl border-indigo-100 dark:border-indigo-900">
                            <Text className="text-indigo-600 dark:text-indigo-400 font-bold">Live Ledger</Text>
                        </Badge>
                    </View>

                    {/* AUDIT LIST */}
                    {isLoading && !isRefreshing ? (
                        <View className="py-20 items-center justify-center">
                            <ActivityIndicator size="large" color="#6366f1" />
                            <Text className="mt-4 text-slate-400 font-medium">Querying ILP Ledger...</Text>
                        </View>
                    ) : auditLogs.length > 0 ? (
                        auditLogs.map((log, index) => (
                            <AuditLogItem key={index} log={log} />
                        ))
                    ) : (
                        <View className="py-20 items-center justify-center bg-slate-100/50 dark:bg-slate-900/50 rounded-[32px] border border-dashed border-slate-200 dark:border-slate-800">
                            <CreditCard size={48} color="#94a3b8" strokeWidth={1} />
                            <Text className="text-slate-500 font-black text-sm mt-4 uppercase tracking-widest">No Transactions Found</Text>
                            <Text className="text-slate-400 text-xs text-center px-10 mt-2">The Interledger network has not processed any payouts for this circle yet.</Text>
                        </View>
                    )}
                </ScrollView>
            </View>
        </SafeAreaView>
    );
}
