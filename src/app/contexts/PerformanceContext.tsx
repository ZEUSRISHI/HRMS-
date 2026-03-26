import { createContext, useContext } from "react";

export type PerformanceMetric = {
  employee: string;
  completed: number;
  pending: number;
};

type PerformanceContextType = {
  metrics: PerformanceMetric[];
};

const PerformanceContext = createContext<PerformanceContextType>({
  metrics: [],
});

export function PerformanceProvider({ children }: any) {
  const metrics = [
    { employee: "John", completed: 12, pending: 3 },
    { employee: "Sara", completed: 9, pending: 5 },
    { employee: "David", completed: 15, pending: 1 },
  ];

  return (
    <PerformanceContext.Provider value={{ metrics }}>
      {children}
    </PerformanceContext.Provider>
  );
}

export const usePerformance = () => useContext(PerformanceContext);
