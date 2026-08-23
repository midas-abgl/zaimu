import { useEffect, useRef, useState } from "react";

export const useDebouncedInput = (value: string, onChange: (value: string) => void, delay = 300) => {
	const [localValue, setLocalValue] = useState(value);
	const onChangeRef = useRef(onChange);

	useEffect(() => {
		onChangeRef.current = onChange;
	}, [onChange]);

	useEffect(() => {
		setLocalValue(value);
	}, [value]);

	useEffect(() => {
		if (localValue === value) return;
		const timeout = window.setTimeout(() => onChangeRef.current(localValue), delay);
		return () => window.clearTimeout(timeout);
	}, [delay, localValue, value]);

	return [localValue, setLocalValue] as const;
};
