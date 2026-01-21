import React, { createContext, useContext, useRef } from 'react';

const DrawerContext = createContext(null);

export const DrawerProvider = ({ children, drawerRef }) => {
  return (
    <DrawerContext.Provider value={drawerRef}>
      {children}
    </DrawerContext.Provider>
  );
};

export const useDrawer = () => {
  const drawerRef = useContext(DrawerContext);
  return {
    openDrawer: () => drawerRef?.current?.openDrawer(),
    closeDrawer: () => drawerRef?.current?.closeDrawer(),
    toggleDrawer: () => drawerRef?.current?.toggleDrawer(),
  };
};









