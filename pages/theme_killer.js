import { LitElement, html, nothing } from 'lit';

class ThemeKillerPage extends LitElement {
  static properties = {
    themes: { state: true },
    selected: { state: true },
    loading: { state: true },
    busy: { state: true },
    error: { state: true },
  };

  constructor() {
    super();
    this.themes = [];
    this.selected = {};
    this.loading = false;
    this.busy = false;
    this.error = null;
  }

  createRenderRoot() {
    return this;
  }

  get shop() {
    return new URLSearchParams(window.location.search).get('shop');
  }

  async connectedCallback() {
    super.connectedCallback();
    await this.refresh();
  }

  async refresh() {
    if (!this.shop) return;
    this.loading = true;
    this.error = null;
    try {
      const data = await fetch(`/api/themes?${ new URLSearchParams({ shop: this.shop }) }`).then((r) => r.json());
      if (!data.ok) {
        throw new Error(data.errors?.[ 0 ]?.message ?? data.error ?? 'Request failed');
      }
      this.themes = data.themes ?? [];
      this.selected = {};
    } catch (e) {
      this.error = e instanceof Error ? e.message : String(e);
    } finally {
      this.loading = false;
    }
  }

  toggle(id, role, checked) {
    if (role === 'MAIN') return;
    this.selected = { ...this.selected, [ id ]: checked };
  }

  selectedIds() {
    return Object.entries(this.selected).filter(([, on]) => on).map(([ id ]) => id);
  }

  async submitDelete() {
    const ids = this.selectedIds();
    if (!this.shop || ids.length === 0) return;
    this.busy = true;
    this.error = null;
    try {
      const data = await fetch(`/api/themesDelete?${ new URLSearchParams({ shop: this.shop }) }`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      }).then((r) => r.json());
      if (!data.ok) {
        const first = data.results?.find((r) => r.userErrors?.length)?.userErrors?.[ 0 ]?.message;
        this.error = data.error ?? first ?? 'Delete failed';
        return;
      }
      await this.refresh();
    } catch (e) {
      this.error = e instanceof Error ? e.message : String(e);
    } finally {
      this.busy = false;
    }
  }

  render() {
    const n = this.selectedIds().length;
    return html`
      <s-page heading='Theme killer'>
        <s-section>
          ${ this.error ? html`<s-paragraph tone='critical'>${ this.error }</s-paragraph>` : nothing }
          ${ this.loading
            ? html`<s-paragraph>Loading…</s-paragraph>`
            : html`
                ${ this.themes.map(
                  (t) => html`
                    <div style='display:flex;gap:0.75rem;align-items:center;margin-bottom:0.5rem'>
                      <input
                        type='checkbox'
                        ?disabled=${ t.role === 'MAIN' }
                        .checked=${ Boolean(this.selected[ t.id ]) }
                        @change=${ (e) => this.toggle(t.id, t.role, e.target.checked) }
                      />
                      <span>${ t.name }</span>
                      ${ t.role === 'MAIN'
                        ? html`<span style='opacity:0.75;font-size:0.875rem'>Published (protected)</span>`
                        : nothing }
                    </div>
                  `,
                ) }
                <s-button
                  style='margin-top:0.75rem'
                  variant='primary'
                  tone='critical'
                  ?disabled=${ n === 0 }
                  ?loading=${ this.busy }
                  @click=${ () => this.submitDelete() }
                >Delete ${ n } theme${ n === 1 ? '' : 's' }</s-button>
              ` }
        </s-section>
      </s-page>
    `;
  }
}

customElements.define('kit-theme-killer', ThemeKillerPage);
