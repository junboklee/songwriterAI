import { copyText } from '@/lib/clipboard';

describe('copyText', () => {
  const setClipboard = (clipboard: unknown) =>
    Object.defineProperty(navigator, 'clipboard', { value: clipboard, configurable: true });

  beforeEach(() => {
    document.execCommand = jest.fn().mockReturnValue(true);
  });

  it('uses the Clipboard API when available', async () => {
    const writeText = jest.fn().mockResolvedValue(undefined);
    setClipboard({ writeText });
    await expect(copyText('가사')).resolves.toBe(true);
    expect(writeText).toHaveBeenCalledWith('가사');
    expect(document.execCommand).not.toHaveBeenCalled();
  });

  it('falls back to a hidden textarea when the API is refused or missing', async () => {
    setClipboard({ writeText: jest.fn().mockRejectedValue(new Error('denied')) });
    await expect(copyText('가사')).resolves.toBe(true);
    setClipboard(undefined);
    await expect(copyText('가사')).resolves.toBe(true);
    expect(document.execCommand).toHaveBeenCalledTimes(2);
    expect(document.querySelector('textarea')).toBeNull();
  });

  it('reports failure when nothing worked', async () => {
    setClipboard(undefined);
    (document.execCommand as jest.Mock).mockReturnValue(false);
    await expect(copyText('가사')).resolves.toBe(false);
  });
});
