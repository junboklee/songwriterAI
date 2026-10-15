import { render, screen } from '@testing-library/react';

import { ErrorBoundary } from '@/components/ErrorBoundary';
import { reportClientError } from '@/lib/errorReporting';

jest.mock('@/lib/errorReporting', () => ({ reportClientError: jest.fn() }));

function Broken(): JSX.Element {
  throw new Error('render failed');
}

describe('ErrorBoundary', () => {
  it('shows a recovery screen and reports the crash', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    render(
      <ErrorBoundary>
        <Broken />
      </ErrorBoundary>
    );
    spy.mockRestore();

    expect(screen.getByRole('alert').textContent).toContain('문제가 생겼어요');
    expect(reportClientError).toHaveBeenCalledWith('react', expect.objectContaining({ message: 'render failed' }));
  });
});
