import { render, screen } from '@testing-library/react';
import App from './App';

test('renders the Fallow wordmark', () => {
  render(<App />);
  expect(screen.getAllByText(/fallow/i).length).toBeGreaterThan(0);
});
