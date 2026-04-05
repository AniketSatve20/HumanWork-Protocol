import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

function SmokeComponent() {
  return <div>frontend smoke test</div>;
}

describe('frontend smoke test', () => {
  it('renders without crashing', () => {
    render(<SmokeComponent />);
    expect(screen.getByText('frontend smoke test')).toBeTruthy();
  });
});
