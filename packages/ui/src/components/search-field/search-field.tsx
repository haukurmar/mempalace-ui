import { Search, X } from "lucide-react";
import type { ChangeEvent, FC, FormEvent } from "react";
import { cn } from "../../lib/utils";
import { Input } from "../../primitives";
import type { SearchFieldProps } from "./search-field.types";

export const SearchField: FC<SearchFieldProps> = (props) => {
	const {
		value,
		onChange,
		onSubmit,
		onClear,
		onFocus,
		onKeyDown,
		placeholder,
		ariaLabel,
		formAriaLabel,
		autoFocus,
		className,
		inputRef,
	} = props;

	const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (!onSubmit) return;
		const trimmed = value.trim();
		if (trimmed.length === 0) return;
		onSubmit(trimmed);
	};

	const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
		onChange(event.target.value);
	};

	const handleClear = () => {
		onChange("");
		onClear?.();
	};

	return (
		<form onSubmit={handleSubmit} aria-label={formAriaLabel} className={cn("relative", className)}>
			<Search
				aria-hidden="true"
				className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-secondary-500"
			/>
			<Input
				ref={inputRef}
				type="search"
				value={value}
				onChange={handleChange}
				onFocus={onFocus}
				onKeyDown={onKeyDown}
				placeholder={placeholder}
				aria-label={ariaLabel}
				autoFocus={autoFocus}
				className="h-10 pl-9 pr-9"
			/>
			{value.length > 0 ? (
				<button
					type="button"
					onClick={handleClear}
					aria-label="Clear search"
					className="absolute right-2 top-1/2 inline-flex size-6 -translate-y-1/2 items-center justify-center rounded text-secondary-500 hover:bg-secondary-100 hover:text-primary-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400"
				>
					<X aria-hidden="true" className="size-4" />
				</button>
			) : null}
		</form>
	);
};
