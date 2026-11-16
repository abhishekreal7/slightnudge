import { readFileSync } from 'node:fs';
import { perfSync } from './perf-stages';
import { appearanceValue, gradientPattern, shadowPattern, parseGradient, parseShadow } from './appearance-values';
import { isNextLink } from './link-identity';
import { isLucideIcon } from './icon-identity';
import { isNextImage } from './image-identity';
import { Project, SyntaxKind, Node, JsxOpeningElement, JsxSelfClosingElement, StringLiteral } from 'ts-morph';
import { translatedClasses, type Translation } from './translation';
import {
  TAILWIND_SPACING_SCALE,
  getNextSpacingValue,
  computeNudgedClass,
} from './nudge-calculator';

export { TAILWIND_SPACING_SCALE, getNextSpacingValue, computeNudgedClass };

export interface NudgeOptions {
  sourceText?: string;
  filePath: string;
  line?: number;
  column?: number;
  elementId?: string;
  direction: 'right' | 'left' | 'up' | 'down';
  stepSize?: 'normal' | 'big';
  breakpoint?: string; // e.g. '' (base), 'sm', 'md', 'lg', 'xl', '2xl'
  dryRun?: boolean;
  translation?: Translation;
}

export interface NudgeResult {
  success: boolean;
  refusedSafely: boolean;
  reason?: string;
  oldClass?: string;
  newClass?: string;
  oldClassNameValue?: string;
  newClassNameValue?: string;
  filePath: string;
  line?: number;
  updatedSource?: string;
  originalSource?: string;
}

/**
 * Checks whether an AST node is located within a component that is used in multiple places.
 */
export function isComponentUsedMultipleTimes(targetNode: JsxOpeningElement | JsxSelfClosingElement, project: Project): boolean {
  const sourceFile = targetNode.getSourceFile();
  const jsxElements = [
    ...sourceFile.getDescendantsOfKind(SyntaxKind.JsxOpeningElement),
    ...sourceFile.getDescendantsOfKind(SyntaxKind.JsxSelfClosingElement),
  ];

  // 1. Check if target element itself is a custom component (starts with capital letter)
  const tagName = targetNode.getTagNameNode().getText();
  if (/^[A-Z]/.test(tagName) && !isNextImage(targetNode) && !isNextLink(targetNode) && !isLucideIcon(targetNode)) {
    let usageCount = 0;
    for (const el of jsxElements) {
      if (el.getTagNameNode().getText() === tagName) {
        usageCount++;
      }
    }
    if (usageCount > 1) {
      return true;
    }
  }

  // 2. Check enclosing function / component declaration
  let current: Node | undefined = targetNode.getParent();
  let enclosingComponentName: string | undefined;

  while (current) {
    if (Node.isFunctionDeclaration(current)) {
      enclosingComponentName = current.getName();
      break;
    } else if (Node.isVariableDeclaration(current)) {
      enclosingComponentName = current.getName();
      break;
    }
    current = current.getParent();
  }

  if (enclosingComponentName && /^[A-Z]/.test(enclosingComponentName)) {
    let usageCount = 0;
    for (const el of jsxElements) {
      if (el.getTagNameNode().getText() === enclosingComponentName) {
        usageCount++;
      }
    }
    if (usageCount > 1) {
      return true;
    }
  }

  return false;
}

/**
 * Detects whether an AST node is located inside a .map() or other loops.
 */
export function isElementInsideLoop(node: Node): boolean {
  let current: Node | undefined = node.getParent();
  while (current) {
    if (Node.isCallExpression(current)) {
      const expr = current.getExpression();
      if (Node.isPropertyAccessExpression(expr)) {
        const name = expr.getName();
        if (['map', 'flatMap', 'forEach', 'filter', 'reduce'].includes(name)) {
          return true;
        }
      }
    }
    if (
      Node.isForStatement(current) ||
      Node.isForOfStatement(current) ||
      Node.isForInStatement(current) ||
      Node.isWhileStatement(current) ||
      Node.isDoStatement(current)
    ) {
      return true;
    }
    current = current.getParent();
  }
  return false;
}

export interface TextSourceAnalysis {
  textEditable: boolean;
  isProp: boolean;
  propName?: string;
  reason?: string;
}

/** A button/link may contain one static label alongside untouched icon JSX. */
export function editableTextChild(target: JsxOpeningElement) {
  const parent = target.getParent();
  if (!Node.isJsxElement(parent)) return undefined;
  const children = parent.getJsxChildren().filter(child => !Node.isJsxText(child) || !child.containsOnlyTriviaWhiteSpaces());
  if (children.length === 1) return children[0];
  if (!['a', 'button'].includes(target.getTagNameNode().getText()) && !isNextLink(target)) return undefined;
  const labels = children.filter(child => Node.isJsxText(child) || Node.isJsxExpression(child));
  return labels.length === 1 ? labels[0] : undefined;
}

export function analyzeElementText(targetNode: JsxOpeningElement | JsxSelfClosingElement): TextSourceAnalysis {
  if (Node.isJsxSelfClosingElement(targetNode)) {
    return {
      textEditable: false,
      isProp: false,
      reason: 'This self-closing element has no editable text.',
    };
  }

  const jsxElement = targetNode.getParent();
  if (!Node.isJsxElement(jsxElement)) {
    return {
      textEditable: false,
      isProp: false,
      reason: 'Select a text element with a stable source mapping.',
    };
  }

  const children = jsxElement.getJsxChildren();
  const meaningful = children.filter((child) => !Node.isJsxText(child) || !child.containsOnlyTriviaWhiteSpaces());

  if (meaningful.length === 0) {
    return {
      textEditable: false,
      isProp: false,
      reason: 'This element has no text content.',
    };
  }

  // Find enclosing function/component parameter names
  let current: Node | undefined = targetNode.getParent();
  const propNames = new Set<string>();

  while (current) {
    if (Node.isFunctionDeclaration(current) || Node.isArrowFunction(current) || Node.isFunctionExpression(current)) {
      const params = current.getParameters();
      if (params.length > 0) {
        const firstParam = params[0];
        const nameNode = firstParam.getNameNode();
        if (Node.isObjectBindingPattern(nameNode)) {
          for (const el of nameNode.getElements()) {
            const name = el.getName();
            if (name) propNames.add(name);
          }
        } else if (Node.isIdentifier(nameNode)) {
          propNames.add(nameNode.getText());
        }
      }
      break;
    }
    current = current.getParent();
  }

  // Check if any child expression references a prop
  for (const child of meaningful) {
    if (Node.isJsxExpression(child)) {
      const expr = child.getExpression();
      if (expr) {
        if (Node.isIdentifier(expr)) {
          const id = expr.getText();
          if (propNames.has(id)) {
            return {
              textEditable: false,
              isProp: true,
              propName: id,
              reason: `This text comes from prop '${id}' and cannot be edited directly. Nothing was changed.`,
            };
          }
        }
        if (Node.isPropertyAccessExpression(expr)) {
          const propName = expr.getName();
          return {
            textEditable: false,
            isProp: true,
            propName,
            reason: `This text comes from prop '${propName}' and cannot be edited directly. Nothing was changed.`,
          };
        }
      }
    }
  }

  const singleChild = editableTextChild(targetNode);
  if (!singleChild) {
    return {
      textEditable: false,
      isProp: false,
      reason: 'For safety, text editing currently supports elements with one plain text value and no nested elements.',
    };
  }

  if (Node.isJsxText(singleChild)) {
    return {
      textEditable: true,
      isProp: false,
    };
  }

  if (Node.isJsxExpression(singleChild)) {
    const expr = singleChild.getExpression();
    if (expr && Node.isStringLiteral(expr)) {
      return {
        textEditable: true,
        isProp: false,
      };
    }
    if (expr && Node.isIdentifier(expr)) {
      const id = expr.getText();
      return {
        textEditable: false,
        isProp: true,
        propName: id,
        reason: `This text comes from prop '${id}' and cannot be edited directly. Nothing was changed.`,
      };
    }
    return {
      textEditable: false,
      isProp: false,
      reason: 'This text is generated dynamically and cannot be edited safely.',
    };
  }

  return {
    textEditable: false,
    isProp: false,
    reason: 'This text is generated dynamically and cannot be edited safely.',
  };
}

/**
 * Nudge an element's Tailwind class safely using ts-morph.
 * Never rewrites the whole file. Modifies only the single className string literal.
 */
