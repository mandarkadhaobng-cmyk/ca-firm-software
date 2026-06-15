import { useState, useEffect } from 'react';
import { Download, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import * as payrollService from '../services/payrollService';
import { formatCurrency } from '../../utils/formatters';

const MONTHS = ['January','February','March','April','May','June',
                 'July','August','September','October','November','December'];

const MyPayslips = () => {
  const [slips, setSlips]   = useState([]);
  const [total, setTotal]   = useState(0);
  const [page, setPage]     = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    payrollService.getMySlips({ page, limit: 12 })
      .then(res => { setSlips(res.data || []); setTotal(res.total || 0); })
      .catch(() => toast.error('Failed to load payslips'))
      .finally(() => setLoading(false));
  }, [page]);

  const handleDownload = async (slipId, month, year) => {
    try {
      await payrollService.downloadSlipPdf(slipId);
    } catch { toast.error('Download failed'); }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-text-primary">My Payslips</h1>
        <p className="text-sm text-text-secondary mt-0.5">{total} slip{total !== 1 ? 's' : ''} available</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_,i) => <div key={i} className="h-28 bg-gray-100 animate-pulse rounded-xl" />)}
        </div>
      ) : slips.length === 0 ? (
        <div className="text-center py-16 text-text-secondary">
          <FileText size={36} className="mx-auto mb-3 opacity-30" />
          <p>No payslips yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {slips.map(slip => (
            <div key={slip.id} className="theme-card border border-border rounded-xl p-4 hover:shadow-sm transition-shadow"
                 style={{ backgroundColor: 'var(--card-bg)' }}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-semibold text-text-primary">{MONTHS[(slip.month||1)-1]} {slip.year}</p>
                  <p className="text-xs text-text-secondary mt-0.5">
                    {slip.present_days}/{slip.working_days} days present
                  </p>
                </div>
                <button
                  onClick={() => handleDownload(slip.id, slip.month, slip.year)}
                  className="p-1.5 rounded-md hover:bg-primary/10 text-primary transition-colors"
                  title="Download PDF"
                >
                  <Download size={16} />
                </button>
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-text-secondary">Gross</span>
                  <span>{formatCurrency(slip.monthly_salary)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Deductions</span>
                  <span className="text-error">-{formatCurrency(slip.absent_deduction)}</span>
                </div>
                {parseFloat(slip.reimbursement) > 0 && (
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Reimbursement</span>
                    <span className="text-green-600">+{formatCurrency(slip.reimbursement)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-border pt-1 mt-1">
                  <span className="font-medium">Net Pay</span>
                  <span className="font-bold text-green-600">{formatCurrency(slip.final_salary)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {total > 12 && (
        <div className="flex justify-center gap-2">
          <button disabled={page === 1} onClick={() => setPage(p => p-1)}
            className="px-3 py-1.5 rounded-lg border text-sm disabled:opacity-40 hover:border-primary transition-colors">
            Prev
          </button>
          <span className="px-3 py-1.5 text-sm text-text-secondary">Page {page}</span>
          <button disabled={slips.length < 12} onClick={() => setPage(p => p+1)}
            className="px-3 py-1.5 rounded-lg border text-sm disabled:opacity-40 hover:border-primary transition-colors">
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default MyPayslips;
