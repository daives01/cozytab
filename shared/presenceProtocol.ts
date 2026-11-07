export type PresenceVisitor = {
    visitorId: string;
    displayName: string;
    isOwner: boolean;
    x: number;
    y: number;
    chatMessage: string | null;
    cursorColor?: string;
    inMenu: boolean;
    tabbedOut: boolean;
    inGame?: string | null;
    gameMetadata?: Record<string, unknown> | null;
    convexUserId?: string;
};

export type PresenceMessage =
    | {
          type: "join";
          visitorId: string;
          displayName: string;
          isOwner: boolean;
          cursorColor?: string;
          tabbedOut?: boolean;
          convexUserId?: string;
      }
    | { type: "leave"; visitorId: string }
    | { type: "rename"; visitorId: string; displayName: string; cursorColor?: string }
    | {
          type: "cursor";
          visitorId: string;
          x: number;
          y: number;
          cursorColor?: string;
          inMenu?: boolean;
          tabbedOut?: boolean;
          inGame?: string | null;
          gameMetadata?: Record<string, unknown> | null;
      }
    | { type: "chat"; visitorId: string; text: string | null }
    | { type: "state"; visitors: PresenceVisitor[] };

export type ClientPresenceMessage = Exclude<PresenceMessage, { type: "state" }>;