export function nudgeElement(options: NudgeOptions): NudgeResult {
  const { filePath, line, column, elementId, direction, stepSize = 'normal', breakpoint = '' } = options;

  const project = perfSync('ast-project', () => new Project({
    skipAddingFilesFromTsConfig: true,
  }));

  if (options.sourceText !== undefined && !options.dryRun) throw new Error('Draft source is read-only until Save.');
  const sourceFile = options.sourceText === undefined ? perfSync('ast-parse', () => project.addSourceFileAtPath(filePath)) : perfSync('ast-parse', () => project.createSourceFile(filePath, options.sourceText, { overwrite: true }));

  // 1. Locate the JSX element by line number or element ID
  const jsxElements = [
    ...sourceFile.getDescendantsOfKind(SyntaxKind.JsxOpeningElement),
    ...sourceFile.getDescendantsOfKind(SyntaxKind.JsxSelfClosingElement),
  ];

  let targetElement: JsxOpeningElement | JsxSelfClosingElement | undefined;

  if (elementId) {
    for (const el of jsxElements) {
      const idAttr = el.getAttribute('id');
      if (idAttr && Node.isJsxAttribute(idAttr)) {
        const init = idAttr.getInitializer();
        if (init && Node.isStringLiteral(init) && init.getLiteralValue() === elementId) {
          targetElement = el;
          break;
        }
      }
    }
  }

  if (!targetElement && column !== undefined) {
    targetElement = jsxElements.find((el) => {
      const pos = sourceFile.getLineAndColumnAtPos(el.getStart());
      return pos.line === line && pos.column === column;
    });
  }

  if (!targetElement && column === undefined && line !== undefined) {
    for (const el of jsxElements) {
      const startLine = el.getStartLineNumber();
      if (startLine === line) {
        targetElement = el;
        break;
      }
    }
  }

  if (!targetElement) {
    return {
      success: false,
      refusedSafely: true,
      reason: `can't edit this safely: element not found at ${line ? `line ${line}` : `id ${elementId}`}`,
      filePath,
    };
  }

  // 2. Safety Check: Loop and Component used in several places
  if (isElementInsideLoop(targetElement)) {
    return {
      success: false,
      refusedSafely: true,
      reason: "This element repeats from a list, so one edit would change every copy. Nothing was changed.",
      filePath,
      line: targetElement.getStartLineNumber(),
    };
  }

  if (isComponentUsedMultipleTimes(targetElement, project)) {
    return {
      success: false,
      refusedSafely: true,
      reason: "can't edit this safely: component used in several places",
      filePath,
      line: targetElement.getStartLineNumber(),
    };
  }

  // 3. Inspect className attribute
  const classAttr = targetElement.getAttribute('className');
  if (!classAttr || !Node.isJsxAttribute(classAttr)) {
    return {
      success: false,
      refusedSafely: true,
      reason: "can't edit this safely: no className attribute found",
      filePath,
      line: targetElement.getStartLineNumber(),
    };
  }

  const initializer = classAttr.getInitializer();
  if (!initializer) {
    return {
      success: false,
      refusedSafely: true,
      reason: "can't edit this safely: empty className attribute",
      filePath,
      line: targetElement.getStartLineNumber(),
    };
  }

  // Safety Check: Variable or Expression/Condition
  if (Node.isJsxExpression(initializer)) {
    const expr = initializer.getExpression();
    if (!expr) {
      return {
        success: false,
        refusedSafely: true,
        reason: "can't edit this safely: empty JSX expression in className",
        filePath,
        line: targetElement.getStartLineNumber(),
      };
    }

    // Call expressions (cn, clsx), conditionals, logical binary expressions
    if (Node.isCallExpression(expr)) {
      return {
        success: false,
        refusedSafely: true,
        reason: "can't edit this safely: class built from a condition (call expression)",
        filePath,
        line: targetElement.getStartLineNumber(),
      };
    }

    if (Node.isConditionalExpression(expr) || Node.isBinaryExpression(expr)) {
      return {
        success: false,
        refusedSafely: true,
        reason: "can't edit this safely: class built from a condition",
        filePath,
        line: targetElement.getStartLineNumber(),
      };
    }

    if (Node.isIdentifier(expr) || Node.isTemplateExpression(expr)) {
      return {
        success: false,
        refusedSafely: true,
        reason: "can't edit this safely: class built from a variable",
        filePath,
        line: targetElement.getStartLineNumber(),
      };
    }

    // If it's a string literal inside JSX expression `{ "ml-2" }`
    if (!Node.isStringLiteral(expr)) {
      return {
        success: false,
        refusedSafely: true,
        reason: "can't edit this safely: non-static className expression",
        filePath,
        line: targetElement.getStartLineNumber(),
      };
    }
  }

  // Get StringLiteral node
  let stringLiteralNode: StringLiteral;
  if (Node.isStringLiteral(initializer)) {
    stringLiteralNode = initializer;
  } else if (Node.isJsxExpression(initializer) && initializer.getExpression() && Node.isStringLiteral(initializer.getExpression()!)) {
    stringLiteralNode = initializer.getExpression() as StringLiteral;
  } else {
    return {
      success: false,
      refusedSafely: true,
      reason: "can't edit this safely: dynamic className",
      filePath,
      line: targetElement.getStartLineNumber(),
    };
  }

  const rawValue = stringLiteralNode.getLiteralValue();
  const originalSource = sourceFile.getFullText();

  // 4. Compute updated class safely
  const marginAxis = direction === 'left' || direction === 'right' ? 'ml' : 'mt';
  const scope = breakpoint ? `${breakpoint}:` : '';
  const scopedTokens = rawValue.split(/\s+/).filter(Boolean).filter(token => scope ? token.startsWith(scope) && !token.slice(scope.length).includes(':') : !token.includes(':')).map(token => token.slice(scope.length));
  const relevantMargins = scopedTokens.filter(token => new RegExp(marginAxis === 'ml' ? '^!?-?(?:m|mx|ml|ms|me)-' : '^!?-?(?:m|my|mt)-').test(token));
  if (!options.translation && (relevantMargins.length > 1 || relevantMargins.some(token => !new RegExp(`^-?${marginAxis}-[0-9.]+$`).test(token)))) {
    return { success: false, refusedSafely: true, reason: 'This spacing uses automatic, custom, or overlapping margins. Adjust it in source before using Move. Nothing was changed.', filePath, line: targetElement.getStartLineNumber() };
  }
  if (options.translation && targetElement.getAttribute('style')) return { success: false, refusedSafely: true, reason: 'Inline styles need to be resolved before this element can be moved. Nothing was changed.', filePath };
  let computed: { oldClass?: string; newClass: string; newClassName: string };
  try { computed = options.translation ? {
    oldClass: rawValue,
    newClass: translatedClasses(rawValue, options.translation),
    newClassName: translatedClasses(rawValue, options.translation),
  } : computeNudgedClass({
    currentClassName: rawValue,
    direction,
    stepSize,
    breakpoint,
  }); } catch (error) { return { success: false, refusedSafely: true, reason: error instanceof Error ? error.message : 'This movement cannot be prepared safely.', filePath }; }

  // 5. Apply the edit strictly to the string literal node ONLY
  stringLiteralNode.setLiteralValue(computed.newClassName);

  // Save changes to disk
  const updatedSource = sourceFile.getFullText();
  if (!options.dryRun) sourceFile.saveSync();

  return {
    success: true,
    refusedSafely: false,
    oldClass: computed.oldClass,
    newClass: computed.newClass,
    oldClassNameValue: rawValue,
    newClassNameValue: computed.newClassName,
    filePath,
    line: targetElement.getStartLineNumber(),
    updatedSource: options.dryRun ? updatedSource : undefined,
    originalSource: options.dryRun ? originalSource : undefined,
  };
}

export interface InspectOptions {
  sourceText?: string;
  filePath: string;
  line?: number;
  column?: number;
  elementId?: string;
  tagName?: string;
  className?: string;
  rect?: { top: number; left: number; width: number; height: number };
  clickedRect?: { top: number; left: number; width: number; height: number };
}

export interface InspectResult {
  found: boolean;
  safeToEdit: boolean;
  refusedSafely?: boolean;
  reason?: string;
  filePath: string;
  line?: number;
  column?: number;
  tagName?: string;
  className?: string;
  textEditable?: boolean;
  textReason?: string;
  propSource?: string;
}

/**
 * Inspects a JSX element in source code without modifying it.
 * Verifies safety constraints (variables, conditions, loops, shared component usages, and runtime DOM matches).
 */
