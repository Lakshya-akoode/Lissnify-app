import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import Signup from "../screens/Signup";
import Login from "../screens/Login";
import DrawerNavigator from "./DrawerNavigator";
import SeekerDrawerNavigator from "./SeekerDrawerNavigator";

const Stack = createNativeStackNavigator();

export const AuthStack = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        gestureEnabled: false,
      }}
      initialRouteName="Login"
    >
      <Stack.Screen name="Signup" component={Signup} />
      <Stack.Screen name="Login" component={Login} />
      <Stack.Screen 
        name="DrawerNavigator" 
        component={DrawerNavigator}
        options={{ gestureEnabled: false }}
      />
      <Stack.Screen 
        name="SeekerDrawerNavigator" 
        component={SeekerDrawerNavigator}
        options={{ gestureEnabled: false }}
      />
    </Stack.Navigator>
  );
};