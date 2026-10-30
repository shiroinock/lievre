// Pagination on its own. It lives apart from the DataTable tests: a file that pages with a
// Pagination beside a sortable DataTable is what lievre/table-pagination stops.
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import { useState } from 'react';
import { LievreProvider, Pagination } from '../index';

describe('Pagination', () => {
  it('keeps focus in the pagination when the pressed button turns disabled', async () => {
    function Pager() {
      const [page, setPage] = useState(2);
      return <Pagination page={page} totalPages={3} onPageChange={setPage} />;
    }
    render(
      <LievreProvider>
        <Pager />
      </LievreProvider>,
    );
    const next = screen.getByRole('button', { name: '次のページ' });
    await userEvent.click(next);
    expect(next).toBeDisabled();
    expect(screen.getByRole('button', { name: '前のページ' })).toHaveFocus();
    expect(screen.getByRole('status')).toHaveTextContent('3ページ中 3ページ目');
    await userEvent.click(screen.getByRole('button', { name: '前のページ' }));
    expect(screen.getByRole('button', { name: '前のページ' })).toHaveFocus();
  });
  it('reads the page as words, not as "2 / 5"', () => {
    render(
      <LievreProvider>
        <Pagination page={2} totalPages={5} onPageChange={() => {}} />
      </LievreProvider>,
    );
    expect(screen.getByRole('status')).toHaveTextContent('5ページ中 2ページ目');
    expect(screen.getByText('2 / 5')).toHaveAttribute('aria-hidden', 'true');
  });
});