function inspectElementUnmeasured(options: InspectOptions): InspectResult {
  const { filePath, line, column, elementId, tagName: expectedTagName, className: domClassName } = options;

  const project = perfSync('ast-project', () => new Project({
    skipAddingFilesFromTsConfig: true,
  }));

  const sourceFile = options.sourceText === undefined ? perfSync('ast-parse', () => project.addSourceFileAtPath(filePath)) : perfSync('ast-parse', () => project.createSourceFile(filePath, options.sourceText, { overwrite: true }));

  const jsxElements = [
    ...sourceFile.getDescendantsOfKind(SyntaxKind.JsxOpeningElement),
    ...sourceFile.getDescendantsOfKind(SyntaxKind.JsxSelfClosingElement),
  ];

  let targetElement: JsxOpeningElement | JsxSelfClosingElement | undefined;

  if (elementId) {
    for (const el of jsxElements) {
      const idAttr = el.getAttribute('id');
      if (idAttr && Node.isJsxAttribute(idAttr)) {
        const init = idAttr.getInitializer();
        if (init && Node.isStringLiteral(init) && init.getLiteralValue() === elementId) {
          targetElement = el;
          break;
        }
      }
    }
  }

  if (!targetElement && column !== undefined && line !== undefined) {
    targetElement = jsxElements.find((el) => {
      const pos = sourceFile.getLineAndColumnAtPos(el.getStart());
      const tagMatch = !expectedTagName || el.getTagNameNode().getText().toLowerCase() === expectedTagName.toLowerCase();
      return pos.line === line && pos.column === column && tagMatch;
    });
    if (!targetElement) {
      targetElement = jsxElements.find((el) => {
        const pos = sourceFile.getLineAndColumnAtPos(el.getStart());
        return pos.line === line && pos.column === column;
      });
    }
  }

  if (!targetElement && line !== undefined && expectedTagName) {
    targetElement = jsxElements.find((el) => {
      return el.getStartLineNumber() === line && el.getTagNameNode().getText().toLowerCase() === expectedTagName.toLowerCase();
    });
  }

  if (!targetElement && line !== undefined) {
    for (const el of jsxElements) {
      const startLine = el.getStartLineNumber();
      if (startLine === line) {
        targetElement = el;
        break;
      }
    }
  }

  if (!targetElement) {
    return {
      found: false,
      safeToEdit: false,
      refusedSafely: true,
      reason: "I can't confirm which element this is. Nothing was changed.",
      filePath,
    };
  }

  const tagName = isNextImage(targetElement) ? 'img' : isNextLink(targetElement) ? 'a' : isLucideIcon(targetElement) ? 'svg' : targetElement.getTagNameNode().getText();
  const actualLine = targetElement.getStartLineNumber();
  const actualPos = sourceFile.getLineAndColumnAtPos(targetElement.getStart());

  // Task 2: Runtime tag verification
  if (expectedTagName && expectedTagName.toLowerCase() !== tagName.toLowerCase()) {
    return {
      found: true,
      safeToEdit: false,
      refusedSafely: true,
      reason: "I can't confirm which element this is. Nothing was changed.",
      filePath,
      line: actualLine,
      column: actualPos.column,
      tagName,
    };
  }

  // Task 2: Box verification (overlay box vs clicked element box)
  if (options.rect && options.clickedRect) {
    const deltaTop = Math.abs(options.rect.top - options.clickedRect.top);
    const deltaLeft = Math.abs(options.rect.left - options.clickedRect.left);
    const deltaWidth = Math.abs(options.rect.width - options.clickedRect.width);
    const deltaHeight = Math.abs(options.rect.height - options.clickedRect.height);
    if (deltaTop > 2 || deltaLeft > 2 || deltaWidth > 2 || deltaHeight > 2) {
      return {
        found: true,
        safeToEdit: false,
        refusedSafely: true,
        reason: "I can't confirm which element this is. Nothing was changed.",
        filePath,
        line: actualLine,
        column: actualPos.column,
        tagName,
      };
    }
  }

  // Task 3: Components rendered more than once / used in several places
  if (isComponentUsedMultipleTimes(targetElement, project)) {
    return {
      found: true,
      safeToEdit: false,
      refusedSafely: true,
      reason: "can't edit this safely: component used in several places",
      filePath,
      line: actualLine,
      column: actualPos.column,
      tagName,
    };
  }

  // Task 4: Prop-fed text analysis
  const textAnalysis = analyzeElementText(targetElement);

  const classAttr = targetElement.getAttribute('className');
  if (!classAttr || !Node.isJsxAttribute(classAttr)) {
    // Task 2: If clicked DOM element had classes, but source node has no className -> mismatch!
    if (domClassName && domClassName.trim().length > 0) {
      return {
        found: true,
        safeToEdit: false,
        refusedSafely: true,
        reason: "I can't confirm which element this is. Nothing was changed.",
        filePath,
        line: actualLine,
        column: actualPos.column,
        tagName,
        textEditable: textAnalysis.textEditable,
        textReason: textAnalysis.reason,
        propSource: textAnalysis.propName,
      };
    }
    return {
      found: true,
      safeToEdit: false,
      refusedSafely: true,
      reason: "can't edit this safely: no className attribute found",
      filePath,
      line: actualLine,
      column: actualPos.column,
      tagName,
      textEditable: textAnalysis.textEditable,
      textReason: textAnalysis.reason,
      propSource: textAnalysis.propName,
    };
  }

  const initializer = classAttr.getInitializer();
  if (!initializer) {
    return {
      found: true,
      safeToEdit: false,
      refusedSafely: true,
      reason: "can't edit this safely: empty className attribute",
      filePath,
      line: actualLine,
      column: actualPos.column,
      tagName,
      textEditable: textAnalysis.textEditable,
      textReason: textAnalysis.reason,
      propSource: textAnalysis.propName,
    };
  }

  if (Node.isJsxExpression(initializer)) {
    const expr = initializer.getExpression();
    if (!expr) {
      return {
        found: true,
        safeToEdit: false,
        refusedSafely: true,
        reason: "can't edit this safely: empty JSX expression",
        filePath,
        line: actualLine,
        column: actualPos.column,
        tagName,
        textEditable: textAnalysis.textEditable,
        textReason: textAnalysis.reason,
        propSource: textAnalysis.propName,
      };
    }

    if (Node.isCallExpression(expr)) {
      return {
        found: true,
        safeToEdit: false,
        refusedSafely: true,
        reason: "can't edit this safely: class built from a condition (call expression)",
        filePath,
        line: actualLine,
        column: actualPos.column,
        tagName,
        textEditable: textAnalysis.textEditable,
        textReason: textAnalysis.reason,
        propSource: textAnalysis.propName,
      };
    }

    if (Node.isConditionalExpression(expr) || Node.isBinaryExpression(expr)) {
      return {
        found: true,
        safeToEdit: false,
        refusedSafely: true,
        reason: "can't edit this safely: class built from a condition",
        filePath,
        line: actualLine,
        column: actualPos.column,
        tagName,
        textEditable: textAnalysis.textEditable,
        textReason: textAnalysis.reason,
        propSource: textAnalysis.propName,
      };
    }

    if (Node.isIdentifier(expr) || Node.isTemplateExpression(expr)) {
      return {
        found: true,
        safeToEdit: false,
        refusedSafely: true,
        reason: "can't edit this safely: class built from a variable",
        filePath,
        line: actualLine,
        column: actualPos.column,
        tagName,
        textEditable: textAnalysis.textEditable,
        textReason: textAnalysis.reason,
        propSource: textAnalysis.propName,
      };
    }
  }

  let classNameValue = '';
  if (Node.isStringLiteral(initializer)) {
    classNameValue = initializer.getLiteralValue();
  } else if (Node.isJsxExpression(initializer) && initializer.getExpression() && Node.isStringLiteral(initializer.getExpression()!)) {
    classNameValue = (initializer.getExpression() as StringLiteral).getLiteralValue();
  } else {
    return {
      found: true,
      safeToEdit: false,
      refusedSafely: true,
      reason: "can't edit this safely: dynamic className",
      filePath,
      line: actualLine,
      column: actualPos.column,
      tagName,
      textEditable: textAnalysis.textEditable,
      textReason: textAnalysis.reason,
      propSource: textAnalysis.propName,
    };
  }

  // Task 3: Repeated elements inside loops / .map()
  if (isElementInsideLoop(targetElement)) {
    return {
      found: true,
      safeToEdit: false,
      refusedSafely: true,
      reason: "This element repeats from a list, so one edit would change every copy. Nothing was changed.",
      filePath,
      line: actualLine,
      column: actualPos.column,
      tagName,
    };
  }

  // Task 2: Class list runtime verification
  if (domClassName !== undefined && domClassName !== null) {
    const staticTokens = classNameValue.split(/\s+/).filter(Boolean);
    const domTokens = new Set(domClassName.split(/\s+/).filter(Boolean));
    const allStaticMatch = staticTokens.every((token) => domTokens.has(token));
    if (!allStaticMatch) {
      return {
        found: true,
        safeToEdit: false,
        refusedSafely: true,
        reason: "I can't confirm which element this is. Nothing was changed.",
        filePath,
        line: actualLine,
        column: actualPos.column,
        tagName,
        textEditable: textAnalysis.textEditable,
        textReason: textAnalysis.reason,
        propSource: textAnalysis.propName,
      };
    }
  }

  return {
    found: true,
    safeToEdit: true,
    filePath,
    line: actualLine,
    column: actualPos.column,
    tagName,
    className: classNameValue,
    textEditable: textAnalysis.textEditable,
    textReason: textAnalysis.reason,
    propSource: textAnalysis.propName,
  };
}

export type EditableStyleProperty = 'backgroundImage' | 'boxShadow' | 'minWidth' | 'minHeight' | 'flexGrow' | 'flexShrink' | 'alignSelf' | 'fontSize' | 'fontWeight' | 'fontFamily' | 'lineHeight' | 'letterSpacing' | 'textTransform' | 'textColor' | 'alignment' | 'backgroundColor' | 'padding' | 'display' | 'width' | 'maxWidth' | 'gap' | 'borderRadius' | 'justifyContent' | 'alignItems' | 'flexDirection' | 'flexWrap' | 'gridTemplateColumns' | 'borderWidth' | 'borderColor' | 'fontStyle' | 'textDecoration' | 'transitionProperty' | 'transitionDuration' | 'transitionDelay' | 'transitionTimingFunction' | 'objectFit' | 'objectPosition';

export interface ReorderOptions {
  filePath: string;
  sourceText?: string;
  line?: number;
  column?: number;
  elementId?: string;
  tagName?: string;
  className?: string;
  direction?: 'earlier' | 'later' | 'top' | 'bottom';
  targetIndex?: number;
  dryRun?: boolean;
}

export interface ReorderResult {
  success: boolean;
  refusedSafely: boolean;
  reason?: string;
  filePath: string;
  line?: number;
  updatedSource?: string;
  originalSource?: string;
  sourceOrder?: number[];
}

