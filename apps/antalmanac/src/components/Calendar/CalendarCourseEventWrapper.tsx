import { Box } from '@mui/material';
import { useCallback, useEffect, useRef } from 'react';
import { EventWrapperProps } from 'react-big-calendar';
import { shallow } from 'zustand/shallow';

import type { CalendarEventProps } from '$components/Calendar/CalendarEventPopoverContent';
import { useQuickSearchForClasses } from '$lib/helpers';
import { useSelectedEventStore } from '$stores/SelectedEventStore';

interface CalendarEventWrapperProps extends EventWrapperProps<CalendarEventProps> {
    children?: React.ReactNode;
}

/**
 * This component allows us to override the default onClick event behavior which problamtically rerenders the entire calendar
 */
export const CalendarEventWrapper = ({ children, ...props }: CalendarEventWrapperProps) => {
    const ref = useRef<HTMLDivElement>(null);
    const quickSearch = useQuickSearchForClasses();

    const setSelectedEvent = useSelectedEventStore((state) => state.setSelectedEvent, shallow);

    const handleClick = useCallback(
        (e: React.MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();

            if (props.event && !props.event.isCustomEvent && (e.metaKey || e.ctrlKey)) {
                const courseInfo = props.event;
                quickSearch(courseInfo.deptValue, courseInfo.courseNumber, courseInfo.term);
            } else {
                setSelectedEvent(e, props.event);
            }
        },
        [props.event, setSelectedEvent]
    );

    useEffect(() => {
        const node = ref.current;
        if (!node) {
            return;
        }

        const rbcEvent = node.querySelector('.rbc-event') as HTMLDivElement;
        if (!rbcEvent) {
            return;
        }

        rbcEvent.onclick = (e) => handleClick(e as unknown as React.MouseEvent); // the native onclick requires a little type hacking
    }, [handleClick]);

    return <Box ref={ref}>{children}</Box>;
};
