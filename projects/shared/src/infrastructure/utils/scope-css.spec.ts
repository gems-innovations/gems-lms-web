import { scopeCss } from './scope-css';

describe('scopeCss', () => {
  const scope = '.t';

  it('prefixes every selector of a rule', () => {
    expect(scopeCss('.a, h1 > span { color: red }', scope)).toBe('.t .a,.t h1 > span{ color: red }');
  });

  it('turns html, body and :root into the container itself', () => {
    expect(scopeCss('body { margin: 0 } :root { --x: 1 } body.dark .a { color: red }', scope))
      .toBe('.t{ margin: 0 }.t{ --x: 1 }.t.dark .a{ color: red }');
  });

  it('scopes rules inside @media and keeps @keyframes and @font-face untouched', () => {
    const css = '@media (min-width: 600px) { .a { color: red } } @keyframes spin { from { opacity: 0 } to { opacity: 1 } }';
    expect(scopeCss(css, scope))
      .toBe('@media (min-width: 600px){.t .a{ color: red }}@keyframes spin{ from { opacity: 0 } to { opacity: 1 } }');
  });

  it('drops statements and unknown at-rules', () => {
    expect(scopeCss('@charset "utf-8"; @page { margin: 0 } .a { color: red }', scope)).toBe('.t .a{ color: red }');
  });

  it('does not split selectors on commas inside functions', () => {
    expect(scopeCss(':is(.a, .b) { color: red }', scope)).toBe('.t :is(.a, .b){ color: red }');
  });

  it('returns an empty string without CSS', () => {
    expect(scopeCss(null, scope)).toBe('');
    expect(scopeCss('/* nada */', scope)).toBe('');
  });
});
