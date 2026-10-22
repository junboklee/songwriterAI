import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { SingabilityFixAll } from '@/components/SingabilityFixAll';
import { I18nProvider } from '@/context/I18nContext';
import { trackEvent } from '@/lib/analytics';

jest.mock('@/lib/analytics', () => ({ trackEvent: jest.fn() }));

const withI18n = (node: React.ReactNode) => <I18nProvider initialLocale="ko">{node}</I18nProvider>;
const lyrics = '[Verse]\n3월의 바람이 불어\n너를 다시 생각해\n2번 더 불러 줘';
const getIdToken = jest.fn().mockResolvedValue('token');

const replyWith = (replacements: Record<string, string>) =>
  jest.fn(async (_url: string, init: RequestInit) => {
    const { selection } = JSON.parse(String(init.body));
    return { ok: true, json: async () => ({ replacement: replacements[selection] ?? selection }) };
  });

describe('SingabilityFixAll', () => {
  it('fixes every flagged line and applies only after review', async () => {
    const fetchMock = replyWith({ '3월의 바람이 불어': '삼월의 바람이 불어', '2번 더 불러 줘': '두 번 더 불러 줘' });
    global.fetch = fetchMock as unknown as typeof fetch;
    const onApply = jest.fn();
    render(withI18n(<SingabilityFixAll lyrics={lyrics} style="ballad" getIdToken={getIdToken} onApply={onApply} />));

    fireEvent.click(screen.getByRole('button', { name: '2줄 한 번에 고치기' }));

    expect(await screen.findByText('2줄을 고쳤어요. 확인할 곳 2개 → 0개')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(JSON.parse(String(fetchMock.mock.calls[0][1].body))).toMatchObject({
      selection: '2번 더 불러 줘',
      instruction: '숫자를 노래로 부르기 좋게 한글로 바꿔줘.',
      style: 'ballad'
    });
    expect(onApply).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: '모두 적용' }));
    expect(onApply).toHaveBeenCalledWith('[Verse]\n삼월의 바람이 불어\n너를 다시 생각해\n두 번 더 불러 줘', [
      '두 번 더 불러 줘',
      '삼월의 바람이 불어'
    ]);
    expect(trackEvent).toHaveBeenCalledWith('singability_fix_all_applied', { lines: 2 });
  });

  it('shows the API error and keeps the lines fixed before it', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ replacement: '두 번 더 불러 줘' }) })
      .mockResolvedValueOnce({ ok: false, json: async () => ({ error: '요청이 너무 많아요.' }) }) as unknown as typeof fetch;
    render(withI18n(<SingabilityFixAll lyrics={lyrics} style="" getIdToken={getIdToken} onApply={jest.fn()} />));

    fireEvent.click(screen.getByRole('button', { name: '2줄 한 번에 고치기' }));

    expect(await screen.findByText('요청이 너무 많아요.')).toBeInTheDocument();
    expect(screen.getByText('1줄을 고쳤어요. 확인할 곳 2개 → 1개')).toBeInTheDocument();
  });

  it('stays hidden when one line or none needs fixing', () => {
    const { container } = render(
      withI18n(<SingabilityFixAll lyrics={'[Verse]\n3월의 바람이 불어'} style="" getIdToken={getIdToken} onApply={jest.fn()} />)
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('drops a review when the lyrics change underneath it', async () => {
    global.fetch = replyWith({ '3월의 바람이 불어': '삼월의 바람이 불어' }) as unknown as typeof fetch;
    const { rerender } = render(
      withI18n(<SingabilityFixAll lyrics={lyrics} style="" getIdToken={getIdToken} onApply={jest.fn()} />)
    );
    fireEvent.click(screen.getByRole('button', { name: '2줄 한 번에 고치기' }));
    await screen.findByRole('button', { name: '모두 적용' });

    rerender(withI18n(<SingabilityFixAll lyrics={`${lyrics}\n새 줄`} style="" getIdToken={getIdToken} onApply={jest.fn()} />));
    await waitFor(() => expect(screen.queryByRole('button', { name: '모두 적용' })).not.toBeInTheDocument());
  });
});
