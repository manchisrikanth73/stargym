import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import dayjs from 'dayjs';
import { getLegalContent } from '../services/gymSettings';
import { colors } from '../theme/colors';

export default function LegalViewScreen() {
  const navigation = useNavigation<any>();
  const [content, setContent] = useState('');
  const [publishedAt, setPublishedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    getLegalContent()
      .then(d => { setContent(d.content); setPublishedAt(d.publishedAt); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  React.useEffect(() => { load(); }, [load]);

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.heading}>Legal</Text>
        <View style={{ width: 26 }} />
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 60 }} />
      ) : (
        <ScrollView contentContainerStyle={styles.body}>
          {content.trim() ? (
            <>
              <Text style={styles.content}>{content}</Text>
              {publishedAt && (
                <Text style={styles.publishedAt}>
                  Last updated {dayjs(publishedAt).format('DD MMM YYYY')}
                </Text>
              )}
            </>
          ) : (
            <View style={styles.empty}>
              <Ionicons name="document-text-outline" size={44} color={colors.textDim} />
              <Text style={styles.emptyText}>No legal information published yet.</Text>
            </View>
          )}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 54, paddingBottom: 14,
  },
  heading: { color: colors.text, fontSize: 20, fontWeight: '800' },
  body: { padding: 20 },
  content: { color: colors.text, fontSize: 14, lineHeight: 24 },
  publishedAt: { color: colors.textDim, fontSize: 11, marginTop: 24 },
  empty: { alignItems: 'center', paddingTop: 80, gap: 14 },
  emptyText: { color: colors.textMuted, fontSize: 14 },
});
