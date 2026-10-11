import { Project, SyntaxKind, Node, JsxOpeningElement, JsxSelfClosingElement, StringLiteral } from 'ts-morph';

export const TAILWIND_SPACING_SCALE = [
  '0', '0.5', '1', '1.5', '2', '2.5', '3', '3.5', '4', '5', '6', '7', '8', '9',
  '10', '11', '12', '14', '16', '20', '24', '28', '32', '36', '40', '44', '48',
  '52', '56', '60', '64', '72', '80', '96'
];

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
 * Finds the next Tailwind spacing value.
 */
export function getNextSpacingValue(
  currentVal: string,
  direction: 'increase' | 'decrease',
  stepSize: 'normal' | 'big' = 'normal'
): string {
  const index = TAILWIND_SPACING_SCALE.indexOf(currentVal);
  const delta = stepSize === 'big' ? 4 : 1;

  if (index === -1) {
    // If not found in standard scale, start from '1'
    return direction === 'increase' ? '1' : '0';
  }

  if (direction === 'increase') {
    const nextIdx = Math.min(index + delta, TAILWIND_SPACING_SCALE.length - 1);
    return TAILWIND_SPACING_SCALE[nextIdx];
  } else {
    const prevIdx = Math.max(index - delta, 0);
    return TAILWIND_SPACING_SCALE[prevIdx];
  }
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

  for (const el of jsxElements) {
    if (elementId) {
      const idAttr = el.getAttribute('id');
      if (idAttr && Node.isJsxAttribute(idAttr)) {
        const init = idAttr.getInitializer();
        if (init && Node.isStringLiteral(init) && init.getLiteralValue() === elementId) {
          targetElement = el;
          break;
        }
      }
    }

    if (line !== undefined) {
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
  const classTokens = rawValue.split(/\s+/).filter(Boolean);

  // 4. Determine property prefix to nudge
  // For nudging right: target margin-left (ml-), or horizontal spacing
  const prefixMatch = breakpoint ? `${breakpoint}:ml-` : 'ml-';

  let foundTokenIndex = -1;
  let oldClass = '';
  let currentVal = '';

  for (let i = 0; i < classTokens.length; i++) {
    const token = classTokens[i];
    if (token.startsWith(prefixMatch)) {
      foundTokenIndex = i;
      oldClass = token;
      currentVal = token.slice(prefixMatch.length);
      break;
    }
  }

  let newClass = '';
  if (foundTokenIndex !== -1) {
    const directionType = (direction === 'right' || direction === 'down') ? 'increase' : 'decrease';
    const nextVal = getNextSpacingValue(currentVal, directionType, stepSize);
    newClass = `${prefixMatch}${nextVal}`;
    classTokens[foundTokenIndex] = newClass;
  } else {
    // If no ml- class exists, add ml-1 (or ml-0.5 / ml-4 depending on direction/step)
    const initialVal = stepSize === 'big' ? '4' : '1';
    newClass = `${prefixMatch}${initialVal}`;
    classTokens.push(newClass);
  }

  const newClassNameValue = classTokens.join(' ');

  // 5. Apply the edit strictly to the string literal node ONLY
  stringLiteralNode.setLiteralValue(newClassNameValue);

  // Save changes to disk
  sourceFile.saveSync();

  return {
    success: true,
    refusedSafely: false,
    oldClass,
    newClass,
    oldClassNameValue: rawValue,
    newClassNameValue,
    filePath,
    line: targetElement.getStartLineNumber(),
  };
}
