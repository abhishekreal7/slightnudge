import { type JsxOpeningElement, type JsxSelfClosingElement } from 'ts-morph';

export type ImageElement = JsxOpeningElement | JsxSelfClosingElement;
export function isNextImage(element: ImageElement) {
  const name = element.getTagNameNode().getText();
  const symbol = element.getTagNameNode().getSymbol()?.compilerSymbol;
  return !!symbol && element.getSourceFile().getImportDeclarations().some(declaration => declaration.getModuleSpecifierValue() === 'next/image' && declaration.getDefaultImport()?.getText() === name && declaration.getDefaultImport()?.getSymbol()?.compilerSymbol === symbol);
}
export function isImageElement(element: ImageElement) { return element.getTagNameNode().getText() === 'img' || isNextImage(element); }
