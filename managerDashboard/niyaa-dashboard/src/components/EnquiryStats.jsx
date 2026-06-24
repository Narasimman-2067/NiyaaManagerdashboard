import React, { memo, useMemo } from 'react';
import { Card } from 'react-bootstrap';

/**
 * EnquiryStats
 * ----------------------------------------------------------------------------
 * Displays enquiry counts for:
 * - Today
 * - This Week
 * - This Month
 *
 * Supported prop shapes:
 * 1) { day: number, week: number, month: number }
 * 2) undefined / null / invalid -> safely falls back to 0 values
 */
const EnquiryStats = memo(function EnquiryStats({ enquiries }) {
  /**
   * Normalize enquiry stats into a guaranteed safe object.
   * This prevents UI crashes if parent passes null, array, or malformed data.
   */
  const stats = useMemo(() => {
    if (!enquiries || typeof enquiries !== 'object' || Array.isArray(enquiries)) {
      return { day: 0, week: 0, month: 0 };
    }

    return {
      day: Number.isFinite(Number(enquiries.day)) ? Number(enquiries.day) : 0,
      week: Number.isFinite(Number(enquiries.week)) ? Number(enquiries.week) : 0,
      month: Number.isFinite(Number(enquiries.month)) ? Number(enquiries.month) : 0,
    };
  }, [enquiries]);

  return (
    <Card className="h-100 border-0 shadow-sm">
      <Card.Body>
        <div className="text-muted small fw-medium">Enquiries</div>

        <div className="mt-3 d-flex flex-column gap-2">
          <div className="d-flex justify-content-between align-items-center">
            <span>Today</span>
            <span className="fw-bold">{stats.day}</span>
          </div>

          <div className="d-flex justify-content-between align-items-center">
            <span>This Week</span>
            <span className="fw-bold">{stats.week}</span>
          </div>

          <div className="d-flex justify-content-between align-items-center">
            <span>This Month</span>
            <span className="fw-bold">{stats.month}</span>
          </div>
        </div>
      </Card.Body>
    </Card>
  );
});

EnquiryStats.displayName = 'EnquiryStats';

export default EnquiryStats;