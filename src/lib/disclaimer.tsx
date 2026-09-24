import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

/** Bump when the safety wording changes so every user re-acknowledges it. */
export const DISCLAIMER_VERSION = '1';
const ACCEPTED_KEY = 'disclaimer:acceptedVersion';

interface DisclaimerState {
  /** null while the stored value is loading. */
  accepted: boolean | null;
  accept: () => Promise<void>;
}

const DisclaimerContext = createContext<DisclaimerState>({
  accepted: null,
  accept: async () => {},
});

export function DisclaimerProvider({ children }: { children: ReactNode }) {
  const [accepted, setAccepted] = useState<boolean | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(ACCEPTED_KEY)
      .then((value) => setAccepted(value === DISCLAIMER_VERSION))
      .catch(() => setAccepted(false));
  }, []);

  const accept = useCallback(async () => {
    await AsyncStorage.setItem(ACCEPTED_KEY, DISCLAIMER_VERSION);
    setAccepted(true);
  }, []);

  return <DisclaimerContext.Provider value={{ accepted, accept }}>{children}</DisclaimerContext.Provider>;
}

export function useDisclaimer(): DisclaimerState {
  return useContext(DisclaimerContext);
}
