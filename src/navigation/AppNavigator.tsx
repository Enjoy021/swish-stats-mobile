import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';

import HomeScreen from '../screens/HomeScreen';
import TeamsScreen from '../screens/TeamsScreen';
import TeamDetailScreen from '../screens/TeamDetailScreen';
import GamesScreen from '../screens/GamesScreen';
import GameSetupScreen from '../screens/GameSetupScreen';
import LiveScoringScreen from '../screens/LiveScoringScreen';
import BoxScoreScreen from '../screens/BoxScoreScreen';
import ShotChartScreen from '../screens/ShotChartScreen';
import PlayerProfileScreen from '../screens/PlayerProfileScreen';
import GameReviewScreen from '../screens/GameReviewScreen';

export type RootStackParamList = {
  MainTabs: undefined;
  TeamDetail: { teamId: string };
  GameSetup: undefined;
  LiveScoring: { gameId: string };
  BoxScore: { gameId: string };
  ShotChart: { gameId: string };
  PlayerProfile: { playerId: string };
  GameReview: { gameId: string };
};

export type TabParamList = {
  Home: undefined;
  Teams: undefined;
  Games: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: Colors.accentOrange,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarStyle: {
          backgroundColor: Colors.white,
          borderTopColor: Colors.border,
        },
        headerStyle: {
          backgroundColor: Colors.primaryNavy,
        },
        headerTintColor: Colors.white,
        headerTitleStyle: { fontWeight: 'bold' },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
          headerTitle: 'Swish Stats',
        }}
      />
      <Tab.Screen
        name="Teams"
        component={TeamsScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Games"
        component={GamesScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="trophy" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: Colors.primaryNavy },
          headerTintColor: Colors.white,
          headerTitleStyle: { fontWeight: 'bold' },
        }}
      >
        <Stack.Screen
          name="MainTabs"
          component={TabNavigator}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="TeamDetail"
          component={TeamDetailScreen}
          options={{ title: 'Team' }}
        />
        <Stack.Screen
          name="GameSetup"
          component={GameSetupScreen}
          options={{ title: 'New Game' }}
        />
        <Stack.Screen
          name="LiveScoring"
          component={LiveScoringScreen}
          options={{
            headerShown: false,
            gestureEnabled: false,
          }}
        />
        <Stack.Screen
          name="BoxScore"
          component={BoxScoreScreen}
          options={{ title: 'Box Score' }}
        />
        <Stack.Screen
          name="ShotChart"
          component={ShotChartScreen}
          options={{ title: 'Shot Chart' }}
        />
        <Stack.Screen
          name="PlayerProfile"
          component={PlayerProfileScreen}
          options={{ title: 'Player Profile' }}
        />
        <Stack.Screen
          name="GameReview"
          component={GameReviewScreen}
          options={{ title: 'Game Review' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
