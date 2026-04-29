import { Card, Page, Text } from '@shopify/polaris';

export default function SettingsPage() {
  return (
    <Page title="Settings">
      <Card>
        <Text variant="bodyMd" as="p">
          Settings placeholder — file maps to route /pages/settings via autodiscovery.
        </Text>
      </Card>
    </Page>
  );
}
