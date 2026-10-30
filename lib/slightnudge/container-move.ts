import { Node, Project, SyntaxKind } from 'ts-morph';
import { isElementInsideLoop } from './ast-nudger';

export interface MoveTarget { line?: number; column?: number; elementId?: string; tagName?: string }
export function moveIntoContainer(options: MoveTarget & { filePath: string; sourceText: string; destination: MoveTarget; targetIndex?: number }) {
  const project = new Project({ useInMemoryFileSystem: true });
  const file = project.createSourceFile('/move.tsx', options.sourceText);
  const nodes = [...file.getDescendantsOfKind(SyntaxKind.JsxOpeningElement), ...file.getDescendantsOfKind(SyntaxKind.JsxSelfClosingElement)].sort((a, b) => a.getStart() - b.getStart());
  const resolve = (target: MoveTarget) => {
    const found = nodes.filter(node => {
      if (target.elementId) { const attribute = node.getAttribute('id'); const value = attribute && Node.isJsxAttribute(attribute) ? attribute.getInitializer() : undefined; return value && Node.isStringLiteral(value) && value.getLiteralValue() === target.elementId; }
      const position = file.getLineAndColumnAtPos(node.getStart());
      return position.line === target.line && position.column === target.column && (!target.tagName || node.getTagNameNode().getText() === target.tagName);
    });
    if (found.length !== 1) throw new Error('Select one uniquely mapped source element and destination.');
    return found[0];
  };
  const source = resolve(options), destination = resolve(options.destination);
  if (!/^(div|section|main|article|aside|header|footer|nav)$/.test(destination.getTagNameNode().getText())) throw new Error('Choose a layout container, such as a section or a div.');
  if (!/^(div|section|article|aside|header|footer|nav|h[1-6]|p|a|button|span|img)$/.test(source.getTagNameNode().getText())) throw new Error('This element needs moving in source.');
  const full = Node.isJsxOpeningElement(source) ? source.getParent() : source;
  const target = Node.isJsxSelfClosingElement(destination) ? destination : destination.getParent();
  if ((!Node.isJsxElement(target) && !Node.isJsxSelfClosingElement(target)) || !full || (!Node.isJsxElement(full) && !Node.isJsxSelfClosingElement(full))) throw new Error('The source container could not be resolved.');
  if (target === full || target.getAncestors().includes(full)) throw new Error('An element cannot be moved inside itself or its contents.');
  const parent = full.getParent();
  if (!Node.isJsxElement(parent)) throw new Error('Move a direct child of a source container. Component roots need moving in source.');
  if (parent === target) throw new Error('This element is already in that container. Use Move earlier or Move later to change its order.');
  const functionScope = (node: Node) => node.getAncestors().find(ancestor => Node.isFunctionDeclaration(ancestor) || Node.isArrowFunction(ancestor) || Node.isFunctionExpression(ancestor) || Node.isMethodDeclaration(ancestor));
  if (!functionScope(source) || functionScope(source) !== functionScope(destination)) throw new Error('Moving between components needs a source refactor. Choose a container in the same component.');
  const contexts = (node: Node) => node.getAncestors().filter(Node.isJsxElement).filter(element => /^[A-Z]/.test(element.getOpeningElement().getTagNameNode().getText()) || element.getOpeningElement().getTagNameNode().getText() === 'form');
  const oldContexts = contexts(source), newContexts = contexts(destination);
  if (oldContexts.length !== newContexts.length || oldContexts.some((context, index) => context !== newContexts[index])) throw new Error('This move crosses a component or form context. Move it in source to preserve its behavior.');
  const dynamic = (node: Node) => isElementInsideLoop(node) || node.getAncestors().some(ancestor => Node.isConditionalExpression(ancestor) || Node.isBinaryExpression(ancestor) && ['&&', '||', '??'].includes(ancestor.getOperatorToken().getText()));
  if (dynamic(source) || dynamic(destination)) throw new Error('Repeated or conditional elements need moving in source.');
  if ([full, target].some(node => node.getDescendants().some(child => Node.isJsxExpression(child) && !Node.isJsxAttribute(child.getParent()) && Boolean(child.getExpression())))) throw new Error('This move crosses dynamic content. Choose static source containers.');
  const children = Node.isJsxElement(target) ? target.getJsxChildren().filter(child => Node.isJsxElement(child) || Node.isJsxSelfClosingElement(child)) : [];
  if (children.some(child => /^[A-Z]/.test((Node.isJsxElement(child) ? child.getOpeningElement() : child).getTagNameNode().getText()))) throw new Error('Choose a container with direct page elements, rather than component instances.');
  const index = options.targetIndex ?? children.length;
  if (!Number.isInteger(index) || index < 0 || index > children.length) throw new Error('Choose a valid insertion position.');
  const empty = Node.isJsxSelfClosingElement(target);
  const insertion = empty ? target.getEnd() - 2 : index < children.length ? children[index].getStart() : target.getClosingElement().getStart();
  const start = full.getStart(), end = full.getEnd(), text = full.getText() + '\n';
  const cut = options.sourceText.slice(0, start) + options.sourceText.slice(end);
  const at = insertion > end ? insertion - (end - start) : insertion;
  const replacement = empty ? `>${text}</${destination.getTagNameNode().getText()}>` : text;
  const replacedLength = empty ? 2 : 0;
  const after = cut.slice(0, at) + replacement + cut.slice(at + replacedLength);
  const updated = project.createSourceFile('/after.tsx', after);
  const resultNodes = [...updated.getDescendantsOfKind(SyntaxKind.JsxOpeningElement), ...updated.getDescendantsOfKind(SyntaxKind.JsxSelfClosingElement)].sort((a, b) => a.getStart() - b.getStart());
  const sourceOrder = nodes.map(node => {
    const position = node.getStart();
    const next = position >= start && position < end ? at + (empty ? 1 : 0) + position - start : (() => { const cutPosition = position >= end ? position - (end - start) : position; return cutPosition >= at + replacedLength ? cutPosition + replacement.length - replacedLength : cutPosition; })();
    return resultNodes.findIndex(candidate => candidate.getStart() === next && candidate.getTagNameNode().getText() === node.getTagNameNode().getText());
  });
  if (sourceOrder.some(index => index < 0) || new Set(sourceOrder).size !== nodes.length || nodes.length !== resultNodes.length) throw new Error('The moved subtree could not be tracked safely.');
  return { before: options.sourceText, after, sourceOrder, targetIndex: index };
}
