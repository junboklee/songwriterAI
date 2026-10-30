import { logError, logInfo, logWarn } from '@/lib/logger';

describe('logger', () => {
  afterEach(() => jest.restoreAllMocks());

  it('writes JSON lines with the severity Cloud Logging reads', () => {
    const info = jest.spyOn(console, 'info').mockImplementation(() => undefined);
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const error = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    logInfo('a.info', { n: 1 });
    logWarn('a.warn');
    logError('a.error', new Error('boom'), { code: 'X' });

    expect(JSON.parse(info.mock.calls[0][0])).toEqual(expect.objectContaining({ severity: 'INFO', event: 'a.info', n: 1 }));
    expect(JSON.parse(warn.mock.calls[0][0])).toEqual(expect.objectContaining({ severity: 'WARNING', level: 'warn' }));
    expect(JSON.parse(error.mock.calls[0][0])).toEqual(
      expect.objectContaining({ severity: 'ERROR', message: 'boom', code: 'X', stack: expect.any(String) })
    );
  });
});
