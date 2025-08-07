// types.d.ts
declare global {
    interface Window {
      ethereum?: {
        on: (event: string, callback: (...args: any[]) => void) => void;
        removeListener: (event: string, callback: (...args: any[]) => void) => void;
        request: (args: { method: string; params?: any[] }) => Promise<any>;
        isMetaMask?: boolean;
      };
    }
  }
  
  export {};