
import { render, screen } from '@testing-library/react';
import { AppNav } from '../AppNav';

describe('AppNav', () => {
  it('renders the logo and title', () => {
    render(<AppNav />);

    const titleElement = screen.getByText(/Character Studio/i);
    expect(titleElement).toBeTruthy();

    const logoElement = screen.getByText(/CAI/i);
    expect(logoElement).toBeTruthy();
  });
});
