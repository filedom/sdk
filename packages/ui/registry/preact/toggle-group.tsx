import { createContext, type ButtonHTMLAttributes, type ComponentChildren, type HTMLAttributes } from "preact";
import { useContext } from "preact/hooks";
import { cn, plainClass, slotName } from "@/lib/cn";

const GroupContext = createContext<{ value?: string; onValueChange?: (value: string) => void }>({});

type ToggleGroupProps = HTMLAttributes<HTMLDivElement> & {
  value?: string;
  onValueChange?: (value: string) => void;
  children?: ComponentChildren;
};

export function ToggleGroup({ value, onValueChange, className, children, ...props }: ToggleGroupProps) {
  return (
    <GroupContext.Provider value={{ value, onValueChange }}>
      <div
        role="group"
        {...props}
        data-slot={slotName(props, "toggle-group")}
        className={cn("inline-flex items-center gap-0.5", plainClass(className))}
      >
        {children}
      </div>
    </GroupContext.Provider>
  );
}

type ToggleGroupItemProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  value: string;
};

export function ToggleGroupItem({ value, className, children, onClick, ...props }: ToggleGroupItemProps) {
  const group = useContext(GroupContext);
  const pressed = group.value === value;
  return (
    <button
      type="button"
      aria-pressed={pressed}
      {...props}
      data-slot={slotName(props, "toggle-group-item")}
      data-pressed={pressed ? "true" : "false"}
      className={cn(
        "inline-flex h-8 items-center rounded-md px-2 text-sm hover:bg-accent data-[pressed=true]:bg-accent",
        plainClass(className),
      )}
      onClick={(event) => {
        onClick?.(event);
        group.onValueChange?.(value);
      }}
    >
      {children}
    </button>
  );
}
