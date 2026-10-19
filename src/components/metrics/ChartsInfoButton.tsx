"use client";

import { Info } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "../ui/button";

// Instructions for the charts panel. Rendered next to the View Charts button in
// both the admin and teacher filter forms, so the two stay in sync.
const ChartsInfoButton = ({ isTeacher = false }: { isTeacher?: boolean }) => {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8 self-end text-muted-foreground"
          aria-label="How to use charts"
        >
          <Info className="size-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="max-h-[70vh] w-96 overflow-y-auto text-sm"
      >
        <p className="mb-2 font-medium">How to view charts</p>
        <ol className="list-decimal space-y-2 pl-4 text-muted-foreground marker:text-foreground/60">
          <li>
            <span className="text-foreground">Form</span>: choose one
            curriculum. Charts show one at a time.
          </li>
          <li>
            <span className="text-foreground">Start Date</span> and{" "}
            <span className="text-foreground">End Date</span>: the window to
            analyse, e.g. the first and last day you taught it.
          </li>
          <li>
            <span className="text-foreground">View Charts</span>: two more
            options then appear above the charts:
            <ul className="mt-1 list-disc space-y-1 pl-4">
              <li>
                <span className="text-foreground">Survey Type</span>:
                pre-survey, post-survey, or both side by side.
              </li>
              <li>
                <span className="text-foreground">Form Version</span>: shown
                only if the form has more than one version. Pick Current for
                data from 1 Jan 2025 onward, when the questions were updated.
              </li>
            </ul>
          </li>
          <li>
            Click any question to view it on its own;{" "}
            <span className="text-foreground">← All questions</span> goes back.
          </li>
        </ol>
        <p className="mt-3 border-t pt-2 text-xs text-muted-foreground">
          {isTeacher
            ? "Charts cover your own classes only. "
            : "Charts cover the locations you administer. "}
          Pre vs post compares two groups of anonymous responses: it does not
          follow the same students over time.
        </p>
      </PopoverContent>
    </Popover>
  );
};

export default ChartsInfoButton;
