import { Stack } from 'expo-router';
import { useEffect } from 'react';
import 'react-native-reanimated';
import '../global.css';
import { AuthProvider } from '../services/AuthService';
import { dataIngestionService } from '../../backend/services/DataIngestionService';

export default function RootLayout() {
  useEffect(() => {
    // Start polling Singapore environmental APIs
    dataIngestionService.start();
    return () => dataIngestionService.stop();
  }, []);

  return (
    <AuthProvider>
      <Stack initialRouteName="login">
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </AuthProvider>
  );
}
