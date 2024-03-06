import { Link } from 'react-router-dom';
import { Box, Paper, Tab, Tabs, Typography } from '@material-ui/core';
import { FormatListBulleted, MyLocation, Search } from '@material-ui/icons';
import React, { Suspense } from 'react';

import AddedCoursePane from './AddedCourses/AddedCoursePane';
import CoursePane from './CoursePane/CoursePaneRoot';
import darkModeLoadingGif from './CoursePane/SearchForm/Gifs/dark-loading.gif';
import loadingGif from './CoursePane/SearchForm/Gifs/loading.gif';
import { useTabStore } from '$stores/TabStore';
import { darkModePalette, useThemeStore } from '$stores/SettingsStore';

const UCIMap = React.lazy(() => import('../Map'));

const styles = {
    fallback: {
        height: '100%',
        width: '100%',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
    },
};

interface DesktopTabsProps {
    style: Record<string, unknown>;
}

interface TabInfo {
    label: string;
    href: string;
    icon: React.ElementType;
    id?: string;
}

const tabs: Array<TabInfo> = [
    {
        label: 'Search',
        href: '/',
        icon: Search,
    },
    {
        label: 'Added',
        href: '/added',
        icon: FormatListBulleted,
        id: 'added-courses-tab',
    },
    {
        label: 'Map',
        href: '/map',
        icon: MyLocation,
        id: 'map-tab',
    },
];

export default function Desktop({ style }: DesktopTabsProps) {
    const { activeTab, setActiveTab } = useTabStore();

    const isDark = useThemeStore((store) => store.isDark);

    return (
        <Box style={{ ...style, margin: '0 4px' }}>
            <Paper
                elevation={0}
                variant="outlined"
                square
                style={{ borderRadius: '4px 4px 0 0', backgroundColor: isDark ? darkModePalette.DARK_SECTION_HEADER_BACKGROUND : '' }}
            >
                <Tabs
                    value={activeTab}
                    onChange={(_event, value) => setActiveTab(value)}
                    indicatorColor="primary"
                    variant="fullWidth"
                    centered
                    style={{ height: '48px' }}
                >
                    {tabs.map((tab) => (
                        <Tab
                            key={tab.label}
                            component={Link}
                            label={
                                <div style={{ display: 'inline-flex', alignItems: 'center' }}>
                                    <tab.icon style={{ height: 16 }} />
                                    <Typography variant="body2">{tab.label}</Typography>
                                </div>
                            }
                            to={tab.href}
                            style={{ minHeight: 'auto', height: '44px', padding: 3, minWidth: '33%' }}
                            id={tab.id}
                        />
                    ))}
                </Tabs>
            </Paper>
            <Box height="calc(100% - 54px)" overflow="auto" style={{ margin: '8px 4px 0px' }} id="course-pane-box">
                {activeTab === 0 && <CoursePane />}
                {activeTab === 1 && <AddedCoursePane />}
                {activeTab === 2 && (
                    <Suspense
                        fallback={
                            <div style={styles.fallback}>
                                <img src={isDark ? darkModeLoadingGif : loadingGif} alt="Loading map" />
                            </div>
                        }
                    >
                        <UCIMap />
                    </Suspense>
                )}
            </Box>
        </Box>
    );
}