export function reorderElement(options: ReorderOptions): ReorderResult {
  const { filePath, line, column, elementId, direction, dryRun = false } = options;
  if (options.sourceText !== undefined && !dryRun) throw new Error('Draft source is read-only until Save.');
  const project = perfSync('ast-project', () => new Project({ skipAddingFilesFromTsConfig: true }));
  const sourceFile = perfSync('ast-parse', () => project.addSourceFileAtPath(filePath));
  if (options.sourceText !== undefined) sourceFile.replaceWithText(options.sourceText);
  const elements = [
    ...sourceFile.getDescendantsOfKind(SyntaxKind.JsxOpeningElement),
    ...sourceFile.getDescendantsOfKind(SyntaxKind.JsxSelfClosingElement),
  ];

  let targetElement: JsxOpeningElement | JsxSelfClosingElement | undefined;
  if (elementId) {
    targetElement = elements.find((el) => {
      const idAttr = el.getAttribute('id');
      return idAttr && Node.isJsxAttribute(idAttr) && idAttr.getInitializer() && Node.isStringLiteral(idAttr.getInitializer()!) && (idAttr.getInitializer() as StringLiteral).getLiteralValue() === elementId;
    });
  }
  if (!targetElement && line !== undefined) {
    const matchingLine = elements.filter((el) => el.getStartLineNumber() === line);
    if (matchingLine.length === 1) {
      if (!options.tagName || matchingLine[0].getTagNameNode().getText().toLowerCase() === options.tagName.toLowerCase()) {
        targetElement = matchingLine[0];
      }
    } else if (matchingLine.length > 1) {
      if (column !== undefined && options.tagName) {
        targetElement = matchingLine.find((el) => {
          const pos = sourceFile.getLineAndColumnAtPos(el.getStart());
          return pos.column === column && el.getTagNameNode().getText().toLowerCase() === options.tagName!.toLowerCase();
        });
      }
      if (!targetElement) {
        return {
          success: false,
          refusedSafely: true,
          reason: "I can't tell which element on this line you mean. Nothing was changed.",
          filePath,
          line,
        };
      }
    }
  }

  if (!targetElement) {
    return { success: false, refusedSafely: true, reason: 'Select an element to reorder.', filePath };
  }
  const targetLine = targetElement.getStartLineNumber();

  if (isElementInsideLoop(targetElement)) {
    return { success: false, refusedSafely: true, reason: "This element repeats from a list, so one edit would change every copy. Nothing was changed.", filePath, line: targetLine };
  }
  if (isComponentUsedMultipleTimes(targetElement, project)) {
    return { success: false, refusedSafely: true, reason: "can't edit this safely: component used in several places", filePath, line: targetLine };
  }

  const fullTargetNode = Node.isJsxOpeningElement(targetElement) ? targetElement.getParent() : targetElement;
  if (!fullTargetNode) {
    return { success: false, refusedSafely: true, reason: 'Could not resolve parent container for this element.', filePath };
  }

  const parentContainer = fullTargetNode.getParent();
  if (!parentContainer || (!Node.isJsxElement(parentContainer) && !Node.isJsxFragment(parentContainer))) {
    return { success: false, refusedSafely: true, reason: 'This element is at the root of a component and cannot be reordered within a parent.', filePath };
  }

  const allChildren = parentContainer.getJsxChildren();
  const elementChildren = allChildren.filter((c) => Node.isJsxElement(c) || Node.isJsxSelfClosingElement(c));

  const targetIdx = elementChildren.findIndex((c) => c === fullTargetNode);
  if (targetIdx === -1) {
    return { success: false, refusedSafely: true, reason: 'Could not find element in parent child list.', filePath };
  }

  let destIdx = targetIdx;
  if (options.targetIndex !== undefined) {
    destIdx = Math.max(0, Math.min(elementChildren.length - 1, options.targetIndex));
  } else if (direction === 'top') {
    destIdx = 0;
  } else if (direction === 'bottom') {
    destIdx = elementChildren.length - 1;
  } else if (direction === 'earlier') {
    destIdx = targetIdx - 1;
  } else if (direction === 'later') {
    destIdx = targetIdx + 1;
  }

  if (destIdx === targetIdx) {
    const reason =
      destIdx === 0
        ? 'This element is already the first child in its container.'
        : destIdx === elementChildren.length - 1
        ? 'This element is already the last child in its container.'
        : 'This element is already at that position.';
    return { success: false, refusedSafely: true, reason, filePath, line: targetLine };
  }

  if (destIdx < 0 || destIdx >= elementChildren.length) {
    return { success: false, refusedSafely: true, reason: 'Target position is out of range.', filePath, line: targetLine };
  }

  const destNode = elementChildren[destIdx];
  const hostTag = (node: Node) => Node.isJsxElement(node) ? node.getOpeningElement().getTagNameNode().getText() : Node.isJsxSelfClosingElement(node) ? node.getTagNameNode().getText() : '';
  if (elementChildren.some(node => !/^[a-z][a-z0-9-]*$/.test(hostTag(node)))) return { success: false, refusedSafely: true, reason: 'Reorder direct page elements within one container. Component boundaries need editing in source.', filePath, line: targetLine };

  // Multi-slot reorder safety: inspect moved element and all siblings/children between source and destination
  const rawTargetIdx = allChildren.indexOf(fullTargetNode);
  const rawDestIdx = allChildren.indexOf(destNode);
  const minRaw = Math.min(rawTargetIdx, rawDestIdx);
  const maxRaw = Math.max(rawTargetIdx, rawDestIdx);

  const isDynamicOrUnsafe = (node: Node): { unsafe: boolean; reason?: string } => {
    if (Node.isJsxExpression(node)) {
      const expr = node.getExpression();
      if (expr) {
        return { unsafe: true, reason: 'Adjacent element repeats from a list and cannot be swapped.' };
      }
    }
    if (Node.isJsxText(node) && !node.containsOnlyTriviaWhiteSpaces()) {
      return { unsafe: true, reason: 'Cannot reorder across text content.' };
    }
    const opening = Node.isJsxElement(node) ? node.getOpeningElement() : node;
    if (isElementInsideLoop(opening)) {
      return { unsafe: true, reason: 'Adjacent element repeats from a list and cannot be swapped.' };
    }
    const descendants = node.getDescendants();
    const hasLoop = descendants.some((d) => {
      if (Node.isCallExpression(d)) {
        const callExpr = d.getExpression();
        if (Node.isPropertyAccessExpression(callExpr)) {
          return ['map', 'flatMap', 'forEach', 'filter', 'reduce'].includes(callExpr.getName());
        }
      }
      return Node.isForStatement(d) || Node.isForOfStatement(d) || Node.isForInStatement(d) || Node.isWhileStatement(d);
    });
    if (hasLoop) {
      return { unsafe: true, reason: 'Adjacent element repeats from a list and cannot be swapped.' };
    }
    const hasConditional = descendants.some((d) => {
      return (
        Node.isConditionalExpression(d) ||
        (Node.isBinaryExpression(d) && ['&&', '||', '??'].includes(d.getOperatorToken().getText())) ||
        Node.isIfStatement(d)
      );
    });
    if (hasConditional) {
      return { unsafe: true, reason: 'Cannot reorder across conditional elements.' };
    }
    return { unsafe: false };
  };

  for (let r = minRaw; r <= maxRaw; r++) {
    const child = allChildren[r];
    const check = isDynamicOrUnsafe(child);
    if (check.unsafe) {
      return { success: false, refusedSafely: true, reason: check.reason || 'Cannot reorder across dynamic or conditional content.', filePath, line: targetLine };
    }
  }

  const originalSource = sourceFile.getFullText();

  const texts = elementChildren.map((c) => c.getText());
  const [movedItem] = texts.splice(targetIdx, 1);
  texts.splice(destIdx, 0, movedItem);

  const openings = elements.sort((a, b) => a.getStart() - b.getStart());
  const chunks = elementChildren.map(child => openings.map((node, index) => ({ node, index })).filter(({ node }) => node.getStart() >= child.getStart() && node.getEnd() <= child.getEnd()).map(({ index }) => index));
  const chunkOrder = chunks.map((_, index) => index); const [movedChunk] = chunkOrder.splice(targetIdx, 1); chunkOrder.splice(destIdx, 0, movedChunk);
  const slots = new Map(chunks.map((chunk, index) => [chunk[0], { end: chunk.at(-1)!, replacement: chunks[chunkOrder[index]] }]));
  const sequence: number[] = [];
  for (let index = 0; index < openings.length; index++) { const slot = slots.get(index); if (slot) { sequence.push(...slot.replacement); index = slot.end; } else sequence.push(index); }
  const sourceOrder = openings.map((_, index) => sequence.indexOf(index));
  let updatedSource = originalSource;
  for (let i = elementChildren.length - 1; i >= 0; i--) updatedSource = updatedSource.slice(0, elementChildren[i].getStart()) + texts[i] + updatedSource.slice(elementChildren[i].getEnd());
  if (!dryRun) { sourceFile.replaceWithText(updatedSource); sourceFile.saveSync(); }

  return {
    success: true,
    refusedSafely: false,
    filePath,
    line: targetLine,
    updatedSource: dryRun ? updatedSource : undefined,
    originalSource: dryRun ? originalSource : undefined,
    sourceOrder,
  };
}

export interface DuplicateOptions {
  filePath: string;
  sourceText?: string;
  line?: number;
  column?: number;
  elementId?: string;
  tagName?: string;
  className?: string;
  dryRun?: boolean;
}

export interface DuplicateResult {
  success: boolean;
  refusedSafely: boolean;
  reason?: string;
  filePath: string;
  line?: number;
  updatedSource?: string;
  originalSource?: string;
}

