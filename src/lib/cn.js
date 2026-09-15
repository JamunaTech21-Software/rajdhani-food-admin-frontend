import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// Lives here rather than in @shared because that folder must stay
// dependency-free — see src/shared/README.md.
export const cn = (...inputs) => twMerge(clsx(inputs));
