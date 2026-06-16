import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, DrawerActions, useFocusEffect } from '@react-navigation/native';
import { auth } from '../services/firebase';
import { getUserProfile } from '../services/users';
import { subscribeWorkoutAccess } from '../services/gymSettings';
import { colors } from '../theme/colors';

const WORKOUTS = [
  {
    id: 'strength',
    icon: 'barbell-outline',
    color: '#FF6B6B',
    title: 'Strength Training',
    detail: 'Builds muscle and strength using resistance.',
    examples: ['Weight lifting', 'Dumbbell exercises', 'Barbell exercises', 'Machines', 'Push-ups, squats, pull-ups'],
    goodFor: 'Muscle growth, strength, fat loss, better body shape.',
  },
  {
    id: 'cardio',
    icon: 'heart-outline',
    color: '#FF9F43',
    title: 'Cardio Training',
    detail: 'Improves heart health and burns calories.',
    examples: ['Treadmill walking/running', 'Cycling', 'Elliptical', 'Rowing machine', 'Stair climber'],
    goodFor: 'Stamina, weight loss, heart health.',
  },
  {
    id: 'hiit',
    icon: 'flash-outline',
    color: '#FFD700',
    title: 'HIIT',
    detail: 'High-Intensity Interval Training — short bursts of max effort.',
    examples: ['30 sec fast exercise', '30 sec rest', 'Repeat 15–25 minutes'],
    goodFor: 'Fat burning, quick workouts, stamina.',
  },
  {
    id: 'functional',
    icon: 'body-outline',
    color: '#1DD1A1',
    title: 'Functional Training',
    detail: 'Exercises that improve real-life movement patterns.',
    examples: ['Kettlebell swings', 'Farmer\'s walk', 'Medicine ball throws', 'Battle ropes', 'Step-ups'],
    goodFor: 'Balance, mobility, real-life strength.',
  },
  {
    id: 'flexibility',
    icon: 'accessibility-outline',
    color: '#48DBFB',
    title: 'Flexibility & Mobility',
    detail: 'Improves body movement and reduces stiffness.',
    examples: ['Stretching', 'Yoga', 'Mobility drills', 'Foam rolling'],
    goodFor: 'Posture, injury prevention, recovery.',
  },
  {
    id: 'core',
    icon: 'fitness-outline',
    color: '#9B59B6',
    title: 'Core Training',
    detail: 'Strengthens abs, lower back, and stability.',
    examples: ['Planks', 'Crunches', 'Leg raises', 'Russian twists', 'Cable woodchoppers'],
    goodFor: 'Back support, posture, balance.',
  },
  {
    id: 'circuit',
    icon: 'repeat-outline',
    color: '#00BFFF',
    title: 'Circuit Training',
    detail: 'Multiple exercises back-to-back with little rest.',
    examples: ['Squats', 'Push-ups', 'Rows', 'Lunges', 'Plank'],
    goodFor: 'Strength + cardio together.',
  },
  {
    id: 'athletic',
    icon: 'trophy-outline',
    color: '#FD7272',
    title: 'Sports & Athletic Training',
    detail: 'Improves speed, power, and agility for performance.',
    examples: ['Sprints', 'Jump training', 'Agility ladder', 'Plyometrics'],
    goodFor: 'Sports performance and explosive strength.',
  },
];

const BEGINNER_TIP = 'Strength training 3 days/week  +  Cardio 2 days/week  +  Stretching daily';

