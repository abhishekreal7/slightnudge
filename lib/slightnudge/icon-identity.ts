import type { ActionElement } from './link-identity';
export type IconElement = ActionElement;
export function lucideIconName(element: IconElement) {
  const symbol = element.getTagNameNode().getSymbol()?.compilerSymbol;
  if (!symbol) return undefined;
  for (const declaration of element.getSourceFile().getImportDeclarations()) if (declaration.getModuleSpecifierValue() === 'lucide-react') {
    const binding = declaration.getNamedImports().find(binding => (binding.getAliasNode() || binding.getNameNode()).getSymbol()?.compilerSymbol === symbol);
    if (binding && /^[A-Z]/.test(binding.getName())) return binding.getName();
  }
}
export function isLucideIcon(element: IconElement) {
  const symbol = element.getTagNameNode().getSymbol()?.compilerSymbol;
  return !!symbol && element.getSourceFile().getImportDeclarations().some(declaration => declaration.getModuleSpecifierValue() === 'lucide-react' && declaration.getNamedImports().some(binding => /^[A-Z]/.test(binding.getName()) && (binding.getAliasNode() || binding.getNameNode()).getSymbol()?.compilerSymbol === symbol));
}
export function isIconElement(element: IconElement) { return element.getTagNameNode().getText() === 'svg' || isLucideIcon(element); }
