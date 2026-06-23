import React, { memo, useMemo } from 'react';
import { Card } from 'react-bootstrap';

const EnquiryStats = memo(({ enquiries }) => {
    // Safe fallback to prevent errors if enquiries is undefined
    const safe = useMemo(
        () => ({
            day: enquiries?.day ?? 0,
            week: enquiries?.week ?? 0,
            month: enquiries?.month ?? 0,
        }),
        [enquiries]
    );

    return (
        <Card className="h-100 border-0 shadow-sm">
            <Card.Body>
                <div className="text-muted small">Enquiries</div>
                <div className="mt-2">
                    <div className="d-flex justify-content-between">
                        <span>Today</span>
                        <span className="fw-bold">{safe.day}</span>
                    </div>
                    <div className="d-flex justify-content-between mt-1">
                        <span>This Week</span>
                        <span className="fw-bold">{safe.week}</span>
                    </div>
                    <div className="d-flex justify-content-between mt-1">
                        <span>This Month</span>
                        <span className="fw-bold">{safe.month}</span>
                    </div>
                </div>
            </Card.Body>
        </Card>
    );
});

EnquiryStats.displayName = 'EnquiryStats';

export default EnquiryStats;