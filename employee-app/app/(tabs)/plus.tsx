import { View } from "react-native";

/**
 * Placeholder route for the "Plus" tab.
 * The tab press is intercepted in `(tabs)/_layout` to open the drawer
 * instead of navigating here.
 */
export default function PlusTabPlaceholder() {
  return <View style={{ flex: 1 }} />;
}
