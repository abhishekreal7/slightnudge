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
  elementId?: string;
  direction: 'right' | 'left' | 'up' | 'down';
  stepSize?: 'normal' | 'big';
  breakpoint?: string; // e.g. '' (base), 'sm', 'md', 'lg', 'xl', '2xl'
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
 * Nudge an element's Tailwind class safely using ts-morph.
 * Never rewrites the whole file. Modifies only the single className string literal.
 */
export function nudgeElement(options: NudgeOptions): NudgeResult {
  const { filePath, line, elementId, direction, stepSize = 'normal', breakpoint = '' } = options;

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
      success: false,
      refusedSafely: true,
      reason: `can't edit this safely: element not found at ${line ? `line ${line}` : `id ${elementId}`}`,
      filePath,
    };
  }

  // 2. Safety Check: Component used in several places
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
  sourceFile.saveSync();

  return {
    success: true,
    refusedSafely: false,
    oldClass: computed.oldClass,
    newClass: computed.newClass,
    oldClassNameValue: rawValue,
    newClassNameValue: computed.newClassName,
    filePath,
    line: targetElement.getStartLineNumber(),
  };
}

export interface InspectResult {
  found: boolean;
  safeToEdit: boolean;
  reason?: string;
  filePath: string;
  line?: number;
  tagName?: string;
  className?: string;
}

/**
 * Inspects a JSX element in source code without modifying it.
 * Verifies safety constraints (variables, conditions, shared component usages).
 */
export function inspectElement(options: {
  filePath: string;
  line?: number;
  elementId?: string;
}): InspectResult {
  const { filePath, line, elementId } = options;

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
      reason: `element not found at ${line ? `line ${line}` : `id ${elementId}`}`,
      filePath,
    };
  }

  const tagName = targetElement.getTagNameNode().getText();
  const actualLine = targetElement.getStartLineNumber();

  // Safety check 1: component used in several places
  if (isComponentUsedMultipleTimes(targetElement, project)) {
    return {
      found: true,
      safeToEdit: false,
      reason: "can't edit this safely: component used in several places",
      filePath,
      line: actualLine,
      tagName,
    };
  }

  const classAttr = targetElement.getAttribute('className');
  if (!classAttr || !Node.isJsxAttribute(classAttr)) {
    return {
      found: true,
      safeToEdit: false,
      reason: "can't edit this safely: no className attribute found",
      filePath,
      line: actualLine,
      tagName,
    };
  }

  const initializer = classAttr.getInitializer();
  if (!initializer) {
    return {
      found: true,
      safeToEdit: false,
      reason: "can't edit this safely: empty className attribute",
      filePath,
      line: actualLine,
      tagName,
    };
  }

  if (Node.isJsxExpression(initializer)) {
    const expr = initializer.getExpression();
    if (!expr) {
      return {
        found: true,
        safeToEdit: false,
        reason: "can't edit this safely: empty JSX expression",
        filePath,
        line: actualLine,
        tagName,
      };
    }

    if (Node.isCallExpression(expr)) {
      return {
        found: true,
        safeToEdit: false,
        reason: "can't edit this safely: class built from a condition (call expression)",
        filePath,
        line: actualLine,
        tagName,
      };
    }

    if (Node.isConditionalExpression(expr) || Node.isBinaryExpression(expr)) {
      return {
        found: true,
        safeToEdit: false,
        reason: "can't edit this safely: class built from a condition",
        filePath,
        line: actualLine,
        tagName,
      };
    }

    if (Node.isIdentifier(expr) || Node.isTemplateExpression(expr)) {
      return {
        found: true,
        safeToEdit: false,
        reason: "can't edit this safely: class built from a variable",
        filePath,
        line: actualLine,
        tagName,
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
      reason: "can't edit this safely: dynamic className",
      filePath,
      line: actualLine,
      tagName,
    };
  }

  return {
    found: true,
    safeToEdit: true,
    filePath,
    line: actualLine,
    tagName,
    className: classNameValue,
  };
}
