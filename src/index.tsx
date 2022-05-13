import React, { FunctionComponent, useCallback, useEffect, useState } from 'react';
import Calendar, {
  CalendarData,
  createCalendarTheme,
  Props as CalendarProps,
  Skeleton,
} from 'react-activity-calendar';

import { API_URL, DEFAULT_THEME } from './constants';
import { ApiErrorResponse, ApiResponse, Year } from './types';
import { transformData } from './utils';

type DataProvider = 'github' | 'gitlab';

export interface Props extends Omit<CalendarProps, 'data'> {
  username: string;
  year?: Year;
  transformData?: (data: CalendarData) => CalendarData;
	provider?: DataProvider;
}

const fetchDataFromProvider = async (username: string, year: Year, provider: DataProvider): Promise<[Response, ApiResponse | ApiErrorResponse]> => {
	switch (provider) {
		case 'github': {
			const response = await fetch(`${API_URL}${username}?y=${year}`);
			const data: ApiResponse | ApiErrorResponse = await response.json();
			return [response, data];
		}
		case 'gitlab': {
			const response = await fetch(`https://gitlab.com/users/${username}/calendar.json`);
			const data: ApiResponse | ApiErrorResponse = await response.json();
			return [response, data];
		}
	}
}

async function fetchCalendarData(username: string, year: Year, provider: DataProvider): Promise<ApiResponse> {
	const [response, data] = await fetchDataFromProvider(username, year, provider);

  if (!response.ok) {
    throw new Error((data as ApiErrorResponse).error);
  }

  return data as ApiResponse;
}

const GitHubCalendar: FunctionComponent<Props> = ({
  username,
  year = 'last',
  transformData: transformDataProp,
	provider = 'github',
  ...props
}) => {
  const [data, setData] = useState<CalendarData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const transformDataCallback = useCallback(
    (contributions: CalendarData) => transformData(contributions, transformDataProp),
    [transformDataProp],
  );

  const fetchData = useCallback(() => {
    setLoading(true);
    setError(null);
    fetchCalendarData(username, year, provider)
      .then(({ contributions }) => setData(transformDataCallback(contributions)))
      .catch(setError)
      .finally(() => setLoading(false));
  }, [username, year, transformDataCallback]);

  useEffect(fetchData, [fetchData]);

  if (error) {
    return (
      <div>
        <i>Unable to fetch contribution data. See console.</i>
      </div>
    );
  }

  if (loading || !data) {
    return <Skeleton {...props} loading />;
  }

  const theme = props.color ? undefined : props.theme ?? DEFAULT_THEME;

  const labels = {
    totalCount: `{{count}} contributions in ${year === 'last' ? 'the last year' : '{{year}}'}`,
  };

  return <Calendar data={data} theme={theme} labels={labels} {...props} />;
};

export { createCalendarTheme };
export default GitHubCalendar;
