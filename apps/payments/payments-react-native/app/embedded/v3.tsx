import { CrossmintCheckoutProvider, CrossmintProvider, useCrossmintCheckout } from "@crossmint/client-sdk-react-ui";
import { useEffect } from "react";
import { StyleSheet, Linking } from "react-native";
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';

function EmbeddedCheckoutV3Content() {
  const checkout = useCrossmintCheckout();

  useEffect(() => {
    console.log("order in sdk", checkout);
    // For mobile, we'll open the checkout in the device's browser
    Linking.openURL('https://www.crossmint.com/checkout');
  }, []);

  return (
    <ThemedView style={styles.container}>
      <ThemedText style={styles.text}>
        Opening Crossmint checkout in your browser...
      </ThemedText>
    </ThemedView>
  );
}

export default function EmbeddedV3Screen() {
  return (
    <CrossmintProvider
      overrideBaseUrl="https://dserver.maxf.io"
      apiKey="ck_development_5ZUNkuhjP8aYZEgUTDfWToqFpo5zakEqte1db4pHZgPAVKZ9JuTQKmeRbn1gv7zYCoZrRNYy4CnM7A3AMHQxFKA2BsSVeZbKEvXXY7126Th68mXhTg6oxHJpC2kuw9Q1HasVLX9LM67FoYSTRtTUUEzP93GUSEmeG5CZG7Lbop4oAQ7bmZUKTGmqN9L9wxP27CH13WaTBsrqxUJkojbKUXEd"
    >
      <CrossmintCheckoutProvider>
        <EmbeddedCheckoutV3Content />
      </CrossmintCheckoutProvider>
    </CrossmintProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  text: {
    fontSize: 16,
    textAlign: 'center',
  }
}); 