export function duplicateElement(options: DuplicateOptions): DuplicateResult {
  const { filePath, line, column, elementId, dryRun = false } = options;
  if (options.sourceText !== undefined && !dryRun) throw new Error('Draft source is read-only until Save.');
  const project = perfSync('ast-project', () => new Project({ skipAddingFilesFromTsConfig: true }));
  const sourceFile = options.sourceText !== undefined
    ? perfSync('ast-parse', () => project.createSourceFile(filePath, options.sourceText, { overwrite: true }))
    : perfSync('ast-parse', () => project.addSourceFileAtPath(filePath));

  const elements = [
    ...sourceFile.getDescendantsOfKind(SyntaxKind.JsxOpeningElement),
    ...sourceFile.getDescendantsOfKind(SyntaxKind.JsxSelfClosingElement),
  ];

  let targetElement: JsxOpeningElement | JsxSelfClosingElement | undefined;
  if (elementId) {
    targetElement = elements.find((el) => {
      const idAttr = el.getAttribute('id');
      return idAttr && Node.isJsxAttribute(idAttr) && idAttr.getInitializer() && Node.isStringLiteral(idAttr.getInitializer()!) && (idAttr.getInitializer() as StringLiteral).getLiteralValue() === elementId;
    });
  }
  if (!targetElement && line !== undefined) {
    const matchingLine = elements.filter((el) => el.getStartLineNumber() === line);
    if (matchingLine.length === 1) {
      if (!options.tagName || matchingLine[0].getTagNameNode().getText().toLowerCase() === options.tagName.toLowerCase()) {
        targetElement = matchingLine[0];
      }
    } else if (matchingLine.length > 1) {
      if (column !== undefined && options.tagName) {
        targetElement = matchingLine.find((el) => {
          const pos = sourceFile.getLineAndColumnAtPos(el.getStart());
          return pos.column === column && el.getTagNameNode().getText().toLowerCase() === options.tagName!.toLowerCase();
        });
      }
    }
  }

  if (!targetElement) {
    return { success: false, refusedSafely: true, reason: 'Target element could not be found.', filePath };
  }

  const targetLine = targetElement.getStartLineNumber();
  if (isElementInsideLoop(targetElement)) {
    return { success: false, refusedSafely: true, reason: 'This element repeats from a list, so one edit would change every copy. Nothing was changed.', filePath, line: targetLine };
  }
  if (isComponentUsedMultipleTimes(targetElement, project)) {
    return { success: false, refusedSafely: true, reason: "can't edit this safely: component used in several places", filePath, line: targetLine };
  }

  const fullTargetNode = Node.isJsxOpeningElement(targetElement) ? targetElement.getParent() : targetElement;
  if (!fullTargetNode) {
    return { success: false, refusedSafely: true, reason: 'Could not resolve parent container for this element.', filePath };
  }

  const parentContainer = fullTargetNode.getParent();
  if (!parentContainer || (!Node.isJsxElement(parentContainer) && !Node.isJsxFragment(parentContainer))) {
    return { success: false, refusedSafely: true, reason: 'This element is at the root of a component and cannot be duplicated.', filePath };
  }

  const originalSource = sourceFile.getFullText();
  let cloneText = fullTargetNode.getText();

  // If clone has id attribute, rename it to avoid duplicate DOM id
  const idAttr = targetElement.getAttribute('id');
  if (idAttr && Node.isJsxAttribute(idAttr) && idAttr.getInitializer() && Node.isStringLiteral(idAttr.getInitializer()!)) {
    const rawId = (idAttr.getInitializer() as StringLiteral).getLiteralValue();
    const newId = `${rawId}-copy`;
    cloneText = cloneText.replace(new RegExp(`id=(["'])${rawId}\\1`), `id=$1${newId}$1`);
  }

  const nodeStart = fullTargetNode.getStart();
  const nodeEnd = fullTargetNode.getEnd();
  const beforeStart = originalSource.slice(0, nodeStart);
  const lastNewlinePos = Math.max(beforeStart.lastIndexOf('\n'), beforeStart.lastIndexOf('\r'));
  const indent = lastNewlinePos !== -1 ? beforeStart.slice(lastNewlinePos + 1).match(/^[ \t]*/)?.[0] || '' : '';

  const isCRLF = originalSource.includes('\r\n');
  const newline = isCRLF ? '\r\n' : '\n';
  const insertion = newline + indent + cloneText;
  const updatedSource = originalSource.slice(0, nodeEnd) + insertion + originalSource.slice(nodeEnd);

  const testProject = new Project({ useInMemoryFileSystem: true });
  const testFile = testProject.createSourceFile('test.tsx', updatedSource);
  const diagnostics = (testFile.compilerNode as unknown as { parseDiagnostics?: unknown[] }).parseDiagnostics;
  if (diagnostics && diagnostics.length > 0) {
    return { success: false, refusedSafely: true, reason: 'Duplicating this element would produce invalid JSX syntax.', filePath };
  }

  if (!dryRun) {
    sourceFile.replaceWithText(updatedSource);
    sourceFile.saveSync();
  }

  return {
    success: true,
    refusedSafely: false,
    filePath,
    line: targetLine,
    updatedSource: dryRun ? updatedSource : undefined,
    originalSource: dryRun ? originalSource : undefined,
  };
}

export interface DeleteOptions {
  filePath: string;
  sourceText?: string;
  line?: number;
  column?: number;
  elementId?: string;
  tagName?: string;
  className?: string;
  dryRun?: boolean;
}

export interface DeleteResult {
  success: boolean;
  refusedSafely: boolean;
  reason?: string;
  filePath: string;
  line?: number;
  updatedSource?: string;
  originalSource?: string;
}

export function deleteElement(options: DeleteOptions): DeleteResult {
  const { filePath, line, column, elementId, dryRun = false } = options;
  if (options.sourceText !== undefined && !dryRun) throw new Error('Draft source is read-only until Save.');
  const project = perfSync('ast-project', () => new Project({ skipAddingFilesFromTsConfig: true }));
  const sourceFile = options.sourceText !== undefined
    ? perfSync('ast-parse', () => project.createSourceFile(filePath, options.sourceText, { overwrite: true }))
    : perfSync('ast-parse', () => project.addSourceFileAtPath(filePath));

  const elements = [
    ...sourceFile.getDescendantsOfKind(SyntaxKind.JsxOpeningElement),
    ...sourceFile.getDescendantsOfKind(SyntaxKind.JsxSelfClosingElement),
  ];

  let targetElement: JsxOpeningElement | JsxSelfClosingElement | undefined;
  if (elementId) {
    targetElement = elements.find((el) => {
      const idAttr = el.getAttribute('id');
      return idAttr && Node.isJsxAttribute(idAttr) && idAttr.getInitializer() && Node.isStringLiteral(idAttr.getInitializer()!) && (idAttr.getInitializer() as StringLiteral).getLiteralValue() === elementId;
    });
  }
  if (!targetElement && line !== undefined) {
    const matchingLine = elements.filter((el) => el.getStartLineNumber() === line);
    if (matchingLine.length === 1) {
      if (!options.tagName || matchingLine[0].getTagNameNode().getText().toLowerCase() === options.tagName.toLowerCase()) {
        targetElement = matchingLine[0];
      }
    } else if (matchingLine.length > 1) {
      if (column !== undefined && options.tagName) {
        targetElement = matchingLine.find((el) => {
          const pos = sourceFile.getLineAndColumnAtPos(el.getStart());
          return pos.column === column && el.getTagNameNode().getText().toLowerCase() === options.tagName!.toLowerCase();
        });
      }
    }
  }

  if (!targetElement) {
    return { success: false, refusedSafely: true, reason: 'Target element could not be found.', filePath };
  }

  const targetLine = targetElement.getStartLineNumber();
  if (isElementInsideLoop(targetElement)) {
    return { success: false, refusedSafely: true, reason: 'This element repeats from a list, so one edit would change every copy. Nothing was changed.', filePath, line: targetLine };
  }
  if (isComponentUsedMultipleTimes(targetElement, project)) {
    return { success: false, refusedSafely: true, reason: "can't edit this safely: component used in several places", filePath, line: targetLine };
  }

  const fullTargetNode = Node.isJsxOpeningElement(targetElement) ? targetElement.getParent() : targetElement;
  if (!fullTargetNode) {
    return { success: false, refusedSafely: true, reason: 'Could not resolve parent container for this element.', filePath };
  }

  const parentContainer = fullTargetNode.getParent();
  if (!parentContainer || (!Node.isJsxElement(parentContainer) && !Node.isJsxFragment(parentContainer))) {
    return { success: false, refusedSafely: true, reason: 'This element is at the root of a component and cannot be deleted.', filePath };
  }

  const originalSource = sourceFile.getFullText();
  let deleteStart = fullTargetNode.getStart();
  let deleteEnd = fullTargetNode.getEnd();

  const before = originalSource.slice(0, deleteStart);
  const lastNewline = Math.max(before.lastIndexOf('\n'), before.lastIndexOf('\r'));
  const linePrefix = lastNewline === -1 ? before : before.slice(lastNewline + 1);
  const isLeadingWhitespaceOnly = /^[ \t]*$/.test(linePrefix);

  const after = originalSource.slice(deleteEnd);
  const matchTrailingNewline = after.match(/^[ \t]*\r?\n/);

  if (isLeadingWhitespaceOnly && matchTrailingNewline) {
    deleteStart = lastNewline === -1 ? 0 : (before[lastNewline] === '\n' && before[lastNewline - 1] === '\r' ? lastNewline - 1 : lastNewline);
    deleteEnd = deleteEnd + matchTrailingNewline[0].length;
  }

  const updatedSource = originalSource.slice(0, deleteStart) + originalSource.slice(deleteEnd);

  const testProject = new Project({ useInMemoryFileSystem: true });
  const testFile = testProject.createSourceFile('test.tsx', updatedSource);
  const diagnostics = (testFile.compilerNode as unknown as { parseDiagnostics?: unknown[] }).parseDiagnostics;
  if (diagnostics && diagnostics.length > 0) {
    return { success: false, refusedSafely: true, reason: 'Deleting this element would produce invalid JSX syntax.', filePath };
  }

  if (!dryRun) {
    sourceFile.replaceWithText(updatedSource);
    sourceFile.saveSync();
  }

  return {
    success: true,
    refusedSafely: false,
    filePath,
    line: targetLine,
    updatedSource: dryRun ? updatedSource : undefined,
    originalSource: dryRun ? originalSource : undefined,
  };
}

