import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useState } from "react";
import { Button } from "../ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { CheckIcon, ChevronDownIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "../ui/input";

interface LocationComboBoxProps {
  name: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  marginBottom?: number;
  // Optional fields say so in the placeholder and can be cleared by
  // selecting the current value again.
  optional?: boolean;
}

const LocationComboBox = ({
  name,
  value,
  onChange,
  options,
  marginBottom = 4,
  optional = false,
}: LocationComboBoxProps) => {
  const [open, setOpen] = useState(false);
  const placeholder = `Select a ${name}${optional ? " (optional)" : ""}`;
  return (
    <div className={`mb-${marginBottom}`}>
      <Input name={name} value={value} type="hidden" />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            className={cn(
              "w-full justify-between font-normal",
              !value && "text-muted-foreground"
            )}
          >
            {value ? value : placeholder}
            <ChevronDownIcon className="size-4 text-muted-foreground opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="p-0"
          style={{ width: "var(--radix-popover-trigger-width)" }}
        >
          <Command>
            <CommandInput placeholder={placeholder} className="h-9" />
            <CommandList>
              <CommandEmpty>No {name} found.</CommandEmpty>
              <CommandGroup>
                {options.map((option) => (
                  <CommandItem
                    value={option}
                    key={option}
                    onSelect={(currentValue) => {
                      onChange(
                        optional && currentValue === value ? "" : currentValue
                      );
                      setOpen(false);
                    }}
                  >
                    {option}
                    <CheckIcon
                      className={cn(
                        "ml-auto",
                        option === value ? "opacity-100" : "opacity-0"
                      )}
                    />
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default LocationComboBox;
