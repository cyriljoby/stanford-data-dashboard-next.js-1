"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { HiOutlineDotsHorizontal } from "react-icons/hi";
import Link from "next/link";
import { CiEdit } from "react-icons/ci";
import { ConfirmBeforeProceedingBtn } from "../form/Buttons";
import { deleteForm, duplicateForm } from "@/utils/actions";
import { CgTrash } from "react-icons/cg";
import { IoCopyOutline } from "react-icons/io5";
import { toast } from "sonner";
import { useState } from "react";
import { Input } from "../ui/input";
import { Button } from "../ui/button";

const RowActions = ({
  formId,
  formTitle,
  formType,
}: {
  formId: string;
  formTitle: string;
  formType: "pre-survey" | "post-survey";
}) => {
  const [duplicateOpen, setDuplicateOpen] = useState(false);
  const [duplicateTitle, setDuplicateTitle] = useState("");
  const [duplicating, setDuplicating] = useState(false);

  const handleDuplicate = async () => {
    try {
      setDuplicating(true);
      await duplicateForm({ formId, title: duplicateTitle }, new FormData());
      toast.success(`Duplicated as "${duplicateTitle}"`);
      setDuplicateOpen(false);
    } catch {
      toast.error("Failed to duplicate form");
    } finally {
      setDuplicating(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger className="focus:outline-none">
          <HiOutlineDotsHorizontal className="text-lg" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center" side="bottom">
          <DropdownMenuItem
            onSelect={() => {
              navigator.clipboard.writeText(
                `${window.location.origin}/student/enterCode/${formId}`
              );
              toast.success(
                `Copied ${formType} link for "${formTitle}" to clipboard`
              );
            }}
          >
            <IoCopyOutline />
            Copy Link
          </DropdownMenuItem>
          <Link href={`/dashboard/manageForms/editForm/${formId}`}>
            <DropdownMenuItem>
              <CiEdit />
              Edit
            </DropdownMenuItem>
          </Link>
          <DropdownMenuItem
            onSelect={() => {
              setDuplicateTitle(`Copy of ${formTitle}`);
              setDuplicateOpen(true);
            }}
          >
            <IoCopyOutline />
            Duplicate
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <ConfirmBeforeProceedingBtn
              text="delete form"
              action={deleteForm.bind(null, { formId })}
            >
              <button className="w-full flex gap-x-2 items-center rounded-sm px-2 py-1.5 text-sm hover:bg-muted">
                <CgTrash /> Delete
              </button>
            </ConfirmBeforeProceedingBtn>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={duplicateOpen} onOpenChange={setDuplicateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Duplicate Form</DialogTitle>
          </DialogHeader>
          <Input
            value={duplicateTitle}
            onChange={(e) => setDuplicateTitle(e.target.value)}
            placeholder="Enter new form name"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setDuplicateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleDuplicate} disabled={!duplicateTitle.trim() || duplicating}>
              {duplicating ? "Duplicating..." : "Duplicate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default RowActions;
