import { View, Text, ScrollView, TextInput, TouchableOpacity, SafeAreaView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../../services/AuthService';
import EnvironmentalStatus from '../../components/EnvironmentalStatus';

export default function CirclesScreen() {
  const { isAdmin } = useAuth();
  const primaryColor = isAdmin ? '#4338ca' : '#3994ef';
  const primaryClass = isAdmin ? 'bg-admin' : 'bg-primary';
  const primaryTextClass = isAdmin ? 'text-admin' : 'text-primary';
  const primaryBorderClass = isAdmin ? 'border-admin/20' : 'border-primary/10';
  const primaryBgClass = isAdmin ? 'bg-admin/5' : 'bg-primary/5';

  return (
    <SafeAreaView className="flex-1 bg-background-light dark:bg-background-dark">
      <View className="flex-1">
        {/* Header Section */}
        <View className="py-2 px-4 bg-white/80 dark:bg-slate-900/80 border-b border-slate-100 dark:border-slate-800">
          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-row items-center gap-3">
              <TouchableOpacity>
                <MaterialIcons name="arrow-back" size={24} className="text-slate-900 dark:text-white" />
              </TouchableOpacity>
              <Text className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Browse Circles</Text>
            </View>
            <TouchableOpacity className="text-primary">
              <MaterialIcons name="location-on" size={24} color={primaryColor} />
            </TouchableOpacity>
          </View>

          <View className="mb-3">
            <Text className="text-sm font-medium text-slate-500 dark:text-slate-400">
              Planning Area: <Text className="text-slate-900 dark:text-white font-bold">Singapore Central</Text>
            </Text>
          </View>

          {/* Search Input */}
          <View className="relative mb-3 flex-row items-center bg-slate-100 dark:bg-slate-800 rounded-xl px-3 h-12">
            <MaterialIcons name="search" size={20} color="#94a3b8" />
            <TextInput 
              placeholder="Search public circles..."
              placeholderTextColor="#94a3b8"
              className="flex-1 ml-2 text-sm text-slate-900 dark:text-white h-full"
            />
          </View>

          {/* Filters */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-2 pb-2">
            <TouchableOpacity className={`flex-row items-center ${primaryClass} px-4 h-8 rounded-full`}>
              <Text className="text-white text-xs font-semibold">All Circles</Text>
            </TouchableOpacity>
            <TouchableOpacity className="flex-row items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-4 h-8 rounded-full ml-2">
              <MaterialIcons name="water-drop" size={16} className="text-slate-600 dark:text-slate-300" />
              <Text className="text-slate-600 dark:text-slate-300 text-xs font-semibold">Flood</Text>
            </TouchableOpacity>
            <TouchableOpacity className="flex-row items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-4 h-8 rounded-full ml-2">
              <MaterialIcons name="local-fire-department" size={16} className="text-slate-600 dark:text-slate-300" />
              <Text className="text-slate-600 dark:text-slate-300 text-xs font-semibold">Fire</Text>
            </TouchableOpacity>
            <TouchableOpacity className="flex-row items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-4 h-8 rounded-full ml-2 mr-4">
              <MaterialIcons name="cyclone" size={16} className="text-slate-600 dark:text-slate-300" />
              <Text className="text-slate-600 dark:text-slate-300 text-xs font-semibold">Storm</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        <ScrollView className="flex-1 px-4 py-4" contentContainerStyle={{ paddingBottom: 100 }}>
          {/* Live Environmental Monitor */}
          <EnvironmentalStatus />

          {/* Invite Code Section */}
          <View className={`${isAdmin ? 'bg-admin/10 border-admin/20' : 'bg-primary/10 border-primary/20'} rounded-xl p-4 border mb-6`}>
            <View className="flex-row items-center gap-2 mb-3">
               <MaterialIcons name="key" size={20} color={primaryColor} />
               <Text className={`text-sm font-bold ${primaryTextClass}`}>Have an Invite Code?</Text>
            </View>
            <View className="flex-row gap-2">
              <TextInput 
                placeholder="Enter 6-digit code"
                placeholderTextColor="#94a3b8"
                className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 h-10 text-sm text-slate-900 dark:text-white"
              />
              <TouchableOpacity className={`${primaryClass} h-10 px-4 rounded-lg items-center justify-center`}>
                <Text className="text-white text-sm font-bold">Join Private</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Circles List */}
          <View>
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-base font-bold text-slate-900 dark:text-white">Trending Circles</Text>
              <TouchableOpacity>
                <Text className={`text-xs font-semibold ${primaryTextClass}`}>View All</Text>
              </TouchableOpacity>
            </View>

            {/* Card 1 */}
            <View className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl overflow-hidden mb-4">
              <View className="p-4">
                <View className="flex-row justify-between items-start mb-3">
                  <View>
                    <Text className="font-bold text-lg text-slate-900 dark:text-white mb-1">Singapore Haze Relief</Text>
                    <View className="flex-row gap-1.5">
                      <MaterialIcons name="air" size={16} color={primaryColor} />
                      <MaterialIcons name="masks" size={16} color={primaryColor} />
                    </View>
                  </View>
                  <View className="bg-green-100 dark:bg-green-900/30 px-2 py-0.5 rounded-full">
                    <Text className="text-green-700 dark:text-green-400 text-[10px] font-bold uppercase tracking-wider">Active</Text>
                  </View>
                </View>

                <View className="flex-row justify-between mb-4 gap-2 text-center">
                  <View className="flex-1 bg-slate-50 dark:bg-slate-700/50 p-2 rounded-lg items-center text-center">
                    <Text className="text-[10px] text-slate-500 font-medium uppercase mb-1 text-center">Members</Text>
                    <Text className="text-sm font-bold text-slate-900 dark:text-white text-center">5,240</Text>
                  </View>
                  <View className="flex-1 bg-slate-50 dark:bg-slate-700/50 p-2 rounded-lg items-center justify-center text-center">
                    <Text className="text-[10px] text-slate-500 font-medium uppercase mb-1 text-center">Fund Size</Text>
                    <Text className="text-sm font-bold text-slate-900 dark:text-white text-center">S$125,000</Text>
                  </View>
                  <View className="flex-1 bg-slate-50 dark:bg-slate-700/50 p-2 rounded-lg items-center text-center">
                    <Text className="text-[10px] text-slate-500 font-medium uppercase mb-1 text-center">Monthly</Text>
                    <Text className={`text-sm font-bold ${primaryTextClass} text-center`}>S$10/mo</Text>
                  </View>
                </View>

                <TouchableOpacity className={`w-full ${primaryClass} h-11 items-center justify-center rounded-lg`}>
                  <Text className="text-white font-bold text-sm">Join Circle</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Card 2 */}
            <View className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl overflow-hidden mb-4">
              <View className="p-4">
                <View className="flex-row justify-between items-start mb-3">
                  <View>
                    <Text className="font-bold text-lg text-slate-900 dark:text-white mb-1">Jurong Flood Guard</Text>
                    <View className="flex-row gap-1.5">
                      <MaterialIcons name="water-drop" size={16} color="#f97316" />
                    </View>
                  </View>
                  <View className="bg-blue-100 dark:bg-blue-900/30 px-2 py-0.5 rounded-full">
                    <Text className="text-blue-700 dark:text-blue-400 text-[10px] font-bold uppercase tracking-wider">Verified</Text>
                  </View>
                </View>

                <View className="flex-row justify-between mb-4 gap-2">
                  <View className="flex-1 bg-slate-50 dark:bg-slate-700/50 p-2 rounded-lg items-center">
                    <Text className="text-[10px] text-slate-500 font-medium uppercase mb-1">Members</Text>
                    <Text className="text-sm font-bold text-slate-900 dark:text-white">850</Text>
                  </View>
                  <View className="flex-1 bg-slate-50 dark:bg-slate-700/50 p-2 rounded-lg items-center">
                    <Text className="text-[10px] text-slate-500 font-medium uppercase mb-1">Fund Size</Text>
                    <Text className="text-sm font-bold text-slate-900 dark:text-white">S$22,800</Text>
                  </View>
                  <View className="flex-1 bg-slate-50 dark:bg-slate-700/50 p-2 rounded-lg items-center">
                    <Text className="text-[10px] text-slate-500 font-medium uppercase mb-1">Monthly</Text>
                    <Text className={`text-sm font-bold ${primaryTextClass}`}>S$15/mo</Text>
                  </View>
                </View>

                <TouchableOpacity className={`w-full ${primaryClass} h-11 items-center justify-center rounded-lg`}>
                  <Text className="text-white font-bold text-sm">Join Circle</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
