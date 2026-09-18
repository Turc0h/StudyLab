import * as pdfjsLib from "pdfjs-dist";
// eslint-disable-next-line import/no-unresolved
import PdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

if (typeof window !== "undefined") {
  pdfjsLib.GlobalWorkerOptions.workerSrc = PdfWorkerUrl;
}

export { pdfjsLib };