export interface WrapOptions {
  filePath: string;
  sourceText?: string;
  line?: number;
  column?: number;
  elementId?: string;
  tagName?: string;
  containerTag?: string;
  containerClassName?: string;
  dryRun?: boolean;
}

export interface WrapResult {
  success: boolean;
  refusedSafely: boolean;
  reason?: string;
  filePath: string;
  line?: number;
  updatedSource?: string;
  originalSource?: string;
}

export function wrapElement(options: WrapOptions): WrapResult {
  const { filePath, line, column, elementId, containerTag = 'div', containerClassName = 'flex flex-col', dryRun = false } = options;
  if (options.sourceText !== undefined && !dryRun) throw new Error('Draft source is read-only until Save.');
  const project = perfSync('ast-project', () => new Project({ skipAddingFilesFromTsConfig: true }));
  const sourceFile = options.sourceText !== undefined
    ? perfSync('ast-parse', () => project.createSourceFile(filePath, options.sourceText, { overwrite: true }))
    : perfSync('ast-parse', () => project.addSourceFileAtPath(filePath));

  const elements = [
    ...sourceFile.getDescendantsOfKind(SyntaxKind.JsxOpeningElement),
    ...sourceFile.getDescendantsOfKind(SyntaxKind.JsxSelfClosingElement),
  ];

  let targetElement: JsxOpeningElement | JsxSelfClosingElement | undefined;
  if (elementId) {
    targetElement = elements.find((el) => {
      const idAttr = el.getAttribute('id');
      return idAttr && Node.isJsxAttribute(idAttr) && idAttr.getInitializer() && Node.isStringLiteral(idAttr.getInitializer()!) && (idAttr.getInitializer() as StringLiteral).getLiteralValue() === elementId;
    });
  }
  if (!targetElement && line !== undefined) {
    const matchingLine = elements.filter((el) => el.getStartLineNumber() === line);
    if (matchingLine.length === 1) {
      if (!options.tagName || matchingLine[0].getTagNameNode().getText().toLowerCase() === options.tagName.toLowerCase()) {
        targetElement = matchingLine[0];
      }
    } else if (matchingLine.length > 1) {
      if (column !== undefined && options.tagName) {
        targetElement = matchingLine.find((el) => {
          const pos = sourceFile.getLineAndColumnAtPos(el.getStart());
          return pos.column === column && el.getTagNameNode().getText().toLowerCase() === options.tagName!.toLowerCase();
        });
      }
    }
  }

  if (!targetElement) {
    return { success: false, refusedSafely: true, reason: 'Target element could not be found.', filePath };
  }

  const targetLine = targetElement.getStartLineNumber();
  if (isElementInsideLoop(targetElement)) {
    return { success: false, refusedSafely: true, reason: 'This element repeats from a list, so one edit would change every copy. Nothing was changed.', filePath, line: targetLine };
  }
  if (isComponentUsedMultipleTimes(targetElement, project)) {
    return { success: false, refusedSafely: true, reason: "can't edit this safely: component used in several places", filePath, line: targetLine };
  }

  const fullTargetNode = Node.isJsxOpeningElement(targetElement) ? targetElement.getParent() : targetElement;
  if (!fullTargetNode) {
    return { success: false, refusedSafely: true, reason: 'Could not resolve parent container for this element.', filePath };
  }

  const parentContainer = fullTargetNode.getParent();
  if (!parentContainer || (!Node.isJsxElement(parentContainer) && !Node.isJsxFragment(parentContainer))) {
    return { success: false, refusedSafely: true, reason: 'This element is at the root of a component and cannot be wrapped.', filePath };
  }

  const originalSource = sourceFile.getFullText();
  const start = fullTargetNode.getStart();
  const end = fullTargetNode.getEnd();

  const isCRLF = originalSource.includes('\r\n');
  const newline = isCRLF ? '\r\n' : '\n';
  const beforeStart = originalSource.slice(0, start);
  const lastNewlinePos = Math.max(beforeStart.lastIndexOf('\n'), beforeStart.lastIndexOf('\r'));
  const indent = lastNewlinePos !== -1 ? beforeStart.slice(lastNewlinePos + 1).match(/^[ \t]*/)?.[0] || '' : '';
  const childIndent = indent + '  ';

  const innerText = fullTargetNode.getText();
  const classAttr = containerClassName ? ` className="${containerClassName}"` : '';
  const wrapped = `<${containerTag}${classAttr}>${newline}${childIndent}${innerText}${newline}${indent}</${containerTag}>`;

  const updatedSource = originalSource.slice(0, start) + wrapped + originalSource.slice(end);

  const testProject = new Project({ useInMemoryFileSystem: true });
  const testFile = testProject.createSourceFile('test.tsx', updatedSource);
  const diagnostics = (testFile.compilerNode as unknown as { parseDiagnostics?: unknown[] }).parseDiagnostics;
  if (diagnostics && diagnostics.length > 0) {
    return { success: false, refusedSafely: true, reason: 'Wrapping this element would produce invalid JSX syntax.', filePath };
  }

  if (!dryRun) {
    sourceFile.replaceWithText(updatedSource);
    sourceFile.saveSync();
  }

  return {
    success: true,
    refusedSafely: false,
    filePath,
    line: targetLine,
    updatedSource: dryRun ? updatedSource : undefined,
    originalSource: dryRun ? originalSource : undefined,
  };
}

export function updateStaticImageSource(options: { filePath: string; line?: number; column?: number; elementId?: string; value: string; dryRun?: boolean }) {
  const { filePath, line, column, elementId, value, dryRun = false } = options;
  if (!/^\/slightnudge-assets\/[a-f0-9-]{36}\.(?:png|jpe?g|webp|gif)$/i.test(value)) throw new Error('Choose an image from the imported asset library.');
  const project = perfSync('ast-project', () => new Project({ skipAddingFilesFromTsConfig: true }));
  const sourceFile = perfSync('ast-parse', () => project.addSourceFileAtPath(filePath));
  const elements = [...sourceFile.getDescendantsOfKind(SyntaxKind.JsxOpeningElement), ...sourceFile.getDescendantsOfKind(SyntaxKind.JsxSelfClosingElement)];
  const target = elements.find((element) => {
    if (element.getTagNameNode().getText().toLowerCase() !== 'img') return false;
    const idAttr = element.getAttribute('id');
    if (elementId && idAttr && Node.isJsxAttribute(idAttr) && idAttr.getInitializer() && Node.isStringLiteral(idAttr.getInitializer()!) && (idAttr.getInitializer() as StringLiteral).getLiteralValue() === elementId) return true;
    if (elementId) return false;
    if (column !== undefined) {
      const position = sourceFile.getLineAndColumnAtPos(element.getStart());
      return position.line === line && position.column === column;
    }
    return line !== undefined && element.getStartLineNumber() === line;
  });
  if (!target) return { success: false as const, reason: 'Select an image element with a stable source mapping.' };
  const src = target.getAttribute('src');
  if (!src || !Node.isJsxAttribute(src)) return { success: false as const, reason: 'This image has no static source to replace.' };
  const initializer = src?.getInitializer();
  if (!initializer || !Node.isStringLiteral(initializer)) return { success: false as const, reason: 'This image uses a dynamic source. It cannot be replaced safely by a visual edit yet.' };
  const oldValue = initializer.getLiteralValue();
  const originalSource = sourceFile.getFullText();
  initializer.setLiteralValue(value);
  const updatedSource = sourceFile.getFullText();
  if (!dryRun) sourceFile.saveSync();
  return { success: true as const, oldValue, newValue: value, filePath, line: target.getStartLineNumber(), updatedSource: dryRun ? updatedSource : undefined, originalSource: dryRun ? originalSource : undefined };
}

