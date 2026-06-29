import { Platform, Alert } from 'react-native';

export function notify(title: string, msg: string) {
  if (Platform.OS === 'web') {
    (window as any).alert(`${title}\n\n${msg}`);
  } else {
    Alert.alert(title, msg);
  }
}
