import { createContext, useContext, useState } from "react";

interface MobileNavContextType {
  hideHamburger: boolean;
  setHideHamburger: (v: boolean) => void;
}

const MobileNavContext = createContext<MobileNavContextType>({
  hideHamburger: false,
  setHideHamburger: () => {},
});

export function MobileNavProvider({ children }: { children: React.ReactNode }) {
  const [hideHamburger, setHideHamburger] = useState(false);
  return (
    <MobileNavContext.Provider value={{ hideHamburger, setHideHamburger }}>
      {children}
    </MobileNavContext.Provider>
  );
}

export const useMobileNav = () => useContext(MobileNavContext);
