import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getTrainers, getTrainerForMember, assignMember, unassignMember, TrainerProfile } from '../services/trainers';
import { notify } from '../utils/notify';
import { colors } from '../theme/colors';

interface Props {
  uid: string;
}

export default function TrainerSection({ uid }: Props) {
  const [trainers, setTrainers] = useState<TrainerProfile[]>([]);
  const [assigned, setAssigned] = useState<TrainerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [selectedUid, setSelectedUid] = useState('');

  useEffect(() => {
    Promise.all([getTrainers(), getTrainerForMember(uid)])
      .then(([all, current]) => {
        setTrainers(all);
        setAssigned(current);
        if (!current && all.length > 0) setSelectedUid(all[0].uid);
      })
      .catch(err => notify('Error', err.message ?? 'Failed to load trainers.'))
      .finally(() => setLoading(false));
  }, [uid]);

  const handleAssign = async () => {
    if (!selectedUid) return;
    setSaving(true);
    try {
      if (assigned) await unassignMember(assigned.uid, uid);
      await assignMember(selectedUid, uid);
      const updated = trainers.find(t => t.uid === selectedUid) ?? null;
      setAssigned(updated);
      setDropdownOpen(false);
    } catch (err: any) {
      notify('Error', err.message ?? 'Failed to assign trainer.');
    } finally {
      setSaving(false);
    }
  };

  const handleUnassign = async () => {
    if (!assigned) return;
    setSaving(true);
    try {
      await unassignMember(assigned.uid, uid);
      setAssigned(null);
      if (trainers.length > 0) setSelectedUid(trainers[0].uid);
    } catch (err: any) {
      notify('Error', err.message ?? 'Failed to unassign trainer.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <ActivityIndicator color={colors.primary} style={{ marginVertical: 8 }} />;
  }

  if (trainers.length === 0) {
    return <Text style={styles.empty}>No trainers available. Add a trainer first.</Text>;
  }

  const selectedTrainer = trainers.find(t => t.uid === selectedUid);

  return (
    <View>
      {assigned ? (
        <View style={styles.assignedRow}>
          <View style={styles.avatarSmall}>
            <Text style={styles.avatarSmallText}>
              {assigned.displayName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.trainerName}>{assigned.displayName}</Text>
            <Text style={styles.trainerEmail}>{assigned.email}</Text>
          </View>
          <TouchableOpacity style={styles.unassignBtn} onPress={handleUnassign} disabled={saving}>
            {saving
              ? <ActivityIndicator size="small" color={colors.error} />
              : <>
                  <Ionicons name="person-remove-outline" size={14} color={colors.error} />
                  <Text style={styles.unassignText}>Remove</Text>
                </>
            }
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.selectRow}>
          <View style={styles.dropdownWrap}>
            <TouchableOpacity
              style={styles.dropdown}
              onPress={() => setDropdownOpen(o => !o)}
              activeOpacity={0.8}
            >
              <Text style={styles.dropdownText} numberOfLines={1}>
                {selectedTrainer?.displayName ?? 'Select trainer'}
              </Text>
              <Ionicons name={dropdownOpen ? 'chevron-up' : 'chevron-down'} size={13} color={colors.textMuted} />
            </TouchableOpacity>
            {dropdownOpen && (
              <View style={styles.dropdownMenu}>
                {trainers.map(t => (
                  <TouchableOpacity
                    key={t.uid}
                    style={styles.dropdownItem}
                    onPress={() => { setSelectedUid(t.uid); setDropdownOpen(false); }}
                  >
                    <Text style={[styles.dropdownItemText, selectedUid === t.uid && { color: colors.primary }]}>
                      {t.displayName}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
          <TouchableOpacity style={styles.assignBtn} onPress={handleAssign} disabled={saving || !selectedUid}>
            {saving
              ? <ActivityIndicator size="small" color="#000" />
              : <>
                  <Ionicons name="person-add-outline" size={14} color="#000" />
                  <Text style={styles.assignText}>Assign</Text>
                </>
            }
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { color: colors.textMuted, fontSize: 13 },
  assignedRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatarSmall: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: `${colors.primary}22`,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarSmallText: { color: colors.primary, fontSize: 13, fontWeight: '800' },
  trainerName: { color: colors.text, fontSize: 14, fontWeight: '700' },
  trainerEmail: { color: colors.textMuted, fontSize: 12, marginTop: 1 },
  unassignBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderWidth: 1, borderColor: `${colors.error}44`,
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6,
  },
  unassignText: { color: colors.error, fontSize: 12, fontWeight: '700' },
  selectRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dropdownWrap: { flex: 1, position: 'relative' as any, zIndex: 10 },
  dropdown: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    height: 42, borderRadius: 10, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.bg, paddingHorizontal: 12,
  },
  dropdownText: { color: colors.text, fontSize: 13, fontWeight: '600', flex: 1, marginRight: 8 },
  dropdownMenu: {
    position: 'absolute' as any, top: 44, left: 0, right: 0,
    backgroundColor: colors.surface, borderRadius: 10,
    borderWidth: 1, borderColor: colors.border,
    shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  dropdownItem: { paddingHorizontal: 14, paddingVertical: 12 },
  dropdownItemText: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  assignBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 5, height: 42, borderRadius: 10, paddingHorizontal: 14,
    backgroundColor: colors.secondary,
  },
  assignText: { color: '#000', fontSize: 13, fontWeight: '800' },
});
