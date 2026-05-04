// Boilerplate page. After `npm run new`, rename `ExamplePage` and the `kit-example` tag to match this file's slug.
import { LitElement, html } from 'lit';

class ExamplePage extends LitElement {
  createRenderRoot() {
    return this;
  }

  render() {
    return html`
      <s-page heading='Example'>
        <s-section>
          <s-paragraph>Replace this content.</s-paragraph>
        </s-section>
      </s-page>
    `;
  }
}

customElements.define('kit-example', ExamplePage);
