import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: {
    padding: 32,
    fontSize: 11,
    color: "#1d2a2c",
    fontFamily: "Helvetica",
  },
  title: {
    fontSize: 20,
    marginBottom: 8,
  },
  section: {
    marginBottom: 16,
    paddingBottom: 12,
    borderBottom: "1 solid #d5ccbd",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 6,
  },
  label: {
    fontSize: 9,
    textTransform: "uppercase",
    color: "#6d7678",
    letterSpacing: 1,
  },
});

export function ClaimPdfDocument({
  claim,
}: {
  claim: {
    claimNumber: string;
    customerName: string;
    loadNumber: string;
    facilityName: string;
    totalAmount: string;
    lineItems: Array<{ type: string; amount: string; description: string }>;
    timeline: Array<{ label: string; detail: string }>;
    documents: Array<{ name: string; type: string }>;
  };
}) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.section}>
          <Text style={styles.title}>DockClaim Claim Summary</Text>
          <View style={styles.row}>
            <Text>Claim {claim.claimNumber}</Text>
            <Text>{claim.totalAmount}</Text>
          </View>
          <Text>{claim.customerName}</Text>
          <Text>Load {claim.loadNumber}</Text>
          <Text>{claim.facilityName}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Line items</Text>
          {claim.lineItems.map((lineItem, index) => (
            <View key={`${lineItem.type}-${index}`} style={styles.row}>
              <View>
                <Text>{lineItem.type}</Text>
                <Text>{lineItem.description}</Text>
              </View>
              <Text>{lineItem.amount}</Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Evidence timeline</Text>
          {claim.timeline.map((entry, index) => (
            <View key={`${entry.label}-${index}`} style={styles.row}>
              <Text>{entry.label}</Text>
              <Text>{entry.detail}</Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Document index</Text>
          {claim.documents.map((document, index) => (
            <View key={`${document.name}-${index}`} style={styles.row}>
              <Text>{document.name}</Text>
              <Text>{document.type}</Text>
            </View>
          ))}
        </View>
      </Page>
    </Document>
  );
}
