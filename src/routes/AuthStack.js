import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import Signup from "../screens/Signup";
import Login from "../screens/Login";
import ForgotPassword from "../screens/ForgotPassword";
import ResetPassword from "../screens/ResetPassword";
import CategoryListeners from "../screens/CategoryListeners";
import ChatScreen from "../screens/ChatScreen";
import ListenerTabNavigator from "./ListenerTabNavigator";
import SeekerTabNavigator from "./SeekerTabNavigator";

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
      <Stack.Screen name="ForgotPassword" component={ForgotPassword} />
      <Stack.Screen name="ResetPassword" component={ResetPassword} />
      <Stack.Screen
        name="ListenerTabNavigator"
        component={ListenerTabNavigator}
        options={{ gestureEnabled: false }}
      />
      <Stack.Screen
        name="SeekerTabNavigator"
        component={SeekerTabNavigator}
        options={{ gestureEnabled: false }}
      />
      <Stack.Screen
        name="CategoryListeners"
        component={CategoryListeners}
      />
      <Stack.Screen
        name="ChatScreen"
        component={ChatScreen}
      />
    </Stack.Navigator>
  );
};