/** Change one static label; buttons/links preserve adjacent icon JSX. Dynamic labels are refused. */
export function updateStaticJsxText(options: { sourceText?: string; filePath: string; line?: number; column?: number; elementId?: string; value: string; dryRun?: boolean }) {
  const { filePath, line, column, elementId, value, dryRun = false } = options;
  if (value.length > 2000 || /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(value)) throw new Error('Text must be under 2,000 characters and cannot contain control characters.');
  const project = perfSync('ast-project', () => new Project({ skipAddingFilesFromTsConfig: true }));
  if (options.sourceText !== undefined && !dryRun) throw new Error('Draft source is read-only until Save.');
  const sourceFile = options.sourceText === undefined ? perfSync('ast-parse', () => project.addSourceFileAtPath(filePath)) : perfSync('ast-parse', () => project.createSourceFile(filePath, options.sourceText, { overwrite: true }));
  const elements = [...sourceFile.getDescendantsOfKind(SyntaxKind.JsxOpeningElement), ...sourceFile.getDescendantsOfKind(SyntaxKind.JsxSelfClosingElement)];
  const target = elements.find((element) => {
    const idAttr = element.getAttribute('id');
    if (elementId && idAttr && Node.isJsxAttribute(idAttr) && idAttr.getInitializer() && Node.isStringLiteral(idAttr.getInitializer()!) && (idAttr.getInitializer() as StringLiteral).getLiteralValue() === elementId) return true;
    if (elementId) return false;
    if (column !== undefined) {
      const position = sourceFile.getLineAndColumnAtPos(element.getStart());
      return position.line === line && position.column === column;
    }
    return line !== undefined && element.getStartLineNumber() === line;
  });
  if (!target || !Node.isJsxOpeningElement(target)) return { success: false as const, reason: 'Select a text element with a stable source mapping.' };
  const textAnalysis = analyzeElementText(target);
  if (textAnalysis.isProp) {
    return { success: false as const, reason: textAnalysis.reason || `This text comes from prop '${textAnalysis.propName}' and cannot be edited directly. Nothing was changed.` };
  }
  if (!textAnalysis.textEditable) {
    return { success: false as const, reason: textAnalysis.reason || 'This text cannot be edited safely.' };
  }
  const jsxElement = target.getParent();
  if (!Node.isJsxElement(jsxElement)) return { success: false as const, reason: 'This self-closing element has no editable text.' };
  const child = editableTextChild(target);
  if (!child) return { success: false as const, reason: 'Select one static text label to edit.' };
  const originalSource = sourceFile.getFullText();
  let oldValue: string;
  if (Node.isJsxText(child)) {
    oldValue = child.getText().trim();
    child.replaceWithText(`{${JSON.stringify(value)}}`);
  } else if (Node.isJsxExpression(child) && child.getExpression() && Node.isStringLiteral(child.getExpression()!)) {
    const literal = child.getExpression() as StringLiteral;
    oldValue = literal.getLiteralValue();
    literal.setLiteralValue(value);
  } else {
    return { success: false as const, reason: 'This text is generated dynamically and cannot be edited safely.' };
  }
  const updatedSource = sourceFile.getFullText();
  if (!dryRun) sourceFile.saveSync();
  return { success: true as const, oldValue, newValue: value, filePath, line: target.getStartLineNumber(), updatedSource: dryRun ? updatedSource : undefined, originalSource: dryRun ? originalSource : undefined };
}

// Background and text prefixes each cover several independent CSS properties.
// Match colors only: bg-[length:...]/bg-[bottom]/gradients and text-[14px]
// must survive a color edit. Custom/ambiguous color values still match here so
// the existing custom-value guard can refuse replacing them without guessing.
function colorUtilityPattern(prefix: 'bg' | 'text') {
  return new RegExp(`^${prefix}-(?:(?:[a-z][a-z0-9-]*-\\d{2,3}|white|black|transparent|current|inherit)(?:/(?:\\d+(?:\\.\\d+)?|\\[[^\\]]+\\]))?|\\[(?:color:|#|(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color|light-dark|var)\\()[^\\]]*\\])$`);
}

