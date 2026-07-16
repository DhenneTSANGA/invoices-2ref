import { forwardRef } from "react";
import type { Document } from "@/store/types";
import { InvoicePreview } from "./preview/InvoicePreview";
import { QuotationPreview } from "./preview/QuotationPreview";
import { ProformaPreview } from "./preview/ProformaPreview";
import { LetterPreview } from "./preview/LetterPreview";

type Props = {
  doc: Document;
  compact?: boolean;
  variant?: "full" | "thumb";
  className?: string;
};

export const DocumentPreview = forwardRef<HTMLDivElement, Props>(function DocumentPreview(props, ref) {
  switch (props.doc.type) {
    case "quotation":
      return <QuotationPreview ref={ref} {...props} />;
    case "proforma":
      return <ProformaPreview ref={ref} {...props} />;
    case "letter":
      return <LetterPreview ref={ref} {...props} />;
    case "invoice":
    default:
      return <InvoicePreview ref={ref} {...props} />;
  }
});
