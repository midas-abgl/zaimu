import { DateRangePicker } from "@/components/ui/DateRangePicker";
import type { DateRangeValue } from "@/components/ui/DateRangePicker/types";

interface DashboardDateFilterProps {
	onChange: (value: DateRangeValue) => void;
	value: DateRangeValue;
}

export function DashboardDateFilter({ onChange, value }: DashboardDateFilterProps) {
	return <DateRangePicker onChange={onChange} value={value} />;
}
