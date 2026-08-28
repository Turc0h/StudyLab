import * as pdfjsLib from "pdfjs-dist";
// eslint-disable-next-line import/no-unresolved
import PdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = PdfWorkerUrl;

export { pdfjsLib };
