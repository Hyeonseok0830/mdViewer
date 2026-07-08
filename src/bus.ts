import { EventEmitter } from 'node:events';

export interface TocItem {
  depth: 1 | 2 | 3 | 4 | 5 | 6;
  text: string;
  id: string;
  children: TocItem[];
}

export interface FileReadyPayload {
  path: string;
  content: string;
  mtime: Date;
}

export interface FileChangedPayload {
  path: string;
  content: string;
}

export interface RenderDonePayload {
  path: string;
  html: string;
  toc: TocItem[];
  frontmatter: Record<string, unknown>;
  tags: string[];
  wordCount: number;
  wikiLinks: string[];
}

export interface RenderErrorPayload {
  path: string;
  error: Error;
}

export interface ServerReadyPayload {
  port: number;
  url: string;
}

interface BusEventMap {
  'file:ready': FileReadyPayload[];
  'file:changed': FileChangedPayload;
  'file:added': { path: string };
  'file:removed': { path: string };
  'render:done': RenderDonePayload;
  'render:error': RenderErrorPayload;
  'server:ready': ServerReadyPayload;
  'app:shutdown': undefined;
}

class TypedEventEmitter extends EventEmitter {
  typedEmit<K extends keyof BusEventMap>(event: K, payload: BusEventMap[K]): boolean {
    return super.emit(event as string, payload);
  }

  typedOn<K extends keyof BusEventMap>(
    event: K,
    listener: (payload: BusEventMap[K]) => void,
  ): this {
    return super.on(event as string, listener as (arg: unknown) => void);
  }
}

export const bus = new TypedEventEmitter();
