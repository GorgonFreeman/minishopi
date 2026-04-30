import { BlockStack, Card, Page, Text } from '@shopify/polaris';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

export default function HomePage() {
  const [ searchParams ] = useSearchParams();
  const shop = searchParams.get('shop');
  const [ apiPayload, setApiPayload ] = useState(null);

  useEffect(() => {
    if (!shop) return;
    const q = new URLSearchParams({ shop });
    fetch(`/api/getCustomer?${ q.toString() }`)
      .then((r) => r.json())
      .then(setApiPayload)
      .catch(() => setApiPayload({ error: 'fetch failed' }));
  }, [ shop ]);

  return (
    <Page title="Home">
      <Card>
        <BlockStack gap="400">
          <Text variant="bodyMd" as="p">
            It's kitsuchan boi c:
          </Text>
          <Text variant="bodySm" tone="subdued" as="pre">
            { apiPayload ? JSON.stringify(apiPayload, null, 2) : '…' }
          </Text>
        </BlockStack>
      </Card>
    </Page>
  );
}
