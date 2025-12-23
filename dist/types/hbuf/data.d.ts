export type FromMap = (map: Record<string, any>, tag: string) => Data;
export interface Descriptor {
}
export declare abstract class Data {
    abstract toMap(tag: string): Record<string, any>;
}
