import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { Wallet } from '@/types/wallet';

interface DeploymentState {
  selectedWallet: Wallet | null;
  selectedLicenses: string[];
  currentStep: number;
  isAddingWallet: boolean;
  error: string | null;
}

const initialState: DeploymentState = {
  selectedWallet: null,
  selectedLicenses: [],
  currentStep: 0,
  isAddingWallet: false,
  error: null,
};

export const deploymentSlice = createSlice({
  name: 'deployment',
  initialState,
  reducers: {
    setSelectedWallet: (state, action: PayloadAction<Wallet | null>) => {
      state.selectedWallet = action.payload;
      if (!action.payload) {
        state.selectedLicenses = [];
        state.currentStep = 0;
      } else if (state.currentStep === 0) {
        state.currentStep = 1;
      }
    },
    setSelectedLicenses: (state, action: PayloadAction<string[]>) => {
      state.selectedLicenses = action.payload;
      if (action.payload.length > 0 && state.currentStep === 1) {
        state.currentStep = 2;
      }
    },
    setCurrentStep: (state, action: PayloadAction<number>) => {
      state.currentStep = action.payload;
    },
    setIsAddingWallet: (state, action: PayloadAction<boolean>) => {
      state.isAddingWallet = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    resetState: (state) => {
      return initialState;
    },
  },
});

export const {
  setSelectedWallet,
  setSelectedLicenses,
  setCurrentStep,
  setIsAddingWallet,
  setError,
  resetState,
} = deploymentSlice.actions;

export const deploymentReducer = deploymentSlice.reducer;