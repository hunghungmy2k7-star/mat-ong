import { useEffect, useMemo, useState } from 'react';
import { Box, Flex, Text, Tooltip } from '@chakra-ui/react';
import { api } from '../api';

const SCALE = ['#EDE9FE', '#C4B5FD', '#A78BFA', '#8B5CF6', '#7C3AED'];
const DOW = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
const color = (n) => (!n ? SCALE[0] : n === 1 ? SCALE[1] : n <= 3 ? SCALE[2] : n <= 6 ? SCALE[3] : SCALE[4]);

function addDays(day, n) {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
const label = (day) => {
  const d = new Date(`${day}T00:00:00Z`);
  return `${['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'][d.getUTCDay()]}, ${d.getUTCDate()} thg ${d.getUTCMonth() + 1}`;
};

/** Lịch hoạt động kiểu GitHub (cột = tuần, hàng = thứ) */
export default function ActivityHeatmap({ userId, data: given }) {
  const [data, setData] = useState(given || null);
  useEffect(() => {
    if (given) { setData(given); return; }
    api(`/activity/calendar${userId ? `?userId=${userId}` : ''}`).then(setData).catch(() => {});
  }, [userId, given]);

  const weeks = useMemo(() => {
    if (!data) return [];
    const start = new Date(`${data.from}T00:00:00Z`);
    let cur = addDays(data.from, -((start.getUTCDay() + 6) % 7)); // bắt đầu từ thứ Hai
    const out = [];
    while (cur <= data.today) {
      const week = [];
      for (let i = 0; i < 7; i += 1) {
        week.push(cur <= data.today ? cur : null);
        cur = addDays(cur, 1);
      }
      out.push(week);
    }
    return out;
  }, [data]);

  if (!data) return <Box h="150px" />;
  return (
    <Box overflowX="auto" data-testid="heatmap">
      <Flex gap="3px" pl="22px" mb="4px">
        {weeks.map((w, i) => {
          const first = w[0];
          const show = first && (i === 0 || new Date(`${first}T00:00:00Z`).getUTCDate() <= 7);
          return <Box key={i} w="16px" flexShrink={0} fontSize="11px" color="app.muted" whiteSpace="nowrap">{show ? `Thg ${Number(first.slice(5, 7))}` : ''}</Box>;
        })}
      </Flex>
      <Flex gap="3px">
        <Flex direction="column" gap="3px" w="19px">
          {[1, 2, 3, 4, 5, 6, 0].map((d, i) => <Text key={d} h="16px" fontSize="10px" color="app.muted" lineHeight="16px">{i % 2 === 0 ? DOW[d] : ''}</Text>)}
        </Flex>
        {weeks.map((w, i) => (
          <Flex key={i} direction="column" gap="3px">
            {w.map((day, j) => day ? (
              <Tooltip key={day} label={`${label(day)}: ${data.days[day] || 0} lần học`} hasArrow openDelay={150}>
                <Box w="16px" h="16px" borderRadius="2px" bg={color(data.days[day])} outline={day === data.today ? '2px solid #7C3AED' : 'none'} />
              </Tooltip>
            ) : <Box key={`e${j}`} w="16px" h="16px" />)}
          </Flex>
        ))}
      </Flex>
      <Flex justify="flex-end" align="center" gap="3px" mt="8px" fontSize="11px" color="app.muted">
        <Text mr="4px">Ít</Text>{SCALE.map((c) => <Box key={c} w="12px" h="12px" borderRadius="2px" bg={c} />)}<Text ml="4px">Nhiều</Text>
      </Flex>
    </Box>
  );
}
