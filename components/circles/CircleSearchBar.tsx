import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SearchBar } from '@/components/ui/SearchBar';

type Props = {
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
};

export function CircleSearchBar({ value, onChangeText, placeholder }: Props) {
  return (
    <View style={styles.wrap}>
      <SearchBar
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder ?? 'Search circles, circle posts, topics, keywords…'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 16, paddingBottom: 12 },
});
