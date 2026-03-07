import React from 'react';
import { View, Text, TouchableOpacity, TextInput, SafeAreaView, ImageBackground, KeyboardAvoidingView, Platform, Dimensions } from 'react-native';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

export default function LoginScreen() {
  const router = useRouter();
  const { height } = Dimensions.get('window');

  return (
    <View className="flex-1 bg-slate-900">
      <ImageBackground 
        source={{ uri: 'https://images.unsplash.com/photo-1557683316-973673baf926?q=80&w=2000' }}
        className="flex-1"
        style={{ height: height * 0.4 }}
      >
        <LinearGradient
          colors={['transparent', '#0f172a']}
          className="flex-1 justify-end p-8"
        >
          <View className="items-center mb-8">
            <View className="h-20 w-20 bg-primary rounded-3xl items-center justify-center shadow-2xl shadow-primary/50 rotate-12">
              <MaterialIcons name="volunteer-activism" size={40} color="white" />
            </View>
            <Text className="text-4xl font-black text-white mt-6 tracking-tighter">CommUnity</Text>
            <Text className="text-slate-400 font-medium tracking-wide">Programmable Trust. Real-time Impact.</Text>
          </View>
        </LinearGradient>
      </ImageBackground>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1 bg-slate-900 px-8 pt-4"
      >
        <Text className="text-white text-2xl font-bold mb-2">Welcome Back</Text>
        <Text className="text-slate-400 mb-8">Sign in to manage your community fund</Text>

        {/* Input Fields */}
        <View className="gap-4">
          <View className="flex-row items-center bg-slate-800/50 border border-slate-700/50 rounded-2xl px-4 h-15">
            <MaterialIcons name="phone" size={20} color="#94a3b8" className="mr-3" />
            <TextInput 
              placeholder="Phone Number"
              placeholderTextColor="#64748b"
              keyboardType="phone-pad"
              className="flex-1 text-white font-medium h-12"
            />
          </View>

          <TouchableOpacity 
            onPress={() => router.replace('/(tabs)')}
            className="bg-primary h-15 rounded-2xl items-center justify-center shadow-lg shadow-primary/30 mt-2"
            style={{ height: 60 }}
          >
            <Text className="text-white font-bold text-lg">Send Verification Code</Text>
          </TouchableOpacity>
        </View>

        {/* Divider */}
        <View className="flex-row items-center my-8">
          <View className="flex-1 h-[1px] bg-slate-800" />
          <Text className="mx-4 text-slate-500 font-bold text-xs uppercase letter-spacing-1">OR</Text>
          <View className="flex-1 h-[1px] bg-slate-800" />
        </View>

        {/* Social Logins */}
        <View className="flex-row gap-4">
          <TouchableOpacity className="flex-1 flex-row items-center justify-center bg-white h-14 rounded-2xl gap-3">
            <FontAwesome5 name="google" size={18} color="#ea4335" />
            <Text className="font-bold text-slate-900">Google</Text>
          </TouchableOpacity>
        </View>

        <View className="mt-auto mb-10 items-center">
            <Text className="text-slate-500 text-sm">
                Don't have an account? <Text className="text-primary font-bold">Join Community</Text>
            </Text>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
