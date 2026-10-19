import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { ShareActions } from '@/components/ShareActions';
import { copyText } from '@/lib/clipboard';

jest.mock('@/lib/analytics', () => ({ trackEvent: jest.fn() }));
jest.mock('@/lib/clipboard', () => ({ copyText: jest.fn().mockResolvedValue(true) }));

const props = { shareId: 's1', url: 'https://novasingerai.com/s/s1', title: '밤 — NovaSingerAI', description: '별이 빛나' };

afterEach(() => {
  Object.defineProperty(navigator, 'share', { value: undefined, configurable: true });
  Object.defineProperty(navigator, 'canShare', { value: undefined, configurable: true });
});

describe('ShareActions', () => {
  it('offers link copy and the story image everywhere, and hides Kakao without a key', async () => {
    render(<ShareActions {...props} />);
    expect(screen.queryByRole('button', { name: '공유하기' })).toBeNull();
    expect(screen.queryByRole('button', { name: '카카오톡 공유' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: '링크 복사' }));
    await screen.findByRole('button', { name: '링크 복사됨 ✓' });
    expect(copyText).toHaveBeenCalledWith(props.url);
  });

  it('uses the device share sheet when available', async () => {
    const share = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'share', { value: share, configurable: true });
    render(<ShareActions {...props} />);

    fireEvent.click(await screen.findByRole('button', { name: '공유하기' }));
    await waitFor(() => expect(share).toHaveBeenCalledWith({ title: props.title, text: props.description, url: props.url }));
  });

  it('shares the story image as a file on phones, and downloads it elsewhere', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, blob: async () => new Blob(['png'], { type: 'image/png' }) }) as unknown as typeof fetch;
    const share = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'share', { value: share, configurable: true });
    Object.defineProperty(navigator, 'canShare', { value: () => true, configurable: true });
    const { unmount } = render(<ShareActions {...props} />);

    fireEvent.click(screen.getByRole('button', { name: '스토리용 이미지' }));
    await waitFor(() => expect(share).toHaveBeenCalledWith(expect.objectContaining({ files: [expect.any(File)] })));
    expect(global.fetch).toHaveBeenCalledWith('/api/og/song/s1?format=story');
    unmount();

    Object.defineProperty(navigator, 'canShare', { value: undefined, configurable: true });
    URL.createObjectURL = jest.fn(() => 'blob:story');
    URL.revokeObjectURL = jest.fn();
    const click = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    render(<ShareActions {...props} />);
    fireEvent.click(screen.getByRole('button', { name: '스토리용 이미지' }));
    await screen.findByText('이미지를 저장했어요.');
    expect(click).toHaveBeenCalled();
  });
});
