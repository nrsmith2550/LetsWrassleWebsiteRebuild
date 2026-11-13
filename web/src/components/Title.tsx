/** The handwritten accent word, like the "Let's" in the logo. Use inside a heading, before the block capitals. */
export function Script({ children }: { children: React.ReactNode }) {
  return <span className="mr-[0.22em] inline-block font-script text-[1.15em] font-normal normal-case leading-[0.7] tracking-normal">{children}</span>;
}
