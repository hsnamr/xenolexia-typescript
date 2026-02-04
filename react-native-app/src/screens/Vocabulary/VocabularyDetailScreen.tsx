/**
 * Vocabulary Detail Screen - Full-screen word detail using WordDetailModal
 */

import React, {useCallback} from 'react';
import {View, StyleSheet} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation, useRoute} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {RouteProp} from '@react-navigation/native';

import {useColors} from '@/theme';
import {Text, Button} from '@components/ui';
import {WordDetailModal} from '@components/vocabulary/WordDetailModal';
import {useVocabularyStore} from '@stores/vocabularyStore';
import type {RootStackParamList} from '@/types';

type VocabularyDetailRouteProp = RouteProp<RootStackParamList, 'VocabularyDetail'>;
type VocabularyDetailNavigationProp = NativeStackNavigationProp<RootStackParamList>;

export function VocabularyDetailScreen(): React.JSX.Element {
  const colors = useColors();
  const navigation = useNavigation<VocabularyDetailNavigationProp>();
  const route = useRoute<VocabularyDetailRouteProp>();
  const {wordId} = route.params;

  const word = useVocabularyStore(state => state.getWord(wordId));

  const handleClose = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleNavigateToBook = useCallback(
    (bookId: string) => {
      navigation.navigate('Reader', {bookId});
    },
    [navigation]
  );

  const handleStartReview = useCallback(() => {
    navigation.navigate('VocabularyQuiz', {});
  }, [navigation]);

  if (!word) {
    return (
      <SafeAreaView style={[styles.container, {backgroundColor: colors.background}]}>
        <View style={styles.errorContainer}>
          <Text variant="headlineSmall">Word not found</Text>
          <Button variant="primary" onPress={handleClose}>
            Go Back
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={[styles.container, {backgroundColor: colors.background}]}>
      <WordDetailModal
        visible
        word={word}
        onClose={handleClose}
        onNavigateToBook={handleNavigateToBook}
        onStartReview={handleStartReview}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  errorContainer: {
    alignItems: 'center',
    flex: 1,
    gap: 16,
    justifyContent: 'center',
    padding: 24,
  },
});
