import type { JsxOpeningElement, JsxSelfClosingElement } from 'ts-morph';
export type ActionElement = JsxOpeningElement | JsxSelfClosingElement;
export function isNextLink(element: ActionElement) {
  const symbol = element.getTagNameNode().getSymbol()?.compilerSymbol;
  return !!symbol && element.getSourceFile().getImportDeclarations().some(declaration => declaration.getModuleSpecifierValue() === 'next/link' && declaration.getDefaultImport()?.getSymbol()?.compilerSymbol === symbol);
}
export function isActionElement(element: ActionElement) { return ['a', 'button'].includes(element.getTagNameNode().getText()) || isNextLink(element); }
