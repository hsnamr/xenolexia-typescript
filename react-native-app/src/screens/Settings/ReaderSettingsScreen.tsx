/**
 * Reader Settings Screen - Standalone reader settings (from Settings/Profile)
 */

import React, {useCallback} from 'react';
import {View, StyleSheet} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';

import {ReaderSettingsModal} from '@components/reader/ReaderSettingsModal';
import type {RootStackParamList} from '@/types';

type ReaderSettingsNavigationProp = NativeStackNavigationProp<RootStackParamList>;

export function ReaderSettingsScreen(): React.JSX.Element {
  const navigation = useNavigation<ReaderSettingsNavigationProp>();

  const handleClose = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  return (
    <View style={styles.container}>
      <ReaderSettingsModal visible onClose={handleClose} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
