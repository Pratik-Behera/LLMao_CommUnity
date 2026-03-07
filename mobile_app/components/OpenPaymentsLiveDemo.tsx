import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Shield, ArrowRight, CheckCircle, Smartphone, Landmark, Zap, RefreshCw } from 'lucide-react-native';
import { mockPaymentEngine, PaymentFlowProgress } from '../services/PaymentEngine';

const WalletMock = ({ 
  label, 
  balance, 
  owner, 
  isActive, 
  state, 
  isSender 
}: { 
  label: string, 
  balance: number, 
  owner: string, 
  isActive: boolean, 
  state: string,
  isSender: boolean
}) => {
  return (
    <View style={[styles.wallet, isActive && styles.walletActive]}>
      <View style={styles.walletHeader}>
        <View style={isSender ? styles.senderIcon : styles.receiverIcon}>
          {isSender ? <Smartphone size={16} color="white" /> : <Landmark size={16} color="white" />}
        </View>
        <View>
          <Text style={styles.walletLabel}>{label}</Text>
          <Text style={styles.walletOwner}>{owner}</Text>
        </View>
      </View>

      <Text style={styles.balanceLabel}>Current Balance</Text>
      <Text style={styles.balanceValue}>S${balance.toFixed(2)}</Text>

      <View style={styles.walletStatus}>
        {isActive ? (
          <View style={styles.activeIndicator}>
            <ActivityIndicator size="small" color="#6366f1" style={{ marginRight: 8 }} />
            <Text style={styles.statusText}>{state}</Text>
          </View>
        ) : (
          <Text style={styles.idleText}>Idle</Text>
        )}
      </View>
    </View>
  );
};

export default function OpenPaymentsLiveDemo({ amount }: { amount: string }) {
  const [senderBalance, setSenderBalance] = useState(1240.50);
  const [receiverBalance, setReceiverBalance] = useState(45000.00);
  const [progress, setProgress] = useState<PaymentFlowProgress | null>(null);
  const [isLive, setIsLive] = useState(false);

  const startDemo = async () => {
    if (isLive) return;
    setIsLive(true);
    const flow = mockPaymentEngine.startPaymentFlow(amount, '$ilp.rafiki.money/brooklyn-heights');
    
    for await (const p of flow) {
      setProgress(p);
      if (p.state === 'EXECUTING') {
        // Real-time deduction simulation
        const amtNumeric = parseFloat(amount);
        const steps = 10;
        for(let i=1; i<=steps; i++) {
            setSenderBalance(prev => prev - (amtNumeric/steps));
            setReceiverBalance(prev => prev + (amtNumeric/steps));
            await new Promise(r => setTimeout(r, 100));
        }
      }
    }
    
    setTimeout(() => {
        setIsLive(false);
        setProgress(null);
    }, 4000);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Zap size={18} color="#6366f1" fill="#6366f1" />
          <Text style={styles.title}>LIVE OPEN PAYMENTS SYNC</Text>
        </View>
        <Text style={styles.subtitle}>Peer-to-Peer Interledger Settlemet</Text>
      </View>

      <View style={styles.demoArea}>
        <View style={styles.sideBySide}>
          <WalletMock 
            label="SENDER WALLET"
            owner="Alpha Client"
            balance={senderBalance}
            isActive={isLive && (progress?.state === 'RESOLVING' || progress?.state === 'GRANNING_ACCESS' || progress?.state === 'WAITING_CONSENT' || progress?.state === 'EXECUTING')}
            state={progress?.state || ''}
            isSender={true}
          />
          
          <View style={styles.connector}>
            <ArrowRight size={20} color={isLive ? "#6366f1" : "#94a3b8"} />
          </View>

          <WalletMock 
            label="RECEIVER WALLET"
            owner="CommUnity Fund"
            balance={receiverBalance}
            isActive={isLive && (progress?.state === 'QUOTING' || progress?.state === 'EXECUTING' || progress?.state === 'COMPLETED')}
            state={progress?.state || ''}
            isSender={false}
          />
        </View>

        {progress?.state === 'COMPLETED' && (
           <View style={styles.successBadge}>
              <CheckCircle size={14} color="#10b981" />
              <Text style={styles.successText}>ILP Settlement Finalized: {progress.transactionId}</Text>
           </View>
        )}
      </View>

      <TouchableOpacity 
        style={[styles.demoButton, isLive && styles.demoButtonDisabled]} 
        onPress={startDemo}
        disabled={isLive}
      >
        <RefreshCw size={16} color="white" style={{ marginRight: 8 }} />
        <Text style={styles.demoButtonText}>
            {isLive ? 'SYSTEM SETTLING...' : 'INITIATE LIVE FLOW'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0f172a',
    borderRadius: 24,
    padding: 20,
    marginTop: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  header: {
    marginBottom: 20,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  title: {
    color: '#6366f1',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  subtitle: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
  },
  demoArea: {
    paddingVertical: 10,
  },
  sideBySide: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  wallet: {
    flex: 1,
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  walletActive: {
    borderColor: '#6366f1',
    backgroundColor: 'rgba(99, 102, 241, 0.05)',
  },
  walletHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  senderIcon: {
    padding: 4,
    backgroundColor: '#3b82f6',
    borderRadius: 6,
  },
  receiverIcon: {
    padding: 4,
    backgroundColor: '#8b5cf6',
    borderRadius: 6,
  },
  walletLabel: {
    color: '#64748b',
    fontSize: 7,
    fontWeight: 'bold',
  },
  walletOwner: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  balanceLabel: {
    color: '#94a3b8',
    fontSize: 8,
    marginBottom: 2,
  },
  balanceValue: {
    color: 'white',
    fontSize: 14,
    fontWeight: '900',
    marginBottom: 12,
  },
  walletStatus: {
    height: 20,
    justifyContent: 'center',
  },
  activeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    color: '#6366f1',
    fontSize: 8,
    fontWeight: '900',
  },
  idleText: {
    color: '#475569',
    fontSize: 8,
  },
  connector: {
    paddingHorizontal: 10,
  },
  successBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    marginTop: 12,
    gap: 6,
  },
  successText: {
    color: '#10b981',
    fontSize: 8,
    fontWeight: 'bold',
  },
  demoButton: {
    backgroundColor: '#6366f1',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 12,
    marginTop: 16,
  },
  demoButtonDisabled: {
    backgroundColor: '#334155',
  },
  demoButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  }
});
