import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Plus, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import useAuthStore from '../store/authStore';
import { timesheetService } from '../services/timesheetService';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import { getWeekDates, formatDate, isoDate, formatHours } from '../utils/formatters';
import { TIMESHEET_STATUS_COLORS, TIMESHEET_STATUS_LABELS } from '../constants';

const TimesheetWeeklyView = () => {
  const navigate = useNavigate();
  const { profile, getFirmId } = useAuthStore();
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const dates = getWeekDates();
    return dates[0];
  });
  const [timesheets, setTimesheets] = useState([]);
  const [loading, setLoading] = useState(true);

  const weekDates = getWeekDates(currentWeekStart);
  const weekStart = isoDate(weekDates[0]);
  const weekEnd = isoDate(weekDates[6]);

  useEffect(() => {
    setLoading(true);
    timesheetService.getWeeklyView(profile?.id, weekStart, weekEnd)
      .then(data => { setTimesheets(data || []); setLoading(false); });
  }, [weekStart, weekEnd]);

  const goToPrevWeek = () => {
    const d = new Date(currentWeekStart);
    d.setDate(d.getDate() - 7);
    setCurrentWeekStart(d);
  };

  const goToNextWeek = () => {
    const d = new Date(currentWeekStart);
    d.setDate(d.getDate() + 7);
    setCurrentWeekStart(d);
  };

  const isCurrentWeek = weekStart <= isoDate() && isoDate() <= weekEnd;
  const isFuture = weekStart > isoDate();

  const getDayEntries = (date) => {
    const dateStr = isoDate(date);
    return timesheets.filter(t => t.date === dateStr);
  };

  const getDayHours = (date) => {
    return getDayEntries(date).reduce((sum, t) => sum + parseFloat(t.hours_worked || 0), 0);
  };

  const totalWeekHours = timesheets.reduce((sum, t) => sum + parseFloat(t.hours_worked || 0), 0);
  const billableHours = timesheets.reduce((sum, t) => sum + (t.is_billable ? parseFloat(t.hours_worked || 0) : 0), 0);

  const draftIds = timesheets.filter(t => t.status === 'draft').map(t => t.id);

  const handleSubmitWeek = async () => {
    if (!draftIds.length) return;
    try {
      await timesheetService.submit(draftIds, getFirmId());
      toast.success(`${draftIds.length} timesheet entries submitted`);
      setLoading(true);
      timesheetService.getWeeklyView(profile?.id, weekStart, weekEnd)
        .then(data => { setTimesheets(data || []); setLoading(false); });
    } catch (err) {
      toast.error(err.message || 'Failed to submit');
    }
  };

  const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-text-primary">Weekly Timesheet View</h2>
        <div className="flex items-center gap-2">
          {draftIds.length > 0 && (
            <Button size="sm" icon={Send} onClick={handleSubmitWeek}>
              Submit Week ({draftIds.length})
            </Button>
          )}
          <Button size="sm" icon={Plus} variant="secondary" onClick={() => navigate('/timesheets/entry')}>
            Log Time
          </Button>
        </div>
      </div>

      {/* Week Navigator */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <button onClick={goToPrevWeek} className="p-2 hover:bg-gray-100 rounded-lg text-text-secondary transition-colors">
            <ChevronLeft size={18} />
          </button>
          <div className="text-center">
            <p className="text-sm font-semibold text-text-primary">
              {formatDate(weekDates[0], 'dd MMM')} – {formatDate(weekDates[6], 'dd MMM yyyy')}
            </p>
            {isCurrentWeek && <span className="text-xs text-info">Current Week</span>}
          </div>
          <button onClick={goToNextWeek} disabled={isFuture}
            className="p-2 hover:bg-gray-100 rounded-lg text-text-secondary disabled:opacity-30 transition-colors">
            <ChevronRight size={18} />
          </button>
        </div>

        {/* Summary */}
        <div className="flex items-center gap-6 pb-4 border-b border-border mb-4">
          <div>
            <p className="text-xs text-text-secondary">Total Hours</p>
            <p className="text-lg font-bold text-text-primary">{formatHours(totalWeekHours)}</p>
          </div>
          <div>
            <p className="text-xs text-text-secondary">Billable</p>
            <p className="text-lg font-bold text-success">{formatHours(billableHours)}</p>
          </div>
          <div>
            <p className="text-xs text-text-secondary">Non-Billable</p>
            <p className="text-lg font-bold text-text-secondary">{formatHours(totalWeekHours - billableHours)}</p>
          </div>
          <div>
            <p className="text-xs text-text-secondary">Entries</p>
            <p className="text-lg font-bold text-text-primary">{timesheets.length}</p>
          </div>
        </div>

        {/* Day Grid */}
        <div className="grid grid-cols-7 gap-2">
          {weekDates.map((date, idx) => {
            const dateStr = isoDate(date);
            const dayEntries = getDayEntries(date);
            const dayHours = getDayHours(date);
            const isToday = dateStr === isoDate();
            const isFutureDay = dateStr > isoDate();
            const isWeekend = idx >= 5;

            return (
              <div key={dateStr} className={`rounded-lg border p-2 min-h-24 ${isToday ? 'border-primary bg-primary-50' : isWeekend ? 'bg-gray-50/50 border-border' : 'border-border bg-white'}`}>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className={`text-xs font-medium ${isToday ? 'text-primary' : 'text-text-secondary'}`}>{DAYS[idx]}</p>
                    <p className={`text-sm font-bold ${isToday ? 'text-primary' : 'text-text-primary'}`}>{formatDate(date, 'd')}</p>
                  </div>
                  {dayHours > 0 && (
                    <span className={`text-xs font-semibold ${dayHours >= 8 ? 'text-success' : 'text-warning'}`}>
                      {formatHours(dayHours)}
                    </span>
                  )}
                </div>

                <div className="space-y-1">
                  {dayEntries.map(t => (
                    <div key={t.id} className="text-xs bg-white border border-border rounded p-1.5">
                      <p className="font-medium text-text-primary truncate">{t.clients?.client_name}</p>
                      <div className="flex items-center justify-between mt-0.5">
                        <span className="text-text-secondary">{formatHours(t.hours_worked)}</span>
                        <Badge className={`${TIMESHEET_STATUS_COLORS[t.status]} text-[9px] px-1 py-0`}>
                          {TIMESHEET_STATUS_LABELS[t.status]}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>

                {!isFutureDay && (
                  <button
                    onClick={() => navigate(`/timesheets/entry?date=${dateStr}`)}
                    className="w-full mt-1.5 text-xs text-primary hover:text-primary-600 font-medium py-1 hover:bg-primary-50 rounded transition-colors"
                  >
                    + Add
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
};

export default TimesheetWeeklyView;
