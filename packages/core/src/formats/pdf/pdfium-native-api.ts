/** JS surface of vendored `domdoc-pdfium-wasm` (C24 writer exports). */

export interface PdfiumNativeObject {
  index: number;
  type: number;
  kind: "text" | "image" | "other";
  text: string;
  bounds: { left: number; bottom: number; right: number; top: number } | null;
}

export interface PdfiumNativePageInspection {
  pageIndex: number;
  text: string;
  objects: readonly PdfiumNativeObject[];
}

export interface PdfiumNativeInspection {
  pageCount: number;
  pages: readonly PdfiumNativePageInspection[];
}

export interface DomdocPdfiumApi {
  pdfiumSourceCommit: string;
  createDocument(): number;
  loadDocument(bytes: Uint8Array, password?: string): number;
  pageCount(doc: number): number;
  addPage(doc: number, index: number, width?: number, height?: number): number;
  extractPageText(doc: number, pageIndex: number): string;
  listObjects(doc: number, pageIndex: number): PdfiumNativeObject[];
  addTextObject(
    doc: number,
    pageIndex: number,
    text: string,
    font?: string,
    size?: number,
    x?: number,
    y?: number,
  ): number;
  setText(doc: number, pageIndex: number, objectId: string | number, newText: string): boolean;
  deleteObject(doc: number, pageIndex: number, objectId: string | number): boolean;
  addImageRgb(
    doc: number,
    pageIndex: number,
    width: number,
    height: number,
    rgba?: Uint8Array,
    x?: number,
    y?: number,
  ): number;
  replaceImageRgb(
    doc: number,
    pageIndex: number,
    objectId: string | number,
    width: number,
    height: number,
    rgba?: Uint8Array,
  ): boolean;
  movePage(doc: number, fromIndex: number, destIndex: number): boolean;
  inspect(doc: number): PdfiumNativeInspection;
  save(doc: number): Uint8Array;
  close(doc: number): void;
}

export type PdfiumModuleDefault = ((() => Promise<DomdocPdfiumApi>) & {
  c24WriterExports?: boolean;
  __domdocNonProductionPdfiumStub?: boolean;
  __domdocPdfiumLibProbeAdapter?: boolean;
  __domdocPdfiumContractScaffold?: boolean;
  pdfiumSourceCommit?: string;
}) | {
  c24WriterExports?: boolean;
  __domdocNonProductionPdfiumStub?: boolean;
  __domdocPdfiumLibProbeAdapter?: boolean;
  __domdocPdfiumContractScaffold?: boolean;
};
