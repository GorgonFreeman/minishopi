/** @jsxImportSource preact */
import '@shopify/ui-extensions/preact';
import { render } from 'preact';
import { useState } from 'preact/hooks';

const SYNC_URL = 'https://australia-southeast1-foxtware.cloudfunctions.net/apexCatalogueSyncReconsilePvx';

export default async () => {
  render(<Extension />, document.body);
};

function Extension() {
  const { close, data, i18n } = shopify;
  const gid = data.selected?.[ 0 ]?.id ?? '';
  const productId = gid.split('/').pop() ?? '';

  const [ status, setStatus ] = useState('idle');
  const [ errorMessage, setErrorMessage ] = useState('');

  async function runSync() {
    if (!productId) return;
    setStatus('syncing');
    setErrorMessage('');
    try {
      const res = await fetch(SYNC_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ options: { productIds: [ productId ] } }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || body.success !== true) {
        throw new Error(body.error ?? `HTTP ${ res.status }`);
      }
      setStatus('success');
    } catch (err) {
      console.log('pvxSyncError', err);
      setErrorMessage(err instanceof Error ? err.message : String(err));
      setStatus('error');
    }
  }

  const isSyncing = status === 'syncing';
  const isSuccess = status === 'success';
  const isError = status === 'error';
  const hasProduct = Boolean(productId);

  return (
    <s-admin-action heading={ i18n.translate('heading') }>
      { isSuccess ? (
        <s-button slot="primary-action" onClick={ () => { close(); } }>
          { i18n.translate('done') }
        </s-button>
      ) : (
        <s-button
          slot="primary-action"
          disabled={ !hasProduct || isSyncing }
          loading={ isSyncing }
          onClick={ runSync }
        >
          { i18n.translate('sync') }
        </s-button>
      ) }
      <s-button slot="secondary-actions" onClick={ () => { close(); } }>
        { i18n.translate('close') }
      </s-button>

      <s-stack direction="block" gap="base">
        <s-text>{ i18n.translate('description') }</s-text>

        { !hasProduct && (
          <s-banner tone="warning">
            <s-text>{ i18n.translate('no-product') }</s-text>
          </s-banner>
        ) }

        { isSyncing && (
          <s-stack direction="inline" gap="base" align-items="center">
            <s-spinner />
            <s-text>{ i18n.translate('syncing', { id: productId }) }</s-text>
          </s-stack>
        ) }

        { isSuccess && (
          <s-banner tone="success">
            <s-text>{ i18n.translate('success', { id: productId }) }</s-text>
          </s-banner>
        ) }

        { isError && (
          <s-banner tone="critical">
            <s-text>{ i18n.translate('error', { message: errorMessage }) }</s-text>
          </s-banner>
        ) }
      </s-stack>
    </s-admin-action>
  );
}
