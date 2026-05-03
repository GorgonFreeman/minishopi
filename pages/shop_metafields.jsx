import {
  BlockStack,
  Box,
  Button,
  Card,
  InlineStack,
  Page,
  Spinner,
  Text,
} from '@shopify/polaris';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

function uniqKey(m) {
  return `${ m.namespace }\x1e${ m.key }`;
}

export default function ShopMetafieldsPage() {
  const [ searchParams ] = useSearchParams();
  const shop = searchParams.get('shop');

  const [ rows, setRows ] = useState([]);
  const [ cursor, setCursor ] = useState(null);
  const [ hasNext, setHasNext ] = useState(false);
  const [ loading, setLoading ] = useState(false);
  const [ loadingMore, setLoadingMore ] = useState(false);
  const [ error, setError ] = useState(null);
  const [ open, setOpen ] = useState({});

  const load = useCallback(
    async (append, afterCursor) => {
      if (!shop) return;
      const q = new URLSearchParams({ shop, first: '50' });
      if (afterCursor) q.set('after', afterCursor);
      const data = await fetch(`/api/shopMetafields?${ q }`).then((r) => r.json());
      if (!data.ok) {
        throw new Error(data.errors?.[ 0 ]?.message ?? data.error ?? 'Request failed');
      }
      const incoming = data.metafields ?? [];
      setCursor(data.pageInfo?.endCursor ?? null);
      setHasNext(Boolean(data.pageInfo?.hasNextPage));
      if (append) {
        setRows((prev) => {
          const seen = new Set(prev.map(uniqKey));
          const next = [ ...prev ];
          for (const m of incoming) {
            const k = uniqKey(m);
            if (!seen.has(k)) {
              seen.add(k);
              next.push(m);
            }
          }
          return next;
        });
      } else {
        const seen = new Set();
        setRows(
          incoming.filter((m) => {
            const k = uniqKey(m);
            if (seen.has(k)) return false;
            seen.add(k);
            return true;
          }),
        );
      }
    },
    [ shop ],
  );

  useEffect(() => {
    if (!shop) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setRows([]);
    setCursor(null);
    setHasNext(false);
    load(false, null)
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [ shop, load ]);

  const sorted = useMemo(
    () => [ ...rows ].sort((a, b) => uniqKey(a).localeCompare(uniqKey(b))),
    [ rows ],
  );

  return (
    <Page title="Shop metafields">
      <Card>
        { !shop ? (
          <Box padding="400">
            <Text as="p">Open this app from the Shopify admin (needs <code>shop</code> in the URL).</Text>
          </Box>
        ) : loading && sorted.length === 0 ? (
          <Box padding="400">
            <InlineStack gap="200" blockAlign="center">
              <Spinner size="small" />
              <Text as="span">Loading…</Text>
            </InlineStack>
          </Box>
        ) : error && sorted.length === 0 ? (
          <Box padding="400">
            <Text as="p" tone="critical">
              { error }
            </Text>
          </Box>
        ) : sorted.length === 0 ? (
          <Box padding="400">
            <Text as="p" tone="subdued">
              No shop metafields.
            </Text>
          </Box>
        ) : (
          <BlockStack gap="0">
            { sorted.map((m) => (
              <Box
                key={ m.id }
                padding="300"
                paddingInline="400"
                borderBlockEndWidth="025"
                borderColor="border"
              >
                <button
                  type="button"
                  onClick={ () => setOpen((o) => ({ ...o, [ m.id ]: !o[ m.id ] })) }
                  style={ { all: 'unset', cursor: 'pointer', display: 'block', width: '100%' } }
                >
                  <InlineStack align="space-between" blockAlign="center" wrap={ false }>
                    <BlockStack gap="100">
                      <Text as="span" variant="bodyMd" fontWeight="semibold">
                        { m.namespace } · { m.key }
                      </Text>
                      <Text as="span" variant="bodySm" tone="subdued">
                        { m.type }
                      </Text>
                    </BlockStack>
                    <Text as="span" variant="bodySm" tone="subdued">
                      { open[ m.id ] ? '▼' : '▶' }
                    </Text>
                  </InlineStack>
                </button>
                { open[ m.id ] ? (
                  <Box paddingBlockStart="300">
                    <pre
                      style={ {
                        margin: 0,
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                        fontFamily: 'monospace',
                        fontSize: '0.8125rem',
                        color: 'var(--p-color-text-secondary)',
                      } }
                    >
                      { m.value ?? '—' }
                    </pre>
                  </Box>
                ) : null }
              </Box>
            )) }
          </BlockStack>
        ) }
      </Card>

      { error && sorted.length > 0 ? (
        <Box paddingBlockStart="400">
          <Text as="p" tone="critical" variant="bodySm">
            { error }
          </Text>
        </Box>
      ) : null }

      { hasNext && sorted.length > 0 ? (
        <Box paddingBlockStart="400">
          <Button
            loading={ loadingMore }
            disabled={ loadingMore || !cursor }
            onClick={ async () => {
              setLoadingMore(true);
              setError(null);
              try {
                await load(true, cursor);
              } catch (e) {
                setError(e instanceof Error ? e.message : String(e));
              } finally {
                setLoadingMore(false);
              }
            } }
          >
            Load more
          </Button>
        </Box>
      ) : null }
    </Page>
  );
}
