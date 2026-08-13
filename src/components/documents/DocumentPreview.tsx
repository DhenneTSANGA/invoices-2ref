import { forwardRef } from "react";
import type { Document } from "@/store/types";
import { InvoicePreview } from "./preview/InvoicePreview";
import { QuotationPreview } from "./preview/QuotationPreview";
import { LetterPreview } from "./preview/LetterPreview";

type Props = {
  doc: Document;
  compact?: boolean;
  variant?: "full" | "thumb";
  className?: string;
  /** PDF / aperçu d’impression : pas de tampon électronique. */
  omitSignature?: boolean;
};

export const DocumentPreview = forwardRef<HTMLDivElement, Props>(function DocumentPreview(props, ref) {
  switch (props.doc.type) {
    case "quotation":
      return <QuotationPreview ref={ref} {...props} />;
    case "letter":
      return <LetterPreview ref={ref} {...props} />;
    case "invoice":
    default:
      return <InvoicePreview ref={ref} {...props} />;
  }
});
