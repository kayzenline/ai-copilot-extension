export interface ExtensionSettings {
  localModeEnabled: boolean;
  cloudEndpoint: string;
  cloudApiKey: string;
  cloudModel: string;
}

export interface StyleProfile {
  tone: string;
  length: string;
  traits: string[];
  sampleText: string;
}

export interface SelectionSearchPayload {
  type: 'SELECTION_SEARCH';
  text: string;
  sourceUrl?: string;
}

export interface EmailDraftPayload {
  type: 'EMAIL_DRAFT';
  threadText: string;
  subject?: string;
  sender?: string;
  sourceUrl?: string;
  platform?: 'gmail' | 'outlook';
}

export interface BubbleClickPayload {
  type: 'BUBBLE_CLICK';
  text: string;
}

export interface EmailThreadPayload {
  type: 'EMAIL_THREAD';
  threadText: string;
  subject?: string;
  sender?: string;
  platform?: 'gmail' | 'outlook';
}

export interface InsertDraftPayload {
  type: 'INSERT_DRAFT';
  text: string;
}

export interface UpdateStyleProfilePayload {
  type: 'UPDATE_STYLE_PROFILE';
  profile: StyleProfile;
}

export type ExtensionMessage =
  | SelectionSearchPayload
  | EmailDraftPayload
  | BubbleClickPayload
  | EmailThreadPayload
  | InsertDraftPayload
  | UpdateStyleProfilePayload;

export interface ActivePayloadState {
  searchPayload?: SelectionSearchPayload | null;
  emailPayload?: EmailDraftPayload | null;
  timestamp?: number;
}