export default function WorkoutsScreen() {
  const navigation = useNavigation<any>();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [membershipType, setMembershipType] = useState<string>('basic');
  const [promoExpiry, setPromoExpiry] = useState<string | null>(null);
  const [planAccess, setPlanAccess] = useState<boolean>(false);
  const [loadingProfile, setLoadingProfile] = useState(true);

  useFocusEffect(useCallback(() => {
    const uid = auth.currentUser?.uid;
    if (uid) {
      getUserProfile(uid).then(p => {
        setMembershipType(p?.membershipType ?? 'basic');
        setPromoExpiry(p?.promoWorkoutExpiry ?? null);
        setLoadingProfile(false);
      });
    } else {
      setLoadingProfile(false);
    }
    const unsubscribe = subscribeWorkoutAccess(wa => {
      setPlanAccess(!!wa[membershipType as keyof typeof wa]);
    });
    return unsubscribe;
  }, [membershipType]));

  const today = new Date().toISOString().slice(0, 10);
  const promoActive = !!promoExpiry && promoExpiry >= today;
  const isLocked = !promoActive && !planAccess;

  const toggle = (id: string) => setExpanded(prev => prev === id ? null : id);

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.dispatch(DrawerActions.openDrawer())}>
          <Ionicons name="menu" size={28} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.heading}>Workouts</Text>
        <View style={{ width: 28 }} />
      </View>

      {promoActive && (
        <View style={styles.promoBanner}>
          <Ionicons name="gift-outline" size={14} color={colors.secondary} />
          <Text style={styles.promoBannerText}>Promo access · expires {promoExpiry}</Text>
        </View>
      )}

      {isLocked ? (
        <View style={styles.lockedWrap}>
          <View style={styles.lockedIconCircle}>
            <Ionicons name="lock-closed" size={36} color={colors.textMuted} />
          </View>
          <Text style={styles.lockedTitle}>Premium & VIP Only</Text>
          <Text style={styles.lockedDesc}>
            Access to workout guides and training plans is available for Premium and VIP members.
          </Text>
          <View style={styles.planHints}>
            <View style={[styles.planChip, { borderColor: '#9B59B644', backgroundColor: '#9B59B611' }]}>
              <Text style={[styles.planChipText, { color: '#9B59B6' }]}>Premium</Text>
            </View>
            <View style={[styles.planChip, { borderColor: '#FFD70044', backgroundColor: '#FFD70011' }]}>
              <Text style={[styles.planChipText, { color: '#FFD700' }]}>VIP</Text>
            </View>
          </View>
          <Text style={styles.lockedSub}>Contact your gym admin to upgrade your membership.</Text>
        </View>
      ) : (
      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {WORKOUTS.map((w, i) => {
          const open = expanded === w.id;
          return (
            <TouchableOpacity
              key={w.id}
              style={[styles.card, open && styles.cardOpen]}
              onPress={() => toggle(w.id)}
              activeOpacity={0.85}
            >
              <View style={styles.cardHeader}>
                <View style={[styles.iconWrap, { backgroundColor: `${w.color}22` }]}>
                  <Ionicons name={w.icon as any} size={20} color={w.color} />
                </View>
                <View style={styles.cardMeta}>
                  <View style={styles.titleRow}>
                    <Text style={styles.numberBadge}>{i + 1}</Text>
                    <Text style={styles.cardTitle}>{w.title}</Text>
                  </View>
                  <Text style={styles.cardDetail}>{w.detail}</Text>
                </View>
                <Ionicons
                  name={open ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color={colors.textMuted}
                />
              </View>

              {open && (
                <View style={styles.cardBody}>
                  <View style={styles.divider} />

                  <Text style={styles.sectionLabel}>Examples</Text>
                  {w.examples.map(ex => (
                    <View key={ex} style={styles.bulletRow}>
                      <View style={[styles.dot, { backgroundColor: w.color }]} />
                      <Text style={styles.bulletText}>{ex}</Text>
                    </View>
                  ))}

                  <View style={[styles.goodForBox, { borderColor: `${w.color}44`, backgroundColor: `${w.color}11` }]}>
                    <Text style={[styles.goodForLabel, { color: w.color }]}>Good for</Text>
                    <Text style={styles.goodForText}>{w.goodFor}</Text>
                  </View>
                </View>
              )}
            </TouchableOpacity>
          );
        })}

        {/* Beginner tip */}
        <View style={styles.tipBox}>
          <View style={styles.tipHeader}>
            <Ionicons name="bulb-outline" size={18} color={colors.secondary} />
            <Text style={styles.tipTitle}>Beginner Recommendation</Text>
          </View>
          <Text style={styles.tipText}>{BEGINNER_TIP}</Text>
        </View>

        <View style={{ height: 32 }} />
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
  list: { padding: 16, gap: 10 },
  lockedWrap: {
    flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40,
  },
  lockedIconCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 20,
  },
  lockedTitle: { color: colors.text, fontSize: 20, fontWeight: '800', marginBottom: 12, textAlign: 'center' },
  lockedDesc: { color: colors.textMuted, fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 20 },
  planHints: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  planChip: {
    borderWidth: 1, borderRadius: 8,
    paddingHorizontal: 14, paddingVertical: 6,
  },
  planChipText: { fontSize: 12, fontWeight: '800' },
  lockedSub: { color: colors.textDim, fontSize: 12, textAlign: 'center' },
  promoBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginHorizontal: 16, marginBottom: 8,
    backgroundColor: `${colors.secondary}18`,
    borderWidth: 1, borderColor: `${colors.secondary}33`,
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7,
  },
  promoBannerText: { color: colors.secondary, fontSize: 12, fontWeight: '600' },

  card: {
    backgroundColor: colors.surface, borderRadius: 16,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
  },
  cardOpen: { borderColor: 'rgba(255,255,255,0.12)' },
  cardHeader: {
    flexDirection: 'row', alignItems: 'center',
    padding: 14, gap: 12,
  },
  iconWrap: {
    width: 40, height: 40, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  cardMeta: { flex: 1, gap: 3 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  numberBadge: {
    color: colors.textDim, fontSize: 11, fontWeight: '700',
    backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 4,
    paddingHorizontal: 5, paddingVertical: 1,
  },
  cardTitle: { color: colors.text, fontSize: 15, fontWeight: '700' },
  cardDetail: { color: colors.textMuted, fontSize: 12, lineHeight: 17 },

  cardBody: { paddingHorizontal: 14, paddingBottom: 14 },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.07)', marginBottom: 12 },

  sectionLabel: {
    color: colors.textMuted, fontSize: 11, fontWeight: '700',
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8,
  },
  bulletRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 5 },
  dot: { width: 5, height: 5, borderRadius: 3 },
  bulletText: { color: colors.text, fontSize: 13 },

  goodForBox: {
    borderWidth: 1, borderRadius: 10, padding: 10, marginTop: 12,
  },
  goodForLabel: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 3 },
  goodForText: { color: colors.text, fontSize: 13, lineHeight: 18 },

  tipBox: {
    backgroundColor: `${colors.secondary}18`,
    borderWidth: 1, borderColor: `${colors.secondary}33`,
    borderRadius: 16, padding: 16, marginTop: 6,
  },
  tipHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  tipTitle: { color: colors.secondary, fontSize: 14, fontWeight: '700' },
  tipText: { color: colors.text, fontSize: 13, lineHeight: 20 },
});
