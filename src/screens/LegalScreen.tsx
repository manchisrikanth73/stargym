import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, TextInput, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, DrawerActions, useFocusEffect } from '@react-navigation/native';
import dayjs from 'dayjs';
import { getLegalContent, publishLegalContent } from '../services/gymSettings';
import { colors } from '../theme/colors';

export default function LegalScreen() {
  const navigation = useNavigation<any>();
  const [content, setContent] = useState('');
  const [publishedAt, setPublishedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      getLegalContent()
        .then(d => { setContent(d.content); setPublishedAt(d.publishedAt); })
        .catch(() => {})
        .finally(() => setLoading(false));
    }, [])
  );

  const handlePublish = async () => {
    if (!content.trim()) {
      if (typeof window !== 'undefined') (window as any).alert('Legal content cannot be empty.');
      return;
    }
    setSaving(true);
    try {
      await publishLegalContent(content.trim());
      const now = new Date().toISOString();
      setPublishedAt(now);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      if (typeof window !== 'undefined') (window as any).alert(err.message ?? 'Failed to publish.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.dispatch(DrawerActions.openDrawer())}>
          <Ionicons name="menu" size={28} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.heading}>Legal</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Dashboard' as never)}>
          <Ionicons name="home-outline" size={22} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 60 }} />
      ) : (
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <Text style={styles.sectionTitle}>Legal Notes</Text>
          <Text style={styles.hint}>
            Write your terms of service, privacy policy, or any legal information. Tap Publish to make it visible to all members.
          </Text>

          <TextInput
            style={styles.editor}
            value={content}
            onChangeText={setContent}
            multiline
            textAlignVertical="top"
            placeholder="Enter legal content here..."
            placeholderTextColor={colors.textDim}
          />

          {publishedAt && (
            <Text style={styles.publishedAt}>
              Last published {dayjs(publishedAt).format('DD MMM YYYY, h:mm A')}
            </Text>
          )}

          {saved && (
            <View style={styles.successRow}>
              <Ionicons name="checkmark-circle-outline" size={16} color={colors.success} />
              <Text style={styles.successText}>Published successfully. Members can now view it.</Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.publishBtn, saving && { opacity: 0.5 }]}
            onPress={handlePublish}
            disabled={saving}
          >
            {saving
              ? <ActivityIndicator color="#000" size="small" />
              : <>
                  <Ionicons name="cloud-upload-outline" size={18} color="#000" />
                  <Text style={styles.publishBtnText}>Publish</Text>
                </>
            }
          </TouchableOpacity>

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
  body: { padding: 16 },
  sectionTitle: {
    color: colors.textDim, fontSize: 11, fontWeight: '700',
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8,
  },
  hint: { color: colors.textMuted, fontSize: 13, lineHeight: 20, marginBottom: 16 },
  editor: {
    backgroundColor: colors.surface, borderRadius: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    color: colors.text, fontSize: 14, lineHeight: 22,
    padding: 16, minHeight: 300, marginBottom: 12,
  },
  publishedAt: { color: colors.textDim, fontSize: 11, marginBottom: 12 },
  successRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: `${colors.success}18`,
    borderWidth: 1, borderColor: `${colors.success}33`,
    borderRadius: 10, padding: 10, marginBottom: 12,
  },
  successText: { color: colors.success, fontSize: 13, flex: 1 },
  publishBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, height: 50, backgroundColor: colors.primary, borderRadius: 14,
  },
  publishBtnText: { color: '#000', fontSize: 16, fontWeight: '700' },
});
