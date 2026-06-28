import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, TextInput, Modal, FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, DrawerActions, useFocusEffect } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { TrainerProfile, getTrainers, createTrainer, deleteTrainer, getTrainerMembers } from '../services/trainers';
import { UserProfile } from '../services/users';

const MEMBERSHIP_COLOR: Record<string, string> = {
  basic: colors.textMuted,
  premium: colors.secondary,
  vip: colors.primary,
};

export default function TrainersScreen() {
  const navigation = useNavigation<any>();
  const [trainers, setTrainers] = useState<TrainerProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [addModal, setAddModal] = useState(false);
  const [detailTrainer, setDetailTrainer] = useState<TrainerProfile | null>(null);
  const [detailMembers, setDetailMembers] = useState<UserProfile[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setTrainers(await getTrainers());
    } catch (err: any) {
      (window as any).alert('Failed to load trainers: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(load);

  const openDetail = async (trainer: TrainerProfile) => {
    setDetailTrainer(trainer);
    setDetailMembers([]);
    if ((trainer.assignedMemberUids?.length ?? 0) === 0) return;
    setDetailLoading(true);
    try {
      setDetailMembers(await getTrainerMembers(trainer.uid));
    } catch {
      setDetailMembers([]);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!name.trim() || !email.trim() || !password.trim()) {
      (window as any).alert('Name, email, and password are required.');
      return;
    }
    setSaving(true);
    try {
      await createTrainer({ displayName: name.trim(), email: email.trim(), password, phone: phone.trim() });
      setAddModal(false);
      setName(''); setEmail(''); setPhone(''); setPassword('');
      await load();
    } catch (err: any) {
      (window as any).alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (trainer: TrainerProfile) => {
    if ((trainer.assignedMemberUids?.length ?? 0) > 0) {
      (window as any).alert(
        `Cannot delete ${trainer.displayName}.\n\nThis trainer has ${trainer.assignedMemberUids.length} assigned member${trainer.assignedMemberUids.length !== 1 ? 's' : ''}. Remove all member assignments first.`
      );
      return;
    }
    if (!(window as any).confirm(`Delete trainer ${trainer.displayName}? This cannot be undone.`)) return;
    try {
      await deleteTrainer(trainer.uid);
      setTrainers(prev => prev.filter(t => t.uid !== trainer.uid));
    } catch (err: any) {
      (window as any).alert(err.message);
    }
  };

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.dispatch(DrawerActions.openDrawer())}>
          <Ionicons name="menu" size={28} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.heading}>Trainers</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Dashboard' as never)}>
          <Ionicons name="home-outline" size={22} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.addBtn} onPress={() => setAddModal(true)}>
        <Ionicons name="add" size={18} color="#000" />
        <Text style={styles.addBtnText}>Add Trainer</Text>
      </TouchableOpacity>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 60 }} />
      ) : trainers.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="barbell-outline" size={52} color={colors.textDim} />
          <Text style={styles.emptyText}>No trainers yet</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {trainers.map(trainer => {
            const assignedCount = trainer.assignedMemberUids?.length ?? 0;
            return (
              <TouchableOpacity key={trainer.uid} style={styles.card} onPress={() => openDetail(trainer)} activeOpacity={0.8}>
                <View style={styles.cardTop}>
                  <View style={styles.avatarWrap}>
                    <Text style={styles.avatarText}>
                      {trainer.displayName?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || 'T'}
                    </Text>
                  </View>
                  <View style={styles.cardInfo}>
                    <Text style={styles.cardName}>{trainer.displayName}</Text>
                    <Text style={styles.cardEmail}>{trainer.email}</Text>
                    {trainer.memberId && <Text style={styles.cardMemberId}>{trainer.memberId}</Text>}
                    {trainer.phone ? <Text style={styles.cardPhone}>{trainer.phone}</Text> : null}
                    <Text style={styles.cardAssigned}>
                      {assignedCount} member{assignedCount !== 1 ? 's' : ''} assigned
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={e => { e.stopPropagation?.(); handleDelete(trainer); }}
                    style={[styles.deleteBtn, assignedCount > 0 && styles.deleteBtnDisabled]}
                  >
                    <Ionicons name="trash-outline" size={18} color={assignedCount > 0 ? colors.textDim : colors.error} />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            );
          })}
          <View style={{ height: 32 }} />
        </ScrollView>
      )}

      {/* Add Trainer Modal */}
      <Modal visible={addModal} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Add Trainer</Text>
            <TextInput style={styles.input} placeholder="Full name" placeholderTextColor={colors.textDim}
              value={name} onChangeText={setName} />
            <TextInput style={styles.input} placeholder="Email" placeholderTextColor={colors.textDim}
              value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
            <TextInput style={styles.input} placeholder="Phone (optional)" placeholderTextColor={colors.textDim}
              value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
            <TextInput style={styles.input} placeholder="Password" placeholderTextColor={colors.textDim}
              value={password} onChangeText={setPassword} secureTextEntry />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => { setAddModal(false); setName(''); setEmail(''); setPhone(''); setPassword(''); }}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleCreate} disabled={saving}>
                {saving ? <ActivityIndicator color="#000" size="small" /> : <Text style={styles.saveBtnText}>Create</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Trainer Detail Modal */}
      <Modal visible={!!detailTrainer} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={styles.detailBox}>
            {detailTrainer && (
              <>
                <View style={styles.detailHeader}>
                  <View style={styles.detailAvatar}>
                    <Text style={styles.detailAvatarText}>
                      {detailTrainer.displayName?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || 'T'}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.detailName}>{detailTrainer.displayName}</Text>
                    <Text style={styles.detailEmail}>{detailTrainer.email}</Text>
                    {detailTrainer.phone ? <Text style={styles.detailMeta}>{detailTrainer.phone}</Text> : null}
                    {detailTrainer.memberId ? <Text style={styles.detailMeta}>{detailTrainer.memberId}</Text> : null}
                  </View>
                  <TouchableOpacity onPress={() => setDetailTrainer(null)} style={{ padding: 4 }}>
                    <Ionicons name="close" size={22} color={colors.textMuted} />
                  </TouchableOpacity>
                </View>

                <View style={styles.divider} />

                <Text style={styles.detailSectionLabel}>
                  Assigned Members ({detailTrainer.assignedMemberUids?.length ?? 0})
                </Text>

                {detailLoading ? (
                  <ActivityIndicator color={colors.primary} style={{ marginVertical: 24 }} />
                ) : detailMembers.length === 0 ? (
                  <View style={styles.detailEmpty}>
                    <Ionicons name="people-outline" size={32} color={colors.textDim} />
                    <Text style={styles.detailEmptyText}>No members assigned</Text>
                  </View>
                ) : (
                  <FlatList
                    data={detailMembers}
                    keyExtractor={m => m.uid}
                    style={styles.memberList}
                    renderItem={({ item: m, index }) => {
                      const mColor = MEMBERSHIP_COLOR[m.membershipType] ?? colors.primary;
                      const initials = m.displayName?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';
                      return (
                        <View style={[styles.memberRow, index < detailMembers.length - 1 && styles.memberRowBorder]}>
                          <View style={[styles.memberAvatar, { backgroundColor: `${mColor}22` }]}>
                            <Text style={[styles.memberAvatarText, { color: mColor }]}>{initials}</Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.memberName}>{m.displayName}</Text>
                            <Text style={styles.memberSub}>{m.memberId || m.email}</Text>
                          </View>
                          <View style={[styles.planChip, { backgroundColor: `${mColor}22` }]}>
                            <Text style={[styles.planChipText, { color: mColor }]}>{m.membershipType?.toUpperCase()}</Text>
                          </View>
                        </View>
                      );
                    }}
                  />
                )}
              </>
            )}
          </View>
        </View>
      </Modal>
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
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.primary, borderRadius: 10,
    paddingHorizontal: 16, paddingVertical: 10,
    marginHorizontal: 16, marginBottom: 12, alignSelf: 'flex-start',
  },
  addBtnText: { color: '#000', fontWeight: '700', fontSize: 14 },
  list: { padding: 16 },
  card: {
    backgroundColor: colors.surface, borderRadius: 16,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
    padding: 16, marginBottom: 12,
  },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  avatarWrap: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: `${colors.primary}22`, alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: colors.primary, fontWeight: '800', fontSize: 15 },
  cardInfo: { flex: 1 },
  cardName: { color: colors.text, fontSize: 15, fontWeight: '700' },
  cardEmail: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  cardMemberId: { color: colors.textDim, fontSize: 11, fontWeight: '600', marginTop: 1 },
  cardPhone: { color: colors.textMuted, fontSize: 12, marginTop: 1 },
  cardAssigned: { color: colors.secondary, fontSize: 12, fontWeight: '600', marginTop: 4 },
  deleteBtn: { padding: 4 },
  deleteBtnDisabled: { opacity: 0.35 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyText: { color: colors.textMuted, fontSize: 16, fontWeight: '700' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: colors.surface, borderRadius: 20, padding: 24, margin: 20 },
  modalTitle: { color: colors.text, fontSize: 18, fontWeight: '800', marginBottom: 16 },
  input: {
    backgroundColor: colors.bg, borderRadius: 10, padding: 12,
    color: colors.text, fontSize: 14, marginBottom: 10,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  cancelBtn: {
    flex: 1, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    paddingVertical: 12, alignItems: 'center',
  },
  cancelBtnText: { color: colors.textMuted, fontWeight: '600' },
  saveBtn: {
    flex: 1, borderRadius: 10, backgroundColor: colors.primary,
    paddingVertical: 12, alignItems: 'center',
  },
  saveBtnText: { color: '#000', fontWeight: '800' },

  detailBox: {
    backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40, maxHeight: '75%',
  },
  detailHeader: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 20 },
  detailAvatar: {
    width: 52, height: 52, borderRadius: 14,
    backgroundColor: `${colors.primary}22`, alignItems: 'center', justifyContent: 'center',
  },
  detailAvatarText: { color: colors.primary, fontWeight: '800', fontSize: 18 },
  detailName: { color: colors.text, fontSize: 17, fontWeight: '800' },
  detailEmail: { color: colors.textMuted, fontSize: 13, marginTop: 2 },
  detailMeta: { color: colors.textDim, fontSize: 12, marginTop: 1 },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.07)', marginBottom: 16 },
  detailSectionLabel: {
    color: colors.textMuted, fontSize: 11, fontWeight: '700',
    textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 12,
  },
  detailEmpty: { alignItems: 'center', paddingVertical: 28, gap: 10 },
  detailEmptyText: { color: colors.textDim, fontSize: 13 },
  memberList: { flexGrow: 0 },
  memberRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12 },
  memberRowBorder: { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  memberAvatar: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  memberAvatarText: { fontSize: 13, fontWeight: '800' },
  memberName: { color: colors.text, fontSize: 14, fontWeight: '600' },
  memberSub: { color: colors.textDim, fontSize: 11, marginTop: 1 },
  planChip: { borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  planChipText: { fontSize: 10, fontWeight: '700' },
});
