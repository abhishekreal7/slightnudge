import { Node, SyntaxKind, type JsxOpeningElement, type JsxSelfClosingElement, type Identifier, type Expression } from 'ts-morph';
import { isNextLink } from './link-identity';
import { renderJsxAttribute } from './jsx-text';
import { validLinkDestination } from './link-values';

type Element=JsxOpeningElement|JsxSelfClosingElement;
export interface InstanceField {name:string;value:string;type:'text'|'boolean'|'enum';target:'text'|'href'|'disabled'|'type'|'className';options?:string[];defaultValue?:string}
function unwrap(node:Node|undefined):Node|undefined{return node&&Node.isParenthesizedExpression(node)?unwrap(node.getExpression()):node;}
function literal(node:Node|undefined):string|undefined{node=unwrap(node);if(node&&Node.isStringLiteral(node))return node.getLiteralValue();if(node?.getKind()===SyntaxKind.TrueKeyword)return 'true';if(node?.getKind()===SyntaxKind.FalseKeyword)return 'false';return undefined;}
function reads(fn:Node,name:Identifier){const symbol=name.getSymbol();return fn.getDescendantsOfKind(SyntaxKind.Identifier).filter(node=>node!==name&&(node.getSymbol()===symbol||Node.isShorthandPropertyAssignment(node.getParent())&&node.getParent().asKindOrThrow(SyntaxKind.ShorthandPropertyAssignment).getValueSymbol()===symbol));}
function classValue(node:Node|undefined,name:Identifier,value:string):string{
  node=unwrap(node);if(!node)throw Error('Unsupported variant expression.');
  if(Node.isStringLiteral(node)||Node.isNoSubstitutionTemplateLiteral(node))return node.getLiteralValue();
  if(Node.isBinaryExpression(node)&&node.getOperatorToken().getKind()===SyntaxKind.PlusToken)return classValue(node.getLeft(),name,value)+classValue(node.getRight(),name,value);
  if(Node.isTemplateExpression(node))return node.getHead().getLiteralText()+node.getTemplateSpans().map(span=>classValue(span.getExpression(),name,value)+span.getLiteral().getLiteralText()).join('');
  if(Node.isConditionalExpression(node)){
    const condition=unwrap(node.getCondition());if(!condition||!Node.isBinaryExpression(condition)||![SyntaxKind.EqualsEqualsEqualsToken,SyntaxKind.ExclamationEqualsEqualsToken].includes(condition.getOperatorToken().getKind()))throw Error('Unsupported variant condition.');
    const left=unwrap(condition.getLeft()),right=unwrap(condition.getRight());
    const operand=left&&Node.isIdentifier(left)&&left.getSymbol()===name.getSymbol()?right:right&&Node.isIdentifier(right)&&right.getSymbol()===name.getSymbol()?left:undefined;
    if(!operand||!Node.isStringLiteral(operand))throw Error('Unsupported variant value.');
    const equal=value===operand.getLiteralValue(),yes=condition.getOperatorToken().getKind()===SyntaxKind.EqualsEqualsEqualsToken?equal:!equal;
    return classValue(yes?node.getWhenTrue():node.getWhenFalse(),name,value);
  }
  throw Error('Variant classes must use static strings and comparisons.');
}
export function instanceProvider(node:Element){
  const fn=node.getFirstAncestor(parent=>Node.isFunctionDeclaration(parent)||Node.isArrowFunction(parent)||Node.isFunctionExpression(parent));
  if(!fn||!Node.isFunctionDeclaration(fn)&&!Node.isArrowFunction(fn))return undefined;
  const variable=Node.isArrowFunction(fn)&&Node.isVariableDeclaration(fn.getParent())?fn.getParent().asKindOrThrow(SyntaxKind.VariableDeclaration):undefined;
  const name=Node.isFunctionDeclaration(fn)?fn.getNameNode():variable?.getNameNode();if(!name||!Node.isIdentifier(name)||! /^[A-Z]/.test(name.getText())||variable&&variable.getVariableStatement()?.getDeclarationKind()!=='const')return undefined;
  if(fn.getDescendantsOfKind(SyntaxKind.Identifier).some(identifier=>['arguments','eval'].includes(identifier.getText())))return undefined;
  const params=fn.getParameters(),pattern=params[0]?.getNameNode();if(params.length!==1||!pattern||!Node.isObjectBindingPattern(pattern)||params[0].getInitializer())return undefined;
  if(node.getAttributes().some(Node.isJsxSpreadAttribute))return undefined;
  const tag=isNextLink(node)?'a':node.getTagNameNode().getText();
  const consumers:{expression:Node;target:InstanceField['target']}[]=[];
  if(Node.isJsxOpeningElement(node)&&Node.isJsxElement(node.getParent())){
    const children=node.getParent().asKindOrThrow(SyntaxKind.JsxElement).getJsxChildren();
    const expressions=children.filter(Node.isJsxExpression).map(child=>child.getExpression()).filter((value):value is Expression=>!!value);
    const text=children.filter(Node.isJsxText).some(child=>child.getText().trim());
    if(expressions.length===1&&!text)consumers.push({expression:expressions[0],target:'text'});
  }
  for(const attrName of ['href','disabled','type','className'] as const){
    if(attrName==='href'&&tag!=='a'||['disabled','type'].includes(attrName)&&tag!=='button')continue;
    const attr=node.getAttribute(attrName),initial=attr&&Node.isJsxAttribute(attr)?attr.getInitializer():undefined;
    if(initial&&Node.isJsxExpression(initial)&&initial.getExpression())consumers.push({expression:initial.getExpression()!,target:attrName});
  }
  const fields:(Omit<InstanceField,'value'>&{binding:Identifier;expression:Node})[]=[];
  for(const binding of pattern.getElements()){
    const bindingName=binding.getNameNode();if(!Node.isIdentifier(bindingName)||binding.getDotDotDotToken())continue;
    const property=binding.getPropertyNameNode()?.getText()||bindingName.getText();if(!/^[a-zA-Z][a-zA-Z0-9]*$/.test(property)||/^(on[A-Z]|children$|key$|ref$|dangerouslySetInnerHTML$)/.test(property))continue;
    const references=reads(fn,bindingName),type=bindingName.getType();
    const options=type.isUnion()&&type.getUnionTypes().every(member=>member.isStringLiteral())?type.getUnionTypes().map(member=>String(member.getLiteralValue())):undefined;
    if(options&&(options.length>20||options.some(value=>value.length>80)))continue;
    for(const consumer of consumers){
      const expression=unwrap(consumer.expression)!;
      const direct=Node.isIdentifier(expression)&&expression.getSymbol()===bindingName.getSymbol();
      const contained=references.length>0&&references.every(reference=>reference===expression||reference.getAncestors().includes(expression));
      if(consumer.target==='className'?!contained:!direct||references.length!==1||references[0]!==expression)continue;
      const fallback=binding.getInitializer(),defaultValue=fallback?literal(fallback):undefined;if(fallback&&defaultValue===undefined)continue;
      let fieldType:InstanceField['type'];let values=options;
      if(consumer.target==='className'){
        if(!values?.length)continue;
        try{for(const value of values)classValue(expression,bindingName,value)}catch{continue}
        fieldType='enum';
      }else if(consumer.target==='disabled'){
        if(!type.isBoolean()&&!(type.isUnion()&&type.getUnionTypes().every(member=>member.isBooleanLiteral())))continue;
        fieldType='boolean';
      }else if(consumer.target==='type'){
        values=(values||['button','submit','reset']).filter(value=>['button','submit','reset'].includes(value));if(!values.length)continue;fieldType='enum';
      }else{
        const broad=type.isString()||type.isUnion()&&type.getUnionTypes().some(member=>member.isString());
        if(!broad&&!values&&!(type.isAny()&&!params[0].getTypeNode()&&!variable?.getTypeNode()))continue;
        fieldType=values?'enum':'text';
      }
      fields.push({name:property,type:fieldType,target:consumer.target,options:values,defaultValue,binding:bindingName,expression});
    }
  }
  const declaration=variable||(Node.isFunctionDeclaration(fn)?fn:undefined);if(!declaration||!fields.length)return undefined;
  return {component:name.getText(),declaration,fields};
}
export function instanceFieldValue(call:Element,field:Omit<InstanceField,'value'>){
  if(call.getAttributes().some(Node.isJsxSpreadAttribute))throw Error('This caller uses spread props. Edit its provider in source.');
  const attrs=call.getAttributes().filter(attr=>Node.isJsxAttribute(attr)&&attr.getNameNode().getText()===field.name);
  if(attrs.length>1)throw Error('The caller has duplicate props.');
  if(!attrs.length){if(field.defaultValue!==undefined)return field.defaultValue;throw Error('This caller does not provide this prop.');}
  const attr=attrs[0].asKindOrThrow(SyntaxKind.JsxAttribute),initial=attr.getInitializer(),value=initial&&Node.isJsxExpression(initial)?literal(initial.getExpression()):initial&&Node.isStringLiteral(initial)?renderJsxAttribute(initial.getText()):!initial&&field.type==='boolean'?'true':undefined;
  if(value===undefined)throw Error('This prop is supplied by computed data. Edit its provider in source.');
  validateInstanceValue(field,value);return value;
}
export function validateInstanceValue(field:Omit<InstanceField,'value'>,value:string){
  if(typeof value!=='string'||value.length>10000||/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value))throw Error('Use a supported prop value without control characters.');
  if(field.type==='boolean'&&!['true','false'].includes(value)||field.options&&!field.options.includes(value))throw Error('Choose a value from this prop’s declared options.');
  if(field.target==='href'&&!validLinkDestination(value))throw Error('Use a page path, anchor, web address, email or telephone link.');
}
export function instanceFieldClass(field:NonNullable<ReturnType<typeof instanceProvider>>['fields'][number],value:string){return classValue(field.expression,field.binding,value);}
