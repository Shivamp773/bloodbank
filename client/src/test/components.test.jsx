import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import DataTable from '../components/ui/DataTable.jsx';
import WebsiteLink from '../components/ui/WebsiteLink.jsx';
import { displayName, formatMl, toSafeUrl } from '../utils/format.js';

describe('DataTable', () => {
  const columns = [
    { key: 'name', header: 'Name' },
    { key: 'quantity', header: 'Quantity', render: (row) => formatMl(row.quantity) },
  ];

  it('shows the empty message when there are no rows', () => {
    render(<DataTable columns={columns} rows={[]} emptyMessage="Nothing here" />);
    expect(screen.getByText('Nothing here')).toBeInTheDocument();
  });

  it('renders rows with custom cell renderers', () => {
    render(<DataTable columns={columns} rows={[{ _id: '1', name: 'O+', quantity: 1500 }]} />);
    expect(screen.getByText('O+')).toBeInTheDocument();
    expect(screen.getByText(`${(1500).toLocaleString()} ml`)).toBeInTheDocument();
  });

  it('shows the error with a retry button', () => {
    render(<DataTable columns={columns} rows={null} error="Server down" onRetry={() => {}} />);
    expect(screen.getByText('Server down')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });
});

describe('links to user-entered websites', () => {
  it('never turns a javascript: value into a script link', () => {
    expect(toSafeUrl('javascript:alert(1)')).toBe('https://javascript:alert(1)');
    expect(toSafeUrl('www.example.com')).toBe('https://www.example.com');
    expect(toSafeUrl('http://example.com')).toBe('http://example.com');
    expect(toSafeUrl('  ')).toBeNull();
  });

  it('opens websites in a new tab without giving the page access to the opener', () => {
    render(<WebsiteLink url="example.com" />);
    const link = screen.getByRole('link', { name: 'example.com' });
    expect(link).toHaveAttribute('href', 'https://example.com');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });
});

describe('displayName', () => {
  it('uses whichever name field the role has', () => {
    expect(displayName({ name: 'Asha' })).toBe('Asha');
    expect(displayName({ hospitalName: 'St. Mary' })).toBe('St. Mary');
    expect(displayName({ organisationName: 'City Blood Bank' })).toBe('City Blood Bank');
    expect(displayName(null)).toBe('Deleted account');
  });
});
