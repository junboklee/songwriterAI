import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { ComingSoonActions } from '@/components/chat/ComingSoonActions';
import { trackEvent } from '@/lib/analytics';

jest.mock('@/lib/analytics', () => ({ trackEvent: jest.fn() }));
jest.mock('@/lib/firebase', () => ({
  auth: { currentUser: { getIdToken: jest.fn().mockResolvedValue('token') } }
}));

describe('ComingSoonActions', () => {
  it('records interest for the clicked feature and thanks the user', async () => {
    const fetchMock = jest.fn().mockResolvedValue({ ok: true });
    global.fetch = fetchMock as unknown as typeof fetch;
    render(<ComingSoonActions />);

    fireEvent.click(screen.getByRole('button', { name: /다연이 불러 주기/ }));

    expect(trackEvent).toHaveBeenCalledWith('feature_interest', { feature: 'sing' });
    expect(screen.getByRole('status')).toHaveTextContent('다연이 직접 불러 주는 기능을 준비하고 있어요');
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/interest',
        expect.objectContaining({ method: 'POST', body: JSON.stringify({ feature: 'sing' }) })
      )
    );
  });

  it('labels both buttons as not available yet', () => {
    render(<ComingSoonActions />);
    expect(screen.getAllByText('준비 중')).toHaveLength(2);
  });
});
