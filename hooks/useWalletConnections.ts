// hooks/useWalletConnection.ts
import { useState, useEffect } from 'react';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { toast } from '@/hooks/use-toast';

export function useWalletConnection() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const [lastConnectedWallet, setLastConnectedWallet] = useState<string | null>(null);

  useEffect(() => {
    // Set last connected wallet when address changes and is connected
    if (address && isConnected) {
      setLastConnectedWallet(address);
    }
  }, [address, isConnected]);

  const connectToWallet = async (walletAddress: string) => {
    try {
      // Find the first available connector (usually MetaMask)
      const connector = connectors[0];
      
      if (!connector) {
        toast({
          title: "Error",
          description: "No wallet connector available. Please install MetaMask or another wallet.",
          variant: "destructive",
        });
        return false;
      }

      // Connect to wallet
      await connect({ connector });
      
      // Check if the connected address matches the expected address
      if (address?.toLowerCase() === walletAddress.toLowerCase()) {
        setLastConnectedWallet(walletAddress);
        return true;
      }
      
      // If addresses don't match, try to switch accounts
      toast({
        title: "Switching Account",
        description: "Please switch to the correct wallet account",
        variant: "default",
      });
      
      // Note: Account switching is typically handled by the wallet UI
      // We can't programmatically switch to a specific address for security reasons
      return false;
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to connect to wallet",
        variant: "destructive",
      });
      return false;
    }
  };

  const disconnectWallet = () => {
    disconnect();
    setLastConnectedWallet(null);
  };

  return {
    lastConnectedWallet,
    connectToWallet,
    disconnectWallet,
    isConnected: isConnected && !!lastConnectedWallet,
    address
  };
}