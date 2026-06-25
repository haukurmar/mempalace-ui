import type { ChangeEvent, FocusEvent, FormEvent, KeyboardEvent, Ref } from "react";

export type SearchFieldProps = {
	value: string;
	onChange: (next: string) => void;
	onSubmit?: (query: string) => void;
	onClear?: () => void;
	onFocus?: (event: FocusEvent<HTMLInputElement>) => void;
	onKeyDown?: (event: KeyboardEvent<HTMLInputElement>) => void;
	placeholder?: string;
	ariaLabel?: string;
	formAriaLabel?: string;
	autoFocus?: boolean;
	className?: string;
	inputRef?: Ref<HTMLInputElement>;
};

export type SearchFieldChangeEvent = ChangeEvent<HTMLInputElement>;
export type SearchFieldSubmitEvent = FormEvent<HTMLFormElement>;
