export type Flags = number;

export const NoFlags = /*                      */ 0b00000000000000000000000000;
export const Placement = /*                    */ 0b00000000000000000000000010;
export const Update = /*                       */ 0b00000000000000000000000100;
export const Deletion = /*                     */ 0b00000000000000000000001000;
export const ChildDeletion = /*                */ 0b00000000000000000000010000;

export const RefStatic = /*                    */ 0b00001000000000000000000000;
export const LayoutStatic = /*                 */ 0b00010000000000000000000000;
export const PassiveStatic = /*                */ 0b00100000000000000000000000;

export const LayoutMask = Update;

export const StaticMask = LayoutStatic | PassiveStatic | RefStatic;
