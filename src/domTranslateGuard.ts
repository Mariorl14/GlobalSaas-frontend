/**
 * Chrome Translate (common on Huawei) wraps text in <font> tags.
 * React then throws NotFoundError: removeChild / insertBefore because the
 * original text node is no longer a child of its parent.
 * @see https://github.com/facebook/react/issues/11538
 */
export function installDomTranslateGuard(): void {
  if (typeof Node !== "function" || !Node.prototype) return;

  const proto = Node.prototype;
  const originalRemoveChild = proto.removeChild;
  proto.removeChild = function <T extends Node>(this: Node, child: T): T {
    if (child.parentNode !== this) return child;
    return originalRemoveChild.call(this, child) as T;
  };

  const originalInsertBefore = proto.insertBefore;
  proto.insertBefore = function <T extends Node>(
    this: Node,
    newNode: T,
    referenceNode: Node | null,
  ): T {
    if (referenceNode && referenceNode.parentNode !== this) {
      return originalInsertBefore.call(this, newNode, null) as T;
    }
    return originalInsertBefore.call(this, newNode, referenceNode) as T;
  };
}
