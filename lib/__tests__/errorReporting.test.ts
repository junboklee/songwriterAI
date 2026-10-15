import { reportClientError, resetErrorReportingForTests, shouldReport } from '@/lib/errorReporting';

describe('client error reporting', () => {
  const sendBeacon = jest.fn((_url: string, _data?: BodyInit) => true);

  beforeEach(() => {
    resetErrorReportingForTests();
    sendBeacon.mockClear();
    Object.defineProperty(navigator, 'sendBeacon', { value: sendBeacon, configurable: true });
  });

  it('sends each distinct error once with path only', () => {
    reportClientError('error', new Error('boom'));
    reportClientError('error', new Error('boom'));
    expect(sendBeacon).toHaveBeenCalledTimes(1);
    expect(sendBeacon.mock.calls[0][0]).toBe('/api/client-errors');
  });

  it('caps reports per page load', () => {
    for (let i = 0; i < 10; i += 1) {
      reportClientError('error', new Error(`e${i}`));
    }
    expect(sendBeacon).toHaveBeenCalledTimes(5);
  });

  it('ignores known browser noise', () => {
    expect(shouldReport('ResizeObserver loop completed with undelivered notifications.')).toBe(false);
    expect(shouldReport('Script error.')).toBe(false);
    expect(shouldReport('x', 'at chrome-extension://abc/content.js')).toBe(false);
    expect(shouldReport('Cannot read properties of undefined')).toBe(true);
  });
});
