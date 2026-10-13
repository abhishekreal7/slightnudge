import { Project, SyntaxKind, Node, JsxOpeningElement, JsxSelfClosingElement, StringLiteral } from 'ts-morph';
import {
  TAILWIND_SPACING_SCALE,
  getNextSpacingValue,
  computeNudgedClass,
} from './nudge-calculator';

export { TAILWIND_SPACING_SCALE, getNextSpacingValue, computeNudgedClass };

export interface NudgeOptions {
  filePath: string;
  line?: number;
  column?: number;
  elementId?: string;
  direction: 'right' | 'left' | 'up' | 'down';
  stepSize?: 'normal' | 'big';
  breakpoint?: string; // e.g. '' (base), 'sm', 'md', 'lg', 'xl', '2xl'
  dryRun?: boolean;
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
function isComponentUsedMultipleTimes(targetNode: JsxOpeningElement | JsxSelfClosingElement, project: Project): boolean {
  const sourceFile = targetNode.getSourceFile();
  const jsxElements = [
    ...sourceFile.getDescendantsOfKind(SyntaxKind.JsxOpeningElement),
    ...sourceFile.getDescendantsOfKind(SyntaxKind.JsxSelfClosingElement),
  ];

  // 1. Check if target element itself is a custom component (starts with capital letter)
  const tagName = targetNode.getTagNameNode().getText();
  if (/^[A-Z]/.test(tagName)) {
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

  if (meaningful.length > 1) {
    return {
      textEditable: false,
      isProp: false,
      reason: 'For safety, text editing currently supports elements with one plain text value and no nested elements.',
    };
  }

  const singleChild = meaningful[0];
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

  const project = new Project({
    skipAddingFilesFromTsConfig: true,
  });

  const sourceFile = project.addSourceFileAtPath(filePath);

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
  const computed = computeNudgedClass({
    currentClassName: rawValue,
    direction,
    stepSize,
    breakpoint,
  });

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
export function inspectElement(options: InspectOptions): InspectResult {
  const { filePath, line, column, elementId, tagName: expectedTagName, className: domClassName } = options;

  const project = new Project({
    skipAddingFilesFromTsConfig: true,
  });

  const sourceFile = project.addSourceFileAtPath(filePath);

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

  const tagName = targetElement.getTagNameNode().getText();
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

export type EditableStyleProperty = 'fontSize' | 'fontWeight' | 'fontFamily' | 'lineHeight' | 'letterSpacing' | 'textTransform' | 'textColor' | 'alignment' | 'backgroundColor' | 'padding' | 'display' | 'width' | 'maxWidth' | 'gap' | 'borderRadius' | 'justifyContent' | 'alignItems' | 'flexDirection';

export interface ReorderOptions {
  filePath: string;
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
}

export function reorderElement(options: ReorderOptions): ReorderResult {
  const { filePath, line, column, elementId, direction, dryRun = false } = options;
  const project = new Project({ skipAddingFilesFromTsConfig: true });
  const sourceFile = project.addSourceFileAtPath(filePath);
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

  elementChildren.forEach((child, i) => {
    if (child.getText() !== texts[i]) {
      child.replaceWithText(texts[i]);
    }
  });

  const updatedSource = sourceFile.getFullText();
  if (!dryRun) sourceFile.saveSync();

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
  const project = new Project({ skipAddingFilesFromTsConfig: true });
  const sourceFile = project.addSourceFileAtPath(filePath);
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

/** Change only simple, static JSX text. Nested components and dynamic expressions are refused. */
export function updateStaticJsxText(options: { filePath: string; line?: number; column?: number; elementId?: string; value: string; dryRun?: boolean }) {
  const { filePath, line, column, elementId, value, dryRun = false } = options;
  if (value.length > 2000 || /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(value)) throw new Error('Text must be under 2,000 characters and cannot contain control characters.');
  const project = new Project({ skipAddingFilesFromTsConfig: true });
  const sourceFile = project.addSourceFileAtPath(filePath);
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
  const children = jsxElement.getJsxChildren();
  const meaningful = children.filter((child) => !Node.isJsxText(child) || !child.containsOnlyTriviaWhiteSpaces());
  if (meaningful.length !== 1) return { success: false as const, reason: 'For safety, text editing currently supports elements with one plain text value and no nested elements.' };
  const child = meaningful[0];
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

const editableUtilities: Record<EditableStyleProperty, { pattern: RegExp; values: Set<string> }> = {
  fontSize: { pattern: /^text-(?:xs|sm|base|lg|xl|[2-7]xl|\[length:)/, values: new Set(['text-xs', 'text-sm', 'text-base', 'text-lg', 'text-xl', 'text-2xl', 'text-3xl', 'text-4xl', 'text-5xl', 'text-6xl', 'text-7xl']) },
  fontWeight: { pattern: /^font-(?:thin|extralight|light|normal|medium|semibold|bold|extrabold|black)$/, values: new Set(['font-thin', 'font-extralight', 'font-light', 'font-normal', 'font-medium', 'font-semibold', 'font-bold', 'font-extrabold', 'font-black']) },
  fontFamily: { pattern: /^font-(?:sans|serif|mono)$/, values: new Set(['font-sans', 'font-serif', 'font-mono']) },
  lineHeight: { pattern: /^leading-(?:none|tight|snug|normal|relaxed|loose)$/, values: new Set(['leading-none', 'leading-tight', 'leading-snug', 'leading-normal', 'leading-relaxed', 'leading-loose']) },
  letterSpacing: { pattern: /^tracking-(?:tighter|tight|normal|wide|wider|widest)$/, values: new Set(['tracking-tighter', 'tracking-tight', 'tracking-normal', 'tracking-wide', 'tracking-wider', 'tracking-widest']) },
  textTransform: { pattern: /^(?:uppercase|lowercase|capitalize|normal-case)$/, values: new Set(['uppercase', 'lowercase', 'capitalize', 'normal-case']) },
  textColor: { pattern: /^text-\[/, values: new Set(['text-[#17211f]', 'text-[#697571]', 'text-[#176b55]', 'text-[#b43e35]', 'text-[#ffffff]']) },
  alignment: { pattern: /^text-(?:left|center|right|justify)$/, values: new Set(['text-left', 'text-center', 'text-right']) },
  backgroundColor: { pattern: /^bg-(?:\[|[a-z]+-\d{2,3}$)/, values: new Set(['bg-[#ffffff]', 'bg-[#f1f3f1]', 'bg-[#176b55]', 'bg-[#17211f]']) },
  padding: { pattern: /^p[trblxy]?-(?:\d+(?:\.\d+)?|\[)/, values: new Set(['p-0', 'p-1', 'p-2', 'p-3', 'p-4', 'p-6', 'p-8', 'p-10', 'p-12']) },
  display: { pattern: /^(?:block|inline-block|flex|inline-flex|grid|hidden)$/, values: new Set(['block', 'inline-block', 'flex', 'inline-flex', 'grid', 'hidden']) },
  width: { pattern: /^w-(?:auto|full|1\/2|1\/3|2\/3|1\/4|3\/4)$/, values: new Set(['w-auto', 'w-full', 'w-1/2', 'w-1/3', 'w-2/3', 'w-1/4', 'w-3/4']) },
  maxWidth: { pattern: /^max-w-(?:none|sm|md|lg|xl|2xl|3xl|4xl|5xl|6xl|7xl)$/, values: new Set(['max-w-none', 'max-w-sm', 'max-w-md', 'max-w-lg', 'max-w-xl', 'max-w-2xl', 'max-w-3xl', 'max-w-4xl', 'max-w-5xl', 'max-w-6xl', 'max-w-7xl']) },
  gap: { pattern: /^gap-(?:0|1|2|3|4|6|8|10|12|16)$/, values: new Set(['gap-0', 'gap-1', 'gap-2', 'gap-3', 'gap-4', 'gap-6', 'gap-8', 'gap-10', 'gap-12', 'gap-16']) },
  borderRadius: { pattern: /^rounded(?:-(?:none|sm|md|lg|xl|2xl|3xl|full))?$/, values: new Set(['rounded-none', 'rounded-sm', 'rounded', 'rounded-md', 'rounded-lg', 'rounded-xl', 'rounded-2xl', 'rounded-3xl', 'rounded-full']) },
  justifyContent: { pattern: /^justify-(?:start|end|center|between|around|evenly)$/, values: new Set(['justify-start', 'justify-center', 'justify-between', 'justify-end', 'justify-around', 'justify-evenly']) },
  alignItems: { pattern: /^items-(?:start|end|center|baseline|stretch)$/, values: new Set(['items-start', 'items-center', 'items-end', 'items-stretch']) },
  flexDirection: { pattern: /^flex-(?:row|col)(?:-reverse)?$/, values: new Set(['flex-row', 'flex-col']) },
};

/** Update one statically-defined Tailwind utility while preserving every other source token. */
export function updateStaticTailwindClass(options: { filePath: string; line?: number; column?: number; elementId?: string; property: EditableStyleProperty; value: string; breakpoint?: string; dryRun?: boolean }) {
  const { filePath, line, column, elementId, property, value, breakpoint = '', dryRun = false } = options;
  const rule = editableUtilities[property];
  if (!rule || !rule.values.has(value) || !['', 'sm', 'md', 'lg', 'xl', '2xl'].includes(breakpoint)) throw new Error('That style value or breakpoint is not supported.');

  const inspected = inspectElement({ filePath, line, column, elementId });
  if (!inspected.found || !inspected.safeToEdit || !inspected.className) {
    return { success: false as const, reason: inspected.reason || 'This element cannot be edited safely.' };
  }

  const project = new Project({ skipAddingFilesFromTsConfig: true });
  const sourceFile = project.addSourceFileAtPath(filePath);
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
  const originalSource = sourceFile.getFullText();
  const prefix = breakpoint ? `${breakpoint}:` : '';
  const tokens = original.split(/\s+/).filter(Boolean);
  const index = tokens.findIndex((token) => token.startsWith(prefix) && rule.pattern.test(token.slice(prefix.length)));
  const nextToken = `${prefix}${value}`;
  const oldToken = index >= 0 ? tokens[index] : '';
  const newToken = nextToken;
  if (index >= 0) tokens[index] = nextToken;
  else tokens.push(nextToken);
  const updated = tokens.join(' ');
  literal.setLiteralValue(updated);
  const updatedSource = sourceFile.getFullText();
  if (!dryRun) sourceFile.saveSync();
  return { success: true as const, oldClassName: original, newClassName: updated, oldToken, newToken, filePath, line: target.getStartLineNumber(), updatedSource: dryRun ? updatedSource : undefined, originalSource: dryRun ? originalSource : undefined };
}
