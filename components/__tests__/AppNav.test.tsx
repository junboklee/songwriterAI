
import { render, screen } from '@testing-library/react';
import { AppNav } from '../AppNav';

describe('AppNav', () => {
  it('renders the default brand label', () => {
    render(<AppNav />);

    expect(screen.getByText(/Character Studio/i)).toBeInTheDocument();
  });

  it('renders custom actions inside the header', () => {
    render(
      <AppNav
        actions={(
          <button type="button">Open settings</button>
        )}
      />
    );

    expect(screen.getByRole('button', { name: /Open settings/i })).toBeInTheDocument();
  });
});
