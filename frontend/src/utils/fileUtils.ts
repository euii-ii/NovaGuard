import type { FileNode, Terminal } from '../types';

export function findFileById(tree: FileNode[], id: string): FileNode | null {
  for (const node of tree) {
    if (node.id === id) {
      return node;
    }
    if (node.children) {
      const found = findFileById(node.children, id);
      if (found) {
        return found;
      }
    }
  }
  return null;
}

export function updateFileContent(fileTree: FileNode[], fileId: string, content: string): FileNode[] {
  return fileTree.map(node => {
    if (node.id === fileId) {
      return { ...node, content };
    }
    if (node.children) {
      return { ...node, children: updateFileContent(node.children, fileId, content) };
    }
    return node;
  });
}

export function handleTerminalSelect(id: string, terminals: Terminal[]): Terminal[] {
  return terminals.map(terminal => ({
    ...terminal,
    isActive: terminal.id === id
  }));
}
