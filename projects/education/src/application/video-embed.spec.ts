import { toEditorEmbedUrl, toVideoEmbedUrl } from './video-embed';

describe('toVideoEmbedUrl', () => {
  it('builds the embed address of YouTube links in any of their forms', () => {
    for (const url of [
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      'https://youtu.be/dQw4w9WgXcQ',
      'https://www.youtube.com/embed/dQw4w9WgXcQ?start=3',
      'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
    ]) {
      expect(toVideoEmbedUrl(url)).toContain('https://www.youtube.com/embed/dQw4w9WgXcQ?');
    }
  });

  it('builds the embed address of Vimeo links', () => {
    expect(toVideoEmbedUrl('https://vimeo.com/123456')).toContain('https://player.vimeo.com/video/123456?');
    expect(toVideoEmbedUrl('https://player.vimeo.com/video/123456?h=abc')).toContain('https://player.vimeo.com/video/123456?');
  });

  it('refuses addresses that are not a plain YouTube or Vimeo video', () => {
    for (const url of [
      'javascript:alert(1)//embed/',
      'http://www.youtube.com/watch?v=dQw4w9WgXcQ',
      'https://evil.example/embed/dQw4w9WgXcQ',
      'https://youtube.com.evil.example/watch?v=dQw4w9WgXcQ',
      'https://www.youtube.com/watch?v=a/../../b',
      'https://vimeo.com/channels/staffpicks',
      'not a url',
      '',
    ]) {
      expect(toVideoEmbedUrl(url)).withContext(url).toBeNull();
    }
  });
});

describe('toEditorEmbedUrl', () => {
  it('builds the embed address of StackBlitz, CodePen and CodeSandbox projects', () => {
    expect(toEditorEmbedUrl('https://stackblitz.com/edit/vitejs-vite-abc123')).toBe('https://stackblitz.com/edit/vitejs-vite-abc123?embed=1&view=editor');
    expect(toEditorEmbedUrl('https://codepen.io/user/pen/abCdE')).toBe('https://codepen.io/user/embed/abCdE?default-tab=js,result');
    expect(toEditorEmbedUrl('https://codesandbox.io/s/my-box-xyz')).toBe('https://codesandbox.io/embed/my-box-xyz');
  });

  it('refuses addresses that are not on the allowed list', () => {
    for (const url of ['https://evil.example/edit/a', 'http://stackblitz.com/edit/a', 'https://stackblitz.com.evil.example/edit/a',
      'https://stackblitz.com/edit/a%2F..%2Fb', 'javascript:alert(1)', 'https://codepen.io/user/details/abc', '']) {
      expect(toEditorEmbedUrl(url)).withContext(url).toBeNull();
    }
  });
});
