import useSWR from 'swr/immutable';

import { defaultSetting } from './setting';
import { Setting, Theme, TimelineItem } from './types';
import { useMemo } from 'react';

const REFRESH_INTERVAL = 60000;

const fetcher = async (path: string) => {
  const response = await fetch(path, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error('');
  }
  return await response.json();
};

export const useSetting = (theme: string | null, isDemo: boolean) => {
  const path = `${process.env.REACT_APP_PATH_PREFIX}/theme/${theme}/setting.json`;
  const refreshInterval = isDemo ? 500 : REFRESH_INTERVAL;
  const {
    isLoading,
    data: rawSetting,
    error,
  } = useSWR<Setting>(path, fetcher, { refreshInterval, dedupingInterval: refreshInterval });

  if (isLoading || !rawSetting || !!error) {
    return { isLoading, setting: undefined, hasError: !!error };
  }

  const setting: Setting = { ...defaultSetting, ...rawSetting };

  return { isLoading, setting };
};

export const useThemes = () => {
  const path = `${process.env.REACT_APP_PATH_PREFIX}/api/themes`;
  const {
    isLoading,
    data: themes,
    error,
  } = useSWR<Theme[]>(path, fetcher, { refreshInterval: REFRESH_INTERVAL, dedupingInterval: REFRESH_INTERVAL });

  if (isLoading || !themes || !!error) {
    return { isLoading, themes: undefined, hasError: !!error };
  }

  return { isLoading, data: themes, hasError: !!error };
};

export const useTimelineInfo = (
  rawTimeline: TimelineItem[],
  pbTimeline: TimelineItem[],
  labels: { [key: string]: string },
) => {
  const timeline = useMemo(() => {
    const targetTypes = new Set([...Object.keys(labels), ...(pbTimeline.map((item) => item.type) ?? [])]);
    return rawTimeline.filter((item) => targetTypes.has(item.type));
  }, [labels, pbTimeline, rawTimeline]);

  // 'bf': bastion -> fortress, 'fb': fortress -> bastion
  const pbTimelinePattern = useMemo(() => getTimelinePattern(pbTimeline || []), [pbTimeline]);
  const timelinePattern = useMemo(() => getTimelinePattern(timeline), [timeline]);

  const displayItemTypes = useMemo(() => {
    return [...timeline.map((item) => item.type), ...(pbTimeline.map((item) => item.type) ?? [])].filter(
      (item, index, self) => self.indexOf(item) === index,
    );
  }, [pbTimeline, timeline]);

  return { timeline, pbTimelinePattern, timelinePattern, displayItemTypes };
};

const getTimelinePattern = (timeline: TimelineItem[]) => {
  const enterBastionIndex = timeline.findIndex((item) => item.type === 'enter_bastion');
  const enterFortressIndex = timeline.findIndex((item) => item.type === 'enter_fortress');

  if (enterBastionIndex >= 0 && enterFortressIndex >= 0) {
    return enterBastionIndex < enterFortressIndex ? 'bf' : 'fb';
  } else if (enterFortressIndex >= 0) {
    return 'fb' as const;
  }
  return 'bf' as const;
};
