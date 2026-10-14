import { trackAuth, trackEvent } from '@/lib/analytics';

jest.mock('firebase/auth', () => ({
  getAdditionalUserInfo: (credential: { isNew?: boolean }) =>
    credential.isNew === undefined ? null : { isNewUser: credential.isNew }
}));

describe('analytics', () => {
  afterEach(() => {
    delete (window as unknown as { gtag?: unknown }).gtag;
  });

  it('is a no-op when GA is not loaded', () => {
    expect(() => trackEvent('chat_message_sent')).not.toThrow();
  });

  it('forwards events to gtag', () => {
    const gtag = jest.fn();
    (window as unknown as { gtag: jest.Mock }).gtag = gtag;
    trackEvent('song_saved', { source: 'manual' });
    expect(gtag).toHaveBeenCalledWith('event', 'song_saved', { source: 'manual' });
  });

  it('never lets a broken gtag throw into product code', () => {
    (window as unknown as { gtag: () => void }).gtag = () => {
      throw new Error('blocked by extension');
    };
    expect(() => trackEvent('song_shared')).not.toThrow();
  });

  it('classifies popup sign-in as sign_up or login', () => {
    const gtag = jest.fn();
    (window as unknown as { gtag: jest.Mock }).gtag = gtag;
    trackAuth({ isNew: true } as never, 'google', 'login');
    trackAuth({ isNew: false } as never, 'google', 'sign_up');
    trackAuth({} as never, 'email', 'sign_up');
    expect(gtag.mock.calls.map(call => call[1])).toEqual(['sign_up', 'login', 'sign_up']);
  });
});
