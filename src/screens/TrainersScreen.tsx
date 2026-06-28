import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, TextInput, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, DrawerActions, useFocusEffect } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { TrainerProfile, getTrainers, createTrainer, deleteTrainer } from '../services/trainers';

export default function TrainersScreen() {
  const navigation = useNavigation<any>();
  const [trainers, setTrainers] = useState<TrainerProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [addModal, setAddModal] = useState(false);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getTrainers();
      setTrainers(data);
    } catch (err: any) {
      (window as any).alert('Failed to load trainers: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(load);

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
          {trainers.map(trainer => (
            <View key={trainer.uid} style={styles.card}>
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
                    {trainer.assignedMemberUids?.length ?? 0} member{(trainer.assignedMemberUids?.length ?? 0) !== 1 ? 's' : ''} assigned
                  </Text>
                </View>
                <TouchableOpacity onPress={() => handleDelete(trainer)} style={styles.deleteBtn}>
                  <Ionicons name="trash-outline" size={18} color={colors.error} />
                </TouchableOpacity>
              </View>
            </View>
          ))}
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
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyText: { color: colors.textMuted, fontSize: 16, fontWeight: '700' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 },
  modalBox: { backgroundColor: colors.surface, borderRadius: 20, padding: 24 },
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
});
