import { render } from 'preact';
import { useEffect, useState } from 'preact/hooks';

export default async () => {
  render(<Extension />, document.body);

  function Extension() {
    const { close, data, i18n } = shopify;
    const id = data.selected?.[ 0 ]?.id;
    const [ line, setLine ] = useState(() => i18n.translate('loading'));

    useEffect(() => {
      if (!id) {
        setLine(i18n.translate('no-product'));
        return;
      }
      shopify
        .query(`query ($id: ID!) { product(id: $id) { title } }`, {
          variables: { id },
        })
        .then(({ data: gql, errors }) => {
          if (errors?.length) throw new Error();
          const title = gql?.product?.title ?? '';
          setLine(i18n.translate('echo-with-title', { title }));
        })
        .catch(() => setLine(i18n.translate('load-error')));
    }, [ id, i18n ]);

    return (
      <s-admin-action heading={ i18n.translate('name') }>
        <s-button slot="primaryAction" onClick={ close }>
          { i18n.translate('done') }
        </s-button>
        <s-box padding-block-start="base">
          <s-text>{ line }</s-text>
        </s-box>
      </s-admin-action>
    );
  }
};