const editableUtilities: Record<EditableStyleProperty, { pattern: RegExp; values: Set<string> }> = {
  backgroundImage: { pattern: gradientPattern, values: new Set(['bg-none']) },
  boxShadow: { pattern: shadowPattern, values: new Set(['shadow-none']) },
  minWidth: { pattern: /^min-w-.+$/, values: new Set(['min-w-0','min-w-full','min-w-min','min-w-max','min-w-fit']) },
  minHeight: { pattern: /^min-h-.+$/, values: new Set(['min-h-0','min-h-full','min-h-screen']) },
  flexGrow: { pattern: /^(?:grow|flex-grow)(?:-.+)?$/, values: new Set(['grow-0','grow']) },
  flexShrink: { pattern: /^(?:shrink|flex-shrink)(?:-.+)?$/, values: new Set(['shrink-0','shrink']) },
  alignSelf: { pattern: /^self-.+$/, values: new Set(['self-auto','self-start','self-center','self-end','self-stretch']) },
  objectFit: { pattern: /^object-(?:contain|cover|fill|none|scale-down)$/, values: new Set(['object-contain', 'object-cover', 'object-fill', 'object-none', 'object-scale-down']) },
  objectPosition: { pattern: /^object-(?:\[[^\]]+\]|center|top|bottom|left|right|left-top|right-top|left-bottom|right-bottom|top-left|top-right|bottom-left|bottom-right)$/, values: new Set(['object-center', 'object-top', 'object-bottom', 'object-left', 'object-right', 'object-top-left', 'object-top-right', 'object-bottom-left', 'object-bottom-right']) },
  transitionProperty: { pattern: /^transition(?:-.+)?$/, values: new Set(['transition', 'transition-none', 'transition-colors', 'transition-opacity', 'transition-transform', 'transition-all']) },
  transitionDuration: { pattern: /^duration-.+$/, values: new Set(['duration-75', 'duration-100', 'duration-150', 'duration-200', 'duration-300', 'duration-500', 'duration-700', 'duration-1000']) },
  transitionDelay: { pattern: /^delay-.+$/, values: new Set(['delay-0', 'delay-75', 'delay-100', 'delay-150', 'delay-200', 'delay-300', 'delay-500', 'delay-700', 'delay-1000']) },
  transitionTimingFunction: { pattern: /^ease-.+$/, values: new Set(['ease-linear', 'ease-in', 'ease-out', 'ease-in-out']) },
  fontSize: { pattern: /^text-(?:xs|sm|base|lg|xl|[2-7]xl|\[length:)/, values: new Set(['text-xs', 'text-sm', 'text-base', 'text-lg', 'text-xl', 'text-2xl', 'text-3xl', 'text-4xl', 'text-5xl', 'text-6xl', 'text-7xl']) },
  fontWeight: { pattern: /^font-(?:thin|extralight|light|normal|medium|semibold|bold|extrabold|black)$/, values: new Set(['font-thin', 'font-extralight', 'font-light', 'font-normal', 'font-medium', 'font-semibold', 'font-bold', 'font-extrabold', 'font-black']) },
  fontFamily: { pattern: /^font-(?:sans|serif|mono)$/, values: new Set(['font-sans', 'font-serif', 'font-mono']) },
  lineHeight: { pattern: /^leading-(?:none|tight|snug|normal|relaxed|loose)$/, values: new Set(['leading-none', 'leading-tight', 'leading-snug', 'leading-normal', 'leading-relaxed', 'leading-loose']) },
  letterSpacing: { pattern: /^tracking-(?:tighter|tight|normal|wide|wider|widest)$/, values: new Set(['tracking-tighter', 'tracking-tight', 'tracking-normal', 'tracking-wide', 'tracking-wider', 'tracking-widest']) },
  textTransform: { pattern: /^(?:uppercase|lowercase|capitalize|normal-case)$/, values: new Set(['uppercase', 'lowercase', 'capitalize', 'normal-case']) },
  textColor: { pattern: colorUtilityPattern('text'), values: new Set(['text-[#17211f]', 'text-[#697571]', 'text-[#176b55]', 'text-[#b43e35]', 'text-[#ffffff]', 'text-slate-900', 'text-slate-800', 'text-slate-700', 'text-slate-600', 'text-slate-500', 'text-slate-400', 'text-white', 'text-black', 'text-transparent', 'text-emerald-600', 'text-emerald-700', 'text-blue-600', 'text-rose-600', 'text-amber-600']) },
  alignment: { pattern: /^text-(?:left|center|right|justify)$/, values: new Set(['text-left', 'text-center', 'text-right']) },
  backgroundColor: { pattern: colorUtilityPattern('bg'), values: new Set(['bg-[#ffffff]', 'bg-[#f1f3f1]', 'bg-[#176b55]', 'bg-[#17211f]', 'bg-transparent', 'bg-white', 'bg-black', 'bg-slate-50', 'bg-slate-100', 'bg-slate-200', 'bg-slate-800', 'bg-slate-900', 'bg-emerald-500', 'bg-emerald-600', 'bg-emerald-700', 'bg-blue-500', 'bg-blue-600', 'bg-pink-500', 'bg-rose-500']) },
  padding: { pattern: /^p[trblxy]?-(?:\d+(?:\.\d+)?|\[)/, values: new Set(['p-0', 'p-1', 'p-2', 'p-3', 'p-4', 'p-6', 'p-8', 'p-10', 'p-12']) },
  display: { pattern: /^(?:block|inline-block|flex|inline-flex|grid|hidden)$/, values: new Set(['block', 'inline-block', 'flex', 'inline-flex', 'grid', 'hidden']) },
  width: { pattern: /^w-(?:auto|full|fit|min|max|1\/2|1\/3|2\/3|1\/4|3\/4)$/, values: new Set(['w-auto', 'w-full', 'w-fit', 'w-min', 'w-max', 'w-1/2', 'w-1/3', 'w-2/3', 'w-1/4', 'w-3/4']) },
  maxWidth: { pattern: /^max-w-(?:none|xs|sm|md|lg|xl|2xl|3xl|4xl|5xl|6xl|7xl)$/, values: new Set(['max-w-none', 'max-w-xs', 'max-w-sm', 'max-w-md', 'max-w-lg', 'max-w-xl', 'max-w-2xl', 'max-w-3xl', 'max-w-4xl', 'max-w-5xl', 'max-w-6xl', 'max-w-7xl']) },
  gap: { pattern: /^gap-(?:0|1|2|3|4|6|8|10|12|16)$/, values: new Set(['gap-0', 'gap-1', 'gap-2', 'gap-3', 'gap-4', 'gap-6', 'gap-8', 'gap-10', 'gap-12', 'gap-16']) },
  borderRadius: { pattern: /^rounded(?:-(?:none|sm|md|lg|xl|2xl|3xl|full))?$/, values: new Set(['rounded-none', 'rounded-sm', 'rounded', 'rounded-md', 'rounded-lg', 'rounded-xl', 'rounded-2xl', 'rounded-3xl', 'rounded-full']) },
  justifyContent: { pattern: /^justify-(?:start|end|center|between|around|evenly)$/, values: new Set(['justify-start', 'justify-center', 'justify-between', 'justify-end', 'justify-around', 'justify-evenly']) },
  alignItems: { pattern: /^items-(?:start|end|center|baseline|stretch)$/, values: new Set(['items-start', 'items-center', 'items-end', 'items-stretch']) },
  flexDirection: { pattern: /^flex-(?:row|col)(?:-reverse)?$/, values: new Set(['flex-row', 'flex-col']) },
  flexWrap: { pattern: /^flex-(?:wrap|nowrap|wrap-reverse)$/, values: new Set(['flex-wrap', 'flex-nowrap', 'flex-wrap-reverse']) },
  gridTemplateColumns: { pattern: /^grid-cols-.+$/, values: new Set(Array.from({ length: 12 }, (_, index) => `grid-cols-${index + 1}`)) },
  borderWidth: { pattern: /^border(?:-[0248])?$/, values: new Set(['border-0', 'border', 'border-2', 'border-4', 'border-8']) },
  borderColor: { pattern: /^border-(?:transparent|current|black|white|slate-\d{2,3}|emerald-\d{2,3}|blue-\d{2,3}|rose-\d{2,3}|gray-\d{2,3})|border-\[/, values: new Set(['border-transparent', 'border-slate-200', 'border-slate-300', 'border-slate-400', 'border-slate-700', 'border-slate-900', 'border-emerald-500', 'border-emerald-600', 'border-blue-500', 'border-blue-600', 'border-rose-500', 'border-white', 'border-black']) },
  fontStyle: { pattern: /^(?:italic|not-italic)$/, values: new Set(['italic', 'not-italic']) },
  textDecoration: { pattern: /^(?:underline|line-through|no-underline)$/, values: new Set(['underline', 'line-through', 'no-underline']) },
};

/** Allowed variant and responsive prefixes */
export const ALLOWED_UTILITY_VARIANTS = new Set(['', 'sm', 'md', 'lg', 'xl', '2xl', 'hover', 'focus', 'focus-visible', 'active', 'dark']);

/** Update one statically-defined Tailwind utility while preserving every other source token. */
export function updateStaticTailwindClass(options: { sourceText?: string; filePath: string; line?: number; column?: number; elementId?: string; property: EditableStyleProperty; value: string; breakpoint?: string; verifiedResponsiveScope?: boolean; dryRun?: boolean; important?: boolean }) {
  const { filePath, line, column, elementId, property, value, breakpoint = '', dryRun = false } = options;
  const rule = editableUtilities[property];
  if (!rule || !(rule.values.has(value) || appearanceValue(property,value)) || !ALLOWED_UTILITY_VARIANTS.has(breakpoint) && !(options.verifiedResponsiveScope && /^[a-z0-9][a-z0-9-]{0,31}$/i.test(breakpoint))) throw new Error('That style value or breakpoint is not supported.');

  const originalSource = options.sourceText ?? readFileSync(filePath, 'utf8');
  // Parse without the BOM so source coordinates match the file-backed AST.
  const bom = originalSource.startsWith('\uFEFF') ? '\uFEFF' : '';
  const parseSource = originalSource.slice(bom.length);
  const inspected = inspectElement({ filePath, line, column, elementId, sourceText: parseSource });
  if (!inspected.found || !inspected.safeToEdit || !inspected.className) {
    return { success: false as const, reason: inspected.reason || 'This element cannot be edited safely.' };
  }

  const project = perfSync('ast-project', () => new Project({ skipAddingFilesFromTsConfig: true }));
  if (options.sourceText !== undefined && !dryRun) throw new Error('Draft source is read-only until Save.');
  const sourceFile = perfSync('ast-parse', () => dryRun
    ? project.createSourceFile(filePath, parseSource, { overwrite: true })
    : project.addSourceFileAtPath(filePath));
  const elements = [
    ...sourceFile.getDescendantsOfKind(SyntaxKind.JsxOpeningElement),
    ...sourceFile.getDescendantsOfKind(SyntaxKind.JsxSelfClosingElement),
  ];
  const target = elements.find((element) => {
    const idAttr = element.getAttribute('id');
    if (elementId && idAttr && Node.isJsxAttribute(idAttr) && idAttr.getInitializer() && Node.isStringLiteral(idAttr.getInitializer()!) && (idAttr.getInitializer() as StringLiteral).getLiteralValue() === elementId) return true;
    if (elementId) return false;
    if (column !== undefined) {
      const pos = sourceFile.getLineAndColumnAtPos(element.getStart());
      return pos.line === line && pos.column === column;
    }
    return line !== undefined && element.getStartLineNumber() === line;
  });
  if (!target) return { success: false as const, reason: 'The selected source element could not be found.' };
  if ((property === 'objectFit' || property === 'objectPosition') && target.getTagNameNode().getText() !== 'img' && !isNextImage(target)) return { success: false as const, reason: 'Choose a source-mapped image to adjust its framing.' };
  if (options.important && !['a', 'button'].includes(target.getTagNameNode().getText()) && !isNextLink(target)) return { success: false as const, reason: 'Button style priority is only available on links and buttons.' };

  const classAttr = target.getAttribute('className');
  if (!classAttr || !Node.isJsxAttribute(classAttr)) return { success: false as const, reason: 'This element has no editable className.' };
  const initializer = classAttr.getInitializer();
  const literal = initializer && Node.isStringLiteral(initializer)
    ? initializer
    : initializer && Node.isJsxExpression(initializer) && initializer.getExpression() && Node.isStringLiteral(initializer.getExpression())
      ? initializer.getExpression() as StringLiteral
      : null;
  if (!literal) return { success: false as const, reason: 'This element uses dynamic styles and cannot be edited safely.' };

  const original = literal.getLiteralValue();
  const prefix = breakpoint ? `${breakpoint}:` : '';
  const tokens = original.split(/\s+/).filter(Boolean);
  const baseUtility = (token: string) => token.slice(prefix.length).replace(/^!|!$/g, '');
  const effects = property === 'backgroundImage' || property === 'boxShadow';
  const matches = tokens.map((token, index) => ({ token, index })).filter(({ token }) => token.startsWith(prefix) && rule.pattern.test(baseUtility(token)));
  if (!effects && matches.length > 1) return { success: false as const, reason: 'This element has conflicting styles in this state. Resolve the conflict in code before editing.' };
  if (matches.some(({ token }) => token.includes('[') && !(rule.values.has(baseUtility(token)) || appearanceValue(property,baseUtility(token)) || property==='backgroundImage'&&/^(?:from|via|to)-\[(?:#[a-f0-9]{3,8}|\d{1,3}%)\]$/i.test(baseUtility(token)) || property==='boxShadow'&&/^shadow-\[#[a-f0-9]{3,8}\](?:\/\d{1,3})?$/i.test(baseUtility(token))) || (property.startsWith('transition') && !rule.values.has(baseUtility(token))))) {
    return { success: false as const, reason: 'This style uses a custom value that cannot be replaced safely. Nothing was changed.' };
  }
  if(effects){
    const local=tokens.filter(token=>token.startsWith(prefix)&&!baseUtility(token).split('[')[0].includes(':')).map(baseUtility);
    if(property==='backgroundImage'&&local.some(token=>/^bg-(?:radial|conic|\()/.test(token)))return {success:false as const,reason:'This background uses a radial, conic or variable fill. Edit it in source.'};
    if(property==='backgroundImage'&&local.some(token=>/^bg-\[/.test(token)&&!/^bg-\[#[a-f0-9]+\]$/i.test(token)&&!parseGradient(token)))return {success:false as const,reason:'This background uses a custom image or layered fill. Edit it in source.'};
    if(property==='boxShadow'&&local.some(token=>/^(?:inset-shadow|shadow-inset)/.test(token)))return {success:false as const,reason:'This element uses an inset shadow. Edit it in source.'};
    const geometry=matches.filter(({token})=>!(property==='boxShadow'&&/^shadow-\[#[a-f0-9]{3,8}\](?:\/\d{1,3})?$/i.test(baseUtility(token)))).filter(({token})=>property==='backgroundImage'?/^bg-/.test(baseUtility(token)):/^shadow(?:$|-(?:none|sm|md|lg|xl|2xl|xs|2xs|\[))/.test(baseUtility(token)));
    if(geometry.length>1)return {success:false as const,reason:'Resolve conflicting effects in source before editing.'};
  }
  const index = matches[0]?.index ?? -1;
  const oldToken = effects ? matches.map(item=>item.token).join(' ') : index >= 0 ? tokens[index] : '';
  const nextToken = `${prefix}${options.important || matches.some(({token})=>token.slice(prefix.length).startsWith('!')||token.endsWith('!')) ? '!' : ''}${value}`;
  const newToken = nextToken;
  if (effects) { for(const item of [...matches].reverse())tokens.splice(item.index,1);tokens.splice(index<0?tokens.length:index,0,nextToken); }
  else if (index >= 0) tokens[index] = nextToken;
  else tokens.push(nextToken);
  const updated = oldToken === nextToken ? original : tokens.join(' ');
  if (updated !== original) literal.setLiteralValue(updated);
  const updatedSource = bom + sourceFile.getFullText();
  if (!dryRun) sourceFile.saveSync();
  return { success: true as const, oldClassName: original, newClassName: updated, oldToken, newToken, filePath, line: target.getStartLineNumber(), updatedSource: dryRun ? updatedSource : undefined, originalSource: dryRun ? originalSource : undefined };
}

export function inspectElement(options: InspectOptions): InspectResult { return perfSync('inspect', () => inspectElementUnmeasured(options)); }
