"use client";

import TitleInput from "@/components/addForm/TitleInput";
import { SubmitButton } from "@/components/form/Buttons";
import FormInput from "@/components/form/FormInput";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { emailCertificate } from "@/utils/actions";
import { usePathname, useSearchParams } from "next/navigation";
import React, { useEffect, useState } from "react";
import { useFormState } from "react-dom";

const SubmissionSuccessPage = () => {
  const [certificateUrl, setCertificateUrl] = useState<string | null>(null);

  useEffect(() => {
    localStorage.removeItem("studentLocation");
    localStorage.removeItem("studentDetails");
  }, []);

  const title = decodeURIComponent(usePathname().split("/")[3]);
  const searchParams = useSearchParams();
  const showCertificate = searchParams.get("certificate") === "true";
  const teacherEmail = searchParams.get("teacherEmail") || "";
  const teacherName = searchParams.get("teacherName") || "";

  const [state, formAction] = useFormState(emailCertificate, {
    message: "",
    certificateUrl: "",
  });

  // Update certificate URL when form is submitted successfully
  useEffect(() => {
    if (state && "certificateUrl" in state && state.certificateUrl) {
      setCertificateUrl(state.certificateUrl);
    }
  }, [state]);

  return (
    <div className="w-full mx-auto p-8 max-w-3xl">
      <TitleInput
        defaultValue={title}
        description="Your response has been recorded."
        disabled={true}
      />

      {certificateUrl && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Your Certificate</CardTitle>
            <CardDescription>
              Your certificate has been emailed. You can also view it below.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <iframe
              src={certificateUrl}
              className="w-full h-[600px] border rounded"
              title="Certificate of Completion"
            />
          </CardContent>
        </Card>
      )}

      {showCertificate && !certificateUrl && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Certificate of Completion</CardTitle>
            <CardDescription>
              Enter your name and any emails other than your teacher that you
              want to to recieve your certificate. Neither will be stored or
              linked to your form response.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={formAction}>
              <input type="hidden" name="formTitle" value={title} />
              <input type="hidden" name="teacherEmail" value={teacherEmail} />
              <input type="hidden" name="teacherName" value={teacherName} />
              <FormInput name="name" type="text" />
              <FormInput name="email" type="email" required={false} />
              <SubmitButton text="email certificate" className="w-full" />
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SubmissionSuccessPage;
